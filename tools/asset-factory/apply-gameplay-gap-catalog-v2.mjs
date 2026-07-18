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

const RUNTIME_KINDS = new Set(['runtime-vfx', 'decal', 'shader', 'audio-visual', 'helper']);
const MODEL_BUILDERS = {
  connector: ['modular_connector', 'modular_connector'],
  infrastructure: ['modular_infrastructure', 'modular_infrastructure'],
  furniture: ['modular_furniture', 'modular_furniture'],
  prop: ['modular_prop', 'modular_prop'],
  'state-variant': ['state_variant', 'state_variant'],
};

function queueObject(queue) {
  if (!queue || typeof queue !== 'object') return {};
  if (Array.isArray(queue.assets)) return Object.fromEntries(queue.assets.map((asset) => [asset.id, asset]));
  return queue.assets && typeof queue.assets === 'object' ? queue.assets : {};
}

function normalizeGapAsset(asset) {
  const next = { ...asset };
  if (RUNTIME_KINDS.has(next.assetKind)) {
    next.builder = null;
    next.builderStatus = 'runtime';
    next.status = 'queued-runtime';
  } else if (MODEL_BUILDERS[next.assetKind]) {
    const [family, builder] = MODEL_BUILDERS[next.assetKind];
    next.family = family;
    next.builder = builder;
    next.builderStatus = 'supported';
    next.status = 'queued';
  } else {
    next.builder = null;
    next.builderStatus = 'unsupported';
    next.status = 'unsupported';
  }
  return next;
}

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
  : { version: 1, assets: {} };
const previousAssets = queueObject(previousQueue);
const previousByFile = new Map(Object.values(previousAssets).map((asset) => [asset.fileName, asset]));

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
  gaps.push(...catalog.assets.map(normalizeGapAsset));
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

const referenceOnlySources = new Set([
  'docs/ASSET_USAGE_REPORT.md',
  'docs/ASSET_CLEANUP_PLAN.md',
  'docs/CITY_BLUEPRINT_STANDARD.md',
  'docs/ASSET_CREATION_WORKFLOW.md',
]);
const baseAssets = master.assets
  .filter((asset) => !gapIds.has(asset.id) && !gapFiles.has(asset.fileName))
  .map((asset) => ({
    ...asset,
    generationEligible: asset.generationEligible ?? !referenceOnlySources.has(asset.sourceDoc),
  }));
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
master.counts = {
  ...(master.counts || {}),
  total: nextAssets.length,
  supported: nextAssets.filter((asset) => asset.builderStatus === 'supported').length,
  runtime: nextAssets.filter((asset) => asset.builderStatus === 'runtime').length,
  unsupported: nextAssets.filter((asset) => asset.builderStatus === 'unsupported').length,
};
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

const queueAssets = {};
for (const asset of nextAssets) {
  const previous = previousAssets[asset.id] || previousByFile.get(asset.fileName);
  const isReferenceOnly = asset.generationEligible === false;
  const isRuntimeDeliverable = RUNTIME_KINDS.has(asset.assetKind);
  let status;
  if (isReferenceOnly) status = 'reference-only';
  else if (previous?.status === 'completed' && previous.generatedPath) status = 'completed';
  else if (isRuntimeDeliverable) status = previous?.runtimeGenerated && previous.generatedPath ? 'completed' : 'queued-runtime';
  else if (asset.builderStatus === 'supported' && asset.builder) {
    status = previous?.status === 'completed' ? 'completed' : (previous?.status === 'quarantined' ? 'quarantined' : 'queued');
  } else status = 'unsupported';

  queueAssets[asset.id] = {
    id: asset.id,
    fileName: asset.fileName,
    declaredDeliverableFile: asset.declaredDeliverableFile || asset.fileName,
    town: asset.town,
    family: asset.family,
    builder: asset.builder,
    builderStatus: asset.builderStatus,
    status,
    assetKind: asset.assetKind || null,
    productionPipeline: asset.productionPipeline || null,
    sourceDoc: asset.sourceDoc,
    sourceSection: asset.sourceSection,
    priority: Number.isFinite(asset.priority) ? asset.priority : 10000,
    attempts: previous?.attempts || 0,
    lastError: previous?.lastError || null,
    lastReport: previous?.lastReport || null,
    output: previous?.output || null,
    runtimeGenerated: previous?.runtimeGenerated || false,
    generatedPath: previous?.generatedPath || null,
    updatedAt: previous?.updatedAt || master.generatedAt,
  };
}

const statusCounts = {};
for (const asset of Object.values(queueAssets)) statusCounts[asset.status] = (statusCounts[asset.status] || 0) + 1;
const queue = {
  version: 3,
  generatedAt: master.generatedAt,
  updatedAt: master.generatedAt,
  batchSize: previousQueue.batchSize || 10,
  sequence: previousQueue.sequence || previousQueue.batchNumber || 0,
  counts: {
    total: Object.keys(queueAssets).length,
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
