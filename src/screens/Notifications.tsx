import { useState } from 'react';
import { Icon } from '../components/icons';
import {
  Button,
  Empty,
  ErrorBox,
  Loading,
  Notice,
  Screen,
  Section,
  useLoad,
  useToast,
} from '../components/ui';
import { t, type MessageKey } from '../i18n';
import { optional } from '../lib/api';
import { registry } from '../lib/app';
import { enablePush, permission, pushAvailable, registerSite } from '../lib/push';
import { readPref } from '../lib/storage';
import type { Site } from '../lib/sites';
import { PUSH_EVENTS } from '../lib/types';
import { useSites } from '../nav';

function SiteToggles({ site }: { site: Site }) {
  const api = registry.api(site);
  const toast = useToast();
  const status = useLoad(
    async () => {
      const pushStatus = await optional(api.pushStatus());
      let current = site;
      if (pushStatus?.enabled && !site.deviceId) {
        const token = await readPref<string | null>('push.token', null);
        if (token) current = await registerSite(site, token);
      }
      return { pushStatus, current };
    },
    `${site.id}:${site.deviceId ?? ''}`,
  );
  const [events, setEvents] = useState<string[] | null>(null);

  if (status.loading && !status.data) return <Loading />;
  if (status.error !== undefined) return <ErrorBox error={status.error} onRetry={status.reload} />;
  const data = status.data!;
  if (!data.pushStatus || !data.pushStatus.enabled) {
    return (
      <Section title={site.name}>
        <p className="section__note">{t('notify.siteOff')}</p>
      </Section>
    );
  }
  const available = PUSH_EVENTS.filter(
    (e) => data.pushStatus!.events.length === 0 || data.pushStatus!.events.includes(e),
  );
  const chosen = events ?? data.current.events ?? available;
  const toggle = async (event: string, on: boolean) => {
    const next = on ? [...new Set([...chosen, event])] : chosen.filter((e) => e !== event);
    setEvents(next);
    if (!data.current.deviceId) return;
    try {
      const device = await api.setDeviceEvents(data.current.deviceId, next);
      await registry.update(site.id, { events: device?.events ?? next });
      toast(t('notify.saved'));
    } catch (error) {
      setEvents(chosen);
      toast(error instanceof Error ? error.message : t('error'));
    }
  };
  return (
    <Section title={site.name}>
      {available.map((event) => (
        <label key={event} className="cell cell--switch">
          <span className="cell__main">
            <span className="cell__title">{t(`notify.${event}` as MessageKey)}</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            className="switch"
            checked={chosen.includes(event)}
            onChange={(e) => void toggle(event, e.target.checked)}
          />
        </label>
      ))}
    </Section>
  );
}

export function Notifications({ onBack }: { onBack: () => void }) {
  const { sites } = useSites();
  const state = useLoad(async () => {
    const available = await pushAvailable();
    return { available, permission: available ? await permission() : 'denied' };
  }, 'push');
  const [busy, setBusy] = useState(false);
  const enable = async () => {
    setBusy(true);
    try {
      await enablePush();
    } finally {
      setBusy(false);
      state.reload();
    }
  };
  return (
    <Screen title={t('notify.title')} onBack={onBack}>
      {state.loading && !state.data && <Loading />}
      {state.data && !state.data.available && <Empty icon="bell" text={t('notify.unavailable')} />}
      {state.data?.available && state.data.permission !== 'granted' && (
        <div className="explain">
          <span className="explain__icon" aria-hidden="true">
            <Icon name="bell" size={34} />
          </span>
          <p>{t('notify.intro')}</p>
          <p className="hint">{t('notify.privacy')}</p>
          {state.data.permission === 'denied' ? (
            <Notice tone="warning">{t('notify.denied')}</Notice>
          ) : null}
          <Button icon="bell" busy={busy} onClick={() => void enable()}>
            {t('notify.enable')}
          </Button>
        </div>
      )}
      {state.data?.available && state.data.permission === 'granted' && (
        <>
          <Notice tone="success">{t('notify.active')}</Notice>
          {sites
            .filter((s) => !s.signedOut)
            .map((site) => (
              <SiteToggles key={site.id} site={site} />
            ))}
        </>
      )}
    </Screen>
  );
}
