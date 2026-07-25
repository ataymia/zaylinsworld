// ─────────────────────────────────────────────────────────────────────────────
// StarterTownAccessLayer.js — explicit curb access for functional destinations.
//
// A location is not road-accessible merely because a road happens to be the
// nearest line on a map. This layer resolves each functional parcel's declared
// frontage route, then builds a paved curb cut and pedestrian approach between
// that road and the actual building face.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { STARTER_TOWN_RUNTIME_PLAN } from '../config/starterTownRuntimePlan.js';
import { PARCEL_BY_LOCATION_ID } from '../config/starterTownParcelPlan.js';
import { RoadNetwork } from './RoadNetwork.js';

const VEHICLE_ACCESS_CATEGORIES = new Set([
  'vehicle', 'service', 'school', 'law', 'job', 'fuel', 'property',
]);
const FRONT_EXTENT = Object.freeze({
  property: 7,
  school: 18,
  fuel: 15,
  activity: 18,
});

function point(value = {}) {
  return new THREE.Vector3(Number(value.x) || 0, Number(value.y) || 0, Number(value.z) || 0);
}

function spanMesh(startValue, endValue, width, material, heightAt, name) {
  const start = point(startValue);
  const end = point(endValue);
  start.y = (Number(heightAt(start.x, start.z)) || 0) + 0.095;
  end.y = (Number(heightAt(end.x, end.z)) || 0) + 0.095;
  const direction = end.clone().sub(start);
  const length = Math.max(0.2, direction.length());
  const center = start.clone().add(end).multiplyScalar(0.5);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, 0.07, length), material);
  mesh.name = name;
  mesh.position.copy(center);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.normalize());
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  return mesh;
}

function frontageAccess(location, roadNetwork) {
  const parcel = PARCEL_BY_LOCATION_ID[location.id];
  if (!parcel?.frontageRoute || location.enterable === false) return null;
  const nearest = roadNetwork.nearest(location.position, { routeId: parcel.frontageRoute });
  if (!nearest) return null;

  const faceX = Number(location.frontageFace?.[0]);
  const faceZ = Number(location.frontageFace?.[1]);
  const face = new THREE.Vector2(
    Number.isFinite(faceX) ? faceX : 0,
    Number.isFinite(faceZ) ? faceZ : 1,
  );
  if (face.lengthSq() < 0.0001) face.set(0, 1);
  face.normalize();
  const extent = FRONT_EXTENT[location.category] || 11;
  const door = new THREE.Vector2(location.position.x, location.position.z)
    .addScaledVector(face, extent + 0.9);
  const roadCenter = new THREE.Vector2(nearest.point.x, nearest.point.z);
  const towardBuilding = new THREE.Vector2(location.position.x, location.position.z).sub(roadCenter);
  if (towardBuilding.lengthSq() < 0.0001) towardBuilding.copy(face).multiplyScalar(-1);
  towardBuilding.normalize();
  const curb = roadCenter.addScaledVector(towardBuilding, nearest.segment.width / 2 + 0.9);
  const distance = door.distanceTo(curb);
  const faceAlignment = face.dot(curb.clone().sub(new THREE.Vector2(
    location.position.x,
    location.position.z,
  )).normalize());
  return Object.freeze({
    locationId: location.id,
    routeId: parcel.frontageRoute,
    category: location.category,
    vehicleAccess: VEHICLE_ACCESS_CATEGORIES.has(location.category) || Number(parcel.parking) > 0,
    door: Object.freeze({ x: door.x, z: door.y }),
    curb: Object.freeze({ x: curb.x, z: curb.y }),
    distance,
    faceAlignment,
  });
}

export function createStarterTownAccessPlan({
  locations = STARTER_TOWN_RUNTIME_PLAN.locations,
  roadNetwork = new RoadNetwork(STARTER_TOWN_RUNTIME_PLAN.routes),
} = {}) {
  return Object.freeze(locations.map((location) => frontageAccess(location, roadNetwork)).filter(Boolean));
}

export function buildStarterTownAccessLayer({
  locations = STARTER_TOWN_RUNTIME_PLAN.locations,
  roadNetwork = new RoadNetwork(STARTER_TOWN_RUNTIME_PLAN.routes),
  heightAt = () => 0,
} = {}) {
  const group = new THREE.Group();
  group.name = 'ZW_StarterTownLocationAccess';
  const asphalt = new THREE.MeshStandardMaterial({
    color: '#4b4d50', roughness: 0.96, metalness: 0,
  });
  const concrete = new THREE.MeshStandardMaterial({
    color: '#aaa9a4', roughness: 0.94, metalness: 0,
  });
  const plan = createStarterTownAccessPlan({ locations, roadNetwork });

  for (const access of plan) {
    const drivewayWidth = access.vehicleAccess ? 6.4 : 3.2;
    const driveway = spanMesh(
      access.door,
      access.curb,
      drivewayWidth,
      access.vehicleAccess ? asphalt : concrete,
      heightAt,
      `ZW_LocationAccess_${access.locationId}`,
    );
    driveway.userData.locationId = access.locationId;
    driveway.userData.routeId = access.routeId;
    driveway.userData.accessType = access.vehicleAccess ? 'driveway' : 'walkway';
    group.add(driveway);

    // A narrow contrasting walk strip keeps every entrance legible on foot,
    // including destinations whose wider paved approach also carries vehicles.
    if (access.vehicleAccess) {
      const walk = spanMesh(
        access.door,
        access.curb,
        1.45,
        concrete,
        heightAt,
        `ZW_LocationWalkway_${access.locationId}`,
      );
      walk.position.y += 0.045;
      walk.userData.locationId = access.locationId;
      walk.userData.routeId = access.routeId;
      walk.userData.accessType = 'walkway';
      group.add(walk);
    }
  }

  const report = Object.freeze({
    locations: plan.length,
    vehicleAccess: plan.filter((entry) => entry.vehicleAccess).length,
    maxUnpavedGap: plan.reduce((maximum, entry) => Math.max(maximum, entry.distance), 0),
    frontageMismatches: Object.freeze(
      plan.filter((entry) => entry.faceAlignment < 0.2).map((entry) => entry.locationId),
    ),
    entries: plan,
  });
  group.userData.snapshot = () => report;
  return { group, plan, report };
}

export default buildStarterTownAccessLayer;
