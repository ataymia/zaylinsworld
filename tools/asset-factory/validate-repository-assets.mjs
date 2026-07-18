import { existsSync, readFileSync, statSync } from 'node:fs';
import { isAbsolute, normalize, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const QUEUE_PATH = resolve(ROOT, 'asset-factory/state/queue.json');
const MODEL_ROOT = resolve(ROOT, 'public/assets/models');
const GENERATED_ROOT = resolve(MODEL_ROOT, 'generated');
const RUNTIME_KINDS = new Set(['runtime-vfx', 'decal', 'shader', 'audio-visual', 'helper']);

function queueObject(queue) {
  if (Array.isArray(queue.assets)) {
    return Object.fromEntries(queue.assets.map((asset) => [asset.id, asset]));
  }
  return queue.assets && typeof queue.assets === 'object' ? queue.assets : {};
}

function validGlb(path) {
  if (!existsSync(path) || statSync(path).size < 1024) return false;
  return readFileSync(path).subarray(0, 4).toString('ascii') === 'glTF';
}

function isInside(parent, child) {
  const rel = relative(parent, child);
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
}

function trackedOrStaged(repoPath) {
  const result = spawnSync(
    'git',
    ['ls-files', '--cached', '--error-unmatch', '--', repoPath],
    { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' },
  );
  if (result.error) throw result.error;
  return result.status === 0;
}

const queue = JSON.parse(readFileSync(QUEUE_PATH, 'utf8'));
const assets = queueObject(queue);
const failures = [];
let completedModels = 0;
let factoryModels = 0;
let curatedOrLegacyModels = 0;
let completedRuntime = 0;

for (const [id, state] of Object.entries(assets)) {
  if (state.status !== 'completed') continue;
  if (!state.generatedPath) {
    failures.push(`${id}: completed entry has no generatedPath`);
    continue;
  }

  const repoPath = normalize(String(state.generatedPath)).replaceAll('\\', '/');
  const absolute = resolve(ROOT, repoPath);
  if (!isInside(ROOT, absolute)) {
    failures.push(`${id}: completed output escapes the repository: ${repoPath}`);
    continue;
  }

  if (RUNTIME_KINDS.has(state.assetKind)) {
    completedRuntime += 1;
    if (!existsSync(absolute) || statSync(absolute).size < 80) {
      failures.push(`${id}: runtime deliverable is missing or empty at ${repoPath}`);
    }
  } else {
    completedModels += 1;
    if (!isInside(MODEL_ROOT, absolute)) {
      failures.push(`${id}: completed GLB is outside public/assets/models: ${repoPath}`);
    }
    if (!validGlb(absolute)) {
      failures.push(`${id}: completed GLB is missing, undersized, or invalid at ${repoPath}`);
    }
    if (isInside(GENERATED_ROOT, absolute)) factoryModels += 1;
    else curatedOrLegacyModels += 1;
  }

  if (!trackedOrStaged(repoPath)) {
    failures.push(`${id}: completed deliverable is not tracked or staged for commit: ${repoPath}`);
  }
}

console.log(
  `[asset-factory] repository asset gate: ${completedModels} completed GLBs ` +
  `(${factoryModels} factory-generated, ${curatedOrLegacyModels} curated/legacy) and ` +
  `${completedRuntime} runtime deliverables are tracked or staged.`,
);

if (failures.length) {
  console.error('[asset-factory] repository asset gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
