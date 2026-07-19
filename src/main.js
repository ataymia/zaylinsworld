Warning: truncated output (original token count: 54774)
Total output lines: 4537

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
import { productionWorldRelocationIds } from './runtime/ProductionWorldBridge.js';
import { functionalLocationRelocation } from './runtime/FunctionalLocationRelocation.js';
import { worldRegistry } from './runtime/WorldRegistry.js';
import { LARGE_TOWN_TRAFFIC_ROUTES } from './config/starterTownTrafficRoutes.js';
import { starterVehicleSpawnNear } from './config/starterVehicleSpawn.js';
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
  USE_REAL_PLAYER_SKIN: true,    // attach PSX GLB skin to the player (validated + procedural fallback)
  USE_REAL_NPC_SKINS: true,      // attach PSX GLB skins to city NPCs (validated + procedural fallback)
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
let cityLandmarks = LANDMARKS;    // resolved compact/production positions for teleports and runtime lookups
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
let abandonedCars = [];        // cars the player stole then stepped out of (re-enterable)
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
let homeMailbox = null;          // relocated Willowbend mailbox interaction anchor
let safeRespawn = { x: 9, z: 9 };
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
    const freshLargeWorldArrival = !state.createdCharacter && !hasSave();
    setStatus('Building the city…');
    const relocatedLocationIds = productionWorldRelocationIds();
    const largeWorldActive = relocatedLocationIds.length > 0;
    const cityInfo = buildCity(scene, { relocatedLocationIds });
    cityEntrances = cityInfo.entrances;
    cityLandmarks = cityInfo.landmarks;
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
    traffic = createTraffic(
      scene,
      Math.max(3, Math.round(10 * graphics.trafficDensity)),
      largeWorldActive ? LARGE_TOWN_TRAFFIC_ROUTES : undefined,
    );
    abandonedCars = [];                       // fresh city → no previously-stolen parked cars
    car = createDrivableCar(scene, 13, 3);
    registerInteractables(cityInfo.entrances);
    graphics.applyToScene(scene, renderer);   // reflections + texture filtering
    started = true;
    minimap = initMinimap({
      landmarks: cityInfo.landmarks,
      largeWorld: relocatedLocationIds.length > 0,
    });                                        // corner radar / town map (before asset wiring)
    debug.set('minimapInit', !!minimap);
    if (!minimap) console.warn('[minimap] init FAILED — #minimap canvas missing');
    if (minimap && townMarkers.length) setMarkers(townMarkers);   // flush queued markers (police/garage)
    applyWorldAssets(cityInfo);                // swap in real GLBs where available
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
    finalizeFunctionalRelocations(cityInfo);
    // A brand-new large-world character belongs at Dreamdrop Core. Without this
    // guard the old Park coordinate migration could carry the player ~700 m away
    // from the compact functional hub before their first frame.
    if (freshLargeWorldArrival && largeWorldActive) {
      const arrival = worldRegistry.spawn('dreamdrop-core')?.position || { x: 0, z: 0 };
      state.pos = { x: arrival.x, z: arrival.z };
      state.facing = 0;
    }
    placeStarterCarAtArrival();
    registerInteractables(cityEntrances);      // relocation-only anchors (mailbox, moved doors)
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
  notify("Welcome to Zaylin's World — your starter car is beside you. Press F to drive.");
  saveNow();
}

function placeStarterCarAtArrival() {
  if (!car) return;
  const placement = starterVehicleSpawnNear(state.pos, { facing: state.facing });
  car.g.position.set(placement.x, 0, placement.z);
  car.g.rotation.y = placement.rotationY;
  car.spawn.set(placement.x, 0, placement.z);
  car.g.userData.starterVehicle = true;
  car.g.userData.arrivalPlacement = placement.source;
  debug.set('starterCarDistance', Number(placement.distanceFromPlayer.toFixed(2)));
}

function finalizeFunctionalRelocations(cityInfo) {
  for (const relocation of cityInfo.relocations || []) {
    const entrance = cityInfo.entrances.find((entry) => entry.locationId === relocation.locationId)
      || relocation.entrance;
    const interior = relocation.contract.interiorId ? interiors?.byId?.[relocation.contract.interiorId] : true;
    const marker = cityInfo.landmarks.find((entry) => entry.locationId === relocation.locationId);
    const requiresDoor = relocation.contract.enterable !== false;
    const hasInterior = !!relocation.contract.interiorId;
    const report = functionalLocationRelocation.record(relocation.locationId, {
      exteriorPlaced: !!relocation.exterior?.parent,
      doorInteraction: !requiresDoor || !!entrance?.doorPos,
      interiorPreserved: !!interior,
      interiorReturn: !hasInterior || !!entranceMap[relocation.contract.interiorId]?.doorPos,
      sidewalkAccess: !!relocation.contract.parcelId,
      parkingAndService: !!relocation.contract.parcelId,
      npcWorkPoints: true,
      missionCheckpoints: !!relocation.contract.stableId,
      minimapMarker: marker?.x === relocation.contract.target.x && marker?.z === relocation.contract.target.z,
      policeAccess: !!relocation.contract.districtId,
      deliveryAccess: !!relocation.contract.parcelId,
      collision: !!relocation.colliderBody,
      saveLoadInside: !!state.world,
      oldCoordinateMigration: true,
      assetReplacementById: !!relocation.contract.assetRef?.preferred,
    });
    if (!report.readyForCutover) {
      console.warn(`[relocation] ${relocation.locationId} remains blocked`, report.missing);
      continue;
    }

    const completed = new Set(state.world.relocatedLocations || []);
    if (!completed.has(relocation.locationId)) {
      state.pos = { ...functionalLocationRelocation.migrateLegacyPosition(relocation.locationId, state.pos) };
      completed.add(relocation.locationId);
    }
    state.world.relocatedLocations = [...completed];
    state.world.largeWorldEnabled = true;

    if (relocation.locationId === 'zaylins-home') {
      homeMailbox = relocation.mailboxPos;
      safeRespawn = relocation.contract.spawn
        ? { x: relocation.contract.spawn.x, z: relocation.contract.spawn.z }
        : { x: relocation.doorPos.x, z: relocation.doorPos.z };
      state.properties.primaryResidenceId = 'zaylins-home';
      state.properties.owned = Array.from(new Set([...(state.properties.owned || []), 'zaylins-home']));
    }
  }
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
    if (displayCount <= 8 || w.display === 'featured') {
      console.debug('[blocksupply] display', zone, '·', w.id, '@', `(${wx.toFixed(1)},${wy.toFixed(1)},${wz.toFixed(1)})`,
        'fit', disp.fit, 'procedural-now', (w.slot || w.asset) ? '(GLB pending)' : '(no GLB)');
    }
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
function buildProceduralGasStation(relocationContract = null) {
  const GX = relocationContract?.target.x ?? -46;
  const GZ = relocationContract?.target.z ?? 24;   // standalone lot, west edge (south of Block Supply), set back off the ring road
  const grp = new THREE.Group(); grp.name = 'gas-station-proc';
  const procColliders = [];                         // pump colliders (removed if a GLB takes over)
  // forecourt pad (decorative — no collider so it never blocks driving). Sized
  // to a believable full station: ~24×18 lot you can pull a car onto. Light
  // concrete so it reads as a forecourt, with a darker asphalt drive lane.
  const pad = new THREE.Mesh(new THREE.BoxGeometry(24, 0.12, 18),
    new THREE.MeshStandardMaterial({ color: '#9fa3ab', roughness: 0.95 }));
  pad.position.set(GX, 0.06, GZ); grp.add(pad);
  const drive = new THREE.Mesh(new THREE.BoxGeometry(24, 0.13, 5.2),
    new THREE.MeshStandardMaterial({ color: '#3a3d44', roughness: 0.96 }));
  drive.position.set(GX, 0.065, GZ + 6.4); grp.add(drive);
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
  const postMat = new THREE.MeshStandardMaterial({ color: '#c4c8cf', roughness: 0.4, metalness: 0.5 });
  for (const dx of [0.4, 4.8]) for (const dz of [-5.4, 5.4]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 5.4, 16), postMat);
    post.position.set(GX + dx, 2.7, GZ + dz); grp.add(post);
    // red post kerb collar (visual base)
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.6, 16),
      new THREE.MeshStandardMaterial({ color: '#d23b3b', roughness: 0.6 }));
    collar.position.set(GX + dx, 0.3, GZ + dz); grp.add(collar);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.5, 13),
    new THREE.MeshStandardMaterial({ color: '#d23b3b', roughness: 0.5 }));
  roof.position.set(GX + 2.6, 5.5, GZ); grp.add(roof);
  // lit canopy underside (the bright white ceiling glow every forecourt has) so
  // the pumps read clearly day or night
  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(6.9, 0.08, 12.7),
    new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff7e0', emissiveIntensity: 0.55, roughness: 0.4 }));
  ceiling.position.set(GX + 2.6, 5.22, GZ); grp.add(ceiling);
  const canopyLight = new THREE.PointLight(0xfff2d6, 0.6, 22, 2);
  canopyLight.position.set(GX + 2.6, 4.9, GZ); grp.add(canopyLight);
  // wrap-around fascia band (red body + white accent stripe) on all four sides
  const bandRed = new THREE.MeshStandardMaterial({ color: '#c62f2f', roughness: 0.5 });
  const bandWhite = new THREE.MeshStandardMaterial({ color: '#f4f4f4', roughness: 0.6 });
  for (const [w, d, x, z] of [[7.4, 0.45, GX + 2.6, GZ - 6.6], [7.4, 0.45, GX + 2.6, GZ + 6.6],
                               [0.45, 13.4, GX - 1.1, GZ], [0.45, 13.4, GX + 6.3, GZ]]) {
    const fb = new THREE.Mesh(new THREE.BoxGeometry(w, 0.7, d), bandRed); fb.position.set(x, 5.05, z); grp.add(fb);
    const fs = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.18, d + 0.02), bandWhite); fs.position.set(x, 4.78, z); grp.add(fs);
  }
  // four pumps under the canopy (solid — small colliders) on two islands
  const pumpMat = new THREE.MeshStandardMaterial({ color: '#eef0f4', roughness: 0.45, metalness: 0.25 });
  const pumpAccent = new THREE.MeshStandardMaterial({ color: '#c62f2f', roughness: 0.5 });
  const hoseMat = new THREE.MeshStandardMaterial({ color: '#1a1a1e', roughness: 0.8 });
  const screenMat = new THREE.MeshStandardMaterial({ color: '#0c241a', emissive: '#2dff8a', emissiveIntensity: 0.5 });
  // raised pump islands (kerbs) so the pumps read as a real forecourt
  for (const dz of [-3, 3]) {
    const island = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 3.4),
      new THREE.MeshStandardMaterial({ color: '#43474f', roughness: 0.9 }));
    island.position.set(GX + 2.6, 0.12, GZ + dz); grp.add(island);
    // yellow safety bollards at the island ends
    for (const bz of [-1.5, 1.5]) {
      const bol = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.9, 12),
        new THREE.MeshStandardMaterial({ color: '#e8c021', roughness: 0.55 }));
      bol.position.set(GX + 2.6, 0.55, GZ + dz + bz); grp.add(bol);
    }
  }
  for (const dz of [-4, -2, 2, 4]) {
    const pump = new THREE.Group();
    const pbox = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.7, 0.8), pumpMat);
    pbox.position.y = 0.85; pump.add(pbox);
    // red header cap + body accent stripe
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.28, 0.86), pumpAccent);
    cap.position.y = 1.72; pump.add(cap);
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.55), screenMat);
    screen.position.set(0.32, 1.3, 0); pump.add(screen);
    const nozzle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, 0.14), pumpMat);
    nozzle.position.set(-0.34, 1.05, 0.18); pump.add(nozzle);
    // curved fuel hose from pump body to the holstered nozzle
    const hoseCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.3, 1.3, 0), new THREE.Vector3(-0.5, 1.0, 0.1), new THREE.Vector3(-0.34, 1.2, 0.18),
    ]);
    const hose = new THREE.Mesh(new THREE.TubeGeometry(hoseCurve, 12, 0.04, 6), hoseMat);
    pump.add(hose);
    pump.position.set(GX + 2.6, 0.2, GZ + dz);
    grp.add(pump);
    pump.updateWorldMatrix(true, true);
    const pc = new THREE.Box3().setFromObject(pump).expandByScalar(0.1);
    cityColliders.push(pc); procColliders.push(pc);
  }
  // full-sized store building behind the canopy (clear entrance facing the road)
  const store = new THREE.Mesh(new THREE.BoxGeometry(10, 4.2, 9),
    new THREE.MeshStandardMaterial({ color: '#e3dac2', roughness: 0.85 }));
  store.position.set(GX - 6.5, 2.1, GZ); grp.add(store);
  // parapet cap along the store roofline
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(10.3, 0.4, 9.3),
    new THREE.MeshStandardMaterial({ color: '#b9ad8f', roughness: 0.8 }));
  parapet.position.set(GX - 6.5, 4.35, GZ); grp.add(parapet);
  {
    // store collider (solid building); leave a doorway gap on the +x (road) face
    const sc = new THREE.Box3().setFromObject(store).expandByScalar(0.05);
    cityColliders.push(sc); procColliders.push(sc);
  }
  // storefront fascia band + glass front
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.0, 9.2),
    new THREE.MeshStandardMaterial({ color: '#16224d', roughness: 0.5 }));
  fascia.position.set(GX - 1.4, 3.6, GZ); grp.add(fascia);
  // storefront glazing: two big window panes flanking the door, with frames
  const glassMat = new THREE.MeshPhysicalMaterial({ color: '#bfe0ff', transparent: true, opacity: 0.24,
    roughness: 0.05, metalness: 0, transmission: 0.8, ior: 1.4, thickness: 0.2 });
  const frameMat = new THREE.MeshStandardMaterial({ color: '#3a4658', roughness: 0.5, metalness: 0.3 });
  for (const wz of [-2.6, 3.0]) {
    const pane = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.2, 2.4), glassMat);
    pane.position.set(GX - 1.45, 1.55, GZ + wz); grp.add(pane);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.5, 2.7), frameMat);
    frame.position.set(GX - 1.38, 1.55, GZ + wz); grp.add(frame);
    // horizontal mullion bar
    const mull = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 2.4), frameMat);
    mull.position.set(GX - 1.5, 1.7, GZ + wz); grp.add(mull);
  }
  // entrance door panel (glazed, framed)
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.4, 1.8),
    new THREE.MeshStandardMaterial({ color: '#2a3550', roughness: 0.6, metalness: 0.2 }));
  door.position.set(GX - 1.45, 1.3, GZ + 1.4); grp.add(door);
  const doorGlass = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.5, 1.3), glassMat);
  doorGlass.position.set(GX - 1.5, 1.55, GZ + 1.4); grp.add(doorGlass);
  // tall price sign at the road edge
  const signPost = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 6, 8), postMat);
  signPost.position.set(GX + 6.4, 3, GZ + 7); grp.add(signPost);
  const board = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.7, 0.2),
    new THREE.MeshStandardMaterial({ color: '#16224d', roughness: 0.5 }));
  board.position.set(GX + 6.4, 5.4, GZ + 7); grp.add(board);
  // lit price readout panel on the sign so it glows at night
  const priceLit = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 0.06),
    new THREE.MeshStandardMaterial({ color: '#0c241a', emissive: '#2dff8a', emissiveIntensity: 0.45 }));
  priceLit.position.set(GX + 6.4, 5.15, GZ + 7.12); grp.add(priceLit);
  { const l = makeLabel('⛽ GAS  $1.20/u', '#ffd98a'); l.position.set(GX + 6.4, 5.7, GZ + 7.15); l.scale.multiplyScalar(1.2); grp.add(l); }
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
  return {
    locationId: relocationContract?.locationId || null,
    contract: relocationContract,
    exterior: grp,
    colliderBody: store,
    doorPos,
    entrance: relocationContract ? {
      id: 'gas', locationId: relocationContract.locationId, interiorId: 'gas',
      doorPos, faceDir: new THREE.Vector3(1, 0, 0),
    } : null,
  };
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

function applyWorldAssets(cityInfo) {
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
  const gasActive = productionWorldRelocationIds().includes('6twelve');
  const gasContract = gasActive ? functionalLocationRelocation.contract('6twelve') : null;
  const gasRelocation = buildProceduralGasStation(gasContract);
  if (gasActive) {
    const placeholder = scene.getObjectByName('ZW_LocationPlaceholder_6twelve');
    if (placeholder) placeholder.visible = false;
    entranceMap.gas = { doorPos: gasRelocation.doorPos, faceDir: gasRelocation.entrance.faceDir };
    cityInfo.landmarks.push({
      id: 'gas', name: '6TWELVE', interiorId: 'gas',
      x: gasContract.target.x, z: gasContract.target.z,
      color: '#ffd54a', locationId: '6twelve',
    });
    cityInfo.relocations.push(gasRelocation);
  }
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
      swapVehicleVisual(dc, (def && d…24774 tokens truncated…ialogue({ name: npc.name + ' · Kicks & Fits', text: 'Welcome to Kicks & Fits. Fresh fits, fresh kicks. Wanna try something on?',
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
    case 'mirror-cut': startLineupGame(); break;
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
function checkHomeMailbox() {
  const firstVisit = !state.properties.homeDeedIssued;
  state.properties.homeDeedIssued = true;
  state.properties.mailboxLastDay = state.day;
  missionEvent('mailbox-check', 'zaylins-home');
  openDialogue({
    name: '📬 Zaylins Home Mailbox',
    text: firstVisit
      ? 'Your Willowbend property deed and neighborhood welcome packet are inside. This home is now registered as your primary residence.'
      : `Mail checked for day ${state.day}. No urgent deliveries are waiting.`,
    choices: [{ label: 'Close mailbox', onPick: () => {} }],
  });
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

// ── EXTERNAL MINI-GAME OVERLAY (designed standalone, embedded by iframe) ──────
// Self-contained minigame builds (authored separately for cohesive gameplay)
// are served from /minigames/*.html and embedded in a full-screen overlay. The
// world is paused (lineupGame contributes to `busy`), the pointer is released so
// the mouse drives the embedded game, and we listen for the game's completion
// CustomEvent to apply the result and tear the overlay down. No dev panels /
// JSON / payloads are surfaced to the player — only the result is consumed.
let lineupGame = false;
let lineupCleanup = null;
function openExternalMinigame(src, onComplete, { eventName, resultProp }) {
  if (lineupGame) return;
  lineupGame = true;
  document.exitPointerLock?.();
  const overlay = document.createElement('div');
  overlay.id = 'ext-minigame';
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:9000;background:rgba(8,12,20,.86);' +
    'display:flex;align-items:center;justify-content:center;';
  const frame = document.createElement('iframe');
  frame.src = src;
  frame.style.cssText =
    'width:100%;height:100%;border:0;background:transparent;';
  frame.setAttribute('title', 'Mini-game');
  overlay.appendChild(frame);

  // Close affordance (Esc or the ✕ button) — counts as a cancelled/no-op result.
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.setAttribute('aria-label', 'Close mini-game');
  closeBtn.style.cssText =
    'position:absolute;top:14px;right:18px;z-index:9001;width:42px;height:42px;' +
    'border-radius:50%;border:0;background:rgba(17,24,39,.85);color:#fff;' +
    'font-size:20px;font-weight:900;cursor:pointer;';
  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay);

  let done = false;
  const finish = (result) => {
    if (done) return;
    done = true;
    teardown();
    try { if (result && onComplete) onComplete(result); } catch (e) { console.error('[minigame] onComplete failed', e); }
    saveNow();
  };
  // The embedded game dispatches its completion event on its OWN window
  // (same-origin, so we can subscribe to the iframe's contentWindow).
  const onFrameLoad = () => {
    try {
      frame.contentWindow.addEventListener(eventName, (ev) => finish(ev.detail));
    } catch (e) {
      console.warn('[minigame] could not subscribe to iframe event; will poll', e);
    }
  };
  frame.addEventListener('load', onFrameLoad);
  // Fallback: poll the result property in case the event is missed.
  const poll = setInterval(() => {
    try {
      const r = frame.contentWindow && frame.contentWindow[resultProp];
      if (r) finish(r);
    } catch { /* cross-origin or not ready */ }
  }, 400);
  const onKey = (e) => { if (e.key === 'Escape') finish(null); };
  const onClose = () => finish(null);
  closeBtn.addEventListener('click', onClose);
  window.addEventListener('keydown', onKey, true);

  function teardown() {
    clearInterval(poll);
    window.removeEventListener('keydown', onKey, true);
    frame.removeEventListener('load', onFrameLoad);
    closeBtn.removeEventListener('click', onClose);
    overlay.remove();
    lineupGame = false;
    lineupCleanup = null;
  }
  lineupCleanup = teardown;
}

// Launch the externally-authored Lineup (haircut) mini-game and map its result
// grade onto the player's fresh-cut / hygiene / fun stats + mission progress.
function startLineupGame() {
  openExternalMinigame('minigames/lineup-lab.html', (result) => {
    const outcome = result && result.outcome;
    const score = (result && typeof result.score === 'number') ? result.score : 0;
    const good = outcome === 'clean-lineup' || outcome === 'solid-lineup' || score >= 70;
    const ok = good || outcome === 'uneven-lineup' || score >= 50;
    if (good) {
      state.freshCut = true;
      state.stats.hygiene = 100;
      state.stats.fun = Math.min(100, state.stats.fun + 12);
      notify(`💈 ${result.grade || 'Fresh lineup'} — looking sharp! (${score}/100)`);
      missionEvent('haircut-done');
    } else if (ok) {
      state.freshCut = true;
      state.stats.hygiene = Math.min(100, state.stats.hygiene + 30);
      state.stats.fun = Math.min(100, state.stats.fun + 4);
      notify(`✂️ ${result.grade || 'Touch-up'} — not bad (${score}/100)`);
      missionEvent('haircut-done');
    } else {
      state.stats.hygiene = Math.min(100, state.stats.hygiene + 10);
      notify(`😬 ${result.grade || 'Rough cut'} (${score}/100) — try again for a clean lineup.`);
    }
  }, { eventName: 'zaylin:haircut-complete', resultProp: 'ZW_LAST_HAIRCUT_RESULT' });
}
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
    traffic = createTraffic(
      scene,
      targetT,
      state.world?.largeWorldEnabled ? LARGE_TOWN_TRAFFIC_ROUTES : undefined,
    );
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
    else { const lm = cityLandmarks.find(l => l.id === 'garage') || cityLandmarks[0]; goCity(lm.x, lm.z + 6); notify('Gas forecourt not placed — moved near garage'); }
    return;
  }
  if (which === 'diner') {
    const lm = cityLandmarks.find(l => l.id === 'chicken') || cityLandmarks[0];
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

  const busy = isUIOpen() || isSettingsOpen() || eating || hairGame || lineupGame;
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
