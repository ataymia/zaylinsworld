import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  FUNCTIONAL_LOCATION_CONTRACT_BY_ID,
  RELOCATION_PARITY_FIELDS,
  RelocationParityHarness,
} from '../src/runtime/FunctionalLocationRelocation.js';

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [bridge, world, main, minimap, state] = await Promise.all([
  source('src/runtime/ProductionWorldBridge.js'),
  source('src/world.js'),
  source('src/main.js'),
  source('src/minimap.js'),
  source('src/state.js'),
]);

const home = FUNCTIONAL_LOCATION_CONTRACT_BY_ID['zaylins-home'];
assert.deepEqual(home.legacy, { sourceId: 'home', x: 0, z: 44, interiorId: 'home' });
assert.deepEqual(home.target, { x: 48, y: 0, z: 828 });
assert.deepEqual(home.spawn, { x: 48, y: 0, z: 802 });
assert.equal(home.parcelId, 'parcel-zaylins-home');

assert.match(bridge, /ACTIVE_FUNCTIONAL_RELOCATIONS = Object\.freeze\(\[[^\]]*'zaylins-home'/);
assert.match(bridge, /return bridge\.attached \? ACTIVE_FUNCTIONAL_RELOCATIONS : \[\]/, 'compact fallback must remain available');
assert.match(world, /relocatedLocationIds = \[\]/, 'city builder must accept bounded relocation input');
assert.match(world, /ZW_LocationPlaceholder_\$\{b\.locationId\}/, 'live exterior must hide its large-shell placeholder');
assert.match(main, /finalizeFunctionalRelocations\(cityInfo\)/);
assert.match(main, /home-mailbox/);
assert.match(main, /registerStarterHome\(state\)/, 'home cutover must use the shared ownership contract');
assert.match(main, /migrateLegacyPosition\(relocation\.locationId, state\.pos\)/);
assert.match(minimap, /landmarkLayout = landmarks/);
assert.match(state, /SAVE_SCHEMA_VERSION = 8/);
assert.match(state, /relocatedLocations:/);

const harness = new RelocationParityHarness();
const evidence = Object.fromEntries(RELOCATION_PARITY_FIELDS.map((field) => [field, true]));
harness.record('zaylins-home', evidence);
assert.deepEqual(
  harness.migrateLegacyPosition('zaylins-home', { x: 1, z: 43 }),
  { x: 49, z: 827 },
  'home save migration must preserve the local offset',
);

console.log('[home-relocation] Phase 7B fallback, exterior, interior, mailbox, minimap, respawn, and save contracts verified.');
