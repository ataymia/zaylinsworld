// ───────────────────────────────────────────────────────────────────────────
//  blockSupplyLayout.js — physical display layout for the Block Supply store.
//
//  Wall-grid version: stop using floor/case-style display zones. Every weapon
//  category now mounts to the walls like a gun-store pegboard/slatwall. This is
//  intentionally closer to Ammu-Nation style browsing: walk up, hover/interact,
//  buy/equip. No featured-floor islands, no glass-case clutter, no doorway props.
//
//  Coordinates are LOCAL to the Block Supply interior origin (see interiors.js).
//  The current main.js display builder still adds a small backing plate per item;
//  this config keeps those plates flush to walls so they read as wall mounts, not
//  boxes on the floor. Future builder pass should remove or merge individual
//  plates into one continuous wall panel.
// ───────────────────────────────────────────────────────────────────────────
export const SHOP_ZONES = {
  // Left section of the back wall: pistols/sidearms.
  'pistol-wall': {
    label: 'Pistols',
    origin: [-4.35, 2.05, -4.08], step: [0.82, 0, 0], perRow: 5, rowStep: [0, -0.62, 0],
    facing: 0, plate: '#1b2a3a',
  },

  // Center/right section of the back wall: long weapons. Wider slots, all flat
  // against the wall so orientation issues are less obvious.
  'long-wall': {
    label: 'Long Weapons',
    origin: [-4.35, 1.18, -4.08], step: [1.05, 0, 0], perRow: 5, rowStep: [0, -0.58, 0],
    facing: 0, plate: '#22202e',
  },

  // Right wall: melee/tools. Still wall-mounted, no floor rack.
  'melee-rack': {
    label: 'Melee & Tools',
    origin: [4.35, 2.02, -3.55], step: [0, 0, 0.68], perRow: 5, rowStep: [0, -0.58, 0],
    facing: -Math.PI / 2, plate: '#2a241a',
  },

  // Featured/heavy items are no longer on floor cases. They occupy the upper
  // right/back wall like the rest of the catalog.
  'featured': {
    label: 'Featured',
    origin: [0.95, 2.05, -4.08], step: [1.02, 0, 0], perRow: 4, rowStep: [0, -0.62, 0],
    facing: 0, plate: '#2a1a2a',
  },

  // Utility shelves stay on the back-right wall, above/near the counter.
  'ammo-shelf': {
    label: 'Ammo',
    origin: [1.0, 0.74, -4.08], step: [0.72, 0, 0], perRow: 4, rowStep: [0, -0.45, 0],
    facing: 0, plate: '#1a2a1a',
  },
  'upgrade-counter': {
    label: 'Upgrade Bench',
    origin: [3.05, 0.74, -4.08], step: [0.62, 0, 0], perRow: 3, rowStep: [0, -0.45, 0],
    facing: 0, plate: '#2a2a1a',
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
