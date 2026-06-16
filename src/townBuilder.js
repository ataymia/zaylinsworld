// ───────────────────────────────────────────────────────────────────────────
//  townBuilder.js — asset-aware town dressing (Phase 2G proof-of-concept)
//
//  Uses the prefab/variation/placement system to DRESS the existing Starter
//  Town with logical, varied props instead of random soup: trash clusters hug
//  storefront gutters & alley corners (placement rules), each item is chosen
//  from a variation POOL (so it's not one hard-coded asset), and everything is
//  deterministic per town seed (no reshuffling every reload). Fully additive +
//  fallback-safe: a missing asset draws a clean box, never a blob or black
//  screen. Returns a debug summary the panel can show.
// ───────────────────────────────────────────────────────────────────────────
import { PLACEMENT_RULES, anchorPoints } from './config/placementRules.js';
import { PROP_PREFABS } from './config/propPrefabs.js';
import { makeRng, hashSeed, poolCount } from './config/prefabRegistry.js';
import { placeProp } from './prefabs.js';

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// Dress the town. Safe to call once after the city is built.
//   opts: { seed, density }   → resolves to a stats summary
export async function dressTown(scene, renderer, opts = {}) {
  const seed = opts.seed != null ? opts.seed : 'starter-town';
  const seedN = typeof seed === 'number' ? seed : hashSeed(seed);
  const density = clamp(opts.density ?? 1, 0.3, 2);
  const stats = { seed: seedN, prefabsPlaced: 0, assetsSelected: 0, fallbackCount: 0, failedAssets: [], pools: {} };
  const rng = makeRng(seedN ^ hashSeed('town-dressing'));

  const jobs = [];

  // NOTE: loose litter is handled by the cleanup-job system in main.js (Phase
  // 3C) using the REAL Trash & Debris models, so we do NOT scatter prefab trash
  // here (that produced ungrabbable placeholder bits). townBuilder now only
  // places solid dumpsters that read as "behind-the-store" dressing + give the
  // cleanup loop a logical drop context.

  // ── dumpsters (hard — solid, behind the busier lots) ───────────────────────
  const dumpRule = PLACEMENT_RULES.dumpster;
  (dumpRule.anchors || []).forEach((a, i) => {
    const prefab = PROP_PREFABS.dumpster;
    jobs.push(placeProp(scene, renderer, {
      pool: prefab.pool, x: a.x, z: a.z, ry: 0,
      scaleMax: prefab.scaleMax, collisionType: prefab.collisionType,
      kind: 'dumpster', fallback: prefab.fallback,
      seed: seedN, key: `dumpster-${i}`,
    }).then(r => tally(stats, 'dumpster', r)));
  });

  await Promise.all(jobs);
  console.info('[town] dressed:', stats.prefabsPlaced, 'props ·', stats.assetsSelected, 'real assets ·',
    stats.fallbackCount, 'fallbacks · seed', seedN);
  return stats;
}

function tally(stats, pool, r) {
  if (!r) return;
  stats.pools[pool] = (stats.pools[pool] || 0) + 1;
  if (r.failed) { stats.failedAssets.push(`${pool}:${r.name || '?'}`); return; }
  stats.prefabsPlaced++;
  if (r.fallback) stats.fallbackCount++; else stats.assetsSelected++;
}

export default { dressTown };
