// ─────────────────────────────────────────────────────────────────────────────
// StarterTownGroundCover.js — parcel surfaces and lightweight landscaping.
//
// District massing provides building volume, but the authored gaps still need
// readable land use. This layer paints every stable parcel, marks parking rows,
// and places the real tree/rock GLBs shipped with the project (with procedural
// fallbacks so a failed asset can never make the world empty again).
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { STARTER_TOWN_PARCELS } from '../config/starterTownParcelPlan.js';
import { STARTER_TOWN_RUNTIME_PLAN } from '../config/starterTownRuntimePlan.js';
import { loadAsset } from '../assets.js';
import { registerWorldObject } from '../worldCollision.js';
import { RoadNetwork } from './RoadNetwork.js';

const GREEN_TYPES = new Set([
  'park', 'park-support', 'recreation', 'purposeful-empty',
  'residential', 'residential-row', 'residential-block', 'school-campus',
]);
const HARDSTAND_TYPES = new Set([
  'parking', 'parking-structure', 'industrial', 'vehicle', 'service', 'fuel', 'future-update',
]);
const CIVIC_TYPES = new Set(['civic', 'civic-plaza', 'office', 'school-campus']);

const SURFACES = Object.freeze({
  lawn: Object.freeze({ color: '#507648', roughness: 1 }),
  hardstand: Object.freeze({ color: '#4f5354', roughness: 0.94 }),
  civic: Object.freeze({ color: '#8a887d', roughness: 0.92 }),
  neighborhood: Object.freeze({ color: '#736f61', roughness: 0.98 }),
});
const TREE_TARGET = 520;
const ROCK_TARGET = 72;
const DEFAULT_ROAD_NETWORK = new RoadNetwork(STARTER_TOWN_RUNTIME_PLAN.routes);

function surfaceFor(parcel) {
  if (GREEN_TYPES.has(parcel.type)) return 'lawn';
  if (HARDSTAND_TYPES.has(parcel.type)) return 'hardstand';
  if (CIVIC_TYPES.has(parcel.type)) return 'civic';
  return 'neighborhood';
}

function stableUnit(seed) {
  let value = 2166136261;
  for (let index = 0; index < seed.length; index++) {
    value ^= seed.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return (value >>> 0) / 4294967295;
}

function normalizeTemplate(model, targetHeight) {
  model.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  if (!Number.isFinite(size.y) || size.y < 0.001) return false;
  const scale = targetHeight / size.y;
  model.scale.multiplyScalar(scale);
  model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  model.updateWorldMatrix(true, true);
  return true;
}

function fallbackTree() {
  const group = new THREE.Group();
  group.userData.placeholder = true;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.32, 2.4, 8),
    new THREE.MeshStandardMaterial({ color: '#65452d', roughness: 1 }),
  );
  trunk.position.y = 1.2;
  const crown = new THREE.Mesh(
    new THREE.ConeGeometry(1.65, 4.2, 10),
    new THREE.MeshStandardMaterial({ color: '#38633d', roughness: 1 }),
  );
  crown.position.y = 4.1;
  group.add(trunk, crown);
  return group;
}

function fallbackRock() {
  const mesh = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.85, 0),
    new THREE.MeshStandardMaterial({ color: '#696b65', roughness: 1 }),
  );
  mesh.scale.set(1.25, 0.72, 0.95);
  mesh.position.y = 0.55;
  mesh.userData.placeholder = true;
  return mesh;
}

async function realTemplate(kind, renderer) {
  const loaded = kind === 'tree'
    ? await loadAsset('props', 'trees', 'arboles-low-poy', renderer)
    : await loadAsset('props', 'rocks', 'rock-low-poly', renderer);
  const template = loaded?.scene?.clone(true);
  if (!template || !normalizeTemplate(template, kind === 'tree' ? 6.5 : 1.35)) {
    return kind === 'tree' ? fallbackTree() : fallbackRock();
  }
  template.userData.assetId = kind === 'tree' ? 'arboles-low-poy' : 'rock-low-poly';
  return template;
}

function clearOfRoadNetwork(x, z, roadNetwork, margin = 3.5) {
  const nearest = roadNetwork.nearest({ x, z });
  return !nearest || nearest.distance > nearest.segment.width / 2 + margin;
}

function clearOfFunctionalLocation(x, z, margin = 18) {
  return STARTER_TOWN_RUNTIME_PLAN.locations.every((location) => {
    const extra = location.category === 'school' || location.category === 'activity' ? 18 : 0;
    return Math.hypot(x - location.position.x, z - location.position.z) > margin + extra;
  });
}

function perimeterCandidate(parcel, index) {
  const { x, z, w, d } = parcel.bounds;
  const edge = index % 4;
  const along = stableUnit(`${parcel.id}:edge:${index}`) - 0.5;
  if (edge === 0) return { x: x + along * w * 0.82, z: z - d * 0.43 };
  if (edge === 1) return { x: x + w * 0.43, z: z + along * d * 0.82 };
  if (edge === 2) return { x: x + along * w * 0.82, z: z + d * 0.43 };
  return { x: x - w * 0.43, z: z + along * d * 0.82 };
}

export function createStarterTownVegetationPlan(
  parcels = STARTER_TOWN_PARCELS,
  roadNetwork = DEFAULT_ROAD_NETWORK,
) {
  const trees = [];
  const rocks = [];
  for (const parcel of parcels) {
    if (HARDSTAND_TYPES.has(parcel.type) || parcel.type === 'parking') continue;
    const { x, z, w, d } = parcel.bounds;
    const green = GREEN_TYPES.has(parcel.type);
    const area = w * d;
    const desired = green
      ? Math.max(10, Math.min(30, Math.round(area / 900)))
      : Math.max(4, Math.min(10, Math.round(area / 2500)));
    for (let attempt = 0, placed = 0; attempt < desired * 6 && placed < desired; attempt++) {
      const edge = perimeterCandidate(parcel, attempt);
      const candidate = green && attempt % 3 === 0
        ? {
          x: x + (stableUnit(`${parcel.id}:green-x:${attempt}`) - 0.5) * w * 0.76,
          z: z + (stableUnit(`${parcel.id}:green-z:${attempt}`) - 0.5) * d * 0.76,
        }
        : edge;
      if (!clearOfRoadNetwork(candidate.x, candidate.z, roadNetwork)) continue;
      if (!clearOfFunctionalLocation(candidate.x, candidate.z)) continue;
      trees.push({
        id: `${parcel.id}:tree:${placed}`,
        x: candidate.x,
        z: candidate.z,
        rotationY: stableUnit(`${parcel.id}:yaw:${attempt}`) * Math.PI * 2,
        scale: 0.78 + stableUnit(`${parcel.id}:scale:${attempt}`) * 0.48,
      });
      placed += 1;
    }
    if (parcel.type === 'park' || parcel.type === 'purposeful-empty') {
      for (let index = 0; index < 4; index++) {
        const rx = x + (stableUnit(`${parcel.id}:rock-x:${index}`) - 0.5) * w * 0.65;
        const rz = z + (stableUnit(`${parcel.id}:rock-z:${index}`) - 0.5) * d * 0.65;
        if (!clearOfRoadNetwork(rx, rz, roadNetwork, 2.5)) continue;
        rocks.push({
          id: `${parcel.id}:rock:${index}`,
          x: rx,
          z: rz,
          rotationY: stableUnit(`${parcel.id}:rock-yaw:${index}`) * Math.PI * 2,
        });
      }
    }
  }

  // A landscaped outer belt gives off-road exploration a real horizon instead
  // of a flat empty field. It remains inside terrain bounds and clear of roads.
  for (let index = 0; trees.length < TREE_TARGET && index < 900; index++) {
    const ring = index % 2 ? 1035 : 1110;
    const angle = index * 2.399963229728653;
    const wobble = (stableUnit(`outer-tree:${index}`) - 0.5) * 90;
    const x = Math.cos(angle) * (ring + wobble);
    const z = Math.sin(angle) * (ring + wobble);
    if (!clearOfRoadNetwork(x, z, roadNetwork, 5)) continue;
    trees.push({
      id: `outer-belt:tree:${index}`,
      x,
      z,
      rotationY: stableUnit(`outer-tree-yaw:${index}`) * Math.PI * 2,
      scale: 0.88 + stableUnit(`outer-tree-scale:${index}`) * 0.5,
    });
  }

  for (let index = 0; rocks.length < ROCK_TARGET && index < 240; index++) {
    const angle = index * 2.399963229728653;
    const radius = 960 + stableUnit(`outer-rock-radius:${index}`) * 190;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (!clearOfRoadNetwork(x, z, roadNetwork, 2.5)) continue;
    rocks.push({
      id: `outer-belt:rock:${index}`,
      x,
      z,
      rotationY: stableUnit(`outer-rock-yaw:${index}`) * Math.PI * 2,
      scale: 0.8 + stableUnit(`outer-rock-scale:${index}`) * 0.75,
    });
  }
  return Object.freeze({
    trees: Object.freeze(trees.slice(0, TREE_TARGET)),
    rocks: Object.freeze(rocks.slice(0, ROCK_TARGET)),
  });
}

function buildInstancedTemplate(template, entries, heightAt, kind) {
  const group = new THREE.Group();
  group.name = `ZW_GroundCoverInstances_${kind}`;
  template.updateWorldMatrix(true, true);
  const parts = [];
  template.traverse((node) => {
    if (!node.isMesh || !node.geometry || !node.material) return;
    parts.push({
      geometry: node.geometry,
      material: node.material,
      matrix: node.matrixWorld.clone(),
    });
  });
  const placementMatrix = new THREE.Matrix4();
  const combined = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  parts.forEach((part, partIndex) => {
    const mesh = new THREE.InstancedMesh(part.geometry, part.material, entries.length);
    mesh.name = `ZW_GroundCover_${kind}_${partIndex}`;
    mesh.castShadow = kind === 'tree';
    mesh.receiveShadow = true;
    mesh.frustumCulled = true;
    mesh.userData.groundCoverType = kind;
    entries.forEach((entry, index) => {
      position.set(entry.x, Number(heightAt(entry.x, entry.z)) || 0, entry.z);
      quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), entry.rotationY || 0);
      scale.setScalar(entry.scale || 1);
      placementMatrix.compose(position, quaternion, scale);
      combined.multiplyMatrices(placementMatrix, part.matrix);
      mesh.setMatrixAt(index, combined);
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  });
  return { group, drawCalls: parts.length };
}

function buildSurfaceMeshes(parcels, heightAt) {
  const group = new THREE.Group();
  group.name = 'ZW_StarterParcelSurfaces';
  const matrix = new THREE.Matrix4();
  for (const [surface, config] of Object.entries(SURFACES)) {
    const entries = parcels.filter((parcel) => surfaceFor(parcel) === surface);
    if (!entries.length) continue;
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 0.06, 1),
      new THREE.MeshStandardMaterial({ color: config.color, roughness: config.roughness, metalness: 0 }),
      entries.length,
    );
    mesh.name = `ZW_ParcelSurface_${surface}`;
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    entries.forEach((parcel, index) => {
      const bounds = parcel.bounds;
      matrix.compose(
        new THREE.Vector3(bounds.x, (Number(heightAt(bounds.x, bounds.z)) || 0) + 0.02, bounds.z),
        new THREE.Quaternion(),
        new THREE.Vector3(bounds.w * 0.96, 1, bounds.d * 0.96),
      );
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.userData.surfaceType = surface;
    mesh.userData.parcelIds = entries.map((parcel) => parcel.id);
    group.add(mesh);
  }
  return group;
}

function buildParkingStripes(parcels, heightAt) {
  const stripes = [];
  for (const parcel of parcels) {
    const total = Number(parcel.stalls) || Number(parcel.parking) || 0;
    if (!total) continue;
    const count = Math.max(2, Math.min(12, total));
    const { x, z, w, d } = parcel.bounds;
    for (let index = 0; index < count; index++) {
      stripes.push({
        x: x - w * 0.38 + (index / Math.max(1, count - 1)) * w * 0.76,
        z: z + d * 0.36,
      });
    }
  }
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.13, 0.018, 4.4),
    new THREE.MeshStandardMaterial({ color: '#ece9d9', roughness: 0.85, metalness: 0 }),
    stripes.length,
  );
  mesh.name = 'ZW_StarterParkingStripes';
  const matrix = new THREE.Matrix4();
  stripes.forEach((stripe, index) => {
    matrix.makeTranslation(stripe.x, (Number(heightAt(stripe.x, stripe.z)) || 0) + 0.065, stripe.z);
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.receiveShadow = true;
  return { mesh, count: stripes.length };
}

export async function buildStarterTownGroundCover({
  renderer = null,
  parcels = STARTER_TOWN_PARCELS,
  heightAt = () => 0,
} = {}) {
  const group = new THREE.Group();
  group.name = 'ZW_StarterTownGroundCover';
  const surfaces = buildSurfaceMeshes(parcels, heightAt);
  group.add(surfaces);

  const parking = buildParkingStripes(parcels, heightAt);
  group.add(parking.mesh);

  const placements = createStarterTownVegetationPlan(parcels);
  const [treeTemplate, rockTemplate] = await Promise.all([
    realTemplate('tree', renderer),
    realTemplate('rock', renderer),
  ]);
  let realAssetInstances = 0;
  let fallbackInstances = 0;
  let vegetationDrawCalls = 0;
  for (const [kind, entries, template] of [
    ['tree', placements.trees, treeTemplate],
    ['rock', placements.rocks, rockTemplate],
  ]) {
    const instanced = buildInstancedTemplate(template, entries, heightAt, kind);
    group.add(instanced.group);
    vegetationDrawCalls += instanced.drawCalls;
    if (template.userData.placeholder) fallbackInstances += entries.length;
    else realAssetInstances += entries.length;
  }

  let collisionsActive = false;
  const activateCollisions = () => {
    if (collisionsActive) return 0;
    collisionsActive = true;
    for (const entry of placements.trees) {
      registerWorldObject(null, entry.x, entry.z, {
        id: entry.id,
        r: 0.72 * (entry.scale || 1),
        kind: 'tree',
      });
    }
    for (const entry of placements.rocks) {
      registerWorldObject(null, entry.x, entry.z, {
        id: entry.id,
        r: 0.8 * (entry.scale || 1),
        kind: 'rock',
      });
    }
    return placements.trees.length + placements.rocks.length;
  };

  const report = Object.freeze({
    parcels: parcels.length,
    surfaceMeshes: surfaces.children.length,
    parkingStripes: parking.count,
    trees: placements.trees.length,
    rocks: placements.rocks.length,
    realAssetInstances,
    fallbackInstances,
    vegetationDrawCalls,
    assets: Object.freeze({
      tree: treeTemplate.userData.assetId || 'procedural-tree',
      rock: rockTemplate.userData.assetId || 'procedural-rock',
    }),
  });
  group.userData.report = report;
  group.userData.snapshot = () => report;
  group.userData.activateCollisions = activateCollisions;
  return { group, report, placements, activateCollisions };
}

export default buildStarterTownGroundCover;
