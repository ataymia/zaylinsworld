import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
const branch = process.env.TARGET_BRANCH || process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME;
const apiBase = process.env.GITHUB_API_URL || 'https://api.github.com';
const files = [
  'asset-factory/generated/deep-asset-specs.json',
  'asset-factory/generated/deep-spec-coverage.json',
];

if (!token) throw new Error('GH_TOKEN or GITHUB_TOKEN is required.');
if (!repository || !repository.includes('/')) throw new Error('GITHUB_REPOSITORY is missing or invalid.');
if (!branch) throw new Error('Target branch is missing.');

async function request(method, path, body) {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'zta-deep-asset-briefs-workflow',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!response.ok) {
    const detail = typeof data === 'string' ? data : JSON.stringify(data);
    throw new Error(`${method} ${path} failed with ${response.status}: ${detail}`);
  }
  return data;
}

function gitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`);
  return createHash('sha1').update(header).update(buffer).digest('hex');
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

const localFiles = files.map((path) => {
  const buffer = readFileSync(path);
  return {
    path,
    buffer,
    localSha: gitBlobSha(buffer),
    size: buffer.length,
  };
});

let unchanged = true;
for (const file of localFiles) {
  const remoteSha = await currentPathSha(file.path);
  file.remoteSha = remoteSha;
  if (remoteSha !== file.localSha) unchanged = false;
  console.log(`[deep-spec-commit] ${file.path}: ${file.size} bytes, local=${file.localSha}, remote=${remoteSha || 'missing'}`);
}

if (unchanged) {
  console.log('[deep-spec-commit] Generated specification library is already current.');
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
    if (blobSha !== file.localSha) {
      throw new Error(`GitHub blob SHA mismatch for ${file.path}: expected ${file.localSha}, received ${blobSha}`);
    }
  }
  treeEntries.push({
    path: file.path,
    mode: '100644',
    type: 'blob',
    sha: blobSha,
  });
}

const tree = await request('POST', `/repos/${repository}/git/trees`, {
  base_tree: parentCommit.tree.sha,
  tree: treeEntries,
});
const commit = await request('POST', `/repos/${repository}/git/commits`, {
  message: 'Generate all deep asset production briefs [skip ci]',
  tree: tree.sha,
  parents: [parentSha],
  author: {
    name: 'github-actions[bot]',
    email: '41898282+github-actions[bot]@users.noreply.github.com',
  },
  committer: {
    name: 'github-actions[bot]',
    email: '41898282+github-actions[bot]@users.noreply.github.com',
  },
});
await request('PATCH', `/repos/${repository}/git/refs/heads/${encodedBranch}`, {
  sha: commit.sha,
  force: false,
});

console.log(`[deep-spec-commit] committed ${files.length} generated files to ${branch} at ${commit.sha}`);
