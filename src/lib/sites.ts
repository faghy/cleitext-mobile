import { ApiClient } from './api';
import {
  discover,
  exchangeCode,
  OAuthError,
  parseCallback,
  randomString,
  refreshTokens,
  registerClient,
  normalizeSiteUrl,
  startAuthorization,
  type FetchLike,
  type PendingAuthorization,
} from './oauth';
import { TokenManager, type TokenStore } from './session';

export interface Site {
  id: string;
  origin: string;
  name: string;
  userName: string;
  clientId: string;
  tokenEndpoint: string;
  /** The person's capabilities on the site, refreshed on each visit. */
  capabilities: string[];
  /** The push device registered on the site for this phone. */
  deviceId?: string;
  events?: string[];
  signedOut?: boolean;
}

export interface Persistence {
  readPref<T>(key: string, fallback: T): Promise<T>;
  writePref(key: string, value: unknown): Promise<void>;
  readSecret<T>(key: string): Promise<T | null>;
  writeSecret(key: string, value: unknown): Promise<void>;
  removeSecret(key: string): Promise<void>;
  tokenStore(siteId: string): TokenStore;
}

type Listener = () => void;

const SITES = 'sites';
const CURRENT = 'currentSite';
const CLIENTS = 'clients';
const PENDING = 'pendingAuthorization';

interface PendingRecord extends PendingAuthorization {
  tokenEndpoint: string;
  /** Signing in again to a site already in the list. */
  siteId?: string;
}

/** The sites added to the app, their tokens and API clients. */
export class SiteRegistry {
  private sites: Site[] = [];
  private currentId: string | null = null;
  private listeners = new Set<Listener>();
  private managers = new Map<string, TokenManager>();
  private clients = new Map<string, ApiClient>();
  private snapshot: { sites: Site[]; current: Site | null } = { sites: [], current: null };

  constructor(
    private readonly persistence: Persistence,
    private readonly fetchImpl: FetchLike,
    private readonly now: () => number = Date.now,
  ) {}

  async load(): Promise<void> {
    this.sites = await this.persistence.readPref<Site[]>(SITES, []);
    this.currentId = await this.persistence.readPref<string | null>(CURRENT, null);
    if (!this.sites.some((s) => s.id === this.currentId))
      this.currentId = this.sites[0]?.id ?? null;
    this.emit();
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;

  private emit() {
    this.snapshot = {
      sites: [...this.sites],
      current: this.sites.find((s) => s.id === this.currentId) ?? null,
    };
    for (const listener of this.listeners) listener();
  }

  private async persist() {
    await this.persistence.writePref(SITES, this.sites);
    await this.persistence.writePref(CURRENT, this.currentId);
    this.emit();
  }

  get list(): Site[] {
    return this.snapshot.sites;
  }

  get current(): Site | null {
    return this.snapshot.current;
  }

  async select(id: string): Promise<void> {
    this.currentId = id;
    await this.persist();
  }

  async update(id: string, change: Partial<Site>): Promise<void> {
    this.sites = this.sites.map((s) => (s.id === id ? { ...s, ...change } : s));
    await this.persist();
  }

  findByUrl(url: string | undefined): Site | undefined {
    if (!url) return undefined;
    try {
      const origin = new URL(url).origin;
      return this.sites.find((s) => s.origin === origin);
    } catch {
      return undefined;
    }
  }

  tokens(site: Site): TokenManager {
    let manager = this.managers.get(site.id);
    if (!manager) {
      manager = new TokenManager(
        this.persistence.tokenStore(site.id),
        (refreshToken) =>
          refreshTokens(
            site.tokenEndpoint,
            { clientId: site.clientId, refreshToken },
            this.fetchImpl,
            this.now,
          ),
        this.now,
        () => void this.update(site.id, { signedOut: true }),
      );
      this.managers.set(site.id, manager);
    }
    return manager;
  }

  api(site: Site): ApiClient {
    let client = this.clients.get(site.id);
    if (!client) {
      client = new ApiClient(site.origin, this.tokens(site), this.fetchImpl);
      this.clients.set(site.id, client);
    }
    return client;
  }

  /**
   * First half of adding a site (or signing in again): checks the address,
   * registers the app on the site once, and returns the page to open in the
   * system browser.
   */
  async beginSignIn(address: string, siteId?: string): Promise<string> {
    const origin = normalizeSiteUrl(address);
    const meta = await discover(origin, this.fetchImpl);
    const cache = await this.persistence.readPref<Record<string, string>>(CLIENTS, {});
    let clientId = cache[origin];
    if (!clientId) {
      clientId = await registerClient(meta, this.fetchImpl);
      await this.persistence.writePref(CLIENTS, { ...cache, [origin]: clientId });
    }
    const pending = await startAuthorization(origin, meta, clientId);
    const record: PendingRecord = {
      ...pending,
      tokenEndpoint: meta.token_endpoint,
      ...(siteId ? { siteId } : {}),
    };
    await this.persistence.writeSecret(PENDING, record);
    return pending.url;
  }

  /** Second half: the redirect came back to the app. Returns the site. */
  async completeSignIn(callbackUrl: string): Promise<Site> {
    const pending = await this.persistence.readSecret<PendingRecord>(PENDING);
    if (!pending) throw new OAuthError('state_mismatch');
    const code = parseCallback(callbackUrl, pending.state);
    await this.persistence.removeSecret(PENDING);
    let tokens;
    try {
      tokens = await exchangeCode(
        pending.tokenEndpoint,
        { clientId: pending.clientId, code, verifier: pending.verifier },
        this.fetchImpl,
        this.now,
      );
    } catch (error) {
      if (error instanceof OAuthError && error.code === 'invalid_client') {
        // The site forgot the app (e.g. restored database): register again next time.
        const cache = await this.persistence.readPref<Record<string, string>>(CLIENTS, {});
        delete cache[pending.origin];
        await this.persistence.writePref(CLIENTS, cache);
      }
      throw error;
    }
    const existing =
      this.sites.find((s) => s.id === pending.siteId) ??
      this.sites.find((s) => s.origin === pending.origin);
    const id = existing?.id ?? randomString(9);
    const draft: Site = {
      id,
      origin: pending.origin,
      name: existing?.name ?? new URL(pending.origin).hostname,
      userName: existing?.userName ?? '',
      clientId: pending.clientId,
      tokenEndpoint: pending.tokenEndpoint,
      capabilities: existing?.capabilities ?? [],
      ...(existing?.deviceId ? { deviceId: existing.deviceId } : {}),
      ...(existing?.events ? { events: existing.events } : {}),
    };
    this.managers.delete(id);
    this.clients.delete(id);
    await this.tokens(draft).set(tokens);
    const me = await this.api(draft)
      .me()
      .catch(() => null);
    const site: Site = {
      ...draft,
      ...(me
        ? {
            name: me.site.name || draft.name,
            userName: me.user.displayName,
            capabilities: me.capabilities,
          }
        : {}),
    };
    this.sites = existing ? this.sites.map((s) => (s.id === id ? site : s)) : [...this.sites, site];
    this.currentId = id;
    await this.persist();
    return site;
  }

  /** Removes the site from the app: its push device on the site, then its tokens. */
  async remove(site: Site): Promise<void> {
    if (site.deviceId) {
      await this.api(site)
        .deleteDevice(site.deviceId)
        .catch(() => undefined);
    }
    await this.tokens(site).signOut();
    this.managers.delete(site.id);
    this.clients.delete(site.id);
    this.sites = this.sites.filter((s) => s.id !== site.id);
    if (this.currentId === site.id) this.currentId = this.sites[0]?.id ?? null;
    await this.persist();
  }
}
