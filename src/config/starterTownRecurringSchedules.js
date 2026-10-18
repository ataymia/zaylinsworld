// ─────────────────────────────────────────────────────────────────────────────
// starterTownRecurringSchedules.js — live placements for Starter Town's five
// named recurring characters. Labels come from the canonical story roster; this
// file only binds each authored time-of-day entry to a real interior or exterior
// gameplay anchor.
// ─────────────────────────────────────────────────────────────────────────────
import { NPCS_BY_ID } from './npcStoryCatalog.js';

const freeze = (value) => Object.freeze(value);
const interior = (area, offset = null) => freeze({ kind: 'interior', area, offset });
const entrance = (interiorId, forward = 0.35, side = 3.2) => freeze({
  kind: 'entrance', area: 'city', interiorId, forward, side,
});
const landmark = (locationId, x = 0, z = 0, facing = 0) => freeze({
  kind: 'landmark', area: 'city', locationId, offset: freeze({ x, z }), facing,
});
const fixed = (x, z, facing = 0) => freeze({ kind: 'fixed', area: 'city', x, z, facing });

const placements = freeze({
  'malik-frost': freeze({
    morning: interior('frostbox'),
    afternoon: interior('frostbox'),
    evening: entrance('chicken', 0.35, -3.3),
  }),
  'maya-brooks': freeze({
    morning: interior('kicks'),
    afternoon: interior('kicks'),
    evening: entrance('kicks', 0.35, -3.4),
  }),
  'coach-rell': freeze({
    morning: interior('gym'),
    afternoon: landmark('dreamdrop-park', -7, -10, Math.PI * 0.75),
    evening: interior('gym'),
  }),
  'officer-dane': freeze({
    morning: entrance('school', 0.4, -4.2),
    afternoon: interior('police'),
    evening: entrance('police', 0.4, -4.2),
  }),
  'denise-hall': freeze({
    morning: entrance('kicks', 0.3, -4.1),
    afternoon: fixed(8.1, 54, Math.PI),
    evening: entrance('office', 0.35, -3.8),
  }),
});

function normalizedMinute(timeMin) {
  const value = Number(timeMin) || 0;
  return ((value % 1440) + 1440) % 1440;
}

export function starterTownDayPeriodAt(timeMin) {
  const minute = normalizedMinute(timeMin);
  if (minute >= 6 * 60 && minute < 12 * 60) return 'morning';
  if (minute >= 12 * 60 && minute < 18 * 60) return 'afternoon';
  return 'evening';
}

export const STARTER_TOWN_RECURRING_SCHEDULES = freeze(Object.entries(placements).map(([npcId, schedule]) => {
  const npc = NPCS_BY_ID[npcId];
  if (!npc || npc.townId !== 'starter-town') throw new Error(`Invalid Starter Town recurring NPC: ${npcId}`);
  for (const period of ['morning', 'afternoon', 'evening']) {
    if (!npc.schedule?.[period]) throw new Error(`${npcId} is missing canonical ${period} schedule text`);
    if (!schedule[period]) throw new Error(`${npcId} is missing a live ${period} placement`);
  }
  return freeze({
    npcId,
    name: npc.name,
    districtId: npc.districtId,
    schedule: freeze(Object.fromEntries(['morning', 'afternoon', 'evening'].map((period) => [
      period,
      freeze({ ...schedule[period], period, label: npc.schedule[period] }),
    ]))),
  });
}));

export const STARTER_TOWN_RECURRING_SCHEDULE_BY_ID = freeze(Object.fromEntries(
  STARTER_TOWN_RECURRING_SCHEDULES.map((entry) => [entry.npcId, entry]),
));

export function starterTownRecurringScheduleAt(npcId, timeMin) {
  const definition = STARTER_TOWN_RECURRING_SCHEDULE_BY_ID[npcId];
  if (!definition) return null;
  const period = starterTownDayPeriodAt(timeMin);
  return definition.schedule[period] || null;
}

// Resolve a live exterior slot without baking render objects into config. The
// entrance map is the same door contract used by interaction and return travel,
// so characters remain beside reachable, relocated storefronts.
export function resolveStarterTownRecurringPosition(slot, {
  entranceByInteriorId = {},
  locationById = () => null,
} = {}) {
  if (!slot || slot.area !== 'city') return null;
  if (slot.kind === 'fixed') return freeze({ x: slot.x, z: slot.z, facing: slot.facing || 0 });
  if (slot.kind === 'landmark') {
    const location = locationById(slot.locationId);
    if (!location?.position) return null;
    return freeze({
      x: Number(location.position.x) + (Number(slot.offset?.x) || 0),
      z: Number(location.position.z) + (Number(slot.offset?.z) || 0),
      facing: Number(slot.facing) || 0,
    });
  }
  if (slot.kind === 'entrance') {
    const entranceRecord = entranceByInteriorId[slot.interiorId];
    const door = entranceRecord?.doorPos;
    const face = entranceRecord?.faceDir;
    if (!door || !face) return null;
    const fx = Number(face.x) || 0;
    const fz = Number(face.z) || 0;
    const length = Math.hypot(fx, fz) || 1;
    const nx = fx / length;
    const nz = fz / length;
    const forward = Number(slot.forward) || 0;
    const side = Number(slot.side) || 0;
    return freeze({
      x: Number(door.x) + nx * forward + nz * side,
      z: Number(door.z) + nz * forward - nx * side,
      facing: Math.atan2(-nx, -nz),
    });
  }
  return null;
}

export default STARTER_TOWN_RECURRING_SCHEDULES;
