#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIRS = ['src', 'tools', 'scripts', 'tests'];
const JSON_FILES = [
  'package.json',
  'src/config/manifest.json',
  'public/assets/models/asset-index-v2.json',
];

const failures = [];
const notes = [];

function fail(message) {
  failures.push(message);
  console.error(`✖ ${message}`);
}

function pass(message) {
  console.log(`✔ ${message}`);
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

function projectPath(path) {
  return relative(ROOT, path).replaceAll('\\', '/');
}

function checkSyntax(files) {
  let checked = 0;
  for (const file of files) {
    if (!['.js', '.mjs', '.cjs'].includes(extname(file))) continue;
    try {
      execFileSync(process.execPath, ['--check', file], { cwd: ROOT, stdio: 'pipe' });
      checked++;
    } catch (error) {
      const detail = String(error.stderr || error.message || error).trim();
      fail(`Syntax error in ${projectPath(file)}\n${detail}`);
    }
  }
  if (checked) pass(`JavaScript syntax checked (${checked} files)`);
}

function checkJson() {
  for (const rel of JSON_FILES) {
    const file = join(ROOT, rel);
    if (!existsSync(file)) {
      fail(`Missing required JSON file: ${rel}`);
      continue;
    }
    try {
      JSON.parse(readFileSync(file, 'utf8'));
      pass(`Valid JSON: ${rel}`);
    } catch (error) {
      fail(`Invalid JSON in ${rel}: ${error.message}`);
    }
  }
}

function resolveImport(fromFile, specifier) {
  const base = resolve(dirname(fromFile), specifier);
  const candidates = [
    base,
    `${base}.js`,
    `${base}.mjs`,
    `${base}.json`,
    join(base, 'index.js'),
    join(base, 'index.mjs'),
  ];
  return candidates.find((candidate) => existsSync(candidate)) || null;
}

function checkRelativeImports(files) {
  const importPattern = /(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"](\.[^'"]+)['"]|import\(\s*['"](\.[^'"]+)['"]\s*\)/g;
  let checked = 0;
  for (const file of files) {
    if (!['.js', '.mjs'].includes(extname(file))) continue;
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(importPattern)) {
      const specifier = match[1] || match[2];
      if (!specifier) continue;
      checked++;
      if (!resolveImport(file, specifier)) {
        fail(`Broken relative import in ${projectPath(file)}: ${specifier}`);
      }
    }
  }
  if (checked) pass(`Relative imports resolved (${checked} imports)`);
}

function flattenAssetIndex(index) {
  const rows = [];
  for (const [category, packs] of Object.entries(index || {})) {
    for (const [pack, entries] of Object.entries(packs || {})) {
      if (!Array.isArray(entries)) {
        fail(`Asset index ${category}/${pack} is not an array`);
        continue;
      }
      const names = new Set();
      for (const entry of entries) {
        if (!entry || typeof entry.name !== 'string' || typeof entry.path !== 'string') {
          fail(`Malformed asset entry in ${category}/${pack}`);
          continue;
        }
        const key = entry.name.toLowerCase();
        if (names.has(key)) fail(`Duplicate asset name in ${category}/${pack}: ${entry.name}`);
        names.add(key);
        rows.push({ category, pack, ...entry });
      }
    }
  }
  return rows;
}

function checkAssetIndex() {
  const rel = 'public/assets/models/asset-index-v2.json';
  const file = join(ROOT, rel);
  if (!existsSync(file)) return;

  let index;
  try {
    index = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return;
  }

  const rows = flattenAssetIndex(index);
  let missing = 0;
  for (const entry of rows) {
    // Index paths are relative to /public/assets, matching assets.js loadAsset().
    const absolute = join(ROOT, 'public', 'assets', normalize(entry.path));
    if (!existsSync(absolute)) {
      missing++;
      fail(`Indexed asset is missing: ${entry.category}/${entry.pack}/${entry.name} -> public/assets/${entry.path}`);
    }
  }
  if (!missing) pass(`Asset index paths verified (${rows.length} assets)`);

  const required = {
    'characters/psx': ['character-01', 'character-17-police', 'character-29-female'],
    'interiors/classroom': ['blackboardbig', 'chairtable', 'locker', 'desk'],
    'interiors/restaurant': ['counter-front', 'cash-register'],
    'interiors/gym': ['treadmill-1-main', 'bench-press'],
  };

  for (const [key, names] of Object.entries(required)) {
    const [category, pack] = key.split('/');
    const entries = index?.[category]?.[pack] || [];
    const actual = new Set(entries.map((entry) => String(entry.name).toLowerCase()));
    for (const name of names) {
      if (![...actual].some((candidate) => candidate.includes(name.toLowerCase()))) {
        fail(`Starter Town critical asset missing from index: ${key}/${name}`);
      }
    }
  }
  pass('Starter Town critical asset groups checked');
}

function checkCharacterArchitecture() {
  const runtimeHook = join(ROOT, 'src/skinRuntime.js');
  const blockSupply = readFileSync(join(ROOT, 'src/config/blockSupplyLayout.js'), 'utf8');
  const skinAdapter = readFileSync(join(ROOT, 'src/avatarSkin.js'), 'utf8');
  const npc = readFileSync(join(ROOT, 'src/npc.js'), 'utf8');
  const main = readFileSync(join(ROOT, 'src/main.js'), 'utf8');

  if (existsSync(runtimeHook)) fail('Legacy src/skinRuntime.js global avatar hook must stay removed');
  if (blockSupply.includes('skinRuntime')) fail('Block Supply config must not import character runtime code');
  if (skinAdapter.includes('Object3D.prototype.add')) fail('Character adapter must not intercept Object3D.prototype.add');
  if (!npc.includes('applyNpcSkins(')) fail('Civilian creation must own an explicit applyNpcSkins call');
  if (!main.includes('applyPlayerSkin(')) fail('Player rebuild must own an explicit applyPlayerSkin call');
  if (!main.includes('applyCopSkin(')) fail('Police spawn must own an explicit applyCopSkin call');

  if (!failures.some((message) => /skinRuntime|Block Supply config|Character adapter|applyNpcSkins|applyPlayerSkin|applyCopSkin/.test(message))) {
    pass('Character skin architecture boundaries verified');
  }
}

function checkProjectShape() {
  const required = [
    'index.html',
    'src/main.js',
    'src/avatar.js',
    'src/avatarSkin.js',
    'src/interiors.js',
    'src/furnish.js',
    'src/npc.js',
    'src/ui.js',
    'src/state.js',
    'src/interaction.js',
    'src/config/mapConfig.js',
    'src/config/blockSupplyLayout.js',
  ];
  for (const rel of required) {
    if (!existsSync(join(ROOT, rel))) fail(`Missing core project file: ${rel}`);
  }
  if (!failures.some((message) => message.startsWith('Missing core project file'))) {
    pass(`Core project shape verified (${required.length} files)`);
  }
}

function main() {
  console.log('Zaylins project integrity check\n');
  const files = SOURCE_DIRS.flatMap((dir) => walk(join(ROOT, dir)));
  checkProjectShape();
  checkJson();
  checkSyntax(files);
  checkRelativeImports(files);
  checkAssetIndex();
  checkCharacterArchitecture();

  if (notes.length) {
    console.log('\nNotes:');
    for (const note of notes) console.log(`• ${note}`);
  }

  if (failures.length) {
    console.error(`\nProject check failed with ${failures.length} issue(s).`);
    process.exitCode = 1;
    return;
  }

  console.log('\nProject check passed.');
}

main();
