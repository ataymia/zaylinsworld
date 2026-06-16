// ───────────────────────────────────────────────────────────────────────────
//  props.js — scatter the "Trash & Debris" GLB across the city as ground litter.
//
//  The pack ships as ONE GLB holding ~100 individually-named props (cans,
//  bottles, bags, newspapers, cardboard, cinder blocks…). We load it once, pull
//  a curated set of those nodes, and clone them into small clusters at the
//  anchors in mapConfig.LITTER. Each clone is recentred + grounded so it rests
//  on y=0, then nudged + rotated by a deterministic PRNG so the layout is stable
//  between runs. Litter is decorative only — no colliders — so it never blocks
//  the player or traffic. Failures warn once and leave the streets clean.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { LITTER } from './config/mapConfig.js';
import { loadModel } from './assets.js';
import { assetUrl } from './manifest.js';

const TRASH_GLB = 'models/props/trash-debris.glb';

// Curated node names worth scattering (small, street-appropriate). Names that
// don't exist in the GLB are skipped silently, so this list is safe to tweak.
const ITEM_POOL = [
  'Can_1', 'Can_2', 'Can_3', 'Can_4', 'Can_5', 'Can_6', 'Can_7', 'Can_8',
  'Can_1_Crushed', 'Can_3_Crushed', 'Can_5_Crushed', 'Can_7_Crushed',
  'Flat_Can_1', 'Flat_Can_2', 'Flat_Can_3', 'Flat_Can_4',
  'News_1', 'News_2', 'News_3', 'News_Stack',
  'Coffee_Cup', 'Coffee_Cup_Crushed', 'Soda_Cup', 'Soda_Cup_Crushed',
  'Paper_Bag_1', 'Paper_Bag_2', 'Paper_Bag_3',
  'Tin_1', 'Tin_2', 'Tin_3', 'Tin_4',
  'CardboardBox_1', 'CardboardBox_2', 'CardboardBox_3', 'CardboardBox_4',
  'Paper_1', 'Paper_2', 'Fry_Container',
  'GlassBottle_1', 'GlassBottle_2', 'GlassBottle_3', 'GlassBottle_4',
  'TrashBag_1', 'TrashBag_2', 'Chip_Bag_1', 'Chip_Bag_2', 'Chip_Bag_3', 'Chip_Bag_4',
  'Wooden_Plank_1', 'Wooden_Plank_2', 'Wooden_Plank_3',
  'Cinder_Block_1', 'Cinder_Block_2', 'Brick_1', 'Brick_2',
];

// Tiny deterministic PRNG (mulberry32) so litter lands the same way each load.
function makePRNG(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Clone a source node, recentre it on its own footprint and ground it on y=0.
// Returns a wrapper Group positioned at the origin (caller places the wrapper).
function makeGroundedItem(srcNode) {
  const node = srcNode.clone(true);
  node.position.set(0, 0, 0);
  node.rotation.set(0, 0, 0);
  node.scale.set(1, 1, 1);
  node.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(node);
  const c = box.getCenter(new THREE.Vector3());
  node.position.set(-c.x, -box.min.y, -c.z);   // centre on x/z, feet on y=0
  node.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const wrap = new THREE.Group();
  wrap.add(node);
  return wrap;
}

// Scatter litter clusters into `scene`. Returns the number of props placed.
export async function placeStreetProps(scene, renderer) {
  let model;
  try {
    model = await loadModel(assetUrl(TRASH_GLB), renderer);
  } catch (e) {
    console.warn('[props] trash GLB failed to load:', e);
    return 0;
  }
  if (!model || !model.scene) { console.warn('[props] trash GLB empty'); return 0; }

  // index available source nodes by name
  const byName = new Map();
  model.scene.traverse((o) => { if (o.name) byName.set(o.name, o); });
  const items = ITEM_POOL.filter((n) => byName.has(n));
  if (!items.length) { console.warn('[props] no known litter nodes in GLB'); return 0; }

  const group = new THREE.Group();
  group.name = 'street-litter';
  const rng = makePRNG(0x5EED1234);
  let placed = 0;

  for (const spot of (LITTER || [])) {
    const n = spot.n ?? 4;
    const r = spot.r ?? 1.3;
    const sc = spot.scale ?? 1;
    for (let i = 0; i < n; i++) {
      const name = items[(rng() * items.length) | 0];
      const wrap = makeGroundedItem(byName.get(name));
      const ang = rng() * Math.PI * 2;
      const dist = Math.sqrt(rng()) * r;
      wrap.position.set(spot.x + Math.cos(ang) * dist, 0, spot.z + Math.sin(ang) * dist);
      wrap.rotation.y = rng() * Math.PI * 2;
      wrap.scale.setScalar(sc * (0.9 + rng() * 0.4));
      group.add(wrap);
      placed++;
    }
  }
  scene.add(group);
  console.info('[props] street litter placed:', placed, 'items from', items.length, 'types');
  return placed;
}

// ── pickuppable trash (Phase 3C) ─────────────────────────────────────────────
// The cleanup job must use the REAL trash models the player sees — not separate
// placeholder bits. We load the same Trash & Debris GLB once and expose a small
// curated set of hand-grabbable litter nodes (bags, cans, cups, bottles) as
// reusable templates. makeTrashItem() clones one (occasionally two) into a
// grounded group that becomes an actual cleanup target in main.js.
const GRABBABLE = [
  'TrashBag_1', 'TrashBag_2', 'Paper_Bag_1', 'Paper_Bag_2', 'Paper_Bag_3',
  'Chip_Bag_1', 'Chip_Bag_2', 'Chip_Bag_3', 'Chip_Bag_4',
  'Can_1', 'Can_2', 'Can_3', 'Can_4', 'Can_5',
  'Soda_Cup', 'Coffee_Cup', 'Fry_Container',
  'GlassBottle_1', 'GlassBottle_2', 'CardboardBox_1', 'CardboardBox_2',
];

let _trashTemplates = null;     // cached grounded source nodes (or [] if unavailable)

// Load + cache the curated grabbable trash templates. Returns [] on failure so
// callers fall back to a clean procedural bag (never a debug shape).
export async function loadTrashTemplates(renderer) {
  if (_trashTemplates) return _trashTemplates;
  try {
    const model = await loadModel(assetUrl(TRASH_GLB), renderer);
    if (!model || !model.scene) { _trashTemplates = []; return _trashTemplates; }
    const byName = new Map();
    model.scene.traverse((o) => { if (o.name && o.isMesh) byName.set(o.name, o); });
    // also accept group nodes (some packs wrap each prop in a named Object3D)
    model.scene.traverse((o) => { if (o.name && !byName.has(o.name)) byName.set(o.name, o); });
    _trashTemplates = GRABBABLE.map(n => byName.get(n)).filter(Boolean);
  } catch (e) {
    console.warn('[props] trash templates failed:', e);
    _trashTemplates = [];
  }
  console.info('[props] grabbable trash templates:', _trashTemplates.length);
  return _trashTemplates;
}

export function trashTemplatesReady() { return Array.isArray(_trashTemplates) && _trashTemplates.length > 0; }

// Build one grounded trash item from the real templates. Normalizes the longest
// horizontal span to ~0.45 m so every piece reads as street litter (never a
// giant blob). Returns a Group at the origin; caller positions it.
export function makeTrashItem(rng = Math.random) {
  const g = new THREE.Group();
  const tmpls = _trashTemplates || [];
  if (!tmpls.length) return null;
  const tmpl = tmpls[(rng() * tmpls.length) | 0];
  const wrap = makeGroundedItem(tmpl);
  // normalize size
  wrap.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(wrap);
  const size = box.getSize(new THREE.Vector3());
  const span = Math.max(size.x, size.z, 1e-3);
  const scale = 0.45 / span;
  if (Number.isFinite(scale) && scale > 0) wrap.scale.setScalar(Math.min(4, scale));
  wrap.rotation.y = rng() * Math.PI * 2;
  g.add(wrap);
  return g;
}
