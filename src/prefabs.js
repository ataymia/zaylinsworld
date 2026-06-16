// ───────────────────────────────────────────────────────────────────────────
//  prefabs.js — turn a variation-pool request into a real placed object
//  (Phase 2 bridge between the pure config layer and THREE)
//
//  placeProp() resolves a variation pool through the seeded resolver against the
//  live asset registry (built once from asset-index-v2.json), loads the chosen
//  GLB (bounds-checked + normalized + grounded), and places it with the right
//  collision behavior — or draws a CLEAN procedural fallback box if the pool is
//  empty / the asset fails / it's out of safe bounds. Never throws, never blobs.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { loadAssetLibrary, loadModel } from './assets.js';
import { assetUrl } from './manifest.js';
import { buildRegistry } from './config/assetRegistry.js';
import { resolveVariation } from './config/prefabRegistry.js';
import { colliders } from './world.js';
import { registerWorldObject } from './worldCollision.js';

// ── one-time live registry (semantic meta for every indexed asset) ──────────
let _registry = null;
export async function getPrefabRegistry() {
  if (_registry) return _registry;
  const lib = await loadAssetLibrary().catch(() => ({}));
  _registry = buildRegistry(lib);
  return _registry;
}

// Safe GLB normalization: scale longest side toward `target`, reject non-finite
// / degenerate / wildly-oversized models (so a mis-exported asset can never
// become a giant blob or a 0-size dot). Returns the grounded object or null.
function normalizeModel(scene, target, maxAllowed) {
  const obj = scene.clone(true);
  obj.updateWorldMatrix(true, true);
  let box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  if (![size.x, size.y, size.z].every(Number.isFinite)) return null;
  const span = Math.max(size.x, size.y, size.z);
  if (!(span > 1e-3)) return null;
  const scale = target / span;
  if (!Number.isFinite(scale) || scale <= 0) return null;
  obj.scale.multiplyScalar(scale);
  obj.updateWorldMatrix(true, true);
  box = new THREE.Box3().setFromObject(obj);
  const size2 = box.getSize(new THREE.Vector3());
  if (Math.max(size2.x, size2.y, size2.z) > (maxAllowed || target * 3)) return null;
  obj.position.y -= box.min.y;                  // feet to floor
  obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return obj;
}

// Draw a clean procedural fallback box (never a debug object).
function fallbackMesh(desc) {
  const [w, h, d] = (desc && desc.size) || [0.6, 0.6, 0.6];
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color: (desc && desc.color) || '#555', roughness: 0.9 }));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

function addCollisionFor(group, x, z, collisionType, kind) {
  if (collisionType === 'hard') {
    group.updateWorldMatrix(true, true);
    const bb = new THREE.Box3().setFromObject(group).expandByScalar(0.05);
    colliders.push(bb);
    registerWorldObject(group, x, z, { r: 1.0, kind: kind || 'building' });
  } else if (collisionType === 'breakable') {
    registerWorldObject(group, x, z, { r: 0.6, kind: kind || 'streetlight' });
  } else if (collisionType === 'soft') {
    registerWorldObject(group, x, z, { r: 0.5, kind: kind || 'trash_bag' });
  }
  // 'none' / 'blocker' → no vehicle collision registration (decor / interior)
}

// Place one prop from a variation pool. Returns a result record (never throws).
//   opts: { pool, x, z, ry, y, scaleMax, collisionType, fallback, kind, seed, key }
export async function placeProp(scene, renderer, opts) {
  const res = { placed: false, fallback: false, failed: false, name: null, group: null };
  try {
    const registry = await getPrefabRegistry();
    const choice = resolveVariation(registry, opts.pool, { seed: opts.seed, key: opts.key || opts.pool });
    const group = new THREE.Group();
    let mesh = null;
    if (choice && !choice.fallback && choice.path) {
      const model = await loadModel(assetUrl(choice.path), renderer).catch(() => null);
      if (model && model.scene) {
        mesh = normalizeModel(model.scene, opts.scaleMax || choice.scaleTarget || 1, (opts.scaleMax || 1.5) * 3);
      }
      res.name = choice.name;
    }
    if (!mesh) {                                  // fallback (empty pool / load fail / bad bounds)
      mesh = fallbackMesh(opts.fallback);
      res.fallback = true;
      res.name = res.name || (opts.fallback && opts.fallback.kind) || 'fallback';
    }
    group.add(mesh);
    group.position.set(opts.x, opts.y || 0, opts.z);
    if (opts.ry) group.rotation.y = opts.ry;
    scene.add(group);
    addCollisionFor(group, opts.x, opts.z, opts.collisionType || 'none', opts.kind);
    res.placed = true;
    res.group = group;
  } catch (e) {
    res.failed = true;
    console.warn('[prefab] placeProp failed:', opts && opts.pool, e);
  }
  return res;
}

export default { getPrefabRegistry, placeProp };
