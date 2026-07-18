import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT = process.cwd();
const PAYLOAD_ROOT = join(ROOT, 'tools', 'asset-factory', 'gameplay-gap-expansion-payload');
const FILE_MANIFEST_PATH = join(ROOT, 'tools', 'asset-factory', 'gameplay-gap-expansion-files.json');
const EXPECTED_CHUNKS = 11;
const EXPECTED_ENCODED_LENGTH = 187724;
const EXPECTED_GZIP_BYTES = 140793;
const EXPECTED_GZIP_SHA256 = '9ea824051aeec16fb17d8622475d8d4ef1fb7c5f944ada6aae2be16ca4d423bd';

const chunkNames = readdirSync(PAYLOAD_ROOT)
  .filter((name) => /^chunk-\d+\.txt$/.test(name))
  .sort();
if (chunkNames.length !== EXPECTED_CHUNKS) {
  throw new Error(`Gameplay-gap bundle has ${chunkNames.length} chunks; expected ${EXPECTED_CHUNKS}.`);
}
const encoded = chunkNames
  .map((name) => readFileSync(join(PAYLOAD_ROOT, name), 'utf8').trim())
  .join('');
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
  payloadChunks: chunkNames,
  encodedLength: encoded.length,
  gzipBytes: compressed.length,
  gzipSha256: digest,
  files: writtenPaths,
}, null, 2)}\n`);
console.log(`[gameplay-gap-bootstrap] verified ${chunkNames.length} chunks and ${compressed.length} compressed bytes (${digest}).`);
console.log(`[gameplay-gap-bootstrap] installed ${writtenPaths.length} readable source files.`);
console.log(`[gameplay-gap-bootstrap] wrote ${FILE_MANIFEST_PATH}.`);
