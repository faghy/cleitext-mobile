import { describe, expect, it, vi } from 'vitest';
import {
  discover,
  exchangeCode,
  isCallback,
  normalizeSiteUrl,
  OAuthError,
  parseCallback,
  pkceChallenge,
  randomString,
  REDIRECT_URI,
  refreshTokens,
  registerClient,
  startAuthorization,
  type ServerMetadata,
} from './oauth';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const META: ServerMetadata = {
  issuer: 'https://www.esempio.it',
  authorization_endpoint: 'https://www.esempio.it/oauth/authorize',
  token_endpoint: 'https://www.esempio.it/oauth/token',
  registration_endpoint: 'https://www.esempio.it/oauth/register',
};

describe('normalizeSiteUrl', () => {
  it('adds https and keeps only the origin', () => {
    expect(normalizeSiteUrl(' www.esempio.it ')).toBe('https://www.esempio.it');
    expect(normalizeSiteUrl('https://esempio.it/cl-admin/x?y=1')).toBe('https://esempio.it');
    expect(normalizeSiteUrl('HTTPS://Esempio.IT')).toBe('https://esempio.it');
  });

  it('refuses http, credentials and non-addresses', () => {
    for (const bad of [
      '',
      'http://esempio.it',
      'localhost',
      'https://a:b@esempio.it',
      'ftp://x.it',
    ]) {
      expect(() => normalizeSiteUrl(bad)).toThrow(OAuthError);
    }
  });
});

describe('PKCE', () => {
  it('matches the RFC 7636 example', async () => {
    expect(await pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    );
  });

  it('makes URL-safe random strings of the right length', () => {
    const value = randomString(32);
    expect(value).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(randomString(32)).not.toBe(value);
  });

  it('builds the authorize address with S256, state and the app redirect', async () => {
    const pending = await startAuthorization('https://www.esempio.it', META, 'client-1');
    const url = new URL(pending.url);
    expect(url.origin + url.pathname).toBe(META.authorization_endpoint);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('client-1');
    expect(url.searchParams.get('redirect_uri')).toBe(REDIRECT_URI);
    expect(url.searchParams.get('scope')).toBe('read write publish');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toBe(await pkceChallenge(pending.verifier));
    expect(url.searchParams.get('state')).toBe(pending.state);
  });
});

describe('discover', () => {
  it('reads the metadata of the site', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(META));
    await expect(discover('https://www.esempio.it', fetchImpl)).resolves.toEqual(META);
    expect(fetchImpl.mock.calls[0]![0]).toBe(
      'https://www.esempio.it/.well-known/oauth-authorization-server',
    );
  });

  it('tells apart a site with app sign-in off, another site and no answer', async () => {
    const code = (p: Promise<unknown>) => p.catch((e: OAuthError) => e.code);
    expect(
      await code(discover('https://a.it', vi.fn().mockResolvedValue(json({ error: 'off' }, 404)))),
    ).toBe('not_enabled');
    expect(
      await code(
        discover(
          'https://a.it',
          vi.fn().mockResolvedValue(new Response('<html>', { status: 404 })),
        ),
      ),
    ).toBe('not_cleitext');
    expect(
      await code(discover('https://a.it', vi.fn().mockRejectedValue(new TypeError('x')))),
    ).toBe('unreachable');
  });

  it('refuses endpoints on another origin', async () => {
    const meta = { ...META, token_endpoint: 'https://evil.example/token' };
    await expect(
      discover('https://www.esempio.it', vi.fn().mockResolvedValue(json(meta))),
    ).rejects.toMatchObject({
      code: 'not_cleitext',
    });
  });
});

describe('registerClient', () => {
  it('registers the app with its redirect and returns the client id', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json({ client_id: 'abc' }, 201));
    await expect(registerClient(META, fetchImpl)).resolves.toBe('abc');
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(META.registration_endpoint);
    expect(JSON.parse(init.body)).toMatchObject({
      client_name: 'Cleitext app',
      redirect_uris: ['com.cleitext.app:/oauth/callback'],
    });
  });

  it('fails clearly when the site refuses', async () => {
    await expect(
      registerClient(META, vi.fn().mockResolvedValue(json({ error: 'invalid_redirect_uri' }, 400))),
    ).rejects.toMatchObject({ code: 'registration_failed' });
  });
});

describe('callback', () => {
  it('recognises the redirect and checks the state', () => {
    const url = `${REDIRECT_URI}?code=c0de&state=s1`;
    expect(isCallback(url)).toBe(true);
    expect(isCallback('com.cleitext.app:/other')).toBe(false);
    expect(parseCallback(url, 's1')).toBe('c0de');
    expect(() => parseCallback(url, 's2')).toThrow(/state_mismatch/);
  });

  it('reports a refusal', () => {
    expect(() => parseCallback(`${REDIRECT_URI}?error=access_denied&state=s`, 's')).toThrow(
      expect.objectContaining({ code: 'access_denied' }),
    );
  });
});

describe('token endpoint', () => {
  const now = () => 1_000_000;

  it('exchanges the code with the verifier (form encoded)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      json({
        access_token: 'cx_a',
        refresh_token: 'cxr_r',
        expires_in: 3600,
        scope: 'read write',
      }),
    );
    const tokens = await exchangeCode(
      META.token_endpoint,
      { clientId: 'c', code: 'k', verifier: 'v' },
      fetchImpl,
      now,
    );
    expect(tokens).toEqual({
      accessToken: 'cx_a',
      refreshToken: 'cxr_r',
      expiresAt: 1_000_000 + 3_600_000,
      scopes: ['read', 'write'],
    });
    const init = fetchImpl.mock.calls[0]![1];
    expect(init.headers['content-type']).toBe('application/x-www-form-urlencoded');
    expect(Object.fromEntries(new URLSearchParams(init.body))).toEqual({
      grant_type: 'authorization_code',
      code: 'k',
      client_id: 'c',
      redirect_uri: REDIRECT_URI,
      code_verifier: 'v',
    });
  });

  it('refreshes with the refresh token', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(json({ access_token: 'a2', refresh_token: 'r2', expires_in: 60 }));
    await refreshTokens(META.token_endpoint, { clientId: 'c', refreshToken: 'r1' }, fetchImpl, now);
    expect(Object.fromEntries(new URLSearchParams(fetchImpl.mock.calls[0]![1].body))).toEqual({
      grant_type: 'refresh_token',
      refresh_token: 'r1',
      client_id: 'c',
    });
  });

  it('maps invalid_grant', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json({ error: 'invalid_grant' }, 400));
    await expect(
      refreshTokens(META.token_endpoint, { clientId: 'c', refreshToken: 'r' }, fetchImpl),
    ).rejects.toMatchObject({ code: 'invalid_grant' });
  });
});
