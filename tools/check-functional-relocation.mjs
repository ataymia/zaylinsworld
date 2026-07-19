import assert from 'node:assert/strict';
import {
  FUNCTIONAL_LOCATION_CONTRACTS,
  RELOCATION_PARITY_FIELDS,
  RelocationParityHarness,
} from '../src/runtime/FunctionalLocationRelocation.js';

assert.equal(FUNCTIONAL_LOCATION_CONTRACTS.length, 13, 'every planned Starter Town functional location needs a contract');
assert.equal(new Set(FUNCTIONAL_LOCATION_CONTRACTS.map((entry) => entry.stableId)).size, 13, 'stable location IDs must be unique');
assert.equal(RELOCATION_PARITY_FIELDS.length, 15, 'the Phase 7A parity gate must preserve every required live system');

for (const contract of FUNCTIONAL_LOCATION_CONTRACTS) {
  assert.equal(contract.locationId, contract.stableId, `${contract.locationId} must preserve its stable ID`);
  assert.ok(contract.parcelId.startsWith('parcel-'), `${contract.locationId} must have an assigned parcel`);
  assert.ok(Number.isFinite(contract.legacy.x) && Number.isFinite(contract.legacy.z), `${contract.locationId} needs a legacy anchor`);
  assert.ok(Number.isFinite(contract.target.x) && Number.isFinite(contract.target.z), `${contract.locationId} needs a target anchor`);
  assert.ok(contract.assetRef?.preferred, `${contract.locationId} needs an ID-stable asset replacement contract`);
}

const harness = new RelocationParityHarness();
assert.equal(harness.snapshot().ready, 0, 'locations must remain blocked until live evidence is recorded');
assert.throws(() => harness.assertReady('zaylins-home'), /relocation blocked/);

const allEvidence = Object.fromEntries(RELOCATION_PARITY_FIELDS.map((field) => [field, true]));
const ready = harness.record('zaylins-home', allEvidence);
assert.equal(ready.readyForCutover, true, 'complete evidence must unlock one controlled cutover');
const migrated = harness.migrateLegacyPosition('zaylins-home', { x: 2, y: 0, z: 45 });
assert.deepEqual(migrated, { x: 50, y: 0, z: 829 }, 'legacy save position must preserve its local offset at the new parcel');
assert.equal(harness.snapshot().ready, 1, 'one cutover must not unlock unrelated locations');

console.log('[functional-relocation] 13 stable contracts and the 15-field Phase 7A cutover gate verified.');
