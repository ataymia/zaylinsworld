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

// ── catalog ──────────────────────────────────────────────────────────────────
// slot     : manifest weapons.<slot> (GLB)
// price    : cost at the Block Supply weapons counter
// mag      : rounds per magazine        reserve: spare rounds granted on buy
// rpm      : rounds per minute (fire cadence)   auto: hold-to-fire
// dmg      : damage per hit             pellets: projectiles per shot (shotgun)
// spread   : cone half-angle in radians reload: seconds
// range    : max hit distance (m)
export const WEAPONS = [
  { id: 'fists',   name: 'Fists',         slot: null,      price: 0,     mag: Infinity, reserve: Infinity, rpm: 120, dmg: 8,   pellets: 1, spread: 0.00, reload: 0,   range: 2.4,  melee: true,  icon: '👊' },
  { id: 'pistol',  name: 'Pistol',        slot: 'pistol',  price: 450,   mag: 12,  reserve: 48,  rpm: 360,  dmg: 18,  pellets: 1, spread: 0.012, reload: 1.3, range: 60,  auto: false, icon: '🔫' },
  { id: 'smg',     name: 'MAC-10 SMG',    slot: 'smg',     price: 1800,  mag: 30,  reserve: 120, rpm: 900,  dmg: 14,  pellets: 1, spread: 0.04,  reload: 1.8, range: 55,  auto: true,  icon: '🔫' },
  { id: 'rifle',   name: 'AK-47 Rifle',   slot: 'rifle',   price: 3600,  mag: 30,  reserve: 120, rpm: 600,  dmg: 26,  pellets: 1, spread: 0.02,  reload: 2.2, range: 90,  auto: true,  icon: '🔫' },
  { id: 'shotgun', name: 'Shotgun',       slot: 'shotgun', price: 2400,  mag: 6,   reserve: 24,  rpm: 80,   dmg: 12,  pellets: 8, spread: 0.10,  reload: 2.6, range: 28,  auto: false, icon: '🔫' },
  { id: 'sniper',  name: 'AWP Sniper',    slot: 'sniper',  price: 7800,  mag: 5,   reserve: 20,  rpm: 45,   dmg: 95,  pellets: 1, spread: 0.0,   reload: 3.0, range: 220, auto: false, icon: '🎯' },
  { id: 'rocket',  name: 'Rocket Launcher',slot: 'rocket', price: 16000, mag: 1,   reserve: 5,   rpm: 30,   dmg: 140, pellets: 1, spread: 0.0,   reload: 3.6, range: 160, auto: false, splash: 6, icon: '🚀' },
];
export const weaponById = (id) => WEAPONS.find((w) => w.id === id) || WEAPONS[0];

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
function ammoFor(id) {
  const w = weaponById(id);
  if (w.melee) return { mag: Infinity, reserve: Infinity };
  deps.state.ammo = deps.state.ammo || {};
  if (!deps.state.ammo[id]) deps.state.ammo[id] = { mag: w.mag, reserve: w.reserve };
  return deps.state.ammo[id];
}

export function initWeapons(d) {
  deps = d;
  deps.state.ownedWeapons = deps.state.ownedWeapons || ['fists'];
  if (!deps.state.ownedWeapons.includes('fists')) deps.state.ownedWeapons.unshift('fists');
  deps.state.ammo = deps.state.ammo || {};
  equipWeapon(deps.state.equippedWeapon || 'fists', { silent: true });
}

// ── buying ─────────────────────────────────────────────────────────────────────
export function buyWeapon(id) {
  const w = weaponById(id);
  if (deps.state.ownedWeapons.includes(id)) {
    // top up reserve ammo on repurchase
    const a = ammoFor(id); a.reserve += w.reserve;
    deps.notify('📦 Restocked ' + w.name + ' ammo');
    deps.saveNow();
    return true;
  }
  if (deps.state.money < w.price) { deps.notify('Not enough cash for ' + w.name); return false; }
  deps.state.money -= w.price;
  deps.state.ownedWeapons.push(id);
  ammoFor(id); // initialise ammo
  deps.notify('🛒 Bought ' + w.name);
  deps.saveNow();
  return true;
}

// ── equip / cycle ────────────────────────────────────────────────────────────
export async function equipWeapon(id, { silent = false } = {}) {
  const w = weaponById(id);
  if (!deps.state.ownedWeapons.includes(id)) { if (!silent) deps.notify("You don't own that weapon"); return; }
  current = w;
  deps.state.equippedWeapon = id;
  reloading = 0; cooldown = 0;
  clearViewModel();
  if (!w.melee && w.slot) await buildViewModel(w);
  updateWeaponHUD();
  if (deps.onEquip) deps.onEquip(w);          // let the host mount a 3rd-person hand model
  if (!silent) deps.notify(w.icon + ' ' + w.name);
  deps.saveNow();
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
  const a = ammoFor(current.id);
  if (a.mag >= current.mag || a.reserve <= 0) return;
  reloading = current.reload;
  deps.notify('🔄 Reloading…');
  updateWeaponHUD();
}
function finishReload() {
  const a = ammoFor(current.id);
  const need = current.mag - a.mag;
  const take = Math.min(need, a.reserve);
  a.mag += take; a.reserve -= take;
  reloading = 0;
  updateWeaponHUD();
  deps.saveNow();
}

function fire() {
  const a = ammoFor(current.id);
  cooldown = 60 / current.rpm;

  if (current.melee) { meleeHit(); return; }

  if (a.mag <= 0) {
    // auto-reload if we have spare, else click
    if (a.reserve > 0) reload();
    else deps.notify('Empty — buy ammo at Block Supply');
    return;
  }
  a.mag -= 1;

  // muzzle flash + recoil
  if (muzzle) { const s = current.id === 'rocket' ? 0.5 : 0.28; muzzle.scale.set(s, s, s); }
  if (viewModel) { viewModel.position.z += current.id === 'sniper' ? 0.12 : 0.06; viewModel.rotation.x -= 0.05; }

  // raycast one ray per pellet from camera center
  const origin = new THREE.Vector3();
  deps.camera.getWorldPosition(origin);
  const baseDir = new THREE.Vector3();
  deps.camera.getWorldDirection(baseDir);
  const targets = deps.getTargets ? deps.getTargets() : [];
  let hitAny = false;
  for (let p = 0; p < current.pellets; p++) {
    const dir = baseDir.clone();
    if (current.spread > 0) {
      dir.x += (Math.random() - 0.5) * current.spread * 2;
      dir.y += (Math.random() - 0.5) * current.spread * 2;
      dir.z += (Math.random() - 0.5) * current.spread * 2;
      dir.normalize();
    }
    const hit = castAt(origin, dir, targets);
    if (hit) hitAny = true;
  }
  if (current.splash) splashDamage(origin, baseDir, targets);

  // wanted level for firing in public
  if (deps.onShotFired) deps.onShotFired(hitAny);
  updateWeaponHUD();
  if (a.mag <= 0 && a.reserve > 0) reload();
  deps.saveNow();
}

// returns true if a target was hit
function castAt(origin, dir, targets) {
  const end = origin.clone().add(dir.clone().multiplyScalar(current.range));
  // find nearest target sphere intersected
  let best = null, bestT = Infinity;
  for (const tg of targets) {
    const t = raySphere(origin, dir, tg.pos, tg.r || 1.0);
    if (t != null && t < bestT && t <= current.range) { bestT = t; best = tg; }
  }
  const hitPoint = best ? origin.clone().add(dir.clone().multiplyScalar(bestT)) : end;
  spawnTracer(muzzleWorld(origin), hitPoint);
  if (best) { applyDamage(best, current.dmg, hitPoint); return true; }
  return false;
}

function muzzleWorld(fallback) {
  if (muzzle) { const v = new THREE.Vector3(); muzzle.getWorldPosition(v); return v; }
  return fallback;
}

function splashDamage(origin, dir, targets) {
  const impact = origin.clone().add(dir.clone().multiplyScalar(Math.min(current.range, 30)));
  for (const tg of targets) {
    const d = tg.pos.distanceTo(impact);
    if (d <= current.splash) applyDamage(tg, current.dmg * (1 - d / current.splash), impact);
  }
}

function applyDamage(tg, dmg, point) {
  if (typeof tg.onHit === 'function') {
    const killed = tg.onHit(dmg, point);
    if (killed && deps.onKill) deps.onKill(tg);
  }
}

function meleeHit() {
  if (viewModel) viewModel.rotation.x -= 0.2;
  const origin = new THREE.Vector3(); deps.camera.getWorldPosition(origin);
  const dir = new THREE.Vector3(); deps.camera.getWorldDirection(dir);
  const targets = deps.getTargets ? deps.getTargets() : [];
  let hit = false;
  for (const tg of targets) {
    const t = raySphere(origin, dir, tg.pos, (tg.r || 1.0) + 0.3);
    if (t != null && t <= current.range) { applyDamage(tg, meleeDamage(), tg.pos); hit = true; break; }
  }
  // a thrown punch in public still draws attention (lighter than gunfire)
  if (deps.onShotFired) deps.onShotFired(hit, true);
}
// fists scale with the player's fitness/strength stat (stronger → harder hits)
function meleeDamage() {
  const fit = (deps.state?.stats?.fitness) || 0;
  return current.dmg + Math.round(fit * 0.45);   // 8 base → up to ~53 at 100 fitness
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
  const a = ammoFor(current.id);
  const ammoStr = current.melee ? '∞'
    : (reloading > 0 ? 'RELOADING' : `${a.mag} / ${a.reserve === Infinity ? '∞' : a.reserve}`);
  el.innerHTML = `<span class="wp-icon">${current.icon}</span>` +
    `<span class="wp-name">${current.name}</span>` +
    `<span class="wp-ammo">${ammoStr}</span>`;
}

export function currentWeapon() { return current; }
export function isReloading() { return reloading > 0; }
