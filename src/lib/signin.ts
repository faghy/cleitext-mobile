import { registry } from './app';
import { closeBrowser, openInBrowser } from './native';
import { isCallback, OAuthError, type OAuthErrorCode } from './oauth';
import { registerNewSite } from './push';
import type { Site } from './sites';

export type SignInState =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'waiting' }
  | { phase: 'error'; code: OAuthErrorCode | 'unknown' }
  | { phase: 'done'; site: Site };

let state: SignInState = { phase: 'idle' };
const listeners = new Set<() => void>();

function set(next: SignInState) {
  state = next;
  for (const listener of listeners) listener();
}

export const signIn = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get: () => state,
  reset: () => set({ phase: 'idle' }),

  async start(address: string, siteId?: string) {
    set({ phase: 'checking' });
    try {
      const url = await registry.beginSignIn(address, siteId);
      set({ phase: 'waiting' });
      await openInBrowser(url);
    } catch (error) {
      set({ phase: 'error', code: error instanceof OAuthError ? error.code : 'unknown' });
    }
  },

  /** The app was opened by a link: finishes signing in when it is the redirect. */
  async handleUrl(url: string): Promise<Site | null> {
    if (!isCallback(url)) return null;
    await closeBrowser();
    set({ phase: 'checking' });
    try {
      const site = await registry.completeSignIn(url);
      void registerNewSite(site);
      set({ phase: 'done', site });
      return site;
    } catch (error) {
      set({ phase: 'error', code: error instanceof OAuthError ? error.code : 'unknown' });
      return null;
    }
  },
};
