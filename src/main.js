// ───────────────────────────────────────────────────────────────────────────
//  main.js — Zaylin's World 3D : bootstrap, game loop, full interaction wiring
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { buildAvatar, isGltfHair, HAIRSTYLES, HAIR_COLORS, JEWELRY, defaultCustom } from './avatar.js';
import { attachGltfHair, attachedHairInfo } from './hairKit.js';
import { buildDistrict } from './cityKit.js';
import { placeStreetProps, loadTrashTemplates, makeTrashItem, trashTemplatesReady } from './props.js';
import { placeWorldBuildings } from './worldBuildings.js';
import { furnishInteriors } from './furnish.js';
import { initMinimap, setMarkers } from './minimap.js';
import { preloadVehicles, swapVehicleVisual, TRAFFIC_FLEET, DRIVABLE_DEFAULT, DEALER_FLEET } from './vehicleKit.js';
import { buildCity, colliders as cityColliders } from './world.js';
import { buildInteriors, DEALER_CARS, JEWELRY_STOCK, GEAR_STOCK } from './interiors.js';
import {
  createCityNPCs, updateCityNPCs, createTraffic, updateTraffic, createDrivableCar,
} from './npc.js';
import {
  initWeapons, updateWeapons, buyWeapon, equipWeapon, cycleWeapon,
  WEAPONS, weaponById, currentWeapon,
  buyAmmo, buyUpgrade, equipUpgrade, ammoInfo, AMMO_TYPES,
  setFirstPersonView,
} from './weapons.js';
import { CATEGORIES, weaponsForTab, ownedAmmoTypes, allWeapons } from './config/weaponCatalog.js';
import { upgradeById } from './config/weaponUpgrades.js';
import { resolveTransform } from './config/weaponTransforms.js';
import { zoneSlot, SHOP_ZONES } from './config/blockSupplyLayout.js';
import { initMissions, missionEvent, renderTracker } from './missions.js';
import { spawnMonsters, updateMonsters, clearMonsters } from './monsters.js';
import { applyNpcSkins, applyPlayerSkin, applyCopSkin } from './avatarSkin.js';
import { Controls, CAM } from './controls.js';
import { InteractionManager } from './interaction.js';
import { loadState, saveState, defaultState, clearSave, hasSave } from './state.js';
import { GEMS, LANDMARKS, SPAWN } from './config/mapConfig.js';
import { ROAD } from './config/mapConfig.js';
import { loadHDRI, loadAsset } from './assets.js';
import {
  hdriUrl, loadSlotModel, updateMixers, enhanceAvatar, enhanceVehicle, assetUrl,
} from './manifest.js';
import { graphics } from './graphics.js';
import { initSettingsMenu, isSettingsOpen, settingsTickFPS } from './settings.js';
import {
  initLoadingScreen, hideLoadingScreen, setStatus, setProgress, loadingManager,
} from './loader.js';
import { initDebugBadge, debug } from './debug.js';
import { handlingFor, addVehicleDamage, applyDamageVisual, tickDamageSmoke } from './vehicleDamage.js';
import { collideVehicle, breakableCount, worldObjectCount } from './worldCollision.js';
import { dressTown } from './townBuilder.js';
import { buildTrafficControl } from './traffic.js';
import {
  buildCreator, showCreator, updateHUD, updateCarHUD, showPrompt, notify, SERVERS,
  isUIOpen, onMenuClose, openDialogue, openShop, openChainBuilder, closeMenus,
} from './ui.js';

// ── EMERGENCY HOTFIX FEATURE FLAGS ───────────────────────────────────────────
// Unstable GLB visible-skin swaps default OFF until each passes bounds + visual
// testing. The procedural avatar/monster/buildings stay visible and stable, so
// a bad asset can never become a giant blob or hide the player. Flip a flag (or
// toggle via window.__ZW_FEATURES__ in the console / debug panel) to re-enable.
const FEATURES = {
  USE_REAL_PLAYER_SKIN: false,   // attach PSX GLB skin to the player
  USE_REAL_NPC_SKINS: false,     // attach PSX GLB skins to city NPCs
  USE_GLB_MONSTERS: false,       // swap procedural monster → PSX creature GLB
  USE_GLB_WORLD_BUILDINGS: false, // place uploaded gas/diner/market GLB landmarks
  USE_GLB_GAS_STATION_ONLY: false, // Phase 2: the gas-station GLB normalizes to a tiny prop in the
                                   // corner, so keep the full procedural station (canopy+pumps+sign).
  USE_PREFAB_TOWN_PROPS: true,    // Phase 2: scatter asset-aware prop clusters (trash/dressing) via the
                                  // prefab placement rules — additive, fallback-safe, never blocks doors/lanes.
  USE_BREAKABLE_STREET_OBJECTS: true, // Phase 2: streetlights/signs break + damage cars when rammed.
};
if (typeof window !== 'undefined') window.__ZW_FEATURES__ = FEATURES;

initLoadingScreen();
setProgress(15, 'Starting engine…');

// ── renderer / scene / cameras ────────────────────────────────────────────────
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, ...graphics.rendererInitOptions() });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
graphics.applyToRenderer(renderer);   // render scale / shadows / size from settings

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, graphics.viewDistance);
scene.add(camera); // so camera-attached props (eating piece) render

// image-based ambient lighting → realistic reflections on every PBR material
const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();

// atmospheric sky dome (Rayleigh/Mie scattering) with a sun the lighting follows
const sky = new Sky();
sky.scale.setScalar(4500);
scene.add(sky);
const skyU = sky.material.uniforms;
skyU.turbidity.value = 6;
skyU.rayleigh.value = 1.8;
skyU.mieCoefficient.value = 0.006;
skyU.mieDirectionalG.value = 0.8;
const sunSph = new THREE.Spherical();

// a mirror sky in its own scene → used to generate the environment map (IBL)
// so reflections + ambient light track the real time-of-day sky.
const envSky = new Sky();
envSky.scale.setScalar(100);
const envScene = new THREE.Scene();
envScene.add(envSky);
let hdriEnv = null;          // real HDRI reflection map (preferred when loaded)
function updateEnvironment() {
  if (hdriEnv) { scene.environment = hdriEnv; return; }  // HDRI wins; no per-frame cost
  const eu = envSky.material.uniforms;
  eu.turbidity.value = skyU.turbidity.value;
  eu.rayleigh.value = skyU.rayleigh.value;
  eu.mieCoefficient.value = skyU.mieCoefficient.value;
  eu.mieDirectionalG.value = skyU.mieDirectionalG.value;
  eu.sunPosition.value.copy(skyU.sunPosition.value);
  const prev = envRT;
  envRT = pmrem.fromScene(envScene);
  scene.environment = envRT.texture;
  if (prev) prev.dispose();
}

// Pull in a real CC0 HDRI for richer reflections on cars/jewelry/chrome.
// Procedural sky-env (above) is the fallback if it can't load.
(async () => {
  const url = hdriUrl();
  if (!url) return;
  setStatus('Loading environment lighting…');
  const env = await loadHDRI(renderer, url, loadingManager);
  if (env) { hdriEnv = env; scene.environment = env; graphics.applyToScene(scene, renderer); }
})();

const sun = new THREE.DirectionalLight('#fff4e2', 2.6);
sun.position.set(30, 50, 20); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -80; sun.shadow.camera.right = 80;
sun.shadow.camera.top = 80; sun.shadow.camera.bottom = -80; sun.shadow.camera.far = 220;
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
scene.add(sun);
scene.add(sun.target);
graphics.applyToSun(sun);   // shadow on/off + map resolution from settings
const hemi = new THREE.HemisphereLight('#bcd8ff', '#55503a', 0.45); scene.add(hemi);
const ambient = new THREE.AmbientLight('#ffffff', 0.18); scene.add(ambient);

// ── shared preview renderer (creator + chain builder) ─────────────────────────
const previewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
previewRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
previewRenderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';

function makePreviewScene() {
  const s = new THREE.Scene(); s.background = new THREE.Color('#15151f');
  s.add(new THREE.HemisphereLight('#ffffff', '#333', 1.0));
  const k = new THREE.DirectionalLight('#ffffff', 1.2); k.position.set(3, 5, 4); s.add(k);
  const f = new THREE.DirectionalLight('#88aaff', 0.6); f.position.set(-4, 2, 2); s.add(f);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(2.5, 32),
    new THREE.MeshStandardMaterial({ color: '#222233', roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; s.add(floor);
  const cam = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
  cam.position.set(0, 1.3, 4.2); cam.lookAt(0, 1.1, 0);
  return { scene: s, cam };
}
const creatorPV = makePreviewScene();
const builderPV = makePreviewScene();
let creatorAvatar = null, builderAvatar = null;

function renderPreview(pv, avatar, wrapEl) {
  if (previewRenderer.domElement.parentElement !== wrapEl) wrapEl.appendChild(previewRenderer.domElement);
  const w = wrapEl.clientWidth || 360, h = wrapEl.clientHeight || 360;
  previewRenderer.setSize(w, h, false);
  pv.cam.aspect = w / h; pv.cam.updateProjectionMatrix();
  if (avatar) avatar.group.rotation.y += 0.012;
  previewRenderer.render(pv.scene, pv.cam);
}

// ── game state & systems ──────────────────────────────────────────────────────
let state = loadState() || defaultState();
let mode = 'creator';            // 'creator' | 'play'
let started = false;
let player = null;
let cityNPCs = [], traffic = [], car = null, interiors = null;
let trafficControl = null;       // traffic lights + stop signs controller (traffic.js)
let cityEntrances = [];           // saved for live density re-registration
let entranceMap = {};            // interiorId -> { doorPos, faceDir }
let townMarkers = [];            // accumulated minimap markers (gas, buildings, police, garage)
let area = 'city';
let inCar = false;
let drivingVehicle = null;     // the vehicle currently being driven (owned car or a stolen traffic car)
let returnPos = new THREE.Vector3(0, 0, 12);
let velY = 0, onGround = true;
// ── police / crime runtime state ──────────────────────────────────────────────
let policeUnits = [];          // foot cops: { av, health, busted }
let policeCars = [];           // patrol cruisers (heavier mass, can be stolen)
let parkedCruisers = [];       // HQ cruisers parked at the police post (stealable)
let policePost = null;         // { deskPos, faceDir } from buildCity (Phase 3J)
let policeAccum = 0;           // spawn pacing
let bustTimer = 0;             // seconds a cop has been on top of the player
let policeGrace = 0;           // seconds before a bust can happen after wanted starts
let policeWarned = false;      // showed the "you've been warned" message yet
let wantedPrev = 0;            // detect the 0→wanted transition to start the grace
let copHiddenTimer = 0;        // seconds the player has been out of police line-of-sight
let ejectedPeople = [];        // drivers thrown out of stolen cars, fleeing on foot
let drivenDist = 0, drivenFlagged = false;   // "Get Around Town" mission tracker
let builderOpen = false;
let wardrobeResume = false;      // creator opened from inside the game
let refuelPoints = [];           // gas-station forecourts: { x, z, r, id }
let gasStation = null;           // { doorPos } for the 6twelve store entrance (E)
let minimap = null;              // corner radar API (initMinimap)
let debugBadge = null;           // debug panel API (initDebugBadge → { toggle })
let monsters = [];               // active Monster Mode creatures
const extraSpinners = [];        // idle-spin display models (Frostbox jewelry, etc.)

const controls = new Controls(camera, canvas);
const manager = new InteractionManager();
const clock = new THREE.Clock();

// ── creator ───────────────────────────────────────────────────────────────────
function avatarHairColorHex(custom) {
  const c = HAIR_COLORS.find((h) => h.id === (custom && custom.hairColor)) || HAIR_COLORS[0];
  return c.color;
}
function rebuildCreatorPreview() {
  if (creatorAvatar) creatorPV.scene.remove(creatorAvatar.group);
  creatorAvatar = buildAvatar(state.custom);
  creatorPV.scene.add(creatorAvatar.group);
  if (isGltfHair(state.custom.hair)) {
    const hc = avatarHairColorHex(state.custom);
    attachGltfHair(creatorAvatar, state.custom.hair, hc, renderer);
  }
}
function initCreator() {
  document.exitPointerLock?.();
  rebuildCreatorPreview();
  buildCreator(state, {
    onChange: rebuildCreatorPreview,
    hasSave: hasSave(),
    onEnter: () => { wardrobeResume ? resumeFromWardrobe() : enterWorld(); },
    onContinue: () => { state = loadState() || state; enterWorld(); },
    onReset: () => { clearSave(); state = defaultState(); initCreator(); rebuildCreatorPreview(); notify('Save cleared'); },
  });
  showCreator(true);
  mode = 'creator';
}
function resumeFromWardrobe() {
  wardrobeResume = false;
  rebuildPlayer();
  showCreator(false);
  mode = 'play';
  saveNow();
  notify('Looking fresh! 👕');
}

// ── world bootstrap ────────────────────────────────────────────────────────────
function enterWorld() {
  console.debug('[creator] enterWorld: state.custom exists =', !!(state && state.custom), '| started =', started);
  if (!started) {
    setStatus('Building the city…');
    const cityInfo = buildCity(scene);
    cityEntrances = cityInfo.entrances;
    cityInfo.entrances.forEach(e => { entranceMap[e.interiorId] = { doorPos: e.doorPos, faceDir: e.faceDir }; });
    interiors = buildInteriors();
    scene.add(interiors.group);
    trafficControl = buildTrafficControl(scene);   // lights + stop signs (Phase 3A/3B)
    debug.set('trafficLights', trafficControl.lightCount);
    debug.set('stopSigns', trafficControl.stopCount);
    setupPolicePost(cityInfo.police);              // visible HQ + parked cruisers (Phase 3J)
    // the precinct is enterable like a building, but it's built by buildPolicePost
    // (not a LANDMARK), so wire its door into the entranceMap for clean exits.
    if (cityInfo.police && cityInfo.police.doorPos) {
      entranceMap.police = { doorPos: cityInfo.police.doorPos, faceDir: cityInfo.police.entryFaceDir };
    }
    cityNPCs = createCityNPCs(scene, Math.max(8, Math.round(22 * graphics.npcDensity)));
    traffic = createTraffic(scene, Math.max(3, Math.round(10 * graphics.trafficDensity)));
    car = createDrivableCar(scene, 13, 3);
    registerInteractables(cityInfo.entrances);
    graphics.applyToScene(scene, renderer);   // reflections + texture filtering
    started = true;
    minimap = initMinimap();                   // corner radar / town map (before asset wiring)
    debug.set('minimapInit', !!minimap);
    if (!minimap) console.warn('[minimap] init FAILED — #minimap canvas missing');
    if (minimap && townMarkers.length) setMarkers(townMarkers);   // flush queued markers (police/garage)
    applyWorldAssets();                        // swap in real GLBs where available
    // applyWorldAssets() (via placeTrashJob) creates the sanitation worker,
    // dumpster and litter AFTER the first registerInteractables() pass above, so
    // those dynamic objects must be re-registered now or they'd never become
    // interactable on first load (you couldn't talk to Sanitation / grab trash).
    registerInteractables(cityEntrances);
    debug.set('sanitationNpc', !!sanitationNpc);
    debug.set('trashPieces', cityTrash.length);
    console.info('[interact] re-registered dynamic objects — sanitation:', !!sanitationNpc,
      '| dumpster:', !!dumpster, '| trashPieces:', cityTrash.length);
    initGameSystems();                         // weapons + missions + police hooks
  }
  rebuildPlayer();
  player.group.position.set(state.pos.x, 0, state.pos.z);
  player.group.rotation.y = state.facing || 0;
  returnPos.set(state.pos.x, 0, state.pos.z);
  area = 'city';
  interiors.group.visible = false;
  state.createdCharacter = true;
  applyVibe();
  showCreator(false);
  mode = 'play';
  notify("Welcome to Zaylin's World — click to look, WASD to move, E to interact");
  saveNow();
}

function rebuildPlayer() {
  const pos = player ? player.group.position.clone() : new THREE.Vector3(state.pos.x, 0, state.pos.z);
  const rot = player ? player.group.rotation.y : (state.facing || 0);
  const vis = player ? player.group.visible : true;
  if (player) scene.remove(player.group);
  player = buildAvatar(state.custom);
  player.group.position.copy(pos);
  player.group.rotation.y = rot;
  player.group.visible = vis;
  scene.add(player.group);
  if (isGltfHair(state.custom.hair)) {
    attachGltfHair(player, state.custom.hair, avatarHairColorHex(state.custom), renderer);
  }
  mountHeldWeapon();                          // re-attach the visible 3rd-person weapon prop
  // Visible-skin pass: drop a real PSX humanoid GLB on top of the procedural rig
  // (procedural body hidden ONLY after the GLB passes bounds validation). Default
  // OFF (USE_REAL_PLAYER_SKIN) so the player is never invisible / never a blob.
  if (FEATURES.USE_REAL_PLAYER_SKIN && state.useRealSkin !== false) {
    console.debug('[skin] applyPlayerSkin: attempting real player skin');
    applyPlayerSkin(player, renderer, playerSkinSeed())
      .then((ok) => { debug.set('playerRealSkin', !!ok); console.debug('[skin] player real-skin applied =', !!ok); })
      .catch((e) => debug.showError('applyPlayerSkin: ' + (e && e.message || e)));
  } else {
    debug.set('playerRealSkin', false);
  }
}

// Stable per-save pick so the player's GLB model doesn't change every rebuild.
function playerSkinSeed() {
  const s = JSON.stringify(state.custom || {});
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
  return h;
}

// ── visible held weapon (3rd person) ────────────────────────────────────────────
// The REAL weapon model is mounted in the player's right hand so the equipped
// weapon is actually visible on the avatar (not just a HUD label). It loads the
// catalog GLB asynchronously with a procedural placeholder shown instantly, and
// places it using the per-weapon HAND transform (weaponTransforms.js). Melee
// weapons get a stylized procedural shape (bat / pipe / wrench / plank).
let heldWeaponProp = null;
let heldWeaponToken = 0;
// Drives the melee swing arc overlay on the right arm (seconds remaining).
let meleeSwingT = 0;
function triggerMeleeSwing() { meleeSwingT = 0.26; }
// ── grip tuning (dev) ─────────────────────────────────────────────────────────
// Live per-weapon hand-transform nudges, persisted to localStorage so a tuned
// grip survives a reload. Press P to toggle the grip-debug overlay, then nudge
// with I/K (forward/back), J/L (left/right), U/O (up/down), [ ] (rotate),
// - / = (scale). The overlay shows the active id, category, anchor and live
// pos/rot/fit + hand world position so the grip can be dialed in by eye.
let gripDebug = false;
let gripOverrides = {};
try { gripOverrides = JSON.parse(localStorage.getItem('zw.gripOverrides') || '{}') || {}; } catch { gripOverrides = {}; }
function saveGripOverrides() { try { localStorage.setItem('zw.gripOverrides', JSON.stringify(gripOverrides)); } catch { /* ignore */ } }
// Merge a live override (if any) over the configured transform for a weapon.
function gripTransformFor(w) {
  const tf = resolveTransform(w, 'hand');
  const ov = gripOverrides[w.id];
  if (ov) {
    if (ov.pos) tf.pos = ov.pos.slice();
    if (ov.rot) tf.rot = ov.rot.slice();
    if (ov.fit != null) tf.fit = ov.fit;
  }
  return tf;
}
function mountHeldWeapon() {
  if (!player) return;
  const arm = player.parts && player.parts.rightArm;
  if (!arm) return;
  // Prefer the dedicated fist grip anchor so the weapon seats IN the hand rather
  // than floating off the wrist; fall back to the arm if the anchor is missing.
  const hand = (player.parts.anchors && player.parts.anchors.right_hand) || arm;
  if (heldWeaponProp) { heldWeaponProp.parent?.remove(heldWeaponProp); heldWeaponProp = null; }
  const w = currentWeapon();
  if (!w || w.id === 'fists') return;            // bare fists → nothing in hand
  const holder = new THREE.Group();
  holder.name = 'heldweapon';                    // kept visible even under a GLB skin
  holder.position.set(0, 0, 0);                  // anchor is already at the fist
  hand.add(holder);
  heldWeaponProp = holder;
  holder.userData.anchorName = (hand === arm) ? 'rightArm' : 'right_hand';

  const tf = gripTransformFor(w);
  // instant procedural placeholder so the hand is never empty while the GLB loads
  const placeholder = buildProceduralWeaponMesh(w, tf.fit);
  applyHandTransform(placeholder, tf);
  holder.add(placeholder);

  // async swap to the real asset when one exists for this weapon
  if (w.slot || w.asset) {
    const token = ++heldWeaponToken;
    loadHeldWeaponModel(w, tf.fit).then((model) => {
      if (token !== heldWeaponToken || heldWeaponProp !== holder || !model) return;
      holder.remove(placeholder);
      applyHandTransform(model, tf);
      holder.add(model);
    }).catch((e) => console.debug('[heldweapon] GLB load failed, keeping placeholder', e && e.message));
  }
  if (gripDebug) updateGripDebug();
}

function applyHandTransform(obj, tf) {
  obj.position.set(tf.pos[0], tf.pos[1], tf.pos[2]);
  obj.rotation.set(tf.rot[0], tf.rot[1], tf.rot[2]);
}

// ── grip-debug overlay + dev nudge controls ──────────────────────────────────
function gripDebugEl() {
  let el = document.getElementById('grip-debug');
  if (!el) {
    el = document.createElement('div');
    el.id = 'grip-debug';
    el.style.cssText = 'position:fixed;left:12px;top:120px;z-index:200;font:12px/1.5 monospace;' +
      'background:rgba(8,12,20,.86);color:#d8e6ff;padding:10px 12px;border:1px solid #2c4a6e;' +
      'border-radius:8px;max-width:300px;pointer-events:none;white-space:pre;';
    document.body.appendChild(el);
  }
  return el;
}
function toggleGripDebug() {
  gripDebug = !gripDebug;
  const el = gripDebugEl();
  el.style.display = gripDebug ? 'block' : 'none';
  if (gripDebug) updateGripDebug();
  notify(gripDebug ? '🛠️ Grip debug ON — I/K J/L U/O move · [ ] rotate · -/= scale' : 'Grip debug off');
}
function updateGripDebug() {
  if (!gripDebug) return;
  const el = gripDebugEl();
  const w = currentWeapon();
  if (!w || w.id === 'fists') { el.textContent = 'Grip debug — equip a weapon (fists = none)'; return; }
  const tf = gripTransformFor(w);
  const r = (n) => (Math.round(n * 1000) / 1000).toFixed(3);
  const deg = (n) => (Math.round((n * 180 / Math.PI) * 10) / 10);
  let handWorld = '—';
  const hand = player && player.parts && player.parts.anchors && player.parts.anchors.right_hand;
  if (hand) { const v = new THREE.Vector3(); hand.getWorldPosition(v); handWorld = `${r(v.x)}, ${r(v.y)}, ${r(v.z)}`; }
  const anchor = heldWeaponProp ? (heldWeaponProp.userData.anchorName || '?') : '—';
  const tuned = gripOverrides[w.id] ? ' (tuned*)' : '';
  el.textContent =
    `GRIP DEBUG${tuned}\n` +
    `id     : ${w.id}\n` +
    `cat    : ${w.category}\n` +
    `anchor : ${anchor}\n` +
    `pos    : ${r(tf.pos[0])}, ${r(tf.pos[1])}, ${r(tf.pos[2])}\n` +
    `rot°   : ${deg(tf.rot[0])}, ${deg(tf.rot[1])}, ${deg(tf.rot[2])}\n` +
    `fit    : ${r(tf.fit)}\n` +
    `hand→world: ${handWorld}`;
}
// Apply a nudge to the equipped weapon's live grip override, then remount.
function nudgeGrip(dPos = [0, 0, 0], dRot = [0, 0, 0], dFit = 0) {
  const w = currentWeapon();
  if (!w || w.id === 'fists') return;
  const tf = gripTransformFor(w);
  const ov = gripOverrides[w.id] = gripOverrides[w.id] || {};
  ov.pos = [tf.pos[0] + dPos[0], tf.pos[1] + dPos[1], tf.pos[2] + dPos[2]];
  ov.rot = [tf.rot[0] + dRot[0], tf.rot[1] + dRot[1], tf.rot[2] + dRot[2]];
  ov.fit = Math.max(0.05, tf.fit + dFit);
  saveGripOverrides();
  mountHeldWeapon();
  updateGripDebug();
  console.debug('[grip] override for', w.id, JSON.stringify(ov));
}
function resetGrip() {
  const w = currentWeapon();
  if (!w || gripOverrides[w.id] == null) return;
  delete gripOverrides[w.id];
  saveGripOverrides();
  mountHeldWeapon();
  updateGripDebug();
  notify('↩️ Grip reset for ' + w.name);
}

// Normalize a loaded scene: longest axis → fit metres, recentred into a wrapper.
function fitWeaponModel(scene, fit) {
  const inst = scene.clone(true);
  inst.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = false; } });
  const box = new THREE.Box3().setFromObject(inst);
  const size = box.getSize(new THREE.Vector3());
  const longest = Math.max(size.x, size.y, size.z) || 1;
  inst.scale.multiplyScalar(fit / longest);
  const box2 = new THREE.Box3().setFromObject(inst);
  const c = box2.getCenter(new THREE.Vector3());
  inst.position.sub(c);
  const wrap = new THREE.Group(); wrap.add(inst);
  return wrap;
}

async function loadHeldWeaponModel(w, fit) {
  let model = null;
  try {
    if (w.slot) model = await loadSlotModel('weapons', w.slot, renderer);
  } catch { model = null; }
  // Fall back to the catalog's named asset if the manifest slot is missing, so a
  // real GLB is used whenever one exists (rather than the procedural placeholder).
  if (!(model && (model.scene || model.isObject3D)) && w.asset) {
    try { model = await loadAsset('weapons', w.asset.pack, w.asset.name, renderer); } catch { model = null; }
  }
  const scene = model && (model.scene || (model.isObject3D ? model : null));
  if (!scene) return null;
  return fitWeaponModel(scene, fit);
}

// Stylized procedural weapon shapes (placeholder for ranged, primary for melee).
function buildProceduralWeaponMesh(w, fit = 0.5) {
  const metal = new THREE.MeshStandardMaterial({ color: '#22262b', roughness: 0.5, metalness: 0.6 });
  const grip = new THREE.MeshStandardMaterial({ color: '#3a2c22', roughness: 0.85 });
  const wood = new THREE.MeshStandardMaterial({ color: '#7a5a36', roughness: 0.9 });
  const g = new THREE.Group();
  const shape = w.shape || (w.melee ? 'bat' : 'gun');
  if (shape === 'bat') {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.28, 8), wood); handle.position.y = -0.18; g.add(handle);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.34, 10), wood); head.position.y = 0.12; g.add(head);
  } else if (shape === 'pipe') {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.6, 10), metal); g.add(pipe);
    const joint = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.08, 10), metal); joint.position.y = 0.24; g.add(joint);
  } else if (shape === 'wrench') {
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.02), metal); g.add(shaft);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.03), metal); head.position.y = 0.24; g.add(head);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.05), new THREE.MeshStandardMaterial({ color: '#11141a' })); slot.position.y = 0.27; g.add(slot);
  } else if (shape === 'plank') {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.04), wood); g.add(plank);
  } else {
    // generic gun block
    const long = ['rifles', 'compact', 'shotguns', 'precision', 'heavy'].includes(w.category);
    const barrelLen = w.category === 'heavy' ? 0.95 : (w.category === 'precision' ? 0.9 : long ? 0.7 : 0.34);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, barrelLen), metal); body.position.z = -barrelLen * 0.2; g.add(body);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.08), grip); handle.position.set(0, -0.12, 0.04); g.add(handle);
    if (w.category === 'heavy') { const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.95, 10), metal); tube.rotation.x = Math.PI / 2; tube.position.z = -0.2; g.add(tube); }
  }
  return fitWeaponModel(g, fit);
}

// ── Block Supply physical weapon displays (P4) ────────────────────────────────
// Spreads every catalog weapon across the store's wall/rack zones as a real
// model on a backing plate with a price/name marker. Each display is registered
// as an interactable (built lazily once; interactables re-registered each pass).
let blockSupplyBuilt = false;
const blockSupplyDisplays = [];   // { weapon, ipos:Vector3, label, owned }
function ensureBlockSupplyDisplays() {
  if (blockSupplyBuilt) return;
  const intr = interiors && interiors.byId && interiors.byId.blocksupply;
  if (!intr || !intr.group) return;
  blockSupplyBuilt = true;
  // Real GLB/procedural weapon displays now fill the shop walls — hide the old
  // grey "ARMS DEALER" silhouette placeholder so the room no longer looks like
  // a wall of blocks (P6).
  if (intr.placeholderWeaponWall) intr.placeholderWeaponWall.visible = false;
  const off = intr.offset || { x: 0, z: 0 };
  const plateMat = new THREE.MeshStandardMaterial({ color: '#10141c', roughness: 0.85, metalness: 0.2 });
  const zoneCounts = {};
  const zoneHeaderDone = {};
  let displayCount = 0, glbSwaps = 0;
  for (const w of allWeapons()) {
    if (w.id === 'fists') continue;                       // fists are never a display
    const zone = SHOP_ZONES[w.display] ? w.display : 'featured';
    const idx = (zoneCounts[zone] = (zoneCounts[zone] || 0));
    zoneCounts[zone] = idx + 1;
    const slot = zoneSlot(zone, idx);
    const wx = off.x + slot.pos[0], wy = slot.pos[1], wz = off.z + slot.pos[2];
    const disp = resolveTransform(w, 'display');
    const grp = new THREE.Group();
    grp.position.set(wx, wy, wz);
    grp.rotation.y = slot.facing + (disp.rot[1] || 0);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.06), plateMat);
    plate.position.set(0, 0, -0.14); grp.add(plate);
    // instant procedural model, async-swap to the real GLB when present
    let mesh = buildProceduralWeaponMesh(w, disp.fit);
    mesh.rotation.set(disp.rot[0] || 0, 0, disp.rot[2] || 0);
    grp.add(mesh);
    if (w.slot || w.asset) {
      loadHeldWeaponModel(w, disp.fit).then((model) => {
        if (!model) { console.debug('[blocksupply] no GLB for', w.id, '— procedural kept'); return; }
        grp.remove(mesh); mesh = model;
        model.rotation.set(disp.rot[0] || 0, 0, disp.rot[2] || 0);
        grp.add(model);
        glbSwaps++; debug.set('blockSupplyGlb', glbSwaps);
      }).catch((e) => { console.debug('[blocksupply] GLB failed for', w.id, e && e.message); });
    }
    const owned = (state.ownedWeapons || []).includes(w.id);
    const label = makeLabel(owned ? `${w.name}  ✓` : `${w.name}  $${w.price}`, owned ? '#9fffa0' : '#ffd27f');
    label.position.set(0, 0.52, 0); label.scale.multiplyScalar(0.82);
    grp.add(label);
    intr.group.add(grp);
    blockSupplyDisplays.push({ weapon: w, ipos: new THREE.Vector3(wx, 0, wz), label });
    displayCount++;
    // zone header banner (once per zone)
    if (!zoneHeaderDone[zone]) {
      zoneHeaderDone[zone] = true;
      const z = SHOP_ZONES[zone];
      const head = makeLabel(z.label.toUpperCase(), '#7fd0ff');
      head.position.set(off.x + z.origin[0], z.origin[1] + 0.85, off.z + z.origin[2]);
      head.scale.multiplyScalar(1.05);
      intr.group.add(head);
    }
  }
  console.info('[blocksupply] built', displayCount, 'weapon displays across', Object.keys(zoneCounts).length, 'zones (GLBs swap in async)');
  debug.set('blockSupplyDisplays', displayCount);
}
// Refresh a display's price/name marker after a purchase (owned → ✓).
function refreshBlockSupplyLabel(entry) {
  if (!entry || !entry.label) return;
  const w = entry.weapon;
  const owned = (state.ownedWeapons || []).includes(w.id);
  const next = makeLabel(owned ? `${w.name}  ✓` : `${w.name}  $${w.price}`, owned ? '#9fffa0' : '#ffd27f');
  entry.label.material.map = next.material.map;
  entry.label.material.needsUpdate = true;
}
// Per-weapon purchase / details panel opened by clicking a wall display.
function openWeaponDisplay(entry) {
  const w = entry.weapon;
  const owned = (state.ownedWeapons || []).includes(w.id);
  const stat = w.melee
    ? `Melee · dmg ${w.dmg} · reach ${w.range}m`
    : `dmg ${w.dmg} · mag ${w.mag} · ${w.auto ? 'auto' : 'semi'} · ${w.rpm} rpm`;
  const choices = [];
  if (!owned) {
    choices.push({ label: `Buy ${w.name}  ($${w.price})`, onPick: () => { if (buyWeapon(w.id)) { refreshBlockSupplyLabel(entry); equipWeapon(w.id); } return undefined; } });
  } else {
    choices.push({ label: `Equip ${w.name}`, onPick: () => { equipWeapon(w.id); } });
    if (!w.melee) choices.push({ label: 'Restock ammo for this', onPick: () => { buyWeapon(w.id); return undefined; } });
  }
  choices.push({ label: 'Open full catalog', onPick: () => { openWeaponShop(); } });
  choices.push({ label: 'Close', onPick: () => {} });
  openDialogue({ name: `${w.icon} ${w.name}`, text: `${w.desc}\n${stat}`, choices });
}



// Strategy: keep MOVING things procedural (player + city NPCs animate, traffic &
// drivable car spin their wheels). Swap STATIC things to real GLBs — interior
// shopkeepers, dealership showroom cars, and Frostbox jewelry — so the pack is
// clearly visible in-game with no animation regressions.
// Build the city gas station. The REAL uploaded 6twelve gas-station GLB (pumps +
// canopy + storefront + signage) is the headline model; a compact procedural
// station (canopy + two pumps + price sign) is built first as a guaranteed-
// visible fallback and hidden once the GLB loads. Registers a drive-up refuel
// forecourt, a minimap marker, and an on-foot store entrance that teleports the
// player into the walkable 6twelve store interior.
function buildProceduralGasStation() {
  const GX = -46, GZ = 24;                          // standalone lot, west edge (south of Block Supply), set back off the ring road
  const grp = new THREE.Group(); grp.name = 'gas-station-proc';
  const procColliders = [];                         // pump colliders (removed if a GLB takes over)
  // forecourt pad (decorative — no collider so it never blocks driving). Sized
  // to a believable full station: ~24×18 lot you can pull a car onto.
  const pad = new THREE.Mesh(new THREE.BoxGeometry(24, 0.12, 18),
    new THREE.MeshStandardMaterial({ color: '#2b2e36', roughness: 0.95 }));
  pad.position.set(GX, 0.06, GZ); grp.add(pad);
  // painted lane markings + parking stalls along the store front
  const stripeMat = new THREE.MeshStandardMaterial({ color: '#c9b23a', roughness: 0.8 });
  for (const dz of [-3.4, 3.4]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(13, 0.14, 0.2), stripeMat);
    s.position.set(GX + 1, 0.07, GZ + dz); grp.add(s);
  }
  // three parking stalls in front of the store (left side of the lot)
  for (const pz of [-4.5, -1.5, 1.5, 4.5]) {
    const ln = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.13, 0.16), stripeMat);
    ln.position.set(GX - 7.4, 0.07, GZ + pz); grp.add(ln);
  }
  // canopy: four posts + a big flat roof spanning the pump island
  const postMat = new THREE.MeshStandardMaterial({ color: '#9aa0aa', roughness: 0.6, metalness: 0.3 });
  for (const dx of [0.4, 4.8]) for (const dz of [-5.4, 5.4]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 5.4, 12), postMat);
    post.position.set(GX + dx, 2.7, GZ + dz); grp.add(post);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.5, 13),
    new THREE.MeshStandardMaterial({ color: '#d23b3b', roughness: 0.5 }));
  roof.position.set(GX + 2.6, 5.5, GZ); grp.add(roof);
  const roofTrim = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 13.2),
    new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }));
  roofTrim.position.set(GX + 6.3, 5.3, GZ); grp.add(roofTrim);
  // four pumps under the canopy (solid — small colliders) on two islands
  const pumpMat = new THREE.MeshStandardMaterial({ color: '#e6e9ef', roughness: 0.5, metalness: 0.2 });
  const screenMat = new THREE.MeshStandardMaterial({ color: '#1b3a2b', emissive: '#0f5', emissiveIntensity: 0.25 });
  // raised pump islands (kerbs) so the pumps read as a real forecourt
  for (const dz of [-3, 3]) {
    const island = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 3.4),
      new THREE.MeshStandardMaterial({ color: '#3a3d44', roughness: 0.9 }));
    island.position.set(GX + 2.6, 0.12, GZ + dz); grp.add(island);
  }
  for (const dz of [-4, -2, 2, 4]) {
    const pump = new THREE.Group();
    const pbox = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.7, 0.8), pumpMat);
    pbox.position.y = 0.85; pump.add(pbox);
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.55), screenMat);
    screen.position.set(0.32, 1.3, 0); pump.add(screen);
    const nozzle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.14), pumpMat);
    nozzle.position.set(0, 1.0, 0.5); pump.add(nozzle);
    pump.position.set(GX + 2.6, 0.2, GZ + dz);
    grp.add(pump);
    pump.updateWorldMatrix(true, true);
    const pc = new THREE.Box3().setFromObject(pump).expandByScalar(0.1);
    cityColliders.push(pc); procColliders.push(pc);
  }
  // full-sized store building behind the canopy (clear entrance facing the road)
  const store = new THREE.Mesh(new THREE.BoxGeometry(10, 4.2, 9),
    new THREE.MeshStandardMaterial({ color: '#d8cdb4', roughness: 0.85 }));
  store.position.set(GX - 6.5, 2.1, GZ); grp.add(store);
  {
    // store collider (solid building); leave a doorway gap on the +x (road) face
    const sc = new THREE.Box3().setFromObject(store).expandByScalar(0.05);
    cityColliders.push(sc); procColliders.push(sc);
  }
  // storefront fascia band + glass front
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.0, 9.2),
    new THREE.MeshStandardMaterial({ color: '#16224d', roughness: 0.5 }));
  fascia.position.set(GX - 1.4, 3.6, GZ); grp.add(fascia);
  const glassFront = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.2, 3.0),
    new THREE.MeshPhysicalMaterial({ color: '#bfe0ff', transparent: true, opacity: 0.22,
      roughness: 0.05, metalness: 0, transmission: 0.8, ior: 1.4, thickness: 0.2 }));
  glassFront.position.set(GX - 1.45, 1.4, GZ - 2.6); grp.add(glassFront);
  // entrance door panel
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.4, 1.8),
    new THREE.MeshStandardMaterial({ color: '#2a3550', roughness: 0.6, metalness: 0.2 }));
  door.position.set(GX - 1.45, 1.3, GZ + 1.4); grp.add(door);
  // tall price sign at the road edge
  const signPost = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 6, 8), postMat);
  signPost.position.set(GX + 6.4, 3, GZ + 7); grp.add(signPost);
  const board = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.7, 0.2),
    new THREE.MeshStandardMaterial({ color: '#16224d', roughness: 0.5 }));
  board.position.set(GX + 6.4, 5.4, GZ + 7); grp.add(board);
  { const l = makeLabel('⛽ GAS  $1.20/u', '#ffd98a'); l.position.set(GX + 6.4, 5.4, GZ + 7.15); l.scale.multiplyScalar(1.2); grp.add(l); }
  { const l = makeLabel('6TWELVE', '#ff8a3a'); l.position.set(GX - 1.5, 3.6, GZ); l.scale.multiplyScalar(1.3); grp.add(l); }
  scene.add(grp);
  // the store door sits on the front (+x) face of the store, toward the road
  const doorPos = new THREE.Vector3(GX - 1.4, 0, GZ + 1.4);
  gasStation = { doorPos };
  // register the refuel forecourt + minimap marker (zone covers the pump island
  // so you can drive off the ring road onto the pumps)
  refuelPoints = [{ x: GX + 2.6, z: GZ, r: 8.5, id: 'gas-proc', price: 1.2 }];
  if (minimap) addTownMarkers([{ x: GX, z: GZ, color: '#ffd54a', icon: '⛽' }]);
  console.info('[gas] gas station placed at', GX, GZ, '(store door', doorPos.x, doorPos.z + ')');
  // NOTE: the uploaded 6twelve gas-station.glb is a FULL station — it bakes the
  // entire convenience-store INTERIOR (shelving, cereal/candy racks, fryers,
  // boxes, checkout) inside a glass shell. Dropping it into the open city made
  // that interior render through the glass as a "shelf maze" outside. With 961
  // nodes there's no reliable exterior/interior split, so we DELIBERATELY keep
  // the clean procedural station exterior above (canopy + pumps + store box +
  // sign + price board) and serve the store as the separate walkable interior
  // room (interiors.byId.gas). Do NOT re-enable the city GLB without a verified
  // exterior-only node filter.
  debug.set('gasStationGLB', false);
  // tryGasStationGLB(GX, GZ, grp, procColliders);  // disabled: GLB includes interior clutter
}

// Attempt to load the 6twelve gas-station GLB and swap it in for the procedural
// art ONLY if it passes finite/size/footprint checks (so a tiny-scaled-huge or
// NaN asset can never become a blob). Async + fully guarded — any failure logs a
// reason to the debug panel and leaves the procedural station untouched.
async function tryGasStationGLB(GX, GZ, procGroup, procColliders) {
  try {
    const res = await loadAsset('buildings', 'gas-station', 'gas-station', renderer);
    if (!res || !res.scene) { console.warn('[gas] GLB missing/decode-failed — keeping procedural'); debug.set('gasStationGLB', false); return; }
    const obj = res.scene;
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3(); box.getSize(size);
    if (![size.x, size.y, size.z].every(Number.isFinite)) {
      debug.showError && debug.showError('gas GLB rejected: non-finite bounds'); return;
    }
    const foot = Math.max(size.x, size.z);
    if (!(foot > 0.01)) { console.warn('[gas] GLB rejected: degenerate/zero size'); return; }
    // normalize so the longest FOOTPRINT side is ~16 units (fits the lot without
    // poking into the ring-road sidewalk), then re-measure + reject if oversized.
    const scale = 16 / foot;
    if (!Number.isFinite(scale) || scale <= 0) { console.warn('[gas] GLB rejected: bad scale'); return; }
    obj.scale.setScalar(scale);
    obj.updateWorldMatrix(true, true);
    const box2 = new THREE.Box3().setFromObject(obj);
    const size2 = new THREE.Vector3(); box2.getSize(size2);
    const ctr = new THREE.Vector3(); box2.getCenter(ctr);
    if (Math.max(size2.x, size2.z) > 30 || size2.y > 20) {
      console.warn('[gas] GLB rejected: footprint too large after scale', size2);
      debug.showError && debug.showError('gas GLB rejected: oversized footprint'); return;
    }
    // seat it on the ground, centred on the station lot
    obj.position.set(GX - (ctr.x - obj.position.x), obj.position.y - box2.min.y, GZ - (ctr.z - obj.position.z));
    obj.name = 'gas-station-glb';
    obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    // SWAP: hide the procedural visuals + drop their pump colliders (the GLB is
    // decorative so the forecourt stays drivable and the refuel zone stays clear).
    procGroup.visible = false;
    for (const c of procColliders) { const i = cityColliders.indexOf(c); if (i >= 0) cityColliders.splice(i, 1); }
    scene.add(obj);
    debug.set('gasStationGLB', true);
    console.info('[gas] 6twelve GLB placed (scale', scale.toFixed(3), '| footprint',
      size2.x.toFixed(1) + '×' + size2.z.toFixed(1) + ')');
  } catch (e) {
    console.warn('[gas] GLB load threw — keeping procedural:', e);
    debug.showError && debug.showError('gas GLB: ' + (e && e.message || e));
  }
}

function applyWorldAssets() {
  enhanceShopkeepers();
  // Frostbox jewelry is purely decorative — never let a load/placement failure
  // black-screen startup. It's async + fire-and-forget, so swallow any rejection.
  Promise.resolve().then(placeFrostboxJewelry).catch((e) => {
    console.warn('[frostbox] jewelry placement failed — skipping:', e);
    debug.showError && debug.showError('frostbox jewelry: ' + (e && e.message || e));
  });
  applyVehicleModels();                      // swap procedural cars → real Car Kit GLBs (incl. dealership)  // swap the bubble city NPCs for PSX humanoid GLB skins (visible, animated)
  debug.set('procNpcs', cityNPCs.length);
  if (FEATURES.USE_REAL_NPC_SKINS) {
    applyNpcSkins(cityNPCs, renderer)
      .then((n) => { debug.set('realNpcs', n); debug.set('procNpcs', Math.max(0, cityNPCs.length - n)); })
      .catch((e) => { console.warn('[skins] npc failed:', e); debug.showError('applyNpcSkins: ' + (e && e.message || e)); });
  } else {
    debug.set('realNpcs', 0);
    console.info('[skins] NPC GLB skins disabled (USE_REAL_NPC_SKINS=false) — procedural NPCs stay visible');
  }
  // scatter collectible gems across the city (Ultimate Gem Collection textures)
  placeCityGems();
  // Cleanup side job: the pickuppable litter now uses the REAL Trash & Debris
  // models (Phase 3C) so the trash you see IS the trash you grab. Load the
  // templates first, then place the job trash; a clean procedural bag is the
  // only fallback if the GLB is unavailable. No separate decorative scatter
  // (that produced real-looking-but-ungrabbable litter spread through streets).
  loadTrashTemplates(renderer)
    .catch(() => {})
    .then(() => { placeTrashJob(); registerInteractables(cityEntrances); debug.set('trashTargets', activeTrashCount()); });
  // always-present procedural gas station (the refuel loop must be usable even
  // with GLB world buildings disabled)
  buildProceduralGasStation();
  // Phase 2: asset-aware town dressing (trash clusters + dumpsters) placed via
  // the prefab/variation/placement system — additive, deterministic, fallback-safe.
  if (FEATURES.USE_PREFAB_TOWN_PROPS) {
    dressTown(scene, renderer, { seed: state.townSeed || 'starter-town' })
      .then((s) => {
        debug.set('prefabProps', s.prefabsPlaced);
        debug.set('prefabAssets', s.assetsSelected);
        debug.set('prefabFallbacks', s.fallbackCount);
        debug.set('prefabSeed', s.seed);
        debug.set('breakableObjects', breakableCount());
        debug.set('worldObjects', worldObjectCount());
        (s.failedAssets || []).forEach((f) => debug.addFailedAsset(f));
      })
      .catch((e) => { console.warn('[town] dressing failed:', e); debug.showError && debug.showError('dressTown: ' + (e && e.message || e)); });
  } else {
    debug.set('prefabProps', 0);
  }
  // place Kenney Retro Urban Kit buildings into the district (async, fire-and-forget)
  buildDistrict(scene, renderer)
    .then((placed) => { if (placed && placed.length) console.info('[district] landmarks:', placed.map(p => p.label).join(', ')); })
    .catch((e) => console.warn('[district] failed:', e));
  // drop the uploaded GLB landmark buildings (gas station, diner, mini-market)
  if (FEATURES.USE_GLB_WORLD_BUILDINGS) {
    placeWorldBuildings(scene, renderer)
      .then((res) => {
        refuelPoints = res.refuels || [];
        if (minimap) addTownMarkers(res.markers || []);
        debug.set('worldBuildingsPlaced', (res.placed || []).length);
        debug.incr('glbBuildings', (res.placed || []).length);
      })
      .catch((e) => console.warn('[worldbld] failed:', e));
  } else {
    debug.set('worldBuildingsPlaced', 0);
    console.info('[worldbld] GLB landmarks disabled (USE_GLB_WORLD_BUILDINGS=false)');
  }
  // furnish the walkable interiors with uploaded furniture + food props
  furnishInteriors(interiors, renderer)
    .then((res) => {
      if (res && typeof res === 'object') {
        debug.set('interiorsFurnished', res.interiors || 0);
        debug.set('furniturePlaced', res.items || 0);
        (res.failed || []).forEach((f) => debug.addFailedAsset(f));
      }
    })
    .catch((e) => { console.warn('[furnish] failed:', e); debug.showError('furnishInteriors: ' + (e && e.message || e)); });
}

// Swap the procedural traffic + drivable cars for real Kenney Car Kit models
// (CC0). Static-mesh cars with separate wheel nodes, so wheel-spin still works;
// collision circles + drive/steal logic are unchanged. Procedural cars remain as
// a graceful fallback if the kit fails to preload.
async function applyVehicleModels() {
  try {
    await preloadVehicles(renderer);
  } catch (e) { console.warn('[vehicles] preload failed:', e); return; }
  // varied traffic
  traffic.forEach((c, i) => swapVehicleVisual(c, TRAFFIC_FLEET[i % TRAFFIC_FLEET.length]));
  // the player's drivable car
  if (car) swapVehicleVisual(car, DRIVABLE_DEFAULT);
  // dealership showroom — each car gets its OWN unique model (price-tiered), so a
  // $3.5k hatch never shares a body with a $92k supercar.
  const dealer = interiors && interiors.byId['dealership'];
  if (dealer && dealer.displayCars) {
    dealer.displayCars.forEach((dc, i) => {
      const def = DEALER_CARS[i];
      swapVehicleVisual(dc, (def && def.kitModel) || DEALER_FLEET[i % DEALER_FLEET.length]);
    });
  }
  // parked HQ cruisers → real POLICE GLB (preload is guaranteed done above, so
  // they stop looking like white starter cars). Light bar livery is kept.
  let cruiserGlb = 0;
  (parkedCruisers || []).forEach((cr) => { if (swapVehicleVisual(cr, 'police')) cruiserGlb++; });
  console.log('[vehicles] models applied — traffic:', traffic.length, 'dealer:', dealer?.displayCars?.length || 0, 'cruisers:', cruiserGlb);
  debug.set('vehicleModels', traffic.length + (car ? 1 : 0) + (dealer?.displayCars?.length || 0));
  debug.set('glbTraffic', traffic.length);
  debug.set('glbCruisers', cruiserGlb);
}

// static shop staff → GLB humanoids
function enhanceShopkeepers() {
  if (!interiors) return;
  Object.values(interiors.byId).forEach((intr) => {
    const slot = intr.npcSlot;
    if (!slot || !intr.avatars) return;
    intr.avatars.forEach((av) => { if (!av.usingModel) enhanceAvatar(av, 'characters', slot, renderer); });
  });
}

// dealership showroom cars → GLB vehicles (static display, so wheel-spin is moot)
function enhanceShowroomCars() {
  if (!interiors) return;
  const intr = interiors.byId['dealership'];
  if (!intr || !intr.displayCars) return;
  intr.displayCars.forEach((dc) => { if (!dc.group.userData.usingModel) enhanceVehicle(dc.group, dc.slot, renderer); });
}

// Frostbox jewelry — display case, cuban chain, iced pendant, hero diamond — all
// real GLBs placed on mounts so the store clearly reads as a jewelry shop.
async function placeFrostboxJewelry() {
  if (!interiors) return;
  const intr = interiors.byId['frostbox'];
  if (!intr || !intr.jewelryMounts) return;
  const M = intr.jewelryMounts;

  const place = async (cat, slot, mount, { scale = 1, spin = false, y = 0 } = {}) => {
    try {
      const model = await loadSlotModel(cat, slot, renderer);
      if (!model) return null;
      const obj = model.scene;
      obj.scale.multiplyScalar(scale);
      obj.position.copy(mount).add(new THREE.Vector3(0, y, 0));
      obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      interiors.group.add(obj);
      if (spin && obj) extraSpinners.push(obj);
      return obj;
    } catch (e) {
      console.warn('[frostbox] failed to place ' + slot + ':', e);
      return null;
    }
  };

  await place('jewelry', 'frostbox_display_case', M.displayCase, { scale: 1 });
  await place('jewelry', 'frostbox_chain_cuban', M.chain, { scale: 0.8, spin: true });
  await place('jewelry', 'frostbox_pendant_initial', M.pendant, { scale: 0.5, spin: true });
  await place('jewelry', 'frostbox_gem_diamond', M.gem, { scale: 0.5, spin: true });

  placeFrostboxGems(M.gemWall);

  graphics.applyToScene(scene, renderer);   // pick up envMap reflection intensity
}

// Fill the Frostbox back wall with a glowing rack of gems built from the 2D gem
// texture set (Ultimate Gem Collection). Each gem is an unlit, alpha-cut plane
// faced into the room so it reads as iced-out merchandise on the shelf.
const GEM_TEXTURES = [
  'gem6-diamond', 'gem2-emerald', 'gem3-pink', 'gem2-yellow', 'gem5-blue', 'gem8-gold',
  'gem7-darkblue', 'gem10-green', 'gem9-green', 'gem3-orange', 'gem3-deepred', 'gem11-lightblue',
];
function placeFrostboxGems(wall) {
  if (!wall || !interiors) return;
  const texLoader = new THREE.TextureLoader(loadingManager);
  const rows = wall.rows ?? 2;
  const perRow = Math.ceil(GEM_TEXTURES.length / rows);
  const spread = wall.spread ?? 9;
  const step = spread / Math.max(1, perRow - 1);
  const faceZ = wall.faceZ ?? 1;
  GEM_TEXTURES.forEach((name, i) => {
    const tex = texLoader.load(assetUrl('textures/gems/' + name + '.png'));
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, toneMapped: false });
    const gem = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), mat);
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    gem.position.set(wall.x - spread / 2 + col * step, wall.y - row * 0.7, wall.z + faceZ * 0.05);
    gem.rotation.y = faceZ > 0 ? 0 : Math.PI;
    interiors.group.add(gem);
  });
}

// ── collectible city gems (Ultimate Gem Collection textures) ─────────────────
// Floating, twinkling gem sprites scattered on the sidewalks + park (anchors in
// mapConfig.GEMS). Walk over one to collect it for cash. They are billboard
// sprites with NO colliders, so they never block the player or traffic.
let cityGems = [];
let cityGemsGroup = null;
const GEM_HOVER_Y = 1.1;
const GEM_PICK_R = 1.4;
function placeCityGems() {
  cityGems = [];
  const group = new THREE.Group();
  group.name = 'city-gems';
  const texLoader = new THREE.TextureLoader();
  GEMS.forEach((spot, i) => {
    const name = GEM_TEXTURES[i % GEM_TEXTURES.length];
    const tex = texLoader.load(assetUrl('textures/gems/' + name + '.png'));
    tex.colorSpace = THREE.SRGBColorSpace;
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, transparent: true, toneMapped: false, depthWrite: false,
    }));
    const s = spot.scale ?? 0.7;
    spr.scale.set(s, s, s);
    spr.position.set(spot.x, GEM_HOVER_Y, spot.z);
    group.add(spr);
    cityGems.push({ sprite: spr, x: spot.x, z: spot.z, value: spot.value ?? 75, phase: i * 0.7, collected: false });
  });
  scene.add(group);
  cityGemsGroup = group;
  console.info('[gems] city gems placed:', cityGems.length);
}
// Bob + twinkle every frame; collect any gem the player walks onto.
function updateCityGems(dt, t, playerPos) {
  for (const it of cityGems) {
    if (it.collected) continue;
    it.sprite.position.y = GEM_HOVER_Y + Math.sin(t * 1.6 + it.phase) * 0.12;
    it.sprite.material.rotation += dt * 0.6;
    if (playerPos) {
      const dx = playerPos.x - it.x, dz = playerPos.z - it.z;
      if (dx * dx + dz * dz <= GEM_PICK_R * GEM_PICK_R) {
        it.collected = true;
        if (cityGemsGroup) cityGemsGroup.remove(it.sprite);
        it.sprite.material.map?.dispose();
        it.sprite.material.dispose();
        collectGem(it.value);
      }
    }
  }
}
function collectGem(value) {
  state.money += value;
  state.gems = (state.gems || 0) + 1;
  state.stats.fun = Math.min(100, state.stats.fun + 3);
  notify('💎 Gem collected! +$' + value);
  missionEvent('gem');
  saveNow();
}

// ── TRASH CLEANUP SIDE JOB ──────────────────────────────────────────────────────
// Intentional litter placed on sidewalks beside storefronts (never in driving
// lanes). Talk to the sanitation worker to accept a tiered cleanup task, pick up
// trash around town (E), then deposit it at the dumpster for pay. Collected trash
// disappears from the world, so finishing a job visibly cleans the area.
let cityTrash = [];                 // { mesh, x, z, collected }
let trashGroup = null;
let dumpster = null;                // { mesh, pos }
let sanitationNpc = null;           // { av, pos }
let trashJob = { active: false, need: 0, collected: 0, reward: 0, tier: '' };
let trashCarried = 0;
const TRASH_TARGET = 14;            // how many litter pieces exist at once
let trashRespawnAccum = 0;         // real seconds since last respawn top-up

// One litter piece. Uses the REAL Trash & Debris models when loaded (so the
// trash you see is the trash you grab); otherwise a clean low-poly trash bag —
// never a debug shape. Returned ungrounded at origin.
function makeTrashPiece(i) {
  const real = trashTemplatesReady() ? makeTrashItem(Math.random) : null;
  if (real) { real.userData.realAsset = true; return real; }
  // clean procedural fallback: a tied-off dark trash bag (reads as litter)
  const piece = new THREE.Group();
  const bagMat = new THREE.MeshStandardMaterial({ color: '#23252e', roughness: 0.78, metalness: 0.05 });
  const bag = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 1), bagMat);
  bag.scale.set(1, 0.82, 0.95); bag.position.y = 0.22; bag.castShadow = true; piece.add(bag);
  const knot = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.16, 6), bagMat);
  knot.position.y = 0.42; piece.add(knot);
  piece.userData.realAsset = false;
  return piece;
}

// Points to keep litter away from, so the pickup prompt is never shadowed by a
// building door / NPC / dumpster (the interaction manager shows the NEAREST
// prompt, so overlapping 'e' interactables would hide the trash one).
function trashAvoidPoints() {
  const pts = [];
  for (const lm of LANDMARKS) {
    const f = lm.face || [0, 1];
    pts.push({ x: lm.x + f[0] * (lm.d / 2 + 1), z: lm.z + f[1] * (lm.d / 2 + 1), r: 7 }); // door
    pts.push({ x: lm.x, z: lm.z, r: Math.max(lm.w, lm.d) / 2 + 2 });                       // body
  }
  pts.push({ x: SPAWN.x, z: SPAWN.z, r: 5 });
  if (dumpster) pts.push({ x: dumpster.pos.x, z: dumpster.pos.z, r: 5 });
  if (sanitationNpc) pts.push({ x: sanitationNpc.pos.x, z: sanitationNpc.pos.z, r: 5 });
  return pts;
}

// Scatter `count` litter positions onto sidewalks, validated clear of avoid
// points and of each other (and of any already-placed `existing` pieces).
function genTrashPositions(count, existing = []) {
  const avoid = trashAvoidPoints();
  const all = existing.map(p => ({ x: p.x, z: p.z }));
  const out = [];
  const sideOff = ROAD.width / 2 + ROAD.walk / 2;     // centre of a sidewalk
  let guard = 0;
  while (out.length < count && guard < count * 80) {
    guard++;
    const horiz = Math.random() < 0.5;
    const lines = horiz ? ROAD.hz : ROAD.vx;
    const line = lines[(Math.random() * lines.length) | 0];
    const along = (Math.random() * 2 - 1) * (ROAD.extent - 3);
    const side = (Math.random() < 0.5 ? -1 : 1) * sideOff;
    const x = horiz ? along : line + side;
    const z = horiz ? line + side : along;
    if (Math.abs(x) > ROAD.extent + 4 || Math.abs(z) > ROAD.extent + 4) continue;
    let ok = true;
    for (const a of avoid) { if (Math.hypot(x - a.x, z - a.z) < (a.r || 5)) { ok = false; break; } }
    if (ok) for (const p of all) { if (Math.hypot(x - p.x, z - p.z) < 3.5) { ok = false; break; } }
    if (!ok) continue;
    out.push({ x, z }); all.push({ x, z });
  }
  return out;
}

function placeTrashJob() {
  cityTrash = [];
  trashGroup = new THREE.Group(); trashGroup.name = 'city-trash';

  // dumpster near spawn so deposits are convenient (built BEFORE trash so litter
  // generation can avoid it).
  const dPos = new THREE.Vector3(SPAWN.x - 4, 0, SPAWN.z + 4);
  const dGrp = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.3, 1.3),
    new THREE.MeshStandardMaterial({ color: '#2f6f3a', roughness: 0.8, metalness: 0.2 }));
  body.position.y = 0.65; dGrp.add(body);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.18, 1.4),
    new THREE.MeshStandardMaterial({ color: '#244f2b', roughness: 0.8 }));
  lid.position.y = 1.35; lid.rotation.x = -0.18; dGrp.add(lid);
  dGrp.position.copy(dPos);
  { const l = makeLabel('DUMPSTER', '#bfe6c4'); l.position.y = 2.0; dGrp.add(l); }
  trashGroup.add(dGrp);
  dumpster = { mesh: dGrp, pos: dPos.clone().setY(0) };

  // sanitation worker near spawn offers the job
  const sPos = new THREE.Vector3(SPAWN.x - 2, 0, SPAWN.z + 5);
  const worker = buildAvatar({ ...defaultCustom(), top: 'hoodie-red' });
  worker.group.position.copy(sPos);
  worker.group.rotation.y = Math.PI;
  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.6, 0.34),
    new THREE.MeshStandardMaterial({ color: '#f4a300', roughness: 0.6, emissive: '#caa', emissiveIntensity: 0.1 }));
  vest.position.y = 1.15; worker.group.add(vest);
  { const l = makeLabel('SANITATION', '#ffd98a'); l.position.y = 2.2; worker.group.add(l); }
  scene.add(worker.group);
  sanitationNpc = { av: worker, pos: sPos.clone().setY(0) };

  // scatter litter on sidewalks, clear of doors/NPCs so every piece is grabbable
  const positions = genTrashPositions(TRASH_TARGET);
  positions.forEach((p, i) => {
    const piece = makeTrashPiece(i);
    piece.position.set(p.x, 0, p.z);
    trashGroup.add(piece);
    cityTrash.push({
      id: `trash-${i}`, asset: piece.userData.realAsset ? 'trash-debris' : 'fallback-bag',
      mesh: piece, x: p.x, z: p.z, r: 2.8, jobEligible: true,
      collected: false, respawnTimer: 0, district: 'starter-town',
    });
  });

  scene.add(trashGroup);
  trashRespawnAccum = 0;
  console.info('[trash] litter pieces:', cityTrash.length,
    '| real assets:', cityTrash.filter(t => t.asset === 'trash-debris').length);
}

// Respawn litter back up to the target count at fresh random spots. Called on a
// ~30-minute cadence and re-registers interactables so new pieces are grabbable.
function respawnTrash() {
  if (!trashGroup) return;
  const live = cityTrash.filter(t => !t.collected);
  const need = TRASH_TARGET - live.length;
  if (need <= 0) return;
  // a little randomness: respawn between half and all of the missing pieces
  const count = Math.max(1, Math.round(need * (0.5 + Math.random() * 0.5)));
  const fresh = genTrashPositions(count, live);
  let n = cityTrash.length;
  fresh.forEach((p) => {
    const piece = makeTrashPiece(n++);
    piece.position.set(p.x, 0, p.z);
    trashGroup.add(piece);
    cityTrash.push({
      id: `trash-${n}`, asset: piece.userData.realAsset ? 'trash-debris' : 'fallback-bag',
      mesh: piece, x: p.x, z: p.z, r: 2.8, jobEligible: true,
      collected: false, respawnTimer: 0, district: 'starter-town',
    });
  });
  if (fresh.length) {
    registerInteractables(cityEntrances);
    debug.set('trashTargets', activeTrashCount());
    notify('🗑️ Fresh litter has appeared around the city.');
    console.info('[trash] respawned', fresh.length, '| live now:', activeTrashCount());
  }
}

function activeTrashCount() { return cityTrash.filter(t => !t.collected).length; }

function pickupTrash(item) {
  if (item.collected) return;
  item.collected = true;
  trashGroup.remove(item.mesh);
  trashCarried++;
  if (trashJob.active) {
    trashJob.collected++;
    state.stats.fitness = Math.min(100, state.stats.fitness + 0.4);   // light labor
    notify(`🗑️ Picked up trash (${trashJob.collected}/${trashJob.need}). Drop it at the dumpster.`);
    if (trashJob.collected >= trashJob.need) notify('✅ Quota met! Head to the dumpster to cash out.');
  } else {
    notify(`🗑️ Picked up trash (carrying ${trashCarried}). Talk to Sanitation for a paid cleanup.`);
  }
  registerInteractables(cityEntrances);   // remove this pickup's interactable
  saveNow();
}

function depositTrash() {
  if (trashCarried <= 0) { notify('Nothing to deposit — pick up some trash first.'); return; }
  const dropped = trashCarried; trashCarried = 0;
  if (trashJob.active && trashJob.collected >= trashJob.need) {
    const reward = trashJob.reward;
    state.money += reward;
    state.stats.fitness = Math.min(100, state.stats.fitness + 4);
    state.stats.fun = Math.min(100, state.stats.fun + 4);
    notify(`🧹 ${trashJob.tier} cleanup complete! +$${reward}. The block looks cleaner.`);
    trashJob = { active: false, need: 0, collected: 0, reward: 0, tier: '' };
    missionEvent('trash-done');
  } else {
    notify(`🗑️ Dumped ${dropped} piece${dropped > 1 ? 's' : ''}. Accept a job from Sanitation to get paid.`);
  }
  saveNow();
}

function talkToSanitation() {
  missionEvent('talk-sanitation');
  if (trashJob.active) {
    openDialogue({
      name: 'Sanitation Worker',
      text: `Current job: ${trashJob.tier}. Collected ${trashJob.collected}/${trashJob.need}. Drop what you grab at the dumpster near the corner.`,
      choices: [
        { label: 'Cancel this job', onPick: () => { trashJob = { active: false, need: 0, collected: 0, reward: 0, tier: '' }; notify('Cleanup job cancelled.'); } },
        { label: 'Keep working', onPick: () => {} },
      ],
    });
    return;
  }
  const avail = activeTrashCount();
  openDialogue({
    name: 'Sanitation Worker',
    text: `City's a mess — about ${avail} pieces of litter out there. Pick a cleanup contract; collect the quota and dump it at the dumpster to get paid.`,
    choices: [
      { label: 'Small cleanup — 5 pieces ($120)', onPick: () => startTrashJob('Small', 5, 120) },
      { label: 'Medium cleanup — 10 pieces ($280)', onPick: () => startTrashJob('Medium', 10, 280) },
      { label: 'Large cleanup — 15 pieces ($480)', onPick: () => startTrashJob('Large', 15, 480) },
      { label: 'Not now', onPick: () => {} },
    ],
  });
}
function startTrashJob(tier, need, reward) {
  const avail = activeTrashCount() + trashCarried;
  if (avail < need) { notify(`Not enough litter around for a ${tier} job right now.`); return; }
  trashJob = { active: true, need, collected: Math.min(trashCarried, need), reward, tier };
  notify(`🧹 ${tier} cleanup started — collect ${need} pieces, then deposit at the dumpster.`);
  saveNow();
}

// ── police post (Phase 3J) ───────────────────────────────────────────────────
// Builds visible parked cruisers (stealable) at the HQ lot and stores the
// front-desk position for an info interaction.
// Add minimap markers without clobbering ones placed by other systems.
function addTownMarkers(list) {
  if (!list || !list.length) return;
  for (const m of list) {
    const dup = townMarkers.some(e => e.icon === m.icon &&
      Math.round(e.x) === Math.round(m.x) && Math.round(e.z) === Math.round(m.z));
    if (!dup) townMarkers.push(m);
  }
  if (minimap) setMarkers(townMarkers);
}
function addCruiserLivery(g) {
  const bar = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.32),
    new THREE.MeshStandardMaterial({ color: '#111418' }));
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.34),
    new THREE.MeshStandardMaterial({ color: '#ff2a2a', emissive: '#ff2a2a', emissiveIntensity: 0.8 }));
  red.position.x = -0.18;
  const blue = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.34),
    new THREE.MeshStandardMaterial({ color: '#2a5cff', emissive: '#2a5cff', emissiveIntensity: 0.8 }));
  blue.position.x = 0.18;
  bar.add(base, red, blue);
  bar.position.set(0, 1.08, 0);
  g.add(bar);
}
function setupPolicePost(info) {
  parkedCruisers = [];
  policePost = info || null;
  if (!info) return;
  for (const c of info.cruisers) {
    const cruiser = createDrivableCar(scene, c.x, c.z, '#e9edf4');
    if (info.faceDir) cruiser.g.rotation.y = Math.atan2(info.faceDir.x, info.faceDir.z);
    addCruiserLivery(cruiser.g);
    cruiser.isCop = true;
    cruiser.parked = true;
    parkedCruisers.push(cruiser);
  }
  debug.set('policeCruisers', parkedCruisers.length);
  // minimap markers: police HQ + the city garage (repair shop)
  const markers = [];
  if (info.deskPos) markers.push({ x: info.deskPos.x, z: info.deskPos.z, color: '#3aa0ff', icon: '🚔' });
  const garage = LANDMARKS.find(b => b.id === 'garage');
  if (garage) markers.push({ x: garage.x, z: garage.z, color: '#ffb04a', icon: '🔧' });
  addTownMarkers(markers);   // queued; flushed once the minimap initializes
}
function talkToPoliceDesk() {
  missionEvent('talk-police-desk');
  const heat = state.wanted || 0;
  const fee = 250 * heat;                  // escalating legal fee, one star at a time
  const lowerChoice = heat > 0
    ? { label: `Pay legal fee ($${fee}) to clear 1 star`, onPick: () => {
        if ((state.money || 0) < fee) { notify(`Need $${fee} to settle that — come back with the cash.`); return 'keep'; }
        state.money -= fee;
        state.wanted = Math.max(0, (state.wanted || 0) - 1);
        notify(`⚖️ Paid $${fee} — one star cleared (wanted ${state.wanted}).`);
        saveNow();
        return undefined;
      } }
    : { label: 'How do I lower my wanted level?', onPick: () => openDialogue({
        name: 'Front Desk',
        text: `You're clean right now — no active wanted level. Keep it that way: obey the lights, don't jack rides, and stay out of trouble.`,
        choices: [{ label: 'Got it', onPick: () => {} }],
      }) };
  openDialogue({
    name: 'Police Station — Front Desk',
    text: heat > 0
      ? `You're showing ${heat} star${heat === 1 ? '' : 's'} of heat. You can settle it the legal way at the desk — a fee per star — or lay low until it cools. The cruisers out front are official property; hands off.`
      : `Welcome to the Police Station. Keep the streets clean and obey the lights and you'll never see us. Cause trouble and our patrols roll out. The cruisers out front are official police property — don't even think about it.`,
    choices: [
      lowerChoice,
      { label: 'Tell me about the academy', onPick: () => openDialogue({
        name: 'Front Desk',
        text: `The Police Academy trains the next class of officers — obstacle drills, pursuit driving, the works. Training grounds are coming soon.`,
        choices: [{ label: 'Cool', onPick: () => {} }],
      }) },
      { label: 'Leave', onPick: () => {} },
    ],
  });
}

// Holding-cell block inspect (inside the precinct). A real interaction at the
// cells rather than a dead prop — roleplay + a hook for future bust/visit flows.
function inspectHoldingCells() {
  missionEvent('police-cells');
  const heat = state.wanted || 0;
  openDialogue({
    name: 'Holding Cells',
    text: heat > 0
      ? `Three holding cells line the back wall. With ${heat} star${heat === 1 ? '' : 's'} on you, an officer eyes you from the desk — loiter back here and you might end up on the wrong side of the bars.`
      : `Three holding cells line the back wall, empty and quiet. This is where the night's troublemakers cool off before booking.`,
    choices: [
      { label: 'Peer into a cell', onPick: () => openDialogue({
        name: 'Holding Cell',
        text: `A steel cot, a barred door, a flickering light. Nothing to do in here but wait it out. (Jail/visitation flows are coming soon.)`,
        choices: [{ label: 'Step back', onPick: () => {} }],
      }) },
      { label: 'Head back to the lobby', onPick: () => {} },
    ],
  });
}

// Evidence locker (inside the police station). A real, gated interaction — it's
// restricted, but it reports the player's current heat and what it holds rather
// than being a dead prop. Tampering when you have heat bumps your wanted level.
function openEvidenceLocker() {
  missionEvent('police-evidence');
  const heat = state.wanted || 0;
  const held = state.evidenceSeized || 0;
  openDialogue({
    name: 'Evidence Locker — RESTRICTED',
    text: held > 0
      ? `Confiscated property is logged here. The shelves hold ${held} sealed bag${held === 1 ? '' : 's'} with your name on the tag. Access is restricted to officers.`
      : `Sealed evidence bags line the shelves behind a locked cage. Access is restricted to officers — nothing of yours is in here right now.`,
    choices: [
      { label: 'Inspect the cage', onPick: () => openDialogue({
        name: 'Evidence Locker',
        text: `Steel mesh, biometric lock, camera overhead. You'd need real clearance — or a lot more trouble — to get in here. (Confiscated-item recovery is coming soon.)`,
        choices: [{ label: 'Back off', onPick: () => {} }],
      }) },
      heat > 0
        ? { label: 'Try the lock anyway', onPick: () => {
            state.wanted = Math.min(5, (state.wanted || 0) + 1);
            notify('The camera catches you — heat goes up!');
          } }
        : { label: 'Leave it alone', onPick: () => {} },
      { label: 'Walk away', onPick: () => {} },
    ],
  });
}
function registerInteractables(entrances) {
  manager.clear();

  // drivable car (F)
  manager.register({
    id: 'drive-car', area: 'city', key: 'f', radius: 3.2,
    getPosition: () => car.g.position,
    enabled: () => !inCar,
    getPrompt: () => 'Enter vehicle',
    onInteract: () => enterCar(car),
  });

  // steal the nearest slow/stopped NPC traffic car — or a patrol car (high-risk).
  manager.register({
    id: 'steal-car', area: 'city', key: 'f', radius: 3.0,
    getPosition: () => (nearestStealable()?.g.position) || OFFSCREEN,
    enabled: () => !inCar && !!nearestStealable(),
    getPrompt: () => (nearestStealable()?.isCop ? '🚔 Steal POLICE car (risky!)' : 'Steal vehicle'),
    onInteract: () => {
      const v = nearestStealable();
      if (!v) { notify('No vehicle close enough to take.'); return; }
      const isCop = !!v.isCop;
      if (isCop) {
        // too many officers crowding the cruiser → you get grabbed before you can take it
        const cp = v.g.position;
        let nearCops = 0;
        for (const u of policeUnits) if (u.av.group.position.distanceTo(cp) < 6) nearCops++;
        if (nearCops >= 2) { notify('🚫 Too many cops by the cruiser — you got shoved off. Thin them out first.'); return; }
        notify('🚔 Jacking a police cruiser — this is gonna draw heat!');
      }
      // enterCar() applies the wanted/heat for the theft (cop car = +2 stars)
      enterCar(v, { steal: true });
    },
  });

  // building entrances (E)
  entrances.forEach(e => {
    manager.register({
      id: 'enter-' + e.interiorId, area: 'city', key: 'e', radius: 2.8,
      getPosition: () => e.doorPos,
      getPrompt: () => 'Enter ' + e.name,
      onInteract: () => enterInterior(e.interiorId),
    });
  });

  // city NPCs (E talk)
  cityNPCs.forEach(n => {
    manager.register({
      id: 'talk-' + n.id, area: 'city', key: 'e', radius: 2.4,
      getPosition: () => n.av.group.position,
      getPrompt: () => 'Talk to ' + n.name,
      onInteract: () => talkTo(n),
    });
  });

  // trash cleanup side job: pickups, dumpster deposit, sanitation worker
  cityTrash.forEach((item, i) => {
    manager.register({
      id: 'trash-' + i, area: 'city', key: 'e', radius: 2.8,
      getPosition: () => (item.collected ? OFFSCREEN : item.mesh.position),
      enabled: () => !item.collected && !inCar,
      getPrompt: () => 'Pick up trash',
      onInteract: () => pickupTrash(item),
    });
  });
  if (dumpster) {
    manager.register({
      id: 'dumpster', area: 'city', key: 'e', radius: 2.6,
      getPosition: () => dumpster.pos,
      enabled: () => !inCar,
      getPrompt: () => (trashCarried > 0 ? `Deposit trash (${trashCarried})` : 'Dumpster'),
      onInteract: () => depositTrash(),
    });
  }
  if (sanitationNpc) {
    manager.register({
      id: 'sanitation', area: 'city', key: 'e', radius: 2.6,
      getPosition: () => sanitationNpc.pos,
      enabled: () => !inCar,
      getPrompt: () => 'Talk to Sanitation',
      onInteract: () => talkToSanitation(),
    });
  }
  // police precinct entrance (E on foot at the front door) → walkable interior
  if (policePost && policePost.doorPos) {
    manager.register({
      id: 'enter-police', area: 'city', key: 'e', radius: 2.8,
      getPosition: () => policePost.doorPos,
      enabled: () => !inCar,
      getPrompt: () => 'Enter Police Station',
      onInteract: () => enterInterior('police'),
    });
  }
  // gas-station store entrance (E on foot) → walkable 6twelve store interior
  if (gasStation && gasStation.doorPos) {
    manager.register({
      id: 'enter-gas', area: 'city', key: 'e', radius: 2.8,
      getPosition: () => gasStation.doorPos,
      enabled: () => !inCar,
      getPrompt: () => 'Enter 6twelve Store',
      onInteract: () => enterInterior('gas'),
    });
  }

  // interiors: exits, NPCs, stations
  Object.values(interiors.byId).forEach(intr => {
    manager.register({
      id: 'exit-' + intr.id, area: intr.id, key: 'e', radius: 2.2,
      getPosition: () => intr.exit,
      getPrompt: () => 'Leave ' + intr.name,
      onInteract: () => leaveInterior(),
    });
    intr.npcs.forEach((npc, i) => {
      manager.register({
        id: `intnpc-${intr.id}-${i}`, area: intr.id, key: 'e', radius: 2.6,
        getPosition: () => npc.pos,
        getPrompt: () => 'Talk to ' + npc.name,
        onInteract: () => talkToInterior(npc),
      });
    });
    intr.stations.forEach(st => {
      manager.register({
        id: `st-${intr.id}-${st.id}`, area: intr.id, key: 'e', radius: 2.6,
        getPosition: () => st.pos,
        getPrompt: () => st.label,
        onInteract: () => runStation(intr, st),
      });
    });
  });
  // Block Supply physical weapon displays — each wall/rack item is interactable
  // and opens its own purchase/details panel (built once, registered each pass).
  if (interiors.byId.blocksupply) {
    ensureBlockSupplyDisplays();
    blockSupplyDisplays.forEach((entry, i) => {
      manager.register({
        id: `wdisp-${i}`, area: 'blocksupply', key: 'e', radius: 1.7,
        getPosition: () => entry.ipos,
        getPrompt: () => {
          const owned = (state.ownedWeapons || []).includes(entry.weapon.id);
          return owned ? `Inspect ${entry.weapon.name}` : `${entry.weapon.name} — $${entry.weapon.price}`;
        },
        onInteract: () => openWeaponDisplay(entry),
      });
    });
  }
}

// ── interiors enter/leave ───────────────────────────────────────────────────
function enterInterior(id) {
  const intr = interiors?.byId?.[id];
  // Safe fallback: never break the game if an interior is missing/malformed.
  if (!intr || !intr.spawn) {
    console.warn('[interior] "' + id + '" failed to load — staying outside.');
    notify('That place is closed right now.');
    showPrompt(null);
    return;
  }
  returnPos.copy(entranceMap[id]?.doorPos || player.group.position);
  area = id;
  interiors.group.visible = true;
  player.group.visible = true;
  player.group.position.copy(intr.spawn); player.group.position.y = 0;
  player.group.rotation.y = Math.PI;             // face into the room (toward back wall)
  velY = 0; onGround = true;

  // Reset to a known-good interior camera pose and keep it inside the walls so the
  // third-person camera can never slip outside and reveal the void.
  controls.resetView(0, 0.22, 5);
  const cb = new THREE.Box3();
  (intr.colliders || []).forEach(b => cb.union(b));
  controls.bounds = cb.isEmpty() ? null : { min: cb.min.clone(), max: cb.max.clone() };
  controls.snapTo(player.group.position, player.eyeHeight);

  notify('Entered ' + intr.name);
  missionEvent('enter', id);
  showPrompt(null);
  updateInteriorDebug();
  saveNow();
}
function leaveInterior() {
  area = 'city';
  interiors.group.visible = false;
  controls.bounds = null;
  player.group.visible = true;
  player.group.position.copy(returnPos); player.group.position.y = 0;
  controls.resetView(Math.PI, 0.25, 6);
  controls.snapTo(player.group.position, player.eyeHeight);
  showPrompt(null);
  updateInteriorDebug();
  saveNow();
}
function entranceMap_facing() { return null; }

// ── interior debug overlay (toggle with I) ──────────────────────────────────
let interiorDebug = false;
let _dbgEl = null;
function ensureInteriorDebugEl() {
  if (_dbgEl) return _dbgEl;
  _dbgEl = document.createElement('div');
  _dbgEl.id = 'interior-debug';
  _dbgEl.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:200;font:12px/1.5 ui-monospace,monospace;' +
    'background:rgba(8,8,16,.82);color:#9fe8ff;border:1px solid #2a3550;border-radius:8px;' +
    'padding:8px 10px;white-space:pre;pointer-events:none;display:none;max-width:360px;';
  document.body.appendChild(_dbgEl);
  return _dbgEl;
}
function fmtV(v) { return v ? `(${v.x.toFixed(1)}, ${v.y.toFixed(1)}, ${v.z.toFixed(1)})` : '—'; }
function updateInteriorDebug() {
  if (!interiorDebug) { if (_dbgEl) _dbgEl.style.display = 'none'; return; }
  const el = ensureInteriorDebugEl();
  el.style.display = 'block';
  const intr = area !== 'city' ? interiors?.byId?.[area] : null;
  el.textContent = [
    'INTERIOR DEBUG (press I)',
    'building id  : ' + (intr ? intr.id : area),
    'interior     : ' + (intr ? 'loaded=true' : (area === 'city' ? 'city (outside)' : 'loaded=false')),
    'player pos   : ' + fmtV(player?.group.position),
    'camera pos   : ' + fmtV(camera.position),
    'spawn marker : ' + fmtV(intr?.spawn),
    'exit marker  : ' + fmtV(intr?.exit),
  ].join('\n');
}
function toggleInteriorDebug() {
  interiorDebug = !interiorDebug;
  updateInteriorDebug();
  notify('Interior debug ' + (interiorDebug ? 'ON' : 'off'));
}

// ── hair / jewelry attachment debug (toggle with H) ─────────────────────────
// While ON: [ / ] cycle hairstyles, J cycles jewelry. The overlay reports the
// current selection and the computed attach transform of any glTF hair so the
// per-asset offsets in avatar.js → HAIR_GLTF can be dialed in by eye.
let hairDebug = false;
let _hairDbgEl = null;
function ensureHairDebugEl() {
  if (_hairDbgEl) return _hairDbgEl;
  _hairDbgEl = document.createElement('div');
  _hairDbgEl.id = 'hair-debug';
  _hairDbgEl.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:200;font:12px/1.5 ui-monospace,monospace;' +
    'background:rgba(8,8,16,.82);color:#ffd27f;border:1px solid #50432a;border-radius:8px;' +
    'padding:8px 10px;white-space:pre;pointer-events:none;display:none;max-width:360px;';
  document.body.appendChild(_hairDbgEl);
  return _hairDbgEl;
}
function updateHairDebug() {
  if (!hairDebug) { if (_hairDbgEl) _hairDbgEl.style.display = 'none'; return; }
  const el = ensureHairDebugEl();
  el.style.display = 'block';
  const hairId = state.custom.hair;
  const hairName = (HAIRSTYLES.find(h => h.id === hairId) || {}).name || hairId;
  const jewId = state.custom.jewelry;
  const jewName = (JEWELRY.find(j => j.id === jewId) || {}).name || jewId;
  const info = player ? attachedHairInfo(player) : null;
  const lines = [
    'HAIR / JEWELRY DEBUG (press H)',
    '[ / ]  cycle hairstyle',
    'J      cycle jewelry',
    '',
    'hairstyle : ' + hairName + '  (' + hairId + ')',
    'type      : ' + (isGltfHair(hairId) ? 'glTF mini-kit' : 'procedural'),
    'jewelry   : ' + jewName + '  (' + jewId + ')',
  ];
  if (info) {
    lines.push(
      '',
      'attached  : ' + info.style,
      'scale     : ' + info.scale.toFixed(3),
      'position  : ' + fmtV(info.pos),
      'rotation  : (' + info.rot.x.toFixed(2) + ', ' + info.rot.y.toFixed(2) + ', ' + info.rot.z.toFixed(2) + ')',
    );
  } else if (isGltfHair(hairId)) {
    lines.push('', 'attached  : (loading…)');
  }
  el.textContent = lines.join('\n');
}
function toggleHairDebug() {
  hairDebug = !hairDebug;
  updateHairDebug();
  notify('Hair/jewelry debug ' + (hairDebug ? 'ON' : 'off'));
}
function cycleHair(dir) {
  const i = HAIRSTYLES.findIndex(h => h.id === state.custom.hair);
  const n = (i + dir + HAIRSTYLES.length) % HAIRSTYLES.length;
  state.custom.hair = HAIRSTYLES[n].id;
  rebuildPlayer();
  updateHairDebug();
  setTimeout(updateHairDebug, 250);   // catch async glTF attach
  notify('Hair → ' + HAIRSTYLES[n].name);
}
function cycleJewelry() {
  const i = JEWELRY.findIndex(j => j.id === state.custom.jewelry);
  const n = (i + 1) % JEWELRY.length;
  state.custom.jewelry = JEWELRY[n].id;
  rebuildPlayer();
  updateHairDebug();
  notify('Jewelry → ' + JEWELRY[n].name);
}

// ── vehicle ──────────────────────────────────────────────────────────────────
const OFFSCREEN = new THREE.Vector3(1e6, 1e6, 1e6);
// nearest traffic car the player can hop into — must be slow enough to board
function nearestStealable() {
  if (!player || area !== 'city') return null;
  const pp = player.group.position;
  let best = null, bestD = 3.4;
  // EVERY car on the street is stealable — traffic, patrol units, and the
  // cruisers parked at the police post.
  const pool = [...traffic, ...policeCars, ...parkedCruisers];
  for (const c of pool) {
    const d = c.g.position.distanceTo(pp);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}
// Eject the occupant of a vehicle being stolen. A civilian driver detaches from
// the car and flees on foot (a witness who can raise the alarm); a police car's
// officer bails out and immediately joins the foot pursuit.
function ejectDriver(vehicle) {
  if (!vehicle) return;
  if (vehicle.isCop) {
    spawnFootCop({ x: vehicle.g.position.x + 2, z: vehicle.g.position.z });
    notify('🚔 The officer bailed out — and he\'s after you!');
    return;
  }
  if (!vehicle.hasDriver || !vehicle.driver) return;
  const d = vehicle.driver;
  vehicle.hasDriver = false; vehicle.driver = null;
  const wp = new THREE.Vector3(); d.getWorldPosition(wp);
  vehicle.g.remove(d);
  scene.add(d);
  d.position.set(wp.x, 0, wp.z);
  const away = new THREE.Vector3(wp.x - vehicle.g.position.x, 0, wp.z - vehicle.g.position.z);
  if (away.lengthSq() < 0.01) away.set(Math.random() - 0.5, 0, Math.random() - 0.5);
  away.normalize();
  d.rotation.y = Math.atan2(away.x, away.z);
  ejectedPeople.push({ group: d, vel: away.multiplyScalar(3.6), ttl: 6, phase: Math.random() * 6 });
  notify('🏃 The driver bailed and ran!');
}
// Move + age out fleeing ejected drivers (despawn after their TTL).
function updateEjectedPeople(dt, t) {
  for (let i = ejectedPeople.length - 1; i >= 0; i--) {
    const e = ejectedPeople[i];
    e.ttl -= dt;
    e.group.position.x += e.vel.x * dt;
    e.group.position.z += e.vel.z * dt;
    e.group.position.y = Math.abs(Math.sin((t + e.phase) * 9)) * 0.05;
    if (e.ttl <= 0) { scene.remove(e.group); ejectedPeople.splice(i, 1); }
  }
}
// Enter (or steal) a vehicle. `vehicle` is any object with { g, speed, damage }.
// `opts.steal` flags an NPC-owned traffic car → witness/wanted logic.
function enterCar(vehicle = car, opts = {}) {
  if (!vehicle) return;
  drivingVehicle = vehicle;
  if (vehicle.speed === undefined) vehicle.speed = 0;
  if (vehicle.damage === undefined) vehicle.damage = 0;
  // If we're hijacking a traffic car, pull it out of the AI list so it stops
  // auto-driving and becomes fully player-controlled.
  if (opts.steal) {
    const idx = traffic.indexOf(vehicle);
    if (idx >= 0) traffic.splice(idx, 1);
    const pidx = policeCars.indexOf(vehicle);
    if (pidx >= 0) policeCars.splice(pidx, 1);
    const cidx = parkedCruisers.indexOf(vehicle);
    if (cidx >= 0) parkedCruisers.splice(cidx, 1);
    vehicle.parked = false;
    vehicle.stolen = true;
    ejectDriver(vehicle);                 // throw the occupant out (flees / joins chase)
    const copCar = !!vehicle.isCop;
    const witnessed = witnessesNear(vehicle.g.position, 16);
    if (copCar) {
      state.wanted = Math.min(5, (state.wanted || 0) + 2);
      state.heat = Math.min(100, (state.heat || 0) + 20);
      console.log(`[crime] STOLE A POLICE CRUISER → wanted=${state.wanted}`);
      notify('🚨 You jacked a cop car! Wanted +2');
    } else if (witnessed > 0) {
      state.wanted = Math.min(5, (state.wanted || 0) + 1);
      state.heat = Math.min(100, (state.heat || 0) + 8);
      console.log(`[crime] grand theft auto WITNESSED by ${witnessed} → wanted=${state.wanted}`);
      notify('🚨 Car theft witnessed! Wanted +1');
    } else {
      state.heat = Math.min(100, (state.heat || 0) + 2);
      console.log('[crime] grand theft auto (no witnesses) → heat+2');
      notify('🚗 Hot-wired a ride — nobody saw that.');
    }
  } else {
    notify('🚗 Driving — W/S throttle, A/D steer, F to exit');
  }
  inCar = true;
  player.group.visible = false;
  vehicle.speed = 0;
  controls.bounds = null;
  showPrompt(null);
  missionEvent('enter-car');
  saveNow();
}
// count NPCs (and the player's known witnesses) within a radius of a position
function witnessesNear(pos, radius) {
  let n = 0;
  for (const npc of cityNPCs) {
    if (npc.av.group.position.distanceTo(pos) <= radius) n++;
  }
  return n;
}

// ── ROBBERY (stylized mugging — risk vs reward) ─────────────────────────────────
// Shake down the nearest civilian for cash. The victim always notices, so wanted/
// heat rise and police respond. Reward is only granted on a successful shakedown.
function robNearestNpc() {
  if (!player) return;
  const pp = player.group.position;
  let best = null, bestD = 2.8;
  for (const n of cityNPCs) {
    if (n.downed || n.robbed) continue;
    const g = n.av.group.position;
    const d = Math.hypot(g.x - pp.x, g.z - pp.z);
    if (d < bestD) { bestD = d; best = n; }
  }
  if (!best) { notify('Get closer to someone to rob them.'); return; }
  const cw = currentWeapon();
  const armed = cw && !cw.melee;                        // armed muggings net more but draw more heat
  const haul = Math.floor(40 + Math.random() * 80) * (armed ? 2 : 1);
  state.money += haul;
  best.robbed = true;
  ensureNpcHp(best);
  best.hitT = 0.25; best.panic = 2.6;                  // victim recoils + flees
  const witnesses = witnessesNear(pp, 22);
  const gain = armed ? 2 : 1;
  state.wanted = Math.min(5, (state.wanted || 0) + gain);
  state.heat = Math.min(100, (state.heat || 0) + (armed ? 22 : 12));
  notify(`💰 Robbed a civilian for $${haul}! ${witnesses > 1 ? 'You were seen — police alerted.' : 'Wanted +' + gain}`);
  missionEvent('rob-done');
  saveNow();
}

// ── fuel + gas-station refuel ───────────────────────────────────────────────────
// Find the nearest gas-station forecourt within its radius of a position.
function nearestRefuel(pos) {
  for (const p of refuelPoints) {
    if (Math.hypot(p.x - pos.x, p.z - pos.z) <= (p.r || 7)) return p;
  }
  return null;
}
function refuelCost(v) {
  const missing = Math.max(0, 100 - (v.fuel ?? 100));
  return Math.max(0, Math.ceil(missing * 1.2));   // ~$120 for a full tank
}
function refuelVehicle(v) {
  const cost = refuelCost(v);
  if (cost <= 0) return;
  if (state.money < cost) { notify("⛽ Not enough cash to refuel."); return; }
  state.money -= cost;
  v.fuel = 100;
  if (v === car) state.fuel = 100;
  notify(`⛽ Tank filled — $${cost}`);
  saveNow();
}

function exitCar() {
  const v = drivingVehicle || car;
  inCar = false;
  player.group.visible = true;
  const side = new THREE.Vector3(Math.cos(v.g.rotation.y), 0, -Math.sin(v.g.rotation.y));
  player.group.position.copy(v.g.position).addScaledVector(side, 2.4); player.group.position.y = 0;
  v.speed = 0;
  drivingVehicle = null;
  notify('Stepped out of the vehicle');
  missionEvent('exit-car');
  saveNow();
}
function updateCar(dt) {
  const v = drivingVehicle || car;
  const inp = controls.moveInput();
  // Phase 2: damage worsens handling. A totaled car (100%) can't drive at all.
  const h = handlingFor(v.damage || 0);
  const accel = 16, maxR = 9, fric = 7;
  const maxF = 24 * h.speedMult;
  // fuel: an empty tank sputters out (no throttle), so you must reach a gas station
  if (v.fuel === undefined) v.fuel = (v === car) ? (state.fuel ?? 100) : 100;
  const dry = v.fuel <= 0 || h.totaled;
  if (h.totaled && inp.f !== 0 && !v._totaledWarned) {
    v._totaledWarned = true; notify('🛑 Vehicle totaled — tow it to City Garage to repair.');
  }
  if (!h.totaled) v._totaledWarned = false;
  if (inp.f > 0 && !dry) v.speed += accel * dt;
  else if (inp.f < 0 && !dry) v.speed -= accel * dt;
  else v.speed -= Math.sign(v.speed) * Math.min(Math.abs(v.speed), fric * dt);
  v.speed = Math.max(-maxR * h.speedMult, Math.min(maxF, v.speed));

  if (inp.s !== 0 && Math.abs(v.speed) > 0.2) {
    const rate = 1.6 * (Math.abs(v.speed) / Math.max(1, maxF) + 0.18) * h.steerMult;
    v.g.rotation.y -= inp.s * rate * dt * Math.sign(v.speed);
  }
  // damaged cars wobble: a small heading jitter that grows with damage
  if (h.wobble > 0 && Math.abs(v.speed) > 3) {
    v.g.rotation.y += Math.sin(performance.now() * 0.012) * h.wobble * dt;
  }
  const dir = new THREE.Vector3(Math.sin(v.g.rotation.y), 0, Math.cos(v.g.rotation.y));
  const before = v.g.position.clone();
  v.g.position.addScaledVector(dir, v.speed * dt); v.g.position.y = 0;
  resolveCollision(v.g.position, 1.5, cityColliders);
  // distance driven this session → feeds the "Get Around Town" mission
  drivenDist += Math.abs(v.speed) * dt;
  if (drivenDist > 120 && !drivenFlagged) { drivenFlagged = true; missionEvent('drive-checkpoint'); }
  // burn fuel proportional to throttle/speed; warn once when it gets low/empty
  const prevFuel = v.fuel;
  v.fuel = Math.max(0, v.fuel - (Math.abs(v.speed) / maxF) * dt * 0.55 - (inp.f !== 0 ? dt * 0.05 : 0));
  if (v === car) state.fuel = v.fuel;
  if (prevFuel > 20 && v.fuel <= 20) notify('⛽ Low fuel — find a Gas-N-Go to refuel.');
  if (prevFuel > 0 && v.fuel <= 0) notify('⛽ Out of fuel! Coast to a gas station to refuel.');
  if (v.g.position.distanceTo(before) > 0.02 && v.g.position.distanceTo(before) < Math.abs(v.speed * dt) * 0.6 && Math.abs(v.speed) > 7) {
    const sev = Math.abs(v.speed);
    v.damage = Math.min(100, (v.damage || 0) + sev * dt * 5);
    if (v === car) state.carDamage = Math.floor(v.damage);
    v.speed *= 0.35;
    applyCarDamageVisual(v);
    notify('💥 Crash! Car damage ' + Math.floor(v.damage) + '%');
    // a hard wreck draws police attention
    if (sev > 16) {
      state.heat = Math.min(100, (state.heat || 0) + 6);
      state.wanted = Math.min(5, (state.wanted || 0) + 1);
      notify('🚨 Reckless driving reported! Wanted +1');
    }
  }
  // Phase 2: smash through breakable street objects (cones, lamps, cans).
  // Soft litter is driven over; breakable props tip and add minor damage.
  if (FEATURES.USE_BREAKABLE_STREET_OBJECTS && Math.abs(v.speed) > 3) {
    const brk = collideVehicle(v.g.position, Math.abs(v.speed), (o) => {
      notify('💥 Smashed a ' + (o.kind ? o.kind.replace(/_/g, ' ') : 'street object') + '!');
    });
    if (brk > 0) {
      addVehicleDamage(v, brk);
      if (v === car) state.carDamage = Math.floor(v.damage);
      applyCarDamageVisual(v);
      v.speed *= 0.9;
    }
  }
  tickDamageSmoke(v, performance.now() * 0.001);
  // roll wheels (GLB wheel meshes or procedural cylinders)
  (v.g.userData.wheels || []).forEach(w => { w.rotation.x += v.speed * dt; });
  v.g.children.forEach(c => { if (c.geometry?.type === 'CylinderGeometry') c.rotation.x += v.speed * dt; });
  player.group.position.copy(v.g.position);
  // Camera follows the car's heading so you can always see where you're driving.
  // Chase/overhead sit BEHIND the car (yaw = heading + π); the hood/first-person
  // cam looks forward (yaw = heading). Smoothly slew so turns track naturally and
  // the mouse is never needed to steer the view.
  const driveYaw = controls.mode === CAM.FIRST ? v.g.rotation.y : v.g.rotation.y + Math.PI;
  let dyaw = driveYaw - controls.yaw;
  while (dyaw > Math.PI) dyaw -= Math.PI * 2;
  while (dyaw < -Math.PI) dyaw += Math.PI * 2;
  controls.yaw += dyaw * Math.min(1, dt * 6);
  controls.shoulder = 0;     // no over-shoulder offset while driving
  controls.update(v.g.position.clone().setY(0.9), 1.7, dt);
}

// ── vehicle collision (cars ↔ player, cars ↔ cars) ──────────────────────────────
let playerHitCD = 0;            // seconds of i-frames after being hit by a car
let injuredTimer = 0;          // brief stumble/injured state (visual + lockout)
let lastSprintWarn = -10;      // throttle the "too winded" sprint message
const CAR_R = 1.8, PLAYER_R = 0.6;

// Real vehicle collision: cars push the player (knockback + injury) and bounce
// off each other (slow + damage). Circle/cylinder model — simple, robust, and
// enough to stop cars phasing through people and each other.
function updateVehicleCollisions(dt) {
  if (area !== 'city') return;
  playerHitCD = Math.max(0, playerHitCD - dt);
  injuredTimer = Math.max(0, injuredTimer - dt);

  const cars = [];
  for (const c of traffic) cars.push(c);
  for (const c of policeCars) cars.push(c);     // patrol cars collide & shove too
  if (car && !inCar) cars.push(car);           // parked drivable car is a solid obstacle
  if (inCar && drivingVehicle && !cars.includes(drivingVehicle)) cars.push(drivingVehicle);  // the car you drive collides too
  for (const c of cars) if (c._crashCD) c._crashCD = Math.max(0, c._crashCD - dt);

  // car ↔ car: separate overlaps, bounce, accumulate damage
  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i], b = cars[j];
      const dx = b.g.position.x - a.g.position.x;
      const dz = b.g.position.z - a.g.position.z;
      const d = Math.hypot(dx, dz);
      const minD = CAR_R * 2;
      if (d >= minD || d < 1e-4) continue;
      const nx = dx / d, nz = dz / d;
      const overlap = (minD - d) + 0.01;
      // mass-weighted separation — heavier cop cruisers barely budge and shove
      // lighter cars out of the way (GTA-style ramming).
      const ma = a.mass || 1, mb = b.mass || 1;
      const aShare = mb / (ma + mb);            // a moves proportional to b's mass
      const bShare = ma / (ma + mb);
      a.g.position.x -= nx * overlap * aShare; a.g.position.z -= nz * overlap * aShare;
      b.g.position.x += nx * overlap * bShare; b.g.position.z += nz * overlap * bShare;
      const rel = Math.abs(a.speed || 0) + Math.abs(b.speed || 0);
      if (rel > 4 && !a._crashCD && !b._crashCD) {
        a.damage = Math.min(100, (a.damage || 0) + rel * 0.6);
        b.damage = Math.min(100, (b.damage || 0) + rel * 0.6);
        applyCarDamageVisual(a); applyCarDamageVisual(b);
        console.log(`[collision] car↔car  rel=${rel.toFixed(1)}  dmgA=${Math.floor(a.damage)}%  dmgB=${Math.floor(b.damage)}%`);
        if (a === car || b === car) state.carDamage = Math.floor(car.damage || 0);
        // only a pileup involving the car YOU'RE driving raises heat
        if (rel > 16 && inCar && drivingVehicle && (a === drivingVehicle || b === drivingVehicle)) {
          state.heat = Math.min(100, (state.heat || 0) + 3);
        }
      }
      if ('speed' in a) a.speed *= -0.25;
      if ('speed' in b) b.speed *= -0.25;
      a._crashCD = 0.6; b._crashCD = 0.6;
    }
  }

  // car ↔ player: knockback + injury with an i-frame cooldown
  if (!inCar && player) {
    const pp = player.group.position;
    for (const c of cars) {
      const dx = pp.x - c.g.position.x, dz = pp.z - c.g.position.z;
      const d = Math.hypot(dx, dz);
      if (d >= CAR_R + PLAYER_R) continue;
      let nx = dx, nz = dz, n = d;
      if (n < 1e-4) { nx = Math.sin(c.g.rotation.y); nz = Math.cos(c.g.rotation.y); n = 1; }
      nx /= n; nz /= n;
      const spd = Math.abs(c.speed || 0);
      if (playerHitCD <= 0 && spd > 1.5) {
        const impact = spd;
        const big = impact > 12;
        const knock = Math.min(6, 1.5 + impact * 0.45);
        pp.x += nx * knock; pp.z += nz * knock;
        velY = Math.min(6, 2 + impact * 0.25); onGround = false;          // stumble/knockdown hop
        playerHitCD = 1.2;                                                // no 20-hits-per-second
        const st = state.stats;
        st.energy = Math.max(0, st.energy - (big ? 45 : 18));
        st.health = Math.max(0, (st.health ?? 100) - (big ? 35 : 12));    // car impacts hurt
        injuredTimer = big ? 2.4 : 1.0;
        if ('speed' in c) c.speed *= 0.3;                                 // the car reacts to the hit
        console.log(`[collision] car→player  impact=${impact.toFixed(1)}  ${big ? 'SEVERE' : 'minor'}  energy=${Math.floor(st.energy)} health=${Math.floor(st.health)}`);
        notify(big ? '🚑 You got hit hard by a car!' : '😖 A car clipped you — watch the road!');
        if (st.health <= 0) downPlayer('You were taken out by a vehicle.');
      } else if (playerHitCD <= 0) {
        const sep = (CAR_R + PLAYER_R - d) + 0.01;                        // gently separate from a stopped car
        pp.x += nx * sep; pp.z += nz * sep;
      }
    }
  }

  // car → pedestrian: moving cars injure (and can take out) civilians. ONLY the
  // car the player is driving counts as a crime — NPC traffic and police cars
  // crashing into pedestrians must never make the player wanted.
  for (const c of cars) {
    const spd = Math.abs(c.speed || 0);
    if (spd < 3) continue;
    const playerDriven = inCar && drivingVehicle && c === drivingVehicle;
    for (const n of cityNPCs) {
      if (n._hitCD > 0) continue;
      const g = n.av.group;
      const dx = g.position.x - c.g.position.x, dz = g.position.z - c.g.position.z;
      const d = Math.hypot(dx, dz);
      if (d >= CAR_R + 0.6) continue;
      const nn = d < 1e-4 ? 1 : d;
      const knx = dx / nn, knz = dz / nn;
      g.position.x += knx * 2.2; g.position.z += knz * 2.2;             // knock aside
      ensureNpcHp(n);
      n.hp -= spd > 12 ? 70 : 34; n.hitT = 0.25; n._hitCD = 0.7;
      if (playerDriven) {
        state.heat = Math.min(100, (state.heat || 0) + 4);             // your hit-and-run draws heat
        if (n.hp <= 0) downNpc(n, true);
        else if ((state.wanted || 0) < 1) { state.wanted = 1; notify('🚨 You hit someone with your car! Police alerted.'); }
      } else if (n.hp <= 0) {
        downNpc(n, false);                                             // traffic accident — not your fault
      }
    }
  }

  // car → foot cop: officers are NOT immovable. A moving car knocks them back and
  // damages them so they can't stand inside the car collider and freeze driving.
  // Ramming a cop with the car you drive escalates the chase hard.
  for (const c of cars) {
    const spd = Math.abs(c.speed || 0);
    if (spd < 3) continue;
    const playerDriven = inCar && drivingVehicle && c === drivingVehicle;
    for (let i = policeUnits.length - 1; i >= 0; i--) {
      const u = policeUnits[i];
      if ((u._hitCD || 0) > 0) { u._hitCD -= dt; continue; }
      const g = u.av.group;
      const dx = g.position.x - c.g.position.x, dz = g.position.z - c.g.position.z;
      const d = Math.hypot(dx, dz);
      if (d >= CAR_R + 0.6) continue;
      const nn = d < 1e-4 ? 1 : d;
      const knx = dx / nn, knz = dz / nn;
      g.position.x += knx * 2.6; g.position.z += knz * 2.6;            // shove the cop clear of the car
      u.hitT = 0.25; u._hitCD = 0.6;
      u.health -= spd > 12 ? 70 : 38;
      if ('speed' in c) c.speed *= 0.7;                                // the car keeps moving, just sheds speed
      if (playerDriven) {
        state.wanted = Math.min(5, Math.max(state.wanted || 0, 3));    // running down a cop = serious heat
        state.heat = Math.min(100, (state.heat || 0) + 18);
        notify('🚔 You hit an officer with your car! Heavy police response.');
      }
      if (u.health <= 0) removeFootCop(i);
    }
  }
}

// ── CRIME, WEAPONS & POLICE ─────────────────────────────────────────────────────
// Hooked into the weapon controller (weapons.js) via initWeapons() callbacks and
// driven each frame by updatePolice(). Wanted stars escalate from firing in
// public, killing civilians/cops, stealing cars and reckless driving. Police
// spawn around the player, chase on foot and in heavier cruisers, and "bust" you
// (cash penalty) if they corner you on foot. Outrun/lose them to cool down.

let copCoolTimer = 0;

// ── NPC health / stylized takedowns ─────────────────────────────────────────────
const NPC_MAX_HP = 60;
function ensureNpcHp(n) {
  if (n.hp == null) { n.hp = NPC_MAX_HP; n.maxHp = NPC_MAX_HP; }
  if (n._hitCD == null) n._hitCD = 0;
  return n;
}
// Stylized, non-graphic takedown: the NPC slumps (lies flat), stops walking, and
// is cleaned up after a moment. No blood/gore — just a downed pose + fade.
function downNpc(n, byPlayer = true) {
  if (n.downed) return;
  n.downed = true; n.talking = true;            // talking flag halts its walk AI
  n.av.group.rotation.x = -Math.PI / 2;         // fall over
  n.av.group.position.y = 0.3;
  if (n.hpBar) { scene.remove(n.hpBar); n.hpBar = null; }
  // Only a death the PLAYER caused raises heat — random NPC/traffic accidents
  // must never make the player wanted.
  if (byPlayer) state.heat = Math.min(100, (state.heat || 0) + 10);
  setTimeout(() => {
    scene.remove(n.av.group);
    const i = cityNPCs.indexOf(n); if (i >= 0) cityNPCs.splice(i, 1);
    registerInteractables(cityEntrances);
  }, 4000);
}
// Player goes down: respawn at home, restore some health, lose a little cash.
// Death ends the current police chase — you come back with a clean slate so you
// never respawn still being hunted.
let playerDownCD = 0;
function downPlayer(reason) {
  if (playerDownCD > 0) return;
  playerDownCD = 3;
  const fine = Math.min(state.money, 150);
  state.money -= fine;
  state.stats.health = 60; state.stats.energy = Math.max(30, state.stats.energy);
  clearWanted();                       // death = new life: wipe stars + end the chase
  if (inCar) exitCar();
  area = 'city';
  interiors && (interiors.group.visible = false);
  controls.bounds = null;
  player.group.visible = true;
  player.group.position.set(SPAWN_FALLBACK.x, 0, SPAWN_FALLBACK.z);
  notify('🏥 ' + (reason || 'You were downed') + ' — patched up at home (-$' + fine + ')');
  saveNow();
}
// Fully reset the active police chase: clear stars/heat, stop all bust/cooldown
// timers, and send every officer + cruiser away. Used by both death and busted so
// the player always respawns safe and is never chased after respawn.
function clearWanted() {
  state.wanted = 0;
  state.heat = 0;
  bustTimer = 0;
  policeGrace = 0;
  policeWarned = false;
  wantedPrev = 0;
  copCoolTimer = 0;
  despawnAllPolice();
}

// Targets handed to the weapon raycaster: civilians + cops, each with onHit().
function getWeaponTargets() {
  const out = [];
  if (area !== 'city') return out;
  for (const n of cityNPCs) {
    if (n.downed) continue;
    ensureNpcHp(n);
    out.push({
      pos: n.av.group.position.clone().setY(1.1), r: 0.95, kind: 'civ', ref: n,
      onHit: (dmg) => { n.hp -= dmg; n.hitT = 0.25; return n.hp <= 0; },
    });
  }
  for (const u of policeUnits) {
    out.push({
      pos: u.av.group.position.clone().setY(1.1), r: 1.0, kind: 'cop', ref: u,
      onHit: (dmg) => { u.health -= dmg; u.hitT = 0.25; return u.health <= 0; },
    });
  }
  // Monster Mode creatures are also shootable
  for (const m of monsters) {
    if (m.dead) continue;
    out.push({
      pos: m.group.position.clone().setY(1.1), r: 1.1, kind: 'monster', ref: m,
      onHit: (dmg) => { m.hp -= dmg; m.hitT = 0.25; m._provoked = 6; if (m.hp <= 0) m.dead = true; return m.hp <= 0; },
    });
  }
  return out;
}

// Firing a gun in public is a crime → alerts police.
function onWeaponShot(hitAny, isMelee) {
  if (hitAny) flashHitMarker();                  // brief ✕ marker when a shot lands
  if (isMelee) { triggerMeleeSwing(); if (hitAny) missionEvent('fight'); return; }
  if (area !== 'city') return;
  if ((state.wanted || 0) < 1) { state.wanted = 1; notify('🚨 Shots fired! Police alerted.'); }
  state.heat = Math.min(100, (state.heat || 0) + 6);
}
// Flash the centre hit-marker for a moment so the player gets clear feedback that
// their shot connected.
let _hitMarkTO = null;
function flashHitMarker() {
  const hm = document.getElementById('hitmark');
  if (!hm) return;
  hm.style.display = 'block';
  if (_hitMarkTO) clearTimeout(_hitMarkTO);
  _hitMarkTO = setTimeout(() => { hm.style.display = 'none'; }, 130);
}

// A target died from weapon damage.
function onWeaponKill(tg) {
  if (tg.kind === 'civ') {
    state.wanted = Math.min(5, (state.wanted || 0) + 2);
    state.heat = Math.min(100, (state.heat || 0) + 25);
    downNpc(tg.ref);
    notify('🚨 Civilian down! Wanted +2');
  } else if (tg.kind === 'cop') {
    state.wanted = Math.min(5, (state.wanted || 0) + 1);
    state.heat = Math.min(100, (state.heat || 0) + 20);
    const i = policeUnits.indexOf(tg.ref);
    if (i >= 0) removeFootCop(i);
    notify('🚓 Officer down! Wanted +1');
  } else if (tg.kind === 'monster') {
    tg.ref.dead = true;
    state.money = (state.money || 0) + 25;       // bounty for slaying a creature
    debug.set('monsterCount', Math.max(0, monsters.filter(m => !m.dead).length - 1));
    notify('👹 Monster slain! +$25');
  }
  saveNow();
}

// ── floating sprite label (canvas text billboard) ───────────────────────────────
function makeLabel(text, color = '#ffffff') {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = 'rgba(10,10,16,0.55)'; ctx.fillRect(0, 0, 256, 64);
  ctx.font = 'bold 34px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = color; ctx.fillText(text, 128, 34);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, toneMapped: false }));
  spr.scale.set(1.6, 0.4, 1); spr.renderOrder = 999;
  return spr;
}

// ── floating health bars (sprite billboards, always face camera) ────────────────
function makeHealthBar() {
  const grp = new THREE.Group();
  const bg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x101014, depthTest: false, transparent: true, opacity: 0.85 }));
  bg.scale.set(0.92, 0.14, 1);
  const fill = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x39d353, depthTest: false, transparent: true }));
  fill.scale.set(0.88, 0.1, 1);
  grp.add(bg, fill);
  grp.renderOrder = 1000;
  grp.userData.fill = fill;
  return grp;
}
function setHealthBar(grp, frac) {
  frac = Math.max(0, Math.min(1, frac));
  const fill = grp.userData.fill;
  fill.scale.x = Math.max(0.001, 0.88 * frac);
  fill.position.x = -0.44 * (1 - frac);                 // anchor to the left edge
  fill.material.color.setHSL(0.34 * frac, 0.85, 0.5);   // green → yellow → red
}
// Show a bar above any NPC that is hurt or recently hit; hide at full health.
function updateNpcHealthBars(dt) {
  const pp = player ? player.group.position : null;
  for (const n of cityNPCs) {
    if (n._hitCD > 0) n._hitCD -= dt;
    if (n.hitT > 0) { n.hitT -= dt; n.panic = 2.2; }   // any hit triggers a panic run
    if (n.downed) continue;
    // panic: flee directly away from the player (NPC "reacts" to being attacked)
    if (n.panic > 0 && pp) {
      n.panic -= dt;
      const g = n.av.group;
      const dx = g.position.x - pp.x, dz = g.position.z - pp.z;
      const d = Math.hypot(dx, dz) || 1;
      const sp = 4.4 * dt;
      g.position.x += dx / d * sp; g.position.z += dz / d * sp;
      g.rotation.y = Math.atan2(dx, dz);
      resolveCollision(g.position, 0.45, cityColliders);
      n.talking = true;                                 // suppress its normal stroll AI while fleeing
    } else if (n.panic <= 0 && n._wasPanicking) {
      n.talking = false;
    }
    n._wasPanicking = n.panic > 0;
    const hurt = n.hp != null && n.hp < (n.maxHp || NPC_MAX_HP);
    if (hurt || n.hitT > 0) {
      if (!n.hpBar) { n.hpBar = makeHealthBar(); scene.add(n.hpBar); }
      const p = n.av.group.position;
      n.hpBar.position.set(p.x, 2.35, p.z);
      setHealthBar(n.hpBar, (n.hp ?? NPC_MAX_HP) / (n.maxHp || NPC_MAX_HP));
      n.hpBar.visible = area === 'city';
    } else if (n.hpBar) {
      scene.remove(n.hpBar); n.hpBar = null;
    }
  }
}


// Build a foot patrol officer (procedural avatar + navy vest & cap so it reads
// clearly as police) and drop it on a ring around the player.
// Where a foot cop ENTERS from: prefer the police station front, else a point
// offscreen from the player (never on top of them). Returns a world {x,z}.
function copSpawnPoint() {
  const pp = player.group.position;
  // Prefer the police HQ if it's a sensible distance away (so cops walk in from
  // the station like a real patrol dispatch) — but only ~55% of the time so the
  // rest arrive from offscreen roads as if a nearby patrol was redirected.
  if (policePost && policePost.deskPos && Math.random() < 0.55) {
    const d = Math.hypot(policePost.deskPos.x - pp.x, policePost.deskPos.z - pp.z);
    if (d > 14 && d < 90) {
      const jx = (Math.random() - 0.5) * 4, jz = (Math.random() - 0.5) * 4;
      return { x: policePost.deskPos.x + jx, z: policePost.deskPos.z + 2 + jz };
    }
  }
  // offscreen ring: far enough that they appear to arrive, never spawn-camping
  const ang = Math.random() * Math.PI * 2, R = 30 + Math.random() * 8;
  return { x: pp.x + Math.cos(ang) * R, z: pp.z + Math.sin(ang) * R };
}

function spawnFootCop(at) {
  // Procedural uniformed base (instant + always valid). A real PSX POLICE GLB is
  // swapped on top async via applyCopSkin so the officer reads clearly as police
  // — the procedural body stays as a guaranteed fallback if the GLB fails.
  const av = buildAvatar({ ...defaultCustom(), top: 'hoodie-red', accessory: 'shades', jewelry: 'none' });
  const navy = new THREE.MeshStandardMaterial({ color: '#16224d', roughness: 0.7, metalness: 0.1 });
  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.66, 0.36), navy);
  vest.position.y = 1.28; av.group.add(vest);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.12, 12), navy);
  cap.position.y = (av.eyeHeight || 1.6) + 0.2; av.group.add(cap);
  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.05, 6),
    new THREE.MeshStandardMaterial({ color: '#ffd34d', emissive: '#5a4500', emissiveIntensity: 0.4 }));
  badge.position.set(0.16, 1.36, 0.19); av.group.add(badge);
  const sp = at || copSpawnPoint();        // `at` lets a bailed-out driver become a cop on the spot
  av.group.position.set(sp.x, 0, sp.z);
  scene.add(av.group);
  const unit = { av, health: 65, t: 0, hitT: 0 };
  policeUnits.push(unit);
  // swap to a real PSX police-officer GLB skin (validated; procedural kept on fail)
  applyCopSkin(av, renderer)
    .then((name) => { if (name) { unit.realSkin = name; debug.set('copSkin', name); } })
    .catch(() => { /* keep procedural uniformed cop */ });
}

// Build a heavier patrol cruiser that chases the player's car/feet.
function spawnCopCar() {
  const pp = player.group.position;
  const ang = Math.random() * Math.PI * 2, R = 28;
  const c = createDrivableCar(scene, pp.x + Math.cos(ang) * R, pp.z + Math.sin(ang) * R, '#1b2a55');
  c.isCop = true; c.mass = 2.6; c.speed = 0; c.damage = 0;
  // use the real police GLB if the kit is loaded, else keep the navy procedural body
  swapVehicleVisual(c, 'police');
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x3060ff, emissive: 0x1a2f8a, emissiveIntensity: 0.7 }));
  bar.position.set(0, 1.5, 0); c.g.add(bar); c.lightBar = bar;
  policeCars.push(c);
}

function removeFootCop(i) {
  const u = policeUnits[i];
  if (u) scene.remove(u.av.group);
  policeUnits.splice(i, 1);
}
function despawnAllPolice() {
  for (const u of policeUnits) scene.remove(u.av.group);
  policeUnits = [];
  for (const c of policeCars) scene.remove(c.g);
  policeCars = [];
}

// Cops corner you on foot → you get busted: lose half your cash, chase fully
// clears, and you respawn safe (no lingering pursuit).
function bustPlayer() {
  const lost = Math.floor((state.money || 0) * 0.5);
  state.money -= lost;
  clearWanted();                       // busted = chase resolved: stars + cops cleared
  if (inCar) exitCar();
  player.group.position.set(state.pos.x = SPAWN_FALLBACK.x, 0, state.pos.z = SPAWN_FALLBACK.z);
  notify(`🚔 Busted! Lost $${lost.toLocaleString()}.`);
  saveNow();
}
const SPAWN_FALLBACK = { x: 9, z: 9 };

// Line-of-sight test for police evasion: sample points along the cop→player
// segment at chest height and fail if any sample lands inside a city collider
// (a building/wall). Lets the player break a chase by ducking behind cover.
const _losA = new THREE.Vector3(), _losB = new THREE.Vector3(), _losP = new THREE.Vector3();
function segmentClear(from, to) {
  _losA.set(from.x, 1.0, from.z); _losB.set(to.x, 1.0, to.z);
  const dist = _losA.distanceTo(_losB);
  const steps = Math.max(2, Math.ceil(dist / 1.5));
  for (let i = 1; i < steps; i++) {
    _losP.copy(_losA).lerp(_losB, i / steps);
    for (const c of cityColliders) {
      if (_losP.x >= c.min.x && _losP.x <= c.max.x &&
          _losP.z >= c.min.z && _losP.z <= c.max.z &&
          1.0 >= c.min.y && 1.0 <= c.max.y) return false;
    }
  }
  return true;
}
// True if ANY active officer/cruiser can see the player within the search radius.
const COP_SEARCH_RADIUS = 60;
function copsCanSeePlayer() {
  const pp = player.group.position;
  for (const u of policeUnits) {
    const g = u.av.group.position;
    if (Math.hypot(pp.x - g.x, pp.z - g.z) <= COP_SEARCH_RADIUS && segmentClear(g, pp)) return true;
  }
  for (const c of policeCars) {
    const g = c.g.position;
    if (Math.hypot(pp.x - g.x, pp.z - g.z) <= COP_SEARCH_RADIUS && segmentClear(g, pp)) return true;
  }
  return false;
}

function updatePolice(dt) {
  if (area !== 'city' || !player) { if (policeUnits.length || policeCars.length) despawnAllPolice(); return; }
  const wanted = state.wanted || 0;
  if (wanted === 0) {
    if (policeUnits.length || policeCars.length) despawnAllPolice();
    bustTimer = 0; policeGrace = 0; policeWarned = false; wantedPrev = 0; copHiddenTimer = 0;
    return;
  }

  // The MOMENT you first become wanted, start a grace window so you can't be
  // busted instantly — you get time to react and run. Severity scales the words.
  if (wantedPrev === 0) {
    policeGrace = wanted >= 2 ? 4 : 7;     // low wanted = longer warning window
    policeWarned = false;
    notify(wanted >= 2 ? '🚨 Police are chasing you — get distance to lose them!'
                       : '🚓 Police are investigating — keep your distance.');
  }
  wantedPrev = wanted;
  policeGrace = Math.max(0, policeGrace - dt);

  // first responder appears — a single cop at 1★ (slow, investigating), two at 2★+
  if (policeUnits.length === 0 && policeCars.length === 0) {
    spawnFootCop();
    if (wanted >= 2) spawnFootCop();
  }

  // Line-of-sight evasion: track how long the player has been out of every cop's
  // sight (behind cover or beyond the search radius). While hidden, the police
  // stop calling in reinforcements and the heat cools off much faster.
  const seen = (policeUnits.length + policeCars.length) > 0 ? copsCanSeePlayer() : false;
  if (seen) copHiddenTimer = 0; else copHiddenTimer += dt;
  const hidden = copHiddenTimer > 3;
  debug.set('copHidden', hidden ? copHiddenTimer.toFixed(1) + 's' : 'seen');

  // spawn pacing — more stars ⇒ more units, cruisers appear at 3★+. At 1★ we keep
  // it to a lone officer so a tiny mistake isn't an instant dogpile. While the
  // player is hidden, hold reinforcements (the search has lost the trail).
  policeAccum += dt;
  const wantFoot = wanted <= 1 ? 1 : Math.min(4, wanted + 1);
  const wantCars = wanted >= 3 ? Math.min(2, wanted - 2) : 0;
  if (policeAccum > 1.6 && !hidden) {
    policeAccum = 0;
    if (policeUnits.length < wantFoot) spawnFootCop();
    if (policeCars.length < wantCars) spawnCopCar();
  }

  const pp = player.group.position;
  let nearest = Infinity;
  // foot cops are deliberately slower than a sprinting player (6.2) at low wanted
  // so escape is always possible on this map; they speed up as stars climb.
  const copSpeed = wanted <= 1 ? 2.6 : wanted === 2 ? 3.3 : 4.1;
  const canBust = policeGrace <= 0;            // grace window must elapse first

  // foot cops chase + (eventually) bust
  for (let i = policeUnits.length - 1; i >= 0; i--) {
    const u = policeUnits[i];
    if (u.health <= 0) { removeFootCop(i); continue; }
    if (u.hitT > 0) u.hitT -= dt;
    const g = u.av.group;
    const dx = pp.x - g.position.x, dz = pp.z - g.position.z;
    const d = Math.hypot(dx, dz) || 1;
    nearest = Math.min(nearest, d);
    if (d > 1.3) { const sp = copSpeed * dt; g.position.x += dx / d * sp; g.position.z += dz / d * sp; }
    g.rotation.y = Math.atan2(dx, dz);
    u.t = (u.t || 0) + dt; g.position.y = Math.abs(Math.sin(u.t * 8)) * 0.04;
    resolveCollision(g.position, 0.5, cityColliders); g.position.y = Math.abs(Math.sin(u.t * 8)) * 0.04;
    // Busting takes a sustained corner (≈5s) and only after the grace window. At
    // 1★ the player gets an explicit warning before the clock even starts.
    if (!inCar && d < 1.9 && canBust) {
      if (!policeWarned) { policeWarned = true; notify('⚠️ You were warned — keep moving or you’ll be busted!'); }
      bustTimer += dt;
      if (bustTimer > 5) { bustPlayer(); return; }
    } else if (d >= 2.4) {
      bustTimer = Math.max(0, bustTimer - dt * 0.8);   // breaking contact cools the bust clock
    }
  }
  if (inCar) bustTimer = 0;

  // cruisers chase (heavier, faster, flashing lights)
  for (const c of policeCars) {
    const target = (inCar && drivingVehicle) ? drivingVehicle.g.position : pp;
    const dx = target.x - c.g.position.x, dz = target.z - c.g.position.z;
    const d = Math.hypot(dx, dz) || 1;
    nearest = Math.min(nearest, d);
    c.g.rotation.y = lerpAngle(c.g.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 2.4));
    const fwd = new THREE.Vector3(Math.sin(c.g.rotation.y), 0, Math.cos(c.g.rotation.y));
    c.speed = Math.min(18, (c.speed || 0) + 11 * dt);
    if (d < 6) c.speed *= 0.88;
    c.g.position.addScaledVector(fwd, c.speed * dt); c.g.position.y = 0;
    resolveCollision(c.g.position, 1.6, cityColliders);
    (c.g.userData.wheels || []).forEach(w => { w.rotation.x += c.speed * dt; });
    if (c.lightBar) c.lightBar.material.color.setHex((Math.floor(clock.elapsedTime * 6) % 2) ? 0xff3030 : 0x3060ff);
  }

  // de-escalation: lose them by getting distance OR by breaking line-of-sight.
  // Distance still works (nearest > 48) but hiding behind cover now also cools
  // the heat — once unseen for a few seconds the trail goes cold much quicker.
  const cooling = nearest > 48 || hidden || (policeUnits.length + policeCars.length) === 0;
  const coolNeed = hidden ? 5 : 9;             // hidden cools roughly twice as fast
  if (cooling) {
    copCoolTimer += dt;
    if (copCoolTimer > coolNeed) {
      copCoolTimer = 0;
      state.wanted = Math.max(0, wanted - 1);
      state.heat = Math.max(0, (state.heat || 0) - 30);
      notify(state.wanted === 0 ? '🕶️ You lost the cops.' : 'Wanted dropped to ' + state.wanted);
      if (state.wanted === 0) { despawnAllPolice(); missionEvent('lost-cops'); }
      saveNow();
    }
  } else {
    copCoolTimer = Math.max(0, copCoolTimer - dt * 0.6);
  }
}

// Reflect accumulated damage on a vehicle: charred panels, a lean, and smoke.
function applyCarDamageVisual(v) {
  if (!v || !v.g) return;
  const dmg = Math.min(100, v.damage || 0);
  const f = dmg / 100;
  v.g.traverse(o => {
    if (o.isMesh && o.material && o.material.color && o.geometry?.type === 'BoxGeometry') {
      if (!o.userData._baseColor) o.userData._baseColor = o.material.color.clone();
      o.material.color.copy(o.userData._baseColor).lerp(new THREE.Color('#2e2c29'), f * 0.7);
    }
  });
  v.g.rotation.z = -f * 0.05;
  if (dmg > 55 && !v._smoke) {
    const smoke = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6),
      new THREE.MeshStandardMaterial({ color: '#555', transparent: true, opacity: 0.5 }));
    smoke.position.set(0, 1.1, -1.2); v.g.add(smoke); v._smoke = smoke;
  } else if (dmg <= 55 && v._smoke) { v.g.remove(v._smoke); v._smoke = null; }
}

// Weapons counter at Block Supply — tabbed, catalog-driven store. Scales to any
// number of weapons/melee/ammo/upgrades with no edits here: tabs are built from
// the catalog (Weapons/Melee), ammo from owned ammo types, upgrades from the
// upgrades supported by owned weapons, and "Owned" lists what the player has.
function openWeaponShop() {
  const stat = (w) => `${w.dmg} dmg · ${w.melee ? 'melee' : (w.mag === Infinity ? '∞' : w.mag) + ' mag · ' + (w.auto ? 'auto' : 'semi')}`;
  const weaponCard = (w) => {
    const owned = state.ownedWeapons.includes(w.id);
    const cat = CATEGORIES.find(c => c.id === w.category);
    return {
      id: w.id, kind: 'weapon', name: `${w.icon} ${w.name}`, price: w.price,
      tag: cat ? cat.name : w.category, info: w.desc || '',
      stats: stat(w) + (w.ammoType ? ` · ${AMMO_TYPES[w.ammoType]?.name || w.ammoType}` : ''),
      owned, ownedLabel: w.melee ? '✓ Owned' : '✓ Owned · Restock', action: owned ? (w.melee ? null : 'Restock') : null,
    };
  };
  const ammoCard = (t) => ({
    id: t.id, kind: 'ammo', name: `🧰 ${t.name}`, price: t.price,
    tag: 'Ammo', info: t.desc, stats: `+${t.amount} rounds · pool: ${ammoReserveOf(t.id)}`,
    owned: false, action: 'Buy',
  });
  const upgradeCards = () => {
    // every upgrade supported by a weapon the player owns
    const cards = [];
    for (const wid of state.ownedWeapons) {
      const w = weaponById(wid);
      if (!w || !(w.upgrades || []).length) continue;
      for (const uid of w.upgrades) {
        const up = upgradeById(uid); if (!up) continue;
        const ownedUp = (state.ownedUpgrades?.[wid] || []).includes(uid);
        const equipped = (state.equippedUpgrades?.[wid] || []).includes(uid);
        cards.push({
          id: uid + '@' + wid, kind: 'upgrade', weaponId: wid, upgradeId: uid,
          name: `${up.name}`, price: ownedUp ? null : up.price,
          tag: `${w.icon} ${w.name}`, info: up.desc, stats: `slot: ${up.slot}`,
          owned: ownedUp, ownedLabel: equipped ? '✓ Equipped' : 'Owned · Equip',
          action: ownedUp ? (equipped ? 'Unequip' : 'Equip') : null,
        });
      }
    }
    return cards;
  };
  const ownedCards = () => state.ownedWeapons.map(id => weaponById(id)).filter(Boolean).map(w => {
    const info = w.melee ? null : ammoInfo(w.id);
    const equipped = state.equippedWeapon === w.id;
    return {
      id: w.id, kind: 'equip', name: `${w.icon} ${w.name}`, price: null,
      tag: equipped ? 'Equipped' : 'Owned', info: w.desc || '',
      stats: info ? `${info.mag}/${info.reserve === Infinity ? '∞' : info.reserve} ${AMMO_TYPES[w.ammoType]?.name || ''}` : 'melee',
      owned: true, ownedLabel: equipped ? '✓ Equipped' : 'Equip', action: equipped ? null : 'Equip',
    };
  });

  openShop({
    title: 'Block Supply',
    sub: 'Pick a tab · buy weapons, ammo & upgrades · equip from Owned · 1–7 hotkeys · R reload · click fire.',
    getMoney: () => state.money,
    tabs: [
      { id: 'Weapons', label: '🔫 Weapons' },
      { id: 'Melee', label: '🏏 Melee & Tools' },
      { id: 'Ammo', label: '🧰 Ammo' },
      { id: 'Upgrades', label: '🔧 Upgrades' },
      { id: 'Owned', label: '🎒 Owned' },
    ],
    emptyText: 'Buy a weapon first to unlock this.',
    getItems: (tab) => {
      if (tab === 'Weapons') return weaponsForTab('Weapons').map(weaponCard);
      if (tab === 'Melee') return weaponsForTab('Melee').map(weaponCard);
      if (tab === 'Ammo') return ownedAmmoTypes(state.ownedWeapons).map(ammoCard);
      if (tab === 'Upgrades') return upgradeCards();
      if (tab === 'Owned') return ownedCards();
      return [];
    },
    onBuy: (item) => {
      if (item.kind === 'ammo') return buyAmmo(item.id);
      if (item.kind === 'upgrade') {
        if (item.owned) { equipUpgrade(item.weaponId, item.upgradeId); return true; }
        return buyUpgrade(item.weaponId, item.upgradeId);
      }
      if (item.kind === 'equip') { equipWeapon(item.id); return true; }
      // weapon (buy new, or restock if owned)
      const ok = buyWeapon(item.id);
      if (ok && !state.ownedWeapons.includes(item.id)) { /* unreachable */ }
      if (ok && item.kind === 'weapon' && state.equippedWeapon === 'fists') equipWeapon(item.id);
      return ok;
    },
  });
}
function ammoReserveOf(typeId) { return (state.ammoReserve && state.ammoReserve[typeId]) || 0; }

// ── inventory overlay ───────────────────────────────────────────────────────────
// Shows everything the player owns and lets them re-equip / holster weapons.
// Reachable any time with the I key, so a holstered gun can always be pulled back
// out — no more "lost weapon" state.
function inventoryOpts() {
  // Guard every entry: skip ids that don't resolve to a weapon, always include
  // fists, and never assume an item has gun-only fields.
  const ids = (state.ownedWeapons && state.ownedWeapons.length ? state.ownedWeapons : ['fists']);
  const owned = ids.map(id => weaponById(id)).filter(Boolean);
  if (!owned.some(w => w.id === 'fists')) owned.unshift(weaponById('fists'));
  console.debug('[inventory] open | owned:', owned.map(w => w && w.id).join(','), '| equipped:', state.equippedWeapon);
  const choices = [];
  for (const w of owned) {
    if (!w) continue;
    const eq = state.equippedWeapon === w.id;
    const a = w.melee ? null : ammoInfo(w.id);
    const ammoStr = w.melee ? '' : (a ? `  (${a.mag}/${a.reserve === Infinity ? '∞' : a.reserve})` : '');
    choices.push({
      label: `${w.icon} ${w.name}${ammoStr}${eq ? '   ✓ equipped' : ''}`,
      onPick: () => {
        try { console.debug('[inventory] pick', w.id, '| was', state.equippedWeapon); if (!eq) equipWeapon(w.id); }
        catch (e) { console.warn('[inventory] equip failed', e); notify('Could not equip that item'); }
        return inventoryOpts();
      },
    });
  }
  if (state.equippedWeapon !== 'fists') {
    choices.unshift({ label: '✋ Holster weapon (back to fists)', onPick: () => {
      try { console.debug('[inventory] holster → fists'); equipWeapon('fists'); }
      catch (e) { console.warn('[inventory] holster failed', e); notify('Could not holster'); }
      return inventoryOpts();
    } });
  }
  choices.push({ label: 'Close', onPick: () => undefined });
  return {
    name: '🎒 Inventory',
    text: `Cash $${(state.money || 0).toLocaleString()}  ·  🍗 ${state.chicken || 0}  ·  🗑️ ${trashCarried || 0}  ·  💎 ${state.gems || 0}. ` +
          `Tap a weapon to equip it. Hotkeys: 1–7 equip · Q/X switch · click to fire · R reload.`,
    choices,
  };
}
function openInventory() { if (!isUIOpen()) openDialogue(inventoryOpts()); }

// One-time init for the weapon controller + mission tracker.
function initGameSystems() {
  initWeapons({
    camera, scene, renderer, state, notify, saveNow,
    getTargets: getWeaponTargets, onKill: onWeaponKill, onShotFired: onWeaponShot,
    getPlayerPos: () => (player ? player.group.position : null),
    // melee swings + body facing aim where the cursor points
    getAimDir: () => aimDirFromCursor(),
    // the shot ray: cursor ray for normal guns, scope-centre for scoped weapons
    getShootRay: () => shootRay(),
    // only scoped weapons are "aiming" (tight, no aim-assist drift) — but normal
    // guns still get light snap because the cursor itself is the aim.
    isScoping: () => isScopingNow(),
    onEquip: () => mountHeldWeapon(),
  });
  initMissions({ state, notify, saveNow });
  renderTracker();
}

// ── weapon input (mouse fire / reload / quick-switch) ───────────────────────────
let fireHeld = false, firePressed = false, reloadPressed = false;
canvas.addEventListener('mousedown', e => { if (e.button === 0) { fireHeld = true; firePressed = true; } });
window.addEventListener('mouseup', e => { if (e.button === 0) fireHeld = false; });

// ── cursor aiming ──────────────────────────────────────────────────────────────
// The mouse IS the aim for normal guns: we track the cursor in both pixels (to
// position the crosshair) and normalized device coords (to cast a ray from the
// camera through the cursor into the world). No pointer lock — the cursor stays
// free so it can also click trash / NPCs / UI.
const _mousePx = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
const _mouseNDC = new THREE.Vector2(0, 0);
const _aimRaycaster = new THREE.Raycaster();
canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  _mousePx.x = e.clientX; _mousePx.y = e.clientY;
  _mouseNDC.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  _mouseNDC.y = -((e.clientY - r.top) / r.height) * 2 + 1;
});
// A weapon supports right-click scope only if it is explicitly scoped (sniper /
// precision). Everything else ignores right-click.
function weaponSupportsScope(w) { return !!(w && w.scoped); }
// True while a scoped weapon is actually scoped in (right mouse held).
function isScopingNow() {
  const cw = currentWeapon();
  return !!(cw && !cw.melee && weaponSupportsScope(cw) && controls.mouseHeld(2) && !inCar);
}
// The ray a shot travels along: scoped weapons fire through the centred scope
// reticle (camera forward); every other gun fires where the cursor points.
function shootRay() {
  if (isScopingNow()) {
    const o = new THREE.Vector3(); camera.getWorldPosition(o);
    const d = new THREE.Vector3(); camera.getWorldDirection(d);
    return { origin: o, dir: d.normalize() };
  }
  _aimRaycaster.setFromCamera(_mouseNDC, camera);
  return { origin: _aimRaycaster.ray.origin.clone(), dir: _aimRaycaster.ray.direction.clone().normalize() };
}
// Where the cursor points on the ground/chest plane, as a flat facing direction
// from the player — drives body facing and melee swing direction so the held
// weapon points at the cursor target.
function aimDirFromCursor() {
  _aimRaycaster.setFromCamera(_mouseNDC, camera);
  const ray = _aimRaycaster.ray;
  const planeY = (player ? player.group.position.y : 0) + 1.0;
  if (player && Math.abs(ray.direction.y) > 1e-4) {
    const t = (planeY - ray.origin.y) / ray.direction.y;
    if (t > 0) {
      const gp = ray.origin.clone().add(ray.direction.clone().multiplyScalar(t));
      const d = gp.sub(player.group.position); d.y = 0;
      if (d.lengthSq() > 1e-4) return d.normalize();
    }
  }
  const d = ray.direction.clone(); d.y = 0;
  if (d.lengthSq() < 1e-4) d.set(0, 0, -1);
  return d.normalize();
}

// ── collisions ─────────────────────────────────────────────────────────────────
function activeColliders() {
  if (area === 'city') return cityColliders;
  return interiors.byId[area]?.colliders || [];
}
function resolveCollision(pos, radius, list) {
  const arr = list || activeColliders();
  for (const bb of arr) {
    if (pos.x + radius < bb.min.x || pos.x - radius > bb.max.x) continue;
    if (pos.z + radius < bb.min.z || pos.z - radius > bb.max.z) continue;
    if (pos.y > bb.max.y) continue;
    const cx = Math.max(bb.min.x, Math.min(pos.x, bb.max.x));
    const cz = Math.max(bb.min.z, Math.min(pos.z, bb.max.z));
    let dx = pos.x - cx, dz = pos.z - cz, d = Math.hypot(dx, dz);
    if (d < radius) {
      if (d < 1e-4) { dx = 1; dz = 0; d = 1; }
      pos.x = cx + (dx / d) * radius;
      pos.z = cz + (dz / d) * radius;
    }
  }
}

// ── on-foot movement ───────────────────────────────────────────────────────────
function updatePlayer(dt, t) {
  const inp = controls.moveInput();
  // A/D (and ←/→) now TURN the view — the mouse no longer looks around, so it
  // stays free to click trash / NPCs and to shoot. Apply the turn to the camera
  // yaw BEFORE reading it so movement lines up with where you're facing.
  if (inp.s) controls.yaw += inp.s * 2.4 * dt;
  const yaw = controls.cameraYaw();
  // The camera looks toward +(sin yaw, cos yaw) in FIRST person, but sits BEHIND
  // the player looking toward -(sin yaw, cos yaw) in THIRD person. Movement forward
  // must match where the camera is looking, so flip the sign per mode — otherwise
  // first-person W/S feel inverted.
  const fp = controls.mode === CAM.FIRST;
  const forward = fp
    ? new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw))
    : new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  // W/S move forward/back along the facing direction (no strafing — A/D turns).
  const move = new THREE.Vector3().addScaledVector(forward, inp.f);
  const moving = move.lengthSq() > 0.001;
  if (moving) move.normalize();

  // Sprinting costs stamina (energy); higher FITNESS = faster sprint + slower
  // drain, so gym training tangibly improves how you move.
  const pstats = state.stats;
  const pfit = pstats.fitness || 0;
  const canSprint = inp.run && moving && (pstats.energy || 0) > 2;
  const monsterForm = !!state.playerMonster;     // monster form moves faster & fiercer
  const speed = (canSprint ? (6.2 + (pfit / 100) * 2.4) : 3.4) * (monsterForm ? 1.3 : 1);
  // Sprint stamina drain is gentle now so you can actually outrun cops; fitness
  // lowers it further (gym training pays off). ~3/s at 0 fitness, ~2.2/s at 100.
  if (canSprint) pstats.energy = Math.max(0, pstats.energy - (3.0 * (1 - pfit / 250)) * dt);
  // feedback when you try to sprint with no stamina left (throttled)
  if (inp.run && moving && (pstats.energy || 0) <= 2 && t - lastSprintWarn > 3) {
    lastSprintWarn = t; notify('😮‍💨 Too winded to sprint — rest or eat to recover energy.');
  }
  const p = player.group.position;
  p.addScaledVector(move, speed * dt);

  if (inp.jump && onGround) { velY = 5.2; onGround = false; }
  velY -= 14 * dt; p.y += velY * dt;
  if (p.y <= 0) { p.y = 0; velY = 0; onGround = true; }

  resolveCollision(p, 0.5);

  // solid pedestrians: the player can't phase through NPCs anymore. Push both
  // apart on overlap (player gets most of the correction, the NPC nudges aside).
  if (area === 'city' && !inCar) {
    const PR = 0.55;
    for (const n of cityNPCs) {
      if (n.downed) continue;
      const g = n.av.group;
      const dx = p.x - g.position.x, dz = p.z - g.position.z;
      const d = Math.hypot(dx, dz);
      const minD = PR + 0.45;
      if (d < minD && d > 1e-4) {
        const push = (minD - d);
        const ux = dx / d, uz = dz / d;
        p.x += ux * push * 0.7;
        p.z += uz * push * 0.7;
        g.position.x -= ux * push * 0.3;
        g.position.z -= uz * push * 0.3;
      }
    }
    // Monster form terrifies nearby civilians — they panic and flee as you pass.
    if (monsterForm) {
      for (const n of cityNPCs) {
        if (n.downed) continue;
        const g = n.av.group;
        if (Math.hypot(p.x - g.position.x, p.z - g.position.z) < 5) n.panic = Math.max(n.panic || 0, 1.6);
      }
    }
  }

  if (controls.mode === CAM.FIRST) player.group.rotation.y = yaw;
  else if (combatFacingNow(fp)) {
    // Combat stance: face where the CURSOR points (the crosshair) so the held
    // weapon — and any shot or swing — lines up with the target under the cursor.
    // Scoped weapons fall back to camera-forward while scoped (centre reticle).
    const ad = isScopingNow() ? forward : aimDirFromCursor();
    const aimYaw = Math.atan2(ad.x, ad.z);
    const cwf = currentWeapon();
    const k = (cwf && !cwf.melee) ? (isScopingNow() ? 22 : 16) : 18;
    player.group.rotation.y = lerpAngle(player.group.rotation.y, aimYaw, Math.min(1, dt * k));
  }
  else if (moving || inp.s) {
    const faceDir = moving ? move : forward;   // turn the model even while standing & turning
    player.group.rotation.y = lerpAngle(player.group.rotation.y, Math.atan2(faceDir.x, faceDir.z), Math.min(1, dt * 12));
  }

  const amp = moving ? (canSprint ? 0.95 : 0.62) : 0;
  const rate = canSprint ? 12 : 8.4;
  const ph = t * rate;
  const sw = Math.sin(ph) * amp;
  player.parts.leftLeg.rotation.x = sw; player.parts.rightLeg.rotation.x = -sw;
  player.parts.leftArm.rotation.x = -sw * 0.85; player.parts.rightArm.rotation.x = sw * 0.85;
  player.parts.leftArm.rotation.z = 0.08 * amp; player.parts.rightArm.rotation.z = -0.08 * amp;
  // Melee swing overlay: a quick downward chop arc on the right arm so equipped
  // bats / pipes / wrenches / planks visibly attack. Decays back to rest.
  if (meleeSwingT > 0) {
    meleeSwingT = Math.max(0, meleeSwingT - dt);
    const phase = 1 - (meleeSwingT / 0.26);            // 0 → 1 over the swing
    const arc = Math.sin(phase * Math.PI);             // ease up then down
    player.parts.rightArm.rotation.x = -1.5 * arc;     // raise then chop forward
    player.parts.rightArm.rotation.z = -0.35 * arc;
  }
  if (player.parts.torso) {
    player.parts.torso.rotation.y = Math.sin(ph) * 0.06 * amp;
    player.parts.torso.rotation.z = Math.cos(ph) * 0.03 * amp;
  }
  player.parts.headGroup.visible = controls.mode !== CAM.FIRST;

  controls.update(p, player.eyeHeight, dt);
}

// ── DIALOGUE ───────────────────────────────────────────────────────────────────
function remember(npc) {
  const m = state.npcMemory[npc.id] || { greeted: false, timesTalked: 0, lastDay: 0 };
  const first = !m.greeted;
  m.greeted = true; m.timesTalked++; m.lastDay = state.day;
  state.npcMemory[npc.id] = m;
  return { first, times: m.timesTalked };
}
const CITY_TIPS = [
  'Auto Haus has supercars if your wallet is right.',
  'Frostbox will ice you out — try the custom chain builder.',
  'The Chicken Spot hits different when your hunger is low.',
  'Need a fresh lineup? Use the clippers at your crib.',
  'Block Supply got all the gear for the grind.',
];
function talkTo(n) {
  n.talking = true;
  missionEvent('talk-city');
  const mem = remember(n);
  const greet = mem.first
    ? `Ay, I'm ${n.name}. First time seeing you around here.`
    : `${n.name} again — we keep runnin' into each other. (${mem.times} talks)`;
  openDialogue({
    name: n.name,
    text: greet,
    choices: [
      { label: "What's good?", onPick: () => ({ name: n.name, text: `Just out here, feelin' ${n.mood}. Stay up.`, choices: [{ label: 'Bet.', onPick: () => endTalk(n) }] }) },
      { label: 'Got any tips?', onPick: () => ({ name: n.name, text: CITY_TIPS[Math.floor(Math.random() * CITY_TIPS.length)], choices: [{ label: 'Good lookin.', onPick: () => endTalk(n) }] }) },
      { label: 'Later.', onPick: () => endTalk(n) },
    ],
  });
}
function endTalk(n) { n.talking = false; return undefined; }

function talkToInterior(npc) {
  const memKey = { id: 'int-' + npc.name };
  remember(memKey);
  missionEvent('talk-int', npc.dialogue);
  switch (npc.dialogue) {
    case 'dealer':
      openDialogue({ name: npc.name + ' · Auto Haus', text: 'Welcome to Auto Haus. We got whips from city hatchbacks to supercars. Walk the floor and tap a car to view it.',
        choices: [
          { label: 'Tell me about financing', onPick: () => ({ name: npc.name, text: 'Cash only in this city, lil bro. Save up, then ride out. Repairs run cheaper than a new whip.', choices: [{ label: 'Got it', onPick: () => {} }] }) },
          { label: 'Thanks', onPick: () => {} },
        ] });
      break;
    case 'jeweler':
      openDialogue({ name: npc.name + ' · Frostbox', text: 'Welcome to Frostbox. Want something off the shelf, or you tryna build a custom iced-out chain?',
        choices: [
          { label: 'Build a custom chain', onPick: () => { openChainBuilderUI(); return 'keep'; } },
          { label: 'Browse the cases', onPick: () => { openJewelryShop(); return 'keep'; } },
          { label: 'Just lookin', onPick: () => {} },
        ] });
      break;
    case 'gear':
      openDialogue({ name: npc.name + ' · Block Supply', text: 'Block Supply, we keep the crew geared up. Backpacks, radios, toolkits — all legit.',
        choices: [
          { label: 'Show me the gear', onPick: () => { openGearShop(); return 'keep'; } },
          { label: 'Maybe later', onPick: () => {} },
        ] });
      break;
    case 'cashier':
      openDialogue({ name: npc.name + ' · Chicken Spot', text: 'Welcome to the Chicken Spot! Fresh and hot. You buyin or you tryna work a shift?',
        choices: [
          { label: 'Buy chicken ($8)', onPick: () => { buyChicken(); return 'keep'; } },
          { label: 'Work a shift (+$55)', onPick: () => { workShift(); return undefined; } },
          { label: 'Just browsing', onPick: () => {} },
        ] });
      break;
    case 'stylist':
      openDialogue({ name: npc.name + ' · Kicks & Fits', text: 'Welcome to Kicks & Fits. Fresh fits, fresh kicks. Wanna try something on?',
        choices: [
          { label: 'Try on fits', onPick: () => { openWardrobe(); return 'keep'; } },
          { label: 'Nah, just lookin', onPick: () => {} },
        ] });
      break;
    case 'trainer':
      openDialogue({ name: npc.name + ' · Iron City Gym', text: "Welcome to Iron City. You tryna get right? Hit the bench or the treadmill and put in work — your fitness goes up.",
        choices: [
          { label: 'Start a workout', onPick: () => { startWorkout(); return undefined; } },
          { label: 'Just lookin around', onPick: () => {} },
        ] });
      break;
    case 'teacher':
      openDialogue({ name: npc.name + ' · Zaylin Prep', text: 'Knowledge is power out here. Take a seat and study — it sharpens your smarts.',
        choices: [
          { label: 'Sit and study', onPick: () => { startStudy(); return undefined; } },
          { label: 'Maybe later', onPick: () => {} },
        ] });
      break;
    case 'manager':
      openDialogue({ name: npc.name + ' · WorkTower', text: "We always need hands. Clock in, run the shift, get paid. Easy money if your energy's up.",
        choices: [
          { label: 'Clock in (work a shift)', onPick: () => { doJobShift(); return undefined; } },
          { label: 'Not right now', onPick: () => {} },
        ] });
      break;
    case 'mechanic':
      openDialogue({ name: npc.name + ' · City Garage', text: 'Whip looking beat up? I can patch the dents and get you running clean again.',
        choices: [
          { label: 'Repair my ride', onPick: () => { repairVehicle(); return undefined; } },
          { label: 'Just browsing', onPick: () => {} },
        ] });
      break;
    case 'clerk':
      openDialogue({ name: npc.name + ' · 6twelve', text: 'Welcome to 6twelve! Grab a snack, cop a cold drink, or fill up at the pumps out front.',
        choices: [
          { label: 'Buy a snack ($5)', onPick: () => { buySnack(); return 'keep'; } },
          { label: 'Grab a drink ($3)', onPick: () => { buyDrink(); return 'keep'; } },
          { label: 'Just looking', onPick: () => {} },
        ] });
      break;
    case 'police-desk':
      talkToPoliceDesk();
      break;
    default:
      openDialogue({ name: npc.name, text: 'What\'s good?', choices: [{ label: 'Later', onPick: () => {} }] });
  }
}

// ── STATIONS ───────────────────────────────────────────────────────────────────
function runStation(intr, st) {
  switch (st.type) {
    case 'dealer-car': openCarMenu(st.data, st.mesh); break;
    case 'chain-builder': openChainBuilderUI(); break;
    case 'jewelry-shop': openJewelryShop(); break;
    case 'gear-shop': openGearShop(); break;
    case 'food-buy': buyChicken(); break;
    case 'food-eat': startEating(); break;
    case 'buy-snack': buySnack(); break;
    case 'buy-drink': buyDrink(); break;
    case 'work-shift': workShift(); break;
    case 'rest': restAtHome(); break;
    case 'wardrobe': openWardrobe(); break;
    case 'safe': openSafe(); break;
    case 'mirror-cut': startHairline(); break;
    case 'workout': startWorkoutAt(st.equip); break;
    case 'study': startStudy(); break;
    case 'job-work': doJobShift(); break;
    case 'garage-work': doGarageShift(); break;
    case 'repair': repairVehicle(); break;
    case 'weapon-shop': openWeaponShop(); break;
    case 'police-desk': talkToPoliceDesk(); break;
    case 'evidence-locker': openEvidenceLocker(); break;
    case 'inspect-cells': inspectHoldingCells(); break;
    default: notify('Nothing happens here.');
  }
}

// dealership car menu
function openCarMenu(carDef, mesh) {
  if (mesh) mesh.userData.spin = true;
  const owned = state.ownedCars.includes(carDef.id);
  openDialogue({
    name: carDef.name,
    text: `Top speed ~${carDef.top} mph. Price $${carDef.price.toLocaleString()}. ${owned ? 'You already own this whip.' : ''} Repairs: $${Math.round(carDef.price * 0.04).toLocaleString()}. Insurance: $${Math.round(carDef.price * 0.02).toLocaleString()}/mo.`,
    choices: [
      owned
        ? { label: 'Make this my ride', onPick: () => { setActiveCar(carDef); notify('Now driving the ' + carDef.name); stopSpin(mesh); } }
        : (state.money >= carDef.price
          ? { label: `Buy for $${carDef.price.toLocaleString()}`, onPick: () => { buyCar(carDef); stopSpin(mesh); } }
          : { label: `Need $${(carDef.price - Math.floor(state.money)).toLocaleString()} more`, onPick: () => 'keep' }),
      { label: 'Test drive (free spin)', onPick: () => { notify('🏁 Took the ' + carDef.name + ' for a spin!'); state.stats.fun = Math.min(100, state.stats.fun + 6); return undefined; } },
      { label: 'Close', onPick: () => { stopSpin(mesh); } },
    ],
  });
}
function stopSpin(mesh) { if (mesh) mesh.userData.spin = false; }
function buyCar(carDef) {
  if (state.money < carDef.price) { notify('Not enough money'); return; }
  state.money -= carDef.price;
  if (!state.ownedCars.includes(carDef.id)) state.ownedCars.push(carDef.id);
  setActiveCar(carDef);
  notify('🔑 Bought the ' + carDef.name + '! Parked outside.');
  saveNow();
}
function setActiveCar(carDef) {
  // give the drivable car the purchased model so the whip you own matches the
  // one you bought at the showroom (unique kit body per dealership car).
  if (carDef.kitModel) {
    const ok = swapVehicleVisual(car, carDef.kitModel);
    if (!ok && car.g.children[0]?.material) car.g.children[0].material.color.set(carDef.color);
  } else if (car.g.children[0]?.material) {
    car.g.children[0].material.color.set(carDef.color);
  }
  car.damage = 0; state.carDamage = 0;
  state.activeCar = carDef.id;
  applyCarDamageVisual(car);
}

// jewelry quick-shop
function openJewelryShop() {
  openShop({
    title: 'Frostbox — Display Cases', sub: 'Tap to cop. It equips instantly.',
    getMoney: () => state.money,
    items: JEWELRY_STOCK.map(j => ({ ...j, owned: state.ownedJewelry.includes(j.id) })),
    onBuy: (item) => {
      if (state.money < item.price) return false;
      state.money -= item.price;
      if (!state.ownedJewelry.includes(item.id)) state.ownedJewelry.push(item.id);
      state.custom.jewelry = item.jewelry;
      rebuildPlayer();
      notify('🧊 Iced out with the ' + item.name);
      saveNow();
      item.owned = true;
      return true;
    },
  });
}

// chain builder
function openChainBuilderUI() {
  const chains = [
    { id: 'rope', name: 'Rope Chain', price: 1200, jewelry: 'chain' },
    { id: 'cuban', name: 'Cuban Link', price: 4200, jewelry: 'cuban' },
    { id: 'tennis', name: 'Tennis Chain', price: 6800, jewelry: 'cuban' },
  ];
  const pendants = [
    { id: 'none', name: 'No Pendant', price: 0, iced: false },
    { id: 'cross', name: 'Cross', price: 900, iced: false },
    { id: 'globe', name: 'Iced Globe', price: 2600, iced: true },
  ];
  const materials = [
    { id: 'gold', name: 'Gold', mult: 1.0, iced: false },
    { id: 'white', name: 'White Gold', mult: 1.25, iced: false },
    { id: 'vvs', name: 'VVS Iced', mult: 1.7, iced: true },
  ];
  builderOpen = true;
  const mapJewelry = (sel) => (sel.material.iced || sel.pendant.iced) ? 'iced'
    : (sel.chain.jewelry === 'cuban' ? 'cuban' : 'chain');
  openChainBuilder({
    chains, pendants, materials,
    getMoney: () => state.money,
    onChange: (sel) => {
      const temp = { ...state.custom, jewelry: mapJewelry(sel) };
      if (builderAvatar) builderPV.scene.remove(builderAvatar.group);
      builderAvatar = buildAvatar(temp);
      builderPV.scene.add(builderAvatar.group);
    },
    onBuy: (sel, total) => {
      if (state.money < total) return false;
      state.money -= total;
      const jw = mapJewelry(sel);
      state.custom.jewelry = jw;
      const id = 'custom-' + sel.chain.id + '-' + sel.material.id;
      if (!state.ownedJewelry.includes(id)) state.ownedJewelry.push(id);
      rebuildPlayer();
      notify('💎 Custom chain made: $' + total.toLocaleString());
      saveNow();
      return true;
    },
  });
}

// gear shop
function openGearShop() {
  openShop({
    title: 'Block Supply', sub: 'Fictional gear for the grind.',
    getMoney: () => state.money,
    items: GEAR_STOCK.map(g => ({ ...g, owned: state.ownedGear.includes(g.id) })),
    onBuy: (item) => {
      if (state.money < item.price) return false;
      state.money -= item.price;
      if (!state.ownedGear.includes(item.id)) state.ownedGear.push(item.id);
      notify('🎒 Bought ' + item.name);
      saveNow();
      item.owned = true;
      return true;
    },
  });
}

// chicken
function buyChicken() {
  if (state.money < 8) { notify('Not enough money'); return; }
  state.money -= 8; state.chicken++;
  notify('🍗 Bought chicken (' + state.chicken + ' in bag). Sit & eat to chow down.');
  missionEvent('buy-chicken');
  saveNow();
}
// ── 6twelve convenience store (snacks + drinks) ─────────────────────────────
// Instant consumables bought at the gas-station store: a snack tops up hunger +
// a little fun; a drink restores energy + a little fun. Cheap pick-me-ups for
// between jobs.
function buySnack() {
  if (state.money < 5) { notify('Not enough money for a snack ($5).'); return; }
  state.money -= 5;
  state.stats.hunger = Math.min(100, state.stats.hunger + 22);
  state.stats.fun = Math.min(100, state.stats.fun + 4);
  notify('🍫 Snack down — hunger restored.');
  missionEvent('buy-snack');
  saveNow();
}
function buyDrink() {
  if (state.money < 3) { notify('Not enough money for a drink ($3).'); return; }
  state.money -= 3;
  state.stats.energy = Math.min(100, state.stats.energy + 18);
  state.stats.hunger = Math.min(100, state.stats.hunger + 6);
  state.stats.fun = Math.min(100, state.stats.fun + 4);
  notify('🥤 Ice cold — energy up.');
  missionEvent('buy-drink');
  saveNow();
}
// ── WORK SHIFTS (task loops — pay ONLY after completing the tasks) ──────────────
// Every job runs a short checklist of timed tasks via the shared mini-game. Pay
// and stat boosts scale with how many tasks you nailed (bad/okay/good/excellent).
function grade(hits, rounds) {
  const f = rounds ? hits / rounds : 0;
  if (f >= 0.95) return { label: 'EXCELLENT', mult: 1.5 };
  if (f >= 0.65) return { label: 'GOOD', mult: 1.15 };
  if (f >= 0.35) return { label: 'OKAY', mult: 0.85 };
  return { label: 'POOR', mult: 0.5 };
}
function runWorkShift({ title, jobName, tasks, basePay, energyCost = 20, onPaid }) {
  if (state.stats.energy < 12) { notify('Too gassed to work — rest or eat first.'); return; }
  startTimingGame({
    title, rounds: tasks.length, speedBase: 2.2, labels: tasks,
    onFinish: (hits, rounds) => {
      const g = grade(hits, rounds);
      const pay = Math.round(basePay * g.mult);
      state.money += pay;
      state.job = jobName;
      state.stats.energy = Math.max(0, state.stats.energy - energyCost);
      state.stats.hygiene = Math.max(0, state.stats.hygiene - 8);
      notify(`✅ ${g.label} shift (${hits}/${rounds}) — earned $${pay}`);
      if (onPaid) onPaid(g, hits, rounds);
      state.timeMin += 150;
      missionEvent('job-done');
      saveNow();
    },
  });
}

// Chicken Spot crew shift.
function workShift() {
  runWorkShift({
    title: '🍗 Chicken Spot Shift', jobName: 'Chicken Spot Crew', basePay: 60,
    tasks: ['Take order', 'Fry & serve', 'Wipe counter', 'Restock', 'Take out trash'],
    onPaid: (g) => {
      // good service builds a little business sense (smarts) + fun
      state.stats.smarts = Math.min(100, state.stats.smarts + (g.mult >= 1.15 ? 2 : 1));
      state.stats.fun = Math.min(100, state.stats.fun + 3);
    },
  });
}
function restAtHome() {
  state.stats.energy = 100; state.stats.hygiene = 100;
  state.stats.health = Math.min(100, (state.stats.health ?? 100) + 35);   // sleep heals
  state.timeMin += 240;
  notify('😴 Slept it off — energy & health restored');
  saveNow();
}
function openSafe() {
  openDialogue({
    name: 'Home Safe',
    text: `Cash: $${Math.floor(state.money).toLocaleString()}\nCars owned: ${state.ownedCars.length}\nJewelry owned: ${state.ownedJewelry.length}\nGear owned: ${state.ownedGear.length}\nGems found: ${state.gems || 0}\nChicken in bag: ${state.chicken}`,
    choices: [{ label: 'Close', onPick: () => {} }],
  });
}
function openWardrobe() {
  closeMenus();
  wardrobeResume = true;
  initCreator();
}

// ── EATING MINI-GAME (3D piece → bone) ─────────────────────────────────────────
let eating = false, eatPiece = null, eatMeat = null, eatBites = 0;
function startEating() {
  if (state.chicken <= 0) { notify('Buy chicken first ($8 at the counter).'); return; }
  state.chicken--;
  eating = true; eatBites = 4;
  eatPiece = new THREE.Group();
  const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8),
    new THREE.MeshStandardMaterial({ color: '#f3ead2', roughness: 0.7 }));
  bone.rotation.z = Math.PI / 2.4; eatPiece.add(bone);
  [-0.22, 0.22].forEach(s => {
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6),
      new THREE.MeshStandardMaterial({ color: '#f3ead2', roughness: 0.7 }));
    knob.position.set(s * Math.cos(0.4), s * Math.sin(0.4), 0); eatPiece.add(knob);
  });
  eatMeat = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10),
    new THREE.MeshStandardMaterial({ color: '#8a5a2a', roughness: 0.6 }));
  eatMeat.scale.set(1.3, 1, 1); eatPiece.add(eatMeat);
  eatPiece.position.set(0.5, -0.35, -1.1);
  camera.add(eatPiece);
}
function updateEating() {
  // fail-safe: if the piece vanished for any reason, end cleanly (prevents a stuck busy state)
  if (!eatPiece) { eating = false; showPrompt(null); return; }
  showPrompt('Take a bite — ' + eatBites + ' left', 'click / E');
  eatPiece.rotation.y += 0.01;
  // accept either the E key OR a left click so the player is never stuck
  const bite = controls.consumePress('e') || firePressed;
  firePressed = false;
  if (bite) {
    eatBites--;
    const s = Math.max(0.01, eatBites / 4);
    eatMeat.scale.set(1.3 * s, s, s);
    if (eatBites <= 0) finishEating();
  }
}
function finishEating() {
  notify('🍗 Ate some chicken — hunger eased.');
  // One piece is a moderate top-up, not an instant full meter. Also restores a
  // little energy & fun so eating helps without trivialising the whole economy.
  state.stats.hunger = Math.min(100, state.stats.hunger + 24);
  state.stats.energy = Math.min(100, state.stats.energy + 6);
  state.stats.fun = Math.min(100, state.stats.fun + 4);
  // remove the piece immediately so the loop can never get wedged on a stale node
  if (eatPiece) { camera.remove(eatPiece); eatPiece = null; }
  eatMeat = null;
  eating = false;
  showPrompt(null);
  missionEvent('eat-done');
  saveNow();
}

// ── GENERIC TIMING MINI-GAME (mirror lineup, gym workout, study) ──────────────
// One reusable "stop the marker in the zone" game. Each caller supplies a title,
// number of rounds and an onFinish(hits, rounds) callback. The `hairGame` flag
// name is kept because the main loop + busy guard already gate on it.
let hairGame = false, hairState = null;
const mgEl = () => document.getElementById('minigame');
function startTimingGame({ title, hintVerb = 'SPACE', rounds = 3, speedBase = 2.0, speedStep = 0.7, onFinish, labels = null }) {
  hairGame = true;
  hairState = { round: 0, hits: 0, rounds, speedBase, speedStep, speed: speedBase,
    zoneStart: 38, zoneW: 22, t0: clock.elapsedTime, onFinish, hintVerb, labels };
  newTimingRound();
  document.getElementById('mg-title').textContent = title;
  const lbl = labels ? `<b>${labels[0]}</b> — ` : '';
  document.getElementById('mg-hint').innerHTML = `${lbl}press <b>${hintVerb}</b> in the green zone (1/${rounds})`;
  mgEl().style.display = 'flex';
}
function newTimingRound() {
  hairState.zoneW = 24 - hairState.round * 4;
  hairState.zoneStart = 20 + Math.random() * (70 - hairState.zoneW);
  hairState.speed = hairState.speedBase + hairState.round * hairState.speedStep;
  const zone = document.getElementById('mg-zone');
  zone.style.left = hairState.zoneStart + '%';
  zone.style.width = hairState.zoneW + '%';
}
function updateHairline() {
  const t = clock.elapsedTime - hairState.t0;
  const pos = (0.5 + 0.5 * Math.sin(t * hairState.speed)) * 100;
  document.getElementById('mg-marker').style.left = pos + '%';
  if (controls.consumePress(' ')) {
    const hit = pos >= hairState.zoneStart && pos <= hairState.zoneStart + hairState.zoneW;
    if (hit) hairState.hits++;
    hairState.round++;
    if (hairState.round >= hairState.rounds) finishTimingGame();
    else {
      newTimingRound();
      const lbls = hairState.labels;
      const lbl = lbls ? `<b>${lbls[hairState.round] || lbls[lbls.length - 1]}</b> — ` : '';
      document.getElementById('mg-hint').innerHTML =
        `${hit ? '✅' : '❌'} ${lbl}press <b>${hairState.hintVerb}</b> (${hairState.round + 1}/${hairState.rounds})`;
    }
  }
}
function finishTimingGame() {
  hairGame = false; mgEl().style.display = 'none';
  const fn = hairState && hairState.onFinish;
  const hits = hairState ? hairState.hits : 0;
  const rounds = hairState ? hairState.rounds : 0;
  showPrompt(null);
  if (fn) fn(hits, rounds);
  saveNow();
}

// Mirror lineup — style + hygiene.
function startHairline() {
  startTimingGame({
    title: '💈 Lineup — line up the fade', rounds: 3,
    onFinish: (hits) => {
      if (hits >= 2) {
        state.freshCut = true;
        state.stats.fun = Math.min(100, state.stats.fun + 12);
        state.stats.hygiene = 100;
        notify(`💈 Fresh lineup! ${hits}/3 clean — looking sharp`);
        missionEvent('haircut-done');
      } else {
        notify(`✂️ Rough cut (${hits}/3). Try again for a fresh lineup.`);
      }
    },
  });
}

// Gym workout — raises FITNESS, costs energy + time. Each equipment piece maps
// to a `kind` with its own effort/effect profile (strength builds the most
// fitness; cardio drains more energy + hygiene but adds fun; mobility is light).
const WORKOUT_KINDS = {
  strength:   { title: '🏋️ Strength Set', rounds: 4, speedBase: 2.4, fit: [5, 4], energy: 22, hygiene: 14, fun: 3, time: 90, minEnergy: 15 },
  cardio:     { title: '🏃 Cardio',       rounds: 5, speedBase: 2.8, fit: [3, 4], energy: 26, hygiene: 18, fun: 6, time: 75, minEnergy: 15 },
  resistance: { title: '💪 Machines',     rounds: 4, speedBase: 2.5, fit: [4, 4], energy: 20, hygiene: 12, fun: 3, time: 80, minEnergy: 15 },
  mobility:   { title: '🧘 Mobility',     rounds: 3, speedBase: 1.8, fit: [2, 3], energy: 8,  hygiene: 6,  fun: 8, time: 45, minEnergy: 5 },
};
function startWorkoutAt(equip) {
  const kind = (equip && WORKOUT_KINDS[equip.kind]) || WORKOUT_KINDS.strength;
  if (state.stats.energy < kind.minEnergy) { notify('Too gassed to train — rest or eat first.'); return; }
  const name = (equip && equip.label) ? equip.label : 'Workout';
  startTimingGame({
    title: `${kind.title} — ${name}: hit your reps in the zone`,
    rounds: kind.rounds, speedBase: kind.speedBase,
    onFinish: (hits, rounds) => {
      const gain = kind.fit[0] + hits * kind.fit[1];
      state.stats.fitness = Math.min(100, state.stats.fitness + gain);
      state.stats.energy = Math.max(0, state.stats.energy - kind.energy);
      state.stats.hygiene = Math.max(0, state.stats.hygiene - kind.hygiene);
      state.stats.fun = Math.min(100, state.stats.fun + kind.fun);
      state.timeMin += kind.time;
      notify(`💪 ${name} (${hits}/${rounds})! Fitness +${gain}`);
      missionEvent('workout-done');
    },
  });
}
// No-arg entry kept for the trainer dialogue (defaults to a strength session).
function startWorkout() { startWorkoutAt(null); }

// School study — raises SMARTS, costs energy + time.
function startStudy() {
  if (state.stats.energy < 10) { notify('Too tired to focus — get some rest.'); return; }
  startTimingGame({
    title: '📚 Study — lock in when it’s highlighted', rounds: 4, speedBase: 2.2,
    onFinish: (hits, rounds) => {
      const gain = 4 + hits * 4;                    // up to +20 smarts
      state.stats.smarts = Math.min(100, state.stats.smarts + gain);
      state.stats.energy = Math.max(0, state.stats.energy - 14);
      state.stats.fun = Math.max(0, state.stats.fun - 4);
      state.timeMin += 120;
      notify(`🧠 Studied up (${hits}/${rounds})! Smarts +${gain}`);
      missionEvent('study-done');
    },
  });
}

// Office job shift — task loop; pay scaled by performance AND smarts.
function doJobShift() {
  if (state.stats.energy < 20) { notify('No energy for a shift — rest first.'); return; }
  const smartBonus = Math.round((state.stats.smarts / 100) * 80);   // smarter → better base pay
  runWorkShift({
    title: '💼 Office Shift', jobName: 'WorkTower Associate', basePay: 70 + smartBonus, energyCost: 28,
    tasks: ['Boot computer', 'File paperwork', 'Answer email', 'Deliver folder', 'Update checklist'],
    onPaid: (g) => {
      state.stats.smarts = Math.min(100, state.stats.smarts + (g.mult >= 1.15 ? 3 : 1));
      state.stats.fun = Math.max(0, state.stats.fun - 4);
    },
  });
}
// Garage shift — task loop; builds a little fitness from the labor.
function doGarageShift() {
  runWorkShift({
    title: '🔧 Garage Shift', jobName: 'Garage Hand', basePay: 75, energyCost: 26,
    tasks: ['Grab the tools', 'Clean the spill', 'Inspect car', 'Tighten the part', 'Park in bay'],
    onPaid: (g) => { state.stats.fitness = Math.min(100, state.stats.fitness + (g.mult >= 1.15 ? 2 : 1)); },
  });
}

// Garage repair — fixes the active/driven car's damage for a fee.
function repairVehicle() {
  const v = drivingVehicle || car;
  const dmg = Math.floor(v?.damage || state.carDamage || 0);
  if (dmg <= 0) { notify('🔧 Your ride is already clean — no repairs needed.'); return; }
  const cost = 60 + dmg * 6;
  openDialogue({
    name: 'City Garage', text: `Your whip is at ${dmg}% damage. Full repair runs $${cost.toLocaleString()}.`,
    choices: [
      (state.money >= cost
        ? { label: `Repair for $${cost.toLocaleString()}`, onPick: () => {
            state.money -= cost;
            if (v) v.damage = 0;
            if (car) car.damage = 0;
            state.carDamage = 0;
            if (v) { v._totaledWarned = false; applyCarDamageVisual(v); }
            if (car && car !== v) applyCarDamageVisual(car);
            notify('🔧 Good as new — dents knocked out.');
            saveNow();
          } }
        : { label: `Need $${(cost - Math.floor(state.money)).toLocaleString()} more`, onPick: () => 'keep' }),
      { label: 'Not now', onPick: () => {} },
    ],
  });
}

// ── progression / time ─────────────────────────────────────────────────────────
let decayAccum = 0, saveAccum = 0, vibeAccum = 0;
function updateProgression(dt) {
  state.timeMin += dt * 0.6;
  if (state.timeMin >= 1440) { state.timeMin -= 1440; state.day++; }
  decayAccum += dt;
  if (decayAccum > 3) {
    decayAccum = 0;
    state.stats.hunger = Math.max(0, state.stats.hunger - 1);
    state.stats.energy = Math.max(0, state.stats.energy - 0.5);
    state.stats.hygiene = Math.max(0, state.stats.hygiene - 0.4);
    state.stats.fun = Math.max(0, state.stats.fun - 0.5);
  }
  if (state.wanted > 0) state.heat = Math.max(0, state.heat - dt * 0.1);
  vibeAccum += dt; if (vibeAccum > 6) { vibeAccum = 0; applyVibe(); }
  saveAccum += dt; if (saveAccum > 12) { saveAccum = 0; saveNow(); }
  // litter respawns roughly every 30 minutes so the cleanup job never runs dry
  trashRespawnAccum += dt;
  if (trashRespawnAccum >= 1800) { trashRespawnAccum = 0; respawnTrash(); }
}

// ── graphics settings application ──────────────────────────────────────────────
function rebuildDensity() {
  if (!started || area !== 'city') return;
  const targetN = Math.max(8, Math.round(22 * graphics.npcDensity));
  const targetT = Math.max(3, Math.round(10 * graphics.trafficDensity));
  let changed = false;
  if (cityNPCs.length !== targetN) {
    cityNPCs.forEach(n => scene.remove(n.av.group));
    cityNPCs = createCityNPCs(scene, targetN);
    changed = true;
  }
  if (traffic.length !== targetT) {
    traffic.forEach(c => scene.remove(c.g));
    traffic = createTraffic(scene, targetT);
    // re-skin the rebuilt traffic with kit cars (preload is cached, so sync)
    traffic.forEach((c, i) => swapVehicleVisual(c, TRAFFIC_FLEET[i % TRAFFIC_FLEET.length]));
    changed = true;
  }
  if (changed) registerInteractables(cityEntrances);
}

function applyGraphics() {
  graphics.applyToRenderer(renderer);
  graphics.applyToSun(sun);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  if (started) {
    graphics.applyToScene(scene, renderer);
    rebuildDensity();
  }
  applyVibe();   // refresh fog range / camera far / environment
}
graphics.onChange(applyGraphics);

function applyVibe() {
  const t = state.timeMin;
  const night = t < 6 * 60 || t > 19 * 60 || state.server === 'midnight';

  // sun elevation from time of day: lowest at midnight, highest at noon
  let elevDeg, aziDeg;
  if (state.server === 'midnight') { elevDeg = -40; aziDeg = 200; }
  else {
    elevDeg = -Math.cos((t / 1440) * Math.PI * 2) * 62;   // +62° noon, -62° midnight
    aziDeg = 90 + (t / 1440) * 360;                       // sun sweeps across the day
  }
  const phi = THREE.MathUtils.degToRad(90 - elevDeg);
  const theta = THREE.MathUtils.degToRad(aziDeg);
  sunSph.set(1, phi, theta);
  const sunDir = new THREE.Vector3().setFromSpherical(sunSph);
  skyU.sunPosition.value.copy(sunDir);

  // directional light follows the sun
  sun.position.copy(sunDir).multiplyScalar(120);
  sun.target.position.set(0, 0, 0);

  const above = Math.max(0, elevDeg) / 60;              // 0 at horizon → 1 high noon
  if (state.server === 'midnight') {
    skyU.rayleigh.value = 0.5; skyU.turbidity.value = 2; skyU.mieCoefficient.value = 0.004;
    sun.intensity = 0.15; sun.color.set('#9fb0ff');
    hemi.intensity = 0.25; hemi.color.set('#2a3a66'); ambient.intensity = 0.22;
    renderer.toneMappingExposure = 0.6;
    scene.fog = new THREE.Fog('#0a0f24', 45, 165);
  } else if (night) {
    skyU.rayleigh.value = 1.0; skyU.turbidity.value = 4; skyU.mieCoefficient.value = 0.005;
    sun.intensity = 0.5; sun.color.set('#ffd9b0');
    hemi.intensity = 0.35; hemi.color.set('#3a4a7a'); ambient.intensity = 0.2;
    renderer.toneMappingExposure = 0.78;
    scene.fog = new THREE.Fog('#243056', 50, 175);
  } else if (state.server === 'lowkey') {
    skyU.rayleigh.value = 3.2; skyU.turbidity.value = 9; skyU.mieCoefficient.value = 0.01;
    sun.intensity = 1.4 + above * 1.2; sun.color.set('#ffcaa0');
    hemi.intensity = 0.45; hemi.color.set('#9fb6c9'); ambient.intensity = 0.18;
    renderer.toneMappingExposure = 1.0;
    scene.fog = new THREE.Fog('#b9c4cf', 60, 195);
  } else {
    skyU.rayleigh.value = 1.8; skyU.turbidity.value = 6; skyU.mieCoefficient.value = 0.006;
    sun.intensity = 1.8 + above * 1.4; sun.color.set('#fff4e2');
    hemi.intensity = 0.45 + above * 0.2; hemi.color.set('#bcd8ff'); ambient.intensity = 0.18;
    renderer.toneMappingExposure = 1.05;
    scene.fog = new THREE.Fog('#aaccf0', 75, 220);
  }
  // scale fog + camera far plane to the chosen view-distance / quality
  if (scene.fog) {
    const r = graphics.fogRange(scene.fog.near, scene.fog.far);
    scene.fog.near = r.near;
    scene.fog.far = Math.min(r.far, graphics.viewDistance);
  }
  if (camera.far !== graphics.viewDistance) {
    camera.far = graphics.viewDistance;
    camera.updateProjectionMatrix();
  }
  updateEnvironment();
}

function saveNow() {
  if (!player) return;
  if (area === 'city') {
    state.pos.x = player.group.position.x;
    state.pos.z = player.group.position.z;
  } else {
    state.pos.x = returnPos.x; state.pos.z = returnPos.z;
  }
  state.facing = player.group.rotation.y;
  saveState(state);
}

function lerpAngle(a, b, f) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * f;
}
// True when the player should hold a combat stance facing the crosshair: a gun is
// out, or a melee swing is mid-arc. Drives body/weapon rotation toward the aim
// direction so shots and swings agree with the reticle.
function combatFacingNow(fp) {
  if (fp || inCar || !player) return false;
  if (meleeSwingT > 0) return true;
  const cw = currentWeapon();
  return !!(cw && !cw.melee && area === 'city');
}
// True when the active shot ray (the cursor ray, or the scope reticle) passes
// through a weapon target within range — used to flash the reticle red as a
// hit-confirm cue under the cursor.
const _aimToTg = new THREE.Vector3();
function aimRayOnTarget() {
  const cw = currentWeapon();
  if (!cw || cw.melee || inCar) return false;
  const ray = shootRay();
  const range = cw.range || 80;
  const targets = getWeaponTargets();
  for (const tg of targets) {
    _aimToTg.copy(tg.pos).sub(ray.origin);
    const along = _aimToTg.dot(ray.dir);
    if (along < 0 || along > range) continue;
    // perpendicular distance from the ray to the target centre
    const perp2 = _aimToTg.lengthSq() - along * along;
    const r = (tg.r || 1.0) + 0.4;
    if (perp2 <= r * r) return true;
  }
  return false;
}
function locationLabel() {
  if (inCar) return '🚗 Driving';
  if (area !== 'city') return interiors.byId[area].name;
  return (SERVERS.find(s => s.id === state.server)?.name || 'City') + ' — City';
}

// ── interaction dispatch each frame ────────────────────────────────────────────
function handleInteraction(clicked = false) {
  if (inCar) {
    // refuel at a gas-station forecourt when stopped (E), else show exit prompt (F)
    const v = drivingVehicle || car;
    const pump = nearestRefuel(v.g.position);
    if (pump && Math.abs(v.speed || 0) < 1.5 && (v.fuel ?? 100) < 99.5) {
      const cost = refuelCost(v);
      showPrompt(`Refuel  ($${cost})`, 'e');
      if (controls.consumePress('e')) refuelVehicle(v);
      return;
    }
    showPrompt('Exit vehicle', 'f');
    if (controls.consumePress('f')) exitCar();
    return;
  }
  const near = manager.findNearest(player.group.position, area);
  if (near) {
    showPrompt(near.getPrompt(), near.key);
    // E (or a left-click while unarmed) activates the nearest interactable.
    if (controls.consumePress(near.key) || clicked) near.onInteract();
  } else {
    showPrompt(null);
  }
}

// ── MONSTER MODE ────────────────────────────────────────────────────────────────
// Toggling Monster Mode spawns a visible pack of creatures around the player
// that chase you and can be shot. Toggling off despawns them. The HUD badge
// reflects the current state.
function toggleMonsterMode() {
  state.monsterMode = !state.monsterMode;
  const badge = document.getElementById('monster-badge');
  if (state.monsterMode) {
    if (area !== 'city' || !player) {
      state.monsterMode = false;
      notify('Monster Mode needs the open city');
      return;
    }
    monsters = spawnMonsters(scene, player.group.position, 5, renderer);
    debug.set('monsterCount', monsters.length);
    if (badge) badge.style.display = '';
    notify('👹 MONSTER MODE — ' + monsters.length + ' incoming! Shoot to survive.');
  } else {
    clearMonsters(scene, monsters);
    debug.set('monsterCount', 0);
    if (badge) badge.style.display = 'none';
    notify('Monster Mode off');
    if (state.playerMonster) transformPlayer();   // revert player form when mode ends
  }
}

// Player monster form (basic, stable procedural transform). While Monster Mode is
// active, press T to sprout horns, tint dark, grow slightly and move faster. Press
// again (or end Monster Mode) to revert. Uploaded monster skins come later, after
// bounds checks — this procedural form is the stable first pass the spec asked for.
let playerMonsterFx = null;
function transformPlayer() {
  if (!player) return;
  if (!state.monsterMode && !state.playerMonster) {
    notify('Turn on Monster Mode (M) before you can transform.');
    return;
  }
  state.playerMonster = !state.playerMonster;
  const formBadge = document.getElementById('monster-form-badge');
  if (state.playerMonster) {
    const grp = new THREE.Group(); grp.name = 'player-monster-fx';
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xeae6dc, roughness: 0.4, metalness: 0.2 });
    const eh = (player.eyeHeight || 1.6);
    for (const sx of [-0.15, 0.15]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.34, 7), hornMat);
      horn.position.set(sx, eh + 0.28, 0.02); horn.rotation.z = sx > 0 ? -0.5 : 0.5; horn.rotation.x = -0.2;
      grp.add(horn);
    }
    // dark aura tint (remember originals so we can fully restore)
    player.group.traverse(o => {
      if (o.isMesh && o.material && o.material.emissive) {
        if (!o.userData._fxStash) o.userData._fxStash = { c: o.material.emissive.clone(), i: o.material.emissiveIntensity };
        o.material.emissive.setHex(0x3a006a); o.material.emissiveIntensity = 0.55;
      }
    });
    player.group.add(grp);
    playerMonsterFx = grp;
    player.group.scale.setScalar(1.18);
    if (formBadge) formBadge.style.display = '';
    notify('😈 MONSTER FORM — faster sprint, stronger melee, and nearby people flee in terror! (T to revert)');
  } else {
    if (playerMonsterFx) { player.group.remove(playerMonsterFx); playerMonsterFx = null; }
    player.group.traverse(o => {
      if (o.isMesh && o.material && o.userData._fxStash) {
        o.material.emissive.copy(o.userData._fxStash.c);
        o.material.emissiveIntensity = o.userData._fxStash.i;
        delete o.userData._fxStash;
      }
    });
    player.group.scale.setScalar(1);
    if (formBadge) formBadge.style.display = 'none';
    notify('🙂 Back to human form.');
  }
}

// Move the player to a named landmark / interior (debug teleport buttons).
function teleportTo(which) {
  if (!player) return;
  if (inCar) exitCar();
  const goCity = (x, z) => {
    area = 'city';
    if (interiors) interiors.group.visible = false;
    controls.bounds = null;
    player.group.visible = true;
    player.group.position.set(x, 0, z);
    returnPos.set(x, 0, z);
    controls.snapTo(player.group.position, player.eyeHeight);
  };
  if (which === 'gas') {
    const p = refuelPoints[0];
    if (p) { goCity(p.x, p.z + (p.r || 7) + 2); notify('Teleported to the gas station ⛽'); }
    else { const lm = LANDMARKS.find(l => l.id === 'garage') || LANDMARKS[0]; goCity(lm.x, lm.z + 6); notify('Gas forecourt not placed — moved near garage'); }
    return;
  }
  if (which === 'diner') {
    const lm = LANDMARKS.find(l => l.id === 'chicken') || LANDMARKS[0];
    goCity(lm.x, lm.z + 6); notify('Teleported toward the diner / chicken spot 🍔');
    return;
  }
  if (which === 'home' || which === 'chicken') {
    enterInterior(which);
    notify('Teleported into ' + which + ' interior');
    return;
  }
}

// ── global hotkeys ─────────────────────────────────────────────────────────────
window.addEventListener('keydown', e => {
  const kc = e.key.toLowerCase();
  // debug panel toggle works at all times (even with a menu open)
  if (e.key === 'F2' || kc === 'f2') { debugBadge && debugBadge.toggle(); e.preventDefault(); return; }
  // record EVERY key + whether the guard will block it (and why) so the debug
  // panel can prove if a stuck UI state is swallowing N/C/I/M.
  const blockReason = (mode !== 'play') ? 'mode=' + mode
    : isUIOpen() ? 'uiOpen'
    : isSettingsOpen() ? 'settings'
    : eating ? 'eating'
    : hairGame ? 'hairGame' : '';
  debug.logKey(blockReason ? `${kc} ✕(${blockReason})` : kc);
  if (blockReason) return;
  const k = kc;
  // dev grip tuning (highest priority so its nudge keys aren't eaten by other
  // single-key handlers). P toggles the overlay; while on, nudge the held weapon.
  if (k === 'p') { toggleGripDebug(); return; }
  if (gripDebug && !inCar) {
    const S = 0.01, R = Math.PI / 90;            // 1cm / 2° steps
    if (k === 'i') { nudgeGrip([0, 0, -S]); return; }
    if (k === 'k') { nudgeGrip([0, 0, S]); return; }
    if (k === 'j') { nudgeGrip([-S, 0, 0]); return; }
    if (k === 'l') { nudgeGrip([S, 0, 0]); return; }
    if (k === 'u') { nudgeGrip([0, S, 0]); return; }
    if (k === 'o') { nudgeGrip([0, -S, 0]); return; }
    if (k === '[') { nudgeGrip([0, 0, 0], [-R, 0, 0]); return; }
    if (k === ']') { nudgeGrip([0, 0, 0], [R, 0, 0]); return; }
    if (k === ';') { nudgeGrip([0, 0, 0], [0, -R, 0]); return; }
    if (k === "'") { nudgeGrip([0, 0, 0], [0, R, 0]); return; }
    if (k === '-') { nudgeGrip([0, 0, 0], [0, 0, 0], -0.02); return; }
    if (k === '=') { nudgeGrip([0, 0, 0], [0, 0, 0], 0.02); return; }
    if (k === 'backspace') { resetGrip(); return; }
  }
  // robbery: shake down the nearest civilian for cash (risky — draws heat)
  if (k === 'g' && !inCar && area === 'city') robNearestNpc();
  if (k === 'v') {
    const m = controls.cycleMode();
    const label = m === CAM.FIRST ? 'First-person' : m === CAM.OVERHEAD ? 'Overhead' : 'Third-person';
    notify('📷 Camera: ' + label);
  }
  if (k === 'c' && !inCar && area === 'city') { debug.markHandler('c'); openWardrobe(); }
  if (k === 'i') { debug.markHandler('i'); openInventory(); }   // 🎒 inventory — re-equip / holster weapons
  if (k === '`') toggleInteriorDebug();           // dev: interior debug overlay
  if (k === 'h') toggleHairDebug();
  if (hairDebug) {
    if (k === ']') cycleHair(1);
    if (k === '[') cycleHair(-1);
    if (k === 'j') cycleJewelry();
  }
  if (k === 'm') { debug.markHandler('m'); toggleMonsterMode(); }
  if (k === 't' && !inCar && area === 'city') transformPlayer();   // 😈 monster-form toggle
  if (k === 'n') {
    debug.markHandler('n');
    if (minimap) {
      minimap.toggleExpand();
      const ex = minimap.isExpanded();
      notify(ex ? '🗺️ Town map opened (N to close)' : 'Map minimised');
      console.debug('[map] toggled →', ex ? 'expanded' : 'compact');
    }
    else { notify('Minimap not initialised'); console.warn('[map] minimap is null'); }
  }   // expand / shrink the town map
  // weapons: reload, quick-switch, and 1–9 to equip from your OWNED list (a held
  // gun is never lost — press its number or open the inventory to draw it again).
  if (k === 'r') reloadPressed = true;
  if (k === 'q') cycleWeapon(-1);
  if (k === 'x') cycleWeapon(1);
  if (k >= '1' && k <= '9') {
    const owned = state.ownedWeapons || ['fists'];
    const w = owned[parseInt(k, 10) - 1];
    if (w) equipWeapon(w);
  }
});

onMenuClose(() => { builderOpen = false; });

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ── main loop ──────────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;
  settingsTickFPS();

  if (mode === 'creator') {
    renderPreview(creatorPV, creatorAvatar, document.getElementById('creator-canvas-wrap'));
    controls.endFrame();
    revealOnce();
    return;
  }
  if (builderOpen) {
    renderPreview(builderPV, builderAvatar, document.getElementById('builder-canvas-wrap'));
    // keep main scene ticking lightly behind (not strictly needed)
    controls.endFrame();
    return;
  }

  // play mode
  updateCityNPCs(cityNPCs, dt, t);
  // braking obstacles: other traffic + the player + the parked drivable car
  const trafficObstacles = [];
  for (const c of traffic) trafficObstacles.push(c.g.position);
  if (player && !inCar && area === 'city') trafficObstacles.push(player.group.position);
  if (car && !inCar) trafficObstacles.push(car.g.position);
  if (trafficControl) trafficControl.update(dt);
  updateTraffic(traffic, dt, trafficObstacles, trafficControl);
  updateMixers(dt);                                  // skinned GLB animations
  for (const g of extraSpinners) g.rotation.y += dt * 0.8;   // idle-spin display models
  // spin any dealership car flagged for preview
  if (interiors) Object.values(interiors.byId).forEach(intr => intr.stations.forEach(st => { if (st.mesh && st.mesh.userData.spin) st.mesh.rotation.y += 0.02; }));

  const busy = isUIOpen() || isSettingsOpen() || eating || hairGame;
  // collectible gems: always bob/twinkle; only collectible while on foot in the city
  if (cityGems.length) {
    const pp = (!busy && !inCar && area === 'city' && player) ? player.group.position : null;
    updateCityGems(dt, t, pp);
  }
  if (!busy) {
    if (inCar) updateCar(dt); else updatePlayer(dt, t);
    updateVehicleCollisions(dt);
    updateNpcHealthBars(dt);
    // BARE-FISTS left-click = interact / pick up the nearest object (trash etc.).
    // Captured BEFORE the weapon system so a pickup-click doesn't also punch.
    // IMPORTANT: this only applies to FISTS. A real melee weapon (bat / pipe /
    // wrench / plank) must SWING on left-click, never be consumed as an interact —
    // otherwise equipped melee weapons feel broken. Use the E key to interact
    // while a melee weapon is out.
    let interactClick = false;
    if (!inCar && player && currentWeapon().id === 'fists' && firePressed) {
      const nearNow = manager.findNearest(player.group.position, area);
      if (nearNow) interactClick = true;
    }
    if (!inCar) updateWeapons(dt, { fireHeld, firePressed: firePressed && !interactClick, reloadPressed });
    firePressed = false; reloadPressed = false;
    updatePolice(dt);
    updateEjectedPeople(dt, t);
    if (state.monsterMode && monsters.length) {
      updateMonsters(monsters, dt, t, player && player.group.position, {
        damagePlayer: (dmg) => {
          if (playerHitCD > 0) return;
          playerHitCD = 0.6;
          const st = state.stats;
          st.health = Math.max(0, (st.health ?? 100) - dmg);
          injuredTimer = Math.max(injuredTimer, 0.5);
          notify('👹 A monster hit you! (-' + dmg + ' health)');
          if (st.health <= 0) downPlayer('A monster took you down.');
        },
        // monsters home in on the nearest standing civilian to terrorize them
        nearestNpc: (pos, maxR) => {
          let best = null, bd = maxR;
          for (const n of cityNPCs) {
            if (n.downed) continue;
            const gp = n.av.group.position;
            const d = Math.hypot(gp.x - pos.x, gp.z - pos.z);
            if (d < bd) { bd = d; best = { x: gp.x, z: gp.z }; }
          }
          return best;
        },
        // scare civilians next to a monster → they panic and flee
        terrorize: (pos, radius) => {
          let any = false;
          for (const n of cityNPCs) {
            if (n.downed) continue;
            const gp = n.av.group.position;
            if (Math.hypot(gp.x - pos.x, gp.z - pos.z) <= radius) {
              n.panic = Math.max(n.panic || 0, 2.4); any = true;
            }
          }
          return any;
        },
      });
    }
    handleInteraction(interactClick);
    updateProgression(dt);
  } else {
    // keep camera framing the player while a menu/minigame is open
    if (!inCar && player) controls.update(player.group.position, player.eyeHeight, dt);
    updateNpcHealthBars(dt);
    reloadPressed = false;
    // NOTE: do NOT clear firePressed here — the eating loop consumes a click as a "bite".
    if (!eating) firePressed = false;
  }

  if (eating) updateEating();
  if (hairGame) updateHairline();

  updateHUD(state, locationLabel());
  // car HUD (speed / fuel / damage) while driving
  if (inCar) {
    const v = drivingVehicle || car;
    updateCarHUD({ visible: true, speed: Math.abs(v.speed || 0) * 4, fuel: v.fuel ?? 100, damage: v.damage || 0 });
  } else {
    updateCarHUD({ visible: false });
  }
  // minimap / radar — only in the open city
  if (minimap) {
    const mm = document.getElementById('minimap');
    if (area === 'city' && player) {
      // NOTE: must set an explicit 'block' — clearing to '' would fall back to the
      // stylesheet rule (#minimap{display:none}) and the radar would never show.
      if (mm && mm.style.display !== 'block') mm.style.display = 'block';
      let heading;
      if (inCar) heading = (drivingVehicle || car).g.rotation.y;
      else {
        const fwd = new THREE.Vector3().subVectors(player.group.position, camera.position);
        heading = Math.atan2(fwd.x, fwd.z);
      }
      const ppos = (inCar ? (drivingVehicle || car).g.position : player.group.position);
      minimap.draw(
        { x: ppos.x, z: ppos.z }, heading,
        traffic.map(c => ({ x: c.g.position.x, z: c.g.position.z })),
        cityNPCs.filter(n => !n.downed).map(n => ({ x: n.av.group.position.x, z: n.av.group.position.z })),
      );
    } else if (mm) {
      mm.style.display = 'none';
    }
  }
  // ── reticle + cursor aim + scope (scoped weapons only) ─────────────────────
  const cw = currentWeapon();
  const xh = document.getElementById('crosshair');
  const scopeEl = document.getElementById('scope');
  const armed = cw && !cw.melee && !inCar && area === 'city';
  // The first-person view model duplicates the in-hand weapon — only show it in
  // first-person so third-person doesn't render a second gun floating in-frame.
  setFirstPersonView(controls.mode === CAM.FIRST);
  // Normal guns aim with the cursor and ignore right-click. Only scoped weapons
  // (sniper / precision) use right-click to zoom + drop the scope overlay.
  const canScope = armed && weaponSupportsScope(cw);
  const scoping = canScope && controls.mouseHeld(2);
  // Tell the player once when they right-click a gun that has no scope.
  if (armed && !canScope && controls.consumeClick(2)) notify('🔭 No scope on this weapon — aim with the cursor.');
  // Light over-the-shoulder offset so the body isn't dead-centre; tighter while
  // scoped (centre reticle). Cursor guns keep a gentle offset.
  controls.shoulder = armed ? (scoping ? 1.05 : 0.6) : 0;
  const targetFov = scoping ? 20 : 60;
  if (Math.abs(camera.fov - targetFov) > 0.3) {
    camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 12);
    camera.updateProjectionMatrix();
  }
  if (xh) {
    if (armed) {
      xh.style.display = 'block';
      if (scoping) {
        // scope mode: reticle locked to screen centre
        xh.style.left = '50%'; xh.style.top = '50%';
        xh.classList.add('aim');
      } else {
        // normal guns: the crosshair rides the cursor (the cursor IS the aim)
        xh.style.left = _mousePx.x + 'px'; xh.style.top = _mousePx.y + 'px';
        xh.classList.remove('aim');
      }
      // Reticle turns red when the shot ray is on a target, so the player gets
      // clear feedback a shot will connect where the cursor points.
      xh.classList.toggle('lock', aimRayOnTarget());
    }
    else {
      xh.style.display = 'none';
      xh.classList.remove('aim'); xh.classList.remove('lock');
      xh.style.left = '50%'; xh.style.top = '50%';
    }
  }
  if (scopeEl) scopeEl.style.display = scoping ? 'block' : 'none';
  if (interiorDebug) updateInteriorDebug();
  if (gripDebug) updateGripDebug();
  renderer.render(scene, camera);
  controls.endFrame();
  revealOnce();

  // feed the debug panel live runtime values (cheap; the panel throttles redraw)
  if (debugBadge) {
    const mmEl = document.getElementById('minimap');
    debug.update({
      mode, area, inCar,
      playerExists: !!player,
      minimapCanvas: !!mmEl,
      minimapVisible: !!(mmEl && mmEl.style.display !== 'none' && area === 'city'),
      uiOpen: isUIOpen(), settingsOpen: isSettingsOpen(), eating, hairGame, builderOpen,
      inventoryCount: (state.ownedWeapons || ['fists']).length,
      weapon: cw ? (cw.name || cw.id) : '—',
      monsterMode: !!state.monsterMode,
      monsterCount: monsters.filter(m => !m.dead).length,
      policeCount: policeUnits.length + policeCars.length,
    });
  }
}

// Hide the loading screen once the first real frame has been drawn.
let _revealed = false;
function revealOnce() {
  if (_revealed) return;
  _revealed = true;
  hideLoadingScreen();
}

// ── boot ──────────────────────────────────────────────────────────────────────
initSettingsMenu({
  onOpen: () => { document.exitPointerLock?.(); },
  onClose: () => { /* gameplay resumes automatically via busy flag */ },
});
setProgress(45, 'Preparing character creator…');
initCreator();
animate();

// ── build/version proof + debug panel ─────────────────────────────────────────
// Shows the exact deployed commit in-game so a stale cache is obvious, and
// reports live integration state. The "Force update" button wipes every cache
// and hard-reloads (cuts through Cloudflare/browser caching during demos).
// Backup buttons (Map/Inventory/Wardrobe/Monster) + teleports work even if the
// keyboard handlers are somehow blocked.
debugBadge = initDebugBadge({
  onForceUpdate: async () => {
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        reg && reg.active && reg.active.postMessage({ type: 'CLEAR_CACHES' });
        const keys = await (window.caches ? caches.keys() : Promise.resolve([]));
        await Promise.all(keys.map((k) => caches.delete(k)));
        reg && (await reg.unregister());
      }
    } catch (e) { console.warn('[sw] force-update failed', e); }
    location.reload();
  },
  onMap: () => { if (minimap) minimap.toggleExpand(); else notify('Minimap not initialised'); },
  onInventory: () => openInventory(),
  onWardrobe: () => { if (area === 'city' && !inCar) openWardrobe(); else notify('Wardrobe: be on foot in the city'); },
  onMonster: () => toggleMonsterMode(),
  onTpGas: () => teleportTo('gas'),
  onTpDiner: () => teleportTo('diner'),
  onTpHome: () => teleportTo('home'),
  onTpChicken: () => teleportTo('chicken'),
});
window.ZW = window.ZW || {};
window.ZW.report = () => debug.report();
window.ZW.commit = debug.commit;

// Register the service worker for asset caching / offline replay (prod only).
// The ?v=<commit> query makes each deploy a distinct script URL so the browser
// always notices the update; we then auto-activate it and reload once.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = new URL('sw.js', document.baseURI);
    swUrl.searchParams.set('v', debug.commit);
    navigator.serviceWorker.register(swUrl.href).then((reg) => {
      // ask the active worker for its cache version (proof of which build it is)
      const ask = () => navigator.serviceWorker.controller
        && navigator.serviceWorker.controller.postMessage({ type: 'GET_VERSION' });
      ask();
      // when a new SW is found, activate it immediately
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            sw.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    }).catch(() => { /* caching is a progressive enhancement — ignore failures */ });

    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'SW_VERSION') debug.set('swVersion', e.data.version);
    });
    // a brand-new controller took over (new deploy) → reload once to use it
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return; reloaded = true; location.reload();
    });
  });
}

// ── lightweight debug / automation bridge (safe, read-mostly) ─────────────────
window.ZW = {
  state: () => state,
  area: () => area,
  inCar: () => inCar,
  uiOpen: () => isUIOpen(),
  busy: () => !!(eating || hairGame),
  mode: () => mode,
  hdri: () => !!hdriEnv,
  money: () => Math.floor(state.money),
  prompt: () => { const p = document.getElementById('prompt'); return p.style.display === 'none' ? null : p.textContent; },
  teleport: (x, z) => { if (player) player.group.position.set(x, 0, z); },
  yaw: (v) => { controls.yaw = v; },
  pitch: (v) => { controls.pitch = v; },
  dist: (v) => { controls.distance = v; },
  camMode: (m) => { controls.mode = m; },
  cam: () => ({ x: +camera.position.x.toFixed(2), y: +camera.position.y.toFixed(2), z: +camera.position.z.toFixed(2) }),
  ppos: () => (player ? { x: +player.group.position.x.toFixed(2), z: +player.group.position.z.toFixed(2) } : null),
  press: (k) => { controls.justPressed.add(String(k).toLowerCase()); },
  carPos: () => ({ x: car.g.position.x, z: car.g.position.z }),
  entranceList: () => Object.entries(entranceMap).map(([id, e]) => ({ id, x: e.doorPos.x, z: e.doorPos.z })),
  stationList: () => (area === 'city' ? [] : interiors.byId[area].stations.map(s => ({ id: s.id, label: s.label, x: s.pos.x, z: s.pos.z }))),
  exitPos: () => (area === 'city' ? null : { x: interiors.byId[area].exit.x, z: interiors.byId[area].exit.z }),
  npcList: () => (area === 'city'
    ? cityNPCs.map(n => ({ name: n.name, x: n.av.group.position.x, z: n.av.group.position.z }))
    : interiors.byId[area].npcs.map(n => ({ name: n.name, x: n.pos.x, z: n.pos.z }))),
};
