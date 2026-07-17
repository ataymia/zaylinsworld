import assert from 'node:assert/strict';
import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const playerRoot = path.join(ROOT, 'public/assets/models/characters/player');
const modelPath = path.join(playerRoot, 'sunbox-male-free.glb');
const libraryPath = path.join(playerRoot, 'sunbox-male-free/texture-library.json');
const runtimePath = path.join(playerRoot, 'sunbox-male-free.runtime.json');
const adapterPath = path.join(ROOT, 'src/modularPlayer.js');

async function exists(file) {
  try { await access(file); return true; }
  catch { return false; }
}

function readGlbJson(buffer) {
  assert.equal(buffer.toString('ascii', 0, 4), 'glTF', 'player model must be a GLB');
  assert.equal(buffer.readUInt32LE(4), 2, 'player model must use glTF 2');
  const jsonLength = buffer.readUInt32LE(12);
  const jsonType = buffer.readUInt32LE(16);
  assert.equal(jsonType, 0x4E4F534A, 'player GLB must start with a JSON chunk');
  return JSON.parse(buffer.toString('utf8', 20, 20 + jsonLength).trim());
}

const present = await Promise.all([modelPath, libraryPath, runtimePath].map(exists));
if (!present.some(Boolean)) {
  console.warn('[player-runtime] generated runtime assets are not committed yet; run npm run build:player-avatar in the Codespace.');
  process.exit(0);
}
assert.ok(present.every(Boolean), 'player runtime must include GLB, texture library and runtime manifest together');

const model = await readFile(modelPath);
assert.ok(model.length < 5 * 1024 * 1024, 'player GLB exceeds 5 MB budget');
const gltf = readGlbJson(model);
const nodes = gltf.nodes || [];
const jointNames = new Set();
for (const skin of gltf.skins || []) {
  for (const jointIndex of skin.joints || []) {
    const name = nodes[jointIndex]?.name;
    if (name) jointNames.add(name);
  }
}
for (const requiredJoint of ['UpperArm_L', 'UpperArm_R', 'Hand_L', 'Hand_R']) {
  assert.ok(jointNames.has(requiredJoint), `player skin is missing arm-chain joint ${requiredJoint}`);
}

const adapter = await readFile(adapterPath, 'utf8');
assert.match(adapter, /function skinnedBoneUsage\(root\)/, 'player adapter must inspect SkinnedMesh bone usage');
assert.match(adapter, /getAttribute\?\.\('skinIndex'\)/, 'player adapter must read skin joint indices');
assert.match(adapter, /getAttribute\?\.\('skinWeight'\)/, 'player adapter must read skin weights');
assert.match(adapter, /function pickWeightedBone\(/, 'player adapter must select bones by visible-mesh influence');
assert.match(adapter, /source: 'highest-visible-skin-weight'/, 'player adapter must report weighted rig selection');
assert.match(adapter, /leftArm:\s*pickWeightedBone\(/, 'left arm must use weighted bone selection');
assert.match(adapter, /rightArm:\s*pickWeightedBone\(/, 'right arm must use weighted bone selection');

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

console.log(
  `[player-runtime] verified ${(model.length / 1024 / 1024).toFixed(2)} MB GLB, ` +
  'weighted arm-joint selection, and 47 lazy texture variants.',
);
