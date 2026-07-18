// ─────────────────────────────────────────────────────────────────────────────
// StarterTownBoundaryGuard.js — safe playable bounds and unfinished-edge recovery.
// ─────────────────────────────────────────────────────────────────────────────
import { STARTER_TOWN_RUNTIME_PLAN } from '../config/starterTownRuntimePlan.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const point = (value = {}) => ({ x: Number(value.x) || 0, y: Number(value.y) || 0, z: Number(value.z) || 0 });

function inside(position, bounds, margin = 0) {
  return position.x >= bounds.minX + margin
    && position.x <= bounds.maxX - margin
    && position.z >= bounds.minZ + margin
    && position.z <= bounds.maxZ - margin;
}

function distance2D(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }

export class StarterTownBoundaryGuard {
  constructor({
    plan = STARTER_TOWN_RUNTIME_PLAN,
    playableMargin = 8,
    terrainMargin = 24,
    gatewayAllowance = 210,
  } = {}) {
    this.plan = plan;
    this.playableMargin = playableMargin;
    this.terrainMargin = terrainMargin;
    this.gatewayAllowance = gatewayAllowance;
    this.safeSpawn = plan.spawns.find((spawn) => spawn.id === 'safe-recovery') || plan.spawns[0];
    this.gateways = plan.routes
      .filter((route) => route.gatewayId)
      .map((route) => ({
        id: route.gatewayId,
        routeId: route.id,
        position: point(route.points.at(-1)),
        inner: point(route.points.at(-2) || route.points.at(-1)),
      }));
  }

  isInsidePlayable(position, margin = this.playableMargin) {
    return inside(point(position), this.plan.playableBounds, margin);
  }

  isInsideTerrain(position, margin = this.terrainMargin) {
    return inside(point(position), this.plan.terrainBounds, margin);
  }

  nearestGateway(position) {
    const target = point(position);
    let best = null;
    for (const gateway of this.gateways) {
      const distance = distance2D(target, gateway.position);
      if (!best || distance < best.distance) best = { ...gateway, distance };
    }
    return best;
  }

  gatewayAllows(position) {
    const nearest = this.nearestGateway(position);
    if (!nearest || nearest.distance > this.gatewayAllowance) return null;
    const target = point(position);
    const dx = nearest.position.x - nearest.inner.x;
    const dz = nearest.position.z - nearest.inner.z;
    const length = Math.max(0.001, Math.hypot(dx, dz));
    const forward = ((target.x - nearest.inner.x) * dx + (target.z - nearest.inner.z) * dz) / length;
    const lateral = Math.abs((target.x - nearest.inner.x) * (-dz / length) + (target.z - nearest.inner.z) * (dx / length));
    if (forward < -45 || lateral > 70) return null;
    return nearest;
  }

  clampToPlayable(position) {
    const target = point(position);
    const bounds = this.plan.playableBounds;
    return {
      x: clamp(target.x, bounds.minX + this.playableMargin, bounds.maxX - this.playableMargin),
      y: target.y,
      z: clamp(target.z, bounds.minZ + this.playableMargin, bounds.maxZ - this.playableMargin),
    };
  }

  safeRecovery(reason = 'outside-terrain') {
    const spawn = this.safeSpawn;
    return Object.freeze({
      action: 'recover',
      reason,
      spawnId: spawn.id,
      position: point(spawn.position),
      facing: Number(spawn.facing) || 0,
    });
  }

  evaluate(position, { allowGateway = true } = {}) {
    const target = point(position);
    if (this.isInsidePlayable(target, 0)) return Object.freeze({ action: 'allow', reason: 'inside-playable', position: target });
    if (allowGateway) {
      const gateway = this.gatewayAllows(target);
      if (gateway && this.isInsideTerrain(target, 0)) {
        return Object.freeze({ action: 'allow-gateway', reason: gateway.id, gatewayId: gateway.id, position: target });
      }
    }
    if (this.isInsideTerrain(target, 0)) {
      return Object.freeze({ action: 'clamp', reason: 'outside-playable', position: this.clampToPlayable(target) });
    }
    return this.safeRecovery('outside-terrain-envelope');
  }

  snapshot() {
    return Object.freeze({
      playableBounds: { ...this.plan.playableBounds },
      terrainBounds: { ...this.plan.terrainBounds },
      safeSpawnId: this.safeSpawn?.id || null,
      gateways: this.gateways.map((gateway) => ({ id: gateway.id, routeId: gateway.routeId, position: { ...gateway.position } })),
    });
  }
}

export const starterTownBoundaryGuard = new StarterTownBoundaryGuard();

if (typeof window !== 'undefined') {
  window.__ZW_STARTER_BOUNDARY_GUARD__ = starterTownBoundaryGuard;
}

export default starterTownBoundaryGuard;
