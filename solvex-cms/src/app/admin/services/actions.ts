'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { schema, slugify, isUniqueViolation, parseList, parseFaqs, parseProse } from '@solvex/db';
import { db } from '@/lib/cf';
import { requireManage } from '@/lib/session';
import { optionalInt, optionalText } from '@/lib/form';

export type ActionResult = { ok: true; id?: number } | { ok: false; error: string };

const BasicsInput = z.object({
  categoryId: z.coerce.number().int().positive('Pick a category.'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(120),
  shortDesc: optionalText(300),
  durationMin: optionalInt(0, 1440),
  sort: z.coerce.number().int().min(0).max(9999).default(0),
});

function parseBasics(formData: FormData) {
  return BasicsInput.safeParse({
    categoryId: formData.get('categoryId'),
    name: formData.get('name'),
    shortDesc: formData.get('shortDesc'),
    durationMin: formData.get('durationMin') || undefined,
    sort: formData.get('sort') || 0,
  });
}

export async function createService(formData: FormData): Promise<ActionResult> {
  await requireManage('catalog');

  const parsed = parseBasics(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { categoryId, name, shortDesc, durationMin, sort } = parsed.data;
  const slug = slugify(name);
  if (!slug) return { ok: false, error: 'Name must contain at least one letter or number.' };

  try {
    const [row] = await db()
      .insert(schema.services)
      .values({
        categoryId,
        slug,
        name,
        shortDesc: shortDesc || null,
        durationMin: durationMin ?? null,
        sort,
      })
      .returning({ id: schema.services.id });

    revalidatePath('/admin/services');
    revalidatePath('/admin/categories');
    return { ok: true, id: row?.id };
  } catch (err) {
    if (isUniqueViolation(err, 'services.slug')) {
      return { ok: false, error: `A service with the slug "${slug}" already exists.` };
    }
    throw err;
  }
}

export async function updateServiceBasics(id: number, formData: FormData): Promise<ActionResult> {
  await requireManage('catalog');

  const parsed = parseBasics(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { categoryId, name, shortDesc, durationMin, sort } = parsed.data;

  // Slug is not regenerated on rename — it is a public URL.
  await db()
    .update(schema.services)
    .set({
      categoryId,
      name,
      shortDesc: shortDesc || null,
      durationMin: durationMin ?? null,
      sort,
    })
    .where(eq(schema.services.id, id));

  revalidatePath('/admin/services');
  revalidatePath(`/admin/services/${id}`);
  return { ok: true };
}

const ContentInput = z.object({
  aboutMd: optionalText(8000),
  included: optionalText(4000),
  notIncluded: optionalText(4000),
  faqs: optionalText(12000),
});

export async function updateServiceContent(id: number, formData: FormData): Promise<ActionResult> {
  await requireManage('catalog');

  const parsed = ContentInput.safeParse({
    aboutMd: formData.get('aboutMd'),
    included: formData.get('included'),
    notIncluded: formData.get('notIncluded'),
    faqs: formData.get('faqs'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const included = parseList(parsed.data.included);
  const notIncluded = parseList(parsed.data.notIncluded);
  const faqs = parseFaqs(parsed.data.faqs);

  await db()
    .update(schema.services)
    .set({
      aboutMd: parseProse(parsed.data.aboutMd),
      includedJson: included.length ? included : null,
      notIncludedJson: notIncluded.length ? notIncluded : null,
      faqsJson: faqs.length ? faqs : null,
    })
    .where(eq(schema.services.id, id));

  revalidatePath(`/admin/services/${id}`);
  return { ok: true };
}

export async function setServiceActive(id: number, active: boolean): Promise<ActionResult> {
  await requireManage('catalog');
  await db().update(schema.services).set({ active }).where(eq(schema.services.id, id));
  revalidatePath('/admin/services');
  return { ok: true };
}
