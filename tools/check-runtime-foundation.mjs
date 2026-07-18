import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const source = async (file) => readFile(path.join(ROOT, file), 'utf8');
const importLocal = (file) => import(pathToFileURL(path.join(ROOT, file)).href);

const { PLAYER_SKIN_TONES } = await importLocal('src/config/skinPalette.js');
assert.equal(PLAYER_SKIN_TONES.length, 20, 'player palette must expose 20 inclusive tones');
assert.equal(PLAYER_SKIN_TONES[0].id, 'obsidian', 'the darkest player tone must lead the palette');
assert.equal(PLAYER_SKIN_TONES.at(-1).id, 'porcelain', 'the palette must remain ordered darkest to lightest');
assert.ok(PLAYER_SKIN_TONES.slice(0, 5).every((tone) => tone.textureLift <= 0.045), 'deep tones must not be washed toward white');
assert.ok(new Set(PLAYER_SKIN_TONES.map((tone) => tone.id)).size === PLAYER_SKIN_TONES.length, 'skin-tone IDs must be unique');

const { STARTER_TOWN_RUNTIME_PLAN } = await importLocal('src/config/starterTownRuntimePlan.js');
assert.equal(STARTER_TOWN_RUNTIME_PLAN.districts.length, 9, 'Starter Town must have nine districts');
assert.equal(STARTER_TOWN_RUNTIME_PLAN.locations.length, 13, 'Starter Town must preserve thirteen locked functional anchors');
assert.equal(STARTER_TOWN_RUNTIME_PLAN.streamingCellSize, 250, 'Starter Town streaming cells must be 250 units');
assert.deepEqual(STARTER_TOWN_RUNTIME_PLAN.playableBounds, { minX: -1000, maxX: 1000, minZ: -1000, maxZ: 1000 });
assert.deepEqual(STARTER_TOWN_RUNTIME_PLAN.terrainBounds, { minX: -1200, maxX: 1200, minZ: -1200, maxZ: 1200 });
for (const id of ['dreamdrop-beltway', 'northworks-expressway', 'fishing-highway-gateway', 'eastgate-parkway', 'school-loop', 'parkside-crescent']) {
  assert.ok(STARTER_TOWN_RUNTIME_PLAN.routes.some((route) => route.id === id), `missing locked route ${id}`);
}

const { WorldRegistry } = await importLocal('src/runtime/WorldRegistry.js');
const registry = new WorldRegistry();
const world = registry.snapshot();
assert.equal(world.districts, 9);
assert.equal(world.locations, 13);
assert.ok(world.towns >= 9, 'connected world town records must remain available');
assert.equal(registry.location('zaylins-home').position.z, 828);
assert.equal(registry.districtAt({ x: 48, z: 828 })?.id, 'willowbend-residential');
assert.equal(registry.featureEnabled('starterTownLargeWorld'), false, 'large town must remain opt-in during parity construction');

const { StreamingGrid } = await importLocal('src/runtime/StreamingGrid.js');
const grid = new StreamingGrid({ bounds: STARTER_TOWN_RUNTIME_PLAN.terrainBounds, cellSize: 250 });
const firstChanges = grid.update({ x: 0, z: 0 });
assert.ok(firstChanges.length > 0, 'streaming grid must activate cells on first position update');
assert.equal(grid.snapshot().counts.active, 9, 'radius-one active ring must contain nine cells');
assert.ok(grid.snapshot().counts.warm > 0 && grid.snapshot().counts.far > 0, 'streaming grid must provide warm and far rings');

const { ObjectPool } = await importLocal('src/runtime/ObjectPool.js');
let created = 0;
const pool = new ObjectPool({ create: () => ({ id: ++created }), maxSize: 2 });
const first = pool.acquire();
assert.equal(pool.release(first), true);
const second = pool.acquire();
assert.equal(first, second, 'object pool must reuse released items');
assert.equal(pool.snapshot().reused, 1);

const { RoadNetwork } = await importLocal('src/world/RoadNetwork.js');
const roads = new RoadNetwork(STARTER_TOWN_RUNTIME_PLAN.routes);
assert.ok(roads.snapshot().segments >= STARTER_TOWN_RUNTIME_PLAN.routes.length, 'road network must create polyline segments');
assert.equal(roads.isOnRoad({ x: 0, z: 0 }), true, 'central test point must be on Centre Avenue');
assert.ok(roads.intersections().length > 0, 'road graph must discover shared route nodes');

const { InteractionManager } = await importLocal('src/interaction.js');
const interactions = new InteractionManager();
interactions.register({
  id: 'inspect-test', type: 'inspect', getPosition: () => ({ distanceTo: () => 1 }), onInteract: () => 'inspect',
});
interactions.register({
  id: 'mission-test', type: 'mission', getPosition: () => ({ distanceTo: () => 1 }), onInteract: () => 'mission',
});
assert.equal(interactions.findNearest({}, null)?.id, 'mission-test', 'overlapping prompts must select the higher-priority interaction');

const [loader, assets, state, modular, largeTown, lifecycle, diagnostics] = await Promise.all([
  source('src/loader.js'),
  source('src/assets.js'),
  source('src/state.js'),
  source('src/modularPlayer.js'),
  source('src/world/LargeStarterTown.js'),
  source('src/runtime/SceneLifecycle.js'),
  source('src/runtime/RuntimeDiagnostics.js'),
]);
assert.match(loader, /loadingManager\.onStart =/, 'loader must track work before DOM initialization');
assert.match(loader, /revealRequested/, 'loader must gate reveal on readiness');
assert.match(loader, /await nextFrame\(\);\s*await nextFrame\(\);/, 'loader must settle for two clean frames');
assert.match(assets, /new GLTFLoader\(loadingManager\)/, 'GLBs must report to the shared loader');
assert.match(assets, /assetRuntimeRegistry\.load\(\)/, 'asset indexes must warm into the runtime resolver');
assert.match(state, /SAVE_SCHEMA_VERSION = 4/, 'save schema must be versioned');
assert.match(state, /checksum\(payloadText\)/, 'save payload must be checksummed');
assert.match(state, /BACKUP_KEY/, 'save migration must preserve a backup');
assert.match(modular, /tone\.textureLift/, 'skin renderer must use per-tone texture lift');
assert.doesNotMatch(modular, /lerp\(new THREE\.Color\('#ffffff'\), 0\.3\)/, 'skin renderer must not wash every tone 30% toward white');
assert.match(largeTown, /featureEnabled\('starterTownLargeWorld'\)/, 'large town must remain feature-gated');
assert.match(largeTown, /loadRegisteredAsset/, 'large town must consume only registered ready assets');
assert.match(lifecycle, /deterministic ownership and cleanup/i);
assert.match(diagnostics, /budgetViolations/, 'runtime diagnostics must report performance-budget violations');

console.log('[runtime-foundation] inclusive character palette, real loader, Phase 2 contracts, Phase 3 streaming, and Phase 4/5 skeleton verified.');
