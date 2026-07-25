import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const source = async (file) => readFile(path.join(ROOT, file), 'utf8');
const importLocal = (file) => import(pathToFileURL(path.join(ROOT, file)).href);

const {
  BUILD_PHASES,
  BUILD_PHASE_BY_ID,
  NEXT_BUILD_PHASE,
  buildPhaseSummary,
} = await importLocal('src/config/buildPhaseStatus.js');

assert.ok(BUILD_PHASES.length >= 30, 'phase ledger must retain detailed subphases');
assert.equal(NEXT_BUILD_PHASE?.id, '8', 'the active construction ledger must keep Phase 8 as the current implementation phase');
assert.equal(BUILD_PHASE_BY_ID['7'].status, 'implemented', 'functional-location relocation must be implemented');
assert.equal(BUILD_PHASE_BY_ID['8'].status, 'partial', 'living-city cohesion must remain honest about live and shared-simulation work');
for (const id of ['2A', '2B', '2C', '2D', '2E', '3A', '3B', '3C', '3D', '3E', '4A', '4B', '4C', '4D', '4E', '4F', '4G', '5A', '5B', '5C', '5D', '5E', '5F', '5G', '6A', '6B', '6C', '6D', '6E']) {
  assert.ok(BUILD_PHASE_BY_ID[id], `phase ledger is missing ${id}`);
  assert.notEqual(BUILD_PHASE_BY_ID[id].status, 'planned', `${id} must record its implemented foundation`);
}
assert.equal(BUILD_PHASE_BY_ID['3F'].status, 'planned', 'performance acceptance must remain an honest live-verification phase');
assert.equal(BUILD_PHASE_BY_ID['5H'].status, 'planned', 'geographic drive-time acceptance must remain live verification');
assert.equal(buildPhaseSummary().next, '8');

const { createSpecialRoadForms } = await importLocal('src/world/SpecialRoadForms.js');
const special = createSpecialRoadForms();
assert.equal(special.ok, true, `special road-form errors: ${special.errors.join(', ')}`);
for (const type of ['roundabout', 'cul-de-sac', 'acceleration-lane', 'merge', 'raised-crosswalk', 'parking-entrance', 'service-apron']) {
  assert.ok(special.byType[type] > 0, `special road forms must include ${type}`);
}

const [
  pools,
  runtime,
  largeTown,
  diagnostics,
  phaseDoc,
  directWorkflow,
  previewHtml,
  previewSource,
  viteConfig,
  productionBridge,
  settings,
] = await Promise.all([
  source('src/runtime/GameObjectPools.js'),
  source('src/runtime/StarterTownRuntime.js'),
  source('src/world/LargeStarterTown.js'),
  source('src/runtime/RuntimeDiagnostics.js'),
  source('docs/ACTIVE_PHASE_STATUS.md'),
  source('docs/DIRECT_GITHUB_WORKFLOW.md'),
  source('large-town-preview.html'),
  source('src/largeTownPreview.js'),
  source('vite.config.js'),
  source('src/runtime/ProductionWorldBridge.js'),
  source('src/settings.js'),
]);

for (const poolId of ['civilians', 'police', 'traffic', 'police-vehicles', 'parked-vehicles', 'litter-pickups', 'effects', 'interaction-markers']) {
  assert.match(pools, new RegExp(poolId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `missing named pool ${poolId}`);
}
assert.match(pools, /releaseCellObjects/, 'cell unload must release pooled objects');
assert.match(pools, /performanceBudget/, 'pool sizes must follow graphics budgets');
assert.match(runtime, /ensureGameObjectPools/, 'Starter Town runtime must initialize named pools');
assert.match(runtime, /releaseCellObjects\(job\.cellId\)/, 'unload jobs must release their cell pools');
assert.match(runtime, /includeSpecialRoadForms: true/, 'large-town runtime must request special road forms');
assert.match(largeTown, /buildSpecialRoadFormsLayer/, 'large-town build must render approved special road forms');
assert.match(largeTown, /includeSpecialRoadForms = true/, 'special road forms must default on in the large-town preview');
assert.match(largeTown, /heightAt = starterTownHeightAt/, 'large-town builder must accept an explicit terrain-height contract');
assert.match(largeTown, /compatibilityMode = false/, 'normal gameplay must be able to request the flat compatibility shell');
assert.match(diagnostics, /buildPhaseSummary/, 'runtime diagnostics must expose the canonical phase ledger');
assert.match(diagnostics, /nextPhase:/, 'runtime report must print the next phase');
assert.match(phaseDoc, /Phase 7: Functional-location relocation/, 'active status must name the next phase');
assert.match(phaseDoc, /Phase 8: Living-city cohesion and live acceptance/, 'active status must name the current living-city phase');
assert.match(phaseDoc, /Phase 3F: Live acceptance/, 'active status must preserve live performance verification');
assert.match(directWorkflow, /Do not create new pull requests unless Mia explicitly requests one/, 'direct GitHub workflow must remain authoritative');
assert.match(previewHtml, /src\/largeTownPreview\.js/, 'preview HTML must load its isolated runtime entry');
assert.doesNotMatch(previewSource, /loadState|saveState|localStorage/, 'large-town preview must not touch the normal player save');
assert.match(previewSource, /forceBuild: true/, 'preview must force the feature-gated large town without changing production flags');
assert.match(previewSource, /placeReadyAssets/, 'preview must offer ready Asset Lab hydration');
assert.match(viteConfig, /starterTownPreview: resolve\(__dirname, 'large-town-preview\.html'\)/, 'Vite must build the preview page');

assert.match(productionBridge, /requestIdleCallback/, 'normal game must quietly preload Starter Town during Character Studio idle time');
assert.match(productionBridge, /creator-enter/, 'Enter City must pass through the production loading bridge');
assert.match(productionBridge, /creator-continue/, 'Continue Save must pass through the production loading bridge');
assert.match(productionBridge, /showLoadingScreen\('Entering Starter Town/, 'entering gameplay must reopen the real loading screen');
assert.match(productionBridge, /trackLoadingPromise/, 'large-town preparation must contribute to real loading readiness');
assert.match(productionBridge, /attachPreparedProductionWorld/, 'the prepared large-town group must attach to the actual gameplay scene');
assert.match(productionBridge, /functionalLocationRelocation\.snapshot\(\)/, 'the production report must expose the Phase 7A relocation gate');
assert.match(productionBridge, /heightAt: flatHeight/, 'normal gameplay compatibility shell must remain drivable with current vehicle elevation');
assert.match(settings, /installProductionWorldBridge\(\)/, 'settings dependency must install the production bridge before main scene creation');
assert.match(settings, /⚙ Graphics/, 'graphics controls must have a visible labeled button');
assert.match(settings, /z-index:260/, 'graphics button must sit above Character Studio');

console.log('[starter-town-phases] Phase 2–8 contracts, normal-game large-town preload, real entry loader, visible graphics controls, isolated preview, and direct workflow verified.');
