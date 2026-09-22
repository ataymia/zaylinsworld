import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {
  STARTER_TOWN_ACTIVITY_SCHEDULES,
  STARTER_TOWN_ACTIVITY_SCHEDULE_BY_ID,
  STARTER_TOWN_PEDESTRIAN_ACTIVITY_PROFILES,
  activityLevelAt,
  pedestrianActivityProfile,
  scheduledActivityIsActive,
} from '../src/config/starterTownActivitySchedule.js';
import { LARGE_TOWN_PEDESTRIAN_ROUTES } from '../src/config/starterTownPedestrianRoutes.js';
import { LARGE_TOWN_TRAFFIC_ROUTES } from '../src/config/starterTownTrafficRoutes.js';
import {
  createCityNPCs,
  createTraffic,
  updateCityNPCs,
  updateTraffic,
} from '../src/npc.js';
import { starterTownNavigation as navigation } from '../src/runtime/StarterTownNavigation.js';
import {
  STARTER_TOWN_SERVICE_ROUTE_CONTRACTS,
  STARTER_TOWN_SERVICE_TRAFFIC_ROUTES,
  starterTownServiceTrafficCount,
} from '../src/runtime/StarterTownServiceRoutes.js';

assert.ok(STARTER_TOWN_ACTIVITY_SCHEDULES.length >= 12, 'Starter Town needs a real set of daily schedules');
assert.equal(activityLevelAt('school-day', 2 * 60), 0.04);
assert.equal(activityLevelAt('school-day', 10 * 60), 1);
assert.equal(scheduledActivityIsActive('school-commute', 7 * 60, 0.5), true);
assert.equal(scheduledActivityIsActive('school-commute', 12 * 60, 0.5), false);
assert.equal(scheduledActivityIsActive('school-commute', 15 * 60, 0.5), true);
assert.equal(scheduledActivityIsActive('industrial-shift', 8 * 60, 0.8), true);
assert.equal(scheduledActivityIsActive('retail-hours', 23 * 60 + 30, 0.1), false);
assert.equal(scheduledActivityIsActive('traveler-flow', 2 * 60, 0.2), true,
  'Eastgate must retain some overnight traveler traffic');

for (const route of LARGE_TOWN_PEDESTRIAN_ROUTES) {
  const profile = pedestrianActivityProfile(route.activity);
  assert.ok(profile.scheduleId, `${route.id} needs an activity schedule`);
  assert.ok(STARTER_TOWN_ACTIVITY_SCHEDULE_BY_ID[profile.scheduleId], `${route.id} has an invalid schedule`);
  assert.ok(profile.roles.length >= 4, `${route.id} needs district/activity-specific pedestrian roles`);
}
assert.ok(Object.keys(STARTER_TOWN_PEDESTRIAN_ACTIVITY_PROFILES).length >= 8);

for (const route of LARGE_TOWN_TRAFFIC_ROUTES) {
  assert.ok(route.trafficKind, `${route.name} needs a traffic identity`);
  assert.ok(STARTER_TOWN_ACTIVITY_SCHEDULE_BY_ID[route.scheduleId], `${route.name} has an invalid schedule`);
}

assert.equal(STARTER_TOWN_SERVICE_ROUTE_CONTRACTS.length, 5);
assert.equal(STARTER_TOWN_SERVICE_TRAFFIC_ROUTES.length, STARTER_TOWN_SERVICE_ROUTE_CONTRACTS.length);
assert.equal(starterTownServiceTrafficCount(28), 3);
assert.equal(starterTownServiceTrafficCount(44), 5);
assert.equal(starterTownServiceTrafficCount(68), 5);

for (const route of STARTER_TOWN_SERVICE_TRAFFIC_ROUTES) {
  const definition = STARTER_TOWN_SERVICE_ROUTE_CONTRACTS.find((entry) => entry.id === route.id);
  assert.ok(definition, `service route ${route.id} has no contract`);
  assert.equal(route.source, 'starter-town-road-graph');
  assert.ok(route.graphDistance > 100, `${route.id} needs a meaningful city route`);
  assert.ok(route.graphRouteIds.length >= 2, `${route.id} must traverse connected named roads`);
  assert.ok(route.loop.length >= 4, `${route.id} needs a closed lane loop`);
  assert.ok(route.loop.every(([x, z]) => navigation.roadNetwork.isOnRoad({ x, z }, 1.5)),
    `${route.id} left the legal road surface`);

  const from = navigation.target(route.fromTargetId);
  const to = navigation.target(route.toTargetId);
  const graphRoute = navigation.route(from.position, to.position, { allowService: true, weight: 'distance' });
  assert.ok(graphRoute, `${route.id} endpoints are not connected`);
  assert.equal(Math.round(route.graphDistance), Math.round(graphRoute.distance));
}

// Prove the schedule actually controls live traffic objects, not just metadata.
const scene = new THREE.Group();
const serviceTraffic = createTraffic(
  scene,
  STARTER_TOWN_SERVICE_TRAFFIC_ROUTES.length,
  STARTER_TOWN_SERVICE_TRAFFIC_ROUTES,
);
assert.equal(serviceTraffic.length, 5);
assert.ok(serviceTraffic.every((entry) => entry.trafficKind === 'service'));
assert.ok(serviceTraffic.every((entry) => entry.routeSource === 'starter-town-road-graph'));

updateTraffic(serviceTraffic, 0.016, [], null, null, 7 * 60);
assert.equal(serviceTraffic.filter((entry) => entry.g.visible).length, 5,
  'morning service, school, sanitation, delivery, and traveler vehicles must be live');
updateTraffic(serviceTraffic, 0.016, [], null, null, 12 * 60);
assert.equal(serviceTraffic.filter((entry) => entry.g.visible).length, 4,
  'the school shuttle must leave service after the morning commute window');
updateTraffic(serviceTraffic, 0.016, [], null, null, 2 * 60);
assert.equal(serviceTraffic.filter((entry) => entry.g.visible).length, 0,
  'scheduled service vehicles must retire overnight');
serviceTraffic[0].stolen = true;
updateTraffic(serviceTraffic, 0.016, [], null, null, 2 * 60);
assert.equal(serviceTraffic[0].g.visible, true,
  'a vehicle already taken by the player must never disappear when its schedule closes');

const pedestrians = createCityNPCs(scene, 2, LARGE_TOWN_PEDESTRIAN_ROUTES.slice(0, 2));
updateCityNPCs(pedestrians, 0.016, 1, null, 12 * 60);
assert.equal(pedestrians.filter((entry) => entry.av.group.visible).length, 2);
updateCityNPCs(pedestrians, 0.016, 2, null, 2 * 60);
assert.equal(pedestrians.filter((entry) => entry.av.group.visible).length, 0,
  'off-duty pedestrians must leave the active city population overnight');

const mainSource = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
assert.match(mainSource, /createLiveTownTraffic\(/, 'the production world must compose ambient and service traffic');
assert.match(mainSource, /updateCityNPCs\(cityNPCs, dt, t, cityObserver, state\.timeMin\)/,
  'the live pedestrian update must receive the saved world clock');
assert.match(mainSource, /updateTraffic\(traffic, dt, trafficObstacles, trafficControl, cityObserver, state\.timeMin\)/,
  'the live traffic update must receive the saved world clock');
assert.match(mainSource, /c\.vehicleKit \|\| TRAFFIC_FLEET/,
  'service traffic must keep its authored vehicle identity after GLB replacement');

console.log('Starter Town schedule/service acceptance passed:');
console.log(`- ${STARTER_TOWN_ACTIVITY_SCHEDULES.length} daily activity schedules`);
console.log(`- ${LARGE_TOWN_PEDESTRIAN_ROUTES.length} pedestrian routes have roles and time-of-day activity`);
console.log(`- ${LARGE_TOWN_TRAFFIC_ROUTES.length} ambient traffic routes have identities and schedules`);
console.log(`- ${STARTER_TOWN_SERVICE_TRAFFIC_ROUTES.length} service vehicles use the shared RoadGraph`);
