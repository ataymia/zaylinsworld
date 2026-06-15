// ───────────────────────────────────────────────────────────────────────────
//  state.js — game state + save/load (localStorage)
// ───────────────────────────────────────────────────────────────────────────
import { defaultCustom } from './avatar.js';
import { SPAWN } from './config/mapConfig.js';

const SAVE_KEY = 'zaylinsworld.save.v2';

export function defaultState() {
  return {
    version: 2,
    custom: defaultCustom(),
    money: 500,
    // stats 0..100
    stats: { health: 100, energy: 100, hunger: 80, fitness: 20, smarts: 15, hygiene: 90, fun: 50 },
    job: 'Unemployed',
    wanted: 0,          // 0..5 stars
    heat: 0,            // long-term crime heat
    monsterMode: false,
    timeMin: 8 * 60,    // in-game minutes (08:00)
    day: 1,
    server: 'sunside',  // city/server vibe
    pos: { x: SPAWN.x, z: SPAWN.z },
    facing: SPAWN.faceY,
    carDamage: 0,
    fuel: 100,          // current vehicle fuel (0..100), refill at the gas station
    createdCharacter: false,
    // ownership
    ownedCars: [],      // car ids bought at dealership
    ownedJewelry: [],   // jewelry ids bought at Frostbox
    ownedGear: [],      // gear ids bought at Block Supply
    ownedWeapons: ['fists'],   // weapon ids owned (from weaponCatalog.js)
    equippedWeapon: 'fists',   // currently held weapon
    ammo: {},           // weaponId -> { mag }  (loaded magazine, per weapon)
    ammoReserve: {},    // ammoType -> count   (shared spare-ammo pool)
    ownedUpgrades: {},  // weaponId -> [upgradeId]  (purchased upgrades)
    equippedUpgrades: {}, // weaponId -> [upgradeId] (active upgrades)
    weaponsV2: false,   // set true once a save is migrated to the catalog model
    missionIndex: 0,    // active mission in the chain
    missionProgress: [],// done-flags for the active mission's objectives
    chicken: 0,         // pieces of chicken in inventory
    gems: 0,            // collectible city gems picked up
    freshCut: false,    // lineup mini-game result
    npcMemory: {},      // id -> { greeted, timesTalked, lastDay }
    inventory: [],
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // shallow merge over defaults so new fields stay valid
    const base = defaultState();
    return {
      ...base, ...data,
      custom: { ...base.custom, ...(data.custom || {}) },
      stats: { ...base.stats, ...(data.stats || {}) },
      pos: { ...base.pos, ...(data.pos || {}) },
      npcMemory: { ...(data.npcMemory || {}) },
      ownedCars: data.ownedCars || [],
      ownedJewelry: data.ownedJewelry || [],
      ownedGear: data.ownedGear || [],
      ownedWeapons: data.ownedWeapons && data.ownedWeapons.length ? data.ownedWeapons : ['fists'],
      ammo: { ...(data.ammo || {}) },
      ammoReserve: { ...(data.ammoReserve || {}) },
      ownedUpgrades: { ...(data.ownedUpgrades || {}) },
      equippedUpgrades: { ...(data.equippedUpgrades || {}) },
      missionProgress: data.missionProgress || [],
    };
  } catch (e) {
    console.warn('Failed to load save:', e);
    return null;
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.warn('Failed to save:', e);
    return false;
  }
}

export function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}

export function hasSave() {
  return !!localStorage.getItem(SAVE_KEY);
}
