/**
 * Sign-in to a Cleitext site with its OAuth 2.1 server: discovery
 * (RFC 8414), dynamic client registration (RFC 7591), authorization code
 * with PKCE S256 and state, rotating refresh tokens. The redirect uses the
 * app's private-use scheme (RFC 8252 §7.1).
 */

export const REDIRECT_URI = 'com.cleitext.app:/oauth/callback';
export const CLIENT_NAME = 'Cleitext app';
export const SCOPES = ['read', 'write', 'publish'] as const;

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface ServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint: string;
  scopes_supported?: string[];
}

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  /** Epoch milliseconds. */
  expiresAt: number;
  scopes: string[];
}

export type OAuthErrorCode =
  | 'invalid_address'
  | 'unreachable'
  | 'not_cleitext'
  | 'not_enabled'
  | 'registration_failed'
  | 'state_mismatch'
  | 'access_denied'
  | 'invalid_grant'
  | 'invalid_client'
  | 'server_error';

export class OAuthError extends Error {
  constructor(
    readonly code: OAuthErrorCode,
    message = code,
  ) {
    super(message);
    this.name = 'OAuthError';
  }
}

/**
 * The origin of the site the person typed: `esempio.it`, `https://esempio.it/admin`…
 * Only https, as the tokens travel with every request.
 */
export function normalizeSiteUrl(input: string): string {
  let value = input.trim();
  if (!value) throw new OAuthError('invalid_address');
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) value = `https://${value}`;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new OAuthError('invalid_address');
  }
  if (url.protocol !== 'https:' || !url.hostname.includes('.') || url.username || url.password) {
    throw new OAuthError('invalid_address');
  }
  return url.origin;
}

function sameOrigin(origin: string, address: string | undefined): boolean {
  if (typeof address !== 'string') return false;
  try {
    return new URL(address).origin === origin;
  } catch {
    return false;
  }
}

export async function discover(origin: string, fetchImpl: FetchLike): Promise<ServerMetadata> {
  let response: Response;
  try {
    response = await fetchImpl(`${origin}/.well-known/oauth-authorization-server`, {
      headers: { accept: 'application/json' },
    });
  } catch {
    throw new OAuthError('unreachable');
  }
  if (response.status === 404) {
    // A Cleitext site answers 404 with JSON when sign-in for apps is off.
    const body = await response.json().catch(() => null);
    throw new OAuthError(body && typeof body === 'object' ? 'not_enabled' : 'not_cleitext');
  }
  if (!response.ok) throw new OAuthError('not_cleitext');
  const meta = (await response.json().catch(() => null)) as Partial<ServerMetadata> | null;
  if (
    !meta ||
    !sameOrigin(origin, meta.authorization_endpoint) ||
    !sameOrigin(origin, meta.token_endpoint) ||
    !sameOrigin(origin, meta.registration_endpoint)
  ) {
    throw new OAuthError('not_cleitext');
  }
  return meta as ServerMetadata;
}

export async function registerClient(meta: ServerMetadata, fetchImpl: FetchLike): Promise<string> {
  let response: Response;
  try {
    response = await fetchImpl(meta.registration_endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        client_name: CLIENT_NAME,
        redirect_uris: [REDIRECT_URI],
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
      }),
    });
  } catch {
    throw new OAuthError('unreachable');
  }
  const body = (await response.json().catch(() => null)) as { client_id?: unknown } | null;
  if (!response.ok || typeof body?.client_id !== 'string') {
    throw new OAuthError('registration_failed');
  }
  return body.client_id;
}

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function randomString(bytes = 32): string {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return base64url(buffer);
}

export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

export interface PendingAuthorization {
  origin: string;
  clientId: string;
  verifier: string;
  state: string;
  url: string;
}

export async function startAuthorization(
  origin: string,
  meta: ServerMetadata,
  clientId: string,
): Promise<PendingAuthorization> {
  const verifier = randomString(32);
  const state = randomString(16);
  const url = new URL(meta.authorization_endpoint);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('scope', SCOPES.join(' '));
  url.searchParams.set('code_challenge', await pkceChallenge(verifier));
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', state);
  return { origin, clientId, verifier, state, url: url.toString() };
}

/** True for the app's own redirect, whatever its query. */
export function isCallback(url: string): boolean {
  return url.split(/[?#]/)[0] === REDIRECT_URI;
}

/** The code of the redirect, once its state matches the one sent. */
export function parseCallback(url: string, expectedState: string): string {
  const query = url.includes('?') ? url.slice(url.indexOf('?') + 1).split('#')[0]! : '';
  const params = new URLSearchParams(query);
  if (params.get('state') !== expectedState) throw new OAuthError('state_mismatch');
  const error = params.get('error');
  if (error) {
    throw new OAuthError(error === 'access_denied' ? 'access_denied' : 'server_error');
  }
  const code = params.get('code');
  if (!code) throw new OAuthError('server_error');
  return code;
}

async function tokenRequest(
  endpoint: string,
  form: Record<string, string>,
  fetchImpl: FetchLike,
  now: () => number,
): Promise<TokenSet> {
  let response: Response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'application/json',
      },
      body: new URLSearchParams(form).toString(),
    });
  } catch {
    throw new OAuthError('unreachable');
  }
  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok || !body) {
    const code = body?.error;
    if (code === 'invalid_grant') throw new OAuthError('invalid_grant');
    if (code === 'invalid_client') throw new OAuthError('invalid_client');
    throw new OAuthError(response.status >= 500 ? 'unreachable' : 'server_error');
  }
  if (typeof body.access_token !== 'string' || typeof body.refresh_token !== 'string') {
    throw new OAuthError('server_error');
  }
  const expiresIn = typeof body.expires_in === 'number' ? body.expires_in : 3600;
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: now() + expiresIn * 1000,
    scopes: typeof body.scope === 'string' ? body.scope.split(' ').filter(Boolean) : [],
  };
}

export function exchangeCode(
  tokenEndpoint: string,
  input: { clientId: string; code: string; verifier: string },
  fetchImpl: FetchLike,
  now: () => number = Date.now,
): Promise<TokenSet> {
  return tokenRequest(
    tokenEndpoint,
    {
      grant_type: 'authorization_code',
      code: input.code,
      client_id: input.clientId,
      redirect_uri: REDIRECT_URI,
      code_verifier: input.verifier,
    },
    fetchImpl,
    now,
  );
}

export function refreshTokens(
  tokenEndpoint: string,
  input: { clientId: string; refreshToken: string },
  fetchImpl: FetchLike,
  now: () => number = Date.now,
): Promise<TokenSet> {
  return tokenRequest(
    tokenEndpoint,
    { grant_type: 'refresh_token', refresh_token: input.refreshToken, client_id: input.clientId },
    fetchImpl,
    now,
  );
}
