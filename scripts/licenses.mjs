// Writes src/licenses.txt: the open-source packages inside the app (production
// dependencies) with their license texts, shown in Settings → Open-source licenses.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const list = JSON.parse(
  execFileSync('pnpm', ['licenses', 'list', '--prod', '--json'], { encoding: 'utf8' }),
);
const packages = Object.values(list)
  .flat()
  .sort((a, b) => a.name.localeCompare(b.name));

const extra = [
  {
    name: 'Firebase Cloud Messaging SDK (Android, iOS)',
    license: 'Apache-2.0',
    text: 'Copyright Google LLC. Licensed under the Apache License, Version 2.0: https://www.apache.org/licenses/LICENSE-2.0',
  },
  {
    name: 'AndroidX, Material Components',
    license: 'Apache-2.0',
    text: 'Copyright The Android Open Source Project. Licensed under the Apache License, Version 2.0: https://www.apache.org/licenses/LICENSE-2.0',
  },
];

let out =
  'Cleitext app — © Serafino Christian — GPL-2.0-or-later\nhttps://github.com/faghy/cleitext-mobile\n\n' +
  'Open-source software included in this app:\n\n';
for (const pkg of packages) {
  const dir = pkg.paths[0];
  const file = existsSync(dir)
    ? readdirSync(dir).find((f) => /^(licen[cs]e|copying)(\.|$)/i.test(f))
    : undefined;
  const text = file ? readFileSync(join(dir, file), 'utf8').trim() : `License: ${pkg.license}`;
  out += `${'='.repeat(60)}\n${pkg.name} ${pkg.versions.join(', ')} — ${pkg.license}\n${pkg.homepage ?? ''}\n\n${text}\n\n`;
}
for (const item of extra) {
  out += `${'='.repeat(60)}\n${item.name} — ${item.license}\n\n${item.text}\n\n`;
}
writeFileSync('src/licenses.txt', out);
console.log(`src/licenses.txt: ${packages.length + extra.length} entries`);
