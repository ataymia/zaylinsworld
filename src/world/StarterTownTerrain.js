// ─────────────────────────────────────────────────────────────────────────────
// StarterTownTerrain.js — deterministic terrain, road-grade, and recovery heights.
//
// The terrain stays gentle enough for the current vehicle physics. Civic Heights
// rises visibly, Parkside rolls softly, Northworks remains flatter, and authored
// route elevation points override the natural surface where a graded road exists.
// ─────────────────────────────────────────────────────────────────────────────
import { STARTER_TOWN_RUNTIME_PLAN } from '../config/starterTownRuntimePlan.js';
import { ROAD_TIERS } from '../config/worldMapPlan.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smoothstep = (edge0, edge1, value) => {
  const t = clamp((value - edge0) / Math.max(Number.EPSILON, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

function distance2D(ax, az, bx, bz) { return Math.hypot(ax - bx, az - bz); }

function closestSegmentSample(x, z, start, end) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSq = dx * dx + dz * dz;
  const t = lengthSq > 0 ? clamp(((x - start.x) * dx + (z - start.z) * dz) / lengthSq, 0, 1) : 0;
  const px = start.x + dx * t;
  const pz = start.z + dz * t;
  return {
    t,
    x: px,
    z: pz,
    y: (Number(start.y) || 0) + ((Number(end.y) || 0) - (Number(start.y) || 0)) * t,
    distance: distance2D(x, z, px, pz),
  };
}

function civicHeight(x, z) {
  const centerX = 640;
  const centerZ = -430;
  const radius = 720;
  const distance = distance2D(x, z, centerX, centerZ);
  const rise = 1 - smoothstep(120, radius, distance);
  const eastBias = smoothstep(160, 980, x);
  return 27 * rise * (0.62 + eastBias * 0.38);
}

function parksideHeight(x, z) {
  const distance = distance2D(x, z, 520, 660);
  const envelope = 1 - smoothstep(80, 620, distance);
  return envelope * (1.4 + Math.sin(x * 0.011) * 0.55 + Math.cos(z * 0.009) * 0.45);
}

function drainageHeight(x, z) {
  const channelDistance = Math.abs(z - (260 + x * 0.05));
  const channel = 1 - smoothstep(0, 90, channelDistance);
  return -1.5 * channel * smoothstep(-980, -240, x);
}

function northworksFlatten(x, z, value) {
  const west = 1 - smoothstep(-820, 80, x);
  const north = 1 - smoothstep(-820, -260, z);
  const flatten = west * north * 0.78;
  return value * (1 - flatten);
}

export function naturalStarterTownHeight(x, z) {
  const civic = civicHeight(x, z);
  const park = parksideHeight(x, z);
  const drainage = drainageHeight(x, z);
  const broadRoll = Math.sin(x * 0.0024) * 0.5 + Math.cos(z * 0.0021) * 0.45;
  return northworksFlatten(x, z, civic + park + drainage + broadRoll);
}

export function nearestAuthoredGrade(x, z, routes = STARTER_TOWN_RUNTIME_PLAN.routes) {
  let best = null;
  for (const route of routes || []) {
    const points = route.points || [];
    const hasAuthoredElevation = route.graded || points.some((point) => Math.abs(Number(point.y) || 0) > 0.001);
    if (!hasAuthoredElevation) continue;
    const width = Number(route.width) || Number(ROAD_TIERS[route.tier]?.width) || 10;
    for (let index = 0; index < points.length - 1; index++) {
      const sample = closestSegmentSample(x, z, points[index], points[index + 1]);
      if (!best || sample.distance < best.distance) {
        best = { ...sample, routeId: route.id, segmentIndex: index, influence: width / 2 + 18 };
      }
    }
  }
  return best;
}

export function starterTownHeightAt(x, z, options = {}) {
  const natural = naturalStarterTownHeight(x, z);
  const grade = nearestAuthoredGrade(x, z, options.routes || STARTER_TOWN_RUNTIME_PLAN.routes);
  if (!grade || grade.distance >= grade.influence) return natural;
  const blend = 1 - smoothstep(0, grade.influence, grade.distance);
  return natural * (1 - blend) + grade.y * blend;
}

export function roadEndpointHeight(point, route = null) {
  if (route?.graded || Math.abs(Number(point?.y) || 0) > 0.001) return Number(point.y) || 0;
  return starterTownHeightAt(Number(point?.x) || 0, Number(point?.z) || 0);
}

export function roadGrade(start, end, route = null) {
  const startY = roadEndpointHeight(start, route);
  const endY = roadEndpointHeight(end, route);
  const horizontal = Math.max(0.001, Math.hypot((Number(end.x) || 0) - (Number(start.x) || 0), (Number(end.z) || 0) - (Number(start.z) || 0)));
  return {
    startY,
    endY,
    slope: (endY - startY) / horizontal,
    percent: ((endY - startY) / horizontal) * 100,
    horizontal,
  };
}

export function validateStarterTownGrades({
  routes = STARTER_TOWN_RUNTIME_PLAN.routes,
  maxRoadGrade = 0.14,
} = {}) {
  const errors = [];
  const warnings = [];
  const segments = [];
  for (const route of routes || []) {
    for (let index = 0; index < route.points.length - 1; index++) {
      const grade = roadGrade(route.points[index], route.points[index + 1], route);
      const record = Object.freeze({ routeId: route.id, segmentIndex: index, ...grade });
      segments.push(record);
      if (Math.abs(grade.slope) > maxRoadGrade) errors.push(`${route.id}:${index} grade ${(grade.percent).toFixed(1)}% exceeds ${(maxRoadGrade * 100).toFixed(1)}%`);
      else if (Math.abs(grade.slope) > maxRoadGrade * 0.75) warnings.push(`${route.id}:${index} is a steep ${(grade.percent).toFixed(1)}% grade`);
    }
  }
  return Object.freeze({
    ok: errors.length === 0,
    maxRoadGrade,
    segments: Object.freeze(segments),
    errors: Object.freeze(errors),
    warnings: Object.freeze(warnings),
  });
}

export function applyTerrainHeightsToPlane(geometry, { zSign = -1 } = {}) {
  const position = geometry?.getAttribute?.('position');
  if (!position) return geometry;
  for (let index = 0; index < position.count; index++) {
    const worldX = position.getX(index);
    const worldZ = position.getY(index) * zSign;
    position.setZ(index, starterTownHeightAt(worldX, worldZ));
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals?.();
  geometry.computeBoundingBox?.();
  geometry.computeBoundingSphere?.();
  return geometry;
}

export const STARTER_TOWN_GRADE_REPORT = validateStarterTownGrades();

if (typeof window !== 'undefined') {
  window.__ZW_STARTER_TERRAIN_HEIGHT__ = starterTownHeightAt;
  window.__ZW_STARTER_GRADE_REPORT__ = STARTER_TOWN_GRADE_REPORT;
}

export default starterTownHeightAt;
