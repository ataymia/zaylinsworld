// ─────────────────────────────────────────────────────────────────────────────
// StreetscapeLayer.js — Phase 6C ready-asset placement with safe fallbacks.
//
// The layer searches the live Asset Lab registry by stable aliases. A generated
// GLB is used only when it is indexed and loadable. Missing pieces become compact
// procedural stand-ins and are listed in the placement report for the final pass.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { assetRuntimeRegistry } from '../runtime/AssetRuntimeRegistry.js';
import { loadRegisteredAsset } from '../assets.js';

const TYPES = Object.freeze({
  hydrant: Object.freeze({ aliases: ['starter-town-fire-hydrant', 'fire hydrant', 'fire-hydrant', 'hydrant'], targetHeight: 0.9, color: '#b83d32' }),
  shelter: Object.freeze({ aliases: ['starter-town-bus-shelter', 'bus shelter', 'bus-shelter'], targetHeight: 2.7, color: '#4d6674' }),
  districtSign: Object.freeze({ aliases: ['starter-town-district-sign', 'district sign', 'district-sign'], targetHeight: 2.4, color: '#7a6345' }),
  mailbox: Object.freeze({ aliases: ['starter-town-mailbox', 'mailbox'], targetHeight: 1.15, color: '#405b78' }),
  bollard: Object.freeze({ aliases: ['starter-town-bollard', 'bollard'], targetHeight: 0.9, color: '#6e747c' }),
  fuelPump: Object.freeze({ aliases: ['starter-town-fuel-pump', 'fuel pump', 'fuel-pump'], targetHeight: 1.8, color: '#c2b05d' }),
  guardrail: Object.freeze({ aliases: ['starter-town-guardrail', 'guardrail'], targetHeight: 0.75, color: '#969ca2' }),
  loadingCrate: Object.freeze({ aliases: ['starter-town-loading-crate', 'loading crate', 'loading-crate'], targetHeight: 1.1, color: '#8a6545' }),
});

const PLACEMENTS = Object.freeze([
  // District entry markers
  { id: 'sign-dreamdrop-west', type: 'districtSign', x: -345, z: -120, rotationY: Math.PI / 2 },
  { id: 'sign-market-north', type: 'districtSign', x: -110, z: 235, rotationY: 0 },
  { id: 'sign-northworks-south', type: 'districtSign', x: -450, z: -365, rotationY: 0 },
  { id: 'sign-scholar-east', type: 'districtSign', x: -365, z: -35, rotationY: Math.PI / 2 },
  { id: 'sign-civic-west', type: 'districtSign', x: 225, z: -280, rotationY: Math.PI / 2 },
  { id: 'sign-eastgate-west', type: 'districtSign', x: 365, z: 250, rotationY: Math.PI / 2 },
  { id: 'sign-parkside-north', type: 'districtSign', x: 420, z: 425, rotationY: 0 },
  { id: 'sign-willowbend-north', type: 'districtSign', x: 0, z: 625, rotationY: 0 },
  { id: 'sign-westside-east', type: 'districtSign', x: -365, z: 470, rotationY: Math.PI / 2 },

  // Hydrants near functional parcels and crossings
  { id: 'hydrant-frostbox', type: 'hydrant', x: -143, z: -104 },
  { id: 'hydrant-chicken', type: 'hydrant', x: 165, z: -130 },
  { id: 'hydrant-school', type: 'hydrant', x: -655, z: 15 },
  { id: 'hydrant-police', type: 'hydrant', x: 565, z: -260 },
  { id: 'hydrant-market', type: 'hydrant', x: -25, z: 320 },
  { id: 'hydrant-parkside', type: 'hydrant', x: 500, z: 430 },

  // Transit shelters on major routes
  { id: 'shelter-dreamdrop-west', type: 'shelter', x: -430, z: -90, rotationY: Math.PI / 2 },
  { id: 'shelter-dreamdrop-east', type: 'shelter', x: 430, z: -150, rotationY: -Math.PI / 2 },
  { id: 'shelter-market', type: 'shelter', x: 25, z: 390, rotationY: Math.PI },
  { id: 'shelter-civic', type: 'shelter', x: 520, z: -145, rotationY: 0 },
  { id: 'shelter-eastgate', type: 'shelter', x: 710, z: 55, rotationY: Math.PI },

  // Willowbend mailboxes
  { id: 'mailbox-home', type: 'mailbox', x: 30, z: 800, rotationY: Math.PI },
  { id: 'mailbox-willow-west', type: 'mailbox', x: -175, z: 735, rotationY: Math.PI },
  { id: 'mailbox-willow-east', type: 'mailbox', x: 125, z: 790, rotationY: Math.PI },

  // Civic/market bollards
  ...[-2, -1, 0, 1, 2].map((index) => ({ id: `bollard-police-${index}`, type: 'bollard', x: 600 + index * 4, z: -258 })),
  ...[-2, -1, 0, 1, 2].map((index) => ({ id: `bollard-market-${index}`, type: 'bollard', x: -35 + index * 4, z: 300 })),

  // 6twelve pumps
  ...[-3, -1, 1, 3].map((index) => ({ id: `pump-6twelve-${index}`, type: 'fuelPump', x: 832 + index * 8, z: 205, rotationY: Math.PI / 2 })),

  // Gateway guardrail samples
  ...[-3, -2, -1, 0, 1, 2, 3].map((index) => ({ id: `guardrail-north-${index}`, type: 'guardrail', x: 18, z: -930 - index * 26, rotationY: 0, scaleZ: 1.8 })),
  ...[-3, -2, -1, 0, 1, 2, 3].map((index) => ({ id: `guardrail-east-${index}`, type: 'guardrail', x: 930 + index * 26, z: -18, rotationY: Math.PI / 2, scaleZ: 1.8 })),

  // Service/loading crates
  { id: 'crate-chicken-1', type: 'loadingCrate', x: 205, z: -105 },
  { id: 'crate-market-1', type: 'loadingCrate', x: -100, z: 500 },
  { id: 'crate-block-supply-1', type: 'loadingCrate', x: -535, z: 315 },
  { id: 'crate-garage-1', type: 'loadingCrate', x: -70, z: -600 },
]);

function resolveModel(type) {
  const config = TYPES[type];
  if (!config) return null;
  for (const alias of config.aliases) {
    const direct = assetRuntimeRegistry.resolve(alias);
    if (direct?.kind === 'model') return direct;
  }
  const terms = config.aliases.map((value) => value.toLowerCase().replace(/[^a-z0-9]/g, ''));
  return [...assetRuntimeRegistry.records.values()].find((record) => {
    if (record.kind !== 'model') return false;
    const haystack = `${record.id} ${record.name} ${record.path}`.toLowerCase().replace(/[^a-z0-9]/g, '');
    return terms.some((term) => term && haystack.includes(term));
  }) || null;
}

function fallback(type) {
  const config = TYPES[type];
  const material = new THREE.MeshStandardMaterial({ color: config?.color || '#777777', roughness: 0.82, metalness: type === 'guardrail' ? 0.7 : 0.08 });
  let mesh;
  if (type === 'hydrant') mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.75, 10), material);
  else if (type === 'bollard') mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.82, 10), material);
  else if (type === 'mailbox') mesh = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 0.7), material);
  else if (type === 'fuelPump') mesh = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.65, 0.52), material);
  else if (type === 'guardrail') mesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 5), material);
  else if (type === 'loadingCrate') mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  else if (type === 'shelter') mesh = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.4, 1.4), material);
  else mesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 0.25), material);
  mesh.name = `ZW_StreetscapeFallback_${type}`;
  mesh.userData.placeholder = true;
  return mesh;
}

function normalize(model, targetHeight) {
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

async function templateFor(type, renderer, report) {
  const record = resolveModel(type);
  if (record) {
    const loaded = await loadRegisteredAsset(record.id, renderer);
    if (loaded?.scene) {
      const template = loaded.scene.clone(true);
      if (normalize(template, TYPES[type].targetHeight)) {
        report.assetTypes[type] = record.id;
        return template;
      }
    }
    report.failedAssets.push(record.id);
  }
  report.fallbackTypes.push(type);
  return fallback(type);
}

export async function buildStreetscapeLayer({ renderer = null, placements = PLACEMENTS } = {}) {
  await assetRuntimeRegistry.load();
  const group = new THREE.Group();
  group.name = 'ZW_StarterStreetscape';
  const report = { placed: 0, assetInstances: 0, fallbackInstances: 0, assetTypes: {}, fallbackTypes: [], failedAssets: [] };
  const templates = new Map();

  for (const type of [...new Set(placements.map((placement) => placement.type))]) {
    templates.set(type, await templateFor(type, renderer, report));
  }

  for (const placement of placements) {
    const source = templates.get(placement.type);
    if (!source) continue;
    const object = source.clone(true);
    object.name = `ZW_Streetscape_${placement.id}`;
    object.position.x += placement.x;
    object.position.z += placement.z;
    object.rotation.y += placement.rotationY || 0;
    if (placement.scaleZ) object.scale.z *= placement.scaleZ;
    object.userData.placementId = placement.id;
    object.userData.streetscapeType = placement.type;
    object.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = false;
      node.receiveShadow = true;
    });
    group.add(object);
    report.placed += 1;
    if (object.userData.placeholder || source.userData.placeholder) report.fallbackInstances += 1;
    else report.assetInstances += 1;
  }

  report.fallbackTypes = [...new Set(report.fallbackTypes)];
  report.failedAssets = [...new Set(report.failedAssets)];
  group.userData.placementReport = report;
  group.userData.snapshot = () => Object.freeze({ ...report, assetTypes: { ...report.assetTypes }, fallbackTypes: [...report.fallbackTypes], failedAssets: [...report.failedAssets] });
  return { group, report, templates };
}

export { PLACEMENTS as STARTER_TOWN_STREETSCAPE_PLACEMENTS, TYPES as STREETSCAPE_ASSET_TYPES };
export default buildStreetscapeLayer;
