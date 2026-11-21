import { Clipboard } from '@capacitor/clipboard';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { locale, t } from '../i18n';
import { registry } from '../lib/app';
import { askChriss, queueAfter, type ChatHistoryMessage, type ChatProblem } from '../lib/chat';
import { adminUrl, isNative, openInBrowser } from '../lib/native';
import type { Site } from '../lib/sites';
import { Icon } from './icons';
import { Markdown } from './Markdown';
import { Button, useToast } from './ui';

interface Item {
  id: number;
  role: 'user' | 'assistant' | 'problem';
  text: string;
  problem?: ChatProblem;
}

interface Conversation {
  items: Item[];
  history: ChatHistoryMessage[];
}

/** One conversation per site, kept while the app runs (never stored). */
const conversations = new Map<string, Conversation>();
let nextId = 1;

function conversation(siteId: string): Conversation {
  let found = conversations.get(siteId);
  if (!found) {
    found = { items: [], history: [] };
    conversations.set(siteId, found);
  }
  return found;
}

function ChrissAvatar({ size = 32 }: { size?: number }) {
  return (
    <span className="chriss-avatar" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 24 24" width={size * 0.58} height={size * 0.58} fill="none">
        <path
          d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"
          fill="currentColor"
        />
        <path d="M18.5 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" fill="currentColor" opacity=".7" />
      </svg>
    </span>
  );
}

function ProblemText({ problem, site }: { problem: ChatProblem; site: Site }) {
  const settings = (
    <Button small onClick={() => void openInBrowser(adminUrl(site, '/assistants'))}>
      {t('chriss.settings')}
    </Button>
  );
  switch (problem.kind) {
    case 'no_provider':
      return (
        <>
          <p>{t('chriss.noProvider')}</p>
          {settings}
        </>
      );
    case 'quota': {
      const reset = problem.resetAt ? new Date(problem.resetAt) : null;
      return (
        <>
          <p>{t('chriss.quota')}</p>
          {reset && !Number.isNaN(reset.getTime()) && (
            <p className="hint">
              {t('chriss.quotaReset', {
                when: reset.toLocaleString(locale, {
                  weekday: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              })}
            </p>
          )}
          {settings}
        </>
      );
    }
    case 'unsupported':
      return <p>{t('chriss.unsupported')}</p>;
    case 'forbidden':
      return <p>{t('chriss.forbidden')}</p>;
    default:
      return <p>{problem.message || t('error')}</p>;
  }
}

export function ChrissSheet({ site, onClose }: { site: Site; onClose: () => void }) {
  const toast = useToast();
  const [state, setState] = useState<Conversation>(() => conversation(site.id));
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [tool, setTool] = useState<string | null>(null);
  // Chriss base: the requests ahead of this one at the free service.
  const [queue, setQueue] = useState<number | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    conversations.set(site.id, state);
    end.current?.scrollIntoView({ block: 'end' });
  }, [state, site.id, busy]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const ask = async (question: string) => {
    const text = question.trim();
    if (!text || busy) return;
    setDraft('');
    setBusy(true);
    setTool(null);
    const before = state;
    setState({ ...before, items: [...before.items, { id: nextId++, role: 'user', text }] });
    const result = await askChriss(registry.api(site), before.history, text, (event) => {
      if (event.type === 'tool') setTool(event.name);
      if (event.type === 'tool-done') setTool(null);
      setQueue((current) => queueAfter(current, event));
    });
    setState((current) => ({
      history: result.messages ?? current.history,
      items: [
        ...current.items,
        result.problem
          ? { id: nextId++, role: 'problem', text: '', problem: result.problem }
          : { id: nextId++, role: 'assistant', text: result.text },
      ],
    }));
    setBusy(false);
    setTool(null);
    setQueue(null);
  };

  const copy = async (text: string) => {
    try {
      if (isNative) await Clipboard.write({ string: text });
      else await navigator.clipboard.writeText(text);
      toast(t('chriss.copied'));
    } catch {
      toast(t('error'));
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void ask(draft);
  };

  return (
    <div className="chat" role="dialog" aria-modal="true" aria-label={t('chriss.name')}>
      <header className="chat__bar">
        <button
          className="bar__action"
          onClick={() => {
            setState({ items: [], history: [] });
          }}
          disabled={busy || state.items.length === 0}
        >
          {t('chriss.new')}
        </button>
        <div className="chat__title">
          <ChrissAvatar size={26} />
          <span>{t('chriss.name')}</span>
        </div>
        <button className="bar__action" onClick={onClose} aria-label={t('close')}>
          <Icon name="x" size={24} />
        </button>
      </header>
      <div className="chat__body" aria-live="polite">
        {state.items.length === 0 && (
          <div className="chat__intro">
            <ChrissAvatar size={56} />
            <p>{t('chriss.hello')}</p>
            <p className="hint">{t('chriss.drafts')}</p>
            <div className="chat__suggestions">
              {(['chriss.s1', 'chriss.s2', 'chriss.s3'] as const).map((key) => (
                <button key={key} onClick={() => void ask(t(key))}>
                  {t(key)}
                </button>
              ))}
            </div>
          </div>
        )}
        {state.items.map((item) =>
          item.role === 'user' ? (
            <div key={item.id} className="msg msg--user">
              <p>{item.text}</p>
            </div>
          ) : (
            <div key={item.id} className="msg-row">
              <ChrissAvatar />
              <div className={`msg msg--chriss${item.role === 'problem' ? ' msg--problem' : ''}`}>
                {item.problem ? (
                  <ProblemText problem={item.problem} site={site} />
                ) : (
                  <>
                    <Markdown source={item.text} />
                    <button className="msg__copy" onClick={() => void copy(item.text)}>
                      <Icon name="doc" size={15} />
                      {t('chriss.copy')}
                    </button>
                  </>
                )}
              </div>
            </div>
          ),
        )}
        {busy && (
          <div className="msg-row">
            <ChrissAvatar />
            <div className="msg msg--chriss msg--typing">
              <span className="dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span>
                {tool
                  ? `${t('chriss.working')} (${tool})`
                  : queue
                    ? t('chriss.queue', { count: queue })
                    : t('chriss.working')}
              </span>
            </div>
          </div>
        )}
        <div ref={end} />
      </div>
      <form className="chat__composer" onSubmit={submit}>
        <textarea
          rows={1}
          value={draft}
          placeholder={t('chriss.placeholder')}
          aria-label={t('chriss.placeholder')}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !isNative) {
              e.preventDefault();
              void ask(draft);
            }
          }}
        />
        <button
          className="chat__send"
          type="submit"
          disabled={busy || !draft.trim()}
          aria-label={t('chriss.send')}
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      </form>
    </div>
  );
}

export function ChrissBubble({ site }: { site: Site }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {!open && (
        <button
          className="chriss-bubble"
          onClick={() => setOpen(true)}
          aria-label={t('chriss.open')}
        >
          <ChrissAvatar size={56} />
        </button>
      )}
      {open && <ChrissSheet site={site} onClose={() => setOpen(false)} />}
    </>
  );
}
