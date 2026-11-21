import { OAuthError, type TokenSet } from './oauth';

/** Where a site's tokens are kept (Keychain / Keystore on devices). */
export interface TokenStore {
  load(): Promise<TokenSet | null>;
  save(tokens: TokenSet): Promise<void>;
  clear(): Promise<void>;
}

export class SignedOutError extends Error {
  constructor() {
    super('signed_out');
    this.name = 'SignedOutError';
  }
}

/** Refresh this long before the access token expires. */
const MARGIN_MS = 60_000;

/**
 * The access token of one site, refreshed when it is about to expire. The
 * refresh token rotates: the new pair is saved before it is used, and
 * concurrent callers share a single refresh (a second one would present an
 * already-spent refresh token and sign the person out).
 */
export class TokenManager {
  private inflight: Promise<TokenSet> | null = null;
  private cached: TokenSet | null | undefined;

  constructor(
    private readonly store: TokenStore,
    private readonly refresher: (refreshToken: string) => Promise<TokenSet>,
    private readonly now: () => number = Date.now,
    private readonly onSignedOut: () => void = () => {},
  ) {}

  private async current(): Promise<TokenSet> {
    if (this.cached === undefined) this.cached = await this.store.load();
    if (!this.cached) throw new SignedOutError();
    return this.cached;
  }

  async accessToken(): Promise<string> {
    const tokens = await this.current();
    if (tokens.expiresAt - this.now() > MARGIN_MS) return tokens.accessToken;
    return (await this.refresh()).accessToken;
  }

  /** A new pair now (e.g. after a 401); shared by concurrent callers. */
  refresh(): Promise<TokenSet> {
    if (!this.inflight) {
      this.inflight = this.doRefresh().finally(() => {
        this.inflight = null;
      });
    }
    return this.inflight;
  }

  private async doRefresh(): Promise<TokenSet> {
    const tokens = await this.current();
    let next: TokenSet;
    try {
      next = await this.refresher(tokens.refreshToken);
    } catch (error) {
      if (
        error instanceof OAuthError &&
        (error.code === 'invalid_grant' || error.code === 'invalid_client')
      ) {
        await this.signOut();
        this.onSignedOut();
        throw new SignedOutError();
      }
      throw error;
    }
    await this.store.save(next);
    this.cached = next;
    return next;
  }

  async set(tokens: TokenSet): Promise<void> {
    await this.store.save(tokens);
    this.cached = tokens;
  }

  async signOut(): Promise<void> {
    this.cached = null;
    await this.store.clear();
  }

  async signedIn(): Promise<boolean> {
    if (this.cached === undefined) this.cached = await this.store.load();
    return this.cached !== null;
  }

  async scopes(): Promise<string[]> {
    return (await this.current()).scopes;
  }
}
