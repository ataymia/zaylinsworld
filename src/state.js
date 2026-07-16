// ───────────────────────────────────────────────────────────────────────────
// state.js — game state + save/load (localStorage)
// ───────────────────────────────────────────────────────────────────────────
import { defaultCustom } from './avatar.js';
import { ensurePlayerCustom } from './config/playerAvatarCatalog.js';
import { SPAWN } from './config/mapConfig.js';

const SAVE_KEY = 'zaylinsworld.save.v2';

export function defaultState() {
  return {
    version: 3,
    custom: ensurePlayerCustom(defaultCustom()),
    money: 500,
    stats: { health: 100, energy: 100, hunger: 80, fitness: 20, smarts: 15, hygiene: 90, fun: 50 },
    job: 'Unemployed',
    wanted: 0,
    heat: 0,
    monsterMode: false,
    timeMin: 8 * 60,
    day: 1,
    server: 'sunside',
    pos: { x: SPAWN.x, z: SPAWN.z },
    facing: SPAWN.faceY,
    carDamage: 0,
    fuel: 100,
    createdCharacter: false,
    useRealSkin: true,
    ownedCars: [],
    ownedJewelry: [],
    ownedGear: [],
    ownedWeapons: ['fists'],
    equippedWeapon: 'fists',
    ammo: {},
    ammoReserve: {},
    ownedUpgrades: {},
    equippedUpgrades: {},
    weaponsV2: false,
    missionIndex: 0,
    missionProgress: [],
    chicken: 0,
    gems: 0,
    freshCut: false,
    npcMemory: {},
    inventory: [],
    savedOutfits: [],
    ownedWardrobe: { freeStarterPack: true },
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const base = defaultState();
    return {
      ...base, ...data,
      version: 3,
      useRealSkin: true,
      custom: ensurePlayerCustom({ ...base.custom, ...(data.custom || {}), faceMorphs: { ...base.custom.faceMorphs, ...(data.custom?.faceMorphs || {}) } }),
      stats: { ...base.stats, ...(data.stats || {}) },
      pos: { ...base.pos, ...(data.pos || {}) },
      npcMemory: { ...(data.npcMemory || {}) },
      ownedCars: data.ownedCars || [],
      ownedJewelry: data.ownedJewelry || [],
      ownedGear: data.ownedGear || [],
      ownedWeapons: data.ownedWeapons?.length ? data.ownedWeapons : ['fists'],
      ammo: { ...(data.ammo || {}) },
      ammoReserve: { ...(data.ammoReserve || {}) },
      ownedUpgrades: { ...(data.ownedUpgrades || {}) },
      equippedUpgrades: { ...(data.equippedUpgrades || {}) },
      missionProgress: data.missionProgress || [],
      savedOutfits: Array.isArray(data.savedOutfits) ? data.savedOutfits : [],
      ownedWardrobe: { freeStarterPack: true, ...(data.ownedWardrobe || {}) },
    };
  } catch (e) {
    console.warn('Failed to load save:', e);
    return null;
  }
}

export function saveState(state) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); return true; }
  catch (e) { console.warn('Failed to save:', e); return false; }
}
export function clearSave() { localStorage.removeItem(SAVE_KEY); }
export function hasSave() { return !!localStorage.getItem(SAVE_KEY); }
