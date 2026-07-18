import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { classifyFinalAsset } from './deep-spec-final-classifier.mjs';

const ROOT = process.cwd();
const DEEP_PATH = join(ROOT, 'asset-factory', 'generated', 'deep-asset-specs.json');
const COVERAGE_PATH = join(ROOT, 'asset-factory', 'generated', 'deep-spec-coverage.json');
if (!existsSync(DEEP_PATH) || !existsSync(COVERAGE_PATH)) throw new Error('Deep specification outputs are missing.');

const deep = JSON.parse(readFileSync(DEEP_PATH, 'utf8'));
const coverage = JSON.parse(readFileSync(COVERAGE_PATH, 'utf8'));
const failures = [];
const CONTAMINATED_CHARACTER_LANGUAGE = /rigged character or creature requiring a dedicated anatomy pipeline|dedicated anatomy, sculpting, retopology, and rigging builder|do not generate with the prop factory/i;
const GENERIC_PLACEHOLDER_LANGUAGE = /specialized asset awaiting a dedicated family builder|do not create a generic primitive substitute|keep the item queued as unsupported until a purpose-built family generator exists/i;
const ANATOMY_COMPONENTS = /credible anatomy|surface form|hands or paws|\bfeet\b|\bface\b|\brig\b|deformation-ready topology/i;
const CATEGORY_DIMENSION_LIMITS = {
  architecture: { minWidth: 1, minDepth: 0.15, minHeight: 2, max: 200 },
  vehicle: { minWidth: 0.45, minDepth: 1.2, minHeight: 0.35, max: 100 },
  furniture: { minWidth: 0.25, minDepth: 0.2, minHeight: 0.2, max: 15 },
  infrastructure: { minWidth: 0.15, minDepth: 0.1, minHeight: 0.15, max: 50 },
  road_surface: { minWidth: 0.5, minDepth: 0.5, minHeight: 0.05, max: 200 },
  signage: { minWidth: 0.25, minDepth: 0.02, minHeight: 0.25, max: 30 },
  food: { minWidth: 0.03, minDepth: 0.03, minHeight: 0.02, max: 3 },
  vegetation: { minWidth: 0.1, minDepth: 0.1, minHeight: 0.1, max: 100 },
  creature_prop: { minWidth: 0.05, minDepth: 0.05, minHeight: 0.05, max: 50 },
  generic_prop: { minWidth: 0.05, minDepth: 0.03, minHeight: 0.03, max: 50 },
};

function requiresDerivedSpec(asset) {
  const category = classifyFinalAsset(asset);
  return asset.family === 'unsupported_generic'
    || (asset.family === 'unsupported_character' && category !== 'character');
}

function exactlyCharacterDefault(dimensions) {
  return Number(dimensions?.width) === 0.8
    && Number(dimensions?.depth) === 0.55
    && Number(dimensions?.height) === 1.8;
}

const derivedAssets = [];
for (const asset of deep.assets) {
  const label = asset.id || asset.fileName;
  const category = classifyFinalAsset(asset);
  const shouldBeDerived = requiresDerivedSpec(asset);
  if (!shouldBeDerived) continue;
  derivedAssets.push(asset);

  if (asset.physicalSpecDerived !== true) failures.push(`${label}: weak compact specification was not replaced by a physical object profile.`);
  if (!asset.physicalSpecProfile || asset.physicalSpecProfile.length < 4) failures.push(`${label}: physical profile name is missing.`);
  if (!asset.physicalSpecReason || asset.physicalSpecReason.length < 30) failures.push(`${label}: physical derivation reason is missing.`);
  if (!asset.canonicalPhysicalDescription || asset.canonicalPhysicalDescription.length < 300) failures.push(`${label}: canonical physical description is missing or too short.`);
  if (!asset.canonicalPhysicalDescription?.includes(asset.displayName)) failures.push(`${label}: canonical physical description does not name the asset.`);
  if (!asset.canonicalPhysicalDescription?.includes(asset.town)) failures.push(`${label}: canonical physical description does not identify the town.`);
  if (!Array.isArray(asset.requiredComponents) || asset.requiredComponents.length < 6) failures.push(`${label}: derived specification has fewer than six functional components.`);
  if (!Array.isArray(asset.materials) || asset.materials.length < 3) failures.push(`${label}: derived specification has fewer than three material categories.`);
  if (!asset.quality || asset.quality.minimumMeshObjects < 5 || asset.quality.minimumTriangles < 500 || asset.quality.maximumTriangles <= asset.quality.minimumTriangles) {
    failures.push(`${label}: derived geometry budget is incomplete or contradictory.`);
  }
  if (!Array.isArray(asset.functionalNotes) || asset.functionalNotes.length < 4) failures.push(`${label}: derived functional notes are incomplete.`);
  if (!Array.isArray(asset.forbiddenShortcuts) || asset.forbiddenShortcuts.length < 8) failures.push(`${label}: derived forbidden-shortcut rules are incomplete.`);
  if (!asset.deepDescription.includes(asset.canonicalPhysicalDescription)) failures.push(`${label}: final deep description did not rebuild from the canonical physical description.`);
  if (!asset.generationPrompt.includes(asset.requiredComponents[0])) failures.push(`${label}: generation prompt does not include derived required components.`);

  if (category !== 'character') {
    const combined = `${asset.description} ${asset.deepDescription} ${asset.generationPrompt}`;
    if (CONTAMINATED_CHARACTER_LANGUAGE.test(combined)) failures.push(`${label}: non-character brief still contains inherited anatomy-pipeline language.`);
    if (ANATOMY_COMPONENTS.test(asset.requiredComponents.join(' | '))) failures.push(`${label}: non-character brief still contains anatomy components.`);
    if (asset.family === 'unsupported_character' && exactlyCharacterDefault(asset.dimensionsMeters)) failures.push(`${label}: non-character asset retained the compact character dimensions.`);
  }
  if (GENERIC_PLACEHOLDER_LANGUAGE.test(`${asset.description} ${asset.deepDescription} ${asset.generationPrompt}`)) {
    failures.push(`${label}: final brief still contains generic unsupported-placeholder language.`);
  }

  const limits = CATEGORY_DIMENSION_LIMITS[category] || CATEGORY_DIMENSION_LIMITS.generic_prop;
  const dimensions = asset.dimensionsMeters || {};
  const values = [Number(dimensions.width), Number(dimensions.depth), Number(dimensions.height)];
  if (values.some((value) => !Number.isFinite(value) || value <= 0)) failures.push(`${label}: dimensions are missing or nonpositive.`);
  if (Number(dimensions.width) < limits.minWidth || Number(dimensions.depth) < limits.minDepth || Number(dimensions.height) < limits.minHeight) {
    failures.push(`${label}: dimensions are implausibly small for ${category}.`);
  }
  if (values.some((value) => value > limits.max)) failures.push(`${label}: dimensions are implausibly large for ${category}.`);
}

const expectedDerived = deep.assets.filter(requiresDerivedSpec).length;
if (derivedAssets.length !== expectedDerived) failures.push('Internal derived-asset count mismatch.');
if (deep.physicalSpecsDerived !== expectedDerived) failures.push(`Deep library reports ${deep.physicalSpecsDerived} derived physical specs; expected ${expectedDerived}.`);
if (coverage.physicalSpecsDerived !== expectedDerived) failures.push(`Coverage reports ${coverage.physicalSpecsDerived} derived physical specs; expected ${expectedDerived}.`);
const expectedCharacterRepairs = deep.assets.filter((asset) => asset.family === 'unsupported_character' && classifyFinalAsset(asset) !== 'character').length;
if (deep.contaminatedCharacterSpecsRepaired !== expectedCharacterRepairs) failures.push('Deep library character-contamination repair count is incorrect.');
if (coverage.contaminatedCharacterSpecsRepaired !== expectedCharacterRepairs) failures.push('Coverage character-contamination repair count is incorrect.');

if (failures.length) {
  console.error(`[physical-specs] ${failures.length} validation failure(s)`);
  for (const failure of failures.slice(0, 300)) console.error(`- ${failure}`);
  if (failures.length > 300) console.error(`- ...and ${failures.length - 300} additional failures`);
  process.exit(1);
}

console.log(`[physical-specs] PASS: ${expectedDerived} weak or contaminated compact specs were replaced with object-specific physical profiles.`);
console.log(`[physical-specs] PASS: ${expectedCharacterRepairs} non-character assets no longer contain inherited anatomy dimensions or components.`);
