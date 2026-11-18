// Downloads each source's site icon into public/source-icons/<domain>.png so
// the site serves them itself (no runtime requests to third parties).
// Run after adding a source to lib/source-domains.json:
//   node scripts/fetch-source-icons.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const domains = [...new Set(Object.values(JSON.parse(readFileSync('lib/source-domains.json', 'utf8'))))];
let failed = 0;
for (const domain of domains) {
  const out = `public/source-icons/${domain}.png`;
  if (existsSync(out) && !process.argv.includes('--force')) continue;
  const res = await fetch(`https://www.google.com/s2/favicons?domain=${domain}&sz=64`).catch(() => null);
  const buf = res?.ok ? Buffer.from(await res.arrayBuffer()) : null;
  // The service answers unknown domains with a generic globe; a 404 status marks those.
  if (!buf || buf.length < 100) {
    failed++;
    console.log(`skip ${domain} (${res?.status ?? 'network error'})`);
    continue;
  }
  writeFileSync(out, buf);
  console.log(`ok   ${domain}`);
}
console.log(failed ? `${failed} failed; those sources fall back to a generic icon` : 'done');
