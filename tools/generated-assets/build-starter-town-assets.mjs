// Original ZTA Starter Town asset generator.
// Approved asset 001: Chicken Spot double deep fryer.
// Run: node tools/generated-assets/build-starter-town-assets.mjs

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  Model, pbr, transform, writeGLB,
  boxGeo, cylGeo,
} from '../glb.mjs';

const D2R = Math.PI / 180;
const OUT_DIR = 'public/assets/models/props/starter-town/chicken-spot';
const ASSET_ID = 'prop_chicken_spot_deep_fryer_double_v01';
const OUT_PATH = `${OUT_DIR}/${ASSET_ID}.glb`;
const META_PATH = `${OUT_DIR}/${ASSET_ID}.meta.json`;
const INDEX_PATH = 'public/assets/models/asset-index-v2.json';

function buildDoubleDeepFryer() {
  const m = new Model();

  const steel = m.material(pbr('#9fa8ae', { metal: 0.92, rough: 0.24 }));
  const darkSteel = m.material(pbr('#3b444b', { metal: 0.86, rough: 0.32 }));
  const polished = m.material(pbr('#d2d9de', { metal: 0.96, rough: 0.18 }));
  const black = m.material(pbr('#0b0e11', { metal: 0.35, rough: 0.42 }));
  const rubber = m.material(pbr('#050608', { rough: 0.82 }));
  const oil = m.material(pbr('#d77a14', { rough: 0.2, alpha: 0.82 }));
  const red = m.material(pbr('#db0906', { rough: 0.24, emissive: '#730000', emissiveStrength: 0.45 }));
  const green = m.material(pbr('#0bb82b', { rough: 0.22, emissive: '#00570c', emissiveStrength: 0.45 }));
  const amber = m.material(pbr('#f58f0a', { rough: 0.36 }));
  const white = m.material(pbr('#eceeea', { rough: 0.55 }));

  const box = (w, h, d, mat, t, r = [0, 0, 0]) =>
    m.add(boxGeo(w, h, d), mat, transform({ t, r }));
  const cyl = (radius, height, mat, t, r = [0, 0, 0], seg = 16) =>
    m.add(cylGeo(radius, radius, height, seg), mat, transform({ t, r }));

  // Main commercial cabinet, front faces +Z.
  box(1.18, 0.72, 0.70, steel, [0, 0.39, 0.02]);
  box(1.06, 0.58, 0.018, darkSteel, [0, 0.43, 0.376]);
  box(1.22, 0.09, 0.78, polished, [0, 0.775, -0.01]);
  box(1.20, 0.36, 0.08, steel, [0, 0.98, -0.35]);
  box(1.22, 0.045, 0.10, polished, [0, 1.175, -0.35]);
  box(1.22, 0.055, 0.045, darkSteel, [0, 0.804, 0.382]);

  // Cabinet doors and hardware.
  for (const x of [-0.30, 0.30]) {
    box(0.52, 0.54, 0.020, steel, [x, 0.42, 0.389]);
    box(0.48, 0.018, 0.016, polished, [x, 0.68, 0.404]);
    cyl(0.012, 0.24, black, [x, 0.54, 0.419], [0, 0, 90 * D2R], 12);
  }
  box(1.11, 0.12, 0.03, darkSteel, [0, 0.09, 0.375]);
  box(0.50, 0.12, 0.025, steel, [0, 0.20, 0.402]);
  cyl(0.010, 0.20, black, [0, 0.20, 0.425], [0, 0, 90 * D2R], 12);

  // Twin vats and removable baskets.
  const vatCenters = [-0.30, 0.30];
  vatCenters.forEach((x, vatIndex) => {
    box(0.50, 0.055, 0.54, darkSteel, [x, 0.837, -0.005]);
    box(0.405, 0.045, 0.435, black, [x, 0.862, -0.005]);
    box(0.36, 0.012, 0.39, oil, [x, 0.888, -0.005]);

    const left = x - 0.17;
    const right = x + 0.17;
    const front = 0.17;
    const rear = -0.16;
    const top = 0.965;

    // Basket upper rim.
    cyl(0.007, right - left, polished, [x, top, front], [0, 0, 90 * D2R], 10);
    cyl(0.007, right - left, polished, [x, top, rear], [0, 0, 90 * D2R], 10);
    cyl(0.007, front - rear, polished, [left, top, (front + rear) / 2], [90 * D2R, 0, 0], 10);
    cyl(0.007, front - rear, polished, [right, top, (front + rear) / 2], [90 * D2R, 0, 0], 10);

    // Basket wire grid. Slightly simplified but keeps the approved silhouette.
    for (let i = 0; i < 6; i++) {
      const gx = left + 0.03 + i * ((right - left - 0.06) / 5);
      cyl(0.004, 0.30, polished, [gx, 0.932, 0.005], [90 * D2R, 0, 0], 8);
    }
    for (let i = 0; i < 6; i++) {
      const gz = rear + 0.03 + i * ((front - rear - 0.06) / 5);
      cyl(0.004, 0.28, polished, [x, 0.932, gz], [0, 0, 90 * D2R], 8);
    }

    // Double-rail handle and black grip.
    cyl(0.010, 0.43, polished, [x - 0.035, 0.985, 0.365], [90 * D2R, 0, 0], 12);
    cyl(0.010, 0.43, polished, [x + 0.035, 0.985, 0.365], [90 * D2R, 0, 0], 12);
    cyl(0.025, 0.18, black, [x, 1.00, 0.63], [0, 0, 90 * D2R], 16);

    // Independent control cluster.
    cyl(0.062, 0.024, polished, [x, 1.055, -0.257], [90 * D2R, 0, 0], 24);
    cyl(0.043, 0.036, black, [x, 1.055, -0.238], [90 * D2R, 0, 0], 20);
    box(0.010, 0.042, 0.012, white, [x + 0.022, 1.085, -0.217]);
    cyl(0.018, 0.020, red, [x - 0.10, 0.995, -0.236], [90 * D2R, 0, 0], 16);
    cyl(0.018, 0.020, green, [x + 0.10, 0.995, -0.236], [90 * D2R, 0, 0], 16);
    box(0.12, 0.025, 0.010, white, [x, 0.970, -0.224]);

    // Front drain valve.
    cyl(0.038, 0.05, polished, [x, 0.34, 0.425], [90 * D2R, 0, 0], 18);
    cyl(0.010, 0.10, black, [x + 0.045, 0.38, 0.455], [0, 0, 65 * D2R], 12);
  });

  box(1.10, 0.22, 0.055, darkSteel, [0, 1.035, -0.292]);
  box(0.17, 0.055, 0.012, white, [0, 1.10, -0.223]);
  box(0.22, 0.07, 0.012, amber, [0, 0.72, 0.398]);

  // Side ventilation slots.
  for (const x of [-0.598, 0.598]) {
    for (let i = 0; i < 6; i++) {
      box(0.012, 0.018, 0.30, darkSteel, [x, 0.42 + i * 0.045, -0.10]);
    }
  }

  // Four caster assemblies.
  for (const x of [-0.47, 0.47]) {
    for (const z of [-0.24, 0.24]) {
      box(0.08, 0.12, 0.05, darkSteel, [x, 0.105, z]);
      cyl(0.055, 0.045, rubber, [x, 0.055, z], [0, 0, 90 * D2R], 18);
    }
  }

  // Rear exhaust and service line.
  box(0.34, 0.22, 0.16, steel, [0, 1.30, -0.355]);
  box(0.40, 0.045, 0.20, darkSteel, [0, 1.425, -0.355]);
  cyl(0.015, 0.41, darkSteel, [-0.42, 0.355, -0.38], [0, 0, 0], 12);
  cyl(0.045, 0.06, darkSteel, [-0.42, 0.61, -0.38], [0, 0, 0], 16);

  return m;
}

function registerAsset(relativePath) {
  const index = JSON.parse(readFileSync(INDEX_PATH, 'utf8'));
  index.props ??= {};
  const pack = 'starter-town-chicken-spot';
  index.props[pack] ??= [];
  const entry = {
    name: ASSET_ID,
    path: relativePath,
    type: 'glb',
    tex: 0,
  };
  const existing = index.props[pack].findIndex((item) => item.name === ASSET_ID);
  if (existing >= 0) index.props[pack][existing] = entry;
  else index.props[pack].push(entry);
  index.props[pack].sort((a, b) => a.name.localeCompare(b.name));
  writeFileSync(INDEX_PATH, `${JSON.stringify(index, null, 2)}\n`);
}

mkdirSync(dirname(OUT_PATH), { recursive: true });
const bytes = writeGLB(buildDoubleDeepFryer(), OUT_PATH, { name: ASSET_ID });

const metadata = {
  asset_id: ASSET_ID,
  display_name: 'Chicken Spot Double Deep Fryer',
  town: 'Starter Town',
  district: 'Dreamdrop District',
  location: 'Chicken Spot kitchen',
  category: 'prop',
  units: 'meters',
  up_axis: 'Y',
  forward_axis: '+Z',
  dimensions_m: { width: 1.22, depth: 0.78, height: 1.448 },
  pivot: 'ground-center',
  triangle_target: 'approximately 4k or lower',
  collision_plan: 'simple cabinet box plus top slab; baskets non-colliding',
  interaction_nodes: ['left basket', 'right basket', 'indicator lights', 'oil surface'],
  approval_status: 'APPROVED',
  approved_in_chat: '2026-07-17',
  generated_bytes: bytes,
  license: 'Original ZTA geometry',
};
writeFileSync(META_PATH, `${JSON.stringify(metadata, null, 2)}\n`);
registerAsset(`models/props/starter-town/chicken-spot/${ASSET_ID}.glb`);

console.log(`[starter-assets] generated ${OUT_PATH} (${(bytes / 1024).toFixed(1)} KB)`);
console.log(`[starter-assets] indexed under props/starter-town-chicken-spot`);
