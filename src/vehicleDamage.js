// ───────────────────────────────────────────────────────────────────────────
//  vehicleDamage.js — damage-state → handling + visual feedback (Phase 2E)
//
//  Thin module over config/vehicleCollisionRules.js. Turns a car's 0..100 damage
//  into handling penalties (top speed / steering / wobble), a totaled lock, and
//  a visible scuff/tilt/smoke state. main.js calls handlingFor() each frame
//  while driving and applyDamageVisual() whenever damage changes.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { damageState, impactDamage, carCrashDamage } from './config/vehicleCollisionRules.js';

export { damageState, impactDamage, carCrashDamage };

// Handling multipliers + flags for a given damage value.
export function handlingFor(dmg) {
  const s = damageState(dmg);
  return {
    speedMult: s.speedMult,
    steerMult: s.steerMult,
    wobble: s.wobble,
    totaled: s.id === 'totaled',
    smoke: s.smoke,
    state: s.id,
    label: s.label,
  };
}

// Add impact damage to a vehicle (clamped 0..100). Returns the new state id.
export function addVehicleDamage(v, amount) {
  if (!v) return 'clean';
  v.damage = Math.max(0, Math.min(100, (v.damage || 0) + (amount || 0)));
  return damageState(v.damage).id;
}

// Visual feedback: scuff BoxGeometry body panels darker, tilt the chassis, and
// attach/detach a smoke puff above ~50% damage. Safe on procedural + GLB cars.
export function applyDamageVisual(v) {
  if (!v || !v.g) return;
  const dmg = Math.min(100, v.damage || 0);
  const f = dmg / 100;
  v.g.traverse(o => {
    if (o.isMesh && o.material && o.material.color && o.geometry?.type === 'BoxGeometry') {
      if (!o.userData._baseColor) o.userData._baseColor = o.material.color.clone();
      o.material.color.copy(o.userData._baseColor).lerp(new THREE.Color('#2e2c29'), f * 0.7);
    }
  });
  v.g.rotation.z = -f * 0.06;
  const s = damageState(dmg);
  if (s.smoke && !v._smoke) {
    const smoke = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6),
      new THREE.MeshStandardMaterial({ color: dmg >= 80 ? '#3a3a3a' : '#666', transparent: true, opacity: 0.55 }));
    smoke.position.set(0, 1.1, -1.2); smoke.name = 'dmg-smoke'; v.g.add(smoke); v._smoke = smoke;
  } else if (!s.smoke && v._smoke) {
    v.g.remove(v._smoke); v._smoke = null;
  }
  if (v._smoke) v._smoke.material.color.set(dmg >= 80 ? '#2a2a2a' : '#666');
}

// Per-frame puff animation (call from animate while a smoking car exists).
export function tickDamageSmoke(v, t) {
  if (!v || !v._smoke) return;
  const p = ((t * 0.6) % 1);
  v._smoke.position.y = 1.1 + p * 0.8;
  v._smoke.material.opacity = 0.55 * (1 - p);
  v._smoke.scale.setScalar(0.7 + p * 0.8);
}

export default { handlingFor, addVehicleDamage, applyDamageVisual, tickDamageSmoke, damageState };
