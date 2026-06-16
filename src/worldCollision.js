// ───────────────────────────────────────────────────────────────────────────
//  worldCollision.js — breakable/solid world-object registry (Phase 2E)
//
//  A lightweight registry of world objects a car can interact with beyond the
//  static AABB colliders: BREAKABLE props (streetlights, signs, cones, cans)
//  that tip/break and lightly damage the car, and SOFT props (litter) the car
//  drives over harmlessly. Builders register objects here; the vehicle loop
//  calls collideVehicle() each frame.
//
//  Solid objects keep using world.js's `colliders` AABB array (cars already
//  bounce off those) — this module adds the BREAK behavior on top.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { collisionTypeForKind, behaviorForKind, impactDamage } from './config/vehicleCollisionRules.js';

const _breakables = [];   // { group, x, z, r, kind, type, broken, mass }

export function clearWorldObjects() { _breakables.length = 0; }

// Register a world object. `group` is the THREE object to tip/hide on break.
export function registerWorldObject(group, x, z, { r = 0.6, kind = 'prop' } = {}) {
  const type = collisionTypeForKind(kind);
  if (type === 'none') return null;
  const o = { group, x, z, r, kind, type, broken: false, mass: behaviorForKind(kind).mass };
  _breakables.push(o);
  return o;
}

export function breakableCount() { return _breakables.filter(o => o.type === 'breakable').length; }
export function worldObjectCount() { return _breakables.length; }

// Test a moving vehicle against breakable/soft objects. Breaks anything hit at
// speed and returns the TOTAL car damage to apply (caller adds it to v.damage).
// onBreak(obj) is called once per object as it breaks (for fx/notify).
export function collideVehicle(pos, speed, onBreak) {
  let dmg = 0;
  const spd = Math.abs(speed || 0);
  for (const o of _breakables) {
    if (o.broken) continue;
    const d = Math.hypot(o.x - pos.x, o.z - pos.z);
    if (d > o.r + 1.6) continue;                 // 1.6 ≈ car half-width
    if (o.type === 'soft') continue;             // drive over litter, no effect
    if (o.type === 'breakable') {
      const b = behaviorForKind(o.kind);
      if (spd < b.minSpeedToDamage) continue;    // a slow nudge doesn't break it
      o.broken = true;
      // tip the object over and sink it slightly so it reads as knocked down
      if (o.group) {
        o.group.rotation.z = (Math.random() < 0.5 ? 1 : -1) * (Math.PI / 2 - 0.2);
        o.group.position.y = (o.group.position.y || 0) - 0.1;
      }
      dmg += impactDamage(spd, o.kind);
      if (onBreak) { try { onBreak(o); } catch { /* fx must never break driving */ } }
    }
  }
  return dmg;
}

export function getWorldObjects() { return _breakables.slice(); }

export default { clearWorldObjects, registerWorldObject, collideVehicle, breakableCount, worldObjectCount, getWorldObjects };
