// Closed, lane-safe traffic loops for the authoritative 2,000 × 2,000 playable
// Starter Town (inside its 2.4 km terrain envelope).
// The legacy traffic loops in mapConfig.js only cover the old 60 m prototype.
import { STARTER_TOWN_RUNTIME_PLAN } from './starterTownRuntimePlan.js';

const freezeLoop = (name, points, extra = {}) => Object.freeze({
  name,
  loop: Object.freeze(points.map(([x, z]) => Object.freeze([x, z]))),
  ...extra,
});

function twoWayRoadLoop(name, routeId, extra = {}, laneOffset = 2.2) {
  const route = STARTER_TOWN_RUNTIME_PLAN.routes.find((entry) => entry.id === routeId);
  if (!route || route.points.length < 2) {
    throw new Error(`Traffic corridor ${name} references missing route ${routeId}`);
  }
  const points = route.points;
  const side = (direction) => points.map((entry, index) => {
    const before = points[Math.max(0, index - 1)];
    const after = points[Math.min(points.length - 1, index + 1)];
    const dx = after.x - before.x;
    const dz = after.z - before.z;
    const length = Math.hypot(dx, dz) || 1;
    return [
      entry.x - (dz / length) * laneOffset * direction,
      entry.z + (dx / length) * laneOffset * direction,
    ];
  });
  return freezeLoop(name, [
    ...side(1),
    ...side(-1).reverse(),
  ], extra);
}

export const LARGE_TOWN_TRAFFIC_ROUTES = Object.freeze([
  // Out-and-back lanes on Centre Avenue. The first waypoint is beside the
  // Dreamdrop Core arrival so traffic is visible immediately after spawning.
  freezeLoop('centre-avenue-local', [
    [2.2, 0], [2.2, 500], [-2.2, 500], [-2.2, -500], [2.2, -500],
  ], { trafficKind: 'commuter', scheduleId: 'mixed-use-day' }),
  // Two-way lane pair on Dreamdrop Boulevard.
  freezeLoop('dreamdrop-boulevard-local', [
    [0, -117.8], [500, -117.8], [500, -122.2], [-500, -122.2], [-500, -117.8],
  ], { trafficKind: 'commuter', scheduleId: 'mixed-use-day' }),
  // Slow service traffic through the mixed-use core.
  freezeLoop('dreamdrop-service-local', [
    [0, 77.8], [300, 77.8], [300, 82.2], [-300, 82.2], [-300, 77.8],
  ], { trafficKind: 'local-service', scheduleId: 'service-day', vehicleKit: 'van', proceduralType: 'hatch' }),
  // A full-world loop keeps distant districts from feeling completely static.
  freezeLoop('dreamdrop-beltway', [
    [0, -857.8], [857.8, -857.8], [857.8, 857.8], [-857.8, 857.8], [-857.8, -857.8],
  ], { trafficKind: 'traveler', scheduleId: 'traveler-flow', baseSpeed: 10.5 }),
  // School-zone circulation. Cars use the same authored loop as the campus,
  // shifted into the right-hand lane so the sidewalks remain clear.
  freezeLoop('scholars-quarter-local', [
    [-807.8, 0], [-722.2, 0], [-642.2, 0], [-622.2, 147.8], [-797.8, 147.8],
  ], { trafficKind: 'school-zone', scheduleId: 'school-day', baseSpeed: 6.3 }),
  // Parkside and Willowbend neighborhood circulation.
  twoWayRoadLoop('parkside-willowbend-local', 'parkside-crescent', {
    trafficKind: 'neighborhood', scheduleId: 'residential-rhythm', baseSpeed: 6.8,
  }),
  // Northworks keeps service and commuter vehicles visible near the dealership
  // and garage instead of concentrating all motion in the old town centre.
  freezeLoop('northworks-local', [
    [-850, -697.8], [-450, -697.8], [0, -697.8], [500, -697.8],
    [850, -697.8], [850, -702.2], [0, -702.2], [-850, -702.2],
  ], { trafficKind: 'shift-traffic', scheduleId: 'industrial-shift', vehicleKit: 'jeep' }),
  // Eastgate / Civic connector.
  freezeLoop('eastgate-local', [
    [2.2, 37.8], [360, 37.8], [650, 17.8], [857.8, -2.2],
    [857.8, 2.2], [650, 22.2], [360, 42.2], [2.2, 42.2],
  ], { trafficKind: 'traveler', scheduleId: 'traveler-flow' }),
  twoWayRoadLoop('westside-neighborhood', 'westside-avenue', {
    trafficKind: 'neighborhood', scheduleId: 'residential-rhythm',
  }),
  freezeLoop('market-mile-grid', [
    [-297.8, 302.2], [197.8, 302.2], [197.8, 497.8], [-297.8, 497.8],
  ], { trafficKind: 'retail', scheduleId: 'retail-hours' }),
  freezeLoop('civic-heights-grid', [
    [362.2, -517.8], [877.8, -517.8], [877.8, 177.8], [362.2, 177.8],
  ], { trafficKind: 'civic', scheduleId: 'civic-hours', proceduralType: 'sedan' }),
  twoWayRoadLoop('scholars-quarter-grid', 'scholar-west-street', {
    trafficKind: 'school-zone', scheduleId: 'school-day', baseSpeed: 6.2,
  }),
  twoWayRoadLoop('northworks-grid', 'northworks-west-street', {
    trafficKind: 'shift-traffic', scheduleId: 'industrial-shift', vehicleKit: 'jeep',
  }),
  freezeLoop('eastgate-frontage', [
    [874.2, 182.2], [874.2, 397.8], [869.8, 397.8], [869.8, 182.2],
  ], { trafficKind: 'traveler', scheduleId: 'traveler-flow' }),
  twoWayRoadLoop('parkside-grid', 'parkside-avenue', {
    trafficKind: 'recreation', scheduleId: 'park-hours', baseSpeed: 6.5,
  }),
  twoWayRoadLoop('willowbend-grid', 'willowbend-west-street', {
    trafficKind: 'neighborhood', scheduleId: 'residential-rhythm', baseSpeed: 6.2,
  }),
]);

export const LARGE_TOWN_TRAFFIC_BUDGET = Object.freeze({
  sparse: 28,
  normal: 44,
  busy: 68,
});

export function largeTownTrafficCount(density = 0.72) {
  const value = Number(density);
  if (value >= 0.95) return LARGE_TOWN_TRAFFIC_BUDGET.busy;
  if (value >= 0.68) return LARGE_TOWN_TRAFFIC_BUDGET.normal;
  return LARGE_TOWN_TRAFFIC_BUDGET.sparse;
}

function loopLength(loop) {
  let length = 0;
  for (let index = 0; index < loop.length; index++) {
    const a = loop[index];
    const b = loop[(index + 1) % loop.length];
    length += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return length;
}

function pointAtDistance(loop, distance) {
  const total = loopLength(loop) || 1;
  let remaining = ((distance % total) + total) % total;
  for (let index = 0; index < loop.length; index++) {
    const a = loop[index];
    const b = loop[(index + 1) % loop.length];
    const segment = Math.hypot(b[0] - a[0], b[1] - a[1]) || 0.001;
    if (remaining <= segment) {
      const t = remaining / segment;
      return Object.freeze({
        x: a[0] + (b[0] - a[0]) * t,
        z: a[1] + (b[1] - a[1]) * t,
        nextWaypoint: (index + 1) % loop.length,
      });
    }
    remaining -= segment;
  }
  return Object.freeze({ x: loop[0][0], z: loop[0][1], nextWaypoint: 1 % loop.length });
}

export function trafficSpawnPlan(count, routeDefinitions = LARGE_TOWN_TRAFFIC_ROUTES) {
  const routes = Array.isArray(routeDefinitions) ? routeDefinitions : [];
  if (!routes.length || count <= 0) return Object.freeze([]);
  const perRoute = routes.map(() => 0);
  for (let index = 0; index < count; index++) perRoute[index % routes.length] += 1;
  const plan = [];
  routes.forEach((route, routeIndex) => {
    const routeCount = perRoute[routeIndex];
    const total = loopLength(route.loop);
    for (let index = 0; index < routeCount; index++) {
      const distance = routeCount ? (index * total) / routeCount : 0;
      plan.push(Object.freeze({
        routeIndex,
        routeName: route.name,
        routeSlot: routeCount ? (index + 0.5) / routeCount : 0.5,
        routeCount,
        position: pointAtDistance(route.loop, distance),
      }));
    }
  });
  return Object.freeze(plan);
}

export default LARGE_TOWN_TRAFFIC_ROUTES;
