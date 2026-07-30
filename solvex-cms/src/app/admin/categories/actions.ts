'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { schema, slugify, isUniqueViolation } from '@solvex/db';
import { db } from '@/lib/cf';
import { requireManage } from '@/lib/session';
import { audit } from '@/lib/audit';
import { optionalText } from '@/lib/form';

export type ActionResult = { ok: true; id?: number } | { ok: false; error: string };

const CategoryInput = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80),
  description: optionalText(500),
  sort: z.coerce.number().int().min(0).max(9999).default(0),
});

/**
 * Every action re-establishes its caller. The /admin layout guard protects
 * navigation, but a server action is a POST endpoint that can be invoked
 * directly, so the layout check alone would not protect it.
 */
export async function createCategory(formData: FormData): Promise<ActionResult> {
  await requireManage('catalog');

  const parsed = CategoryInput.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    sort: formData.get('sort') || 0,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { name, description, sort } = parsed.data;
  const slug = slugify(name);
  if (!slug) return { ok: false, error: 'Name must contain at least one letter or number.' };

  let id: number | undefined;
  try {
    const [row] = await db()
      .insert(schema.categories)
      .values({ slug, name, description: description || null, sort })
      .returning({ id: schema.categories.id });
    id = row?.id;
  } catch (err) {
    if (isUniqueViolation(err, 'categories.slug')) {
      return { ok: false, error: `A category with the slug "${slug}" already exists.` };
    }
    throw err;
  }

  await audit({
    action: 'catalog.category.create',
    module: 'catalog',
    targetType: 'category',
    targetId: id,
    targetLabel: name,
    detail: { slug, sort, hasDescription: Boolean(description) },
  });

  revalidatePath('/admin/categories');
  return { ok: true, id };
}

export async function updateCategory(id: number, formData: FormData): Promise<ActionResult> {
  await requireManage('catalog');

  const parsed = CategoryInput.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    sort: formData.get('sort') || 0,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { name, description, sort } = parsed.data;

  // The slug is intentionally NOT regenerated on rename: it is a public URL,
  // and silently changing it would break every existing link to the category.
  await db()
    .update(schema.categories)
    .set({ name, description: description || null, sort })
    .where(eq(schema.categories.id, id));

  await audit({
    action: 'catalog.category.update',
    module: 'catalog',
    targetType: 'category',
    targetId: id,
    targetLabel: name,
    detail: { sort, hasDescription: Boolean(description) },
  });

  revalidatePath('/admin/categories');
  return { ok: true };
}

export async function setCategoryActive(id: number, active: boolean): Promise<ActionResult> {
  await requireManage('catalog');

  await db().update(schema.categories).set({ active }).where(eq(schema.categories.id, id));

  await audit({
    action: active ? 'catalog.category.activate' : 'catalog.category.deactivate',
    module: 'catalog',
    targetType: 'category',
    targetId: id,
  });

  revalidatePath('/admin/categories');
  revalidatePath('/admin/services');
  return { ok: true };
}
