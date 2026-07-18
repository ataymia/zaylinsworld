import { gunzipSync } from 'node:zlib';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT = process.cwd();
const PAYLOAD_ROOT = join(ROOT, 'tools', 'asset-factory', 'gameplay-gap-expansion-payload');
const encoded = readdirSync(PAYLOAD_ROOT)
  .filter((name) => /^chunk-\d+\.txt$/.test(name))
  .sort()
  .map((name) => readFileSync(join(PAYLOAD_ROOT, name), 'utf8').trim())
  .join('');
const packageData = JSON.parse(gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8'));
if (packageData.version !== 1 || !packageData.files || typeof packageData.files !== 'object') {
  throw new Error('Invalid gameplay-gap expansion payload.');
}
let written = 0;
for (const [path, content] of Object.entries(packageData.files)) {
  const output = join(ROOT, path);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, Buffer.from(content, 'base64'));
  written += 1;
}
console.log(`[gameplay-gap-bootstrap] installed ${written} readable source files.`);
