import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cleitext.app',
  appName: 'Cleitext',
  webDir: 'dist',
  backgroundColor: '#0369a1',
  android: {
    // Only https sites; the app never loads remote pages in its own web view.
    allowMixedContent: false,
    // The web view stays between the system bars on every Android version.
    adjustMarginsForEdgeToEdge: 'force',
  },
  ios: {
    contentInset: 'never',
    scheme: 'Cleitext',
  },
  plugins: {
    // Requests to the sites go through the native HTTP stack: the REST API
    // answers only its own origin in browsers (no CORS needed for the app).
    CapacitorHttp: { enabled: true },
    SplashScreen: {
      launchShowDuration: 600,
      launchAutoHide: true,
      backgroundColor: '#0369a1',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    FirebaseMessaging: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Keyboard: {
      resizeOnFullScreen: true,
    },
  },
};

export default config;
