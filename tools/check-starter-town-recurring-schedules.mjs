import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  STARTER_TOWN_RECURRING_SCHEDULES,
  resolveStarterTownRecurringPosition,
  starterTownDayPeriodAt,
  starterTownRecurringScheduleAt,
} from '../src/config/starterTownRecurringSchedules.js';
import { NPCS_BY_ID } from '../src/config/npcStoryCatalog.js';
import { worldRegistry } from '../src/runtime/WorldRegistry.js';

const expectedIds = [
  'coach-rell',
  'denise-hall',
  'malik-frost',
  'maya-brooks',
  'officer-dane',
];
assert.deepEqual(
  STARTER_TOWN_RECURRING_SCHEDULES.map((entry) => entry.npcId).sort(),
  expectedIds,
  'all five live Starter Town recurring characters need schedules',
);

assert.equal(starterTownDayPeriodAt(359), 'evening');
assert.equal(starterTownDayPeriodAt(360), 'morning');
assert.equal(starterTownDayPeriodAt(719), 'morning');
assert.equal(starterTownDayPeriodAt(720), 'afternoon');
assert.equal(starterTownDayPeriodAt(1079), 'afternoon');
assert.equal(starterTownDayPeriodAt(1080), 'evening');
assert.equal(starterTownDayPeriodAt(1440 + 480), 'morning', 'saved clock values must wrap safely');
assert.equal(starterTownDayPeriodAt(-1), 'evening', 'negative migrated clock values must wrap safely');

const entranceByInteriorId = Object.fromEntries(
  ['chicken', 'kicks', 'school', 'police', 'office'].map((id, index) => [id, {
    doorPos: { x: index * 100 + 10, z: index * -80 + 20 },
    faceDir: index % 2 ? { x: 1, z: 0 } : { x: 0, z: 1 },
  }]),
);
let exteriorSlots = 0;
for (const definition of STARTER_TOWN_RECURRING_SCHEDULES) {
  const canonical = NPCS_BY_ID[definition.npcId];
  assert.ok(canonical, `${definition.npcId} must exist in the canonical story roster`);
  const placementKeys = new Set();
  for (const [period, timeMin] of [['morning', 8 * 60], ['afternoon', 13 * 60], ['evening', 20 * 60]]) {
    const slot = starterTownRecurringScheduleAt(definition.npcId, timeMin);
    assert.equal(slot.period, period, `${definition.npcId} must resolve its ${period} slot`);
    assert.equal(slot.label, canonical.schedule[period], `${definition.npcId} ${period} label must stay canonical`);
    placementKeys.add(slot.area === 'city'
      ? `${slot.kind}:${slot.interiorId || slot.locationId || `${slot.x}:${slot.z}`}`
      : `interior:${slot.area}`);
    if (slot.area !== 'city') continue;
    exteriorSlots += 1;
    const position = resolveStarterTownRecurringPosition(slot, {
      entranceByInteriorId,
      locationById: (id) => worldRegistry.location(id),
    });
    assert.ok(position, `${definition.npcId} ${period} exterior placement must resolve`);
    assert.ok(Number.isFinite(position.x) && Number.isFinite(position.z) && Number.isFinite(position.facing),
      `${definition.npcId} ${period} exterior placement must be finite`);
  }
  assert.ok(placementKeys.size >= 2, `${definition.npcId} must move between at least two real placements`);
}
assert.equal(exteriorSlots, 8, 'the five schedules should expose eight district-facing placements');

const mainSource = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
assert.match(mainSource, /initializeRecurringCharacters\(\);/, 'world startup must initialize recurring schedules');
assert.match(mainSource, /updateRecurringCharacterSchedules\(\);/, 'the live loop must consume the saved clock');
assert.match(mainSource, /record\.activeArea === 'city'/, 'outdoor recurring interaction must follow active placement');
assert.match(mainSource, /recurringCharacterAvailable\(npc\.storyId, intr\.id\)/,
  'interior interaction must follow the character schedule');
assert.match(mainSource, /recurringNpcSchedule:\s*\(\)/, 'browser acceptance bridge must expose recurring schedules');
assert.match(mainSource, /registerSanitationRecurringCharacter\(\);/,
  'Denise Hall must join the same schedule runtime as the interior cast');

for (const stationType of ['frostbox-shop', 'custom-chain-builder', 'kicks-and-fits-shop', 'police-desk', 'sanitation-jobs']) {
  assert.match(mainSource, new RegExp(`case '${stationType}'`),
    `${stationType} service must remain independently callable while its character moves`);
}

console.log('Starter Town recurring-character schedule acceptance passed:');
console.log(`- ${STARTER_TOWN_RECURRING_SCHEDULES.length} named characters have live morning/afternoon/evening placements`);
console.log(`- ${exteriorSlots} placements move authored characters into reachable city locations`);
console.log('- interior and outdoor interactions follow the saved world clock');
console.log('- existing service stations remain available when a character is elsewhere');
