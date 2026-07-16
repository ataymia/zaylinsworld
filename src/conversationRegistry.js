// ───────────────────────────────────────────────────────────────────────────
// conversationRegistry.js — reusable dialogue-tree enhancement boundary.
//
// Existing gameplay code may open a small dialogue object. Registered enhancers
// can recognize that object and return a richer tree while preserving dynamic
// actions owned by the caller. This lets conversations grow without stuffing
// more branching prose into main.js.
// ───────────────────────────────────────────────────────────────────────────

const enhancers = [];
const ENHANCED = Symbol('zaylins-dialogue-enhanced');

export function registerDialogueEnhancer(id, enhance) {
  if (!id || typeof enhance !== 'function') throw new TypeError('Dialogue enhancer requires an id and function');
  const existing = enhancers.findIndex((entry) => entry.id === id);
  const entry = { id, enhance };
  if (existing >= 0) enhancers[existing] = entry;
  else enhancers.push(entry);
  return () => {
    const index = enhancers.findIndex((candidate) => candidate.id === id);
    if (index >= 0) enhancers.splice(index, 1);
  };
}

export function applyDialogueEnhancers(options, context = {}) {
  if (!options || typeof options !== 'object' || options[ENHANCED]) return options;
  let current = options;
  for (const entry of enhancers) {
    const next = entry.enhance(current, context);
    if (next && typeof next === 'object') current = next;
  }
  try {
    Object.defineProperty(current, ENHANCED, { value: true, enumerable: false });
  } catch {
    // Frozen third-party objects are still safe to render; they may be evaluated
    // again if reopened, but enhancers are expected to be idempotent.
  }
  return current;
}

export function dialogueEnhancerIds() {
  return enhancers.map((entry) => entry.id);
}

export function clearDialogueEnhancersForTests() {
  enhancers.length = 0;
}
