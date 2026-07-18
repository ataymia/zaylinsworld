import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT = process.cwd();
const PAYLOAD_PATH = join(ROOT, 'tools', 'asset-factory', 'gameplay-gap-expansion-payload', 'chunk-01.txt');
const FILE_MANIFEST_PATH = join(ROOT, 'tools', 'asset-factory', 'gameplay-gap-expansion-files.json');
const EXPECTED_ENCODED_LENGTH = 187032;
const EXPECTED_GZIP_BYTES = 140274;
const EXPECTED_GZIP_SHA256 = '7b4ff24d44e3df6f85cdbd9bb4262bab5fdea0f5240f0734bd6963d42a854892';

const encoded = readFileSync(PAYLOAD_PATH, 'utf8').trim();
if (encoded.length !== EXPECTED_ENCODED_LENGTH) {
  throw new Error(`Gameplay-gap source bundle length ${encoded.length} does not match ${EXPECTED_ENCODED_LENGTH}.`);
}
const compressed = Buffer.from(encoded, 'base64');
if (compressed.length !== EXPECTED_GZIP_BYTES) {
  throw new Error(`Gameplay-gap gzip length ${compressed.length} does not match ${EXPECTED_GZIP_BYTES}.`);
}
const digest = createHash('sha256').update(compressed).digest('hex');
if (digest !== EXPECTED_GZIP_SHA256) {
  throw new Error(`Gameplay-gap source bundle SHA-256 ${digest} does not match ${EXPECTED_GZIP_SHA256}.`);
}
const packageData = JSON.parse(gunzipSync(compressed).toString('utf8'));
if (packageData.version !== 3 || !packageData.files || typeof packageData.files !== 'object') {
  throw new Error('Invalid final gameplay-gap expansion source bundle.');
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
  version: 3,
  generatedAt: new Date().toISOString(),
  payload: 'chunk-01.txt',
  encodedLength: encoded.length,
  gzipBytes: compressed.length,
  gzipSha256: digest,
  files: writtenPaths,
}, null, 2)}\n`);
console.log(`[gameplay-gap-bootstrap] verified ${compressed.length} compressed bytes (${digest}).`);
console.log(`[gameplay-gap-bootstrap] installed ${writtenPaths.length} readable source files.`);
console.log(`[gameplay-gap-bootstrap] wrote ${FILE_MANIFEST_PATH}.`);
