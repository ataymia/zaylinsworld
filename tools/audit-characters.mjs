#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const INDEX_PATH = join(ROOT, 'public/assets/models/asset-index-v2.json');
const JSON_OUT = join(ROOT, 'docs/character-asset-audit.json');
const MD_OUT = join(ROOT, 'docs/CHARACTER_ASSET_AUDIT.md');
const CHECK = process.argv.includes('--check');
const MIN_USABLE_CLIP_SECONDS = 0.2;
const MIN_USABLE_CLIP_KEYS = 3;

function parseGlbJson(buffer) {
  if (buffer.length < 20 || buffer.readUInt32LE(0) !== 0x46546c67) {
    throw new Error('not a valid binary glTF header');
  }
  const version = buffer.readUInt32LE(4);
  if (version !== 2) throw new Error(`unsupported GLB version ${version}`);

  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32LE(offset);
    const type = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    const end = start + length;
    if (end > buffer.length) throw new Error('truncated GLB chunk');
    if (type === 0x4e4f534a) {
      const text = buffer.subarray(start, end).toString('utf8').replace(/\0+$/g, '').trim();
      return JSON.parse(text);
    }
    offset = end;
  }
  throw new Error('GLB JSON chunk not found');
}

function readGltf(path) {
  const ext = extname(path).toLowerCase();
  if (ext === '.glb') return parseGlbJson(readFileSync(path));
  if (ext === '.gltf') return JSON.parse(readFileSync(path, 'utf8'));
  throw new Error(`unsupported character format ${ext || '(none)'}`);
}

function positionBounds(gltf) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let accessorsWithBounds = 0;

  for (const mesh of gltf.meshes || []) {
    for (const primitive of mesh.primitives || []) {
      const accessorIndex = primitive.attributes?.POSITION;
      const accessor = Number.isInteger(accessorIndex) ? gltf.accessors?.[accessorIndex] : null;
      if (!accessor || !Array.isArray(accessor.min) || !Array.isArray(accessor.max)) continue;
      if (accessor.min.length < 3 || accessor.max.length < 3) continue;
      accessorsWithBounds++;
      for (let axis = 0; axis < 3; axis++) {
        min[axis] = Math.min(min[axis], Number(accessor.min[axis]));
        max[axis] = Math.max(max[axis], Number(accessor.max[axis]));
      }
    }
  }

  if (!accessorsWithBounds || ![...min, ...max].every(Number.isFinite)) {
    return { known: false, accessorsWithBounds };
  }

  const size = max.map((value, axis) => value - min[axis]);
  return {
    known: true,
    accessorsWithBounds,
    min,
    max,
    size,
    largest: Math.max(...size),
    smallest: Math.min(...size),
  };
}

function animationDetails(gltf) {
  return (gltf.animations || []).map((animation, animationIndex) => {
    let duration = 0;
    let maxKeys = 0;
    let totalKeys = 0;
    const inputAccessors = new Set();

    for (const sampler of animation.samplers || []) {
      if (!Number.isInteger(sampler.input)) continue;
      inputAccessors.add(sampler.input);
    }

    for (const accessorIndex of inputAccessors) {
      const accessor = gltf.accessors?.[accessorIndex];
      if (!accessor) continue;
      const count = Number(accessor.count || 0);
      maxKeys = Math.max(maxKeys, count);
      totalKeys += count;
      const start = Number(accessor.min?.[0] ?? 0);
      const end = Number(accessor.max?.[0] ?? start);
      if (Number.isFinite(start) && Number.isFinite(end)) duration = Math.max(duration, end - start);
    }

    const useful = duration >= MIN_USABLE_CLIP_SECONDS && maxKeys >= MIN_USABLE_CLIP_KEYS;
    return {
      name: animation.name || `animation-${animationIndex}`,
      channels: animation.channels?.length || 0,
      samplers: animation.samplers?.length || 0,
      duration,
      maxKeys,
      totalKeys,
      useful,
    };
  });
}

function classify(meta) {
  if (meta.error) return 'reject-bad-bounds';
  if (meta.meshes === 0) return 'reject-bad-bounds';
  if (meta.bounds.known && (meta.bounds.largest > 10000 || meta.bounds.largest < 0.001)) {
    return 'reject-bad-bounds';
  }
  if (meta.skins > 0 && meta.usableAnimations > 0) return 'rigged-with-clips';
  // A skin with only a one-frame or two-key pose is renderable, but it does not
  // have a usable idle/walk/run clip. Treat it exactly like a skin with no clips.
  if (meta.skins > 0) return 'valid-skin-no-clips';
  if (meta.animations > 0) return 'needs-retarget';
  return 'static-prop-only';
}

function guessRole(name, pack) {
  const value = `${pack} ${name}`.toLowerCase();
  if (value.includes('police')) return 'police';
  if (value.includes('firefighter')) return 'firefighter';
  if (value.includes('doctor')) return 'doctor';
  if (value.includes('monster') || value.includes('spooky') || value.includes('creature')) return 'monster';
  if (value.includes('female')) return 'civilian-female';
  return 'civilian';
}

function auditEntry(pack, entry) {
  // Asset-index paths are relative to /public/assets, matching assets.js.
  const absolute = join(ROOT, 'public', 'assets', entry.path);
  const base = {
    pack,
    name: entry.name,
    path: entry.path,
    type: entry.type || extname(entry.path).slice(1),
    textureFiles: Number(entry.tex || 0),
    roleGuess: guessRole(entry.name, pack),
    exists: existsSync(absolute),
  };

  if (!base.exists) {
    return {
      ...base,
      meshes: 0,
      nodes: 0,
      skins: 0,
      skinnedNodes: 0,
      animations: 0,
      usableAnimations: 0,
      poseOnlyAnimations: 0,
      animationDetails: [],
      clipNames: [],
      materials: 0,
      textures: 0,
      images: 0,
      bounds: { known: false },
      error: 'indexed file missing',
      classification: 'reject-bad-bounds',
    };
  }

  try {
    const gltf = readGltf(absolute);
    const nodes = gltf.nodes || [];
    const details = animationDetails(gltf);
    const meta = {
      ...base,
      meshes: gltf.meshes?.length || 0,
      nodes: nodes.length,
      skins: gltf.skins?.length || 0,
      skinnedNodes: nodes.filter((node) => Number.isInteger(node.skin)).length,
      animations: details.length,
      usableAnimations: details.filter((clip) => clip.useful).length,
      poseOnlyAnimations: details.filter((clip) => !clip.useful).length,
      animationDetails: details,
      clipNames: details.map((clip) => clip.name),
      materials: gltf.materials?.length || 0,
      textures: gltf.textures?.length || 0,
      images: gltf.images?.length || 0,
      bounds: positionBounds(gltf),
      generator: gltf.asset?.generator || '',
      version: gltf.asset?.version || '',
      error: '',
    };
    return { ...meta, classification: classify(meta) };
  } catch (error) {
    const meta = {
      ...base,
      meshes: 0,
      nodes: 0,
      skins: 0,
      skinnedNodes: 0,
      animations: 0,
      usableAnimations: 0,
      poseOnlyAnimations: 0,
      animationDetails: [],
      clipNames: [],
      materials: 0,
      textures: 0,
      images: 0,
      bounds: { known: false },
      error: error.message,
    };
    return { ...meta, classification: classify(meta) };
  }
}

function countBy(items, key) {
  const counts = {};
  for (const item of items) counts[item[key]] = (counts[item[key]] || 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function formatBounds(bounds) {
  if (!bounds?.known) return 'unknown';
  return bounds.size.map((value) => Number(value).toFixed(2)).join(' × ');
}

function formatClips(item) {
  if (!item.animationDetails.length) return '';
  return item.animationDetails.map((clip) => {
    const status = clip.useful ? 'usable' : 'pose-only';
    return `${clip.name}: ${clip.duration.toFixed(3)}s, ${clip.maxKeys} max keys (${status})`;
  }).join('; ');
}

function markdown(report) {
  const lines = [
    '# Character Asset Audit',
    '',
    'Generated by `npm run audit:characters`. The audit reads glTF metadata directly from every indexed character file. It distinguishes real motion clips from tiny pose tracks by checking clip duration and key counts.',
    '',
    `A clip is considered usable when it is at least **${MIN_USABLE_CLIP_SECONDS}s** long and has at least **${MIN_USABLE_CLIP_KEYS}** keys on an input timeline. This is a conservative structural check, not a visual animation review.`,
    '',
    '## Summary',
    '',
    `- Total indexed character assets: **${report.summary.total}**`,
    `- Missing or unreadable: **${report.summary.errors}**`,
    `- Files with skins: **${report.summary.withSkins}**`,
    `- Files with any animation blocks: **${report.summary.withAnimations}**`,
    `- Files with structurally usable animation clips: **${report.summary.withUsableAnimations}**`,
    `- Files containing only pose/tiny tracks: **${report.summary.withPoseOnlyAnimations}**`,
    '',
    '| Classification | Count | Meaning |',
    '|---|---:|---|',
  ];

  const meanings = {
    'rigged-with-clips': 'Has a skin and at least one structurally usable motion clip.',
    'valid-skin-no-clips': 'Has a skin but no usable clips. It may include a one-frame/tiny pose track.',
    'needs-retarget': 'Has animation data without a usable skin; requires skeleton/retarget review.',
    'static-prop-only': 'Mesh only; suitable for static display or reference, not a moving character.',
    'reject-bad-bounds': 'Missing, unreadable, empty, or extreme bounds; never hide the procedural fallback for it.',
  };

  for (const [name, count] of Object.entries(report.summary.byClassification)) {
    lines.push(`| \`${name}\` | ${count} | ${meanings[name] || ''} |`);
  }

  lines.push('', '## Role pools', '', '| Guessed role | Count |', '|---|---:|');
  for (const [role, count] of Object.entries(report.summary.byRole)) lines.push(`| ${role} | ${count} |`);

  lines.push(
    '',
    '## Full inventory',
    '',
    '| Pack | Asset | Role guess | Classification | Meshes | Skins | Usable/All clips | Bounds | Textures | Animation notes |',
    '|---|---|---|---|---:|---:|---:|---|---:|---|',
  );

  for (const item of report.assets) {
    const notes = item.error || formatClips(item);
    lines.push(
      `| ${item.pack} | \`${item.name}\` | ${item.roleGuess} | \`${item.classification}\` | ${item.meshes} | ${item.skins} | ${item.usableAnimations}/${item.animations} | ${formatBounds(item.bounds)} | ${item.textures || item.textureFiles || 0} | ${String(notes).replaceAll('|', '\\|')} |`,
    );
  }

  lines.push(
    '',
    '## Runtime policy derived from this audit',
    '',
    '- Player candidates retain the procedural creator fallback until modular body/clothing support is complete.',
    '- Civilians and police may use approved full-body GLBs, capped and streamed after the city becomes playable.',
    '- A pose-only GLB can replace appearance, but it must use procedural motion or a retargeted locomotion library.',
    '- `static-prop-only` assets must never replace a moving avatar.',
    '- `reject-bad-bounds` assets remain indexed for investigation but are excluded from live role pools.',
    '',
  );

  return lines.join('\n');
}

function buildReport() {
  if (!existsSync(INDEX_PATH)) throw new Error(`Missing asset index: ${INDEX_PATH}`);
  const index = JSON.parse(readFileSync(INDEX_PATH, 'utf8'));
  const assets = [];

  for (const [pack, entries] of Object.entries(index.characters || {})) {
    for (const entry of entries || []) assets.push(auditEntry(pack, entry));
  }

  assets.sort((a, b) => a.pack.localeCompare(b.pack) || a.name.localeCompare(b.name));
  return {
    schemaVersion: 2,
    generatedBy: 'tools/audit-characters.mjs',
    thresholds: {
      minUsableClipSeconds: MIN_USABLE_CLIP_SECONDS,
      minUsableClipKeys: MIN_USABLE_CLIP_KEYS,
    },
    summary: {
      total: assets.length,
      errors: assets.filter((item) => item.error).length,
      withSkins: assets.filter((item) => item.skins > 0).length,
      withAnimations: assets.filter((item) => item.animations > 0).length,
      withUsableAnimations: assets.filter((item) => item.usableAnimations > 0).length,
      withPoseOnlyAnimations: assets.filter((item) => item.animations > 0 && item.usableAnimations === 0).length,
      byClassification: countBy(assets, 'classification'),
      byPack: countBy(assets, 'pack'),
      byRole: countBy(assets, 'roleGuess'),
    },
    assets,
  };
}

function writeOrCheck(path, content) {
  if (!CHECK) {
    writeFileSync(path, content);
    return;
  }
  if (!existsSync(path) || readFileSync(path, 'utf8') !== content) {
    throw new Error(`${path.replace(`${ROOT}/`, '')} is stale; run npm run audit:characters`);
  }
}

const report = buildReport();
const json = `${JSON.stringify(report, null, 2)}\n`;
const md = `${markdown(report)}\n`;
writeOrCheck(JSON_OUT, json);
writeOrCheck(MD_OUT, md);

console.log('Character asset audit');
console.log(JSON.stringify(report.summary, null, 2));
console.log(CHECK ? 'Generated audit files are current.' : 'Wrote docs/CHARACTER_ASSET_AUDIT.md and docs/character-asset-audit.json.');
