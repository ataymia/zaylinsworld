import assert from 'node:assert/strict';
import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const playerRoot = path.join(ROOT, 'public/assets/models/characters/player');
const modelPath = path.join(playerRoot, 'sunbox-male-free.glb');
const libraryPath = path.join(playerRoot, 'sunbox-male-free/texture-library.json');
const runtimePath = path.join(playerRoot, 'sunbox-male-free.runtime.json');

async function exists(file) {
  try { await access(file); return true; }
  catch { return false; }
}

const present = await Promise.all([modelPath, libraryPath, runtimePath].map(exists));
if (!present.some(Boolean)) {
  console.warn('[player-runtime] generated runtime assets are not committed yet; run npm run build:player-avatar in the Codespace.');
  process.exit(0);
}
assert.ok(present.every(Boolean), 'player runtime must include GLB, texture library and runtime manifest together');

const model = await readFile(modelPath);
assert.equal(model.toString('ascii', 0, 4), 'glTF', 'player model must be a GLB');
assert.equal(model.readUInt32LE(4), 2, 'player model must use glTF 2');
assert.ok(model.length < 5 * 1024 * 1024, 'player GLB exceeds 5 MB budget');

const library = JSON.parse(await readFile(libraryPath, 'utf8'));
assert.equal(library.format, 'data-uri-library-v1');
assert.equal(Object.keys(library.files || {}).length, 47, 'expected all 47 optimized appearance variants');
for (const [name, value] of Object.entries(library.files || {})) {
  assert.match(value, /^data:image\/webp;base64,/, `${name} is not packed as WebP`);
}

const runtime = JSON.parse(await readFile(runtimePath, 'utf8'));
assert.equal(runtime.source, 'Sunbox Games / CGTrader 3901952');
assert.equal(runtime.textureCount, 47);
assert.ok((await stat(libraryPath)).size < 2 * 1024 * 1024, 'texture library exceeds 2 MB budget');

console.log(`[player-runtime] verified ${(model.length / 1024 / 1024).toFixed(2)} MB GLB and 47 lazy texture variants.`);
