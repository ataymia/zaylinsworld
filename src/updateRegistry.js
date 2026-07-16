// ───────────────────────────────────────────────────────────────────────────
// updateRegistry.js — central per-frame update registry.
//
// Accepts AnimationMixer wrappers and lightweight procedural drivers. Kept free
// of browser-only assets and JSON imports so character/animation logic remains
// directly unit-testable in Node.
// ───────────────────────────────────────────────────────────────────────────

const drivers = new Set();

export function trackMixer(driver) {
  if (driver && typeof driver.update === 'function') drivers.add(driver);
  return driver;
}

export function untrackMixer(driver) {
  return drivers.delete(driver);
}

export function updateMixers(dt) {
  for (const driver of [...drivers]) {
    if (driver.update(dt) === false) drivers.delete(driver);
  }
}

export function trackedMixerCount() {
  return drivers.size;
}

export function clearTrackedMixers() {
  drivers.clear();
}
