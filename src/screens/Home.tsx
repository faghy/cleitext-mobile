import { useState } from 'react';
import { Icon } from '../components/icons';
import {
  Cell,
  ErrorBox,
  Loading,
  Screen,
  Section,
  Sheet,
  useLoad,
  useToast,
} from '../components/ui';
import { t } from '../i18n';
import { optional, type ApiClient } from '../lib/api';
import { registry } from '../lib/app';
import { relativeTime } from '../lib/format';
import { adminUrl, openInBrowser, pickPhoto } from '../lib/native';
import { readPref } from '../lib/storage';
import type { Site } from '../lib/sites';
import { useNav, useSites } from '../nav';

export const can = (site: Site, capability: string) => site.capabilities.includes(capability);

export function seenKey(site: Site) {
  return `seen.messages.${site.id}`;
}

async function loadHome(site: Site, api: ApiClient) {
  const me = await api.me();
  if (
    me.site.name !== site.name ||
    me.user.displayName !== site.userName ||
    me.capabilities.join() !== site.capabilities.join()
  ) {
    await registry.update(site.id, {
      name: me.site.name,
      userName: me.user.displayName,
      capabilities: me.capabilities,
    });
  }
  const moderates = me.capabilities.includes('moderate_comments');
  const [pending, submissions, orders, drafts, seen] = await Promise.all([
    moderates ? optional(api.pendingComments()) : Promise.resolve(null),
    optional(api.submissions()),
    optional(api.orders({ perPage: 10 })),
    me.capabilities.includes('edit_entries')
      ? optional(api.entries({ status: 'draft', limit: 5 }))
      : Promise.resolve(null),
    readPref<string>(seenKey(site), ''),
  ]);
  return {
    me,
    pending,
    messages: submissions ? submissions.filter((s) => s.createdAt > seen).length : null,
    orders: orders ? (orders.statuses.processing ?? 0) + (orders.statuses['on-hold'] ?? 0) : null,
    drafts: drafts?.items ?? null,
  };
}

export function SiteSwitcher() {
  const { sites, current } = useSites();
  const nav = useNav();
  const [open, setOpen] = useState(false);
  if (!current) return null;
  return (
    <>
      <button className="switcher" onClick={() => setOpen(true)} aria-label={t('sites.switch')}>
        <span className="large-title switcher__name">{current.name}</span>
        <Icon name="down" size={22} />
      </button>
      <Sheet open={open} title={t('sites.switch')} onClose={() => setOpen(false)}>
        <div className="group">
          {sites.map((s) => (
            <Cell
              key={s.id}
              icon="globe"
              title={s.name}
              subtitle={new URL(s.origin).hostname}
              detail={
                s.id === current.id ? (
                  <Icon name="check" size={20} className="text-brand" />
                ) : undefined
              }
              chevron={false}
              onClick={() => {
                void registry.select(s.id);
                setOpen(false);
              }}
            />
          ))}
        </div>
        <div className="group">
          <Cell
            icon="plus"
            title={t('sites.add')}
            onClick={() => {
              setOpen(false);
              nav.push({ name: 'addSite' });
            }}
          />
          <Cell
            icon="sites"
            title={t('sites.manage')}
            onClick={() => {
              setOpen(false);
              nav.push({ name: 'sites' });
            }}
          />
        </div>
      </Sheet>
    </>
  );
}

export function Home({ site }: { site: Site }) {
  const nav = useNav();
  const toast = useToast();
  const api = registry.api(site);
  const home = useLoad(() => loadHome(site, api), site.id);
  const [uploading, setUploading] = useState(false);

  const snap = async () => {
    const photo = await pickPhoto('camera');
    if (!photo) return;
    setUploading(true);
    try {
      await api.upload(photo.blob, photo.filename);
      toast(t('media.uploaded'));
    } catch {
      toast(t('error'));
    } finally {
      setUploading(false);
    }
  };

  const data = home.data;
  return (
    <Screen title={site.name} titleSlot={<SiteSwitcher />}>
      {data && (
        <p className="hello">
          {t('home.hello', { name: data.me.user.displayName.split(' ')[0] ?? '' })}
        </p>
      )}
      {home.loading && !data && <Loading />}
      {home.error !== undefined && !data && <ErrorBox error={home.error} onRetry={home.reload} />}
      {data && (
        <>
          <div className="stats">
            {data.pending !== null && (
              <button className="stat" onClick={() => nav.open('comments')}>
                <span className="stat__value">{data.pending}</span>
                <span className="stat__label">{t('home.pending')}</span>
              </button>
            )}
            {data.messages !== null && (
              <button className="stat" onClick={() => nav.push({ name: 'messages' })}>
                <span className="stat__value">{data.messages}</span>
                <span className="stat__label">{t('home.messages')}</span>
              </button>
            )}
            {data.orders !== null && (
              <button className="stat" onClick={() => nav.push({ name: 'orders' })}>
                <span className="stat__value">{data.orders}</span>
                <span className="stat__label">{t('home.orders')}</span>
              </button>
            )}
          </div>
          <Section title={t('home.quick')}>
            {data.me.capabilities.includes('edit_entries') && (
              <Cell
                icon="write"
                iconColor="#0369a1"
                title={t('home.newPost')}
                onClick={() => nav.open('write')}
              />
            )}
            {data.me.capabilities.includes('upload_media') && (
              <Cell
                icon="camera"
                iconColor="#7c3aed"
                title={t('home.takePhoto')}
                detail={uploading ? <span className="spinner spinner--small" /> : undefined}
                onClick={() => void snap()}
              />
            )}
            <Cell
              icon="admin"
              iconColor="#0f766e"
              title={t('home.openAdmin')}
              onClick={() => void openInBrowser(adminUrl(site))}
            />
            <Cell
              icon="globe"
              iconColor="#ea580c"
              title={t('home.viewSite')}
              onClick={() => void openInBrowser(site.origin)}
            />
          </Section>
          {data.drafts && (
            <Section
              title={t('home.drafts')}
              footer={data.drafts.length === 0 ? t('home.noDrafts') : undefined}
            >
              {data.drafts.map((d) => (
                <Cell
                  key={d.id}
                  icon="drafts"
                  iconColor="#64748b"
                  title={d.title || '—'}
                  subtitle={relativeTime(d.updatedAt)}
                  onClick={() => void openInBrowser(adminUrl(site, `/entries/${d.id}`))}
                />
              ))}
            </Section>
          )}
        </>
      )}
    </Screen>
  );
}
