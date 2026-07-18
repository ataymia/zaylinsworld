// ───────────────────────────────────────────────────────────────────────────
// graphics.js — graphics, density, and adaptive performance settings.
//
// Auto begins conservatively, then watches measured FPS. Sustained low frame
// rate steps the session down one tier; sustained headroom may restore a tier up
// to the device-detected ceiling. Manual presets and custom settings are never
// overridden by the adaptive system.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';

const STORE_KEY = 'zaylinsworld.graphics.v1';
const AUTO_TIERS = Object.freeze(['low', 'medium', 'high']);

export const PRESETS = {
  low: {
    label: 'Low',
    renderScale: 0.7,
    maxPixelRatio: 1,
    antialias: false,
    shadows: false,
    shadowMapSize: 1024,
    anisotropy: 1,
    viewDistance: 130,
    fogScale: 0.62,
    npcDensity: 0.45,
    trafficDensity: 0.45,
    reflection: 0.45,
    effects: 0,
    interiorDetail: 0,
  },
  medium: {
    label: 'Medium',
    renderScale: 0.85,
    maxPixelRatio: 1.35,
    antialias: true,
    shadows: true,
    shadowMapSize: 1536,
    anisotropy: 4,
    viewDistance: 190,
    fogScale: 0.82,
    npcDensity: 0.72,
    trafficDensity: 0.72,
    reflection: 0.78,
    effects: 0.4,
    interiorDetail: 1,
  },
  high: {
    label: 'High',
    renderScale: 1,
    maxPixelRatio: 1.75,
    antialias: true,
    shadows: true,
    shadowMapSize: 2048,
    anisotropy: 8,
    viewDistance: 260,
    fogScale: 1,
    npcDensity: 1,
    trafficDensity: 1,
    reflection: 1,
    effects: 1,
    interiorDetail: 2,
  },
};

export const OPTION_DIMENSIONS = {
  shadowQuality:    { label: 'Shadow Quality',     steps: ['Off', 'Low', 'Medium', 'High'] },
  renderScale:      { label: 'Render Scale',        steps: ['70%', '85%', '100%'] },
  textureQuality:   { label: 'Texture Quality',     steps: ['Low', 'Medium', 'High'] },
  viewDistance:     { label: 'View Distance',       steps: ['Near', 'Medium', 'Far'] },
  npcDensity:       { label: 'NPC Density',         steps: ['Sparse', 'Normal', 'Busy'] },
  trafficDensity:   { label: 'Traffic Density',     steps: ['Sparse', 'Normal', 'Busy'] },
  reflectionQuality:{ label: 'Reflection Quality', steps: ['Low', 'Medium', 'High'] },
  antiAliasing:     { label: 'Anti-Aliasing',       steps: ['Off', 'On'] },
  effectsQuality:   { label: 'Effects Quality',     steps: ['Off', 'Medium', 'High'] },
  interiorDetail:   { label: 'Interior Detail',     steps: ['Low', 'Medium', 'High'] },
};

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function clockNow() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }

export function detectAutoPreset() {
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const win = typeof window !== 'undefined' ? window : {};
  const mem = nav.deviceMemory || 4;
  const cores = nav.hardwareConcurrency || 4;
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent || '');
  const dpr = win.devicePixelRatio || 1;

  let weakGPU = false;
  try {
    const gl = typeof document !== 'undefined' ? document.createElement('canvas').getContext('webgl') : null;
    const dbg = gl && gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = dbg ? (gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : '';
    weakGPU = /Intel|Mali|Adreno 5|Adreno 6|PowerVR|Apple GPU|SwiftShader|llvmpipe/i.test(renderer);
  } catch { /* best effort only */ }

  if (mobile || mem <= 3 || cores <= 3 || weakGPU) return 'low';
  // High is deliberately rare. Browser open worlds, shadows, a second creator
  // renderer, and high-DPI displays can overwhelm an otherwise decent laptop.
  if (mem >= 16 && cores >= 12 && !weakGPU && dpr <= 1.5) return 'high';
  return 'medium';
}

class GraphicsSettings {
  constructor() {
    this.listeners = new Set();
    const saved = this._load();
    this.mode = saved?.mode || 'auto';
    this.autoCeiling = detectAutoPreset();
    this.autoResolved = this.autoCeiling;
    const base = this.mode === 'auto'
      ? this.autoResolved
      : (PRESETS[this.mode] ? this.mode : this.autoResolved);
    this.values = { ...PRESETS[base] };
    this.overrides = saved?.overrides || {};
    if (this.mode === 'custom' && saved?.overrides) Object.assign(this.values, saved.overrides);
    this.adaptive = {
      enabled: true,
      lastFps: null,
      lowSamples: 0,
      highSamples: 0,
      lastChangeAt: 0,
      changes: 0,
      reason: 'device-detection',
    };
  }

  _load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); }
    catch { return null; }
  }

  _save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ mode: this.mode, overrides: this.overrides }));
    } catch { /* storage full / private mode */ }
  }

  onChange(callback) { this.listeners.add(callback); return () => this.listeners.delete(callback); }
  _emit() { this.listeners.forEach((callback) => { try { callback(this.values); } catch (error) { console.warn(error); } }); }

  effectivePreset() {
    if (this.mode === 'auto') return this.autoResolved;
    if (this.mode === 'custom') return 'custom';
    return this.mode;
  }

  setPreset(mode) {
    this.mode = mode;
    this.overrides = {};
    if (mode === 'auto') this.autoResolved = this.autoCeiling;
    const base = mode === 'auto' ? this.autoResolved : (PRESETS[mode] ? mode : this.autoResolved);
    this.values = { ...PRESETS[base] };
    this.adaptive.lowSamples = 0;
    this.adaptive.highSamples = 0;
    this.adaptive.reason = mode === 'auto' ? 'auto-reset' : 'manual-preset';
    this._save();
    this._emit();
  }

  // Feed this a stable FPS sample about once per 0.5-1 second. Auto waits for
  // several consecutive bad samples before stepping down, and much longer before
  // stepping back up, preventing quality from seesawing every few seconds.
  adaptToFps(fps, timestamp = clockNow()) {
    const value = Number(fps);
    if (this.mode !== 'auto' || !this.adaptive.enabled || !Number.isFinite(value) || value <= 0 || value > 300) return false;
    this.adaptive.lastFps = value;
    const cooldown = timestamp - this.adaptive.lastChangeAt < 8000;
    const lowThreshold = this.autoResolved === 'high' ? 50 : 42;

    if (value < lowThreshold) {
      this.adaptive.lowSamples += 1;
      this.adaptive.highSamples = 0;
    } else if (value >= 57) {
      this.adaptive.highSamples += 1;
      this.adaptive.lowSamples = Math.max(0, this.adaptive.lowSamples - 1);
    } else {
      this.adaptive.lowSamples = Math.max(0, this.adaptive.lowSamples - 1);
      this.adaptive.highSamples = Math.max(0, this.adaptive.highSamples - 1);
    }

    if (cooldown) return false;
    const currentIndex = AUTO_TIERS.indexOf(this.autoResolved);
    const ceilingIndex = AUTO_TIERS.indexOf(this.autoCeiling);
    let nextIndex = currentIndex;
    let reason = '';

    if (this.adaptive.lowSamples >= 4 && currentIndex > 0) {
      nextIndex = currentIndex - 1;
      reason = `sustained-low-fps:${Math.round(value)}`;
    } else if (this.adaptive.highSamples >= 20 && currentIndex < ceilingIndex) {
      nextIndex = currentIndex + 1;
      reason = `sustained-headroom:${Math.round(value)}`;
    }

    if (nextIndex === currentIndex) return false;
    this.autoResolved = AUTO_TIERS[nextIndex];
    this.values = { ...PRESETS[this.autoResolved] };
    this.adaptive.lowSamples = 0;
    this.adaptive.highSamples = 0;
    this.adaptive.lastChangeAt = timestamp;
    this.adaptive.changes += 1;
    this.adaptive.reason = reason;
    this._emit();
    return true;
  }

  adaptiveSnapshot() {
    return Object.freeze({
      mode: this.mode,
      ceiling: this.autoCeiling,
      resolved: this.autoResolved,
      ...this.adaptive,
    });
  }

  setOption(dim, stepIndex) {
    const values = this.values;
    switch (dim) {
      case 'shadowQuality':
        values.shadows = stepIndex > 0;
        values.shadowMapSize = [1024, 1024, 1536, 2048][stepIndex] || 1536;
        break;
      case 'renderScale': values.renderScale = [0.7, 0.85, 1][stepIndex] ?? 1; break;
      case 'textureQuality': values.anisotropy = [1, 4, 8][stepIndex] ?? 4; break;
      case 'viewDistance':
        values.viewDistance = [130, 190, 260][stepIndex] ?? 190;
        values.fogScale = [0.62, 0.82, 1][stepIndex] ?? 0.82;
        break;
      case 'npcDensity': values.npcDensity = [0.45, 0.72, 1][stepIndex] ?? 0.72; break;
      case 'trafficDensity': values.trafficDensity = [0.45, 0.72, 1][stepIndex] ?? 0.72; break;
      case 'reflectionQuality': values.reflection = [0.45, 0.78, 1][stepIndex] ?? 0.78; break;
      case 'antiAliasing': values.antialias = stepIndex > 0; break;
      case 'effectsQuality': values.effects = [0, 0.4, 1][stepIndex] ?? 0.4; break;
      case 'interiorDetail': values.interiorDetail = clamp(stepIndex, 0, 2); break;
      default: return;
    }
    this.mode = 'custom';
    this.overrides = { ...this.values };
    this.adaptive.reason = 'manual-custom';
    this._save();
    this._emit();
  }

  optionIndex(dim) {
    const values = this.values;
    switch (dim) {
      case 'shadowQuality':
        if (!values.shadows) return 0;
        return values.shadowMapSize >= 2048 ? 3 : values.shadowMapSize >= 1536 ? 2 : 1;
      case 'renderScale': return values.renderScale >= 1 ? 2 : values.renderScale >= 0.85 ? 1 : 0;
      case 'textureQuality': return values.anisotropy >= 8 ? 2 : values.anisotropy >= 4 ? 1 : 0;
      case 'viewDistance': return values.viewDistance >= 250 ? 2 : values.viewDistance >= 180 ? 1 : 0;
      case 'npcDensity': return values.npcDensity >= 0.95 ? 2 : values.npcDensity >= 0.68 ? 1 : 0;
      case 'trafficDensity': return values.trafficDensity >= 0.95 ? 2 : values.trafficDensity >= 0.68 ? 1 : 0;
      case 'reflectionQuality': return values.reflection >= 0.95 ? 2 : values.reflection >= 0.72 ? 1 : 0;
      case 'antiAliasing': return values.antialias ? 1 : 0;
      case 'effectsQuality': return values.effects >= 0.9 ? 2 : values.effects >= 0.35 ? 1 : 0;
      case 'interiorDetail': return clamp(values.interiorDetail, 0, 2);
      default: return 0;
    }
  }

  rendererInitOptions() {
    return { antialias: !!this.values.antialias, powerPreference: 'high-performance' };
  }

  applyToRenderer(renderer) {
    const values = this.values;
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    const ratio = Math.min(dpr, values.maxPixelRatio) * values.renderScale;
    renderer.setPixelRatio(clamp(ratio, 0.5, 2));
    renderer.shadowMap.enabled = values.shadows;
    if (typeof window !== 'undefined') renderer.setSize(window.innerWidth, window.innerHeight);
  }

  applyToSun(sun) {
    const values = this.values;
    sun.castShadow = values.shadows;
    if (values.shadows) {
      const size = values.shadowMapSize;
      if (sun.shadow.mapSize.x !== size) {
        sun.shadow.mapSize.set(size, size);
        sun.shadow.map?.dispose();
        sun.shadow.map = null;
      }
    }
  }

  applyToScene(scene, renderer) {
    const values = this.values;
    const maxAniso = renderer.capabilities.getMaxAnisotropy?.() || 1;
    const anisotropy = Math.min(values.anisotropy, maxAniso);
    scene.traverse((object) => {
      if (!object.isMesh || !object.material) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if ('envMapIntensity' in material) material.envMapIntensity = values.reflection;
        for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap']) {
          const texture = material[key];
          if (texture && texture.anisotropy !== anisotropy) {
            texture.anisotropy = anisotropy;
            texture.needsUpdate = true;
          }
        }
      }
    });
  }

  fogRange(baseNear, baseFar) {
    const scale = this.values.fogScale;
    return { near: baseNear * scale, far: baseFar * scale };
  }

  get viewDistance() { return this.values.viewDistance; }
  get npcDensity() { return this.values.npcDensity; }
  get trafficDensity() { return this.values.trafficDensity; }
  get effects() { return this.values.effects; }
  get interiorDetail() { return this.values.interiorDetail; }
}

export const graphics = new GraphicsSettings();
