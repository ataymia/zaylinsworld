import { readdir, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const ROOT = process.cwd();
const INCLUDE_DIRS = ['src', 'tools', 'scripts'];
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'public']);
const files = [];

async function walk(dir) {
  for (const name of await readdir(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const info = await stat(full);
    if (info.isDirectory()) await walk(full);
    else if (/\.(?:js|mjs|cjs)$/.test(name)) files.push(full);
  }
}

for (const rel of INCLUDE_DIRS) {
  try { await walk(path.join(ROOT, rel)); }
  catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

let failed = 0;
for (const file of files.sort()) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    failed++;
    console.error(`\n[syntax] ${path.relative(ROOT, file)}\n${result.stderr || result.stdout}`);
  }
}

if (failed) {
  console.error(`\n[syntax] ${failed} file(s) failed.`);
  process.exit(1);
}

console.log(`[syntax] ${files.length} JavaScript files passed.`);
