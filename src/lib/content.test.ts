import { describe, expect, it } from 'vitest';
import { draftToDocument, hasBody, parseInline, textToBlocks } from './content';

const strip = (blocks: unknown) =>
  JSON.parse(
    JSON.stringify(blocks, (key, value) =>
      key === 'id' && String(value).startsWith('b_') ? undefined : value,
    ),
  );

describe('content conversion', () => {
  it('splits paragraphs on blank lines and keeps single line breaks', () => {
    expect(strip(textToBlocks('Prima riga\nseconda riga\n\nNuovo paragrafo'))).toEqual([
      { type: 'core/paragraph', v: 1, attrs: {}, content: [{ text: 'Prima riga\nseconda riga' }] },
      { type: 'core/paragraph', v: 1, attrs: {}, content: [{ text: 'Nuovo paragrafo' }] },
    ]);
  });

  it('makes headings and lists', () => {
    expect(strip(textToBlocks('# Orari\n\n- lunedì\n- martedì\n\n1. uno\n2. due'))).toEqual([
      { type: 'core/heading', v: 1, attrs: { level: 2 }, content: [{ text: 'Orari' }] },
      {
        type: 'core/list',
        v: 1,
        attrs: {},
        children: [
          { type: 'core/list-item', v: 1, attrs: {}, content: [{ text: 'lunedì' }] },
          { type: 'core/list-item', v: 1, attrs: {}, content: [{ text: 'martedì' }] },
        ],
      },
      {
        type: 'core/list',
        v: 1,
        attrs: { ordered: true },
        children: [
          { type: 'core/list-item', v: 1, attrs: {}, content: [{ text: 'uno' }] },
          { type: 'core/list-item', v: 1, attrs: {}, content: [{ text: 'due' }] },
        ],
      },
    ]);
  });

  it('reads bold, italic and safe links', () => {
    expect(parseInline('Un **grande** giorno *davvero* e [il sito](https://esempio.it).')).toEqual([
      { text: 'Un ' },
      { text: 'grande', marks: ['bold'] },
      { text: ' giorno ' },
      { text: 'davvero', marks: ['italic'] },
      { text: ' e ' },
      { type: 'link', href: 'https://esempio.it', children: [{ text: 'il sito' }] },
      { text: '.' },
    ]);
    expect(parseInline('[x](javascript:alert(1))')).toEqual([{ text: '[x](javascript:alert(1))' }]);
  });

  it('puts photos where they are, as image blocks with the media id', () => {
    const doc = draftToDocument([
      { kind: 'text', text: 'Ciao' },
      { kind: 'image', mediaId: 'm1', url: 'https://esempio.it/u/a.jpg', alt: 'Il porto' },
      { kind: 'text', text: '' },
    ]);
    expect(doc.schema).toBe(1);
    expect(strip(doc.blocks)).toEqual([
      { type: 'core/paragraph', v: 1, attrs: {}, content: [{ text: 'Ciao' }] },
      {
        type: 'core/image',
        v: 1,
        attrs: { id: 'm1', url: 'https://esempio.it/u/a.jpg', alt: 'Il porto' },
      },
    ]);
    expect(new Set(doc.blocks.map((b) => b.id)).size).toBe(2);
    expect(doc.blocks[0]!.id).toMatch(/^b_[a-z0-9]+$/);
  });

  it('knows when a post has a body', () => {
    expect(hasBody([{ kind: 'text', text: '  ' }])).toBe(false);
    expect(hasBody([{ kind: 'text', text: 'x' }])).toBe(true);
  });
});
