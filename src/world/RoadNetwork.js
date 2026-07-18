// ─────────────────────────────────────────────────────────────────────────────
// RoadNetwork.js — data-driven polyline roads, queries, and instanced geometry.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { ROAD_TIERS } from '../config/worldMapPlan.js';

function point(value) { return new THREE.Vector3(Number(value?.x) || 0, Number(value?.y) || 0, Number(value?.z) || 0); }

function closestOnSegment(target, start, end, output = new THREE.Vector3()) {
  const segment = new THREE.Vector3().subVectors(end, start);
  const lengthSq = segment.lengthSq();
  if (lengthSq < 0.000001) return output.copy(start);
  const t = THREE.MathUtils.clamp(new THREE.Vector3().subVectors(target, start).dot(segment) / lengthSq, 0, 1);
  return output.copy(start).addScaledVector(segment, t);
}

export class RoadNetwork {
  constructor(routes = [], tiers = ROAD_TIERS) {
    this.tiers = tiers;
    this.routes = new Map();
    this.segments = [];
    this.errors = [];
    this.warnings = [];
    for (const route of routes) this.add(route);
    this.validate();
  }

  add(route) {
    if (!route?.id) throw new Error('Road route needs an id');
    if (this.routes.has(route.id)) throw new Error(`Duplicate road route: ${route.id}`);
    const record = Object.freeze({ ...route, points: Object.freeze((route.points || []).map((value) => Object.freeze({ ...value }))) });
    this.routes.set(record.id, record);
    for (let index = 0; index < record.points.length - 1; index++) {
      const start = point(record.points[index]);
      const end = point(record.points[index + 1]);
      const length = start.distanceTo(end);
      this.segments.push(Object.freeze({
        id: `${record.id}:${index}`,
        routeId: record.id,
        tier: record.tier,
        index,
        start,
        end,
        length,
        width: Number(record.width) || Number(this.tiers[record.tier]?.width) || 9,
      }));
    }
    return record;
  }

  validate() {
    for (const route of this.routes.values()) {
      if (!this.tiers[route.tier]) this.errors.push(`route ${route.id} uses unknown tier ${route.tier}`);
      if (!Array.isArray(route.points) || route.points.length < 2) this.errors.push(`route ${route.id} needs at least two points`);
    }
    for (const segment of this.segments) {
      if (segment.length < 0.25) this.errors.push(`road segment ${segment.id} is too short`);
      if (segment.length > 1200) this.warnings.push(`road segment ${segment.id} is very long and should be subdivided`);
    }
    if (this.errors.length) throw new Error(`RoadNetwork validation failed:\n- ${this.errors.join('\n- ')}`);
    return true;
  }

  nearest(position, options = {}) {
    const target = point(position);
    const candidate = new THREE.Vector3();
    let best = null;
    for (const segment of this.segments) {
      if (options.tier && segment.tier !== options.tier) continue;
      if (options.routeId && segment.routeId !== options.routeId) continue;
      closestOnSegment(target, segment.start, segment.end, candidate);
      const distance = candidate.distanceTo(target);
      if (!best || distance < best.distance) {
        best = { segment, point: candidate.clone(), distance };
      }
    }
    return best;
  }

  isOnRoad(position, margin = 0.5) {
    const nearest = this.nearest(position);
    return !!nearest && nearest.distance <= nearest.segment.width / 2 + margin;
  }

  intersections(tolerance = 1.5) {
    const nodes = new Map();
    for (const segment of this.segments) {
      for (const endpoint of [segment.start, segment.end]) {
        const key = `${Math.round(endpoint.x / tolerance)}:${Math.round(endpoint.z / tolerance)}`;
        const node = nodes.get(key) || { position: endpoint.clone(), segments: [] };
        node.segments.push(segment.id);
        nodes.set(key, node);
      }
    }
    return [...nodes.values()].filter((node) => node.segments.length > 1);
  }

  buildGeometry(options = {}) {
    const group = new THREE.Group();
    group.name = options.name || 'ZW_RoadNetwork';
    const byTier = new Map();
    for (const segment of this.segments) {
      const list = byTier.get(segment.tier) || [];
      list.push(segment);
      byTier.set(segment.tier, list);
    }
    const palette = {
      expressway: '#24272d', highway: '#292c31', parkway: '#30343a', main: '#35383d',
      local: '#3b3d42', service: '#45464a', alley: '#484747', dirt: '#785d3e', special: '#35394a',
    };
    const baseGeometry = new THREE.BoxGeometry(1, 0.04, 1);
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const center = new THREE.Vector3();
    for (const [tier, segments] of byTier) {
      const material = new THREE.MeshStandardMaterial({
        color: options.colors?.[tier] || palette[tier] || '#36383d',
        roughness: 0.94,
        metalness: 0,
      });
      const mesh = new THREE.InstancedMesh(baseGeometry, material, segments.length);
      mesh.name = `ZW_RoadTier_${tier}`;
      mesh.receiveShadow = true;
      mesh.castShadow = false;
      segments.forEach((segment, index) => {
        center.copy(segment.start).add(segment.end).multiplyScalar(0.5);
        center.y += options.yOffset ?? 0.018;
        quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(
          segment.end.x - segment.start.x,
          segment.end.z - segment.start.z,
        ));
        scale.set(segment.width, 1, Math.max(0.1, segment.length));
        matrix.compose(center, quaternion, scale);
        mesh.setMatrixAt(index, matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      group.add(mesh);
    }
    group.userData.roadNetwork = this;
    group.userData.routes = this.routes.size;
    group.userData.segments = this.segments.length;
    return group;
  }

  snapshot() {
    const tiers = {};
    for (const route of this.routes.values()) tiers[route.tier] = (tiers[route.tier] || 0) + 1;
    return Object.freeze({
      routes: this.routes.size,
      segments: this.segments.length,
      intersections: this.intersections().length,
      tiers,
      warnings: [...this.warnings],
      errors: [...this.errors],
    });
  }
}

export default RoadNetwork;
