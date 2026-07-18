// ─────────────────────────────────────────────────────────────────────────────
// StreamingGrid.js — deterministic town cell states for staged world loading.
// ─────────────────────────────────────────────────────────────────────────────

const STATE_ORDER = Object.freeze({ active: 0, warm: 1, far: 2, unloaded: 3 });

function cellId(x, z) { return `${x}:${z}`; }
function parseCell(id) {
  const [x, z] = String(id).split(':').map(Number);
  return { x, z };
}

export class StreamingGrid {
  constructor({
    townId = 'starter-town',
    cellSize = 250,
    bounds = { minX: -1200, maxX: 1200, minZ: -1200, maxZ: 1200 },
    activeRadius = 1,
    warmRadius = 2,
    farRadius = 4,
  } = {}) {
    this.townId = townId;
    this.cellSize = cellSize;
    this.bounds = { ...bounds };
    this.activeRadius = activeRadius;
    this.warmRadius = Math.max(activeRadius, warmRadius);
    this.farRadius = Math.max(this.warmRadius, farRadius);
    this.states = new Map();
    this.listeners = new Set();
    this.lastCenter = null;
  }

  coordinates(point) {
    return {
      x: Math.floor((Number(point?.x) || 0) / this.cellSize),
      z: Math.floor((Number(point?.z) || 0) / this.cellSize),
    };
  }

  idAt(point) {
    const cell = this.coordinates(point);
    return cellId(cell.x, cell.z);
  }

  centerOf(id) {
    const cell = parseCell(id);
    return { x: (cell.x + 0.5) * this.cellSize, z: (cell.z + 0.5) * this.cellSize };
  }

  stateForOffset(dx, dz) {
    const radius = Math.max(Math.abs(dx), Math.abs(dz));
    if (radius <= this.activeRadius) return 'active';
    if (radius <= this.warmRadius) return 'warm';
    if (radius <= this.farRadius) return 'far';
    return 'unloaded';
  }

  cellIntersectsBounds(x, z) {
    const minX = x * this.cellSize;
    const maxX = minX + this.cellSize;
    const minZ = z * this.cellSize;
    const maxZ = minZ + this.cellSize;
    return maxX >= this.bounds.minX && minX <= this.bounds.maxX
      && maxZ >= this.bounds.minZ && minZ <= this.bounds.maxZ;
  }

  desiredStates(center) {
    const next = new Map();
    const minX = Math.floor(this.bounds.minX / this.cellSize);
    const maxX = Math.floor(this.bounds.maxX / this.cellSize);
    const minZ = Math.floor(this.bounds.minZ / this.cellSize);
    const maxZ = Math.floor(this.bounds.maxZ / this.cellSize);
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        if (!this.cellIntersectsBounds(x, z)) continue;
        next.set(cellId(x, z), this.stateForOffset(x - center.x, z - center.z));
      }
    }
    return next;
  }

  update(playerPosition) {
    const center = this.coordinates(playerPosition);
    if (this.lastCenter && center.x === this.lastCenter.x && center.z === this.lastCenter.z) return [];
    this.lastCenter = center;
    const desired = this.desiredStates(center);
    const changes = [];
    const ids = new Set([...this.states.keys(), ...desired.keys()]);
    for (const id of ids) {
      const previous = this.states.get(id) || 'unloaded';
      const next = desired.get(id) || 'unloaded';
      if (previous === next) continue;
      if (next === 'unloaded') this.states.delete(id);
      else this.states.set(id, next);
      changes.push({ id, previous, next, center: this.centerOf(id) });
    }
    changes.sort((a, b) => STATE_ORDER[a.next] - STATE_ORDER[b.next]);
    for (const listener of this.listeners) listener(changes, this.snapshot());
    return changes;
  }

  onChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  cells(state = null) {
    const result = [];
    for (const [id, value] of this.states) if (!state || value === state) result.push(id);
    return result;
  }

  snapshot() {
    const counts = { active: 0, warm: 0, far: 0, unloaded: 0 };
    for (const state of this.states.values()) counts[state] += 1;
    return Object.freeze({
      townId: this.townId,
      cellSize: this.cellSize,
      center: this.lastCenter ? { ...this.lastCenter } : null,
      counts,
      loaded: this.states.size,
    });
  }
}

export default StreamingGrid;
