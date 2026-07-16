#!/usr/bin/env node

import { createHash } from 'node:crypto';
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_ASSETS = join(ROOT, 'public/assets');
const MODELS_ROOT = join(PUBLIC_ASSETS, 'models');
const INDEX_PATH = join(MODELS_ROOT, 'asset-index-v2.json');
const JSON_OUT = join(ROOT, 'docs/asset-inventory.json');
const MD_OUT = join(ROOT, 'docs/ASSET_INVENTORY.md');
const CHECK = process.argv.includes('--check');
const MODEL_EXTENSIONS = new Set(['.glb', '.gltf', '.fbx', '.obj', '.dae', '.blend']);
const OVERSIZED_BYTES = 5 * 1024 * 1024;

function slash(value) {
  return value.replaceAll('\\', '/');
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...walk(path));
    else files.push(path);
  }
  return files;
}

function hashFile(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function bytes(value) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 ** 2).toFixed(2)} MB`;
}

function countBy(items, keyFn) {
  const out = {};
  for (const item of items) {
    const key = keyFn(item);
    out[key] = (out[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

function indexedRows(index) {
  const rows = [];
  const duplicateRows = [];
  for (const [category, packs] of Object.entries(index || {})) {
    for (const [pack, entries] of Object.entries(packs || {})) {
      const seen = new Set();
      for (const entry of entries || []) {
        const key = `${String(entry.name).toLowerCase()}|${String(entry.path).toLowerCase()}`;
        if (seen.has(key)) duplicateRows.push({ category, pack, name: entry.name, path: entry.path });
        seen.add(key);
        rows.push({ category, pack, ...entry });
      }
    }
  }
  return { rows, duplicateRows };
}

function inspectGltfCompanions(file) {
  if (extname(file.absolute).toLowerCase() !== '.gltf') return [];
  try {
    const json = JSON.parse(readFileSync(file.absolute, 'utf8'));
    const uris = [
      ...(json.buffers || []).map((entry) => entry.uri),
      ...(json.images || []).map((entry) => entry.uri),
    ].filter((uri) => uri && !/^data:/i.test(uri) && !/^https?:/i.test(uri));
    return uris
      .filter((uri) => !existsSync(resolve(dirname(file.absolute), decodeURIComponent(uri))))
      .map((uri) => ({ model: file.path, missing: uri }));
  } catch (error) {
    return [{ model: file.path, missing: `unreadable glTF JSON: ${error.message}` }];
  }
}

function buildReport() {
  if (!existsSync(INDEX_PATH)) throw new Error(`Missing ${slash(relative(ROOT, INDEX_PATH))}`);
  const index = JSON.parse(readFileSync(INDEX_PATH, 'utf8'));
  const { rows, duplicateRows } = indexedRows(index);
  const indexedPaths = new Set(rows.map((entry) => slash(entry.path).toLowerCase()));

  const allFiles = walk(MODELS_ROOT)
    .filter((path) => MODEL_EXTENSIONS.has(extname(path).toLowerCase()))
    .map((absolute) => {
      const stat = statSync(absolute);
      return {
        absolute,
        path: slash(relative(PUBLIC_ASSETS, absolute)),
        extension: extname(absolute).toLowerCase(),
        sizeBytes: stat.size,
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));

  const missingIndexed = rows
    .filter((entry) => !existsSync(join(PUBLIC_ASSETS, entry.path)))
    .map((entry) => ({ category: entry.category, pack: entry.pack, name: entry.name, path: entry.path }));

  const unindexed = allFiles
    .filter((file) => !indexedPaths.has(file.path.toLowerCase()))
    .map(({ absolute, ...file }) => file);

  const oversized = allFiles
    .filter((file) => file.sizeBytes >= OVERSIZED_BYTES)
    .map(({ absolute, ...file }) => file)
    .sort((a, b) => b.sizeBytes - a.sizeBytes);

  const companionProblems = allFiles.flatMap(inspectGltfCompanions);

  const hashGroups = new Map();
  for (const file of allFiles) {
    // Size grouping avoids hashing unique-size files unnecessarily.
    const group = hashGroups.get(file.sizeBytes) || [];
    group.push(file);
    hashGroups.set(file.sizeBytes, group);
  }

  const duplicateContent = [];
  for (const sameSize of hashGroups.values()) {
    if (sameSize.length < 2) continue;
    const hashes = new Map();
    for (const file of sameSize) {
      const hash = hashFile(file.absolute);
      const group = hashes.get(hash) || [];
      group.push(file);
      hashes.set(hash, group);
    }
    for (const [hash, files] of hashes) {
      if (files.length < 2) continue;
      duplicateContent.push({
        sha256: hash,
        sizeBytes: files[0].sizeBytes,
        paths: files.map((file) => file.path),
      });
    }
  }
  duplicateContent.sort((a, b) => b.sizeBytes - a.sizeBytes || a.paths[0].localeCompare(b.paths[0]));

  const totalBytes = allFiles.reduce((sum, file) => sum + file.sizeBytes, 0);
  return {
    schemaVersion: 1,
    generatedBy: 'tools/audit-assets.mjs',
    thresholds: { oversizedBytes: OVERSIZED_BYTES },
    summary: {
      indexedRows: rows.length,
      runtimeModelFiles: allFiles.length,
      totalModelBytes: totalBytes,
      totalModelSize: bytes(totalBytes),
      missingIndexed: missingIndexed.length,
      unindexed: unindexed.length,
      duplicateIndexRows: duplicateRows.length,
      duplicateContentGroups: duplicateContent.length,
      oversized: oversized.length,
      missingCompanions: companionProblems.length,
      byExtension: countBy(allFiles, (file) => file.extension),
      byCategory: countBy(rows, (entry) => entry.category),
      byPack: countBy(rows, (entry) => `${entry.category}/${entry.pack}`),
    },
    missingIndexed,
    unindexed,
    duplicateIndexRows: duplicateRows,
    duplicateContent,
    oversized,
    missingCompanions: companionProblems,
  };
}

function tableRows(items, columns, empty) {
  if (!items.length) return [empty];
  return items.map((item) => `| ${columns.map((column) => column(item)).join(' | ')} |`);
}

function markdown(report) {
  const lines = [
    '# Runtime Asset Inventory',
    '',
    'Generated by `npm run audit:assets`. This is a read-only inventory. It identifies cleanup candidates but intentionally performs no deletion, move, conversion, or compression.',
    '',
    '## Summary',
    '',
    `- Indexed rows: **${report.summary.indexedRows}**`,
    `- Runtime model files: **${report.summary.runtimeModelFiles}**`,
    `- Total runtime model size: **${report.summary.totalModelSize}**`,
    `- Missing indexed files: **${report.summary.missingIndexed}**`,
    `- Unindexed model files: **${report.summary.unindexed}**`,
    `- Duplicate index rows: **${report.summary.duplicateIndexRows}**`,
    `- Duplicate-content groups: **${report.summary.duplicateContentGroups}**`,
    `- Files at least ${bytes(report.thresholds.oversizedBytes)}: **${report.summary.oversized}**`,
    `- Missing external glTF companions: **${report.summary.missingCompanions}**`,
    '',
    '## File types',
    '',
    '| Extension | Count |',
    '|---|---:|',
    ...Object.entries(report.summary.byExtension).map(([extension, count]) => `| ${extension} | ${count} |`),
    '',
    '## Missing indexed files',
    '',
    '| Category/pack | Asset | Expected path |',
    '|---|---|---|',
    ...tableRows(report.missingIndexed, [
      (item) => `${item.category}/${item.pack}`,
      (item) => `\`${item.name}\``,
      (item) => `\`${item.path}\``,
    ], '| None |  |  |'),
    '',
    '## Unindexed model files',
    '',
    '| Path | Size |',
    '|---|---:|',
    ...tableRows(report.unindexed, [
      (item) => `\`${item.path}\``,
      (item) => bytes(item.sizeBytes),
    ], '| None |  |'),
    '',
    '## Duplicate index rows',
    '',
    '| Category/pack | Asset | Path |',
    '|---|---|---|',
    ...tableRows(report.duplicateIndexRows, [
      (item) => `${item.category}/${item.pack}`,
      (item) => `\`${item.name}\``,
      (item) => `\`${item.path}\``,
    ], '| None |  |  |'),
    '',
    '## Duplicate file content',
    '',
    '| Size | Paths |',
    '|---:|---|',
    ...tableRows(report.duplicateContent, [
      (item) => bytes(item.sizeBytes),
      (item) => item.paths.map((path) => `\`${path}\``).join('<br>'),
    ], '| None |  |'),
    '',
    '## Oversized runtime files',
    '',
    '| Size | Path |',
    '|---:|---|',
    ...tableRows(report.oversized, [
      (item) => bytes(item.sizeBytes),
      (item) => `\`${item.path}\``,
    ], '| None |  |'),
    '',
    '## Missing glTF companions',
    '',
    '| Model | Missing companion |',
    '|---|---|',
    ...tableRows(report.missingCompanions, [
      (item) => `\`${item.model}\``,
      (item) => `\`${item.missing}\``,
    ], '| None |  |'),
    '',
    '## Cleanup policy',
    '',
    '1. Missing indexed files are build/runtime defects and should be repaired first.',
    '2. Unindexed files require classification before routing or deletion.',
    '3. Exact duplicate-content files require a reference search before consolidation.',
    '4. Oversized GLBs are optimization candidates, not automatic deletion candidates.',
    '5. License, credit, texture, `.bin`, and source-companion files must remain attached to their assets.',
    '6. Initial loading should stay incremental; optimization must not restore all-at-once preloading.',
    '',
  ];
  return lines.join('\n');
}

function writeOrCheck(path, content) {
  if (!CHECK) {
    writeFileSync(path, content);
    return;
  }
  if (!existsSync(path) || readFileSync(path, 'utf8') !== content) {
    throw new Error(`${relative(ROOT, path)} is stale; run npm run audit:assets`);
  }
}

const report = buildReport();
writeOrCheck(JSON_OUT, `${JSON.stringify(report, null, 2)}\n`);
writeOrCheck(MD_OUT, `${markdown(report)}\n`);
console.log(JSON.stringify(report.summary, null, 2));
console.log(CHECK ? 'Asset inventory files are current.' : 'Wrote docs/ASSET_INVENTORY.md and docs/asset-inventory.json.');
