// ───────────────────────────────────────────────────────────────────────────
//  weapons.js — purchasable / equippable / shootable weapons (Styloo Guns pack).
//
//  Self-contained weapon controller. main.js calls initWeapons(deps) once, then
//  drives it from the game loop (updateWeapons) and input (shoot/reload/cycle).
//  Weapons are loaded as GLBs from the manifest "weapons" category with a
//  procedural fallback so the game never breaks if an asset is missing.
//
//  Behavior changes with what's in your hand: fists (melee), pistol/SMG/rifle/
//  shotgun/sniper/rocket each have their own fire-rate, magazine, spread, damage,
//  reload time and auto/semi firing. HUD reflects the equipped weapon + ammo.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { loadSlotModel } from './manifest.js';
import { WEAPON_CATALOG, weaponById as catWeaponById, AMMO_TYPES } from './config/weaponCatalog.js';
import { applyUpgrades, upgradeById } from './config/weaponUpgrades.js';

// ── catalog ──────────────────────────────────────────────────────────────────
// The weapon list is now driven entirely by the SCALABLE catalog
// (src/config/weaponCatalog.js). Adding a weapon there makes it appear in the
// shop, inventory, hand and ammo systems with zero edits here. WEAPONS is kept
// as a backward-compatible export so existing call-sites keep working.
export const WEAPONS = WEAPON_CATALOG;
export const weaponById = (id) => catWeaponById(id);
export { AMMO_TYPES };

// Legacy save ids → new catalog ids (so a player's old purchases carry over).
const LEGACY_WEAPON_MAP = {
  pistol: 'pistol_shortline', smg: 'compact_corner', rifle: 'rifle_blockside',
  shotgun: 'shotgun_sweeper', sniper: 'precision_scope', rocket: 'rocket_blast',
};

let deps = null;            // { THREE, camera, scene, state, notify, getTargets, onKill, saveNow }
let viewModel = null;       // GLB held in the camera's hand
let muzzle = null;          // muzzle-flash sprite
let modelCache = new Map(); // slot -> loaded scene (cloned per equip)
let current = null;         // current WEAPONS entry
let cooldown = 0;           // seconds until next shot allowed
let reloading = 0;          // seconds left in a reload (0 = not reloading)
const tracers = [];         // active tracer line segments {line, life}
const raycaster = new THREE.Raycaster();

// ── ammo state lives on the save (so it persists) ──────────────────────────────
// SCALABLE model: a weapon's loaded magazine is per-weapon (state.ammo[id].mag),
// but the spare reserve is a SHARED pool keyed by ammo type
// (state.ammoReserve[ammoType]) — so two pistols share Light Ammo, three rifles
// share Long Ammo, etc. Buying ammo once refills every weapon of that type.
function ensureAmmo() {
  deps.state.ammo = deps.state.ammo || {};
  deps.state.ammoReserve = deps.state.ammoReserve || {};
}
function magState(id) {
  const w = weaponById(id);
  if (w.melee) return { mag: Infinity };
  ensureAmmo();
  if (!deps.state.ammo[id]) deps.state.ammo[id] = { mag: w.mag };
  return deps.state.ammo[id];
}
function reserveFor(type) {
  if (!type) return Infinity;
  ensureAmmo();
  return deps.state.ammoReserve[type] || 0;
}
function addReserve(type, n) {
  if (!type || !n) return;
  ensureAmmo();
  deps.state.ammoReserve[type] = (deps.state.ammoReserve[type] || 0) + n;
}
function takeReserve(type, n) {
  if (!type) return n;                  // melee / unlimited
  ensureAmmo();
  const have = deps.state.ammoReserve[type] || 0;
  const take = Math.min(have, n);
  deps.state.ammoReserve[type] = have - take;
  return take;
}

// ── upgrades (per-weapon, persisted) ───────────────────────────────────────────
function equippedUpgradesFor(id) {
  deps.state.equippedUpgrades = deps.state.equippedUpgrades || {};
  return deps.state.equippedUpgrades[id] || [];
}
// Effective stats = base catalog stats with equipped upgrades applied.
function effStats(w = current) {
  return applyUpgrades(w, equippedUpgradesFor(w.id));
}
// Public: a snapshot of ammo for a weapon (used by the inventory UI).
export function ammoInfo(id) {
  const w = weaponById(id);
  if (w.melee) return { mag: Infinity, reserve: Infinity, type: null, cap: Infinity };
  return { mag: magState(id).mag, reserve: reserveFor(w.ammoType), type: w.ammoType, cap: effStats(w).mag };
}

// One-time migration of legacy (pre-catalog) saves into the new model.
function migrateLegacy() {
  ensureAmmo();
  if (deps.state.weaponsV2) return;
  const owned = deps.state.ownedWeapons || ['fists'];
  const newOwned = [];
  for (const id of owned) {
    const mapped = LEGACY_WEAPON_MAP[id] || id;
    if (weaponById(mapped) && !newOwned.includes(mapped)) newOwned.push(mapped);
  }
  if (!newOwned.includes('fists')) newOwned.unshift('fists');
  deps.state.ownedWeapons = newOwned;
  if (deps.state.equippedWeapon && LEGACY_WEAPON_MAP[deps.state.equippedWeapon]) {
    deps.state.equippedWeapon = LEGACY_WEAPON_MAP[deps.state.equippedWeapon];
  }
  // fold old per-weapon {mag,reserve} into per-weapon mag + shared reserve pool
  const oldAmmo = deps.state.ammo || {};
  const newAmmo = {};
  for (const [id, a] of Object.entries(oldAmmo)) {
    const mapped = LEGACY_WEAPON_MAP[id] || id;
    const w = weaponById(mapped);
    if (!w || w.melee) continue;
    newAmmo[mapped] = { mag: (a && Number.isFinite(a.mag)) ? a.mag : w.mag };
    if (a && Number.isFinite(a.reserve) && w.ammoType) addReserve(w.ammoType, a.reserve);
  }
  deps.state.ammo = newAmmo;
  deps.state.weaponsV2 = true;
}

export function initWeapons(d) {
  deps = d;
  deps.state.ownedWeapons = deps.state.ownedWeapons || ['fists'];
  if (!deps.state.ownedWeapons.includes('fists')) deps.state.ownedWeapons.unshift('fists');
  deps.state.ownedUpgrades = deps.state.ownedUpgrades || {};
  deps.state.equippedUpgrades = deps.state.equippedUpgrades || {};
  ensureAmmo();
  migrateLegacy();
  equipWeapon(deps.state.equippedWeapon || 'fists', { silent: true });
}

// ── buying ─────────────────────────────────────────────────────────────────────
export function buyWeapon(id) {
  const w = weaponById(id);
  if (deps.state.ownedWeapons.includes(id)) {
    // already owned → top up the shared reserve for its ammo type
    if (w.ammoType) { addReserve(w.ammoType, w.reserve); deps.notify('📦 Restocked ' + (AMMO_TYPES[w.ammoType]?.name || 'ammo')); }
    else deps.notify(w.name + ' is melee — no ammo needed');
    deps.saveNow();
    return true;
  }
  if (deps.state.money < w.price) { deps.notify('Not enough cash for ' + w.name); return false; }
  deps.state.money -= w.price;
  deps.state.ownedWeapons.push(id);
  magState(id);                                   // initialise loaded magazine
  if (w.ammoType) addReserve(w.ammoType, w.reserve);   // grant starter reserve
  deps.notify('🛒 Bought ' + w.name);
  deps.saveNow();
  return true;
}

// Buy a batch of ammo of a given type into the shared pool.
export function buyAmmo(typeId) {
  const t = AMMO_TYPES[typeId];
  if (!t) return false;
  if (deps.state.money < t.price) { deps.notify('Not enough cash for ' + t.name); return false; }
  deps.state.money -= t.price;
  addReserve(typeId, t.amount);
  deps.notify('🧰 +' + t.amount + ' ' + t.name);
  updateWeaponHUD();
  deps.saveNow();
  return true;
}

// Buy (and auto-equip) a weapon upgrade. Ownership is per weapon.
export function buyUpgrade(weaponId, upgradeId) {
  const w = weaponById(weaponId);
  const up = upgradeById(upgradeId);
  if (!w || !up) return false;
  if (!(w.upgrades || []).includes(upgradeId)) { deps.notify('That upgrade does not fit ' + w.name); return false; }
  deps.state.ownedUpgrades = deps.state.ownedUpgrades || {};
  const owned = deps.state.ownedUpgrades[weaponId] = deps.state.ownedUpgrades[weaponId] || [];
  if (owned.includes(upgradeId)) { equipUpgrade(weaponId, upgradeId); return true; }
  if (deps.state.money < up.price) { deps.notify('Not enough cash for ' + up.name); return false; }
  deps.state.money -= up.price;
  owned.push(upgradeId);
  equipUpgrade(weaponId, upgradeId, true);        // auto-equip on purchase
  deps.notify('🔧 Installed ' + up.name + ' on ' + w.name);
  deps.saveNow();
  return true;
}

// Toggle an owned upgrade on/off (one upgrade per slot).
export function equipUpgrade(weaponId, upgradeId, forceOn = false) {
  const w = weaponById(weaponId);
  const up = upgradeById(upgradeId);
  if (!w || !up) return;
  deps.state.ownedUpgrades = deps.state.ownedUpgrades || {};
  deps.state.equippedUpgrades = deps.state.equippedUpgrades || {};
  if (!(deps.state.ownedUpgrades[weaponId] || []).includes(upgradeId)) return;  // must own
  const eq = deps.state.equippedUpgrades[weaponId] = deps.state.equippedUpgrades[weaponId] || [];
  const isOn = eq.includes(upgradeId);
  // drop any upgrade already in this slot, then equip unless we're toggling off
  let next = eq.filter(uid => { const u = upgradeById(uid); return u && u.slot !== up.slot; });
  if (!isOn || forceOn) next.push(upgradeId);
  deps.state.equippedUpgrades[weaponId] = next;
  if (current && current.id === weaponId) { clampMag(); updateWeaponHUD(); }
  deps.saveNow();
}

// If an upgrade change shrinks the magazine, clamp the loaded rounds to the cap.
function clampMag() {
  if (!current || current.melee) return;
  const m = magState(current.id);
  const cap = effStats().mag;
  if (m.mag > cap) m.mag = cap;
}

// ── equip / cycle ────────────────────────────────────────────────────────────
export async function equipWeapon(id, { silent = false } = {}) {
  // Hard guards: never throw on a null deps/state, a bad id, or fists.
  if (!deps || !deps.state) { console.warn('[weapons] equipWeapon called before initWeapons — ignored', id); return; }
  const w = weaponById(id);                   // always returns a valid entry (fists fallback)
  const owned = deps.state.ownedWeapons || (deps.state.ownedWeapons = ['fists']);
  if (!owned.includes(w.id)) { if (!silent) deps.notify("You don't own that weapon"); return; }
  console.debug('[weapons] equip', w.id, '| owned:', owned.join(','), '| was:', deps.state.equippedWeapon);
  current = w;
  deps.state.equippedWeapon = w.id;
  reloading = 0; cooldown = 0;
  clearViewModel();
  if (!w.melee && w.slot) await buildViewModel(w);
  updateWeaponHUD();
  if (deps.onEquip) { try { deps.onEquip(w); } catch (e) { console.warn('[weapons] onEquip threw', e); } }
  if (!silent) deps.notify(w.icon + ' ' + w.name);
  if (deps.saveNow) deps.saveNow();
}

export function cycleWeapon(dir = 1) {
  const owned = deps.state.ownedWeapons;
  if (owned.length <= 1) { equipWeapon('fists'); return; }
  const i = Math.max(0, owned.indexOf(deps.state.equippedWeapon));
  const next = owned[(i + dir + owned.length) % owned.length];
  equipWeapon(next);
}

function clearViewModel() {
  if (viewModel) { deps.camera.remove(viewModel); viewModel.traverse((o) => { if (o.isMesh) o.geometry?.dispose?.(); }); viewModel = null; }
  muzzle = null;
}

async function buildViewModel(w) {
  let scene = modelCache.get(w.slot);
  if (!scene) {
    const model = await loadSlotModel('weapons', w.slot, deps.renderer);
    if (model && model.scene) { scene = model.scene; modelCache.set(w.slot, scene); }
  }
  // Guard against an equip that changed while we were loading.
  if (!current || current.id !== w.id) return;

  const holder = new THREE.Group();
  if (scene) {
    const inst = scene.clone(true);
    // normalize: longest axis → ~0.5m, grounded to origin, barrel facing -Z (forward)
    const box = new THREE.Box3().setFromObject(inst);
    const size = box.getSize(new THREE.Vector3());
    const longest = Math.max(size.x, size.y, size.z) || 1;
    inst.scale.multiplyScalar(0.5 / longest);
    const box2 = new THREE.Box3().setFromObject(inst);
    const c = box2.getCenter(new THREE.Vector3());
    inst.position.sub(c);
    inst.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = false; o.renderOrder = 999; if (o.material) { o.material = o.material.clone(); o.material.depthTest = true; } } });
    holder.add(inst);
  } else {
    // procedural fallback gun block so something is always in hand
    const m = new THREE.MeshStandardMaterial({ color: '#2a2d34', metalness: 0.6, roughness: 0.4 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.4), m); body.position.z = -0.1;
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.18, 0.1), m); grip.position.set(0, -0.14, 0.05);
    holder.add(body, grip);
  }
  // seat at lower-right of the view
  holder.position.set(0.28, -0.26, -0.6);
  holder.rotation.y = Math.PI;            // face the barrel forward (-Z)
  deps.camera.add(holder);
  viewModel = holder;

  // muzzle flash sprite (hidden until a shot)
  const tex = makeFlashTexture();
  muzzle = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, blending: THREE.AdditiveBlending }));
  muzzle.scale.set(0.0001, 0.0001, 0.0001);
  muzzle.position.set(0, 0.02, -0.42);
  holder.add(muzzle);
}

function makeFlashTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,250,210,1)');
  g.addColorStop(0.4, 'rgba(255,180,60,0.8)');
  g.addColorStop(1, 'rgba(255,120,20,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// ── firing ───────────────────────────────────────────────────────────────────
// Called every frame from main.js with the player's input intent.
// input = { fireHeld, firePressed, reloadPressed }
export function updateWeapons(dt, input) {
  if (!current) return;
  if (cooldown > 0) cooldown -= dt;
  if (reloading > 0) {
    reloading -= dt;
    if (reloading <= 0) finishReload();
  }
  // recoil recovery — lerp the view model back to rest
  if (viewModel) {
    viewModel.position.z += (-0.6 - viewModel.position.z) * Math.min(1, dt * 12);
    viewModel.rotation.x += (0 - viewModel.rotation.x) * Math.min(1, dt * 10);
  }
  // muzzle flash fade
  if (muzzle && muzzle.scale.x > 0.0002) {
    const s = muzzle.scale.x * (1 - Math.min(1, dt * 14));
    muzzle.scale.set(s, s, s);
  }
  // tracers fade
  for (let i = tracers.length - 1; i >= 0; i--) {
    const tr = tracers[i]; tr.life -= dt;
    tr.line.material.opacity = Math.max(0, tr.life / 0.08);
    if (tr.life <= 0) { deps.scene.remove(tr.line); tr.line.geometry.dispose(); tr.line.material.dispose(); tracers.splice(i, 1); }
  }

  if (input.reloadPressed) reload();
  const wantFire = current.auto ? input.fireHeld : input.firePressed;
  if (wantFire && cooldown <= 0 && reloading <= 0) fire();
}

function reload() {
  if (current.melee || reloading > 0) return;
  const eff = effStats();
  const m = magState(current.id);
  if (m.mag >= eff.mag || reserveFor(current.ammoType) <= 0) return;
  reloading = eff.reload;
  deps.notify('🔄 Reloading…');
  updateWeaponHUD();
}
function finishReload() {
  const eff = effStats();
  const m = magState(current.id);
  const need = eff.mag - m.mag;
  const take = takeReserve(current.ammoType, need);
  m.mag += take;
  reloading = 0;
  updateWeaponHUD();
  deps.saveNow();
}

function fire() {
  const eff = effStats();
  cooldown = 60 / eff.rpm;

  if (current.melee) { meleeHit(eff); return; }

  const m = magState(current.id);
  if (m.mag <= 0) {
    // auto-reload if we have spare, else click
    if (reserveFor(current.ammoType) > 0) reload();
    else deps.notify('Empty — buy ' + (AMMO_TYPES[current.ammoType]?.name || 'ammo') + ' at Block Supply');
    return;
  }
  m.mag -= 1;

  // muzzle flash + recoil
  if (muzzle) { const s = current.id === 'rocket_blast' ? 0.5 : 0.28; muzzle.scale.set(s, s, s); }
  if (viewModel) { viewModel.position.z += eff.scoped ? 0.12 : 0.06; viewModel.rotation.x -= 0.05; }

  // Shot direction comes from the aim system: the cursor ray for normal guns
  // (you shoot where you click) or the centred scope reticle for scoped weapons.
  // A light aim-assist snaps the ray onto a target within a small cone so a shot
  // placed on/near a target reliably connects.
  const ray = deps.getShootRay ? deps.getShootRay() : null;
  const origin = new THREE.Vector3();
  const baseDir = new THREE.Vector3();
  if (ray) { origin.copy(ray.origin); baseDir.copy(ray.dir); }
  else { deps.camera.getWorldPosition(origin); deps.camera.getWorldDirection(baseDir); }
  if (baseDir.lengthSq() < 1e-6) baseDir.set(0, 0, -1);
  baseDir.normalize();
  const targets = deps.getTargets ? deps.getTargets() : [];
  const snap = aimAssistDir(origin, baseDir, targets, eff.range);
  if (snap) baseDir.copy(snap);
  const spread = eff.spread || 0;
  let hitAny = false;
  for (let p = 0; p < (eff.pellets || 1); p++) {
    const dir = baseDir.clone();
    if (spread > 0) {
      dir.x += (Math.random() - 0.5) * spread * 2;
      dir.y += (Math.random() - 0.5) * spread * 2;
      dir.z += (Math.random() - 0.5) * spread * 2;
      dir.normalize();
    }
    const hit = castAt(origin, dir, targets, eff);
    if (hit) hitAny = true;
  }
  if (eff.splash) splashDamage(origin, baseDir, targets, eff);

  // wanted level for firing in public
  if (deps.onShotFired) deps.onShotFired(hitAny);
  updateWeaponHUD();
  if (m.mag <= 0 && reserveFor(current.ammoType) > 0) reload();
  deps.saveNow();
}

// Aim-assist: among targets within ~6° of the shot ray and within range, return
// a direction pointing straight at the closest one's centre (else null). Small
// cone so it only corrects shots already placed on/near a target.
function aimAssistDir(origin, baseDir, targets, range) {
  const COS_CONE = Math.cos(0.11);             // ~6.3° capture cone
  let best = null, bestT = Infinity;
  for (const tg of targets) {
    const to = tg.pos.clone().sub(origin);
    const dist = to.length();
    if (dist < 0.3 || dist > (range || 80)) continue;
    to.multiplyScalar(1 / dist);
    if (to.dot(baseDir) < COS_CONE) continue;  // outside the capture cone
    if (dist < bestT) { bestT = dist; best = to; }
  }
  return best;
}

// returns true if a target was hit
function castAt(origin, dir, targets, eff) {
  const range = eff.range, dmg = eff.dmg;
  const end = origin.clone().add(dir.clone().multiplyScalar(range));
  // find nearest target sphere intersected
  let best = null, bestT = Infinity;
  for (const tg of targets) {
    const t = raySphere(origin, dir, tg.pos, tg.r || 1.0);
    if (t != null && t < bestT && t <= range) { bestT = t; best = tg; }
  }
  const hitPoint = best ? origin.clone().add(dir.clone().multiplyScalar(bestT)) : end;
  spawnTracer(muzzleWorld(origin), hitPoint);
  if (best) { applyDamage(best, dmg, hitPoint); return true; }
  return false;
}

function muzzleWorld(fallback) {
  if (muzzle) { const v = new THREE.Vector3(); muzzle.getWorldPosition(v); return v; }
  return fallback;
}

function splashDamage(origin, dir, targets, eff) {
  const impact = origin.clone().add(dir.clone().multiplyScalar(Math.min(eff.range, 30)));
  for (const tg of targets) {
    const d = tg.pos.distanceTo(impact);
    if (d <= eff.splash) applyDamage(tg, eff.dmg * (1 - d / eff.splash), impact);
  }
}

function applyDamage(tg, dmg, point) {
  if (typeof tg.onHit === 'function') {
    const killed = tg.onHit(dmg, point);
    if (killed && deps.onKill) deps.onKill(tg);
  }
}

function meleeHit(eff) {
  if (viewModel) viewModel.rotation.x -= 0.2;
  const targets = deps.getTargets ? deps.getTargets() : [];
  const range = (eff && eff.range) || current.range;
  // Melee reaches from the PLAYER, not the camera — in third-person the camera
  // sits several metres back, so a 2-3m reach measured from the camera would
  // never connect. Sweep a forward ARC/CONE in front of the player: origin is the
  // player's chest, direction is where the player is aiming (flattened look dir),
  // and anything inside the swing cone within reach is struck.
  const ppos = deps.getPlayerPos ? deps.getPlayerPos() : null;
  const origin = (ppos ? ppos.clone() : new THREE.Vector3());
  origin.y += 1.0;
  const dir = deps.getAimDir ? deps.getAimDir() : (() => {
    const d = new THREE.Vector3(); deps.camera.getWorldDirection(d); return d;
  })();
  dir.y = 0;
  if (dir.lengthSq() < 1e-4) dir.set(0, 0, -1);
  dir.normalize();
  const COS_HALF = Math.cos(0.96);   // ~55° half-angle → ~110° total swing arc
  let best = null, bestD = Infinity;
  for (const tg of targets) {
    const to = tg.pos.clone().sub(origin); to.y = 0;
    const dist = to.length();
    const reach = range + (tg.r || 1.0);
    if (dist > reach) continue;
    if (dist > 1e-3) {
      to.multiplyScalar(1 / dist);
      if (to.dot(dir) < COS_HALF) continue;   // outside the swing arc
    }
    if (dist < bestD) { bestD = dist; best = tg; }
  }
  let hit = false;
  if (best) { applyDamage(best, meleeDamage(eff), best.pos); hit = true; }
  // a thrown punch / swing in public still draws attention (lighter than gunfire)
  if (deps.onShotFired) deps.onShotFired(hit, true);
}
// Melee damage = the weapon's base rating plus a SMALL fitness bonus, so no basic
// melee weapon one-shots a healthy (60 HP) NPC. Heavier weapons hit harder via
// their catalog dmg but swing slower via their rpm. Monster form adds +40%.
function meleeDamage(eff) {
  const base = (eff && eff.dmg) || current.dmg;
  const fit = (deps.state?.stats?.fitness) || 0;
  let dmg = base + Math.round(fit * 0.08);   // gentle: up to ~+8 at 100 fitness
  if (deps.state?.playerMonster) dmg = Math.round(dmg * 1.4);   // stronger, not an instant KO
  return dmg;
}

// ray vs sphere; returns distance along ray to first hit or null
function raySphere(o, d, center, r) {
  const oc = o.clone().sub(center);
  const b = oc.dot(d);
  const c = oc.dot(oc) - r * r;
  const disc = b * b - c;
  if (disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  return t >= 0 ? t : null;
}

function spawnTracer(from, to) {
  const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
  const mat = new THREE.LineBasicMaterial({ color: 0xfff2a0, transparent: true, opacity: 1 });
  const line = new THREE.Line(geo, mat);
  deps.scene.add(line);
  tracers.push({ line, life: 0.08 });
}

// ── HUD ────────────────────────────────────────────────────────────────────────
export function updateWeaponHUD() {
  const el = document.getElementById('weapon-hud');
  if (!el) return;
  if (!current) { el.style.display = 'none'; return; }
  el.style.display = '';
  const m = magState(current.id);
  const reserve = current.melee ? Infinity : reserveFor(current.ammoType);
  const ammoStr = current.melee ? '∞'
    : (reloading > 0 ? 'RELOADING' : `${m.mag} / ${reserve === Infinity ? '∞' : reserve}`);
  el.innerHTML = `<span class="wp-icon">${current.icon}</span>` +
    `<span class="wp-name">${current.name}</span>` +
    `<span class="wp-ammo">${ammoStr}</span>`;
}

export function currentWeapon() { return current; }
export function isReloading() { return reloading > 0; }
// The camera-mounted first-person view model duplicates the avatar's in-hand
// weapon, so it should only be visible in first-person. main.js calls this each
// frame with the current camera mode. The muzzle still resolves its world
// position while hidden, so tracers keep originating correctly.
export function setFirstPersonView(on) {
  if (viewModel) viewModel.visible = !!on;
}