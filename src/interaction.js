// ───────────────────────────────────────────────────────────────────────────
// interaction.js — shared, deterministic interaction contract.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';

export const INTERACTION_TYPES = Object.freeze({
  door: 'door',
  talk: 'talk',
  inspect: 'inspect',
  buy: 'buy',
  job: 'job',
  mission: 'mission',
  activity: 'activity',
  vehicle: 'vehicle',
  service: 'service',
  crime: 'crime',
});

export const INTERACTION_PRIORITY = Object.freeze({
  mission: 100,
  vehicle: 90,
  door: 80,
  crime: 75,
  job: 70,
  service: 65,
  buy: 60,
  talk: 55,
  activity: 50,
  inspect: 40,
});

function normalizeItem(item, order) {
  if (!item?.id) throw new Error('Interactable needs a stable id.');
  if (typeof item.getPosition !== 'function') throw new Error(`Interactable "${item.id}" has no getPosition.`);
  if (typeof item.onInteract !== 'function') {
    throw new Error(`Interactable "${item.id}" has no onInteract — refusing to show a fake prompt.`);
  }
  const type = INTERACTION_TYPES[item.type] || item.type || INTERACTION_TYPES.inspect;
  return {
    key: 'e',
    radius: 2.6,
    priority: INTERACTION_PRIORITY[type] ?? 0,
    inputMode: 'tap',
    holdMs: 0,
    facingDot: null,
    lineOfSight: false,
    ...item,
    type,
    _order: order,
  };
}

function disabledReason(item, context) {
  if (!item.enabled) return null;
  try {
    if (item.enabled(context)) return null;
  } catch (error) {
    return error?.message || 'Unavailable right now';
  }
  if (typeof item.getDisabledReason === 'function') return item.getDisabledReason(context) || 'Unavailable right now';
  return item.disabledReason || 'Unavailable right now';
}

function facingPass(item, playerPos, itemPos, context) {
  if (!Number.isFinite(item.facingDot)) return true;
  const forward = context?.playerForward;
  if (!forward) return true;
  const toTarget = new THREE.Vector3().subVectors(itemPos, playerPos).setY(0);
  if (toTarget.lengthSq() < 0.000001) return true;
  toTarget.normalize();
  const flatForward = new THREE.Vector3(forward.x || 0, 0, forward.z || 0);
  if (flatForward.lengthSq() < 0.000001) return true;
  return flatForward.normalize().dot(toTarget) >= item.facingDot;
}

function lineOfSightPass(item, playerPos, itemPos, context) {
  if (!item.lineOfSight) return true;
  if (typeof item.hasLineOfSight === 'function') return !!item.hasLineOfSight(playerPos, itemPos, context);
  if (typeof context?.hasLineOfSight === 'function') return !!context.hasLineOfSight(playerPos, itemPos, item);
  return true;
}

export class InteractionManager {
  constructor() {
    this.items = new Map();
    this._tmp = new THREE.Vector3();
    this._order = 0;
    this.lastSelection = null;
    this.activations = 0;
  }

  register(item) {
    if (this.items.has(item?.id)) throw new Error(`Duplicate interactable id: ${item.id}`);
    const normalized = normalizeItem(item, this._order++);
    this.items.set(normalized.id, normalized);
    return normalized;
  }

  replace(item) {
    this.unregister(item?.id);
    return this.register(item);
  }

  unregister(id) { return this.items.delete(id); }
  clear() { this.items.clear(); this.lastSelection = null; }

  candidates(playerPos, area, context = {}) {
    const candidates = [];
    for (const item of this.items.values()) {
      if (item.area && item.area !== area) continue;
      const position = item.getPosition(context);
      if (!position) continue;
      const distance = position.distanceTo(playerPos);
      if (distance > (item.radius ?? 2.6)) continue;
      if (!facingPass(item, playerPos, position, context)) continue;
      if (!lineOfSightPass(item, playerPos, position, context)) continue;
      const reason = disabledReason(item, context);
      if (reason && !context.includeDisabled) continue;
      candidates.push({
        item,
        position,
        distance,
        disabled: !!reason,
        disabledReason: reason,
        score: (Number(item.priority) || 0) * 1000 - distance * 10 - item._order * 0.0001,
      });
    }
    candidates.sort((a, b) => b.score - a.score || a.distance - b.distance || a.item._order - b.item._order);
    return candidates;
  }

  findBest(playerPos, area, context = {}) {
    const selection = this.candidates(playerPos, area, context)[0] || null;
    this.lastSelection = selection;
    return selection;
  }

  // Backward-compatible result used by the current prompt loop.
  findNearest(playerPos, area, context = {}) {
    return this.findBest(playerPos, area, context)?.item || null;
  }

  promptFor(selection, context = {}) {
    if (!selection) return null;
    const candidate = selection.item ? selection : { item: selection, disabled: false, disabledReason: null };
    if (candidate.disabled) return candidate.disabledReason;
    const prompt = candidate.item.getPrompt;
    return typeof prompt === 'function' ? prompt(context) : (prompt || candidate.item.label || 'Interact');
  }

  async activate(target, context = {}) {
    const selection = target?.item ? target : { item: target, disabled: false, disabledReason: null };
    const item = selection?.item;
    if (!item) return { ok: false, reason: 'No interaction selected' };
    const reason = selection.disabledReason || disabledReason(item, context);
    if (reason) return { ok: false, reason };
    if (item.inputMode === 'hold' && (context.heldMs || 0) < (item.holdMs || 350)) {
      return { ok: false, holding: true, remainingMs: (item.holdMs || 350) - (context.heldMs || 0) };
    }
    this.activations += 1;
    const result = await item.onInteract(context);
    return { ok: true, result };
  }

  snapshot() {
    const types = {};
    for (const item of this.items.values()) types[item.type] = (types[item.type] || 0) + 1;
    return Object.freeze({
      registered: this.items.size,
      types,
      activations: this.activations,
      lastSelection: this.lastSelection?.item?.id || null,
    });
  }
}
