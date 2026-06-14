// ───────────────────────────────────────────────────────────────────────────
//  main.js — Zaylin's World 3D : bootstrap, game loop, full interaction wiring
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { buildAvatar, isGltfHair, HAIRSTYLES, HAIR_COLORS, JEWELRY } from './avatar.js';
import { attachGltfHair, attachedHairInfo } from './hairKit.js';
import { buildDistrict } from './cityKit.js';
import { placeStreetProps } from './props.js';
import { preloadVehicles, swapVehicleVisual, TRAFFIC_FLEET, DRIVABLE_DEFAULT, DEALER_FLEET } from './vehicleKit.js';
import { buildCity, colliders as cityColliders } from './world.js';
import { buildInteriors, DEALER_CARS, JEWELRY_STOCK, GEAR_STOCK } from './interiors.js';
import {
  createCityNPCs, updateCityNPCs, createTraffic, updateTraffic, createDrivableCar,
} from './npc.js';
import {
  initWeapons, updateWeapons, buyWeapon, equipWeapon, cycleWeapon,
  WEAPONS, weaponById, currentWeapon,
} from './weapons.js';
import { initMissions, missionEvent, renderTracker } from './missions.js';
import { Controls, CAM } from './controls.js';
import { InteractionManager } from './interaction.js';
import { loadState, saveState, defaultState, clearSave, hasSave } from './state.js';
import { GEMS, LANDMARKS } from './config/mapConfig.js';
import { loadHDRI } from './assets.js';
import {
  hdriUrl, loadSlotModel, updateMixers, enhanceAvatar, enhanceVehicle, assetUrl,
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
// ── police / crime runtime state ──────────────────────────────────────────────
let policeUnits = [];          // foot cops: { av, health, busted }
let policeCars = [];           // patrol cruisers (heavier mass, can be stolen)
let policeAccum = 0;           // spawn pacing
let bustTimer = 0;             // seconds a cop has been on top of the player
let drivenDist = 0, drivenFlagged = false;   // "Get Around Town" mission tracker
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
  // NOTE: the player stays procedural so it keeps its walk animation AND honors
  // every character-creator choice (skin, outfit, hair, jewelry). The player_avatar
  // GLB slot is reserved for drop-in use; static interior NPCs use the GLB pack.
}

// ── visible held weapon (3rd person) ────────────────────────────────────────────
// A lightweight stylized prop mounted in the player's right hand so the equipped
// weapon is actually visible on the avatar (the detailed first-person view-model
// lives on the camera). Rebuilt whenever the weapon changes or the avatar rebuilds.
let heldWeaponProp = null;
function mountHeldWeapon() {
  if (!player) return;
  const arm = player.parts && player.parts.rightArm;
  if (!arm) return;
  if (heldWeaponProp) { heldWeaponProp.parent?.remove(heldWeaponProp); heldWeaponProp = null; }
  const w = currentWeapon();
  if (!w || w.melee) return;                  // fists → nothing in hand
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: '#22262b', roughness: 0.5, metalness: 0.6 });
  const grip = new THREE.MeshStandardMaterial({ color: '#3a2c22', roughness: 0.8 });
  // sizes roughly scale with the weapon class so a pistol ≠ a rifle silhouette
  const long = w.id === 'rifle' || w.id === 'smg' || w.id === 'sniper' || w.id === 'shotgun' || w.id === 'rocket';
  const barrelLen = w.id === 'rocket' ? 0.95 : (w.id === 'sniper' ? 0.9 : long ? 0.7 : 0.34);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, barrelLen), metal);
  body.position.z = barrelLen * 0.35; g.add(body);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.08), grip);
  handle.position.set(0, -0.12, 0.02); g.add(handle);
  if (w.id === 'rocket') {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.95, 10), metal);
    tube.rotation.x = Math.PI / 2; tube.position.z = 0.3; g.add(tube);
  }
  // mount at the hand end of the arm, pointing forward (+Z)
  g.position.set(0, -0.45, 0.12);
  g.scale.setScalar(1.0);
  arm.add(g);
  heldWeaponProp = g;
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
  applyVehicleModels();                      // swap procedural cars → real Car Kit GLBs (incl. dealership)
  // scatter street litter (Trash & Debris GLB) — decorative, non-colliding
  placeStreetProps(scene, renderer)
    .then((n) => { if (n) console.info('[props] litter items:', n); })
    .catch((e) => console.warn('[props] failed:', e));
  // scatter collectible gems across the city (Ultimate Gem Collection textures)
  placeCityGems();
  // intentional sidewalk litter + sanitation worker + dumpster (cleanup side job)
  placeTrashJob();
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
  // dealership showroom — each car gets its OWN unique model (price-tiered), so a
  // $3.5k hatch never shares a body with a $92k supercar.
  const dealer = interiors && interiors.byId['dealership'];
  if (dealer && dealer.displayCars) {
    dealer.displayCars.forEach((dc, i) => {
      const def = DEALER_CARS[i];
      swapVehicleVisual(dc, (def && def.kitModel) || DEALER_FLEET[i % DEALER_FLEET.length]);
    });
  }
  console.log('[vehicles] models applied — traffic:', traffic.length, 'dealer:', dealer?.displayCars?.length || 0);
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

function placeTrashJob() {
  cityTrash = [];
  trashGroup = new THREE.Group(); trashGroup.name = 'city-trash';
  const trashMat = new THREE.MeshStandardMaterial({ color: '#6b6f55', roughness: 0.9 });
  const bagMat = new THREE.MeshStandardMaterial({ color: '#2b2f3a', roughness: 0.85 });
  // two curated litter spots beside each landmark, offset onto the sidewalk
  // (toward the building, away from the road center).
  const offs = [[2.6, 1.8], [-2.4, 2.2], [1.9, -2.6]];
  let idx = 0;
  for (const lm of LANDMARKS) {
    const pick = offs[idx % offs.length]; idx++;
    for (let k = 0; k < 2; k++) {
      const ox = pick[0] + (k ? 1.1 : 0), oz = pick[1] + (k ? -0.8 : 0);
      const x = lm.x + ox, z = lm.z + oz;
      const piece = new THREE.Group();
      const isBag = (idx + k) % 2 === 0;
      if (isBag) {
        const bag = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), bagMat);
        bag.scale.set(1, 0.8, 1); bag.position.y = 0.24; piece.add(bag);
      } else {
        const can = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.34, 8), trashMat);
        can.rotation.z = 1.1; can.position.y = 0.14; piece.add(can);
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.2, 7), trashMat);
        cup.position.set(0.28, 0.1, 0.12); piece.add(cup);
      }
      piece.position.set(x, 0, z);
      trashGroup.add(piece);
      cityTrash.push({ mesh: piece, x, z, collected: false });
    }
  }
  // dumpster near spawn so deposits are convenient
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

  scene.add(trashGroup);
  console.info('[trash] litter pieces:', cityTrash.length);
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

  // trash cleanup side job: pickups, dumpster deposit, sanitation worker
  cityTrash.forEach((item, i) => {
    manager.register({
      id: 'trash-' + i, area: 'city', key: 'e', radius: 2.0,
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
  // EVERY car on the street is stealable — traffic and patrol units alike.
  const pool = [...traffic, ...policeCars];
  for (const c of pool) {
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
    const pidx = policeCars.indexOf(vehicle);
    if (pidx >= 0) policeCars.splice(pidx, 1);
    vehicle.stolen = true;
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
  // distance driven this session → feeds the "Get Around Town" mission
  drivenDist += Math.abs(v.speed) * dt;
  if (drivenDist > 120 && !drivenFlagged) { drivenFlagged = true; missionEvent('drive-checkpoint'); }
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

  // car → pedestrian: moving cars injure (and can take out) civilians
  for (const c of cars) {
    const spd = Math.abs(c.speed || 0);
    if (spd < 3) continue;
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
      // a witnessed hit-and-run draws heat
      state.heat = Math.min(100, (state.heat || 0) + 4);
      if (n.hp <= 0) downNpc(n);
      else if ((state.wanted || 0) < 1) { state.wanted = 1; notify('🚨 You hit someone! Police alerted.'); }
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
function downNpc(n) {
  if (n.downed) return;
  n.downed = true; n.talking = true;            // talking flag halts its walk AI
  n.av.group.rotation.x = -Math.PI / 2;         // fall over
  n.av.group.position.y = 0.3;
  if (n.hpBar) { scene.remove(n.hpBar); n.hpBar = null; }
  state.heat = Math.min(100, (state.heat || 0) + 10);
  setTimeout(() => {
    scene.remove(n.av.group);
    const i = cityNPCs.indexOf(n); if (i >= 0) cityNPCs.splice(i, 1);
    registerInteractables(cityEntrances);
  }, 4000);
}
// Player goes down: respawn at home, restore some health, lose a little cash.
let playerDownCD = 0;
function downPlayer(reason) {
  if (playerDownCD > 0) return;
  playerDownCD = 3;
  const fine = Math.min(state.money, 150);
  state.money -= fine;
  state.stats.health = 60; state.stats.energy = Math.max(30, state.stats.energy);
  state.wanted = Math.max(0, (state.wanted || 0) - 1);
  if (inCar) exitCar();
  area = 'city';
  interiors && (interiors.group.visible = false);
  controls.bounds = null;
  player.group.visible = true;
  player.group.position.set(SPAWN_FALLBACK.x, 0, SPAWN_FALLBACK.z);
  notify('🏥 ' + (reason || 'You were downed') + ' — patched up at home (-$' + fine + ')');
  saveNow();
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
  return out;
}

// Firing a gun in public is a crime → alerts police.
function onWeaponShot(hitAny, isMelee) {
  if (isMelee) { if (hitAny) missionEvent('fight'); return; }
  if (area !== 'city') return;
  if ((state.wanted || 0) < 1) { state.wanted = 1; notify('🚨 Shots fired! Police alerted.'); }
  state.heat = Math.min(100, (state.heat || 0) + 6);
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
function spawnFootCop() {
  const av = buildAvatar({ ...defaultCustom(), top: 'hoodie-red', accessory: 'shades', jewelry: 'none' });
  const navy = new THREE.MeshStandardMaterial({ color: '#16224d', roughness: 0.7, metalness: 0.1 });
  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.66, 0.36), navy);
  vest.position.y = 1.28; av.group.add(vest);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.12, 12), navy);
  cap.position.y = (av.eyeHeight || 1.6) + 0.2; av.group.add(cap);
  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.05, 6),
    new THREE.MeshStandardMaterial({ color: '#ffd34d', emissive: '#5a4500', emissiveIntensity: 0.4 }));
  badge.position.set(0.16, 1.36, 0.19); av.group.add(badge);
  const pp = player.group.position;
  const ang = Math.random() * Math.PI * 2, R = 16;
  av.group.position.set(pp.x + Math.cos(ang) * R, 0, pp.z + Math.sin(ang) * R);
  scene.add(av.group);
  policeUnits.push({ av, health: 65, t: 0, hitT: 0 });
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

// Cops corner you on foot → you get busted: lose half your cash, wanted clears.
function bustPlayer() {
  const lost = Math.floor((state.money || 0) * 0.5);
  state.money -= lost;
  state.wanted = 0; state.heat = 0; bustTimer = 0; copCoolTimer = 0;
  despawnAllPolice();
  if (inCar) exitCar();
  player.group.position.set(state.pos.x = SPAWN_FALLBACK.x, 0, state.pos.z = SPAWN_FALLBACK.z);
  notify(`🚔 Busted! Lost $${lost.toLocaleString()}.`);
  saveNow();
}
const SPAWN_FALLBACK = { x: 9, z: 9 };

function updatePolice(dt) {
  if (area !== 'city' || !player) { if (policeUnits.length || policeCars.length) despawnAllPolice(); return; }
  const wanted = state.wanted || 0;
  if (wanted === 0) { if (policeUnits.length || policeCars.length) despawnAllPolice(); bustTimer = 0; return; }

  // first responder shows up instantly the moment you become wanted — no waiting
  if (policeUnits.length === 0 && policeCars.length === 0) {
    spawnFootCop();
    if (wanted >= 2) spawnFootCop();
    notify('🚓 Police are responding!');
  }

  // spawn pacing — more stars ⇒ more units, cruisers appear at 3★+
  policeAccum += dt;
  const wantFoot = Math.min(4, wanted + 1);
  const wantCars = wanted >= 3 ? Math.min(2, wanted - 2) : 0;
  if (policeAccum > 1.2) {
    policeAccum = 0;
    if (policeUnits.length < wantFoot) spawnFootCop();
    if (policeCars.length < wantCars) spawnCopCar();
  }

  const pp = player.group.position;
  let nearest = Infinity;

  // foot cops chase + bust
  for (let i = policeUnits.length - 1; i >= 0; i--) {
    const u = policeUnits[i];
    if (u.health <= 0) { removeFootCop(i); continue; }
    if (u.hitT > 0) u.hitT -= dt;
    const g = u.av.group;
    const dx = pp.x - g.position.x, dz = pp.z - g.position.z;
    const d = Math.hypot(dx, dz) || 1;
    nearest = Math.min(nearest, d);
    if (d > 1.3) { const sp = 3.8 * dt; g.position.x += dx / d * sp; g.position.z += dz / d * sp; }
    g.rotation.y = Math.atan2(dx, dz);
    u.t = (u.t || 0) + dt; g.position.y = Math.abs(Math.sin(u.t * 8)) * 0.04;
    resolveCollision(g.position, 0.5, cityColliders); g.position.y = Math.abs(Math.sin(u.t * 8)) * 0.04;
    if (!inCar && d < 1.9) { bustTimer += dt; if (bustTimer > 1.3) { bustPlayer(); return; } }
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

  // de-escalation: lose them by distance over time
  if (nearest > 48 || (policeUnits.length + policeCars.length) === 0) {
    copCoolTimer += dt;
    if (copCoolTimer > 9) {
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

// Weapons counter at Block Supply.
function openWeaponShop() {
  openShop({
    title: 'Block Supply — Weapons Counter',
    sub: 'Buy a piece, then press 1–7 to equip · R reloads · click to fire · Q/X switch.',
    getMoney: () => state.money,
    items: WEAPONS.filter(w => !w.melee).map(w => ({
      id: w.id, name: w.icon + ' ' + w.name, price: w.price,
      desc: `${w.dmg} dmg · ${w.mag === Infinity ? '∞' : w.mag} mag · ${w.auto ? 'auto' : 'semi'}`,
      owned: state.ownedWeapons.includes(w.id),
    })),
    onBuy: (item) => {
      const ok = buyWeapon(item.id);
      if (ok) { equipWeapon(item.id); item.owned = true; }
      return ok;
    },
  });
}

// One-time init for the weapon controller + mission tracker.
function initGameSystems() {
  initWeapons({
    camera, scene, renderer, state, notify, saveNow,
    getTargets: getWeaponTargets, onKill: onWeaponKill, onShotFired: onWeaponShot,
    onEquip: () => mountHeldWeapon(),
  });
  initMissions({ state, notify, saveNow });
  renderTracker();
}

// ── weapon input (mouse fire / reload / quick-switch) ───────────────────────────
let fireHeld = false, firePressed = false, reloadPressed = false;
canvas.addEventListener('mousedown', e => { if (e.button === 0) { fireHeld = true; firePressed = true; } });
window.addEventListener('mouseup', e => { if (e.button === 0) fireHeld = false; });

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

  // Sprinting costs stamina (energy); higher FITNESS = faster sprint + slower
  // drain, so gym training tangibly improves how you move.
  const pstats = state.stats;
  const pfit = pstats.fitness || 0;
  const canSprint = inp.run && moving && (pstats.energy || 0) > 2;
  const speed = canSprint ? (5.6 + (pfit / 100) * 2.2) : 3.4;
  if (canSprint) pstats.energy = Math.max(0, pstats.energy - (7 * (1 - pfit / 200)) * dt);
  const p = player.group.position;
  p.addScaledVector(move, speed * dt);

  if (inp.jump && onGround) { velY = 5.2; onGround = false; }
  velY -= 14 * dt; p.y += velY * dt;
  if (p.y <= 0) { p.y = 0; velY = 0; onGround = true; }

  resolveCollision(p, 0.5);

  if (controls.mode === CAM.FIRST) player.group.rotation.y = yaw;
  else if (moving) player.group.rotation.y = lerpAngle(player.group.rotation.y, Math.atan2(move.x, move.z), Math.min(1, dt * 12));

  const amp = moving ? (canSprint ? 0.95 : 0.62) : 0;
  const rate = canSprint ? 12 : 8.4;
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
    case 'workout': startWorkout(); break;
    case 'study': startStudy(); break;
    case 'job-work': doJobShift(); break;
    case 'garage-work': doGarageShift(); break;
    case 'repair': repairVehicle(); break;
    case 'weapon-shop': openWeaponShop(); break;
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
  notify('🍗 Clean to the bone! +Hunger');
  state.stats.hunger = Math.min(100, state.stats.hunger + 38);
  state.stats.fun = Math.min(100, state.stats.fun + 8);
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

// Gym workout — raises FITNESS, costs energy + time.
function startWorkout() {
  if (state.stats.energy < 15) { notify('Too gassed to train — rest or eat first.'); return; }
  startTimingGame({
    title: '🏋️ Workout — hit your reps in the zone', rounds: 4, speedBase: 2.4,
    onFinish: (hits, rounds) => {
      const gain = 4 + hits * 4;                    // up to +20 fitness
      state.stats.fitness = Math.min(100, state.stats.fitness + gain);
      state.stats.energy = Math.max(0, state.stats.energy - 22);
      state.stats.hygiene = Math.max(0, state.stats.hygiene - 14);
      state.stats.fun = Math.min(100, state.stats.fun + 4);
      state.timeMin += 90;
      notify(`💪 Solid session (${hits}/${rounds})! Fitness +${gain}`);
      missionEvent('workout-done');
    },
  });
}

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
            applyCarDamageVisual(car);
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
  // robbery: shake down the nearest civilian for cash (risky — draws heat)
  if (k === 'g' && !inCar && area === 'city') robNearestNpc();
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
  // weapons: reload, quick-switch, and 1–7 to equip by catalog slot
  if (k === 'r') reloadPressed = true;
  if (k === 'q') cycleWeapon(-1);
  if (k === 'x') cycleWeapon(1);
  if (k >= '1' && k <= '7') { const w = WEAPONS[parseInt(k, 10) - 1]; if (w) equipWeapon(w.id); }
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
  // collectible gems: always bob/twinkle; only collectible while on foot in the city
  if (cityGems.length) {
    const pp = (!busy && !inCar && area === 'city' && player) ? player.group.position : null;
    updateCityGems(dt, t, pp);
  }
  if (!busy) {
    if (inCar) updateCar(dt); else updatePlayer(dt, t);
    updateVehicleCollisions(dt);
    updateNpcHealthBars(dt);
    if (!inCar) updateWeapons(dt, { fireHeld, firePressed, reloadPressed });
    firePressed = false; reloadPressed = false;
    updatePolice(dt);
    handleInteraction();
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
  // show the reticle whenever a ranged weapon is out (so you can aim on foot)
  const cw = currentWeapon();
  const xh = document.getElementById('crosshair');
  if (xh) {
    const armed = cw && !cw.melee && !inCar && area === 'city';
    if (armed) xh.style.display = '';
    else if (controls.mode !== CAM.FIRST) xh.style.display = 'none';
  }
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
