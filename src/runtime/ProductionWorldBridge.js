// ─────────────────────────────────────────────────────────────────────────────
// ProductionWorldBridge.js — connects the Phase 2–6 Starter Town skeleton to the
// normal Character Studio → gameplay flow without touching the player's save.
//
// The large skeleton is prepared quietly while the player customizes their look.
// Enter/Continue then shows the real loader, waits for the prepared world, attaches
// it to the actual gameplay scene, and allows the existing compact functional core
// to initialize inside the larger city. Functional-location relocation remains a
// later phase, so this compatibility build stays flat and drivable while its
// parcel surfaces, real prop assets, landscaping, and road dressing are visible.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { buildLargeStarterTown } from '../world/LargeStarterTown.js';
import { functionalLocationRelocation } from './FunctionalLocationRelocation.js';
import {
  hideLoadingScreen,
  setProgress,
  showLoadingScreen,
  trackLoadingPromise,
} from '../loader.js';

const flatHeight = () => 0;
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const ACTIVE_FUNCTIONAL_RELOCATIONS = Object.freeze([
  'zaylins-home',
  'zaylins-prep',
  'chicken-spot',
  'frostbox',
  'kicks-fits',
  'block-supply',
  'auto-haus',
  'city-garage',
  'police-station',
  'worktower',
  'iron-city-gym',
  '6twelve',
  'dreamdrop-park',
]);

const bridge = {
  installed: false,
  scene: null,
  prepared: null,
  preparePromise: null,
  attached: false,
  entering: false,
  startedAt: 0,
  preparedAt: 0,
  attachedAt: 0,
  lastError: null,
};

function setCreatorPreloadStatus(text, ready = false) {
  const row = document.querySelector('#creator-left .btn-row');
  if (!row) return;
  let badge = document.getElementById('starter-town-preload-status');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'starter-town-preload-status';
    badge.style.cssText = [
      'flex:1 0 100%',
      'font-size:11px',
      'line-height:1.35',
      'color:#8f9bb0',
      'padding:2px 4px 0',
    ].join(';');
    row.appendChild(badge);
  }
  badge.textContent = text;
  badge.style.color = ready ? '#72d99d' : '#8f9bb0';
}

function captureGameplayScene() {
  if (THREE.Scene.prototype.__zwProductionWorldBridgePatched) return;
  const originalAdd = THREE.Scene.prototype.add;
  THREE.Scene.prototype.add = function patchedSceneAdd(...objects) {
    const result = originalAdd.apply(this, objects);
    // main.js adds its gameplay camera to the authoritative scene. Character
    // preview scenes do not add their cameras, making this a stable discriminator.
    if (!bridge.scene && objects.some((object) => object?.isCamera)) {
      bridge.scene = this;
      this.userData.productionGameplayScene = true;
    }
    return result;
  };
  THREE.Scene.prototype.__zwProductionWorldBridgePatched = true;
}

export function beginProductionWorldPreload() {
  if (bridge.prepared) return Promise.resolve(bridge.prepared);
  if (bridge.preparePromise) return bridge.preparePromise;

  bridge.startedAt = performance.now();
  setCreatorPreloadStatus('Starter Town is loading quietly while you customize…');
  bridge.preparePromise = buildLargeStarterTown({
    renderer: null,
    placeReadyAssets: true,
    showDistricts: false,
    includeMassing: true,
    includeStreetscape: true,
    includeGeneratedRoadside: true,
    includeGroundCover: true,
    includeBuildingAssets: true,
    includeSpecialRoadForms: false,
    heightAt: flatHeight,
    compatibilityMode: true,
  }).then((built) => {
    built.group.name = 'ZW_ProductionLargeStarterTown';
    built.group.userData.productionBridge = true;
    built.group.userData.compatibilityFlat = true;
    bridge.prepared = built;
    bridge.preparedAt = performance.now();
    setCreatorPreloadStatus('Starter Town ready. Enter whenever your look is finished.', true);
    return built;
  }).catch((error) => {
    bridge.lastError = error;
    bridge.preparePromise = null;
    setCreatorPreloadStatus('Starter Town will finish loading when you enter.');
    throw error;
  });
  return bridge.preparePromise;
}

export async function ensureProductionWorldReady() {
  return bridge.prepared || beginProductionWorldPreload();
}

export function attachPreparedProductionWorld(scene = bridge.scene) {
  if (!scene || !bridge.prepared?.group) return null;
  const existing = scene.getObjectByName('ZW_ProductionLargeStarterTown');
  if (existing) {
    bridge.attached = true;
    return existing;
  }
  scene.add(bridge.prepared.group);
  bridge.attached = true;
  bridge.attachedAt = performance.now();
  return bridge.prepared.group;
}

export function productionWorldRelocationIds() {
  return bridge.attached ? ACTIVE_FUNCTIONAL_RELOCATIONS : [];
}

function isWardrobeReturn() {
  try {
    return bridge.attached && !!window.ZW?.state?.()?.createdCharacter;
  } catch {
    return false;
  }
}

async function waitForCreatorToClose(maxFrames = 90) {
  for (let frame = 0; frame < maxFrames; frame++) {
    const creator = document.getElementById('creator');
    if (creator?.classList.contains('hidden')) return true;
    await nextFrame();
  }
  return false;
}

function dispatchPreparedCreatorClick(button) {
  // Browsers intentionally suppress click() on disabled controls. Re-enable only
  // for the guarded redispatch; bridge.entering still prevents a second user entry.
  button.disabled = false;
  button.dataset.zwWorldBridgeBypass = '1';
  button.click();
  delete button.dataset.zwWorldBridgeBypass;
}

async function enterThroughBridge(button) {
  if (bridge.entering) return;
  bridge.entering = true;
  const originalText = button.textContent;
  button.disabled = true;

  const alreadyPrepared = !!bridge.prepared;
  showLoadingScreen('Entering Starter Town…', {
    initialProgress: alreadyPrepared ? 62 : 18,
    minVisibleMs: 850,
    settleMs: 240,
    maxWaitMs: 12000,
  });

  try {
    const built = await trackLoadingPromise(
      ensureProductionWorldReady(),
      alreadyPrepared ? 'Checking roads and districts…' : 'Building roads and districts…',
    );
    setProgress(72, 'Opening the large Starter Town…');
    attachPreparedProductionWorld();
    setProgress(84, 'Starting people, traffic, shops, and missions…');

    // Re-dispatch the click after preparation. The bypass flag lets the existing
    // Character Studio handler run normally instead of being intercepted twice.
    dispatchPreparedCreatorClick(button);

    await waitForCreatorToClose();
    await nextFrame();
    await nextFrame();
    setProgress(97, built ? 'Finalizing your arrival…' : 'Entering with fallbacks…');
    hideLoadingScreen({ maxWaitMs: 8000 });
  } catch (error) {
    bridge.lastError = error;
    console.warn('[production-world-bridge] large Starter Town preload failed; using compact fallback', error);
    setProgress(88, 'Large-town fallback active. Starting the city…');
    dispatchPreparedCreatorClick(button);
    await nextFrame();
    hideLoadingScreen({ maxWaitMs: 4500 });
  } finally {
    button.disabled = false;
    button.textContent = originalText;
    bridge.entering = false;
  }
}

function interceptCreatorEntry(event) {
  const button = event.currentTarget;
  if (button.dataset.zwWorldBridgeBypass === '1' || isWardrobeReturn()) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  enterThroughBridge(button);
}

function bindCreatorEntry() {
  for (const id of ['creator-enter', 'creator-continue']) {
    const button = document.getElementById(id);
    if (!button || button.dataset.zwWorldBridgeBound === '1') continue;
    button.dataset.zwWorldBridgeBound = '1';
    button.addEventListener('click', interceptCreatorEntry, true);
  }
}

function scheduleQuietPreload() {
  const run = () => beginProductionWorldPreload().catch(() => {});
  if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 1400 });
  else setTimeout(run, 350);
}

export function installProductionWorldBridge() {
  if (bridge.installed) return bridge;
  bridge.installed = true;
  captureGameplayScene();
  bindCreatorEntry();
  scheduleQuietPreload();
  return bridge;
}

export function productionWorldBridgeSnapshot() {
  return Object.freeze({
    installed: bridge.installed,
    sceneCaptured: !!bridge.scene,
    preparing: !!bridge.preparePromise && !bridge.prepared,
    prepared: !!bridge.prepared,
    attached: bridge.attached,
    entering: bridge.entering,
    preloadMs: bridge.preparedAt && bridge.startedAt ? Math.round(bridge.preparedAt - bridge.startedAt) : null,
    lastError: bridge.lastError?.message || null,
    activeRelocations: productionWorldRelocationIds(),
    relocation: functionalLocationRelocation.snapshot(),
  });
}

if (typeof window !== 'undefined') {
  window.__ZW_PRODUCTION_WORLD_BRIDGE__ = bridge;
  window.__ZW_PRODUCTION_WORLD_REPORT__ = productionWorldBridgeSnapshot;
}

export default installProductionWorldBridge;
