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
const TARGET_SHARD_BYTES = 8 * 1024 * 1024;
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

function countsFor(assets) {
  const categoryCounts = {};
  const familyCounts = {};
  for (const asset of assets) {
    categoryCounts[asset.semanticCategory] = (categoryCounts[asset.semanticCategory] || 0) + 1;
    familyCounts[asset.family] = (familyCounts[asset.family] || 0) + 1;
  }
  return { categoryCounts, familyCounts };
}

function buildShard(shardKey, townKey, assets) {
  const canonical = assets.filter((asset) => asset.generationEligible !== false).length;
  const referenceOnly = assets.length - canonical;
  const { categoryCounts, familyCounts } = countsFor(assets);
  return {
    format: 'zta-deep-asset-spec-shard',
    version: 2,
    generatedAt: deep.generatedAt,
    inventoryAuditAt: deep.inventoryAuditAt,
    shardKey,
    townKey,
    recordCount: assets.length,
    canonicalGenerationRequests: canonical,
    referenceOnlyRecords: referenceOnly,
    categoryCounts,
    familyCounts,
    assets,
  };
}

function encodeShard(shard) {
  return Buffer.from(`${JSON.stringify(shard, null, 2)}\n`);
}

function partitionTown(townKey, assets) {
  const sorted = [...assets].sort((left, right) => left.id.localeCompare(right.id));
  const partitions = [];
  let current = [];
  for (const asset of sorted) {
    const candidate = [...current, asset];
    const probe = buildShard(`${townKey}-part-999`, townKey, candidate);
    if (current.length && encodeShard(probe).length > TARGET_SHARD_BYTES) {
      partitions.push(current);
      current = [asset];
    } else {
      current = candidate;
    }
  }
  if (current.length) partitions.push(current);
  return partitions;
}

rmSync(SHARD_ROOT, { recursive: true, force: true });
mkdirSync(SHARD_ROOT, { recursive: true });

const groups = new Map();
for (const asset of deep.assets) {
  const townKey = asset.generationEligible === false ? 'reference-only' : slug(asset.town);
  if (!groups.has(townKey)) groups.set(townKey, []);
  groups.get(townKey).push(asset);
}

const shardRecords = [];
for (const [townKey, assets] of [...groups.entries()].sort(([left], [right]) => left.localeCompare(right))) {
  const partitions = townKey === 'reference-only' ? [[...assets].sort((a, b) => a.id.localeCompare(b.id))] : partitionTown(townKey, assets);
  for (let index = 0; index < partitions.length; index += 1) {
    const shardKey = partitions.length === 1
      ? townKey
      : `${townKey}-part-${String(index + 1).padStart(2, '0')}`;
    const shard = buildShard(shardKey, townKey, partitions[index]);
    const path = join(SHARD_ROOT, `${shardKey}.json`);
    const content = encodeShard(shard);
    writeFileSync(path, content);
    shardRecords.push({
      key: shardKey,
      townKey,
      path: relative(ROOT, path).replaceAll('\\', '/'),
      recordCount: shard.recordCount,
      canonicalGenerationRequests: shard.canonicalGenerationRequests,
      referenceOnlyRecords: shard.referenceOnlyRecords,
      bytes: content.length,
      sha256: sha256(content),
      firstAssetId: shard.assets[0]?.id || null,
      lastAssetId: shard.assets.at(-1)?.id || null,
    });
  }
}

const manifest = {
  format: 'zta-deep-asset-spec-index',
  version: 2,
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
  targetShardBytes: TARGET_SHARD_BYTES,
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

console.log(`[deep-specs] byte-sharded ${manifest.totalRecords} records into ${shardRecords.length} files`);
for (const record of shardRecords) {
  console.log(`[deep-specs] ${record.key}: town=${record.townKey}, records=${record.recordCount}, bytes=${record.bytes}, sha256=${record.sha256}`);
}
console.log(`[deep-specs] manifest: ${statSync(DEEP_PATH).size} bytes`);
