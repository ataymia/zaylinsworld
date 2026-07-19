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
import { loadAsset } from '../assets.js';

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

function vegetationPlacements(parcels) {
  const trees = [];
  const rocks = [];
  for (const parcel of parcels) {
    if (!GREEN_TYPES.has(parcel.type)) continue;
    const { x, z, w, d } = parcel.bounds;
    const count = parcel.type === 'park' || parcel.type === 'purposeful-empty' ? 5 : 3;
    for (let index = 0; index < count; index++) {
      const horizontal = index % 2 === 0;
      const sign = index % 4 < 2 ? -1 : 1;
      const jitter = stableUnit(`${parcel.id}:${index}`) - 0.5;
      trees.push({
        id: `${parcel.id}:tree:${index}`,
        x: horizontal ? x + jitter * w * 0.7 : x + sign * w * 0.43,
        z: horizontal ? z + sign * d * 0.43 : z + jitter * d * 0.7,
        rotationY: stableUnit(`${parcel.id}:yaw:${index}`) * Math.PI * 2,
        scale: 0.82 + stableUnit(`${parcel.id}:scale:${index}`) * 0.36,
      });
    }
    if (parcel.type === 'park' || parcel.type === 'purposeful-empty') {
      for (let index = 0; index < 2; index++) {
        rocks.push({
          id: `${parcel.id}:rock:${index}`,
          x: x + (stableUnit(`${parcel.id}:rock-x:${index}`) - 0.5) * w * 0.65,
          z: z + (stableUnit(`${parcel.id}:rock-z:${index}`) - 0.5) * d * 0.65,
          rotationY: stableUnit(`${parcel.id}:rock-yaw:${index}`) * Math.PI * 2,
        });
      }
    }
  }
  return { trees: trees.slice(0, 56), rocks: rocks.slice(0, 16) };
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

  const placements = vegetationPlacements(parcels);
  const [treeTemplate, rockTemplate] = await Promise.all([
    realTemplate('tree', renderer),
    realTemplate('rock', renderer),
  ]);
  let realAssetInstances = 0;
  let fallbackInstances = 0;
  for (const [kind, entries, template] of [
    ['tree', placements.trees, treeTemplate],
    ['rock', placements.rocks, rockTemplate],
  ]) {
    for (const placement of entries) {
      const object = template.clone(true);
      object.name = `ZW_GroundCover_${placement.id}`;
      object.position.x += placement.x;
      object.position.y += Number(heightAt(placement.x, placement.z)) || 0;
      object.position.z += placement.z;
      object.rotation.y += placement.rotationY || 0;
      object.scale.multiplyScalar(placement.scale || 1);
      object.userData.groundCoverType = kind;
      object.userData.placementId = placement.id;
      object.traverse((node) => {
        if (!node.isMesh) return;
        node.castShadow = kind === 'tree';
        node.receiveShadow = true;
      });
      group.add(object);
      if (template.userData.placeholder) fallbackInstances += 1;
      else realAssetInstances += 1;
    }
  }

  const report = Object.freeze({
    parcels: parcels.length,
    surfaceMeshes: surfaces.children.length,
    parkingStripes: parking.count,
    trees: placements.trees.length,
    rocks: placements.rocks.length,
    realAssetInstances,
    fallbackInstances,
    assets: Object.freeze({
      tree: treeTemplate.userData.assetId || 'procedural-tree',
      rock: rockTemplate.userData.assetId || 'procedural-rock',
    }),
  });
  group.userData.report = report;
  group.userData.snapshot = () => report;
  return { group, report };
}

export default buildStarterTownGroundCover;
