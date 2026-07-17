// Reusable DOM widgets for the Character Studio.
export const STUDIO_TABS = Object.freeze([
  ['body', 'Body'], ['face', 'Face'], ['skin', 'Skin & Eyes'], ['hair', 'Hair'],
  ['clothes', 'Clothes'], ['accessories', 'Accessories'], ['closet', 'Saved Looks'], ['city', 'City Vibe'],
]);

export const pickStudioItem = (list) => list[Math.floor(Math.random() * list.length)];

export function ensureClosetState(state) {
  if (!Array.isArray(state.savedOutfits)) state.savedOutfits = [];
  if (!state.ownedWardrobe || typeof state.ownedWardrobe !== 'object') state.ownedWardrobe = { freeStarterPack: true };
}

export function studioSection(title, subtitle = '') {
  const root = document.createElement('section'); root.className = 'zw-section';
  const head = document.createElement('div'); head.className = 'zw-section-title';
  const h = document.createElement('h3'); h.textContent = title; head.appendChild(h);
  if (subtitle) { const small = document.createElement('small'); small.textContent = subtitle; head.appendChild(small); }
  root.appendChild(head); return root;
}

export function studioItemCard(entry, active, onPick, options = {}) {
  const button = document.createElement('button'); button.type = 'button';
  button.className = `zw-item-card${active ? ' active' : ''}${entry.disabled ? ' disabled' : ''}`;
  if (options.image) {
    const thumb = document.createElement('div'); thumb.className = 'zw-item-thumb';
    thumb.style.backgroundImage = `linear-gradient(#0a0a161f,#0a0a161f),url("${options.image}")`; button.appendChild(thumb);
  } else if (options.swatch) {
    const dot = document.createElement('div'); dot.className = 'zw-color-dot'; dot.style.background = options.swatch; button.appendChild(dot);
  }
  const name = document.createElement('div'); name.className = 'zw-item-name'; name.textContent = entry.name; button.appendChild(name);
  const status = document.createElement('div'); status.className = 'zw-owned'; status.textContent = entry.disabled ? 'Coming later' : 'Owned'; button.appendChild(status);
  if (!entry.disabled) button.onclick = onPick;
  return button;
}

export function studioSlider(definition, value, onInput, onCommit) {
  const row = document.createElement('div'); row.className = 'zw-slider-row';
  const label = document.createElement('label'); label.textContent = definition.label;
  const input = document.createElement('input'); input.type = 'range'; input.min = definition.min; input.max = definition.max; input.step = definition.step; input.value = value;
  const output = document.createElement('span'); output.className = 'zw-slider-value';
  const format = (next) => definition.key === 'heightScale' ? `${Math.round(next * 100)}%` : `${Number(next) > 0 ? '+' : ''}${Number(next).toFixed(2)}`;
  output.textContent = format(value);
  input.oninput = () => { output.textContent = format(input.value); onInput(Number(input.value)); };
  input.onchange = () => onCommit(Number(input.value));
  row.append(label, input, output); return row;
}
