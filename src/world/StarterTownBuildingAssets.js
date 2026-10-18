// ─────────────────────────────────────────────────────────────────────────────
// StarterTownBuildingAssets.js — production GLBs for non-functional parcels.
//
// DistrictMassing owns the stable filler-building layout. This layer keeps those
// placements but replaces the colored boxes with the real modular building
// shells produced by the asset factory. A compact fallback shell is retained so
// a failed model can never punch a hole into the town.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { assetRuntimeRegistry } from '../runtime/AssetRuntimeRegistry.js';
import { loadRegisteredAsset } from '../assets.js';
import { registerWorldObject } from '../worldCollision.js';

const assetId = (name) => `library:buildings:zta-free-asset-factory:${name.replaceAll('_', '-')}`;

const ASSET_POOLS = Object.freeze({
  'residential-row': Object.freeze([
    'building_starter_house_a_v01',
    'building_starter_house_b_v01',
    'building_starter_house_c_v01',
    'building_starter_townhouse_a_v01',
    'building_starter_duplex_a_v01',
  ]),
  'residential-block': Object.freeze([
    'building_starter_apartment_small_a_v01',
    'building_starter_apartment_mid_a_v01',
    'building_starter_townhouse_a_v01',
  ]),
  'commercial-row': Object.freeze([
    'building_starter_rowshop_a_v01',
    'building_starter_stripmall_module_a_v01',
    'building_starter_corner_store_shell_a_v01',
  ]),
  commercial: Object.freeze([
    'building_starter_corner_store_shell_a_v01',
    'building_starter_barbershop_shell_a_v01',
    'building_starter_laundromat_shell_a_v01',
    'building_starter_pharmacy_shell_a_v01',
    'building_starter_motel_shell_a_v01',
  ]),
  'mixed-use': Object.freeze([
    'building_starter_rowshop_a_v01',
    'building_starter_apartment_mid_a_v01',
    'building_starter_small_office_a_v01',
  ]),
  industrial: Object.freeze([
    'building_starter_warehouse_a_v01',
    'building_starter_warehouse_b_v01',
    'building_starter_utility_shed_a_v01',
  ]),
  office: Object.freeze([
    'building_starter_small_office_a_v01',
    'building_starter_cityhall_annex_shell_a_v01',
    'building_starter_library_shell_a_v01',
  ]),
  civic: Object.freeze([
    'building_starter_cityhall_annex_shell_a_v01',
    'building_starter_library_shell_a_v01',
    'building_starter_fire_rescue_bay_shell_a_v01',
  ]),
  'parking-structure': Object.freeze([
    'building_starter_warehouse_b_v01',
    'building_starter_apartment_mid_a_v01',
  ]),
});

function stableIndex(seed, length) {
  let value = 2166136261;
  for (let index = 0; index < String(seed).length; index++) {
    value ^= String(seed).charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return length ? (value >>> 0) % length : 0;
}

function normalizedTemplate(scene) {
  scene.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  if (![size.x, size.y, size.z].every((value) => Number.isFinite(value) && value > 0.001)) return null;
  const anchor = new THREE.Group();
  scene.position.set(-center.x, -box.min.y, -center.z);
  anchor.add(scene);
  anchor.userData.sourceSize = Object.freeze({ x: size.x, y: size.y, z: size.z });
  return anchor;
}

function fallbackBuilding(placement) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: '#7b7467', roughness: 0.9, metalness: 0.02 }),
  );
  body.position.y = 0.5;
  group.add(body);
  group.userData.sourceSize = Object.freeze({ x: 1, y: 1, z: 1 });
  group.userData.placeholder = true;
  group.userData.fallbackFor = placement.type;
  return group;
}

async function loadTemplates(renderer) {
  await assetRuntimeRegistry.load();
  const names = [...new Set(Object.values(ASSET_POOLS).flat())];
  const templates = new Map();
  await Promise.all(names.map(async (name) => {
    const id = assetId(name);
    const record = assetRuntimeRegistry.resolve(id);
    if (!record || record.kind !== 'model') return;
    const loaded = await loadRegisteredAsset(record.id, renderer);
    const template = loaded?.scene ? normalizedTemplate(loaded.scene.clone(true)) : null;
    if (!template) return;
    template.userData.assetId = record.id;
    templates.set(name, template);
  }));
  return templates;
}

function fitToPlacement(object, placement) {
  const source = object.userData.sourceSize || { x: 1, y: 1, z: 1 };
  const target = placement.size;
  const straightFit = Math.min(target.x / source.x, target.z / source.z);
  const rotatedFit = Math.min(target.x / source.z, target.z / source.x);
  const rotate = rotatedFit > straightFit * 1.04;
  const footprintFit = rotate ? rotatedFit : straightFit;
  const heightFit = target.y / source.y;
  const scale = Math.max(0.01, Math.min(footprintFit * 0.92, heightFit * 1.12));
  object.rotation.y = rotate ? Math.PI / 2 : 0;
  object.scale.setScalar(scale);
  return { rotate, scale };
}

export async function buildStarterTownBuildingAssets({
  renderer = null,
  placements = [],
  heightAt = () => 0,
} = {}) {
  const group = new THREE.Group();
  group.name = 'ZW_StarterTownProductionBuildings';
  const templates = await loadTemplates(renderer);
  const report = { placed: 0, productionInstances: 0, fallbackInstances: 0, uniqueAssets: [] };
  const usedAssets = new Set();

  for (const placement of placements) {
    const pool = ASSET_POOLS[placement.type] || ASSET_POOLS.commercial;
    const name = pool[stableIndex(placement.id, pool.length)];
    const template = templates.get(name);
    const object = template?.clone(true) || fallbackBuilding(placement);
    object.name = `ZW_ProductionBuilding_${placement.id}`;
    const fit = fitToPlacement(object, placement);
    object.position.set(
      placement.position.x,
      Number(heightAt(placement.position.x, placement.position.z)) || 0,
      placement.position.z,
    );
    object.userData.placementId = placement.id;
    object.userData.parcelId = placement.parcelId;
    object.userData.districtId = placement.districtId;
    object.userData.assetId = template?.userData.assetId || 'procedural-building-fallback';
    object.userData.fit = fit;
    object.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = true;
      node.receiveShadow = true;
    });
    group.add(object);
    report.placed += 1;
    if (template) {
      report.productionInstances += 1;
      usedAssets.add(template.userData.assetId);
    } else {
      report.fallbackInstances += 1;
    }
  }

  report.uniqueAssets = [...usedAssets].sort();
  const snapshot = Object.freeze({
    ...report,
    uniqueAssets: Object.freeze([...report.uniqueAssets]),
  });
  group.userData.report = snapshot;
  group.userData.snapshot = () => snapshot;
  let collisionsActive = false;
  const activateCollisions = () => {
    if (collisionsActive) return 0;
    collisionsActive = true;
    for (const placement of placements) {
      registerWorldObject(null, placement.position.x, placement.position.z, {
        id: `building:${placement.id}`,
        kind: 'building',
        halfExtents: {
          x: placement.size.x / 2,
          z: placement.size.z / 2,
        },
      });
    }
    return placements.length;
  };
  group.userData.activateCollisions = activateCollisions;
  return { group, report: snapshot, templates, activateCollisions };
}

export { ASSET_POOLS as STARTER_TOWN_BUILDING_ASSET_POOLS };
export default buildStarterTownBuildingAssets;
