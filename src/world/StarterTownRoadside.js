// ─────────────────────────────────────────────────────────────────────────────
// StarterTownRoadside.js — generated road markings, sidewalks, safety hardware,
// and district infrastructure derived from the authoritative road network.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { STARTER_TOWN_RUNTIME_PLAN } from '../config/starterTownRuntimePlan.js';
import { ROAD_TIERS } from '../config/worldMapPlan.js';
import { worldRegistry } from '../runtime/WorldRegistry.js';
import { RoadNetwork } from './RoadNetwork.js';
import { RoadGraph } from './RoadGraph.js';
import { starterTownHeightAt } from './StarterTownTerrain.js';

const TIER_RULES = Object.freeze({
  expressway: Object.freeze({ lightSpacing: 78, guardrail: true, sidewalks: false, markings: 'highway' }),
  highway: Object.freeze({ lightSpacing: 82, guardrail: true, sidewalks: false, markings: 'highway' }),
  parkway: Object.freeze({ lightSpacing: 56, guardrail: true, sidewalks: true, markings: 'arterial' }),
  main: Object.freeze({ lightSpacing: 44, guardrail: false, sidewalks: true, markings: 'arterial' }),
  local: Object.freeze({ lightSpacing: 58, guardrail: false, sidewalks: true, markings: 'local' }),
  service: Object.freeze({ lightSpacing: 72, guardrail: false, sidewalks: false, markings: 'service' }),
  alley: Object.freeze({ lightSpacing: 0, guardrail: false, sidewalks: false, markings: 'none' }),
  dirt: Object.freeze({ lightSpacing: 0, guardrail: false, sidewalks: false, markings: 'none' }),
});

const COLORS = Object.freeze({
  sidewalk: '#aaa9a5',
  curb: '#8c8c89',
  center: '#d8c453',
  lane: '#eeeeeb',
  crosswalk: '#f5f4ef',
  guardrail: '#9aa0a5',
  pole: '#474b51',
  lamp: '#f7df9b',
  sign: '#446b58',
  drain: '#4d5358',
  bench: '#76563e',
  bin: '#434a48',
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const quantize = (value, size = 0.5) => Math.round(value / size) * size;

function segmentFrame(segment) {
  const dx = segment.end.x - segment.start.x;
  const dz = segment.end.z - segment.start.z;
  const length = Math.max(0.001, Math.hypot(dx, dz));
  const direction = { x: dx / length, z: dz / length };
  const normal = { x: -direction.z, z: direction.x };
  return { length, direction, normal, yaw: Math.atan2(direction.x, direction.z) };
}

function sampleSegment(segment, distance, lateral = 0) {
  const frame = segmentFrame(segment);
  const t = clamp(distance / frame.length, 0, 1);
  const x = segment.start.x + (segment.end.x - segment.start.x) * t + frame.normal.x * lateral;
  const z = segment.start.z + (segment.end.z - segment.start.z) * t + frame.normal.z * lateral;
  return { x, y: starterTownHeightAt(x, z), z, yaw: frame.yaw, t, frame };
}

function placementKey(placement) {
  return `${placement.type}:${quantize(placement.x)}:${quantize(placement.z)}:${quantize(placement.rotationY || 0, 0.05)}`;
}

function addUnique(target, seen, placement) {
  const key = placementKey(placement);
  if (seen.has(key)) return false;
  seen.add(key);
  target.push(Object.freeze(placement));
  return true;
}

function routeLabelPlacement(route, segment) {
  const frame = segmentFrame(segment);
  const side = segment.width / 2 + 4.8;
  return {
    id: `route-sign:${route.id}`,
    type: 'route-sign',
    routeId: route.id,
    districtId: worldRegistry.districtAt(segment.start)?.id || null,
    x: segment.start.x + frame.direction.x * 18 + frame.normal.x * side,
    y: starterTownHeightAt(segment.start.x, segment.start.z),
    z: segment.start.z + frame.direction.z * 18 + frame.normal.z * side,
    rotationY: frame.yaw,
    label: route.name,
  };
}

function infrastructureForSegment(route, segment, placements, seen) {
  const rules = TIER_RULES[route.tier] || TIER_RULES.local;
  const frame = segmentFrame(segment);
  const roadHalf = segment.width / 2;
  const sidewalkOffset = roadHalf + 2.1;
  const lightOffset = roadHalf + (rules.sidewalks ? 4.3 : 2.8);

  if (rules.sidewalks) {
    for (const side of [-1, 1]) {
      addUnique(placements, seen, {
        id: `sidewalk:${segment.id}:${side}`,
        type: 'sidewalk', routeId: route.id, segmentId: segment.id,
        x: (segment.start.x + segment.end.x) / 2 + frame.normal.x * sidewalkOffset * side,
        y: starterTownHeightAt((segment.start.x + segment.end.x) / 2, (segment.start.z + segment.end.z) / 2) + 0.035,
        z: (segment.start.z + segment.end.z) / 2 + frame.normal.z * sidewalkOffset * side,
        rotationY: frame.yaw, length: frame.length, width: 2.8,
      });
      addUnique(placements, seen, {
        id: `curb:${segment.id}:${side}`,
        type: 'curb', routeId: route.id, segmentId: segment.id,
        x: (segment.start.x + segment.end.x) / 2 + frame.normal.x * (roadHalf + 0.35) * side,
        y: starterTownHeightAt((segment.start.x + segment.end.x) / 2, (segment.start.z + segment.end.z) / 2) + 0.09,
        z: (segment.start.z + segment.end.z) / 2 + frame.normal.z * (roadHalf + 0.35) * side,
        rotationY: frame.yaw, length: frame.length, width: 0.32,
      });
    }
  }

  if (rules.markings !== 'none') {
    const dashLength = rules.markings === 'highway' ? 6 : 3.6;
    const gap = rules.markings === 'highway' ? 10 : 8;
    for (let distance = gap / 2; distance < frame.length - 1; distance += gap) {
      const center = sampleSegment(segment, distance, 0);
      addUnique(placements, seen, {
        id: `dash:${segment.id}:${distance.toFixed(1)}`,
        type: 'center-dash', routeId: route.id, segmentId: segment.id,
        x: center.x, y: center.y + 0.065, z: center.z, rotationY: frame.yaw,
        length: Math.min(dashLength, frame.length - distance), width: 0.18,
      });
    }
    if (rules.markings === 'highway' || rules.markings === 'arterial') {
      for (const side of [-1, 1]) {
        addUnique(placements, seen, {
          id: `edge-line:${segment.id}:${side}`,
          type: 'edge-line', routeId: route.id, segmentId: segment.id,
          x: (segment.start.x + segment.end.x) / 2 + frame.normal.x * (roadHalf - 0.5) * side,
          y: starterTownHeightAt((segment.start.x + segment.end.x) / 2, (segment.start.z + segment.end.z) / 2) + 0.063,
          z: (segment.start.z + segment.end.z) / 2 + frame.normal.z * (roadHalf - 0.5) * side,
          rotationY: frame.yaw, length: frame.length, width: 0.14,
        });
      }
    }
  }

  if (rules.lightSpacing > 0) {
    let index = 0;
    for (let distance = rules.lightSpacing / 2; distance < frame.length; distance += rules.lightSpacing) {
      const sides = route.tier === 'local' ? [index % 2 ? -1 : 1] : [-1, 1];
      for (const side of sides) {
        const position = sampleSegment(segment, distance, lightOffset * side);
        addUnique(placements, seen, {
          id: `streetlight:${segment.id}:${index}:${side}`,
          type: 'streetlight', routeId: route.id, segmentId: segment.id,
          districtId: worldRegistry.districtAt(position)?.id || null,
          x: position.x, y: position.y, z: position.z, rotationY: frame.yaw + (side < 0 ? Math.PI : 0),
        });
      }
      index += 1;
    }
  }

  if (rules.guardrail) {
    const spacing = 10;
    for (const side of [-1, 1]) {
      for (let distance = spacing / 2; distance < frame.length; distance += spacing) {
        const position = sampleSegment(segment, distance, (roadHalf + 1.3) * side);
        addUnique(placements, seen, {
          id: `guardrail:${segment.id}:${side}:${distance.toFixed(1)}`,
          type: 'guardrail', routeId: route.id, segmentId: segment.id,
          x: position.x, y: position.y + 0.35, z: position.z, rotationY: frame.yaw,
          length: Math.min(spacing + 0.25, frame.length - distance + spacing / 2), width: 0.16,
        });
      }
    }
  }

  if (rules.sidewalks) {
    for (let distance = 24; distance < frame.length; distance += 46) {
      for (const side of [-1, 1]) {
        const position = sampleSegment(segment, distance, (roadHalf + 0.7) * side);
        addUnique(placements, seen, {
          id: `drain:${segment.id}:${side}:${distance.toFixed(1)}`,
          type: 'drain', routeId: route.id, segmentId: segment.id,
          x: position.x, y: position.y + 0.055, z: position.z, rotationY: frame.yaw,
        });
      }
    }
  }
}

function intersectionInfrastructure(graph, placements, seen) {
  for (const node of graph.nodes.values()) {
    if (node.routes.size < 2) continue;
    const routes = [...node.routes];
    const districtId = worldRegistry.districtAt(node)?.id || null;
    const school = routes.includes('school-loop') || routes.includes('scholar-road');
    const stripeCount = school ? 9 : 7;
    for (let index = 0; index < stripeCount; index++) {
      addUnique(placements, seen, {
        id: `crosswalk:${node.id}:${index}`,
        type: 'crosswalk-stripe',
        intersectionId: node.id,
        districtId,
        x: node.x + (index - (stripeCount - 1) / 2) * 0.9,
        y: starterTownHeightAt(node.x, node.z) + (school ? 0.13 : 0.07),
        z: node.z,
        rotationY: 0,
        length: school ? 7.5 : 6.5,
        width: 0.5,
        raised: school,
      });
    }
    addUnique(placements, seen, {
      id: `intersection-sign:${node.id}`,
      type: school ? 'school-sign' : 'intersection-sign',
      intersectionId: node.id,
      districtId,
      x: node.x + 7.5,
      y: starterTownHeightAt(node.x + 7.5, node.z + 7.5),
      z: node.z + 7.5,
      rotationY: Math.PI,
    });
  }
}

function districtFurniture(placements, seen) {
  const samples = [
    { id: 'parkside-bench-a', type: 'bench', x: 360, z: 530, rotationY: 0 },
    { id: 'parkside-bench-b', type: 'bench', x: 470, z: 650, rotationY: Math.PI / 2 },
    { id: 'dreamdrop-bin-a', type: 'bin', x: -95, z: -82 },
    { id: 'market-bin-a', type: 'bin', x: 35, z: 330 },
    { id: 'westside-bin-a', type: 'bin', x: -515, z: 395 },
    { id: 'school-bike-rack', type: 'bike-rack', x: -650, z: 35, rotationY: Math.PI / 2 },
    { id: 'civic-wayfinding', type: 'wayfinding', x: 430, z: -180, rotationY: Math.PI / 2 },
  ];
  for (const sample of samples) {
    addUnique(placements, seen, {
      ...sample,
      districtId: worldRegistry.districtAt(sample)?.id || null,
      y: starterTownHeightAt(sample.x, sample.z),
    });
  }
}

export function createStarterTownRoadsidePlan({
  roadNetwork = new RoadNetwork(STARTER_TOWN_RUNTIME_PLAN.routes),
  roadGraph = new RoadGraph(roadNetwork),
} = {}) {
  const placements = [];
  const seen = new Set();
  for (const route of roadNetwork.routes.values()) {
    const segments = roadNetwork.segments.filter((segment) => segment.routeId === route.id);
    if (segments[0]) addUnique(placements, seen, routeLabelPlacement(route, segments[0]));
    for (const segment of segments) infrastructureForSegment(route, segment, placements, seen);
  }
  intersectionInfrastructure(roadGraph, placements, seen);
  districtFurniture(placements, seen);
  const byType = {};
  for (const placement of placements) byType[placement.type] = (byType[placement.type] || 0) + 1;
  return Object.freeze({
    placements: Object.freeze(placements),
    byType: Object.freeze(byType),
    routes: roadNetwork.routes.size,
    segments: roadNetwork.segments.length,
    intersections: [...roadGraph.nodes.values()].filter((node) => node.routes.size > 1).length,
  });
}

function material(type) {
  const color = type.includes('line') || type.includes('dash') ? COLORS.lane
    : type.includes('crosswalk') ? COLORS.crosswalk
      : COLORS[type] || COLORS.sign;
  return new THREE.MeshStandardMaterial({
    color,
    roughness: type === 'lamp' ? 0.35 : 0.85,
    metalness: ['guardrail', 'streetlight', 'drain', 'bike-rack'].some((value) => type.includes(value)) ? 0.55 : 0.05,
    emissive: type === 'lamp' ? new THREE.Color(COLORS.lamp) : new THREE.Color('#000000'),
    emissiveIntensity: type === 'lamp' ? 1.2 : 0,
  });
}

function geometryFor(type) {
  if (type === 'sidewalk') return new THREE.BoxGeometry(1, 0.12, 1);
  if (type === 'curb') return new THREE.BoxGeometry(1, 0.2, 1);
  if (type === 'center-dash' || type === 'edge-line' || type === 'crosswalk-stripe') return new THREE.BoxGeometry(1, 0.025, 1);
  if (type === 'guardrail') return new THREE.BoxGeometry(1, 0.42, 1);
  if (type === 'drain') return new THREE.BoxGeometry(0.5, 0.025, 0.8);
  if (type === 'streetlight-pole') return new THREE.CylinderGeometry(0.1, 0.14, 6.5, 8);
  if (type === 'streetlight-lamp') return new THREE.BoxGeometry(0.28, 0.22, 1.1);
  if (type === 'bench') return new THREE.BoxGeometry(1.8, 0.55, 0.55);
  if (type === 'bin') return new THREE.CylinderGeometry(0.32, 0.36, 0.9, 10);
  if (type === 'bike-rack') return new THREE.BoxGeometry(2.5, 0.75, 0.18);
  return new THREE.BoxGeometry(0.18, 2.2, 0.65);
}

function instanceTransform(placement, type, matrix) {
  const position = new THREE.Vector3(placement.x, placement.y || 0, placement.z);
  const quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), placement.rotationY || 0);
  const scale = new THREE.Vector3(1, 1, 1);
  if (type === 'sidewalk' || type === 'curb' || type === 'guardrail' || type === 'center-dash' || type === 'edge-line' || type === 'crosswalk-stripe') {
    scale.set(placement.width || 1, 1, placement.length || 1);
  }
  if (type === 'streetlight-pole') position.y += 3.25;
  if (type === 'streetlight-lamp') position.y += 6.45;
  if (type === 'streetlight-lamp') position.z += Math.cos(placement.rotationY || 0) * 0.42;
  matrix.compose(position, quaternion, scale);
}

export function buildStarterTownRoadsideLayer({
  plan = createStarterTownRoadsidePlan(),
  heightAt = null,
} = {}) {
  const group = new THREE.Group();
  group.name = 'ZW_GeneratedRoadsideInfrastructure';
  const placements = typeof heightAt === 'function'
    ? plan.placements.map((placement) => {
      const authoredGround = starterTownHeightAt(placement.x, placement.z);
      const authoredOffset = (Number(placement.y) || 0) - authoredGround;
      return {
        ...placement,
        y: (Number(heightAt(placement.x, placement.z)) || 0) + authoredOffset,
      };
    })
    : plan.placements;
  const expanded = [];
  for (const placement of placements) {
    if (placement.type === 'streetlight') {
      expanded.push({ ...placement, type: 'streetlight-pole' });
      expanded.push({ ...placement, type: 'streetlight-lamp' });
    } else expanded.push(placement);
  }
  const byType = new Map();
  for (const placement of expanded) {
    const list = byType.get(placement.type) || [];
    list.push(placement);
    byType.set(placement.type, list);
  }
  const matrix = new THREE.Matrix4();
  for (const [type, placements] of byType) {
    const mesh = new THREE.InstancedMesh(geometryFor(type), material(type), placements.length);
    mesh.name = `ZW_Roadside_${type}`;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.frustumCulled = true;
    mesh.userData.infrastructureType = type;
    mesh.userData.instanceIds = placements.map((placement) => placement.id);
    placements.forEach((placement, index) => {
      instanceTransform(placement, type, matrix);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  }
  group.userData.plan = plan;
  group.userData.snapshot = () => Object.freeze({
    placements: plan.placements.length,
    renderedInstances: expanded.length,
    meshes: group.children.length,
    byType: { ...plan.byType },
  });
  return { group, plan };
}

export const STARTER_TOWN_ROADSIDE_PLAN = createStarterTownRoadsidePlan();

if (typeof window !== 'undefined') {
  window.__ZW_STARTER_ROADSIDE_PLAN__ = STARTER_TOWN_ROADSIDE_PLAN;
}

export default buildStarterTownRoadsideLayer;
