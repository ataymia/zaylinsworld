import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DEEP_PATH = join(ROOT, 'asset-factory', 'generated', 'deep-asset-specs.json');
const COVERAGE_PATH = join(ROOT, 'asset-factory', 'generated', 'deep-spec-coverage.json');
if (!existsSync(DEEP_PATH) || !existsSync(COVERAGE_PATH)) {
  throw new Error('Deep specification outputs are missing.');
}

const deep = JSON.parse(readFileSync(DEEP_PATH, 'utf8'));
const coverage = JSON.parse(readFileSync(COVERAGE_PATH, 'utf8'));
const failures = [];
const EXPECTED_REFERENCE_SOURCES = new Set([
  'docs/ASSET_USAGE_REPORT.md',
  'docs/ASSET_CLEANUP_PLAN.md',
  'docs/CITY_BLUEPRINT_STANDARD.md',
  'docs/ASSET_CREATION_WORKFLOW.md',
]);
const EXPECTED_COUNTS = {
  'canonical-generation-request': 960,
  'manual-canonical-request': 2,
  'existing-asset-reference': 9,
  'naming-example': 3,
  'workflow-template-reference': 1,
  'documentation-command-fragment': 3,
};

const computed = {};
const referenceOnly = [];
const canonical = [];
for (const asset of deep.assets) {
  const label = asset.id || asset.fileName;
  const disposition = asset.inventoryDisposition;
  if (!disposition || typeof disposition !== 'object') {
    failures.push(`${label}: inventory disposition is missing.`);
    continue;
  }
  if (!disposition.intent || disposition.reason?.length < 40 || disposition.action?.length < 30) {
    failures.push(`${label}: inventory disposition is incomplete.`);
  }
  computed[disposition.intent] = (computed[disposition.intent] || 0) + 1;
  if (asset.productionBrief?.inventoryDisposition?.intent !== disposition.intent) {
    failures.push(`${label}: production brief inventory disposition is stale or missing.`);
  }
  if (asset.generationEligible !== disposition.generationEligible) {
    failures.push(`${label}: generation eligibility conflicts with its disposition.`);
  }
  if (disposition.generationEligible) {
    canonical.push(asset);
    if (asset.generationPrompt.startsWith('[REFERENCE ONLY — DO NOT GENERATE]')) {
      failures.push(`${label}: eligible asset carries a reference-only prompt prefix.`);
    }
    if (asset.productionBrief?.generationPolicy !== 'eligible-when-builder-and-town-are-ready') {
      failures.push(`${label}: eligible asset has the wrong generation policy.`);
    }
  } else {
    referenceOnly.push(asset);
    if (!EXPECTED_REFERENCE_SOURCES.has(asset.sourceDoc)) {
      failures.push(`${label}: reference-only record comes from an unexpected source ${asset.sourceDoc}.`);
    }
    if (!asset.generationPrompt.startsWith('[REFERENCE ONLY — DO NOT GENERATE]')) {
      failures.push(`${label}: reference-only generation prompt lacks the do-not-generate prefix.`);
    }
    if (asset.productionBrief?.generationPolicy !== 'reference-only-do-not-generate') {
      failures.push(`${label}: reference-only record has the wrong generation policy.`);
    }
    if (!asset.deepDescription.includes('Inventory audit:')) {
      failures.push(`${label}: reference-only description lacks its inventory audit explanation.`);
    }
  }
}

for (const [intent, expected] of Object.entries(EXPECTED_COUNTS)) {
  if (computed[intent] !== expected) {
    failures.push(`Inventory intent ${intent} has ${computed[intent] || 0} records; expected ${expected}.`);
  }
}
for (const unexpected of Object.keys(computed).filter((intent) => !(intent in EXPECTED_COUNTS))) {
  failures.push(`Unexpected inventory intent: ${unexpected}.`);
}
if (canonical.length !== 962) failures.push(`Canonical generation count is ${canonical.length}; expected 962.`);
if (referenceOnly.length !== 16) failures.push(`Reference-only count is ${referenceOnly.length}; expected 16.`);
if (deep.canonicalGenerationRequestCount !== canonical.length) failures.push('Deep-library canonical count is stale.');
if (coverage.canonicalGenerationRequestCount !== canonical.length) failures.push('Coverage canonical count is stale.');
if (deep.referenceOnlyRecordCount !== referenceOnly.length) failures.push('Deep-library reference-only count is stale.');
if (coverage.referenceOnlyRecordCount !== referenceOnly.length) failures.push('Coverage reference-only count is stale.');
if (new Set(deep.referenceOnlyRecordIds || []).size !== referenceOnly.length) failures.push('Deep-library reference-only ID list is incomplete or duplicated.');
if (new Set(coverage.referenceOnlyRecordIds || []).size !== referenceOnly.length) failures.push('Coverage reference-only ID list is incomplete or duplicated.');
if (JSON.stringify(deep.inventoryDispositionCounts) !== JSON.stringify(computed)) failures.push('Deep-library inventory counts do not match computed counts.');
if (JSON.stringify(coverage.inventoryDispositionCounts) !== JSON.stringify(computed)) failures.push('Coverage inventory counts do not match computed counts.');

if (failures.length) {
  console.error(`[inventory-audit] ${failures.length} validation failure(s)`);
  for (const failure of failures.slice(0, 200)) console.error(`- ${failure}`);
  if (failures.length > 200) console.error(`- ...and ${failures.length - 200} additional failures`);
  process.exit(1);
}

console.log('[inventory-audit] PASS: 978 records audited into 962 canonical generation requests and 16 reference-only records.');
console.log(`[inventory-audit] ${Object.entries(computed).map(([intent, count]) => `${intent}=${count}`).join(', ')}`);
