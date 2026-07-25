// Authoritative traffic-control plan for the 2,000 m Starter Town.
//
// Controls are derived from the same road graph used by routing rather than the
// retired 60 m prototype grid. Every at-grade junction receives either a signal
// or an all-way stop, with the control hardware offset beyond the widest road.
import { STARTER_TOWN_RUNTIME_PLAN } from './starterTownRuntimePlan.js';
import { RoadNetwork } from '../world/RoadNetwork.js';
import { RoadGraph } from '../world/RoadGraph.js';

const freeze = (value) => Object.freeze(value);
const SIGNAL_TIERS = new Set(['expressway', 'highway', 'parkway', 'main']);
const SCHOOL_ROUTES = new Set(['school-loop', 'scholar-road']);

export function createStarterTownTrafficControlPlan({
  roadNetwork = new RoadNetwork(STARTER_TOWN_RUNTIME_PLAN.routes),
  roadGraph = new RoadGraph(roadNetwork),
} = {}) {
  const controls = [];
  let sequence = 0;

  for (const node of roadGraph.nodes.values()) {
    if (node.routes.size < 2) continue;
    const routeIds = [...node.routes].sort();
    const routes = routeIds.map((id) => roadNetwork.routes.get(id)).filter(Boolean);
    const widths = routes.map((route) => {
      const segment = roadNetwork.segments.find((entry) => entry.routeId === route.id);
      return Number(segment?.width) || 9;
    });
    const schoolZone = routeIds.some((id) => SCHOOL_ROUTES.has(id));
    // Signal major-to-major junctions. A local street meeting one arterial uses
    // an all-way stop instead of covering every neighborhood corner in dozens
    // of animated signal heads.
    const majorRouteCount = routes.filter((route) => SIGNAL_TIERS.has(route.tier)).length;
    const signalized = !schoolZone && majorRouteCount >= 2;
    const roadHalf = Math.max(4.5, ...widths.map((width) => width / 2));

    controls.push(freeze({
      id: `starter-control-${node.id}`,
      x: node.x,
      z: node.z,
      type: signalized ? 'light' : 'stop',
      routeIds: freeze(routeIds),
      roadHalf,
      stopLine: roadHalf + 1.4,
      approach: roadHalf + 16,
      laneHalf: roadHalf + 1.5,
      hardwareOffset: roadHalf + 3.4,
      axisGreenFirst: sequence++ % 2 ? 'EW' : 'NS',
      schoolZone,
    }));
  }

  const lights = controls.filter((entry) => entry.type === 'light').length;
  const stops = controls.length - lights;
  return freeze({
    townId: 'starter-town',
    source: 'authoritative-road-graph',
    controls: freeze(controls),
    intersections: controls.length,
    lights,
    stops,
  });
}

export const STARTER_TOWN_TRAFFIC_CONTROL_PLAN = createStarterTownTrafficControlPlan();

export default STARTER_TOWN_TRAFFIC_CONTROL_PLAN;
