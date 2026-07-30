'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { schema } from '@solvex/db';
import { bucket, db } from '@/lib/cf';
import { requireManage } from '@/lib/session';
import { audit } from '@/lib/audit';
import { CONTENT_TYPE, MAX_IMAGE_BYTES, imageKeyFor, validateImage } from '@/lib/upload';

export type UploadResult = { ok: true; key: string } | { ok: false; error: string };

type Target = 'categories' | 'services';

const TABLE = {
  categories: schema.categories,
  services: schema.services,
} as const;

/**
 * Upload a category or service image to R2 and record its key.
 *
 * The declared content type and filename are ignored — the bytes are sniffed
 * instead, and the stored object's content type comes from what was actually
 * detected. The previous object is deleted only after the new key is committed,
 * so a failure never leaves the row pointing at a missing object.
 */
export async function uploadImage(
  target: Target,
  id: number,
  formData: FormData,
): Promise<UploadResult> {
  await requireManage('catalog');

  const file = formData.get('file');
  if (!(file instanceof File)) return { ok: false, error: 'No file was provided.' };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: 'Images must be 5 MB or smaller.' };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const validated = validateImage(bytes);
  if (!validated.ok) return validated;

  const table = TABLE[target];
  const d = db();

  const [current] = await d
    .select({ imageKey: table.imageKey })
    .from(table)
    .where(eq(table.id, id));
  if (!current) return { ok: false, error: 'That record no longer exists.' };

  const key = imageKeyFor(target, id, validated.kind);

  await bucket().put(key, validated.bytes, {
    httpMetadata: {
      contentType: CONTENT_TYPE[validated.kind],
      cacheControl: 'public, max-age=31536000, immutable',
    },
  });

  await d.update(table).set({ imageKey: key }).where(eq(table.id, id));

  // Old object removed last, and its failure is not fatal: a stranded object
  // costs a fraction of a cent, whereas failing here would leave the admin
  // thinking the upload broke when it actually succeeded.
  if (current.imageKey && current.imageKey !== key) {
    try {
      await bucket().delete(current.imageKey);
    } catch {
      // Intentionally ignored — see above.
    }
  }

  await audit({
    action: 'catalog.image.upload',
    module: 'catalog',
    targetType: target === 'categories' ? 'category' : 'service',
    targetId: id,
    detail: { key, kind: validated.kind, bytes: file.size, replaced: current.imageKey ?? null },
  });

  revalidatePath(`/admin/${target}`);
  revalidatePath(`/admin/${target}/${id}`);
  return { ok: true, key };
}

export async function removeImage(target: Target, id: number): Promise<UploadResult> {
  await requireManage('catalog');

  const table = TABLE[target];
  const d = db();

  const [current] = await d
    .select({ imageKey: table.imageKey })
    .from(table)
    .where(eq(table.id, id));
  if (!current?.imageKey) return { ok: false, error: 'There is no image to remove.' };

  await d.update(table).set({ imageKey: null }).where(eq(table.id, id));
  try {
    await bucket().delete(current.imageKey);
  } catch {
    // Row is already cleared; a stranded object is harmless.
  }

  await audit({
    action: 'catalog.image.remove',
    module: 'catalog',
    targetType: target === 'categories' ? 'category' : 'service',
    targetId: id,
    detail: { key: current.imageKey },
  });

  revalidatePath(`/admin/${target}`);
  revalidatePath(`/admin/${target}/${id}`);
  return { ok: true, key: '' };
}
