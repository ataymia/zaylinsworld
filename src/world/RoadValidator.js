// ─────────────────────────────────────────────────────────────────────────────
// RoadValidator.js — static checks for the authoritative road/location contract.
// ─────────────────────────────────────────────────────────────────────────────

function distance(a = {}, b = {}) {
  return Math.hypot((Number(a.x) || 0) - (Number(b.x) || 0), (Number(a.z) || 0) - (Number(b.z) || 0));
}

function boundsContains(bounds, point, margin = 0) {
  return point.x >= bounds.minX + margin && point.x <= bounds.maxX - margin
    && point.z >= bounds.minZ + margin && point.z <= bounds.maxZ - margin;
}

export class RoadValidator {
  constructor({ roadNetwork, roadGraph = null, plan = null } = {}) {
    this.roadNetwork = roadNetwork;
    this.roadGraph = roadGraph;
    this.plan = plan;
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  error(code, message, data = {}) { this.errors.push({ code, message, ...data }); }
  warn(code, message, data = {}) { this.warnings.push({ code, message, ...data }); }
  note(code, message, data = {}) { this.info.push({ code, message, ...data }); }

  validateConnectivity() {
    if (!this.roadGraph) return;
    const components = this.roadGraph.components();
    if (components.length > 1) {
      this.warn('disconnected-road-components', `Road graph has ${components.length} disconnected components.`, {
        componentSizes: components.map((component) => component.length),
      });
    }
  }

  validateRouteGeometry() {
    for (const route of this.roadNetwork?.routes?.values?.() || []) {
      if (route.closed) {
        const first = route.points[0];
        const last = route.points.at(-1);
        if (distance(first, last) > 1) this.error('open-closed-route', `Closed route ${route.id} does not return to its first point.`, { routeId: route.id });
      }
      for (let i = 1; i < route.points.length; i++) {
        const turnA = route.points[i - 1];
        const turnB = route.points[i];
        const segmentLength = distance(turnA, turnB);
        if (segmentLength < 1) this.error('degenerate-road-segment', `Route ${route.id} contains a segment shorter than one unit.`, { routeId: route.id, index: i - 1 });
      }
    }
  }

  validateLocations({ sidewalkDistance = 48, roadClearance = 7 } = {}) {
    for (const location of this.plan?.locations || []) {
      if (!boundsContains(this.plan.playableBounds, location.position, 0)) {
        this.error('location-outside-playable-bounds', `${location.name} is outside the playable boundary.`, { locationId: location.id });
      }
      const nearest = this.roadNetwork?.nearest?.(location.position);
      if (!nearest) {
        this.error('location-without-road', `${location.name} has no reachable road segment.`, { locationId: location.id });
        continue;
      }
      if (nearest.distance > sidewalkDistance) {
        this.warn('location-far-from-road', `${location.name} is ${nearest.distance.toFixed(1)} units from the nearest road.`, {
          locationId: location.id,
          routeId: nearest.segment.routeId,
          distance: nearest.distance,
        });
      }
      if (nearest.distance < nearest.segment.width / 2 + roadClearance) {
        this.warn('location-road-clearance', `${location.name} may overlap the road-clearance envelope.`, {
          locationId: location.id,
          routeId: nearest.segment.routeId,
          distance: nearest.distance,
        });
      }
    }
  }

  validateGateways() {
    const gatewayRoutes = [...(this.roadNetwork?.routes?.values?.() || [])].filter((route) => route.gatewayId);
    const ids = new Set();
    for (const route of gatewayRoutes) {
      if (ids.has(route.gatewayId)) this.error('duplicate-gateway-road', `Gateway ${route.gatewayId} is owned by multiple routes.`, { gatewayId: route.gatewayId });
      ids.add(route.gatewayId);
      const end = route.points.at(-1);
      if (this.plan && boundsContains(this.plan.playableBounds, end, 0)) {
        this.warn('gateway-does-not-leave-city', `Gateway route ${route.id} ends inside playable bounds.`, { routeId: route.id });
      }
    }
    for (const required of ['st-north-hwy', 'st-east-parkway']) {
      if (!ids.has(required)) this.error('missing-gateway-route', `Required gateway ${required} has no road route.`, { gatewayId: required });
    }
  }

  validateProps(props = [], { clearance = 0.75 } = {}) {
    for (const prop of props) {
      const nearest = this.roadNetwork?.nearest?.(prop.position || prop);
      if (!nearest) continue;
      const required = nearest.segment.width / 2 + (Number(prop.clearance) || clearance);
      if (nearest.distance < required && !prop.allowInRoad) {
        this.error('prop-in-lane', `Prop ${prop.id || prop.name || 'unknown'} intersects a driving lane.`, {
          propId: prop.id || null,
          routeId: nearest.segment.routeId,
          distance: nearest.distance,
          required,
        });
      }
    }
  }

  validateAccess(requiredLocationIds = []) {
    if (!this.roadGraph || !this.plan?.locations?.length) return;
    const byId = new Map(this.plan.locations.map((location) => [location.id, location]));
    const origin = byId.get('zaylins-home') || this.plan.locations[0];
    for (const id of requiredLocationIds) {
      const target = byId.get(id);
      if (!target) {
        this.error('missing-required-location', `Required location ${id} does not exist.`, { locationId: id });
        continue;
      }
      const route = this.roadGraph.route(origin.position, target.position, { allowService: true });
      if (!route) this.error('unreachable-location', `${target.name} is unreachable from ${origin.name}.`, { locationId: id });
      else this.note('location-route', `${origin.name} to ${target.name}: ${Math.round(route.distance)} units.`, { locationId: id, distance: route.distance });
    }
  }

  run({ props = [], requiredLocationIds = [] } = {}) {
    this.errors = [];
    this.warnings = [];
    this.info = [];
    this.validateRouteGeometry();
    this.validateConnectivity();
    this.validateLocations();
    this.validateGateways();
    this.validateProps(props);
    this.validateAccess(requiredLocationIds);
    return this.report();
  }

  report() {
    return Object.freeze({
      ok: this.errors.length === 0,
      errors: [...this.errors],
      warnings: [...this.warnings],
      info: [...this.info],
      summary: {
        errors: this.errors.length,
        warnings: this.warnings.length,
        checks: this.errors.length + this.warnings.length + this.info.length,
      },
    });
  }
}

export default RoadValidator;
