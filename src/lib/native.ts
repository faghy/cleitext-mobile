import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

/** The admin of a Cleitext site (ADMIN_PATH of the core). */
export const ADMIN_PATH = '/cl-admin';

export function adminUrl(site: { origin: string }, path = ''): string {
  const clean = path.startsWith(ADMIN_PATH) ? path.slice(ADMIN_PATH.length) : path;
  return `${site.origin}${ADMIN_PATH}${clean}`;
}

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web';

/** The sign-in page and the full admin: system browser views, never the app's web view. */
export async function openInBrowser(url: string): Promise<void> {
  if (isNative) {
    await Browser.open({ url, presentationStyle: 'popover', toolbarColor: '#0369a1' });
  } else {
    window.open(url, '_blank', 'noopener');
  }
}

export async function closeBrowser(): Promise<void> {
  if (isNative) await Browser.close().catch(() => undefined);
}

/** Links that leave the app: phone, email, web pages. */
export function openExternal(url: string): void {
  if (/^https?:/i.test(url)) void openInBrowser(url);
  else window.location.href = url;
}

export function onAppUrl(listener: (url: string) => void): void {
  if (!isNative) return;
  void App.addListener('appUrlOpen', (event) => listener(event.url));
  // Cold start from the redirect (Android may kill the app while the browser is open).
  void App.getLaunchUrl().then((launch) => {
    if (launch?.url) listener(launch.url);
  });
}

export function onResume(listener: () => void): void {
  if (!isNative) return;
  void App.addListener('resume', listener);
}

export async function appVersion(): Promise<string> {
  if (!isNative) return __APP_VERSION__;
  const info = await App.getInfo();
  return `${info.version} (${info.build})`;
}

export async function prepareChrome(dark: boolean): Promise<void> {
  if (!isNative) return;
  await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => undefined);
  if (platform === 'android') {
    await StatusBar.setBackgroundColor({ color: dark ? '#0b1220' : '#f2f4f7' }).catch(
      () => undefined,
    );
  }
  await SplashScreen.hide().catch(() => undefined);
}

export interface PickedPhoto {
  blob: Blob;
  filename: string;
}

/** A photo from the camera or the gallery, as a JPEG ready to upload. */
export async function pickPhoto(source: 'camera' | 'gallery'): Promise<PickedPhoto | null> {
  if (!isNative) return pickWithInput();
  try {
    const photo = await Camera.getPhoto({
      source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      resultType: CameraResultType.Uri,
      quality: 85,
      width: 2400,
      correctOrientation: true,
      saveToGallery: false,
    });
    if (!photo.webPath) return null;
    const blob = await (await fetch(photo.webPath)).blob();
    const ext = photo.format === 'png' ? 'png' : photo.format === 'heic' ? 'heic' : 'jpg';
    const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
    return { blob, filename: `foto-${stamp}.${ext}` };
  } catch {
    // Cancelled by the person, or permission refused.
    return null;
  }
}

function pickWithInput(): Promise<PickedPhoto | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      resolve(file ? { blob: file, filename: file.name } : null);
    };
    input.click();
  });
}
