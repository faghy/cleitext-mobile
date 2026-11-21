// Draws the Cleitext mark as vectors and writes the source images for the
// app icon, the Android adaptive icon and the splash screens (assets/), then
// the logo used inside the app (public/logo.png).
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const BLUE = '#0369a1';
const SKY = '#7dd3fc';

/** The mark on a 512 grid, centered on (cx, cy) with this scale. */
function mark(scale = 1, cx = 240, cy = 260) {
  const t = `translate(${256 - cx * scale} ${256 - cy * scale}) scale(${scale})`;
  return `<g transform="${t}">
    <path d="M312.26 187.73 A108 108 0 1 0 312.26 332.27" fill="none" stroke="#fff" stroke-width="56" stroke-linecap="round"/>
    <rect x="344" y="152" width="40" height="206" rx="20" fill="${SKY}"/>
  </g>`;
}

const svg = (body, background = BLUE, radius = 0) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">` +
      (background ? `<rect width="512" height="512" rx="${radius}" fill="${background}"/>` : '') +
      body +
      `</svg>`,
  );

const png = (input, size, file) =>
  sharp(input, { density: Math.ceil((72 * size) / 512) })
    .resize(size, size)
    .png()
    .toFile(file);

mkdirSync('assets', { recursive: true });
await png(svg(mark(1)), 1024, 'assets/icon-only.png');
await png(svg(mark(0.9), null), 1024, 'assets/icon-foreground.png');
await png(svg('', BLUE), 1024, 'assets/icon-background.png');
// Splash: the mark small in the middle of a 2732 square.
const splash = (bg) =>
  sharp(svg(mark(0.18), bg), { density: Math.ceil((72 * 2732) / 512) })
    .resize(2732, 2732)
    .png();
await splash(BLUE).toFile('assets/splash.png');
await splash('#0b1220').toFile('assets/splash-dark.png');
await png(svg(mark(1), BLUE, 112), 256, 'public/logo.png');
console.log('Brand images written.');
