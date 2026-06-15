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
// ───────────────────────────────────────────────────────────────────────────
export const SHOP_ZONES = {
  'pistol-wall': {
    label: 'Pistols',
    origin: [-4.2, 1.6, -3.9], step: [0, 0, 0.9], perRow: 4, rowStep: [0, -0.7, 0],
    facing: 0, plate: '#1b2a3a',
  },
  'long-wall': {
    label: 'Long Weapons',
    origin: [-0.6, 2.0, -3.9], step: [0.9, 0, 0], perRow: 5, rowStep: [0, -0.8, 0],
    facing: 0, plate: '#22202e',
  },
  'melee-rack': {
    label: 'Melee & Tools',
    origin: [3.9, 1.5, -1.4], step: [0, 0, 0.7], perRow: 6, rowStep: [-0.5, 0, 0],
    facing: -Math.PI / 2, plate: '#2a241a',
  },
  'featured': {
    label: 'Featured',
    origin: [0, 1.7, 3.6], step: [1.2, 0, 0], perRow: 3, rowStep: [0, -0.9, 0],
    facing: Math.PI, plate: '#2a1a2a',
  },
  'ammo-shelf': {
    label: 'Ammo',
    origin: [-4.2, 0.9, 1.6], step: [0, 0, 0.6], perRow: 6, rowStep: [0, -0.6, 0],
    facing: 0, plate: '#1a2a1a',
  },
  'upgrade-counter': {
    label: 'Upgrade Bench',
    origin: [2.4, 1.0, 3.4], step: [0.6, 0, 0], perRow: 4, rowStep: [0, 0, 0.5],
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
