// ─────────────────────────────────────────────────────────────────────────────
// RoadGraph.js — authoritative routing graph shared by traffic, police, missions,
// deliveries, map directions, and service vehicles.
// ─────────────────────────────────────────────────────────────────────────────

function pointKey(point, precision = 1) {
  return `${Math.round((Number(point?.x) || 0) / precision)}:${Math.round((Number(point?.z) || 0) / precision)}`;
}

function distance(a, b) {
  return Math.hypot((Number(a.x) || 0) - (Number(b.x) || 0), (Number(a.z) || 0) - (Number(b.z) || 0));
}

function reconstruct(cameFrom, current) {
  const path = [current];
  while (cameFrom.has(current)) {
    current = cameFrom.get(current);
    path.push(current);
  }
  path.reverse();
  return path;
}

export class RoadGraph {
  constructor(roadNetwork, { precision = 1 } = {}) {
    this.roadNetwork = roadNetwork;
    this.precision = precision;
    this.nodes = new Map();
    this.edges = new Map();
    this.routeSegments = new Map();
    this.closures = new Set();
    this.build();
  }

  ensureNode(position) {
    const id = pointKey(position, this.precision);
    if (!this.nodes.has(id)) this.nodes.set(id, { id, x: Number(position.x) || 0, z: Number(position.z) || 0, routes: new Set() });
    if (!this.edges.has(id)) this.edges.set(id, []);
    return this.nodes.get(id);
  }

  addEdge(from, to, segment, route, reverse = false) {
    const speed = Number(route.speed) || Number(this.roadNetwork.tiers?.[route.tier]?.speed) || 9;
    const length = distance(from, to);
    const edge = Object.freeze({
      id: `${segment.id}:${reverse ? 'r' : 'f'}`,
      segmentId: segment.id,
      routeId: route.id,
      tier: route.tier,
      from: from.id,
      to: to.id,
      length,
      speed,
      travelCost: length / Math.max(0.1, speed),
      schoolZone: !!route.schoolZone,
      serviceOnly: !!route.serviceOnly,
      pedestrianPriority: !!route.pedestrianPriority,
      restrictions: Object.freeze([...(route.restrictions || [])]),
    });
    this.edges.get(from.id).push(edge);
    const routeEdges = this.routeSegments.get(route.id) || [];
    routeEdges.push(edge.id);
    this.routeSegments.set(route.id, routeEdges);
  }

  build() {
    for (const segment of this.roadNetwork.segments || []) {
      const route = this.roadNetwork.routes.get(segment.routeId);
      if (!route) continue;
      const start = this.ensureNode(segment.start);
      const end = this.ensureNode(segment.end);
      start.routes.add(route.id);
      end.routes.add(route.id);
      this.addEdge(start, end, segment, route, false);
      if (!route.oneWay) this.addEdge(end, start, segment, route, true);
    }
  }

  nearestNode(position, { routeId = null } = {}) {
    let best = null;
    for (const node of this.nodes.values()) {
      if (routeId && !node.routes.has(routeId)) continue;
      const d = distance(node, position);
      if (!best || d < best.distance) best = { node, distance: d };
    }
    return best;
  }

  setClosure(id, closed = true) {
    if (closed) this.closures.add(id);
    else this.closures.delete(id);
  }

  isEdgeOpen(edge, options = {}) {
    if (this.closures.has(edge.id) || this.closures.has(edge.segmentId) || this.closures.has(edge.routeId)) return false;
    if (edge.serviceOnly && !options.allowService) return false;
    if (edge.restrictions.length && options.forbidden?.some((restriction) => edge.restrictions.includes(restriction))) return false;
    return true;
  }

  route(startPosition, endPosition, options = {}) {
    const start = this.nearestNode(startPosition, options)?.node;
    const goal = this.nearestNode(endPosition, options)?.node;
    if (!start || !goal) return null;
    if (start.id === goal.id) return { nodes: [start], edges: [], distance: 0, travelCost: 0 };

    const frontier = new Map([[start.id, 0]]);
    const cameFrom = new Map();
    const cameByEdge = new Map();
    const costSoFar = new Map([[start.id, 0]]);

    while (frontier.size) {
      let currentId = null;
      let currentPriority = Infinity;
      for (const [id, priority] of frontier) {
        if (priority < currentPriority) { currentId = id; currentPriority = priority; }
      }
      frontier.delete(currentId);
      if (currentId === goal.id) break;

      for (const edge of this.edges.get(currentId) || []) {
        if (!this.isEdgeOpen(edge, options)) continue;
        const multiplier = edge.schoolZone && options.avoidSchoolZones ? 1.8 : 1;
        const edgeCost = (options.weight === 'distance' ? edge.length : edge.travelCost) * multiplier;
        const nextCost = (costSoFar.get(currentId) || 0) + edgeCost;
        if (nextCost >= (costSoFar.get(edge.to) ?? Infinity)) continue;
        costSoFar.set(edge.to, nextCost);
        cameFrom.set(edge.to, currentId);
        cameByEdge.set(edge.to, edge);
        const heuristic = distance(this.nodes.get(edge.to), goal) / 30;
        frontier.set(edge.to, nextCost + heuristic);
      }
    }

    if (!cameFrom.has(goal.id)) return null;
    const nodeIds = reconstruct(cameFrom, goal.id);
    const routeEdges = nodeIds.slice(1).map((id) => cameByEdge.get(id));
    return Object.freeze({
      nodes: nodeIds.map((id) => this.nodes.get(id)),
      edges: routeEdges,
      distance: routeEdges.reduce((sum, edge) => sum + edge.length, 0),
      travelCost: routeEdges.reduce((sum, edge) => sum + edge.travelCost, 0),
      routeIds: [...new Set(routeEdges.map((edge) => edge.routeId))],
    });
  }

  components() {
    const remaining = new Set(this.nodes.keys());
    const components = [];
    while (remaining.size) {
      const start = remaining.values().next().value;
      const queue = [start];
      const component = [];
      remaining.delete(start);
      while (queue.length) {
        const id = queue.shift();
        component.push(id);
        const neighbors = new Set([
          ...(this.edges.get(id) || []).map((edge) => edge.to),
          ...[...this.edges.values()].flat().filter((edge) => edge.to === id).map((edge) => edge.from),
        ]);
        for (const next of neighbors) if (remaining.delete(next)) queue.push(next);
      }
      components.push(component);
    }
    return components.sort((a, b) => b.length - a.length);
  }

  snapshot() {
    const edgeCount = [...this.edges.values()].reduce((sum, list) => sum + list.length, 0);
    const components = this.components();
    return Object.freeze({
      nodes: this.nodes.size,
      edges: edgeCount,
      routes: this.routeSegments.size,
      closures: this.closures.size,
      components: components.length,
      largestComponent: components[0]?.length || 0,
    });
  }
}

export { pointKey as roadNodeKey, distance as roadDistance };
export default RoadGraph;
