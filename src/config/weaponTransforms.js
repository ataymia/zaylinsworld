// ───────────────────────────────────────────────────────────────────────────
//  weaponTransforms.js — per-category + per-weapon placement transforms.
//
//  Two SEPARATE transform sets are defined for every weapon:
//    • hand    : how the model sits in the player's right hand (3rd person)
//    • display : how the model sits on the Block Supply wall/rack/shelf
//
//  Defaults are keyed by CATEGORY (so a brand-new asset in a known category gets
//  sensible placement with zero extra config). Individual weapon ids can override
//  any field via WEAPON_TRANSFORM_OVERRIDES. A pistol, rifle, shotgun, sniper and
//  bat CANNOT share one transform — each category is tuned independently.
//
//  All models are first normalized (longest axis → `fit` metres, recentred) by
//  the weapon system, so these offsets are applied to an already-normalized mesh.
// ───────────────────────────────────────────────────────────────────────────

// hand: pos [x,y,z] metres, rot [x,y,z] radians, fit = target longest-axis size,
//       muzzle = local muzzle point for tracers/flash.
// display: pos/rot/scaleMul relative to a wall slot, fit = display longest-axis.
export const CATEGORY_TRANSFORMS = {
  pistols: {
    hand:    { pos: [0.0, -0.02, 0.18], rot: [0, Math.PI, 0], fit: 0.34, muzzle: [0, 0.02, -0.22] },
    display: { pos: [0, 0, 0], rot: [0, -Math.PI / 2, 0], fit: 0.42 },
  },
  compact: {
    hand:    { pos: [0.0, -0.03, 0.20], rot: [0, Math.PI, 0], fit: 0.46, muzzle: [0, 0.02, -0.30] },
    display: { pos: [0, 0, 0], rot: [0, -Math.PI / 2, 0], fit: 0.55 },
  },
  rifles: {
    hand:    { pos: [0.02, -0.04, 0.26], rot: [0, Math.PI, 0], fit: 0.72, muzzle: [0, 0.02, -0.46] },
    display: { pos: [0, 0, 0], rot: [0, -Math.PI / 2, 0], fit: 0.9 },
  },
  shotguns: {
    hand:    { pos: [0.02, -0.04, 0.24], rot: [0, Math.PI, 0], fit: 0.66, muzzle: [0, 0.02, -0.42] },
    display: { pos: [0, 0, 0], rot: [0, -Math.PI / 2, 0], fit: 0.85 },
  },
  precision: {
    hand:    { pos: [0.02, -0.04, 0.30], rot: [0, Math.PI, 0], fit: 0.86, muzzle: [0, 0.02, -0.56] },
    display: { pos: [0, 0, 0], rot: [0, -Math.PI / 2, 0], fit: 1.05 },
  },
  heavy: {
    hand:    { pos: [0.04, -0.02, 0.28], rot: [0, Math.PI, 0], fit: 0.8, muzzle: [0, 0.04, -0.5] },
    display: { pos: [0, 0, 0], rot: [0, -Math.PI / 2, 0], fit: 1.0 },
  },
  melee: {
    hand:    { pos: [0.0, -0.08, 0.16], rot: [Math.PI * 0.15, 0, 0], fit: 0.6, muzzle: [0, -0.2, 0] },
    display: { pos: [0, 0, 0], rot: [0, 0, Math.PI * 0.12], fit: 0.7 },
  },
  tools: {
    hand:    { pos: [0.0, -0.06, 0.16], rot: [Math.PI * 0.1, 0, 0], fit: 0.5, muzzle: [0, -0.16, 0] },
    display: { pos: [0, 0, 0], rot: [0, 0, 0], fit: 0.55 },
  },
};

// Per-weapon fine overrides (merged over the category transform). Add an entry
// here only when a specific asset needs nudging — most weapons just use the
// category default.
export const WEAPON_TRANSFORM_OVERRIDES = {
  // example tuning hooks (kept conservative so nothing floats/clips by default)
  rocket_blast:  { hand: { fit: 0.78 } },
  plank_bonker:  { hand: { rot: [Math.PI * 0.2, 0, 0.1], fit: 0.7 } },
};

// Resolve the final hand/display transform for a catalog weapon. Always returns
// a fully-populated object so callers never have to null-check.
export function resolveTransform(weapon, which = 'hand') {
  const cat = CATEGORY_TRANSFORMS[weapon.category] || CATEGORY_TRANSFORMS.pistols;
  const base = cat[which] || cat.hand;
  const ov = (WEAPON_TRANSFORM_OVERRIDES[weapon.id] || {})[which] || {};
  return {
    pos: ov.pos || base.pos || [0, 0, 0],
    rot: ov.rot || base.rot || [0, 0, 0],
    fit: ov.fit ?? base.fit ?? 0.5,
    scaleMul: ov.scaleMul ?? base.scaleMul ?? 1,
    muzzle: ov.muzzle || base.muzzle || [0, 0, -0.2],
  };
}
