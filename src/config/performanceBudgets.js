// ─────────────────────────────────────────────────────────────────────────────
// performanceBudgets.js — measurable browser budgets for each graphics tier.
// ─────────────────────────────────────────────────────────────────────────────

const budget = (values) => Object.freeze(values);

export const PERFORMANCE_BUDGETS = Object.freeze({
  low: budget({
    targetFps: 30,
    maxFrameMs: 33.3,
    activeCells: 9,
    warmCells: 16,
    maxDrawCalls: 700,
    maxTriangles: 700000,
    maxTextureMemoryMb: 320,
    maxLoadedGlbs: 70,
    maxCivilianNpcs: 10,
    maxTrafficVehicles: 8,
    maxPoliceUnits: 6,
    maxDynamicLights: 10,
    maxShadowCasters: 8,
    lodDistances: [45, 90, 150],
    poolTrimIntervalSec: 20,
  }),
  medium: budget({
    targetFps: 45,
    maxFrameMs: 22.2,
    activeCells: 9,
    warmCells: 16,
    maxDrawCalls: 1100,
    maxTriangles: 1300000,
    maxTextureMemoryMb: 640,
    maxLoadedGlbs: 130,
    maxCivilianNpcs: 18,
    maxTrafficVehicles: 14,
    maxPoliceUnits: 10,
    maxDynamicLights: 18,
    maxShadowCasters: 16,
    lodDistances: [70, 140, 230],
    poolTrimIntervalSec: 30,
  }),
  high: budget({
    targetFps: 60,
    maxFrameMs: 16.7,
    activeCells: 9,
    warmCells: 16,
    maxDrawCalls: 1700,
    maxTriangles: 2200000,
    maxTextureMemoryMb: 1100,
    maxLoadedGlbs: 220,
    maxCivilianNpcs: 26,
    maxTrafficVehicles: 22,
    maxPoliceUnits: 14,
    maxDynamicLights: 28,
    maxShadowCasters: 28,
    lodDistances: [95, 190, 310],
    poolTrimIntervalSec: 40,
  }),
});

export function performanceBudget(preset = 'medium') {
  return PERFORMANCE_BUDGETS[preset] || PERFORMANCE_BUDGETS.medium;
}

export function budgetViolations(metrics = {}, preset = 'medium') {
  const limits = performanceBudget(preset);
  const checks = [
    ['fps', metrics.fps, limits.targetFps, 'minimum'],
    ['frameMs', metrics.frameMs, limits.maxFrameMs, 'maximum'],
    ['drawCalls', metrics.drawCalls, limits.maxDrawCalls, 'maximum'],
    ['triangles', metrics.triangles, limits.maxTriangles, 'maximum'],
    ['textureMemoryMb', metrics.textureMemoryMb, limits.maxTextureMemoryMb, 'maximum'],
    ['loadedGlbs', metrics.loadedGlbs, limits.maxLoadedGlbs, 'maximum'],
    ['civilianNpcs', metrics.civilianNpcs, limits.maxCivilianNpcs, 'maximum'],
    ['trafficVehicles', metrics.trafficVehicles, limits.maxTrafficVehicles, 'maximum'],
    ['policeUnits', metrics.policeUnits, limits.maxPoliceUnits, 'maximum'],
  ];
  return checks.filter(([, value, limit, mode]) => Number.isFinite(value)
    && (mode === 'minimum' ? value < limit : value > limit))
    .map(([metric, value, limit, mode]) => ({ metric, value, limit, mode }));
}
