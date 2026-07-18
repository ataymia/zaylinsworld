import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const MASTER_PATH = join(ROOT, 'asset-factory', 'generated', 'master-asset-specs.json');
const QUEUE_PATH = join(ROOT, 'asset-factory', 'state', 'queue.json');
const BUILDER_REVISION = '2026-07-18-r3';

const REPAIRED_FAMILIES = new Set([
  'charging_pad', 'fuel_pump', 'digital_kiosk', 'office_desk', 'mailbox',
  'road_sign', 'road-sign', 'municipal_trash_can', 'municipal_bench',
  'streetlight', 'hover_vehicle',
]);

function selectBuilder(asset) {
  if (asset.generationEligible === false) return null;
  if (asset.builderStatus === 'runtime') return null;
  if (asset.assetKind === 'connector') return ['modular_connector', 'modular_connector'];
  if (asset.assetKind === 'infrastructure') return ['modular_infrastructure', 'modular_infrastructure'];
  if (asset.assetKind === 'furniture') return ['modular_furniture', 'modular_furniture'];
  if (asset.assetKind === 'prop') return ['modular_prop', 'modular_prop'];
  if (asset.assetKind === 'state-variant') return ['state_variant', 'state_variant'];
  if (asset.assetKind === 'hair' || asset.assetKind === 'creature') return null;
  if (asset.family === 'unsupported_character' || asset.family === 'unsupported_hair') return null;
  if (asset.builder) return [asset.family, asset.builder];

  const name = `${asset.fileName || ''} ${asset.id || ''}`.toLowerCase();
  if (asset.family === 'building_shell' || /^(building_|arch_)/.test(name)) return ['building_shell', 'modular_building'];
  if (asset.family === 'road_module' || /^(road_|sidewalk_|crosswalk_)/.test(name)) return ['road_module', 'modular_road'];
  if (/^food_/.test(name)) return ['modular_food', 'modular_food'];
  if (/^(furniture_|chair_|classroom_|interior_)/.test(name)) return ['modular_furniture', 'modular_furniture'];
  if (/streetlight|hydrant|utility|bollard|guardrail|drain|shelter|charging|fuel|terminal|kiosk|generator|transformer|antenna|vent|pipe|valve|gate|fence|railing|crane|winch|pump|service|equipment|machine|conveyor|dumpster|trash|mailbox/.test(name)) {
    return ['modular_infrastructure', 'modular_infrastructure'];
  }
  return ['modular_prop', 'modular_prop'];
}

function qualityFor(builder, current = {}) {
  const profiles = {
    modular_building: { minimumMeshObjects: 18, minimumTriangles: 2500, maximumTriangles: 50000, minimumMaterials: 5, dimensionTolerance: 0.45 },
    modular_road: { minimumMeshObjects: 5, minimumTriangles: 300, maximumTriangles: 10000, minimumMaterials: 3, dimensionTolerance: 0.35 },
    modular_connector: { minimumMeshObjects: 10, minimumTriangles: 900, maximumTriangles: 30000, minimumMaterials: 4, dimensionTolerance: 0.50 },
    modular_infrastructure: { minimumMeshObjects: 10, minimumTriangles: 700, maximumTriangles: 30000, minimumMaterials: 4, dimensionTolerance: 0.50 },
    modular_furniture: { minimumMeshObjects: 10, minimumTriangles: 700, maximumTriangles: 30000, minimumMaterials: 4, dimensionTolerance: 0.50 },
    modular_food: { minimumMeshObjects: 8, minimumTriangles: 500, maximumTriangles: 24000, minimumMaterials: 4, dimensionTolerance: 0.60 },
    modular_prop: { minimumMeshObjects: 8, minimumTriangles: 500, maximumTriangles: 30000, minimumMaterials: 4, dimensionTolerance: 0.60 },
    state_variant: { minimumMeshObjects: 8, minimumTriangles: 500, maximumTriangles: 30000, minimumMaterials: 4, dimensionTolerance: 0.60 },
  };
  return { ...current, ...(profiles[builder] || {}), automaticRetryLimit: 2 };
}

const master = JSON.parse(readFileSync(MASTER_PATH, 'utf8'));
const queue = JSON.parse(readFileSync(QUEUE_PATH, 'utf8'));
const queueAssets = Array.isArray(queue.assets)
  ? Object.fromEntries(queue.assets.map((asset) => [asset.id, asset]))
  : (queue.assets || {});
let promoted = 0;
let requeued = 0;

for (const asset of master.assets) {
  const selected = selectBuilder(asset);
  const state = queueAssets[asset.id];
  if (!selected) {
    if (asset.builderStatus !== 'runtime' && asset.generationEligible !== false) {
      asset.builder = null;
      asset.builderStatus = 'unsupported';
      if (state && state.status !== 'completed') state.status = 'unsupported';
    }
    continue;
  }
  const [family, builder] = selected;
  if (asset.builder !== builder || asset.builderStatus !== 'supported') promoted += 1;
  asset.family = family;
  asset.builder = builder;
  asset.builderStatus = 'supported';
  asset.builderRevision = BUILDER_REVISION;
  asset.quality = qualityFor(builder, asset.quality || {});
  if (state) {
    state.family = family;
    state.builder = builder;
    state.builderStatus = 'supported';
    state.builderRevision = BUILDER_REVISION;
    const repaired = REPAIRED_FAMILIES.has(family) || REPAIRED_FAMILIES.has(asset.family) || builder.startsWith('modular_') || builder === 'state_variant';
    if (state.status !== 'completed' && repaired && ['unsupported', 'quarantined', 'failed', undefined, null].includes(state.status)) {
      state.status = 'queued';
      state.attempts = 0;
      state.lastError = null;
      state.lastReport = null;
      state.generatedPath = null;
      state.updatedAt = new Date().toISOString();
      state.requeuedByBuilderRevision = BUILDER_REVISION;
      requeued += 1;
    }
  }
}

const statuses = {};
for (const state of Object.values(queueAssets)) statuses[state.status] = (statuses[state.status] || 0) + 1;
master.generatedAt = new Date().toISOString();
master.builderRevision = BUILDER_REVISION;
master.counts = {
  ...(master.counts || {}),
  total: master.assets.length,
  supported: master.assets.filter((asset) => asset.builderStatus === 'supported').length,
  runtime: master.assets.filter((asset) => asset.builderStatus === 'runtime').length,
  unsupported: master.assets.filter((asset) => asset.builderStatus === 'unsupported').length,
};
queue.version = Math.max(queue.version || 1, 3);
queue.generatedAt = master.generatedAt;
queue.updatedAt = master.generatedAt;
queue.assets = queueAssets;
queue.counts = {
  total: Object.keys(queueAssets).length,
  completed: statuses.completed || 0,
  queued: statuses.queued || 0,
  queuedRuntime: statuses['queued-runtime'] || 0,
  unsupported: statuses.unsupported || 0,
  quarantined: statuses.quarantined || 0,
  referenceOnly: statuses['reference-only'] || 0,
};
writeFileSync(MASTER_PATH, `${JSON.stringify(master, null, 2)}\n`);
writeFileSync(QUEUE_PATH, `${JSON.stringify(queue, null, 2)}\n`);
console.log(`[builder-promotion] revision=${BUILDER_REVISION}; promoted=${promoted}; requeued=${requeued}.`);
console.log(`[builder-promotion] supported=${master.counts.supported}; runtime=${master.counts.runtime}; unsupported=${master.counts.unsupported}.`);
console.log(`[builder-promotion] queue=${JSON.stringify(statuses)}.`);
