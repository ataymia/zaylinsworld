// ─────────────────────────────────────────────────────────────────────────────
// skinPalette.js — inclusive player skin-tone palette.
//
// Tone IDs are stable save-data contracts. Darker tones intentionally receive
// less white lift when multiplied over the source skin texture, so selecting a
// deep tone remains visibly deep in both Character Studio and gameplay.
// ─────────────────────────────────────────────────────────────────────────────

const tone = (id, name, color, textureLift, nailBlend, undertone) => Object.freeze({
  id,
  name,
  color,
  textureLift,
  nailBlend,
  undertone,
});

export const PLAYER_SKIN_TONES = Object.freeze([
  tone('obsidian',    'Obsidian',      '#120a07', 0.015, 0.20, 'neutral'),
  tone('blue-ebony',  'Blue Ebony',    '#1b0e0b', 0.020, 0.21, 'cool'),
  tone('deep-ebony',  'Deep Ebony',    '#25130d', 0.025, 0.22, 'neutral'),
  tone('ebony',       'Ebony',         '#321b12', 0.035, 0.24, 'warm'),
  tone('espresso',    'Espresso',      '#412316', 0.045, 0.26, 'neutral'),
  tone('mahogany',    'Mahogany',      '#512d1c', 0.055, 0.28, 'red'),
  tone('dark-chestnut','Dark Chestnut','#603621', 0.065, 0.30, 'warm'),
  tone('chestnut',    'Chestnut',      '#704229', 0.075, 0.32, 'warm'),
  tone('deep-umber',  'Deep Umber',    '#7b492d', 0.085, 0.34, 'neutral'),
  tone('umber',       'Umber',         '#895638', 0.095, 0.36, 'warm'),
  tone('sienna',      'Sienna',        '#986344', 0.105, 0.38, 'red'),
  tone('caramel',     'Caramel',       '#a8734f', 0.120, 0.40, 'golden'),
  tone('honey',       'Honey',         '#b9855d', 0.135, 0.42, 'golden'),
  tone('amber',       'Amber',         '#c4936c', 0.150, 0.44, 'warm'),
  tone('golden-tan',  'Golden Tan',    '#d0a17a', 0.165, 0.46, 'golden'),
  tone('sand',        'Sand',          '#dab08b', 0.180, 0.48, 'neutral'),
  tone('tan',         'Tan',           '#e1ba98', 0.195, 0.50, 'warm'),
  tone('light',       'Light',         '#e8c6a8', 0.210, 0.52, 'neutral'),
  tone('fair',        'Fair',          '#efd2ba', 0.225, 0.54, 'cool'),
  tone('porcelain',   'Porcelain',     '#f3ddca', 0.240, 0.56, 'cool'),
]);

const BY_ID = new Map(PLAYER_SKIN_TONES.map((entry) => [entry.id, entry]));

export function playerSkinTone(id, fallbackId = 'umber') {
  return BY_ID.get(id) || BY_ID.get(fallbackId) || PLAYER_SKIN_TONES[0];
}

export function isPlayerSkinTone(id) {
  return BY_ID.has(id);
}
