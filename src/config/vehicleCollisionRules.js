// ───────────────────────────────────────────────────────────────────────────
//  vehicleCollisionRules.js — world-object collision + vehicle damage tuning
//  (Phase 2E)
//
//  Classifies what happens when a car hits a world object, and the damage-state
//  ladder + handling penalties for the car itself. Pure data + small helpers
//  (no THREE/DOM) so worldCollision.js, vehicleDamage.js and main.js all share
//  one source of truth and future towns inherit the same rules.
// ───────────────────────────────────────────────────────────────────────────

// Collision classes a placed object can have.
export const COLLISION_TYPE = {
  HARD: 'hard',           // buildings, walls, gas pumps, dumpsters — stop/bounce + damage
  BREAKABLE: 'breakable', // streetlights, small signs, cans, cones — break/tip + light damage
  SOFT: 'soft',           // litter, grass — drive over, little/no effect
  NONE: 'none',           // purely visual, no car interaction
};

// Per-class behavior the vehicle physics reads.
export const COLLISION_BEHAVIOR = {
  hard: { stop: true, bounce: 0.25, carDamageMult: 1.0, breakable: false, mass: 999, repairable: false, minSpeedToDamage: 4 },
  breakable: { stop: false, bounce: 0.05, carDamageMult: 0.35, breakable: true, mass: 6, repairable: false, respawnable: true, minSpeedToDamage: 5 },
  soft: { stop: false, bounce: 0, carDamageMult: 0.0, breakable: false, mass: 0, repairable: false, minSpeedToDamage: 999 },
  none: { stop: false, bounce: 0, carDamageMult: 0, breakable: false, mass: 0, repairable: false, minSpeedToDamage: 999 },
};

// Map an object kind → collision class. Keyword-based so future props inherit a
// sensible default; unknown → 'hard' (safer to stop a car than to phase through).
const KIND_RULES = [
  { re: /building|wall|store|shop|tower|house|apartment|station|garage/i, type: 'hard' },
  { re: /pump|dumpster|sign_large|billboard|barrier|hydrant/i, type: 'hard' },
  { re: /streetlight|lamp|light_post|pole|sign|cone|trash_?can|mailbox|bench|fence|parking_meter/i, type: 'breakable' },
  { re: /trash_?bag|litter|debris|grass|leaf|paper|gem|puddle/i, type: 'soft' },
];

export function collisionTypeForKind(kind) {
  if (!kind) return 'hard';
  for (const r of KIND_RULES) if (r.re.test(kind)) return r.type;
  return 'hard';
}
export function behaviorForKind(kind) {
  return COLLISION_BEHAVIOR[collisionTypeForKind(kind)];
}

// ── vehicle damage ladder ───────────────────────────────────────────────────
// 0–20 clean · 20–50 dented · 50–80 smoking · 80–100 critical · 100 totaled
export const DAMAGE_STATES = [
  { id: 'clean', min: 0, max: 20, label: 'clean', speedMult: 1.0, steerMult: 1.0, wobble: 0, smoke: false },
  { id: 'dented', min: 20, max: 50, label: 'dented', speedMult: 0.95, steerMult: 0.97, wobble: 0.01, smoke: false },
  { id: 'smoking', min: 50, max: 80, label: 'smoking', speedMult: 0.82, steerMult: 0.9, wobble: 0.03, smoke: true },
  { id: 'critical', min: 80, max: 100, label: 'critical', speedMult: 0.62, steerMult: 0.78, wobble: 0.06, smoke: true },
  { id: 'totaled', min: 100, max: Infinity, label: 'TOTALED', speedMult: 0, steerMult: 0.4, wobble: 0.1, smoke: true },
];

export function damageState(dmg) {
  const d = Math.max(0, Math.min(100, dmg || 0));
  for (const s of DAMAGE_STATES) if (d >= s.min && d < s.max) return s;
  return DAMAGE_STATES[DAMAGE_STATES.length - 1];   // 100 → totaled
}

// Damage dealt to the car from an impact at `speed` against an object `kind`.
export function impactDamage(speed, kind) {
  const b = behaviorForKind(kind);
  if (Math.abs(speed) < b.minSpeedToDamage) return 0;
  return Math.abs(speed) * 1.6 * b.carDamageMult;
}

// Damage from a car↔car crash given the combined relative speed.
export function carCrashDamage(relSpeed) {
  return Math.max(0, (relSpeed - 3)) * 0.9;
}

export default {
  COLLISION_TYPE, COLLISION_BEHAVIOR, DAMAGE_STATES,
  collisionTypeForKind, behaviorForKind, damageState, impactDamage, carCrashDamage,
};
