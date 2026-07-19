import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  FUNCTIONAL_LOCATION_CONTRACT_BY_ID,
  RELOCATION_PARITY_FIELDS,
  RelocationParityHarness,
} from '../src/runtime/FunctionalLocationRelocation.js';

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [bridge, main, interiors] = await Promise.all([
  source('src/runtime/ProductionWorldBridge.js'),
  source('src/main.js'),
  source('src/interiors.js'),
]);

const expected = {
  frostbox: { sourceId: 'frostbox', legacy: [-15, -15], target: [-168, -88], interiorId: 'frostbox' },
  'kicks-fits': { sourceId: 'kicks', legacy: [-15, 15], target: [-72, 352], interiorId: 'kicks' },
  'block-supply': { sourceId: 'blocksupply', legacy: [-44, 0], target: [-568, 280], interiorId: 'blocksupply' },
};

for (const [id, spec] of Object.entries(expected)) {
  const contract = FUNCTIONAL_LOCATION_CONTRACT_BY_ID[id];
  assert.deepEqual(contract.legacy, {
    sourceId: spec.sourceId,
    x: spec.legacy[0],
    z: spec.legacy[1],
    interiorId: spec.interiorId,
  });
  assert.deepEqual(contract.target, { x: spec.target[0], y: 0, z: spec.target[1] });
  assert.ok(contract.parcelId);
}

assert.match(bridge, /'frostbox',[\s\S]*'kicks-fits',[\s\S]*'block-supply'/);
assert.match(interiors, /byId\.frostbox = \{/);
assert.match(interiors, /jewelryMounts:/, 'Frostbox jewelry displays must remain wired');
assert.match(interiors, /byId\.kicks = \{/);
assert.match(interiors, /id: 'wardrobe-store', type: 'wardrobe'/, 'Kicks wardrobe gameplay must remain wired');
assert.match(interiors, /byId\.blocksupply = \{/);
assert.match(interiors, /id: 'gear-shop', type: 'gear-shop'/, 'Block Supply gear gameplay must remain wired');
assert.match(interiors, /id: 'weapon-shop', type: 'weapon-shop'/, 'Block Supply weapon gameplay must remain wired');
assert.match(main, /migrateLegacyPosition\(relocation\.locationId, state\.pos\)/);

const harness = new RelocationParityHarness();
const evidence = Object.fromEntries(RELOCATION_PARITY_FIELDS.map((field) => [field, true]));
for (const id of Object.keys(expected)) harness.record(id, evidence);
assert.deepEqual(harness.migrateLegacyPosition('frostbox', { x: -13, z: -18 }), { x: -166, z: -91 });
assert.deepEqual(harness.migrateLegacyPosition('kicks-fits', { x: -13, z: 12 }), { x: -70, z: 349 });
assert.deepEqual(harness.migrateLegacyPosition('block-supply', { x: -42, z: -3 }), { x: -566, z: 277 });

console.log('[retail-relocations] Phase 7E–7G Frostbox, Kicks & Fits, and Block Supply contracts verified.');
