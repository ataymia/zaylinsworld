import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { CHARACTER_ROLE_POLICY, POLICE_CHARACTER_CANDIDATES } from '../src/config/characterRoles.js';
import {
  LARGE_TOWN_TRAFFIC_BUDGET,
  LARGE_TOWN_TRAFFIC_ROUTES,
  largeTownTrafficCount,
  trafficSpawnPlan,
} from '../src/config/starterTownTrafficRoutes.js';
import { STARTER_TOWN_TRAFFIC_CONTROL_PLAN } from '../src/config/starterTownTrafficControlPlan.js';
import { STARTER_TOWN_RUNTIME_PLAN } from '../src/config/starterTownRuntimePlan.js';
import { DISTRICTS } from '../src/config/worldMapPlan.js';
import {
  TOWN_TRAFFIC_REQUIREMENTS,
  assertTownTrafficReady,
} from '../src/config/townTrafficPolicy.js';
import { repairSchoolRoadPlacement } from '../src/config/saveMigrations.js';
import { buildTrafficControl } from '../src/traffic.js';
import { STARTER_TOWN_PARCELS } from '../src/config/starterTownParcelPlan.js';
import { DISTRICT_PROFILE_BY_ID } from '../src/config/starterTownDistrictProfiles.js';
import {
  buildingRoadClearance,
  massingPlacementsForParcel,
} from '../src/world/DistrictMassing.js';
import { RoadNetwork } from '../src/world/RoadNetwork.js';
import {
  STARTER_TOWN_ROADSIDE_PLAN,
  buildStarterTownRoadsideLayer,
} from '../src/world/StarterTownRoadside.js';

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const roadNetwork = new RoadNetwork(STARTER_TOWN_RUNTIME_PLAN.routes);

// Vehicles: use the full-town performance budgets and ensure the default tier
// actually places traffic in view of the Dreamdrop arrival.
assert.deepEqual(LARGE_TOWN_TRAFFIC_BUDGET, { sparse: 28, normal: 44, busy: 68 });
assert.equal(largeTownTrafficCount(0.45), 28);
assert.equal(largeTownTrafficCount(0.72), 44);
assert.equal(largeTownTrafficCount(1), 68);
assert.ok(LARGE_TOWN_TRAFFIC_ROUTES.length >= 16, 'traffic must circulate throughout every district and the outskirts');
const liveTraffic = trafficSpawnPlan(largeTownTrafficCount(0.72), LARGE_TOWN_TRAFFIC_ROUTES);
assert.equal(liveTraffic.length, 44);
assert.ok(liveTraffic.some((car) => Math.hypot(car.position.x, car.position.z) < 8),
  'at least one visible traffic car must spawn near Dreamdrop Core');

// Traffic controls: the completed street network's at-grade junctions are
// covered. Test
// both NPC-stop logic and the player violation detector without WebGL.
assert.ok(STARTER_TOWN_TRAFFIC_CONTROL_PLAN.intersections >= 90);
assert.ok(STARTER_TOWN_TRAFFIC_CONTROL_PLAN.lights >= 20);
assert.ok(STARTER_TOWN_TRAFFIC_CONTROL_PLAN.stops >= 60);
const controlScene = new THREE.Group();
const controller = buildTrafficControl(controlScene, { largeWorld: true });
assert.equal(controller.controlCount, STARTER_TOWN_TRAFFIC_CONTROL_PLAN.intersections);
assert.equal(controlScene.children.length, controller.poleCount + controller.signCount);

const stop = controller.stops[0];
const testCar = {};
const stopViolation = controller.observeDriver(
  { x: stop.x, z: stop.z - stop.stopLine - 1 },
  { x: stop.x, z: stop.z - stop.stopLine + 1 },
  8,
  testCar,
  0.1,
);
assert.equal(stopViolation?.type, 'rolling-stop');

const light = controller.lights[0];
controller.t = 10;
const lightViolation = controller.observeDriver(
  { x: light.x, z: light.z - light.stopLine - 1 },
  { x: light.x, z: light.z - light.stopLine + 1 },
  8,
  {},
  0.1,
);
assert.equal(lightViolation?.type, 'red-light');

// Police: real role assets are mandatory and every candidate must exist in the
// shipped PSX pack. Procedural police are fallback-only.
assert.equal(CHARACTER_ROLE_POLICY.police.mode, 'glb-functional-direct');
assert.ok(CHARACTER_ROLE_POLICY.police.maxLiveSkins >= 4);
for (const name of POLICE_CHARACTER_CANDIDATES) {
  await access(new URL(`../public/assets/models/characters/psx/${name}.glb`, import.meta.url));
}

// Buildings: substantially increase filler density while keeping every footprint outside
// the road surface plus a three-metre safety margin.
const placements = STARTER_TOWN_PARCELS
  .filter((parcel) => !parcel.locationId)
  .flatMap((parcel) => massingPlacementsForParcel(
    parcel,
    DISTRICT_PROFILE_BY_ID[parcel.districtId],
    roadNetwork,
  ));
assert.ok(placements.length >= 100);
for (const placement of placements) {
  assert.ok(placement.roadSafe, `${placement.id} must be road-safe`);
  assert.ok(buildingRoadClearance(placement.position, placement.size, roadNetwork) >= 3,
    `${placement.id} must clear driving lanes`);
}
for (const location of STARTER_TOWN_RUNTIME_PLAN.locations.filter((entry) => entry.enterable !== false)) {
  assert.ok(Array.isArray(location.frontageFace) && location.frontageFace.length === 2,
    `${location.id} needs an authored curb-facing entrance`);
  const nearest = roadNetwork.nearest(location.position);
  assert.ok(nearest && nearest.distance - nearest.segment.width / 2 >= 6,
    `${location.id} must sit beyond the road edge`);
}

// Lighting: roadside streetlights are generated from the same road network and
// the lamp material must actually emit light-colored pixels at night.
assert.ok((STARTER_TOWN_ROADSIDE_PLAN.byType.streetlight || 0) >= 100);
const roadside = buildStarterTownRoadsideLayer({ heightAt: () => 0 });
const lamps = roadside.group.getObjectByName('ZW_Roadside_streetlight-lamp');
assert.ok(lamps?.isInstancedMesh && lamps.count >= 100);
assert.ok(lamps.material.emissiveIntensity > 0);

// Every future town inherits the same hard release gate, adapted for its travel
// mode (road, harbor, canyon, dungeon, or underwater).
assert.equal(Object.keys(TOWN_TRAFFIC_REQUIREMENTS).length, DISTRICTS.length);
for (const town of DISTRICTS) {
  const requirement = TOWN_TRAFFIC_REQUIREMENTS[town.id];
  assert.equal(requirement.requiredForPlayable, true);
  assert.equal(requirement.streetLighting, true);
  assert.equal(requirement.offenseDetection, true);
  assert.equal(requirement.policeOrSafetyResponse, true);
  assert.ok(requirement.controlTypes.length >= 2);
  assert.equal(assertTownTrafficReady(town.id, {}).ready, false);
}

const migrated = repairSchoolRoadPlacement(
  { x: -724, z: 72 },
  {
    version: 6,
    world: { largeWorldEnabled: true, relocatedLocations: ['zaylins-prep'] },
  },
);
assert.deepEqual(migrated, { x: -780, z: 72 });

const [main, npc, skins, vehicleKit] = await Promise.all([
  source('src/main.js'),
  source('src/npc.js'),
  source('src/avatarSkin.js'),
  source('src/vehicleKit.js'),
]);
assert.match(main, /buildTrafficControl\(scene, \{ largeWorld: largeWorldActive \}\)/);
assert.match(main, /largeTownTrafficCount\(graphics\.trafficDensity\)/);
assert.match(main, /observeDriver\(before, v\.g\.position/);
assert.match(main, /patrol attempting a traffic stop/);
assert.match(npc, /trafficSpawnPlan\(count, routes\)/);
assert.match(npc, /const g = carMesh/);
assert.match(skins, /role === 'civilian' \|\| role === 'police'/);
assert.match(vehicleKit, /Add and validate the replacement before hiding/);
assert.match(vehicleKit, /vehicleVisualAudit/);

console.log(`[live-city] ${liveTraffic.length} allocated traffic slots, skinned police, ${placements.length} road-safe filler buildings, ${controller.controlCount} controlled junctions, streetlights, enforcement, and nine-town policy verified.`);
