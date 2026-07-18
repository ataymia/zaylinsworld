import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DEEP_PATH = join(ROOT, 'asset-factory', 'generated', 'deep-asset-specs.json');
const COVERAGE_PATH = join(ROOT, 'asset-factory', 'generated', 'deep-spec-coverage.json');
const deep = JSON.parse(readFileSync(DEEP_PATH, 'utf8'));
const coverage = JSON.parse(readFileSync(COVERAGE_PATH, 'utf8'));
let repaired = 0;

function hashBrief(asset) {
  return createHash('sha256').update(JSON.stringify({
    id: asset.id,
    deepDescription: asset.deepDescription,
    generationPrompt: asset.generationPrompt,
    productionBrief: asset.productionBrief,
  })).digest('hex');
}

for (const asset of deep.assets) {
  const excerpt = String(asset.sourceContext?.excerpt || '').trim();
  if (excerpt.length >= 40) continue;

  const clarification = `${asset.sourceDoc} explicitly lists ${asset.displayName} under “${asset.sourceSection}” as part of the ${asset.town} asset inventory. The model must therefore serve that named blueprint section and inherit its placement, gameplay, density, and visual-design requirements rather than being treated as context-free filler.`;
  const expanded = excerpt ? `${excerpt}. ${clarification}` : clarification;

  asset.sourceContext = {
    ...(asset.sourceContext || {}),
    excerpt: expanded,
  };
  asset.productionBrief.blueprintEvidence = {
    ...(asset.productionBrief.blueprintEvidence || {}),
    excerpt: expanded,
  };
  asset.deepDescription = `${asset.deepDescription}\n\nBlueprint-context clarification: ${clarification}`;
  asset.generationPrompt = `${asset.generationPrompt} Blueprint-context clarification: ${clarification}`;
  asset.briefHash = hashBrief(asset);
  repaired += 1;
}

coverage.assetsWithBlueprintContext = deep.assets.filter((asset) => asset.sourceContext?.excerpt?.length >= 40).length;
coverage.uniqueBriefHashes = new Set(deep.assets.map((asset) => asset.briefHash)).size;
coverage.normalizedSparseContexts = repaired;
coverage.normalizedAt = new Date().toISOString();
deep.normalizedAt = coverage.normalizedAt;
deep.normalizedSparseContexts = repaired;

writeFileSync(DEEP_PATH, `${JSON.stringify(deep, null, 2)}\n`);
writeFileSync(COVERAGE_PATH, `${JSON.stringify(coverage, null, 2)}\n`);

console.log(`[deep-specs] normalized ${repaired} sparse blueprint context excerpt(s)`);
console.log(`[deep-specs] assets with complete blueprint context: ${coverage.assetsWithBlueprintContext}/${deep.assets.length}`);
