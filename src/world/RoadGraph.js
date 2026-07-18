// ─────────────────────────────────────────────────────────────────────────────
// RoadGraph.js — authoritative routing graph shared by traffic, police, missions,
// deliveries, map directions, and service vehicles.
//
// Visible road crossings become real graph nodes even when the authored control
// points do not explicitly include the crossing. Grade-separated roads remain
// disconnected when their interpolated elevations differ beyond tolerance.
// ─────────────────────────────────────────────────────────────────────────────

function pointKey(point, precision = 1) {
  return `${Math.round((Number(point?.x) || 0) / precision)}:${Math.round((Number(point?.z) || 0) / precision)}`;
}

function distance(a, b) {
  return Math.hypot((Number(a.x) || 0) - (Number(b.x) || 0), (Number(a.z) || 0) - (Number(b.z) || 0));
}

function cross2(ax, az, bx, bz) { return ax * bz - az * bx; }

function lerpPoint(start, end, t) {
  return {
    x: start.x + (end.x - start.x) * t,
    y: (start.y || 0) + ((end.y || 0) - (start.y || 0)) * t,
    z: start.z + (end.z - start.z) * t,
  };
}

function segmentIntersection(a, b, epsilon = 0.000001) {
  const rx = a.end.x - a.start.x;
  const rz = a.end.z - a.start.z;
  const sx = b.end.x - b.start.x;
  const sz = b.end.z - b.start.z;
  const denominator = cross2(rx, rz, sx, sz);
  if (Math.abs(denominator) < epsilon) return null;
  const qpx = b.start.x - a.start.x;
  const qpz = b.start.z - a.start.z;
  const t = cross2(qpx, qpz, sx, sz) / denominator;
  const u = cross2(qpx, qpz, rx, rz) / denominator;
  if (t < -epsilon || t > 1 + epsilon || u < -epsilon || u > 1 + epsilon) return null;
  const clampedT = Math.max(0, Math.min(1, t));
  const clampedU = Math.max(0, Math.min(1, u));
  return {
    t: clampedT,
    u: clampedU,
    pointA: lerpPoint(a.start, a.end, clampedT),
    pointB: lerpPoint(b.start, b.end, clampedU),
  };
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
  constructor(roadNetwork, { precision = 1, gradeTolerance = 2.5 } = {}) {
    this.roadNetwork = roadNetwork;
    this.precision = precision;
    this.gradeTolerance = gradeTolerance;
    this.nodes = new Map();
    this.edges = new Map();
    this.neighbors = new Map();
    this.routeSegments = new Map();
    this.closures = new Set();
    this.intersectionCount = 0;
    this.build();
  }

  ensureNode(position) {
    const id = pointKey(position, this.precision);
    if (!this.nodes.has(id)) {
      this.nodes.set(id, {
        id,
        x: Number(position.x) || 0,
        y: Number(position.y) || 0,
        z: Number(position.z) || 0,
        routes: new Set(),
      });
    }
    if (!this.edges.has(id)) this.edges.set(id, []);
    if (!this.neighbors.has(id)) this.neighbors.set(id, new Set());
    return this.nodes.get(id);
  }

  addEdge(from, to, segment, route, pieceId, reverse = false) {
    const speed = Number(route.speed) || Number(this.roadNetwork.tiers?.[route.tier]?.speed) || 9;
    const length = distance(from, to);
    if (length < 0.001) return null;
    const edge = Object.freeze({
      id: `${pieceId}:${reverse ? 'r' : 'f'}`,
      pieceId,
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
    this.neighbors.get(from.id).add(to.id);
    this.neighbors.get(to.id).add(from.id);
    const routeEdges = this.routeSegments.get(route.id) || [];
    routeEdges.push(edge.id);
    this.routeSegments.set(route.id, routeEdges);
    return edge;
  }

  segmentBreakpoints() {
    const segments = this.roadNetwork.segments || [];
    const breakpoints = new Map(segments.map((segment) => [segment.id, [
      { t: 0, point: { x: segment.start.x, y: segment.start.y || 0, z: segment.start.z } },
      { t: 1, point: { x: segment.end.x, y: segment.end.y || 0, z: segment.end.z } },
    ]]));

    for (let i = 0; i < segments.length; i++) {
      for (let j = i + 1; j < segments.length; j++) {
        const a = segments[i];
        const b = segments[j];
        const hit = segmentIntersection(a, b);
        if (!hit) continue;
        if (Math.abs(hit.pointA.y - hit.pointB.y) > this.gradeTolerance) continue;
        const point = {
          x: (hit.pointA.x + hit.pointB.x) * 0.5,
          y: (hit.pointA.y + hit.pointB.y) * 0.5,
          z: (hit.pointA.z + hit.pointB.z) * 0.5,
        };
        breakpoints.get(a.id).push({ t: hit.t, point });
        breakpoints.get(b.id).push({ t: hit.u, point });
        if (hit.t > 0.0001 && hit.t < 0.9999 && hit.u > 0.0001 && hit.u < 0.9999) this.intersectionCount += 1;
      }
    }
    return breakpoints;
  }

  build() {
    const breakpoints = this.segmentBreakpoints();
    for (const segment of this.roadNetwork.segments || []) {
      const route = this.roadNetwork.routes.get(segment.routeId);
      if (!route) continue;
      const ordered = (breakpoints.get(segment.id) || [])
        .sort((a, b) => a.t - b.t)
        .filter((entry, index, list) => index === 0 || Math.abs(entry.t - list[index - 1].t) > 0.00001);

      for (let index = 0; index < ordered.length - 1; index++) {
        const start = this.ensureNode(ordered[index].point);
        const end = this.ensureNode(ordered[index + 1].point);
        start.routes.add(route.id);
        end.routes.add(route.id);
        const pieceId = `${segment.id}@${index}`;
        this.addEdge(start, end, segment, route, pieceId, false);
        if (!route.oneWay) this.addEdge(end, start, segment, route, pieceId, true);
      }
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
    if (this.closures.has(edge.id) || this.closures.has(edge.pieceId)
      || this.closures.has(edge.segmentId) || this.closures.has(edge.routeId)) return false;
    if (edge.serviceOnly && !options.allowService) return false;
    if (edge.restrictions.length && options.forbidden?.some((restriction) => edge.restrictions.includes(restriction))) return false;
    return true;
  }

  route(startPosition, endPosition, options = {}) {
    const start = this.nearestNode(startPosition, options)?.node;
    const goal = this.nearestNode(endPosition, options)?.node;
    if (!start || !goal) return null;
    if (start.id === goal.id) return { nodes: [start], edges: [], distance: 0, travelCost: 0, routeIds: [] };

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
        for (const next of this.neighbors.get(id) || []) if (remaining.delete(next)) queue.push(next);
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
      geometricIntersections: this.intersectionCount,
      components: components.length,
      largestComponent: components[0]?.length || 0,
    });
  }
}

export { pointKey as roadNodeKey, distance as roadDistance, segmentIntersection };
export default RoadGraph;
