/**
 * Quick posts → Cleitext Document (CXD), the block format the REST API stores
 * (the same blocks the editor and the MCP tools write): paragraphs, headings,
 * lists and images. The writing is plain text with a few friendly marks:
 * blank lines between paragraphs, `#` headings, `-` lists, **bold**,
 * *italic* and [links](https://…).
 */

export type Mark = 'bold' | 'italic';

export interface CxdText {
  text: string;
  marks?: Mark[];
}

export interface CxdLink {
  type: 'link';
  href: string;
  children: CxdText[];
}

export type CxdInline = CxdText | CxdLink;

export interface CxdBlock {
  id: string;
  type: string;
  v: number;
  attrs: Record<string, unknown>;
  content?: CxdInline[];
  children?: CxdBlock[];
}

export interface CxdDocument {
  schema: 1;
  blocks: CxdBlock[];
}

export type DraftPart =
  { kind: 'text'; text: string } | { kind: 'image'; mediaId: string; url: string; alt: string };

let counter = 0;

/** Block ids as the editor makes them: short, URL-safe, unique in the document. */
export function blockId(): string {
  counter = (counter + 1) % 1_296;
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `b_${time}${counter.toString(36).padStart(2, '0')}${random}`;
}

const SAFE_LINK = /^(https?:\/\/|mailto:|tel:|\/)/i;

/** Inline marks of a line: **bold**, *italic* or _italic_, [text](address). */
export function parseInline(source: string): CxdInline[] {
  const out: CxdInline[] = [];
  const push = (text: string, marks: Mark[] = []) => {
    if (!text) return;
    const last = out[out.length - 1];
    const same = last && !('type' in last) && (last.marks ?? []).join() === marks.join();
    if (same) {
      (last as CxdText).text += text;
      return;
    }
    out.push(marks.length ? { text, marks: [...marks] } : { text });
  };
  const pattern = /\[([^\]\n]+)\]\(([^)\s]+)\)|\*\*([^*\n]+?)\*\*|\*([^*\n]+?)\*|_([^_\n]+?)_/g;
  let last = 0;
  for (let match = pattern.exec(source); match; match = pattern.exec(source)) {
    push(source.slice(last, match.index));
    if (match[1] !== undefined && match[2] !== undefined) {
      if (SAFE_LINK.test(match[2])) {
        out.push({ type: 'link', href: match[2], children: [{ text: match[1] }] });
      } else {
        push(match[0]);
      }
    } else if (match[3] !== undefined) {
      push(match[3], ['bold']);
    } else {
      push((match[4] ?? match[5])!, ['italic']);
    }
    last = match.index + match[0].length;
  }
  push(source.slice(last));
  return out;
}

const block = (
  type: string,
  attrs: Record<string, unknown> = {},
  extra: Partial<CxdBlock> = {},
): CxdBlock => ({ id: blockId(), type, v: 1, attrs, ...extra });

const LIST_ITEM = /^\s*(?:[-*•]|(\d+)[.)])\s+(.*)$/;

/** The blocks of a piece of text. */
export function textToBlocks(text: string): CxdBlock[] {
  const blocks: CxdBlock[] = [];
  const chunks = text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((c) => c.replace(/^\n+|\s+$/g, ''))
    .filter((c) => c.trim() !== '');
  for (const chunk of chunks) {
    const lines = chunk.split('\n');
    const heading = /^(#{1,3})\s+(.+)$/.exec(lines[0]!.trim());
    if (heading && lines.length === 1) {
      blocks.push(
        block(
          'core/heading',
          { level: heading[1]!.length + 1 },
          {
            content: parseInline(heading[2]!.trim()),
          },
        ),
      );
      continue;
    }
    if (lines.every((line) => LIST_ITEM.test(line))) {
      const ordered = LIST_ITEM.exec(lines[0]!)![1] !== undefined;
      blocks.push(
        block('core/list', ordered ? { ordered: true } : {}, {
          children: lines.map((line) =>
            block('core/list-item', {}, { content: parseInline(LIST_ITEM.exec(line)![2]!.trim()) }),
          ),
        }),
      );
      continue;
    }
    // Single line breaks stay line breaks inside the paragraph.
    blocks.push(block('core/paragraph', {}, { content: parseInline(lines.join('\n')) }));
  }
  return blocks;
}

/** The document of a quick post: its text parts and photos, in order. */
export function draftToDocument(parts: DraftPart[]): CxdDocument {
  const blocks: CxdBlock[] = [];
  for (const part of parts) {
    if (part.kind === 'text') blocks.push(...textToBlocks(part.text));
    else blocks.push(block('core/image', { id: part.mediaId, url: part.url, alt: part.alt }));
  }
  return { schema: 1, blocks };
}

/** True when the post has something besides its title. */
export function hasBody(parts: DraftPart[]): boolean {
  return parts.some((p) => p.kind === 'image' || p.text.trim() !== '');
}
