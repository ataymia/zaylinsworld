// ───────────────────────────────────────────────────────────────────────────
// townStreaming.js — pure town distance/streaming policy.
//
// The current build has one always-live town. This module defines the decisions
// the expansion loader will use once multiple towns exist: active, warm, or
// unloaded. It is pure and side-effect free so world construction can adopt it
// incrementally without destabilizing Starter Town.
// ───────────────────────────────────────────────────────────────────────────

export const TOWN_LOAD_STATE = Object.freeze({
  ACTIVE: 'active',
  WARM: 'warm',
  UNLOADED: 'unloaded',
});

export function distanceToTown(town, position) {
  if (!town?.center || !position) return Infinity;
  return Math.hypot(
    Number(position.x || 0) - Number(town.center.x || 0),
    Number(position.z || 0) - Number(town.center.z || 0),
  );
}

export function desiredTownLoadState(town, playerPosition, currentState = TOWN_LOAD_STATE.UNLOADED) {
  const distance = distanceToTown(town, playerPosition);
  const policy = town?.streaming || {};
  const active = Number(policy.activeRadius || 0);
  const warm = Math.max(active, Number(policy.warmRadius || active));
  const unload = Math.max(warm, Number(policy.unloadRadius || warm));

  if (distance <= active) return TOWN_LOAD_STATE.ACTIVE;
  if (distance <= warm) return TOWN_LOAD_STATE.WARM;

  // Hysteresis: an already loaded town remains warm until the player crosses the
  // larger unload radius. This prevents rapid load/unload flicker at boundaries.
  if (currentState !== TOWN_LOAD_STATE.UNLOADED && distance <= unload) return TOWN_LOAD_STATE.WARM;
  return TOWN_LOAD_STATE.UNLOADED;
}

export function townRuntimeBudget(town, loadState) {
  const policy = town?.streaming || {};
  if (loadState === TOWN_LOAD_STATE.ACTIVE) {
    return {
      geometry: true,
      interiors: true,
      traffic: Number(policy.maxTraffic || 0),
      civilians: Number(policy.maxLiveSkinnedCivilians || 0),
      police: Number(policy.maxLivePolice || 0),
      detailedMaterials: true,
    };
  }
  if (loadState === TOWN_LOAD_STATE.WARM) {
    return {
      geometry: true,
      interiors: false,
      traffic: 0,
      civilians: 0,
      police: 0,
      detailedMaterials: false,
    };
  }
  return {
    geometry: false,
    interiors: false,
    traffic: 0,
    civilians: 0,
    police: 0,
    detailedMaterials: false,
  };
}

export function planTownLoads(towns, playerPosition, currentStates = {}) {
  return (towns || []).map((town) => {
    const current = currentStates[town.id] || TOWN_LOAD_STATE.UNLOADED;
    const state = desiredTownLoadState(town, playerPosition, current);
    return {
      townId: town.id,
      distance: distanceToTown(town, playerPosition),
      current,
      state,
      budget: townRuntimeBudget(town, state),
    };
  });
}
