import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

/**
 * The native side of @capacitor-firebase/messaging, registered by name: the
 * app has no web implementation (no Firebase SDK in the web bundle, no
 * network besides the user's sites). Builds without the Firebase files
 * answer `isSupported: false` (patches/@capacitor-firebase__messaging).
 */

export interface PushNotification {
  title?: string;
  body?: string;
  data?: unknown;
  id?: string;
}

export interface FirebaseMessagingPlugin {
  isSupported(): Promise<{ isSupported: boolean }>;
  checkPermissions(): Promise<{ receive: string }>;
  requestPermissions(): Promise<{ receive: string }>;
  getToken(): Promise<{ token: string }>;
  deleteToken(): Promise<void>;
  addListener(
    event: 'tokenReceived',
    listener: (event: { token: string }) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    event: 'notificationReceived',
    listener: (event: { notification: PushNotification }) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    event: 'notificationActionPerformed',
    listener: (event: { actionId: string; notification: PushNotification }) => void,
  ): Promise<PluginListenerHandle>;
}

export const FirebaseMessaging = registerPlugin<FirebaseMessagingPlugin>('FirebaseMessaging');
