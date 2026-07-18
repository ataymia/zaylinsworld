// ─────────────────────────────────────────────────────────────────────────────
// GameObjectPools.js — named pooling contracts for high-churn game objects.
//
// Real factories can be injected by the gameplay systems. Until then, lightweight
// shells make the pool lifecycle testable without spawning hidden Three.js scenes.
// ─────────────────────────────────────────────────────────────────────────────
import { graphics } from '../graphics.js';
import { performanceBudget } from '../config/performanceBudgets.js';
import { poolRegistry } from './ObjectPool.js';

const POOL_IDS = Object.freeze({
  civilians: 'civilians',
  police: 'police',
  traffic: 'traffic',
  policeVehicles: 'police-vehicles',
  parkedVehicles: 'parked-vehicles',
  litter: 'litter-pickups',
  effects: 'effects',
  interactionMarkers: 'interaction-markers',
});

const transientFields = Object.freeze([
  'target', 'route', 'routeIndex', 'velocity', 'speed', 'health', 'downed', 'panic',
  'wantedTarget', 'missionOwner', 'interactionId', 'expiresAt', 'cellId', 'districtId',
]);

function shell(kind) {
  return {
    kind,
    active: false,
    visible: false,
    userData: {},
    position: { x: 0, y: 0, z: 0 },
  };
}

function clearTransient(item) {
  for (const key of transientFields) delete item[key];
  if (item.userData && typeof item.userData === 'object') {
    for (const key of transientFields) delete item.userData[key];
  }
}

function resetItem(item, context = {}) {
  clearTransient(item);
  item.active = true;
  item.visible = true;
  item.cellId = context.cellId || null;
  item.districtId = context.districtId || null;
  item.position ??= { x: 0, y: 0, z: 0 };
  if (context.position) {
    if (typeof item.position.copy === 'function') item.position.copy(context.position);
    else Object.assign(item.position, context.position);
  }
  item.group && (item.group.visible = true);
  return item;
}

function deactivateItem(item) {
  item.active = false;
  item.visible = false;
  item.group && (item.group.visible = false);
  if (item.mixer?.stopAllAction) item.mixer.stopAllAction();
}

function disposeItem(item) {
  item.dispose?.();
  item.group?.traverse?.((node) => {
    node.geometry?.dispose?.();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) material?.dispose?.();
  });
}

function sizesForPreset(preset = graphics.effectivePreset()) {
  const budget = performanceBudget(preset === 'custom' ? 'medium' : preset);
  return Object.freeze({
    [POOL_IDS.civilians]: Math.ceil(budget.maxCivilianNpcs * 1.35),
    [POOL_IDS.police]: Math.ceil(budget.maxPoliceUnits * 1.35),
    [POOL_IDS.traffic]: Math.ceil(budget.maxTrafficVehicles * 1.35),
    [POOL_IDS.policeVehicles]: Math.max(6, Math.ceil(budget.maxPoliceUnits * 0.8)),
    [POOL_IDS.parkedVehicles]: Math.max(12, Math.ceil(budget.maxTrafficVehicles * 1.4)),
    [POOL_IDS.litter]: preset === 'low' ? 48 : preset === 'high' ? 120 : 80,
    [POOL_IDS.effects]: preset === 'low' ? 36 : preset === 'high' ? 96 : 64,
    [POOL_IDS.interactionMarkers]: preset === 'low' ? 24 : preset === 'high' ? 64 : 42,
  });
}

function optionsFor(id, factories, sizes) {
  const factory = factories[id] || (() => shell(id));
  return {
    create: factory,
    reset: factories[`${id}:reset`] || resetItem,
    activate: factories[`${id}:activate`] || null,
    deactivate: factories[`${id}:deactivate`] || deactivateItem,
    dispose: factories[`${id}:dispose`] || disposeItem,
    maxSize: sizes[id],
  };
}

export function ensureGameObjectPools({
  preset = graphics.effectivePreset(),
  factories = {},
} = {}) {
  const sizes = sizesForPreset(preset);
  const pools = {};
  for (const id of Object.values(POOL_IDS)) {
    pools[id] = poolRegistry.get(id) || poolRegistry.register(id, optionsFor(id, factories, sizes));
  }
  return Object.freeze(pools);
}

export function resizeGameObjectPools(preset = graphics.effectivePreset()) {
  const sizes = sizesForPreset(preset);
  for (const [id, maxSize] of Object.entries(sizes)) {
    const pool = poolRegistry.get(id);
    if (!pool) continue;
    pool.maxSize = maxSize;
    pool.trim(maxSize);
  }
  return poolRegistry.snapshot();
}

export function releaseCellObjects(cellId) {
  let released = 0;
  for (const pool of poolRegistry.pools.values()) {
    for (const item of [...pool.active]) {
      if (item.cellId !== cellId && item.userData?.cellId !== cellId) continue;
      if (pool.release(item, { reason: 'cell-unloaded', cellId })) released += 1;
    }
  }
  return released;
}

export function trimGameObjectPools(targetRatio = 0.5) {
  const ratio = Math.max(0, Math.min(1, Number(targetRatio) || 0));
  for (const pool of poolRegistry.pools.values()) pool.trim(Math.floor(pool.maxSize * ratio));
  return poolRegistry.snapshot();
}

export const GAME_POOL_IDS = POOL_IDS;
export const GAME_POOL_SIZES = sizesForPreset();

if (typeof window !== 'undefined') {
  window.__ZW_ENSURE_GAME_POOLS__ = ensureGameObjectPools;
  window.__ZW_GAME_POOL_REPORT__ = () => poolRegistry.snapshot();
}

export default ensureGameObjectPools;
