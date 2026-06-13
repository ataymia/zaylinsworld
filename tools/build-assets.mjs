// ───────────────────────────────────────────────────────────────────────────
//  build-assets.mjs — generates Asset Pack v1: ORIGINAL (CC0) starter GLBs.
//  Run:  npm run gen:assets   (node tools/build-assets.mjs)
//
//  Everything is original parametric geometry — no third-party/ripped models,
//  no real brands/logos/likenesses. Stylized-realistic, low-poly, PBR materials.
// ───────────────────────────────────────────────────────────────────────────
import {
  Model, pbr, transform, writeGLB,
  boxGeo, cylGeo, sphereGeo, domeGeo, torusGeo, octaGeo,
} from './glb.mjs';

const OUT = 'public/assets/models';
const D2R = Math.PI / 180;

// ── shared material palette ───────────────────────────────────────────────────
const TIRE = { color: '#0e0e12', metal: 0.0, rough: 0.85 };
const GLASS = { color: '#11161f', metal: 0.2, rough: 0.06, alpha: 0.55 };
const CHROME = { color: '#d8dde3', metal: 1.0, rough: 0.18 };
const HEAD = { color: '#eef6ff', metal: 0.0, rough: 0.3, emissive: '#cfe6ff', emissiveStrength: 0.8 };
const TAIL = { color: '#2a0606', metal: 0.0, rough: 0.4, emissive: '#ff2a2a', emissiveStrength: 0.9 };

// ════════════════════════════════════════════════════════════════════════════
//  VEHICLES
// ════════════════════════════════════════════════════════════════════════════
function buildCar(spec) {
  const m = new Model();
  const paint = m.material(pbr(spec.color, { metal: 0.6, rough: 0.28 }));
  const glass = m.material(pbr(GLASS.color, GLASS));
  const tire = m.material(pbr(TIRE.color, TIRE));
  const rim = m.material(pbr('#c9ccd2', { metal: 0.95, rough: 0.22 }));
  const chrome = m.material(pbr(CHROME.color, CHROME));
  const head = m.material(pbr(HEAD.color, HEAD));
  const tail = m.material(pbr(TAIL.color, TAIL));
  const carbon = m.material(pbr('#15171c', { metal: 0.5, rough: 0.4 }));

  const L = spec.length, W = spec.width, ride = spec.ride;
  const bodyH = spec.bodyH;
  const bodyY = ride + bodyH / 2;

  // lower body — slightly tapered with a stacked sill for a planted stance
  m.add(boxGeo(W, bodyH, L * 0.96), paint, transform({ t: [0, bodyY, 0] }));
  m.add(boxGeo(W * 1.02, bodyH * 0.4, L * 0.7), paint, transform({ t: [0, ride + bodyH * 0.2, 0] }));
  // hood + trunk slopes (thin angled slabs)
  m.add(boxGeo(W * 0.92, 0.06, L * 0.3), paint,
    transform({ t: [0, bodyY + bodyH * 0.45, L * 0.34], r: [spec.hoodTilt * D2R, 0, 0] }));
  m.add(boxGeo(W * 0.92, 0.06, L * 0.26), paint,
    transform({ t: [0, bodyY + bodyH * 0.45, -L * 0.36], r: [-spec.trunkTilt * D2R, 0, 0] }));

  // cabin / greenhouse (glass) + body-color roof
  const cabH = spec.cabH, cabY = ride + bodyH + cabH / 2;
  const cabL = L * spec.cabLen;
  m.add(boxGeo(W * 0.86, cabH, cabL), glass, transform({ t: [0, cabY, spec.cabZ] }));
  m.add(boxGeo(W * 0.8, 0.06, cabL * 0.9), paint, transform({ t: [0, cabY + cabH / 2, spec.cabZ] }));
  // A/C pillars to break up the glass
  [-1, 1].forEach(sx => {
    m.add(boxGeo(0.05, cabH, 0.06), paint, transform({ t: [sx * W * 0.42, cabY, spec.cabZ + cabL / 2 - 0.04] }));
    m.add(boxGeo(0.05, cabH, 0.06), paint, transform({ t: [sx * W * 0.42, cabY, spec.cabZ - cabL / 2 + 0.04] }));
  });

  // wheels (axle along X) with rim + hub
  const wr = spec.wheelR, ww = spec.wheelW;
  const wz = L * 0.31, wx = W * 0.5 + ww * 0.18;
  [[wx, wz], [-wx, wz], [wx, -wz], [-wx, -wz]].forEach(([x, z]) => {
    m.add(cylGeo(wr, wr, ww, 18), tire, transform({ t: [x, wr, z], r: [0, 0, 90 * D2R] }));
    m.add(cylGeo(wr * 0.62, wr * 0.62, ww * 1.04, 14), rim, transform({ t: [x, wr, z], r: [0, 0, 90 * D2R] }));
    m.add(cylGeo(wr * 0.18, wr * 0.18, ww * 1.1, 10), chrome, transform({ t: [x, wr, z], r: [0, 0, 90 * D2R] }));
    // wheel-arch flare
    m.add(boxGeo(0.06, wr * 1.3, wr * 2.2), spec.carbon ? carbon : paint, transform({ t: [x > 0 ? wx + 0.01 : -wx - 0.01, wr + 0.1, z] }));
  });

  // lights
  [-1, 1].forEach(sx => {
    m.add(boxGeo(W * 0.26, spec.lampH, 0.06), head, transform({ t: [sx * W * 0.3, bodyY + 0.02, L * 0.48] }));
    m.add(boxGeo(W * 0.28, 0.12, 0.06), tail, transform({ t: [sx * W * 0.3, bodyY + 0.02, -L * 0.48] }));
  });
  // grille + splitter
  m.add(boxGeo(W * 0.5, 0.16, 0.05), chrome, transform({ t: [0, ride + bodyH * 0.45, L * 0.49] }));
  if (spec.splitter) m.add(boxGeo(W * 0.96, 0.05, 0.28), carbon, transform({ t: [0, ride + 0.06, L * 0.5] }));
  // side mirrors
  [-1, 1].forEach(sx => m.add(boxGeo(0.1, 0.1, 0.06), paint, transform({ t: [sx * (W * 0.5 + 0.1), cabY, spec.cabZ + cabL * 0.4] })));

  // rear wing
  if (spec.wing === 'gt') {
    [-1, 1].forEach(sx => m.add(boxGeo(0.06, 0.3, 0.1), carbon, transform({ t: [sx * W * 0.32, bodyY + bodyH * 0.6, -L * 0.42] })));
    m.add(boxGeo(W * 0.9, 0.05, 0.4), carbon, transform({ t: [0, bodyY + bodyH * 0.78, -L * 0.42], r: [-7 * D2R, 0, 0] }));
  } else if (spec.wing === 'lip') {
    m.add(boxGeo(W * 0.88, 0.05, 0.18), paint, transform({ t: [0, bodyY + bodyH * 0.5, -L * 0.5], r: [-12 * D2R, 0, 0] }));
  }
  // exhaust tips
  const ex = spec.exhaust || 2;
  for (let i = 0; i < ex; i++) {
    const spread = ex === 4 ? [-0.45, -0.25, 0.25, 0.45][i] : [-0.3, 0.3][i];
    m.add(cylGeo(0.05, 0.05, 0.12, 10), chrome, transform({ t: [spread, ride + 0.12, -L * 0.5], r: [90 * D2R, 0, 0] }));
  }
  return m;
}

const CARS = {
  car_starter: { color: '#3a8d54', length: 3.7, width: 1.62, ride: 0.14, bodyH: 0.62, cabH: 0.66, cabLen: 0.42, cabZ: -0.15,
    wheelR: 0.30, wheelW: 0.22, lampH: 0.16, hoodTilt: 8, trunkTilt: 10, wing: false, splitter: false, exhaust: 1 },
  car_sedan: { color: '#1c2433', length: 4.5, width: 1.8, ride: 0.13, bodyH: 0.6, cabH: 0.56, cabLen: 0.4, cabZ: -0.1,
    wheelR: 0.33, wheelW: 0.24, lampH: 0.13, hoodTilt: 6, trunkTilt: 7, wing: false, splitter: false, exhaust: 2, chrome: true },
  car_supercar_01: { color: '#c92b2b', length: 4.4, width: 1.96, ride: 0.10, bodyH: 0.5, cabH: 0.44, cabLen: 0.32, cabZ: 0.1,
    wheelR: 0.36, wheelW: 0.30, lampH: 0.1, hoodTilt: 12, trunkTilt: 6, wing: 'lip', splitter: true, exhaust: 2, carbon: true },
  car_hypercar_01: { color: '#e7c14a', length: 4.5, width: 2.04, ride: 0.08, bodyH: 0.46, cabH: 0.4, cabLen: 0.3, cabZ: 0.15,
    wheelR: 0.38, wheelW: 0.34, lampH: 0.08, hoodTilt: 14, trunkTilt: 5, wing: 'gt', splitter: true, exhaust: 4, carbon: true },
};

// ════════════════════════════════════════════════════════════════════════════
//  HUMANOIDS  (stylized-realistic kid, ~1.5 m, faces +Z, feet on y=0)
// ════════════════════════════════════════════════════════════════════════════
function buildHumanoid(spec) {
  const m = new Model();
  const skin = m.material(pbr(spec.skin, { rough: 0.65 }));
  const shirt = m.material(pbr(spec.shirt, { rough: 0.8 }));
  const pants = m.material(pbr(spec.pants, { rough: 0.85 }));
  const shoe = m.material(pbr(spec.shoe, { rough: 0.6 }));
  const sole = m.material(pbr('#f4f4f4', { rough: 0.5 }));
  const eyeW = m.material(pbr('#f4f4f4', { rough: 0.3 }));
  const eyeD = m.material(pbr('#1a120c', { rough: 0.3 }));
  const hairM = m.material(pbr(spec.hairColor || '#15100c', { rough: 0.85 }));
  const build = spec.build || 1;

  // legs
  [-1, 1].forEach(sx => {
    m.add(cylGeo(0.085 * build, 0.1 * build, 0.72, 12), pants, transform({ t: [sx * 0.12, 0.42, 0] }));
    // shoe
    m.add(boxGeo(0.16, 0.12, 0.34), shoe, transform({ t: [sx * 0.12, 0.07, 0.06] }));
    m.add(boxGeo(0.17, 0.05, 0.36), sole, transform({ t: [sx * 0.12, 0.025, 0.06] }));
  });
  // hips
  m.add(boxGeo(0.34 * build, 0.2, 0.22), pants, transform({ t: [0, 0.82, 0] }));
  // torso (tapered) — shirt
  m.add(cylGeo(0.17 * build, 0.21 * build, 0.42, 14), shirt, transform({ t: [0, 1.08, 0] }));
  m.add(boxGeo(0.4 * build, 0.16, 0.24), shirt, transform({ t: [0, 1.22, 0] }));   // shoulders
  // arms (skin forearm + sleeve upper)
  [-1, 1].forEach(sx => {
    m.add(cylGeo(0.06, 0.07, 0.24, 10), shirt, transform({ t: [sx * 0.26, 1.16, 0] }));
    m.add(cylGeo(0.05, 0.06, 0.24, 10), skin, transform({ t: [sx * 0.27, 0.92, 0] }));
    m.add(sphereGeo(0.06, 8, 6), skin, transform({ t: [sx * 0.27, 0.8, 0] }));      // hand
  });
  // neck + head
  m.add(cylGeo(0.07, 0.08, 0.1, 10), skin, transform({ t: [0, 1.36, 0] }));
  m.add(sphereGeo(0.155, 16, 12), skin, transform({ t: [0, 1.52, 0], s: [1, 1.08, 1] }));
  // face: eyes
  [-1, 1].forEach(sx => {
    m.add(sphereGeo(0.028, 8, 6), eyeW, transform({ t: [sx * 0.06, 1.54, 0.13] }));
    m.add(sphereGeo(0.014, 6, 6), eyeD, transform({ t: [sx * 0.06, 1.54, 0.15] }));
  });
  // brows
  [-1, 1].forEach(sx => m.add(boxGeo(0.05, 0.012, 0.02), hairM, transform({ t: [sx * 0.06, 1.585, 0.14] })));

  // baked starter hair (variant-specific) so even a bare humanoid reads right
  addHairTo(m, hairM, spec.hair || 'afro');

  // optional jeweler chain accessory
  if (spec.chain) {
    const gold = m.material(pbr('#f4cf5a', { metal: 1, rough: 0.12 }));
    m.add(torusGeo(0.14, 0.022, 20, 8), gold, transform({ t: [0, 1.18, 0.12], r: [80 * D2R, 0, 0] }));
    m.add(boxGeo(0.07, 0.1, 0.03), gold, transform({ t: [0, 1.06, 0.2] }));
  }
  return m;
}

// ════════════════════════════════════════════════════════════════════════════
//  HAIR  (modular meshes — attach to head top ~ y matches humanoid head)
//  Authored around a head at origin radius ~0.16; in-game scaled/placed onto
//  the attach point. Each style is a distinct recognizable silhouette.
// ════════════════════════════════════════════════════════════════════════════
function addHairTo(m, hairM, style) {
  // local space: head center at (0,0,0), this adds hair around it for the baked humanoid
  // shift to humanoid head center (0,1.52,0)
  const Y = 1.52;
  hairStyle(m, hairM, style, [0, Y, 0], 0.16);
}

function hairStyle(m, hairM, style, c, R) {
  const [cx, cy, cz] = c;
  const T = (t, s, r) => transform({ t: [cx + t[0], cy + t[1], cz + t[2]], s, r });
  switch (style) {
    case 'afro':
      m.add(sphereGeo(R * 1.7, 14, 12), hairM, T([0, R * 0.5, 0], [1, 1, 1]));
      break;
    case 'waves':
      m.add(domeGeo(R * 1.08, 16, 8, 0.7), hairM, T([0, R * 0.2, 0]));
      break;
    case 'locs':
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2, rr = R * 0.95;
        m.add(cylGeo(0.022, 0.022, R * 2.6, 6), hairM,
          T([Math.cos(a) * rr, -R * 0.6, Math.sin(a) * rr], [1, 1, 1], [0.12 * Math.cos(a), 0, 0.12 * Math.sin(a)]));
      }
      m.add(domeGeo(R * 1.12, 14, 6, 0.7), hairM, T([0, R * 0.2, 0]));
      break;
    case 'taper_fade':
    case 'taper-fade':
      m.add(domeGeo(R * 1.06, 16, 8, 0.85), hairM, T([0, R * 0.35, 0]));
      break;
    case 'braids':
      for (let i = 0; i < 7; i++) {
        const x = (-3 + i) * R * 0.32;
        m.add(cylGeo(0.02, 0.02, R * 3.0, 6), hairM, T([x, -R * 0.8, -R * 0.6], [1, 1, 1], [0.2, 0, 0]));
        m.add(domeGeo(R * 0.18, 6, 4, 1), hairM, T([x, R * 0.5, 0]));
      }
      m.add(domeGeo(R * 1.05, 14, 6, 0.7), hairM, T([0, R * 0.2, 0]));
      break;
    case 'cornrows':
      for (let i = 0; i < 6; i++) {
        const x = (-2.5 + i) * R * 0.34;
        m.add(cylGeo(0.022, 0.022, R * 2.4, 6), hairM, T([x, R * 0.1, -R * 0.1], [1, 1, 1], [70 * Math.PI / 180, 0, 0]));
      }
      break;
    default:
      m.add(domeGeo(R * 1.1, 14, 8, 0.8), hairM, T([0, R * 0.3, 0]));
  }
}

// standalone hair GLB (centered so the model origin ~ attach point at head top)
function buildHair(style, color) {
  const m = new Model();
  const hairM = m.material(pbr(color, { rough: 0.85 }));
  hairStyle(m, hairM, style, [0, 0, 0], 0.16);
  return m;
}

// ════════════════════════════════════════════════════════════════════════════
//  JEWELRY
// ════════════════════════════════════════════════════════════════════════════
function buildCubanChain() {
  const m = new Model();
  const gold = m.material(pbr('#f4cf5a', { metal: 1, rough: 0.12 }));
  // interlocking oval links forming a U-shaped chain
  const N = 26, span = Math.PI * 1.15, R = 0.5;
  for (let i = 0; i < N; i++) {
    const t = -span / 2 + (i / (N - 1)) * span;
    const x = Math.sin(t) * R, y = -Math.cos(t) * R * 0.7;
    m.add(torusGeo(0.05, 0.018, 12, 7), gold,
      transform({ t: [x, y, 0], r: [0, 0, t + (i % 2 ? Math.PI / 2 : 0)], s: [1, 1.5, 1] }));
  }
  return m;
}
function buildPendant() {
  const m = new Model();
  const gold = m.material(pbr('#f4cf5a', { metal: 1, rough: 0.12 }));
  const ice = m.material(pbr('#eaf2ff', { metal: 0, rough: 0.04, emissive: '#bfe3ff', emissiveStrength: 0.2 }));
  // an "initial Z" style bar pendant, iced out
  m.add(boxGeo(0.34, 0.06, 0.05), gold, transform({ t: [0, 0.18, 0] }));
  m.add(boxGeo(0.34, 0.06, 0.05), gold, transform({ t: [0, -0.18, 0] }));
  m.add(boxGeo(0.06, 0.5, 0.05), gold, transform({ t: [0, 0, 0], r: [0, 0, -35 * D2R] }));
  // little gem studs
  for (let i = -2; i <= 2; i++) m.add(octaGeo(0.03), ice, transform({ t: [i * 0.07, 0.18, 0.04] }));
  m.add(torusGeo(0.05, 0.015, 12, 7), gold, transform({ t: [0, 0.3, 0] }));
  return m;
}
function buildDisplayCase() {
  const m = new Model();
  const wood = m.material(pbr('#1a1a22', { rough: 0.5, metal: 0.2 }));
  const glass = m.material(pbr('#cfe8ff', { metal: 0, rough: 0.03, alpha: 0.18 }));
  const trim = m.material(pbr('#c9a23a', { metal: 1, rough: 0.2 }));
  const velvet = m.material(pbr('#2a0d12', { rough: 0.95 }));
  m.add(boxGeo(1.3, 0.9, 0.75), wood, transform({ t: [0, 0.45, 0] }));      // cabinet base
  m.add(boxGeo(1.26, 0.04, 0.72), velvet, transform({ t: [0, 0.92, 0] }));  // velvet top
  m.add(boxGeo(1.3, 0.72, 0.75), glass, transform({ t: [0, 1.28, 0] }));    // glass box
  // gold trim edges
  [[0.65, 0], [-0.65, 0]].forEach(([x]) => m.add(boxGeo(0.03, 0.72, 0.78), trim, transform({ t: [x, 1.28, 0] })));
  m.add(boxGeo(1.34, 0.04, 0.78), trim, transform({ t: [0, 1.64, 0] }));
  return m;
}

// ════════════════════════════════════════════════════════════════════════════
//  generate everything
// ════════════════════════════════════════════════════════════════════════════
const jobs = [];
for (const [name, spec] of Object.entries(CARS)) jobs.push([`${OUT}/vehicles/${name}.glb`, buildCar(spec), name]);

jobs.push([`${OUT}/characters/player_avatar.glb`, buildHumanoid({ skin: '#6b3e25', shirt: '#b22b2b', pants: '#33415c', shoe: '#161616', hair: 'afro', hairColor: '#15100c', build: 1 }), 'player_avatar']);
jobs.push([`${OUT}/characters/npc_basic_01.glb`, buildHumanoid({ skin: '#4a2c1a', shirt: '#1f8a4c', pants: '#8a7350', shoe: '#222', hair: 'taper_fade', hairColor: '#15100c', build: 0.92 }), 'npc_basic_01']);
jobs.push([`${OUT}/characters/npc_basic_02.glb`, buildHumanoid({ skin: '#8a5634', shirt: '#2b4fb2', pants: '#1c1c22', shoe: '#c02626', hair: 'locs', hairColor: '#241a13', build: 1.12 }), 'npc_basic_02']);
jobs.push([`${OUT}/characters/npc_shopkeeper_frostbox.glb`, buildHumanoid({ skin: '#3b2417', shirt: '#5a2b8a', pants: '#1c1c22', shoe: '#161616', hair: 'locs', hairColor: '#15100c', build: 1.0, chain: true }), 'npc_shopkeeper_frostbox']);

const HAIRS = {
  hair_afro: 'afro', hair_waves: 'waves', hair_locs: 'locs',
  hair_taper_fade: 'taper_fade', hair_braids: 'braids', hair_cornrows: 'cornrows',
};
for (const [name, style] of Object.entries(HAIRS)) jobs.push([`${OUT}/hair/${name}.glb`, buildHair(style, '#15100c'), name]);

jobs.push([`${OUT}/jewelry/frostbox_chain_cuban.glb`, buildCubanChain(), 'frostbox_chain_cuban']);
jobs.push([`${OUT}/jewelry/frostbox_pendant_initial.glb`, buildPendant(), 'frostbox_pendant_initial']);
jobs.push([`${OUT}/jewelry/frostbox_display_case.glb`, buildDisplayCase(), 'frostbox_display_case']);

let total = 0;
for (const [path, model, name] of jobs) {
  const bytes = writeGLB(model, path, { name });
  total += bytes;
  console.log(`  ${name.padEnd(28)} ${(bytes / 1024).toFixed(1)} KB  → ${path}`);
}
console.log(`\nAsset Pack v1: ${jobs.length} GLBs, ${(total / 1024).toFixed(1)} KB total`);
