// ───────────────────────────────────────────────────────────────────────────
//  propPrefabs.js — small reusable prop/cluster prefabs (Phase 2D)
//
//  A prop prefab is a tiny placeable: a variation pool + collision metadata +
//  optional procedural fallback descriptor (so a missing asset still draws a
//  clean mesh, never a debug blob). Clusters group props that read well together
//  (e.g. a trash pile = bags + a can). The town builder uses these with the
//  placement rules to dress the existing town.
//
//  Pure data (no THREE/DOM).
// ───────────────────────────────────────────────────────────────────────────

export const PROP_PREFABS = {
  trash_bag: {
    pool: 'trash', collisionType: 'soft', scaleMax: 0.7,
    fallback: { kind: 'trashbag', color: '#2b2b30', size: [0.5, 0.4, 0.5] },
  },
  trash_can: {
    pool: 'trash', collisionType: 'breakable', scaleMax: 0.9, mass: 4,
    fallback: { kind: 'can', color: '#3a4a42', size: [0.5, 0.9, 0.5] },
  },
  dumpster: {
    pool: 'dumpster', collisionType: 'hard', scaleMax: 2.4,
    fallback: { kind: 'dumpster', color: '#2c5a3c', size: [2.0, 1.3, 1.1] },
  },
  street_cone: {
    pool: 'street_dressing', collisionType: 'breakable', scaleMax: 0.6, mass: 2,
    fallback: { kind: 'cone', color: '#e8731c', size: [0.4, 0.6, 0.4] },
  },
  gas_pump: {
    pool: 'gas_pump', collisionType: 'hard', scaleMax: 1.6,
    fallback: { kind: 'pump', color: '#e6e9ef', size: [0.7, 1.5, 0.5] },
  },
  weapon_display: {
    pool: 'weapon_wall', collisionType: 'none', scaleMax: 0.8, wallMounted: true,
    fallback: { kind: 'weapon', color: '#3a3f55', size: [0.9, 0.18, 0.12] },
  },
  pistol_display: {
    pool: 'pistol_wall', collisionType: 'none', scaleMax: 0.4, wallMounted: true,
    fallback: { kind: 'pistol', color: '#444a60', size: [0.4, 0.12, 0.1] },
  },
  melee_display: {
    pool: 'melee_rack', collisionType: 'none', scaleMax: 0.9, wallMounted: true,
    fallback: { kind: 'melee', color: '#6b5030', size: [0.1, 0.9, 0.1] },
  },
  ammo_box: {
    pool: 'ammo_shelf', collisionType: 'blocker', scaleMax: 0.5,
    fallback: { kind: 'ammobox', color: '#5a5030', size: [0.5, 0.35, 0.35] },
  },
  jewelry_case: {
    pool: 'jewelry_case', collisionType: 'blocker', scaleMax: 1.2,
    fallback: { kind: 'case', color: '#1a2740', size: [2.0, 1.0, 0.8] },
  },
  classroom_desk: {
    pool: 'classroom_desk', collisionType: 'blocker', scaleMax: 1.1,
    fallback: { kind: 'desk', color: '#7a5a3a', size: [1.0, 0.75, 0.6] },
  },
  gym_machine: {
    pool: 'gym_equipment', collisionType: 'blocker', scaleMax: 1.6,
    fallback: { kind: 'machine', color: '#3a3f48', size: [1.2, 1.4, 0.8] },
  },
  display_car: {
    pool: 'display_car', collisionType: 'vehicle', scaleMax: 4.4,
    fallback: { kind: 'car', color: '#888e99', size: [1.9, 1.3, 4.2] },
  },
};

// Clusters that read well together (the builder places these as a unit).
export const PROP_CLUSTERS = {
  trash_pile: [
    { prefab: 'trash_bag', count: 3, jitter: 0.6 },
    { prefab: 'trash_can', count: 1, jitter: 0.2 },
  ],
  alley_corner: [
    { prefab: 'dumpster', count: 1, jitter: 0 },
    { prefab: 'trash_bag', count: 4, jitter: 0.8 },
  ],
};

export function propPrefab(id) { return PROP_PREFABS[id] || null; }

export default { PROP_PREFABS, PROP_CLUSTERS, propPrefab };
