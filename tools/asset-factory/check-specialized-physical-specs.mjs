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
const BROAD_PROFILE_NAMES = new Set([
  'specialized environmental or interactive prop',
  'complete architectural asset',
  'serviceable infrastructure asset',
  'complete transportation asset',
  'human-scale furniture or fixture',
  'installed information or display asset',
  'modular traversal surface',
]);
const GENERIC_COMPONENT_PHRASES = [
  'recognizable primary structure',
  'functional secondary components',
  'appropriate materials',
];

const derived = deep.assets.filter((asset) => asset.physicalSpecDerived === true);
let explicit = 0;
let dynamic = 0;
let existingNamed = 0;

for (const asset of derived) {
  const label = asset.id || asset.fileName;
  if (asset.physicalSpecSpecialized !== true) {
    failures.push(`${label}: derived asset was not processed by the specialization pass.`);
  }
  if (!asset.physicalSpecProfile || asset.physicalSpecProfile.length < 5) {
    failures.push(`${label}: specialized physical profile name is missing.`);
  }
  if (BROAD_PROFILE_NAMES.has(asset.physicalSpecProfile)) {
    failures.push(`${label}: broad physical profile remains after specialization: ${asset.physicalSpecProfile}.`);
  }
  if (!asset.physicalSpecSpecializationReason || asset.physicalSpecSpecializationReason.length < 45) {
    failures.push(`${label}: specialization reason is missing or too short.`);
  }
  if (!asset.physicalSpecSpecializedAt) {
    failures.push(`${label}: specialization timestamp is missing.`);
  }
  if (!asset.canonicalPhysicalDescription || asset.canonicalPhysicalDescription.length < 350) {
    failures.push(`${label}: specialized canonical physical description is missing or too short.`);
  }
  if (!asset.deepDescription.includes(asset.canonicalPhysicalDescription)) {
    failures.push(`${label}: deep description was not rebuilt from the specialized physical description.`);
  }
  if (!asset.generationPrompt.includes(asset.physicalSpecProfile)) {
    failures.push(`${label}: generation prompt does not identify the specialized physical profile.`);
  }
  if (!Array.isArray(asset.requiredComponents) || asset.requiredComponents.length < 6) {
    failures.push(`${label}: specialized component list has fewer than six entries.`);
  }
  if (!Array.isArray(asset.materials) || asset.materials.length < 3) {
    failures.push(`${label}: specialized material list has fewer than three entries.`);
  }
  const componentText = asset.requiredComponents.join(' | ').toLowerCase();
  for (const phrase of GENERIC_COMPONENT_PHRASES) {
    if (componentText.includes(phrase)) {
      failures.push(`${label}: compact placeholder component remains after specialization: ${phrase}.`);
    }
  }
  if (asset.physicalSpecSpecializationReason.startsWith('Filename and blueprint role match')) explicit += 1;
  else if (asset.physicalSpecProfile.includes('role-specific')) dynamic += 1;
  else existingNamed += 1;
}

if (derived.length !== Number(deep.physicalSpecsDerived)) {
  failures.push(`Derived asset count ${derived.length} does not match deep-library count ${deep.physicalSpecsDerived}.`);
}
if (derived.length !== Number(coverage.physicalSpecsDerived)) {
  failures.push(`Derived asset count ${derived.length} does not match coverage count ${coverage.physicalSpecsDerived}.`);
}
if (explicit !== Number(deep.explicitPhysicalSpecializations)) {
  failures.push(`Explicit specialization count ${explicit} does not match deep-library count ${deep.explicitPhysicalSpecializations}.`);
}
if (dynamic !== Number(deep.dynamicPhysicalSpecializations)) {
  failures.push(`Dynamic specialization count ${dynamic} does not match deep-library count ${deep.dynamicPhysicalSpecializations}.`);
}
if (explicit !== Number(coverage.explicitPhysicalSpecializations)) {
  failures.push(`Explicit specialization count ${explicit} does not match coverage count ${coverage.explicitPhysicalSpecializations}.`);
}
if (dynamic !== Number(coverage.dynamicPhysicalSpecializations)) {
  failures.push(`Dynamic specialization count ${dynamic} does not match coverage count ${coverage.dynamicPhysicalSpecializations}.`);
}
if (explicit + dynamic + existingNamed !== derived.length) {
  failures.push('Specialization accounting does not cover every derived asset exactly once.');
}

if (failures.length) {
  console.error(`[specialized-specs] ${failures.length} validation failure(s)`);
  for (const failure of failures.slice(0, 300)) console.error(`- ${failure}`);
  if (failures.length > 300) console.error(`- ...and ${failures.length - 300} additional failures`);
  process.exit(1);
}

console.log(`[specialized-specs] PASS: all ${derived.length} derived assets have specialized physical profiles.`);
console.log(`[specialized-specs] explicit=${explicit}, dynamic-role-specific=${dynamic}, existing-named=${existingNamed}.`);
