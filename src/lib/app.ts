import { SiteRegistry } from './sites';
import {
  readPref,
  readSecret,
  removeSecret,
  secureTokenStore,
  writePref,
  writeSecret,
} from './storage';

/**
 * The app's single registry of sites. `fetch` is read at call time: on
 * devices Capacitor's native HTTP replaces it (CapacitorHttp).
 */
export const registry = new SiteRegistry(
  { readPref, writePref, readSecret, writeSecret, removeSecret, tokenStore: secureTokenStore },
  (input, init) => fetch(input, init),
);
