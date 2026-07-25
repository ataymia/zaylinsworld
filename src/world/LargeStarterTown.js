// ─────────────────────────────────────────────────────────────────────────────
// LargeStarterTown.js — feature-flagged authoritative city skeleton.
//
// This does not replace the compact compatibility map by default. It builds the
// approved terrain, districts, roads, location parcels, district massing, and any
// registered final assets that are already ready in the Asset Lab.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { worldRegistry } from '../runtime/WorldRegistry.js';
import { assetRuntimeRegistry } from '../runtime/AssetRuntimeRegistry.js';
import { loadRegisteredAsset } from '../assets.js';
import { RoadNetwork } from './RoadNetwork.js';
import { buildDistrictMassing } from './DistrictMassing.js';
import { buildStreetscapeLayer } from './StreetscapeLayer.js';
import {
  starterTownHeightAt,
  STARTER_TOWN_GRADE_REPORT,
} from './StarterTownTerrain.js';
import { buildStarterTownRoadsideLayer } from './StarterTownRoadside.js';
import { buildStarterTownGroundCover } from './StarterTownGroundCover.js';
import { buildStarterTownBuildingAssets } from './StarterTownBuildingAssets.js';
import { buildStarterTownAccessLayer } from './StarterTownAccessLayer.js';
import { buildSpecialRoadFormsLayer } from './SpecialRoadForms.js';
import { auditVisualPerformance } from './VisualPerformanceAudit.js';

const DISTRICT_COLORS = Object.freeze({
  'northworks-auto-row': '#665f57',
  'civic-heights': '#6c7893',
  'scholars-quarter': '#6f8c79',
  'dreamdrop-district': '#8b765f',
  'westside-blocks': '#775f76',
  'market-mile': '#9a6f62',
  'eastgate-corridor': '#8c805c',
  'parkside-commons': '#5f8666',
  'willowbend-residential': '#7d8b70',
});

const CATEGORY_COLORS = Object.freeze({
  store: '#c77b52', vehicle: '#6b7d92', service: '#71858a', school: '#5f8b74',
  law: '#536b91', job: '#766e9b', fuel: '#9b7d45', property: '#8d715f', activity: '#658d68',
});

const LOCATION_IDENTITY = Object.freeze({
  frostbox: 'JEWELRY • CUSTOM CHAINS',
  'chicken-spot': 'RESTAURANT • HOT FOOD',
  'kicks-fits': 'SHOES • FASHION',
  'block-supply': 'GEAR • SUPPLIES',
  'auto-haus': 'VEHICLE SALES',
  'city-garage': 'REPAIRS • SERVICE',
  'zaylins-prep': 'SCHOOL • CAMPUS',
  'police-station': 'PUBLIC SAFETY',
  worktower: 'JOBS • OFFICES',
  'iron-city-gym': 'FITNESS • TRAINING',
  '6twelve': 'FUEL • MARKET',
  'zaylins-home': 'YOUR STARTER HOME',
  'dreamdrop-park': 'PARK • RECREATION',
});

function polygonBounds(polygon) {
  const xs = polygon.map((point) => point.x);
  const zs = polygon.map((point) => point.z);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
}

function applyHeightFunctionToPlane(geometry, heightAt) {
  const position = geometry?.getAttribute?.('position');
  if (!position) return geometry;
  for (let index = 0; index < position.count; index++) {
    const worldX = position.getX(index);
    const worldZ = -position.getY(index);
    position.setZ(index, Number(heightAt(worldX, worldZ)) || 0);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals?.();
  geometry.computeBoundingBox?.();
  geometry.computeBoundingSphere?.();
  return geometry;
}

function applyTerrainColors(geometry) {
  const position = geometry?.getAttribute?.('position');
  if (!position) return geometry;
  const colors = new Float32Array(position.count * 3);
  const color = new THREE.Color();
  for (let index = 0; index < position.count; index++) {
    const x = position.getX(index);
    const z = -position.getY(index);
    const district = worldRegistry.districtAt({ x, z }, 'starter-town');
    color.set(DISTRICT_COLORS[district?.id] || '#66785b');
    const variation = Math.sin(x * 0.019 + z * 0.013) * 0.025;
    color.offsetHSL(0, 0, variation);
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function locationPlaceholder(location, heightAt) {
  const width = location.category === 'property' ? 12 : location.category === 'school' ? 28 : 18;
  const depth = location.category === 'fuel' ? 24 : location.category === 'activity' ? 34 : 16;
  const height = location.category === 'job' ? 34 : location.category === 'school' ? 15 : location.category === 'activity' ? 0.25 : 10;
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshStandardMaterial({
    color: CATEGORY_COLORS[location.category] || '#777777',
    roughness: 0.88,
    metalness: 0,
    transparent: true,
    opacity: location.category === 'activity' ? 0.38 : 0.72,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `ZW_LocationPlaceholder_${location.id}`;
  mesh.position.set(
    location.position.x,
    heightAt(location.position.x, location.position.z) + height / 2 + 0.04,
    location.position.z,
  );
  mesh.castShadow = height > 1;
  mesh.receiveShadow = true;
  mesh.userData.locationId = location.id;
  mesh.userData.assetRef = location.assetRef;
  mesh.userData.placeholder = true;
  return mesh;
}

function normalizeModel(scene, location, heightAt) {
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const targetWidth = location.category === 'school' ? 34 : location.category === 'fuel' ? 26 : 20;
  const largest = Math.max(size.x, size.z, 0.001);
  const scale = targetWidth / largest;
  scene.scale.setScalar(scale);
  scene.position.set(
    location.position.x - center.x * scale,
    heightAt(location.position.x, location.position.z) - box.min.y * scale + 0.04,
    location.position.z - center.z * scale,
  );
  scene.updateWorldMatrix(true, true);
}

function identityTexture(location, accent) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  context.fillStyle = 'rgba(10, 14, 21, 0.96)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = accent;
  context.lineWidth = 18;
  context.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
  context.fillStyle = '#ffffff';
  context.font = '900 92px Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(location.name.toUpperCase(), canvas.width / 2, 104);
  context.fillStyle = accent;
  context.font = '700 38px Arial, sans-serif';
  context.fillText(
    LOCATION_IDENTITY[location.id] || String(location.category || 'DESTINATION').toUpperCase(),
    canvas.width / 2,
    190,
  );
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.anisotropy = 4;
  return texture;
}

function addLocationIdentity(layer, location, exterior, heightAt) {
  if (!exterior || location.enterable === false) return null;
  exterior.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(exterior);
  const size = bounds.getSize(new THREE.Vector3());
  const faceX = Number(location.frontageFace?.[0]);
  const faceZ = Number(location.frontageFace?.[1]);
  const face = new THREE.Vector3(
    Number.isFinite(faceX) ? faceX : 0,
    0,
    Number.isFinite(faceZ) ? faceZ : 1,
  );
  if (face.lengthSq() < 0.0001) face.set(0, 0, 1);
  face.normalize();
  const accent = CATEGORY_COLORS[location.category] || '#ffffff';
  const frontExtent = Math.abs(face.x) * size.x / 2 + Math.abs(face.z) * size.z / 2;
  const ground = Number(heightAt(location.position.x, location.position.z)) || 0;
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(Math.max(6.5, Math.min(10, size.x * 0.52)), 2.05),
    new THREE.MeshBasicMaterial({
      map: identityTexture(location, accent),
      transparent: true,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );
  sign.name = `ZW_LocationIdentity_${location.id}`;
  sign.position.set(
    location.position.x + face.x * (frontExtent + 0.16),
    ground + Math.max(4.2, Math.min(8.8, size.y * 0.72)),
    location.position.z + face.z * (frontExtent + 0.16),
  );
  sign.lookAt(sign.position.clone().add(face));
  sign.renderOrder = 2;
  sign.userData.locationId = location.id;
  layer.add(sign);

  // A category-colored canopy makes the use readable before the words resolve:
  // restaurant, retail, public safety, school, garage, and home no longer share
  // one anonymous gray silhouette.
  const canopy = new THREE.Mesh(
    new THREE.BoxGeometry(Math.max(5, Math.min(9, size.x * 0.45)), 0.24, 1.35),
    new THREE.MeshStandardMaterial({
      color: accent,
      emissive: new THREE.Color(accent).multiplyScalar(0.12),
      emissiveIntensity: 0.45,
      roughness: 0.58,
      metalness: 0.08,
    }),
  );
  canopy.name = `ZW_LocationCanopy_${location.id}`;
  canopy.position.set(
    location.position.x + face.x * (frontExtent + 0.65),
    ground + 3.1,
    location.position.z + face.z * (frontExtent + 0.65),
  );
  canopy.rotation.y = Math.atan2(face.x, face.z);
  canopy.userData.locationId = location.id;
  layer.add(canopy);
  return { sign, canopy };
}

export async function buildLargeStarterTown({
  renderer = null,
  placeReadyAssets = true,
  showDistricts = false,
  includeMassing = true,
  includeStreetscape = true,
  includeGeneratedRoadside = true,
  includeGroundCover = true,
  includeBuildingAssets = true,
  includeLocationAccess = true,
  includeSpecialRoadForms = true,
  heightAt = starterTownHeightAt,
  compatibilityMode = false,
} = {}) {
  const plan = worldRegistry.starterPlan;
  const group = new THREE.Group();
  group.name = 'ZW_LargeStarterTown';
  group.visible = true;

  const terrainWidth = plan.terrainBounds.maxX - plan.terrainBounds.minX;
  const terrainDepth = plan.terrainBounds.maxZ - plan.terrainBounds.minZ;
  const terrainGeometry = applyTerrainColors(
    applyHeightFunctionToPlane(
      new THREE.PlaneGeometry(terrainWidth, terrainDepth, 48, 48),
      heightAt,
    ),
  );
  const terrain = new THREE.Mesh(
    terrainGeometry,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }),
  );
  terrain.name = 'ZW_StarterTerrain';
  terrain.rotation.x = -Math.PI / 2;
  // Keep the base terrain decisively below roads, sidewalks, and parcel caps.
  // The retired compact plane previously occupied the same depth and flickered.
  terrain.position.y = -0.045;
  terrain.receiveShadow = true;
  terrain.frustumCulled = true;
  group.add(terrain);

  const districtLayer = new THREE.Group();
  districtLayer.name = 'ZW_DistrictDebugLayer';
  districtLayer.visible = showDistricts;
  for (const district of plan.districts) {
    const bounds = polygonBounds(district.polygon);
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerZ = (bounds.minZ + bounds.maxZ) / 2;
    const slab = new THREE.Mesh(
      new THREE.PlaneGeometry(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ),
      new THREE.MeshBasicMaterial({
        color: DISTRICT_COLORS[district.id] || '#ffffff',
        transparent: true,
        opacity: 0.23,
        depthWrite: false,
      }),
    );
    slab.rotation.x = -Math.PI / 2;
    slab.position.set(centerX, heightAt(centerX, centerZ) + 0.08, centerZ);
    slab.name = `ZW_District_${district.id}`;
    slab.userData.districtId = district.id;
    districtLayer.add(slab);
  }
  group.add(districtLayer);

  const roadNetwork = new RoadNetwork(plan.routes);
  const roads = roadNetwork.buildGeometry({
    name: 'ZW_StarterRoadSkeleton',
    yOffset: 0.065,
    heightAt,
  });
  group.add(roads);

  const locationAccess = includeLocationAccess
    ? buildStarterTownAccessLayer({ roadNetwork, heightAt })
    : null;
  if (locationAccess) group.add(locationAccess.group);

  // Special road forms remain graded-only, while roadside infrastructure can
  // now follow either the authored grade or the flat gameplay compatibility map.
  const specialRoadForms = includeSpecialRoadForms ? buildSpecialRoadFormsLayer() : null;
  if (specialRoadForms) group.add(specialRoadForms.group);

  const generatedRoadside = includeGeneratedRoadside
    ? buildStarterTownRoadsideLayer({ heightAt })
    : null;
  if (generatedRoadside) group.add(generatedRoadside.group);

  const groundCover = includeGroundCover
    ? await buildStarterTownGroundCover({ renderer, heightAt })
    : null;
  if (groundCover) group.add(groundCover.group);

  const massing = includeMassing ? buildDistrictMassing({ heightAt }) : null;
  if (massing) group.add(massing.group);

  const buildingAssets = includeBuildingAssets && massing
    ? await buildStarterTownBuildingAssets({ renderer, placements: massing.placements, heightAt })
    : null;
  if (buildingAssets) {
    // The procedural instanced layer remains an emergency fallback contract,
    // but the visible production town is built from the shipped GLBs.
    massing.group.visible = false;
    group.add(buildingAssets.group);
  }

  const locationLayer = new THREE.Group();
  locationLayer.name = 'ZW_StarterLocationParcels';
  const placeholders = new Map();
  for (const location of plan.locations) {
    const placeholder = locationPlaceholder(location, heightAt);
    placeholders.set(location.id, placeholder);
    locationLayer.add(placeholder);
  }
  group.add(locationLayer);

  const placementReport = { placedAssets: [], placeholders: [...placeholders.keys()], skipped: [] };
  if (placeReadyAssets) {
    await assetRuntimeRegistry.load();
    for (const location of plan.locations) {
      const record = assetRuntimeRegistry.resolve(location.assetRef.preferred);
      if (!record || record.kind !== 'model') {
        placementReport.skipped.push({ locationId: location.id, reason: 'registered final model not ready' });
        continue;
      }
      const loaded = await loadRegisteredAsset(record.id, renderer);
      if (!loaded?.scene) {
        placementReport.skipped.push({ locationId: location.id, reason: 'registered model failed to load' });
        continue;
      }
      const model = loaded.scene.clone(true);
      model.name = `ZW_LocationAsset_${location.id}`;
      normalizeModel(model, location, heightAt);
      model.userData.locationId = location.id;
      model.userData.assetId = record.id;
      locationLayer.add(model);
      const placeholder = placeholders.get(location.id);
      if (placeholder) placeholder.visible = false;
      placementReport.placedAssets.push({ locationId: location.id, assetId: record.id });
      placementReport.placeholders = placementReport.placeholders.filter((id) => id !== location.id);
    }
  }

  const identityLayer = new THREE.Group();
  identityLayer.name = 'ZW_StarterLocationIdentity';
  for (const location of plan.locations) {
    const exterior = locationLayer.getObjectByName(`ZW_LocationAsset_${location.id}`)
      || placeholders.get(location.id);
    addLocationIdentity(identityLayer, location, exterior, heightAt);
  }
  group.add(identityLayer);

  const streetscape = includeStreetscape
    ? await buildStreetscapeLayer({ renderer, heightAt })
    : null;
  if (streetscape) group.add(streetscape.group);

  const gradeReport = compatibilityMode
    ? Object.freeze({ ok: true, compatibilityFlat: true, warnings: [], errors: [] })
    : STARTER_TOWN_GRADE_REPORT;

  group.userData.largeStarterTown = true;
  group.userData.featureFlag = 'starterTownLargeWorld';
  group.userData.compatibilityMode = compatibilityMode;
  group.userData.roadNetwork = roadNetwork;
  group.userData.placementReport = placementReport;
  group.userData.gradeReport = gradeReport;
  group.userData.snapshot = () => ({
    terrain: {
      width: terrainWidth,
      depth: terrainDepth,
      vertices: terrain.geometry.getAttribute('position')?.count || 0,
      grades: gradeReport,
    },
    districts: plan.districts.length,
    roads: roadNetwork.snapshot(),
    locationAccess: locationAccess?.report || null,
    specialRoadForms: specialRoadForms?.group.userData.snapshot?.() || null,
    locations: plan.locations.length,
    locationIdentity: identityLayer.children.length,
    assets: placementReport,
    massing: massing?.group.userData.snapshot?.() || null,
    buildingAssets: buildingAssets?.group.userData.snapshot?.() || null,
    groundCover: groundCover?.group.userData.snapshot?.() || null,
    generatedRoadside: generatedRoadside?.group.userData.snapshot?.() || null,
    streetscape: streetscape?.group.userData.snapshot?.() || null,
    visualAudit: auditVisualPerformance(group, { preset: 'medium' }),
  });

  return {
    group,
    terrain,
    roads,
    roadNetwork,
    locationAccess,
    specialRoadForms,
    districtLayer,
    locationLayer,
    identityLayer,
    massing,
    buildingAssets,
    groundCover,
    generatedRoadside,
    streetscape,
    placementReport,
  };
}

export async function installLargeStarterTown(scene, options = {}) {
  if (!worldRegistry.featureEnabled('starterTownLargeWorld')) return null;
  const built = await buildLargeStarterTown(options);
  scene.add(built.group);
  return built;
}
