import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DEEP_PATH = join(ROOT, 'asset-factory', 'generated', 'deep-asset-specs.json');
const COVERAGE_PATH = join(ROOT, 'asset-factory', 'generated', 'deep-spec-coverage.json');
const deep = JSON.parse(readFileSync(DEEP_PATH, 'utf8'));
const coverage = JSON.parse(readFileSync(COVERAGE_PATH, 'utf8'));

const SOURCE_DISPOSITIONS = new Map([
  ['docs/ASSET_USAGE_REPORT.md', {
    intent: 'existing-asset-reference',
    generationEligible: false,
    reason: 'This filename was discovered inside an asset usage report describing files already indexed or under review. It is not a new Zaylins production request.',
    action: 'Inspect, retain, optimize, replace, or remove the existing repository asset through the asset-audit workflow. Do not generate a duplicate from this brief.',
  }],
  ['docs/ASSET_CLEANUP_PLAN.md', {
    intent: 'existing-asset-reference',
    generationEligible: false,
    reason: 'This filename appears in the cleanup plan as an existing duplicate or review candidate, not as a requested new asset.',
    action: 'Resolve the existing file through cleanup and deduplication. Do not create another model with the same generic name.',
  }],
  ['docs/CITY_BLUEPRINT_STANDARD.md', {
    intent: 'naming-example',
    generationEligible: false,
    reason: 'This filename is an illustrative naming-convention example in the city blueprint standard and is not listed in an actual town inventory.',
    action: 'Use the name only as a formatting example. Do not place it in the generation queue unless a real town blueprint later requests it.',
  }],
]);

function workflowDisposition(asset) {
  if (asset.fileName === 'base_character.glb') {
    return {
      intent: 'workflow-template-reference',
      generationEligible: false,
      reason: 'This is a placeholder name for a character-retargeting workflow input, not a requested world character.',
      action: 'Replace it with the documented licensed source character when the dedicated character pipeline is implemented. Do not generate a town asset named Base Character.',
    };
  }
  return {
    intent: 'documentation-command-fragment',
    generationEligible: false,
    reason: `The token ${asset.fileName} was extracted from a command or file-conversion example in the asset creation workflow. It is not an asset request.`,
    action: 'Exclude this token from every generation queue and treat it only as documentation syntax.',
  };
}

function dispositionFor(asset) {
  if (asset.sourceDoc === 'docs/ASSET_CREATION_WORKFLOW.md') return workflowDisposition(asset);
  if (SOURCE_DISPOSITIONS.has(asset.sourceDoc)) return SOURCE_DISPOSITIONS.get(asset.sourceDoc);
  if (asset.sourceDoc === 'asset-factory/manual-overrides.json') {
    return {
      intent: 'manual-canonical-request',
      generationEligible: true,
      reason: 'This hero or proof asset was deliberately added through the manual canonical override library.',
      action: 'Generate only through its dedicated builder and object-specific quality contract.',
    };
  }
  return {
    intent: 'canonical-generation-request',
    generationEligible: true,
    reason: 'This asset is explicitly listed in a town, ecosystem, travel, or gameplay-system blueprint and belongs in the production specification library.',
    action: 'Generate when its town palette, family builder, dependencies, and quality gates are production-ready.',
  };
}

function hashAsset(asset) {
  return createHash('sha256').update(JSON.stringify({
    id: asset.id,
    inventoryDisposition: asset.inventoryDisposition,
    deepDescription: asset.deepDescription,
    generationPrompt: asset.generationPrompt,
    productionBrief: asset.productionBrief,
  })).digest('hex');
}

const counts = {};
const referenceOnlyIds = [];
const canonicalIds = [];
for (const asset of deep.assets) {
  const disposition = dispositionFor(asset);
  asset.inventoryDisposition = { ...disposition };
  asset.generationEligible = disposition.generationEligible;
  asset.productionBrief.inventoryDisposition = { ...disposition };
  counts[disposition.intent] = (counts[disposition.intent] || 0) + 1;

  const auditParagraph = `Inventory audit: ${disposition.reason} Required action: ${disposition.action}`;
  if (!asset.deepDescription.includes(auditParagraph)) {
    asset.deepDescription = `${asset.deepDescription}\n\n${auditParagraph}`;
  }
  if (!disposition.generationEligible) {
    asset.generationPrompt = `[REFERENCE ONLY — DO NOT GENERATE] ${disposition.reason} ${disposition.action} ${asset.generationPrompt}`;
    asset.productionBrief.generationPolicy = 'reference-only-do-not-generate';
    referenceOnlyIds.push(asset.id);
  } else {
    asset.productionBrief.generationPolicy = 'eligible-when-builder-and-town-are-ready';
    canonicalIds.push(asset.id);
  }
  asset.inventoryDispositionAuditedAt = new Date().toISOString();
  asset.briefHash = hashAsset(asset);
}

const canonicalCount = canonicalIds.length;
const referenceOnlyCount = referenceOnlyIds.length;
deep.inventoryDispositionCounts = counts;
deep.canonicalGenerationRequestCount = canonicalCount;
deep.referenceOnlyRecordCount = referenceOnlyCount;
deep.referenceOnlyRecordIds = referenceOnlyIds;
deep.inventoryAuditAt = new Date().toISOString();
coverage.inventoryDispositionCounts = counts;
coverage.canonicalGenerationRequestCount = canonicalCount;
coverage.referenceOnlyRecordCount = referenceOnlyCount;
coverage.referenceOnlyRecordIds = referenceOnlyIds;
coverage.inventoryAuditAt = deep.inventoryAuditAt;
coverage.uniqueBriefHashes = new Set(deep.assets.map((asset) => asset.briefHash)).size;
coverage.descriptionsAtOrAboveMinimum = deep.assets.filter((asset) => asset.deepDescription.length >= deep.descriptionMinimumCharacters).length;
coverage.promptsAtOrAboveMinimum = deep.assets.filter((asset) => asset.generationPrompt.length >= deep.generationPromptMinimumCharacters).length;

writeFileSync(DEEP_PATH, `${JSON.stringify(deep, null, 2)}\n`);
writeFileSync(COVERAGE_PATH, `${JSON.stringify(coverage, null, 2)}\n`);

console.log(`[inventory-audit] canonical generation requests: ${canonicalCount}`);
console.log(`[inventory-audit] reference-only records: ${referenceOnlyCount}`);
console.log(`[inventory-audit] intents: ${Object.entries(counts).map(([intent, count]) => `${intent}=${count}`).join(', ')}`);
