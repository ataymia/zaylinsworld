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

// Furniture set per interior id. dx/dz are offsets from the room centre,
// ry is yaw (radians), s is a scale multiplier (furniture is ~1u = 1m).
const FURNITURE = {
  home: [
    { name: 'rug-rectangle-a', dx: 2,   dz: 1,   ry: 0,            s: 1.0 },
    { name: 'lamp-standing',   dx: 7,   dz: 3,   ry: 0,            s: 0.9 },
    { name: 'shelf-a-big',     dx: 8.2, dz: -5,  ry: -Math.PI / 2, s: 0.9 },
    { name: 'shelf-b-small',   dx: 0,   dz: -6,  ry: 0,            s: 0.9 },
    { name: 'cabinet-medium',  dx: -8.2, dz: 2,  ry: Math.PI / 2,  s: 0.9 },
    { name: 'pictureframe-large-a', dx: 4, dz: -6.6, ry: 0,        s: 0.9 },
  ],
  kicks: [
    { name: 'armchair',        dx: -6, dz: 3,  ry: Math.PI * 0.7, s: 0.9 },
    { name: 'rug-oval-a',      dx: -4, dz: 2,  ry: 0,             s: 1.0 },
    { name: 'shelf-b-large',   dx: 7,  dz: -4, ry: -Math.PI / 2,  s: 0.9 },
    { name: 'lamp-table',      dx: 6,  dz: 2,  ry: 0,             s: 0.9 },
  ],
  gym: [
    { name: 'cabinet-small',   dx: -8, dz: 3,  ry: Math.PI / 2,   s: 0.9 },
    { name: 'cabinet-small-decorated', dx: -8, dz: 4.4, ry: Math.PI / 2, s: 0.9 },
    { name: 'shelf-b-small',   dx: 7,  dz: 4,  ry: 0,             s: 0.9 },
    { name: 'rug-rectangle-stripes-a', dx: 0, dz: 2, ry: 0,       s: 1.1 },
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
  chicken: [
    { name: 'table-low',       dx: -5, dz: 3,  ry: 0,            s: 0.8 },
    { name: 'chair-stool',     dx: -5, dz: 4,  ry: Math.PI,      s: 0.8 },
  ],
};

// Food props (small GLBs) laid out on the chicken-spot counter + dealership/diner.
const FOOD = {
  chicken: [
    { name: 'chicken-cooking-a', dx: 1.5, dz: -3.6, y: 1.15, s: 3.0 },
    { name: 'chicken-cooking-b', dx: 3.0, dz: -3.6, y: 1.15, s: 3.0 },
    { name: 'fried-chicken',     dx: 2.5, dz: -1.2, y: 1.15, s: 3.5 },
    { name: 'french-fries',      dx: -2.5, dz: 2.5, y: 0.75, s: 3.5 },
    { name: 'chicken-nuggets',   dx: -4,  dz: 4,   y: 0.75, s: 3.5 },
  ],
};

// Load + place one model into the interiors root group at world (ox+dx, *, dz).
async function place(root, asset, ox, item, renderer, defaultS) {
  try {
    const m = await loadAsset(asset.cat, asset.pack, item.name, renderer);
    if (!m || !m.scene) return false;
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
  } catch { return false; }
}

// Furnish every configured interior. `interiors` = { group, byId } from buildInteriors().
export async function furnishInteriors(interiors, renderer) {
  if (!interiors || !interiors.group) return 0;
  const root = interiors.group;
  let n = 0;
  for (const [id, items] of Object.entries(FURNITURE)) {
    const intr = interiors.byId[id];
    if (!intr || !intr.offset) continue;
    const ox = intr.offset.x;
    for (const it of items) {
      if (await place(root, { cat: 'interiors', pack: 'furniture' }, ox, it, renderer, 0.9)) n++;
    }
  }
  for (const [id, items] of Object.entries(FOOD)) {
    const intr = interiors.byId[id];
    if (!intr || !intr.offset) continue;
    const ox = intr.offset.x;
    for (const it of items) {
      if (await place(root, { cat: 'props', pack: 'food' }, ox, it, renderer, 3.0)) n++;
    }
  }
  if (n) console.info('[furnish] placed', n, 'uploaded furniture/food pieces');
  return n;
}
