import { describe, expect, it } from 'vitest';
import { MAX_IMAGE_BYTES, imageKeyFor, sniffImage, validateImage } from './upload';

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50,
]);

describe('sniffImage', () => {
  it('identifies JPEG, PNG and WebP by magic bytes', () => {
    expect(sniffImage(JPEG)).toBe('jpeg');
    expect(sniffImage(PNG)).toBe('png');
    expect(sniffImage(WEBP)).toBe('webp');
  });

  it('rejects a RIFF container that is not WebP', () => {
    // RIFF header present, but "WAVE" at offset 8 instead of "WEBP".
    const wav = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
    ]);
    expect(sniffImage(wav)).toBeNull();
  });

  it('rejects a script that merely claims to be an image', () => {
    const script = new TextEncoder().encode('<?php system($_GET["c"]); ?>');
    expect(sniffImage(script)).toBeNull();
  });

  it('rejects an SVG, which can carry script', () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>');
    expect(sniffImage(svg)).toBeNull();
  });

  it('does not read past the end of a truncated file', () => {
    expect(sniffImage(new Uint8Array([0x89, 0x50]))).toBeNull();
    expect(sniffImage(new Uint8Array([]))).toBeNull();
    // RIFF magic but file ends before the offset-8 check.
    expect(sniffImage(new Uint8Array([0x52, 0x49, 0x46, 0x46]))).toBeNull();
  });
});

describe('validateImage', () => {
  it('accepts a valid image', () => {
    const result = validateImage(PNG);
    expect(result).toMatchObject({ ok: true, kind: 'png' });
  });

  it('rejects an empty file', () => {
    expect(validateImage(new Uint8Array([]))).toMatchObject({ ok: false });
  });

  it('rejects a file over the size limit even when the bytes are a real image', () => {
    const big = new Uint8Array(MAX_IMAGE_BYTES + 1);
    big.set(PNG, 0);
    const result = validateImage(big);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/5 MB/);
  });

  it('accepts a file exactly at the size limit', () => {
    const exact = new Uint8Array(MAX_IMAGE_BYTES);
    exact.set(PNG, 0);
    expect(validateImage(exact).ok).toBe(true);
  });
});

describe('imageKeyFor', () => {
  it('namespaces by entity and includes the right extension', () => {
    expect(imageKeyFor('categories', 7, 'jpeg')).toMatch(/^categories\/7\/[0-9a-f-]{36}\.jpg$/);
    expect(imageKeyFor('services', 12, 'webp')).toMatch(/^services\/12\/[0-9a-f-]{36}\.webp$/);
  });

  it('produces a distinct key each time, so a re-upload is not masked by cache', () => {
    expect(imageKeyFor('services', 1, 'png')).not.toBe(imageKeyFor('services', 1, 'png'));
  });
});
