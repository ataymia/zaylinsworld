// ───────────────────────────────────────────────────────────────────────────
//  interiorPrefabs.js — interior room templates (Phase 2C)
//
//  Each interior prefab defines a room: size, materials, lighting, entrance,
//  furniture/prop ZONES (anchored placement, not random soup), NPC positions,
//  interaction stations and minigame stations. Zones reference variation pools
//  so the same interior can be furnished with different (but sensible) assets.
//
//  Pure data (no THREE/DOM). Coordinates are LOCAL to the room centre.
//  A "zone" = { pool, at:{x,z,ry?}, count?, along?:'wall'|'row', face? }.
// ───────────────────────────────────────────────────────────────────────────

export const INTERIOR_PREFABS = {
  home_interior: {
    id: 'home_interior', size: { w: 9, d: 8, h: 3 }, floor: 'wood', wall: 'plaster',
    lighting: { warm: true, level: 0.8 }, entrance: { x: 0, z: 4 },
    zones: [
      { pool: 'bed', at: { x: -2.5, z: -2.5, ry: 0 }, count: 1, station: 'sleep' },
      { pool: 'dresser', at: { x: 2.8, z: -3, ry: Math.PI }, count: 1, station: 'wardrobe' },
      { pool: 'couch', at: { x: 2.5, z: 2, ry: -Math.PI / 2 }, count: 1, optional: true },
      { pool: 'home_table', at: { x: 0, z: 1.5 }, count: 1, optional: true },
      { pool: 'bathroom_set', at: { x: -3, z: 2.5 }, count: 3, along: 'wall', station: 'mirror' },
    ],
    stations: [
      { id: 'sleep', at: { x: -2.5, z: -2.5 }, label: 'Sleep' },
      { id: 'wardrobe', at: { x: 2.8, z: -3 }, label: 'Change clothes' },
      { id: 'haircut', at: { x: -3, z: 2.5 }, label: 'Cut hair' },
    ],
  },
  restaurant_interior: {
    id: 'restaurant_interior', size: { w: 11, d: 9, h: 3.2 }, floor: 'tile', wall: 'paint',
    lighting: { warm: true, level: 0.9 }, entrance: { x: 0, z: 4.2 },
    zones: [
      { pool: 'restaurant_counter', at: { x: 0, z: -3 }, count: 1, station: 'order' },
      { pool: 'fryer_kitchen', at: { x: -3.5, z: -3.5 }, count: 1, optional: true, station: 'shift' },
      { pool: 'diner_seating', at: { x: 0, z: 1 }, count: 6, along: 'row', spacing: 2.2 },
      { pool: 'food_chicken', at: { x: 0, z: -2.4 }, count: 4, along: 'counter' },
    ],
    stations: [
      { id: 'order', at: { x: 0, z: -2.6 }, label: 'Order food' },
      { id: 'eat', at: { x: 2, z: 1 }, label: 'Eat (minigame)' },
      { id: 'shift', at: { x: -3.5, z: -3.2 }, label: 'Work a shift' },
    ],
    npcSpawns: [{ x: 0, z: -2, role: 'shop_worker' }, { x: 3, z: 2, role: 'customer' }],
  },
  block_supply_interior: {
    id: 'block_supply_interior', size: { w: 10, d: 9, h: 3.4 }, floor: 'concrete', wall: 'brick',
    lighting: { neon: true, level: 0.85 }, entrance: { x: 4.5, z: 0 },
    zones: [
      // Keep the doorway clear. Dedicated display layout is handled by blockSupplyLayout.js.
      { pool: 'weapon_wall', at: { x: 0, z: -4 }, count: 4, along: 'wall', face: 'in', station: 'buy' },
      { pool: 'pistol_wall', at: { x: -4, z: -0.6 }, count: 3, along: 'wall', face: 'in', ry: Math.PI / 2, station: 'buy' },
      { pool: 'melee_rack', at: { x: 4, z: -2.4 }, count: 4, along: 'wall', face: 'in', ry: -Math.PI / 2, station: 'buy' },
      { pool: 'ammo_shelf', at: { x: -3.2, z: 2.8 }, count: 3, along: 'row' },
      { pool: 'upgrade_counter', at: { x: 1.6, z: 2.8 }, count: 1, station: 'upgrade' },
    ],
    stations: [
      { id: 'buy', at: { x: 0, z: -2.9 }, label: 'Browse weapons' },
      { id: 'upgrade', at: { x: 1.5, z: 2 }, label: 'Upgrades' },
    ],
    npcSpawns: [{ x: 1.5, z: 1.5, role: 'shop_worker' }],
  },
  frostbox_interior: {
    id: 'frostbox_interior', size: { w: 10, d: 8, h: 3.2 }, floor: 'marble', wall: 'paint',
    lighting: { cool: true, level: 1.0 }, entrance: { x: 0, z: 4 },
    zones: [
      { pool: 'jewelry_case', at: { x: 0, z: 0 }, count: 3, along: 'row', spacing: 2.4, station: 'shop' },
      { pool: 'gem_display', at: { x: 0, z: -3 }, count: 6, along: 'wall', face: 'in' },
      { pool: 'register', at: { x: 3, z: -2.5 }, count: 1, optional: true },
    ],
    stations: [{ id: 'shop', at: { x: 0, z: 0.6 }, label: 'Browse jewelry' }, { id: 'customize', at: { x: 3, z: -2 }, label: 'Customize chain' }],
    npcSpawns: [{ x: 3, z: -2, role: 'shop_worker' }],
  },
  gas_station_store: {
    id: 'gas_station_store', size: { w: 8, d: 7, h: 3 }, floor: 'tile', wall: 'paint',
    lighting: { bright: true, level: 1.0 }, entrance: { x: 0, z: 3.4 },
    zones: [
      { pool: 'shop_shelf', at: { x: -2, z: -2 }, count: 4, along: 'row' },
      { pool: 'register', at: { x: 2.5, z: -2 }, count: 1, station: 'pay' },
      { pool: 'vending', at: { x: 3, z: 1 }, count: 1, optional: true },
    ],
    stations: [{ id: 'pay', at: { x: 2.5, z: -1.4 }, label: 'Counter' }],
    npcSpawns: [{ x: 2.5, z: -1.6, role: 'shop_worker' }],
  },
  police_interior: {
    id: 'police_interior', size: { w: 12, d: 10, h: 3.6 }, floor: 'tile', wall: 'paint',
    lighting: { cool: true, level: 0.9 }, entrance: { x: 0, z: 5 },
    zones: [
      { pool: 'police_props', at: { x: -2.8, z: -3.0 }, count: 1, station: 'frontdesk' },
      { pool: 'classroom_board', at: { x: -4, z: -2 }, count: 1, station: 'academy' },
      { pool: 'office_desk', at: { x: 3, z: -1 }, count: 1, along: 'row' },
    ],
    stations: [
      { id: 'frontdesk', at: { x: -2.8, z: -2.4 }, label: 'Front desk' },
      { id: 'academy', at: { x: -4, z: -1.4 }, label: 'Police academy info' },
      { id: 'evidence-locker', at: { x: 4, z: -4 }, label: 'Evidence Locker' },
    ],
    // One lobby officer only. Extra police props were clipping and reading broken.
    npcSpawns: [{ x: 0, z: -2.4, role: 'police' }],
  },
  classroom_interior: {
    id: 'classroom_interior', size: { w: 11, d: 9, h: 3.4 }, floor: 'tile', wall: 'paint',
    lighting: { bright: true, level: 1.0 }, entrance: { x: 4.5, z: 0 },
    zones: [
      { pool: 'classroom_board', at: { x: 0, z: -4 }, count: 1 },
      { pool: 'classroom_desk', at: { x: -2.8, z: -0.6 }, count: 4, along: 'row', spacing: 1.6, station: 'study' },
      { pool: 'classroom_desk', at: { x: 0, z: 0.9 }, count: 4, along: 'row', spacing: 1.6, station: 'study' },
      { pool: 'classroom_desk', at: { x: 2.8, z: 2.4 }, count: 4, along: 'row', spacing: 1.6, station: 'study' },
    ],
    stations: [{ id: 'study', at: { x: 0, z: 0 }, label: 'Study' }],
    npcSpawns: [{ x: 0, z: -3, role: 'teacher' }],
  },
  gym_interior: {
    id: 'gym_interior', size: { w: 11, d: 10, h: 3.6 }, floor: 'rubber', wall: 'paint',
    lighting: { bright: true, level: 1.0 }, entrance: { x: -4.5, z: 0 },
    zones: [
      { pool: 'gym_equipment', at: { x: 0, z: 0 }, count: 6, along: 'grid', spacing: 2.4, station: 'workout' },
    ],
    stations: [{ id: 'workout', at: { x: 0, z: 0 }, label: 'Work out' }],
    npcSpawns: [{ x: 3, z: -2, role: 'gym_worker' }],
  },
  office_interior: {
    id: 'office_interior', size: { w: 11, d: 9, h: 3.2 }, floor: 'carpet', wall: 'paint',
    lighting: { cool: true, level: 0.95 }, entrance: { x: -4.5, z: 0 },
    zones: [{ pool: 'office_desk', at: { x: 0, z: 0 }, count: 5, along: 'grid', spacing: 2.4, station: 'work' }],
    stations: [{ id: 'work', at: { x: 0, z: 0 }, label: 'Office shift' }],
    npcSpawns: [{ x: 3, z: -2, role: 'manager' }],
  },
  dealership_showroom: {
    id: 'dealership_showroom', size: { w: 13, d: 11, h: 4 }, floor: 'polished', wall: 'glass',
    lighting: { bright: true, level: 1.1 }, entrance: { x: 0, z: 5.5 },
    zones: [{ pool: 'display_car', at: { x: 0, z: 0 }, count: 3, along: 'row', spacing: 4, station: 'buyCar' }],
    stations: [{ id: 'buyCar', at: { x: 0, z: 2 }, label: 'Buy a car' }],
    npcSpawns: [{ x: 4, z: 2, role: 'shop_worker' }],
  },
  garage_interior: {
    id: 'garage_interior', size: { w: 11, d: 10, h: 4 }, floor: 'concrete', wall: 'metal',
    lighting: { dim: true, level: 0.7 }, entrance: { x: 0, z: 5 },
    zones: [{ pool: 'office_desk', at: { x: 4, z: -3 }, count: 1, optional: true }],
    stations: [{ id: 'repair', at: { x: 0, z: 0 }, label: 'Repair vehicle' }],
    npcSpawns: [{ x: 3, z: 2, role: 'shop_worker' }],
  },
};

export function interiorPrefab(id) { return INTERIOR_PREFABS[id] || null; }

export default { INTERIOR_PREFABS, interiorPrefab };
