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

const NON_BUILDING_TYPES = new Set([
  'parking', 'park', 'park-support', 'civic-plaza', 'recreation', 'purposeful-empty', 'future-update',
]);

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

function createPlacements(parcel, profile) {
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
    const width = horizontal
      ? Math.max(5, usableW / count * (0.72 + rand() * 0.2))
      : Math.max(5, usableW * (0.62 + rand() * 0.22));
    const depth = horizontal
      ? Math.max(5, usableD * (0.62 + rand() * 0.22))
      : Math.max(5, usableD / count * (0.72 + rand() * 0.2));
    const floors = Math.max(1, Math.round(minFloors + rand() * Math.max(0, maxFloors - minFloors)));
    const floorHeight = parcel.type === 'industrial' || parcel.type === 'vehicle' ? 4.2 : 3.15;
    const height = floors * floorHeight;
    const x = bounds.x + (horizontal ? (slot - 0.5) * usableW : (rand() - 0.5) * usableW * 0.35);
    const z = bounds.z + (horizontal ? (rand() - 0.5) * usableD * 0.35 : (slot - 0.5) * usableD);
    placements.push(Object.freeze({
      id: `${parcel.id}:massing:${index}`,
      parcelId: parcel.id,
      districtId: parcel.districtId,
      type: parcel.type,
      position: Object.freeze({ x, y: height / 2, z }),
      size: Object.freeze({ x: width, y: height, z: depth }),
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
    for (const placement of createPlacements(parcel, profile)) {
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
  group.userData.snapshot = () => Object.freeze({
    districts: byDistrict.size,
    instances: placements.length,
    meshes: group.children.length,
    terrainAware: typeof heightAt === 'function',
    byDistrict: Object.fromEntries([...byDistrict].map(([id, list]) => [id, list.length])),
  });

  return { group, placements, byDistrict };
}

export { createPlacements as massingPlacementsForParcel };
export default buildDistrictMassing;
