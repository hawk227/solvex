import { describe, expect, it } from 'vitest';
import { slugify } from '../src/slug';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('AC Cleaning')).toBe('ac-cleaning');
  });

  it('collapses runs of punctuation and whitespace', () => {
    expect(slugify('Fridge  --  Repair!!')).toBe('fridge-repair');
  });

  it('strips leading and trailing separators', () => {
    expect(slugify('  ///Oven Service///  ')).toBe('oven-service');
  });

  it('strips diacritics rather than dropping the letter', () => {
    expect(slugify('Café Chiller')).toBe('cafe-chiller');
  });

  it('never ends in a hyphen even when truncated at the limit', () => {
    const slug = slugify('a'.repeat(59) + ' bcdef');
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('returns an empty string when nothing survives', () => {
    expect(slugify('!!!')).toBe('');
  });
});
