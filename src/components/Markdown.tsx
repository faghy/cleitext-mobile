import type { ReactNode } from 'react';
import { parseMarkdown, type Inline } from '../lib/markdown';
import { openInBrowser } from '../lib/native';

function inline(nodes: Inline[]): ReactNode[] {
  return nodes.map((node, i) => {
    switch (node.kind) {
      case 'text':
        return node.text;
      case 'strong':
        return <strong key={i}>{inline(node.children)}</strong>;
      case 'em':
        return <em key={i}>{inline(node.children)}</em>;
      case 'code':
        return <code key={i}>{node.text}</code>;
      case 'link':
        return (
          <a
            key={i}
            href={node.href}
            onClick={(e) => {
              e.preventDefault();
              void openInBrowser(node.href);
            }}
          >
            {inline(node.children)}
          </a>
        );
    }
  });
}

/** Chriss's Markdown as React elements: no raw HTML ever reaches the page. */
export function Markdown({ source }: { source: string }) {
  return (
    <div className="md">
      {parseMarkdown(source).map((block, i) => {
        switch (block.kind) {
          case 'paragraph':
            return <p key={i}>{inline(block.children)}</p>;
          case 'heading':
            return block.level <= 2 ? (
              <h3 key={i}>{inline(block.children)}</h3>
            ) : (
              <h4 key={i}>{inline(block.children)}</h4>
            );
          case 'list': {
            const items = block.items.map((item, j) => <li key={j}>{inline(item)}</li>);
            return block.ordered ? <ol key={i}>{items}</ol> : <ul key={i}>{items}</ul>;
          }
          case 'code':
            return (
              <pre key={i}>
                <code>{block.text}</code>
              </pre>
            );
          case 'quote':
            return <blockquote key={i}>{inline(block.children)}</blockquote>;
          case 'rule':
            return <hr key={i} />;
        }
      })}
    </div>
  );
}
