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

function runGit(args) {
  const result = spawnSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
    maxBuffer: 1024 * 1024 * 20,
  });
  if (result.error) throw result.error;
  return result;
}

function stagePaths(paths) {
  const values = [...paths];
  for (let index = 0; index < values.length; index += 100) {
    const chunk = values.slice(index, index + 100);
    const result = runGit(['add', '--', ...chunk]);
    if (result.status !== 0) {
      throw new Error(`git add failed for completed deliverables:\n${result.stderr || result.stdout || ''}`);
    }
  }
}

function trackedOrStaged(repoPath) {
  return runGit(['ls-files', '--cached', '--error-unmatch', '--', repoPath]).status === 0;
}

const queue = JSON.parse(readFileSync(QUEUE_PATH, 'utf8'));
const assets = queueObject(queue);
const failures = [];
const completedPaths = new Set();
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

  let valid = true;
  if (RUNTIME_KINDS.has(state.assetKind)) {
    completedRuntime += 1;
    if (!existsSync(absolute) || statSync(absolute).size < 80) {
      failures.push(`${id}: runtime deliverable is missing or empty at ${repoPath}`);
      valid = false;
    }
  } else {
    completedModels += 1;
    if (!isInside(MODEL_ROOT, absolute)) {
      failures.push(`${id}: completed GLB is outside public/assets/models: ${repoPath}`);
      valid = false;
    }
    if (!validGlb(absolute)) {
      failures.push(`${id}: completed GLB is missing, undersized, or invalid at ${repoPath}`);
      valid = false;
    }
    if (isInside(GENERATED_ROOT, absolute)) factoryModels += 1;
    else curatedOrLegacyModels += 1;
  }

  if (valid) completedPaths.add(repoPath);
}

if (!failures.length) {
  stagePaths(completedPaths);
  for (const repoPath of completedPaths) {
    if (!trackedOrStaged(repoPath)) {
      failures.push(`completed deliverable is not tracked or staged for commit: ${repoPath}`);
    }
  }
}

console.log(
  `[asset-factory] repository asset gate: staged and verified ${completedModels} completed GLBs ` +
  `(${factoryModels} factory-generated, ${curatedOrLegacyModels} curated/legacy) and ` +
  `${completedRuntime} runtime deliverables.`,
);

if (failures.length) {
  console.error('[asset-factory] repository asset gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
