import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  FUNCTIONAL_LOCATION_CONTRACT_BY_ID,
  RELOCATION_PARITY_FIELDS,
  RelocationParityHarness,
} from '../src/runtime/FunctionalLocationRelocation.js';

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [bridge, world, main, interiors, minimap] = await Promise.all([
  source('src/runtime/ProductionWorldBridge.js'),
  source('src/world.js'),
  source('src/main.js'),
  source('src/interiors.js'),
  source('src/minimap.js'),
]);

const school = FUNCTIONAL_LOCATION_CONTRACT_BY_ID['zaylins-prep'];
assert.deepEqual(school.legacy, { sourceId: 'school', x: -44, z: -24, interiorId: 'school' });
assert.deepEqual(school.target, { x: -780, y: 0, z: 72 });
assert.deepEqual(school.frontageFace, [1, 0]);
assert.equal(school.parcelId, 'parcel-zaylins-prep');
assert.equal(school.stableId, 'zaylins-prep');

assert.match(bridge, /ACTIVE_FUNCTIONAL_RELOCATIONS = Object\.freeze\(\[[^\]]*'zaylins-prep'/);
assert.match(bridge, /return bridge\.attached \? ACTIVE_FUNCTIONAL_RELOCATIONS : \[\]/, 'compact fallback must remain available');
assert.match(world, /contractByLegacyId/, 'the relocated school must resolve from its stable legacy binding');
assert.match(world, /interiorId: b\.interiorId/, 'the school entrance must preserve its stable interior id');
assert.match(main, /interiors\?\.byId\?\.\[relocation\.contract\.interiorId\]/, 'cutover must verify the live school interior');
assert.match(main, /entranceMap\[relocation\.contract\.interiorId\]\?\.doorPos/, 'school exits must return to the relocated exterior');
assert.match(interiors, /byId\.school = \{/);
assert.match(interiors, /id: 'study-desk', type: 'study'/, 'school study gameplay must remain available');
assert.match(minimap, /landmarkLayout/, 'the relocated school must use the resolved minimap layout');

const harness = new RelocationParityHarness();
const evidence = Object.fromEntries(RELOCATION_PARITY_FIELDS.map((field) => [field, true]));
harness.record('zaylins-prep', evidence);
assert.deepEqual(
  harness.migrateLegacyPosition('zaylins-prep', { x: -42, z: -26 }),
  { x: -778, z: 70 },
  'school save migration must preserve the local offset',
);

console.log('[school-relocation] Phase 7C exterior, interior, study, minimap, return, and save contracts verified.');
