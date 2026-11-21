# Pubblicazione su App Store e Google Play

Tutto quello che serve per inviare l'app **Cleitext** (`com.cleitext.app`, versione 1.0.0,
build 1) ai due store: risposte ai questionari, note per la revisione e passaggi.

## 1. Dati dell'app

| Voce                 | Valore                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------- |
| Nome                 | Cleitext                                                                                 |
| Sottotitolo (iOS)    | Il tuo sito, in tasca / Your site, in your pocket                                        |
| Categoria            | Produttività (principale), Business (secondaria)                                         |
| Lingue               | Italiano (principale), Inglese                                                           |
| Privacy              | https://cleitext.com/it/privacy-app (EN https://cleitext.com/privacy-app)                |
| Assistenza           | https://cleitext.com/it/supporto-app (EN https://cleitext.com/app-support)               |
| Eliminazione account | https://cleitext.com/it/elimina-account-app (EN https://cleitext.com/delete-app-account) |
| Marketing            | https://cleitext.com                                                                     |
| Copyright            | 2026 Serafino Christian                                                                  |
| Prezzo               | Gratis, senza acquisti in-app                                                            |

La scheda App Store (testi, URL, categorie, screenshot, classificazione, note per la revisione)
si carica con il workflow **iOS store listing** (`ios-metadata.yml`, avvio manuale): non carica
binari e non invia alla revisione.

Testi e immagini: `fastlane/metadata/` (Android `android/it-IT`, `android/en-US`; iOS `it`, `en-US`),
screenshot iPhone in `fastlane/screenshots/<lingua>/` (6,9" 1320×2868 e 6,5" 1284×2778),
screenshot Android, icona 512×512 e immagine in evidenza 1024×500 in
`fastlane/metadata/android/<lingua>/images/`. L'app è solo per iPhone (niente screenshot iPad).

> Le pagine privacy, assistenza ed eliminazione account su cleitext.com vanno create prima
> dell'invio (sessione del sito web).

## 2. Classificazione dei contenuti

**Google Play (IARC)** — categoria «Utilità, produttività, comunicazione o altro».
Tutte le risposte **No**: niente violenza, sesso, linguaggio volgare, sostanze, gioco d'azzardo;
nessuna interazione tra utenti dentro l'app (l'app gestisce i commenti del _proprio_ sito, non è
una rete sociale); nessuna condivisione della posizione; acquisti digitali: **No** (vedi §5).
Risultato atteso: PEGI 3 / Everyone.

**App Store** — tutte le voci «Nessuno»; «Accesso web senza restrizioni»: **No** (si aprono solo
il sito dell'utente e cleitext.com); «Contenuti generati dagli utenti»: No. Età: 4+.

## 3. Sicurezza dei dati (Google Play) e Privacy dell'app (App Store)

Lo sviluppatore **non raccoglie dati**: l'app non ha analisi, pubblicità né tracciamento, e non ha
un server suo. Cosa succede ai dati:

- **Accesso ai siti**: i token di accesso restano sul telefono, nel portachiavi (Keychain / Android
  Keystore). Contenuti, commenti, messaggi, ordini e foto passano solo tra il telefono e il sito
  dell'utente, cifrati (https). Sono dati che l'utente gestisce sul _suo_ sito.
- **Chriss** (assistente AI del sito): le domande scritte nella chat vanno solo al sito
  dell'utente, che le passa al servizio AI collegato dal gestore del sito (o al servizio gratuito
  «Chriss base»). La conversazione resta in memoria finché l'app è aperta e non viene salvata
  sul telefono.
- **Notifiche**: il codice notifiche del telefono (token FCM) viene inviato al sito dell'utente e al
  servizio di inoltro su cleitext.com solo per consegnare gli avvisi (Firebase Cloud Messaging di
  Google li recapita). Nessun altro uso.
- **Account Cleitext** (facoltativo, dalla scheda Negozio): nome, email e password inseriti
  nell'iscrizione vanno a cleitext.com, che li tratta secondo la sua informativa.
- **Acquisti**: carrello e pagamento avvengono su cleitext.com, nel browser; l'app non vede né
  conserva dati di pagamento.

**Google Play – Sicurezza dei dati**

| Domanda                                                                   | Risposta                                                                                                               |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| L'app raccoglie o condivide dati utente?                                  | **Sì**, solo per la funzione richiesta dall'utente                                                                     |
| Dati crittografati in transito                                            | Sì                                                                                                                     |
| L'utente può chiedere l'eliminazione                                      | Sì (rimuovendo il sito dall'app; l'account si elimina dal sito / da cleitext.com)                                      |
| Informazioni personali → Nome, Email                                      | Raccolti (solo se l'utente crea l'account Cleitext) · Funzionalità app, Gestione account · non condivisi · facoltativo |
| Foto                                                                      | Raccolte solo quando l'utente le carica sul _suo_ sito · Funzionalità app · facoltativo                                |
| Identificatori dispositivo o altri ID                                     | Token notifiche · Funzionalità app · facoltativo                                                                       |
| Messaggi, attività nell'app, posizione, dati finanziari, salute, contatti | No                                                                                                                     |
| Condivisione con terze parti                                              | No (il sito è dell'utente; FCM è un fornitore di servizi)                                                              |

**App Store – Privacy dell'app**

- «Dati usati per tracciarti»: **nessuno**.
- «Dati collegati a te»: _Informazioni di contatto_ (nome, email) — solo se si crea l'account
  Cleitext — scopo **Funzionalità dell'app**; _Contenuti utente_ (foto, altri contenuti inviati al
  proprio sito) — Funzionalità dell'app; _Identificatori_ (ID dispositivo = token notifiche) —
  Funzionalità dell'app.
- Nessun dato per pubblicità, analisi o personalizzazione.

## 4. Eliminazione dell'account (Apple 5.1.1(v), Google)

- L'app non crea account propri per usare i siti: si entra con l'account del sito. In
  **Altro → Siti → Rimuovi dall'app** si chiude l'accesso, si cancella il dispositivo per le
  notifiche sul sito e si cancellano i dati dal telefono.
- L'account **Cleitext** (creato dall'app, scheda Negozio) si elimina dall'app: **Altro → Account
  Cleitext → Elimina account** apre la pagina dell'account su cleitext.com con «Elimina account».
- Pagina web per Google Play: https://cleitext.com/it/elimina-account-app.

## 5. Negozio: temi e plugin (nota per i revisori)

La scheda **Negozio** mostra i temi e i plugin a pagamento di Cleitext. Sono **licenze software
per siti web**: si installano e si usano sul sito del cliente, fuori dall'app; nell'app non
sbloccano nulla. Il pulsante «Acquista» apre il carrello di cleitext.com nel browser in-app
(SFSafariViewController / Chrome Custom Tabs), dove si paga (oggi bonifico).

Nota da incollare nelle «Note per la revisione» (App Store) e nella dichiarazione dei pagamenti
(Play):

> The Shop tab lists licences for Cleitext website themes and plugins. They are software
> licences installed and used on the customer's own website (a service consumed outside the
> app); nothing in the app is unlocked or changed by a purchase. Checkout happens on
> cleitext.com in the browser.

**Se un revisore obietta** (Apple 3.1.1 / Play «Pagamenti»): il pulsante si spegne senza nuova
versione. Modificare `remote/shop.json` in questo repository e fare push su `main`:

```json
{ "purchase": { "ios": false, "android": true } }
```

L'app legge il file all'avvio (raw.githubusercontent.com); con `false` la scheda mostra i
prodotti con «Gli acquisti si fanno su cleitext.com» al posto di «Acquista». Lo stesso file può
contenere `"products": [...]` per aggiornare prezzi e prodotti (stesso formato di
`src/shop/products.json`).

**Iscrizione**: «Crea un account Cleitext» invia il modulo di iscrizione di cleitext.com. Oggi le
iscrizioni su cleitext.com sono **chiuse**: l'app lo dice con garbo («Le iscrizioni a
cleitext.com sono chiuse…») e ricorda che si può comprare senza account. Riaprirle è una modifica
di produzione da approvare.

## 6. Account demo per la revisione Apple

I revisori devono poter entrare in un sito. Serve un **sito demo** Cleitext (0.117 o successiva)
con dati di prova: qualche articolo, commenti in attesa, messaggi dei moduli e, se possibile, il
negozio con un paio di ordini.

Testo per «Informazioni per l'accesso» (App Store Connect → Revisione app):

> Tap "Add a site", type the address below and continue. The site's sign-in page opens:
> sign in with the username and password below and tap "Allow". You are back in the app with
> the site's dashboard (comments, messages, orders, write, media).
>
> Site address: **demo.cleitext.com**
> Username / Password: nei campi «Accesso richiesto» di App Store Connect (mai nel repository)

Per Google Play: Contenuti dell'app → Accesso all'app → «Tutte o alcune funzionalità sono
limitate», con le stesse istruzioni e credenziali.

## 7. Google Play: passi

1. **Play Console** → Crea app: nome «Cleitext», lingua predefinita Italiano, App, Gratuita;
   accetta le dichiarazioni.
2. **Configura l'app**: privacy (URL sopra), accesso all'app (§6), annunci: **No**,
   classificazione (§2), pubblico di destinazione: 18+ (non per bambini), app di notizie: No,
   sicurezza dei dati (§3), eliminazione account (URL sopra), app governative/finanziarie/salute: No.
3. **Scheda dello store**: testi da `fastlane/metadata/android/it-IT` (e traduzione en-US),
   icona 512, immagine in evidenza e screenshot da `images/`. Categoria: Produttività.
4. **Firma**: alla prima release scegli _Play App Signing_ con la chiave gestita da Google; la
   nostra è la **chiave di caricamento** (già nei segreti GitHub, copia in
   `CMS/license-keys/cleitext-mobile-upload.p12`; impronta SHA-256 in
   `cleitext-mobile-upload.fingerprint.txt`). Se richiesto, carica il certificato di caricamento
   (`keytool -exportcert -rfc -keystore cleitext-mobile-upload.p12 -storetype pkcs12 -alias
cleitext-upload`).
5. **Release**: GitHub → Actions → _Android_ → ultimo run verde → artefatto
   `cleitext-android-signed` → `app-release.aab`. Caricalo in **Test interno** (o Produzione),
   note della versione da `changelogs/1.txt`. Per le versioni successive aumenta
   `versionCode`: variabile del repository `ANDROID_VERSION_CODE` (Settings → Variables) e
   rilancia il workflow.
6. Account personale recente: Google chiede un **test chiuso con almeno 12 tester per 14 giorni**
   prima della produzione. Prepara la lista email dei tester.

## 8. App Store: passi

1. **Identificativo**: developer.apple.com → Certificates, IDs & Profiles → Identifiers → «+» →
   App ID `com.cleitext.app`, capability **Push Notifications** attiva. (La firma automatica nel
   workflow può crearlo da sola, ma conviene farlo a mano per attivare il push.)
2. **App Store Connect** → App → «+» Nuova app: iOS, nome «Cleitext», lingua principale
   Italiano, bundle ID `com.cleitext.app`, SKU `cleitext-app`.
3. **Chiave API**: App Store Connect → Utenti e accessi → Integrazioni → Chiavi API App Store
   Connect → genera una chiave con ruolo **App Manager** (o Admin). Scarica il file `.p8` (una
   sola volta), annota _Key ID_ e _Issuer ID_. Il _Team ID_ è in developer.apple.com → Membership.
4. **Segreti GitHub** (repo faghy/cleitext-mobile → Settings → Secrets and variables → Actions):
   - `APP_STORE_CONNECT_KEY_ID` = Key ID
   - `APP_STORE_CONNECT_ISSUER_ID` = Issuer ID
   - `APP_STORE_CONNECT_KEY_P8` = `base64 -w0 AuthKey_XXXX.p8` (contenuto)
   - `APPLE_TEAM_ID` = Team ID
     Da terminale, senza mostrare i valori: `gh secret set APPLE_TEAM_ID -R faghy/cleitext-mobile`
     (lo chiede a schermo) oppure `base64 -w0 AuthKey_XXXX.p8 | gh secret set APP_STORE_CONNECT_KEY_P8 -R faghy/cleitext-mobile`.
5. **Build**: Actions → _iOS_ → _Run workflow_ (upload spuntato), oppure un tag `v1.0.0`. Il job
   «Archive, sign and upload to TestFlight» firma, esporta l'IPA e la carica. Il numero di build
   è il numero del run.
6. In App Store Connect: compila Privacy (§3), classificazione (§2), testi e screenshot
   (`fastlane/metadata/it`, `en-US`, `fastlane/screenshots`), note di revisione (§5 e §6),
   scegli la build da TestFlight e **Invia per la revisione**.
7. Conformità esportazione: l'app usa solo la crittografia standard del sistema (https) —
   `ITSAppUsesNonExemptEncryption = NO` è già nell'Info.plist.

## 9. Notifiche (Firebase)

1. console.firebase.google.com → nuovo progetto **separato** (es. «Cleitext app»), senza
   Analytics.
2. Aggiungi app Android `com.cleitext.app` → scarica `google-services.json`.
3. Aggiungi app iOS `com.cleitext.app` → scarica `GoogleService-Info.plist`.
4. Apple: developer.apple.com → Keys → «+» → _Apple Push Notifications service (APNs)_ → scarica
   la chiave `.p8` → in Firebase → Impostazioni progetto → Cloud Messaging → app iOS → carica la
   chiave APNs (Key ID e Team ID).
5. Segreti GitHub: `base64 -w0 google-services.json | gh secret set GOOGLE_SERVICES_JSON -R faghy/cleitext-mobile`
   e `base64 -w0 GoogleService-Info.plist | gh secret set GOOGLE_SERVICE_INFO_PLIST -R faghy/cleitext-mobile`.
6. Firebase → Account di servizio → genera chiave privata JSON → va nel plugin `push-relay` su
   cleitext.com (impostazioni del plugin), non nell'app.
7. Rilancia i workflow Android e iOS: le nuove build hanno le notifiche attive.

Senza questi file le build funzionano: la schermata Notifiche dice che non sono disponibili.
