// ─────────────────────────────────────────────────────────────────────────────
// modularPlayer.js — browser runtime adapter for editable player packs.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { loadModel } from './assets.js';
import { SKIN_TONES } from './avatar.js';
import {
  PLAYER_AVATAR_CATALOG,
  PLAYER_MODEL_URL,
  ensurePlayerCustom,
  variantFor,
} from './config/playerAvatarCatalog.js';

const textureLoader = new THREE.TextureLoader();
const textureCache = new Map();
const PLAYER_TEXTURE_PREFIX = './assets/models/characters/player/sunbox-male-free/textures/';
const PLAYER_TEXTURE_LIBRARY_URL = './assets/models/characters/player/sunbox-male-free/texture-library.json';
let textureLibraryPromise = null;

async function textureSource(url) {
  if (!url?.startsWith(PLAYER_TEXTURE_PREFIX)) return url;
  if (!textureLibraryPromise) {
    textureLibraryPromise = fetch(PLAYER_TEXTURE_LIBRARY_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`texture library ${response.status}`);
        return response.json();
      })
      .then((library) => library.files || {})
      .catch((error) => {
        textureLibraryPromise = null;
        throw error;
      });
  }
  const files = await textureLibraryPromise;
  const key = url.slice(PLAYER_TEXTURE_PREFIX.length);
  if (!files[key]) throw new Error(`missing texture-library entry: ${key}`);
  return files[key];
}

const SLOT_NODES = Object.freeze({
  hair: Object.freeze({
    'crew-cut': 'ZW_Hair_CrewCut',
    'close-crop': 'ZW_Hair_CloseCrop',
  }),
  facialHair: Object.freeze({
    beard: 'ZW_FacialHair_Beard',
    goatee: 'ZW_FacialHair_Goatee',
  }),
  top: Object.freeze({
    tshirt: 'ZW_Top_TShirt',
    hoodie: 'ZW_Top_Hoodie',
  }),
  bottom: Object.freeze({
    jeans: 'ZW_Bottom_Jeans',
    'cargo-shorts': 'ZW_Bottom_CargoShorts',
  }),
  shoes: Object.freeze({
    basketball: 'ZW_Shoes_Basketball',
    flipflops: 'ZW_Shoes_FlipFlops',
  }),
  hat: Object.freeze({
    beanie: 'ZW_Hat_Beanie',
    'baseball-cap': 'ZW_Hat_BaseballCap',
  }),
  glasses: Object.freeze({
    pilot: 'ZW_Glasses_Pilot',
    square: 'ZW_Glasses_Square',
  }),
});

const MATERIAL_TEXTURES = Object.freeze({
  ZW_Skin: () => './assets/models/characters/player/sunbox-male-free/textures/skin-male/male-avatar-diffuse.webp',
  ZW_Eyes: (c) => variantFor('eyes', c.eyeTexture)?.path,
  ZW_Eyelashes: (c) => variantFor('eyelashes', c.eyelashTexture)?.path,
  ZW_Hair: (c) => variantFor('hair', c.hairTexture)?.path,
  ZW_TShirt: (c) => variantFor('tshirt', c.topTexture)?.path,
  ZW_Hoodie: (c) => variantFor('hoodie', c.topTexture)?.path,
  ZW_Jeans: (c) => variantFor('jeans', c.bottomTexture)?.path,
  ZW_CargoShorts: (c) => variantFor('cargo-shorts', c.bottomTexture)?.path,
  ZW_BasketballShoes: (c) => variantFor('basketball', c.shoesTexture)?.path,
  ZW_FlipFlops: (c) => variantFor('flipflops', c.shoesTexture)?.path,
  ZW_Beanie: (c) => variantFor('beanie', c.hatTexture)?.path,
  ZW_BaseballCap: (c) => variantFor('baseball-cap', c.hatTexture)?.path,
});

function loadTexture(url, renderer) {
  if (!url) return Promise.resolve(null);
  if (!textureCache.has(url)) {
    const promise = textureSource(url).then((source) => textureLoader.loadAsync(source)).then((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.flipY = false;
      texture.anisotropy = Math.min(8, renderer?.capabilities?.getMaxAnisotropy?.() || 4);
      texture.needsUpdate = true;
      return texture;
    }).catch((error) => {
      console.warn('[player-avatar] texture failed', url, error);
      return null;
    });
    textureCache.set(url, promise);
  }
  return textureCache.get(url);
}

function cloneMaterials(root) {
  root.traverse((node) => {
    if (!node.isMesh) return;
    const source = Array.isArray(node.material) ? node.material : [node.material];
    const cloned = source.map((material) => material?.clone?.() || material);
    node.material = Array.isArray(node.material) ? cloned : cloned[0];
    node.castShadow = true;
    node.receiveShadow = true;
    node.frustumCulled = false;
  });
}

function materialsByName(root) {
  const out = new Map();
  root.traverse((node) => {
    if (!node.isMesh) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) {
      if (material?.name && !out.has(material.name)) out.set(material.name, material);
    }
  });
  return out;
}

function setSlotVisibility(root, custom) {
  const selected = {
    hair: custom.modularHair,
    facialHair: custom.facialHair,
    top: custom.modularTop,
    bottom: custom.modularBottom,
    shoes: custom.modularShoes,
    hat: custom.hat,
    glasses: custom.glasses,
  };
  for (const [slot, nodes] of Object.entries(SLOT_NODES)) {
    for (const [id, nodeName] of Object.entries(nodes)) {
      const node = root.getObjectByName(nodeName);
      if (node) node.visible = selected[slot] === id;
    }
  }
  const body = root.getObjectByName('ZW_Player_Body');
  if (body) body.visible = true;
}

function setMorph(root, name, value) {
  const v = THREE.MathUtils.clamp(Number(value) || 0, 0, 1);
  root.traverse((node) => {
    if (!node.isMesh || !node.morphTargetDictionary || !node.morphTargetInfluences) return;
    const index = node.morphTargetDictionary[name];
    if (index == null) return;
    node.morphTargetInfluences[index] = v;
  });
}

function resetKnownMorphs(root) {
  root.traverse((node) => {
    if (!node.isMesh || !node.morphTargetInfluences) return;
    node.morphTargetInfluences.fill(0);
  });
}

function applyMorphs(root, custom) {
  resetKnownMorphs(root);
  const mass = THREE.MathUtils.clamp(Number(custom.bodyMass) || 0, -1, 1);
  setMorph(root, 'Body_Chubby', Math.max(0, mass));
  setMorph(root, 'Body_Skinny', Math.max(0, -mass));
  setMorph(root, 'Body_Muscle', THREE.MathUtils.clamp(Number(custom.bodyMuscle) || 0, 0, 1));
  setMorph(root, 'Body_NailsLength_Max', custom.nailsLength);
  setMorph(root, 'Body_NailsCurve_Max', custom.nailsCurve);

  for (const slider of PLAYER_AVATAR_CATALOG.faceSliders) {
    const value = THREE.MathUtils.clamp(Number(custom.faceMorphs?.[slider.key]) || 0, -1, 1);
    if (value < 0) setMorph(root, slider.minTarget, -value);
    if (value > 0) setMorph(root, slider.maxTarget, value);
  }

  // Hide covered body regions. Flip-flops keep feet visible; shorts keep lower legs.
  setMorph(root, 'OutfitHide_Tshirt', custom.modularTop ? 1 : 0);
  setMorph(root, 'OutfitHide_Jeans', custom.modularBottom === 'jeans' ? 1 : 0);
  setMorph(root, 'OutfitHide_Sneakers', custom.modularShoes === 'basketball' ? 1 : 0);
}

async function applyMaterials(instance, custom, renderer) {
  const materials = instance.materials;
  const jobs = [];
  for (const [materialName, resolveUrl] of Object.entries(MATERIAL_TEXTURES)) {
    const material = materials.get(materialName);
    if (!material) continue;
    const url = resolveUrl(custom);
    jobs.push(loadTexture(url, renderer).then((texture) => {
      if (!texture) return;
      material.map = texture;
      material.color.set('#ffffff');
      material.needsUpdate = true;
    }));
  }

  const skin = materials.get('ZW_Skin');
  const tone = SKIN_TONES.find((entry) => entry.id === custom.skin) || SKIN_TONES[4] || SKIN_TONES[0];
  if (skin && tone) {
    // Preserve the authored skin detail while tinting across the inclusive tone range.
    skin.color.set(tone.color).lerp(new THREE.Color('#ffffff'), 0.38);
    skin.roughness = 0.78;
    skin.metalness = 0;
    skin.needsUpdate = true;
  }
  const nails = materials.get('ZW_Nails');
  if (nails && tone) {
    nails.color.set(tone.color).lerp(new THREE.Color('#f5c8c8'), 0.52);
    nails.roughness = 0.45;
    nails.needsUpdate = true;
  }
  const lashes = materials.get('ZW_Eyelashes');
  if (lashes) {
    lashes.transparent = true;
    lashes.alphaTest = 0.25;
    lashes.depthWrite = false;
    lashes.side = THREE.DoubleSide;
    lashes.needsUpdate = true;
  }
  const lenses = materials.get('ZW_GlassesLens');
  if (lenses) {
    lenses.transparent = true;
    lenses.opacity = 0.42;
    lenses.roughness = 0.1;
    lenses.metalness = 0.05;
    lenses.depthWrite = false;
    lenses.needsUpdate = true;
  }
  await Promise.all(jobs);
}

function normalizeVisibleModel(root, custom) {
  root.scale.setScalar(1);
  root.position.set(0, 0, 0);
  root.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size); box.getCenter(center);
  if (!Number.isFinite(size.y) || size.y < 0.05) return null;
  const targetHeight = 1.78 * THREE.MathUtils.clamp(Number(custom.heightScale) || 1, 0.82, 1.18);
  const scale = targetHeight / size.y;
  root.scale.setScalar(scale);
  root.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  root.updateWorldMatrix(true, true);
  return { targetHeight, scale, sourceSize: size };
}

function findRig(root) {
  const get = (name) => root.getObjectByName(name) || null;
  return {
    bones: {
      leftArm: get('UpperArm_Anim_L') || get('UpperArm_L'),
      rightArm: get('UpperArm_Anim_R') || get('UpperArm_R'),
      leftLeg: get('UpperLeg_L'),
      rightLeg: get('UpperLeg_R'),
      head: get('Head'),
      hips: get('Hips'),
    },
    anchors: {
      head: get('ZW_Anchor_Head'),
      rightHand: get('ZW_Anchor_RightHand') || get('Hand_Prop_R') || get('Hand_R'),
      leftHand: get('ZW_Anchor_LeftHand') || get('Hand_Prop_L') || get('Hand_L'),
      chest: get('ZW_Anchor_Chest') || get('UpperChest'),
    },
  };
}

export async function createModularPlayerVisual(customInput, renderer, options = {}) {
  const custom = ensurePlayerCustom(customInput || {});
  const loaded = await loadModel(options.modelUrl || PLAYER_MODEL_URL, renderer);
  if (!loaded?.scene) return null;

  let group;
  try { group = skeletonClone(loaded.scene); }
  catch { group = loaded.scene.clone(true); }
  group.name = options.name || 'modular-player:Sunbox-male-free';
  group.userData.characterRole = 'player';
  group.userData.sourcePack = 'sunbox-male-free';
  cloneMaterials(group);

  const rig = findRig(group);
  const instance = {
    group,
    materials: materialsByName(group),
    bones: rig.bones,
    anchors: rig.anchors,
    custom,
    normalized: null,
    blinkPhase: Math.random() * 4,
  };
  setSlotVisibility(group, custom);
  applyMorphs(group, custom);
  await applyMaterials(instance, custom, renderer);
  instance.normalized = normalizeVisibleModel(group, custom);
  if (!instance.normalized) return null;
  return instance;
}

export async function updateModularPlayerVisual(instance, customInput, renderer) {
  if (!instance?.group) return false;
  const custom = ensurePlayerCustom(customInput || {});
  instance.custom = custom;
  setSlotVisibility(instance.group, custom);
  applyMorphs(instance.group, custom);
  await applyMaterials(instance, custom, renderer);
  instance.normalized = normalizeVisibleModel(instance.group, custom);
  return !!instance.normalized;
}

export function tickModularPlayerVisual(instance, elapsed) {
  if (!instance?.group) return;
  // Lightweight autonomous blink. Gameplay locomotion is driven by the existing
  // player controller after avatarSkin remaps its limb pivots to imported bones.
  const cycle = (elapsed + instance.blinkPhase) % 4.6;
  let blink = 0;
  if (cycle > 4.25 && cycle < 4.38) blink = Math.sin(((cycle - 4.25) / 0.13) * Math.PI);
  setMorph(instance.group, 'Expression_Blink', blink);
}

export function disposeModularPlayerVisual(instance) {
  if (!instance?.group) return;
  instance.group.traverse((node) => {
    if (!node.isMesh) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) material?.dispose?.();
  });
}
