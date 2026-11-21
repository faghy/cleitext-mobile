import { Capacitor, CapacitorHttp } from '@capacitor/core';
import bundled from './products.json';
import type { Language } from '../i18n';

/**
 * The paid Cleitext products sold by the shop on cleitext.com: licences for
 * software used on websites, bought and used outside the app. The list ships
 * with the app; a small remote file (remote/shop.json in the app's
 * repository) can switch the purchase button off per platform, or carry a
 * fresher list.
 */

export const SHOP_ORIGIN = 'https://cleitext.com';
export const REMOTE_URL =
  'https://raw.githubusercontent.com/faghy/cleitext-mobile/main/remote/shop.json';

export interface Plan {
  id: string;
  /** Yearly price, VAT excluded. */
  price: number;
  /** Sites covered; 0 = unlimited. */
  sites: number;
}

export interface Product {
  slug: string;
  name: string;
  kind: 'theme' | 'plugin';
  icon: string;
  page: string;
  summary: Record<Language, string>;
  plans: Plan[];
}

export interface ShopConfig {
  products: Product[];
  vat: number;
  purchase: { ios: boolean; android: boolean; web?: boolean };
}

export const DEFAULT_CONFIG: ShopConfig = {
  products: bundled.products as Product[],
  vat: bundled.vat,
  purchase: { ios: true, android: true, web: true },
};

function validProducts(value: unknown): Product[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const ok = value.every(
    (p) =>
      p &&
      typeof p.slug === 'string' &&
      typeof p.name === 'string' &&
      Array.isArray(p.plans) &&
      p.plans.every(
        (plan: Plan) =>
          /^[0-9a-f-]{36}$/i.test(plan.id) && typeof plan.price === 'number' && plan.price > 0,
      ),
  );
  return ok ? (value as Product[]) : null;
}

/** The bundled list merged with the remote file; the bundled one when offline. */
export function mergeRemote(base: ShopConfig, remote: unknown): ShopConfig {
  if (!remote || typeof remote !== 'object') return base;
  const r = remote as { purchase?: Record<string, unknown>; products?: unknown; vat?: unknown };
  const purchase = { ...base.purchase };
  for (const key of ['ios', 'android', 'web'] as const) {
    if (typeof r.purchase?.[key] === 'boolean') purchase[key] = r.purchase[key] as boolean;
  }
  return {
    products: validProducts(r.products) ?? base.products,
    vat: typeof r.vat === 'number' ? r.vat : base.vat,
    purchase,
  };
}

export async function loadShopConfig(
  fetchImpl: (url: string) => Promise<Response> = (url) => fetch(url, { cache: 'no-store' }),
): Promise<ShopConfig> {
  try {
    const response = await fetchImpl(REMOTE_URL);
    if (!response.ok) return DEFAULT_CONFIG;
    return mergeRemote(DEFAULT_CONFIG, await response.json());
  } catch {
    return DEFAULT_CONFIG;
  }
}

/** The link that puts the plan in the cart on cleitext.com and opens the cart. */
export function cartLink(plan: Plan, language: Language): string {
  const prefix = language === 'it' ? '/it' : '';
  return `${SHOP_ORIGIN}${prefix}/cart/add?product=${encodeURIComponent(plan.id)}&quantity=1`;
}

export function accountPage(
  page: 'licenses' | 'login' | 'account' | 'register',
  language: Language,
): string {
  const prefix = language === 'it' ? '/it' : '';
  const path = {
    licenses: '/my-licenses',
    login: '/account/login',
    account: '/account',
    register: '/account/register',
  }[page];
  return `${SHOP_ORIGIN}${prefix}${path}`;
}

/** Registration on cleitext.com with the site's public account action (JSON answer). */
export type RegisterResult =
  | { kind: 'sent' }
  | { kind: 'created' }
  | { kind: 'closed'; message: string }
  | { kind: 'error'; message: string }
  /** Needs the page itself (a check against robots, or a refused request). */
  | { kind: 'browser' };

export interface Poster {
  (
    url: string,
    headers: Record<string, string>,
    body: string,
  ): Promise<{ status: number; data: unknown }>;
}

/**
 * Posts through the native HTTP stack on devices: browsers drop the Origin
 * header set by scripts, the native stack sends the one of the form's page.
 */
export const nativePoster: Poster = async (url, headers, body) => {
  if (Capacitor.isNativePlatform()) {
    const response = await CapacitorHttp.post({ url, headers, data: body, responseType: 'json' });
    let data: unknown = response.data;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        data = null;
      }
    }
    return { status: response.status, data };
  }
  const response = await fetch(url, { method: 'POST', headers, body });
  return { status: response.status, data: await response.json().catch(() => null) };
};

export async function register(
  input: { name: string; email: string; password: string; terms: boolean },
  language: Language,
  post: Poster = nativePoster,
): Promise<RegisterResult> {
  const prefix = language === 'it' ? '/it' : '';
  const page = `${SHOP_ORIGIN}${prefix}/account/register`;
  let status: number;
  let data: unknown;
  try {
    ({ status, data } = await post(
      page,
      {
        accept: 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
        // The action accepts posts of its own page; the app posts the same form.
        origin: SHOP_ORIGIN,
        referer: page,
      },
      new URLSearchParams({
        name: input.name,
        email: input.email,
        password: input.password,
        ...(input.terms ? { terms: '1' } : {}),
      }).toString(),
    ));
  } catch {
    return { kind: 'error', message: '' };
  }
  const body = (data && typeof data === 'object' ? data : null) as {
    ok?: boolean;
    redirect?: string;
    message?: string;
    challenge?: boolean;
  } | null;
  if (!body) return { kind: 'browser' };
  if (body.ok) return body.redirect?.includes('sent=1') ? { kind: 'sent' } : { kind: 'created' };
  const message = body.message ?? '';
  if (/closed|chiuse/i.test(message)) return { kind: 'closed', message };
  if (body.challenge || status === 403) return { kind: 'browser' };
  return { kind: 'error', message };
}
