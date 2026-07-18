// ─────────────────────────────────────────────────────────────────────────────
// StreamingController.js — predictive ring loading, hysteresis, and priorities.
//
// StreamingGrid owns deterministic cell membership. This controller decides what
// to load first, keeps recently-left cells warm briefly, and projects the player
// forward while driving so collision arrives before scenery.
// ─────────────────────────────────────────────────────────────────────────────
import { StreamingGrid } from './StreamingGrid.js';

const PRIORITY = Object.freeze({
  collision: 0,
  roads: 1,
  functional: 2,
  characters: 3,
  vehicles: 4,
  decoration: 5,
  far: 6,
  unload: 7,
});

const STATE_PRIORITY = Object.freeze({ active: 0, warm: 2, far: 5, unloaded: 7 });
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function magnitude(value = {}) {
  return Math.hypot(Number(value.x) || 0, Number(value.z) || 0);
}

function predictedPosition(position = {}, velocity = {}, seconds = 1.25, maxDistance = 420) {
  const speed = magnitude(velocity);
  if (speed < 0.05) return { x: Number(position.x) || 0, z: Number(position.z) || 0 };
  const distance = Math.min(maxDistance, speed * seconds);
  return {
    x: (Number(position.x) || 0) + ((Number(velocity.x) || 0) / speed) * distance,
    z: (Number(position.z) || 0) + ((Number(velocity.z) || 0) / speed) * distance,
  };
}

function jobKey(job) { return `${job.cellId}:${job.kind}:${job.next}`; }

export class StreamingController {
  constructor({
    grid = new StreamingGrid(),
    unloadDelayMs = 2400,
    predictionSeconds = 1.25,
    maxPredictionDistance = 420,
    maxJobsPerFrame = 3,
  } = {}) {
    this.grid = grid;
    this.unloadDelayMs = unloadDelayMs;
    this.predictionSeconds = predictionSeconds;
    this.maxPredictionDistance = maxPredictionDistance;
    this.maxJobsPerFrame = maxJobsPerFrame;
    this.pending = new Map();
    this.recentlyExited = new Map();
    this.manualPreloads = new Map();
    this.lastPosition = null;
    this.lastVelocity = { x: 0, z: 0 };
    this.lastPredicted = null;
    this.stats = {
      updates: 0,
      queued: 0,
      completed: 0,
      cancelled: 0,
      deferredUnloads: 0,
      gatewayPreloads: 0,
      interiorPreloads: 0,
    };
  }

  queue(change, kind = change.next === 'unloaded' ? 'unload' : 'collision', reason = 'ring-change') {
    const job = {
      key: '',
      cellId: change.id,
      previous: change.previous,
      next: change.next,
      center: change.center,
      kind,
      reason,
      priority: (STATE_PRIORITY[change.next] ?? 7) + (PRIORITY[kind] ?? 5) * 0.01,
      createdAt: now(),
    };
    job.key = jobKey(job);
    for (const [key, pending] of this.pending) {
      if (pending.cellId === job.cellId && pending.kind === job.kind && pending.next !== job.next) {
        this.pending.delete(key);
        this.stats.cancelled += 1;
      }
    }
    if (!this.pending.has(job.key)) {
      this.pending.set(job.key, job);
      this.stats.queued += 1;
    }
    return job;
  }

  expandCellChange(change) {
    if (change.next === 'active') {
      return ['collision', 'roads', 'functional', 'characters', 'vehicles', 'decoration']
        .map((kind) => this.queue(change, kind));
    }
    if (change.next === 'warm') {
      return ['collision', 'roads', 'functional', 'decoration'].map((kind) => this.queue(change, kind));
    }
    if (change.next === 'far') return [this.queue(change, 'far')];
    return [this.queue(change, 'unload')];
  }

  update(position, velocity = { x: 0, z: 0 }) {
    this.stats.updates += 1;
    this.lastPosition = { x: Number(position?.x) || 0, z: Number(position?.z) || 0 };
    this.lastVelocity = { x: Number(velocity?.x) || 0, z: Number(velocity?.z) || 0 };
    this.lastPredicted = predictedPosition(
      this.lastPosition,
      this.lastVelocity,
      this.predictionSeconds,
      this.maxPredictionDistance,
    );

    const actualChanges = this.grid.update(this.lastPosition);
    const predictedChanges = this.grid.desiredStates(this.grid.coordinates(this.lastPredicted));
    const currentTime = now();

    for (const change of actualChanges) {
      if (change.next === 'unloaded') {
        this.recentlyExited.set(change.id, currentTime + this.unloadDelayMs);
        this.stats.deferredUnloads += 1;
        continue;
      }
      this.recentlyExited.delete(change.id);
      this.expandCellChange(change);
    }

    for (const [cellId, state] of predictedChanges) {
      if (state !== 'active' && state !== 'warm') continue;
      const current = this.grid.states.get(cellId) || 'unloaded';
      if (current === 'active' || (current === 'warm' && state === 'warm')) continue;
      this.expandCellChange({
        id: cellId,
        previous: current,
        next: state === 'active' ? 'warm' : 'far',
        center: this.grid.centerOf(cellId),
      });
    }

    for (const [cellId, expiresAt] of this.recentlyExited) {
      if (currentTime < expiresAt) continue;
      this.recentlyExited.delete(cellId);
      this.expandCellChange({
        id: cellId,
        previous: 'far',
        next: 'unloaded',
        center: this.grid.centerOf(cellId),
      });
    }

    return {
      actualChanges,
      predicted: { ...this.lastPredicted },
      queued: this.pending.size,
    };
  }

  preloadGateway(gatewayId, cellIds = []) {
    const record = { id: gatewayId, type: 'gateway', cellIds: [...new Set(cellIds)], requestedAt: now() };
    this.manualPreloads.set(`gateway:${gatewayId}`, record);
    this.stats.gatewayPreloads += 1;
    for (const id of record.cellIds) {
      this.expandCellChange({ id, previous: this.grid.states.get(id) || 'unloaded', next: 'warm', center: this.grid.centerOf(id) });
    }
    return record;
  }

  preloadInterior(interiorId, cellIds = []) {
    const record = { id: interiorId, type: 'interior', cellIds: [...new Set(cellIds)], requestedAt: now() };
    this.manualPreloads.set(`interior:${interiorId}`, record);
    this.stats.interiorPreloads += 1;
    for (const id of record.cellIds) {
      this.queue({ id, previous: 'unloaded', next: 'warm', center: this.grid.centerOf(id) }, 'functional', `interior:${interiorId}`);
    }
    return record;
  }

  releaseManualPreload(type, id) {
    return this.manualPreloads.delete(`${type}:${id}`);
  }

  nextJobs(limit = this.maxJobsPerFrame) {
    const jobs = [...this.pending.values()]
      .sort((a, b) => a.priority - b.priority || a.createdAt - b.createdAt)
      .slice(0, Math.max(0, limit));
    for (const job of jobs) this.pending.delete(job.key);
    return jobs;
  }

  complete(job) {
    if (!job) return;
    this.stats.completed += 1;
  }

  snapshot() {
    const pendingByKind = {};
    for (const job of this.pending.values()) pendingByKind[job.kind] = (pendingByKind[job.kind] || 0) + 1;
    return Object.freeze({
      grid: this.grid.snapshot(),
      position: this.lastPosition && { ...this.lastPosition },
      velocity: { ...this.lastVelocity },
      predicted: this.lastPredicted && { ...this.lastPredicted },
      pending: this.pending.size,
      pendingByKind,
      deferredUnloads: this.recentlyExited.size,
      manualPreloads: this.manualPreloads.size,
      stats: { ...this.stats },
    });
  }
}

export { PRIORITY as STREAMING_JOB_PRIORITY, predictedPosition };
export default StreamingController;
