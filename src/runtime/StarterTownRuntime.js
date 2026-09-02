// ─────────────────────────────────────────────────────────────────────────────
// StarterTownRuntime.js — one coordinator for the authoritative Starter Town.
//
// It binds the registry, cell index, streaming priorities, routing, LOD,
// lifecycle, environment, boundary recovery, diagnostics, and large-world build.
// Existing compact gameplay remains untouched unless the approved feature flag is
// enabled or install({ forceBuild: true }) is requested by a development tool.
// ─────────────────────────────────────────────────────────────────────────────
import { graphics } from '../graphics.js';
import { STARTER_TOWN_RUNTIME_PLAN } from '../config/starterTownRuntimePlan.js';
import { worldRegistry } from './WorldRegistry.js';
import { starterTownCellIndex } from './StarterTownCellIndex.js';
import { StreamingGrid } from './StreamingGrid.js';
import { StreamingController } from './StreamingController.js';
import { LODPolicy } from './LODPolicy.js';
import { runtimeDiagnostics } from './RuntimeDiagnostics.js';
import { sceneLifecycle } from './SceneLifecycle.js';
import {
  ensureGameObjectPools,
  releaseCellObjects,
  resizeGameObjectPools,
} from './GameObjectPools.js';
import { createStarterTownNavigation } from './StarterTownNavigation.js';
import { RoadValidator } from '../world/RoadValidator.js';
import { starterTownBoundaryGuard } from '../world/StarterTownBoundaryGuard.js';
import { starterTownEnvironmentAt } from '../world/StarterTownEnvironment.js';
import { buildLargeStarterTown } from '../world/LargeStarterTown.js';
import { auditVisualPerformance } from '../world/VisualPerformanceAudit.js';

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const point = (value = {}) => ({ x: Number(value.x) || 0, y: Number(value.y) || 0, z: Number(value.z) || 0 });

export class StarterTownRuntime {
  constructor({
    plan = STARTER_TOWN_RUNTIME_PLAN,
    maxJobsPerFrame = 3,
    graphicsPreset = graphics.effectivePreset(),
    poolFactories = {},
  } = {}) {
    this.plan = plan;
    this.worldRegistry = worldRegistry;
    this.cellIndex = starterTownCellIndex;
    this.navigation = createStarterTownNavigation({ plan });
    this.roadNetwork = this.navigation.roadNetwork;
    this.roadGraph = this.navigation.roadGraph;
    this.roadValidation = new RoadValidator({
      roadNetwork: this.roadNetwork,
      roadGraph: this.roadGraph,
      plan,
    }).run({ requiredLocationIds: plan.locations.map((location) => location.id) });
    this.grid = new StreamingGrid({
      townId: plan.id,
      cellSize: plan.streamingCellSize,
      bounds: plan.terrainBounds,
    });
    this.streaming = new StreamingController({ grid: this.grid, maxJobsPerFrame });
    this.lod = new LODPolicy({ graphicsPreset });
    this.boundary = starterTownBoundaryGuard;
    this.pools = ensureGameObjectPools({ preset: graphicsPreset, factories: poolFactories });
    this.handlers = new Map();
    this.registerJobHandler('unload', ({ job }) => ({
      released: releaseCellObjects(job.cellId),
      cellId: job.cellId,
    }));
    this.scene = null;
    this.renderer = null;
    this.playerPosition = null;
    this.largeTown = null;
    this.scope = null;
    this.installedAt = 0;
    this.lastPosition = null;
    this.lastEnvironment = null;
    this.lastBoundary = null;
    this.lastJobs = [];
    this.stats = {
      installs: 0,
      updates: 0,
      jobsProcessed: 0,
      recoveries: 0,
      clamps: 0,
      featureBuilds: 0,
      pooledReleases: 0,
    };
  }

  registerJobHandler(kind, handler) {
    if (typeof handler !== 'function') throw new Error(`Streaming handler for ${kind} must be a function`);
    this.handlers.set(kind, handler);
    return () => this.handlers.delete(kind);
  }

  async install({
    scene,
    renderer = null,
    playerPosition = null,
    forceBuild = false,
    placeReadyAssets = true,
    showDistricts = false,
  } = {}) {
    if (!scene) throw new Error('StarterTownRuntime.install requires a scene');
    this.dispose();
    this.scene = scene;
    this.renderer = renderer;
    this.playerPosition = playerPosition;
    this.scope = sceneLifecycle.replace('town:starter-town');
    this.installedAt = now();
    this.stats.installs += 1;

    const shouldBuild = forceBuild || this.worldRegistry.featureEnabled('starterTownLargeWorld');
    if (shouldBuild) {
      this.largeTown = await buildLargeStarterTown({
        renderer,
        placeReadyAssets,
        showDistricts,
        includeMassing: true,
        includeStreetscape: true,
        includeGeneratedRoadside: true,
        includeSpecialRoadForms: true,
      });
      scene.add(this.largeTown.group);
      this.scope.object3D(this.largeTown.group, {}, 'large-town-group');
      this.stats.featureBuilds += 1;
    }

    runtimeDiagnostics.bind({
      renderer,
      scene,
      playerPosition,
      streamingGrid: this.grid,
    });
    this._updateDiagnostics();
    return this.snapshot();
  }

  _updateDiagnostics() {
    runtimeDiagnostics.set('starterTownRuntime', this.snapshot({ includeDiagnostics: false }));
    runtimeDiagnostics.set('roadGraph', this.roadGraph.snapshot());
    runtimeDiagnostics.set('roadValidation', this.roadValidation);
    runtimeDiagnostics.set('cellIndex', this.cellIndex.snapshot());
    runtimeDiagnostics.set('largeTownVisualAudit', this.largeTown?.group
      ? auditVisualPerformance(this.largeTown.group, { preset: graphics.effectivePreset() })
      : null);
  }

  _processJobs(limit) {
    const jobs = this.streaming.nextJobs(limit);
    const results = [];
    for (const job of jobs) {
      const cell = this.cellIndex.recordsForCell(job.cellId);
      const handler = this.handlers.get(job.kind);
      let result = null;
      try {
        result = handler ? handler({ job, cell, runtime: this }) : { skipped: true, reason: 'no-handler' };
      } catch (error) {
        console.warn(`[starter-runtime] ${job.kind} handler failed for ${job.cellId}`, error);
        result = { failed: true, message: error?.message || String(error) };
      }
      if (job.kind === 'unload') this.stats.pooledReleases += Number(result?.released) || 0;
      this.streaming.complete(job);
      this.stats.jobsProcessed += 1;
      results.push({ job, cell, result });
    }
    this.lastJobs = results;
    return results;
  }

  update({
    position,
    velocity = { x: 0, z: 0 },
    timestamp = now(),
    timeMin = 720,
    weather = 'clear',
    processJobs = true,
  } = {}) {
    if (!position) return null;
    this.stats.updates += 1;
    this.lastPosition = point(position);
    this.playerPosition = position;
    runtimeDiagnostics.playerPosition = position;
    runtimeDiagnostics.frame(timestamp);

    this.lastBoundary = this.boundary.evaluate(position);
    if (this.lastBoundary.action === 'recover') this.stats.recoveries += 1;
    if (this.lastBoundary.action === 'clamp') this.stats.clamps += 1;

    const streamingUpdate = this.streaming.update(position, velocity);
    this.lastEnvironment = starterTownEnvironmentAt(position, {
      timeMin,
      weather,
      graphicsPreset: graphics.effectivePreset(),
    });
    const jobs = processJobs ? this._processJobs() : [];
    this._updateDiagnostics();

    return Object.freeze({
      boundary: this.lastBoundary,
      streaming: streamingUpdate,
      jobs,
      environment: this.lastEnvironment,
      lodAtPlayer: this.lod.evaluate(position, position),
    });
  }

  recoverPosition(position, options = {}) {
    const evaluation = this.boundary.evaluate(position, options);
    return evaluation.action === 'allow' || evaluation.action === 'allow-gateway'
      ? point(position)
      : point(evaluation.position);
  }

  preloadGateway(gatewayId) {
    const route = this.plan.routes.find((entry) => entry.gatewayId === gatewayId);
    const cells = route ? this.cellIndex.cellsFor('routes', route.id) : [];
    return this.streaming.preloadGateway(gatewayId, cells);
  }

  preloadInterior(interiorId) {
    const location = this.plan.locations.find((entry) => entry.interiorId === interiorId);
    const cells = location ? this.cellIndex.cellsFor('locations', location.id) : [];
    return this.streaming.preloadInterior(interiorId, cells);
  }

  route(from, to, options = {}) {
    return this.navigation.route(from, to, options);
  }

  locationRoute(from, locationId, options = {}) {
    return this.navigation.routeToLocation(from, locationId, options);
  }

  setGraphicsPreset(preset) {
    this.lod.setGraphicsPreset(preset);
    resizeGameObjectPools(preset);
    this._updateDiagnostics();
  }

  dispose() {
    if (this.scope) sceneLifecycle.dispose('town:starter-town');
    this.scope = null;
    this.largeTown = null;
    this.scene = null;
    this.renderer = null;
  }

  snapshot({ includeDiagnostics = true } = {}) {
    const snapshot = {
      townId: this.plan.id,
      version: this.plan.version,
      installed: !!this.scene,
      builtLargeWorld: !!this.largeTown,
      featureEnabled: this.worldRegistry.featureEnabled('starterTownLargeWorld'),
      installedForMs: this.installedAt ? Math.round(now() - this.installedAt) : 0,
      roads: this.roadNetwork.snapshot(),
      routeGraph: this.roadGraph.snapshot(),
      roadValidation: this.roadValidation,
      cells: this.cellIndex.snapshot(),
      streaming: this.streaming.snapshot(),
      lod: this.lod.snapshot(),
      boundary: this.lastBoundary,
      environment: this.lastEnvironment,
      pools: Object.fromEntries(Object.entries(this.pools).map(([id, pool]) => [id, pool.snapshot()])),
      lastJobs: this.lastJobs.map(({ job, result }) => ({ key: job.key, kind: job.kind, cellId: job.cellId, result })),
      stats: { ...this.stats },
    };
    if (includeDiagnostics && this.largeTown?.group) {
      snapshot.visualAudit = auditVisualPerformance(this.largeTown.group, { preset: graphics.effectivePreset() });
    }
    return Object.freeze(snapshot);
  }
}

export function createStarterTownRuntime(options = {}) {
  return new StarterTownRuntime(options);
}

export const starterTownRuntime = new StarterTownRuntime();

if (typeof window !== 'undefined') {
  window.__ZW_STARTER_TOWN_RUNTIME__ = starterTownRuntime;
  window.__ZW_STARTER_TOWN_RUNTIME_REPORT__ = () => starterTownRuntime.snapshot();
}

export default starterTownRuntime;
