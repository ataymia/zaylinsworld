// ─────────────────────────────────────────────────────────────────────────────
// StarterTownCellIndex.js — assigns authoritative town content to streaming cells.
//
// The index is pure data. It does not load meshes. Streaming code can ask what a
// cell owns, load collision and roads first, and postpone decoration until later.
// ─────────────────────────────────────────────────────────────────────────────
import { STARTER_TOWN_RUNTIME_PLAN } from '../config/starterTownRuntimePlan.js';
import {
  STARTER_TOWN_PARCELS,
  STARTER_TOWN_NO_BUILD_BUFFERS,
} from '../config/starterTownParcelPlan.js';

const CONTENT_TYPES = Object.freeze([
  'districts',
  'routes',
  'parcels',
  'locations',
  'spawns',
  'noBuildBuffers',
]);

function idFor(x, z) { return `${x}:${z}`; }
function finite(value) { return Number.isFinite(Number(value)); }

function pointBounds(point = {}) {
  const x = Number(point.x) || 0;
  const z = Number(point.z) || 0;
  return { minX: x, maxX: x, minZ: z, maxZ: z };
}

function polygonBounds(points = []) {
  const xs = points.map((point) => Number(point.x) || 0);
  const zs = points.map((point) => Number(point.z) || 0);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
  };
}

function parcelBounds(parcel = {}) {
  const x = Number(parcel.bounds?.x) || 0;
  const z = Number(parcel.bounds?.z) || 0;
  const width = Math.max(0, Number(parcel.bounds?.w) || 0);
  const depth = Math.max(0, Number(parcel.bounds?.d) || 0);
  return {
    minX: x - width / 2,
    maxX: x + width / 2,
    minZ: z - depth / 2,
    maxZ: z + depth / 2,
  };
}

function bufferBounds(buffer = {}) {
  if (buffer.bounds) return parcelBounds(buffer);
  if (buffer.center && finite(buffer.radius)) {
    const radius = Number(buffer.radius) || 0;
    return {
      minX: (Number(buffer.center.x) || 0) - radius,
      maxX: (Number(buffer.center.x) || 0) + radius,
      minZ: (Number(buffer.center.z) || 0) - radius,
      maxZ: (Number(buffer.center.z) || 0) + radius,
    };
  }
  return pointBounds(buffer.position || buffer.center || {});
}

function segmentBounds(start, end, padding = 0) {
  return {
    minX: Math.min(start.x, end.x) - padding,
    maxX: Math.max(start.x, end.x) + padding,
    minZ: Math.min(start.z, end.z) - padding,
    maxZ: Math.max(start.z, end.z) + padding,
  };
}

function emptyRecord(id, x, z, cellSize) {
  const content = Object.fromEntries(CONTENT_TYPES.map((type) => [type, new Set()]));
  return {
    id,
    x,
    z,
    bounds: Object.freeze({
      minX: x * cellSize,
      maxX: (x + 1) * cellSize,
      minZ: z * cellSize,
      maxZ: (z + 1) * cellSize,
    }),
    content,
    borderDependencies: new Set(),
  };
}

export class StarterTownCellIndex {
  constructor({
    plan = STARTER_TOWN_RUNTIME_PLAN,
    parcels = STARTER_TOWN_PARCELS,
    noBuildBuffers = STARTER_TOWN_NO_BUILD_BUFFERS,
    cellSize = plan.streamingCellSize || 250,
  } = {}) {
    this.plan = plan;
    this.cellSize = cellSize;
    this.cells = new Map();
    this.routeSegments = new Map();
    this.errors = [];
    this.warnings = [];
    this._createCells();
    this._indexDistricts();
    this._indexRoutes();
    this._indexParcels(parcels);
    this._indexPoints('locations', plan.locations || []);
    this._indexPoints('spawns', plan.spawns || []);
    this._indexBuffers(noBuildBuffers);
    this._linkBorders();
    this.validate();
  }

  coordinates(point = {}) {
    return {
      x: Math.floor((Number(point.x) || 0) / this.cellSize),
      z: Math.floor((Number(point.z) || 0) / this.cellSize),
    };
  }

  idAt(point = {}) {
    const coordinates = this.coordinates(point);
    return idFor(coordinates.x, coordinates.z);
  }

  _createCells() {
    const bounds = this.plan.terrainBounds;
    const minX = Math.floor(bounds.minX / this.cellSize);
    const maxX = Math.floor((bounds.maxX - Number.EPSILON) / this.cellSize);
    const minZ = Math.floor(bounds.minZ / this.cellSize);
    const maxZ = Math.floor((bounds.maxZ - Number.EPSILON) / this.cellSize);
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        const id = idFor(x, z);
        this.cells.set(id, emptyRecord(id, x, z, this.cellSize));
      }
    }
  }

  _idsForBounds(bounds) {
    const minX = Math.floor(bounds.minX / this.cellSize);
    const maxX = Math.floor((bounds.maxX - Number.EPSILON) / this.cellSize);
    const minZ = Math.floor(bounds.minZ / this.cellSize);
    const maxZ = Math.floor((bounds.maxZ - Number.EPSILON) / this.cellSize);
    const ids = [];
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        const id = idFor(x, z);
        if (this.cells.has(id)) ids.push(id);
      }
    }
    return ids;
  }

  _add(type, recordId, bounds) {
    const ids = this._idsForBounds(bounds);
    if (!ids.length) this.warnings.push(`${type}:${recordId} does not intersect the terrain envelope`);
    for (const id of ids) this.cells.get(id).content[type].add(recordId);
    return ids;
  }

  _indexDistricts() {
    for (const district of this.plan.districts || []) {
      this._add('districts', district.id, polygonBounds(district.polygon || []));
    }
  }

  _indexRoutes() {
    for (const route of this.plan.routes || []) {
      const segments = [];
      const padding = Math.max(3, Number(route.width) || 12);
      for (let index = 0; index < route.points.length - 1; index++) {
        const start = route.points[index];
        const end = route.points[index + 1];
        const segmentId = `${route.id}:${index}`;
        const cellIds = this._add('routes', route.id, segmentBounds(start, end, padding));
        segments.push(Object.freeze({ id: segmentId, routeId: route.id, index, start, end, cellIds: Object.freeze(cellIds) }));
      }
      this.routeSegments.set(route.id, Object.freeze(segments));
    }
  }

  _indexParcels(parcels) {
    for (const parcel of parcels || []) this._add('parcels', parcel.id, parcelBounds(parcel));
  }

  _indexPoints(type, records) {
    for (const record of records || []) this._add(type, record.id, pointBounds(record.position));
  }

  _indexBuffers(buffers) {
    for (const buffer of buffers || []) this._add('noBuildBuffers', buffer.id, bufferBounds(buffer));
  }

  _linkBorders() {
    const neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const cell of this.cells.values()) {
      const ownsBorderContent = cell.content.routes.size > 0 || cell.content.parcels.size > 0;
      if (!ownsBorderContent) continue;
      for (const [dx, dz] of neighbors) {
        const neighborId = idFor(cell.x + dx, cell.z + dz);
        const neighbor = this.cells.get(neighborId);
        if (!neighbor) continue;
        const sharedRoute = [...cell.content.routes].some((routeId) => neighbor.content.routes.has(routeId));
        const sharedParcel = [...cell.content.parcels].some((parcelId) => neighbor.content.parcels.has(parcelId));
        if (sharedRoute || sharedParcel) cell.borderDependencies.add(neighborId);
      }
    }
  }

  validate() {
    for (const location of this.plan.locations || []) {
      const cell = this.cellAt(location.position);
      if (!cell?.content.locations.has(location.id)) this.errors.push(`location ${location.id} is missing from its streaming cell`);
    }
    for (const route of this.plan.routes || []) {
      const segments = this.routeSegments.get(route.id) || [];
      if (segments.length !== route.points.length - 1) this.errors.push(`route ${route.id} has incomplete segment indexing`);
      if (![...this.cells.values()].some((cell) => cell.content.routes.has(route.id))) this.errors.push(`route ${route.id} is not assigned to any cell`);
    }
    for (const cell of this.cells.values()) {
      for (const type of CONTENT_TYPES) {
        if (!(cell.content[type] instanceof Set)) this.errors.push(`cell ${cell.id} has invalid ${type} collection`);
      }
    }
    if (this.errors.length) throw new Error(`StarterTownCellIndex validation failed:\n- ${this.errors.join('\n- ')}`);
    return true;
  }

  cell(id) { return this.cells.get(id) || null; }
  cellAt(point) { return this.cell(this.idAt(point)); }

  recordsForCell(id) {
    const cell = this.cell(id);
    if (!cell) return null;
    return Object.freeze({
      id: cell.id,
      x: cell.x,
      z: cell.z,
      bounds: cell.bounds,
      content: Object.freeze(Object.fromEntries(CONTENT_TYPES.map((type) => [type, Object.freeze([...cell.content[type])]))),
      borderDependencies: Object.freeze([...cell.borderDependencies]),
    });
  }

  cellsFor(type, recordId) {
    if (!CONTENT_TYPES.includes(type)) return [];
    return [...this.cells.values()].filter((cell) => cell.content[type].has(recordId)).map((cell) => cell.id);
  }

  snapshot() {
    const totals = Object.fromEntries(CONTENT_TYPES.map((type) => [type, 0]));
    let dependencies = 0;
    for (const cell of this.cells.values()) {
      for (const type of CONTENT_TYPES) totals[type] += cell.content[type].size;
      dependencies += cell.borderDependencies.size;
    }
    return Object.freeze({
      townId: this.plan.id,
      cellSize: this.cellSize,
      cells: this.cells.size,
      populatedCells: [...this.cells.values()].filter((cell) => CONTENT_TYPES.some((type) => cell.content[type].size)).length,
      indexedMemberships: Object.freeze(totals),
      borderDependencies: dependencies,
      routes: this.routeSegments.size,
      warnings: Object.freeze([...this.warnings]),
      errors: Object.freeze([...this.errors]),
    });
  }
}

export const starterTownCellIndex = new StarterTownCellIndex();

if (typeof window !== 'undefined') {
  window.__ZW_STARTER_CELL_INDEX__ = starterTownCellIndex;
  window.__ZW_STARTER_CELL_REPORT__ = () => starterTownCellIndex.snapshot();
}

export default starterTownCellIndex;
