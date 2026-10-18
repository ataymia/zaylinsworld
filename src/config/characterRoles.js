// ───────────────────────────────────────────────────────────────────────────
// characterRoles.js — authoritative visible-character role policy.
// ───────────────────────────────────────────────────────────────────────────
export const CHARACTER_ROLE_POLICY = Object.freeze({
  player: Object.freeze({
    mode: 'modular-custom',
    asset: 'sunbox-male-free',
    reason: 'Editable shared rig with body/face morphs, modular wardrobe slots, texture variants and procedural fallback.',
  }),
  civilian: Object.freeze({
    mode: 'glb-functional-direct',
    maxLiveSkins: 24,
    height: 1.75,
    playEmbeddedClip: false,
    castShadows: false,
    reason: 'Complete imported PSX civilians use direct lightweight bone drivers; procedural bubble meshes retire after a validated swap.',
  }),
  police: Object.freeze({
    mode: 'glb-functional-direct',
    maxLiveSkins: 4,
    height: 1.82,
    playEmbeddedClip: false,
    reason: 'Validated police GLBs use the same direct lightweight bone drivers as civilians; the procedural uniform remains a load-failure fallback only.',
  }),
});

export const CIVILIAN_CHARACTER_CANDIDATES = Object.freeze([
  'character-01', 'character-02', 'character-03', 'character-04',
  'character-05', 'character-06', 'character-07', 'character-08',
  'character-09', 'character-10', 'character-11', 'character-12',
  'character-13', 'character-14', 'character-15', 'character-16',
  'character-female-01', 'character-female-02', 'character-female-03', 'character-female-04',
  'character-female-05', 'character-female-06', 'character-female-07', 'character-female-08',
  'character-female-09', 'character-female-10', 'character-female-11', 'character-female-12',
  'character-female-13', 'character-female-14', 'character-female-15', 'character-female-16',
  'character-27-hm', 'character-27-female-hm', 'character-28-hm', 'character-28-female-hm',
  'character-29', 'character-29-female', 'character-30', 'character-30-female',
  'character-31', 'character-31-female', 'character-32', 'character-32-female',
  'character-33-female',
]);

export const POLICE_CHARACTER_CANDIDATES = Object.freeze([
  'character-17-police', 'character-18-police', 'character-19-police',
  'character-20-police', 'character-21-police', 'character-22-police',
  'character-17-female-police', 'character-18-female-police',
  'character-19-female-police', 'character-20-female-police',
  'character-25-female-police', 'character-26-female-police',
]);

export function stableCharacterCandidate(candidates, key = 0) {
  if (!candidates.length) return null;
  const text = String(key ?? '0');
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return candidates[(hash >>> 0) % candidates.length];
}
