// ───────────────────────────────────────────────────────────────────────────
//  index-kits.mjs — scan the imported Kenney asset kits under
//  public/assets/models/ and emit a discoverable index the game can fetch.
//
//  Usage:  npm run index:kits   (or: node tools/index-kits.mjs)
//
//  Output: public/assets/models/kits-index.json
//    { generatedAt, kits: { <kitId>: { dir, count, models:[{ name, file, url }] } } }
//
//  Each Kenney .gltf references its sibling .bin + .png textures by RELATIVE
//  URI, so every kit lives in a single flat folder and loads as-is via the
//  existing GLTFLoader pipeline (assets.js → loadModel).
// ───────────────────────────────────────────────────────────────────────────
import { readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

const ROOT = process.cwd();
const MODELS = join(ROOT, 'public/assets/models');

// kitId → folder (served at assets/models/<rel>)
const KITS = {
  'urban-kit':  'buildings/urban-kit',
  'mini-kit':   'characters/mini-kit',
};

function listGltf(absDir) {
  if (!existsSync(absDir)) return [];
  return readdirSync(absDir)
    .filter((f) => f.toLowerCase().endsWith('.gltf'))
    .sort();
}

const kits = {};
for (const [id, rel] of Object.entries(KITS)) {
  const absDir = join(MODELS, rel);
  const files = listGltf(absDir);
  kits[id] = {
    dir: `assets/models/${rel}`,
    count: files.length,
    models: files.map((f) => ({
      name: basename(f, '.gltf'),
      file: f,
      url: `assets/models/${rel}/${f}`,
    })),
  };
  console.log(`  ${id}: ${files.length} models`);
}

const out = { generatedAt: new Date().toISOString(), kits };
const dest = join(MODELS, 'kits-index.json');
writeFileSync(dest, JSON.stringify(out, null, 2) + '\n');
console.log(`✓ wrote ${dest}`);
