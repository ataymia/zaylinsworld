#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  access,
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const WORK = path.join(ROOT, '.player-avatar-work');
const PUBLIC_ROOT = path.join(ROOT, 'public/assets/models/characters/player');
const MODEL_OUT = path.join(PUBLIC_ROOT, 'sunbox-male-free.glb');
const PACK_OUT = path.join(PUBLIC_ROOT, 'sunbox-male-free');
const TEXTURES_WORK = path.join(WORK, 'textures-runtime');
const TEXTURE_LIBRARY = path.join(PACK_OUT, 'texture-library.json');
const TEXTURE_MANIFEST = path.join(PACK_OUT, 'texture-manifest.json');
const RUNTIME_MANIFEST = path.join(PUBLIC_ROOT, 'sunbox-male-free.runtime.json');
const REPORT = path.join(ROOT, 'reports/modular-player-build.md');
const IGNORE_DIRS = new Set(['.git', 'node_modules', 'dist', 'public', '.player-avatar-work']);

const args = process.argv.slice(2);
function argValue(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

function run(command, commandArgs, options = {}) {
  console.log(`\n[player-avatar] $ ${command} ${commandArgs.map((value) => JSON.stringify(value)).join(' ')}`);
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd || ROOT,
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    encoding: 'utf8',
    env: { ...process.env, ...(options.env || {}) },
  });
  if (result.status !== 0) {
    const detail = options.capture ? `\n${result.stdout || ''}\n${result.stderr || ''}` : '';
    throw new Error(`${command} exited with ${result.status}${detail}`);
  }
  return result;
}

async function exists(file) {
  try { await access(file); return true; }
  catch { return false; }
}

async function walk(directory, output = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(full, output);
    else output.push(full);
  }
  return output;
}

async function discoverInputs() {
  const explicitBlend = argValue('--blend');
  const explicitTextures = argValue('--textures');
  const all = (explicitBlend && explicitTextures) ? [] : await walk(ROOT);
  const blendCandidates = explicitBlend ? [path.resolve(explicitBlend)] : all.filter((file) => {
    const base = path.basename(file).toLowerCase();
    return base.endsWith('.blend') && base.includes('male_avatar_character_free');
  });
  const textureCandidates = explicitTextures ? [path.resolve(explicitTextures)] : all.filter((file) => {
    const base = path.basename(file).toLowerCase();
    return base.endsWith('.zip') && base.includes('textures');
  });
  if (blendCandidates.length !== 1 || textureCandidates.length !== 1) {
    throw new Error(
      `Expected exactly one ignored male avatar .blend and one texture .zip. Found blends=${blendCandidates.length}, textures=${textureCandidates.length}. ` +
      'Pass --blend <path> --textures <path> when filenames are ambiguous.',
    );
  }
  return { blend: blendCandidates[0], textures: textureCandidates[0] };
}

function readGlbJson(buffer) {
  if (buffer.length < 20 || buffer.toString('ascii', 0, 4) !== 'glTF') throw new Error('Output is not a GLB file');
  const version = buffer.readUInt32LE(4);
  if (version !== 2) throw new Error(`Expected GLB v2, got ${version}`);
  const jsonLength = buffer.readUInt32LE(12);
  const jsonType = buffer.readUInt32LE(16);
  if (jsonType !== 0x4E4F534A) throw new Error('First GLB chunk is not JSON');
  return JSON.parse(buffer.toString('utf8', 20, 20 + jsonLength).trim());
}

async function validateModel(file) {
  const buffer = await readFile(file);
  const json = readGlbJson(buffer);
  const nodeNames = new Set((json.nodes || []).map((node) => node.name).filter(Boolean));
  const required = [
    'ZW_Player_Body', 'ZW_Top_TShirt', 'ZW_Top_Hoodie', 'ZW_Bottom_Jeans',
    'ZW_Bottom_CargoShorts', 'ZW_Shoes_Basketball', 'ZW_Shoes_FlipFlops',
    'ZW_Hair_CrewCut', 'ZW_Hair_CloseCrop', 'ZW_FacialHair_Beard',
    'ZW_FacialHair_Goatee', 'ZW_Hat_Beanie', 'ZW_Hat_BaseballCap',
    'ZW_Glasses_Pilot', 'ZW_Glasses_Square', 'ZW_Anchor_RightHand',
  ];
  const missing = required.filter((name) => !nodeNames.has(name));
  if (missing.length) throw new Error(`Runtime GLB lost modular nodes: ${missing.join(', ')}`);
  if (!(json.extensionsUsed || []).includes('EXT_meshopt_compression')) {
    throw new Error('Runtime GLB is missing EXT_meshopt_compression');
  }
  if (buffer.length > 5 * 1024 * 1024) throw new Error(`Runtime GLB is unexpectedly large: ${buffer.length}`);
  return {
    bytes: buffer.length,
    sha256: createHash('sha256').update(buffer).digest('hex'),
    nodes: (json.nodes || []).length,
    meshes: (json.meshes || []).length,
    materials: (json.materials || []).length,
    extensionsUsed: json.extensionsUsed || [],
  };
}

async function ensurePythonDependencies() {
  const probe = spawnSync('python3', ['-c', 'import bpy; from PIL import Image'], { stdio: 'ignore' });
  if (probe.status === 0) return;
  console.log('[player-avatar] Installing user-space Python conversion dependencies in the Codespace…');
  run('python3', ['-m', 'pip', 'install', '--user', '--disable-pip-version-check', 'bpy==5.1.2', 'Pillow>=10,<13']);
}

async function main() {
  const inputs = await discoverInputs();
  for (const file of Object.values(inputs)) {
    if (!await exists(file)) throw new Error(`Missing source file: ${file}`);
  }
  console.log('[player-avatar] source blend:', path.relative(ROOT, inputs.blend));
  console.log('[player-avatar] texture archive:', path.relative(ROOT, inputs.textures));
  console.log('[player-avatar] raw sources stay ignored and are never copied to public/.');

  await ensurePythonDependencies();
  await rm(WORK, { recursive: true, force: true });
  await mkdir(WORK, { recursive: true });
  await mkdir(PUBLIC_ROOT, { recursive: true });
  const extracted = path.join(WORK, 'textures-source');
  const rawGlb = path.join(WORK, 'sunbox-male-free.raw.glb');
  const optimizedGlb = path.join(WORK, 'sunbox-male-free.meshopt.glb');
  await mkdir(extracted, { recursive: true });

  run('python3', ['-m', 'zipfile', '-e', inputs.textures, extracted]);
  run('python3', [path.join(ROOT, 'tools/export-modular-player.py'), '--source', inputs.blend, '--output', rawGlb]);
  run('npx', ['--yes', '@gltf-transform/cli@4.4.1', 'meshopt', rawGlb, optimizedGlb, '--level', 'medium']);
  const model = await validateModel(optimizedGlb);

  await rm(PACK_OUT, { recursive: true, force: true });
  await mkdir(PACK_OUT, { recursive: true });
  await cp(optimizedGlb, MODEL_OUT);
  run('python3', [
    path.join(ROOT, 'tools/optimize-player-textures.py'),
    '--source-root', extracted,
    '--output', TEXTURES_WORK,
    '--manifest', TEXTURE_MANIFEST,
  ]);

  const textureData = JSON.parse(await readFile(TEXTURE_MANIFEST, 'utf8'));
  const textureLibrary = { format: 'data-uri-library-v1', files: {} };
  for (const entry of textureData.files) {
    const file = path.join(TEXTURES_WORK, entry.path);
    textureLibrary.files[entry.path] = `data:image/webp;base64,${(await readFile(file)).toString('base64')}`;
  }
  await writeFile(TEXTURE_LIBRARY, JSON.stringify(textureLibrary) + '\n');
  const textureLibraryBytes = (await stat(TEXTURE_LIBRARY)).size;
  const runtime = {
    source: 'Sunbox Games / CGTrader 3901952',
    license: 'Royalty Free License (no AI)',
    model: {
      filename: path.basename(MODEL_OUT),
      ...model,
    },
    textureCount: textureData.files.length,
    textureBytes: textureLibraryBytes,
    generatedAt: new Date().toISOString(),
  };
  await writeFile(RUNTIME_MANIFEST, JSON.stringify(runtime, null, 2) + '\n');
  await mkdir(path.dirname(REPORT), { recursive: true });
  const blendStat = await stat(inputs.blend);
  const textureStat = await stat(inputs.textures);
  await writeFile(REPORT, `# Modular Player Runtime Build\n\n` +
    `- Source blend: \`${path.relative(ROOT, inputs.blend)}\` (${blendStat.size.toLocaleString()} bytes, ignored)\n` +
    `- Source textures: \`${path.relative(ROOT, inputs.textures)}\` (${textureStat.size.toLocaleString()} bytes, ignored)\n` +
    `- Runtime GLB: \`${path.relative(ROOT, MODEL_OUT)}\` (${model.bytes.toLocaleString()} bytes)\n` +
    `- Runtime SHA-256: \`${model.sha256}\`\n` +
    `- Modular nodes: ${model.nodes}\n- Meshes: ${model.meshes}\n- Materials: ${model.materials}\n` +
    `- Runtime texture library: ${runtime.textureCount} variants (${runtime.textureBytes.toLocaleString()} bytes)\n` +
    `- Required extension: EXT_meshopt_compression\n\n` +
    `The raw Blender file and texture archive were not copied into the runtime tree.\n`);

  await rm(WORK, { recursive: true, force: true });
  console.log('\n[player-avatar] build complete');
  console.log(`  model: ${path.relative(ROOT, MODEL_OUT)} (${model.bytes} bytes)`);
  console.log(`  textures: ${textureData.files.length} variants packed in ${textureLibraryBytes} bytes`);
  console.log(`  report: ${path.relative(ROOT, REPORT)}`);
  console.log('\n[player-avatar] Next: npm run check, inspect git status, then commit only public runtime outputs and reports.');
}

main().catch((error) => {
  console.error('\n[player-avatar] FAILED:', error.message || error);
  process.exitCode = 1;
});
