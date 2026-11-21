import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vitest/config';

const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as {
  version: string;
};

/** Built pages only (the dev server injects inline scripts). */
const CSP = [
  "default-src 'self'",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https: blob:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "script-src 'self'",
].join('; ');

function contentSecurityPolicy(): Plugin {
  return {
    name: 'cleitext-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), contentSecurityPolicy()],
  base: './',
  define: { __APP_VERSION__: JSON.stringify(version) },
  build: {
    outDir: 'dist',
    target: ['es2022', 'safari15', 'chrome100'],
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
