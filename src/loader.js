// ───────────────────────────────────────────────────────────────────────────
// loader.js — real boot/world readiness gate + per-scene preload registry.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';

const el = (id) => document.getElementById(id);
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const nextFrame = () => new Promise((resolve) => {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(resolve);
  else setTimeout(resolve, 16);
});

export const loadingManager = new THREE.LoadingManager();

let barFill = null;
let barLabel = null;
let screen = null;
let sessionId = 0;
let sessionStartedAt = now();
let minimumVisibleMs = 900;
let settleMs = 360;
let revealRequested = false;
let revealTimer = null;
let lastActivityAt = sessionStartedAt;
let managerLoaded = 0;
let managerTotal = 0;
let managerActive = 0;
let progressFloor = 0;
let currentLabel = 'Loading…';
let errors = [];
let hidden = false;
let manualToken = 0;

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function managerPercent() {
  if (!managerTotal) return managerActive ? 0 : 1;
  return clamp(managerLoaded / managerTotal, 0, 1);
}
function displayPercent() {
  const tracked = managerTotal ? 8 + managerPercent() * 87 : progressFloor;
  return Math.round(clamp(Math.max(progressFloor, tracked), 0, revealRequested ? 99 : 96));
}
function paint() {
  if (barFill) barFill.style.width = `${displayPercent()}%`;
  if (barLabel) barLabel.textContent = currentLabel;
}
function noteActivity() {
  lastActivityAt = now();
  if (revealTimer) clearTimeout(revealTimer);
  revealTimer = null;
}

async function finishReveal(expectedSession) {
  if (expectedSession !== sessionId || hidden || !revealRequested || managerActive > 0) return;
  const elapsed = now() - sessionStartedAt;
  const quiet = now() - lastActivityAt;
  const wait = Math.max(0, minimumVisibleMs - elapsed, settleMs - quiet);
  if (wait > 0) {
    revealTimer = setTimeout(() => finishReveal(expectedSession), wait + 16);
    return;
  }
  await nextFrame();
  await nextFrame();
  if (expectedSession !== sessionId || hidden || managerActive > 0) return;
  progressFloor = 100;
  currentLabel = errors.length ? 'Ready with fallbacks' : 'Ready';
  if (barFill) barFill.style.width = '100%';
  if (barLabel) barLabel.textContent = currentLabel;
  screen?.classList.add('done');
  hidden = true;
  setTimeout(() => {
    if (screen && expectedSession === sessionId) screen.style.display = 'none';
  }, 650);
}
function maybeReveal() {
  if (!revealRequested || hidden || managerActive > 0) return;
  finishReveal(sessionId);
}

// Attach callbacks immediately, not in initLoadingScreen(). ESM imports can start
// asset work before main.js reaches the DOM initializer, and those early tasks
// must still count toward the real readiness gate.
loadingManager.onStart = (_url, loaded, total) => {
  if (managerActive === 0) {
    managerLoaded = loaded || 0;
    managerTotal = total || 1;
  } else {
    managerTotal = Math.max(managerTotal, total || managerTotal);
  }
  managerActive = Math.max(1, managerTotal - managerLoaded);
  hidden = false;
  noteActivity();
  paint();
};
loadingManager.onProgress = (_url, loaded, total) => {
  managerLoaded = loaded || managerLoaded;
  managerTotal = Math.max(total || 0, managerTotal);
  managerActive = Math.max(0, managerTotal - managerLoaded);
  noteActivity();
  paint();
};
loadingManager.onLoad = () => {
  managerLoaded = Math.max(managerLoaded, managerTotal);
  managerActive = 0;
  noteActivity();
  paint();
  maybeReveal();
};
loadingManager.onError = (url) => {
  const text = String(url || 'unknown asset');
  if (!errors.includes(text)) errors.push(text);
  noteActivity();
  currentLabel = 'Loading with a fallback…';
  paint();
};

export function initLoadingScreen() {
  screen = el('loading');
  barFill = el('load-bar-fill');
  barLabel = el('load-label');
  paint();
}

export function setProgress(pct, label) {
  progressFloor = clamp(Number(pct) || 0, 0, 100);
  if (label) currentLabel = label;
  noteActivity();
  paint();
}

export function setStatus(label) {
  if (label) currentLabel = label;
  if (hidden || screen?.style.display === 'none') {
    showLoadingScreen(label || 'Loading…', { minVisibleMs: 1100, settleMs: 420 });
    return;
  }
  noteActivity();
  paint();
}

export function hideLoadingScreen() {
  revealRequested = true;
  progressFloor = Math.max(progressFloor, 92);
  currentLabel = managerActive > 0 ? 'Finishing the world…' : 'Final checks…';
  paint();
  maybeReveal();
}

export function showLoadingScreen(label = 'Loading…', options = {}) {
  sessionId += 1;
  sessionStartedAt = now();
  lastActivityAt = sessionStartedAt;
  minimumVisibleMs = Math.max(0, Number(options.minVisibleMs) || 900);
  settleMs = Math.max(80, Number(options.settleMs) || 360);
  revealRequested = false;
  hidden = false;
  errors = [];
  progressFloor = clamp(Number(options.initialProgress) || 8, 0, 90);
  currentLabel = label;
  if (revealTimer) clearTimeout(revealTimer);
  revealTimer = null;
  if (screen) {
    screen.style.display = '';
    screen.classList.remove('done');
  }
  paint();
}

export function trackLoadingPromise(promise, label = 'Loading game data…') {
  const token = `manual:${++manualToken}:${label}`;
  loadingManager.itemStart(token);
  if (label) setStatus(label);
  return Promise.resolve(promise)
    .catch((error) => {
      loadingManager.itemError(token);
      throw error;
    })
    .finally(() => loadingManager.itemEnd(token));
}

export function trackLoadingFetch(url, init, label = 'Loading game data…') {
  return trackLoadingPromise(
    fetch(url, init).then((response) => {
      if (!response.ok) throw new Error(`${url} returned ${response.status}`);
      return response;
    }),
    label,
  );
}

export function loadingSnapshot() {
  return Object.freeze({
    sessionId,
    label: currentLabel,
    progress: displayPercent(),
    loaded: managerLoaded,
    total: managerTotal,
    active: managerActive,
    revealRequested,
    hidden,
    elapsedMs: Math.round(now() - sessionStartedAt),
    errors: [...errors],
  });
}

export const SCENES = {
  city:        { label: 'City Exterior', preload: ['environment', 'player', 'world-index'] },
  frostbox:    { label: 'Frostbox', preload: [] },
  dealership:  { label: 'Auto Haus', preload: [] },
  chicken:     { label: 'Chicken Spot', preload: [] },
  home:        { label: "Zaylin's Home", preload: [] },
  garage:      { label: 'Garage', preload: [] },
  blocksupply: { label: 'Block Supply', preload: [] },
  kicks:       { label: 'Kicks & Fits', preload: [] },
  monster:     { label: 'Monster Mode', preload: [] },
};
const builtScenes = new Set(['city']);
export function isSceneBuilt(id) { return builtScenes.has(id); }
export function markSceneBuilt(id) { builtScenes.add(id); }
