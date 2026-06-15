// ───────────────────────────────────────────────────────────────────────────
//  weaponUpgrades.js — fictional, gameplay-only weapon upgrade system.
//
//  Upgrades are pure arcade modifiers (NOT real-world specs or instructions).
//  Each upgrade defines how it transforms a weapon's base stats via `apply()`.
//  Each weapon (in weaponCatalog.js) lists which upgrade ids it supports, so not
//  every gun gets every upgrade — they make sense per category. Ownership +
//  equipped state live on the save (per weapon id) so progression persists and
//  is trivially Firebase-syncable later.
// ───────────────────────────────────────────────────────────────────────────

// id      : stable key (stored in save)
// name    : shop display name (fictional/stylized)
// price   : cost at the upgrade counter
// slot    : one upgrade per slot can be equipped (mag, trigger, sight, grip, …)
// desc    : flavor / effect summary shown in the detail panel
// apply(stats): mutate a COPY of the weapon's numeric stats in place
export const UPGRADES = {
  ext_mag:      { id: 'ext_mag',      name: 'Extended Clip',     price: 600,  slot: 'mag',    desc: '+50% magazine size.',           apply: s => { s.mag = Math.ceil(s.mag * 1.5); } },
  quick_reload: { id: 'quick_reload', name: 'Quick-Hands Kit',   price: 550,  slot: 'reload', desc: '−35% reload time.',             apply: s => { s.reload *= 0.65; } },
  fast_trigger: { id: 'fast_trigger', name: 'Snap Trigger',      price: 700,  slot: 'trigger',desc: '+25% fire rate.',               apply: s => { s.rpm = Math.round(s.rpm * 1.25); } },
  laser_sight:  { id: 'laser_sight',  name: 'Beam Sight',        price: 500,  slot: 'sight',  desc: 'Tighter aim — −45% spread.',    apply: s => { s.spread *= 0.55; } },
  scope:        { id: 'scope',        name: 'Range Scope',       price: 900,  slot: 'sight',  desc: 'Stronger zoom + −30% spread.',  apply: s => { s.spread *= 0.7; s.scoped = true; } },
  stability:    { id: 'stability',    name: 'Stability Grip',    price: 650,  slot: 'grip',   desc: '−40% spread, steadier hold.',   apply: s => { s.spread *= 0.6; } },
  recoil_ctrl:  { id: 'recoil_ctrl',  name: 'Recoil Damper',     price: 600,  slot: 'grip',   desc: '−30% spread under fire.',       apply: s => { s.spread *= 0.7; } },
  tight_choke:  { id: 'tight_choke',  name: 'Tight Choke',       price: 700,  slot: 'barrel', desc: 'Tighter shot spread.',          apply: s => { s.spread *= 0.55; } },
  heavy_barrel: { id: 'heavy_barrel', name: 'Heavy Barrel',      price: 850,  slot: 'barrel', desc: '+15% damage, slightly slower.', apply: s => { s.dmg = Math.round(s.dmg * 1.15); s.rpm = Math.round(s.rpm * 0.92); } },
  precision:    { id: 'precision',    name: 'Precision Tuning',  price: 1100, slot: 'tune',   desc: '+10% damage, pinpoint aim.',    apply: s => { s.dmg = Math.round(s.dmg * 1.1); s.spread *= 0.5; } },
  dmg_tune:     { id: 'dmg_tune',     name: 'Power Tuning',      price: 950,  slot: 'tune',   desc: '+12% damage (balanced).',       apply: s => { s.dmg = Math.round(s.dmg * 1.12); } },
  skin_finish:  { id: 'skin_finish',  name: 'Custom Finish',     price: 300,  slot: 'cosmetic',desc: 'Cosmetic flair. No stat change.',apply: () => {} },
  // melee-only
  grip_wrap:    { id: 'grip_wrap',    name: 'Grip Wrap',         price: 250,  slot: 'grip',   desc: 'Better handling — faster swing.',apply: s => { s.rpm = Math.round(s.rpm * 1.2); } },
  swing_speed:  { id: 'swing_speed',  name: 'Swing Trainer',     price: 350,  slot: 'tune',   desc: '+30% swing speed.',             apply: s => { s.rpm = Math.round(s.rpm * 1.3); } },
  impact_boost: { id: 'impact_boost', name: 'Impact Core',       price: 500,  slot: 'barrel', desc: '+20% melee impact damage.',     apply: s => { s.dmg = Math.round(s.dmg * 1.2); } },
};

export const upgradeById = (id) => UPGRADES[id] || null;

// Compute the EFFECTIVE stats for a weapon given the list of equipped upgrade
// ids. Returns a fresh stats object (base stats are never mutated). Unknown or
// unsupported upgrades are ignored safely.
export function applyUpgrades(weapon, equippedIds = []) {
  const s = {
    mag: weapon.mag, reserve: weapon.reserve, rpm: weapon.rpm, dmg: weapon.dmg,
    pellets: weapon.pellets, spread: weapon.spread, reload: weapon.reload,
    range: weapon.range, splash: weapon.splash, scoped: false,
  };
  const supported = new Set(weapon.upgrades || []);
  for (const id of equippedIds) {
    if (!supported.has(id)) continue;
    const up = UPGRADES[id];
    if (up && typeof up.apply === 'function') { try { up.apply(s); } catch { /* ignore bad upgrade */ } }
  }
  return s;
}
