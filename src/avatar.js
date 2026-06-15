// ───────────────────────────────────────────────────────────────────────────
//  avatar.js — 3D avatar + Afrocentric hairstyle builder (low-poly / stylized)
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';

// ── Customization option data ────────────────────────────────────────────────
// Strong Black / African-American representation across the skin tone range.
export const SKIN_TONES = [
  { id: 'ebony',     name: 'Ebony',         color: '#3b2417' },
  { id: 'espresso',  name: 'Espresso',      color: '#4a2c1a' },
  { id: 'mahogany',  name: 'Mahogany',      color: '#5a3320' },
  { id: 'chestnut',  name: 'Chestnut',      color: '#6b3e25' },
  { id: 'umber',     name: 'Umber',         color: '#7a4a2c' },
  { id: 'caramel',   name: 'Caramel',       color: '#8a5634' },
  { id: 'honey',     name: 'Honey',         color: '#9c673f' },
  { id: 'amber',     name: 'Amber',         color: '#b07a4d' },
  { id: 'sand',      name: 'Sand',          color: '#c08a5c' },
  { id: 'tan',       name: 'Tan',           color: '#cf9d72' },
  { id: 'light',     name: 'Light',         color: '#e0b48c' },
  { id: 'fair',      name: 'Fair',          color: '#eac6a4' },
];

export const HAIR_COLORS = [
  { id: 'jet',    name: 'Jet Black',   color: '#15100c' },
  { id: 'black',  name: 'Black',       color: '#241a13' },
  { id: 'darkbr', name: 'Dark Brown',  color: '#3a2515' },
  { id: 'brown',  name: 'Brown',       color: '#5a3b20' },
  { id: 'auburn', name: 'Auburn',      color: '#6e3a1f' },
  { id: 'honey',  name: 'Honey Blonde',color: '#a9783f' },
  { id: 'blonde', name: 'Blonde',       color: '#c9ab66' },
  { id: 'gray',   name: 'Silver',      color: '#b9b9b9' },
  { id: 'red',    name: 'Dyed Red',    color: '#8a1f1f' },
  { id: 'blue',   name: 'Dyed Blue',   color: '#1f3a8a' },
  { id: 'purple', name: 'Dyed Purple', color: '#5a1f8a' },
  { id: 'frost',  name: 'Frosted Tips',color: '#d8d2c2' },
];

export const HAIRSTYLES = [
  { id: 'afro',           name: 'Afro' },
  { id: 'mini-afro',      name: 'Mini Afro' },
  { id: 'high-top-fade',  name: 'High Top Fade' },
  { id: 'low-fade',       name: 'Low Fade' },
  { id: 'taper-fade',     name: 'Taper Fade' },
  { id: 'burst-fade',     name: 'Burst Fade' },
  { id: 'waves',          name: '360 Waves' },
  { id: 'locs',           name: 'Locs / Dreads' },
  { id: 'starter-locs',   name: 'Starter Locs' },
  { id: 'twists',         name: 'Two-Strand Twists' },
  { id: 'cornrows',       name: 'Cornrows' },
  { id: 'braids',         name: 'Braids' },
  { id: 'sponge-curls',   name: 'Sponge Curls' },
  { id: 'bald-fade',      name: 'Bald Fade' },
  { id: 'lineup',         name: 'Lineup / Hairline' },
  { id: 'durag',          name: 'Durag / Wave Cap' },
  // ── real glTF hairstyles (Kenney mini-kit) — attached as modular assets ──
  { id: 'gltf-buzzed',    name: 'Buzz Cut (3D)' },
  { id: 'gltf-parted',    name: 'Side Part (3D)' },
  { id: 'gltf-long',      name: 'Long Hair (3D)' },
  { id: 'gltf-buns',      name: 'Space Buns (3D)' },
  { id: 'gltf-buzzed-f',  name: 'Tapered (3D)' },
];

// ── glTF hair attachment config (Kenney mini-kit) ───────────────────────────
// Each entry tells the attachment system which file to load and how to seat it
// on the avatar head. The loader auto-fits by the asset's OWN bounding box
// (re-centering onto the scalp anchor and scaling to head width), so the asset's
// original Kenney head-space position is discarded — this is what prevents hair
// from landing across the eyes. The per-asset values below fine-tune that fit.
//   anchor   : which head anchor to seat on (scalp_center | head_top | hairline_front | scalp_back)
//   scaleMul : multiply the auto-fit scale (1 = exact head-width fit)
//   seat     : fraction of the hair's own height to sink below the anchor so the
//              cap WRAPS the skull (0 = perches on top, 0.5 = half-buried/hugging)
//   yOffset  : raise(+)/lower(-) along the head's up axis, in meters (fine trim)
//   zOffset  : push forward(+)/back(-), in meters (keep small so it never covers the face)
//   rotX/Y/Z : extra rotation in radians
//   fallback : procedural HAIRSTYLES id rendered if the glTF fails to load/attach
// Values below are hand-tuned per style so each one sits ON the scalp — not
// floating, not sunk through the face, not over the eyes.
export const HAIR_GLTF = {
  // short caps hug close to the skull (higher seat), sit back a touch off the brow
  'gltf-buzzed':   { file: 'Hair_Buzzed.gltf',        name: 'Buzz Cut',  anchor: 'scalp_center', scaleMul: 1.08, seat: 0.62, yOffset: 0.02, zOffset: -0.02, rotX: 0, rotY: 0, rotZ: 0, fallback: 'low-fade' },
  'gltf-buzzed-f': { file: 'Hair_BuzzedFemale.gltf',  name: 'Tapered',   anchor: 'scalp_center', scaleMul: 1.08, seat: 0.60, yOffset: 0.02, zOffset: -0.02, rotX: 0, rotY: 0, rotZ: 0, fallback: 'taper-fade' },
  // side part has volume up top → seat a bit higher, nudge back so it clears the face
  'gltf-parted':   { file: 'Hair_SimpleParted.gltf',  name: 'Side Part', anchor: 'scalp_center', scaleMul: 1.10, seat: 0.50, yOffset: 0.03, zOffset: -0.03, rotX: 0, rotY: 0, rotZ: 0, fallback: 'taper-fade' },
  // long hair drapes down the back → lower seat, pushed back so it falls behind the head
  'gltf-long':     { file: 'Hair_Long.gltf',          name: 'Long Hair', anchor: 'scalp_center', scaleMul: 1.12, seat: 0.42, yOffset: 0.02, zOffset: -0.05, rotX: 0, rotY: 0, rotZ: 0, fallback: 'afro' },
  // buns sit on top of the crown → smaller, perched higher
  'gltf-buns':     { file: 'Hair_Buns.gltf',          name: 'Space Buns',anchor: 'scalp_center', scaleMul: 1.04, seat: 0.46, yOffset: 0.03, zOffset: -0.02, rotX: 0, rotY: 0, rotZ: 0, fallback: 'mini-afro' },
};
export function isGltfHair(id) { return typeof id === 'string' && id.startsWith('gltf-'); }

export const OUTFIT_TOPS = [
  { id: 'tee-white',  name: 'White Tee',    color: '#e8e8e8' },
  { id: 'tee-black',  name: 'Black Tee',    color: '#1c1c1c' },
  { id: 'hoodie-red', name: 'Red Hoodie',   color: '#b22b2b', hood: true },
  { id: 'hoodie-blue',name: 'Blue Hoodie',  color: '#2b4fb2', hood: true },
  { id: 'jersey-grn', name: 'Green Jersey', color: '#1f8a4c' },
  { id: 'jacket-tan', name: 'Tan Jacket',   color: '#9c7a4d' },
  { id: 'puffer-pur', name: 'Purple Puffer',color: '#5a2b8a', puffer: true },
];

export const OUTFIT_BOTTOMS = [
  { id: 'jeans-blue', name: 'Blue Jeans',   color: '#33415c' },
  { id: 'jeans-black',name: 'Black Jeans',  color: '#1c1c22' },
  { id: 'cargo-tan',  name: 'Tan Cargos',   color: '#8a7350' },
  { id: 'sweats-gray',name: 'Gray Sweats',  color: '#6b6b6b' },
  { id: 'shorts-red', name: 'Red Shorts',   color: '#a82b2b', short: true },
];

export const SHOES = [
  { id: 'sneak-white', name: 'White Sneakers', color: '#f0f0f0', sole: '#ffffff' },
  { id: 'sneak-black', name: 'Black Sneakers', color: '#161616', sole: '#2a2a2a' },
  { id: 'sneak-red',   name: 'Red Kicks',      color: '#c02626', sole: '#ffffff' },
  { id: 'boots-tan',   name: 'Tan Boots',      color: '#7a5a32', sole: '#3a2a1a' },
  { id: 'slides',      name: 'Slides',         color: '#222222', sole: '#222222' },
];

export const ACCESSORIES = [
  { id: 'none',     name: 'None' },
  { id: 'glasses',  name: 'Glasses' },
  { id: 'shades',   name: 'Shades' },
  { id: 'headband', name: 'Headband' },
  { id: 'earring',  name: 'Earrings' },
];

export const JEWELRY = [
  { id: 'none',  name: 'None' },
  { id: 'chain', name: 'Gold Chain' },
  { id: 'cuban', name: 'Cuban Link' },
  { id: 'iced',  name: 'Iced Pendant' },
];

export const BODY_SHAPES = [
  { id: 'slim',     name: 'Slim',     w: 0.86 },
  { id: 'average',  name: 'Average',  w: 1.0  },
  { id: 'athletic', name: 'Athletic', w: 1.12 },
  { id: 'heavy',    name: 'Heavy',    w: 1.28 },
];

export const HEIGHTS = [
  { id: 'short',   name: 'Short',   h: 0.9  },
  { id: 'average', name: 'Average', h: 1.0  },
  { id: 'tall',    name: 'Tall',    h: 1.1  },
];

export const FACES = [
  { id: 'round',  name: 'Round'  },
  { id: 'oval',   name: 'Oval'   },
  { id: 'square', name: 'Square' },
];

// Default customization
export function defaultCustom() {
  return {
    skin: 'umber',
    face: 'oval',
    body: 'average',
    height: 'average',
    hair: 'afro',
    hairColor: 'jet',
    top: 'hoodie-red',
    bottom: 'jeans-blue',
    shoes: 'sneak-white',
    accessory: 'none',
    jewelry: 'chain',
  };
}

// ── helpers ──────────────────────────────────────────────────────────────────
function find(list, id) { return list.find(o => o.id === id) || list[0]; }
function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: opts.rough ?? 0.85,
    metalness: opts.metal ?? 0.0,
    flatShading: opts.flat ?? true,
  });
}
function box(w, h, d, m) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); }
// rounded limb/segment — capsule (radius, straight length between caps)
function capsule(r, len, m) {
  return new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), m);
}

// ── Hair builder ─────────────────────────────────────────────────────────────
// Origin = centre of head. Head radius R≈0.26. Returns THREE.Group.
export function buildHair(styleId, colorHex) {
  const R = 0.26;
  const g = new THREE.Group();
  g.name = 'hair';
  // glTF hairstyles are attached asynchronously after the avatar is built
  // (see hairKit.js). Return a tagged mount point — but seat the configured
  // PROCEDURAL fallback style inside it RIGHT NOW so the avatar is never bald
  // (and never shows a floating asset) during/​after the async load. The
  // attach routine clears this placeholder when the real glTF hair is ready.
  if (isGltfHair(styleId)) {
    g.userData.gltfHair = styleId;
    const cfg = HAIR_GLTF[styleId];
    const fallbackId = (cfg && cfg.fallback) || 'taper-fade';
    const placeholder = buildHair(fallbackId, colorHex);
    placeholder.name = 'hair-placeholder:' + styleId;
    g.add(placeholder);
    return g;
  }
  const hm = mat(colorHex, { rough: 0.95 });
  const fadeM = mat(new THREE.Color(colorHex).multiplyScalar(0.6).getStyle(), { rough: 0.95 });

  // shared: short faded sides — an UPPER dome that caps the skull above the brow
  // line only, so it wraps the top/back of the head and never shells the face.
  const sides = () => {
    const s = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.06, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), fadeM);
    s.scale.set(1, 1.04, 1.02);
    s.position.set(0, R * 0.2, -R * 0.04);
    return s;
  };
  const skullCap = (scaleY = 1.0, up = 0.18, rough = 0.95) => {
    const c = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.06, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), hm);
    c.scale.set(1, scaleY, 1);
    c.position.y = R * up;
    return c;
  };

  switch (styleId) {
    case 'afro': {
      // big rounded crown seated ABOVE the brows and pushed slightly back so it
      // wraps the skull instead of hanging down over the face.
      const fro = new THREE.Mesh(new THREE.IcosahedronGeometry(R * 1.5, 2), hm);
      fro.scale.set(1.08, 1.02, 1.0);
      fro.position.set(0, R * 1.2, -R * 0.15);
      g.add(fro, sides());
      break;
    }
    case 'mini-afro': {
      const fro = new THREE.Mesh(new THREE.IcosahedronGeometry(R * 1.12, 2), hm);
      fro.scale.set(1.06, 1.0, 1.0);
      fro.position.set(0, R * 1.05, -R * 0.12);
      g.add(fro, sides());
      break;
    }
    case 'high-top-fade': {
      const top = box(R * 1.7, R * 1.5, R * 1.7, hm);
      top.position.y = R * 1.15;
      // round the top corners a touch with a cap
      const cap = new THREE.Mesh(new THREE.BoxGeometry(R * 1.7, R * 0.4, R * 1.7), hm);
      cap.position.y = R * 1.9;
      g.add(top, cap, sides());
      break;
    }
    case 'low-fade': {
      const c = skullCap(0.7, 0.22);
      g.add(c, sides());
      break;
    }
    case 'taper-fade': {
      const c = skullCap(0.82, 0.3);
      const bump = new THREE.Mesh(new THREE.SphereGeometry(R * 0.9, 14, 10), hm);
      bump.scale.set(1, 0.6, 1); bump.position.set(0, R * 0.75, R * 0.1);
      g.add(c, bump, sides());
      break;
    }
    case 'burst-fade': {
      const c = skullCap(0.8, 0.28);
      // bursts curving down behind the ears
      [-1, 1].forEach(sx => {
        const burst = new THREE.Mesh(new THREE.SphereGeometry(R * 0.55, 12, 10), hm);
        burst.position.set(sx * R * 0.85, -R * 0.1, -R * 0.2);
        g.add(burst);
      });
      g.add(c);
      break;
    }
    case 'waves': {
      const c = skullCap(0.55, 0.1);
      // concentric wave rings (360 waves)
      for (let i = 1; i <= 4; i++) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(R * 0.28 * i, R * 0.045, 8, 24), fadeM);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = R * (0.55 - i * 0.1);
        g.add(ring);
      }
      g.add(c, sides());
      break;
    }
    case 'locs': {
      g.add(skullCap(0.6, 0.12));
      const n = 26;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const len = R * (2.4 + Math.random() * 1.6);
        const loc = new THREE.Mesh(
          new THREE.CylinderGeometry(R * 0.09, R * 0.07, len, 6), hm);
        const rad = R * (0.7 + Math.random() * 0.25);
        loc.position.set(Math.cos(a) * rad, R * 0.25 - len / 2, Math.sin(a) * rad);
        loc.rotation.z = Math.cos(a) * 0.25;
        loc.rotation.x = Math.sin(a) * 0.25;
        g.add(loc);
      }
      break;
    }
    case 'starter-locs': {
      g.add(skullCap(0.6, 0.14));
      const n = 34;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const t = Math.random() * Math.PI * 0.5;
        const r = R * 1.05;
        const knot = new THREE.Mesh(new THREE.SphereGeometry(R * 0.16, 8, 6), hm);
        knot.position.set(
          Math.sin(t) * Math.cos(a) * r,
          Math.cos(t) * r * 0.85 + R * 0.1,
          Math.sin(t) * Math.sin(a) * r);
        g.add(knot);
      }
      break;
    }
    case 'twists': {
      g.add(skullCap(0.6, 0.12));
      const n = 18;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const len = R * 2.2;
        const strand = new THREE.Group();
        for (let s = 0; s < 5; s++) {
          const seg = new THREE.Mesh(new THREE.SphereGeometry(R * 0.11, 6, 6), hm);
          seg.position.set(Math.sin(s * 1.6) * R * 0.06, -s * (len / 5), 0);
          strand.add(seg);
        }
        const rad = R * 0.75;
        strand.position.set(Math.cos(a) * rad, R * 0.25, Math.sin(a) * rad);
        strand.rotation.z = Math.cos(a) * 0.2;
        strand.rotation.x = Math.sin(a) * 0.2;
        g.add(strand);
      }
      break;
    }
    case 'cornrows': {
      const c = skullCap(0.5, 0.08);
      g.add(c);
      const rows = 6;
      for (let r = 0; r < rows; r++) {
        const x = (r - (rows - 1) / 2) * (R * 0.32);
        const row = new THREE.Group();
        for (let s = 0; s < 7; s++) {
          const z = -R * 0.9 + s * (R * 1.8 / 6);
          const yArc = Math.cos((s / 6 - 0.5) * Math.PI) * R * 0.95;
          const bead = new THREE.Mesh(new THREE.SphereGeometry(R * 0.1, 6, 6), hm);
          bead.position.set(x, yArc, z);
          row.add(bead);
        }
        g.add(row);
      }
      break;
    }
    case 'braids': {
      g.add(skullCap(0.5, 0.08));
      const n = 12;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const len = R * 3.2;
        const braid = new THREE.Group();
        for (let s = 0; s < 8; s++) {
          const seg = new THREE.Mesh(new THREE.SphereGeometry(R * 0.12, 6, 6), hm);
          seg.position.set(0, -s * (len / 8), 0);
          seg.scale.set(1, 0.8, 1);
          braid.add(seg);
        }
        const rad = R * 0.82;
        braid.position.set(Math.cos(a) * rad, R * 0.2, Math.sin(a) * rad);
        braid.rotation.z = Math.cos(a) * 0.3;
        braid.rotation.x = Math.sin(a) * 0.3;
        g.add(braid);
      }
      break;
    }
    case 'sponge-curls': {
      g.add(skullCap(0.55, 0.12));
      const n = 60;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const t = Math.random() * Math.PI * 0.55;
        const r = R * 1.15;
        const curl = new THREE.Mesh(new THREE.SphereGeometry(R * 0.17, 6, 6), hm);
        curl.position.set(
          Math.sin(t) * Math.cos(a) * r,
          Math.cos(t) * r * 0.85 + R * 0.18,
          Math.sin(t) * Math.sin(a) * r);
        g.add(curl);
      }
      break;
    }
    case 'bald-fade': {
      const c = skullCap(0.32, 0.05);
      c.material = fadeM;
      g.add(c);
      break;
    }
    case 'lineup': {
      // a clean cap that hugs the scalp with a crisp hairline edge that sits at
      // the top of the forehead — NOT a plate stuck across the face.
      const c = skullCap(0.5, 0.16);
      const front = box(R * 1.46, R * 0.1, R * 0.16, hm);
      front.position.set(0, R * 0.66, R * 0.74);
      g.add(c, front, sides());
      break;
    }
    case 'durag': {
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(R * 1.12, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.7),
        mat(colorHex, { rough: 0.35, metal: 0.1 }));
      cap.scale.set(1, 0.95, 1.05);
      cap.position.y = R * 0.12;
      // flowing tail at the back
      const tail = box(R * 0.9, R * 0.05, R * 1.6, cap.material);
      tail.position.set(0, R * 0.0, -R * 1.1);
      tail.rotation.x = -0.25;
      // straps
      [-1, 1].forEach(sx => {
        const strap = box(R * 1.4, R * 0.12, R * 0.12, cap.material);
        strap.position.set(0, R * 0.3, R * 0.1);
        strap.rotation.y = sx * 0.2;
        g.add(strap);
      });
      g.add(cap, tail);
      break;
    }
    default:
      g.add(skullCap(0.7, 0.2), sides());
  }
  return g;
}

// ── Full avatar builder ──────────────────────────────────────────────────────
// Returns { group, parts } where parts holds animatable references.
export function buildAvatar(custom) {
  const c = custom || defaultCustom();
  const skin = find(SKIN_TONES, c.skin).color;
  const bodyW = find(BODY_SHAPES, c.body).w;
  const heightMul = find(HEIGHTS, c.height).h;
  const topDef = find(OUTFIT_TOPS, c.top);
  const botDef = find(OUTFIT_BOTTOMS, c.bottom);
  const shoeDef = find(SHOES, c.shoes);
  const hairColor = find(HAIR_COLORS, c.hairColor).color;

  const skinM = mat(skin, { rough: 0.55, flat: false });
  const topM = mat(topDef.color, { rough: 0.78, flat: false });
  const botM = mat(botDef.color, { rough: 0.78, flat: false });

  const root = new THREE.Group();
  root.name = 'avatar';

  // proportions (origin at feet)
  const hipY = 0.84;
  const torsoH = 0.6, torsoW = 0.5 * bodyW, torsoD = 0.28 * bodyW;
  const torsoCY = hipY + torsoH / 2;
  const shoulderY = hipY + torsoH;
  const headR = 0.26;
  const headCY = shoulderY + 0.12 + headR;

  // torso — rounded, slightly tapered chest (capsule flattened front-to-back)
  const torso = capsule(torsoW * 0.5, torsoH * 0.7, topM);
  torso.scale.set(1, 1, (torsoD / torsoW) * 1.1);
  torso.position.y = torsoCY;
  root.add(torso);
  // chest / shoulder mass for a less tubular silhouette
  const chest = new THREE.Mesh(new THREE.SphereGeometry(torsoW * 0.54, 16, 12), topM);
  chest.scale.set(1, 0.62, (torsoD / torsoW) * 1.15);
  chest.position.y = shoulderY - 0.08;
  root.add(chest);
  if (topDef.hood) {
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12,
      0, Math.PI * 2, 0, Math.PI * 0.6), topM);
    hood.scale.set(1.25, 0.85, 1.25);
    hood.position.set(0, shoulderY + 0.02, -0.05);
    root.add(hood);
  }

  // pelvis / bottoms — rounded hips
  const isShort = !!botDef.short;
  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(torsoW * 0.5, 16, 12), botM);
  pelvis.scale.set(1, 0.6, (torsoD / torsoW) * 1.05);
  pelvis.position.y = hipY - 0.02;
  root.add(pelvis);

  // neck
  const neck = capsule(0.085, 0.1, skinM);
  neck.position.y = shoulderY + 0.08;
  root.add(neck);

  // head group (head + face + hair)
  const headGroup = new THREE.Group();
  headGroup.position.y = headCY;
  const head = new THREE.Mesh(new THREE.SphereGeometry(headR, 24, 20), skinM);
  if (c.face === 'square') head.scale.set(1.0, 1.02, 0.95);
  else if (c.face === 'round') head.scale.set(1.05, 0.98, 1.0);
  else head.scale.set(0.96, 1.08, 0.96); // oval
  headGroup.add(head);
  // jaw / chin for a more human profile
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.7, 16, 12), skinM);
  jaw.scale.set(0.92, 0.7, 0.86);
  jaw.position.set(0, -headR * 0.55, headR * 0.12);
  headGroup.add(jaw);
  // ears
  [-1, 1].forEach(sx => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.2, 10, 8), skinM);
    ear.scale.set(0.5, 1, 0.8);
    ear.position.set(sx * headR * 0.96, 0, 0);
    headGroup.add(ear);
  });

  // simple face: eyes + nose + smile
  const eyeM = mat('#ffffff', { rough: 0.3 });
  const pupM = mat('#1a120c', { rough: 0.2 });
  [-1, 1].forEach(sx => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.18, 10, 8), eyeM);
    eye.position.set(sx * headR * 0.38, headR * 0.12, headR * 0.86);
    eye.scale.set(1, 1.2, 0.6);
    const pup = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.09, 8, 6), pupM);
    pup.position.set(sx * headR * 0.38, headR * 0.12, headR * 0.96);
    headGroup.add(eye, pup);
  });
  const browM = mat(hairColor, { rough: 0.9 });
  [-1, 1].forEach(sx => {
    const brow = box(headR * 0.32, headR * 0.07, headR * 0.1, browM);
    brow.position.set(sx * headR * 0.38, headR * 0.34, headR * 0.92);
    headGroup.add(brow);
  });
  const nose = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.13, 8, 6), skinM);
  nose.position.set(0, -headR * 0.05, headR * 0.98);
  nose.scale.set(0.9, 0.9, 0.9);
  headGroup.add(nose);
  const mouth = box(headR * 0.4, headR * 0.07, headR * 0.06, mat('#5a2d2d'));
  mouth.position.set(0, -headR * 0.4, headR * 0.9);
  headGroup.add(mouth);

  // hair
  const hairGroup = buildHair(c.hair, hairColor);
  headGroup.add(hairGroup);
  root.add(headGroup);

  // ── attachment anchors (named empties) ──────────────────────────────────────
  // Head anchors live under headGroup so they track the head; body anchors live
  // under root. Hair seats on scalp anchors; jewelry seats on neck/chest anchors.
  const anchors = {};
  const mkAnchor = (name, parent, x, y, z) => {
    const a = new THREE.Object3D();
    a.name = 'anchor:' + name;
    a.position.set(x, y, z);
    parent.add(a);
    anchors[name] = a;
    return a;
  };
  mkAnchor('head_top',       headGroup, 0, headR,        0);
  mkAnchor('scalp_center',   headGroup, 0, headR * 0.45, 0);
  mkAnchor('hairline_front', headGroup, 0, headR * 0.25, headR * 0.85);
  mkAnchor('scalp_back',     headGroup, 0, headR * 0.35, -headR * 0.7);
  mkAnchor('neck',           root, 0, shoulderY + 0.04, torsoD * 0.18);
  mkAnchor('upper_chest',    root, 0, shoulderY - 0.16, torsoD * 0.55);

  // ── limbs with joint pivots for walk animation ──
  const upperArmM = topM; // sleeves
  const makeArm = (sx) => {
    const pivot = new THREE.Group();
    pivot.position.set(sx * (torsoW / 2 + 0.04), shoulderY - 0.04, 0);
    // shoulder cap
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.1 * bodyW, 12, 10), upperArmM);
    const upper = capsule(0.075 * bodyW, 0.26, upperArmM);
    upper.position.y = -0.18;
    const fore = capsule(0.062 * bodyW, 0.24, skinM);
    fore.position.y = -0.46;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), skinM);
    hand.scale.set(1, 1.2, 0.7);
    hand.position.y = -0.64;
    pivot.add(shoulder, upper, fore, hand);
    return pivot;
  };
  const leftArm = makeArm(-1), rightArm = makeArm(1);
  root.add(leftArm, rightArm);
  // Dedicated grip anchor seated in the right fist so held weapons sit IN the
  // hand instead of floating off the wrist. mountHeldWeapon() attaches here and
  // applies the per-category grip transform relative to this point.
  mkAnchor('right_hand', rightArm, 0.02, -0.66, 0.10);

  const shoeM = mat(shoeDef.color, { rough: 0.5, flat: false });
  const soleM = mat(shoeDef.sole, { rough: 0.5, flat: false });
  const makeLeg = (sx) => {
    const pivot = new THREE.Group();
    pivot.position.set(sx * (torsoW * 0.26), hipY - 0.04, 0);
    const legLen = isShort ? 0.42 : 0.78;
    const thigh = capsule(0.092 * bodyW, legLen * 0.4, botM);
    thigh.position.y = -legLen * 0.28;
    const shin = capsule(0.072 * bodyW, legLen * 0.36, isShort ? skinM : botM);
    shin.position.y = -legLen * 0.72;
    // shoe — rounded toe
    const shoe = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.16, 5, 12), shoeM);
    shoe.rotation.z = Math.PI / 2; shoe.rotation.y = Math.PI / 2;
    shoe.scale.set(1, 1, 0.9);
    shoe.position.set(0, -legLen - 0.04, 0.08);
    const sole = box(0.2, 0.05, 0.36, soleM);
    sole.position.set(0, -legLen - 0.1, 0.07);
    pivot.add(thigh, shin, shoe, sole);
    return pivot;
  };
  const leftLeg = makeLeg(-1), rightLeg = makeLeg(1);
  root.add(leftLeg, rightLeg);

  // ── jewelry ──
  // Seated on the neck + upper_chest anchors so the chain rests around the
  // collar (not inside the torso) and the pendant hangs centered on the chest.
  if (c.jewelry && c.jewelry !== 'none') {
    const isWhite = c.jewelry === 'iced';
    const goldM = new THREE.MeshPhysicalMaterial({
      color: isWhite ? '#e8edf2' : '#f4cf5a',
      metalness: 1, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.6 });
    const gemM = new THREE.MeshPhysicalMaterial({
      color: '#ffffff', metalness: 0, roughness: 0, transmission: 0.9, ior: 2.4,
      thickness: 0.4, clearcoat: 1, clearcoatRoughness: 0, envMapIntensity: 2.0,
      emissive: '#bfe3ff', emissiveIntensity: 0.12 });
    const isCuban = c.jewelry === 'cuban';
    const tube = isCuban ? 0.04 : 0.028;
    const links = isCuban ? 26 : 32;

    // Chain group anchored at the neck. Links form an open collar (a U that
    // hugs the front of the neck and dips to the sternum at the front-center).
    const chainGroup = new THREE.Group();
    const collar = anchors.neck.position;          // root-space neck base
    const radX = isCuban ? 0.17 : 0.15;            // half-width across the collar
    const radZ = 0.13;                             // front reach over the chest
    const drop = 0.16;                             // how far the front dips
    for (let i = 0; i < links; i++) {
      // sweep from one shoulder, around the front, to the other shoulder
      const tParam = i / (links - 1);              // 0..1
      const ang = Math.PI * (0.15 + tParam * 0.7); // front arc only
      const x = Math.cos(ang) * radX * (ang < Math.PI / 2 ? 1 : -1) * 0 + (tParam - 0.5) * 2 * radX;
      const front = Math.sin(Math.PI * tParam);    // 0 at sides, 1 at front-center
      const link = new THREE.Mesh(new THREE.TorusGeometry(tube * 1.4, tube * 0.55, 6, 12), goldM);
      link.position.set(
        x,
        collar.y - drop * front - 0.02,
        collar.z + radZ * front);
      link.rotation.x = Math.PI / 2;
      link.rotation.z = (tParam - 0.5) * 1.2;
      if (i % 2) link.rotation.y = Math.PI / 2;
      chainGroup.add(link);
    }
    root.add(chainGroup);

    // Pendant — hangs centered on the upper chest for every chain type.
    const pend = new THREE.Group();
    if (c.jewelry === 'iced') {
      const setting = new THREE.Mesh(new THREE.OctahedronGeometry(0.085, 0), goldM);
      pend.add(setting);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.03, 0), gemM);
        gem.position.set(Math.cos(a) * 0.06, Math.sin(a) * 0.06, 0.02);
        pend.add(gem);
      }
      const center = new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 0), gemM);
      center.position.z = 0.03; pend.add(center);
    } else {
      // simple dog-tag / medallion pendant for chain + cuban
      const tag = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16), goldM);
      tag.rotation.x = Math.PI / 2;
      pend.add(tag);
      const bail = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.008, 6, 10), goldM);
      bail.position.y = 0.055; bail.rotation.x = Math.PI / 2;
      pend.add(bail);
    }
    const chest = anchors.upper_chest.position;
    // Hang the pendant on the sternum (a touch below the chain's front dip) and
    // push it out to follow the chest curve so it rests ON the chest, never
    // buried in the middle of the torso.
    const pendY = chest.y - 0.10;
    const pendZ = chest.z + 0.04;
    pend.position.set(0, pendY, pendZ);
    root.add(pend);

    // Thin drop-cord linking the chain's front-center dip to the pendant bail so
    // the piece visibly hangs instead of floating.
    const cordTopY = collar.y - drop - 0.02;
    const cordBotY = pendY + 0.06;
    const cord = new THREE.Mesh(
      new THREE.CylinderGeometry(tube * 0.4, tube * 0.4, Math.max(0.02, cordTopY - cordBotY), 6),
      goldM);
    cord.position.set(0, (cordTopY + cordBotY) / 2, (collar.z + radZ + pendZ) / 2);
    root.add(cord);
  }

  // ── accessories ──
  if (c.accessory && c.accessory !== 'none') {
    if (c.accessory === 'glasses' || c.accessory === 'shades') {
      const lensM = c.accessory === 'shades'
        ? mat('#0a0a0a', { rough: 0.1, metal: 0.4 })
        : mat('#222', { rough: 0.2 });
      [-1, 1].forEach(sx => {
        const lens = box(headR * 0.34, headR * 0.28, headR * 0.05, lensM);
        lens.position.set(sx * headR * 0.38, headR * 0.12, headR * 1.0);
        headGroup.add(lens);
      });
      const bridge = box(headR * 0.2, headR * 0.05, headR * 0.05, lensM);
      bridge.position.set(0, headR * 0.12, headR * 1.0);
      headGroup.add(bridge);
    }
    if (c.accessory === 'headband') {
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(headR * 1.02, headR * 0.12, 8, 20), mat('#b22b2b'));
      band.rotation.x = Math.PI / 2; band.position.y = headR * 0.45;
      headGroup.add(band);
    }
    if (c.accessory === 'earring') {
      [-1, 1].forEach(sx => {
        const e = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.08, 8, 6),
          mat('#e7c14a', { rough: 0.2, metal: 0.9 }));
        e.position.set(sx * headR * 0.98, -headR * 0.25, 0);
        headGroup.add(e);
      });
    }
  }

  root.scale.set(1, heightMul, 1);
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  return {
    group: root,
    parts: { leftArm, rightArm, leftLeg, rightLeg, headGroup, hairGroup, torso, anchors },
    eyeHeight: headCY * heightMul,
  };
}
