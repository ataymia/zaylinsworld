// ─────────────────────────────────────────────────────────────────────────────
// RuntimeDiagnostics.js — copyable performance/world/asset health snapshot.
// ─────────────────────────────────────────────────────────────────────────────
import { loadingSnapshot } from '../loader.js';
import { graphics } from '../graphics.js';
import { performanceBudget, budgetViolations } from '../config/performanceBudgets.js';
import { worldRegistry } from './WorldRegistry.js';
import { assetRuntimeRegistry } from './AssetRuntimeRegistry.js';
import { sceneLifecycle } from './SceneLifecycle.js';
import { poolRegistry } from './ObjectPool.js';

function textureBytes(scene) {
  if (!scene?.traverse) return { textures: 0, bytes: 0 };
  const seen = new Set();
  scene.traverse((node) => {
    if (!node.material) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) {
      for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'alphaMap', 'envMap']) {
        const texture = material?.[key];
        if (texture) seen.add(texture);
      }
    }
  });
  let bytes = 0;
  for (const texture of seen) {
    const image = texture.image || texture.source?.data;
    const width = Number(image?.width) || 0;
    const height = Number(image?.height) || 0;
    bytes += width * height * 4 * 1.333;
  }
  return { textures: seen.size, bytes };
}

export class RuntimeDiagnostics {
  constructor() {
    this.renderer = null;
    this.scene = null;
    this.playerPosition = null;
    this.streamingGrid = null;
    this.frameSamples = [];
    this.lastFrameAt = 0;
    this.lastSnapshot = null;
    this.extra = {};
  }

  bind({ renderer, scene, playerPosition = null, streamingGrid = null } = {}) {
    if (renderer) this.renderer = renderer;
    if (scene) this.scene = scene;
    if (playerPosition) this.playerPosition = playerPosition;
    if (streamingGrid) this.streamingGrid = streamingGrid;
    return this;
  }

  set(key, value) { this.extra[key] = value; }

  frame(timestamp = performance.now()) {
    if (this.lastFrameAt) {
      const delta = Math.max(0.1, timestamp - this.lastFrameAt);
      this.frameSamples.push(delta);
      if (this.frameSamples.length > 180) this.frameSamples.shift();
    }
    this.lastFrameAt = timestamp;
  }

  snapshot() {
    const samples = this.frameSamples;
    const averageFrameMs = samples.length ? samples.reduce((sum, value) => sum + value, 0) / samples.length : 0;
    const fps = averageFrameMs ? 1000 / averageFrameMs : 0;
    const info = this.renderer?.info;
    const texture = textureBytes(this.scene);
    const position = this.playerPosition?.clone?.() || this.playerPosition || null;
    const town = position ? worldRegistry.townAt(position) : null;
    const district = position ? worldRegistry.districtAt(position, town?.id || 'starter-town') : null;
    const metrics = {
      fps: Number(fps.toFixed(1)),
      frameMs: Number(averageFrameMs.toFixed(2)),
      drawCalls: info?.render?.calls || 0,
      triangles: info?.render?.triangles || 0,
      geometries: info?.memory?.geometries || 0,
      textures: info?.memory?.textures || texture.textures,
      textureMemoryMb: Number((texture.bytes / 1024 / 1024).toFixed(1)),
      loadedGlbs: assetRuntimeRegistry.snapshot().kinds?.model || 0,
      townId: town?.id || null,
      districtId: district?.id || null,
      player: position ? { x: Number(position.x.toFixed?.(2) ?? position.x), z: Number(position.z.toFixed?.(2) ?? position.z) } : null,
      streaming: this.streamingGrid?.snapshot?.() || null,
      preset: graphics.effectivePreset(),
      loading: loadingSnapshot(),
      assets: assetRuntimeRegistry.snapshot(),
      lifecycle: sceneLifecycle.snapshot(),
      pools: poolRegistry.snapshot(),
      world: worldRegistry.snapshot(),
      ...this.extra,
    };
    metrics.budget = performanceBudget(metrics.preset === 'custom' ? 'medium' : metrics.preset);
    metrics.violations = budgetViolations(metrics, metrics.preset === 'custom' ? 'medium' : metrics.preset);
    this.lastSnapshot = Object.freeze(metrics);
    return this.lastSnapshot;
  }

  report() {
    const snapshot = this.snapshot();
    console.table({
      fps: snapshot.fps,
      frameMs: snapshot.frameMs,
      drawCalls: snapshot.drawCalls,
      triangles: snapshot.triangles,
      textureMemoryMb: snapshot.textureMemoryMb,
      town: snapshot.townId,
      district: snapshot.districtId,
      preset: snapshot.preset,
      violations: snapshot.violations.length,
    });
    return snapshot;
  }

  text() { return JSON.stringify(this.snapshot(), null, 2); }

  async copy() {
    const text = this.text();
    try { await navigator.clipboard.writeText(text); return true; }
    catch { return false; }
  }
}

export const runtimeDiagnostics = new RuntimeDiagnostics();

if (typeof window !== 'undefined') {
  window.__ZW_RUNTIME_DIAGNOSTICS__ = runtimeDiagnostics;
  window.__ZW_RUNTIME_REPORT__ = () => runtimeDiagnostics.report();
  window.__ZW_COPY_RUNTIME_REPORT__ = () => runtimeDiagnostics.copy();
}
