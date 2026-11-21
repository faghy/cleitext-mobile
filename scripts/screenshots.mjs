// Store screenshots of the real app (web build) against a mocked site API.
//   pnpm build && node scripts/screenshots.mjs
// Playwright is not a dependency of the app: set PLAYWRIGHT to its module
// (e.g. …/node_modules/playwright/index.mjs) or install it next to the app.
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import sharp from 'sharp';
import { fixtures, ORIGIN, texts } from './fixtures.mjs';

const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');

const PORT = 4179;
const BASE = `http://127.0.0.1:${PORT}/`;
const SITE_ID = 'demo-site';

/** Phone sizes the stores ask for (CSS viewport × device scale). */
const DEVICES = {
  'iphone-6.9': { width: 440, height: 956, scale: 3, store: 'ios' }, // 1320×2868
  'iphone-6.5': { width: 428, height: 926, scale: 3, store: 'ios' }, // 1284×2778
  android: { width: 360, height: 640, scale: 3, store: 'android' }, // 1080×1920
};
const LANGS = {
  it: { ios: 'it', android: 'it-IT', locale: 'it-IT' },
  en: { ios: 'en-US', android: 'en-US', locale: 'en-US' },
};

// ---- Demo photos (drawn, no real pictures) -------------------------------------
const PALETTES = [
  ['#0ea5e9', '#0369a1', '#f8fafc'],
  ['#f97316', '#9a3412', '#fde68a'],
  ['#22c55e', '#166534', '#dcfce7'],
  ['#e11d48', '#881337', '#fecdd3'],
  ['#a855f7', '#581c87', '#f3e8ff'],
  ['#eab308', '#854d0e', '#fef9c3'],
];
async function photo(n) {
  const [a, b, c] = PALETTES[(n - 1) % PALETTES.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
    <rect width="900" height="900" fill="url(#g)"/>
    <circle cx="${200 + n * 70}" cy="${260 + (n % 3) * 60}" r="${120 + n * 10}" fill="${c}" opacity="0.35"/>
    <path d="M0 ${620 + n * 10} Q 225 ${540 - n * 8} 450 ${620} T 900 ${600 + n * 6} V 900 H 0 Z" fill="${c}" opacity="0.5"/>
    <path d="M0 ${720} Q 300 ${650 + n * 6} 600 ${730} T 900 ${700} V 900 H 0 Z" fill="${b}" opacity="0.6"/>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toBuffer();
}
const photos = await Promise.all([1, 2, 3, 4, 5, 6].map(photo));

// ---- Mocked site ----------------------------------------------------------------
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, accept',
  'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

async function mockSite(page, lang) {
  const data = fixtures(lang);
  await page.route(`${ORIGIN}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    const send = (body, status = 200) =>
      route.fulfill({
        status,
        headers: { ...CORS, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const m = /^\/demo\/photo-(\d)\.jpg$/.exec(path);
    if (m)
      return route.fulfill({
        status: 200,
        headers: { ...CORS, 'content-type': 'image/jpeg' },
        body: photos[Number(m[1]) - 1],
      });
    if (path === '/api/v1/auth/me') return send(data.me);
    if (path === '/api/v1/comments/pending-count') return send({ count: 3 });
    if (path === '/api/v1/comments') return send(data.comments);
    if (path === '/api/v1/entries') return send(data.drafts);
    if (path === '/api/v1/ext/forms/submissions') return send(data.submissions);
    if (path === '/api/v1/ext/shop/orders') return send(data.orders);
    if (path.startsWith('/api/v1/ext/shop/orders/')) return send(data.orderDetail);
    if (path === '/api/v1/media' && method === 'GET') return send(data.media);
    if (path === '/api/v1/media' && method === 'POST')
      return send({ ...data.media.items[0], id: 'new-photo', url: '/demo/photo-1.jpg' }, 201);
    if (path === '/api/v1/push/status') return send(data.pushStatus);
    return send({ title: 'Not Found', status: 404 }, 404);
  });
  // The shop's remote switch: the copy in the repository.
  await page.route('https://raw.githubusercontent.com/**', (route) =>
    route.fulfill({
      status: 200,
      headers: CORS,
      contentType: 'application/json',
      body: readFileSync('remote/shop.json', 'utf8'),
    }),
  );
}

async function seed(page, lang) {
  const t = texts(lang);
  const site = {
    id: SITE_ID,
    origin: ORIGIN,
    name: t.site,
    userName: t.user,
    clientId: 'demo-client',
    tokenEndpoint: `${ORIGIN}/oauth/token`,
    capabilities: fixtures(lang).me.capabilities,
  };
  const tokens = {
    accessToken: 'demo',
    refreshToken: 'demo',
    expiresAt: Date.now() + 86_400_000,
    scopes: ['read', 'write', 'publish'],
  };
  await page.addInitScript(
    ([site, tokens, seen]) => {
      localStorage.setItem('CapacitorStorage.sites', JSON.stringify([site]));
      localStorage.setItem('CapacitorStorage.currentSite', JSON.stringify(site.id));
      localStorage.setItem(`CapacitorStorage.seen.messages.${site.id}`, JSON.stringify(seen));
      localStorage.setItem(`capacitor-storage_tokens.${site.id}`, JSON.stringify(tokens));
    },
    [site, tokens, new Date(Date.now() - 200 * 60_000).toISOString()],
  );
}

// ---- Scenes ------------------------------------------------------------------------
const tab = (page, name) => page.locator('.tabbar').getByRole('button', { name }).click();
const settle = (page) => page.waitForTimeout(700);

function scenes(lang) {
  const t = texts(lang);
  const it = lang === 'it';
  return [
    ['home', async () => {}],
    [
      'write',
      async (page) => {
        await tab(page, it ? 'Scrivi' : 'Write');
        await page.getByLabel(it ? 'Titolo' : 'Title').fill(t.draftTitle);
        await page.locator('.compose__text').first().fill(t.draftText);
        await page.getByRole('button', { name: it ? 'Aggiungi foto' : 'Add a photo' }).click();
        const chooser = page.waitForEvent('filechooser');
        await page
          .getByRole('button', { name: it ? 'Scegli dalla galleria' : 'Choose from gallery' })
          .click();
        await (
          await chooser
        ).setFiles({ name: 'mercato.jpg', mimeType: 'image/jpeg', buffer: photos[0] });
        await page.locator('.compose__alt').fill(t.alt);
        await page.locator('.compose__alt').blur();
        await page.locator('.screen__body').evaluate((el) => el.scrollTo(0, 0));
      },
    ],
    ['comments', async (page) => tab(page, it ? 'Commenti' : 'Comments')],
    [
      'order',
      async (page) => {
        await page
          .getByRole('button', { name: it ? /Ordini da evadere/ : /Orders to fulfil/ })
          .click();
        await settle(page);
        await page.locator('.cell').first().click();
      },
    ],
    [
      'messages',
      async (page) =>
        page.getByRole('button', { name: it ? /Messaggi nuovi/ : /New messages/ }).click(),
    ],
    ['shop', async (page) => tab(page, it ? 'Negozio' : 'Shop')],
    [
      'product',
      async (page) => {
        await tab(page, it ? 'Negozio' : 'Shop');
        await page.getByRole('button', { name: /Campus/ }).click();
      },
    ],
    [
      'media',
      async (page) => {
        await tab(page, it ? 'Altro' : 'More');
        await page.getByRole('button', { name: 'Media' }).click();
      },
    ],
    [
      'register',
      async (page) => {
        await tab(page, it ? 'Altro' : 'More');
        await page
          .getByRole('button', { name: it ? 'Account Cleitext' : 'Cleitext account' })
          .click();
        await page
          .getByRole('button', {
            name: it ? 'Crea un account Cleitext' : 'Create a Cleitext account',
          })
          .click();
        await page.getByLabel(it ? 'Nome e cognome' : 'Full name').fill(t.user);
        await page.getByLabel('Email').fill('giulia@example.com');
      },
    ],
  ];
}

// ---- Run ------------------------------------------------------------------------------
const server = spawn(
  'pnpm',
  ['exec', 'vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'],
  {
    stdio: 'ignore',
  },
);
await new Promise((resolve) => setTimeout(resolve, 2500));
const browser = await chromium.launch();
const written = [];
try {
  for (const [lang, dirs] of Object.entries(LANGS)) {
    for (const [deviceName, device] of Object.entries(DEVICES)) {
      const list = scenes(lang);
      // Play takes up to 8 phone screenshots.
      const chosen = device.store === 'android' ? list.filter(([n]) => n !== 'media') : list;
      for (const [index, [name, act]] of chosen.entries()) {
        const context = await browser.newContext({
          viewport: { width: device.width, height: device.height },
          deviceScaleFactor: device.scale,
          isMobile: true,
          hasTouch: true,
          locale: dirs.locale,
          colorScheme: 'light',
        });
        const page = await context.newPage();
        await mockSite(page, lang);
        await seed(page, lang);
        await page.goto(BASE);
        await page.waitForSelector('.tabbar');
        await settle(page);
        await act(page);
        await settle(page);
        await page.evaluate(
          () => document.activeElement instanceof HTMLElement && document.activeElement.blur(),
        );
        const n = index + 1;
        const file =
          device.store === 'ios'
            ? `fastlane/screenshots/${dirs.ios}/${n}_${deviceName}_${name}.png`
            : `fastlane/metadata/android/${dirs.android}/images/phoneScreenshots/${n}_${name}.png`;
        mkdirSync(file.slice(0, file.lastIndexOf('/')), { recursive: true });
        await page.screenshot({ path: file });
        written.push(file);
        await context.close();
      }
    }
    // Play feature graphic (1024×500) and hi-res icon (512×512).
    const context = await browser.newContext({
      viewport: { width: 1024, height: 500 },
      locale: dirs.locale,
    });
    const page = await context.newPage();
    const logo = readFileSync('assets/icon-only.png').toString('base64');
    const headline = lang === 'it' ? 'Il tuo sito, in tasca' : 'Your site, in your pocket';
    const sub =
      lang === 'it'
        ? 'Scrivi, modera i commenti, leggi messaggi e ordini.'
        : 'Write, moderate comments, read messages and orders.';
    const font = readFileSync(
      'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
    ).toString('base64');
    await page.setContent(`<style>
      @font-face{font-family:Inter;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:100 900}
      body{margin:0;width:1024px;height:500px;font-family:Inter;background:linear-gradient(135deg,#0369a1,#075985 60%,#0c4a6e);color:#fff;display:flex;align-items:center;gap:56px;padding:0 80px;box-sizing:border-box;overflow:hidden}
      img{width:180px;height:180px;border-radius:40px;box-shadow:0 20px 50px rgb(0 0 0/.3)}
      h1{font-size:58px;line-height:1.05;margin:0 0 18px;letter-spacing:-.02em;font-weight:800}
      p{font-size:26px;margin:0;color:#e0f2fe;font-weight:500}
      .brand{font-size:22px;font-weight:700;color:#7dd3fc;letter-spacing:.08em;text-transform:uppercase;margin-bottom:12px}
    </style><img src="data:image/png;base64,${logo}"><div><div class="brand">Cleitext</div><h1>${headline}</h1><p>${sub}</p></div>`);
    const graphic = `fastlane/metadata/android/${dirs.android}/images/featureGraphic.png`;
    mkdirSync(graphic.slice(0, graphic.lastIndexOf('/')), { recursive: true });
    await page.screenshot({ path: graphic });
    written.push(graphic);
    await context.close();
    const icon = `fastlane/metadata/android/${dirs.android}/images/icon.png`;
    await sharp('assets/icon-only.png').resize(512, 512).png().toFile(icon);
    written.push(icon);
  }
} finally {
  await browser.close();
  server.kill();
}
console.log(written.join('\n'));
process.exit(0);
