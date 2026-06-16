// ───────────────────────────────────────────────────────────────────────────
//  furnish.js — dress the walkable interiors with the uploaded KayKit Furniture
//  Bits and food props (catalogued in asset-index-v2.json).
//
//  Each interior is a room centred on its offset (interiors.byId[id].offset)
//  with the door on the +Z (front) wall. We add a curated set of GLB/glTF
//  furniture toward the back/side walls (clear of the spawn + doorway) so the
//  uploaded art is clearly visible without trapping the player. Pieces are
//  decorative (no colliders). Failures are skipped — the procedural room stays.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { loadAsset } from './assets.js';

// ── STRICT per-interior allowlists ──────────────────────────────────────────
// Each interior id maps to EXACTLY ONE approved asset pack (cat/pack). A gym may
// ONLY pull from interiors.gym, a restaurant ONLY from interiors.restaurant, and
// so on. This is the discipline fix: no more "small prop" leaking a nightstand
// into a gym. Every item below names a real asset from its allowed pack.
const INTERIOR_PACK = {
  home:    { cat: 'interiors', pack: 'furniture' },
  kicks:   { cat: 'interiors', pack: 'furniture' },
  gym:     { cat: 'interiors', pack: 'gym' },
  school:  { cat: 'interiors', pack: 'furniture' },
  office:  { cat: 'interiors', pack: 'furniture' },
  chicken: { cat: 'interiors', pack: 'restaurant' },
};

// Furniture/equipment set per interior id. dx/dz are offsets from the room
// centre, ry is yaw (radians), s is a scale multiplier (furniture is ~1u = 1m).
// Every name MUST exist in that interior's INTERIOR_PACK (enforced at load).
const FURNITURE = {
  home: [
    { name: 'rug-rectangle-a', dx: 2,   dz: 1,   ry: 0,            s: 1.0 },
    { name: 'bed-double-a',    dx: -6,  dz: -4,  ry: 0,            s: 1.0 },
    { name: 'lamp-standing',   dx: 7,   dz: 3,   ry: 0,            s: 0.9 },
    { name: 'couch',           dx: 4,   dz: 3,   ry: Math.PI,      s: 0.9 },
    { name: 'cabinet-medium',  dx: -8.2, dz: 2,  ry: Math.PI / 2,  s: 0.9 },
    { name: 'pictureframe-large-a', dx: 4, dz: -6.6, ry: 0,        s: 0.9 },
  ],
  kicks: [
    { name: 'armchair',        dx: -6, dz: 3,  ry: Math.PI * 0.7, s: 0.9 },
    { name: 'rug-oval-a',      dx: -4, dz: 2,  ry: 0,             s: 1.0 },
    { name: 'shelf-b-large',   dx: 7,  dz: -4, ry: -Math.PI / 2,  s: 0.9 },
    { name: 'lamp-table',      dx: 6,  dz: 2,  ry: 0,             s: 0.9 },
  ],
  // GYM — gym-pack equipment ONLY (treadmill, benches, racks, dumbbells, mats).
  // Positions complement the procedural gym base in interiors.js (which holds a
  // weight rack at back-left, a bench at centre, a treadmill at the right) so
  // the GLB pieces fill the open floor instead of overlapping them.
  gym: [
    { name: 'e-machine-1',      dx: -1,  dz: -5.4, ry: Math.PI,     s: 1.0 },
    { name: 'e-machine-3',      dx: 1.6, dz: -5.4, ry: Math.PI,     s: 1.0 },
    { name: 'pulldown-ac-1',    dx: 3.8, dz: -5.4, ry: Math.PI,     s: 1.0 },
    { name: 'weight-stand-1',   dx: -8,  dz: -2,   ry: Math.PI / 2, s: 1.0 },
    { name: 'weight-stand-2',   dx: -8,  dz: 0,    ry: Math.PI / 2, s: 1.0 },
    { name: 'barbell-stand-1',  dx: -8,  dz: 2,    ry: Math.PI / 2, s: 1.0 },
    { name: 'exercise-bike',    dx: 8,   dz: -2,   ry: -Math.PI / 2, s: 1.0 },
    { name: 'stationary-rowing-machine', dx: 8, dz: 1, ry: -Math.PI / 2, s: 1.0 },
    { name: 'dumbbells-1',      dx: 6.4, dz: 4.4,  ry: 0,           s: 1.0 },
    { name: 'dumbbells-2',      dx: 5.2, dz: 4.4,  ry: 0,           s: 1.0 },
    { name: 'kettlebell',       dx: 4.2, dz: 4.4,  ry: 0,           s: 1.0 },
    { name: 'pullup-stand',     dx: -6,  dz: 4.6,  ry: Math.PI,     s: 1.0 },
    { name: 'sp-mat-1',         dx: -1,  dz: 4,    ry: 0,           s: 1.0 },
    { name: 'sp-mat-2',         dx: 1,   dz: 4,    ry: 0,           s: 1.0 },
  ],
  school: [
    { name: 'table-medium',    dx: -4, dz: 1,  ry: 0,             s: 0.85 },
    { name: 'chair-a',         dx: -4, dz: 2.2, ry: Math.PI,      s: 0.85 },
    { name: 'table-medium',    dx: 4,  dz: 1,  ry: 0,             s: 0.85 },
    { name: 'chair-a',         dx: 4,  dz: 2.2, ry: Math.PI,      s: 0.85 },
    { name: 'shelf-a-big',     dx: 8.2, dz: -5, ry: -Math.PI / 2, s: 0.9 },
    { name: 'book-set',        dx: -4, dz: 1,  ry: 0,             s: 0.9 },
  ],
  office: [
    { name: 'table-medium-long', dx: 0, dz: -2, ry: 0,           s: 0.9 },
    { name: 'chair-b',         dx: 0,  dz: -3.4, ry: 0,          s: 0.85 },
    { name: 'cabinet-medium-decorated', dx: 8.2, dz: 2, ry: -Math.PI / 2, s: 0.9 },
    { name: 'shelf-b-large-decorated', dx: -8.2, dz: -3, ry: Math.PI / 2, s: 0.9 },
    { name: 'lamp-standing',   dx: 6,  dz: 4,  ry: 0,            s: 0.9 },
  ],
  // CHICKEN SPOT — restaurant-pack ONLY (booths, counter, register, stove).
  chicken: [
    { name: 'counter-front',   dx: 2.5, dz: -3.4, ry: 0,          s: 1.0 },
    { name: 'cash-register',   dx: 3.2, dz: -3.0, ry: Math.PI,    s: 1.0 },
    { name: 'stove-griddle',   dx: 0.5, dz: -4.2, ry: 0,          s: 1.0 },
    { name: 'booth-full',      dx: -5,  dz: 2,    ry: 0,          s: 1.0 },
    { name: 'booth-half',      dx: -5,  dz: 4,    ry: 0,          s: 1.0 },
    { name: 'table-square',    dx: 5,   dz: 2.5,  ry: 0,          s: 1.0 },
    { name: 'chair-red',       dx: 5,   dz: 3.4,  ry: Math.PI,    s: 1.0 },
    { name: 'table-circle',    dx: 2,   dz: 3.5,  ry: 0,          s: 1.0 },
  ],
};

// Food props (small GLBs) laid out on the chicken-spot counter.
const FOOD = {
  chicken: [
    { name: 'chicken-cooking-a', dx: 0.5, dz: -4.0, y: 1.05, s: 3.0 },
    { name: 'fried-chicken',     dx: 2.5, dz: -2.8, y: 1.05, s: 3.5 },
    { name: 'french-fries',      dx: 5,   dz: 2.5,  y: 0.75, s: 3.5 },
    { name: 'chicken-nuggets',   dx: 2,   dz: 3.5,  y: 0.75, s: 3.5 },
  ],
};

// Load + place one model into the interiors root group at world (ox+dx, *, dz).
// Returns true on success, or a string asset-name on failure (for diagnostics).
async function place(root, asset, ox, item, renderer, defaultS) {
  try {
    const m = await loadAsset(asset.cat, asset.pack, item.name, renderer);
    if (!m || !m.scene) return item.name;
    const obj = m.scene.clone(true);
    obj.scale.setScalar(item.s ?? defaultS);
    obj.rotation.y = item.ry ?? 0;
    obj.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(obj);
    const groundY = (item.y ?? 0) - box.min.y;
    obj.position.set(ox + item.dx, groundY, item.dz);
    obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    root.add(obj);
    return true;
  } catch { return item.name; }
}

// Furnish every configured interior. `interiors` = { group, byId } from buildInteriors().
// Returns { items, interiors, failed[], rejected[], byInterior{} } so the debug
// panel can PROVE each interior pulled from its approved pack only.
export async function furnishInteriors(interiors, renderer) {
  if (!interiors || !interiors.group) return { items: 0, interiors: 0, failed: [], rejected: [], byInterior: {} };
  const root = interiors.group;
  let n = 0; const furnished = new Set(); const failed = []; const rejected = [];
  const byInterior = {};
  const record = (id, name, ok) => {
    (byInterior[id] = byInterior[id] || { pack: '', placed: [], failed: [] });
    if (ok) byInterior[id].placed.push(name); else byInterior[id].failed.push(name);
  };
  for (const [id, items] of Object.entries(FURNITURE)) {
    const intr = interiors.byId[id];
    if (!intr || !intr.offset) continue;
    const src = INTERIOR_PACK[id];
    if (!src) { rejected.push(`${id}: no approved pack`); continue; }
    (byInterior[id] = byInterior[id] || { pack: '', placed: [], failed: [] }).pack = `${src.cat}/${src.pack}`;
    const ox = intr.offset.x;
    for (const it of items) {
      const r = await place(root, src, ox, it, renderer, 1.0);
      if (r === true) { n++; furnished.add(id); record(id, it.name, true); }
      else { failed.push(`${id}/${r}`); record(id, it.name, false); }
    }
  }
  for (const [id, items] of Object.entries(FOOD)) {
    const intr = interiors.byId[id];
    if (!intr || !intr.offset) continue;
    const ox = intr.offset.x;
    for (const it of items) {
      const r = await place(root, { cat: 'props', pack: 'food' }, ox, it, renderer, 3.0);
      if (r === true) { n++; furnished.add(id); record(id, it.name, true); } else failed.push(`${id}/${r}`);
    }
  }
  if (n) console.info('[furnish] placed', n, 'pack-matched pieces across', furnished.size, 'interiors');
  for (const [id, info] of Object.entries(byInterior)) {
    console.info(`[furnish] ${id} ← ${info.pack}: ${info.placed.length} placed`, info.failed.length ? `(${info.failed.length} failed: ${info.failed.join(',')})` : '');
  }
  if (failed.length) console.warn('[furnish] failed:', failed.join(', '));
  return { items: n, interiors: furnished.size, failed, rejected, byInterior };
}
