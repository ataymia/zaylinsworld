// ───────────────────────────────────────────────────────────────────────────
//  furnish.js — dress the walkable interiors with uploaded GLB/glTF packs.
//
//  Each interior is a room centred on its offset (interiors.byId[id].offset)
//  with the door on the +Z (front) wall. We add a curated set of models toward
//  the back/side walls (clear of the spawn + doorway) so uploaded art is clearly
//  visible without trapping the player. Pieces are decorative (no colliders).
//  Failures are skipped — the procedural room stays.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { loadAsset } from './assets.js';

// ── STRICT per-interior allowlists ──────────────────────────────────────────
// Each interior id maps to EXACTLY ONE approved asset pack (cat/pack) plus a
// `unit` factor that converts the pack's native units to METRES. The Restaurant
// + Gym packs are authored in CENTIMETRES (1 unit ≈ 1 cm) — at scale 1 a stove
// becomes a 180 m white blob — so they use unit 0.01. Furniture/classroom/food
// are already close to metres.
const INTERIOR_PACK = {
  home:    { cat: 'interiors', pack: 'furniture',  unit: 1.0  },
  kicks:   { cat: 'interiors', pack: 'furniture',  unit: 1.0  },
  gym:     { cat: 'interiors', pack: 'gym',        unit: 0.01 },   // cm pack
  school:  { cat: 'interiors', pack: 'classroom',  unit: 1.0  },   // real school pack, not kitchen/dining furniture
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
  // so the open centre and the spawn/door path (front, +z) stay clear.
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
  // SCHOOL — classroom-pack ONLY. No generic dining tables/chairs. The pack has
  // real classroom pieces: chairtable combos, blackboards, lockers, books,
  // pencil cases, chalk, markers, shelf, and a teacher desk.
  school: [
    { name: 'blackboardbig',       dx: 0,    dz: -6.45, ry: 0,           s: 1.0 },
    { name: 'desk',                dx: 0,    dz: -4.5,  ry: Math.PI,     s: 1.0, surface: true },
    { name: 'chair',               dx: 0,    dz: -3.35, ry: 0,           s: 1.0 },
    { name: 'chairtable',          dx: -4.8, dz: -1.2,  ry: 0,           s: 1.0, surface: true },
    { name: 'chairtable',          dx: -2.4, dz: -1.2,  ry: 0,           s: 1.0, surface: true },
    { name: 'chairtable',          dx: 0,    dz: -1.2,  ry: 0,           s: 1.0, surface: true },
    { name: 'chairtable',          dx: 2.4,  dz: -1.2,  ry: 0,           s: 1.0, surface: true },
    { name: 'chairtable',          dx: 4.8,  dz: -1.2,  ry: 0,           s: 1.0, surface: true },
    { name: 'chairtable',          dx: -4.8, dz: 1.2,   ry: 0,           s: 1.0, surface: true },
    { name: 'chairtable',          dx: -2.4, dz: 1.2,   ry: 0,           s: 1.0, surface: true },
    { name: 'chairtable',          dx: 0,    dz: 1.2,   ry: 0,           s: 1.0, surface: true },
    { name: 'chairtable',          dx: 2.4,  dz: 1.2,   ry: 0,           s: 1.0, surface: true },
    { name: 'chairtable',          dx: 4.8,  dz: 1.2,   ry: 0,           s: 1.0, surface: true },
    { name: 'locker',              dx: -8.35, dz: -3.8, ry: Math.PI / 2, s: 1.0 },
    { name: 'locker-001',          dx: -8.35, dz: -1.8, ry: Math.PI / 2, s: 1.0 },
    { name: 'shelf',               dx: 8.15,  dz: -3.8, ry: -Math.PI / 2, s: 1.0 },
    { name: 'book',                dx: -2.4, dz: -1.2, ry: 0,            s: 1.0, onSurface: true, surfaceFallback: 0.82 },
    { name: 'book-001',            dx: 0,    dz: 1.2,  ry: 0,            s: 1.0, onSurface: true, surfaceFallback: 0.82 },
    { name: 'pencilcase',          dx: 2.4,  dz: -1.2, ry: 0,            s: 1.0, onSurface: true, surfaceFallback: 0.82 },
    { name: 'chalk',               dx: -1.2, dz: -4.5, ry: 0,            s: 1.0, onSurface: true, surfaceFallback: 0.9 },
    { name: 'markers',             dx: 1.2,  dz: -4.5, ry: 0,            s: 1.0, onSurface: true, surfaceFallback: 0.9 },
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
    { name: 'counter-front',   dx: -1.05, dz: -3.2, ry: 0,           s: 1.0, surface: true, tint: '#b5651d' },
    { name: 'counter-front',   dx: 0,     dz: -3.2, ry: 0,           s: 1.0, surface: true, tint: '#b5651d' },
    { name: 'counter-front',   dx: 1.05,  dz: -3.2, ry: 0,           s: 1.0, surface: true, tint: '#b5651d' },
    { name: 'cash-register',   dx: 0.9,   dz: -3.2, ry: Math.PI,     s: 1.0, onSurface: true, surfaceFallback: 0.96, tint: '#2a2a2e' },
    { name: 'heat-lamp-tray-grill', dx: -0.9, dz: -3.2, ry: 0,       s: 1.0, onSurface: true, surfaceFallback: 0.96, tint: '#c0392b' },
    { name: 'stove-griddle',   dx: -3.5,  dz: -4.4, ry: 0,           s: 1.0, surface: true, tint: '#8a9099' },
    { name: 'burner-stove',    dx: -5.6,  dz: -4.4, ry: 0,           s: 1.0, surface: true, tint: '#8a9099' },
    { name: 'booth-full',      dx: -5.6,  dz: 2,    ry: Math.PI / 2, s: 1.0, tint: '#7a1f2b' },
    { name: 'booth-half',      dx: -5.6,  dz: 4.2,  ry: Math.PI / 2, s: 1.0, tint: '#7a1f2b' },
    { name: 'table-square',    dx: 4.5,   dz: 1.6,  ry: 0,           s: 1.0, surface: true, tint: '#caa37a' },
    { name: 'chair-red',       dx: 4.5,   dz: 2.5,  ry: Math.PI,     s: 1.0, tint: '#c0392b' },
    { name: 'chair-red',       dx: 4.5,   dz: 0.7,  ry: 0,           s: 1.0, tint: '#c0392b' },
    { name: 'table-circle',    dx: 1.6,   dz: 3.8,  ry: 0,           s: 1.0, surface: true, tint: '#caa37a' },
    { name: 'chair-red',       dx: 0.7,   dz: 3.8,  ry: Math.PI / 2, s: 1.0, tint: '#c0392b' },
    { name: 'chair-red',       dx: 2.5,   dz: 3.8,  ry: -Math.PI / 2, s: 1.0, tint: '#c0392b' },
  ],
};

// Food props (small GLBs, already in metres → unit 1) on the counter + tables.
// Each snaps onto a placed support surface; surfaceFallback gives a safe resting
// height so food never floats or dumps on the floor if the snap is missed.
const FOOD_UNIT = 1.0;
const FOOD = {
  chicken: [
    { name: 'chicken-cooking-a', dx: -3.5, dz: -4.4, s: 2.0, onSurface: true, surfaceFallback: 1.1 },
    { name: 'fried-chicken',     dx: 0.2,  dz: -3.2, s: 2.4, onSurface: true, surfaceFallback: 0.96 },
    { name: 'french-fries',      dx: 4.5,  dz: 1.6,  s: 2.4, onSurface: true, surfaceFallback: 0.87 },
    { name: 'chicken-nuggets',   dx: 1.6,  dz: 3.8,  s: 2.4, onSurface: true, surfaceFallback: 0.86 },
  ],
};

// When a pack's textures fail to embed, GLB meshes load as a default flat
// near-white/grey material (the Restaurant pack was converted to a single
// `DefaultMaterial` at colour 0.8,0.8,0.8 with NO textures — so it renders as a
// white-out). Detect that (no map + desaturated light colour) and apply the
// item's `tint` so the restaurant reads as real surfaces. Properly textured
// packs are left alone. Returns the number of materials recoloured.
function applyMaterialFallback(obj, item) {
  if (!item.tint) return 0;
  let n = 0;
  obj.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const mm of mats) {
      if (mm.map) continue;
      const c = mm.color;
      if (!c) continue;
      const mx = Math.max(c.r, c.g, c.b), mn = Math.min(c.r, c.g, c.b);
      const lightGrey = mx >= 0.6 && (mx - mn) <= 0.12;
      if (lightGrey) { mm.color = new THREE.Color(item.tint); mm.needsUpdate = true; n++; }
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
      const M = 0.4;
      let top = -Infinity;
      for (const sb of supports) {
        if (px >= sb.min.x - M && px <= sb.max.x + M && pz >= sb.min.z - M && pz <= sb.max.z + M) {
          top = Math.max(top, sb.max.y);
        }
      }
      baseY = (top > -Infinity) ? top : (item.surfaceFallback ?? baseY);
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
    const supports = [];
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
