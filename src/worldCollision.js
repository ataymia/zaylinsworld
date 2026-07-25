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
export const BREAKABLE_RESPAWN_MS = 30 * 60 * 1000;
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export function clearWorldObjects() { _breakables.length = 0; }

// Register a world object. `group` is the THREE object to tip/hide on break.
export function registerWorldObject(group, x, z, {
  id = null,
  r = 0.6,
  kind = 'prop',
  halfExtents = null,
  rotationY = 0,
  respawnMs = BREAKABLE_RESPAWN_MS,
  onBreak = null,
  onRestore = null,
} = {}) {
  const type = collisionTypeForKind(kind);
  if (type === 'none') return null;
  const o = {
    id: id || `${kind}:${x.toFixed(2)}:${z.toFixed(2)}:${_breakables.length}`,
    group,
    x,
    z,
    r,
    kind,
    type,
    halfExtents: halfExtents
      ? {
        x: Math.max(0, Number(halfExtents.x) || 0),
        z: Math.max(0, Number(halfExtents.z) || 0),
      }
      : null,
    rotationY: Number(rotationY) || 0,
    broken: false,
    mass: behaviorForKind(kind).mass,
    respawnMs: Math.max(0, Number(respawnMs) || 0),
    restoreAt: 0,
    onBreak,
    onRestore,
    original: group ? {
      position: group.position.clone(),
      quaternion: group.quaternion.clone(),
      scale: group.scale.clone(),
      visible: group.visible,
    } : null,
  };
  _breakables.push(o);
  return o;
}

export function breakableCount() { return _breakables.filter(o => o.type === 'breakable').length; }
export function worldObjectCount() { return _breakables.length; }

function breakObject(object, timestamp) {
  object.broken = true;
  object.restoreAt = object.respawnMs > 0 ? timestamp + object.respawnMs : 0;
  if (typeof object.onBreak === 'function') {
    object.onBreak(object);
    return;
  }
  if (object.group) {
    object.group.rotation.z = (Math.random() < 0.5 ? 1 : -1) * (Math.PI / 2 - 0.2);
    object.group.position.y = (object.group.position.y || 0) - 0.1;
  }
}

function restoreObject(object) {
  object.broken = false;
  object.restoreAt = 0;
  if (typeof object.onRestore === 'function') {
    object.onRestore(object);
    return;
  }
  if (object.group && object.original) {
    object.group.position.copy(object.original.position);
    object.group.quaternion.copy(object.original.quaternion);
    object.group.scale.copy(object.original.scale);
    object.group.visible = object.original.visible;
    object.group.updateMatrixWorld(true);
  }
}

export function updateWorldObjects(timestamp = nowMs()) {
  let restored = 0;
  for (const object of _breakables) {
    if (!object.broken || !object.restoreAt || timestamp < object.restoreAt) continue;
    restoreObject(object);
    restored += 1;
  }
  return restored;
}

function vehicleIntersects(object, position, vehicleRadius) {
  const dx = object.x - position.x;
  const dz = object.z - position.z;
  if (!object.halfExtents) {
    const radius = object.r + vehicleRadius;
    return dx * dx + dz * dz <= radius * radius;
  }

  // Closest-point test against an oriented footprint. Production filler
  // buildings use this path so cars cannot clip through the corners of a
  // rectangular GLB while still keeping the collision loop allocation-free.
  const cos = Math.cos(-object.rotationY);
  const sin = Math.sin(-object.rotationY);
  const localX = dx * cos - dz * sin;
  const localZ = dx * sin + dz * cos;
  const outsideX = Math.max(Math.abs(localX) - object.halfExtents.x, 0);
  const outsideZ = Math.max(Math.abs(localZ) - object.halfExtents.z, 0);
  return outsideX * outsideX + outsideZ * outsideZ <= vehicleRadius * vehicleRadius;
}

// Detailed vehicle/world impact used by the driving loop. A slow car is blocked
// by poles instead of ghosting through them; a hard impact knocks breakables
// down and schedules their deterministic 30-minute restoration.
export function collideVehicleImpact(pos, speed, onBreak, {
  previousPos = null,
  vehicleRadius = 1.6,
  timestamp = nowMs(),
} = {}) {
  updateWorldObjects(timestamp);
  let damage = 0;
  let blocked = false;
  const broken = [];
  const hits = [];
  const spd = Math.abs(speed || 0);
  for (const o of _breakables) {
    if (o.broken) continue;
    if (!vehicleIntersects(o, pos, vehicleRadius)) continue;
    if (o.type === 'soft') continue;             // drive over litter, no effect
    hits.push(o);
    if (o.type === 'hard') {
      blocked = true;
      damage += impactDamage(spd, o.kind);
      continue;
    }
    if (o.type === 'breakable') {
      const b = behaviorForKind(o.kind);
      if (spd < b.minSpeedToDamage) {
        blocked = true;
        continue;
      }
      breakObject(o, timestamp);
      broken.push(o);
      damage += impactDamage(spd, o.kind);
      if (onBreak) { try { onBreak(o); } catch { /* fx must never break driving */ } }
    }
  }
  if (blocked && previousPos && pos?.copy) pos.copy(previousPos);
  else if (blocked && previousPos) {
    pos.x = previousPos.x;
    pos.z = previousPos.z;
  }
  return { damage, blocked, broken, hits };
}

// Backward-compatible damage-only wrapper for older callers and tools.
export function collideVehicle(pos, speed, onBreak) {
  return collideVehicleImpact(pos, speed, onBreak).damage;
}

export function getWorldObjects() { return _breakables.slice(); }

export default {
  clearWorldObjects,
  registerWorldObject,
  collideVehicle,
  collideVehicleImpact,
  updateWorldObjects,
  breakableCount,
  worldObjectCount,
  getWorldObjects,
};
