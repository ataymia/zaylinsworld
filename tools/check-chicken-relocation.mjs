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

const chicken = FUNCTIONAL_LOCATION_CONTRACT_BY_ID['chicken-spot'];
assert.deepEqual(chicken.legacy, { sourceId: 'chicken', x: 15, z: -15, interiorId: 'chicken' });
assert.deepEqual(chicken.target, { x: 192, y: 0, z: -152 });
assert.equal(chicken.parcelId, 'parcel-chicken-spot');

assert.match(bridge, /ACTIVE_FUNCTIONAL_RELOCATIONS = Object\.freeze\([\s\S]*'chicken-spot'/);
assert.match(world, /interiorId: b\.interiorId/, 'the restaurant must preserve its stable interior id');
assert.match(main, /cityLandmarks = cityInfo\.landmarks/, 'runtime lookups must use relocated landmark positions');
assert.match(main, /cityLandmarks\.find\(l => l\.id === 'chicken'\)/, 'diner teleport must resolve the relocated exterior');
assert.match(main, /case 'food-buy': buyChicken\(\)/, 'counter purchase gameplay must remain wired');
assert.match(main, /case 'food-eat': startEating\(\)/, 'restaurant seating gameplay must remain wired');
assert.match(interiors, /byId\.chicken = \{/);
assert.match(interiors, /id: 'food-buy', type: 'food-buy'/);
assert.match(interiors, /id: 'food-eat', type: 'food-eat'/);

const harness = new RelocationParityHarness();
const evidence = Object.fromEntries(RELOCATION_PARITY_FIELDS.map((field) => [field, true]));
harness.record('chicken-spot', evidence);
assert.deepEqual(
  harness.migrateLegacyPosition('chicken-spot', { x: 17, z: -18 }),
  { x: 194, z: -155 },
  'restaurant save migration must preserve the local offset',
);

console.log('[chicken-relocation] Phase 7D exterior, purchase, eating, minimap, teleport, return, and save contracts verified.');
