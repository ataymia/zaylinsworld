// ─────────────────────────────────────────────────────────────────────────
// StarterTownNavigation.js — the live routing contract for Starter Town.
//
// Traffic, emergency services, quests, deliveries, and map directions must all
// agree on what a road is. This lightweight service owns that agreement without
// requiring the scene/streaming runtime to be installed first.
// ─────────────────────────────────────────────────────────────────────────
import { STARTER_TOWN_RUNTIME_PLAN } from '../config/starterTownRuntimePlan.js';
import { STARTER_TOWN_SANITATION_STOP } from '../config/starterTownSanitationPlan.js';
import { RoadNetwork } from '../world/RoadNetwork.js';
import { RoadGraph, roadDistance } from '../world/RoadGraph.js';

const point = (value = {}) => Object.freeze({
  x: Number(value.x) || 0,
  y: Number(value.y) || 0,
  z: Number(value.z) || 0,
});

function sameTarget(a, b, tolerance = 5) {
  return !!a && !!b && roadDistance(a, b) <= tolerance;
}

export class StarterTownNavigation {
  constructor({ plan = STARTER_TOWN_RUNTIME_PLAN } = {}) {
    this.plan = plan;
    this.roadNetwork = new RoadNetwork(plan.routes);
    this.roadGraph = new RoadGraph(this.roadNetwork);
    this.locations = new Map(plan.locations.map((location) => [location.id, location]));
    this.targets = new Map(this.locations);
    this.targets.set(STARTER_TOWN_SANITATION_STOP.id, Object.freeze({
      id: STARTER_TOWN_SANITATION_STOP.id,
      name: 'City Sanitation',
      position: STARTER_TOWN_SANITATION_STOP.worker,
    }));
  }

  location(locationId) {
    return this.locations.get(locationId) || null;
  }

  target(targetId) {
    return this.targets.get(targetId) || null;
  }

  route(from, to, options = {}) {
    return this.roadGraph.route(from, to, options);
  }

  routeToLocation(from, locationId, options = {}) {
    const location = this.location(locationId);
    return location ? this.route(from, location.position, options) : null;
  }

  routeToTarget(from, targetId, options = {}) {
    const target = this.target(targetId);
    return target ? this.route(from, target.position, options) : null;
  }

  routePoints(from, to, options = {}) {
    const route = this.route(from, to, options);
    if (!route) return null;
    const points = [point(from), ...route.nodes.map(point)];
    const destination = point(to);
    if (!points.length || roadDistance(points[points.length - 1], destination) > 0.5) points.push(destination);
    return Object.freeze({ ...route, points: Object.freeze(points), destination });
  }

  routePointsToLocation(from, locationId, options = {}) {
    const location = this.location(locationId);
    if (!location) return null;
    const route = this.routePoints(from, location.position, options);
    return route ? Object.freeze({ ...route, locationId, location }) : null;
  }

  routePointsToTarget(from, targetId, options = {}) {
    const target = this.target(targetId);
    if (!target) return null;
    const route = this.routePoints(from, target.position, options);
    return route ? Object.freeze({ ...route, targetId, target }) : null;
  }

  // Pick a real road node for a dispatched unit. Prefer a named base (the
  // police station for officers), otherwise choose a node inside an arrival
  // band so units enter from the street instead of materialising in buildings.
  dispatchPoint(target, {
    preferredLocationId = null,
    preferChance = 0.55,
    minDistance = 24,
    maxDistance = 48,
    random = Math.random,
  } = {}) {
    const preferred = preferredLocationId && this.location(preferredLocationId);
    if (preferred && random() < preferChance) {
      const nearest = this.roadGraph.nearestNode(preferred.position)?.node;
      const distance = nearest ? roadDistance(nearest, target) : 0;
      if (nearest && distance >= minDistance && distance <= Math.max(maxDistance * 2, minDistance)) return point(nearest);
    }

    const candidates = [...this.roadGraph.nodes.values()]
      .map((node) => ({ node, distance: roadDistance(node, target) }))
      .filter(({ distance }) => distance >= minDistance && distance <= maxDistance);
    if (candidates.length) return point(candidates[Math.floor(random() * candidates.length)].node);

    const nearestBand = [...this.roadGraph.nodes.values()]
      .map((node) => ({ node, delta: Math.abs(roadDistance(node, target) - minDistance) }))
      .sort((a, b) => a.delta - b.delta)[0];
    return nearestBand ? point(nearestBand.node) : point(target);
  }

  createFollower(options = {}) {
    return {
      route: null,
      waypointIndex: 0,
      target: null,
      lastPlanAt: -Infinity,
      replans: 0,
      options: { ...options },
    };
  }

  follow(follower, current, target, {
    now = 0,
    replanMs = 900,
    targetTolerance = 7,
    waypointRadius = 3,
    finalApproachDistance = 10,
    ...routeOptions
  } = {}) {
    if (!follower) throw new Error('StarterTownNavigation.follow requires follower state');
    const targetMoved = !sameTarget(follower.target, target, targetTolerance);
    const routeExhausted = follower.route
      && follower.waypointIndex >= Math.max(0, follower.route.points.length - 1)
      && roadDistance(current, target) > finalApproachDistance;
    const needsRoute = !follower.route
      || ((targetMoved || routeExhausted) && now - follower.lastPlanAt >= replanMs);
    if (needsRoute) {
      follower.route = this.routePoints(current, target, { ...follower.options, ...routeOptions });
      follower.waypointIndex = follower.route?.points?.length > 1 ? 1 : 0;
      follower.target = point(target);
      follower.lastPlanAt = now;
      follower.replans += 1;
    }

    const points = follower.route?.points || [];
    while (follower.waypointIndex < points.length - 1
      && roadDistance(current, points[follower.waypointIndex]) <= waypointRadius) {
      follower.waypointIndex += 1;
    }
    const direct = roadDistance(current, target) <= finalApproachDistance;
    const waypoint = direct ? point(target) : (points[follower.waypointIndex] || point(target));
    return Object.freeze({
      waypoint,
      direct,
      routed: !!follower.route,
      waypointIndex: follower.waypointIndex,
      remainingWaypoints: Math.max(0, points.length - follower.waypointIndex - 1),
    });
  }

  snapshot() {
    return Object.freeze({
      townId: this.plan.id,
      locations: this.locations.size,
      targets: this.targets.size,
      roads: this.roadNetwork.snapshot(),
      graph: this.roadGraph.snapshot(),
    });
  }
}

export function createStarterTownNavigation(options = {}) {
  return new StarterTownNavigation(options);
}

export const starterTownNavigation = new StarterTownNavigation();
export default starterTownNavigation;
