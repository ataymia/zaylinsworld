// ─────────────────────────────────────────────────────────────────────────────
// SpecialRoadForms.js — roundabouts, cul-de-sacs, ramps, merges, school tables,
// parking entrances, and service aprons derived from town/parcel contracts.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { STARTER_TOWN_RUNTIME_PLAN } from '../config/starterTownRuntimePlan.js';
import { STARTER_TOWN_PARCELS } from '../config/starterTownParcelPlan.js';
import { starterTownHeightAt } from './StarterTownTerrain.js';

const freeze = (value) => Object.freeze(value);
const point = (x, z, y = starterTownHeightAt(x, z)) => freeze({ x, y, z });

function routeById(id, plan) { return plan.routes.find((route) => route.id === id) || null; }
function routeEnd(route) { return route?.points?.at(-1) || null; }
function routeStart(route) { return route?.points?.[0] || null; }
function heading(a, b) { return Math.atan2((b?.x || 0) - (a?.x || 0), (b?.z || 0) - (a?.z || 0)); }

function roundabout(plan) {
  const route = routeById('parkside-crescent', plan);
  const center = route?.roundaboutAt || { x: 420, z: 568 };
  return freeze({
    id: 'parkside-roundabout',
    type: 'roundabout',
    center: point(center.x, center.z),
    outerRadius: 42,
    innerRadius: 20,
    laneWidth: 8.5,
    entries: freeze([
      freeze({ routeId: 'parkside-crescent', bearing: -2.55 }),
      freeze({ routeId: 'parkside-crescent', bearing: 0.66 }),
      freeze({ routeId: 'willowbend-main', bearing: Math.PI }),
      freeze({ routeId: 'market-service-road', bearing: -Math.PI / 2 }),
    ]),
    yieldControl: true,
  });
}

function culDeSacs(plan) {
  return freeze(plan.routes.filter((route) => route.culDeSac).map((route) => {
    const end = routeEnd(route);
    const previous = route.points.at(-2) || end;
    return freeze({
      id: `${route.id}-culdesac`,
      type: 'cul-de-sac',
      routeId: route.id,
      center: point(end.x, end.z),
      radius: 18,
      approachHeading: heading(previous, end),
      sidewalkRadius: 21,
    });
  }));
}

function gatewayForms(plan) {
  return freeze(plan.routes.filter((route) => route.gatewayId).flatMap((route) => {
    const end = routeEnd(route);
    const previous = route.points.at(-2) || end;
    const start = routeStart(route);
    const yaw = heading(previous, end);
    return [
      freeze({
        id: `${route.id}-acceleration-lane`,
        type: 'acceleration-lane',
        routeId: route.id,
        gatewayId: route.gatewayId,
        start: point(previous.x, previous.z),
        end: point(end.x, end.z),
        heading: yaw,
        taperLength: 75,
        width: 4.2,
      }),
      freeze({
        id: `${route.id}-merge`,
        type: 'merge',
        routeId: route.id,
        gatewayId: route.gatewayId,
        position: point(start.x, start.z),
        heading: heading(start, route.points[1] || end),
        warningDistance: 90,
      }),
    ];
  }));
}

function schoolForms(plan) {
  const schoolLoop = routeById('school-loop', plan);
  return freeze([
    freeze({
      id: 'zaylins-prep-raised-crossing-west',
      type: 'raised-crosswalk',
      routeId: schoolLoop?.id || 'school-loop',
      center: point(-720, 0, starterTownHeightAt(-720, 0) + 0.12),
      heading: 0,
      width: 9,
      depth: 7,
      speedLimit: 15,
    }),
    freeze({
      id: 'zaylins-prep-dropoff-table',
      type: 'raised-crosswalk',
      routeId: schoolLoop?.id || 'school-loop',
      center: point(-700, 150, starterTownHeightAt(-700, 150) + 0.12),
      heading: Math.PI / 2,
      width: 9,
      depth: 7,
      speedLimit: 15,
    }),
  ]);
}

function accessForms(parcels) {
  const forms = [];
  for (const parcel of parcels) {
    if (!parcel.frontageRoute) continue;
    const type = parcel.loadingBays || parcel.serviceAccess ? 'service-apron' : 'parking-entrance';
    forms.push(freeze({
      id: `${parcel.id}-${type}`,
      type,
      parcelId: parcel.id,
      locationId: parcel.locationId || null,
      frontageRoute: parcel.frontageRoute,
      serviceRoute: parcel.serviceAccess || null,
      center: point(parcel.bounds.x, parcel.bounds.z),
      width: type === 'service-apron' ? Math.min(22, parcel.bounds.w * 0.35) : Math.min(14, parcel.bounds.w * 0.28),
      depth: type === 'service-apron' ? 16 : 10,
      loadingBays: Number(parcel.loadingBays) || 0,
      parkingSpaces: Number(parcel.parking) || Number(parcel.stalls) || 0,
    }));
  }
  return freeze(forms);
}

export function createSpecialRoadForms({
  plan = STARTER_TOWN_RUNTIME_PLAN,
  parcels = STARTER_TOWN_PARCELS,
} = {}) {
  const forms = freeze([
    roundabout(plan),
    ...culDeSacs(plan),
    ...gatewayForms(plan),
    ...schoolForms(plan),
    ...accessForms(parcels),
  ]);
  const ids = new Set();
  const errors = [];
  const byType = {};
  for (const form of forms) {
    if (!form.id) errors.push('special road form missing id');
    else if (ids.has(form.id)) errors.push(`duplicate special road form ${form.id}`);
    ids.add(form.id);
    byType[form.type] = (byType[form.type] || 0) + 1;
  }
  return freeze({ forms, byType: freeze(byType), errors: freeze(errors), ok: errors.length === 0 });
}

function ringMesh(form) {
  const geometry = new THREE.RingGeometry(form.innerRadius, form.outerRadius, 48);
  const material = new THREE.MeshStandardMaterial({ color: '#34373c', roughness: 0.94, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(form.center.x, form.center.y + 0.075, form.center.z);
  mesh.receiveShadow = true;
  mesh.name = `ZW_SpecialRoad_${form.id}`;
  return mesh;
}

function diskMesh(form) {
  const radius = form.radius || Math.max(form.width || 8, form.depth || 8) / 2;
  const geometry = form.type === 'cul-de-sac'
    ? new THREE.CircleGeometry(radius, 32)
    : new THREE.BoxGeometry(form.width || 8, form.type === 'raised-crosswalk' ? 0.18 : 0.08, form.depth || 8);
  const color = form.type === 'raised-crosswalk' ? '#b8b3a5' : '#3a3d42';
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.93 });
  const mesh = new THREE.Mesh(geometry, material);
  if (form.type === 'cul-de-sac') mesh.rotation.x = -Math.PI / 2;
  else mesh.rotation.y = form.heading || 0;
  const center = form.center || form.position || form.start;
  mesh.position.set(center.x, center.y + (form.type === 'raised-crosswalk' ? 0 : 0.06), center.z);
  mesh.receiveShadow = true;
  mesh.name = `ZW_SpecialRoad_${form.id}`;
  return mesh;
}

export function buildSpecialRoadFormsLayer({ contract = createSpecialRoadForms() } = {}) {
  const group = new THREE.Group();
  group.name = 'ZW_SpecialRoadForms';
  const rendered = [];
  for (const form of contract.forms) {
    let mesh = null;
    if (form.type === 'roundabout') mesh = ringMesh(form);
    else if (['cul-de-sac', 'raised-crosswalk', 'parking-entrance', 'service-apron'].includes(form.type)) mesh = diskMesh(form);
    if (!mesh) continue;
    mesh.userData.specialRoadFormId = form.id;
    mesh.userData.specialRoadFormType = form.type;
    group.add(mesh);
    rendered.push(form.id);
  }
  group.userData.contract = contract;
  group.userData.snapshot = () => freeze({
    forms: contract.forms.length,
    rendered: rendered.length,
    renderedIds: freeze([...rendered]),
    byType: contract.byType,
    errors: contract.errors,
  });
  return { group, contract, rendered };
}

export const STARTER_TOWN_SPECIAL_ROAD_FORMS = createSpecialRoadForms();

if (typeof window !== 'undefined') {
  window.__ZW_SPECIAL_ROAD_FORMS__ = STARTER_TOWN_SPECIAL_ROAD_FORMS;
}

export default buildSpecialRoadFormsLayer;
