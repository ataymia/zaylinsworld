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
  applyTerrainHeightsToPlane,
  starterTownHeightAt,
  STARTER_TOWN_GRADE_REPORT,
} from './StarterTownTerrain.js';
import { buildStarterTownRoadsideLayer } from './StarterTownRoadside.js';
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

function polygonBounds(polygon) {
  const xs = polygon.map((point) => point.x);
  const zs = polygon.map((point) => point.z);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
}

function locationPlaceholder(location) {
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
    starterTownHeightAt(location.position.x, location.position.z) + height / 2 + 0.04,
    location.position.z,
  );
  mesh.castShadow = height > 1;
  mesh.receiveShadow = true;
  mesh.userData.locationId = location.id;
  mesh.userData.assetRef = location.assetRef;
  mesh.userData.placeholder = true;
  return mesh;
}

function normalizeModel(scene, location) {
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
    starterTownHeightAt(location.position.x, location.position.z) - box.min.y * scale + 0.04,
    location.position.z - center.z * scale,
  );
  scene.updateWorldMatrix(true, true);
}

export async function buildLargeStarterTown({
  renderer = null,
  placeReadyAssets = true,
  showDistricts = false,
  includeMassing = true,
  includeStreetscape = true,
  includeGeneratedRoadside = true,
} = {}) {
  const plan = worldRegistry.starterPlan;
  const group = new THREE.Group();
  group.name = 'ZW_LargeStarterTown';
  group.visible = true;

  const terrainWidth = plan.terrainBounds.maxX - plan.terrainBounds.minX;
  const terrainDepth = plan.terrainBounds.maxZ - plan.terrainBounds.minZ;
  const terrainGeometry = applyTerrainHeightsToPlane(
    new THREE.PlaneGeometry(terrainWidth, terrainDepth, 48, 48),
  );
  const terrain = new THREE.Mesh(
    terrainGeometry,
    new THREE.MeshStandardMaterial({ color: '#6f7f61', roughness: 1, metalness: 0 }),
  );
  terrain.name = 'ZW_StarterTerrain';
  terrain.rotation.x = -Math.PI / 2;
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
    slab.position.set(centerX, starterTownHeightAt(centerX, centerZ) + 0.08, centerZ);
    slab.name = `ZW_District_${district.id}`;
    slab.userData.districtId = district.id;
    districtLayer.add(slab);
  }
  group.add(districtLayer);

  const roadNetwork = new RoadNetwork(plan.routes);
  const roads = roadNetwork.buildGeometry({
    name: 'ZW_StarterRoadSkeleton',
    yOffset: 0.065,
    heightAt: (x, z) => starterTownHeightAt(x, z),
  });
  group.add(roads);

  const generatedRoadside = includeGeneratedRoadside ? buildStarterTownRoadsideLayer() : null;
  if (generatedRoadside) group.add(generatedRoadside.group);

  const massing = includeMassing ? buildDistrictMassing({ heightAt: starterTownHeightAt }) : null;
  if (massing) group.add(massing.group);

  const locationLayer = new THREE.Group();
  locationLayer.name = 'ZW_StarterLocationParcels';
  const placeholders = new Map();
  for (const location of plan.locations) {
    const placeholder = locationPlaceholder(location);
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
      normalizeModel(model, location);
      model.userData.locationId = location.id;
      model.userData.assetId = record.id;
      locationLayer.add(model);
      const placeholder = placeholders.get(location.id);
      if (placeholder) placeholder.visible = false;
      placementReport.placedAssets.push({ locationId: location.id, assetId: record.id });
      placementReport.placeholders = placementReport.placeholders.filter((id) => id !== location.id);
    }
  }

  const streetscape = includeStreetscape
    ? await buildStreetscapeLayer({ renderer })
    : null;
  if (streetscape) group.add(streetscape.group);

  group.userData.largeStarterTown = true;
  group.userData.featureFlag = 'starterTownLargeWorld';
  group.userData.roadNetwork = roadNetwork;
  group.userData.placementReport = placementReport;
  group.userData.gradeReport = STARTER_TOWN_GRADE_REPORT;
  group.userData.snapshot = () => ({
    terrain: {
      width: terrainWidth,
      depth: terrainDepth,
      vertices: terrain.geometry.getAttribute('position')?.count || 0,
      grades: STARTER_TOWN_GRADE_REPORT,
    },
    districts: plan.districts.length,
    roads: roadNetwork.snapshot(),
    locations: plan.locations.length,
    assets: placementReport,
    massing: massing?.group.userData.snapshot?.() || null,
    generatedRoadside: generatedRoadside?.group.userData.snapshot?.() || null,
    streetscape: streetscape?.group.userData.snapshot?.() || null,
    visualAudit: auditVisualPerformance(group, { preset: 'medium' }),
  });

  return {
    group,
    terrain,
    roads,
    roadNetwork,
    districtLayer,
    locationLayer,
    massing,
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
