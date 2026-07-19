import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  FUNCTIONAL_LOCATION_CONTRACT_BY_ID,
  RELOCATION_PARITY_FIELDS,
  RelocationParityHarness,
} from '../src/runtime/FunctionalLocationRelocation.js';

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [bridge, world, main, interiors, phase] = await Promise.all([
  source('src/runtime/ProductionWorldBridge.js'),
  source('src/world.js'),
  source('src/main.js'),
  source('src/interiors.js'),
  source('src/config/buildPhaseStatus.js'),
]);

const gas = FUNCTIONAL_LOCATION_CONTRACT_BY_ID['6twelve'];
assert.deepEqual(gas.legacy, { sourceId: 'gas', x: -46, z: 24, interiorId: 'gas' });
assert.deepEqual(gas.target, { x: 832, y: 0, z: 232 });
assert.equal(gas.enterable, true);
const park = FUNCTIONAL_LOCATION_CONTRACT_BY_ID['dreamdrop-park'];
assert.deepEqual(park.legacy, { sourceId: 'park', x: 15, z: 15, interiorId: null });
assert.deepEqual(park.target, { x: 420, y: 0, z: 568 });
assert.equal(park.enterable, false);

assert.match(bridge, /'6twelve',[\s\S]*'dreamdrop-park'/);
assert.match(main, /buildProceduralGasStation\(gasContract\)/, 'the full gas exterior must use the relocation contract');
assert.match(main, /refuelPoints = \[\{ x: GX \+ 2\.6, z: GZ/, 'the refuel zone must move with the forecourt');
assert.match(main, /entranceMap\.gas = \{ doorPos:/, 'the gas interior must return to the relocated store');
assert.match(interiors, /byId\.gas = \{/);
assert.match(interiors, /id: 'gas-checkout', type: 'buy-snack'/);
assert.match(world, /PARK\.trees\.map\(\(\[x, z\]\) => \[x \+ parkDx, z \+ parkDz\]\)/);
assert.match(world, /ZW_FunctionalLocation_dreamdrop-park/);
assert.match(world, /const landmarkMarkers = \[\.\.\.landmarkLayout\]/,
  'public-space markers must be kept separate from enterable-building blueprints');
assert.match(world, /landmarkMarkers\.push\(\{[\s\S]*locationId: 'dreamdrop-park'/,
  'Dreamdrop Park must be registered as a marker without entering the building loop');
assert.doesNotMatch(world, /landmarkLayout\.push\(\{[\s\S]*locationId: 'dreamdrop-park'/,
  'Dreamdrop Park cannot be passed to makeBuilding because it has no facing tuple');
assert.match(main, /doorInteraction: !requiresDoor \|\|/, 'non-enterable public space parity must not require a fake door');
assert.match(phase, /phase\('7', 'Functional location relocation', 'implemented'/);

const harness = new RelocationParityHarness();
const evidence = Object.fromEntries(RELOCATION_PARITY_FIELDS.map((field) => [field, true]));
harness.record('6twelve', evidence);
harness.record('dreamdrop-park', evidence);
assert.deepEqual(harness.migrateLegacyPosition('6twelve', { x: -44, z: 21 }), { x: 834, z: 229 });
assert.deepEqual(harness.migrateLegacyPosition('dreamdrop-park', { x: 17, z: 12 }), { x: 422, z: 565 });

console.log('[infrastructure-relocations] Phase 7M–7N gas/store/refuel and full park-layout contracts verified.');
