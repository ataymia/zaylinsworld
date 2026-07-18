import { existsSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const ROOT = process.cwd();
const GENERATED_ROOT = join(ROOT, 'asset-factory', 'generated');
const MANIFEST_PATH = join(GENERATED_ROOT, 'deep-asset-specs.json');
const COVERAGE_PATH = join(GENERATED_ROOT, 'deep-spec-coverage.json');
const GAP_SUMMARY_PATH = join(ROOT, 'asset-factory', 'gameplay-gaps', 'summary.json');
const MAX_SHARD_BYTES = 10 * 1024 * 1024;

if (!existsSync(MANIFEST_PATH) || !existsSync(COVERAGE_PATH)) {
  throw new Error('Sharded specification manifest or coverage report is missing.');
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
const coverage = JSON.parse(readFileSync(COVERAGE_PATH, 'utf8'));
const gapSummary = existsSync(GAP_SUMMARY_PATH)
  ? JSON.parse(readFileSync(GAP_SUMMARY_PATH, 'utf8'))
  : null;
const expectedTotal = Number(gapSummary?.expectedAuditedRecordCount || manifest.totalRecords);
const expectedCanonical = Number(gapSummary?.expectedCanonicalGenerationRequestCount || manifest.canonicalGenerationRequests);
const expectedReferenceOnly = Number(gapSummary?.expectedReferenceOnlyRecordCount || manifest.referenceOnlyRecords);
const failures = [];

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

if (manifest.format !== 'zta-deep-asset-spec-index') failures.push('Deep specification root file is not a shard manifest.');
if ('assets' in manifest) failures.push('Shard manifest unexpectedly contains the full assets array.');
if (!Array.isArray(manifest.shards) || manifest.shards.length < 2) failures.push('Shard manifest does not list multiple shards.');
if (manifest.totalRecords !== expectedTotal) failures.push(`Manifest total is ${manifest.totalRecords}; expected ${expectedTotal}.`);
if (manifest.canonicalGenerationRequests !== expectedCanonical) failures.push(`Manifest canonical total is ${manifest.canonicalGenerationRequests}; expected ${expectedCanonical}.`);
if (manifest.referenceOnlyRecords !== expectedReferenceOnly) failures.push(`Manifest reference-only total is ${manifest.referenceOnlyRecords}; expected ${expectedReferenceOnly}.`);

const ids = new Set();
const briefHashes = new Set();
let total = 0;
let canonical = 0;
let referenceOnly = 0;
let referenceShardSeen = false;
const computedRecords = [];

for (const record of manifest.shards || []) {
  const path = join(ROOT, record.path);
  if (!existsSync(path)) {
    failures.push(`Missing shard file: ${record.path}.`);
    continue;
  }
  const buffer = readFileSync(path);
  const actualBytes = buffer.length;
  const actualHash = sha256(buffer);
  if (actualBytes !== record.bytes) failures.push(`${record.path}: byte count ${actualBytes} does not match manifest ${record.bytes}.`);
  if (actualHash !== record.sha256) failures.push(`${record.path}: SHA-256 mismatch.`);
  if (actualBytes > MAX_SHARD_BYTES) failures.push(`${record.path}: ${actualBytes} bytes exceeds the ${MAX_SHARD_BYTES}-byte repository shard limit.`);

  const shard = JSON.parse(buffer.toString('utf8'));
  if (shard.format !== 'zta-deep-asset-spec-shard') failures.push(`${record.path}: invalid shard format.`);
  if (shard.shardKey !== record.key) failures.push(`${record.path}: shard key does not match manifest.`);
  if (!Array.isArray(shard.assets)) failures.push(`${record.path}: assets array is missing.`);
  if (shard.recordCount !== shard.assets?.length) failures.push(`${record.path}: internal record count is wrong.`);
  if (record.recordCount !== shard.assets?.length) failures.push(`${record.path}: manifest record count is wrong.`);

  const shardCanonical = (shard.assets || []).filter((asset) => asset.generationEligible !== false).length;
  const shardReference = (shard.assets || []).length - shardCanonical;
  if (shard.canonicalGenerationRequests !== shardCanonical) failures.push(`${record.path}: canonical count is wrong.`);
  if (shard.referenceOnlyRecords !== shardReference) failures.push(`${record.path}: reference-only count is wrong.`);
  if (record.canonicalGenerationRequests !== shardCanonical) failures.push(`${record.path}: manifest canonical count is wrong.`);
  if (record.referenceOnlyRecords !== shardReference) failures.push(`${record.path}: manifest reference-only count is wrong.`);

  if (record.key === 'reference-only') {
    referenceShardSeen = true;
    if (shardCanonical !== 0 || shardReference !== expectedReferenceOnly) {
      failures.push(`Reference-only shard must contain exactly ${expectedReferenceOnly} noneligible records.`);
    }
  } else {
    if (shardReference !== 0) failures.push(`${record.path}: canonical town shard contains a reference-only record.`);
    for (const asset of shard.assets || []) {
      if (String(asset.town).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') !== record.key) {
        failures.push(`${record.path}: ${asset.id} belongs to town ${asset.town}, not shard ${record.key}.`);
      }
    }
  }

  for (const asset of shard.assets || []) {
    total += 1;
    if (asset.generationEligible === false) referenceOnly += 1;
    else canonical += 1;
    if (ids.has(asset.id)) failures.push(`Duplicate asset ID across shards: ${asset.id}.`);
    ids.add(asset.id);
    if (!asset.briefHash || briefHashes.has(asset.briefHash)) failures.push(`Missing or duplicate brief hash across shards: ${asset.id}.`);
    briefHashes.add(asset.briefHash);
  }

  computedRecords.push({
    key: record.key,
    path: record.path,
    recordCount: shard.assets?.length || 0,
    canonicalGenerationRequests: shardCanonical,
    referenceOnlyRecords: shardReference,
    bytes: actualBytes,
    sha256: actualHash,
    firstAssetId: shard.assets?.[0]?.id || null,
    lastAssetId: shard.assets?.at(-1)?.id || null,
  });
}

if (!referenceShardSeen) failures.push('Reference-only shard is missing.');
if (total !== expectedTotal) failures.push(`Reassembled shard total is ${total}; expected ${expectedTotal}.`);
if (canonical !== expectedCanonical) failures.push(`Reassembled canonical total is ${canonical}; expected ${expectedCanonical}.`);
if (referenceOnly !== expectedReferenceOnly) failures.push(`Reassembled reference-only total is ${referenceOnly}; expected ${expectedReferenceOnly}.`);
if (ids.size !== expectedTotal) failures.push(`Unique reassembled ID count is ${ids.size}; expected ${expectedTotal}.`);
if (briefHashes.size !== expectedTotal) failures.push(`Unique reassembled brief-hash count is ${briefHashes.size}; expected ${expectedTotal}.`);
if (coverage.shardedStorage !== true) failures.push('Coverage does not record sharded storage.');
if (coverage.shardCount !== manifest.shards?.length) failures.push('Coverage shard count does not match manifest.');
if (coverage.largestShardBytes !== Math.max(...computedRecords.map((record) => record.bytes))) failures.push('Coverage largest-shard byte count is stale.');
if (coverage.manifestBytes !== statSync(MANIFEST_PATH).size) failures.push('Coverage manifest byte count is stale.');
if (JSON.stringify(coverage.shards) !== JSON.stringify(computedRecords)) failures.push('Coverage shard records do not match the files on disk.');

if (failures.length) {
  console.error(`[sharded-specs] ${failures.length} validation failure(s)`);
  for (const failure of failures.slice(0, 300)) console.error(`- ${failure}`);
  if (failures.length > 300) console.error(`- ...and ${failures.length - 300} additional failures`);
  process.exit(1);
}

console.log(`[sharded-specs] PASS: ${total} records reassembled from ${manifest.shards.length} shards.`);
console.log(`[sharded-specs] canonical=${canonical}, reference-only=${referenceOnly}, largest-shard=${coverage.largestShardBytes} bytes.`);
