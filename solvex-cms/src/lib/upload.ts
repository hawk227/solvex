/**
 * Image upload validation. This is a trust boundary: the browser controls the
 * filename and the declared content type, so neither is trusted. The file's
 * leading bytes decide what it actually is.
 */

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type ImageKind = 'jpeg' | 'png' | 'webp';

export const EXTENSION: Record<ImageKind, string> = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
};

export const CONTENT_TYPE: Record<ImageKind, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((byte, i) => bytes[offset + i] === byte);
}

/**
 * Identify an image from its magic bytes, or null if it is not one of the
 * allowed formats. A file claiming `image/png` while containing a script must
 * be rejected, so the declared type is ignored entirely.
 */
export function sniffImage(bytes: Uint8Array): ImageKind | null {
  // JPEG: FF D8 FF
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'jpeg';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  // WebP: "RIFF" .... "WEBP"
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8))
    return 'webp';
  return null;
}

export type ValidationFailure = { ok: false; error: string };
export type ValidationSuccess = { ok: true; kind: ImageKind; bytes: Uint8Array };

export function validateImage(bytes: Uint8Array): ValidationSuccess | ValidationFailure {
  if (bytes.byteLength === 0) return { ok: false, error: 'The file is empty.' };
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    return { ok: false, error: 'Images must be 5 MB or smaller.' };
  }
  const kind = sniffImage(bytes);
  if (!kind) return { ok: false, error: 'Only JPEG, PNG and WebP images are accepted.' };
  return { ok: true, kind, bytes };
}

/**
 * Object key for an entity's image. A random segment prevents a re-upload from
 * being masked by a CDN cache of the previous image at the same key.
 */
export function imageKeyFor(prefix: 'categories' | 'services', id: number, kind: ImageKind): string {
  return `${prefix}/${id}/${crypto.randomUUID()}.${EXTENSION[kind]}`;
}
