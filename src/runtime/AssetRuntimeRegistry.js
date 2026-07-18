// ─────────────────────────────────────────────────────────────────────────────
// AssetRuntimeRegistry.js — one stable lookup over every live asset index.
//
// The Asset Lab owns generation. Gameplay consumes assets by stable ID through
// this adapter, which allows a placeholder to be replaced without relocating or
// rewriting the building, job, mission, or interaction that references it.
// ─────────────────────────────────────────────────────────────────────────────
import { trackLoadingFetch } from '../loader.js';

const DEFAULT_INDEXES = Object.freeze({
  organizedModels: './assets/models/asset-index-v2.json',
  generatedRuntime: './assets/runtime/generated/runtime-asset-index.json',
});

function slug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function runtimeUrl(path) {
  let value = String(path || '').replaceAll('\\', '/');
  if (value.startsWith('public/')) value = value.slice('public/'.length);
  value = value.replace(/^\.?\//, '');
  return value ? `./${value}` : '';
}

function inferKind(path, fallback = 'data') {
  const lower = String(path || '').toLowerCase();
  if (/\.(glb|gltf)$/.test(lower)) return 'model';
  if (/\.(png|webp|jpg|jpeg|svg)$/.test(lower)) return 'image';
  if (/\.(mp3|ogg|wav|m4a)$/.test(lower)) return 'audio';
  if (/\.json$/.test(lower)) return fallback;
  return fallback;
}

function freezeRecord(record) {
  return Object.freeze({
    id: String(record.id),
    name: record.name || record.id,
    kind: record.kind || inferKind(record.path),
    category: record.category || null,
    pack: record.pack || null,
    town: record.town || null,
    district: record.district || null,
    location: record.location || null,
    path: runtimeUrl(record.path),
    sourcePath: record.path || '',
    bytes: Number(record.bytes) || null,
    sha256: record.sha256 || null,
    scale: record.scale ?? null,
    rotation: record.rotation ?? null,
    pivot: record.pivot ?? null,
    collision: record.collision ?? null,
    interactionAnchors: record.interactionAnchors ?? null,
    lods: record.lods ?? null,
    instancing: record.instancing ?? null,
    preload: record.preload ?? 'lazy',
    license: record.license ?? null,
    generated: !!record.generated,
    placeholder: !!record.placeholder,
    metadata: Object.freeze({ ...(record.metadata || {}) }),
  });
}

export class AssetRuntimeRegistry {
  constructor(indexes = DEFAULT_INDEXES) {
    this.indexes = Object.freeze({ ...indexes });
    this.records = new Map();
    this.aliases = new Map();
    this.unresolved = new Set();
    this.failures = new Map();
    this.duplicates = [];
    this.loaded = false;
    this.loadingPromise = null;
    this.indexCounts = { organizedModels: 0, generatedRuntime: 0 };
  }

  _add(record, aliases = []) {
    const frozen = freezeRecord(record);
    if (!frozen.id || !frozen.path) return null;
    if (this.records.has(frozen.id)) {
      this.duplicates.push(frozen.id);
      return this.records.get(frozen.id);
    }
    this.records.set(frozen.id, frozen);
    const candidates = [frozen.id, frozen.name, frozen.sourcePath, frozen.path, ...aliases]
      .map((value) => slug(value))
      .filter(Boolean);
    for (const alias of candidates) if (!this.aliases.has(alias)) this.aliases.set(alias, frozen.id);
    return frozen;
  }

  _ingestOrganized(index) {
    let count = 0;
    for (const [category, packs] of Object.entries(index || {})) {
      if (!packs || typeof packs !== 'object' || Array.isArray(packs)) continue;
      for (const [pack, entries] of Object.entries(packs)) {
        if (!Array.isArray(entries)) continue;
        for (const entry of entries) {
          const id = `library:${slug(category)}:${slug(pack)}:${slug(entry.name)}`;
          const added = this._add({
            id,
            name: entry.name,
            category,
            pack,
            path: `public/assets/${entry.path}`,
            kind: inferKind(entry.path, entry.type || 'model'),
            generated: String(entry.path).includes('/generated/'),
            metadata: { textureCount: entry.tex ?? null, type: entry.type || null },
          }, [entry.name, `${category}:${pack}:${entry.name}`]);
          if (added) count += 1;
        }
      }
    }
    this.indexCounts.organizedModels = count;
  }

  _ingestGenerated(index) {
    let count = 0;
    for (const entry of index?.assets || []) {
      const added = this._add({
        id: entry.id,
        name: entry.name || entry.id,
        category: entry.assetKind || null,
        kind: inferKind(entry.path, entry.assetKind || 'runtime-data'),
        town: entry.town || null,
        district: entry.district || null,
        location: entry.location || null,
        path: entry.path,
        bytes: entry.bytes,
        sha256: entry.sha256,
        generated: true,
        scale: entry.scale,
        rotation: entry.rotation,
        pivot: entry.pivot,
        collision: entry.collision,
        interactionAnchors: entry.interactionAnchors,
        lods: entry.lods,
        instancing: entry.instancing,
        preload: entry.preload,
        license: entry.license,
        metadata: entry,
      });
      if (added) count += 1;
    }
    this.indexCounts.generatedRuntime = count;
  }

  async load() {
    if (this.loaded) return this;
    if (this.loadingPromise) return this.loadingPromise;
    this.loadingPromise = (async () => {
      const [organized, generated] = await Promise.all([
        trackLoadingFetch(this.indexes.organizedModels, undefined, 'Indexing world models…')
          .then((response) => response.json())
          .catch((error) => {
            this.failures.set('organizedModels', error.message || String(error));
            return {};
          }),
        trackLoadingFetch(this.indexes.generatedRuntime, undefined, 'Indexing generated assets…')
          .then((response) => response.json())
          .catch((error) => {
            this.failures.set('generatedRuntime', error.message || String(error));
            return { assets: [] };
          }),
      ]);
      this._ingestOrganized(organized);
      this._ingestGenerated(generated);
      this.loaded = true;
      return this;
    })().finally(() => { this.loadingPromise = null; });
    return this.loadingPromise;
  }

  resolve(id, options = {}) {
    if (!id) return options.fallback ? this.placeholder(options.fallback, options) : null;
    const direct = this.records.get(id);
    if (direct) return direct;
    const aliasId = this.aliases.get(slug(id));
    if (aliasId && this.records.has(aliasId)) return this.records.get(aliasId);
    this.unresolved.add(String(id));
    return options.fallback ? this.placeholder(options.fallback, { ...options, requestedId: id }) : null;
  }

  placeholder(id = 'procedural-placeholder', options = {}) {
    return freezeRecord({
      id: `placeholder:${slug(id) || 'generic'}`,
      name: options.name || 'Procedural Placeholder',
      path: options.path || './assets/placeholders/procedural',
      kind: 'placeholder',
      category: options.category || null,
      town: options.town || null,
      district: options.district || null,
      location: options.location || null,
      placeholder: true,
      metadata: { requestedId: options.requestedId || null },
    });
  }

  filter(criteria = {}) {
    const entries = [];
    for (const record of this.records.values()) {
      let matches = true;
      for (const [key, value] of Object.entries(criteria)) {
        if (value == null) continue;
        const accepted = Array.isArray(value) ? value : [value];
        if (!accepted.includes(record[key])) { matches = false; break; }
      }
      if (matches) entries.push(record);
    }
    return entries;
  }

  markFailure(id, error) {
    this.failures.set(String(id), error?.message || String(error || 'unknown error'));
  }

  preloadList({ town, district, category, kind, limit = 24 } = {}) {
    const list = this.filter({ town, district, category, kind })
      .filter((record) => record.kind === 'model' && record.preload !== 'never');
    list.sort((a, b) => (a.preload === 'eager' ? -1 : 0) - (b.preload === 'eager' ? -1 : 0));
    return list.slice(0, Math.max(0, limit));
  }

  snapshot() {
    const kinds = {};
    const towns = {};
    for (const record of this.records.values()) {
      kinds[record.kind] = (kinds[record.kind] || 0) + 1;
      if (record.town) towns[record.town] = (towns[record.town] || 0) + 1;
    }
    return Object.freeze({
      loaded: this.loaded,
      total: this.records.size,
      indexCounts: { ...this.indexCounts },
      kinds,
      towns,
      unresolved: [...this.unresolved],
      failures: Object.fromEntries(this.failures),
      duplicates: [...this.duplicates],
    });
  }
}

export const assetRuntimeRegistry = new AssetRuntimeRegistry();

if (typeof window !== 'undefined') {
  window.__ZW_ASSET_REGISTRY__ = assetRuntimeRegistry;
  window.__ZW_ASSET_REGISTRY_REPORT__ = () => assetRuntimeRegistry.snapshot();
}

export default assetRuntimeRegistry;
