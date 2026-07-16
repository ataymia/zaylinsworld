// ───────────────────────────────────────────────────────────────────────────
// ui.js — HUD, character studio, dialogue, shop menus, chain builder
// ───────────────────────────────────────────────────────────────────────────
import { mountCharacterStudio, setCharacterStudioVisible } from './characterStudio.js';

export const SERVERS = [
  { id: 'sunside',  name: 'Sunside',  vibe: 'Bright, busy daytime city' },
  { id: 'midnight', name: 'Midnight', vibe: 'Neon nightlife after dark' },
  { id: 'lowkey',   name: 'Lowkey',   vibe: 'Chill, quiet streets' },
];

const $ = id => document.getElementById(id);
let uiOpen = false;
let activeMenu = null;
let onCloseCb = null;
let creatorStudio = null;
export function isUIOpen() { return uiOpen; }
export function onMenuClose(cb) { onCloseCb = cb; }

function openMenu(id) {
  document.exitPointerLock?.();
  ['dialogue', 'shop', 'builder'].forEach(m => { if (m !== id) $(m).classList.add('hidden'); });
  $(id).classList.remove('hidden');
  uiOpen = true; activeMenu = id;
}
export function closeMenus() {
  ['dialogue', 'shop', 'builder'].forEach(id => $(id).classList.add('hidden'));
  const wasOpen = uiOpen;
  uiOpen = false; activeMenu = null;
  if (wasOpen && onCloseCb) onCloseCb();
}
window.addEventListener('keydown', e => {
  if (e.key === 'Escape' && uiOpen) { e.preventDefault(); closeMenus(); }
});

// ── Character studio ─────────────────────────────────────────────────────────
export function buildCreator(state, handlers) {
  creatorStudio = mountCharacterStudio(state, handlers);
  $('creator-enter').onclick = handlers.onEnter;
  const cont = $('creator-continue');
  if (handlers.hasSave) { cont.style.display = ''; cont.onclick = handlers.onContinue; }
  else cont.style.display = 'none';
  $('creator-reset').onclick = handlers.onReset;
}
export function showCreator(show) {
  $('creator').classList.toggle('hidden', !show);
  setCharacterStudioVisible(show);
}

// ── HUD ──────────────────────────────────────────────────────────────────────
const STAT_COLORS = { health: '#ff5a5a', energy: '#4eff91', hunger: '#ffb14e', fitness: '#4ec3ff',
  smarts: '#c98aff', hygiene: '#7affd1', fun: '#ff7ab0' };
export function updateHUD(state, locationLabel) {
  $('money-box').textContent = '$' + Math.floor(state.money).toLocaleString();
  const hh = String(Math.floor(state.timeMin / 60) % 24).padStart(2, '0');
  const mm = String(Math.floor(state.timeMin % 60)).padStart(2, '0');
  $('time-box').textContent = `Day ${state.day}  ${hh}:${mm}`;
  $('loc-box').textContent = locationLabel;
  $('job-box').textContent = state.job;
  let stars = '';
  for (let i = 0; i < 5; i++) stars += i < state.wanted ? '★' : '☆';
  $('wanted-stars').textContent = stars;
  $('wanted-stars').style.color = state.wanted > 0 ? '#ff5a5a' : '#666';
  const bars = $('stat-bars');
  if (!bars.dataset.built) {
    bars.innerHTML = '';
    Object.keys(state.stats).forEach(k => {
      const row = document.createElement('div'); row.className = 'sbar';
      row.innerHTML = `<span style="width:54px;text-transform:capitalize">${k}</span>
        <span class="sbar-track"><span class="sbar-fill" id="sf-${k}"></span></span>
        <span class="sbar-num" id="sn-${k}">0</span>`;
      bars.appendChild(row);
    });
    bars.dataset.built = '1';
  }
  Object.entries(state.stats).forEach(([k, v]) => {
    const val = Math.max(0, Math.min(100, Math.round(v)));
    const fill = $('sf-' + k);
    if (fill) { fill.style.width = val + '%'; fill.style.background = STAT_COLORS[k]; }
    const num = $('sn-' + k);
    if (num) num.textContent = val;
  });
  $('monster-badge').style.display = state.monsterMode ? '' : 'none';
}

// ── car HUD ──────────────────────────────────────────────────────────────────
let _carHudBuilt = false;
export function updateCarHUD(info) {
  const el = $('car-hud');
  if (!el) return;
  if (!info || !info.visible) { el.style.display = 'none'; return; }
  if (!_carHudBuilt) {
    el.innerHTML = `
      <div class="ch-item"><span class="ch-label">Speed</span><span class="ch-val" id="ch-speed">0</span></div>
      <div class="ch-item"><span class="ch-label" id="ch-fuel-label">Fuel</span>
        <span class="ch-bar"><span class="ch-fill" id="ch-fuel"></span></span>
        <span class="ch-sub" id="ch-fuel-pct">100%</span></div>
      <div class="ch-item"><span class="ch-label">Damage</span><span class="ch-val" id="ch-dmg">0%</span>
        <span class="ch-sub" id="ch-dmg-state"></span></div>`;
    _carHudBuilt = true;
  }
  el.style.display = '';
  const fuel = Math.max(0, Math.min(100, info.fuel ?? 100));
  $('ch-speed').textContent = Math.round(info.speed || 0);
  const fill = $('ch-fuel');
  fill.style.width = fuel + '%';
  fill.style.background = fuel <= 0 ? '#ff5a5a' : fuel < 15 ? '#ff5a5a' : fuel < 35 ? '#ffb14e' : '#4eff91';
  el.classList.toggle('ch-empty', fuel <= 0);
  const pct = $('ch-fuel-pct');
  if (pct) { pct.textContent = Math.round(fuel) + '%'; pct.classList.toggle('ch-warn', fuel < 15); }
  const fl = $('ch-fuel-label');
  if (fl) fl.textContent = fuel <= 0 ? 'Out of gas' : fuel < 15 ? 'Fuel ⚠' : 'Fuel';
  const dmg = Math.round(info.damage || 0);
  $('ch-dmg').textContent = dmg + '%';
  const ds = $('ch-dmg-state');
  if (ds) {
    const label = dmg >= 100 ? 'TOTALED' : dmg >= 80 ? 'critical' : dmg >= 50 ? 'smoking' : dmg >= 20 ? 'dented' : 'clean';
    ds.textContent = label; ds.classList.toggle('ch-warn', dmg >= 50);
  }
}

// ── prompt + notifications ───────────────────────────────────────────────────
export function showPrompt(html, key) {
  const p = $('prompt');
  if (html) { p.innerHTML = key ? `<span class="key">${key.toUpperCase()}</span>${html}` : html; p.style.display = ''; }
  else p.style.display = 'none';
}
let notifTimer;
export function notify(text) {
  const n = $('notif'); n.textContent = text; n.style.opacity = '1';
  clearTimeout(notifTimer); notifTimer = setTimeout(() => { n.style.opacity = '0'; }, 2600);
}

// ── dialogue ─────────────────────────────────────────────────────────────────
export function openDialogue(opts) {
  $('dia-name').textContent = opts.name || '';
  $('dia-text').textContent = opts.text || '';
  const wrap = $('dia-choices'); wrap.innerHTML = '';
  const choices = (opts.choices && opts.choices.length) ? opts.choices : [{ label: 'Later.', onPick: () => closeMenus() }];
  choices.forEach(ch => {
    const b = document.createElement('button'); b.className = 'dchoice'; b.textContent = ch.label;
    b.onclick = () => {
      const beforeName = $('dia-name').textContent;
      const beforeText = $('dia-text').textContent;
      const next = ch.onPick?.();
      if (next && typeof next === 'object') openDialogue(next);
      else if (next === 'keep') return;
      else if (activeMenu === 'dialogue' && ($('dia-name').textContent !== beforeName || $('dia-text').textContent !== beforeText)) return;
      else closeMenus();
    };
    wrap.appendChild(b);
  });
  openMenu('dialogue');
}

// ── generic shop ─────────────────────────────────────────────────────────────
export function openShop(opts) {
  $('shop-title').textContent = opts.title;
  $('shop-sub').textContent = opts.sub || '';
  const tabbed = Array.isArray(opts.tabs) && opts.tabs.length > 0;
  let activeTab = tabbed ? opts.tabs[0].id : null;
  const tabsEl = $('shop-tabs');
  const renderTabs = () => {
    if (!tabsEl) return;
    if (!tabbed) { tabsEl.style.display = 'none'; tabsEl.innerHTML = ''; return; }
    tabsEl.style.display = ''; tabsEl.innerHTML = '';
    opts.tabs.forEach(t => {
      const b = document.createElement('button'); b.className = 'stab' + (t.id === activeTab ? ' active' : ''); b.textContent = t.label;
      b.onclick = () => { activeTab = t.id; render(); }; tabsEl.appendChild(b);
    });
  };
  const render = () => {
    $('shop-money').textContent = '$' + Math.floor(opts.getMoney()).toLocaleString();
    renderTabs();
    const items = tabbed ? (opts.getItems(activeTab) || []) : opts.items;
    const grid = $('shop-grid'); grid.innerHTML = '';
    if (!items.length) {
      const empty = document.createElement('div'); empty.className = 'cinfo'; empty.style.opacity = '.7'; empty.textContent = opts.emptyText || 'Nothing here yet.'; grid.appendChild(empty); return;
    }
    items.forEach(item => {
      const card = document.createElement('div'); card.className = 'card';
      card.innerHTML = `<div class="cname">${item.name}</div>` + (item.tag ? `<div class="ctag">${item.tag}</div>` : '') +
        `<div class="cinfo">${item.info || ''}</div>` + (item.stats ? `<div class="cstats">${item.stats}</div>` : '') +
        (item.price != null ? `<div class="cprice">$${item.price.toLocaleString()}</div>` : '');
      const btn = document.createElement('button');
      if (item.owned) {
        btn.className = 'btn secondary'; btn.textContent = item.ownedLabel || 'Owned ✓'; btn.disabled = !item.action;
        if (item.action) { btn.className = 'btn'; btn.textContent = item.action; btn.disabled = false; btn.onclick = () => { if (opts.onBuy(item)) render(); }; }
      } else if (item.disabled) { btn.className = 'btn secondary'; btn.textContent = item.disabledLabel || 'Unavailable'; btn.disabled = true; }
      else if (item.price != null && opts.getMoney() < item.price) { btn.className = 'btn secondary'; btn.textContent = 'Need more $'; btn.disabled = true; }
      else { btn.className = 'btn'; btn.textContent = item.action || 'Buy'; btn.onclick = () => { if (opts.onBuy(item)) render(); }; }
      card.appendChild(btn); grid.appendChild(card);
    });
  };
  render(); $('shop-close').onclick = () => closeMenus(); openMenu('shop');
}

// ── chain builder ────────────────────────────────────────────────────────────
export function openChainBuilder(opts) {
  const sel = { chain: opts.chains[0], pendant: opts.pendants[0], material: opts.materials[0] };
  const root = $('builder-opts');
  const total = () => Math.round((sel.chain.price + sel.pendant.price) * sel.material.mult);
  function group(label, list, key) {
    const wrap = document.createElement('div'); wrap.className = 'opt-row'; wrap.innerHTML = `<div class="opt-label">${label}</div>`;
    const chips = document.createElement('div'); chips.className = 'opt-chips';
    list.forEach(item => {
      const chip = document.createElement('button'); chip.className = 'chip';
      chip.textContent = `${item.name}  ($${item.price ? item.price.toLocaleString() : (item.mult + 'x')})`;
      if (sel[key].id === item.id) chip.classList.add('active');
      chip.onclick = () => { sel[key] = item; chips.querySelectorAll('.chip').forEach(c => c.classList.remove('active')); chip.classList.add('active'); refresh(); };
      chips.appendChild(chip);
    });
    wrap.appendChild(chips); return wrap;
  }
  function refresh() {
    $('builder-money').textContent = '$' + Math.floor(opts.getMoney()).toLocaleString();
    $('builder-price').textContent = '$' + total().toLocaleString();
    const buyBtn = $('builder-buy'); buyBtn.disabled = opts.getMoney() < total();
    buyBtn.textContent = opts.getMoney() < total() ? 'Need more $' : 'Buy & Wear';
    opts.onChange?.(sel, total());
  }
  root.innerHTML = '';
  root.appendChild(group('Chain', opts.chains, 'chain'));
  root.appendChild(group('Pendant', opts.pendants, 'pendant'));
  root.appendChild(group('Material / Ice', opts.materials, 'material'));
  $('builder-buy').onclick = () => { if (opts.onBuy(sel, total())) refresh(); };
  $('builder-close').onclick = () => closeMenus();
  refresh(); openMenu('builder');
}
