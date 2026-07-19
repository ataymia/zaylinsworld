import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  FUNCTIONAL_LOCATION_CONTRACT_BY_ID,
  RELOCATION_PARITY_FIELDS,
  RelocationParityHarness,
} from '../src/runtime/FunctionalLocationRelocation.js';

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [bridge, world, main, interiors] = await Promise.all([
  source('src/runtime/ProductionWorldBridge.js'),
  source('src/world.js'),
  source('src/main.js'),
  source('src/interiors.js'),
]);

const expected = {
  'police-station': { sourceId: 'police', legacy: [48, -24], target: [632, -312], interiorId: 'police' },
  worktower: { sourceId: 'office', legacy: [44, 24], target: [664, -20], interiorId: 'office' },
  'iron-city-gym': { sourceId: 'gym', legacy: [44, 0], target: [448, 448], interiorId: 'gym' },
};
for (const [id, spec] of Object.entries(expected)) {
  const contract = FUNCTIONAL_LOCATION_CONTRACT_BY_ID[id];
  assert.deepEqual(contract.legacy, { sourceId: spec.sourceId, x: spec.legacy[0], z: spec.legacy[1], interiorId: spec.interiorId });
  assert.deepEqual(contract.target, { x: spec.target[0], y: 0, z: spec.target[1] });
}

assert.match(bridge, /'police-station',[\s\S]*'worktower',[\s\S]*'iron-city-gym'/);
assert.match(world, /POLICE_POST\.lot\.cx \+ dx/, 'police parking must translate with the HQ');
assert.match(world, /POLICE_POST\.cruisers\.map/, 'parked cruisers must translate with the HQ');
assert.match(world, /locationId: 'police-station'/, 'police HQ must join relocation evidence');
assert.match(main, /\|\| relocation\.entrance/, 'special civic entrances must participate in the parity gate');
assert.match(interiors, /byId\.police = \{/);
assert.match(interiors, /id: 'police-desk-int', type: 'police-desk'/);
assert.match(interiors, /byId\.office = \{/);
assert.match(interiors, /id: 'job-board', type: 'job-work'/);
assert.match(interiors, /byId\.gym = \{/);
assert.match(interiors, /id: 'workout-bench', type: 'workout'/);

const harness = new RelocationParityHarness();
const evidence = Object.fromEntries(RELOCATION_PARITY_FIELDS.map((field) => [field, true]));
for (const id of Object.keys(expected)) harness.record(id, evidence);
assert.deepEqual(harness.migrateLegacyPosition('police-station', { x: 50, z: -27 }), { x: 634, z: -315 });
assert.deepEqual(harness.migrateLegacyPosition('worktower', { x: 46, z: 21 }), { x: 666, z: -23 });
assert.deepEqual(harness.migrateLegacyPosition('iron-city-gym', { x: 46, z: -3 }), { x: 450, z: 445 });

console.log('[civic-relocations] Phase 7J–7L public safety, work, gym, parking, return, and save contracts verified.');
