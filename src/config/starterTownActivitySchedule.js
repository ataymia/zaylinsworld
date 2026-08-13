// ─────────────────────────────────────────────────────────────────────────────
// starterTownActivitySchedule.js — one clock contract for ambient city life.
//
// The clock is expressed in the same 0..1439 minute-of-day value stored in the
// save. Pedestrians and scheduled traffic consume these profiles at runtime so
// school, work, retail, recreation, travel, and service activity visibly change
// over the day instead of every district running at full density forever.
// ─────────────────────────────────────────────────────────────────────────────

const freeze = (value) => Object.freeze(value);
const window = (start, end, level = 1) => freeze({ start, end, level });

const schedule = (id, name, windows, offPeak = 0) => freeze({
  id,
  name,
  windows: freeze(windows),
  offPeak,
});

export const STARTER_TOWN_ACTIVITY_SCHEDULES = freeze([
  schedule('always', 'All day', [], 1),
  schedule('mixed-use-day', 'Mixed-use day and evening', [
    window(6 * 60, 9 * 60, 0.65),
    window(9 * 60, 22 * 60, 1),
    window(22 * 60, 24 * 60, 0.35),
  ], 0.18),
  schedule('school-day', 'School day', [
    window(6 * 60 + 30, 8 * 60, 0.65),
    window(8 * 60, 15 * 60 + 30, 1),
    window(15 * 60 + 30, 18 * 60, 0.55),
  ], 0.04),
  schedule('school-commute', 'School commute', [
    window(6 * 60 + 30, 9 * 60 + 15, 1),
    window(14 * 60, 17 * 60 + 30, 1),
  ], 0),
  schedule('industrial-shift', 'Northworks shifts', [
    window(5 * 60, 7 * 60, 0.7),
    window(7 * 60, 18 * 60, 1),
    window(18 * 60, 21 * 60, 0.45),
  ], 0.08),
  schedule('civic-hours', 'Civic and office hours', [
    window(7 * 60, 9 * 60, 0.65),
    window(9 * 60, 17 * 60 + 30, 1),
    window(17 * 60 + 30, 20 * 60, 0.35),
  ], 0.06),
  schedule('retail-hours', 'Retail and dining hours', [
    window(8 * 60, 10 * 60, 0.55),
    window(10 * 60, 21 * 60 + 30, 1),
    window(21 * 60 + 30, 23 * 60, 0.45),
  ], 0.04),
  schedule('residential-rhythm', 'Neighborhood rhythm', [
    window(5 * 60 + 30, 9 * 60, 0.8),
    window(9 * 60, 16 * 60, 0.35),
    window(16 * 60, 22 * 60 + 30, 1),
  ], 0.18),
  schedule('park-hours', 'Park and recreation hours', [
    window(6 * 60, 9 * 60, 0.55),
    window(9 * 60, 20 * 60 + 30, 1),
  ], 0.03),
  schedule('traveler-flow', 'Gateway traveler flow', [
    window(5 * 60, 9 * 60, 0.7),
    window(9 * 60, 21 * 60, 1),
    window(21 * 60, 24 * 60, 0.55),
  ], 0.3),
  schedule('service-day', 'Delivery and repair service', [
    window(5 * 60, 12 * 60, 1),
    window(12 * 60, 18 * 60 + 30, 0.7),
  ], 0),
  schedule('retail-delivery', 'Retail delivery window', [
    window(6 * 60, 11 * 60, 1),
    window(11 * 60, 16 * 60, 0.6),
  ], 0),
  schedule('sanitation-day', 'Sanitation route', [
    window(4 * 60 + 30, 11 * 60, 1),
    window(11 * 60, 16 * 60, 0.55),
  ], 0),
]);

export const STARTER_TOWN_ACTIVITY_SCHEDULE_BY_ID = freeze(Object.fromEntries(
  STARTER_TOWN_ACTIVITY_SCHEDULES.map((entry) => [entry.id, entry]),
));

const pedestrianProfile = (scheduleId, roles) => freeze({
  scheduleId,
  roles: freeze(roles),
});

export const STARTER_TOWN_PEDESTRIAN_ACTIVITY_PROFILES = freeze({
  'mixed-use': pedestrianProfile('mixed-use-day', ['shopper', 'server', 'neighbor', 'courier']),
  school: pedestrianProfile('school-day', ['student', 'teacher', 'coach', 'parent']),
  industrial: pedestrianProfile('industrial-shift', ['mechanic', 'warehouse-worker', 'driver', 'technician']),
  civic: pedestrianProfile('civic-hours', ['office-worker', 'city-worker', 'visitor', 'public-safety-staff']),
  residential: pedestrianProfile('residential-rhythm', ['resident', 'neighbor', 'dog-walker', 'home-worker']),
  retail: pedestrianProfile('retail-hours', ['shopper', 'retail-worker', 'server', 'delivery-runner']),
  travel: pedestrianProfile('traveler-flow', ['traveler', 'commuter', 'station-worker', 'road-tripper']),
  park: pedestrianProfile('park-hours', ['jogger', 'coach', 'family-visitor', 'park-worker']),
});

function normalizedMinute(timeMin) {
  const value = Number(timeMin);
  if (!Number.isFinite(value)) return 12 * 60;
  return ((value % 1440) + 1440) % 1440;
}

function containsMinute(entry, minute) {
  if (entry.start === entry.end) return true;
  if (entry.start < entry.end) return minute >= entry.start && minute < entry.end;
  return minute >= entry.start || minute < entry.end;
}

export function activityLevelAt(scheduleId, timeMin) {
  const profile = STARTER_TOWN_ACTIVITY_SCHEDULE_BY_ID[scheduleId]
    || STARTER_TOWN_ACTIVITY_SCHEDULE_BY_ID.always;
  const minute = normalizedMinute(timeMin);
  let level = profile.offPeak;
  for (const entry of profile.windows) {
    if (containsMinute(entry, minute)) level = Math.max(level, entry.level);
  }
  return Math.max(0, Math.min(1, Number(level) || 0));
}

export function scheduledActivityIsActive(scheduleId, timeMin, slot = 0.5) {
  return activityLevelAt(scheduleId, timeMin) > Math.max(0, Math.min(0.999, Number(slot) || 0));
}

export function pedestrianActivityProfile(activity) {
  return STARTER_TOWN_PEDESTRIAN_ACTIVITY_PROFILES[activity]
    || STARTER_TOWN_PEDESTRIAN_ACTIVITY_PROFILES['mixed-use'];
}

export default STARTER_TOWN_ACTIVITY_SCHEDULES;
