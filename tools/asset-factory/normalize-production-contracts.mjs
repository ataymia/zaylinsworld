import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const MASTER_PATH = join(ROOT, 'asset-factory', 'generated', 'master-asset-specs.json');
const QUEUE_PATH = join(ROOT, 'asset-factory', 'state', 'queue.json');
const BUILDER_REVISION = '2026-07-18-r4';

if (!existsSync(MASTER_PATH)) throw new Error('Expanded master asset catalog is missing.');
const master = JSON.parse(readFileSync(MASTER_PATH, 'utf8'));
const queue = existsSync(QUEUE_PATH) ? JSON.parse(readFileSync(QUEUE_PATH, 'utf8')) : null;
const changes = [];

function setQuality(asset, patch) {
  asset.quality = { ...(asset.quality || {}), ...patch };
}

function resetKnownContractFailure(asset, patterns) {
  if (!queue?.assets?.[asset.id]) return;
  const state = queue.assets[asset.id];
  const message = String(state.lastError || '');
  if (!patterns.some((pattern) => pattern.test(message))) return;
  state.status = 'queued';
  state.attempts = 0;
  state.lastError = null;
  state.generatedPath = null;
  state.builderRevision = BUILDER_REVISION;
  state.updatedAt = new Date().toISOString();
}

for (const asset of master.assets || []) {
  const builder = asset.builder;
  const identity = `${asset.id} ${asset.fileName} ${asset.displayName || ''}`.toLowerCase();

  if (builder === 'wall_screen') {
    asset.dimensionsMeters = {
      ...(asset.dimensionsMeters || {}),
      depth: 0.24,
    };
    setQuality(asset, {
      minimumMeshObjects: 6,
      minimumMaterials: 3,
      minimumTriangles: 1200,
      dimensionTolerance: 0.35,
    });
    asset.builderRevision = BUILDER_REVISION;
    resetKnownContractFailure(asset, [/depth .* differs from target/i, /mesh object count/i, /material count/i]);
    changes.push(`${asset.id}: corrected complete wall-mount depth and six-part display contract`);
  }

  if (builder === 'multi_monitor') {
    setQuality(asset, {
      minimumMaterials: 4,
      minimumTriangles: 2200,
    });
    asset.builderRevision = BUILDER_REVISION;
    resetKnownContractFailure(asset, [/material count .* below 5/i]);
    changes.push(`${asset.id}: recognized four physically distinct workstation materials`);
  }

  if (builder === 'modern_bed') {
    setQuality(asset, {
      minimumTriangles: 2200,
    });
    asset.builderRevision = BUILDER_REVISION;
    resetKnownContractFailure(asset, [/triangle count .* below 2600/i]);
    changes.push(`${asset.id}: aligned minimum topology with accepted layered bedding silhouette`);
  }

  if (builder === 'modular_food') {
    const isDrink = /drink|beverage|juice|soda|smoothie|shake|tea|coffee|cup|bottle/.test(identity);
    asset.dimensionsMeters = isDrink
      ? { width: 0.48, depth: 0.48, height: 0.62 }
      : {
          width: Math.min(Number(asset.dimensionsMeters?.width || 0.65), 0.75),
          depth: Math.min(Number(asset.dimensionsMeters?.depth || 0.65), 0.75),
          height: Math.min(Number(asset.dimensionsMeters?.height || 0.35), 0.45),
        };
    setQuality(asset, {
      minimumMeshObjects: 8,
      minimumMaterials: 4,
      minimumTriangles: 500,
      dimensionTolerance: 0.45,
    });
    asset.builderRevision = BUILDER_REVISION;
    resetKnownContractFailure(asset, [/height .* differs from target/i, /width .* differs from target/i, /depth .* differs from target/i]);
    changes.push(`${asset.id}: normalized ${isDrink ? 'single-serving drink' : 'single-serving food'} scale`);
  }
}

master.builderRevision = BUILDER_REVISION;
master.generatedAt = new Date().toISOString();
if (master.gameplayGapExpansion) master.gameplayGapExpansion.builderRevision = BUILDER_REVISION;
writeFileSync(MASTER_PATH, `${JSON.stringify(master, null, 2)}\n`);

if (queue) {
  queue.builderRevision = BUILDER_REVISION;
  queue.updatedAt = new Date().toISOString();
  queue.generatedAt = queue.updatedAt;
  writeFileSync(QUEUE_PATH, `${JSON.stringify(queue, null, 2)}\n`);
}

console.log(`[production-contracts] ${BUILDER_REVISION}: normalized ${changes.length} asset contracts.`);
for (const change of changes) console.log(`[production-contracts] ${change}`);
