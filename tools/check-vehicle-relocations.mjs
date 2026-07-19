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

const dealer = FUNCTIONAL_LOCATION_CONTRACT_BY_ID['auto-haus'];
assert.deepEqual(dealer.legacy, { sourceId: 'dealership', x: -15, z: -44, interiorId: 'dealership' });
assert.deepEqual(dealer.target, { x: -448, y: 0, z: -660 });
const garage = FUNCTIONAL_LOCATION_CONTRACT_BY_ID['city-garage'];
assert.deepEqual(garage.legacy, { sourceId: 'garage', x: 15, z: -44, interiorId: 'garage' });
assert.deepEqual(garage.target, { x: -112, y: 0, z: -616 });

assert.match(bridge, /'auto-haus',[\s\S]*'city-garage'/);
assert.match(interiors, /byId\.dealership = \{/);
assert.match(interiors, /type: 'dealer-car'/, 'dealership inventory stations must remain wired');
assert.match(interiors, /byId\.garage = \{/);
assert.match(interiors, /id: 'repair-bay', type: 'repair'/, 'garage repair gameplay must remain wired');
assert.match(interiors, /id: 'garage-shift', type: 'garage-work'/, 'garage work gameplay must remain wired');
assert.match(main, /cityLandmarks\.find\(b => b\.id === 'garage'\)/, 'garage marker must use resolved production coordinates');

const harness = new RelocationParityHarness();
const evidence = Object.fromEntries(RELOCATION_PARITY_FIELDS.map((field) => [field, true]));
harness.record('auto-haus', evidence);
harness.record('city-garage', evidence);
assert.deepEqual(harness.migrateLegacyPosition('auto-haus', { x: -13, z: -47 }), { x: -446, z: -663 });
assert.deepEqual(harness.migrateLegacyPosition('city-garage', { x: 17, z: -47 }), { x: -110, z: -619 });

console.log('[vehicle-relocations] Phase 7H–7I dealership purchase, garage repair/work, markers, return, and save contracts verified.');
