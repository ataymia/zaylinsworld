// ───────────────────────────────────────────────────────────────────────────
//  loader.js — boot loading screen + per-scene asset preloading helper.
//
//  Goals:
//   • Show a branded loading screen immediately so the first paint isn't blank.
//   • Drive a progress bar from THREE.LoadingManager (HDRI, GLB, textures).
//   • Provide a tiny scene registry so areas (city, frostbox, dealership, home,
//     garage, chicken spot, …) only preload what they need — interiors are
//     lazy-loaded on entry instead of all at startup.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';

const el = (id) => document.getElementById(id);

// Shared LoadingManager — pass this to GLTF/RGBE/Texture loaders to track
// real asset progress on the loading bar.
export const loadingManager = new THREE.LoadingManager();

let barFill = null, barLabel = null, screen = null;

export function initLoadingScreen() {
  screen = el('loading');
  barFill = el('load-bar-fill');
  barLabel = el('load-label');
  loadingManager.onProgress = (url, loaded, total) => {
    const pct = total ? Math.round((loaded / total) * 100) : 0;
    setProgress(pct, 'Loading assets…');
  };
}

export function setProgress(pct, label) {
  if (barFill) barFill.style.width = Math.max(0, Math.min(100, pct)) + '%';
  if (label && barLabel) barLabel.textContent = label;
}

export function setStatus(label) {
  if (barLabel) barLabel.textContent = label;
}

// Fade the loading screen out once the first real frame is ready.
export function hideLoadingScreen() {
  if (!screen) return;
  setProgress(100, 'Ready');
  screen.classList.add('done');
  setTimeout(() => { if (screen) screen.style.display = 'none'; }, 650);
}

export function showLoadingScreen(label = 'Loading…') {
  if (!screen) return;
  screen.style.display = '';
  screen.classList.remove('done');
  setProgress(8, label);
}

// ── per-scene asset map ───────────────────────────────────────────────────────
// Which interior/exterior scenes exist and (later) which .glb bundles they pull.
// Interiors are only built/loaded when the player actually enters them.
export const SCENES = {
  city:       { label: 'City Exterior', preload: ['environment'] },
  frostbox:   { label: 'Frostbox',      preload: [] },
  dealership: { label: 'Auto Haus',     preload: [] },
  chicken:    { label: 'Chicken Spot',  preload: [] },
  home:       { label: "Zaylin's Home", preload: [] },
  garage:     { label: 'Garage',        preload: [] },
  blocksupply:{ label: 'Block Supply',  preload: [] },
  kicks:      { label: 'Kicks & Fits',  preload: [] },
  monster:    { label: 'Monster Mode',  preload: [] },
};

// Track which scenes have already been built so we don't rebuild on re-entry.
const _builtScenes = new Set(['city']);
export function isSceneBuilt(id) { return _builtScenes.has(id); }
export function markSceneBuilt(id) { _builtScenes.add(id); }
