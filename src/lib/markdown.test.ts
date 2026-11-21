import { describe, expect, it } from 'vitest';
import { parseInlineMarkdown, parseMarkdown } from './markdown';

describe('markdown', () => {
  it('reads paragraphs, headings, lists, code and quotes', () => {
    const blocks = parseMarkdown(
      '## Fatto\n\nHo creato la bozza:\n\n- **Titolo**: Orari\n- *stato*: bozza\n\n1. uno\n2. due\n\n```\ncodice\n```\n\n> nota',
    );
    expect(blocks.map((b) => b.kind)).toEqual([
      'heading',
      'paragraph',
      'list',
      'list',
      'code',
      'quote',
    ]);
    expect(blocks[2]).toMatchObject({ kind: 'list', ordered: false });
    expect(blocks[3]).toMatchObject({ kind: 'list', ordered: true });
    expect(blocks[4]).toEqual({ kind: 'code', text: 'codice' });
  });

  it('keeps only safe links and turns bare addresses into links', () => {
    expect(parseInlineMarkdown('[apri](https://esempio.it/cl-admin)')).toEqual([
      {
        kind: 'link',
        href: 'https://esempio.it/cl-admin',
        children: [{ kind: 'text', text: 'apri' }],
      },
    ]);
    const bare = parseInlineMarkdown('Anteprima: https://esempio.it/p?x=1.');
    expect(bare).toEqual([
      { kind: 'text', text: 'Anteprima: ' },
      {
        kind: 'link',
        href: 'https://esempio.it/p?x=1',
        children: [{ kind: 'text', text: 'https://esempio.it/p?x=1' }],
      },
      { kind: 'text', text: '.' },
    ]);
    const unsafe = parseInlineMarkdown('[x](javascript:alert(1))');
    expect(unsafe.some((n) => n.kind === 'link')).toBe(false);
  });

  it('never turns HTML into markup: it stays text', () => {
    const blocks = parseMarkdown('<img src=x onerror=alert(1)> <b>ciao</b>');
    expect(blocks).toEqual([
      {
        kind: 'paragraph',
        children: [{ kind: 'text', text: '<img src=x onerror=alert(1)> <b>ciao</b>' }],
      },
    ]);
  });

  it('reads nested marks and inline code', () => {
    expect(parseInlineMarkdown('**molto** *bene* e `**codice**`')).toEqual([
      { kind: 'strong', children: [{ kind: 'text', text: 'molto' }] },
      { kind: 'text', text: ' ' },
      { kind: 'em', children: [{ kind: 'text', text: 'bene' }] },
      { kind: 'text', text: ' e ' },
      { kind: 'code', text: '**codice**' },
    ]);
  });
});
