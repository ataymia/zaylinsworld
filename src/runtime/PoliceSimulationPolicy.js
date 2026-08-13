// ─────────────────────────────────────────────────────────────────────────────
// PoliceSimulationPolicy.js — deterministic staffing and distance budgets for
// Starter Town pursuits. Near units keep full-rate behavior; only units already
// far outside the chase are throttled or recycled through the named pools.
// ─────────────────────────────────────────────────────────────────────────────

const freeze = (value) => Object.freeze(value);

export const POLICE_STAFFING_BY_WANTED = freeze([
  freeze({ foot: 0, vehicles: 0 }),
  freeze({ foot: 1, vehicles: 0 }),
  freeze({ foot: 3, vehicles: 0 }),
  freeze({ foot: 4, vehicles: 1 }),
  freeze({ foot: 4, vehicles: 2 }),
  freeze({ foot: 4, vehicles: 2 }),
]);

export const POLICE_RELEVANCE_BANDS = freeze({
  near: 110,
  mid: 260,
  far: 520,
  recycle: 720,
});

const UPDATE_INTERVALS = freeze({
  foot: freeze({ near: 0, mid: 0.08, far: 0.18, distant: 0.28 }),
  vehicle: freeze({ near: 0, mid: 0.06, far: 0.14, distant: 0.22 }),
});

export function policeStaffingFor(wanted) {
  const stars = Math.max(0, Math.min(5, Math.floor(Number(wanted) || 0)));
  return POLICE_STAFFING_BY_WANTED[stars];
}

export function policeSimulationBudget(distance, kind = 'foot') {
  const meters = Math.max(0, Number(distance) || 0);
  const intervals = UPDATE_INTERVALS[kind] || UPDATE_INTERVALS.foot;
  if (meters > POLICE_RELEVANCE_BANDS.recycle) {
    return freeze({ tier: 'recycle', interval: intervals.distant, recycle: true });
  }
  if (meters > POLICE_RELEVANCE_BANDS.far) {
    return freeze({ tier: 'distant', interval: intervals.distant, recycle: false });
  }
  if (meters > POLICE_RELEVANCE_BANDS.mid) {
    return freeze({ tier: 'far', interval: intervals.far, recycle: false });
  }
  if (meters > POLICE_RELEVANCE_BANDS.near) {
    return freeze({ tier: 'mid', interval: intervals.mid, recycle: false });
  }
  return freeze({ tier: 'near', interval: intervals.near, recycle: false });
}

export default policeSimulationBudget;
