// ───────────────────────────────────────────────────────────────────────────
//  interaction.js — central interaction manager
//  Detects nearby interactables, shows ONE prompt for the nearest functional
//  one, and triggers its action on the correct key. Never shows a prompt for a
//  nonfunctional object (every registered item MUST have a working onInteract).
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';

/**
 * An Interactable:
 * {
 *   id:        unique string
 *   area:      'city' | interiorId        (which area it lives in)
 *   key:       'e' | 'f' | ...            (key that triggers it)
 *   radius:    activation distance
 *   getPosition: () => THREE.Vector3
 *   getPrompt:   () => string             (text WITHOUT the key badge)
 *   enabled?:    () => boolean            (optional gate)
 *   onInteract:  () => void               (REQUIRED, must do something real)
 * }
 */
export class InteractionManager {
  constructor() {
    this.items = new Map();
    this._tmp = new THREE.Vector3();
  }

  register(item) {
    if (typeof item.onInteract !== 'function') {
      throw new Error(`Interactable "${item.id}" has no onInteract — refusing to show a fake prompt.`);
    }
    this.items.set(item.id, item);
    return item;
  }

  unregister(id) { this.items.delete(id); }
  clear() { this.items.clear(); }

  // Find the nearest active interactable to the player in the current area.
  findNearest(playerPos, area) {
    let best = null;
    let bestDist = Infinity;
    for (const it of this.items.values()) {
      if (it.area && it.area !== area) continue;
      if (it.enabled && !it.enabled()) continue;
      const pos = it.getPosition();
      const d = pos.distanceTo(playerPos);
      const r = it.radius ?? 2.6;
      if (d <= r && d < bestDist) { bestDist = d; best = it; }
    }
    return best;
  }
}
