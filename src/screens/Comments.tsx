import { useState } from 'react';
import { Icon } from '../components/icons';
import {
  Avatar,
  Button,
  Empty,
  ErrorBox,
  Loading,
  Screen,
  Segmented,
  useLoad,
  useToast,
} from '../components/ui';
import { t } from '../i18n';
import { registry } from '../lib/app';
import { relativeTime } from '../lib/format';
import type { Site } from '../lib/sites';
import type { Comment, CommentStatus } from '../lib/types';
import { can } from './Home';

type Filter = 'pending' | 'approved' | 'spam';

export function Comments({ site }: { site: Site }) {
  const api = registry.api(site);
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('pending');
  const list = useLoad(() => api.comments(filter), `${site.id}:${filter}`);
  const [replying, setReplying] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  if (!can(site, 'moderate_comments')) {
    return (
      <Screen title={t('comments.title')}>
        <Empty icon="comments" text={t('comments.noRight')} />
      </Screen>
    );
  }

  const drop = (id: string) => {
    if (!list.data) return;
    list.setData({
      ...list.data,
      items: list.data.items.filter((c) => c.id !== id),
      counts: {
        ...list.data.counts,
        [filter]: Math.max(0, (list.data.counts[filter] ?? 1) - 1),
      },
    });
  };

  const moderate = async (comment: Comment, status: CommentStatus) => {
    setBusy(comment.id + status);
    try {
      await api.setCommentStatus([comment.id], status);
      drop(comment.id);
      toast(t('comments.done'));
    } catch (error) {
      toast(error instanceof Error ? error.message : t('error'));
    } finally {
      setBusy(null);
    }
  };

  const send = async (comment: Comment) => {
    if (!reply.trim()) return;
    setBusy(comment.id + 'reply');
    try {
      await api.replyToComment(comment.id, reply.trim());
      if (comment.status === 'pending') drop(comment.id);
      setReplying(null);
      setReply('');
      toast(t('comments.done'));
    } catch (error) {
      toast(error instanceof Error ? error.message : t('error'));
    } finally {
      setBusy(null);
    }
  };

  const counts = list.data?.counts ?? {};
  return (
    <Screen title={t('comments.title')}>
      <Segmented
        label={t('comments.title')}
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'pending', label: t('comments.pending'), count: counts.pending },
          { value: 'approved', label: t('comments.approved') },
          { value: 'spam', label: t('comments.spam') },
        ]}
      />
      {list.loading && !list.data && <Loading />}
      {list.error !== undefined && <ErrorBox error={list.error} onRetry={list.reload} />}
      {list.data && list.data.items.length === 0 && (
        <Empty
          icon={filter === 'pending' ? 'check' : 'comments'}
          text={filter === 'pending' ? t('comments.empty') : t('comments.emptyOther')}
        />
      )}
      <ul className="cards">
        {list.data?.items.map((c) => (
          <li key={c.id} className="card comment">
            <div className="comment__head">
              <Avatar name={c.authorName} />
              <div>
                <div className="comment__author">{c.authorName}</div>
                <div className="comment__meta">
                  {relativeTime(c.createdAt)} · {t('comments.on', { title: c.entryTitle })}
                </div>
              </div>
            </div>
            <p className="comment__text">{c.content}</p>
            {replying === c.id ? (
              <div className="comment__reply">
                <textarea
                  rows={3}
                  value={reply}
                  placeholder={t('comments.replyPlaceholder')}
                  aria-label={t('comments.replyPlaceholder')}
                  onChange={(e) => setReply(e.target.value)}
                  autoFocus
                />
                <div className="row">
                  <Button kind="plain" small onClick={() => setReplying(null)}>
                    {t('cancel')}
                  </Button>
                  <Button
                    small
                    busy={busy === c.id + 'reply'}
                    disabled={!reply.trim()}
                    onClick={() => void send(c)}
                  >
                    {t('comments.send')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="actions">
                {c.status !== 'approved' && (
                  <button
                    className="action action--ok"
                    disabled={busy !== null}
                    onClick={() => void moderate(c, 'approved')}
                  >
                    <Icon name="check" size={18} />
                    {t('comments.approve')}
                  </button>
                )}
                <button
                  className="action"
                  onClick={() => {
                    setReplying(c.id);
                    setReply('');
                  }}
                >
                  <Icon name="reply" size={18} />
                  {t('comments.reply')}
                </button>
                {c.status !== 'spam' && (
                  <button
                    className="action"
                    disabled={busy !== null}
                    onClick={() => void moderate(c, 'spam')}
                  >
                    <Icon name="spam" size={18} />
                    {t('comments.markSpam')}
                  </button>
                )}
                <button
                  className="action action--danger"
                  disabled={busy !== null}
                  onClick={() => void moderate(c, 'trash')}
                >
                  <Icon name="trash" size={18} />
                  {t('comments.trash')}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Screen>
  );
}
