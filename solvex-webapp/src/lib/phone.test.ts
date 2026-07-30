import { describe, expect, it } from 'vitest';
import { normaliseBdMobile } from './phone';

describe('normaliseBdMobile', () => {
  it('accepts the plain local form', () => {
    expect(normaliseBdMobile('01712345678')).toBe('+8801712345678');
  });

  it('accepts the international forms', () => {
    expect(normaliseBdMobile('+8801712345678')).toBe('+8801712345678');
    expect(normaliseBdMobile('8801712345678')).toBe('+8801712345678');
  });

  it('tolerates spaces, dashes and brackets', () => {
    expect(normaliseBdMobile(' 017-1234 5678 ')).toBe('+8801712345678');
    expect(normaliseBdMobile('(017) 1234-5678')).toBe('+8801712345678');
  });

  it('normalises every accepted form to one canonical value', () => {
    const forms = ['01712345678', '+8801712345678', '8801712345678', '017 1234 5678'];
    const results = new Set(forms.map(normaliseBdMobile));
    expect(results.size).toBe(1);
  });

  it('accepts every in-service operator prefix 013 to 019', () => {
    for (const d of [3, 4, 5, 6, 7, 8, 9]) {
      expect(normaliseBdMobile(`01${d}12345678`)).toBe(`+8801${d}12345678`);
    }
  });

  it('rejects prefixes that are not issued', () => {
    expect(normaliseBdMobile('01012345678')).toBeNull();
    expect(normaliseBdMobile('01112345678')).toBeNull();
    expect(normaliseBdMobile('01212345678')).toBeNull();
  });

  it('rejects wrong lengths', () => {
    expect(normaliseBdMobile('0171234567')).toBeNull();
    expect(normaliseBdMobile('017123456789')).toBeNull();
  });

  it('rejects non-numeric and empty input', () => {
    expect(normaliseBdMobile('')).toBeNull();
    expect(normaliseBdMobile('not a phone')).toBeNull();
    expect(normaliseBdMobile('+1 555 0100')).toBeNull();
  });
});
