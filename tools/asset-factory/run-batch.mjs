import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const FACTORY_DIR = join(ROOT, 'asset-factory');
const GENERATED_DIR = join(FACTORY_DIR, 'generated');
const STATE_DIR = join(FACTORY_DIR, 'state');
const WORK_DIR = join(FACTORY_DIR, 'work');
const REPORTS_DIR = join(ROOT, 'reports', 'asset-factory');
const MASTER_PATH = join(GENERATED_DIR, 'master-asset-specs.json');
const QUEUE_PATH = join(STATE_DIR, 'queue.json');
const BUILDER_HEALTH_PATH = join(STATE_DIR, 'builder-health.json');
const BATCH_PATH = join(WORK_DIR, 'current-batch.json');
const BLENDER_REPORT_PATH = join(WORK_DIR, 'blender-report.json');
const PREVIEW_DIR = join(WORK_DIR, 'previews');
const OUTPUT_ROOT = join(ROOT, 'public', 'assets', 'models', 'generated');
const INDEX_PATH = join(ROOT, 'public', 'assets', 'models', 'asset-index-v2.json');
const POLICY_PATH = join(FACTORY_DIR, 'quality-policy.json');

function parseArgs(argv) {
  const options = { batchSize: null, dryRun: false };
  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--batch-size') options.batchSize = Number.parseInt(argv[++index], 10);
    else if (token === '--dry-run') options.dryRun = true;
    else throw new Error(`Unknown argument: ${token}`);
  }
  return options;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
    maxBuffer: 1024 * 1024 * 120,
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = options.capture ? `\n${result.stdout || ''}\n${result.stderr || ''}` : '';
    throw new Error(`${command} exited with code ${result.status}.${detail}`);
  }
  return result;
}

function readJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function isoNow() {
  return new Date().toISOString();
}

function batchId(sequence) {
  return `batch-${String(sequence).padStart(5, '0')}`;
}

function indexCategory(spec) {
  if (spec.fileName.startsWith('building_') || spec.fileName.startsWith('arch_') || spec.builder === 'modular_building') return 'buildings';
  if (spec.fileName.startsWith('vehicle_')) return 'vehicles';
  if (spec.builder === 'modular_furniture' || /^(furniture|equipment|classroom|chair|interior)_/.test(spec.fileName)) return 'furniture';
  if (spec.builder === 'modular_food' || spec.fileName.startsWith('food_')) return 'food';
  return 'props';
}

function indexPassedAssets(masterById, blenderReport) {
  const index = readJson(INDEX_PATH, { buildings: {}, vehicles: {}, furniture: {}, food: {}, props: {} });
  const pack = 'zta-free-asset-factory';
  for (const result of blenderReport.results.filter((item) => item.passed && item.outputPath)) {
    const spec = masterById.get(result.id);
    if (!spec) continue;
    const category = indexCategory(spec);
    index[category] ??= {};
    index[category][pack] ??= [];
    const path = result.outputPath.replace(/^public\/assets\//, '');
    const entry = {
      name: spec.id,
      path,
      type: 'glb',
      tex: 0,
      generated: true,
      town: spec.town,
      family: spec.family,
      builder: spec.builder,
      builderRevision: spec.builderRevision || null,
      displayName: spec.displayName,
      description: spec.description,
      license: spec.license,
    };
    const list = index[category][pack];
    const existing = list.findIndex((item) => item.name === spec.id);
    if (existing >= 0) list[existing] = entry;
    else list.push(entry);
    list.sort((a, b) => a.name.localeCompare(b.name));
  }
  writeJson(INDEX_PATH, index);
}

function markdownEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function createMarkdownReport({ batch, blenderReport, masterById, queue }) {
  const lines = [
    `# ZTA Free Asset Factory ${batch.batchId}`,
    '',
    `- Started: ${batch.startedAt}`,
    `- Completed: ${isoNow()}`,
    `- Requested: ${batch.assets.length}`,
    `- Passed: ${blenderReport.passed}`,
    `- Failed or quarantined this pass: ${blenderReport.failed}`,
    `- Engine: Blender headless on GitHub Actions`,
    `- Builder revision: ${batch.builderRevision || 'mixed'}`,
    `- Paid APIs used: none`,
    '',
    '## Batch results',
    '',
    '| Asset | Builder | Town | Result | Meshes | Triangles | Materials | Notes |',
    '|---|---|---|---|---:|---:|---:|---|',
  ];

  for (const result of blenderReport.results) {
    const spec = masterById.get(result.id);
    const state = queue.assets[result.id];
    const notes = result.passed
      ? `Registered at ${result.outputPath}`
      : `${result.failures.join('; ')}. Queue status: ${state?.status || 'unknown'}`;
    lines.push(
      `| ${markdownEscape(spec?.displayName || result.id)} | ${markdownEscape(result.builder)} | ${markdownEscape(result.town)} | ${result.passed ? 'PASS' : 'FAIL'} | ${result.stats?.meshObjects ?? 0} | ${result.stats?.triangles ?? 0} | ${result.stats?.materialCount ?? 0} | ${markdownEscape(notes)} |`,
    );
  }

  lines.push('', '## Quality contract', '');
  lines.push('- A technically valid GLB is not automatically accepted.');
  lines.push('- Required components, dimensions, materials, pivot, preview coverage, and geometry budgets are checked.');
  lines.push('- Retry attempts no longer inflate polygon counts with generic subdivision.');
  lines.push('- Builder circuit breakers isolate repeated deterministic failures while healthy families continue.');
  lines.push('- Hair and organic character assets remain gated until their sculpt, retopology, groom, and rigging builders meet the dedicated contract.');
  lines.push('', '## Preview artifact', '');
  lines.push('Four-angle PNG previews are attached to the corresponding GitHub Actions run and retained temporarily rather than committed to the game repository.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function createLatestSummary({ batch, blenderReport, queue }) {
  const values = Object.values(queue.assets);
  const counts = values.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});
  return {
    version: 2,
    batchId: batch.batchId,
    completedAt: isoNow(),
    requested: batch.assets.length,
    passed: blenderReport.passed,
    failed: blenderReport.failed,
    queueCounts: counts,
    results: blenderReport.results.map((item) => ({
      id: item.id,
      builder: item.builder,
      builderRevision: item.builderRevision,
      passed: item.passed,
      outputPath: item.outputPath,
      failures: item.failures,
      stats: item.stats,
      previewPaths: item.previewPaths,
    })),
  };
}

function chooseBatch(master, queue, batchSize, builderHealth) {
  const masterById = new Map(master.assets.map((spec) => [spec.id, spec]));
  const candidates = Object.values(queue.assets)
    .filter((item) => item.status === 'queued')
    .map((item) => ({ state: item, spec: masterById.get(item.id) }))
    .filter(({ spec }) => spec?.builderStatus === 'supported' && spec.builder)
    .filter(({ spec }) => builderHealth?.builders?.[spec.builder]?.state !== 'open')
    .sort((a, b) => {
      if (a.state.priority !== b.state.priority) return a.state.priority - b.state.priority;
      if (a.state.attempts !== b.state.attempts) return a.state.attempts - b.state.attempts;
      return a.state.id.localeCompare(b.state.id);
    });

  const byBuilder = new Map();
  for (const candidate of candidates) {
    const list = byBuilder.get(candidate.spec.builder) || [];
    list.push(candidate);
    byBuilder.set(candidate.spec.builder, list);
  }
  const chosen = [];
  const builders = [...byBuilder.keys()].sort();
  while (chosen.length < batchSize && builders.length) {
    for (let index = builders.length - 1; index >= 0 && chosen.length < batchSize; index -= 1) {
      const builder = builders[index];
      const item = byBuilder.get(builder).shift();
      if (item) chosen.push(item);
      if (!byBuilder.get(builder).length) builders.splice(index, 1);
    }
  }
  return {
    chosen: chosen.map(({ state, spec }) => ({ ...spec, factoryAttempt: (state.attempts || 0) + 1 })),
    masterById,
  };
}

function updateQueue(queue, blenderReport, reportPath, retryLimit) {
  for (const result of blenderReport.results) {
    const state = queue.assets[result.id];
    if (!state) continue;
    state.attempts = (state.attempts || 0) + 1;
    state.updatedAt = isoNow();
    state.lastReport = reportPath;
    state.builderRevision = result.builderRevision || state.builderRevision || null;
    if (result.passed) {
      state.status = 'completed';
      state.generatedPath = result.outputPath;
      state.lastError = null;
    } else {
      state.status = state.attempts >= retryLimit ? 'quarantined' : 'queued';
      state.generatedPath = null;
      state.lastError = result.failures.join('; ').slice(0, 4000);
    }
  }
  queue.sequence = (queue.sequence || 0) + 1;
  queue.generatedAt = isoNow();
  queue.updatedAt = queue.generatedAt;
  const counts = {};
  for (const state of Object.values(queue.assets)) counts[state.status] = (counts[state.status] || 0) + 1;
  queue.counts = {
    total: Object.keys(queue.assets).length,
    completed: counts.completed || 0,
    queued: counts.queued || 0,
    queuedRuntime: counts['queued-runtime'] || 0,
    unsupported: counts.unsupported || 0,
    quarantined: counts.quarantined || 0,
    referenceOnly: counts['reference-only'] || 0,
  };
}

function main() {
  const options = parseArgs(process.argv);
  const policy = readJson(POLICY_PATH);
  const requestedBatchSize = Number.isFinite(options.batchSize) ? options.batchSize : 20;
  const batchSize = Math.min(20, Math.max(1, requestedBatchSize));
  const previousQueue = readJson(QUEUE_PATH, { sequence: 0 });
  const previousSequence = previousQueue.sequence || previousQueue.batchNumber || 0;

  run(process.execPath, ['tools/asset-factory/compile-expanded-specs.mjs']);
  run(process.execPath, ['tools/asset-factory/build-runtime-deliverables.mjs']);
  const master = readJson(MASTER_PATH);
  const queue = readJson(QUEUE_PATH);
  queue.sequence = previousSequence;
  const builderHealth = readJson(BUILDER_HEALTH_PATH, { builders: {} });
  const { chosen, masterById } = chooseBatch(master, queue, batchSize, builderHealth);

  mkdirSync(WORK_DIR, { recursive: true });
  mkdirSync(REPORTS_DIR, { recursive: true });
  rmSync(PREVIEW_DIR, { recursive: true, force: true });
  rmSync(BLENDER_REPORT_PATH, { force: true });

  if (!chosen.length) {
    const summary = {
      version: 2,
      completedAt: isoNow(),
      message: 'No healthy supported queued Blender assets remain. Runtime deliverables were still regenerated and the health audit ran.',
      queueCounts: queue.counts,
    };
    writeJson(join(REPORTS_DIR, 'latest.json'), summary);
    writeJson(QUEUE_PATH, queue);
    run(process.execPath, ['tools/asset-factory/audit-factory-health.mjs']);
    console.log('[asset-factory] no healthy supported queued Blender assets remain');
    return;
  }

  const sequence = previousSequence + 1;
  const id = batchId(sequence);
  const batch = {
    version: 2,
    batchId: id,
    startedAt: isoNow(),
    batchSize,
    builderRevision: master.builderRevision || null,
    assets: chosen,
  };
  writeJson(BATCH_PATH, batch);

  if (options.dryRun) {
    console.log(`[asset-factory] dry run selected ${chosen.length} assets: ${chosen.map((item) => `${item.builder}:${item.id}`).join(', ')}`);
    return;
  }

  const blender = process.env.BLENDER_BIN || 'blender';
  run(blender, [
    '--background',
    '--factory-startup',
    '--python', 'tools/asset-factory/blender/generate_batch.py',
    '--',
    '--batch', relative(ROOT, BATCH_PATH),
    '--report', relative(ROOT, BLENDER_REPORT_PATH),
    '--preview-dir', relative(ROOT, PREVIEW_DIR),
    '--output-root', relative(ROOT, OUTPUT_ROOT),
  ]);

  if (!existsSync(BLENDER_REPORT_PATH)) throw new Error('Blender completed without writing its batch report.');
  const blenderReport = readJson(BLENDER_REPORT_PATH);
  const markdownPath = join(REPORTS_DIR, `${id}.md`);
  const relativeMarkdownPath = relative(ROOT, markdownPath).replaceAll('\\', '/');
  updateQueue(queue, blenderReport, relativeMarkdownPath, 2);
  indexPassedAssets(masterById, blenderReport);
  writeJson(QUEUE_PATH, queue);
  writeFileSync(markdownPath, createMarkdownReport({ batch, blenderReport, masterById, queue }));
  writeJson(join(REPORTS_DIR, 'latest.json'), createLatestSummary({ batch, blenderReport, queue }));
  run(process.execPath, ['tools/asset-factory/audit-factory-health.mjs']);

  console.log(`[asset-factory] ${id}: ${blenderReport.passed} passed, ${blenderReport.failed} failed`);
  console.log(`[asset-factory] report: ${relativeMarkdownPath}`);
}

try {
  main();
} catch (error) {
  console.error(`[asset-factory] fatal: ${error.stack || error.message || error}`);
  process.exitCode = 1;
}
