// ───────────────────────────────────────────────────────────────────────────
//  minigames/index.js — minigame registry API skeleton (NOT wired into gameplay).
//
//  Thin, engine-agnostic registry that generalizes the existing startTimingGame
//  pattern. Loads descriptors from src/config/minigameCatalog.js and lets future
//  code register run hooks per minigame id. Importing this file changes nothing
//  at runtime — nothing here is called by the game yet.
//
//  See docs/MINIGAME_FRAMEWORK.md.
// ───────────────────────────────────────────────────────────────────────────

import { MINIGAME_CATALOG } from '../config/minigameCatalog.js';

// id → run-hook implementation, registered by future minigame modules.
const HOOKS = new Map();

// Register the core-loop implementation for a minigame id (or a `run` hook id
// shared by several descriptors, e.g. 'timingLoop').
export function registerMinigame(idOrHook, impl) {
  if (typeof impl !== 'function') throw new TypeError('minigame impl must be a function');
  HOOKS.set(idOrHook, impl);
  return impl;
}

// Resolve a descriptor by id from the catalog. The returned object always
// carries its own `id` so it is self-describing (the catalog keys it by id).
export function getMinigame(id) {
  const d = MINIGAME_CATALOG[id];
  return d ? { id, ...d } : null;
}

// Resolve the run-hook for a descriptor: prefer an id-specific hook, else the
// shared `run` hook named on the descriptor (e.g. 'timingLoop').
export function getMinigameHook(id) {
  if (HOOKS.has(id)) return HOOKS.get(id);
  const d = getMinigame(id);
  if (d && d.run && HOOKS.has(d.run)) return HOOKS.get(d.run);
  return null;
}

// List descriptors, optionally filtered by town and/or category.
export function listMinigames({ town = null, category = null } = {}) {
  return Object.entries(MINIGAME_CATALOG)
    .filter(([, d]) => (!town || d.town === town) && (!category || d.category === category))
    .map(([id, d]) => ({ id, ...d }));
}

export { MINIGAME_CATALOG };
