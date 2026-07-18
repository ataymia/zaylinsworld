import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
const branch = process.env.TARGET_BRANCH || process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME;
const apiBase = process.env.GITHUB_API_URL || 'https://api.github.com';
const ROOT = process.cwd();
const deepManifestPath = 'asset-factory/generated/deep-asset-specs.json';
const sourceManifestPath = 'tools/asset-factory/gameplay-gap-expansion-files.json';

if (!token) throw new Error('GH_TOKEN or GITHUB_TOKEN is required.');
if (!repository || !repository.includes('/')) throw new Error('GITHUB_REPOSITORY is missing or invalid.');
if (!branch) throw new Error('Target branch is missing.');

function walk(path) {
  if (!existsSync(path)) return [];
  if (statSync(path).isFile()) return [relative(ROOT, path).replaceAll('\\', '/')];
  return readdirSync(path).flatMap((name) => walk(join(path, name)));
}

const files = new Set([
  'package.json',
  sourceManifestPath,
  'asset-factory/generated/master-asset-specs.json',
  deepManifestPath,
  'asset-factory/generated/deep-spec-coverage.json',
  'asset-factory/state/queue.json',
]);

if (existsSync(sourceManifestPath)) {
  const sourceManifest = JSON.parse(readFileSync(sourceManifestPath, 'utf8'));
  for (const path of sourceManifest.files || []) files.add(path);
}
for (const path of walk(join(ROOT, 'asset-factory', 'gameplay-gaps'))) files.add(path);
for (const path of walk(join(ROOT, 'asset-factory', 'generated', 'deep-specs'))) files.add(path);
for (const name of existsSync(join(ROOT, 'docs')) ? readdirSync(join(ROOT, 'docs')) : []) {
  if (/GAMEPLAY_GAPS/i.test(name)) files.add(`docs/${name}`);
}

if (existsSync(deepManifestPath)) {
  const manifest = JSON.parse(readFileSync(deepManifestPath, 'utf8'));
  for (const record of manifest.shards || []) files.add(record.path);
}

const existingFiles = [...files].filter((path) => existsSync(join(ROOT, path))).sort();
if (!existingFiles.length) throw new Error('No generated or materialized files were found to commit.');

async function request(method, path, body) {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'zta-asset-factory-workflow',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!response.ok) {
    const detail = typeof data === 'string' ? data : JSON.stringify(data);
    throw new Error(`${method} ${path} failed with ${response.status}: ${detail}`);
  }
  return data;
}

function gitBlobSha(buffer) {
  return createHash('sha1').update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest('hex');
}

async function currentPathSha(path) {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const query = new URLSearchParams({ ref: branch });
  try {
    const data = await request('GET', `/repos/${repository}/contents/${encodedPath}?${query}`);
    return data?.sha || null;
  } catch (error) {
    if (String(error.message).includes('failed with 404')) return null;
    throw error;
  }
}

const localFiles = existingFiles.map((path) => {
  const buffer = readFileSync(join(ROOT, path));
  return { path, buffer, localSha: gitBlobSha(buffer), size: buffer.length };
});

let unchanged = true;
for (const file of localFiles) {
  file.remoteSha = await currentPathSha(file.path);
  if (file.remoteSha !== file.localSha) unchanged = false;
  console.log(`[asset-factory-commit] ${file.path}: ${file.size} bytes, remote=${file.remoteSha || 'missing'}`);
}
if (unchanged) {
  console.log('[asset-factory-commit] Repository outputs are already current.');
  process.exit(0);
}

const encodedBranch = branch.split('/').map(encodeURIComponent).join('/');
const ref = await request('GET', `/repos/${repository}/git/ref/heads/${encodedBranch}`);
const parentSha = ref.object.sha;
const parentCommit = await request('GET', `/repos/${repository}/git/commits/${parentSha}`);
const treeEntries = [];
for (const file of localFiles) {
  let blobSha = file.localSha;
  if (file.remoteSha !== file.localSha) {
    const blob = await request('POST', `/repos/${repository}/git/blobs`, {
      content: file.buffer.toString('base64'),
      encoding: 'base64',
    });
    blobSha = blob.sha;
    if (blobSha !== file.localSha) throw new Error(`Blob SHA mismatch for ${file.path}.`);
  }
  treeEntries.push({ path: file.path, mode: '100644', type: 'blob', sha: blobSha });
}
const tree = await request('POST', `/repos/${repository}/git/trees`, {
  base_tree: parentCommit.tree.sha,
  tree: treeEntries,
});
const commit = await request('POST', `/repos/${repository}/git/commits`, {
  message: 'Materialize expanded asset catalogs and deep briefs [skip ci]',
  tree: tree.sha,
  parents: [parentSha],
  author: { name: 'github-actions[bot]', email: '41898282+github-actions[bot]@users.noreply.github.com' },
  committer: { name: 'github-actions[bot]', email: '41898282+github-actions[bot]@users.noreply.github.com' },
});
await request('PATCH', `/repos/${repository}/git/refs/heads/${encodedBranch}`, { sha: commit.sha, force: false });
console.log(`[asset-factory-commit] committed ${localFiles.length} files to ${branch} at ${commit.sha}`);
