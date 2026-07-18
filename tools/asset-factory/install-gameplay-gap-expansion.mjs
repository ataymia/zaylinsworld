import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

const ROOT = process.cwd();
const PAYLOAD_ROOT = join(ROOT, 'tools', 'asset-factory', 'factory-patch-payload');
const MANIFEST_PATH = join(ROOT, 'tools', 'asset-factory', 'factory-patch-files.json');
const EXPECTED_BYTES = 50516;
const EXPECTED_SHA256 = '3ab50269563031c5cb8e27b8a49b6b6d92cac794ff58d391d3e4d6d9e24dbe1a';

const parts = readdirSync(PAYLOAD_ROOT)
  .filter((name) => /^part-\d+\.bin$/.test(name))
  .sort();
if (parts.length !== 11) throw new Error(`Expected 11 patch parts, found ${parts.length}.`);
const compressed = Buffer.concat(parts.map((name) => readFileSync(join(PAYLOAD_ROOT, name))));
if (compressed.length !== EXPECTED_BYTES) {
  throw new Error(`Patch bundle has ${compressed.length} bytes; expected ${EXPECTED_BYTES}.`);
}
const digest = createHash('sha256').update(compressed).digest('hex');
if (digest !== EXPECTED_SHA256) {
  throw new Error(`Patch bundle SHA-256 ${digest} does not match ${EXPECTED_SHA256}.`);
}
const bundle = JSON.parse(gunzipSync(compressed).toString('utf8'));
if (bundle.version !== 1 || !bundle.files || typeof bundle.files !== 'object') {
  throw new Error('Invalid repaired factory bundle.');
}
const files = [];
for (const [path, encoded] of Object.entries(bundle.files)) {
  const output = join(ROOT, path);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, Buffer.from(encoded, 'base64'));
  files.push(path);
}
files.sort();
writeFileSync(MANIFEST_PATH, `${JSON.stringify({
  version: 1,
  installedAt: new Date().toISOString(),
  compressedBytes: compressed.length,
  compressedSha256: digest,
  parts,
  files,
}, null, 2)}\n`);
console.log(`[factory-bootstrap] verified ${compressed.length} compressed bytes (${digest}).`);
console.log(`[factory-bootstrap] installed ${files.length} repaired production files.`);
