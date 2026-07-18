import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';

const ROOT = process.cwd();
const PUBLIC_ROOT = join(ROOT, 'public');
const DEFAULT_MANIFEST = join(PUBLIC_ROOT, 'assets', 'remote-asset-manifest.json');
const DEFAULT_PLAN = join(ROOT, 'reports', 'asset-factory', 'r2-upload-plan.tsv');

const BINARY_EXTENSIONS = new Set([
  '.glb', '.gltf', '.bin', '.ktx2',
  '.png', '.jpg', '.jpeg', '.webp', '.avif', '.hdr', '.exr',
  '.mp3', '.ogg', '.wav', '.m4a', '.mp4', '.webm',
  '.woff', '.woff2', '.wasm',
]);

const CONTENT_TYPES = {
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.ktx2': 'image/ktx2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.hdr': 'image/vnd.radiance',
  '.exr': 'image/x-exr',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
};

function arg(name, fallback = null) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((value) => value.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function walk(directory, files = []) {
  if (!existsSync(directory)) return files;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path, files);
    else if (entry.isFile() && BINARY_EXTENSIONS.has(extname(entry.name).toLowerCase())) files.push(path);
  }
  return files;
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function readManifest(path) {
  if (!existsSync(path)) return { version: 1, assets: {} };
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    return {
      version: 1,
      ...parsed,
      assets: parsed.assets && typeof parsed.assets === 'object' ? parsed.assets : {},
    };
  } catch {
    return { version: 1, assets: {} };
  }
}

const scope = arg('scope', process.env.R2_SYNC_SCOPE || 'generated');
const outputPath = resolve(arg('output', DEFAULT_PLAN));
const manifestPath = resolve(arg('manifest', DEFAULT_MANIFEST));
const baseUrl = normalizeBaseUrl(arg('base-url', process.env.R2_ASSET_BASE_URL || ''));

const roots = scope === 'all'
  ? [join(PUBLIC_ROOT, 'assets')]
  : [
      join(PUBLIC_ROOT, 'assets', 'models', 'generated'),
      join(PUBLIC_ROOT, 'assets', 'textures', 'generated'),
      join(PUBLIC_ROOT, 'assets', 'audio', 'generated'),
    ];

const files = [...new Set(roots.flatMap((root) => walk(root)))].sort();
const previous = readManifest(manifestPath);
const assets = { ...previous.assets };
const rows = [];
let totalBytes = 0;

for (const sourcePath of files) {
  const bytes = readFileSync(sourcePath);
  const hash = sha256(bytes);
  const extension = extname(sourcePath).toLowerCase();
  const publicPath = relative(PUBLIC_ROOT, sourcePath).replaceAll('\\', '/');
  const key = `assets/by-sha256/${hash.slice(0, 2)}/${hash}${extension}`;
  const contentType = CONTENT_TYPES[extension] || 'application/octet-stream';
  const cacheControl = 'public, max-age=31536000, immutable';
  const size = statSync(sourcePath).size;
  totalBytes += size;

  assets[publicPath] = {
    key,
    sha256: hash,
    bytes: size,
    contentType,
  };
  rows.push([sourcePath, key, contentType, cacheControl, hash, String(size)].join('\t'));
}

const manifest = {
  version: 1,
  generatedAt: new Date().toISOString(),
  strategy: 'sha256-content-addressed-r2-with-local-fallback',
  baseUrl,
  scope,
  synchronizedAssets: files.length,
  synchronizedBytes: totalBytes,
  totalMappedAssets: Object.keys(assets).length,
  assets: Object.fromEntries(Object.entries(assets).sort(([left], [right]) => left.localeCompare(right))),
};

mkdirSync(dirname(outputPath), { recursive: true });
mkdirSync(dirname(manifestPath), { recursive: true });
writeFileSync(outputPath, rows.length ? `${rows.join('\n')}\n` : '');
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`[r2-plan] scope=${scope}; files=${files.length}; bytes=${totalBytes}; mapped=${manifest.totalMappedAssets}.`);
console.log(`[r2-plan] manifest=${relative(ROOT, manifestPath)}; plan=${relative(ROOT, outputPath)}.`);
