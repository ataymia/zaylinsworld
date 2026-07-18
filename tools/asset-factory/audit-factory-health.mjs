import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';

const ROOT = process.cwd();
const MASTER_PATH = join(ROOT, 'asset-factory', 'generated', 'master-asset-specs.json');
const QUEUE_PATH = join(ROOT, 'asset-factory', 'state', 'queue.json');
const BUILDER_HEALTH_PATH = join(ROOT, 'asset-factory', 'state', 'builder-health.json');
const REPORT_JSON = join(ROOT, 'reports', 'asset-factory', 'health.json');
const REPORT_MD = join(ROOT, 'reports', 'asset-factory', 'health.md');
const MODELS_ROOT = join(ROOT, 'public', 'assets', 'models');
const GENERATED_ROOT = join(MODELS_ROOT, 'generated');
const RUNTIME_KINDS = new Set(['runtime-vfx', 'decal', 'shader', 'audio-visual', 'helper']);

function queueObject(queue) {
  if (Array.isArray(queue.assets)) return Object.fromEntries(queue.assets.map((item) => [item.id, item]));
  return queue.assets || {};
}
function walk(root) {
  if (!existsSync(root)) return [];
  const out = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}
function glbValid(path) {
  if (!existsSync(path) || statSync(path).size < 1024) return false;
  const buffer = readFileSync(path);
  return buffer.subarray(0, 4).toString('ascii') === 'glTF';
}
function isInside(parent, child) {
  const rel = relative(resolve(parent), resolve(child));
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
}
function normalizeError(value) {
  return String(value || 'none')
    .toLowerCase()
    .replace(/\d+(?:\.\d+)?/g, '#')
    .replace(/\s+/g, ' ')
    .slice(0, 220);
}
function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

const master = JSON.parse(readFileSync(MASTER_PATH, 'utf8'));
const queue = JSON.parse(readFileSync(QUEUE_PATH, 'utf8'));
const queueAssets = queueObject(queue);
const failures = [];
const warnings = [];
const paths = new Map();
const completedGlbPaths = new Set();
const completedRuntimePaths = new Set();
const builderStats = {};
const masterById = new Map(master.assets.map((asset) => [asset.id, asset]));

if (master.assets.length !== Object.keys(queueAssets).length) {
  failures.push(`Master has ${master.assets.length} assets while queue has ${Object.keys(queueAssets).length}.`);
}
for (const [id, state] of Object.entries(queueAssets)) {
  const spec = masterById.get(id);
  if (!spec) {
    failures.push(`${id}: queue entry is absent from master.`);
    continue;
  }
  const builder = state.builder || spec.builder || 'none';
  builderStats[builder] ??= { builder, revision: spec.builderRevision || state.builderRevision || null, completed: 0, queued: 0, quarantined: 0, unsupported: 0, runtime: 0, referenceOnly: 0, errorSignatures: {} };
  const stats = builderStats[builder];
  if (state.status === 'completed') stats.completed += 1;
  else if (state.status === 'queued') stats.queued += 1;
  else if (state.status === 'quarantined') stats.quarantined += 1;
  else if (state.status === 'unsupported') stats.unsupported += 1;
  else if (state.status === 'reference-only') stats.referenceOnly += 1;
  else if (state.status === 'queued-runtime') stats.runtime += 1;
  if (state.lastError) {
    const signature = normalizeError(state.lastError);
    stats.errorSignatures[signature] = (stats.errorSignatures[signature] || 0) + 1;
  }

  if (state.status === 'completed') {
    if (!state.generatedPath) {
      failures.push(`${id}: completed entry has no generatedPath.`);
      continue;
    }
    if (paths.has(state.generatedPath)) failures.push(`${id}: generatedPath duplicates ${paths.get(state.generatedPath)} at ${state.generatedPath}.`);
    paths.set(state.generatedPath, id);
    const absolute = join(ROOT, state.generatedPath);
    if (RUNTIME_KINDS.has(spec.assetKind || state.assetKind)) {
      if (!existsSync(absolute) || statSync(absolute).size < 80) {
        failures.push(`${id}: runtime deliverable is missing or empty at ${state.generatedPath}.`);
      } else {
        completedRuntimePaths.add(absolute);
      }
    } else if (!glbValid(absolute)) {
      failures.push(`${id}: completed GLB is missing, too small, or has invalid magic at ${state.generatedPath}.`);
    } else {
      completedGlbPaths.add(absolute);
      if (!isInside(MODELS_ROOT, absolute)) {
        failures.push(`${id}: completed GLB is outside public/assets/models at ${state.generatedPath}.`);
      }
    }
  }
}

const factoryDiskGlbs = walk(GENERATED_ROOT).filter((path) => extname(path).toLowerCase() === '.glb');
const allRepositoryModelGlbs = walk(MODELS_ROOT).filter((path) => extname(path).toLowerCase() === '.glb');
const indexedGlbs = new Set([...paths.keys()].filter((path) => path.endsWith('.glb')).map((path) => join(ROOT, path)));
for (const path of factoryDiskGlbs) {
  if (!glbValid(path)) failures.push(`Invalid GLB on disk: ${relative(ROOT, path)}.`);
  if (!indexedGlbs.has(path)) warnings.push(`Unreferenced generated GLB on disk: ${relative(ROOT, path)}.`);
}

const completedFactoryGlbs = [...completedGlbPaths].filter((path) => isInside(GENERATED_ROOT, path)).length;
const completedCuratedOrLegacyGlbs = completedGlbPaths.size - completedFactoryGlbs;
const completedRecords = Object.values(queueAssets).filter((state) => state.status === 'completed').length;

const health = {
  format: 'zta-asset-factory-health',
  version: 2,
  generatedAt: new Date().toISOString(),
  masterRecords: master.assets.length,
  queueRecords: Object.keys(queueAssets).length,
  completed: completedRecords,
  completedGlbsOnDisk: completedGlbPaths.size,
  completedFactoryGlbsOnDisk: completedFactoryGlbs,
  completedCuratedOrLegacyGlbsOnDisk: completedCuratedOrLegacyGlbs,
  completedRuntimeDeliverablesOnDisk: completedRuntimePaths.size,
  factoryGeneratedGlbsOnDisk: factoryDiskGlbs.length,
  allRepositoryModelGlbsOnDisk: allRepositoryModelGlbs.length,
  generatedGlbsOnDisk: factoryDiskGlbs.length,
  queued: Object.values(queueAssets).filter((state) => state.status === 'queued').length,
  queuedRuntime: Object.values(queueAssets).filter((state) => state.status === 'queued-runtime').length,
  quarantined: Object.values(queueAssets).filter((state) => state.status === 'quarantined').length,
  unsupported: Object.values(queueAssets).filter((state) => state.status === 'unsupported').length,
  referenceOnly: Object.values(queueAssets).filter((state) => state.status === 'reference-only').length,
  failures,
  warnings,
  builders: Object.values(builderStats).sort((a, b) => a.builder.localeCompare(b.builder)),
};

const previousHealth = existsSync(BUILDER_HEALTH_PATH) ? JSON.parse(readFileSync(BUILDER_HEALTH_PATH, 'utf8')) : { builders: {} };
const circuit = { version: 1, generatedAt: health.generatedAt, builders: {} };
for (const stats of health.builders) {
  if (stats.builder === 'none') continue;
  const prior = previousHealth.builders?.[stats.builder];
  const dominantFailures = Math.max(0, ...Object.values(stats.errorSignatures));
  const shouldOpen = stats.quarantined >= 5 && stats.completed === 0 && dominantFailures >= 3;
  const revisionChanged = prior?.revision && stats.revision && prior.revision !== stats.revision;
  circuit.builders[stats.builder] = {
    revision: stats.revision,
    state: revisionChanged ? 'closed' : (shouldOpen ? 'open' : 'closed'),
    reason: shouldOpen ? `Quarantined ${stats.quarantined} assets with a repeated failure signature; requires builder revision.` : null,
    completed: stats.completed,
    queued: stats.queued,
    quarantined: stats.quarantined,
    dominantFailureCount: dominantFailures,
  };
}
writeJson(BUILDER_HEALTH_PATH, circuit);
writeJson(REPORT_JSON, health);
const lines = [
  '# Zaylins Asset Factory Health', '',
  `- Generated: ${health.generatedAt}`,
  `- Master records: ${health.masterRecords}`,
  `- Queue records: ${health.queueRecords}`,
  `- Completed records: ${health.completed}`,
  `- Completed GLBs verified on disk: ${health.completedGlbsOnDisk}`,
  `- Completed factory-generated GLBs: ${health.completedFactoryGlbsOnDisk}`,
  `- Completed curated/legacy GLBs: ${health.completedCuratedOrLegacyGlbsOnDisk}`,
  `- Completed runtime deliverables: ${health.completedRuntimeDeliverablesOnDisk}`,
  `- All GLBs under public/assets/models: ${health.allRepositoryModelGlbsOnDisk}`,
  `- GLBs specifically under public/assets/models/generated: ${health.factoryGeneratedGlbsOnDisk}`,
  `- Queued Blender assets: ${health.queued}`,
  `- Queued runtime assets: ${health.queuedRuntime}`,
  `- Quarantined: ${health.quarantined}`,
  `- Unsupported: ${health.unsupported}`,
  `- Reference-only: ${health.referenceOnly}`,
  '', '## Builder health', '',
  '| Builder | Completed | Queued | Quarantined | Circuit |',
  '|---|---:|---:|---:|---|',
];
for (const stats of health.builders) {
  const state = circuit.builders[stats.builder]?.state || 'n/a';
  lines.push(`| ${stats.builder} | ${stats.completed} | ${stats.queued} | ${stats.quarantined} | ${state} |`);
}
if (failures.length) lines.push('', '## Failures', '', ...failures.map((item) => `- ${item}`));
if (warnings.length) lines.push('', '## Warnings', '', ...warnings.map((item) => `- ${item}`));
writeFileSync(REPORT_MD, `${lines.join('\n')}\n`);
console.log(
  `[factory-health] completed=${health.completed}; completedGlbs=${health.completedGlbsOnDisk}; ` +
  `factoryGlbs=${health.completedFactoryGlbsOnDisk}; curatedGlbs=${health.completedCuratedOrLegacyGlbsOnDisk}; ` +
  `queued=${health.queued}; runtime=${health.queuedRuntime}; quarantined=${health.quarantined}; unsupported=${health.unsupported}.`,
);
console.log(`[factory-health] failures=${failures.length}; warnings=${warnings.length}.`);
if (failures.length) process.exitCode = 1;
