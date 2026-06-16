// ───────────────────────────────────────────────────────────────────────────
//  weaponCatalog.js — the SINGLE, SCALABLE source of truth for every weapon,
//  melee tool, ammo type and shop entry in Block Supply.
//
//  Adding a new weapon = adding ONE entry here (plus, optionally, a transform
//  override in weaponTransforms.js and an upgrade list). No game-logic edits in
//  main.js are required. The shop, inventory, hand model, ammo and upgrade
//  systems all read from this catalog, so the store scales to dozens of weapons.
//
//  SAFETY: names are fictional/stylized arcade items. No real brands, no real
//  ammo specs, no instructional content.
//
//  ── How assets resolve ──
//  `asset.pack` + `asset.name` feed loadAsset('weapons', pack, name) (substring
//  match against asset-index-v2.json). If the asset is missing/fails, the weapon
//  still works with a procedural placeholder mesh — the catalog never crashes.
// ───────────────────────────────────────────────────────────────────────────

// Ammo types — buying "Light Ammo" tops up the shared reserve for EVERY weapon
// that uses light ammo, so multiple pistols share a pool (scales cleanly).
export const AMMO_TYPES = {
  light:     { id: 'light',     name: 'Light Ammo',     price: 30,  amount: 48, desc: 'Compact rounds for sidearms.' },
  compact:   { id: 'compact',   name: 'Compact Ammo',   price: 55,  amount: 90, desc: 'Rapid-feed rounds for compact autos.' },
  long:      { id: 'long',      name: 'Long Ammo',      price: 80,  amount: 90, desc: 'Full-size rounds for rifles.' },
  shells:    { id: 'shells',    name: 'Shells',         price: 70,  amount: 24, desc: 'Scatter shells for street sweepers.' },
  precision: { id: 'precision', name: 'Precision Ammo', price: 120, amount: 20, desc: 'Match-grade rounds for long shots.' },
  rocket:    { id: 'rocket',    name: 'Rocket Rounds',  price: 400, amount: 4,  desc: 'High-yield arcade rockets.' },
};

// Category metadata — drives the Block Supply tabs + display walls. Add a new
// category here and the shop picks it up automatically.
export const CATEGORIES = [
  { id: 'pistols',   name: 'Pistols',          tab: 'Weapons', wall: 'pistol-wall' },
  { id: 'compact',   name: 'Compact',          tab: 'Weapons', wall: 'long-wall' },
  { id: 'rifles',    name: 'Rifles',           tab: 'Weapons', wall: 'long-wall' },
  { id: 'shotguns',  name: 'Shotguns',         tab: 'Weapons', wall: 'long-wall' },
  { id: 'precision', name: 'Precision',        tab: 'Weapons', wall: 'long-wall' },
  { id: 'heavy',     name: 'Heavy',            tab: 'Weapons', wall: 'featured' },
  { id: 'melee',     name: 'Melee',            tab: 'Melee',   wall: 'melee-rack' },
  { id: 'tools',     name: 'Tools & Gear',     tab: 'Melee',   wall: 'melee-rack' },
];

// ── The catalog ────────────────────────────────────────────────────────────────
// Every entry is self-describing. `melee:true` items use swing/close-range logic;
// ranged items use the ammoType pool. `upgrades` lists supported upgrade ids
// (see weaponUpgrades.js). `display` = which wall zone it racks on.
export const WEAPON_CATALOG = [
  // fists are always owned; no asset, no ammo.
  {
    id: 'fists', name: 'Fists', category: 'melee', melee: true, price: 0, ammoType: null,
    mag: Infinity, reserve: Infinity, rpm: 120, dmg: 10, pellets: 1, spread: 0, reload: 0, range: 2.4,
    icon: '👊', asset: null, upgrades: [], display: null, alwaysOwned: true,
    desc: 'Your bare hands. Always ready.',
  },

  // ── PISTOLS ──
  {
    id: 'pistol_shortline', name: 'Shortline Pistol', category: 'pistols', price: 450, ammoType: 'light',
    mag: 12, reserve: 48, rpm: 360, dmg: 18, pellets: 1, spread: 0.012, reload: 1.3, range: 60, auto: false,
    icon: '🔫', asset: { pack: 'styloo', name: 'pew' }, slot: 'pistol',
    upgrades: ['ext_mag', 'laser_sight', 'fast_trigger', 'quick_reload', 'skin_finish'],
    display: 'pistol-wall', desc: 'Reliable everyday sidearm. Light ammo.',
  },

  // ── COMPACT (SMG-style) ──
  {
    id: 'compact_corner', name: 'Corner Compact', category: 'compact', price: 1800, ammoType: 'compact',
    mag: 30, reserve: 120, rpm: 900, dmg: 14, pellets: 1, spread: 0.04, reload: 1.8, range: 55, auto: true,
    icon: '🔫', asset: { pack: 'styloo', name: 'mac10' }, slot: 'smg',
    upgrades: ['ext_mag', 'stability', 'fast_trigger', 'recoil_ctrl', 'skin_finish'],
    display: 'long-wall', desc: 'Fast full-auto spray. Compact ammo.',
  },

  // ── RIFLES (two assets to prove the catalog scales past one-per-type) ──
  {
    id: 'rifle_blockside', name: 'Blockside Rifle', category: 'rifles', price: 3600, ammoType: 'long',
    mag: 30, reserve: 120, rpm: 600, dmg: 26, pellets: 1, spread: 0.02, reload: 2.2, range: 90, auto: true,
    icon: '🔫', asset: { pack: 'styloo', name: 'ak47' }, slot: 'rifle',
    upgrades: ['scope', 'stability', 'ext_mag', 'recoil_ctrl', 'dmg_tune', 'skin_finish'],
    display: 'long-wall', desc: 'All-round automatic rifle. Long ammo.',
  },
  {
    id: 'rifle_ridge', name: 'Ridge Rifle', category: 'rifles', price: 4200, ammoType: 'long',
    mag: 35, reserve: 140, rpm: 660, dmg: 24, pellets: 1, spread: 0.018, reload: 2.0, range: 95, auto: true,
    icon: '🔫', asset: { pack: 'styloo', name: 'ak47variant' }, slot: 'rifle',
    upgrades: ['scope', 'stability', 'ext_mag', 'recoil_ctrl', 'heavy_barrel', 'skin_finish'],
    display: 'long-wall', desc: 'Higher-capacity rifle variant. Long ammo.',
  },

  // ── SHOTGUNS ──
  {
    id: 'shotgun_sweeper', name: 'Street Sweeper', category: 'shotguns', price: 2400, ammoType: 'shells',
    mag: 6, reserve: 24, rpm: 80, dmg: 12, pellets: 8, spread: 0.10, reload: 2.6, range: 28, auto: false,
    icon: '🔫', asset: { pack: 'styloo', name: 'shotgun' }, slot: 'shotgun',
    upgrades: ['quick_reload', 'tight_choke', 'heavy_barrel', 'skin_finish'],
    display: 'long-wall', desc: 'Close-range scatter blaster. Shells.',
  },

  // ── PRECISION ──
  {
    id: 'precision_scope', name: 'Precision Scope Tool', category: 'precision', price: 7800, ammoType: 'precision',
    mag: 5, reserve: 20, rpm: 45, dmg: 95, pellets: 1, spread: 0.0, reload: 3.0, range: 220, auto: false,
    icon: '🎯', asset: { pack: 'styloo', name: 'awp' }, slot: 'sniper',
    upgrades: ['scope', 'stability', 'precision', 'quick_reload', 'skin_finish'],
    display: 'featured', desc: 'Long-range precision tool. Precision ammo.', scoped: true,
  },

  // ── HEAVY ──
  {
    id: 'rocket_blast', name: 'Blast Tube', category: 'heavy', price: 16000, ammoType: 'rocket',
    mag: 1, reserve: 5, rpm: 30, dmg: 140, pellets: 1, spread: 0.0, reload: 3.6, range: 160, auto: false, splash: 6,
    icon: '🚀', asset: { pack: 'styloo', name: 'rocketlaucher' }, slot: 'rocket',
    upgrades: ['quick_reload', 'dmg_tune', 'skin_finish'],
    display: 'featured', desc: 'Arcade rocket launcher. Rocket rounds.',
  },

  // ── MELEE (procedural meshes built in weapons.js; board GLB optional) ──
  {
    id: 'bat_bolt', name: 'Bolt Bat', category: 'melee', melee: true, price: 200, ammoType: null,
    mag: Infinity, reserve: Infinity, rpm: 95, dmg: 24, pellets: 1, spread: 0, reload: 0, range: 2.6,
    icon: '🏏', asset: null, shape: 'bat',
    upgrades: ['grip_wrap', 'swing_speed', 'impact_boost', 'skin_finish'],
    display: 'melee-rack', desc: 'Solid swinger. Reaches a little further.',
  },
  {
    id: 'pipe_iron', name: 'Iron Pipe', category: 'melee', melee: true, price: 150, ammoType: null,
    mag: Infinity, reserve: Infinity, rpm: 80, dmg: 28, pellets: 1, spread: 0, reload: 0, range: 2.4,
    icon: '🪈', asset: null, shape: 'pipe',
    upgrades: ['grip_wrap', 'swing_speed', 'impact_boost'],
    display: 'melee-rack', desc: 'Heavy metal pipe. Hits hard.',
  },
  {
    id: 'wrench_work', name: 'Work Wrench', category: 'tools', melee: true, price: 120, ammoType: null,
    mag: Infinity, reserve: Infinity, rpm: 78, dmg: 26, pellets: 1, spread: 0, reload: 0, range: 2.2,
    icon: '🔧', asset: null, shape: 'wrench',
    upgrades: ['grip_wrap', 'swing_speed'],
    display: 'melee-rack', desc: 'A worker tool that doubles as a bonker.',
  },
  {
    id: 'plank_bonker', name: 'Block Plank', category: 'melee', melee: true, price: 90, ammoType: null,
    mag: Infinity, reserve: Infinity, rpm: 100, dmg: 18, pellets: 1, spread: 0, reload: 0, range: 2.6,
    icon: '🪵', asset: { pack: 'styloo', name: 'board' }, shape: 'plank',
    upgrades: ['grip_wrap', 'impact_boost'],
    display: 'melee-rack', desc: 'A sturdy wooden plank. Surprisingly effective.',
  },

  // ════════════════════════════════════════════════════════════════════════════
  //  MAX WEAPON PACK — converted FBX→GLB (tools/convert-fbx.mjs), registered in
  //  asset-index-v2.json under weapons/maxwp. These stock the Block Supply wall
  //  with real, varied weapon models. No `slot` → loads straight from the GLB
  //  asset (procedural placeholder only if the GLB ever fails to load).
  // ════════════════════════════════════════════════════════════════════════════
  // ── PISTOLS ──
  {
    id: 'mw_revolver_a', name: 'Range Revolver', category: 'pistols', price: 620, ammoType: 'light',
    mag: 6, reserve: 48, rpm: 200, dmg: 30, pellets: 1, spread: 0.01, reload: 1.8, range: 65, auto: false,
    icon: '🔫', asset: { pack: 'maxwp', name: 'revolver-a' },
    upgrades: ['laser_sight', 'fast_trigger', 'quick_reload', 'skin_finish'],
    display: 'pistol-wall', desc: 'Six-shot range revolver. Hits hard, light ammo.',
  },
  {
    id: 'mw_revolver_b', name: 'Snub Revolver', category: 'pistols', price: 540, ammoType: 'light',
    mag: 6, reserve: 48, rpm: 240, dmg: 26, pellets: 1, spread: 0.014, reload: 1.6, range: 55, auto: false,
    icon: '🔫', asset: { pack: 'maxwp', name: 'rvolver-b' },
    upgrades: ['laser_sight', 'fast_trigger', 'quick_reload', 'skin_finish'],
    display: 'pistol-wall', desc: 'Compact snub revolver. Quick on the draw.',
  },
  {
    id: 'mw_broom_pistol', name: 'Broomline Pistol', category: 'pistols', price: 700, ammoType: 'light',
    mag: 10, reserve: 48, rpm: 380, dmg: 20, pellets: 1, spread: 0.012, reload: 1.4, range: 62, auto: false,
    icon: '🔫', asset: { pack: 'maxwp', name: 'ms-c96' },
    upgrades: ['ext_mag', 'laser_sight', 'fast_trigger', 'skin_finish'],
    display: 'pistol-wall', desc: 'Long-barrel target pistol. Light ammo.',
  },
  // ── COMPACT (SMG) ──
  {
    id: 'mw_smg_lch', name: 'Latchstring SMG', category: 'compact', price: 2100, ammoType: 'compact',
    mag: 32, reserve: 120, rpm: 850, dmg: 15, pellets: 1, spread: 0.045, reload: 1.9, range: 55, auto: true,
    icon: '🔫', asset: { pack: 'maxwp', name: 'lchstrgn' },
    upgrades: ['ext_mag', 'stability', 'recoil_ctrl', 'skin_finish'],
    display: 'long-wall', desc: 'Rapid compact auto. Compact ammo.',
  },
  {
    id: 'mw_smg_r2014', name: 'R-2014 Compact', category: 'compact', price: 1950, ammoType: 'compact',
    mag: 28, reserve: 120, rpm: 780, dmg: 16, pellets: 1, spread: 0.05, reload: 1.8, range: 52, auto: true,
    icon: '🔫', asset: { pack: 'maxwp', name: 'r2014-2806' },
    upgrades: ['ext_mag', 'stability', 'recoil_ctrl', 'skin_finish'],
    display: 'long-wall', desc: 'Boxy compact spray gun. Compact ammo.',
  },
  // ── RIFLES ──
  {
    id: 'mw_rifle_ahkn', name: 'AHKN Rifle', category: 'rifles', price: 3900, ammoType: 'long',
    mag: 30, reserve: 120, rpm: 620, dmg: 27, pellets: 1, spread: 0.02, reload: 2.2, range: 92, auto: true,
    icon: '🔫', asset: { pack: 'maxwp', name: 'ahkn-lv' },
    upgrades: ['scope', 'stability', 'ext_mag', 'recoil_ctrl', 'skin_finish'],
    display: 'long-wall', desc: 'Hard-hitting automatic rifle. Long ammo.',
  },
  {
    id: 'mw_rifle_ptsk', name: 'PTSK Rifle', category: 'rifles', price: 4100, ammoType: 'long',
    mag: 32, reserve: 140, rpm: 640, dmg: 25, pellets: 1, spread: 0.019, reload: 2.1, range: 95, auto: true,
    icon: '🔫', asset: { pack: 'maxwp', name: 'ptsk' },
    upgrades: ['scope', 'stability', 'ext_mag', 'recoil_ctrl', 'heavy_barrel', 'skin_finish'],
    display: 'long-wall', desc: 'Balanced service rifle. Long ammo.',
  },
  {
    id: 'mw_rifle_tms', name: 'TMS-1909 Rifle', category: 'rifles', price: 4600, ammoType: 'long',
    mag: 20, reserve: 100, rpm: 300, dmg: 38, pellets: 1, spread: 0.014, reload: 2.4, range: 110, auto: false,
    icon: '🔫', asset: { pack: 'maxwp', name: 'tms-1909' },
    upgrades: ['scope', 'stability', 'dmg_tune', 'heavy_barrel', 'skin_finish'],
    display: 'long-wall', desc: 'Classic marksman rifle. Long ammo.',
  },
  // ── SHOTGUNS ──
  {
    id: 'mw_shotgun_cso', name: 'CSO Shotgun', category: 'shotguns', price: 2600, ammoType: 'shells',
    mag: 6, reserve: 24, rpm: 75, dmg: 13, pellets: 8, spread: 0.10, reload: 2.6, range: 28, auto: false,
    icon: '🔫', asset: { pack: 'maxwp', name: 'cso' },
    upgrades: ['quick_reload', 'tight_choke', 'heavy_barrel', 'skin_finish'],
    display: 'long-wall', desc: 'Tactical scatter shotgun. Shells.',
  },
  {
    id: 'mw_shotgun_sasg', name: 'SASG Auto Shotgun', category: 'shotguns', price: 3200, ammoType: 'shells',
    mag: 8, reserve: 32, rpm: 120, dmg: 11, pellets: 7, spread: 0.12, reload: 2.8, range: 26, auto: true,
    icon: '🔫', asset: { pack: 'maxwp', name: 'sasg' },
    upgrades: ['ext_mag', 'tight_choke', 'recoil_ctrl', 'skin_finish'],
    display: 'long-wall', desc: 'Semi-auto scatter blaster. Shells.',
  },
  // ── HEAVY / SPECIAL (featured wall) ──
  {
    id: 'mw_bazooka', name: 'Block Bazooka', category: 'heavy', price: 18000, ammoType: 'rocket',
    mag: 1, reserve: 5, rpm: 28, dmg: 150, pellets: 1, spread: 0, reload: 3.8, range: 170, auto: false, splash: 6.5,
    icon: '🚀', asset: { pack: 'maxwp', name: 'bazooka' },
    upgrades: ['quick_reload', 'dmg_tune', 'skin_finish'],
    display: 'featured', desc: 'Shoulder-fired arcade bazooka. Rocket rounds.',
  },
  {
    id: 'mw_gatling', name: 'Gatling Cannon', category: 'heavy', price: 22000, ammoType: 'long',
    mag: 100, reserve: 200, rpm: 1100, dmg: 18, pellets: 1, spread: 0.06, reload: 4.5, range: 100, auto: true,
    icon: '🔫', asset: { pack: 'maxwp', name: 'gahtling' },
    upgrades: ['stability', 'recoil_ctrl', 'dmg_tune', 'skin_finish'],
    display: 'featured', desc: 'Spinning-barrel heavy auto. Long ammo.',
  },
  {
    id: 'mw_crossbow', name: 'Bolt Crossbow', category: 'precision', price: 5200, ammoType: 'precision',
    mag: 1, reserve: 20, rpm: 40, dmg: 80, pellets: 1, spread: 0, reload: 2.4, range: 140, auto: false,
    icon: '🏹', asset: { pack: 'maxwp', name: 'cross-bow' },
    upgrades: ['scope', 'precision', 'quick_reload', 'skin_finish'],
    display: 'featured', desc: 'Silent precision crossbow. Precision ammo.',
  },
  // ── MELEE & TOOLS (melee rack) ──
  {
    id: 'mw_melee_bat', name: 'Slugger Bat', category: 'melee', melee: true, price: 180, ammoType: null,
    mag: Infinity, reserve: Infinity, rpm: 95, dmg: 25, pellets: 1, spread: 0, reload: 0, range: 2.6,
    icon: '🏏', asset: { pack: 'maxwp', name: 'melee-bat' }, shape: 'bat',
    upgrades: ['grip_wrap', 'swing_speed', 'impact_boost', 'skin_finish'],
    display: 'melee-rack', desc: 'A real wooden slugger. Solid swing.',
  },
  {
    id: 'mw_melee_axe', name: 'Camp Axe', category: 'melee', melee: true, price: 260, ammoType: null,
    mag: Infinity, reserve: Infinity, rpm: 70, dmg: 34, pellets: 1, spread: 0, reload: 0, range: 2.4,
    icon: '🪓', asset: { pack: 'maxwp', name: 'melee-axe' }, shape: 'bat',
    upgrades: ['grip_wrap', 'swing_speed', 'impact_boost'],
    display: 'melee-rack', desc: 'A heavy camp axe. Big chops.',
  },
  {
    id: 'mw_melee_crowbar', name: 'Pry Crowbar', category: 'tools', melee: true, price: 160, ammoType: null,
    mag: Infinity, reserve: Infinity, rpm: 85, dmg: 26, pellets: 1, spread: 0, reload: 0, range: 2.4,
    icon: '🪛', asset: { pack: 'maxwp', name: 'melee-crowbar' }, shape: 'pipe',
    upgrades: ['grip_wrap', 'swing_speed'],
    display: 'melee-rack', desc: 'Trusty steel crowbar. Opens things and bonks.',
  },
  {
    id: 'mw_melee_knife', name: 'Camp Knife', category: 'melee', melee: true, price: 110, ammoType: null,
    mag: Infinity, reserve: Infinity, rpm: 140, dmg: 18, pellets: 1, spread: 0, reload: 0, range: 2.0,
    icon: '🔪', asset: { pack: 'maxwp', name: 'melee-knife-a' }, shape: 'plank',
    upgrades: ['grip_wrap', 'swing_speed'],
    display: 'melee-rack', desc: 'Quick camp knife. Fast, short reach.',
  },
  {
    id: 'mw_melee_shovel', name: 'Dig Shovel', category: 'tools', melee: true, price: 140, ammoType: null,
    mag: Infinity, reserve: Infinity, rpm: 65, dmg: 28, pellets: 1, spread: 0, reload: 0, range: 2.7,
    icon: '🪏', asset: { pack: 'maxwp', name: 'melee-shovel' }, shape: 'pipe',
    upgrades: ['grip_wrap', 'impact_boost'],
    display: 'melee-rack', desc: 'A sturdy digging shovel. Long reach.',
  },
  {
    id: 'mw_melee_pickaxe', name: 'Mine Pickaxe', category: 'tools', melee: true, price: 220, ammoType: null,
    mag: Infinity, reserve: Infinity, rpm: 62, dmg: 32, pellets: 1, spread: 0, reload: 0, range: 2.6,
    icon: '⛏️', asset: { pack: 'maxwp', name: 'melee-pickaxe' }, shape: 'pipe',
    upgrades: ['grip_wrap', 'impact_boost'],
    display: 'melee-rack', desc: 'Heavy mining pickaxe. Hard hits.',
  },
  {
    id: 'mw_melee_pan', name: 'Frying Pan', category: 'tools', melee: true, price: 80, ammoType: null,
    mag: Infinity, reserve: Infinity, rpm: 90, dmg: 22, pellets: 1, spread: 0, reload: 0, range: 2.2,
    icon: '🍳', asset: { pack: 'maxwp', name: 'melee-frying-pan' }, shape: 'wrench',
    upgrades: ['grip_wrap', 'impact_boost'],
    display: 'melee-rack', desc: 'A clangy frying pan. Surprisingly effective.',
  },
];

// ── lookups / helpers (scalable; no hardcoded id lists elsewhere) ──────────────
const _byId = new Map(WEAPON_CATALOG.map(w => [w.id, w]));
export const weaponById = (id) => _byId.get(id) || _byId.get('fists') || WEAPON_CATALOG[0];
export const allWeapons = () => WEAPON_CATALOG;
export const weaponsInCategory = (catId) => WEAPON_CATALOG.filter(w => w.category === catId);
export const weaponsForTab = (tab) => {
  const cats = new Set(CATEGORIES.filter(c => c.tab === tab).map(c => c.id));
  return WEAPON_CATALOG.filter(w => cats.has(w.category) && w.id !== 'fists');
};
export const ammoTypeOf = (id) => { const w = weaponById(id); return w && w.ammoType; };
export const ammoTypeMeta = (typeId) => AMMO_TYPES[typeId] || null;
// Ammo types the player can currently buy for (owned, non-fists, ranged weapons).
export const ownedAmmoTypes = (ownedIds = []) => {
  const types = new Set();
  for (const id of ownedIds) { const t = ammoTypeOf(id); if (t) types.add(t); }
  return [...types].map(t => AMMO_TYPES[t]).filter(Boolean);
};
