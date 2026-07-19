// Deterministic starter-vehicle placement near the player's arrival position.
// Prefer a real authored road lane; if the player resumes away from a road,
// place the car beside them so they can never be stranded in the large world.

import { STARTER_TOWN_RUNTIME_PLAN } from './starterTownRuntimePlan.js';
import { ROAD_TIERS } from './worldMapPlan.js';

const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

function closestRoadSample(position, routes) {
  const px = finite(position?.x);
  const pz = finite(position?.z);
  let best = null;
  for (const route of routes || []) {
    const points = route.points || [];
    for (let index = 0; index < points.length - 1; index++) {
      const start = points[index];
      const end = points[index + 1];
      const dx = finite(end.x) - finite(start.x);
      const dz = finite(end.z) - finite(start.z);
      const lengthSq = dx * dx + dz * dz;
      if (lengthSq < 0.001) continue;
      const t = Math.max(0, Math.min(1,
        ((px - finite(start.x)) * dx + (pz - finite(start.z)) * dz) / lengthSq));
      const x = finite(start.x) + dx * t;
      const z = finite(start.z) + dz * t;
      const distance = Math.hypot(px - x, pz - z);
      if (!best || distance < best.distance) {
        const length = Math.sqrt(lengthSq);
        best = {
          x, z, distance,
          direction: { x: dx / length, z: dz / length },
          width: finite(route.width, finite(ROAD_TIERS[route.tier]?.width, 10)),
        };
      }
    }
  }
  return best;
}

function arrivalFallback(px, pz, facing) {
  const yaw = finite(facing);
  const offset = 2.6;
  return Object.freeze({
    x: px + Math.cos(yaw) * offset,
    z: pz - Math.sin(yaw) * offset,
    rotationY: yaw,
    source: 'arrival-fallback',
    distanceFromPlayer: offset,
  });
}

export function starterVehicleSpawnNear(position, {
  facing = 0,
  routes = STARTER_TOWN_RUNTIME_PLAN.routes,
  maxRoadDistance = 9,
} = {}) {
  const px = finite(position?.x);
  const pz = finite(position?.z);
  const road = closestRoadSample({ x: px, z: pz }, routes);
  if (road && road.distance <= maxRoadDistance) {
    const laneOffset = Math.max(2.05, Math.min(2.4, road.width * 0.18));
    const normal = { x: -road.direction.z, z: road.direction.x };
    // Nudge along the lane as well as sideways. This keeps the car inside the
    // 3.2 m interaction radius without overlapping the avatar at road-adjacent
    // arrival points such as Dreamdrop Core.
    const forwardClearance = 1.65;
    const laneX = road.x + road.direction.x * forwardClearance;
    const laneZ = road.z + road.direction.z * forwardClearance;
    const sideA = { x: laneX + normal.x * laneOffset, z: laneZ + normal.z * laneOffset };
    const sideB = { x: laneX - normal.x * laneOffset, z: laneZ - normal.z * laneOffset };
    const distA = Math.hypot(sideA.x - px, sideA.z - pz);
    const distB = Math.hypot(sideB.x - px, sideB.z - pz);
    const selected = distA <= distB ? sideA : sideB;
    const distanceFromPlayer = Math.hypot(selected.x - px, selected.z - pz);
    // A road can be close enough to be useful for navigation while its driving
    // lane is still outside the 3.2 m interaction radius. Exploration always
    // wins: fall back beside the avatar rather than strand them near a road.
    if (distanceFromPlayer > 2.95) return arrivalFallback(px, pz, facing);
    return Object.freeze({
      ...selected,
      rotationY: Math.atan2(road.direction.x, road.direction.z),
      source: 'road-lane',
      distanceFromPlayer,
    });
  }

  return arrivalFallback(px, pz, facing);
}

export default starterVehicleSpawnNear;
