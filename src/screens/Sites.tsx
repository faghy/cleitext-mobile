import { useState, useSyncExternalStore, type FormEvent } from 'react';
import { Icon } from '../components/icons';
import { Button, Cell, Notice, Screen, Section, useToast } from '../components/ui';
import { t, type MessageKey } from '../i18n';
import { registry } from '../lib/app';
import { signIn } from '../lib/signin';
import { useNav, useSites } from '../nav';

export function Welcome() {
  const nav = useNav();
  return (
    <Screen title="Cleitext" large={false}>
      <div className="welcome">
        <img className="welcome__logo" src="logo.png" alt="" width={96} height={96} />
        <h1>{t('welcome.title')}</h1>
        <p>{t('welcome.text')}</p>
        <Button icon="plus" onClick={() => nav.push({ name: 'addSite' })}>
          {t('sites.add')}
        </Button>
        <Button kind="secondary" icon="shop" onClick={() => nav.setTab('shop')}>
          {t('shop.title')}
        </Button>
        <Button kind="plain" onClick={() => nav.push({ name: 'register' })}>
          {t('account.create')}
        </Button>
      </div>
    </Screen>
  );
}

export function AddSite({
  onBack,
  siteId,
  initial = '',
}: {
  onBack?: () => void;
  siteId?: string;
  initial?: string;
}) {
  const [address, setAddress] = useState(initial);
  const state = useSyncExternalStore(signIn.subscribe, signIn.get);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void signIn.start(address, siteId);
  };
  const busy = state.phase === 'checking';
  return (
    <Screen title={t('sites.add')} onBack={onBack}>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span className="field__label">{t('sites.address')}</span>
          <input
            type="url"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="url"
            spellCheck={false}
            placeholder={t('sites.addressHint')}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </label>
        <p className="hint">{t('sites.signinInfo')}</p>
        {state.phase === 'error' && (
          <Notice tone="warning">
            {t((state.code === 'unknown' ? 'error' : `oauth.${state.code}`) as MessageKey)}
          </Notice>
        )}
        {state.phase === 'waiting' && <Notice>{t('sites.waiting')}</Notice>}
        <Button type="submit" busy={busy} disabled={!address.trim()}>
          {t('sites.continue')}
        </Button>
      </form>
    </Screen>
  );
}

export function SitesScreen({ onBack }: { onBack?: () => void }) {
  const { sites, current } = useSites();
  const nav = useNav();
  const toast = useToast();
  const remove = async (id: string) => {
    const site = sites.find((s) => s.id === id);
    if (!site) return;
    if (!window.confirm(t('sites.removeConfirm', { site: site.name }))) return;
    await registry.remove(site);
    toast(t('comments.done'));
  };
  return (
    <Screen title={t('sites.title')} onBack={onBack}>
      <Section>
        {sites.map((site) => (
          <div key={site.id} className="site-row">
            <Cell
              icon="globe"
              title={site.name}
              subtitle={
                site.signedOut ? (
                  <span className="text-warning">{t('sites.signedOut')}</span>
                ) : (
                  `${new URL(site.origin).hostname}${site.userName ? ` · ${site.userName}` : ''}`
                )
              }
              detail={
                site.id === current?.id ? (
                  <Icon name="check" size={20} className="text-brand" />
                ) : undefined
              }
              onClick={() => {
                if (site.signedOut) void signIn.start(site.origin, site.id);
                else {
                  void registry.select(site.id);
                  nav.open('home');
                }
              }}
              chevron={false}
            />
            <div className="site-row__actions">
              {site.signedOut && (
                <button onClick={() => void signIn.start(site.origin, site.id)}>
                  {t('sites.signInAgain')}
                </button>
              )}
              <button className="text-danger" onClick={() => void remove(site.id)}>
                {t('sites.remove')}
              </button>
            </div>
          </div>
        ))}
        <Cell icon="plus" title={t('sites.add')} onClick={() => nav.push({ name: 'addSite' })} />
      </Section>
    </Screen>
  );
}
