// Closed, lane-safe traffic loops for the authoritative 2.4 km Starter Town.
// The legacy traffic loops in mapConfig.js only cover the old 60 m prototype.

const freezeLoop = (name, points) => Object.freeze({
  name,
  loop: Object.freeze(points.map(([x, z]) => Object.freeze([x, z]))),
});

export const LARGE_TOWN_TRAFFIC_ROUTES = Object.freeze([
  // Out-and-back lanes on Centre Avenue. The first waypoint is beside the
  // Dreamdrop Core arrival so traffic is visible immediately after spawning.
  freezeLoop('centre-avenue-local', [
    [2.2, 0], [2.2, 500], [-2.2, 500], [-2.2, -500], [2.2, -500],
  ]),
  // Two-way lane pair on Dreamdrop Boulevard.
  freezeLoop('dreamdrop-boulevard-local', [
    [0, -117.8], [500, -117.8], [500, -122.2], [-500, -122.2], [-500, -117.8],
  ]),
  // Slow service traffic through the mixed-use core.
  freezeLoop('dreamdrop-service-local', [
    [0, 77.8], [300, 77.8], [300, 82.2], [-300, 82.2], [-300, 77.8],
  ]),
  // A full-world loop keeps distant districts from feeling completely static.
  freezeLoop('dreamdrop-beltway', [
    [0, -857.8], [857.8, -857.8], [857.8, 857.8], [-857.8, 857.8], [-857.8, -857.8],
  ]),
  // School-zone circulation. Cars use the same authored loop as the campus,
  // shifted into the right-hand lane so the sidewalks remain clear.
  freezeLoop('scholars-quarter-local', [
    [-807.8, 0], [-722.2, 0], [-642.2, 0], [-622.2, 147.8], [-797.8, 147.8],
  ]),
  // Parkside and Willowbend neighborhood circulation.
  freezeLoop('parkside-willowbend-local', [
    [2.2, 497.8], [248, 497.8], [338, 427.8], [468, 407.8], [588, 467.8],
    [647.8, 578], [607.8, 708], [498, 777.8], [182.2, 757.8], [2.2, 697.8],
  ]),
  // Northworks keeps service and commuter vehicles visible near the dealership
  // and garage instead of concentrating all motion in the old town centre.
  freezeLoop('northworks-local', [
    [-850, -697.8], [-450, -697.8], [0, -697.8], [500, -697.8],
    [850, -697.8], [850, -702.2], [0, -702.2], [-850, -702.2],
  ]),
  // Eastgate / Civic connector.
  freezeLoop('eastgate-local', [
    [2.2, 37.8], [360, 37.8], [650, 17.8], [857.8, -2.2],
    [857.8, 2.2], [650, 22.2], [360, 42.2], [2.2, 42.2],
  ]),
]);

export const LARGE_TOWN_TRAFFIC_BUDGET = Object.freeze({
  sparse: 8,
  normal: 14,
  busy: 22,
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
        position: pointAtDistance(route.loop, distance),
      }));
    }
  });
  return Object.freeze(plan);
}

export default LARGE_TOWN_TRAFFIC_ROUTES;
