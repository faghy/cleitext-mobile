import { useEffect } from 'react';
import {
  Avatar,
  Button,
  Cell,
  Empty,
  ErrorBox,
  Loading,
  Screen,
  Section,
  useLoad,
  useToast,
} from '../components/ui';
import { t } from '../i18n';
import { registry } from '../lib/app';
import { dateTime, relativeTime } from '../lib/format';
import { openExternal } from '../lib/native';
import { readPref, writePref } from '../lib/storage';
import type { Site } from '../lib/sites';
import { useNav } from '../nav';
import { seenKey } from './Home';

export function Messages({ site, onBack }: { site: Site; onBack: () => void }) {
  const api = registry.api(site);
  const nav = useNav();
  const list = useLoad(async () => {
    const [items, seen] = await Promise.all([
      api.submissions(),
      readPref<string>(seenKey(site), ''),
    ]);
    return { items, seen };
  }, site.id);
  useEffect(() => {
    const newest = list.data?.items[0]?.createdAt;
    if (newest) void writePref(seenKey(site), newest);
  }, [list.data, site]);
  return (
    <Screen title={t('messages.title')} onBack={onBack}>
      {list.loading && !list.data && <Loading />}
      {list.error !== undefined && <ErrorBox error={list.error} onRetry={list.reload} />}
      {list.data && list.data.items.length === 0 && (
        <Empty icon="mail" text={t('messages.empty')} />
      )}
      {list.data && list.data.items.length > 0 && (
        <Section>
          {list.data.items.map((m) => (
            <Cell
              key={m.id}
              leading={<Avatar name={m.name || m.email} size={38} />}
              title={
                <>
                  {m.createdAt > list.data!.seen && <span className="dot" aria-hidden="true" />}
                  {m.name || m.email}
                </>
              }
              subtitle={m.message.slice(0, 90) || m.formName}
              detail={relativeTime(m.createdAt)}
              onClick={() => nav.push({ name: 'message', id: m.id })}
            />
          ))}
        </Section>
      )}
    </Screen>
  );
}

export function MessageDetail({
  site,
  id,
  onBack,
}: {
  site: Site;
  id: string;
  onBack: () => void;
}) {
  const api = registry.api(site);
  const toast = useToast();
  const list = useLoad(() => api.submissions(), `${site.id}:${id}`);
  const message = list.data?.find((m) => m.id === id);
  const remove = async () => {
    if (!window.confirm(t('messages.deleteConfirm'))) return;
    try {
      await api.deleteSubmission(id);
      toast(t('comments.done'));
      onBack();
    } catch (error) {
      toast(error instanceof Error ? error.message : t('error'));
    }
  };
  return (
    <Screen title={message?.name || t('messages.title')} onBack={onBack} large={false}>
      {list.loading && !list.data && <Loading />}
      {list.error !== undefined && <ErrorBox error={list.error} onRetry={list.reload} />}
      {message && (
        <>
          <div className="person">
            <Avatar name={message.name || message.email} size={64} />
            <h1>{message.name || message.email}</h1>
            <p>{dateTime(message.createdAt)}</p>
            <div className="row row--center">
              {message.email && (
                <Button small icon="mail" onClick={() => openExternal(`mailto:${message.email}`)}>
                  {t('messages.email')}
                </Button>
              )}
              {message.phone && (
                <Button
                  small
                  kind="secondary"
                  icon="phone"
                  onClick={() => openExternal(`tel:${message.phone}`)}
                >
                  {t('messages.call')}
                </Button>
              )}
            </div>
          </div>
          {message.message && (
            <div className="card message-text">
              <p>{message.message}</p>
            </div>
          )}
          <Section>
            {(message.fields ?? [])
              .filter((f) => f.value && f.type !== 'textarea')
              .map((f) => (
                <Cell key={f.name} title={f.label} subtitle={f.value} />
              ))}
            <Cell title={t('messages.form')} subtitle={message.formName} />
            <Cell title={t('messages.page')} subtitle={message.pagePath} />
            {message.email && <Cell title="Email" subtitle={message.email} />}
            {message.phone && <Cell title={t('messages.call')} subtitle={message.phone} />}
          </Section>
          <div className="pad">
            <Button kind="danger" icon="trash" onClick={() => void remove()}>
              {t('messages.delete')}
            </Button>
          </div>
        </>
      )}
    </Screen>
  );
}
