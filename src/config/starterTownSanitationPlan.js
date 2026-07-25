// ─────────────────────────────────────────────────────────────────────────────
// starterTownSanitationPlan.js — authoritative large-town sanitation placement.
// ─────────────────────────────────────────────────────────────────────────────
import { STARTER_TOWN_RUNTIME_PLAN } from './starterTownRuntimePlan.js';
import { ROAD_TIERS } from './worldMapPlan.js';

const freeze = (value) => Object.freeze(value);

export const STARTER_TOWN_SANITATION_STOP = freeze({
  id: 'dreamdrop-sanitation-stop',
  districtId: 'dreamdrop-district',
  worker: freeze({ x: 8.1, z: 54, facing: Math.PI }),
  dumpster: freeze({
    x: 20,
    z: 68,
    facing: Math.PI / 2,
    assetId: 'library:props:zta-free-asset-factory:prop-starter-industrial-dumpster-a-v01',
  }),
  serviceRouteId: 'dreamdrop-alley',
});

const WALKABLE_TIERS = new Set(['parkway', 'main', 'local']);

function routeSegments(routes = STARTER_TOWN_RUNTIME_PLAN.routes, allowedTiers = null) {
  const segments = [];
  for (const route of routes) {
    if (allowedTiers && !allowedTiers.has(route.tier)) continue;
    const width = Number(ROAD_TIERS[route.tier]?.width) || 9;
    for (let index = 0; index < route.points.length - 1; index++) {
      const start = route.points[index];
      const end = route.points[index + 1];
      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const length = Math.hypot(dx, dz);
      if (length < 12) continue;
      segments.push(freeze({
        id: `${route.id}:${index}`,
        routeId: route.id,
        start,
        end,
        width,
        length,
        dx: dx / length,
        dz: dz / length,
      }));
    }
  }
  return segments;
}

export const STARTER_TOWN_LITTER_SEGMENTS = freeze(
  routeSegments(STARTER_TOWN_RUNTIME_PLAN.routes, WALKABLE_TIERS),
);
export const STARTER_TOWN_DRIVING_SEGMENTS = freeze(routeSegments());

function weightedSegment(random, segments) {
  const total = segments.reduce((sum, segment) => sum + segment.length, 0);
  let cursor = random() * Math.max(1, total);
  for (const segment of segments) {
    cursor -= segment.length;
    if (cursor <= 0) return segment;
  }
  return segments.at(-1) || null;
}

function clearOf(points, x, z, fallbackRadius) {
  return points.every((entry) => (
    Math.hypot(x - entry.x, z - entry.z) >= (Number(entry.r) || fallbackRadius)
  ));
}

function distanceToSegment(x, z, segment) {
  const sx = segment.start.x;
  const sz = segment.start.z;
  const dx = segment.end.x - sx;
  const dz = segment.end.z - sz;
  const lengthSq = dx * dx + dz * dz;
  const t = lengthSq > 0
    ? Math.max(0, Math.min(1, ((x - sx) * dx + (z - sz) * dz) / lengthSq))
    : 0;
  return Math.hypot(x - (sx + dx * t), z - (sz + dz * t));
}

function clearOfDrivingLanes(x, z, segments = STARTER_TOWN_DRIVING_SEGMENTS) {
  return segments.every((segment) => distanceToSegment(x, z, segment) > segment.width / 2 + 0.7);
}

export function generateStarterTownLitterPositions(count, {
  random = Math.random,
  avoid = [],
  existing = [],
  segments = STARTER_TOWN_LITTER_SEGMENTS,
} = {}) {
  const out = [];
  const occupied = existing.map((entry) => ({ x: entry.x, z: entry.z }));
  const bounds = STARTER_TOWN_RUNTIME_PLAN.playableBounds;
  for (let attempt = 0; out.length < count && attempt < count * 180; attempt++) {
    const segment = weightedSegment(random, segments);
    if (!segment) break;
    const t = 0.08 + random() * 0.84;
    const side = random() < 0.5 ? -1 : 1;
    const offset = segment.width / 2 + 2.15;
    const normalX = -segment.dz;
    const normalZ = segment.dx;
    const x = segment.start.x + (segment.end.x - segment.start.x) * t + normalX * offset * side;
    const z = segment.start.z + (segment.end.z - segment.start.z) * t + normalZ * offset * side;
    if (x < bounds.minX + 8 || x > bounds.maxX - 8 || z < bounds.minZ + 8 || z > bounds.maxZ - 8) continue;
    if (!clearOfDrivingLanes(x, z)) continue;
    if (!clearOf(avoid, x, z, 6)) continue;
    if (!clearOf(occupied, x, z, 18)) continue;
    const entry = freeze({ x, z, routeId: segment.routeId });
    out.push(entry);
    occupied.push(entry);
  }
  return freeze(out);
}

export default STARTER_TOWN_SANITATION_STOP;
