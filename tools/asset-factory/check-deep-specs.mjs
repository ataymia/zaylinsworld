import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { classifyDeepAsset } from './deep-spec-semantics.mjs';

const ROOT = process.cwd();
const MASTER_PATH = join(ROOT, 'asset-factory', 'generated', 'master-asset-specs.json');
const DEEP_PATH = join(ROOT, 'asset-factory', 'generated', 'deep-asset-specs.json');
const COVERAGE_PATH = join(ROOT, 'asset-factory', 'generated', 'deep-spec-coverage.json');
const REQUIRED_BRIEF_FIELDS = [
  'identity',
  'blueprintEvidence',
  'gameplayAndWorldRole',
  'placement',
  'silhouetteAndProportion',
  'targetDimensionsMeters',
  'structuralConstruction',
  'requiredComponents',
  'materialPlan',
  'townArtDirection',
  'conditionAndWear',
  'interactionAndAnimation',
  'collision',
  'orientationAndPivot',
  'optimization',
  'lod',
  'exportHierarchy',
  'qualityBudget',
  'qaChecklist',
  'rejectionCriteria',
  'licensingAndProvenance',
];
const FORBIDDEN_PLACEHOLDERS = /\b(?:todo|tbd|fixme|lorem ipsum|describe later|unknown asset|generic thing)\b/i;
const SEMANTIC_CONTRADICTIONS = [
  ['vegetation', /streetlight|hydrant|bench|trash_can|utility_box|traffic_light/i],
  ['food', /trash_can|dumpster|utility|streetlight|hydrant/i],
  ['character', /(?:sign|guardrail|monitor_wall|security_camera|terminal|desk|building_)/i],
  ['architecture', /^(?:prop|furniture|equipment)_.*(?:desk|table|bed|bench|chair|kiosk|terminal|cabinet|locker|sign|display)/i],
  ['vehicle', /(?:bus_shelter|boatworks|boat_rental|houseboat_bed|dock_power|knot_training)/i],
];

for (const path of [MASTER_PATH, DEEP_PATH, COVERAGE_PATH]) {
  if (!existsSync(path)) throw new Error(`Missing deep-spec input: ${path}`);
}

const master = JSON.parse(readFileSync(MASTER_PATH, 'utf8'));
const deep = JSON.parse(readFileSync(DEEP_PATH, 'utf8'));
const coverage = JSON.parse(readFileSync(COVERAGE_PATH, 'utf8'));
const failures = [];

if (deep.assets.length !== master.assets.length) {
  failures.push(`Deep asset count ${deep.assets.length} does not equal master count ${master.assets.length}.`);
}

if (coverage.expectedFromMaster !== master.assets.length || coverage.produced !== deep.assets.length) {
  failures.push('Coverage summary does not match source and output counts.');
}

const masterIds = new Set(master.assets.map((asset) => asset.id));
const deepIds = new Set(deep.assets.map((asset) => asset.id));
if (masterIds.size !== master.assets.length) failures.push('Master asset library contains duplicate IDs.');
if (deepIds.size !== deep.assets.length) failures.push('Deep asset library contains duplicate IDs.');
for (const id of masterIds) {
  if (!deepIds.has(id)) failures.push(`Missing deep brief for ${id}.`);
}

const exactDescriptions = new Map();
const exactPrompts = new Map();
const briefHashes = new Map();
const computedCategoryCounts = {};

for (const asset of deep.assets) {
  const label = asset.id || asset.fileName || '<unknown>';
  const expectedCategory = classifyDeepAsset(asset);
  computedCategoryCounts[expectedCategory] = (computedCategoryCounts[expectedCategory] || 0) + 1;

  if (asset.semanticCategory !== expectedCategory) {
    failures.push(`${label}: semantic category ${asset.semanticCategory} does not match deterministic category ${expectedCategory}.`);
  }
  for (const [category, pattern] of SEMANTIC_CONTRADICTIONS) {
    if (asset.semanticCategory === category && pattern.test(asset.fileName)) {
      failures.push(`${label}: semantic category ${category} contradicts the physical object name.`);
    }
  }
  if (!asset.deepDescription || asset.deepDescription.length < deep.descriptionMinimumCharacters) {
    failures.push(`${label}: deep description is ${asset.deepDescription?.length || 0} characters; minimum is ${deep.descriptionMinimumCharacters}.`);
  }
  if (!asset.generationPrompt || asset.generationPrompt.length < deep.generationPromptMinimumCharacters) {
    failures.push(`${label}: generation prompt is ${asset.generationPrompt?.length || 0} characters; minimum is ${deep.generationPromptMinimumCharacters}.`);
  }
  if (!asset.negativePrompt || asset.negativePrompt.length < 250) {
    failures.push(`${label}: negative prompt is missing or too short.`);
  }
  if (FORBIDDEN_PLACEHOLDERS.test(`${asset.deepDescription} ${asset.generationPrompt}`)) {
    failures.push(`${label}: description contains placeholder language.`);
  }
  if (!asset.deepDescription.includes(asset.displayName)) {
    failures.push(`${label}: deep description does not name the asset display name.`);
  }
  if (!asset.deepDescription.includes(asset.town)) {
    failures.push(`${label}: deep description does not identify its town.`);
  }
  if (!asset.deepDescription.includes(`resolved semantic category is ${asset.semanticCategory}`)) {
    failures.push(`${label}: deep description does not record its resolved semantic category.`);
  }
  if (!asset.sourceContext?.excerpt || asset.sourceContext.excerpt.length < 40) {
    failures.push(`${label}: blueprint context excerpt is missing or too short.`);
  }
  if (String(asset.sourceDoc || '').endsWith('.json') && !asset.sourceContext.excerpt.includes(asset.displayName)) {
    failures.push(`${label}: manual canonical context does not identify the specific asset.`);
  }
  if (!asset.productionBrief || typeof asset.productionBrief !== 'object') {
    failures.push(`${label}: production brief is missing.`);
    continue;
  }
  for (const field of REQUIRED_BRIEF_FIELDS) {
    if (!(field in asset.productionBrief)) failures.push(`${label}: production brief is missing ${field}.`);
  }
  if (!Array.isArray(asset.productionBrief.requiredComponents) || asset.productionBrief.requiredComponents.length < 3) {
    failures.push(`${label}: fewer than three required components are specified.`);
  }
  if (!Array.isArray(asset.productionBrief.qaChecklist) || asset.productionBrief.qaChecklist.length < 12) {
    failures.push(`${label}: QA checklist has fewer than 12 checks.`);
  }
  if (!asset.productionBrief.qaChecklist.some((item) => item.includes(`resolved as ${asset.semanticCategory}`))) {
    failures.push(`${label}: QA checklist does not enforce semantic-category correctness.`);
  }
  if (!Array.isArray(asset.productionBrief.rejectionCriteria) || asset.productionBrief.rejectionCriteria.length < 8) {
    failures.push(`${label}: rejection criteria have fewer than eight rules.`);
  }
  if (!Array.isArray(asset.productionBrief.exportHierarchy) || asset.productionBrief.exportHierarchy.length < 5) {
    failures.push(`${label}: export hierarchy is incomplete.`);
  }
  if (!asset.productionBrief.lod?.lod0 || !asset.productionBrief.lod?.lod1 || !asset.productionBrief.lod?.lod2) {
    failures.push(`${label}: LOD plan is incomplete.`);
  }
  if (!asset.briefHash || asset.briefHash.length !== 64) failures.push(`${label}: SHA-256 brief hash is missing.`);

  const descriptionOwners = exactDescriptions.get(asset.deepDescription) || [];
  descriptionOwners.push(label);
  exactDescriptions.set(asset.deepDescription, descriptionOwners);
  const promptOwners = exactPrompts.get(asset.generationPrompt) || [];
  promptOwners.push(label);
  exactPrompts.set(asset.generationPrompt, promptOwners);
  const hashOwners = briefHashes.get(asset.briefHash) || [];
  hashOwners.push(label);
  briefHashes.set(asset.briefHash, hashOwners);
}

for (const owners of exactDescriptions.values()) {
  if (owners.length > 1) failures.push(`Exact duplicate deep description: ${owners.join(', ')}.`);
}
for (const owners of exactPrompts.values()) {
  if (owners.length > 1) failures.push(`Exact duplicate generation prompt: ${owners.join(', ')}.`);
}
for (const owners of briefHashes.values()) {
  if (owners.length > 1) failures.push(`Duplicate brief hash: ${owners.join(', ')}.`);
}

if (JSON.stringify(coverage.categoryCounts) !== JSON.stringify(computedCategoryCounts)) {
  failures.push('Coverage semantic category counts do not match deterministic classification.');
}
if (JSON.stringify(deep.counts.categories) !== JSON.stringify(computedCategoryCounts)) {
  failures.push('Deep-library semantic category counts do not match deterministic classification.');
}
if (coverage.descriptionsAtOrAboveMinimum !== deep.assets.length) failures.push('Coverage reports a short deep description.');
if (coverage.promptsAtOrAboveMinimum !== deep.assets.length) failures.push('Coverage reports a short generation prompt.');
if (coverage.assetsWithBlueprintContext !== deep.assets.length) failures.push('Coverage reports an asset without blueprint context.');
if (coverage.assetsWithQaChecklists !== deep.assets.length) failures.push('Coverage reports an incomplete QA checklist.');
if (coverage.assetsWithRejectionCriteria !== deep.assets.length) failures.push('Coverage reports incomplete rejection criteria.');
if (coverage.uniqueBriefHashes !== deep.assets.length) failures.push('Coverage reports non-unique brief hashes.');

if (failures.length) {
  console.error(`[deep-specs] ${failures.length} validation failure(s)`);
  for (const failure of failures.slice(0, 250)) console.error(`- ${failure}`);
  if (failures.length > 250) console.error(`- ...and ${failures.length - 250} additional failures`);
  process.exit(1);
}

console.log(`[deep-specs] PASS: ${deep.assets.length} of ${master.assets.length} assets have complete, unique, semantically consistent production briefs.`);
console.log(`[deep-specs] Minimum deep description length: ${deep.descriptionMinimumCharacters} characters.`);
console.log(`[deep-specs] Minimum generation prompt length: ${deep.generationPromptMinimumCharacters} characters.`);
console.log(`[deep-specs] Categories: ${Object.entries(deep.counts.categories).map(([name, count]) => `${name}=${count}`).join(', ')}`);
