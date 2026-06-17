// ───────────────────────────────────────────────────────────────────────────
//  blockSupplyLayout.js — physical display layout for the Block Supply store.
//
//  Defines named display ZONES (walls/racks/shelves/counters) and where each
//  zone sits in the interior. The shop builder spreads catalog weapons across
//  these zones by their `display` field, so adding weapons auto-fills the walls
//  without touching layout code. Designed to hold many weapons, not just a few.
//
//  Coordinates are LOCAL to the Block Supply interior origin (see interiors.js).
//  Each zone lays items out along a line (origin → step * index) with an upward
//  row wrap so a wall can hold an arbitrary number of items.
//
//  V3 cleanup note: the visible GLB weapons are real 3D props, not text labels.
//  Keep them tight to slatwall/backing plates, shrink the pitch between rows,
//  and keep featured items off the exit path. If a new category is added, treat
//  the walkable aisle and doorway as sacred ground. No shelf goblins in traffic.
//
//  V4 note: assets do not share the same authored long axis. Some models are
//  long on X, some on Z, some nearly vertical. The current main.js display builder
//  still uses one square backing plate. Until that builder is upgraded to measure
//  each loaded GLB and create a rectangular/aspect-ratio plate, long/heavy items
//  need extra spacing and smaller fits from weaponTransforms.js.
// ───────────────────────────────────────────────────────────────────────────
export const SHOP_ZONES = {
  // Back-left slatwall: compact sidearm plates in one clean row, second row only
  // if the catalog grows. Faces into the room with plates tucked against z=-4.
  'pistol-wall': {
    label: 'Pistols',
    origin: [-6.15, 1.82, -4.02], step: [0.9, 0, 0], perRow: 5, rowStep: [0, -0.58, 0],
    facing: 0, plate: '#1b2a3a',
  },

  // Back slatwall: long items need wide slots because GLBs disagree on whether
  // their long axis is X or Z. Give every long item a full bay so even imperfect
  // orientation does not overlap its neighbor.
  'long-wall': {
    label: 'Long Weapons',
    origin: [-3.95, 2.05, -4.02], step: [1.18, 0, 0], perRow: 5, rowStep: [0, -0.72, 0],
    facing: 0, plate: '#22202e',
  },

  // Right-side pegboard: melee/tools live on the rack, not in the doorway. The
  // z range stays near the rack panel and away from the EXIT opening.
  'melee-rack': {
    label: 'Melee & Tools',
    origin: [4.35, 1.78, -1.35], step: [0, 0, 0.66], perRow: 6, rowStep: [0, -0.56, 0],
    facing: -Math.PI / 2, plate: '#2a241a',
  },

  // Center glass case: big/special items get one item per clear case bay. This
  // intentionally uses a lower per-row count so bulky pieces do not crowd.
  'featured': {
    label: 'Featured',
    origin: [-1.05, 1.88, 2.62], step: [1.18, 0, 0], perRow: 3, rowStep: [0, 0, 0.62],
    facing: Math.PI, plate: '#2a1a2a',
  },

  'ammo-shelf': {
    label: 'Ammo',
    origin: [-4.3, 0.82, 2.3], step: [0, 0, 0.72], perRow: 4, rowStep: [0, -0.48, 0],
    facing: Math.PI / 2, plate: '#1a2a1a',
  },
  'upgrade-counter': {
    label: 'Upgrade Bench',
    origin: [2.9, 1.0, 2.75], step: [0.65, 0, 0], perRow: 3, rowStep: [0, 0, 0.5],
    facing: Math.PI, plate: '#2a2a1a',
  },
};

// The tabs shown in the Block Supply menu, in order. `dynamic` tabs are filled
// from the catalog / save at open time.
export const SHOP_TABS = ['Weapons', 'Melee', 'Ammo', 'Upgrades', 'Owned'];

// Compute a world-local position + rotation for the Nth item in a zone.
export function zoneSlot(zoneId, index) {
  const z = SHOP_ZONES[zoneId] || SHOP_ZONES['featured'];
  const row = Math.floor(index / z.perRow);
  const col = index % z.perRow;
  const pos = [
    z.origin[0] + z.step[0] * col + z.rowStep[0] * row,
    z.origin[1] + z.step[1] * col + z.rowStep[1] * row,
    z.origin[2] + z.step[2] * col + z.rowStep[2] * row,
  ];
  return { pos, facing: z.facing };
}
