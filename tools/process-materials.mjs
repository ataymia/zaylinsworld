// tools/process-materials.mjs — downscale ambientCG-style PBR sets to web-friendly
// 1K maps with clean names, for jewelry/chain material generation (CC0).
//   source: vendor/source-textures/<Pack>/  →  public/assets/textures/materials/<id>/
// Uses three.js naming: color, roughness, metalness, normal (GL convention), height.
import sharp from 'sharp';
import { mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const SRC = 'vendor/source-textures';
const OUT = 'public/assets/textures/materials';
const SIZE = 1024;

// pack folder → { id, label }
const PACKS = {
  'Metal007_2K-PNG':  { id: 'metal_brushed', label: 'Metal007 (brushed)' },
  'Metal048A_4K-PNG': { id: 'metal_gold',    label: 'Metal048A' },
  'Metal049A_2K-PNG': { id: 'metal_silver',  label: 'Metal049A' },
  'Marble021_4K-PNG': { id: 'marble_white',  label: 'Marble021' },
};

// suffix in source filename → output map name (three.js MeshStandardMaterial slots)
const MAPS = [
  { match: /_Color\./i,        out: 'color',     srgb: true  },
  { match: /_Roughness\./i,    out: 'roughness', srgb: false },
  { match: /_Metalness\./i,    out: 'metalness', srgb: false },
  { match: /_NormalGL\./i,     out: 'normal',    srgb: false },
  { match: /_Displacement\./i, out: 'height',    srgb: false },
];

async function run() {
  for (const [folder, { id, label }] of Object.entries(PACKS)) {
    const srcDir = path.join(SRC, folder);
    if (!existsSync(srcDir)) { console.warn('skip (missing):', srcDir); continue; }
    const outDir = path.join(OUT, id);
    await mkdir(outDir, { recursive: true });
    const files = await readdir(srcDir);
    let n = 0;
    for (const { match, out } of MAPS) {
      const file = files.find((f) => match.test(f));
      if (!file) continue;
      const dest = path.join(outDir, out + '.png');
      await sharp(path.join(srcDir, file))
        .resize(SIZE, SIZE, { fit: 'fill' })
        .png({ compressionLevel: 9, palette: out !== 'color' && out !== 'normal' })
        .toFile(dest);
      n++;
    }
    console.log(`${label} → ${id}/  (${n} maps @ ${SIZE}px)`);
  }
}
run().catch((e) => { console.error(e); process.exit(1); });
