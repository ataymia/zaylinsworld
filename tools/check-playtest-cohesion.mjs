import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import {
  LARGE_TOWN_PEDESTRIAN_BUDGET,
  LARGE_TOWN_PEDESTRIAN_ROUTES,
  largeTownPedestrianCount,
} from '../src/config/starterTownPedestrianRoutes.js';
import {
  LARGE_TOWN_TRAFFIC_ROUTES,
  trafficSpawnPlan,
} from '../src/config/starterTownTrafficRoutes.js';
import { STARTER_TOWN_RUNTIME_PLAN } from '../src/config/starterTownRuntimePlan.js';
import { collisionTypeForKind } from '../src/config/vehicleCollisionRules.js';
import { minimapRoadPlan } from '../src/minimap.js';
import { RoadNetwork } from '../src/world/RoadNetwork.js';
import {
  buildingRoadClearance,
  massingPlacementsForParcel,
} from '../src/world/DistrictMassing.js';
import { STARTER_TOWN_PARCELS } from '../src/config/starterTownParcelPlan.js';
import { DISTRICT_PROFILE_BY_ID } from '../src/config/starterTownDistrictProfiles.js';
import { createStarterTownVegetationPlan } from '../src/world/StarterTownGroundCover.js';
import {
  STARTER_TOWN_ROADSIDE_PLAN,
  buildStarterTownRoadsideLayer,
} from '../src/world/StarterTownRoadside.js';
import {
  BREAKABLE_RESPAWN_MS,
  breakableCount,
  clearWorldObjects,
  collideVehicleImpact,
  getWorldObjects,
  registerWorldObject,
  updateWorldObjects,
  worldObjectCount,
} from '../src/worldCollision.js';

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const roadNetwork = new RoadNetwork(STARTER_TOWN_RUNTIME_PLAN.routes);

// The map must draw the same complete network that constructs the town. The
// retired three-street prototype is valid only in compact fallback mode.
const largeMapRoads = minimapRoadPlan({ largeWorld: true });
assert.equal(largeMapRoads.length, STARTER_TOWN_RUNTIME_PLAN.routes.length);
assert.deepEqual(
  largeMapRoads.map((route) => route.id),
  STARTER_TOWN_RUNTIME_PLAN.routes.map((route) => route.id),
);
assert.ok(largeMapRoads.some((route) => route.points.some((point) => Math.abs(point.x) >= 1000)),
  'expanded map must show routes beyond the compact prototype');
assert.ok(minimapRoadPlan({ largeWorld: false }).length < largeMapRoads.length);

// A two-kilometre town needs district coverage, not a downtown-only pedestrian
// loop. One route per district and density-aware budgets are release gates.
assert.deepEqual(LARGE_TOWN_PEDESTRIAN_BUDGET, { sparse: 32, normal: 48, busy: 72 });
assert.equal(largeTownPedestrianCount(0.45), 32);
assert.equal(largeTownPedestrianCount(0.72), 48);
assert.equal(largeTownPedestrianCount(1), 72);
assert.equal(LARGE_TOWN_PEDESTRIAN_ROUTES.length, STARTER_TOWN_RUNTIME_PLAN.districts.length);
assert.deepEqual(
  new Set(LARGE_TOWN_PEDESTRIAN_ROUTES.map((route) => route.districtId)),
  new Set(STARTER_TOWN_RUNTIME_PLAN.districts.map((district) => district.id)),
);
for (const route of LARGE_TOWN_PEDESTRIAN_ROUTES) {
  assert.ok(route.loop.length >= 5, `${route.id} needs a meaningful walking loop`);
  assert.ok(route.loop.some(([x, z]) => Math.abs(x) > 220 || Math.abs(z) > 220),
    `${route.id} must leave the prototype core`);
}

// Traffic must be distributed on authored loops; source integration below
// additionally guarantees that each spawned car begins with non-zero speed.
const traffic = trafficSpawnPlan(14, LARGE_TOWN_TRAFFIC_ROUTES);
assert.equal(traffic.length, 14);
assert.ok(traffic.every((car) => car.routeName && car.position));

// Landscaping must fill both developed parcels and the off-road horizon while
// respecting the authored road safety margin.
const vegetation = createStarterTownVegetationPlan();
assert.equal(vegetation.trees.length, 520);
assert.equal(vegetation.rocks.length, 72);
assert.ok(vegetation.trees.some((entry) => Math.hypot(entry.x, entry.z) > 1000),
  'outer terrain needs a landscaped horizon');
for (const entry of [...vegetation.trees, ...vegetation.rocks]) {
  const nearest = roadNetwork.nearest(entry);
  assert.ok(!nearest || nearest.distance > nearest.segment.width / 2 + 2.45,
    `${entry.id} must not intrude into a road`);
}

// Streetlights block a low-speed curb climb, fall under a real impact, and
// restore after thirty minutes. Trees and rocks remain hard obstacles.
assert.equal(collisionTypeForKind('streetlight'), 'breakable');
assert.equal(collisionTypeForKind('traffic_light'), 'breakable');
assert.equal(collisionTypeForKind('stop_sign'), 'breakable');
assert.equal(collisionTypeForKind('tree'), 'hard');
assert.equal(collisionTypeForKind('rock'), 'hard');
assert.equal(BREAKABLE_RESPAWN_MS, 30 * 60 * 1000);
clearWorldObjects();
const pole = new THREE.Group();
registerWorldObject(pole, 0, 0, { id: 'test-streetlight', kind: 'streetlight', r: 0.55 });
const slowPosition = new THREE.Vector3(0, 0, 0);
const safePosition = new THREE.Vector3(4, 0, 4);
const slowImpact = collideVehicleImpact(slowPosition, 2, null, {
  previousPos: safePosition,
  timestamp: 1000,
});
assert.equal(slowImpact.blocked, true);
assert.ok(slowPosition.equals(safePosition), 'low-speed collision must roll the car back');

const hardPosition = new THREE.Vector3(0, 0, 0);
const hardImpact = collideVehicleImpact(hardPosition, 12, null, { timestamp: 2000 });
assert.equal(hardImpact.blocked, false);
assert.equal(hardImpact.broken.length, 1);
assert.ok(Math.abs(pole.rotation.z) > 1, 'hard impact must visibly knock the pole down');
assert.equal(updateWorldObjects(2000 + BREAKABLE_RESPAWN_MS - 1), 0);
assert.equal(updateWorldObjects(2000 + BREAKABLE_RESPAWN_MS + 1), 1);
assert.ok(Math.abs(pole.rotation.z) < 0.0001, 'restored pole must return upright');

// The generated instance layer registers every visible streetlight only after
// the legacy world registry has been cleared.
clearWorldObjects();
const roadside = buildStarterTownRoadsideLayer({ heightAt: () => 0 });
const expectedStreetlights = STARTER_TOWN_ROADSIDE_PLAN.byType.streetlight;
assert.ok(expectedStreetlights >= 100);
assert.equal(roadside.activateCollisions(), expectedStreetlights);
assert.equal(roadside.activateCollisions(), 0, 'collision activation must be idempotent');
assert.equal(worldObjectCount(), expectedStreetlights);
assert.equal(breakableCount(), expectedStreetlights);
assert.ok(getWorldObjects().every((entry) => entry.respawnMs === BREAKABLE_RESPAWN_MS));

// Every visible filler building has a hard rectangular footprint. This closes
// the same off-road loophole as trees and poles without bloating cityColliders.
const buildings = STARTER_TOWN_PARCELS
  .filter((parcel) => !parcel.locationId)
  .flatMap((parcel) => massingPlacementsForParcel(
    parcel,
    DISTRICT_PROFILE_BY_ID[parcel.districtId],
    roadNetwork,
  ));
assert.equal(buildings.length, 73);
clearWorldObjects();
for (const building of buildings) {
  assert.ok(buildingRoadClearance(building.position, building.size, roadNetwork) >= 3);
  registerWorldObject(null, building.position.x, building.position.z, {
    id: `building:${building.id}`,
    kind: 'building',
    halfExtents: { x: building.size.x / 2, z: building.size.z / 2 },
  });
}
const testBuilding = buildings[0];
const buildingPosition = new THREE.Vector3(testBuilding.position.x, 0, testBuilding.position.z);
const buildingImpact = collideVehicleImpact(buildingPosition, 10, null, {
  previousPos: new THREE.Vector3(testBuilding.position.x + testBuilding.size.x, 0, testBuilding.position.z),
});
assert.equal(buildingImpact.blocked, true);
assert.ok(buildingImpact.damage > 0);
assert.equal(worldObjectCount(), 73);

// Source-level integration contracts cover browser-only seams that the Node
// behavioral checks cannot instantiate without WebGL and the DOM.
const [main, world, interiors, largeTown, bridge, npc] = await Promise.all([
  source('src/main.js'),
  source('src/world.js'),
  source('src/interiors.js'),
  source('src/world/LargeStarterTown.js'),
  source('src/runtime/ProductionWorldBridge.js'),
  source('src/npc.js'),
]);
assert.match(world, /compactSurfaceTarget = largeWorldVisuals \? new THREE\.Group\(\) : scene/);
assert.match(world, /interactionOnly: !!productionAsset/);
assert.match(largeTown, /terrain\.position\.y = -0\.045/);
assert.match(largeTown, /ZW_LocationIdentity_/);
assert.match(largeTown, /RESTAURANT • HOT FOOD/);
assert.match(interiors, /const setActive = \(id = null\)/);
assert.match(interiors, /interior\.group\.visible = active/);
assert.match(main, /setPreparedProductionWorldVisible\(false\)/);
assert.match(main, /if \(area === 'city'\) \{\s*updateCityNPCs/);
assert.match(main, /That place could not open safely/);
assert.match(bridge, /activatePreparedProductionWorldCollisions/);
assert.match(bridge, /setPreparedProductionWorldVisible/);
assert.match(bridge, /buildingAssets\?\.activateCollisions/);
assert.match(npc, /speed: baseSpeed \* 0\.55, baseSpeed/);
assert.match(npc, /cpos\.x \+= heading\.x \* step/);

console.log(
  '[playtest-cohesion] stable terrain, authoritative map roads, 520 trees, 72 rocks, '
  + 'district pedestrians, moving traffic, signed buildings, 73 hard building footprints, '
  + 'crashable/restoring streetlights, '
  + 'and isolated interior transitions verified.',
);
