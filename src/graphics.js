// ───────────────────────────────────────────────────────────────────────────
//  graphics.js — graphics & performance settings (Low / Medium / High / Auto)
//
//  Central place that decides HOW pretty vs HOW fast the game renders. Every
//  performance-sensitive system reads from here:
//    • renderer  → render scale (pixel ratio), antialiasing, tone mapping
//    • shadows   → enabled, shadow-map resolution
//    • textures  → anisotropic filtering level
//    • world     → view distance (camera far + fog), NPC / traffic density
//    • materials → reflection (envMap) intensity
//    • effects   → bloom / post intensity, interior detail level
//
//  Settings persist to localStorage. "Auto" benchmarks the device once and
//  picks a safe preset so the game never lags badly out of the box.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';

const STORE_KEY = 'zaylinsworld.graphics.v1';

// Concrete tunables each preset resolves to. Keep these conservative so even
// "high" stays smooth on a normal laptop GPU inside a browser tab.
export const PRESETS = {
  low: {
    label: 'Low',
    renderScale: 0.7,      // internal resolution multiplier
    maxPixelRatio: 1,
    antialias: false,
    shadows: false,
    shadowMapSize: 1024,
    anisotropy: 1,         // texture quality
    viewDistance: 130,     // camera far / fog far baseline (meters)
    fogScale: 0.62,
    npcDensity: 0.45,      // multiplier on city NPC count
    trafficDensity: 0.45,  // multiplier on traffic count
    reflection: 0.45,      // envMap intensity
    effects: 0.0,          // bloom / extras
    interiorDetail: 0,     // 0 minimal · 1 normal · 2 rich
  },
  medium: {
    label: 'Medium',
    renderScale: 0.9,
    maxPixelRatio: 1.5,
    antialias: true,
    shadows: true,
    shadowMapSize: 1536,
    anisotropy: 4,
    viewDistance: 200,
    fogScale: 0.85,
    npcDensity: 0.8,
    trafficDensity: 0.8,
    reflection: 0.85,
    effects: 0.5,
    interiorDetail: 1,
  },
  high: {
    label: 'High',
    renderScale: 1.0,
    maxPixelRatio: 2,
    antialias: true,
    shadows: true,
    shadowMapSize: 2048,
    anisotropy: 8,
    viewDistance: 280,
    fogScale: 1.0,
    npcDensity: 1.0,
    trafficDensity: 1.0,
    reflection: 1.0,
    effects: 1.0,
    interiorDetail: 2,
  },
};

// Individual override dimensions the settings menu can tweak on top of a preset.
export const OPTION_DIMENSIONS = {
  shadowQuality:   { label: 'Shadow Quality',    steps: ['Off', 'Low', 'Medium', 'High'] },
  renderScale:     { label: 'Render Scale',       steps: ['70%', '85%', '100%'] },
  textureQuality:  { label: 'Texture Quality',    steps: ['Low', 'Medium', 'High'] },
  viewDistance:    { label: 'View Distance',       steps: ['Near', 'Medium', 'Far'] },
  npcDensity:      { label: 'NPC Density',         steps: ['Sparse', 'Normal', 'Busy'] },
  trafficDensity:  { label: 'Traffic Density',     steps: ['Sparse', 'Normal', 'Busy'] },
  reflectionQuality:{ label: 'Reflection Quality', steps: ['Low', 'Medium', 'High'] },
  antiAliasing:    { label: 'Anti-Aliasing',       steps: ['Off', 'On'] },
  effectsQuality:  { label: 'Effects Quality',     steps: ['Off', 'Medium', 'High'] },
  interiorDetail:  { label: 'Interior Detail',     steps: ['Low', 'Medium', 'High'] },
};

// ── auto detection ────────────────────────────────────────────────────────────
// Pick a safe preset from device hints. Cheap and synchronous so it can run
// before the renderer is even built.
export function detectAutoPreset() {
  const mem = navigator.deviceMemory || 4;            // GB (Chrome only; default mid)
  const cores = navigator.hardwareConcurrency || 4;
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const dpr = window.devicePixelRatio || 1;

  // GPU sniff via WebGL renderer string (best-effort).
  let weakGPU = false;
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    const dbg = gl && gl.getExtension('WEBGL_debug_renderer_info');
    const r = dbg ? (gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : '';
    weakGPU = /Intel|Mali|Adreno 5|Adreno 6|PowerVR|Apple GPU|SwiftShader|llvmpipe/i.test(r);
  } catch { /* ignore */ }

  if (mobile || mem <= 2 || cores <= 2) return 'low';
  if (mem >= 8 && cores >= 8 && !weakGPU && dpr <= 2) return 'high';
  return 'medium';
}

// ── settings model ────────────────────────────────────────────────────────────
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

class GraphicsSettings {
  constructor() {
    this.listeners = new Set();
    const saved = this._load();
    this.mode = saved?.mode || 'auto';          // 'auto' | 'low' | 'medium' | 'high' | 'custom'
    this.autoResolved = detectAutoPreset();
    // The base preset values currently active.
    this.values = { ...PRESETS[this.mode === 'auto' ? this.autoResolved : (PRESETS[this.mode] ? this.mode : this.autoResolved)] };
    // Apply any saved custom overrides on top.
    if (saved?.overrides) Object.assign(this.values, saved.overrides);
    this.overrides = saved?.overrides || {};
  }

  _load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); }
    catch { return null; }
  }
  _save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ mode: this.mode, overrides: this.overrides }));
    } catch { /* storage full / private mode — ignore */ }
  }

  onChange(cb) { this.listeners.add(cb); return () => this.listeners.delete(cb); }
  _emit() { this.listeners.forEach(cb => { try { cb(this.values); } catch (e) { console.warn(e); } }); }

  /** Active preset key actually in effect (auto resolves to its detected tier). */
  effectivePreset() {
    if (this.mode === 'auto') return this.autoResolved;
    if (this.mode === 'custom') return 'custom';
    return this.mode;
  }

  /** Switch to one of the named presets (or 'auto'). Clears manual overrides. */
  setPreset(mode) {
    this.mode = mode;
    this.overrides = {};
    const base = mode === 'auto' ? this.autoResolved : (PRESETS[mode] ? mode : this.autoResolved);
    this.values = { ...PRESETS[base] };
    this._save();
    this._emit();
  }

  /** Tweak a single dimension by step index → moves the mode to 'custom'. */
  setOption(dim, stepIndex) {
    const v = this.values;
    switch (dim) {
      case 'shadowQuality':
        v.shadows = stepIndex > 0;
        v.shadowMapSize = [1024, 1024, 1536, 2048][stepIndex] || 1536;
        break;
      case 'renderScale':   v.renderScale = [0.7, 0.85, 1.0][stepIndex] ?? 1.0; break;
      case 'textureQuality':v.anisotropy = [1, 4, 8][stepIndex] ?? 4; break;
      case 'viewDistance':  v.viewDistance = [130, 200, 280][stepIndex] ?? 200; v.fogScale = [0.62, 0.85, 1.0][stepIndex] ?? 0.85; break;
      case 'npcDensity':    v.npcDensity = [0.45, 0.8, 1.0][stepIndex] ?? 0.8; break;
      case 'trafficDensity':v.trafficDensity = [0.45, 0.8, 1.0][stepIndex] ?? 0.8; break;
      case 'reflectionQuality': v.reflection = [0.45, 0.85, 1.0][stepIndex] ?? 0.85; break;
      case 'antiAliasing':  v.antialias = stepIndex > 0; break;
      case 'effectsQuality':v.effects = [0.0, 0.5, 1.0][stepIndex] ?? 0.5; break;
      case 'interiorDetail':v.interiorDetail = clamp(stepIndex, 0, 2); break;
      default: return;
    }
    this.mode = 'custom';
    this.overrides = { ...this.values };
    this._save();
    this._emit();
  }

  /** Current step index for a dimension, for highlighting the UI. */
  optionIndex(dim) {
    const v = this.values;
    switch (dim) {
      case 'shadowQuality':
        if (!v.shadows) return 0;
        return v.shadowMapSize >= 2048 ? 3 : v.shadowMapSize >= 1536 ? 2 : 1;
      case 'renderScale':    return v.renderScale >= 1 ? 2 : v.renderScale >= 0.85 ? 1 : 0;
      case 'textureQuality': return v.anisotropy >= 8 ? 2 : v.anisotropy >= 4 ? 1 : 0;
      case 'viewDistance':   return v.viewDistance >= 280 ? 2 : v.viewDistance >= 200 ? 1 : 0;
      case 'npcDensity':     return v.npcDensity >= 1 ? 2 : v.npcDensity >= 0.8 ? 1 : 0;
      case 'trafficDensity': return v.trafficDensity >= 1 ? 2 : v.trafficDensity >= 0.8 ? 1 : 0;
      case 'reflectionQuality': return v.reflection >= 1 ? 2 : v.reflection >= 0.85 ? 1 : 0;
      case 'antiAliasing':   return v.antialias ? 1 : 0;
      case 'effectsQuality': return v.effects >= 1 ? 2 : v.effects >= 0.5 ? 1 : 0;
      case 'interiorDetail': return clamp(v.interiorDetail, 0, 2);
      default: return 0;
    }
  }

  // ── appliers ────────────────────────────────────────────────────────────────
  /** Renderer options that can only be set at construction time. */
  rendererInitOptions() {
    return { antialias: !!this.values.antialias, powerPreference: 'high-performance' };
  }

  /** Apply render-scale / tone settings to a live renderer + size it. */
  applyToRenderer(renderer) {
    const v = this.values;
    const ratio = Math.min(window.devicePixelRatio || 1, v.maxPixelRatio) * v.renderScale;
    renderer.setPixelRatio(clamp(ratio, 0.5, 3));
    renderer.shadowMap.enabled = v.shadows;
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /** Configure a directional light's shadow camera/map for current quality. */
  applyToSun(sun) {
    const v = this.values;
    sun.castShadow = v.shadows;
    if (v.shadows) {
      const s = v.shadowMapSize;
      if (sun.shadow.mapSize.x !== s) {
        sun.shadow.mapSize.set(s, s);
        sun.shadow.map?.dispose();
        sun.shadow.map = null;        // force re-alloc at new resolution
      }
    }
  }

  /** Push reflection (envMap) + texture-filtering quality across the scene. */
  applyToScene(scene, renderer) {
    const v = this.values;
    const maxAniso = renderer.capabilities.getMaxAnisotropy?.() || 1;
    const aniso = Math.min(v.anisotropy, maxAniso);
    scene.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if ('envMapIntensity' in m) {
          // keep emissive/neon untouched, scale reflective surfaces
          m.envMapIntensity = v.reflection;
        }
        for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap']) {
          const tex = m[key];
          if (tex && tex.anisotropy !== aniso) { tex.anisotropy = aniso; tex.needsUpdate = true; }
        }
      }
    });
  }

  /** Fog far/near scaled to the chosen view distance. Returns {near, far}. */
  fogRange(baseNear, baseFar) {
    const s = this.values.fogScale;
    return { near: baseNear * s, far: baseFar * s };
  }

  get viewDistance() { return this.values.viewDistance; }
  get npcDensity()   { return this.values.npcDensity; }
  get trafficDensity() { return this.values.trafficDensity; }
  get effects()      { return this.values.effects; }
  get interiorDetail() { return this.values.interiorDetail; }
}

// Singleton — created synchronously so it's ready before the renderer.
export const graphics = new GraphicsSettings();
