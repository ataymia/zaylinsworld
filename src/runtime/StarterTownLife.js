import {
  CAREER_GRADE_ORDER,
  CAREER_PROMOTION_SHIFTS,
  FOUNDATION_CERTIFICATE,
  STARTER_TOWN_CAREERS_BY_ID,
  STARTER_TOWN_LIFE,
  STARTER_TOWN_SUBJECTS_BY_ID,
} from '../config/starterTownLifePlan.js';

const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, finite(value)));
const unique = (values) => Array.from(new Set(Array.isArray(values) ? values.filter(Boolean) : []));

function normalizeSubjectRecord(record = {}) {
  return {
    lessons: Math.max(0, Math.floor(finite(record.lessons))),
    bestScore: clamp(record.bestScore),
    lastScore: clamp(record.lastScore),
    lastDay: Math.max(0, Math.floor(finite(record.lastDay))),
  };
}

function promotionLevelFor(shifts) {
  let level = 0;
  for (let index = 0; index < CAREER_PROMOTION_SHIFTS.length; index++) {
    if (shifts >= CAREER_PROMOTION_SHIFTS[index]) level = index;
  }
  return level;
}

function normalizeCareerRecord(careerId, record = {}) {
  const career = STARTER_TOWN_CAREERS_BY_ID[careerId];
  const shifts = Math.max(0, Math.floor(finite(record.shifts)));
  const promotionLevel = Math.min(
    career?.titles.length ? career.titles.length - 1 : CAREER_PROMOTION_SHIFTS.length - 1,
    promotionLevelFor(shifts),
  );
  const bestGrade = CAREER_GRADE_ORDER.includes(record.bestGrade) ? record.bestGrade : null;
  const lastGrade = CAREER_GRADE_ORDER.includes(record.lastGrade) ? record.lastGrade : null;
  return {
    shifts,
    totalEarnings: Math.max(0, Math.floor(finite(record.totalEarnings))),
    bestGrade,
    lastGrade,
    lastScore: clamp(record.lastScore),
    lastDay: Math.max(0, Math.floor(finite(record.lastDay))),
    promotionLevel,
    title: career?.titles[promotionLevel] || record.title || career?.title || careerId,
  };
}

function normalizeVehicleRecord(vehicleId, record = {}) {
  return {
    id: vehicleId,
    name: String(record.name || vehicleId),
    legalOwner: record.legalOwner !== false,
    source: String(record.source || 'owned'),
    fuel: clamp(record.fuel ?? 100),
    damage: clamp(record.damage ?? 0),
    lastServiceDay: Math.max(0, Math.floor(finite(record.lastServiceDay))),
  };
}

export function ensureStarterTownLifeState(state) {
  if (!state || typeof state !== 'object') throw new TypeError('StarterTownLife requires a state object');

  state.properties = state.properties && typeof state.properties === 'object' ? state.properties : {};
  state.properties.primaryResidenceId = state.properties.primaryResidenceId || null;
  state.properties.owned = unique(state.properties.owned);
  state.properties.homeDeedIssued = !!state.properties.homeDeedIssued;
  state.properties.mailboxLastDay = state.properties.mailboxLastDay == null
    ? null
    : Math.max(0, Math.floor(finite(state.properties.mailboxLastDay)));

  state.education = state.education && typeof state.education === 'object' ? state.education : {};
  state.education.schoolId = state.education.schoolId || null;
  state.education.certificates = unique(state.education.certificates);
  state.education.attendance = Math.max(0, Math.floor(finite(state.education.attendance)));
  const subjects = state.education.subjects && typeof state.education.subjects === 'object'
    ? state.education.subjects
    : {};
  state.education.subjects = Object.fromEntries(Object.entries(subjects)
    .map(([id, record]) => [id, STARTER_TOWN_SUBJECTS_BY_ID[id]
      ? normalizeSubjectRecord(record)
      : (record && typeof record === 'object' ? { ...record } : record)]));

  state.careers = state.careers && typeof state.careers === 'object' ? state.careers : {};
  state.careers.activeId = typeof state.careers.activeId === 'string' ? state.careers.activeId : null;
  const records = state.careers.records && typeof state.careers.records === 'object' ? state.careers.records : {};
  state.careers.records = Object.fromEntries(Object.entries(records)
    .map(([id, record]) => [id, STARTER_TOWN_CAREERS_BY_ID[id]
      ? normalizeCareerRecord(id, record)
      : (record && typeof record === 'object' ? { ...record } : record)]));

  state.ownedCars = unique(state.ownedCars);
  state.vehicleState = state.vehicleState && typeof state.vehicleState === 'object' ? state.vehicleState : {};
  state.vehicleState.activeVehicleId = state.vehicleState.activeVehicleId || state.activeCar || null;
  state.vehicleState.impounded = unique(state.vehicleState.impounded);
  const stored = state.vehicleState.stored && typeof state.vehicleState.stored === 'object'
    ? state.vehicleState.stored
    : {};
  state.vehicleState.stored = Object.fromEntries(Object.entries(stored)
    .map(([id, record]) => [id, normalizeVehicleRecord(id, record)]));
  for (const vehicleId of state.ownedCars) {
    if (!state.vehicleState.stored[vehicleId]) {
      state.vehicleState.stored[vehicleId] = normalizeVehicleRecord(vehicleId, {
        fuel: vehicleId === state.vehicleState.activeVehicleId ? state.fuel : 100,
        damage: vehicleId === state.vehicleState.activeVehicleId ? state.carDamage : 0,
        source: 'legacy-owned',
      });
    }
  }

  state.crimeRecord = state.crimeRecord && typeof state.crimeRecord === 'object' ? state.crimeRecord : {};
  state.crimeRecord.official = Array.isArray(state.crimeRecord.official) ? state.crimeRecord.official : [];
  state.crimeRecord.hidden = Array.isArray(state.crimeRecord.hidden) ? state.crimeRecord.hidden : [];
  state.crimeRecord.settlements = Array.isArray(state.crimeRecord.settlements) ? state.crimeRecord.settlements : [];
  state.crimeRecord.convictionsByTown = state.crimeRecord.convictionsByTown
    && typeof state.crimeRecord.convictionsByTown === 'object'
    ? state.crimeRecord.convictionsByTown
    : {};
  return state;
}

export function registerStarterHome(state, { day = state.day } = {}) {
  ensureStarterTownLifeState(state);
  const newlyOwned = !state.properties.owned.includes(STARTER_TOWN_LIFE.homeId);
  state.properties.owned = unique([...state.properties.owned, STARTER_TOWN_LIFE.homeId]);
  state.properties.primaryResidenceId = STARTER_TOWN_LIFE.homeId;
  return { homeId: STARTER_TOWN_LIFE.homeId, newlyOwned, deedIssued: state.properties.homeDeedIssued, day };
}

export function issueStarterHomeDeed(state, { day = state.day } = {}) {
  const registration = registerStarterHome(state, { day });
  const newlyIssued = !state.properties.homeDeedIssued;
  state.properties.homeDeedIssued = true;
  state.properties.mailboxLastDay = Math.max(0, Math.floor(finite(day, 1)));
  return { ...registration, newlyIssued };
}

export function recordSchoolLesson(state, subjectId, { score = 0, day = state.day } = {}) {
  ensureStarterTownLifeState(state);
  const subject = STARTER_TOWN_SUBJECTS_BY_ID[subjectId];
  if (!subject) throw new RangeError(`Unknown Starter Town subject: ${subjectId}`);
  const previous = normalizeSubjectRecord(state.education.subjects[subjectId]);
  const lessonScore = clamp(score);
  state.education.schoolId = STARTER_TOWN_LIFE.schoolId;
  state.education.attendance += 1;
  state.education.subjects[subjectId] = {
    lessons: previous.lessons + 1,
    bestScore: Math.max(previous.bestScore, lessonScore),
    lastScore: lessonScore,
    lastDay: Math.max(0, Math.floor(finite(day, 1))),
  };

  const qualified = FOUNDATION_CERTIFICATE.requiredSubjectIds.every(
    (requiredId) => (state.education.subjects[requiredId]?.lessons || 0) >= 1,
  );
  const hadCertificate = state.education.certificates.includes(FOUNDATION_CERTIFICATE.id);
  if (qualified && !hadCertificate) state.education.certificates.push(FOUNDATION_CERTIFICATE.id);
  return {
    subject,
    record: state.education.subjects[subjectId],
    certificateAwarded: qualified && !hadCertificate,
    foundationComplete: qualified,
  };
}

export function hasFoundationCertificate(state) {
  ensureStarterTownLifeState(state);
  return state.education.certificates.includes(FOUNDATION_CERTIFICATE.id);
}

export function workPayMultiplier(state, careerId) {
  if (careerId !== 'worktower-associate') return 1;
  return hasFoundationCertificate(state) ? FOUNDATION_CERTIFICATE.worktowerPayMultiplier : 1;
}

export function recordCareerShift(state, careerId, {
  pay = 0,
  grade = 'POOR',
  hits = 0,
  rounds = 1,
  day = state.day,
} = {}) {
  ensureStarterTownLifeState(state);
  const career = STARTER_TOWN_CAREERS_BY_ID[careerId];
  if (!career) throw new RangeError(`Unknown Starter Town career: ${careerId}`);
  const previous = normalizeCareerRecord(careerId, state.careers.records[careerId]);
  const beforeLevel = previous.promotionLevel;
  const shifts = previous.shifts + 1;
  const promotionLevel = Math.min(career.titles.length - 1, promotionLevelFor(shifts));
  const normalizedGrade = CAREER_GRADE_ORDER.includes(grade) ? grade : 'POOR';
  const previousBestIndex = previous.bestGrade ? CAREER_GRADE_ORDER.indexOf(previous.bestGrade) : -1;
  const gradeIndex = CAREER_GRADE_ORDER.indexOf(normalizedGrade);
  const next = {
    shifts,
    totalEarnings: previous.totalEarnings + Math.max(0, Math.floor(finite(pay))),
    bestGrade: CAREER_GRADE_ORDER[Math.max(previousBestIndex, gradeIndex)],
    lastGrade: normalizedGrade,
    lastScore: clamp(rounds ? (finite(hits) / finite(rounds, 1)) * 100 : 0),
    lastDay: Math.max(0, Math.floor(finite(day, 1))),
    promotionLevel,
    title: career.titles[promotionLevel],
  };
  state.careers.records[careerId] = next;
  state.careers.activeId = careerId;
  state.job = next.title;
  return { career, record: next, promoted: promotionLevel > beforeLevel };
}

export function careerSummary(state) {
  ensureStarterTownLifeState(state);
  return Object.entries(state.careers.records)
    .filter(([careerId]) => !!STARTER_TOWN_CAREERS_BY_ID[careerId])
    .map(([careerId, record]) => ({ career: STARTER_TOWN_CAREERS_BY_ID[careerId], ...record }))
    .sort((a, b) => b.lastDay - a.lastDay || b.shifts - a.shifts);
}

export function registerOwnedVehicle(state, vehicleId, {
  name,
  fuel,
  damage,
  legalOwner,
  source,
  makeActive = true,
} = {}) {
  ensureStarterTownLifeState(state);
  const newlyOwned = !state.ownedCars.includes(vehicleId);
  state.ownedCars = unique([...state.ownedCars, vehicleId]);
  const existing = state.vehicleState.stored[vehicleId] || {};
  state.vehicleState.stored[vehicleId] = normalizeVehicleRecord(vehicleId, {
    ...existing,
    name: name ?? existing.name ?? vehicleId,
    fuel: fuel ?? existing.fuel ?? 100,
    damage: damage ?? existing.damage ?? 0,
    legalOwner: legalOwner ?? existing.legalOwner ?? true,
    source: source ?? existing.source ?? 'owned',
  });
  if (makeActive) {
    state.vehicleState.activeVehicleId = vehicleId;
    state.activeCar = vehicleId;
  }
  return { vehicle: state.vehicleState.stored[vehicleId], newlyOwned };
}

export function updateOwnedVehicleCondition(state, vehicleId, { fuel, damage, serviceDay } = {}) {
  ensureStarterTownLifeState(state);
  if (!state.vehicleState.stored[vehicleId]) return null;
  const current = state.vehicleState.stored[vehicleId];
  if (fuel !== undefined) current.fuel = clamp(fuel);
  if (damage !== undefined) current.damage = clamp(damage);
  if (serviceDay !== undefined) current.lastServiceDay = Math.max(0, Math.floor(finite(serviceDay)));
  return current;
}

export function useCommunityCare(state, { schoolNurse = false } = {}) {
  ensureStarterTownLifeState(state);
  state.stats = state.stats && typeof state.stats === 'object' ? state.stats : {};
  const health = clamp(state.stats.health ?? 100);
  const energy = clamp(state.stats.energy ?? 100);
  const hygiene = clamp(state.stats.hygiene ?? 100);
  if (health >= 100 && energy >= 90 && hygiene >= 90) return { ok: false, reason: 'healthy', cost: 0 };
  const cost = schoolNurse ? 0 : STARTER_TOWN_LIFE.clinicCost;
  if (finite(state.money) < cost) return { ok: false, reason: 'money', cost };
  state.money = Math.max(0, finite(state.money) - cost);
  state.stats.health = Math.min(100, health + (schoolNurse ? STARTER_TOWN_LIFE.nurseHealthGain : STARTER_TOWN_LIFE.clinicHealthGain));
  state.stats.energy = Math.min(100, energy + (schoolNurse ? 8 : 20));
  state.stats.hygiene = Math.min(100, hygiene + (schoolNurse ? 5 : 15));
  return { ok: true, cost, health: state.stats.health, energy: state.stats.energy, hygiene: state.stats.hygiene };
}

export function recordBooking(state, { wanted = state.wanted, cashLost = 0, day = state.day } = {}) {
  ensureStarterTownLifeState(state);
  const stars = Math.max(1, Math.min(5, Math.floor(finite(wanted, 1))));
  const record = {
    id: `starter-town-booking-${Math.max(1, Math.floor(finite(day, 1)))}-${state.crimeRecord.official.length + 1}`,
    townId: STARTER_TOWN_LIFE.townId,
    type: 'booking',
    stars,
    cashLost: Math.max(0, Math.floor(finite(cashLost))),
    day: Math.max(1, Math.floor(finite(day, 1))),
  };
  state.crimeRecord.official.push(record);
  state.crimeRecord.convictionsByTown[STARTER_TOWN_LIFE.townId] = Math.max(
    0,
    Math.floor(finite(state.crimeRecord.convictionsByTown[STARTER_TOWN_LIFE.townId])),
  ) + 1;
  return record;
}

export function recordLegalSettlement(state, { starsCleared = 1, fee = 0, day = state.day } = {}) {
  ensureStarterTownLifeState(state);
  const settlement = {
    townId: STARTER_TOWN_LIFE.townId,
    starsCleared: Math.max(1, Math.floor(finite(starsCleared, 1))),
    fee: Math.max(0, Math.floor(finite(fee))),
    day: Math.max(1, Math.floor(finite(day, 1))),
  };
  state.crimeRecord.settlements.push(settlement);
  return settlement;
}
