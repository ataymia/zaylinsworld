// ───────────────────────────────────────────────────────────────────────────
//  settings.js — the in-game Graphics / Settings menu UI.
//
//  Self-contained: it injects its own gear button (top-right), overlay panel,
//  and styles, then drives the `graphics` settings model. Opening it pauses the
//  pointer lock; closing returns control to the game. Defaults to "Auto".
// ───────────────────────────────────────────────────────────────────────────
import { graphics, PRESETS, OPTION_DIMENSIONS } from './graphics.js';

const PRESET_ORDER = [
  { mode: 'low', label: 'Low' },
  { mode: 'medium', label: 'Medium' },
  { mode: 'high', label: 'High' },
  { mode: 'auto', label: 'Auto' },
];

let built = false;
let onOpenCb = null, onCloseCb = null;
let overlay = null;

function injectStyles() {
  if (document.getElementById('settings-styles')) return;
  const css = `
  #settings-gear{position:fixed;top:10px;right:14px;z-index:55;width:40px;height:40px;
    border-radius:12px;background:rgba(8,8,16,.62);border:1px solid rgba(255,255,255,.18);
    color:#dcdcf0;font-size:20px;cursor:pointer;backdrop-filter:blur(6px);pointer-events:auto;
    display:flex;align-items:center;justify-content:center;transition:.15s;}
  #settings-gear:hover{border-color:#5a5a80;transform:rotate(35deg);}
  #settings-screen{position:fixed;inset:0;z-index:240;background:rgba(4,4,10,.92);
    display:flex;align-items:center;justify-content:center;}
  #settings-screen.hidden{display:none;}
  #settings-screen .panel{background:#15151f;border:1px solid #33334a;border-radius:18px;
    padding:22px 26px;width:min(720px,94vw);max-height:92vh;overflow:hidden;display:flex;flex-direction:column;}
  #settings-screen h1{font-size:24px;margin-bottom:2px;}
  #settings-screen .sub{color:#9a9ab0;font-size:13px;margin-bottom:16px;}
  #settings-presets{display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap;}
  .sp-btn{flex:1;min-width:90px;background:#1d1d2b;border:1px solid #33334a;color:#dcdcf0;
    border-radius:12px;padding:12px 10px;font-size:15px;font-weight:700;cursor:pointer;transition:.15s;}
  .sp-btn:hover{border-color:#5a5a80;}
  .sp-btn.active{background:#4eff91;color:#06210f;border-color:#4eff91;}
  .sp-btn small{display:block;font-weight:500;opacity:.7;font-size:10px;margin-top:2px;}
  #settings-options{overflow-y:auto;padding-right:6px;display:flex;flex-direction:column;gap:12px;}
  .set-row{display:flex;align-items:center;justify-content:space-between;gap:12px;
    background:#1a1a26;border:1px solid #2a2a3c;border-radius:12px;padding:10px 14px;}
  .set-row .rl{font-size:13px;color:#cfcfe6;}
  .set-steps{display:flex;gap:5px;flex-wrap:wrap;}
  .set-step{background:#22223a;border:1px solid #33334a;color:#cfcfe6;border-radius:8px;
    padding:5px 11px;font-size:12px;cursor:pointer;transition:.12s;}
  .set-step:hover{border-color:#5a5a80;}
  .set-step.active{background:#9fe8ff;color:#062029;border-color:#9fe8ff;font-weight:700;}
  #settings-foot{display:flex;justify-content:space-between;align-items:center;margin-top:16px;gap:10px;}
  #settings-fps{font-size:12px;color:#8a8aa0;}
  #settings-close{background:#4eff91;color:#06210f;border:none;border-radius:12px;
    padding:11px 26px;font-size:15px;font-weight:800;cursor:pointer;}
  `;
  const s = document.createElement('style');
  s.id = 'settings-styles'; s.textContent = css;
  document.head.appendChild(s);
}

function buildPresetRow() {
  const wrap = document.getElementById('settings-presets');
  wrap.innerHTML = '';
  const effective = graphics.effectivePreset();
  PRESET_ORDER.forEach(({ mode, label }) => {
    const b = document.createElement('button');
    b.className = 'sp-btn';
    const isActive = graphics.mode === mode ||
      (graphics.mode === 'auto' && mode === 'auto');
    if (isActive) b.classList.add('active');
    const sub = mode === 'auto'
      ? `detected: ${PRESETS[graphics.autoResolved].label}`
      : '';
    b.innerHTML = `${label}${sub ? `<small>${sub}</small>` : ''}`;
    b.onclick = () => { graphics.setPreset(mode); rebuild(); };
    wrap.appendChild(b);
  });
  void effective;
}

function buildOptions() {
  const wrap = document.getElementById('settings-options');
  wrap.innerHTML = '';
  Object.entries(OPTION_DIMENSIONS).forEach(([dim, def]) => {
    const row = document.createElement('div'); row.className = 'set-row';
    const label = document.createElement('div'); label.className = 'rl'; label.textContent = def.label;
    const steps = document.createElement('div'); steps.className = 'set-steps';
    const current = graphics.optionIndex(dim);
    def.steps.forEach((stepLabel, i) => {
      const s = document.createElement('button'); s.className = 'set-step';
      if (i === current) s.classList.add('active');
      s.textContent = stepLabel;
      s.onclick = () => { graphics.setOption(dim, i); rebuild(); };
      steps.appendChild(s);
    });
    row.appendChild(label); row.appendChild(steps); wrap.appendChild(row);
  });
}

function rebuild() {
  buildPresetRow();
  buildOptions();
}

export function initSettingsMenu({ onOpen, onClose } = {}) {
  onOpenCb = onOpen; onCloseCb = onClose;
  if (built) return;
  injectStyles();

  const gear = document.createElement('button');
  gear.id = 'settings-gear'; gear.title = 'Graphics & Settings'; gear.textContent = '⚙';
  gear.onclick = () => openSettings();
  document.body.appendChild(gear);

  overlay = document.createElement('div');
  overlay.id = 'settings-screen'; overlay.className = 'hidden';
  overlay.innerHTML = `
    <div class="panel">
      <h1>Graphics &amp; Performance</h1>
      <div class="sub">Pick a preset, or fine-tune below. Lower settings = smoother on slower laptops.</div>
      <div id="settings-presets"></div>
      <div id="settings-options"></div>
      <div id="settings-foot">
        <div id="settings-fps">FPS: —</div>
        <button id="settings-close">Done</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#settings-close').onclick = () => closeSettings();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSettings(); });

  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'o' && !isSettingsOpen() &&
        !document.querySelector('.screen:not(.hidden)')) {
      openSettings();
    } else if (e.key === 'Escape' && isSettingsOpen()) {
      e.preventDefault(); e.stopPropagation(); closeSettings();
    }
  }, true);

  built = true;
}

export function isSettingsOpen() {
  return overlay && !overlay.classList.contains('hidden');
}

export function openSettings() {
  if (!overlay) return;
  document.exitPointerLock?.();
  rebuild();
  overlay.classList.remove('hidden');
  onOpenCb?.();
}

export function closeSettings() {
  if (!overlay) return;
  overlay.classList.add('hidden');
  onCloseCb?.();
}

// Live FPS readout while the menu is open (cheap, only ticks when visible).
let _frames = 0, _last = performance.now();
export function settingsTickFPS() {
  if (!isSettingsOpen()) return;
  _frames++;
  const now = performance.now();
  if (now - _last >= 500) {
    const fps = Math.round((_frames * 1000) / (now - _last));
    const el = document.getElementById('settings-fps');
    if (el) el.textContent = `FPS: ${fps}`;
    _frames = 0; _last = now;
  }
}
