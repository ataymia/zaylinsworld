// ───────────────────────────────────────────────────────────────────────────
// loader.js — real boot/world readiness gate + per-scene preload registry.
//
// Critical assets hold the gate until they settle. Optional work must use the
// background manager. A watchdog guarantees that one stalled request can never
// imprison the player behind the loading screen forever.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';

const el = (id) => document.getElementById(id);
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const nextFrame = () => new Promise((resolve) => {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(resolve);
  else setTimeout(resolve, 16);
});

export const loadingManager = new THREE.LoadingManager();
export const backgroundLoadingManager = new THREE.LoadingManager();

let barFill = null;
let barLabel = null;
let screen = null;
let sessionId = 0;
let sessionStartedAt = now();
let minimumVisibleMs = 900;
let settleMs = 360;
let maximumWaitMs = 12000;
let revealRequested = false;
let revealRequestedAt = 0;
let revealTimer = null;
let watchdogTimer = null;
let lastActivityAt = sessionStartedAt;
let managerLoaded = 0;
let managerTotal = 0;
let managerActive = 0;
let progressFloor = 0;
let currentLabel = 'Loading…';
let errors = [];
let hidden = false;
let forcedReveal = false;
let manualToken = 0;
const activeItems = new Map();

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function activeItemCount() {
  let count = 0;
  for (const record of activeItems.values()) count += record.count;
  return count;
}
function activeItemList() {
  return [...activeItems.entries()].map(([url, record]) => ({
    url,
    count: record.count,
    ageMs: Math.round(now() - record.startedAt),
  }));
}
function trackItemStart(url) {
  const key = String(url || 'unknown asset');
  const record = activeItems.get(key);
  if (record) record.count += 1;
  else activeItems.set(key, { count: 1, startedAt: now() });
  managerActive = activeItemCount();
}
function trackItemEnd(url) {
  const key = String(url || 'unknown asset');
  const record = activeItems.get(key);
  if (!record) return;
  record.count -= 1;
  if (record.count <= 0) activeItems.delete(key);
  managerActive = activeItemCount();
}

// Wrap LoadingManager's item accounting so the debug report can identify the
// exact URL that is still active instead of merely saying “one item remaining.”
const originalItemStart = loadingManager.itemStart.bind(loadingManager);
const originalItemEnd = loadingManager.itemEnd.bind(loadingManager);
const originalItemError = loadingManager.itemError.bind(loadingManager);
loadingManager.itemStart = (url) => {
  trackItemStart(url);
  return originalItemStart(url);
};
loadingManager.itemEnd = (url) => {
  trackItemEnd(url);
  return originalItemEnd(url);
};
loadingManager.itemError = (url) => {
  const text = String(url || 'unknown asset');
  if (!errors.includes(text)) errors.push(text);
  return originalItemError(url);
};

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
function clearRevealTimers() {
  if (revealTimer) clearTimeout(revealTimer);
  if (watchdogTimer) clearTimeout(watchdogTimer);
  revealTimer = null;
  watchdogTimer = null;
}
function noteActivity() {
  lastActivityAt = now();
  if (revealTimer) clearTimeout(revealTimer);
  revealTimer = null;
}

function completeReveal(expectedSession, { forced = false, reason = '' } = {}) {
  if (expectedSession !== sessionId || hidden || !revealRequested) return false;
  clearRevealTimers();
  forcedReveal = forced;
  if (forced) {
    const stuck = activeItemList();
    if (stuck.length) {
      for (const item of stuck) {
        const message = `background:${item.url}`;
        if (!errors.includes(message)) errors.push(message);
      }
      console.warn('[loader] entering with background assets still active', { reason, stuck });
    }
  }
  progressFloor = 100;
  currentLabel = forced || errors.length ? 'Ready with fallbacks' : 'Ready';
  if (barFill) barFill.style.width = '100%';
  if (barLabel) barLabel.textContent = currentLabel;
  screen?.classList.add('done');
  hidden = true;
  setTimeout(() => {
    if (screen && expectedSession === sessionId) screen.style.display = 'none';
  }, 650);
  return true;
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
  completeReveal(expectedSession);
}

function armWatchdog(expectedSession) {
  if (watchdogTimer) clearTimeout(watchdogTimer);
  const elapsedSinceRequest = Math.max(0, now() - revealRequestedAt);
  const remaining = Math.max(0, maximumWaitMs - elapsedSinceRequest);
  watchdogTimer = setTimeout(() => {
    if (expectedSession !== sessionId || hidden || !revealRequested) return;
    completeReveal(expectedSession, { forced: true, reason: 'maximum-wait-exceeded' });
  }, remaining + 16);
}

function maybeReveal() {
  if (!revealRequested || hidden) return;
  if (managerActive > 0) {
    armWatchdog(sessionId);
    return;
  }
  finishReveal(sessionId);
}

// Attach callbacks immediately, not in initLoadingScreen(). ESM imports can start
// asset work before main.js reaches the DOM initializer, and those early tasks
// must still count toward the real readiness gate.
loadingManager.onStart = (_url, loaded, total) => {
  managerLoaded = loaded || 0;
  managerTotal = Math.max(total || 1, managerTotal);
  managerActive = activeItemCount();
  hidden = false;
  noteActivity();
  paint();
};
loadingManager.onProgress = (_url, loaded, total) => {
  managerLoaded = loaded || managerLoaded;
  managerTotal = Math.max(total || 0, managerTotal);
  managerActive = activeItemCount();
  noteActivity();
  paint();
};
loadingManager.onLoad = () => {
  managerLoaded = Math.max(managerLoaded, managerTotal);
  managerActive = activeItemCount();
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

// Optional loads never hold or reopen the main gate. Failures are logged because
// the procedural sky/placeholders remain valid gameplay fallbacks.
backgroundLoadingManager.onError = (url) => {
  console.warn('[loader] optional background asset failed', url);
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
  if (!hidden) noteActivity();
  paint();
}

export function setStatus(label, options = {}) {
  if (label) currentLabel = label;
  // Background asset work must not resurrect a loading screen the player has
  // already cleared. Scene transitions should call showLoadingScreen explicitly.
  if (hidden || screen?.style.display === 'none') {
    if (options.showIfHidden) showLoadingScreen(label || 'Loading…', options);
    return;
  }
  noteActivity();
  paint();
}

export function hideLoadingScreen(options = {}) {
  revealRequested = true;
  revealRequestedAt = now();
  maximumWaitMs = Math.max(2500, Number(options.maxWaitMs) || maximumWaitMs || 12000);
  progressFloor = Math.max(progressFloor, 92);
  currentLabel = managerActive > 0 ? 'Finishing the world…' : 'Final checks…';
  paint();
  armWatchdog(sessionId);
  maybeReveal();
}

export function forceRevealLoadingScreen(reason = 'manual-fallback') {
  revealRequested = true;
  revealRequestedAt = revealRequestedAt || now();
  return completeReveal(sessionId, { forced: true, reason });
}

export function showLoadingScreen(label = 'Loading…', options = {}) {
  sessionId += 1;
  sessionStartedAt = now();
  lastActivityAt = sessionStartedAt;
  minimumVisibleMs = Math.max(0, Number(options.minVisibleMs) || 900);
  settleMs = Math.max(80, Number(options.settleMs) || 360);
  maximumWaitMs = Math.max(2500, Number(options.maxWaitMs) || 12000);
  revealRequested = false;
  revealRequestedAt = 0;
  hidden = false;
  forcedReveal = false;
  errors = [];
  progressFloor = clamp(Number(options.initialProgress) || 8, 0, 90);
  currentLabel = label;
  clearRevealTimers();
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
    activeItems: activeItemList(),
    revealRequested,
    revealRequestedAt,
    maximumWaitMs,
    hidden,
    forcedReveal,
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
