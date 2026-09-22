// ─────────────────────────────────────────────────────────────────────────────
// StarterTownServiceRoutes.js — live municipal/delivery traffic built from the
// same RoadGraph used by police pursuit and quest directions.
//
// Each contract names two real gameplay targets. The generated route starts and
// ends on their nearest legal road nodes, follows RoadGraph edges between them,
// and returns in the opposite lane. Service vehicles therefore cannot silently
// drift onto decorative paths or use a second, incompatible navigation map.
// ─────────────────────────────────────────────────────────────────────────────
import { starterTownNavigation } from './StarterTownNavigation.js';

const freeze = (value) => Object.freeze(value);
const contract = (id, name, fromTargetId, toTargetId, extra) => freeze({
  id,
  name,
  fromTargetId,
  toTargetId,
  ...extra,
});

export const STARTER_TOWN_SERVICE_ROUTE_CONTRACTS = freeze([
  contract('school-commute-shuttle', 'Zaylins Prep Shuttle', 'zaylins-home', 'zaylins-prep', {
    serviceType: 'school-shuttle', scheduleId: 'school-commute', vehicleKit: 'van',
    proceduralType: 'sedan', color: '#e8b72d', baseSpeed: 8.2,
  }),
  contract('northworks-parts-run', 'Northworks Parts Run', 'city-garage', 'auto-haus', {
    serviceType: 'parts-delivery', scheduleId: 'service-day', vehicleKit: 'van',
    proceduralType: 'hatch', color: '#e77725', baseSpeed: 7.6,
  }),
  contract('market-supply-run', 'Market Mile Supply Run', 'block-supply', 'kicks-fits', {
    serviceType: 'retail-delivery', scheduleId: 'retail-delivery', vehicleKit: 'van',
    proceduralType: 'hatch', color: '#4b78c4', baseSpeed: 7.2,
  }),
  contract('parks-sanitation-route', 'Parks Sanitation Route', 'dreamdrop-sanitation-stop', 'dreamdrop-park', {
    serviceType: 'sanitation', scheduleId: 'sanitation-day', vehicleKit: 'mobil',
    proceduralType: 'sedan', color: '#3f8a55', baseSpeed: 6.8,
  }),
  contract('eastgate-city-courier', 'Eastgate City Courier', 'worktower', '6twelve', {
    serviceType: 'city-courier', scheduleId: 'traveler-flow', vehicleKit: 'van',
    proceduralType: 'hatch', color: '#d8dbe2', baseSpeed: 8.5,
  }),
]);

function laneSide(points, direction, laneOffset) {
  return points.map((entry, index) => {
    const before = points[Math.max(0, index - 1)];
    const after = points[Math.min(points.length - 1, index + 1)];
    const dx = after.x - before.x;
    const dz = after.z - before.z;
    const length = Math.hypot(dx, dz) || 1;
    return freeze([
      entry.x - (dz / length) * laneOffset * direction,
      entry.z + (dx / length) * laneOffset * direction,
    ]);
  });
}

function generatedRouteFor(navigation, definition, laneOffset = 2.1) {
  const from = navigation.target(definition.fromTargetId);
  const to = navigation.target(definition.toTargetId);
  if (!from || !to) throw new Error(`Service route ${definition.id} references a missing target`);
  const route = navigation.route(from.position, to.position, { allowService: true, weight: 'distance' });
  if (!route || route.nodes.length < 2) throw new Error(`Service route ${definition.id} is not road-routable`);
  const outbound = laneSide(route.nodes, 1, laneOffset);
  const inbound = laneSide(route.nodes, -1, laneOffset).reverse();
  return freeze({
    id: definition.id,
    name: definition.name,
    loop: freeze([...outbound, ...inbound]),
    trafficKind: 'service',
    source: 'starter-town-road-graph',
    graphRouteIds: freeze([...route.routeIds]),
    graphDistance: route.distance,
    fromTargetId: definition.fromTargetId,
    toTargetId: definition.toTargetId,
    serviceType: definition.serviceType,
    scheduleId: definition.scheduleId,
    vehicleKit: definition.vehicleKit,
    proceduralType: definition.proceduralType,
    color: definition.color,
    baseSpeed: definition.baseSpeed,
  });
}

export function createStarterTownServiceRoutes(navigation = starterTownNavigation) {
  return freeze(STARTER_TOWN_SERVICE_ROUTE_CONTRACTS.map((definition) => (
    generatedRouteFor(navigation, definition)
  )));
}

export function starterTownServiceTrafficCount(totalTraffic) {
  const total = Math.max(0, Math.floor(Number(totalTraffic) || 0));
  if (!total) return 0;
  return Math.min(
    STARTER_TOWN_SERVICE_ROUTE_CONTRACTS.length,
    Math.max(1, Math.round(total * 0.12)),
  );
}

export const STARTER_TOWN_SERVICE_TRAFFIC_ROUTES = createStarterTownServiceRoutes();

export default STARTER_TOWN_SERVICE_TRAFFIC_ROUTES;
