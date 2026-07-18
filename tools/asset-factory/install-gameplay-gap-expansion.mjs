import { gunzipSync } from 'node:zlib';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT = process.cwd();
const PAYLOAD_ROOT = join(ROOT, 'tools', 'asset-factory', 'gameplay-gap-expansion-payload');
const FILE_MANIFEST_PATH = join(ROOT, 'tools', 'asset-factory', 'gameplay-gap-expansion-files.json');
const chunkNames = readdirSync(PAYLOAD_ROOT)
  .filter((name) => /^chunk-\d+\.txt$/.test(name))
  .sort();
const encoded = chunkNames
  .map((name) => readFileSync(join(PAYLOAD_ROOT, name), 'utf8').trim())
  .join('');
const packageData = JSON.parse(gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8'));
if (packageData.version !== 1 || !packageData.files || typeof packageData.files !== 'object') {
  throw new Error('Invalid gameplay-gap expansion payload.');
}
const writtenPaths = [];
for (const [path, content] of Object.entries(packageData.files)) {
  const output = join(ROOT, path);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, Buffer.from(content, 'base64'));
  writtenPaths.push(path);
}
writtenPaths.sort();
writeFileSync(FILE_MANIFEST_PATH, `${JSON.stringify({
  version: 1,
  generatedAt: new Date().toISOString(),
  payloadChunks: chunkNames,
  files: writtenPaths,
}, null, 2)}\n`);
console.log(`[gameplay-gap-bootstrap] decoded ${chunkNames.length} payload chunks.`);
console.log(`[gameplay-gap-bootstrap] installed ${writtenPaths.length} readable source files.`);
console.log(`[gameplay-gap-bootstrap] wrote ${FILE_MANIFEST_PATH}.`);
