// ───────────────────────────────────────────────────────────────────────────
// state.js — versioned, checksummed, backward-compatible local save system.
// ───────────────────────────────────────────────────────────────────────────
import { defaultCustom } from './avatar.js';
import { ensurePlayerCustom } from './config/playerAvatarCatalog.js';
import { SPAWN } from './config/mapConfig.js';
import { repairLegacyParkArrival } from './config/saveMigrations.js';
import { worldRegistry } from './runtime/WorldRegistry.js';

export { repairLegacyParkArrival } from './config/saveMigrations.js';

const SAVE_KEY = 'zaylinsworld.save.v2';
const BACKUP_KEY = 'zaylinsworld.save.backup';
const CORRUPT_KEY = 'zaylinsworld.save.corrupt';
export const SAVE_SCHEMA_VERSION = 6;
let lastSerialized = '';
let lastSavedAt = 0;

function checksum(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function safePosition(position, fallback) {
  const next = {
    x: finite(position?.x, fallback.x),
    z: finite(position?.z, fallback.z),
  };
  const town = worldRegistry.town('starter-town');
  const bounds = town?.worldBounds;
  if (bounds && (next.x < bounds.minX - 400 || next.x > bounds.maxX + 400
    || next.z < bounds.minZ - 400 || next.z > bounds.maxZ + 400)) {
    const recovery = worldRegistry.spawn('safe-recovery');
    return { x: recovery?.position.x ?? fallback.x, z: recovery?.position.z ?? fallback.z };
  }
  return next;
}

export function defaultState() {
  return {
    version: SAVE_SCHEMA_VERSION,
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
    world: {
      townId: 'starter-town',
      districtId: 'dreamdrop-district',
      spawnId: 'dreamdrop-core',
      discoveredTowns: ['starter-town'],
      largeWorldEnabled: false,
      relocatedLocations: [],
    },
    properties: { primaryResidenceId: null, owned: [], homeDeedIssued: false, mailboxLastDay: null },
    education: { schoolId: null, certificates: [], subjects: {}, attendance: 0 },
    careers: { activeId: null, records: {} },
    crimeRecord: { official: [], hidden: [], convictionsByTown: {} },
    policeCareer: { status: 'not-applied', rank: null, discipline: 0 },
    vehicleState: { activeVehicleId: null, stored: {}, impounded: [] },
    settings: {},
  };
}

function migrateAndNormalize(data = {}) {
  const base = defaultState();
  const custom = ensurePlayerCustom({
    ...base.custom,
    ...(data.custom || {}),
    faceMorphs: { ...base.custom.faceMorphs, ...(data.custom?.faceMorphs || {}) },
  });
  const position = repairLegacyParkArrival(safePosition(data.pos, base.pos), data);
  const district = worldRegistry.districtAt(position, 'starter-town');
  const world = {
    ...base.world,
    ...(data.world || {}),
    townId: worldRegistry.town(data.world?.townId)?.id || 'starter-town',
    districtId: worldRegistry.district(data.world?.districtId)?.id || district?.id || base.world.districtId,
    spawnId: worldRegistry.spawn(data.world?.spawnId)?.id || base.world.spawnId,
    discoveredTowns: Array.from(new Set(['starter-town', ...(data.world?.discoveredTowns || [])]))
      .filter((id) => worldRegistry.town(id)),
    largeWorldEnabled: !!data.world?.largeWorldEnabled,
    relocatedLocations: Array.from(new Set(data.world?.relocatedLocations || [])),
  };
  return {
    ...base,
    ...data,
    version: SAVE_SCHEMA_VERSION,
    useRealSkin: true,
    custom,
    stats: { ...base.stats, ...(data.stats || {}) },
    pos: position,
    facing: finite(data.facing, base.facing),
    money: Math.max(0, finite(data.money, base.money)),
    wanted: Math.max(0, Math.min(5, finite(data.wanted, 0))),
    heat: Math.max(0, Math.min(100, finite(data.heat, 0))),
    npcMemory: { ...(data.npcMemory || {}) },
    ownedCars: Array.isArray(data.ownedCars) ? data.ownedCars : [],
    ownedJewelry: Array.isArray(data.ownedJewelry) ? data.ownedJewelry : [],
    ownedGear: Array.isArray(data.ownedGear) ? data.ownedGear : [],
    ownedWeapons: data.ownedWeapons?.length ? data.ownedWeapons : ['fists'],
    ammo: { ...(data.ammo || {}) },
    ammoReserve: { ...(data.ammoReserve || {}) },
    ownedUpgrades: { ...(data.ownedUpgrades || {}) },
    equippedUpgrades: { ...(data.equippedUpgrades || {}) },
    missionProgress: Array.isArray(data.missionProgress) ? data.missionProgress : [],
    savedOutfits: Array.isArray(data.savedOutfits) ? data.savedOutfits : [],
    ownedWardrobe: { freeStarterPack: true, ...(data.ownedWardrobe || {}) },
    inventory: Array.isArray(data.inventory) ? data.inventory : [],
    world,
    properties: { ...base.properties, ...(data.properties || {}), owned: data.properties?.owned || [] },
    education: { ...base.education, ...(data.education || {}), subjects: { ...(data.education?.subjects || {}) } },
    careers: { ...base.careers, ...(data.careers || {}), records: { ...(data.careers?.records || {}) } },
    crimeRecord: {
      ...base.crimeRecord,
      ...(data.crimeRecord || {}),
      official: data.crimeRecord?.official || [],
      hidden: data.crimeRecord?.hidden || [],
      convictionsByTown: { ...(data.crimeRecord?.convictionsByTown || {}) },
    },
    policeCareer: { ...base.policeCareer, ...(data.policeCareer || {}) },
    vehicleState: {
      ...base.vehicleState,
      ...(data.vehicleState || {}),
      stored: { ...(data.vehicleState?.stored || {}) },
      impounded: data.vehicleState?.impounded || [],
    },
    settings: { ...(data.settings || {}) },
  };
}

function envelopeFor(state) {
  const payload = migrateAndNormalize(state);
  const payloadText = JSON.stringify(payload);
  return {
    format: 'zta-save',
    schemaVersion: SAVE_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    checksum: checksum(payloadText),
    payload,
  };
}

function rememberCorrupt(raw, reason) {
  try {
    localStorage.setItem(CORRUPT_KEY, JSON.stringify({ capturedAt: new Date().toISOString(), reason, raw }));
  } catch { /* no storage available */ }
}

export function loadState() {
  let raw = null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.format === 'zta-save' && parsed.payload) {
      const payloadText = JSON.stringify(parsed.payload);
      const valid = parsed.checksum === checksum(payloadText);
      if (!valid) {
        rememberCorrupt(raw, 'checksum mismatch');
        console.warn('[save] checksum mismatch; recovering validated fields from payload');
      }
      return migrateAndNormalize(parsed.payload);
    }
    // Legacy v1-v3 saves were plain state objects. They migrate in memory and are
    // converted to an envelope on the next save without deleting unknown fields.
    return migrateAndNormalize(parsed);
  } catch (error) {
    if (raw) rememberCorrupt(raw, error?.message || String(error));
    console.warn('Failed to load save:', error);
    return null;
  }
}

export function saveState(state) {
  try {
    const envelope = envelopeFor(state);
    const serialized = JSON.stringify(envelope);
    if (serialized === lastSerialized) return true;
    const existing = localStorage.getItem(SAVE_KEY);
    if (existing && !localStorage.getItem(BACKUP_KEY)) localStorage.setItem(BACKUP_KEY, existing);
    localStorage.setItem(SAVE_KEY, serialized);
    lastSerialized = serialized;
    lastSavedAt = Date.now();
    return true;
  } catch (error) {
    console.warn('Failed to save:', error);
    return false;
  }
}

export function clearSave() {
  localStorage.removeItem(SAVE_KEY);
  lastSerialized = '';
}
export function hasSave() { return !!localStorage.getItem(SAVE_KEY); }
export function saveDiagnostics() {
  return Object.freeze({
    schemaVersion: SAVE_SCHEMA_VERSION,
    hasSave: hasSave(),
    hasBackup: !!localStorage.getItem(BACKUP_KEY),
    hasCorruptCapture: !!localStorage.getItem(CORRUPT_KEY),
    lastSavedAt,
    saveKey: SAVE_KEY,
  });
}
