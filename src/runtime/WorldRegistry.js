// ─────────────────────────────────────────────────────────────────────────────
// WorldRegistry.js — validated runtime adapter for the approved world plans.
// ─────────────────────────────────────────────────────────────────────────────
import {
  DISTRICTS as WORLD_TOWNS,
  CONNECTIONS,
  ROAD_TIERS,
  STREAMING_PLAN,
  MAP_UI,
} from '../config/worldMapPlan.js';
import { STARTER_TOWN_RUNTIME_PLAN } from '../config/starterTownRuntimePlan.js';
import { STARTER_TOWN_DISTRICT_PROFILES } from '../config/starterTownDistrictProfiles.js';
import {
  STARTER_TOWN_PARCELS,
  STARTER_TOWN_NO_BUILD_BUFFERS,
} from '../config/starterTownParcelPlan.js';

const finite = (value) => Number.isFinite(Number(value));
const clonePoint = (value = {}) => ({ x: Number(value.x) || 0, y: Number(value.y) || 0, z: Number(value.z) || 0 });

function pointInPolygon(x, z, polygon = []) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const crosses = ((a.z > z) !== (b.z > z))
      && (x < ((b.x - a.x) * (z - a.z)) / ((b.z - a.z) || Number.EPSILON) + a.x);
    if (crosses) inside = !inside;
  }
  return inside;
}

function readBoolean(value, fallback = false) {
  if (value == null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return !['0', 'false', 'off', 'no'].includes(String(value).toLowerCase());
}

function featureValue(contract) {
  const fallback = !!contract.defaultValue;
  if (typeof window === 'undefined') return fallback;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has(contract.queryParam)) return readBoolean(params.get(contract.queryParam), fallback);
    const stored = localStorage.getItem(contract.storageKey);
    if (stored != null) return readBoolean(stored, fallback);
  } catch { /* private browsing / test environment */ }
  return fallback;
}

function rectangleForTown(town) {
  const origin = town.origin || { x: 0, z: 0 };
  const bounds = town.bounds || { w: 0, h: 0 };
  return {
    minX: origin.x - bounds.w / 2,
    maxX: origin.x + bounds.w / 2,
    minZ: origin.z - bounds.h / 2,
    maxZ: origin.z + bounds.h / 2,
  };
}

function inBounds(point, bounds) {
  return point.x >= bounds.minX && point.x <= bounds.maxX
    && point.z >= bounds.minZ && point.z <= bounds.maxZ;
}

function parcelPoint(parcel) {
  return { x: Number(parcel?.bounds?.x) || 0, z: Number(parcel?.bounds?.z) || 0 };
}

export class WorldRegistry {
  constructor({
    towns = WORLD_TOWNS,
    connections = CONNECTIONS,
    starterPlan = STARTER_TOWN_RUNTIME_PLAN,
    districtProfiles = STARTER_TOWN_DISTRICT_PROFILES,
    parcels = STARTER_TOWN_PARCELS,
    noBuildBuffers = STARTER_TOWN_NO_BUILD_BUFFERS,
  } = {}) {
    this.towns = new Map();
    this.gateways = new Map();
    this.connections = new Map();
    this.districts = new Map();
    this.districtProfiles = new Map();
    this.routes = new Map();
    this.locations = new Map();
    this.parcels = new Map();
    this.spawns = new Map();
    this.noBuildBuffers = new Map();
    this.errors = [];
    this.warnings = [];
    this.roadTiers = ROAD_TIERS;
    this.streamingPlan = STREAMING_PLAN;
    this.mapUi = MAP_UI;
    this.starterPlan = starterPlan;
    this._loadTowns(towns);
    this._loadStarterPlan(starterPlan);
    this._loadDistrictProfiles(districtProfiles);
    this._loadParcels(parcels, noBuildBuffers);
    this._loadConnections(connections);
    this.validate();
  }

  _put(map, kind, record) {
    if (!record?.id) {
      this.errors.push(`${kind} is missing an id`);
      return;
    }
    if (map.has(record.id)) {
      this.errors.push(`duplicate ${kind} id: ${record.id}`);
      return;
    }
    map.set(record.id, Object.freeze(record));
  }

  _loadTowns(towns) {
    for (const town of towns || []) {
      const record = { ...town, worldBounds: rectangleForTown(town) };
      this._put(this.towns, 'town', record);
      for (const gateway of town.gateways || []) {
        this._put(this.gateways, 'gateway', { ...gateway, townId: town.id });
      }
    }
  }

  _loadStarterPlan(plan) {
    for (const district of plan.districts || []) {
      this._put(this.districts, 'district', { ...district, townId: plan.id });
    }
    for (const route of plan.routes || []) {
      this._put(this.routes, 'route', { ...route, townId: plan.id });
    }
    for (const location of plan.locations || []) this._put(this.locations, 'location', location);
    for (const spawn of plan.spawns || []) this._put(this.spawns, 'spawn', spawn);
  }

  _loadDistrictProfiles(profiles) {
    for (const profile of profiles || []) this._put(this.districtProfiles, 'district profile', profile);
  }

  _loadParcels(parcels, noBuildBuffers) {
    for (const parcel of parcels || []) this._put(this.parcels, 'parcel', parcel);
    for (const buffer of noBuildBuffers || []) this._put(this.noBuildBuffers, 'no-build buffer', buffer);
  }

  _loadConnections(connections) {
    for (const connection of connections || []) this._put(this.connections, 'connection', connection);
  }

  validate() {
    for (const town of this.towns.values()) {
      if (!finite(town.origin?.x) || !finite(town.origin?.z)) this.errors.push(`town ${town.id} has invalid origin`);
      if (!(Number(town.bounds?.w) > 0) || !(Number(town.bounds?.h) > 0)) this.errors.push(`town ${town.id} has invalid bounds`);
      if (!(Number(town.terrain?.w) > 0) || !(Number(town.terrain?.h) > 0)) this.errors.push(`town ${town.id} has invalid terrain envelope`);
    }

    const origins = new Map();
    for (const town of this.towns.values()) {
      const key = `${town.origin?.x}:${town.origin?.z}:${town.terrain?.layer || 'surface'}`;
      if (origins.has(key)) this.errors.push(`town origins overlap exactly: ${origins.get(key)} and ${town.id}`);
      origins.set(key, town.id);
    }

    for (const gateway of this.gateways.values()) {
      if (!this.towns.has(gateway.townId)) this.errors.push(`gateway ${gateway.id} references missing town ${gateway.townId}`);
      if (!finite(gateway.node?.x) || !finite(gateway.node?.z)) this.errors.push(`gateway ${gateway.id} has invalid coordinates`);
      if (!this.roadTiers[gateway.tier]) this.errors.push(`gateway ${gateway.id} has unknown road tier ${gateway.tier}`);
    }

    for (const connection of this.connections.values()) {
      if (!this.gateways.has(connection.from)) this.errors.push(`connection ${connection.id} has missing from gateway ${connection.from}`);
      if (!this.gateways.has(connection.to)) this.errors.push(`connection ${connection.id} has missing to gateway ${connection.to}`);
      if (!this.roadTiers[connection.tier]) this.errors.push(`connection ${connection.id} has unknown tier ${connection.tier}`);
    }

    const starter = this.towns.get('starter-town');
    const starterBounds = starter?.worldBounds;
    for (const district of this.districts.values()) {
      if (!this.towns.has(district.townId)) this.errors.push(`district ${district.id} references missing town ${district.townId}`);
      if (!Array.isArray(district.polygon) || district.polygon.length < 3) this.errors.push(`district ${district.id} needs at least three polygon points`);
      for (const vertex of district.polygon || []) {
        if (!finite(vertex.x) || !finite(vertex.z)) this.errors.push(`district ${district.id} has invalid polygon coordinates`);
        if (starterBounds && !inBounds(vertex, starterBounds)) this.errors.push(`district ${district.id} exceeds Starter Town bounds`);
      }
      if (!this.districtProfiles.has(district.id)) this.errors.push(`district ${district.id} is missing a simulation/visual profile`);
    }

    for (const profile of this.districtProfiles.values()) {
      if (!this.districts.has(profile.id)) this.errors.push(`district profile ${profile.id} references missing district`);
      if (!(Number(profile.density) >= 0 && Number(profile.density) <= 1)) this.errors.push(`district profile ${profile.id} has invalid density`);
      if (!(Number(profile.parcelDensity) >= 0 && Number(profile.parcelDensity) <= 1)) this.errors.push(`district profile ${profile.id} has invalid parcel density`);
      if (!Array.isArray(profile.palette) || profile.palette.length < 3) this.errors.push(`district profile ${profile.id} needs at least three palette colors`);
    }

    for (const route of this.routes.values()) {
      if (!this.roadTiers[route.tier]) this.errors.push(`route ${route.id} has unknown tier ${route.tier}`);
      if (!Array.isArray(route.points) || route.points.length < 2) this.errors.push(`route ${route.id} needs at least two points`);
      if (route.gatewayId && !this.gateways.has(route.gatewayId)) this.errors.push(`route ${route.id} references missing gateway ${route.gatewayId}`);
    }

    for (const location of this.locations.values()) {
      if (!this.towns.has(location.townId)) this.errors.push(`location ${location.id} references missing town ${location.townId}`);
      if (!this.districts.has(location.districtId)) this.errors.push(`location ${location.id} references missing district ${location.districtId}`);
      if (!finite(location.position?.x) || !finite(location.position?.z)) this.errors.push(`location ${location.id} has invalid coordinates`);
      if (!location.assetRef?.preferred || !location.assetRef?.fallback) this.errors.push(`location ${location.id} needs preferred and fallback asset references`);
      if (starterBounds && !inBounds(location.position, starterBounds)) this.errors.push(`location ${location.id} exceeds Starter Town bounds`);
    }

    const locationParcels = new Map();
    for (const parcel of this.parcels.values()) {
      if (!this.towns.has(parcel.townId)) this.errors.push(`parcel ${parcel.id} references missing town ${parcel.townId}`);
      if (!this.districts.has(parcel.districtId)) this.errors.push(`parcel ${parcel.id} references missing district ${parcel.districtId}`);
      if (!(Number(parcel.bounds?.w) > 0) || !(Number(parcel.bounds?.d) > 0)) this.errors.push(`parcel ${parcel.id} has invalid dimensions`);
      if (!finite(parcel.bounds?.x) || !finite(parcel.bounds?.z)) this.errors.push(`parcel ${parcel.id} has invalid coordinates`);
      if (starterBounds && !inBounds(parcelPoint(parcel), starterBounds)) this.errors.push(`parcel ${parcel.id} center exceeds Starter Town bounds`);
      if (parcel.locationId) {
        if (!this.locations.has(parcel.locationId)) this.errors.push(`parcel ${parcel.id} references missing location ${parcel.locationId}`);
        if (locationParcels.has(parcel.locationId)) this.errors.push(`location ${parcel.locationId} owns multiple functional parcels`);
        locationParcels.set(parcel.locationId, parcel.id);
      }
    }
    for (const location of this.locations.values()) {
      if (!locationParcels.has(location.id)) this.errors.push(`location ${location.id} is missing a functional parcel`);
    }

    for (const buffer of this.noBuildBuffers.values()) {
      if (buffer.routeId && !this.routes.has(buffer.routeId)) this.errors.push(`no-build buffer ${buffer.id} references missing route ${buffer.routeId}`);
      if (buffer.bounds && (!(Number(buffer.bounds.w) > 0) || !(Number(buffer.bounds.d) > 0))) this.errors.push(`no-build buffer ${buffer.id} has invalid dimensions`);
    }

    for (const spawn of this.spawns.values()) {
      if (!this.towns.has(spawn.townId)) this.errors.push(`spawn ${spawn.id} references missing town ${spawn.townId}`);
      if (!this.districts.has(spawn.districtId)) this.errors.push(`spawn ${spawn.id} references missing district ${spawn.districtId}`);
      if (!finite(spawn.position?.x) || !finite(spawn.position?.z)) this.errors.push(`spawn ${spawn.id} has invalid coordinates`);
    }

    if (this.errors.length) {
      throw new Error(`WorldRegistry validation failed:\n- ${this.errors.join('\n- ')}`);
    }
    return true;
  }

  town(id) { return this.towns.get(id) || null; }
  district(id) { return this.districts.get(id) || null; }
  districtProfile(id) { return this.districtProfiles.get(id) || null; }
  route(id) { return this.routes.get(id) || null; }
  location(id) { return this.locations.get(id) || null; }
  parcel(id) { return this.parcels.get(id) || null; }
  spawn(id) { return this.spawns.get(id) || null; }
  gateway(id) { return this.gateways.get(id) || null; }
  connection(id) { return this.connections.get(id) || null; }

  parcelsForDistrict(districtId) {
    return [...this.parcels.values()].filter((parcel) => parcel.districtId === districtId);
  }

  parcelForLocation(locationId) {
    return [...this.parcels.values()].find((parcel) => parcel.locationId === locationId) || null;
  }

  townAt(globalPoint) {
    const point = clonePoint(globalPoint);
    for (const town of this.towns.values()) if (inBounds(point, town.worldBounds)) return town;
    return null;
  }

  districtAt(globalPoint, townId = 'starter-town') {
    const point = clonePoint(globalPoint);
    for (const district of this.districts.values()) {
      if (district.townId === townId && pointInPolygon(point.x, point.z, district.polygon)) return district;
    }
    return null;
  }

  toTownLocal(townId, globalPoint) {
    const town = this.town(townId);
    if (!town) throw new Error(`Unknown town: ${townId}`);
    const point = clonePoint(globalPoint);
    return { x: point.x - town.origin.x, y: point.y, z: point.z - town.origin.z };
  }

  toGlobal(townId, localPoint) {
    const town = this.town(townId);
    if (!town) throw new Error(`Unknown town: ${townId}`);
    const point = clonePoint(localPoint);
    return { x: point.x + town.origin.x, y: point.y, z: point.z + town.origin.z };
  }

  interiorLocal(interiorId, point) {
    return { interiorId, ...clonePoint(point) };
  }

  featureEnabled(id) {
    const contract = this.starterPlan.featureFlags?.[id];
    return contract ? featureValue(contract) : false;
  }

  setFeature(id, enabled) {
    const contract = this.starterPlan.featureFlags?.[id];
    if (!contract || typeof localStorage === 'undefined') return false;
    try {
      localStorage.setItem(contract.storageKey, enabled ? '1' : '0');
      return true;
    } catch { return false; }
  }

  snapshot() {
    return Object.freeze({
      towns: this.towns.size,
      gateways: this.gateways.size,
      connections: this.connections.size,
      districts: this.districts.size,
      districtProfiles: this.districtProfiles.size,
      routes: this.routes.size,
      locations: this.locations.size,
      parcels: this.parcels.size,
      noBuildBuffers: this.noBuildBuffers.size,
      spawns: this.spawns.size,
      starterTownLargeWorld: this.featureEnabled('starterTownLargeWorld'),
      warnings: [...this.warnings],
      errors: [...this.errors],
    });
  }
}

export const worldRegistry = new WorldRegistry();

if (typeof window !== 'undefined') {
  window.__ZW_WORLD_REGISTRY__ = worldRegistry;
  window.__ZW_WORLD_REGISTRY_REPORT__ = () => worldRegistry.snapshot();
}

export default worldRegistry;
