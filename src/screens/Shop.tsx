import { useState, type FormEvent } from 'react';
import { Button, Cell, Notice, Screen, Section } from '../components/ui';
import { cleitextPage, language, t } from '../i18n';
import { isNative, openInBrowser, platform } from '../lib/native';
import {
  accountPage,
  cartLink,
  register,
  SHOP_ORIGIN,
  type Plan,
  type Product,
  type RegisterResult,
} from '../shop/catalog';
import { useNav, useShop } from '../nav';

function euro(amount: number): string {
  return new Intl.NumberFormat(language === 'it' ? 'it-IT' : 'en-IE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function planScope(plan: Plan): string {
  if (plan.sites === 0) return t('shop.unlimited');
  if (plan.sites === 1) return t('shop.perSite');
  return t('shop.sites', { n: plan.sites });
}

function usePurchase(): boolean {
  const shop = useShop();
  const key = isNative ? platform : 'web';
  return shop.purchase[key as 'ios' | 'android' | 'web'] !== false;
}

export function ShopScreen() {
  const shop = useShop();
  const nav = useNav();
  return (
    <Screen title={t('shop.title')}>
      <p className="intro">{t('shop.intro')}</p>
      <ul className="products">
        {shop.products.map((p) => {
          const from = p.plans[0]!;
          return (
            <li key={p.slug}>
              <button
                className="product"
                onClick={() => nav.push({ name: 'product', slug: p.slug })}
              >
                <img src={p.icon} alt="" width={56} height={56} />
                <span className="product__main">
                  <span className="product__name">
                    {p.name}
                    <span className="product__kind">
                      {p.kind === 'theme' ? t('shop.theme') : t('shop.plugin')}
                    </span>
                  </span>
                  <span className="product__summary">{p.summary[language]}</span>
                  <span className="product__price">
                    <strong>{euro(from.price)}</strong> {t('shop.perYear')} · {planScope(from)}{' '}
                    <span className="product__vat">{t('shop.vat', { n: shop.vat })}</span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <Section>
        <Cell
          icon="key"
          iconColor="#0369a1"
          title={t('account.licenses')}
          onClick={() => void openInBrowser(accountPage('licenses', language))}
        />
        <Cell
          icon="user"
          iconColor="#ea580c"
          title={t('account.title')}
          onClick={() => nav.push({ name: 'account' })}
        />
      </Section>
    </Screen>
  );
}

export function ProductScreen({ slug, onBack }: { slug: string; onBack: () => void }) {
  const shop = useShop();
  const purchase = usePurchase();
  const product = shop.products.find((p) => p.slug === slug) as Product | undefined;
  const [planId, setPlanId] = useState(product?.plans[0]?.id);
  if (!product)
    return (
      <Screen title={t('shop.title')} onBack={onBack}>
        {null}
      </Screen>
    );
  const plan = product.plans.find((p) => p.id === planId) ?? product.plans[0]!;
  return (
    <Screen title={product.name} onBack={onBack} large={false}>
      <div className="product-hero">
        <img src={product.icon} alt="" width={88} height={88} />
        <h1>{product.name}</h1>
        <span className="product__kind">
          {product.kind === 'theme' ? t('shop.theme') : t('shop.plugin')}
        </span>
        <p>{product.summary[language]}</p>
      </div>
      {product.plans.length > 1 && (
        <Section title={t('shop.plan')}>
          {product.plans.map((p) => (
            <label key={p.id} className="cell cell--switch">
              <span className="cell__main">
                <span className="cell__title">
                  {p.sites === 0
                    ? t('shop.unlimited')
                    : p.sites === 1
                      ? t('shop.oneSite')
                      : t('shop.sites', { n: p.sites })}
                </span>
                <span className="cell__subtitle">
                  {euro(p.price)} {t('shop.perYear')} {t('shop.vat', { n: shop.vat })}
                </span>
              </span>
              <input
                type="radio"
                name="plan"
                checked={p.id === plan.id}
                onChange={() => setPlanId(p.id)}
              />
            </label>
          ))}
        </Section>
      )}
      <div className="price-box">
        <span className="price-box__amount">{euro(plan.price)}</span>
        <span>
          {t('shop.perYear')} · {planScope(plan)}
        </span>
        <span className="product__vat">{t('shop.vat', { n: shop.vat })}</span>
        <p className="hint">{t('shop.updates')}</p>
      </div>
      <div className="pad stack">
        {purchase ? (
          <>
            <Button icon="bag" onClick={() => void openInBrowser(cartLink(plan, language))}>
              {t('shop.buy')}
            </Button>
            <p className="hint center">{t('shop.checkoutInfo')}</p>
          </>
        ) : (
          <p className="hint center">{t('shop.unavailable')}</p>
        )}
        <Button kind="secondary" icon="external" onClick={() => void openInBrowser(product.page)}>
          {t('shop.details')}
        </Button>
      </div>
    </Screen>
  );
}

export function AccountScreen({ onBack }: { onBack: () => void }) {
  const nav = useNav();
  return (
    <Screen title={t('account.title')} onBack={onBack}>
      <p className="intro">{t('account.text')}</p>
      <Section>
        <Cell
          icon="key"
          iconColor="#0369a1"
          title={t('account.licenses')}
          onClick={() => void openInBrowser(accountPage('licenses', language))}
        />
        <Cell
          icon="user"
          iconColor="#16a34a"
          title={t('account.create')}
          onClick={() => nav.push({ name: 'register' })}
        />
        <Cell
          icon="globe"
          iconColor="#0f766e"
          title={t('account.signIn')}
          onClick={() => void openInBrowser(accountPage('login', language))}
        />
        <Cell
          icon="logout"
          iconColor="#64748b"
          title={t('account.signOut')}
          onClick={() => void openInBrowser(accountPage('account', language))}
        />
      </Section>
      <Section footer={t('account.deleteText')}>
        <Cell
          icon="trash"
          title={t('account.delete')}
          danger
          onClick={() => void openInBrowser(`${accountPage('account', language)}#delete`)}
        />
      </Section>
    </Screen>
  );
}

export function RegisterScreen({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RegisterResult | { kind: 'missing' } | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || password.length < 8 || !terms) {
      setResult({ kind: 'missing' });
      return;
    }
    setBusy(true);
    const outcome = await register(
      { name: name.trim(), email: email.trim(), password, terms },
      language,
    );
    setBusy(false);
    setResult(outcome);
    if (outcome.kind === 'browser') {
      const url = new URL(accountPage('register', language));
      url.searchParams.set('name', name.trim());
      url.searchParams.set('email', email.trim());
      void openInBrowser(url.toString());
    }
  };
  if (result?.kind === 'sent' || result?.kind === 'created') {
    return (
      <Screen title={t('register.title')} onBack={onBack}>
        <Notice tone="success">
          {result.kind === 'sent' ? t('register.sent') : t('register.created')}
        </Notice>
        <div className="pad">
          <Button icon="key" onClick={() => void openInBrowser(accountPage('licenses', language))}>
            {t('account.licenses')}
          </Button>
        </div>
      </Screen>
    );
  }
  return (
    <Screen title={t('register.title')} onBack={onBack}>
      <form className="form" onSubmit={(e) => void submit(e)}>
        <label className="field">
          <span className="field__label">{t('register.name')}</span>
          <input
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            required
          />
        </label>
        <label className="field">
          <span className="field__label">{t('register.email')}</span>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={200}
            required
          />
        </label>
        <label className="field">
          <span className="field__label">{t('register.password')}</span>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            maxLength={200}
            required
          />
          <span className="hint">{t('register.passwordHint')}</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
          <span>{t('register.terms')}</span>
        </label>
        <button
          type="button"
          className="link"
          onClick={() => void openInBrowser(cleitextPage('privacy-app'))}
        >
          {t('register.readTerms')}
        </button>
        {result?.kind === 'missing' && <Notice tone="warning">{t('register.missing')}</Notice>}
        {result?.kind === 'closed' && <Notice tone="warning">{t('register.closed')}</Notice>}
        {result?.kind === 'error' && (
          <Notice tone="warning">{result.message || t('offline')}</Notice>
        )}
        {result?.kind === 'browser' && <Notice>{t('register.browser')}</Notice>}
        <Button type="submit" busy={busy}>
          {t('register.submit')}
        </Button>
        <p className="hint center">{SHOP_ORIGIN.replace('https://', '')}</p>
      </form>
    </Screen>
  );
}
