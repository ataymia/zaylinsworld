import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import {
  LARGE_TOWN_PEDESTRIAN_BUDGET,
  LARGE_TOWN_PEDESTRIAN_ROUTES,
} from '../src/config/starterTownPedestrianRoutes.js';
import {
  LARGE_TOWN_TRAFFIC_BUDGET,
  LARGE_TOWN_TRAFFIC_ROUTES,
} from '../src/config/starterTownTrafficRoutes.js';
import {
  STARTER_TOWN_SANITATION_STOP,
  generateStarterTownLitterPositions,
} from '../src/config/starterTownSanitationPlan.js';
import { STARTER_TOWN_RUNTIME_PLAN } from '../src/config/starterTownRuntimePlan.js';
import { buildDistrictMassing } from '../src/world/DistrictMassing.js';
import { RoadGraph } from '../src/world/RoadGraph.js';
import { RoadNetwork } from '../src/world/RoadNetwork.js';
import { createStarterTownAccessPlan } from '../src/world/StarterTownAccessLayer.js';
import { StarterTownBoundaryGuard } from '../src/world/StarterTownBoundaryGuard.js';
import {
  STARTER_TOWN_ROCK_TARGET,
  STARTER_TOWN_TREE_TARGET,
  createStarterTownVegetationPlan,
} from '../src/world/StarterTownGroundCover.js';
import { ensureTrafficCoverage } from '../src/npc.js';
import {
  clearWorldObjects,
  collideVehicleImpact,
  registerWorldObject,
  worldCollisionSpatialStats,
} from '../src/worldCollision.js';

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const roadNetwork = new RoadNetwork(STARTER_TOWN_RUNTIME_PLAN.routes);
const roadGraph = new RoadGraph(roadNetwork);

// City form: a connected hierarchy of arterials, collectors, neighborhood
// streets, and destination frontages replaces the stretched prototype grid.
assert.ok(STARTER_TOWN_RUNTIME_PLAN.routes.length >= 48);
assert.equal(roadGraph.components().length, 1, 'the public street graph must be fully connected');
assert.ok(roadGraph.snapshot().nodes >= 190);
assert.ok(roadGraph.snapshot().geometricIntersections >= 30);

const accessPlan = createStarterTownAccessPlan({ roadNetwork });
const enterableLocations = STARTER_TOWN_RUNTIME_PLAN.locations.filter((entry) => entry.enterable !== false);
assert.equal(accessPlan.length, enterableLocations.length);
for (const access of accessPlan) {
  assert.ok(access.distance <= 36, `${access.locationId} needs a short paved curb connection`);
  assert.ok(access.faceAlignment >= 0.95, `${access.locationId} must face its declared frontage`);
  assert.ok(roadNetwork.routes.has(access.routeId), `${access.locationId} frontage route must exist`);
}

const massing = buildDistrictMassing();
assert.ok(massing.placements.length >= 100, 'Starter Town needs at least 100 non-enterable filler buildings');
assert.ok(massing.placements.every((entry) => entry.roadSafe), 'all filler footprints must stay out of traffic lanes');

// Scenery: instancing supports real citywide density, with a minimum presence in
// every district rather than hiding most of the count in one horizon ring.
const vegetation = createStarterTownVegetationPlan();
assert.equal(vegetation.trees.length, STARTER_TOWN_TREE_TARGET);
assert.equal(vegetation.rocks.length, STARTER_TOWN_ROCK_TARGET);
assert.deepEqual(
  { trees: STARTER_TOWN_TREE_TARGET, rocks: STARTER_TOWN_ROCK_TARGET },
  { trees: 1400, rocks: 240 },
);
for (const district of STARTER_TOWN_RUNTIME_PLAN.districts) {
  const xs = district.polygon.map((entry) => entry.x);
  const zs = district.polygon.map((entry) => entry.z);
  const count = vegetation.trees.filter((entry) => (
    entry.x >= Math.min(...xs) && entry.x <= Math.max(...xs)
    && entry.z >= Math.min(...zs) && entry.z <= Math.max(...zs)
  )).length;
  assert.ok(count >= 48, `${district.id} must receive its own landscaping quota`);
}

// Living-city budgets and the anti-stranding encounter director are behavioral,
// not comments. A distant occupied car is brought onto a nearby authored loop
// far enough away to approach naturally.
assert.deepEqual(LARGE_TOWN_TRAFFIC_BUDGET, { sparse: 28, normal: 44, busy: 68 });
assert.deepEqual(LARGE_TOWN_PEDESTRIAN_BUDGET, { sparse: 72, normal: 108, busy: 156 });
assert.ok(LARGE_TOWN_TRAFFIC_ROUTES.length >= 16);
assert.ok(LARGE_TOWN_PEDESTRIAN_ROUTES.length >= 18);
for (const route of LARGE_TOWN_TRAFFIC_ROUTES) {
  for (let index = 0; index < route.loop.length; index++) {
    const [startX, startZ] = route.loop[index];
    const [endX, endZ] = route.loop[(index + 1) % route.loop.length];
    const length = Math.hypot(endX - startX, endZ - startZ);
    const samples = Math.max(1, Math.ceil(length / 5));
    for (let sample = 0; sample <= samples; sample++) {
      const t = sample / samples;
      const x = startX + (endX - startX) * t;
      const z = startZ + (endZ - startZ) * t;
      const road = roadNetwork.nearest({ x, z });
      assert.ok(road?.distance <= 6, `${route.name} must keep its complete traffic path on paved lanes`);
    }
  }
}
const coverageCar = {
  g: new THREE.Group(),
  route: [
    new THREE.Vector3(-400, 0, 0),
    new THREE.Vector3(400, 0, 0),
    new THREE.Vector3(400, 0, 120),
    new THREE.Vector3(-400, 0, 120),
  ],
  wp: 0,
  speed: 0,
  baseSpeed: 9,
  hasDriver: true,
  routeName: 'coverage-test',
};
coverageCar.g.position.set(400, 0, 120);
const coverage = ensureTrafficCoverage([coverageCar], { x: 0, z: 0 });
assert.equal(coverage.action, 'rebalanced');
assert.ok(coverage.distance >= 70 && coverage.distance <= 150);
assert.ok(coverageCar.speed >= 3);

// The live boundary guard prevents the unfinished gray edge from becoming a
// drivable destination while keeping authored highway gateways usable.
const boundary = new StarterTownBoundaryGuard();
assert.equal(boundary.evaluate({ x: 1400, z: 1400 }).action, 'recover');
assert.equal(boundary.evaluate({ x: 1050, z: 1050 }).action, 'clamp');
assert.equal(boundary.evaluate({ x: 0, z: -1100 }).action, 'allow-gateway');

// Sanitation now occupies a real sidewalk/service pad and scatters pickup trash
// across authoritative sidewalks, never the retired compact-road coordinates.
const workerRoad = roadNetwork.nearest(STARTER_TOWN_SANITATION_STOP.worker);
assert.ok(workerRoad);
const workerEdgeGap = workerRoad.distance - workerRoad.segment.width / 2;
assert.ok(workerEdgeGap >= 1 && workerEdgeGap <= 4.5, 'Denise must stand on a sidewalk');
const dumpsterRoad = roadNetwork.nearest(STARTER_TOWN_SANITATION_STOP.dumpster);
assert.ok(dumpsterRoad.distance > dumpsterRoad.segment.width / 2 + 2);
let randomState = 0x12345678;
const random = () => {
  randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
  return randomState / 4294967296;
};
const litter = generateStarterTownLitterPositions(28, {
  random,
  avoid: [
    { ...STARTER_TOWN_SANITATION_STOP.worker, r: 6 },
    { ...STARTER_TOWN_SANITATION_STOP.dumpster, r: 6 },
  ],
});
assert.equal(litter.length, 28);
assert.ok(new Set(litter.map((entry) => entry.routeId)).size >= 10, 'cleanup pickups must span the city');
for (const entry of litter) {
  const frontage = roadNetwork.nearest(entry, { routeId: entry.routeId });
  assert.ok(frontage.distance > frontage.segment.width / 2 + 1.5);
}

const assetIndex = JSON.parse(await source('public/assets/models/asset-index-v2.json'));
const dumpsterEntry = Object.values(assetIndex)
  .flatMap((packs) => Object.values(packs || {}))
  .flat()
  .find((entry) => entry?.name === 'prop_starter_industrial_dumpster_a_v01');
assert.ok(dumpsterEntry, 'the production industrial dumpster must stay indexed');
execFileSync('git', ['cat-file', '-e', `HEAD:public/assets/${dumpsterEntry.path}`], { stdio: 'ignore' });

// Thousands of scenery colliders remain practical because impact checks use a
// spatial index instead of walking the entire world-object list every frame.
clearWorldObjects();
for (let index = 0; index < 1400; index++) {
  registerWorldObject(null, (index % 50) * 24 - 600, Math.floor(index / 50) * 24 - 330, {
    id: `spatial-tree-${index}`,
    kind: 'tree',
    r: 0.8,
  });
}
const testPole = new THREE.Group();
registerWorldObject(testPole, 0, 0, { id: 'spatial-test-pole', kind: 'streetlight', r: 0.6 });
const spatial = worldCollisionSpatialStats();
assert.ok(spatial.cells >= 700);
assert.ok(spatial.maxBucket < 12);
const localImpact = collideVehicleImpact(new THREE.Vector3(0, 0, 0), 12);
assert.ok(localImpact.hits.some((entry) => entry.id === 'spatial-test-pole'));
clearWorldObjects();

// Browser-only seams remain guarded at source level: exactly one large-town
// identity layer owns signs, sprint is already present, and both live player and
// vehicle movement use the boundary guard.
const [main, world, largeTown, controls] = await Promise.all([
  source('src/main.js'),
  source('src/world.js'),
  source('src/world/LargeStarterTown.js'),
  source('src/controls.js'),
]);
assert.match(world, /node\.visible = !!node\.userData\.interactionAnchor/);
assert.match(largeTown, /sign\.name = `ZW_LocationIdentity_\$\{location\.id\}`/);
assert.match(largeTown, /for \(const location of plan\.locations\)/);
assert.match(controls, /this\.keys\.has\('shift'\)/);
assert.match(main, /const canSprint = inp\.run && moving/);
assert.equal((main.match(/enforceLiveStarterTownBoundary\(/g) || []).length >= 3, true);
assert.match(main, /ensureTrafficCoverage\(traffic, cityObserver\)/);
assert.match(main, /applyNpcSkins\(\[sanitationNpc\], renderer\)/);
assert.match(main, /DENISE • SANITATION/);
assert.match(main, /upgradeSanitationDumpster/);

console.log(
  `[city-intent] ${STARTER_TOWN_RUNTIME_PLAN.routes.length} connected roads, `
  + `${accessPlan.length} paved destination approaches, ${massing.placements.length} filler buildings, `
  + `${vegetation.trees.length} trees, ${vegetation.rocks.length} rocks, continuous traffic, `
  + 'live bounds, one-sign ownership, sprint preservation, and upgraded sanitation verified.',
);
