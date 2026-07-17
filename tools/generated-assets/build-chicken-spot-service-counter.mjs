// Original ZTA Starter Town asset generator.
// Approved asset 004: Chicken Spot service counter and POS.
// Run: node tools/generated-assets/build-chicken-spot-service-counter.mjs

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  Model, pbr, transform, writeGLB,
  boxGeo, cylGeo, sphereGeo,
} from '../glb.mjs';

const D2R = Math.PI / 180;
const OUT_DIR = 'public/assets/models/props/starter-town/chicken-spot';
const ASSET_ID = 'prop_chicken_spot_service_counter_pos_v01';
const OUT_PATH = `${OUT_DIR}/${ASSET_ID}.glb`;
const META_PATH = `${OUT_DIR}/${ASSET_ID}.meta.json`;
const INDEX_PATH = 'public/assets/models/asset-index-v2.json';

function buildServiceCounter() {
  const m = new Model();
  const red = m.material(pbr('#a90c07', { metal: 0.08, rough: 0.36 }));
  const redDark = m.material(pbr('#4f0505', { metal: 0.06, rough: 0.48 }));
  const gold = m.material(pbr('#f39914', { metal: 0.12, rough: 0.30 }));
  const steel = m.material(pbr('#99a6b0', { metal: 0.91, rough: 0.24 }));
  const polished = m.material(pbr('#d6dde3', { metal: 0.96, rough: 0.16 }));
  const charcoal = m.material(pbr('#111419', { metal: 0.34, rough: 0.34 }));
  const black = m.material(pbr('#050608', { rough: 0.82 }));
  const blue = m.material(pbr('#1473c2', { rough: 0.18, emissive: '#052952', emissiveStrength: 0.4 }));
  const green = m.material(pbr('#0aca2e', { rough: 0.18, emissive: '#00520b', emissiveStrength: 0.4 }));
  const orange = m.material(pbr('#fa700d', { rough: 0.18, emissive: '#621500', emissiveStrength: 0.4 }));
  const paper = m.material(pbr('#edeFE9', { rough: 0.66 }));
  const kraft = m.material(pbr('#a16e38', { rough: 0.82 }));
  const glass = m.material(pbr('#a3ccdF', { rough: 0.08, alpha: 0.25, double: true }));

  const box = (w,h,d,mat,t,r=[0,0,0]) => m.add(boxGeo(w,h,d),mat,transform({t,r}));
  const cyl = (radius,height,mat,t,r=[0,0,0],seg=16) => m.add(cylGeo(radius,radius,height,seg),mat,transform({t,r}));
  const sphere = (radius,mat,t,s=[1,1,1]) => m.add(sphereGeo(radius,10,7),mat,transform({t,s}));

  box(2.28,0.82,0.76,redDark,[0,0.46,0]);
  box(2.16,0.68,0.035,red,[0,0.48,0.392]);
  box(2.35,0.10,0.86,charcoal,[0,0.91,0]);
  box(2.38,0.055,0.045,gold,[0,0.935,0.438]);
  box(2.38,0.055,0.045,polished,[0,0.935,-0.438]);

  for (const x of [-0.76,0,0.76]) {
    box(0.63,0.50,0.035,redDark,[x,0.49,0.420]);
    box(0.59,0.035,0.025,gold,[x,0.73,0.442]);
    box(0.59,0.035,0.025,gold,[x,0.25,0.442]);
    box(0.035,0.46,0.025,gold,[x-0.29,0.49,0.442]);
    box(0.035,0.46,0.025,gold,[x+0.29,0.49,0.442]);
  }

  for (const [side,x] of [[-1,-0.76],[1,0.76]]) {
    sphere(0.10,gold,[x-0.04*side,0.54,0.474],[1.25,0.9,0.45]);
    cyl(0.025,0.18,gold,[x+0.09*side,0.42,0.476],[0,0,35*side*D2R],14);
    sphere(0.035,gold,[x+0.14*side,0.35,0.477],[1,0.8,0.45]);
    sphere(0.035,gold,[x+0.10*side,0.34,0.477],[1,0.8,0.45]);
  }

  for (const x of [-0.78,-0.26,0.26,0.78]) {
    box(0.44,0.64,0.028,steel,[x,0.47,-0.394]);
    cyl(0.010,0.20,black,[x,0.64,-0.428],[0,0,90*D2R],12);
  }

  box(0.58,0.14,0.48,steel,[-0.70,1.02,-0.08]);
  box(0.42,0.34,0.10,charcoal,[-0.70,1.24,-0.16],[-10*D2R,0,0]);
  box(0.34,0.23,0.015,blue,[-0.70,1.25,-0.101],[-10*D2R,0,0]);
  box(0.24,0.05,0.18,black,[-0.70,1.07,-0.15]);
  box(0.48,0.12,0.34,charcoal,[-0.70,0.99,0.02]);
  box(0.26,0.025,0.012,black,[-0.70,1.015,0.195]);
  cyl(0.018,0.018,polished,[-0.51,1.015,0.196],[90*D2R,0,0],16);

  box(0.18,0.12,0.24,charcoal,[-0.32,1.03,0.10],[-12*D2R,0,0]);
  box(0.12,0.06,0.012,green,[-0.32,1.075,0.218],[-12*D2R,0,0]);
  for (let r=0;r<3;r++) for (let c=0;c<3;c++) cyl(0.009,0.008,paper,[-0.36+c*0.04,1.035-r*0.018,0.225+r*0.012],[90*D2R,0,0],10);

  box(0.24,0.16,0.25,charcoal,[-0.98,1.03,0.10]);
  box(0.14,0.018,0.012,black,[-0.98,1.085,0.228]);
  box(0.13,0.12,0.008,paper,[-0.98,1.13,0.245],[8*D2R,0,0]);

  box(0.07,0.48,0.07,charcoal,[0,1.18,-0.29]);
  box(0.52,0.22,0.09,charcoal,[0,1.42,-0.16]);
  box(0.20,0.12,0.012,orange,[-0.13,1.42,-0.109]);
  box(0.20,0.12,0.012,green,[0.13,1.42,-0.109]);
  for (const [i,x] of [-0.17,-0.09,0.09,0.17].entries()) box(0.035,0.055,0.006,paper,[x,1.42,-0.101]);

  box(0.66,0.16,0.58,steel,[0.71,1.02,0.0]);
  box(0.62,0.07,0.50,polished,[0.71,1.13,0.02]);
  box(0.62,0.38,0.018,glass,[0.71,1.36,0.27]);
  box(0.018,0.38,0.50,glass,[0.40,1.36,0.02]);
  box(0.018,0.38,0.50,glass,[1.02,1.36,0.02]);
  box(0.64,0.035,0.52,gold,[0.71,1.56,0.02]);

  for (const [i,z] of [-0.09,0.12].entries()) {
    box(0.50,0.035,0.16,red,[0.71,1.18,z]);
    box(0.44,0.008,0.13,paper,[0.71,1.201,z]);
    box(0.20,0.10,0.11,kraft,[0.62,1.25,z]);
    cyl(0.055,0.16,red,[0.86,1.27,z],[],18);
    cyl(0.060,0.018,black,[0.86,1.355,z],[],18);
    cyl(0.006,0.12,paper,[0.865,1.42,z],[],10);
  }

  box(0.48,0.44,0.18,charcoal,[0.52,0.63,-0.43]);
  for (const [i,x] of [0.39,0.52,0.65].entries()) {
    box(0.10,0.24,0.055,kraft,[x,0.70,-0.52]);
    cyl(0.006,0.06,kraft,[x-0.025,0.85,-0.525],[],8);
    cyl(0.006,0.06,kraft,[x+0.025,0.85,-0.525],[],8);
  }

  for (const [i,r] of [0.052,0.047,0.042].entries()) {
    cyl(r,0.12,paper,[1.02,1.03,-0.18+i*0.10],[],18);
    cyl(r+0.005,0.012,red,[1.02,1.095,-0.18+i*0.10],[],18);
  }

  cyl(0.022,2.10,polished,[0,0.83,0.53],[0,0,90*D2R],16);
  for (const x of [-1.05,-0.55,0,0.55,1.05]) cyl(0.014,0.09,polished,[x,0.83,0.485],[90*D2R,0,0],12);
  cyl(0.035,0.025,gold,[0.07,0.99,0.20],[90*D2R,0,0],18);
  cyl(0.045,0.025,polished,[0.28,0.99,0.20],[],18);
  sphere(0.045,gold,[0.28,1.03,0.20],[1,0.65,1]);
  cyl(0.012,0.025,black,[0.28,1.065,0.20],[],12);

  for (const x of [-1.02,-0.34,0.34,1.02]) for (const z of [-0.30,0.30]) cyl(0.035,0.07,black,[x,0.035,z],[],14);
  return m;
}

function registerAsset(relativePath) {
  const index = JSON.parse(readFileSync(INDEX_PATH,'utf8'));
  index.props ??= {};
  const pack = 'starter-town-chicken-spot';
  index.props[pack] ??= [];
  const entry = { name: ASSET_ID, path: relativePath, type: 'glb', tex: 0 };
  const existing = index.props[pack].findIndex((item)=>item.name===ASSET_ID);
  if (existing >= 0) index.props[pack][existing] = entry;
  else index.props[pack].push(entry);
  index.props[pack].sort((a,b)=>a.name.localeCompare(b.name));
  writeFileSync(INDEX_PATH, `${JSON.stringify(index,null,2)}\n`);
}

mkdirSync(dirname(OUT_PATH),{recursive:true});
const bytes = writeGLB(buildServiceCounter(),OUT_PATH,{name:ASSET_ID});
const metadata = {
  asset_id: ASSET_ID,
  display_name: 'Chicken Spot Service Counter & POS',
  town: 'Starter Town',
  district: 'Dreamdrop District',
  location: 'Chicken Spot front counter',
  category: 'prop',
  units: 'meters',
  up_axis: 'Y',
  forward_axis: '+Z',
  dimensions_m: { width: 2.38, depth: 1.08, height: 1.58 },
  pivot: 'ground-center',
  triangle_target: 'approximately 4k or lower',
  collision_plan: 'single counter cabinet box; elevated screens, glass, cups and trays non-colliding',
  interaction_nodes: ['POS screen','card terminal','receipt printer','order display','pickup bay','bags and cups'],
  approval_status: 'APPROVED',
  approved_in_chat: '2026-07-17',
  generated_bytes: bytes,
  license: 'Original ZTA geometry',
};
writeFileSync(META_PATH,`${JSON.stringify(metadata,null,2)}\n`);
registerAsset(`models/props/starter-town/chicken-spot/${ASSET_ID}.glb`);
console.log(`[starter-assets] generated ${OUT_PATH} (${(bytes/1024).toFixed(1)} KB)`);
