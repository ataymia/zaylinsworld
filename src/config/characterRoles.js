// ───────────────────────────────────────────────────────────────────────────
// characterRoles.js — authoritative visible-character role policy.
//
// Complete character GLBs work well for civilians and officers because their
// outfit/body is authored as one model. They are NOT the correct player solution:
// swapping a complete GLB over the creator avatar would erase the selected skin,
// body, top, bottoms and shoes. The player therefore stays procedural-custom
// until a modular rig/clothing pipeline is ready.
// ───────────────────────────────────────────────────────────────────────────

export const CHARACTER_ROLE_POLICY = Object.freeze({
  player: Object.freeze({
    mode: 'procedural-custom',
    reason: 'Preserves creator skin tone, body, height, clothes, shoes, hair and attachments.',
  }),
  civilian: Object.freeze({
    mode: 'glb-capped',
    maxLiveSkins: 12,
    height: 1.75,
    playEmbeddedClip: true,
  }),
  police: Object.freeze({
    mode: 'glb-with-procedural-fallback',
    height: 1.82,
    playEmbeddedClip: true,
  }),
});

// Curated to ordinary kid-safe town residents. Emergency-service, killer and
// monster variants are deliberately excluded from the civilian pool.
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
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return candidates[(hash >>> 0) % candidates.length];
}
