// ─────────────────────────────────────────────────────────────────────────────
// DistrictMassing.js — Phase 6B placeholder city massing with instanced geometry.
//
// The massing is intentionally asset-agnostic. Stable parcels determine scale and
// density; registered GLBs can replace individual parcels later without moving
// gameplay locations or rewriting the district layout.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { STARTER_TOWN_PARCELS } from '../config/starterTownParcelPlan.js';
import { DISTRICT_PROFILE_BY_ID } from '../config/starterTownDistrictProfiles.js';
import { STARTER_TOWN_RUNTIME_PLAN } from '../config/starterTownRuntimePlan.js';
import { RoadNetwork } from './RoadNetwork.js';

const NON_BUILDING_TYPES = new Set([
  'parking', 'park', 'park-support', 'civic-plaza', 'recreation', 'purposeful-empty', 'future-update',
]);
const ROAD_SETBACK = 3;
const PARCEL_EDGE_SETBACK = 3;
const DEFAULT_ROAD_NETWORK = new RoadNetwork(STARTER_TOWN_RUNTIME_PLAN.routes);
const FOOTPRINT_LIMITS = Object.freeze({
  'residential-row': Object.freeze({ w: 20, d: 17 }),
  'residential-block': Object.freeze({ w: 34, d: 28 }),
  'commercial-row': Object.freeze({ w: 32, d: 24 }),
  commercial: Object.freeze({ w: 34, d: 28 }),
  'mixed-use': Object.freeze({ w: 36, d: 30 }),
  industrial: Object.freeze({ w: 50, d: 38 }),
  office: Object.freeze({ w: 40, d: 34 }),
  civic: Object.freeze({ w: 42, d: 36 }),
  'parking-structure': Object.freeze({ w: 46, d: 38 }),
});

function hash(text) {
  let value = 2166136261;
  for (let i = 0; i < String(text).length; i++) {
    value ^= String(text).charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function randomFactory(seed) {
  let state = hash(seed) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function floorRange(parcel, profile) {
  if (Array.isArray(parcel.floors)) return parcel.floors;
  return [profile?.buildingScale?.minFloors || 1, profile?.buildingScale?.maxFloors || 4];
}

function placementCount(parcel) {
  if (Number(parcel.lots) > 0) return parcel.lots;
  if (parcel.type === 'residential-row') return 5;
  if (parcel.type === 'commercial-row') return 4;
  if (parcel.type === 'mixed-use') return 3;
  if (parcel.type === 'residential-block') return 3;
  if (parcel.type === 'industrial') return 2;
  return 1;
}

function closestPointToSegment(x, z, segment) {
  const sx = segment.start.x;
  const sz = segment.start.z;
  const dx = segment.end.x - sx;
  const dz = segment.end.z - sz;
  const lengthSq = dx * dx + dz * dz;
  const t = lengthSq > 0
    ? Math.max(0, Math.min(1, ((x - sx) * dx + (z - sz) * dz) / lengthSq))
    : 0;
  return { x: sx + dx * t, z: sz + dz * t };
}

export function buildingRoadClearance(position, size, roadNetwork = DEFAULT_ROAD_NETWORK) {
  let minimum = Infinity;
  const halfW = size.x / 2;
  const halfD = size.z / 2;
  for (const segment of roadNetwork.segments) {
    const nearest = closestPointToSegment(position.x, position.z, segment);
    const dx = position.x - nearest.x;
    const dz = position.z - nearest.z;
    const distance = Math.hypot(dx, dz);
    const support = distance > 0.0001
      ? Math.abs(dx / distance) * halfW + Math.abs(dz / distance) * halfD
      : Math.hypot(halfW, halfD);
    minimum = Math.min(minimum, distance - segment.width / 2 - support);
  }
  return minimum;
}

function overlapsPlacement(position, size, placements, gap = 3) {
  return placements.some((other) => {
    const xGap = Math.abs(position.x - other.position.x) - (size.x + other.size.x) / 2;
    const zGap = Math.abs(position.z - other.position.z) - (size.z + other.size.z) / 2;
    return xGap < gap && zGap < gap;
  });
}

function candidatePositions(bounds, size, preferred) {
  const minX = bounds.x - bounds.w / 2 + size.x / 2 + PARCEL_EDGE_SETBACK;
  const maxX = bounds.x + bounds.w / 2 - size.x / 2 - PARCEL_EDGE_SETBACK;
  const minZ = bounds.z - bounds.d / 2 + size.z / 2 + PARCEL_EDGE_SETBACK;
  const maxZ = bounds.z + bounds.d / 2 - size.z / 2 - PARCEL_EDGE_SETBACK;
  if (minX > maxX || minZ > maxZ) return [];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const candidates = [{
    x: clamp(preferred.x, minX, maxX),
    z: clamp(preferred.z, minZ, maxZ),
  }];
  const steps = 8;
  for (let zi = 0; zi <= steps; zi++) {
    for (let xi = 0; xi <= steps; xi++) {
      candidates.push({
        x: minX + (maxX - minX) * (xi / steps),
        z: minZ + (maxZ - minZ) * (zi / steps),
      });
    }
  }
  return candidates;
}

function resolveRoadSafePlacement(bounds, preferred, initialSize, placements, roadNetwork) {
  let size = { ...initialSize };
  let bestFallback = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    let bestSafe = null;
    for (const position of candidatePositions(bounds, size, preferred)) {
      if (overlapsPlacement(position, size, placements)) continue;
      const roadClearance = buildingRoadClearance(position, size, roadNetwork);
      const deviation = Math.hypot(position.x - preferred.x, position.z - preferred.z);
      const score = roadClearance - deviation * 0.002;
      const candidate = { position, size: { ...size }, roadClearance, score };
      if (!bestFallback || score > bestFallback.score) bestFallback = candidate;
      if (roadClearance >= ROAD_SETBACK && (!bestSafe || score > bestSafe.score)) {
        bestSafe = { ...candidate, safe: true };
      }
    }
    if (bestSafe) return bestSafe;
    size = {
      x: Math.max(5, size.x * 0.86),
      y: size.y,
      z: Math.max(5, size.z * 0.86),
    };
  }
  return bestFallback;
}

function createPlacements(parcel, profile, roadNetwork = DEFAULT_ROAD_NETWORK) {
  if (NON_BUILDING_TYPES.has(parcel.type)) return [];
  const rand = randomFactory(parcel.id);
  const count = placementCount(parcel);
  const bounds = parcel.bounds;
  const horizontal = bounds.w >= bounds.d;
  const padding = parcel.type === 'industrial' || parcel.type === 'vehicle' ? 10 : 6;
  const usableW = Math.max(4, bounds.w - padding * 2);
  const usableD = Math.max(4, bounds.d - padding * 2);
  const [minFloors, maxFloors] = floorRange(parcel, profile);
  const placements = [];

  for (let index = 0; index < count; index++) {
    const slot = (index + 0.5) / count;
    const rawWidth = horizontal
      ? Math.max(5, usableW / count * (0.72 + rand() * 0.2))
      : Math.max(5, usableW * (0.62 + rand() * 0.22));
    const rawDepth = horizontal
      ? Math.max(5, usableD * (0.62 + rand() * 0.22))
      : Math.max(5, usableD / count * (0.72 + rand() * 0.2));
    const limit = FOOTPRINT_LIMITS[parcel.type] || FOOTPRINT_LIMITS.commercial;
    const width = Math.min(rawWidth, limit.w);
    const depth = Math.min(rawDepth, limit.d);
    const floors = Math.max(1, Math.round(minFloors + rand() * Math.max(0, maxFloors - minFloors)));
    const floorHeight = parcel.type === 'industrial' || parcel.type === 'vehicle' ? 4.2 : 3.15;
    const height = floors * floorHeight;
    const preferred = {
      x: bounds.x + (horizontal ? (slot - 0.5) * usableW : (rand() - 0.5) * usableW * 0.35),
      z: bounds.z + (horizontal ? (rand() - 0.5) * usableD * 0.35 : (slot - 0.5) * usableD),
    };
    const resolved = resolveRoadSafePlacement(
      bounds,
      preferred,
      { x: width, y: height, z: depth },
      placements,
      roadNetwork,
    );
    if (!resolved) continue;
    placements.push(Object.freeze({
      id: `${parcel.id}:massing:${index}`,
      parcelId: parcel.id,
      districtId: parcel.districtId,
      type: parcel.type,
      position: Object.freeze({ x: resolved.position.x, y: height / 2, z: resolved.position.z }),
      size: Object.freeze(resolved.size),
      roadClearance: resolved.roadClearance,
      roadSafe: resolved.roadClearance >= ROAD_SETBACK,
      floors,
      roofVariant: rand() > 0.78 ? 'step' : rand() > 0.58 ? 'parapet' : 'flat',
      seed: hash(`${parcel.id}:${index}`),
    }));
  }
  return placements;
}

function materialFor(profile, index = 0) {
  const palette = profile?.palette || ['#777777'];
  return new THREE.MeshStandardMaterial({
    color: palette[index % palette.length],
    roughness: 0.88,
    metalness: 0.02,
  });
}

export function buildDistrictMassing({
  parcels = STARTER_TOWN_PARCELS,
  includeFunctional = false,
  castShadows = false,
  receiveShadows = true,
  heightAt = null,
} = {}) {
  const group = new THREE.Group();
  group.name = 'ZW_DistrictMassing';
  const byDistrict = new Map();
  const placements = [];

  for (const parcel of parcels) {
    if (!includeFunctional && parcel.locationId) continue;
    const profile = DISTRICT_PROFILE_BY_ID[parcel.districtId];
    for (const placement of createPlacements(parcel, profile, DEFAULT_ROAD_NETWORK)) {
      placements.push(placement);
      const list = byDistrict.get(parcel.districtId) || [];
      list.push(placement);
      byDistrict.set(parcel.districtId, list);
    }
  }

  const baseGeometry = new THREE.BoxGeometry(1, 1, 1);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();

  for (const [districtId, districtPlacements] of byDistrict) {
    const profile = DISTRICT_PROFILE_BY_ID[districtId];
    const paletteCount = Math.max(1, Math.min(4, profile?.palette?.length || 1));
    for (let paletteIndex = 0; paletteIndex < paletteCount; paletteIndex++) {
      const instances = districtPlacements.filter((placement) => placement.seed % paletteCount === paletteIndex);
      if (!instances.length) continue;
      const mesh = new THREE.InstancedMesh(baseGeometry, materialFor(profile, paletteIndex), instances.length);
      mesh.name = `ZW_Massing_${districtId}_${paletteIndex}`;
      mesh.castShadow = castShadows;
      mesh.receiveShadow = receiveShadows;
      mesh.frustumCulled = true;
      mesh.userData.districtId = districtId;
      mesh.userData.instanceIds = instances.map((placement) => placement.id);
      instances.forEach((placement, index) => {
        const surfaceY = typeof heightAt === 'function' ? Number(heightAt(placement.position.x, placement.position.z)) || 0 : 0;
        position.set(placement.position.x, placement.position.y + surfaceY, placement.position.z);
        scale.set(placement.size.x, placement.size.y, placement.size.z);
        quaternion.identity();
        matrix.compose(position, quaternion, scale);
        mesh.setMatrixAt(index, matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      group.add(mesh);
    }
  }

  group.userData.placements = placements;
  group.userData.districtCount = byDistrict.size;
  group.userData.instanceCount = placements.length;
  group.userData.terrainAware = typeof heightAt === 'function';
  group.userData.roadSafe = placements.every((placement) => placement.roadSafe);
  group.userData.snapshot = () => Object.freeze({
    districts: byDistrict.size,
    instances: placements.length,
    meshes: group.children.length,
    terrainAware: typeof heightAt === 'function',
    roadSafe: placements.every((placement) => placement.roadSafe),
    byDistrict: Object.fromEntries([...byDistrict].map(([id, list]) => [id, list.length])),
  });

  return { group, placements, byDistrict };
}

export { createPlacements as massingPlacementsForParcel };
export default buildDistrictMassing;
