// ─────────────────────────────────────────────────────────────────────────────
// ObjectPool.js — reusable runtime pools for NPCs, traffic, police, and effects.
// ─────────────────────────────────────────────────────────────────────────────

export class ObjectPool {
  constructor({ name = 'pool', create, reset = null, activate = null, deactivate = null, dispose = null, maxSize = 64 } = {}) {
    if (typeof create !== 'function') throw new Error(`ObjectPool ${name} needs a create function`);
    this.name = name;
    this.create = create;
    this.reset = reset;
    this.activate = activate;
    this.deactivate = deactivate;
    this.disposeItem = dispose;
    this.maxSize = Math.max(0, maxSize);
    this.available = [];
    this.active = new Set();
    this.created = 0;
    this.reused = 0;
    this.disposed = 0;
  }

  acquire(context) {
    let item = this.available.pop();
    if (item) this.reused += 1;
    else {
      item = this.create(context);
      this.created += 1;
    }
    this.reset?.(item, context);
    this.activate?.(item, context);
    this.active.add(item);
    return item;
  }

  release(item, context) {
    if (!item || !this.active.delete(item)) return false;
    this.deactivate?.(item, context);
    if (this.available.length >= this.maxSize) {
      this.disposeItem?.(item);
      this.disposed += 1;
    } else {
      this.available.push(item);
    }
    return true;
  }

  releaseAll(context) {
    for (const item of [...this.active]) this.release(item, context);
  }

  trim(targetSize = 0) {
    const target = Math.max(0, Math.min(this.maxSize, targetSize));
    while (this.available.length > target) {
      const item = this.available.pop();
      this.disposeItem?.(item);
      this.disposed += 1;
    }
  }

  destroy() {
    for (const item of this.active) this.disposeItem?.(item);
    for (const item of this.available) this.disposeItem?.(item);
    this.disposed += this.active.size + this.available.length;
    this.active.clear();
    this.available.length = 0;
  }

  snapshot() {
    return Object.freeze({
      name: this.name,
      active: this.active.size,
      available: this.available.length,
      created: this.created,
      reused: this.reused,
      disposed: this.disposed,
      maxSize: this.maxSize,
    });
  }
}

export class PoolRegistry {
  constructor() { this.pools = new Map(); }

  register(id, options) {
    if (this.pools.has(id)) throw new Error(`Duplicate object pool: ${id}`);
    const pool = new ObjectPool({ name: id, ...options });
    this.pools.set(id, pool);
    return pool;
  }

  get(id) { return this.pools.get(id) || null; }
  destroy(id) {
    const pool = this.pools.get(id);
    if (!pool) return false;
    pool.destroy();
    this.pools.delete(id);
    return true;
  }
  destroyAll() { for (const id of [...this.pools.keys()]) this.destroy(id); }
  snapshot() { return Object.freeze(Object.fromEntries([...this.pools].map(([id, pool]) => [id, pool.snapshot()]))); }
}

export const poolRegistry = new PoolRegistry();

if (typeof window !== 'undefined') window.__ZW_POOL_REGISTRY__ = poolRegistry;
