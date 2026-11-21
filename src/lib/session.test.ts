import { describe, expect, it, vi } from 'vitest';
import { OAuthError, type TokenSet } from './oauth';
import { SignedOutError, TokenManager, type TokenStore } from './session';

function memoryStore(initial: TokenSet | null) {
  let value = initial;
  const store: TokenStore & { value: () => TokenSet | null } = {
    load: vi.fn(async () => value),
    save: vi.fn(async (tokens: TokenSet) => {
      value = tokens;
    }),
    clear: vi.fn(async () => {
      value = null;
    }),
    value: () => value,
  };
  return store;
}

const tokens = (n: number, expiresAt: number): TokenSet => ({
  accessToken: `a${n}`,
  refreshToken: `r${n}`,
  expiresAt,
  scopes: ['read', 'write'],
});

describe('TokenManager', () => {
  it('returns the stored token while it is valid', async () => {
    const refresher = vi.fn();
    const manager = new TokenManager(memoryStore(tokens(1, 10_000_000)), refresher, () => 0);
    expect(await manager.accessToken()).toBe('a1');
    expect(refresher).not.toHaveBeenCalled();
  });

  it('refreshes shortly before expiry and saves the rotated pair', async () => {
    const store = memoryStore(tokens(1, 30_000));
    const refresher = vi.fn(async (refresh: string) => {
      expect(refresh).toBe('r1');
      return tokens(2, 10_000_000);
    });
    const manager = new TokenManager(store, refresher, () => 0);
    expect(await manager.accessToken()).toBe('a2');
    expect(store.value()).toEqual(tokens(2, 10_000_000));
  });

  it('shares one refresh between concurrent callers (the refresh token rotates)', async () => {
    let resolve!: (t: TokenSet) => void;
    const refresher = vi.fn(() => new Promise<TokenSet>((r) => (resolve = r)));
    const manager = new TokenManager(memoryStore(tokens(1, 0)), refresher, () => 0);
    const all = Promise.all([manager.accessToken(), manager.accessToken(), manager.refresh()]);
    await new Promise((r) => setTimeout(r, 0));
    resolve(tokens(2, 10_000_000));
    const [a, b, c] = await all;
    expect(refresher).toHaveBeenCalledTimes(1);
    expect([a, b, (c as TokenSet).accessToken]).toEqual(['a2', 'a2', 'a2']);
  });

  it('signs out when the refresh token is no longer valid', async () => {
    const store = memoryStore(tokens(1, 0));
    const onSignedOut = vi.fn();
    const manager = new TokenManager(
      store,
      async () => {
        throw new OAuthError('invalid_grant');
      },
      () => 0,
      onSignedOut,
    );
    await expect(manager.accessToken()).rejects.toBeInstanceOf(SignedOutError);
    expect(store.value()).toBeNull();
    expect(onSignedOut).toHaveBeenCalled();
  });

  it('keeps the tokens on network errors', async () => {
    const store = memoryStore(tokens(1, 0));
    const manager = new TokenManager(
      store,
      async () => {
        throw new OAuthError('unreachable');
      },
      () => 0,
    );
    await expect(manager.accessToken()).rejects.toMatchObject({ code: 'unreachable' });
    expect(store.value()).not.toBeNull();
  });

  it('throws SignedOutError without tokens', async () => {
    const manager = new TokenManager(memoryStore(null), vi.fn(), () => 0);
    await expect(manager.accessToken()).rejects.toBeInstanceOf(SignedOutError);
    expect(await manager.signedIn()).toBe(false);
  });
});
