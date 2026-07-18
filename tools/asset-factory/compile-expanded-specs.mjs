import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();

function run(script) {
  const result = spawnSync(process.execPath, [script], {
    cwd: ROOT,
    stdio: 'inherit',
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 120,
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${script} exited with code ${result.status}.`);
}

run('tools/asset-factory/build-final-gameplay-gap-catalog.mjs');
run('tools/asset-factory/compile-specs.mjs');
run('tools/asset-factory/apply-gameplay-gap-catalog-v2.mjs');
run('tools/asset-factory/promote-safe-builders.mjs');
run('tools/asset-factory/normalize-production-contracts.mjs');
run('tools/asset-factory/check-gameplay-gap-catalog-v2.mjs');
console.log('[expanded-compile] 2,298-record master and production queue are current.');
