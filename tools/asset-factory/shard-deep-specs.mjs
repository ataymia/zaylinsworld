import {
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const GENERATED_ROOT = join(ROOT, 'asset-factory', 'generated');
const DEEP_PATH = join(GENERATED_ROOT, 'deep-asset-specs.json');
const COVERAGE_PATH = join(GENERATED_ROOT, 'deep-spec-coverage.json');
const SHARD_ROOT = join(GENERATED_ROOT, 'deep-specs');
const deep = JSON.parse(readFileSync(DEEP_PATH, 'utf8'));
const coverage = JSON.parse(readFileSync(COVERAGE_PATH, 'utf8'));

if (!Array.isArray(deep.assets) || deep.assets.length === 0) {
  throw new Error('Deep asset monolith is missing its assets array. Run the enrichment pipeline before sharding.');
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function slug(value) {
  return String(value || 'shared-world')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'shared-world';
}

rmSync(SHARD_ROOT, { recursive: true, force: true });
mkdirSync(SHARD_ROOT, { recursive: true });

const groups = new Map();
for (const asset of deep.assets) {
  const key = asset.generationEligible === false ? 'reference-only' : slug(asset.town);
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(asset);
}

const shardRecords = [];
for (const [key, assets] of [...groups.entries()].sort(([left], [right]) => left.localeCompare(right))) {
  assets.sort((left, right) => left.id.localeCompare(right.id));
  const canonical = assets.filter((asset) => asset.generationEligible !== false).length;
  const referenceOnly = assets.length - canonical;
  const categoryCounts = {};
  const familyCounts = {};
  for (const asset of assets) {
    categoryCounts[asset.semanticCategory] = (categoryCounts[asset.semanticCategory] || 0) + 1;
    familyCounts[asset.family] = (familyCounts[asset.family] || 0) + 1;
  }
  const shard = {
    format: 'zta-deep-asset-spec-shard',
    version: 1,
    generatedAt: deep.generatedAt,
    inventoryAuditAt: deep.inventoryAuditAt,
    shardKey: key,
    recordCount: assets.length,
    canonicalGenerationRequests: canonical,
    referenceOnlyRecords: referenceOnly,
    categoryCounts,
    familyCounts,
    assets,
  };
  const path = join(SHARD_ROOT, `${key}.json`);
  const content = Buffer.from(`${JSON.stringify(shard, null, 2)}\n`);
  writeFileSync(path, content);
  shardRecords.push({
    key,
    path: relative(ROOT, path).replaceAll('\\', '/'),
    recordCount: assets.length,
    canonicalGenerationRequests: canonical,
    referenceOnlyRecords: referenceOnly,
    bytes: content.length,
    sha256: sha256(content),
    firstAssetId: assets[0]?.id || null,
    lastAssetId: assets.at(-1)?.id || null,
  });
}

const manifest = {
  format: 'zta-deep-asset-spec-index',
  version: 1,
  generatedAt: deep.generatedAt,
  shardedAt: new Date().toISOString(),
  sourceMaster: deep.sourceMaster,
  sourceMasterGeneratedAt: deep.sourceMasterGeneratedAt,
  policy: deep.policy,
  totalRecords: deep.assets.length,
  canonicalGenerationRequests: deep.canonicalGenerationRequestCount,
  referenceOnlyRecords: deep.referenceOnlyRecordCount,
  descriptionMinimumCharacters: deep.descriptionMinimumCharacters,
  generationPromptMinimumCharacters: deep.generationPromptMinimumCharacters,
  counts: deep.counts,
  inventoryDispositionCounts: deep.inventoryDispositionCounts,
  physicalSpecsDerived: deep.physicalSpecsDerived,
  contaminatedCharacterSpecsRepaired: deep.contaminatedCharacterSpecsRepaired,
  explicitPhysicalSpecializations: deep.explicitPhysicalSpecializations,
  dynamicPhysicalSpecializations: deep.dynamicPhysicalSpecializations,
  referenceOnlyRecordIds: deep.referenceOnlyRecordIds,
  shards: shardRecords,
};
const manifestContent = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(DEEP_PATH, manifestContent);

coverage.shardedStorage = true;
coverage.shardedAt = manifest.shardedAt;
coverage.shardCount = shardRecords.length;
coverage.shards = shardRecords;
coverage.manifestBytes = manifestContent.length;
coverage.largestShardBytes = Math.max(...shardRecords.map((record) => record.bytes));
writeFileSync(COVERAGE_PATH, `${JSON.stringify(coverage, null, 2)}\n`);

console.log(`[deep-specs] sharded ${manifest.totalRecords} records into ${shardRecords.length} files`);
for (const record of shardRecords) {
  console.log(`[deep-specs] ${record.key}: ${record.recordCount} records, ${record.bytes} bytes, sha256=${record.sha256}`);
}
console.log(`[deep-specs] manifest: ${statSync(DEEP_PATH).size} bytes`);
