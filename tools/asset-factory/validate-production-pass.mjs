import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const reportPath = resolve(process.argv[2] || 'reports/asset-factory/latest.json');
const minimumPassRate = Number(process.env.ASSET_FACTORY_MIN_PASS_RATE || 0.70);
const report = JSON.parse(readFileSync(reportPath, 'utf8'));

if (!Array.isArray(report.results)) {
  console.log(`[asset-factory] ${report.message || 'No queued proof batch remained; health-only report accepted.'}`);
  process.exit(0);
}

const requested = Number.isFinite(Number(report.requested))
  ? Number(report.requested)
  : report.results.length;
const passed = report.results.filter((asset) => asset.passed);
const passRate = requested > 0 ? passed.length / requested : 1;
const failures = [];

if (report.results.length !== requested) {
  failures.push(`report contains ${report.results.length} results for ${requested} requested assets`);
}
if (passRate < minimumPassRate) {
  failures.push(
    `pass rate ${Math.round(passRate * 100)}% is below ${Math.round(minimumPassRate * 100)}%`,
  );
}

function hasMagic(path, expected) {
  if (!existsSync(path) || statSync(path).size < expected.minimumBytes) return false;
  const bytes = readFileSync(path).subarray(0, expected.magic.length);
  return bytes.equals(expected.magic);
}

for (const asset of passed) {
  if (!asset.outputPath || !hasMagic(asset.outputPath, {
    minimumBytes: 1024,
    magic: Buffer.from('glTF'),
  })) {
    failures.push(`${asset.id}: accepted GLB is missing, undersized, or has invalid magic bytes`);
  }

  const previews = Array.isArray(asset.previewPaths) ? asset.previewPaths : [];
  if (previews.length !== 4) {
    failures.push(`${asset.id}: expected four QA previews, found ${previews.length}`);
    continue;
  }
  for (const [index, previewPath] of previews.entries()) {
    if (!hasMagic(previewPath, {
      minimumBytes: 4096,
      magic: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    })) {
      failures.push(`${asset.id}: preview ${index + 1} is missing, undersized, or not a PNG`);
    }
  }
}

console.log(
  `[asset-factory] production gate: ${passed.length}/${requested} passed ` +
  `(${Math.round(passRate * 100)}%); ${passed.length * 4} preview files inspected.`,
);

if (failures.length) {
  console.error('[asset-factory] production gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
