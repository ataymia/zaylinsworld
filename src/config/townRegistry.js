// ───────────────────────────────────────────────────────────────────────────
// townRegistry.js — formal boundary for multi-town expansion.
//
// Starter Town still exports its legacy map arrays through mapConfig.js so the
// live engine remains stable. This registry wraps those arrays in a reusable town
// contract. A second town can be added without copying global state conventions.
// ───────────────────────────────────────────────────────────────────────────
import {
  ROAD,
  ROAD_CLEAR,
  CROSSWALKS,
  LANDMARKS,
  FEATURES,
  POLICE_POST,
  DECOR,
  PARK,
  PARKING,
  STREET_LIGHTS,
  STREET_TREES,
  TRAFFIC_ROUTES,
  PEDESTRIAN_ROUTES,
  INTERSECTIONS,
  TRAFFIC_TIMING,
  LITTER,
  GEMS,
  SPAWN,
  MISSION_MARKERS,
} from './mapConfig.js';

export const STARTER_TOWN_ID = 'starter-town';

export const TOWN_SERVICE_TYPES = Object.freeze([
  'housing',
  'food',
  'retail',
  'education',
  'fitness',
  'employment',
  'automotive-sales',
  'automotive-repair',
  'fuel',
  'public-safety',
]);

export const STARTER_TOWN_SERVICES = Object.freeze({
  housing: Object.freeze(['home']),
  food: Object.freeze(['chicken']),
  retail: Object.freeze(['frostbox', 'kicks', 'blocksupply']),
  education: Object.freeze(['school']),
  fitness: Object.freeze(['gym']),
  employment: Object.freeze(['office']),
  'automotive-sales': Object.freeze(['dealership']),
  'automotive-repair': Object.freeze(['garage']),
  fuel: Object.freeze(['gas-station']),
  'public-safety': Object.freeze(['police']),
});

export const STARTER_TOWN = Object.freeze({
  id: STARTER_TOWN_ID,
  name: 'Starter Town',
  displayName: 'Starter Town',
  region: 'starter-region',
  status: 'playable',
  center: Object.freeze({ x: 0, z: 0 }),
  bounds: Object.freeze({
    minX: -62,
    maxX: 62,
    minZ: -62,
    maxZ: 62,
  }),
  spawn: SPAWN,
  streaming: Object.freeze({
    activeRadius: 90,
    warmRadius: 165,
    unloadRadius: 230,
    maxLiveSkinnedCivilians: 8,
    maxLivePolice: 6,
    maxTraffic: 10,
  }),
  services: STARTER_TOWN_SERVICES,
  map: Object.freeze({
    road: ROAD,
    roadClear: ROAD_CLEAR,
    crosswalks: CROSSWALKS,
    landmarks: LANDMARKS,
    features: FEATURES,
    policePost: POLICE_POST,
    decor: DECOR,
    park: PARK,
    parking: PARKING,
    streetLights: STREET_LIGHTS,
    streetTrees: STREET_TREES,
    trafficRoutes: TRAFFIC_ROUTES,
    pedestrianRoutes: PEDESTRIAN_ROUTES,
    intersections: INTERSECTIONS,
    trafficTiming: TRAFFIC_TIMING,
    litter: LITTER,
    gems: GEMS,
    missionMarkers: MISSION_MARKERS,
  }),
});

export const TOWN_REGISTRY = Object.freeze({
  [STARTER_TOWN_ID]: STARTER_TOWN,
});

export function townById(id = STARTER_TOWN_ID) {
  return TOWN_REGISTRY[id] || null;
}

export function townIds() {
  return Object.keys(TOWN_REGISTRY);
}

export function townHasRequiredServices(town) {
  if (!town?.services) return false;
  return TOWN_SERVICE_TYPES.every((type) => Array.isArray(town.services[type]) && town.services[type].length > 0);
}

export function landmarkById(town, landmarkId) {
  if (!town || !landmarkId) return null;
  if (town.map?.policePost?.id === landmarkId) return town.map.policePost;
  return town.map?.landmarks?.find((landmark) => landmark.id === landmarkId) || null;
}
