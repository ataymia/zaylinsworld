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
// Each interior id maps to EXACTLY ONE approved asset pack (cat/pack) plus a
// `unit` factor that converts the pack's native units to METRES. The Restaurant
// + Gym packs are authored in CENTIMETRES (1 unit ≈ 1 cm) — at scale 1 a stove
// becomes a 180 m white blob — so they use unit 0.01. Furniture/food are metres.
const INTERIOR_PACK = {
  home:    { cat: 'interiors', pack: 'furniture',  unit: 1.0  },
  kicks:   { cat: 'interiors', pack: 'furniture',  unit: 1.0  },
  gym:     { cat: 'interiors', pack: 'gym',        unit: 0.01 },   // cm pack
  school:  { cat: 'interiors', pack: 'furniture',  unit: 1.0  },
  office:  { cat: 'interiors', pack: 'furniture',  unit: 1.0  },
  chicken: { cat: 'interiors', pack: 'restaurant', unit: 0.01 },   // cm pack
};

// Reject any placed piece whose largest dimension falls outside this range after
// unit+scale normalization (catches the giant-blob + degenerate-mesh cases).
const SANE_MIN_DIM = 0.03;   // metres
const SANE_MAX_DIM = 5.0;    // metres

// Furniture/equipment set per interior id. dx/dz are offsets from the room
// centre, ry is yaw (radians), s is an OPTIONAL fine multiplier on top of the
// pack `unit` (default 1). y is an optional base height (items on a counter).
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
  // GYM — gym-pack equipment ONLY (cm pack → unit 0.01). Lines the walls + back
  // so the open centre and the spawn/door path (front, +z) stay clear. A bench
  // sits at the weights station, a treadmill at the tread station.
  gym: [
    { name: 'treadmill-1-main', dx: 5,    dz: -4.6, ry: Math.PI,      s: 1.0 },
    { name: 'e-machine-1',      dx: 2,    dz: -5.0, ry: Math.PI,      s: 1.0 },
    { name: 'e-machine-3',      dx: -1,   dz: -5.0, ry: Math.PI,      s: 1.0 },
    { name: 'pec-machine-ac-1', dx: -4,   dz: -5.0, ry: Math.PI,      s: 1.0 },
    { name: 'weight-stand-1',   dx: -7.6, dz: -2,   ry: Math.PI / 2,  s: 1.0 },
    { name: 'weight-stand-2',   dx: -7.6, dz: 0.6,  ry: Math.PI / 2,  s: 1.0 },
    { name: 'barbell-stand-1',  dx: -7.6, dz: 3.2,  ry: Math.PI / 2,  s: 1.0 },
    { name: 'bench-press',      dx: -2,   dz: 1.4,  ry: 0,            s: 1.0 },
    { name: 'exercise-bike',    dx: 7.6,  dz: -2,   ry: -Math.PI / 2, s: 1.0 },
    { name: 'stationary-rowing-machine', dx: 7.6, dz: 1.2, ry: -Math.PI / 2, s: 1.0 },
    { name: 'dumbbells-1',      dx: 3.6,  dz: 4.4,  ry: 0,            s: 1.0 },
    { name: 'dumbbells-2',      dx: 4.8,  dz: 4.4,  ry: 0,            s: 1.0 },
    { name: 'kettlebell',       dx: 6.0,  dz: 4.4,  ry: 0,            s: 1.0 },
    { name: 'sp-mat-1',         dx: 1,    dz: 3.6,  ry: 0,            s: 1.0 },
    { name: 'pullup-stand',     dx: -6,   dz: 4.6,  ry: Math.PI,      s: 1.0 },
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
  // CHICKEN SPOT — restaurant-pack ONLY (cm pack → unit 0.01). Counter + kitchen
  // along the back wall, booths down the left, tables + chairs in the seating area.
  // `surface:true` pieces are support surfaces; `onSurface:true` pieces snap onto
  // them (no more floating registers/trays). `tint` is the fallback colour used
  // only when the GLB's texture failed to embed (flat-white restaurant pack).
  chicken: [
    { name: 'counter-front',   dx: 0,    dz: -3.2, ry: 0,           s: 1.0, surface: true, tint: '#b5651d' },
    { name: 'cash-register',   dx: 1.8,  dz: -3.0, ry: Math.PI,     s: 1.0, onSurface: true, tint: '#2a2a2e' },
    { name: 'heat-lamp-tray',  dx: -1.6, dz: -3.0, ry: 0,           s: 1.0, onSurface: true, tint: '#c0392b' },
    { name: 'stove-griddle',   dx: -3,   dz: -4.4, ry: 0,           s: 1.0, surface: true, tint: '#8a9099' },
    { name: 'burner-stove',    dx: -5,   dz: -4.4, ry: 0,           s: 1.0, surface: true, tint: '#8a9099' },
    { name: 'booth-full',      dx: -5.6, dz: 2,    ry: Math.PI / 2, s: 1.0, tint: '#7a1f2b' },
    { name: 'booth-half',      dx: -5.6, dz: 4.2,  ry: Math.PI / 2, s: 1.0, tint: '#7a1f2b' },
    { name: 'table-square',    dx: 4.5,  dz: 1.6,  ry: 0,           s: 1.0, surface: true, tint: '#caa37a' },
    { name: 'chair-red',       dx: 4.5,  dz: 2.5,  ry: Math.PI,     s: 1.0, tint: '#c0392b' },
    { name: 'chair-red',       dx: 4.5,  dz: 0.7,  ry: 0,           s: 1.0, tint: '#c0392b' },
    { name: 'table-circle',    dx: 1.6,  dz: 3.8,  ry: 0,           s: 1.0, surface: true, tint: '#caa37a' },
    { name: 'chair-red',       dx: 0.7,  dz: 3.8,  ry: Math.PI / 2, s: 1.0, tint: '#c0392b' },
    { name: 'chair-red',       dx: 2.5,  dz: 3.8,  ry: -Math.PI / 2, s: 1.0, tint: '#c0392b' },
  ],
};

// Food props (small GLBs, already in metres → unit 1) on the counter + tables.
const FOOD_UNIT = 1.0;
const FOOD = {
  chicken: [
    { name: 'chicken-cooking-a', dx: -3,  dz: -3.9, y: 1.0,  s: 2.0, onSurface: true },
    { name: 'fried-chicken',     dx: 1.8, dz: -2.9, y: 0.98, s: 2.4, onSurface: true },
    { name: 'french-fries',      dx: 4.5, dz: 1.6,  y: 0.78, s: 2.4, onSurface: true },
    { name: 'chicken-nuggets',   dx: 1.6, dz: 3.8,  y: 0.78, s: 2.4, onSurface: true },
  ],
};

// When a pack's textures fail to embed, GLB meshes load as the default flat
// white material. Detect that (no map + near-white colour) and apply the item's
// `tint` so the restaurant reads as real surfaces instead of a white-out. Only
// touches untextured near-white materials — properly textured packs are left
// alone. Returns the number of materials recoloured (for diagnostics).
function applyMaterialFallback(obj, item) {
  if (!item.tint) return 0;
  let n = 0;
  obj.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const mm of mats) {
      const c = mm.color;
      const white = c && c.r > 0.85 && c.g > 0.85 && c.b > 0.85;
      if (!mm.map && white) { mm.color = new THREE.Color(item.tint); mm.needsUpdate = true; n++; }
    }
  });
  return n;
}

// Load + place one model into the interiors root group at world (ox+dx, *, dz).
// Returns { ok:true } on success, or { ok:false, reason } for diagnostics.
async function place(root, asset, ox, item, renderer, unit, warnings, supports) {
  try {
    const m = await loadAsset(asset.cat, asset.pack, item.name, renderer);
    if (!m || !m.scene) return { ok: false, reason: 'load-failed' };
    const obj = m.scene.clone(true);
    obj.scale.setScalar(unit * (item.s ?? 1));
    obj.rotation.y = item.ry ?? 0;
    obj.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3(); box.getSize(size);
    // ── sanity validation (P7): reject blobs / NaN / degenerate meshes ──
    if (![size.x, size.y, size.z].every(Number.isFinite)) {
      warnings.push(`${item.name}: non-finite bounds`); return { ok: false, reason: 'non-finite' };
    }
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > SANE_MAX_DIM) {
      warnings.push(`${item.name}: oversized ${maxDim.toFixed(1)}m`); return { ok: false, reason: 'oversized' };
    }
    if (maxDim < SANE_MIN_DIM) {
      warnings.push(`${item.name}: degenerate ${maxDim.toFixed(3)}m`); return { ok: false, reason: 'degenerate' };
    }
    // material fallback for packs whose textures failed to embed (flat white)
    const recoloured = applyMaterialFallback(obj, item);
    if (recoloured) warnings.push(`${item.name}: ${recoloured} white→tint`);
    // grounding: by default seat the piece on the floor (item.y). Items flagged
    // onSurface snap onto the top of the nearest placed support surface so they
    // never float above (or sink into) counters/tables.
    let baseY = item.y ?? 0;
    if (item.onSurface && supports && supports.length) {
      const px = ox + item.dx, pz = item.dz;
      let top = -Infinity;
      for (const sb of supports) {
        if (px >= sb.min.x && px <= sb.max.x && pz >= sb.min.z && pz <= sb.max.z) top = Math.max(top, sb.max.y);
      }
      if (top > -Infinity) baseY = top;
    }
    const groundY = baseY - box.min.y;
    obj.position.set(ox + item.dx, groundY, item.dz);
    obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    root.add(obj);
    obj.updateWorldMatrix(true, true);
    const finalBox = new THREE.Box3().setFromObject(obj);
    return { ok: true, box: finalBox };
  } catch (e) { return { ok: false, reason: (e && e.message) || 'threw' }; }
}

// Furnish every configured interior. `interiors` = { group, byId } from buildInteriors().
// Returns { items, interiors, failed[], rejected[], byInterior{} } so the debug
// panel can PROVE each interior pulled from its approved pack only AND that the
// placeholder decor was removed once assets placed (no stacked old+new furniture).
export async function furnishInteriors(interiors, renderer) {
  if (!interiors || !interiors.group) return { items: 0, interiors: 0, failed: [], rejected: [], byInterior: {} };
  const root = interiors.group;
  let n = 0; const furnished = new Set(); const failed = []; const rejected = [];
  const byInterior = {};

  for (const [id, items] of Object.entries(FURNITURE)) {
    const intr = interiors.byId[id];
    if (!intr || !intr.offset) { rejected.push(`${id}: missing interior`); continue; }
    const src = INTERIOR_PACK[id];
    if (!src) { rejected.push(`${id}: no approved pack`); continue; }
    const info = byInterior[id] = { pack: `${src.cat}/${src.pack}`, placed: [], failed: [], warnings: [], removed: 0 };
    const ox = intr.offset.x;
    const supports = [];   // world boxes of placed surface pieces (counters/tables)
    for (const it of items) {
      const r = await place(root, src, ox, it, renderer, src.unit, info.warnings, supports);
      if (r.ok) { n++; furnished.add(id); info.placed.push(it.name); if (it.surface && r.box) supports.push(r.box); }
      else { failed.push(`${id}/${it.name}:${r.reason}`); info.failed.push(`${it.name}(${r.reason})`); }
    }
    // FOOD overlay for the chicken spot (separate metres-scale pack); food snaps
    // onto the same support surfaces placed above.
    if (FOOD[id]) {
      for (const it of FOOD[id]) {
        const r = await place(root, { cat: 'props', pack: 'food' }, ox, it, renderer, FOOD_UNIT, info.warnings, supports);
        if (r.ok) { n++; furnished.add(id); info.placed.push(it.name); }
        else { failed.push(`${id}/${it.name}:${r.reason}`); info.failed.push(`${it.name}(${r.reason})`); }
      }
    }
    // ── REPLACEMENT: hide procedural decor ONLY if real assets actually placed ──
    // (so assets REPLACE the placeholder furniture; on total failure the clean
    //  procedural room stays — we never mix both at once).
    if (info.placed.length > 0 && intr.decor) {
      intr.decor.visible = false;
      if (Array.isArray(intr.decorColliders) && Array.isArray(intr.colliders)) {
        for (const c of intr.decorColliders) {
          const i = intr.colliders.indexOf(c);
          if (i >= 0) { intr.colliders.splice(i, 1); info.removed++; }
        }
      }
      intr._decorHidden = true;
    }
  }

  // ── per-interior validation log (P7) ──
  if (n) console.info('[furnish] placed', n, 'pack-matched pieces across', furnished.size, 'interiors');
  for (const [id, info] of Object.entries(byInterior)) {
    const assetMode = info.placed.length > 0;
    console.info(
      `[furnish] ${id} ← ${info.pack} | assets:${assetMode ? 'ON' : 'OFF(fallback)'}` +
      ` | placed:${info.placed.length} | placeholders-removed:${info.removed} | failed:${info.failed.length}` +
      (info.failed.length ? ` [${info.failed.join(', ')}]` : '') +
      (info.warnings.length ? ` | ⚠ ${info.warnings.join('; ')}` : '')
    );
  }
  if (rejected.length) console.warn('[furnish] rejected:', rejected.join(', '));
  return { items: n, interiors: furnished.size, failed, rejected, byInterior };
}
