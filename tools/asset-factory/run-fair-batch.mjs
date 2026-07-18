import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const SOURCE = join(ROOT, 'tools', 'asset-factory', 'run-batch.mjs');
const ACTIVE = join(ROOT, 'asset-factory', 'work', 'run-batch-fair.active.mjs');
const builderNeedle = "const builders = [...byBuilder.keys()].sort();";
const builderReplacement = `const builderNames = [...byBuilder.keys()].sort();
  const rotation = builderNames.length ? (queue.sequence || 0) % builderNames.length : 0;
  const builders = builderNames.slice(rotation).concat(builderNames.slice(0, rotation));`;
const compilerNeedle = "run(process.execPath, ['tools/asset-factory/compile-expanded-specs.mjs']);";
const compilerReplacement = `if (
    process.env.ASSET_FACTORY_RECOMPILE === '1'
    || !existsSync(MASTER_PATH)
    || !existsSync(QUEUE_PATH)
  ) {
    run(process.execPath, ['tools/asset-factory/compile-expanded-specs.mjs']);
  } else {
    console.log('[asset-factory] reusing validated master and queue; catalog recompilation skipped.');
  }`;

const source = readFileSync(SOURCE, 'utf8');
if (!source.includes(builderNeedle)) {
  throw new Error('The run-batch builder selection statement changed; fairness wrapper requires review.');
}
if (!source.includes(compilerNeedle)) {
  throw new Error('The run-batch compiler statement changed; catalog-reuse wrapper requires review.');
}
const patched = source
  .replace(builderNeedle, builderReplacement)
  .replace(compilerNeedle, compilerReplacement);
mkdirSync(dirname(ACTIVE), { recursive: true });
writeFileSync(ACTIVE, patched);

const syntax = spawnSync(process.execPath, ['--check', ACTIVE], {
  cwd: ROOT,
  encoding: 'utf8',
  stdio: 'pipe',
  env: process.env,
});
if (syntax.error) throw syntax.error;
if (syntax.status !== 0) {
  throw new Error(`Generated fair batch runner failed syntax validation.\n${syntax.stdout || ''}\n${syntax.stderr || ''}`);
}

const result = spawnSync(process.execPath, [ACTIVE, ...process.argv.slice(2)], {
  cwd: ROOT,
  stdio: 'inherit',
  env: process.env,
});
rmSync(ACTIVE, { force: true });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
