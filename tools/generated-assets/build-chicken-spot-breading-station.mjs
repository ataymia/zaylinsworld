// Original ZTA Starter Town asset generator.
// Approved asset 002: Chicken Spot breading and prep station.
// Run: node tools/generated-assets/build-chicken-spot-breading-station.mjs

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  Model, pbr, transform, writeGLB,
  boxGeo, cylGeo, sphereGeo,
} from '../glb.mjs';

const D2R = Math.PI / 180;
const OUT_DIR = 'public/assets/models/props/starter-town/chicken-spot';
const ASSET_ID = 'prop_chicken_spot_breading_prep_station_v01';
const OUT_PATH = `${OUT_DIR}/${ASSET_ID}.glb`;
const META_PATH = `${OUT_DIR}/${ASSET_ID}.meta.json`;
const INDEX_PATH = 'public/assets/models/asset-index-v2.json';

function buildBreadingPrepStation() {
  const m = new Model();

  const steel = m.material(pbr('#949fa8', { metal: 0.92, rough: 0.26 }));
  const polished = m.material(pbr('#d1d9df', { metal: 0.96, rough: 0.18 }));
  const darkSteel = m.material(pbr('#333d47', { metal: 0.82, rough: 0.34 }));
  const black = m.material(pbr('#07090b', { rough: 0.82 }));
  const red = m.material(pbr('#a60e09', { metal: 0.12, rough: 0.38 }));
  const flour = m.material(pbr('#d4ba85', { rough: 0.92 }));
  const crumbs = m.material(pbr('#9e591f', { rough: 0.92 }));
  const spice = m.material(pbr('#8c240e', { rough: 0.90 }));
  const chicken = m.material(pbr('#ba6330', { rough: 0.78 }));
  const blue = m.material(pbr('#216da6', { rough: 0.58 }));
  const green = m.material(pbr('#08d12f', { rough: 0.24, emissive: '#00590d', emissiveStrength: 0.5 }));
  const white = m.material(pbr('#e8eae4', { rough: 0.72 }));
  const yellow = m.material(pbr('#f09b14', { rough: 0.44 }));
  const clear = m.material(pbr('#a3c7db', { rough: 0.12, alpha: 0.35, double: true }));

  const box = (w, h, d, mat, t, r = [0, 0, 0]) =>
    m.add(boxGeo(w, h, d), mat, transform({ t, r }));
  const cyl = (radius, height, mat, t, r = [0, 0, 0], seg = 16) =>
    m.add(cylGeo(radius, radius, height, seg), mat, transform({ t, r }));
  const sphere = (radius, mat, t, s = [1, 1, 1], r = [0, 0, 0]) =>
    m.add(sphereGeo(radius, 10, 7), mat, transform({ t, s, r }));

  // Commercial refrigerated cabinet, front faces +Z.
  box(1.45, 0.78, 0.72, steel, [0, 0.42, 0]);
  box(1.33, 0.64, 0.018, darkSteel, [0, 0.43, 0.368]);
  box(1.52, 0.09, 0.80, polished, [0, 0.84, 0]);
  box(1.52, 0.42, 0.055, steel, [0, 1.04, -0.375]);
  box(1.56, 0.04, 0.08, polished, [0, 1.265, -0.375]);

  // Storage doors and center drawer.
  for (const x of [-0.44, 0.44]) {
    box(0.55, 0.57, 0.025, steel, [x, 0.43, 0.381]);
    cyl(0.012, 0.28, black, [x, 0.58, 0.413], [0, 0, 90 * D2R], 12);
  }
  box(0.26, 0.22, 0.025, polished, [0, 0.58, 0.386]);
  cyl(0.010, 0.15, black, [0, 0.58, 0.416], [0, 0, 90 * D2R], 12);
  box(1.32, 0.14, 0.03, darkSteel, [0, 0.105, 0.365]);

  // Three recessed breading wells.
  const wells = [
    { x: -0.47, fill: flour },
    { x: 0, fill: spice },
    { x: 0.47, fill: crumbs },
  ];
  for (const { x, fill } of wells) {
    box(0.39, 0.055, 0.48, darkSteel, [x, 0.905, 0.015]);
    box(0.335, 0.06, 0.415, polished, [x, 0.925, 0.015]);
    box(0.29, 0.018, 0.36, fill, [x, 0.958, 0.015]);
  }

  // Raised transparent lids on the outer wells.
  for (const x of [-0.47, 0.47]) {
    box(0.37, 0.025, 0.43, clear, [x, 1.145, -0.175], [-58 * D2R, 0, 0]);
    cyl(0.014, 0.32, darkSteel, [x, 1.005, -0.31], [0, 0, 90 * D2R], 12);
  }

  // Draining tray with perforations and prepared chicken portions.
  box(0.30, 0.045, 0.17, darkSteel, [0.55, 0.925, 0.29]);
  box(0.26, 0.020, 0.135, polished, [0.55, 0.947, 0.29]);
  for (let ix = 0; ix < 5; ix++) {
    for (let iz = 0; iz < 2; iz++) {
      cyl(0.008, 0.008, black, [0.46 + ix * 0.045, 0.961, 0.265 + iz * 0.05], [], 10);
    }
  }
  const chickenPieces = [
    [0.48, 0.995, 0.275, 0.04],
    [0.54, 0.995, 0.305, -0.08],
    [0.60, 0.995, 0.265, 0.10],
    [0.65, 0.995, 0.310, -0.02],
  ];
  for (const [x, y, z, rot] of chickenPieces) {
    sphere(0.045, chicken, [x, y, z], [1.45, 0.75, 0.85], [0, rot, 0]);
  }

  // Upper shelf and brackets.
  box(1.30, 0.055, 0.28, polished, [0, 1.31, -0.23]);
  for (const x of [-0.58, 0.58]) {
    box(0.045, 0.30, 0.045, darkSteel, [x, 1.16, -0.33]);
    box(0.045, 0.045, 0.22, darkSteel, [x, 1.19, -0.22]);
  }

  // Ingredient tubs, lids and labels.
  const tubs = [
    [-0.44, flour],
    [-0.16, spice],
    [0.13, crumbs],
    [0.42, yellow],
  ];
  for (const [x, material] of tubs) {
    cyl(0.095, 0.18, material, [x, 1.415, -0.23], [], 20);
    cyl(0.102, 0.025, black, [x, 1.512, -0.23], [], 20);
    box(0.12, 0.07, 0.010, white, [x, 1.42, -0.133]);
  }

  // Gloves, paper towel and sanitizer.
  box(0.30, 0.16, 0.045, blue, [-0.55, 1.12, -0.335]);
  box(0.18, 0.035, 0.012, black, [-0.55, 1.12, -0.307]);
  box(0.22, 0.10, 0.045, darkSteel, [0.46, 1.12, -0.335]);
  cyl(0.07, 0.20, white, [0.46, 1.12, -0.255], [0, 0, 90 * D2R], 20);
  cyl(0.018, 0.25, black, [0.46, 1.12, -0.255], [0, 0, 90 * D2R], 14);
  cyl(0.035, 0.13, red, [0.68, 1.06, -0.23], [], 16);
  box(0.08, 0.025, 0.025, black, [0.68, 1.135, -0.23]);

  // Portion scale, tongs and scoop.
  box(0.26, 0.055, 0.18, black, [-0.12, 1.005, 0.27]);
  box(0.22, 0.025, 0.15, polished, [-0.12, 1.045, 0.27]);
  box(0.09, 0.045, 0.015, green, [-0.12, 1.01, 0.365]);
  cyl(0.009, 0.21, darkSteel, [0.195, 1.028, 0.30], [65 * D2R, 0, -70 * D2R], 10);
  cyl(0.009, 0.21, darkSteel, [0.215, 1.028, 0.27], [65 * D2R, 0, -70 * D2R], 10);
  box(0.16, 0.035, 0.10, polished, [-0.35, 1.015, 0.28], [0, 12 * D2R, 0]);
  cyl(0.012, 0.20, black, [-0.21, 1.045, 0.30], [65 * D2R, 0, -70 * D2R], 12);

  // Side flour catch bin and adjustable feet.
  box(0.18, 0.42, 0.36, red, [-0.83, 0.48, 0.10]);
  box(0.20, 0.045, 0.38, black, [-0.83, 0.705, 0.10]);
  for (const x of [-0.62, 0.62]) {
    for (const z of [-0.25, 0.25]) cyl(0.035, 0.07, black, [x, 0.035, z], [], 14);
  }

  return m;
}

function registerAsset(relativePath) {
  const index = JSON.parse(readFileSync(INDEX_PATH, 'utf8'));
  index.props ??= {};
  const pack = 'starter-town-chicken-spot';
  index.props[pack] ??= [];
  const entry = { name: ASSET_ID, path: relativePath, type: 'glb', tex: 0 };
  const existing = index.props[pack].findIndex((item) => item.name === ASSET_ID);
  if (existing >= 0) index.props[pack][existing] = entry;
  else index.props[pack].push(entry);
  index.props[pack].sort((a, b) => a.name.localeCompare(b.name));
  writeFileSync(INDEX_PATH, `${JSON.stringify(index, null, 2)}\n`);
}

mkdirSync(dirname(OUT_PATH), { recursive: true });
const bytes = writeGLB(buildBreadingPrepStation(), OUT_PATH, { name: ASSET_ID });

const metadata = {
  asset_id: ASSET_ID,
  display_name: 'Chicken Spot Breading & Prep Station',
  town: 'Starter Town',
  district: 'Dreamdrop District',
  location: 'Chicken Spot kitchen',
  category: 'prop',
  units: 'meters',
  up_axis: 'Y',
  forward_axis: '+Z',
  dimensions_m: { width: 1.76, depth: 0.86, height: 1.524 },
  pivot: 'ground-center',
  triangle_target: 'approximately 3k or lower',
  collision_plan: 'cabinet box plus countertop; lids and utensils non-colliding',
  interaction_nodes: ['breading wells', 'portion scale', 'tongs', 'ingredient lids', 'sanitation supplies'],
  approval_status: 'APPROVED',
  approved_in_chat: '2026-07-17',
  generated_bytes: bytes,
  license: 'Original ZTA geometry',
};
writeFileSync(META_PATH, `${JSON.stringify(metadata, null, 2)}\n`);
registerAsset(`models/props/starter-town/chicken-spot/${ASSET_ID}.glb`);

console.log(`[starter-assets] generated ${OUT_PATH} (${(bytes / 1024).toFixed(1)} KB)`);
console.log('[starter-assets] indexed under props/starter-town-chicken-spot');