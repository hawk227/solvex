import { z } from 'zod';

/**
 * Optional free text from a FormData field.
 *
 * `FormData.get()` returns **null** for a field that is absent, and `null` fails
 * `z.string().optional()` — which accepts `undefined`, not `null`. Getting this
 * wrong fails the whole parse with a generic "invalid input" for a field the user
 * simply left out. `nullish()` accepts both, and the result is normalised to a
 * plain string so callers do not have to handle three empty cases.
 */
export function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v ?? '');
}

/** Optional integer from a FormData field, absent or blank meaning "unset". */
export function optionalInt(min: number, max: number) {
  return z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((v) => (v === null || v === undefined || v === '' ? undefined : Number(v)))
    .refine(
      (v) => v === undefined || (Number.isInteger(v) && v >= min && v <= max),
      `Enter a whole number between ${min} and ${max}.`,
    );
}
