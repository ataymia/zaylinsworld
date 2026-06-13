// ───────────────────────────────────────────────────────────────────────────
//  main.js — Zaylin's World 3D : bootstrap, game loop, full interaction wiring
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { buildAvatar } from './avatar.js';
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
let returnPos = new THREE.Vector3(0, 0, 12);
let velY = 0, onGround = true;
let builderOpen = false;
let wardrobeResume = false;      // creator opened from inside the game

const controls = new Controls(camera, canvas);
const manager = new InteractionManager();
const clock = new THREE.Clock();

// ── creator ───────────────────────────────────────────────────────────────────
function rebuildCreatorPreview() {
  if (creatorAvatar) creatorPV.scene.remove(creatorAvatar.group);
  creatorAvatar = buildAvatar(state.custom);
  creatorPV.scene.add(creatorAvatar.group);
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
    car = createDrivableCar(scene, 7, 6);
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
  enhanceShowroomCars();
  placeFrostboxJewelry();
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
    onInteract: () => enterCar(),
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
  const intr = interiors.byId[id];
  returnPos.copy(entranceMap[id]?.doorPos || player.group.position);
  area = id;
  interiors.group.visible = true;
  player.group.position.copy(intr.spawn);
  player.group.rotation.y = 0;
  velY = 0; onGround = true;
  notify('Entered ' + intr.name);
  showPrompt(null);
  saveNow();
}
function leaveInterior() {
  area = 'city';
  interiors.group.visible = false;
  player.group.position.copy(returnPos); player.group.position.y = 0;
  const fd = entranceMap_facing();
  if (fd) player.group.rotation.y = Math.atan2(fd.x, fd.z);
  showPrompt(null);
  saveNow();
}
function entranceMap_facing() { return null; }

// ── vehicle ──────────────────────────────────────────────────────────────────
function enterCar() {
  inCar = true;
  player.group.visible = false;
  car.speed = 0;
  notify('🚗 Driving — W/S throttle, A/D steer, F to exit');
  showPrompt(null);
}
function exitCar() {
  inCar = false;
  player.group.visible = true;
  const side = new THREE.Vector3(Math.cos(car.g.rotation.y), 0, -Math.sin(car.g.rotation.y));
  player.group.position.copy(car.g.position).addScaledVector(side, 2.4); player.group.position.y = 0;
  car.speed = 0;
  notify('Stepped out of the vehicle');
  saveNow();
}
function updateCar(dt) {
  const inp = controls.moveInput();
  const accel = 16, maxF = 24, maxR = 9, fric = 7;
  if (inp.f > 0) car.speed += accel * dt;
  else if (inp.f < 0) car.speed -= accel * dt;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), fric * dt);
  car.speed = Math.max(-maxR, Math.min(maxF, car.speed));

  if (inp.s !== 0 && Math.abs(car.speed) > 0.2) {
    const rate = 1.6 * (Math.abs(car.speed) / maxF + 0.18);
    car.g.rotation.y -= inp.s * rate * dt * Math.sign(car.speed);
  }
  const dir = new THREE.Vector3(Math.sin(car.g.rotation.y), 0, Math.cos(car.g.rotation.y));
  const before = car.g.position.clone();
  car.g.position.addScaledVector(dir, car.speed * dt); car.g.position.y = 0;
  resolveCollision(car.g.position, 1.5, cityColliders);
  if (car.g.position.distanceTo(before) > 0.02 && car.g.position.distanceTo(before) < Math.abs(car.speed * dt) * 0.6 && Math.abs(car.speed) > 7) {
    car.damage = Math.min(100, car.damage + Math.abs(car.speed) * dt * 5);
    state.carDamage = Math.floor(car.damage);
    car.speed *= 0.35;
    notify('💥 Crash! Car damage ' + Math.floor(car.damage) + '%');
  }
  // wheels look
  car.g.children.forEach(c => { if (c.geometry?.type === 'CylinderGeometry') c.rotation.x += car.speed * dt; });
  player.group.position.copy(car.g.position);
  controls.update(car.g.position.clone().setY(0.9), 1.7, dt);
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
  const right = new THREE.Vector3(forward.z, 0, -forward.x);
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
  updateTraffic(traffic, dt);
  updateMixers(dt);                                  // skinned GLB animations
  for (const g of extraSpinners) g.rotation.y += dt * 0.8;   // idle-spin display models
  // spin any dealership car flagged for preview
  if (interiors) Object.values(interiors.byId).forEach(intr => intr.stations.forEach(st => { if (st.mesh && st.mesh.userData.spin) st.mesh.rotation.y += 0.02; }));

  const busy = isUIOpen() || isSettingsOpen() || eating || hairGame;
  if (!busy) {
    if (inCar) updateCar(dt); else updatePlayer(dt, t);
    handleInteraction();
    updateProgression(dt);
  } else {
    // keep camera framing the player while a menu/minigame is open
    if (!inCar && player) controls.update(player.group.position, player.eyeHeight, dt);
  }

  if (eating) updateEating();
  if (hairGame) updateHairline();

  updateHUD(state, locationLabel());
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
