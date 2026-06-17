// ───────────────────────────────────────────────────────────────────────────
//  debug.js — live build/version proof, runtime debug panel + error overlay.
//
//  PURPOSE: prove, in the live game, whether each system actually initialised
//  and is wired — so "exists in code but not in gameplay" becomes visible
//  instead of silent. Toggle with F2 (or the on-screen 🛠 badge).
//
//   • Build identity: exact git commit + build time + version (injected by
//     Vite). On-screen commit ≠ deployed commit → cache/CDN problem; matches →
//     runtime problem.
//   • Live values (refreshed each frame): mode, area, player?, minimap
//     init/canvas/visible, building counts, furniture count, vehicle/GLB-traffic
//     counts, real vs procedural NPCs, UI-blocker flags, last key + which
//     handlers fired, inventory count, equipped weapon, monsterMode, monster
//     count, police count.
//   • Error overlay: window.onerror + onunhandledrejection → visible red box.
//   • Buttons: Map / Inventory / Wardrobe / Monster + teleports + Force update.
//   • window.__ZW_DEBUG__ exposes everything to the console.
// ───────────────────────────────────────────────────────────────────────────

const COMMIT = (typeof __BUILD_COMMIT__ !== 'undefined') ? __BUILD_COMMIT__ : 'dev';
const BUILD_TIME = (typeof __BUILD_TIME__ !== 'undefined') ? __BUILD_TIME__ : new Date().toISOString();
const APP_VERSION = (typeof __APP_VERSION__ !== 'undefined') ? __APP_VERSION__ : '0.0.0+dev';

// Static metrics, written once as systems load (debug.set / debug.incr).
const metrics = {
  swVersion: '—',
  manifestVersion: '—',
  minimapInit: false,
  worldBuildingsPlaced: 0,
  glbBuildings: 0,
  procBuildings: 0,
  interiorsFurnished: 0,
  furniturePlaced: 0,
  vehicleModels: 0,
  glbTraffic: 0,
  realNpcs: 0,
  procNpcs: 0,
  trafficLights: 0,
  stopSigns: 0,
  trashTargets: 0,
  policeCruisers: 0,
  handlersFired: { n: false, c: false, i: false, m: false },
  failedAssets: [],
};

// Live values, refreshed every frame from main.js via debug.update(live).
let live = {};
let logKeys = false;
let lastKey = '—';

let wrapEl = null, badgeEl = null, panelEl = null, bodyEl = null, errBox = null, expanded = false;
let _toggleApi = null;
let _refreshThrottle = 0;

export const debug = {
  commit: COMMIT,
  buildTime: BUILD_TIME,
  version: APP_VERSION,
  metrics,
  set(key, val) { metrics[key] = val; scheduleRefresh(); },
  incr(key, by = 1) { metrics[key] = (metrics[key] || 0) + by; scheduleRefresh(); },
  get(key) { return metrics[key]; },
  addFailedAsset(name) { if (!metrics.failedAssets.includes(name)) { metrics.failedAssets.push(name); scheduleRefresh(); } },
  markHandler(k) { if (k in metrics.handlersFired) metrics.handlersFired[k] = true; },
  update(obj) { live = obj || {}; if (expanded) scheduleRefresh(); },
  setKeyLogging(on) { logKeys = !!on; },
  keyLogging() { return logKeys; },
  logKey(k) { lastKey = k; if (logKeys) console.info('[key]', k); },
  toggle(force) { _toggleApi && _toggleApi(force); },
  showError,
  report() { const r = snapshot(); console.table(r); return r; },
};

function snapshot() {
  return { commit: COMMIT, build: BUILD_TIME, version: APP_VERSION, lastKey, ...metrics, ...live };
}

function fmtTime(iso) {
  try {
    return new Date(iso).toLocaleString(undefined,
      { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

const yn = (b) => (b ? '<span style="color:#4eff91">yes</span>' : '<span style="color:#ff7676">NO</span>');
const num = (n, warn) => `<span style="color:${warn && !n ? '#ff7676' : '#9fe8ff'}">${n ?? 0}</span>`;

function rows() {
  const hf = metrics.handlersFired;
  return [
    ['SECTION', 'BUILD'],
    ['Commit', `<b style="color:#e7c14a">${COMMIT}</b>`],
    ['Built', fmtTime(BUILD_TIME)],
    ['Version', APP_VERSION],
    ['SW / cache', metrics.swVersion],
    ['Manifest', metrics.manifestVersion],

    ['SECTION', 'RUNTIME'],
    ['mode', live.mode ?? '—'],
    ['area', live.area ?? '—'],
    ['player exists', yn(live.playerExists)],
    ['inCar', yn(live.inCar)],

    ['SECTION', 'MINIMAP'],
    ['initialized', yn(metrics.minimapInit)],
    ['canvas exists', yn(live.minimapCanvas)],
    ['visible', yn(live.minimapVisible)],

    ['SECTION', 'WORLD / ASSETS'],
    ['GLB buildings', num(metrics.glbBuildings, true)],
    ['procedural boxes', num(metrics.procBuildings)],
    ['interiors furnished', num(metrics.interiorsFurnished, true)],
    ['furniture pieces', num(metrics.furniturePlaced, true)],
    ['vehicle models', num(metrics.vehicleModels, true)],
    ['GLB traffic cars', num(metrics.glbTraffic, true)],
    ['NPCs (real assets)', num(metrics.realNpcs)],
    ['NPCs (procedural)', num(metrics.procNpcs)],
    ['prefab props', num(metrics.prefabProps)],
    ['prefab real assets', num(metrics.prefabAssets, true)],
    ['prefab fallbacks', num(metrics.prefabFallbacks)],
    ['prefab seed', metrics.prefabSeed != null ? String(metrics.prefabSeed) : '—'],
    ['breakable objects', num(metrics.breakableObjects)],
    ['world objects', num(metrics.worldObjects)],
    ['traffic lights', num(metrics.trafficLights, true)],
    ['stop signs', num(metrics.stopSigns, true)],
    ['trash targets', num(metrics.trashTargets)],
    ['police cruisers', num(metrics.policeCruisers, true)],
    ['failed assets', metrics.failedAssets.length
      ? `<span style="color:#ff7676">${metrics.failedAssets.join(', ')}</span>` : '<span style="color:#4eff91">none</span>'],

    ['SECTION', 'CHARACTER SKINS'],
    ...skinRows(),

    ['SECTION', 'UI BLOCKERS'],
    ['isUIOpen', yn(live.uiOpen)],
    ['isSettingsOpen', yn(live.settingsOpen)],
    ['eating', yn(live.eating)],
    ['hairGame', yn(live.hairGame)],
    ['builderOpen', yn(live.builderOpen)],

    ['SECTION', 'INPUT / COMBAT'],
    ['last key', `<b>${lastKey}</b>`],
    ['N·C·I·M fired', `${yn(hf.n)} ${yn(hf.c)} ${yn(hf.i)} ${yn(hf.m)}`],
    ['inventory count', num(live.inventoryCount)],
    ['equipped weapon', live.weapon ?? '—'],
    ['monsterMode', yn(live.monsterMode)],
    ['monsters', num(live.monsterCount)],
    ['police', num(live.policeCount)],
  ];
}

// Character-skin telemetry rows, read live from window.__ZW_SKIN_STATUS__
// (populated by avatarSkin.js). Shows GLB-vs-fallback per character class so the
// "skins not showing" state is visible in-game instead of silent.
function skinRows() {
  const s = (typeof window !== 'undefined' && window.__ZW_SKIN_STATUS__) || null;
  if (!s) return [['skins', '<span style="color:#8a8aa0">not loaded yet</span>']];
  const tag = (mode) => mode === 'glb'
    ? '<span style="color:#4eff91">GLB</span>'
    : (mode === 'pending' ? '<span style="color:#e7c14a">pending</span>' : '<span style="color:#ff7676">fallback</span>');
  const pr = s.player || {};
  return [
    ['player', `${tag(pr.mode)} ${pr.label ? '(' + pr.label + ')' : ''}${pr.reason ? ' — ' + pr.reason : ''}`],
    ['NPCs', `<span style="color:#4eff91">${s.npc.glb} GLB</span> / <span style="color:#ff7676">${s.npc.fallback} fallback</span>`],
    ['cops', `<span style="color:#4eff91">${s.cop.glb} GLB</span> / <span style="color:#ff7676">${s.cop.fallback} fallback</span>`],
    ['cop last', s.cop.last || '—'],
    ['npc last', s.npc.last || '—'],
  ];
}

function scheduleRefresh() {
  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  if (now - _refreshThrottle < 120) return;     // ~8 fps panel update
  _refreshThrottle = now;
  refresh();
}

function refresh() {
  if (badgeEl) badgeEl.textContent = `🛠 ${COMMIT}`;
  if (!expanded || !bodyEl) return;
  bodyEl.innerHTML = rows().map(([k, v]) => {
    if (k === 'SECTION') {
      return `<div style="margin:7px 0 3px;font-size:9px;letter-spacing:1.5px;color:#5a5a78;font-weight:800">${v}</div>`;
    }
    return '<div style="display:flex;justify-content:space-between;gap:14px;line-height:1.5">'
      + `<span style="color:#8a8aa0">${k}</span><span style="text-align:right">${v}</span></div>`;
  }).join('');
}

// ── runtime error overlay ─────────────────────────────────────────────────────
const seenErrors = new Set();
export function showError(msg) {
  if (typeof document === 'undefined') return;
  const text = String(msg);
  if (seenErrors.has(text)) return;
  seenErrors.add(text);
  if (!errBox) {
    errBox = document.createElement('div');
    errBox.id = 'debug-errbox';
    errBox.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:600;'
      + 'max-width:min(680px,92vw);max-height:40vh;overflow:auto;background:rgba(40,8,12,.95);'
      + 'border:1px solid #ff5a6a;border-radius:10px;padding:10px 14px 12px;color:#ffd9dd;'
      + 'font:600 12px/1.45 ui-monospace,Menlo,Consolas,monospace;box-shadow:0 8px 30px rgba(0,0,0,.6);';
    const head = document.createElement('div');
    head.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;';
    head.innerHTML = '<b style="color:#ff8893;letter-spacing:1px">⚠ RUNTIME ERROR</b>';
    const close = document.createElement('button');
    close.textContent = '✕';
    close.style.cssText = 'cursor:pointer;background:none;border:none;color:#ffb3ba;font-size:14px;';
    close.onclick = () => { errBox.style.display = 'none'; };
    head.appendChild(close);
    const list = document.createElement('div');
    list.id = 'debug-errlist';
    errBox.appendChild(head);
    errBox.appendChild(list);
    document.body.appendChild(errBox);
  }
  errBox.style.display = 'block';
  const list = errBox.querySelector('#debug-errlist');
  const row = document.createElement('div');
  row.style.cssText = 'padding:4px 0;border-top:1px solid rgba(255,90,106,.25);white-space:pre-wrap;word-break:break-word;';
  row.textContent = text;
  list.appendChild(row);
}

export function installErrorOverlay() {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (e) => {
    const m = e.error && e.error.stack ? e.error.stack : (e.message || 'unknown error');
    showError(m);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    const m = r && r.stack ? r.stack : (r && r.message ? r.message : String(r));
    showError('Unhandled promise rejection: ' + m);
  });
}

// ── badge + panel + buttons ───────────────────────────────────────────────────
// actions = { onForceUpdate, onMap, onInventory, onWardrobe, onMonster,
//             onTpGas, onTpDiner, onTpHome, onTpChicken }
export function initDebugBadge(actions = {}) {
  if (typeof document === 'undefined') return null;
  if (badgeEl) return _api();

  installErrorOverlay();

  wrapEl = document.createElement('div');
  wrapEl.id = 'debug-wrap';
  wrapEl.style.cssText = 'position:fixed;left:10px;bottom:10px;z-index:500;'
    + 'font-family:ui-monospace,Menlo,Consolas,monospace;';

  badgeEl = document.createElement('button');
  badgeEl.id = 'debug-badge';
  badgeEl.title = 'Build / debug panel — F2';
  badgeEl.style.cssText = 'pointer-events:auto;cursor:pointer;font:700 11px/1 ui-monospace,monospace;'
    + 'color:#cfe8ff;background:rgba(8,8,16,.78);border:1px solid rgba(255,255,255,.2);'
    + 'border-radius:8px;padding:5px 9px;letter-spacing:.4px;';
  badgeEl.onclick = () => toggle();

  panelEl = document.createElement('div');
  panelEl.id = 'debug-panel';
  panelEl.style.cssText = 'display:none;pointer-events:auto;margin-bottom:6px;width:262px;max-height:74vh;'
    + 'overflow:auto;background:rgba(8,8,16,.94);border:1px solid rgba(255,255,255,.2);'
    + 'border-radius:10px;padding:10px 12px;font-size:11px;color:#dcdcf0;box-shadow:0 8px 28px rgba(0,0,0,.55);';

  const title = document.createElement('div');
  title.textContent = 'BUILD / DEBUG  ·  F2';
  title.style.cssText = 'font-weight:800;letter-spacing:1.5px;color:#8a8aa0;font-size:9px;margin-bottom:4px;';

  bodyEl = document.createElement('div');
  bodyEl.style.cssText = 'display:flex;flex-direction:column;';

  const mkBtn = (label, fn, danger) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'cursor:pointer;font:700 10px ui-monospace,monospace;border-radius:7px;padding:6px 4px;'
      + `border:1px solid ${danger ? '#6b2c38' : '#33334a'};color:${danger ? '#ff9a9a' : '#cfe8ff'};`
      + `background:${danger ? '#2a1419' : '#1d1d2b'};`;
    b.onclick = (ev) => { ev.stopPropagation(); fn && fn(); };
    return b;
  };
  const grid = (btns) => {
    const g = document.createElement('div');
    g.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:7px;';
    btns.forEach((b) => g.appendChild(b));
    return g;
  };

  const tpLabel = document.createElement('div');
  tpLabel.textContent = 'TELEPORT';
  tpLabel.style.cssText = 'margin-top:9px;font-size:9px;letter-spacing:1.5px;color:#5a5a78;font-weight:800;';
  const tp = grid([
    mkBtn('→ Gas', actions.onTpGas),
    mkBtn('→ Diner', actions.onTpDiner),
    mkBtn('→ Home', actions.onTpHome),
    mkBtn('→ Chicken', actions.onTpChicken),
  ]);

  const sys = grid([
    mkBtn('Copy report', () => { try { navigator.clipboard.writeText(JSON.stringify(snapshot(), null, 2)); } catch { /* ignore */ } }),
    mkBtn('Force update', actions.onForceUpdate, true),
  ]);

  panelEl.appendChild(title);
  panelEl.appendChild(bodyEl);
  panelEl.appendChild(tpLabel);
  panelEl.appendChild(tp);
  panelEl.appendChild(sys);
  wrapEl.appendChild(panelEl);
  wrapEl.appendChild(badgeEl);
  document.body.appendChild(wrapEl);

  // ── always-visible backup buttons (work even if keyboard focus is weird) ──
  const dock = document.createElement('div');
  dock.id = 'ui-dock';
  dock.style.cssText = 'position:fixed;right:10px;bottom:64px;z-index:120;display:flex;flex-direction:column;'
    + 'gap:6px;pointer-events:none;';
  const dockBtn = (label, fn) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'pointer-events:auto;cursor:pointer;font:700 12px/1 system-ui,sans-serif;'
      + 'color:#eaf2ff;background:rgba(8,8,16,.74);border:1px solid rgba(255,255,255,.2);'
      + 'border-radius:10px;padding:8px 12px;min-width:120px;text-align:left;backdrop-filter:blur(6px);';
    b.onmouseenter = () => { b.style.borderColor = '#4eff91'; };
    b.onmouseleave = () => { b.style.borderColor = 'rgba(255,255,255,.2)'; };
    b.onclick = (ev) => { ev.stopPropagation(); fn && fn(); };
    return b;
  };
  dock.appendChild(dockBtn('🗺  Map (N)', actions.onMap));
  dock.appendChild(dockBtn('🎒  Inventory (I)', actions.onInventory));
  dock.appendChild(dockBtn('👕  Wardrobe (C)', actions.onWardrobe));
  dock.appendChild(dockBtn('👹  Monsters (M)', actions.onMonster));
  document.body.appendChild(dock);

  _toggleApi = toggle;
  refresh();

  console.info(`%c Zaylin's World ${APP_VERSION} `,
    'background:#4eff91;color:#06210f;font-weight:800;border-radius:4px',
    `\n  commit: ${COMMIT}\n  built:  ${BUILD_TIME}`);

  window.__ZW_DEBUG__ = {
    snapshot, report: () => debug.report(),
    metrics, get live() { return live; },
    commit: COMMIT, version: APP_VERSION, build: BUILD_TIME,
    toggle, showError,
    setKeyLogging: (on) => debug.setKeyLogging(on),
  };

  return _api();
}

function toggle(force) {
  expanded = (typeof force === 'boolean') ? force : !expanded;
  if (panelEl) panelEl.style.display = expanded ? 'block' : 'none';
  if (expanded) refresh();
}

function _api() { return { toggle, debug, showError }; }

export { COMMIT, BUILD_TIME, APP_VERSION };
