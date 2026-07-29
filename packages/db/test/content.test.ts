import { describe, expect, it } from 'vitest';
import { faqsToText, listToText, parseFaqs, parseList } from '../src/content';

describe('parseList', () => {
  it('splits lines and trims', () => {
    expect(parseList(' Filter cleaning \n Coil wash ')).toEqual(['Filter cleaning', 'Coil wash']);
  });

  it('drops blank lines', () => {
    expect(parseList('a\n\n\n b \n')).toEqual(['a', 'b']);
  });

  it('returns an empty array for empty input', () => {
    expect(parseList('')).toEqual([]);
    expect(parseList(null)).toEqual([]);
  });
});

describe('parseFaqs', () => {
  it('pairs a question line with the lines that follow it', () => {
    expect(parseFaqs('How long?\nAbout an hour.\n\nGas refill?\nNot included.')).toEqual([
      { q: 'How long?', a: 'About an hour.' },
      { q: 'Gas refill?', a: 'Not included.' },
    ]);
  });

  it('joins a multi-line answer into one string', () => {
    expect(parseFaqs('Q?\nline one\nline two')).toEqual([{ q: 'Q?', a: 'line one line two' }]);
  });

  it('drops a question with no answer rather than storing it half-formed', () => {
    expect(parseFaqs('Dangling question?\n\nReal?\nYes.')).toEqual([{ q: 'Real?', a: 'Yes.' }]);
  });

  it('tolerates extra blank lines between blocks', () => {
    expect(parseFaqs('A?\n1.\n\n\n\nB?\n2.')).toHaveLength(2);
  });

  it('returns an empty array for empty input', () => {
    expect(parseFaqs('')).toEqual([]);
    expect(parseFaqs(null)).toEqual([]);
  });
});

describe('round trip', () => {
  it('survives text -> parsed -> text for lists', () => {
    const text = 'Filter cleaning\nCoil wash';
    expect(listToText(parseList(text))).toBe(text);
  });

  it('survives text -> parsed -> text for faqs', () => {
    const text = 'How long?\nAbout an hour.\n\nGas refill?\nNot included.';
    expect(faqsToText(parseFaqs(text))).toBe(text);
  });
});
