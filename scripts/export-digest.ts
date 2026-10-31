import { writeFileSync } from 'node:fs';
import { createApp } from '../src/app.js';

async function main() {
  const night = process.argv[2] ?? '2026-10-28';
  const outFile = process.argv[3];

  const app = createApp();
  const res = await app.request(`/digest/${night}`);
  if (res.status !== 200) {
    console.error(`Failed to fetch /digest/${night}: status ${res.status}`);
    process.exit(1);
  }

  const html = await res.text();
  if (outFile) {
    writeFileSync(outFile, html, 'utf8');
    console.log(`Saved /digest/${night} to ${outFile}`);
  } else {
    process.stdout.write(html);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
