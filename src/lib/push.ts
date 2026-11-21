import { language } from '../i18n';
import { registry } from './app';
import { isNative, platform } from './native';
import { FirebaseMessaging } from './push-plugin';
import { readPref, writePref } from './storage';
import type { Site } from './sites';
import type { PushData } from './types';

/**
 * Push notifications: the FCM token of this phone is registered on each
 * site (POST /api/v1/push/devices); the site sends through the Cleitext
 * relay. Builds without the Firebase files report push as unavailable.
 */

const TOKEN = 'push.token';

let supported: Promise<boolean> | null = null;

export function pushAvailable(): Promise<boolean> {
  if (!isNative) return Promise.resolve(false);
  supported ??= Promise.race([
    FirebaseMessaging.isSupported()
      .then((r) => r.isSupported)
      .catch(() => false),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 3000)),
  ]);
  return supported;
}

export async function permission(): Promise<string> {
  try {
    return (await FirebaseMessaging.checkPermissions()).receive;
  } catch {
    return 'denied';
  }
}

function deviceName(): string {
  const os = platform === 'ios' ? 'iPhone' : 'Android';
  return language === 'it' ? `App Cleitext (${os})` : `Cleitext app (${os})`;
}

export async function registerSite(site: Site, token: string): Promise<Site> {
  const api = registry.api(site);
  const device = await api.registerDevice({
    token,
    platform: platform === 'ios' ? 'ios' : 'android',
    name: deviceName(),
  });
  const change = { deviceId: device.id, events: device.events ?? [] };
  await registry.update(site.id, change);
  return { ...site, ...change };
}

/** Asks the permission and registers the phone on every site. */
export async function enablePush(): Promise<'granted' | 'denied' | 'unavailable'> {
  if (!(await pushAvailable())) return 'unavailable';
  const { receive } = await FirebaseMessaging.requestPermissions();
  if (receive !== 'granted') return 'denied';
  const { token } = await FirebaseMessaging.getToken();
  await writePref(TOKEN, token);
  await registerAll(token);
  return 'granted';
}

async function registerAll(token: string): Promise<void> {
  for (const site of registry.list) {
    if (site.signedOut) continue;
    await registerSite(site, token).catch(() => undefined);
  }
}

/** Registers a site added after notifications were turned on. */
export async function registerNewSite(site: Site): Promise<void> {
  const token = await readPref<string | null>(TOKEN, null);
  if (token && (await pushAvailable())) await registerSite(site, token).catch(() => undefined);
}

export function initPush(onOpen: (data: PushData) => void): void {
  void pushAvailable().then((ok) => {
    if (!ok) return;
    void FirebaseMessaging.addListener('tokenReceived', async ({ token }) => {
      const previous = await readPref<string | null>(TOKEN, null);
      if (previous && previous !== token) {
        await writePref(TOKEN, token);
        await registerAll(token);
      }
    });
    void FirebaseMessaging.addListener('notificationActionPerformed', ({ notification }) => {
      const data = (notification.data ?? {}) as PushData;
      onOpen(data);
    });
  });
}
