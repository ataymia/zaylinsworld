import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const CATALOG_ROOT = join(ROOT, 'asset-factory', 'gameplay-gaps');
const SUMMARY_PATH = join(CATALOG_ROOT, 'summary.json');
const MASTER_PATH = join(ROOT, 'asset-factory', 'generated', 'master-asset-specs.json');
const QUEUE_PATH = join(ROOT, 'asset-factory', 'state', 'queue.json');
const failures = [];

for (const path of [SUMMARY_PATH, MASTER_PATH, QUEUE_PATH]) {
  if (!existsSync(path)) failures.push(`Missing required gameplay-gap output: ${path}`);
}
if (failures.length) {
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const summary = JSON.parse(readFileSync(SUMMARY_PATH, 'utf8'));
const master = JSON.parse(readFileSync(MASTER_PATH, 'utf8'));
const queue = JSON.parse(readFileSync(QUEUE_PATH, 'utf8'));
const catalogFiles = readdirSync(CATALOG_ROOT)
  .filter((name) => name.endsWith('.json') && name !== 'summary.json')
  .sort();
const assets = [];
for (const name of catalogFiles) {
  const catalog = JSON.parse(readFileSync(join(CATALOG_ROOT, name), 'utf8'));
  if (catalog.format !== 'zta-gameplay-gap-catalog') failures.push(`${name}: invalid format.`);
  if (!Array.isArray(catalog.assets)) failures.push(`${name}: assets array missing.`);
  if (catalog.recordCount !== catalog.assets?.length) failures.push(`${name}: record count is stale.`);
  assets.push(...(catalog.assets || []));
}

const ids = new Set();
const fileNames = new Set();
const kinds = {};
const towns = {};
const gapCategories = new Set();
const hair = [];
const runtime = [];
const childSafe = [];
const proofText = [];
for (const asset of assets) {
  const label = asset.id || asset.fileName || '<unknown>';
  if (ids.has(asset.id)) failures.push(`${label}: duplicate id.`);
  if (fileNames.has(asset.fileName)) failures.push(`${label}: duplicate filename.`);
  ids.add(asset.id);
  fileNames.add(asset.fileName);
  kinds[asset.assetKind] = (kinds[asset.assetKind] || 0) + 1;
  towns[asset.town] = (towns[asset.town] || 0) + 1;
  gapCategories.add(asset.gapCategory);
  if (!asset.displayName || asset.displayName.length < 5) failures.push(`${label}: display name is too short.`);
  if (!asset.description || asset.description.length < 1900) failures.push(`${label}: description is ${asset.description?.length || 0} characters; minimum is 1900.`);
  if (!asset.designIntent || asset.designIntent.length < 120) failures.push(`${label}: design intent is too short.`);
  if (!Array.isArray(asset.requiredComponents) || asset.requiredComponents.length < 8) failures.push(`${label}: fewer than eight required components.`);
  if (!Array.isArray(asset.materials) || asset.materials.length < 4) failures.push(`${label}: fewer than four material layers.`);
  if (!Array.isArray(asset.functionalNotes) || asset.functionalNotes.length < 6) failures.push(`${label}: functional notes are incomplete.`);
  if (!Array.isArray(asset.forbiddenShortcuts) || asset.forbiddenShortcuts.length < 8) failures.push(`${label}: rejection rules are incomplete.`);
  if (!asset.productionPipeline) failures.push(`${label}: production pipeline is missing.`);
  if (!asset.assetKind) failures.push(`${label}: asset kind is missing.`);
  if (!asset.sourceDoc?.startsWith('asset-factory/gameplay-gaps/')) failures.push(`${label}: source catalog path is invalid.`);
  if (!asset.quality || asset.quality.requiredComponentCoverage !== 1) failures.push(`${label}: quality contract is incomplete.`);
  if (asset.assetKind === 'hair') hair.push(asset);
  if (['runtime-vfx', 'decal', 'shader', 'audio-visual', 'helper'].includes(asset.assetKind)) runtime.push(asset);
  if (/blood|muzzle|impact|damage|injury/i.test(`${asset.displayName} ${asset.description}`)) childSafe.push(asset);
  proofText.push(asset.displayName, asset.description, asset.gapCategory);
}

if (assets.length !== summary.newCanonicalRequestCount) failures.push(`Catalog total ${assets.length} does not match summary ${summary.newCanonicalRequestCount}.`);
if (assets.length !== 1320) failures.push(`Final gap sweep contains ${assets.length} records; expected 1320.`);
if (master.assets.length !== summary.expectedAuditedRecordCount) failures.push(`Expanded master contains ${master.assets.length} records; expected ${summary.expectedAuditedRecordCount}.`);
if (master.assets.length !== 2298) failures.push(`Expanded master contains ${master.assets.length} records; expected 2298.`);
const canonical = master.assets.filter((asset) => asset.generationEligible !== false).length;
const referenceOnly = master.assets.length - canonical;
if (canonical !== 2282) failures.push(`Canonical generation count is ${canonical}; expected 2282.`);
if (referenceOnly !== 16) failures.push(`Reference-only count is ${referenceOnly}; expected 16.`);
if (queue.assets.length !== master.assets.length) failures.push('Queue and expanded master counts differ.');
if (queue.counts.total !== master.assets.length) failures.push('Queue total is stale.');
if (hair.length < 80) failures.push(`Only ${hair.length} hairstyle records found; expected at least 80.`);
if (runtime.length < 480) failures.push(`Only ${runtime.length} runtime-effect/helper records found; expected at least 480.`);
if ((kinds['runtime-vfx'] || 0) < 280) failures.push('Runtime VFX coverage is below 280 records.');
if ((kinds.decal || 0) < 100) failures.push('Decal coverage is below 100 records.');
if ((kinds.connector || 0) < 170) failures.push('Connector coverage is below 170 records.');
if ((kinds.creature || 0) < 70) failures.push('Creature coverage is below 70 records.');
if ((kinds['state-variant'] || 0) < 60) failures.push('State-variant coverage is below 60 records.');
if ((kinds.shader || 0) < 30) failures.push('Shader coverage is below 30 records.');
if ((kinds['audio-visual'] || 0) < 35) failures.push('Audio-visual coverage is below 35 records.');
if ((kinds.helper || 0) < 29) failures.push('Runtime-helper coverage is below 29 records.');
if (gapCategories.size < 50) failures.push(`Only ${gapCategories.size} gap categories found; expected at least 50.`);

const joined = proofText.join('\n').toLowerCase();
for (const term of [
  'sun glare',
  'muzzle flash handgun',
  'stylized blood splatter small',
  'micro bubble drift',
  'large vent bubble column',
  'transit tube straight',
  'transit tube emergency bulkhead',
  'rounded natural afro',
  'high top afro',
  'mature locs',
  'knotless box braids',
  'passion twists',
  'straight back cornrows',
]) {
  if (!joined.includes(term)) failures.push(`Required final-sweep concept is missing: ${term}.`);
}
for (const asset of hair) {
  const text = `${asset.description} ${asset.forbiddenShortcuts.join(' ')}`.toLowerCase();
  if (!text.includes('scalp-conforming root field')) failures.push(`${asset.id}: hairstyle lacks scalp-fit requirement.`);
  if (!text.includes('afros are not bunched spheres')) failures.push(`${asset.id}: hairstyle lacks afro primitive rejection rule.`);
  if (!text.includes('locs are not identical cylinders')) failures.push(`${asset.id}: hairstyle lacks loc primitive rejection rule.`);
  if (!text.includes('braids and twists show interwoven rhythm')) failures.push(`${asset.id}: hairstyle lacks braid/twist structure rule.`);
}
for (const asset of childSafe) {
  const text = `${asset.description} ${asset.functionalNotes.join(' ')}`.toLowerCase();
  if (!text.includes('non-graphic')) failures.push(`${asset.id}: injury/combat effect lacks non-graphic policy.`);
  if (!text.includes('paint') || !text.includes('spark') || !text.includes('dust')) failures.push(`${asset.id}: injury/combat effect lacks child-safe alternatives.`);
}

if (failures.length) {
  console.error(`[gameplay-gap-check] ${failures.length} validation failure(s)`);
  for (const failure of failures.slice(0, 300)) console.error(`- ${failure}`);
  if (failures.length > 300) console.error(`- ...and ${failures.length - 300} additional failures`);
  process.exit(1);
}
console.log(`[gameplay-gap-check] PASS: ${assets.length} final-sweep assets; expanded master=${master.assets.length}; canonical=${canonical}; reference-only=${referenceOnly}.`);
console.log(`[gameplay-gap-check] kinds: ${Object.entries(kinds).map(([kind, count]) => `${kind}=${count}`).join(', ')}`);
console.log(`[gameplay-gap-check] towns: ${Object.entries(towns).map(([town, count]) => `${town}=${count}`).join(', ')}`);
