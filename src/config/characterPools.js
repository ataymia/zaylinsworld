// ───────────────────────────────────────────────────────────────────────────
// characterPools.js — approved character assets and runtime budgets by role.
//
// Asset names are exact names from characters/psx in asset-index-v2.json. Keep
// special-service characters out of the civilian pool so a random pedestrian
// never spawns as a police officer, doctor, firefighter, killer, or monster.
// ───────────────────────────────────────────────────────────────────────────

export const CHARACTER_PACK = 'psx';

export const CHARACTER_POLICY = Object.freeze({
  player: Object.freeze({
    enabled: true,
    targetHeight: 1.8,
    keepCustomHair: true,
    maxLive: 1,
    loadDelayMs: 0,
  }),
  civilian: Object.freeze({
    enabled: true,
    targetHeight: 1.75,
    keepCustomHair: false,
    maxLive: 8,
    loadDelayMs: 300,
    staggerEvery: 2,
  }),
  police: Object.freeze({
    enabled: true,
    targetHeight: 1.82,
    keepCustomHair: false,
    maxLive: 6,
    loadDelayMs: 0,
  }),
  shopkeeper: Object.freeze({
    enabled: true,
    targetHeight: 1.76,
    keepCustomHair: false,
    maxLive: 8,
    loadDelayMs: 150,
  }),
});

export const CHARACTER_POOLS = Object.freeze({
  player: Object.freeze([
    'character-29-female',
    'character-30-female',
    'character-31-female',
    'character-32-female',
    'character-33-female',
    'character-female-02',
    'character-female-03',
    'character-female-04',
    'character-female-05',
    'character-female-11',
    'character-female-12',
    'character-female-13',
    'character-female-14',
    'character-27-female-hm',
    'character-28-female-hm',
  ]),

  civilian: Object.freeze([
    'character-01',
    'character-02',
    'character-03',
    'character-04',
    'character-05',
    'character-06',
    'character-07',
    'character-08',
    'character-09',
    'character-10',
    'character-11',
    'character-12',
    'character-13',
    'character-14',
    'character-15',
    'character-16',
    'character-27-hm',
    'character-28-hm',
    'character-29',
    'character-30',
    'character-31',
    'character-32',
    'character-female-01',
    'character-female-02',
    'character-female-03',
    'character-female-04',
    'character-female-05',
    'character-female-06',
    'character-female-07',
    'character-female-08',
    'character-female-09',
    'character-female-10',
    'character-female-11',
    'character-female-12',
    'character-female-13',
    'character-female-14',
    'character-female-15',
    'character-female-16',
    'character-27-female-hm',
    'character-28-female-hm',
    'character-29-female',
    'character-30-female',
    'character-31-female',
    'character-32-female',
    'character-33-female',
  ]),

  police: Object.freeze([
    'character-17-police',
    'character-18-police',
    'character-19-police',
    'character-20-police',
    'character-21-police',
    'character-22-police',
    'character-17-female-police',
    'character-18-female-police',
    'character-19-female-police',
    'character-20-female-police',
    'character-25-female-police',
    'character-26-female-police',
  ]),

  doctor: Object.freeze([
    'character-23-female-doctor',
    'character-24-female-doctor',
    'character-25-doctor',
    'character-26-doctor',
  ]),

  firefighter: Object.freeze([
    'character-21-female-firefighter',
    'character-22-female-firefighter',
    'character-23-firefighter',
    'character-24-firefighter',
  ]),

  shopkeeper: Object.freeze([
    'character-03',
    'character-07',
    'character-10',
    'character-13',
    'character-female-03',
    'character-female-07',
    'character-female-12',
    'character-30-female',
  ]),
});

function hashValue(value) {
  const text = String(value ?? '');
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function characterForRole(role, seed = 0) {
  const pool = CHARACTER_POOLS[role] || CHARACTER_POOLS.civilian;
  if (!pool.length) return null;
  const numeric = typeof seed === 'number' && Number.isFinite(seed) ? Math.abs(Math.trunc(seed)) : hashValue(seed);
  return pool[numeric % pool.length];
}

export function randomCharacterForRole(role, random = Math.random) {
  const pool = CHARACTER_POOLS[role] || CHARACTER_POOLS.civilian;
  if (!pool.length) return null;
  const value = Math.max(0, Math.min(0.999999, Number(random()) || 0));
  return pool[Math.floor(value * pool.length)];
}

export function isApprovedCharacter(role, name) {
  const pool = CHARACTER_POOLS[role];
  return !!pool && pool.includes(name);
}
