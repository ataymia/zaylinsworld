import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, 'public');
const MODELS = path.join(PUBLIC, 'assets', 'models');
const INDEX_FILE = path.join(MODELS, 'asset-index-v2.json');
const REPORT_DIR = path.join(ROOT, 'reports');
const MODEL_EXT = new Set(['.glb', '.gltf', '.bin', '.png', '.jpg', '.jpeg', '.webp', '.ktx2']);
const TEXT_EXT = new Set(['.js', '.mjs', '.json', '.html', '.md', '.css', '.yml', '.yaml']);

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(abs));
    else out.push(abs);
  }
  return out;
}

function relPublic(abs) {
  return path.relative(PUBLIC, abs).split(path.sep).join('/');
}

function formatBytes(bytes) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

async function sha256(file) {
  const data = await readFile(file);
  return createHash('sha256').update(data).digest('hex');
}

function flattenIndex(index) {
  const rows = [];
  for (const [category, packs] of Object.entries(index || {})) {
    if (!packs || typeof packs !== 'object' || Array.isArray(packs)) continue;
    for (const [pack, entries] of Object.entries(packs)) {
      if (!Array.isArray(entries)) continue;
      for (const entry of entries) {
        if (!entry || !entry.path) continue;
        rows.push({ category, pack, name: entry.name || '', path: String(entry.path) });
      }
    }
  }
  return rows;
}

async function collectCompanions(gltfFiles) {
  const companions = new Set();
  for (const abs of gltfFiles) {
    try {
      const json = JSON.parse(await readFile(abs, 'utf8'));
      const dir = path.dirname(abs);
      for (const buffer of json.buffers || []) {
        if (buffer.uri && !/^data:|^https?:/i.test(buffer.uri)) companions.add(relPublic(path.resolve(dir, buffer.uri)));
      }
      for (const image of json.images || []) {
        if (image.uri && !/^data:|^https?:/i.test(image.uri)) companions.add(relPublic(path.resolve(dir, image.uri)));
      }
    } catch {
      // Malformed glTFs are surfaced by the character/model audits; do not abort inventory.
    }
  }
  return companions;
}

async function sourceCorpus() {
  const roots = [path.join(ROOT, 'src'), path.join(ROOT, 'tools'), path.join(ROOT, 'scripts')];
  const files = [path.join(ROOT, 'index.html'), path.join(ROOT, 'package.json')];
  for (const dir of roots) {
    try { files.push(...await walk(dir)); } catch {}
  }
  let text = '';
  for (const file of files) {
    if (!TEXT_EXT.has(path.extname(file).toLowerCase())) continue;
    try { text += `\n${await readFile(file, 'utf8')}`; } catch {}
  }
  return text.toLowerCase();
}

const index = JSON.parse(await readFile(INDEX_FILE, 'utf8'));
const indexed = flattenIndex(index);
const indexedPaths = new Set(indexed.map((row) => row.path.replace(/^assets\//, '')));
const allDisk = (await walk(MODELS)).filter((file) => MODEL_EXT.has(path.extname(file).toLowerCase()));
const diskRows = [];
for (const abs of allDisk) {
  const info = await stat(abs);
  diskRows.push({ abs, path: relPublic(abs), bytes: info.size, ext: path.extname(abs).toLowerCase() });
}

const diskPaths = new Set(diskRows.map((row) => row.path));
const missing = indexed.filter((row) => !diskPaths.has(row.path.replace(/^assets\//, '')));
const companions = await collectCompanions(diskRows.filter((row) => row.ext === '.gltf').map((row) => row.abs));
const unindexed = diskRows.filter((row) => {
  if (indexedPaths.has(row.path)) return false;
  if (companions.has(row.path)) return false;
  return !/asset-index|kits-index/i.test(path.basename(row.path));
});

const corpus = await sourceCorpus();
const directReferences = diskRows.filter((row) => {
  const lower = row.path.toLowerCase();
  const withoutModels = lower.replace(/^models\//, '');
  return corpus.includes(lower) || corpus.includes(withoutModels);
}).map((row) => row.path);

const hashGroups = new Map();
for (const row of diskRows) {
  const hash = await sha256(row.abs);
  row.sha256 = hash;
  if (!hashGroups.has(hash)) hashGroups.set(hash, []);
  hashGroups.get(hash).push(row);
}
const duplicates = [...hashGroups.entries()]
  .filter(([, rows]) => rows.length > 1)
  .map(([hash, rows]) => ({ hash, bytes: rows[0].bytes, paths: rows.map((r) => r.path).sort() }))
  .sort((a, b) => b.bytes - a.bytes);

const categoryTotals = {};
for (const row of indexed) {
  const key = `${row.category}/${row.pack}`;
  categoryTotals[key] = (categoryTotals[key] || 0) + 1;
}
const largest = [...diskRows].sort((a, b) => b.bytes - a.bytes).slice(0, 30);
const totalBytes = diskRows.reduce((sum, row) => sum + row.bytes, 0);

const result = {
  generatedAt: new Date().toISOString(),
  totals: {
    indexedEntries: indexed.length,
    runtimeFiles: diskRows.length,
    runtimeBytes: totalBytes,
    missingIndexedFiles: missing.length,
    unindexedNonCompanionFiles: unindexed.length,
    exactDuplicateGroups: duplicates.length,
    exactDuplicateBytes: duplicates.reduce((sum, group) => sum + group.bytes * (group.paths.length - 1), 0),
    directSourceReferences: directReferences.length,
  },
  categoryTotals,
  missing,
  unindexed: unindexed.map(({ path: p, bytes, sha256 }) => ({ path: p, bytes, sha256 })),
  duplicates,
  largest: largest.map(({ path: p, bytes, sha256 }) => ({ path: p, bytes, sha256 })),
  directReferences: directReferences.sort(),
};

const md = [];
md.push('# Runtime Asset Audit', '');
md.push('_Generated by `npm run audit:assets`. This report does not delete files._', '');
md.push('## Summary', '');
md.push(`- Indexed entries: **${result.totals.indexedEntries}**`);
md.push(`- Runtime files scanned: **${result.totals.runtimeFiles}** (${formatBytes(totalBytes)})`);
md.push(`- Missing indexed files: **${result.totals.missingIndexedFiles}**`);
md.push(`- Unindexed non-companion files: **${result.totals.unindexedNonCompanionFiles}**`);
md.push(`- Exact duplicate groups: **${result.totals.exactDuplicateGroups}**`);
md.push(`- Potential exact-duplicate storage: **${formatBytes(result.totals.exactDuplicateBytes)}**`);
md.push('', 'No file is a deletion candidate merely because it is unindexed. Direct manifests, glTF companion files, licenses, and future-use assets require human review.', '');

md.push('## Indexed groups', '', '| Group | Entries |', '|---|---:|');
for (const [group, count] of Object.entries(categoryTotals).sort()) md.push(`| ${group} | ${count} |`);

md.push('', '## Missing indexed files', '');
if (!missing.length) md.push('None.');
else {
  md.push('| Group | Name | Path |', '|---|---|---|');
  for (const row of missing) md.push(`| ${row.category}/${row.pack} | ${row.name} | ${row.path} |`);
}

md.push('', '## Unindexed non-companion files', '');
if (!unindexed.length) md.push('None.');
else {
  md.push('| Path | Size | Referenced directly in source |', '|---|---:|---|');
  for (const row of unindexed.sort((a, b) => b.bytes - a.bytes)) {
    md.push(`| ${row.path} | ${formatBytes(row.bytes)} | ${directReferences.includes(row.path) ? 'yes' : 'no'} |`);
  }
}

md.push('', '## Exact duplicate groups', '');
if (!duplicates.length) md.push('None.');
else {
  for (const group of duplicates) {
    md.push(`### ${formatBytes(group.bytes)} each · ${group.hash.slice(0, 12)}`);
    for (const p of group.paths) md.push(`- ${p}${directReferences.includes(p) ? ' (directly referenced)' : ''}`);
    md.push('');
  }
}

md.push('## Largest runtime files', '', '| Path | Size |', '|---|---:|');
for (const row of largest) md.push(`| ${row.path} | ${formatBytes(row.bytes)} |`);

md.push('', '## Safe cleanup sequence', '');
md.push('1. Fix missing indexed files or remove only the stale index entries.');
md.push('2. Review exact duplicate groups and preserve the path currently referenced by runtime code/manifests.');
md.push('3. Review unindexed files against licenses, glTF companions, future design plans, and git history.');
md.push('4. Delete nothing until `npm run check`, `npm run audit:characters`, and a live Starter Town regression pass succeed.');

await mkdir(REPORT_DIR, { recursive: true });
await writeFile(path.join(REPORT_DIR, 'ASSET_RUNTIME_AUDIT.md'), md.join('\n'));
await writeFile(path.join(REPORT_DIR, 'asset-runtime-audit.json'), JSON.stringify(result, null, 2));
console.log(`[asset-audit] ${diskRows.length} files, ${missing.length} missing, ${unindexed.length} unindexed, ${duplicates.length} duplicate groups.`);
