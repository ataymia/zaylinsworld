// Original ZTA Starter Town asset generator.
// Approved asset 003: Chicken Spot heated holding station.
// Run: node tools/generated-assets/build-chicken-spot-heated-holding-station.mjs

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  Model, pbr, transform, writeGLB,
  boxGeo, cylGeo, sphereGeo,
} from '../glb.mjs';

const D2R = Math.PI / 180;
const OUT_DIR = 'public/assets/models/props/starter-town/chicken-spot';
const ASSET_ID = 'prop_chicken_spot_heated_holding_station_v01';
const OUT_PATH = `${OUT_DIR}/${ASSET_ID}.glb`;
const META_PATH = `${OUT_DIR}/${ASSET_ID}.meta.json`;
const INDEX_PATH = 'public/assets/models/asset-index-v2.json';

function buildHeatedHoldingStation() {
  const m = new Model();

  const steel = m.material(pbr('#949fa8', { metal: 0.92, rough: 0.25 }));
  const polished = m.material(pbr('#d4dbe0', { metal: 0.96, rough: 0.17 }));
  const darkSteel = m.material(pbr('#2e3842', { metal: 0.84, rough: 0.32 }));
  const black = m.material(pbr('#050607', { rough: 0.82 }));
  const glass = m.material(pbr('#99c2d6', { rough: 0.08, alpha: 0.26, double: true }));
  const red = m.material(pbr('#ab0b07', { metal: 0.1, rough: 0.36 }));
  const gold = m.material(pbr('#f29712', { metal: 0.05, rough: 0.32 }));
  const heat = m.material(pbr('#ff5c0d', { rough: 0.18, emissive: '#941300', emissiveStrength: 0.6 }));
  const screen = m.material(pbr('#0dc738', { rough: 0.18, emissive: '#00570d', emissiveStrength: 0.5 }));
  const chicken = m.material(pbr('#9e4a16', { rough: 0.82 }));
  const darkChicken = m.material(pbr('#61260a', { rough: 0.88 }));
  const paper = m.material(pbr('#e0d6b5', { rough: 0.86 }));
  const white = m.material(pbr('#eaece6', { rough: 0.68 }));

  const box = (w, h, d, mat, t, r = [0, 0, 0]) =>
    m.add(boxGeo(w, h, d), mat, transform({ t, r }));
  const cyl = (radius, height, mat, t, r = [0, 0, 0], seg = 16) =>
    m.add(cylGeo(radius, radius, height, seg), mat, transform({ t, r }));
  const sphere = (radius, mat, t, s = [1, 1, 1], r = [0, 0, 0]) =>
    m.add(sphereGeo(radius, 10, 7), mat, transform({ t, s, r }));

  // Lower cabinet and pass-through storage. Front faces +Z.
  box(1.38, 0.80, 0.68, steel, [0, 0.43, 0]);
  box(1.26, 0.65, 0.022, darkSteel, [0, 0.44, 0.348]);
  box(1.44, 0.09, 0.72, polished, [0, 0.855, 0]);
  box(0.92, 0.42, 0.030, black, [0, 0.43, 0.362]);
  box(0.88, 0.05, 0.50, polished, [0, 0.32, 0.08]);
  box(0.88, 0.45, 0.035, darkSteel, [0, 0.43, -0.25]);

  for (const x of [-0.53, 0.53]) {
    box(0.18, 0.55, 0.024, steel, [x, 0.43, 0.366]);
    cyl(0.010, 0.18, black, [x, 0.57, 0.397], [], 12);
  }

  // Heated display frame.
  for (const [x, z] of [[-0.66,-0.26],[0.66,-0.26],[-0.66,0.28],[0.66,0.28]]) {
    box(0.07, 0.82, 0.08, darkSteel, [x, 1.29, z]);
  }
  box(1.44, 0.12, 0.70, red, [0, 1.70, 0.01]);
  box(1.48, 0.035, 0.74, gold, [0, 1.77, 0.01]);
  box(1.38, 0.08, 0.66, darkSteel, [0, 0.95, 0.01]);

  // Sliding front glass, side glass and rear glass.
  box(0.62, 0.68, 0.018, glass, [-0.325, 1.31, 0.305]);
  box(0.62, 0.68, 0.018, glass, [0.325, 1.31, 0.315]);
  box(0.018, 0.68, 0.54, glass, [-0.695, 1.31, 0.01]);
  box(0.018, 0.68, 0.54, glass, [0.695, 1.31, 0.01]);
  box(1.24, 0.68, 0.018, glass, [0, 1.31, -0.305]);
  box(1.28, 0.035, 0.04, polished, [0, 1.64, 0.323]);
  box(1.28, 0.035, 0.04, polished, [0, 0.99, 0.323]);
  cyl(0.012, 0.26, black, [-0.08, 1.32, 0.346], [], 12);
  cyl(0.012, 0.26, black, [0.08, 1.32, 0.356], [], 12);

  // Internal shelves and ribs.
  for (const y of [1.12, 1.40]) {
    box(1.20, 0.045, 0.54, polished, [0, y, 0]);
    for (let i = 0; i < 6; i++) {
      const z = -0.21 + i * 0.084;
      cyl(0.006, 1.08, darkSteel, [0, y + 0.026, z], [0, 0, 90 * D2R], 10);
    }
  }

  // Four food trays with fried chicken portions.
  const trays = [
    [-0.32, 1.16, 'wings'], [0.32, 1.16, 'tenders'],
    [-0.32, 1.44, 'legs'], [0.32, 1.44, 'mixed'],
  ];
  const offsets = [
    [-0.13,-0.10,0.16], [0,-0.11,-0.12], [0.13,-0.09,0.08],
    [-0.07,0.03,-0.04], [0.09,0.05,0.15], [0,0.10,-0.18],
  ];
  for (const [x, y, label] of trays) {
    box(0.48, 0.055, 0.40, darkSteel, [x, y, -0.02]);
    box(0.43, 0.012, 0.35, paper, [x, y + 0.032, -0.02]);
    offsets.forEach(([ox, oz, rot], index) => {
      const sx = label === 'tenders' || label === 'mixed' ? 1.5 : 1.15;
      const sz = label === 'wings' ? 0.78 : 0.95;
      sphere(0.052, index % 2 ? darkChicken : chicken, [x + ox, y + 0.065, -0.02 + oz], [sx, 0.72, sz], [0, rot, 0]);
    });
  }

  // Three overhead heat lamps and shades.
  for (const x of [-0.38, 0, 0.38]) {
    cyl(0.075, 0.045, darkSteel, [x, 1.625, 0], [], 20);
    cyl(0.065, 0.035, heat, [x, 1.585, 0], [], 20);
    cyl(0.11, 0.10, darkSteel, [x, 1.50, 0], [], 24);
  }

  // Control cluster, branding and tray labels.
  box(0.32, 0.16, 0.08, darkSteel, [0.52, 0.89, 0.27]);
  box(0.11, 0.06, 0.012, screen, [0.46, 0.90, 0.318]);
  cyl(0.028, 0.025, black, [0.60, 0.90, 0.323], [90 * D2R, 0, 0], 18);
  cyl(0.016, 0.020, heat, [0.66, 0.90, 0.323], [90 * D2R, 0, 0], 14);
  box(0.42, 0.08, 0.018, gold, [0, 1.705, 0.366]);
  for (const x of [-0.48, -0.16, 0.16, 0.48]) box(0.10, 0.034, 0.010, white, [x, 1.675, 0.374]);

  // Serving ledge, crumb drawer, hanging tongs.
  box(1.18, 0.06, 0.18, polished, [0, 0.90, 0.40]);
  box(0.66, 0.11, 0.025, steel, [0, 0.78, 0.365]);
  cyl(0.010, 0.24, black, [0, 0.78, 0.392], [0, 0, 90 * D2R], 12);
  for (const y of [1.22, 1.34]) cyl(0.009, 0.07, darkSteel, [0.755, y, 0.18], [0, 0, 90 * D2R], 10);
  cyl(0.008, 0.12, polished, [0.77, 1.13, 0.185], [], 10);
  cyl(0.008, 0.12, polished, [0.80, 1.13, 0.185], [], 10);

  // Four casters.
  for (const x of [-0.56, 0.56]) {
    for (const z of [-0.23, 0.23]) {
      box(0.08, 0.10, 0.05, darkSteel, [x, 0.095, z]);
      cyl(0.048, 0.045, black, [x, 0.045, z], [0, 0, 90 * D2R], 18);
    }
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
const bytes = writeGLB(buildHeatedHoldingStation(), OUT_PATH, { name: ASSET_ID });

const metadata = {
  asset_id: ASSET_ID,
  display_name: 'Chicken Spot Heated Holding Station',
  town: 'Starter Town',
  district: 'Dreamdrop District',
  location: 'Chicken Spot kitchen/service line',
  category: 'prop',
  units: 'meters',
  up_axis: 'Y',
  forward_axis: '+Z',
  dimensions_m: { width: 1.48, depth: 0.76, height: 1.79 },
  pivot: 'ground-center',
  triangle_target: 'approximately 4.5k or lower',
  collision_plan: 'base cabinet and display frame only; glass, trays, food and utensils non-colliding',
  interaction_nodes: ['sliding doors', 'four food trays', 'serving tongs', 'temperature controls', 'restock and cleaning points'],
  approval_status: 'APPROVED',
  approved_in_chat: '2026-07-17',
  generated_bytes: bytes,
  license: 'Original ZTA geometry',
};
writeFileSync(META_PATH, `${JSON.stringify(metadata, null, 2)}\n`);
registerAsset(`models/props/starter-town/chicken-spot/${ASSET_ID}.glb`);

console.log(`[starter-assets] generated ${OUT_PATH} (${(bytes / 1024).toFixed(1)} KB)`);
console.log('[starter-assets] indexed under props/starter-town-chicken-spot');