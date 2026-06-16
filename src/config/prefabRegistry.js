// ───────────────────────────────────────────────────────────────────────────
//  prefabRegistry.js — the variation RESOLVER (Phase 2A)
//
//  Sits on top of assetRegistry.js (semantic classifier) and variationPools.js
//  (named "give me an X" queries). Given a live registry (built from
//  asset-index-v2.json) it answers a pool request and returns one or more chosen
//  asset meta records, supporting:
//    • random variation
//    • weighted random (texture/tested bias + per-theme weighting)
//    • deterministic seeded variation (same seed → same pick every reload)
//    • tiered selection (low/mid/high quality bias by size proxy)
//    • fallback selection (returns a {fallback:true, category} stub if the pool
//      is empty so the builder can drop a clean procedural mesh — never a blob)
//
//  Pure (no THREE / no DOM): runs in-game and in tooling.
// ───────────────────────────────────────────────────────────────────────────
import { VARIATION_POOLS, resolvePoolAlias } from './variationPools.js';
import { fallbackFor } from './assetRegistry.js';

// ── deterministic PRNG (mulberry32) + string hashing ────────────────────────
export function hashSeed(str) {
  let h = 1779033703 ^ String(str).length;
  for (let i = 0; i < String(str).length; i++) {
    h = Math.imul(h ^ String(str).charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h >>> 0) || 1;
}
export function makeRng(seed) {
  let a = (typeof seed === 'number' ? seed : hashSeed(seed)) >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A seeded context: hand out independent named sub-streams so two pools resolved
// under the same town seed don't correlate (each gets its own rng).
export function makeVariationContext(seed) {
  const base = typeof seed === 'number' ? seed : hashSeed(seed || 'zaylinsworld');
  return {
    seed: base,
    rngFor(key) { return makeRng(base ^ hashSeed(key)); },
  };
}

// ── candidate filtering ─────────────────────────────────────────────────────
const SIZE_TIER = (a) => {
  const s = a.scaleTarget || 1;
  if (s >= 2.5) return 'large';
  if (s >= 1.0) return 'medium';
  return 'small';
};

function matchesTags(a, tags) {
  if (!tags || !tags.length) return true;
  const hay = `${a.name || ''} ${a.path || ''} ${a.subcategory || ''}`.toLowerCase();
  return tags.some(t => hay.includes(String(t).toLowerCase()));
}
function matchesAnyCategory(a, cats) {
  if (!cats || !cats.length) return true;
  return cats.includes(a.category);
}

// Return the eligible candidate list for a pool (does not pick yet).
export function poolCandidates(registry, pool) {
  if (!registry || !pool) return [];
  let list = registry.filter(a => !a.isAnimation);
  // category OR tag match (tags broaden a category so future uploads are caught)
  list = list.filter(a => matchesAnyCategory(a, pool.categories) || matchesTags(a, pool.tags));
  if (pool.packs && pool.packs.length) list = list.filter(a => pool.packs.includes(a.subcategory));
  if (pool.excludeTags && pool.excludeTags.length) {
    list = list.filter(a => {
      const hay = `${a.name || ''} ${a.path || ''}`.toLowerCase();
      return !pool.excludeTags.some(t => hay.includes(String(t).toLowerCase()));
    });
  }
  if (pool.requireSafe !== false) list = list.filter(a => a.safe !== false);
  if (pool.size) list = list.filter(a => SIZE_TIER(a) === pool.size);
  return list;
}

// Weight a candidate for weighted-random selection.
function weightOf(a, pool, theme) {
  let w = 1;
  if (pool.weightBy === 'texture' && a.hasTexture) w *= 2;
  if (pool.weightBy === 'tested' && a.tested) w *= 3;
  if (a.hasTexture) w *= 1.25;                 // textured assets read better; mild bias
  if (theme && pool.themes && pool.themes[theme]) w *= pool.themes[theme];
  // tier bias: 'high' favors larger/fancier, 'low' favors smaller
  if (pool.tier === 'high') w *= (a.scaleTarget || 1);
  else if (pool.tier === 'low') w *= 1 / (a.scaleTarget || 1);
  return Math.max(0.0001, w);
}

function weightedPick(list, pool, theme, rng) {
  const weights = list.map(a => weightOf(a, pool, theme));
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rng() * total;
  for (let i = 0; i < list.length; i++) { r -= weights[i]; if (r <= 0) return list[i]; }
  return list[list.length - 1];
}

// A clean fallback stub when no asset matches — the builder draws a procedural
// mesh for `category` instead of leaving an empty slot or a debug blob.
function fallbackStub(pool) {
  const cat = pool.fallbackCategory || (pool.categories && pool.categories[0]) || 'decoration';
  return { fallback: true, category: cat, scaleTarget: fallbackFor(cat) ? 1 : 1, name: `fallback:${cat}`, path: null };
}

// Resolve ONE variation for a pool.
//   opts: { seed, rng, theme, tier, key }
export function resolveVariation(registry, poolOrId, opts = {}) {
  const pool = typeof poolOrId === 'string' ? VARIATION_POOLS[resolvePoolAlias(poolOrId)] : poolOrId;
  if (!pool) return null;
  const list = poolCandidates(registry, pool);
  if (!list.length) return fallbackStub(pool);
  const rng = opts.rng || makeRng(opts.seed != null ? (typeof opts.seed === 'number' ? opts.seed : hashSeed(opts.seed)) ^ hashSeed(opts.key || 'v') : Math.random() * 1e9);
  const themed = { ...pool, theme: opts.theme, tier: opts.tier || pool.tier };
  return weightedPick(list, themed, opts.theme, rng);
}

// Resolve N variations (a builder hint count): deterministic ordering per seed.
//   Picks WITHOUT immediate repeats where the pool is large enough.
export function resolveVariations(registry, poolOrId, count, opts = {}) {
  const pool = typeof poolOrId === 'string' ? VARIATION_POOLS[resolvePoolAlias(poolOrId)] : poolOrId;
  if (!pool) return [];
  const list = poolCandidates(registry, pool);
  const n = Math.max(0, count | 0);
  if (!list.length) return Array.from({ length: n }, () => fallbackStub(pool));
  const rng = opts.rng || makeRng((typeof opts.seed === 'number' ? opts.seed : hashSeed(opts.seed || 'seed')) ^ hashSeed(opts.key || poolName(poolOrId)));
  const out = [];
  let pool2 = list.slice();
  for (let i = 0; i < n; i++) {
    if (!pool2.length) pool2 = list.slice();
    const themed = { ...pool, theme: opts.theme, tier: opts.tier || pool.tier };
    const choice = weightedPick(pool2, themed, opts.theme, rng);
    out.push(choice);
    // avoid back-to-back duplicates when possible
    const idx = pool2.indexOf(choice);
    if (pool2.length > 1 && idx >= 0) pool2.splice(idx, 1);
  }
  return out;
}

function poolName(poolOrId) { return typeof poolOrId === 'string' ? poolOrId : 'pool'; }

// How many a pool wants by default (builder hint), clamped sensibly.
export function poolCount(poolOrId, opts = {}) {
  const pool = typeof poolOrId === 'string' ? VARIATION_POOLS[resolvePoolAlias(poolOrId)] : poolOrId;
  if (!pool) return 1;
  const min = pool.min ?? 1, max = pool.max ?? min;
  if (max <= min) return min;
  const rng = opts.rng || makeRng((typeof opts.seed === 'number' ? opts.seed : hashSeed(opts.seed || 'count')) ^ hashSeed(opts.key || 'n'));
  return min + Math.floor(rng() * (max - min + 1));
}

export default { resolveVariation, resolveVariations, poolCandidates, poolCount, makeRng, makeVariationContext, hashSeed };
