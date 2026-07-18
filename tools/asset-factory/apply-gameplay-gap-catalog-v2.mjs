import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const FACTORY_ROOT = join(ROOT, 'asset-factory');
const CATALOG_ROOT = join(FACTORY_ROOT, 'gameplay-gaps');
const MASTER_PATH = join(FACTORY_ROOT, 'generated', 'master-asset-specs.json');
const QUEUE_PATH = join(FACTORY_ROOT, 'state', 'queue.json');
const SUMMARY_PATH = join(CATALOG_ROOT, 'summary.json');

if (!existsSync(MASTER_PATH)) {
  throw new Error('Compile the baseline asset specifications before applying gameplay gaps.');
}
if (!existsSync(SUMMARY_PATH)) {
  throw new Error('Gameplay-gap summary is missing. Run build-final-gameplay-gap-catalog.mjs first.');
}

const master = JSON.parse(readFileSync(MASTER_PATH, 'utf8'));
const summary = JSON.parse(readFileSync(SUMMARY_PATH, 'utf8'));
const previousQueue = existsSync(QUEUE_PATH)
  ? JSON.parse(readFileSync(QUEUE_PATH, 'utf8'))
  : { assets: [] };
const previousByFile = new Map(previousQueue.assets.map((asset) => [asset.fileName, asset]));

const catalogFiles = readdirSync(CATALOG_ROOT)
  .filter((name) => name.endsWith('.json') && name !== 'summary.json')
  .sort();
const gaps = [];
for (const name of catalogFiles) {
  const catalog = JSON.parse(readFileSync(join(CATALOG_ROOT, name), 'utf8'));
  if (catalog.format !== 'zta-gameplay-gap-catalog' || !Array.isArray(catalog.assets)) {
    throw new Error(`Invalid gameplay-gap catalog: ${name}`);
  }
  if (catalog.recordCount !== catalog.assets.length) {
    throw new Error(`${name} record count is stale.`);
  }
  gaps.push(...catalog.assets);
}

const gapIds = new Set();
const gapFiles = new Set();
for (const asset of gaps) {
  if (gapIds.has(asset.id)) throw new Error(`Duplicate gameplay-gap id: ${asset.id}`);
  if (gapFiles.has(asset.fileName)) throw new Error(`Duplicate gameplay-gap file: ${asset.fileName}`);
  gapIds.add(asset.id);
  gapFiles.add(asset.fileName);
}
if (gaps.length !== summary.newCanonicalRequestCount) {
  throw new Error(`Gameplay-gap source has ${gaps.length} assets; expected ${summary.newCanonicalRequestCount}.`);
}

const baseAssets = master.assets.filter((asset) => !gapIds.has(asset.id) && !gapFiles.has(asset.fileName));
const nextAssets = [...baseAssets, ...gaps].sort((left, right) => left.id.localeCompare(right.id));
if (nextAssets.length !== summary.expectedAuditedRecordCount) {
  throw new Error(`Expanded master has ${nextAssets.length} records; expected ${summary.expectedAuditedRecordCount}.`);
}
const canonical = nextAssets.filter((asset) => asset.generationEligible !== false).length;
const referenceOnly = nextAssets.length - canonical;
if (canonical !== summary.expectedCanonicalGenerationRequestCount) {
  throw new Error(`Expanded master has ${canonical} canonical requests; expected ${summary.expectedCanonicalGenerationRequestCount}.`);
}
if (referenceOnly !== summary.expectedReferenceOnlyRecordCount) {
  throw new Error(`Expanded master has ${referenceOnly} reference-only records; expected ${summary.expectedReferenceOnlyRecordCount}.`);
}

master.generatedAt = new Date().toISOString();
master.count = nextAssets.length;
master.gameplayGapExpansion = {
  version: summary.version,
  appliedAt: master.generatedAt,
  newCanonicalRequestCount: summary.newCanonicalRequestCount,
  expectedAuditedRecordCount: summary.expectedAuditedRecordCount,
  expectedCanonicalGenerationRequestCount: summary.expectedCanonicalGenerationRequestCount,
  expectedReferenceOnlyRecordCount: summary.expectedReferenceOnlyRecordCount,
  townCounts: summary.townCounts,
  assetKindCounts: summary.assetKindCounts,
};
master.assets = nextAssets;
writeFileSync(MASTER_PATH, `${JSON.stringify(master, null, 2)}\n`);

const queueAssets = nextAssets.map((asset) => {
  const previous = previousByFile.get(asset.fileName);
  const isReferenceOnly = asset.generationEligible === false;
  const isRuntimeDeliverable = ['runtime-vfx', 'decal', 'shader', 'audio-visual', 'helper'].includes(asset.assetKind);
  let status = previous?.status;
  if (isReferenceOnly) status = 'reference-only';
  else if (previous?.status === 'completed') status = 'completed';
  else if (isRuntimeDeliverable) status = previous?.runtimeGenerated ? 'completed' : 'queued-runtime';
  else if (asset.builderStatus === 'ready' && asset.builder) status = previous?.status === 'quarantined' ? 'quarantined' : 'queued';
  else status = previous?.status === 'quarantined' ? 'quarantined' : 'unsupported';
  return {
    id: asset.id,
    fileName: asset.fileName,
    town: asset.town,
    family: asset.family,
    builder: asset.builder,
    builderStatus: asset.builderStatus,
    status,
    assetKind: asset.assetKind,
    productionPipeline: asset.productionPipeline,
    sourceDoc: asset.sourceDoc,
    sourceSection: asset.sourceSection,
    priority: asset.priority,
    attempts: previous?.attempts || 0,
    lastError: previous?.lastError || null,
    output: previous?.output || null,
    runtimeGenerated: previous?.runtimeGenerated || false,
    generatedPath: previous?.generatedPath || null,
  };
});
const statusCounts = {};
for (const asset of queueAssets) statusCounts[asset.status] = (statusCounts[asset.status] || 0) + 1;
const queue = {
  version: 3,
  updatedAt: master.generatedAt,
  batchSize: previousQueue.batchSize || 10,
  batchNumber: previousQueue.batchNumber || 0,
  counts: {
    total: queueAssets.length,
    completed: statusCounts.completed || 0,
    queued: statusCounts.queued || 0,
    queuedRuntime: statusCounts['queued-runtime'] || 0,
    unsupported: statusCounts.unsupported || 0,
    quarantined: statusCounts.quarantined || 0,
    referenceOnly: statusCounts['reference-only'] || 0,
  },
  assets: queueAssets,
};
writeFileSync(QUEUE_PATH, `${JSON.stringify(queue, null, 2)}\n`);
console.log(`[gameplay-gap-apply] master=${nextAssets.length}, canonical=${canonical}, reference-only=${referenceOnly}.`);
console.log(`[gameplay-gap-apply] queue statuses: ${JSON.stringify(statusCounts)}.`);
