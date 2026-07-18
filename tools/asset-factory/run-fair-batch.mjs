import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const SOURCE = join(ROOT, 'tools', 'asset-factory', 'run-batch.mjs');
const ACTIVE = join(ROOT, 'asset-factory', 'work', 'run-batch-fair.active.mjs');
const needle = "const builders = [...byBuilder.keys()].sort();";
const replacement = `const builderNames = [...byBuilder.keys()].sort();
  const rotation = builderNames.length ? (queue.sequence || 0) % builderNames.length : 0;
  const builders = builderNames.slice(rotation).concat(builderNames.slice(0, rotation));`;

const source = readFileSync(SOURCE, 'utf8');
if (!source.includes(needle)) {
  throw new Error('The run-batch builder selection statement changed; fairness wrapper requires review.');
}
const patched = source.replace(needle, replacement);
mkdirSync(dirname(ACTIVE), { recursive: true });
writeFileSync(ACTIVE, patched);

const result = spawnSync(process.execPath, [ACTIVE, ...process.argv.slice(2)], {
  cwd: ROOT,
  stdio: 'inherit',
  env: process.env,
});
rmSync(ACTIVE, { force: true });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
