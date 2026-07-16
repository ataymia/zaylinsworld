import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const source = path.join(root, 'source-runtime/player-integration');
const manifest = JSON.parse(await readFile(path.join(source, 'manifest.json'), 'utf8'));
const names = (await readdir(source)).filter((name) => name.startsWith('player-integration.zip.b64.part-')).sort();
if (names.length !== manifest.parts.length || names.some((name, index) => name !== manifest.parts[index])) {
  throw new Error(`Payload part mismatch: expected ${manifest.parts.length}, found ${names.length}`);
}
let encoded = '';
for (const name of names) encoded += await readFile(path.join(source, name), 'utf8');
const data = Buffer.from(encoded, 'base64');
const sha = crypto.createHash('sha256').update(data).digest('hex');
if (data.length !== manifest.bytes || sha !== manifest.sha256) {
  throw new Error(`Integration bundle checksum mismatch: ${data.length}/${manifest.bytes}, ${sha}/${manifest.sha256}`);
}
const destination = process.argv[2] || '/tmp/player-integration.zip';
await writeFile(destination, data);
console.log(`[player-integration] verified ${names.length} parts, ${data.length} bytes, ${sha}`);
