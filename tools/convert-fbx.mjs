// ───────────────────────────────────────────────────────────────────────────
//  convert-fbx.mjs — convert uploaded FBX/OBJ asset packs into GLB using the
//  system `assimp` CLI, then drop them into public/assets/models/<dest>/ with
//  clean kebab-case names so they can be registered in asset-index-v2.json.
//
//  Run:  node tools/convert-fbx.mjs
//
//  Why: several uploaded packs (the Max weapon packs, etc.) ship ONLY as FBX,
//  which the in-game three.js GLTFLoader cannot read. assimp preserves the
//  per-material base colors (metal/wood) so the converted GLB looks correct even
//  without separate texture maps. Conversion is idempotent + logged.
// ───────────────────────────────────────────────────────────────────────────
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

const ROOT = process.cwd();
const STAGING = join(ROOT, '.staging');
const OUT_ROOT = join(ROOT, 'public/assets/models');

// kebab-case a raw FBX basename (strip the trailing "fbx" some files carry).
function clean(name) {
  return name
    .replace(/\.fbx$/i, '')
    .replace(/fbx$/i, '')
    .replace(/[_\s]+/g, '-')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

// Each job: a source directory of FBX files → a destination pack folder. Only
// files matching `include` (if given) are converted.
const JOBS = [
  // ── Max weapon pack: real named guns + melee for Block Supply ──
  { src: '.staging/MaxWp/Wp-Pack/3Dmodels/Fbx/Pistols',   dest: 'weapons/maxwp', prefix: '' },
  { src: '.staging/MaxWp/Wp-Pack/3Dmodels/Fbx/Rifles',    dest: 'weapons/maxwp', prefix: '' },
  { src: '.staging/MaxWp/Wp-Pack/3Dmodels/Fbx/Shotgun',   dest: 'weapons/maxwp', prefix: '' },
  { src: '.staging/MaxWp/Wp-Pack/3Dmodels/Fbx/SMG',       dest: 'weapons/maxwp', prefix: '' },
  { src: '.staging/MaxWp/Wp-Pack/3Dmodels/Fbx/Melees',    dest: 'weapons/maxwp', prefix: 'melee-' },
  { src: '.staging/MaxWp/Wp-Pack/3Dmodels/Fbx/Specials',  dest: 'weapons/maxwp', prefix: '' },
];

let converted = 0, skipped = 0, failed = 0;
const made = [];

for (const job of JOBS) {
  const srcDir = join(ROOT, job.src);
  if (!existsSync(srcDir)) { console.warn('[convert] missing src:', job.src); continue; }
  const outDir = join(OUT_ROOT, job.dest);
  mkdirSync(outDir, { recursive: true });
  for (const f of readdirSync(srcDir)) {
    if (!/\.fbx$/i.test(f)) continue;
    const srcFile = join(srcDir, f);
    if (!statSync(srcFile).isFile()) continue;
    const outName = job.prefix + clean(f) + '.glb';
    const outFile = join(outDir, outName);
    if (existsSync(outFile)) { skipped++; made.push(`${job.dest}/${outName}`); continue; }
    try {
      execFileSync('assimp', ['export', srcFile, outFile], { stdio: 'pipe' });
      converted++; made.push(`${job.dest}/${outName}`);
      console.log('[convert]', job.dest + '/' + outName);
    } catch (e) {
      failed++;
      console.warn('[convert] FAILED', f, '-', (e && e.message || e).toString().split('\n')[0]);
    }
  }
}

console.log(`\n[convert] done — ${converted} converted, ${skipped} already present, ${failed} failed`);
console.log('[convert] files:\n  ' + made.sort().join('\n  '));
