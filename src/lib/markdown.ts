/**
 * A small, safe Markdown reader for Chriss's answers: blocks and inline marks
 * become plain data, rendered as React elements (never raw HTML).
 */

export type Inline =
  | { kind: 'text'; text: string }
  | { kind: 'strong'; children: Inline[] }
  | { kind: 'em'; children: Inline[] }
  | { kind: 'code'; text: string }
  | { kind: 'link'; href: string; children: Inline[] };

export type Block =
  | { kind: 'paragraph'; children: Inline[] }
  | { kind: 'heading'; level: number; children: Inline[] }
  | { kind: 'list'; ordered: boolean; items: Inline[][] }
  | { kind: 'code'; text: string }
  | { kind: 'quote'; children: Inline[] }
  | { kind: 'rule' };

const SAFE_HREF = /^(https?:\/\/|mailto:)/i;

export function parseInlineMarkdown(source: string): Inline[] {
  const out: Inline[] = [];
  const pattern =
    /`([^`\n]+)`|\[([^\]\n]+)\]\(([^)\s]+)\)|\*\*([^*\n]+?)\*\*|__([^_\n]+?)__|\*([^*\n]+?)\*|_([^_\n]+?)_|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g;
  let last = 0;
  const text = (value: string) => {
    if (!value) return;
    const prev = out[out.length - 1];
    if (prev?.kind === 'text') prev.text += value;
    else out.push({ kind: 'text', text: value });
  };
  for (let m = pattern.exec(source); m; m = pattern.exec(source)) {
    text(source.slice(last, m.index));
    if (m[1] !== undefined) out.push({ kind: 'code', text: m[1] });
    else if (m[2] !== undefined && m[3] !== undefined) {
      if (SAFE_HREF.test(m[3]))
        out.push({ kind: 'link', href: m[3], children: parseInlineMarkdown(m[2]) });
      else text(m[2]);
    } else if (m[4] !== undefined || m[5] !== undefined)
      out.push({ kind: 'strong', children: parseInlineMarkdown((m[4] ?? m[5])!) });
    else if (m[6] !== undefined || m[7] !== undefined)
      out.push({ kind: 'em', children: parseInlineMarkdown((m[6] ?? m[7])!) });
    else if (m[8] !== undefined)
      out.push({ kind: 'link', href: m[8], children: [{ kind: 'text', text: m[8] }] });
    last = m.index + m[0].length;
  }
  text(source.slice(last));
  return out;
}

const LIST = /^\s*(?:([-*+•])|(\d+)[.)])\s+(.*)$/;

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length)
      blocks.push({ kind: 'paragraph', children: parseInlineMarkdown(paragraph.join('\n')) });
    paragraph = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (/^\s*```/.test(line)) {
      flush();
      const code: string[] = [];
      for (i++; i < lines.length && !/^\s*```/.test(lines[i]!); i++) code.push(lines[i]!);
      blocks.push({ kind: 'code', text: code.join('\n') });
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    const heading = /^(#{1,6})\s+(.+)$/.exec(line.trim());
    if (heading) {
      flush();
      blocks.push({
        kind: 'heading',
        level: heading[1]!.length,
        children: parseInlineMarkdown(heading[2]!),
      });
      continue;
    }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      flush();
      blocks.push({ kind: 'rule' });
      continue;
    }
    if (/^\s*>/.test(line)) {
      flush();
      const quote: string[] = [];
      for (; i < lines.length && /^\s*>/.test(lines[i]!); i++)
        quote.push(lines[i]!.replace(/^\s*>\s?/, ''));
      i--;
      blocks.push({ kind: 'quote', children: parseInlineMarkdown(quote.join('\n')) });
      continue;
    }
    const item = LIST.exec(line);
    if (item) {
      flush();
      const ordered = item[2] !== undefined;
      const items: Inline[][] = [];
      for (; i < lines.length; i++) {
        const next = LIST.exec(lines[i]!);
        if (!next || (next[2] !== undefined) !== ordered) break;
        items.push(parseInlineMarkdown(next[3]!));
      }
      i--;
      blocks.push({ kind: 'list', ordered, items });
      continue;
    }
    paragraph.push(line);
  }
  flush();
  return blocks;
}
