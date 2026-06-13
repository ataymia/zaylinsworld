// ───────────────────────────────────────────────────────────────────────────
//  main.js — Zaylin's World 3D : bootstrap, game loop, full interaction wiring
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { buildAvatar, isGltfHair, HAIRSTYLES, HAIR_COLORS, JEWELRY } from './avatar.js';
import { attachGltfHair, attachedHairInfo } from './hairKit.js';
import { buildDistrict } from './cityKit.js';
import { preloadVehicles, swapVehicleVisual, TRAFFIC_FLEET, DRIVABLE_DEFAULT, DEALER_FLEET } from './vehicleKit.js';
import { buildCity, colliders as cityColliders } from './world.js';
import { buildInteriors, DEALER_CARS, JEWELRY_STOCK, GEAR_STOCK } from './interiors.js';
import {
  createCityNPCs, updateCityNPCs, createTraffic, updateTraffic, createDrivableCar,
} from './npc.js';
import { Controls, CAM } from './controls.js';
import { InteractionManager } from './interaction.js';
import { loadState, saveState, defaultState, clearSave, hasSave } from './state.js';
import { loadHDRI } from './assets.js';
import {
  hdriUrl, loadSlotModel, updateMixers, enhanceAvatar, enhanceVehicle,
} from './manifest.js';
import { graphics } from './graphics.js';
import { initSettingsMenu, isSettingsOpen, settingsTickFPS } from './settings.js';
import {
  initLoadingScreen, hideLoadingScreen, setStatus, setProgress, loadingManager,
} from './loader.js';
import {
  buildCreator, showCreator, updateHUD, showPrompt, notify, SERVERS,
  isUIOpen, onMenuClose, openDialogue, openShop, openChainBuilder, closeMenus,
} from './ui.js';

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
let cityEntrances = [];           // saved for live density re-registration
let entranceMap = {};            // interiorId -> { doorPos, faceDir }
let area = 'city';
let inCar = false;
let drivingVehicle = null;     // the vehicle currently being driven (owned car or a stolen traffic car)
let returnPos = new THREE.Vector3(0, 0, 12);
let velY = 0, onGround = true;
let builderOpen = false;
let wardrobeResume = false;      // creator opened from inside the game

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
  if (!started) {
    setStatus('Building the city…');
    const cityInfo = buildCity(scene);
    cityEntrances = cityInfo.entrances;
    cityInfo.entrances.forEach(e => { entranceMap[e.interiorId] = { doorPos: e.doorPos, faceDir: e.faceDir }; });
    interiors = buildInteriors();
    scene.add(interiors.group);
    cityNPCs = createCityNPCs(scene, Math.max(2, Math.round(9 * graphics.npcDensity)));
    traffic = createTraffic(scene, Math.max(2, Math.round(7 * graphics.trafficDensity)));
    car = createDrivableCar(scene, 13, 3);
    registerInteractables(cityInfo.entrances);
    graphics.applyToScene(scene, renderer);   // reflections + texture filtering
    started = true;
    applyWorldAssets();                        // swap in real GLBs where available
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
  // NOTE: the player stays procedural so it keeps its walk animation AND honors
  // every character-creator choice (skin, outfit, hair, jewelry). The player_avatar
  // GLB slot is reserved for drop-in use; static interior NPCs use the GLB pack.
}

// ── real 3D asset wiring (GLB swaps with procedural fallback) ─────────────────
const extraSpinners = [];   // display models that idle-rotate (e.g. jewelry)

// Strategy: keep MOVING things procedural (player + city NPCs animate, traffic &
// drivable car spin their wheels). Swap STATIC things to real GLBs — interior
// shopkeepers, dealership showroom cars, and Frostbox jewelry — so the pack is
// clearly visible in-game with no animation regressions.
function applyWorldAssets() {
  enhanceShopkeepers();
  placeFrostboxJewelry();
  applyVehicleModels();                      // swap procedural cars → Kenney Car Kit GLBs (incl. dealership)
  // place Kenney Retro Urban Kit buildings into the district (async, fire-and-forget)
  buildDistrict(scene, renderer)
    .then((placed) => { if (placed && placed.length) console.info('[district] landmarks:', placed.map(p => p.label).join(', ')); })
    .catch((e) => console.warn('[district] failed:', e));
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
  // dealership showroom (newer, flashier models)
  const dealer = interiors && interiors.byId['dealership'];
  if (dealer && dealer.displayCars) {
    dealer.displayCars.forEach((dc, i) => swapVehicleVisual(dc, DEALER_FLEET[i % DEALER_FLEET.length]));
  }
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
    const model = await loadSlotModel(cat, slot, renderer);
    if (!model) return;
    const obj = model.scene;
    obj.scale.multiplyScalar(scale);
    obj.position.copy(mount).add(new THREE.Vector3(0, y, 0));
    obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    interiors.group.add(obj);
    if (spin) extraSpinners.push(obj);
    return obj;
  };

  await place('jewelry', 'frostbox_display_case', M.displayCase, { scale: 1 });
  await place('jewelry', 'frostbox_chain_cuban', M.chain, { scale: 0.8, spin: true });
  await place('jewelry', 'frostbox_pendant_initial', M.pendant, { scale: 0.5, spin: true });
  await place('jewelry', 'frostbox_gem_diamond', M.gem, { scale: 0.5, spin: true });

  graphics.applyToScene(scene, renderer);   // pick up envMap reflection intensity
}

// ── register ALL interactables (each has a real working action) ───────────────
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

  // steal the nearest slow/stopped NPC traffic car (F)
  manager.register({
    id: 'steal-car', area: 'city', key: 'f', radius: 3.0,
    getPosition: () => (nearestStealable()?.g.position) || OFFSCREEN,
    enabled: () => !inCar && !!nearestStealable(),
    getPrompt: () => 'Steal vehicle',
    onInteract: () => { const v = nearestStealable(); if (v) enterCar(v, { steal: true }); },
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
  let best = null, bestD = 3.0;
  for (const c of traffic) {
    if (Math.abs(c.speed || 0) > 6) continue;          // can't board fast-moving traffic (yet)
    const d = c.g.position.distanceTo(pp);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
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
    vehicle.stolen = true;
    const witnessed = witnessesNear(vehicle.g.position, 16);
    if (witnessed > 0) {
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
function exitCar() {
  const v = drivingVehicle || car;
  inCar = false;
  player.group.visible = true;
  const side = new THREE.Vector3(Math.cos(v.g.rotation.y), 0, -Math.sin(v.g.rotation.y));
  player.group.position.copy(v.g.position).addScaledVector(side, 2.4); player.group.position.y = 0;
  v.speed = 0;
  drivingVehicle = null;
  notify('Stepped out of the vehicle');
  saveNow();
}
function updateCar(dt) {
  const v = drivingVehicle || car;
  const inp = controls.moveInput();
  const accel = 16, maxF = 24, maxR = 9, fric = 7;
  if (inp.f > 0) v.speed += accel * dt;
  else if (inp.f < 0) v.speed -= accel * dt;
  else v.speed -= Math.sign(v.speed) * Math.min(Math.abs(v.speed), fric * dt);
  v.speed = Math.max(-maxR, Math.min(maxF, v.speed));

  if (inp.s !== 0 && Math.abs(v.speed) > 0.2) {
    const rate = 1.6 * (Math.abs(v.speed) / maxF + 0.18);
    v.g.rotation.y -= inp.s * rate * dt * Math.sign(v.speed);
  }
  const dir = new THREE.Vector3(Math.sin(v.g.rotation.y), 0, Math.cos(v.g.rotation.y));
  const before = v.g.position.clone();
  v.g.position.addScaledVector(dir, v.speed * dt); v.g.position.y = 0;
  resolveCollision(v.g.position, 1.5, cityColliders);
  if (v.g.position.distanceTo(before) > 0.02 && v.g.position.distanceTo(before) < Math.abs(v.speed * dt) * 0.6 && Math.abs(v.speed) > 7) {
    v.damage = Math.min(100, (v.damage || 0) + Math.abs(v.speed) * dt * 5);
    if (v === car) state.carDamage = Math.floor(v.damage);
    v.speed *= 0.35;
    notify('💥 Crash! Car damage ' + Math.floor(v.damage) + '%');
  }
  // roll wheels (GLB wheel meshes or procedural cylinders)
  (v.g.userData.wheels || []).forEach(w => { w.rotation.x += v.speed * dt; });
  v.g.children.forEach(c => { if (c.geometry?.type === 'CylinderGeometry') c.rotation.x += v.speed * dt; });
  player.group.position.copy(v.g.position);
  controls.update(v.g.position.clone().setY(0.9), 1.7, dt);
}

// ── vehicle collision (cars ↔ player, cars ↔ cars) ──────────────────────────────
let playerHitCD = 0;            // seconds of i-frames after being hit by a car
let injuredTimer = 0;          // brief stumble/injured state (visual + lockout)
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
      const push = (minD - d) / 2 + 0.01;
      a.g.position.x -= nx * push; a.g.position.z -= nz * push;
      b.g.position.x += nx * push; b.g.position.z += nz * push;
      const rel = Math.abs(a.speed || 0) + Math.abs(b.speed || 0);
      if (rel > 4 && !a._crashCD && !b._crashCD) {
        a.damage = Math.min(100, (a.damage || 0) + rel * 0.6);
        b.damage = Math.min(100, (b.damage || 0) + rel * 0.6);
        console.log(`[collision] car↔car  rel=${rel.toFixed(1)}  dmgA=${Math.floor(a.damage)}%  dmgB=${Math.floor(b.damage)}%`);
        if (a === car || b === car) state.carDamage = Math.floor(car.damage || 0);
        if (rel > 16) state.heat = Math.min(100, (state.heat || 0) + 3);   // heavy pileup raises heat
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
        injuredTimer = big ? 2.4 : 1.0;
        if ('speed' in c) c.speed *= 0.3;                                 // the car reacts to the hit
        console.log(`[collision] car→player  impact=${impact.toFixed(1)}  ${big ? 'SEVERE' : 'minor'}  energy=${Math.floor(st.energy)}`);
        notify(big ? '🚑 You got hit hard by a car!' : '😖 A car clipped you — watch the road!');
      } else if (playerHitCD <= 0) {
        const sep = (CAR_R + PLAYER_R - d) + 0.01;                        // gently separate from a stopped car
        pp.x += nx * sep; pp.z += nz * sep;
      }
    }
  }
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
  const yaw = controls.cameraYaw();
  const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  // screen-right = forward × up (Y-up, right-handed). For forward=(fx,0,fz) this
  // is (-fz, 0, fx). The old (fz,0,-fx) was negated, which inverted A/D + arrows.
  const right = new THREE.Vector3(-forward.z, 0, forward.x);
  const move = new THREE.Vector3().addScaledVector(forward, inp.f).addScaledVector(right, inp.s);
  const moving = move.lengthSq() > 0.001;
  if (moving) move.normalize();

  const speed = inp.run ? 6.2 : 3.4;
  const p = player.group.position;
  p.addScaledVector(move, speed * dt);

  if (inp.jump && onGround) { velY = 5.2; onGround = false; }
  velY -= 14 * dt; p.y += velY * dt;
  if (p.y <= 0) { p.y = 0; velY = 0; onGround = true; }

  resolveCollision(p, 0.5);

  if (controls.mode === CAM.FIRST) player.group.rotation.y = yaw;
  else if (moving) player.group.rotation.y = lerpAngle(player.group.rotation.y, Math.atan2(move.x, move.z), Math.min(1, dt * 12));

  const amp = moving ? (inp.run ? 0.95 : 0.62) : 0;
  const rate = inp.run ? 12 : 8.4;
  const ph = t * rate;
  const sw = Math.sin(ph) * amp;
  player.parts.leftLeg.rotation.x = sw; player.parts.rightLeg.rotation.x = -sw;
  player.parts.leftArm.rotation.x = -sw * 0.85; player.parts.rightArm.rotation.x = sw * 0.85;
  player.parts.leftArm.rotation.z = 0.08 * amp; player.parts.rightArm.rotation.z = -0.08 * amp;
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
    case 'work-shift': workShift(); break;
    case 'rest': restAtHome(); break;
    case 'wardrobe': openWardrobe(); break;
    case 'safe': openSafe(); break;
    case 'mirror-cut': startHairline(); break;
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
  // recolor the city drivable car to represent the chosen ride
  car.g.traverse(o => { if (o.isMesh && o.material && o.material.metalness >= 0.3 && o.material.color && o.geometry?.type === 'BoxGeometry') { /* body panels */ } });
  if (car.g.children[0]?.material) car.g.children[0].material.color.set(carDef.color);
  car.damage = 0; state.carDamage = 0;
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
  saveNow();
}
function workShift() {
  state.money += 55; state.job = 'Chicken Spot Crew';
  state.stats.energy = Math.max(0, state.stats.energy - 18);
  state.stats.hygiene = Math.max(0, state.stats.hygiene - 10);
  state.timeMin += 180;
  notify('🧑‍🍳 Worked a shift: +$55, -energy');
  saveNow();
}
function restAtHome() {
  state.stats.energy = 100; state.stats.hygiene = 100;
  state.timeMin += 240;
  notify('😴 Slept it off — energy full');
  saveNow();
}
function openSafe() {
  openDialogue({
    name: 'Home Safe',
    text: `Cash: $${Math.floor(state.money).toLocaleString()}\nCars owned: ${state.ownedCars.length}\nJewelry owned: ${state.ownedJewelry.length}\nGear owned: ${state.ownedGear.length}\nChicken in bag: ${state.chicken}`,
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
  showPrompt('Take a bite (' + eatBites + ' left)', 'e');
  eatPiece.rotation.y += 0.01;
  if (controls.consumePress('e')) {
    eatBites--;
    const s = Math.max(0.01, eatBites / 4);
    eatMeat.scale.set(1.3 * s, s, s);
    if (eatBites <= 0) finishEating();
  }
}
function finishEating() {
  notify('🍗 Clean to the bone! +Hunger');
  state.stats.hunger = Math.min(100, state.stats.hunger + 38);
  state.stats.fun = Math.min(100, state.stats.fun + 8);
  setTimeout(() => { if (eatPiece) { camera.remove(eatPiece); eatPiece = null; } }, 600);
  eating = false;
  showPrompt(null);
  saveNow();
}

// ── HAIRLINE MINI-GAME (timing at the mirror) ─────────────────────────────────
let hairGame = false, hairState = null;
const mgEl = () => document.getElementById('minigame');
function startHairline() {
  hairGame = true;
  hairState = { round: 0, hits: 0, speed: 2.2, zoneStart: 38, zoneW: 22, t0: clock.elapsedTime };
  newHairRound();
  document.getElementById('mg-title').textContent = '💈 Lineup — line up the fade';
  document.getElementById('mg-hint').innerHTML = 'Press <b>SPACE</b> in the green zone (round 1/3)';
  mgEl().style.display = 'flex';
}
function newHairRound() {
  hairState.zoneW = 24 - hairState.round * 4;
  hairState.zoneStart = 20 + Math.random() * (70 - hairState.zoneW);
  hairState.speed = 2.0 + hairState.round * 0.7;
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
    if (hairState.round >= 3) finishHairline();
    else {
      newHairRound();
      document.getElementById('mg-hint').innerHTML =
        `${hit ? '✅ clean!' : '✂️ missed'} — Press <b>SPACE</b> (round ${hairState.round + 1}/3)`;
    }
  }
}
function finishHairline() {
  hairGame = false; mgEl().style.display = 'none';
  if (hairState.hits >= 2) {
    state.freshCut = true;
    state.stats.fun = Math.min(100, state.stats.fun + 12);
    state.stats.hygiene = 100;
    notify(`💈 Fresh lineup! ${hairState.hits}/3 clean — looking sharp`);
  } else {
    notify(`✂️ Rough cut (${hairState.hits}/3). Try again for a fresh lineup.`);
  }
  showPrompt(null);
  saveNow();
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
}

// ── graphics settings application ──────────────────────────────────────────────
function rebuildDensity() {
  if (!started || area !== 'city') return;
  const targetN = Math.max(2, Math.round(9 * graphics.npcDensity));
  const targetT = Math.max(2, Math.round(7 * graphics.trafficDensity));
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
function locationLabel() {
  if (inCar) return '🚗 Driving';
  if (area !== 'city') return interiors.byId[area].name;
  return (SERVERS.find(s => s.id === state.server)?.name || 'City') + ' — City';
}

// ── interaction dispatch each frame ────────────────────────────────────────────
function handleInteraction() {
  if (inCar) {
    showPrompt('Exit vehicle', 'f');
    if (controls.consumePress('f')) exitCar();
    return;
  }
  const near = manager.findNearest(player.group.position, area);
  if (near) {
    showPrompt(near.getPrompt(), near.key);
    if (controls.consumePress(near.key)) near.onInteract();
  } else {
    showPrompt(null);
  }
}

// ── global hotkeys ─────────────────────────────────────────────────────────────
window.addEventListener('keydown', e => {
  if (mode !== 'play' || isUIOpen() || isSettingsOpen() || eating || hairGame) return;
  const k = e.key.toLowerCase();
  if (k === 'v') { const m = controls.cycleMode(); notify('Camera: ' + m.toUpperCase()); document.getElementById('crosshair').style.display = m === CAM.FIRST ? '' : 'none'; }
  if (k === 'c' && !inCar && area === 'city') openWardrobe();
  if (k === 'i') toggleInteriorDebug();
  if (k === 'h') toggleHairDebug();
  if (hairDebug) {
    if (k === ']') cycleHair(1);
    if (k === '[') cycleHair(-1);
    if (k === 'j') cycleJewelry();
  }
  if (k === 'm') { state.monsterMode = !state.monsterMode; notify('Monster Mode ' + (state.monsterMode ? 'ON 👹' : 'off')); }
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
  updateTraffic(traffic, dt, trafficObstacles);
  updateMixers(dt);                                  // skinned GLB animations
  for (const g of extraSpinners) g.rotation.y += dt * 0.8;   // idle-spin display models
  // spin any dealership car flagged for preview
  if (interiors) Object.values(interiors.byId).forEach(intr => intr.stations.forEach(st => { if (st.mesh && st.mesh.userData.spin) st.mesh.rotation.y += 0.02; }));

  const busy = isUIOpen() || isSettingsOpen() || eating || hairGame;
  if (!busy) {
    if (inCar) updateCar(dt); else updatePlayer(dt, t);
    updateVehicleCollisions(dt);
    handleInteraction();
    updateProgression(dt);
  } else {
    // keep camera framing the player while a menu/minigame is open
    if (!inCar && player) controls.update(player.group.position, player.eyeHeight, dt);
  }

  if (eating) updateEating();
  if (hairGame) updateHairline();

  updateHUD(state, locationLabel());
  if (interiorDebug) updateInteriorDebug();
  renderer.render(scene, camera);
  controls.endFrame();
  revealOnce();
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

// Register the service worker for asset caching / offline replay (prod only).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(new URL('sw.js', document.baseURI).href)
      .catch(() => { /* caching is a progressive enhancement — ignore failures */ });
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
