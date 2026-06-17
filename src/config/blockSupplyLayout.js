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
//  V2 cleanup note: keep every display tight to a wall/counter and away from the
//  exit lane. The old featured zone sat near the door and created overlapping
//  nameplates + props in the player's path.
// ───────────────────────────────────────────────────────────────────────────
export const SHOP_ZONES = {
  'pistol-wall': {
    label: 'Pistols',
    origin: [-4.35, 1.55, -3.35], step: [0, 0, 1.05], perRow: 3, rowStep: [0, -0.55, 0],
    facing: Math.PI / 2, plate: '#1b2a3a',
  },
  'long-wall': {
    label: 'Long Weapons',
    origin: [-2.7, 1.75, -4.12], step: [1.25, 0, 0], perRow: 4, rowStep: [0, -0.65, 0],
    facing: 0, plate: '#22202e',
  },
  'melee-rack': {
    label: 'Melee & Tools',
    origin: [4.35, 1.45, -3.15], step: [0, 0, 0.78], perRow: 5, rowStep: [0, -0.55, 0],
    facing: -Math.PI / 2, plate: '#2a241a',
  },
  'featured': {
    label: 'Featured',
    origin: [0.0, 1.45, 2.65], step: [1.45, 0, 0], perRow: 2, rowStep: [0, 0, 0.7],
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
