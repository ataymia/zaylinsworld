// Regression protection for the playable Starter Town and world navigation UI.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DISTRICTS as towns } from '../src/config/worldMapPlan.js';
import { minimapRoadPlan } from '../src/minimap.js';
import { STARTER_TOWN_RUNTIME_PLAN } from '../src/config/starterTownRuntimePlan.js';
import { RoadNetwork } from '../src/world/RoadNetwork.js';
import { createStarterTownRoadsidePlan } from '../src/world/StarterTownRoadside.js';
import { buildDistrictMassing, buildingRoadClearance } from '../src/world/DistrictMassing.js';

const source = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const minimap = fs.readFileSync(new URL('../src/minimap.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.equal(towns.length, 9, 'world overview must cover all nine canonical towns');
assert.equal(towns.filter(t => t.playable).length, 1, 'planned unbuilt towns must never be labeled playable');
assert.equal(towns.find(t => t.playable)?.id, 'starter-town');
assert.equal(minimapRoadPlan({largeWorld:true}).length, STARTER_TOWN_RUNTIME_PLAN.routes.length);
assert.match(minimap, /onSelectDestination/, 'canvas must accept clicked destinations');
assert.match(minimap, /WORLD_TOWNS/, 'world overview must reuse canonical world blueprint');
assert.match(minimap, /worldView = clamp/, 'world map wheel zoom must be bounded');
assert.match(minimap, /center\.x -= dx/, 'city map must support panning');
assert.match(source, /customMapDestination/, 'chosen waypoint must override quest navigation');
assert.match(source, /starterTownNavigation\.routePoints\(position, customMapDestination/, 'waypoints must use actual drivable RoadGraph');
assert.match(source, /if \(k === 'b'\) summonOwnedCar\(\)/, 'owned-car recovery needs a hotkey');
assert.match(source, /\* 0\.012\);/, 'fuel consumption must be much slower');
assert.match(html, /<b>B<\/b> summon owned car/);
const network = new RoadNetwork(STARTER_TOWN_RUNTIME_PLAN.routes);
const roadPlan = createStarterTownRoadsidePlan({roadNetwork:network});
const signs = roadPlan.placements.filter(p => ['route-sign','intersection-sign','school-sign','streetlight'].includes(p.type));
assert(signs.filter(s => s.type !== 'streetlight').length >= 30, 'map must retain useful authored road signs');
for (const sign of signs) {
  // Test every road footprint, not the nearest centerline. A broad avenue can
  // overlap a sign even when a narrower alley has a closer centerline.
  for (const segment of network.segments) {
    const dx=segment.end.x-segment.start.x, dz=segment.end.z-segment.start.z;
    const t=Math.max(0,Math.min(1,
      ((sign.x-segment.start.x)*dx+(sign.z-segment.start.z)*dz)/(dx*dx+dz*dz||1)));
    const horizontal=Math.hypot(sign.x-segment.start.x-dx*t,sign.z-segment.start.z-dz*t);
    assert(horizontal >= segment.width/2 + (sign.type === 'streetlight' ? 0.99 : 1.19),
      `sign ${sign.id} intrudes into road ${segment.id} (${horizontal.toFixed(2)}m)`);
  }
}
const { placements } = buildDistrictMassing();
assert(placements.length >= 70, 'road-safe infill must retain a meaningful visible city');
for (const p of placements) {
  assert(p.roadSafe && p.roadClearance >= 3,
    `building ${p.id} is too close to drivable pavement`);
  assert(buildingRoadClearance(p.position,p.size,network) >= 3,
    `building ${p.id} clearance must hold against the real road network`);
}
console.log('World navigation and physical placement verification passed:');
console.log(`- ${towns.length} authentic world towns (1 currently playable) and ${network.routes.size} Starter Town road routes`);
console.log(`- ${signs.length} pavement-clear route and intersection signs`);
console.log(`- ${placements.length} road-clear filler buildings`);
console.log('- map zoom, world status, waypoint routing, fuel and vehicle summon contracts present');
