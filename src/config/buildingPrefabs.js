// ───────────────────────────────────────────────────────────────────────────
//  buildingPrefabs.js — reusable building/location prefab definitions (Phase 2B)
//
//  Each prefab describes a TYPE of location (not one fixed asset). It references
//  exterior + prop VARIATION POOLS (variationPools.js), an interior prefab id
//  (interiorPrefabs.js), placement/collision metadata, minimap icon, NPC spawn
//  points, and job/store hooks. The town builder instantiates a prefab at a lot,
//  resolving every pool through the seeded variation resolver so two towns (or
//  two reloads with a new seed) can look different without code changes.
//
//  Pure data (no THREE/DOM). Coordinates here are LOCAL to a placed lot
//  (origin at the building centre, +z toward the fronting road) — the builder
//  translates/rotates them into world space using the lot's transform.
// ───────────────────────────────────────────────────────────────────────────

// theme → exterior weighting hints the resolver/builder can use.
export const THEMES = ['starter', 'civic', 'commercial', 'residential', 'luxury', 'rough', 'school', 'gas-strip', 'downtown'];

export const BUILDING_PREFABS = {
  home: {
    id: 'home', type: 'home', minimapIcon: '🏠', sign: { text: 'HOME', color: '#bfe3ff' },
    exteriorPool: 'house_small_ext', fallbackExterior: { kind: 'house', color: '#8a7a5a' },
    footprint: { w: 11, d: 10, h: 5 }, entrance: { x: 0, z: 5 }, signAt: { x: 0, y: 3.6, z: 5 },
    collision: 'hard', interior: 'home_interior',
    requiredProps: ['bed', 'dresser'], optionalProps: ['couch', 'home_table'],
    npcSpawns: [], trashSpots: [{ x: 5.5, z: 4 }], parking: [{ x: -6, z: 4 }],
    lighting: { warm: true }, theme: { residential: 1.4, starter: 1 },
    hooks: { sleep: true, wardrobe: true, haircut: true, ownership: true },
  },
  chicken: {
    id: 'chicken', type: 'chicken_spot', minimapIcon: '🍗', sign: { text: 'CHICKEN SPOT', color: '#ffcf3f' },
    exteriorPool: 'restaurant_ext', fallbackExterior: { kind: 'shop', color: '#b5302a' },
    footprint: { w: 12, d: 9, h: 6 }, entrance: { x: 0, z: 4.5 }, signAt: { x: 0, y: 4.2, z: 4.5 },
    collision: 'hard', interior: 'restaurant_interior',
    requiredProps: ['restaurant_counter', 'diner_seating', 'food_chicken'], optionalProps: ['fryer_kitchen', 'food_generic'],
    npcSpawns: [{ x: 0, z: -2, role: 'shop_worker' }, { x: 3, z: 3, role: 'customer' }, { x: -3, z: 3, role: 'customer' }],
    trashSpots: [{ x: 6, z: -3 }], dumpster: { x: 6.5, z: -4 }, parking: [],
    lighting: { warm: true }, theme: { commercial: 1.3, starter: 1 },
    hooks: { eatMinigame: true, shift: 'diner', menu: true },
  },
  gas: {
    id: 'gas', type: 'gas_station', minimapIcon: '⛽', sign: { text: 'GAS-N-GO', color: '#7dffa1' },
    exteriorPool: 'gas_station_ext', fallbackExterior: { kind: 'gas', color: '#2b2e36' },
    footprint: { w: 12, d: 10, h: 5 }, entrance: { x: 4, z: 4 }, signAt: { x: 5.4, y: 4.6, z: 2.4 },
    collision: 'hard', interior: 'gas_station_store',
    requiredProps: ['gas_pump', 'price_sign'], optionalProps: ['shop_shelf', 'vending'],
    forecourt: { w: 8, d: 5 }, refuel: { r: 6, price: 1.2 },
    npcSpawns: [{ x: 4, z: -2, role: 'shop_worker' }], trashSpots: [{ x: -5, z: 4 }], parking: [{ x: -3, z: 0 }],
    lighting: { bright: true }, theme: { 'gas-strip': 1.5, starter: 1 },
    hooks: { refuel: true, shift: 'clerk' }, minimapMarker: true,
  },
  blocksupply: {
    id: 'blocksupply', type: 'block_supply', minimapIcon: '🔫', sign: { text: 'BLOCK SUPPLY', color: '#d9b3ff' },
    exteriorPool: 'shop_ext', fallbackExterior: { kind: 'shop', color: '#4b2c6b' },
    footprint: { w: 11, d: 10, h: 6 }, entrance: { x: 5, z: 0 }, signAt: { x: 5, y: 4, z: 0 },
    collision: 'hard', interior: 'block_supply_interior',
    requiredProps: ['weapon_wall', 'pistol_wall', 'melee_rack', 'ammo_shelf', 'upgrade_counter'], optionalProps: [],
    npcSpawns: [{ x: -3, z: 0, role: 'shop_worker' }],
    trashSpots: [{ x: -5, z: 4 }], parking: [],
    lighting: { neon: true }, theme: { rough: 1.3, commercial: 1 },
    hooks: { weaponShop: true, displaySlots: true, upgrades: true },
  },
  frostbox: {
    id: 'frostbox', type: 'jewelry_store', minimapIcon: '💎', sign: { text: 'FROSTBOX', color: '#9fe8ff' },
    exteriorPool: 'shop_ext', fallbackExterior: { kind: 'shop', color: '#26406b' },
    footprint: { w: 11, d: 9, h: 6 }, entrance: { x: 0, z: 4.5 }, signAt: { x: 0, y: 4.2, z: 4.5 },
    collision: 'hard', interior: 'frostbox_interior',
    requiredProps: ['jewelry_case', 'gem_display'], optionalProps: ['register'],
    npcSpawns: [{ x: 0, z: -2, role: 'shop_worker' }],
    trashSpots: [], parking: [],
    lighting: { cool: true }, theme: { luxury: 1.5, downtown: 1 },
    hooks: { jewelryShop: true, chainCustomize: true },
  },
  school: {
    id: 'school', type: 'school', minimapIcon: '🏫', sign: { text: 'ZAYLIN PREP', color: '#b9ffd6' },
    exteriorPool: 'civic_ext', fallbackExterior: { kind: 'building', color: '#3a5a4a' },
    footprint: { w: 12, d: 10, h: 7 }, entrance: { x: 5, z: 0 }, signAt: { x: 5, y: 4.5, z: 0 },
    collision: 'hard', interior: 'classroom_interior',
    requiredProps: ['classroom_desk', 'classroom_board'], optionalProps: [],
    npcSpawns: [{ x: -3, z: 0, role: 'teacher' }, { x: 2, z: 2, role: 'student' }, { x: -2, z: 2, role: 'student' }],
    trashSpots: [{ x: -5, z: 4 }], parking: [{ x: -6, z: -4 }],
    lighting: { bright: true }, theme: { school: 1.5, civic: 1 },
    hooks: { study: true, smartsStat: true },
  },
  gym: {
    id: 'gym', type: 'gym', minimapIcon: '🏋️', sign: { text: 'IRON CITY GYM', color: '#ff9f9f' },
    exteriorPool: 'shop_ext', fallbackExterior: { kind: 'building', color: '#6b2c2c' },
    footprint: { w: 11, d: 10, h: 7 }, entrance: { x: -5, z: 0 }, signAt: { x: -5, y: 4.5, z: 0 },
    collision: 'hard', interior: 'gym_interior',
    requiredProps: ['gym_equipment'], optionalProps: [],
    npcSpawns: [{ x: 3, z: 0, role: 'gym_worker' }],
    trashSpots: [], parking: [],
    lighting: { bright: true }, theme: { civic: 1, commercial: 1 },
    hooks: { workout: true, fitnessStat: true, shift: 'gym' },
  },
  office: {
    id: 'office', type: 'office', minimapIcon: '🏢', sign: { text: 'WORKTOWER', color: '#bcd8ff' },
    exteriorPool: 'civic_ext', fallbackExterior: { kind: 'tower', color: '#2c3a5a' },
    footprint: { w: 12, d: 10, h: 8 }, entrance: { x: -5, z: 0 }, signAt: { x: -5, y: 5, z: 0 },
    collision: 'hard', interior: 'office_interior',
    requiredProps: ['office_desk'], optionalProps: [],
    npcSpawns: [{ x: 3, z: 0, role: 'manager' }],
    trashSpots: [], parking: [{ x: 6, z: 4 }],
    lighting: { cool: true }, theme: { downtown: 1.4, civic: 1 },
    hooks: { officeShift: true, deliverDocs: true },
  },
  police: {
    id: 'police', type: 'police_station', minimapIcon: '🚓', sign: { text: 'CIVIC SAFETY HQ', color: '#9fc8ff' },
    exteriorPool: 'civic_ext', fallbackExterior: { kind: 'building', color: '#37496b' },
    footprint: { w: 13, d: 11, h: 7 }, entrance: { x: 0, z: 5.5 }, signAt: { x: 0, y: 4.6, z: 5.5 },
    collision: 'hard', interior: 'police_interior',
    requiredProps: ['police_props'], optionalProps: [],
    npcSpawns: [{ x: 0, z: 3, role: 'police' }, { x: 4, z: 7, role: 'police' }],
    parkingLot: { x: 0, z: 9, w: 12, d: 5, stalls: 3, kind: 'police' },
    trashSpots: [], lighting: { cool: true }, theme: { civic: 1.5 },
    hooks: { academyBoard: true, restrictedDoor: true, copCarTheft: true },
  },
  dealership: {
    id: 'dealership', type: 'dealership', minimapIcon: '🚗', sign: { text: 'AUTO HAUS', color: '#9fe8ff' },
    exteriorPool: 'shop_ext', fallbackExterior: { kind: 'building', color: '#5b6470' },
    footprint: { w: 14, d: 12, h: 8 }, entrance: { x: 0, z: 6 }, signAt: { x: 0, y: 5, z: 6 },
    collision: 'hard', interior: 'dealership_showroom',
    requiredProps: ['display_car'], optionalProps: [],
    npcSpawns: [{ x: 0, z: 2, role: 'shop_worker' }],
    lot: { x: 0, z: 9, w: 18, d: 5, stalls: 5 },
    trashSpots: [], lighting: { bright: true }, theme: { commercial: 1.2, luxury: 1 },
    hooks: { vehiclePurchase: true, garageHelper: true },
  },
  garage: {
    id: 'garage', type: 'garage', minimapIcon: '🔧', sign: { text: 'CITY GARAGE', color: '#cfd6e2' },
    exteriorPool: 'shop_ext', fallbackExterior: { kind: 'building', color: '#454a55' },
    footprint: { w: 11, d: 10, h: 6 }, entrance: { x: 0, z: 5 }, signAt: { x: 0, y: 4, z: 5 },
    collision: 'hard', interior: 'garage_interior',
    requiredProps: [], optionalProps: [],
    npcSpawns: [{ x: 0, z: 2, role: 'shop_worker' }],
    repairPoint: { x: 0, z: 7, r: 6 }, lighting: { dim: true }, theme: { commercial: 1 },
    hooks: { repair: true, garageHelper: true },
  },
};

// Theme presets — tune density/quality so future towns differ without new code.
export const THEME_PRESETS = {
  starter: { propDensity: 0.8, tier: 'low', streetlightDensity: 1.0, policePresence: 0.5 },
  civic: { propDensity: 1.0, tier: 'mid', streetlightDensity: 1.3, policePresence: 1.2 },
  commercial: { propDensity: 1.2, tier: 'mid', streetlightDensity: 1.1, policePresence: 0.8 },
  residential: { propDensity: 0.7, tier: 'low', streetlightDensity: 0.9, policePresence: 0.4 },
  luxury: { propDensity: 0.9, tier: 'high', streetlightDensity: 1.2, policePresence: 0.9 },
  rough: { propDensity: 1.5, tier: 'low', streetlightDensity: 0.6, policePresence: 0.3 },
};

export function buildingPrefab(id) { return BUILDING_PREFABS[id] || null; }

export default { BUILDING_PREFABS, THEMES, THEME_PRESETS, buildingPrefab };
