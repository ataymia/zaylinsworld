import assert from 'node:assert/strict';
import {
  FOUNDATION_CERTIFICATE,
  STARTER_TOWN_LIFE,
} from '../src/config/starterTownLifePlan.js';
import {
  careerSummary,
  ensureStarterTownLifeState,
  hasFoundationCertificate,
  issueStarterHomeDeed,
  recordBooking,
  recordCareerShift,
  recordLegalSettlement,
  recordSchoolLesson,
  registerOwnedVehicle,
  updateOwnedVehicleCondition,
  useCommunityCare,
  workPayMultiplier,
} from '../src/runtime/StarterTownLife.js';

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

globalThis.localStorage = new MemoryStorage();
const stateModule = await import('../src/state.js');
const {
  SAVE_SCHEMA_VERSION,
  clearSave,
  defaultState,
  loadState,
  saveDiagnostics,
  saveState,
} = stateModule;

assert.equal(SAVE_SCHEMA_VERSION, 8, 'life progression requires save schema 8');
assert.equal(loadState(), null, 'fresh storage must start without a save');

const state = ensureStarterTownLifeState(defaultState());
const deed = issueStarterHomeDeed(state, { day: 1 });
assert.equal(deed.newlyIssued, true);
assert.equal(state.properties.primaryResidenceId, STARTER_TOWN_LIFE.homeId);
assert.deepEqual(state.properties.owned, [STARTER_TOWN_LIFE.homeId]);

for (const [index, subjectId] of FOUNDATION_CERTIFICATE.requiredSubjectIds.entries()) {
  const lesson = recordSchoolLesson(state, subjectId, { score: 70 + index, day: index + 1 });
  assert.equal(lesson.certificateAwarded, index === FOUNDATION_CERTIFICATE.requiredSubjectIds.length - 1);
}
assert.equal(hasFoundationCertificate(state), true);
assert.equal(state.education.attendance, FOUNDATION_CERTIFICATE.requiredSubjectIds.length);
assert.equal(workPayMultiplier(state, 'worktower-associate'), 1.1);
assert.equal(workPayMultiplier(state, 'garage-hand'), 1);

for (let index = 0; index < 3; index++) {
  recordCareerShift(state, 'worktower-associate', {
    pay: 110,
    grade: index === 2 ? 'EXCELLENT' : 'GOOD',
    hits: index === 2 ? 5 : 4,
    rounds: 5,
    day: index + 1,
  });
}
const worktower = careerSummary(state).find((entry) => entry.career.id === 'worktower-associate');
assert.equal(worktower.shifts, 3);
assert.equal(worktower.totalEarnings, 330);
assert.equal(worktower.promotionLevel, 1);
assert.equal(worktower.bestGrade, 'EXCELLENT');

const starter = registerOwnedVehicle(state, STARTER_TOWN_LIFE.starterVehicleId, {
  name: 'Starter Kamaro', source: 'starter-grant', fuel: 64, damage: 11,
});
assert.equal(starter.newlyOwned, true);
updateOwnedVehicleCondition(state, STARTER_TOWN_LIFE.starterVehicleId, { fuel: 91, damage: 0, serviceDay: 3 });
assert.equal(state.vehicleState.stored[STARTER_TOWN_LIFE.starterVehicleId].fuel, 91);
assert.equal(state.vehicleState.stored[STARTER_TOWN_LIFE.starterVehicleId].lastServiceDay, 3);

state.stats.health = 40;
state.stats.energy = 25;
state.stats.hygiene = 30;
state.money = 500;
const care = useCommunityCare(state);
assert.equal(care.ok, true);
assert.equal(care.cost, STARTER_TOWN_LIFE.clinicCost);
assert.equal(state.money, 500 - STARTER_TOWN_LIFE.clinicCost);
assert.ok(state.stats.health > 40 && state.stats.energy > 25 && state.stats.hygiene > 30);

recordBooking(state, { wanted: 3, cashLost: 80, day: 4 });
recordLegalSettlement(state, { starsCleared: 1, fee: 750, day: 5 });
assert.equal(state.crimeRecord.convictionsByTown['starter-town'], 1);
assert.equal(state.crimeRecord.settlements.length, 1);

// Current-save round trip.
assert.equal(saveState(state), true);
let loaded = loadState();
assert.equal(loaded.version, 8);
assert.equal(loaded.education.certificates.includes(FOUNDATION_CERTIFICATE.id), true);
assert.equal(loaded.careers.records['worktower-associate'].shifts, 3);
assert.equal(loaded.vehicleState.stored[STARTER_TOWN_LIFE.starterVehicleId].fuel, 91);

// A second save creates the one-time rollback snapshot.
state.money = 777;
assert.equal(saveState(state), true);
assert.equal(saveDiagnostics().hasBackup, true);
const saveKey = saveDiagnostics().saveKey;
const backupKey = [...localStorage.values.keys()].find((key) => key.includes('.backup'));
assert.ok(backupKey, 'second save must retain a backup key');

// Unreadable primary save recovers from the valid backup and captures evidence.
localStorage.setItem(saveKey, '{this is not json');
loaded = loadState();
assert.equal(loaded.money, 500 - STARTER_TOWN_LIFE.clinicCost, 'backup should preserve the first saved balance');
assert.equal(saveDiagnostics().hasCorruptCapture, true);

// Checksum tampering also selects the valid backup instead of trusting mutation.
localStorage.setItem(saveKey, localStorage.getItem(backupKey));
const tampered = JSON.parse(localStorage.getItem(saveKey));
tampered.payload.money = 999999;
localStorage.setItem(saveKey, JSON.stringify(tampered));
loaded = loadState();
assert.notEqual(loaded.money, 999999);

// Legacy plain-object saves migrate without losing core values or inventing bad records.
clearSave();
localStorage.setItem(saveKey, JSON.stringify({
  version: 3,
  money: 88,
  ownedCars: ['cityhatch'],
  activeCar: 'cityhatch',
  properties: { owned: ['zaylins-home'] },
  education: { subjects: { 'basic-math': { lessons: 2, bestScore: 85 } } },
}));
loaded = loadState();
assert.equal(loaded.version, 8);
assert.equal(loaded.money, 88);
assert.equal(loaded.education.subjects['basic-math'].lessons, 2);
assert.equal(loaded.vehicleState.activeVehicleId, 'cityhatch');
assert.equal(loaded.vehicleState.stored.cityhatch.legalOwner, true);

console.log('Starter Town life/save acceptance passed:');
console.log('- deed + primary residence persist');
console.log('- 10-subject school contract awards the five-class Foundation Certificate');
console.log('- four careers retain shifts, earnings, grades, and promotions');
console.log('- owned vehicles retain legal ownership, active selection, fuel, damage, and service');
console.log('- current, legacy, unreadable, checksum-tampered, and backup save paths recover safely');

