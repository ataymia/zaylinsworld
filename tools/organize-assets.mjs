// ───────────────────────────────────────────────────────────────────────────
//  organize-assets.mjs — find every uploaded asset pack in the repo root,
//  convert it to web-ready self-contained glTF/GLB, and drop it into the
//  served public/assets/models/<category>/<pack>/ tree with clean names.
//
//  • Web-ready packs (.glb / co-located .gltf+.bin+png) are copied as-is.
//  • FBX / DAE / OBJ packs are converted to .glb with `assimp`, then their
//    textures (referenced by absolute author paths) are located inside the
//    pack and EMBEDDED into the GLB so the result is fully self-contained.
//  • A machine-readable index (asset-index-v2.json) and a human report are
//    written so the game + future code can discover everything.
//
//  Run:  node tools/organize-assets.mjs            (reads ./.staging)
//  The heavy source archives stay gitignored; only the lean web copies land
//  in public/assets and get committed.
// ───────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { routeFor } from './asset-routing.mjs';

const ROOT = process.cwd();
const STAGING = path.join(ROOT, '.staging');
const OUT = path.join(ROOT, 'public', 'assets', 'models');

// pack folder name (under .staging) → { cat, slug, mode }
//   mode: 'auto' picks glb/gltf if present else converts; 'convert' forces assimp
const PACKS = [
  // ── characters (new PSX + stylized people) ──────────────────────────────
  { dir: 'Characters_psx',                          cat: 'characters', slug: 'psx',          mode: 'convert' },
  { dir: 'Personajes',                              cat: 'characters', slug: 'people',        mode: 'convert' },
  { dir: 'Personajes terror',                       cat: 'characters', slug: 'spooky',        mode: 'convert' },
  { dir: 'Criaturas1',                              cat: 'characters', slug: 'creatures',     mode: 'convert' },
  // ── buildings / landmarks ───────────────────────────────────────────────
  { dir: 'Gas_station',                             cat: 'buildings',  slug: 'gas-station',   mode: 'convert' },
  { dir: 'DINER',                                   cat: 'buildings',  slug: 'diner',         mode: 'convert' },
  { dir: 'Mini Market',                             cat: 'buildings',  slug: 'mini-market',   mode: 'convert' },
  { dir: 'Cabañas',                                 cat: 'buildings',  slug: 'cabins',        mode: 'convert' },
  { dir: 'Bui',                                     cat: 'buildings',  slug: 'misc',          mode: 'convert' },
  { dir: 'shop',                                    cat: 'buildings',  slug: 'shop',          mode: 'auto' },
  // ── interiors / furniture / equipment ───────────────────────────────────
  { dir: 'KayKit_Furniture_Bits_1.0_FREE',          cat: 'interiors',  slug: 'furniture',     mode: 'gltfdir' },
  { dir: 'low_poly_fast_food_restaurant_v03_1',     cat: 'interiors',  slug: 'restaurant',    mode: 'convert' },
  { dir: 'VNB Low Poly Gym Set',                    cat: 'interiors',  slug: 'gym',           mode: 'convert' },
  { dir: 'StylooClassroomAssetPack GLTF & FBX',     cat: 'interiors',  slug: 'classroom',     mode: 'auto' },
  // ── props / food / environment ──────────────────────────────────────────
  { dir: 'KloWorks_Healthy&Junk_Food_Pack',         cat: 'props',      slug: 'food',          mode: 'auto' },
  { dir: 'Comida low poly',                         cat: 'props',      slug: 'food-extra',    mode: 'convert' },
  { dir: 'Trash and Debris',                        cat: 'props',      slug: 'trash',         mode: 'auto' },
  { dir: 'Maquinas',                                cat: 'props',      slug: 'machines',      mode: 'convert' },
  { dir: 'Arboles',                                 cat: 'props',      slug: 'trees',         mode: 'convert' },
  { dir: 'Rocas',                                   cat: 'props',      slug: 'rocks',         mode: 'convert' },
  { dir: 'Pesca',                                   cat: 'props',      slug: 'fishing',       mode: 'convert' },
  // ── weapons (fictional / stylized) ──────────────────────────────────────
  { dir: 'Styloo Guns Asset Pack GLTF FBX V1.1',    cat: 'weapons',    slug: 'styloo',        mode: 'auto' },
  // ── animations (retargetable clips) ─────────────────────────────────────
  { dir: 'Universal Animation Library[Standard]',   cat: 'animations', slug: 'ual-1',         mode: 'auto' },
  { dir: 'Universal Animation Library 2[Standard]', cat: 'animations', slug: 'ual-2',         mode: 'auto' },
];

const IMG_EXT = ['.png', '.jpg', '.jpeg', '.tga', '.bmp', '.webp'];
const mime = (e) => ({ '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }[e.toLowerCase()] || 'image/png');

// Auto-discover any staged pack folders not already in PACKS and route them via
// the shared routing map (tools/asset-routing.mjs) so newly-dropped Spanish /
// creator packs land in the served tree without editing this file.
function discoverStagedPacks() {
  if (!fs.existsSync(STAGING)) return;
  const known = new Set(PACKS.map((p) => p.dir));
  for (const e of fs.readdirSync(STAGING, { withFileTypes: true })) {
    if (!e.isDirectory() || known.has(e.name)) continue;
    const route = routeFor(e.name);
    if (!route) continue;     // unmatched packs are surfaced by `npm run audit:loose`
    PACKS.push({ dir: e.name, cat: route.cat, slug: route.slug, mode: 'auto' });
  }
}
discoverStagedPacks(); = (e) => ({ '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }[e.toLowerCase()] || 'image/png');

const slugify = (s) => s.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();

function walk(dir, filter) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, filter));
    else if (!filter || filter(p)) out.push(p);
  }
  return out;
}

// Build a basename→path lookup of every image in a pack (for texture embedding).
function textureIndex(packDir) {
  const map = new Map();
  for (const p of walk(packDir, (f) => IMG_EXT.includes(path.extname(f).toLowerCase()))) {
    const base = path.basename(p).toLowerCase();
    if (!map.has(base)) map.set(base, p);
    const noext = base.replace(/\.[^.]+$/, '');
    if (!map.has(noext)) map.set(noext, p);
  }
  return map;
}

// Parse a GLB into { json, bin } where bin is the logical binary buffer.
function parseGlb(buf) {
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a glb');
  let off = 12, json = null, bin = null;
  while (off < buf.length) {
    const len = buf.readUInt32LE(off);
    const type = buf.readUInt32LE(off + 4);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(data.toString('utf8'));
    else if (type === 0x004e4942) bin = Buffer.from(data);
    off += 8 + len;
  }
  return { json, bin: bin || Buffer.alloc(0) };
}

function buildGlb(json, bin) {
  const jsonStr = Buffer.from(JSON.stringify(json), 'utf8');
  const jsonPad = (4 - (jsonStr.length % 4)) % 4;
  const jsonChunk = Buffer.concat([jsonStr, Buffer.alloc(jsonPad, 0x20)]);
  const binPad = (4 - (bin.length % 4)) % 4;
  const binChunk = Buffer.concat([bin, Buffer.alloc(binPad, 0)]);
  const total = 12 + 8 + jsonChunk.length + 8 + binChunk.length;
  const head = Buffer.alloc(12);
  head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(total, 8);
  const jh = Buffer.alloc(8); jh.writeUInt32LE(jsonChunk.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
  const bh = Buffer.alloc(8); bh.writeUInt32LE(binChunk.length, 0); bh.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([head, jh, jsonChunk, bh, binChunk]);
}

// Embed externally-referenced textures into the GLB's BIN buffer.
function embedTextures(buf, texMap) {
  const { json, bin } = parseGlb(buf);
  if (!json.images || !json.images.length) return { buf, embedded: 0, missing: 0 };
  json.bufferViews = json.bufferViews || [];
  if (!json.buffers || !json.buffers.length) json.buffers = [{ byteLength: bin.length }];
  let logical = json.buffers[0].byteLength || bin.length;
  let working = Buffer.from(bin.subarray(0, logical));
  let embedded = 0, missing = 0;
  for (const img of json.images) {
    if (img.bufferView !== undefined || !img.uri || img.uri.startsWith('data:')) continue;
    const base = path.basename(img.uri.replace(/\\/g, '/')).toLowerCase();
    const src = texMap.get(base) || texMap.get(base.replace(/\.[^.]+$/, ''));
    if (!src) { missing++; delete img.uri; continue; }
    const bytes = fs.readFileSync(src);
    const pad = (4 - (working.length % 4)) % 4;
    if (pad) working = Buffer.concat([working, Buffer.alloc(pad, 0)]);
    const offset = working.length;
    working = Buffer.concat([working, bytes]);
    json.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length });
    img.bufferView = json.bufferViews.length - 1;
    img.mimeType = mime(path.extname(src));
    delete img.uri;
    embedded++;
  }
  json.buffers[0].byteLength = working.length;
  return { buf: buildGlb(json, working), embedded, missing };
}

function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); }
function copy(src, dst) { ensureDir(path.dirname(dst)); fs.copyFileSync(src, dst); }

const report = [];
const index = {};

function emit(cat, slug, name, file, info) {
  const rel = path.relative(path.join(ROOT, 'public', 'assets'), file).split(path.sep).join('/');
  (index[cat] ||= {})[slug] ||= [];
  index[cat][slug].push({ name, path: rel, ...info });
}

for (const pack of PACKS) {
  const packDir = path.join(STAGING, pack.dir);
  if (!fs.existsSync(packDir)) { report.push([pack.dir, pack.cat + '/' + pack.slug, 'MISSING', 0]); continue; }
  const destDir = path.join(OUT, pack.cat, pack.slug);
  ensureDir(destDir);
  let count = 0;

  if (pack.mode === 'gltfdir') {
    // copy a self-contained gltf folder wholesale (gltf + bin + shared textures)
    const gltfRoot = path.dirname(walk(packDir, (f) => f.toLowerCase().endsWith('.gltf'))[0] || '');
    for (const f of fs.readdirSync(gltfRoot)) {
      const ext = path.extname(f).toLowerCase();
      if (['.gltf', '.bin', '.png', '.jpg', '.jpeg'].includes(ext)) {
        copy(path.join(gltfRoot, f), path.join(destDir, f));
        if (ext === '.gltf') { emit(pack.cat, pack.slug, slugify(f), path.join(destDir, f), { type: 'gltf' }); count++; }
      }
    }
    report.push([pack.dir, pack.cat + '/' + pack.slug, 'gltf-copy', count]);
    continue;
  }

  const glbs = walk(packDir, (f) => f.toLowerCase().endsWith('.glb'));
  const gltfs = walk(packDir, (f) => f.toLowerCase().endsWith('.gltf'));
  const models = walk(packDir, (f) => /\.(fbx|dae|obj)$/i.test(f));

  if (pack.mode === 'auto' && glbs.length) {
    for (const g of glbs) {
      const out = path.join(destDir, slugify(path.basename(g)) + '.glb');
      copy(g, out); emit(pack.cat, pack.slug, slugify(path.basename(g)), out, { type: 'glb' }); count++;
    }
    report.push([pack.dir, pack.cat + '/' + pack.slug, 'glb-copy', count]);
    continue;
  }
  if (pack.mode === 'auto' && gltfs.length) {
    // copy each gltf with its siblings
    const seen = new Set();
    for (const g of gltfs) {
      const dir = path.dirname(g);
      if (seen.has(dir)) continue; seen.add(dir);
      for (const f of fs.readdirSync(dir)) {
        if (/\.(gltf|bin|png|jpg|jpeg)$/i.test(f)) copy(path.join(dir, f), path.join(destDir, f));
      }
      emit(pack.cat, pack.slug, slugify(path.basename(g)), path.join(destDir, path.basename(g)), { type: 'gltf' }); count++;
    }
    report.push([pack.dir, pack.cat + '/' + pack.slug, 'gltf-copy', count]);
    continue;
  }

  // convert FBX/DAE/OBJ → glb + embed textures
  const texMap = textureIndex(packDir);
  let embTotal = 0, miss = 0;
  for (const m of models) {
    const name = slugify(path.basename(m));
    const tmp = path.join(destDir, name + '.tmp.glb');
    try {
      execFileSync('assimp', ['export', m, tmp], { stdio: 'pipe' });
    } catch (e) { miss++; continue; }
    try {
      const res = embedTextures(fs.readFileSync(tmp), texMap);
      fs.writeFileSync(path.join(destDir, name + '.glb'), res.buf);
      embTotal += res.embedded;
      emit(pack.cat, pack.slug, name, path.join(destDir, name + '.glb'), { type: 'glb', tex: res.embedded });
      count++;
    } catch (e) {
      // fall back to the raw conversion if embedding fails
      fs.copyFileSync(tmp, path.join(destDir, name + '.glb'));
      emit(pack.cat, pack.slug, name, path.join(destDir, name + '.glb'), { type: 'glb', tex: 0 });
      count++;
    } finally {
      fs.rmSync(tmp, { force: true });
    }
  }
  report.push([pack.dir, pack.cat + '/' + pack.slug, `convert(tex:${embTotal})`, count]);
}

// write index
const indexPath = path.join(OUT, 'asset-index-v2.json');
fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

// console report
console.log('\n──────── ASSET ORGANIZATION REPORT ────────');
console.log('pack'.padEnd(42), 'target'.padEnd(26), 'mode'.padEnd(18), 'count');
let total = 0;
for (const [p, t, m, c] of report) { console.log(String(p).slice(0, 41).padEnd(42), String(t).padEnd(26), String(m).padEnd(18), c); total += c; }
console.log('───────────────────────────────────────────');
console.log('TOTAL models organized:', total);
console.log('index:', path.relative(ROOT, indexPath));
