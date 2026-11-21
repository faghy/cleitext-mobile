import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { Preferences } from '@capacitor/preferences';
import type { TokenSet } from './oauth';
import type { TokenStore } from './session';

/**
 * Secrets (tokens) go to the Keychain on iOS and to the Android Keystore;
 * everything else (the list of sites, choices) to the app's preferences.
 */

export async function readSecret<T>(key: string): Promise<T | null> {
  try {
    const value = await SecureStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

export async function writeSecret(key: string, value: unknown): Promise<void> {
  await SecureStorage.setItem(key, JSON.stringify(value));
}

export async function removeSecret(key: string): Promise<void> {
  try {
    await SecureStorage.removeItem(key);
  } catch {
    // Already gone.
  }
}

export async function readPref<T>(key: string, fallback: T): Promise<T> {
  const { value } = await Preferences.get({ key });
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function writePref(key: string, value: unknown): Promise<void> {
  await Preferences.set({ key, value: JSON.stringify(value) });
}

export async function removePref(key: string): Promise<void> {
  await Preferences.remove({ key });
}

export function secureTokenStore(siteId: string): TokenStore {
  const key = `tokens.${siteId}`;
  return {
    load: () => readSecret<TokenSet>(key),
    save: (tokens) => writeSecret(key, tokens),
    clear: () => removeSecret(key),
  };
}
