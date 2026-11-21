import { Cell, Screen, Section, useLoad } from '../components/ui';
import { cleitextPage, t } from '../i18n';
import { optional } from '../lib/api';
import { registry } from '../lib/app';
import { adminUrl, appVersion, openInBrowser } from '../lib/native';
import { useNav, useSites } from '../nav';
import { can } from './Home';

export function More() {
  const nav = useNav();
  const { current: site, sites } = useSites();
  const features = useLoad(async () => {
    if (!site || site.signedOut) return { forms: false, shop: false };
    const api = registry.api(site);
    const [forms, shop] = await Promise.all([
      optional(api.submissions()).catch(() => null),
      optional(api.orders({ perPage: 10 })).catch(() => null),
    ]);
    return { forms: forms !== null, shop: shop !== null };
  }, site?.id ?? 'none');
  return (
    <Screen title={t('more.title')}>
      {site && (
        <Section title={site.name}>
          {features.data?.forms && (
            <Cell
              icon="mail"
              iconColor="#0891b2"
              title={t('messages.title')}
              onClick={() => nav.push({ name: 'messages' })}
            />
          )}
          {features.data?.shop && (
            <Cell
              icon="bag"
              iconColor="#16a34a"
              title={t('orders.title')}
              onClick={() => nav.push({ name: 'orders' })}
            />
          )}
          {can(site, 'upload_media') && (
            <Cell
              icon="media"
              iconColor="#7c3aed"
              title={t('media.title')}
              onClick={() => nav.push({ name: 'media' })}
            />
          )}
          <Cell
            icon="admin"
            iconColor="#0f766e"
            title={t('admin.open')}
            onClick={() => void openInBrowser(adminUrl(site))}
          />
        </Section>
      )}
      <Section title={t('more.app')}>
        <Cell
          icon="sites"
          iconColor="#0369a1"
          title={t('sites.title')}
          detail={String(sites.length)}
          onClick={() => nav.push({ name: 'sites' })}
        />
        <Cell
          icon="bell"
          iconColor="#dc2626"
          title={t('notify.title')}
          onClick={() => nav.push({ name: 'notifications' })}
        />
        <Cell
          icon="user"
          iconColor="#ea580c"
          title={t('account.title')}
          onClick={() => nav.push({ name: 'account' })}
        />
        <Cell
          icon="info"
          iconColor="#64748b"
          title={t('settings.title')}
          onClick={() => nav.push({ name: 'settings' })}
        />
      </Section>
    </Screen>
  );
}

export function Settings({ onBack }: { onBack: () => void }) {
  const nav = useNav();
  const version = useLoad(appVersion, 'version');
  return (
    <Screen title={t('settings.title')} onBack={onBack}>
      <div className="about">
        <img src="logo.png" alt="" width={72} height={72} />
        <strong>Cleitext</strong>
        <span>
          {t('settings.version')} {version.data ?? ''}
        </span>
      </div>
      <Section footer={t('settings.about')}>
        <Cell
          icon="info"
          title={t('settings.privacy')}
          onClick={() => void openInBrowser(cleitextPage('privacy-app'))}
        />
        <Cell
          icon="heart"
          title={t('settings.support')}
          onClick={() => void openInBrowser(cleitextPage('supporto-app'))}
        />
        <Cell
          icon="doc"
          title={t('settings.licenses')}
          onClick={() => nav.push({ name: 'licenses' })}
        />
        <Cell
          icon="external"
          title={t('settings.source')}
          onClick={() => void openInBrowser('https://github.com/faghy/cleitext-mobile')}
        />
      </Section>
      <Section title={t('settings.deleteAccount')} footer={t('settings.deleteText')}>
        <Cell icon="sites" title={t('sites.manage')} onClick={() => nav.push({ name: 'sites' })} />
        <Cell
          icon="external"
          title={t('settings.deleteLink')}
          onClick={() => void openInBrowser(cleitextPage('elimina-account-app'))}
        />
      </Section>
    </Screen>
  );
}

export function Licenses({ onBack }: { onBack: () => void }) {
  const text = useLoad(() => import('../licenses.txt?raw').then((m) => m.default), 'licenses');
  return (
    <Screen title={t('settings.licenses')} onBack={onBack} large={false}>
      <pre className="licenses">{text.data ?? t('loading')}</pre>
    </Screen>
  );
}
