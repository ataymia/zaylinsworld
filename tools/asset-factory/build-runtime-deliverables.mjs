import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';

const ROOT = process.cwd();
const MASTER_PATH = join(ROOT, 'asset-factory', 'generated', 'master-asset-specs.json');
const QUEUE_PATH = join(ROOT, 'asset-factory', 'state', 'queue.json');
const RUNTIME_ROOT = join(ROOT, 'public', 'assets', 'runtime', 'generated');
const DECAL_ROOT = join(ROOT, 'public', 'assets', 'decals', 'generated');
const INDEX_PATH = join(RUNTIME_ROOT, 'runtime-asset-index.json');
const RUNTIME_KINDS = new Set(['runtime-vfx', 'decal', 'shader', 'audio-visual', 'helper']);

function hashBytes(value) {
  return createHash('sha256').update(value).digest();
}
function seeded(asset, offset, min, max) {
  const bytes = hashBytes(asset.id);
  return min + (bytes[offset % bytes.length] / 255) * (max - min);
}
function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function writeText(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}
function queueObject(queue) {
  if (Array.isArray(queue.assets)) return Object.fromEntries(queue.assets.map((item) => [item.id, item]));
  return queue.assets || {};
}
function palette(asset) {
  const h = hashBytes(asset.id);
  const hue = Math.round((h[0] / 255) * 360);
  const accent = `hsl(${hue} 72% 58%)`;
  const secondary = `hsl(${(hue + 38) % 360} 64% 45%)`;
  const dark = `hsl(${hue} 30% 15%)`;
  return { hue, accent, secondary, dark };
}
function baseMetadata(asset) {
  return {
    format: 'zta-runtime-asset',
    version: 1,
    id: asset.id,
    displayName: asset.displayName,
    town: asset.town,
    assetKind: asset.assetKind,
    family: asset.family,
    sourceDoc: asset.sourceDoc,
    description: asset.description,
    designIntent: asset.designIntent,
    requiredComponents: asset.requiredComponents,
    materials: asset.materials,
    lifecycle: {
      spawnPolicy: 'event-or-volume-driven',
      pooling: true,
      deterministicSeed: asset.id,
      cleanup: 'return-to-pool-after-envelope-and-linger',
      networkPolicy: 'replicate-trigger-and-seed-not-individual-particles',
    },
    accessibility: {
      reducedMotion: true,
      reducedFlash: true,
      reducedParticles: true,
      highContrastFallback: true,
      colorIndependentCue: true,
      nonGraphicInjuryDefault: true,
    },
    qualityTiers: {
      low: { densityScale: 0.35, updateRate: 30, shadowing: false },
      medium: { densityScale: 0.65, updateRate: 45, shadowing: false },
      high: { densityScale: 1, updateRate: 60, shadowing: asset.assetKind === 'shader' },
    },
  };
}
function vfxPayload(asset) {
  const color = palette(asset);
  const duration = Number(seeded(asset, 1, 0.18, 4.5).toFixed(3));
  const rate = Math.round(seeded(asset, 2, 6, 84));
  return {
    ...baseMetadata(asset),
    engine: 'threejs-instanced-particle-system',
    emitter: {
      shape: ['point', 'disc', 'box', 'surface', 'volume'][hashBytes(asset.id)[3] % 5],
      localOrigin: [0, 0, 0],
      forward: [0, 0, 1],
      ratePerSecond: rate,
      burstCount: Math.max(1, Math.round(rate * seeded(asset, 4, 0.08, 0.35))),
      lifetimeSeconds: [Number((duration * 0.35).toFixed(3)), duration],
      velocityMetersPerSecond: [Number(seeded(asset, 5, 0.05, 0.8).toFixed(3)), Number(seeded(asset, 6, 1.2, 8).toFixed(3))],
      gravityScale: Number(seeded(asset, 7, -0.35, 1.15).toFixed(3)),
      drag: Number(seeded(asset, 8, 0.02, 0.65).toFixed(3)),
    },
    visualLayers: [
      { name: 'primary', blend: 'alpha', color: color.accent, scaleCurve: [0.15, 1, 0.25], opacityCurve: [0, 1, 0] },
      { name: 'breakup', blend: 'additive-or-alpha-by-profile', color: color.secondary, scaleCurve: [0.05, 0.55, 0.1], opacityCurve: [0, 0.7, 0] },
    ],
    surfaceResponse: { collision: true, decalsAllowed: true, normalAligned: /impact|splash|dust|spark/i.test(asset.displayName) },
    timing: { delaySeconds: 0, durationSeconds: duration, loop: /drift|ambient|column|rain|snow|fog|current/i.test(asset.displayName) },
  };
}
function shaderPayload(asset) {
  const color = palette(asset);
  return {
    ...baseMetadata(asset),
    engine: 'threejs-node-material-profile',
    parameters: {
      baseColor: color.accent,
      secondaryColor: color.secondary,
      roughness: Number(seeded(asset, 2, 0.08, 0.92).toFixed(3)),
      metalness: Number(seeded(asset, 3, 0, 0.85).toFixed(3)),
      transmission: Number(seeded(asset, 4, 0, 0.72).toFixed(3)),
      normalStrength: Number(seeded(asset, 5, 0.1, 1.5).toFixed(3)),
      fresnelPower: Number(seeded(asset, 6, 1.2, 6).toFixed(3)),
      emissionStrength: Number(seeded(asset, 7, 0, 2.4).toFixed(3)),
    },
    inputs: ['worldNormal', 'viewDirection', 'time', 'weatherWetness', 'damageState', 'qualityTier'],
    fallback: { material: 'MeshStandardMaterial', color: color.accent, roughness: 0.55, metalness: 0.05 },
  };
}
function audioVisualPayload(asset) {
  const color = palette(asset);
  return {
    ...baseMetadata(asset),
    engine: 'zta-audio-visual-cue',
    trigger: slug(asset.gapCategory || asset.displayName),
    audio: {
      eventId: `sfx.${slug(asset.town)}.${slug(asset.displayName)}`,
      spatial: true,
      attenuationMeters: [2, Math.round(seeded(asset, 3, 18, 90))],
      maxVoices: Math.round(seeded(asset, 4, 2, 12)),
      occlusion: true,
    },
    visual: {
      color: color.accent,
      durationSeconds: Number(seeded(asset, 5, 0.15, 2.5).toFixed(3)),
      flashHz: Math.min(3, Number(seeded(asset, 6, 0, 3).toFixed(2))),
      iconFallback: true,
    },
    synchronization: { authority: 'event-timestamp', toleranceMilliseconds: 50 },
  };
}
function helperPayload(asset) {
  return {
    ...baseMetadata(asset),
    engine: 'zta-runtime-helper',
    contract: {
      inputs: ['worldPosition', 'worldNormal', 'cameraDistance', 'qualityTier', 'accessibilitySettings', 'networkSeed'],
      outputs: ['spawnDecision', 'intensity', 'orientation', 'cleanupToken', 'debugGeometry'],
      validation: ['finite-vectors', 'bounded-intensity', 'deterministic-seed', 'pool-return', 'editor-preview'],
    },
    editor: { visibleByDefault: false, gizmo: 'wireframe-volume', label: asset.displayName },
    failureFallback: 'disable-helper-and-log-once-without-blocking-gameplay',
  };
}
function decalSvg(asset) {
  const color = palette(asset);
  const h = hashBytes(asset.id);
  const points = [];
  const count = 12;
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count;
    const jitter = 0.72 + (h[(index + 2) % h.length] / 255) * 0.28;
    const radius = 42 * jitter;
    points.push(`${(50 + Math.cos(angle) * radius).toFixed(2)},${(50 + Math.sin(angle) * radius).toFixed(2)}`);
  }
  const safeTitle = String(asset.displayName).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="${safeTitle}">
  <title>${safeTitle}</title>
  <defs>
    <radialGradient id="fade" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${color.accent}" stop-opacity="0.92"/>
      <stop offset="62%" stop-color="${color.secondary}" stop-opacity="0.72"/>
      <stop offset="100%" stop-color="${color.dark}" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="0.7"/></filter>
  </defs>
  <polygon points="${points.join(' ')}" fill="url(#fade)"/>
  <polygon points="${points.filter((_, i) => i % 2 === 0).join(' ')}" fill="none" stroke="${color.accent}" stroke-opacity="0.45" stroke-width="1.2" filter="url(#soft)"/>
</svg>\n`;
}

const master = JSON.parse(readFileSync(MASTER_PATH, 'utf8'));
const queue = JSON.parse(readFileSync(QUEUE_PATH, 'utf8'));
const queueAssets = queueObject(queue);
const index = {
  format: 'zta-runtime-asset-index',
  version: 1,
  generatedAt: new Date().toISOString(),
  assets: [],
};
let generated = 0;
let skipped = 0;
for (const asset of master.assets.filter((item) => RUNTIME_KINDS.has(item.assetKind))) {
  const declared = asset.declaredDeliverableFile || asset.fileName;
  const desiredExt = asset.assetKind === 'decal' ? '.svg' : '.json';
  const baseName = declared.replace(/\.[^.]+$/, desiredExt);
  const outputPath = asset.assetKind === 'decal'
    ? join(DECAL_ROOT, slug(asset.town), baseName)
    : join(RUNTIME_ROOT, slug(asset.assetKind), slug(asset.town), baseName);
  let content;
  if (asset.assetKind === 'decal') content = decalSvg(asset);
  else if (asset.assetKind === 'runtime-vfx') content = `${JSON.stringify(vfxPayload(asset), null, 2)}\n`;
  else if (asset.assetKind === 'shader') content = `${JSON.stringify(shaderPayload(asset), null, 2)}\n`;
  else if (asset.assetKind === 'audio-visual') content = `${JSON.stringify(audioVisualPayload(asset), null, 2)}\n`;
  else content = `${JSON.stringify(helperPayload(asset), null, 2)}\n`;
  writeText(outputPath, content);
  const rel = relative(ROOT, outputPath).replaceAll('\\', '/');
  index.assets.push({ id: asset.id, assetKind: asset.assetKind, town: asset.town, path: rel, bytes: Buffer.byteLength(content), sha256: createHash('sha256').update(content).digest('hex') });
  const state = queueAssets[asset.id];
  if (state) {
    state.status = 'completed';
    state.runtimeGenerated = true;
    state.generatedPath = rel;
    state.output = rel;
    state.lastError = null;
    state.updatedAt = index.generatedAt;
    generated += 1;
  } else skipped += 1;
}
index.assets.sort((a, b) => a.id.localeCompare(b.id));
writeText(INDEX_PATH, `${JSON.stringify(index, null, 2)}\n`);
const statuses = {};
for (const state of Object.values(queueAssets)) statuses[state.status] = (statuses[state.status] || 0) + 1;
queue.assets = queueAssets;
queue.updatedAt = index.generatedAt;
queue.generatedAt = index.generatedAt;
queue.counts = {
  total: Object.keys(queueAssets).length,
  completed: statuses.completed || 0,
  queued: statuses.queued || 0,
  queuedRuntime: statuses['queued-runtime'] || 0,
  unsupported: statuses.unsupported || 0,
  quarantined: statuses.quarantined || 0,
  referenceOnly: statuses['reference-only'] || 0,
};
writeFileSync(QUEUE_PATH, `${JSON.stringify(queue, null, 2)}\n`);
console.log(`[runtime-assets] generated=${generated}; skipped-without-queue=${skipped}; index=${relative(ROOT, INDEX_PATH)}.`);
console.log(`[runtime-assets] queue=${JSON.stringify(statuses)}.`);
