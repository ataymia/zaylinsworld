import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { LARGE_TOWN_TRAFFIC_ROUTES } from '../src/config/starterTownTrafficRoutes.js';
import { starterVehicleSpawnNear } from '../src/config/starterVehicleSpawn.js';
import { repairLegacyParkArrival } from '../src/config/saveMigrations.js';
import { worldRegistry } from '../src/runtime/WorldRegistry.js';
import { buildStarterTownRoadsideLayer } from '../src/world/StarterTownRoadside.js';

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const core = worldRegistry.spawn('dreamdrop-core')?.position;
assert.ok(core, 'Dreamdrop Core must remain the authoritative large-world arrival');

const roadArrival = starterVehicleSpawnNear(core, { facing: 0 });
assert.ok(roadArrival.distanceFromPlayer >= 2, 'starter car must not overlap the player');
assert.ok(roadArrival.distanceFromPlayer <= 2.95, 'starter car must remain inside the F interaction radius');

const offRoadArrival = starterVehicleSpawnNear({ x: 777, z: 777 }, { facing: Math.PI / 3 });
assert.equal(offRoadArrival.source, 'arrival-fallback', 'off-road saves need a guaranteed nearby vehicle');
assert.ok(offRoadArrival.distanceFromPlayer <= 2.95, 'fallback vehicle must remain interactable');

const park = worldRegistry.location('dreamdrop-park')?.position;
assert.ok(park, 'Dreamdrop Park relocation must remain registered');
const affectedV5Save = {
  version: 5,
  createdCharacter: true,
  world: {
    largeWorldEnabled: true,
    spawnId: 'dreamdrop-core',
    relocatedLocations: ['dreamdrop-park'],
  },
};
assert.deepEqual(
  repairLegacyParkArrival({ x: park.x - 6, z: park.z - 6 }, affectedV5Save),
  { x: core.x, z: core.z },
  'the one-release Park migration artifact must recover to Dreamdrop Core',
);
assert.deepEqual(
  repairLegacyParkArrival({ x: 400, z: 400 }, affectedV5Save),
  { x: 400, z: 400 },
  'intentional large-world saves must not be moved',
);

assert.ok(LARGE_TOWN_TRAFFIC_ROUTES.length >= 4, 'large Starter Town needs district-spanning traffic loops');
assert.ok(LARGE_TOWN_TRAFFIC_ROUTES.every((route) => route.loop.length >= 5), 'traffic loops must remain closed and navigable');
assert.ok(LARGE_TOWN_TRAFFIC_ROUTES.some((route) => route.loop.some(([x, z]) => Math.abs(x) > 500 || Math.abs(z) > 500)),
  'traffic must populate the wider town, not only the compact prototype');

const roadside = buildStarterTownRoadsideLayer({ heightAt: () => 0 });
const sidewalk = roadside.group.getObjectByName('ZW_Roadside_sidewalk');
assert.ok(sidewalk?.isInstancedMesh && sidewalk.count > 0, 'flat production world must keep generated sidewalks');
const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
sidewalk.getMatrixAt(0, matrix);
position.setFromMatrixPosition(matrix);
assert.ok(Math.abs(position.y) < 0.5, 'roadside assets must rebase to the flat drivable production terrain');

const [main, npc, bridge, largeTown, groundCover, buildingAssets] = await Promise.all([
  source('src/main.js'),
  source('src/npc.js'),
  source('src/runtime/ProductionWorldBridge.js'),
  source('src/world/LargeStarterTown.js'),
  source('src/world/StarterTownGroundCover.js'),
  source('src/world/StarterTownBuildingAssets.js'),
]);
const state = await source('src/state.js');
assert.match(state, /SAVE_SCHEMA_VERSION = 6/, 'exploration repair must ship as save schema 6');
assert.match(main, /placeStarterCarAtArrival\(\)/, 'world entry must place the starter car at the player arrival');
assert.match(main, /largeWorldActive \? LARGE_TOWN_TRAFFIC_ROUTES : undefined/, 'production traffic must use full-town routes');
assert.match(npc, /createTraffic\(scene, count = 6, routeDefinitions = TRAFFIC_ROUTES\)/,
  'traffic creator must accept the large-world route set');
assert.match(bridge, /includeStreetscape: true/, 'production bridge must enable asset-aware streetscape');
assert.match(bridge, /includeGeneratedRoadside: true/, 'production bridge must enable road dressing');
assert.match(bridge, /includeGroundCover: true/, 'production bridge must enable parcel surfaces and landscaping');
assert.match(bridge, /includeBuildingAssets: true/, 'production bridge must enable real filler buildings');
assert.match(bridge, /placeReadyAssets: true/, 'production bridge must place registered building models');
assert.match(largeTown, /vertexColors: true/, 'production terrain must include district and surface variation');
assert.match(largeTown, /buildStarterTownGroundCover/, 'large town must install the ground-cover layer');
assert.match(groundCover, /arboles-low-poy/, 'ground cover must load the shipped tree asset');
assert.match(groundCover, /rock-low-poly/, 'ground cover must load the shipped rock asset');
assert.match(largeTown, /buildStarterTownBuildingAssets/, 'large town must replace box massing with production buildings');
assert.match(buildingAssets, /ZW_StarterTownProductionBuildings/, 'production building layer must remain named for diagnostics');
assert.match(buildingAssets, /building_starter_house_a_v01/, 'residential parcels must use shipped house assets');
assert.match(buildingAssets, /building_starter_rowshop_a_v01/, 'commercial parcels must use shipped storefront assets');
assert.match(buildingAssets, /building_starter_warehouse_a_v01/, 'industrial parcels must use shipped warehouse assets');

const assetIndex = JSON.parse(await source('public/assets/models/asset-index-v2.json'));
const indexedNames = new Set(
  Object.values(assetIndex)
    .flatMap((packs) => Object.values(packs || {}))
    .flat()
    .map((entry) => entry?.name)
    .filter(Boolean),
);
const modeledLocations = worldRegistry.starterPlan.locations.filter((location) => location.id !== 'dreamdrop-park');
assert.equal(modeledLocations.length, 12, 'all twelve functional Starter Town locations must remain modeled');
for (const location of modeledLocations) {
  const assetName = location.assetRef.preferred.split(':').at(-1)?.replaceAll('-', '_');
  assert.ok(assetName && indexedNames.has(assetName), `${location.name} must reference a shipped production model`);
}

console.log('[exploration-ready] nearby starter vehicle, full-town traffic, save recovery, terrain dressing, and twelve production building models verified.');
