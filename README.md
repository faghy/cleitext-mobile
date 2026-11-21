# Cleitext mobile app

The Cleitext app for iOS and Android: your Cleitext sites in your pocket. Write
posts with photos, moderate comments, read form messages, follow shop orders,
upload media and get notifications — with native screens over each site's REST
API. The full admin opens in an in-app browser for everything else. A Shop tab
lists Cleitext's paid themes and plugins, sold on cleitext.com.

- App id: `com.cleitext.app` · name: Cleitext · version 1.0.0 (build 1)
- Capacitor 7, React 19, Vite, TypeScript
- Italian and English, following the device language (Italian by default)
- No analytics, no trackers: the app talks only to the sites you add, to
  cleitext.com (shop and account) and to a small switch file in this repository.

## How it signs in

Each site is its own OAuth 2.1 server (core 0.117+):

1. `GET {site}/.well-known/oauth-authorization-server` (discovery);
2. `POST {site}/oauth/register` once per site (dynamic registration; the
   `client_id` is cached on the phone);
3. the authorize page opens in the system browser with PKCE S256 and `state`,
   redirect `com.cleitext.app:/oauth/callback` (private-use scheme, RFC 8252);
4. `POST {site}/oauth/token` exchanges the code; the refresh token rotates and
   is refreshed once even with concurrent requests.

Tokens live in the Keychain (iOS) and the Android Keystore
(`@aparajita/capacitor-secure-storage`). Requests to `/api/v1` go through the
native HTTP stack (`CapacitorHttp`) with `Authorization: Bearer`.

## Push notifications

FCM on both platforms (`@capacitor-firebase/messaging`). The phone registers its
token on every site (`POST /api/v1/push/devices`), chooses events per site
(`PUT /api/v1/push/devices/:id`) and the site sends through the Cleitext relay.
Without the Firebase files the app builds and runs, and the Notifications screen
says they are not available in that build (see `patches/`: the plugin stays
inactive instead of crashing on iOS).

## Development

```sh
pnpm install
pnpm dev          # web preview (no native features)
pnpm lint && pnpm typecheck && pnpm test
pnpm build && pnpm exec cap sync
pnpm exec cap open android   # or ios
```

Scripts: `scripts/brand.mjs` (icon and splash sources from the vector mark, then
`pnpm exec capacitor-assets generate`), `scripts/licenses.mjs` (open-source
licenses shown in the app), `scripts/screenshots.mjs` (store screenshots of the
web build against mocked demo data; set `PLAYWRIGHT` to a Playwright module).

## Builds (GitHub Actions)

- `ci.yml`: lint, typecheck, unit tests, web build.
- `android.yml`: release AAB and APK, signed with the upload key when the
  secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`,
  `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` exist (unsigned otherwise).
  `GOOGLE_SERVICES_JSON` (base64) adds Firebase. The repository variable
  `ANDROID_VERSION_CODE` sets the version code of the next upload.
- `ios.yml`: compiles the Xcode project without signing on every push; with
  `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`,
  `APP_STORE_CONNECT_KEY_P8` (base64 of the .p8) and `APPLE_TEAM_ID` it also
  archives with automatic signing (`-allowProvisioningUpdates` and the API
  key), exports the IPA and uploads it to TestFlight — on `v*` tags or when run
  by hand. `GOOGLE_SERVICE_INFO_PLIST` (base64) adds Firebase.

Store texts live in `fastlane/metadata`, screenshots in `fastlane/screenshots`
and `fastlane/metadata/android/*/images`. See [STORE.md](./STORE.md) for the
submission steps and the store questionnaires.

## License

Free software under the [GNU General Public License v2.0 or later](./LICENSE).

© Serafino Christian
