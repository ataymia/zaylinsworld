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
const BATCH_PATH = join(WORK_DIR, 'current-batch.json');
const BLENDER_REPORT_PATH = join(WORK_DIR, 'blender-report.json');
const PREVIEW_DIR = join(WORK_DIR, 'previews');
const OUTPUT_ROOT = join(ROOT, 'public', 'assets', 'models', 'generated');
const INDEX_PATH = join(ROOT, 'public', 'assets', 'models', 'asset-index-v2.json');
const POLICY_PATH = join(FACTORY_DIR, 'quality-policy.json');
const READY_TOWNS = new Set(['starter-town', 'techtown']);

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
    maxBuffer: 1024 * 1024 * 80,
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = options.capture ? `\n${result.stdout || ''}\n${result.stderr || ''}` : '';
    throw new Error(`${command} exited with code ${result.status}.${detail}`);
  }
  return result;
}

function readJson(path) {
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
  if (spec.fileName.startsWith('building_') || spec.fileName.startsWith('arch_')) return 'buildings';
  if (spec.fileName.startsWith('vehicle_')) return 'vehicles';
  if (/^(furniture|equipment|classroom|chair|interior)_/.test(spec.fileName)) return 'furniture';
  if (spec.fileName.startsWith('food_')) return 'food';
  return 'props';
}

function builderReady(spec) {
  if (!spec?.builderStatus || spec.builderStatus !== 'supported' || !spec.builder) return false;
  if (!READY_TOWNS.has(spec.town)) return false;

  // The current road-sign builder intentionally supports regulation stop signs
  // and cross-street blades. Bespoke district/town wayfinding remains held until
  // its own family builder exists rather than becoming a disguised stop sign.
  if (spec.builder === 'road_sign' && !/(stop_sign|street_name_sign)/.test(spec.fileName)) return false;

  return true;
}

function indexPassedAssets(masterById, blenderReport) {
  const index = readJson(INDEX_PATH);
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
    `- Paid APIs used: none`,
    '',
    '## Batch results',
    '',
    '| Asset | Town | Family | Result | Meshes | Triangles | Materials | GLB bytes | Notes |',
    '|---|---|---|---|---:|---:|---:|---:|---|',
  ];

  for (const result of blenderReport.results) {
    const spec = masterById.get(result.id);
    const state = queue.assets[result.id];
    const notes = result.passed
      ? `Registered at ${result.outputPath}`
      : `${result.failures.join('; ')}. Queue status: ${state?.status || 'unknown'}`;
    lines.push(
      `| ${markdownEscape(spec?.displayName || result.id)} | ${markdownEscape(result.town)} | ${markdownEscape(result.family)} | ${result.passed ? 'PASS' : 'FAIL'} | ${result.stats?.meshObjects ?? 0} | ${result.stats?.triangles ?? 0} | ${result.stats?.materialCount ?? 0} | ${result.exportBytes ?? 0} | ${markdownEscape(notes)} |`,
    );
  }

  lines.push('', '## Quality contract', '');
  lines.push('- A technically valid GLB is not automatically accepted.');
  lines.push('- Required components, scale, materials, pivot, silhouette coverage, and geometry budgets are checked.');
  lines.push('- Passing additionally requires a verified nonempty GLB with valid binary magic bytes.');
  lines.push('- Unsupported families are never replaced by generic primitive placeholders.');
  lines.push('- Persistent failures are quarantined while the rest of the queue continues.');
  lines.push('');
  lines.push('## Preview artifact');
  lines.push('');
  lines.push('The four-angle PNG previews are attached to the corresponding GitHub Actions run and retained temporarily rather than committed to the game repository.');
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
    version: 1,
    batchId: batch.batchId,
    completedAt: isoNow(),
    requested: batch.assets.length,
    passed: blenderReport.passed,
    failed: blenderReport.failed,
    queueCounts: counts,
    results: blenderReport.results.map((item) => ({
      id: item.id,
      passed: item.passed,
      qualityPassed: item.qualityPassed,
      exportVerified: item.exportVerified,
      exportBytes: item.exportBytes,
      outputPath: item.outputPath,
      failures: item.failures,
      stats: item.stats,
      previewPaths: item.previewPaths,
    })),
  };
}

function chooseBatch(master, queue, batchSize) {
  const masterById = new Map(master.assets.map((spec) => [spec.id, spec]));
  const chosen = Object.values(queue.assets)
    .filter((item) => item.status === 'queued')
    .map((item) => ({ state: item, spec: masterById.get(item.id) }))
    .filter(({ spec }) => builderReady(spec))
    .sort((a, b) => {
      if (a.state.priority !== b.state.priority) return a.state.priority - b.state.priority;
      if (a.state.attempts !== b.state.attempts) return b.state.attempts - a.state.attempts;
      return a.state.id.localeCompare(b.state.id);
    })
    .slice(0, batchSize)
    .map(({ state, spec }) => ({
      ...spec,
      factoryAttempt: state.attempts + 1,
      previousError: state.lastError || null,
    }));
  return { chosen, masterById };
}

function updateQueue(queue, blenderReport, reportPath, retryLimit) {
  for (const result of blenderReport.results) {
    const state = queue.assets[result.id];
    if (!state) continue;
    state.attempts = (state.attempts || 0) + 1;
    state.updatedAt = isoNow();
    state.lastReport = reportPath;
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
}

function main() {
  const options = parseArgs(process.argv);
  const policy = readJson(POLICY_PATH);
  const requestedBatchSize = Number.isFinite(options.batchSize) ? options.batchSize : policy.batchSize;
  const batchSize = Math.min(10, Math.max(1, requestedBatchSize));
  const previousSequence = existsSync(QUEUE_PATH) ? (readJson(QUEUE_PATH).sequence || 0) : 0;

  run(process.execPath, ['tools/asset-factory/compile-specs.mjs']);
  const master = readJson(MASTER_PATH);
  const queue = readJson(QUEUE_PATH);
  queue.sequence = previousSequence;
  const { chosen, masterById } = chooseBatch(master, queue, batchSize);

  mkdirSync(WORK_DIR, { recursive: true });
  mkdirSync(REPORTS_DIR, { recursive: true });
  rmSync(PREVIEW_DIR, { recursive: true, force: true });
  rmSync(BLENDER_REPORT_PATH, { force: true });

  if (!chosen.length) {
    const summary = {
      version: 1,
      completedAt: isoNow(),
      message: 'No production-ready queued assets remain. Other fully specified assets are waiting for their town palette or purpose-built family variant rather than using generic fallback geometry.',
    };
    writeJson(join(REPORTS_DIR, 'latest.json'), summary);
    writeJson(QUEUE_PATH, queue);
    console.log('[asset-factory] no production-ready queued assets remain');
    return;
  }

  const sequence = previousSequence + 1;
  const id = batchId(sequence);
  const batch = {
    version: 1,
    batchId: id,
    startedAt: isoNow(),
    batchSize,
    assets: chosen,
  };
  writeJson(BATCH_PATH, batch);

  if (options.dryRun) {
    console.log(`[asset-factory] dry run selected ${chosen.length} assets: ${chosen.map((item) => item.id).join(', ')}`);
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
  updateQueue(queue, blenderReport, relativeMarkdownPath, policy.globalGeometry.automaticRetryLimit || 3);
  indexPassedAssets(masterById, blenderReport);
  writeJson(QUEUE_PATH, queue);
  writeFileSync(markdownPath, createMarkdownReport({ batch, blenderReport, masterById, queue }));
  writeJson(join(REPORTS_DIR, 'latest.json'), createLatestSummary({ batch, blenderReport, queue }));

  console.log(`[asset-factory] ${id}: ${blenderReport.passed} passed, ${blenderReport.failed} failed`);
  console.log(`[asset-factory] report: ${relativeMarkdownPath}`);
}

try {
  main();
} catch (error) {
  console.error(`[asset-factory] fatal: ${error.stack || error.message || error}`);
  process.exitCode = 1;
}
