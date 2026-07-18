// ─────────────────────────────────────────────────────────────────────────────
// SceneLifecycle.js — deterministic ownership and cleanup for runtime objects.
// ─────────────────────────────────────────────────────────────────────────────

function disposeMaterial(material) {
  if (!material) return;
  for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'alphaMap', 'envMap']) {
    material[key]?.dispose?.();
  }
  material.dispose?.();
}

function disposeObject3D(object, options = {}) {
  if (!object) return;
  object.parent?.remove?.(object);
  object.traverse?.((node) => {
    if (options.disposeGeometry !== false) node.geometry?.dispose?.();
    if (options.disposeMaterials !== false && node.material) {
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      for (const material of materials) disposeMaterial(material);
    }
  });
}

class LifecycleScope {
  constructor(id, parent = null) {
    this.id = id;
    this.parent = parent;
    this.disposers = [];
    this.keys = new Set();
    this.children = new Map();
    this.disposed = false;
    this.createdAt = Date.now();
  }

  add(disposer, key = null) {
    if (this.disposed) throw new Error(`Lifecycle scope ${this.id} is already disposed`);
    if (typeof disposer !== 'function') throw new Error(`Lifecycle scope ${this.id} requires a disposer function`);
    if (key && this.keys.has(key)) throw new Error(`Duplicate lifecycle resource key in ${this.id}: ${key}`);
    if (key) this.keys.add(key);
    const entry = { disposer, key };
    this.disposers.push(entry);
    return () => {
      const index = this.disposers.indexOf(entry);
      if (index >= 0) this.disposers.splice(index, 1);
      if (key) this.keys.delete(key);
    };
  }

  object3D(object, options = {}, key = null) {
    this.add(() => disposeObject3D(object, options), key);
    return object;
  }

  mixer(mixer, root = null, key = null) {
    this.add(() => {
      mixer?.stopAllAction?.();
      if (root) mixer?.uncacheRoot?.(root);
    }, key);
    return mixer;
  }

  listener(target, type, handler, options, key = null) {
    target?.addEventListener?.(type, handler, options);
    this.add(() => target?.removeEventListener?.(type, handler, options), key || `listener:${type}:${this.disposers.length}`);
    return handler;
  }

  timeout(callback, ms, key = null) {
    const id = setTimeout(callback, ms);
    this.add(() => clearTimeout(id), key || `timeout:${id}`);
    return id;
  }

  interval(callback, ms, key = null) {
    const id = setInterval(callback, ms);
    this.add(() => clearInterval(id), key || `interval:${id}`);
    return id;
  }

  child(id) {
    if (this.children.has(id)) return this.children.get(id);
    const child = new LifecycleScope(`${this.id}/${id}`, this);
    this.children.set(id, child);
    return child;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const child of [...this.children.values()].reverse()) child.dispose();
    this.children.clear();
    for (const entry of [...this.disposers].reverse()) {
      try { entry.disposer(); }
      catch (error) { console.warn(`[lifecycle] ${this.id} cleanup failed`, error); }
    }
    this.disposers.length = 0;
    this.keys.clear();
    this.parent?.children?.delete(this.id.split('/').at(-1));
  }

  snapshot() {
    return {
      id: this.id,
      disposed: this.disposed,
      resources: this.disposers.length,
      resourceKeys: [...this.keys],
      ageMs: Date.now() - this.createdAt,
      children: [...this.children.values()].map((child) => child.snapshot()),
    };
  }
}

export class SceneLifecycle {
  constructor() {
    this.scopes = new Map();
  }

  scope(id) {
    if (!id) throw new Error('Lifecycle scope needs an id');
    if (this.scopes.has(id)) return this.scopes.get(id);
    const scope = new LifecycleScope(id);
    this.scopes.set(id, scope);
    return scope;
  }

  replace(id) {
    this.dispose(id);
    return this.scope(id);
  }

  dispose(id) {
    const scope = this.scopes.get(id);
    if (!scope) return false;
    scope.dispose();
    this.scopes.delete(id);
    return true;
  }

  disposePrefix(prefix) {
    for (const id of [...this.scopes.keys()]) if (id.startsWith(prefix)) this.dispose(id);
  }

  disposeAll() {
    for (const id of [...this.scopes.keys()].reverse()) this.dispose(id);
  }

  snapshot() {
    const scopes = [...this.scopes.values()].map((scope) => scope.snapshot());
    return Object.freeze({
      scopeCount: scopes.length,
      resourceCount: scopes.reduce((total, scope) => total + scope.resources, 0),
      scopes,
    });
  }
}

export const sceneLifecycle = new SceneLifecycle();

if (typeof window !== 'undefined') {
  window.__ZW_SCENE_LIFECYCLE__ = sceneLifecycle;
  window.__ZW_SCENE_LIFECYCLE_REPORT__ = () => sceneLifecycle.snapshot();
}

export { LifecycleScope, disposeObject3D };
