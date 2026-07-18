// ─────────────────────────────────────────────────────────────────────────────
// modularPlayer.js — browser runtime adapter for editable player packs.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { loadModel } from './assets.js';
import { loadingManager, trackLoadingFetch } from './loader.js';
import {
  PLAYER_AVATAR_CATALOG,
  PLAYER_MODEL_URL,
  ensurePlayerCustom,
  variantFor,
} from './config/playerAvatarCatalog.js';
import {
  isLegacyAssetHair,
  updateModularAttachments,
  updateAttachmentTransforms,
  disposeModularAttachments,
} from './modularAttachments.js';

const textureLoader = new THREE.TextureLoader(loadingManager);
const textureCache = new Map();
const PLAYER_TEXTURE_PREFIX = './assets/models/characters/player/sunbox-male-free/textures/';
const PLAYER_TEXTURE_LIBRARY_URL = './assets/models/characters/player/sunbox-male-free/texture-library.json';
let textureLibraryPromise = null;

async function textureSource(url) {
  if (!url?.startsWith(PLAYER_TEXTURE_PREFIX)) return url;
  if (!textureLibraryPromise) {
    textureLibraryPromise = trackLoadingFetch(
      PLAYER_TEXTURE_LIBRARY_URL,
      undefined,
      'Loading character textures…',
    )
      .then((response) => response.json())
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
  ZW_Eyes: (custom) => variantFor('eyes', custom.eyeTexture)?.path,
  ZW_Eyelashes: (custom) => variantFor('eyelashes', custom.eyelashTexture)?.path,
  ZW_Hair: (custom) => variantFor('hair', custom.hairTexture)?.path,
  ZW_TShirt: (custom) => variantFor('tshirt', custom.topTexture)?.path,
  ZW_Hoodie: (custom) => variantFor('hoodie', custom.topTexture)?.path,
  ZW_Jeans: (custom) => variantFor('jeans', custom.bottomTexture)?.path,
  ZW_CargoShorts: (custom) => variantFor('cargo-shorts', custom.bottomTexture)?.path,
  ZW_BasketballShoes: (custom) => variantFor('basketball', custom.shoesTexture)?.path,
  ZW_FlipFlops: (custom) => variantFor('flipflops', custom.shoesTexture)?.path,
  ZW_Beanie: (custom) => variantFor('beanie', custom.hatTexture)?.path,
  ZW_BaseballCap: (custom) => variantFor('baseball-cap', custom.hatTexture)?.path,
});

function loadTexture(url, renderer) {
  if (!url) return Promise.resolve(null);
  if (!textureCache.has(url)) {
    textureCache.set(url, textureSource(url)
      .then((source) => textureLoader.loadAsync(source))
      .then((texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.flipY = false;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.generateMipmaps = true;
        texture.anisotropy = Math.min(16, renderer?.capabilities?.getMaxAnisotropy?.() || 4);
        texture.needsUpdate = true;
        return texture;
      })
      .catch((error) => {
        console.warn('[player-avatar] texture failed', url, error);
        return null;
      }));
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
  const output = new Map();
  root.traverse((node) => {
    if (!node.isMesh) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) {
      if (material?.name && !output.has(material.name)) output.set(material.name, material);
    }
  });
  return output;
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
  if (isLegacyAssetHair(custom.modularHair)) {
    root.getObjectByName('ZW_Hair_CrewCut')?.traverse((node) => { node.visible = false; });
    root.getObjectByName('ZW_Hair_CloseCrop')?.traverse((node) => { node.visible = false; });
  }
  const body = root.getObjectByName('ZW_Player_Body');
  if (body) body.visible = true;
}

function setMorph(root, name, value) {
  const amount = THREE.MathUtils.clamp(Number(value) || 0, 0, 1);
  root.traverse((node) => {
    if (!node.isMesh || !node.morphTargetDictionary || !node.morphTargetInfluences) return;
    const index = node.morphTargetDictionary[name];
    if (index != null) node.morphTargetInfluences[index] = amount;
  });
}

function resetKnownMorphs(root) {
  root.traverse((node) => {
    if (node.isMesh && node.morphTargetInfluences) node.morphTargetInfluences.fill(0);
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
  setMorph(root, 'OutfitHide_Tshirt', custom.modularTop ? 1 : 0);
  setMorph(root, 'OutfitHide_Jeans', custom.modularBottom === 'jeans' ? 1 : 0);
  setMorph(root, 'OutfitHide_Sneakers', custom.modularShoes === 'basketball' ? 1 : 0);
}

async function applyMaterials(instance, custom, renderer) {
  const jobs = [];
  for (const [materialName, resolveUrl] of Object.entries(MATERIAL_TEXTURES)) {
    const material = instance.materials.get(materialName);
    if (!material) continue;
    jobs.push(loadTexture(resolveUrl(custom), renderer).then((texture) => {
      if (!texture) return;
      material.map = texture;
      material.color.set('#ffffff');
      material.needsUpdate = true;
    }));
  }
  await Promise.all(jobs);

  const tones = PLAYER_AVATAR_CATALOG.skinTones;
  const tone = tones.find((entry) => entry.id === custom.skin)
    || tones.find((entry) => entry.id === 'umber')
    || tones[0];
  const skin = instance.materials.get('ZW_Skin');
  if (skin && tone) {
    const textureLift = THREE.MathUtils.clamp(Number(tone.textureLift) || 0, 0, 0.35);
    skin.color.copy(new THREE.Color(tone.color).lerp(new THREE.Color('#ffffff'), textureLift));
    skin.roughness = 0.76;
    skin.metalness = 0;
    skin.needsUpdate = true;
  }
  const nails = instance.materials.get('ZW_Nails');
  if (nails && tone) {
    const nailBlend = THREE.MathUtils.clamp(Number(tone.nailBlend) || 0.36, 0.15, 0.65);
    nails.color.set(tone.color).lerp(new THREE.Color('#f5c8c8'), nailBlend);
    nails.roughness = 0.45;
    nails.needsUpdate = true;
  }
  const lashes = instance.materials.get('ZW_Eyelashes');
  if (lashes) {
    lashes.transparent = true;
    lashes.alphaTest = 0.25;
    lashes.depthWrite = false;
    lashes.side = THREE.DoubleSide;
    lashes.needsUpdate = true;
  }
  const lenses = instance.materials.get('ZW_GlassesLens');
  if (lenses) {
    lenses.transparent = true;
    lenses.opacity = 0.42;
    lenses.roughness = 0.1;
    lenses.metalness = 0.05;
    lenses.depthWrite = false;
    lenses.needsUpdate = true;
  }
}

function normalizeVisibleModel(model, custom) {
  model.scale.setScalar(1);
  model.position.set(0, 0, 0);
  model.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  if (!Number.isFinite(size.y) || size.y < 0.05) return null;
  const targetHeight = 1.78 * THREE.MathUtils.clamp(Number(custom.heightScale) || 1, 0.82, 1.18);
  const scale = targetHeight / size.y;
  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  model.updateWorldMatrix(true, true);
  return { targetHeight, scale, sourceSize: size };
}

function normalizedBoneName(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function skinnedBoneUsage(root) {
  const bones = new Map();
  const bonesByName = new Map();
  const weights = new Map();
  const componentGetters = ['getX', 'getY', 'getZ', 'getW'];
  root.traverse((node) => {
    if (!node.isSkinnedMesh || !node.skeleton) return;
    for (const bone of node.skeleton.bones || []) {
      if (!bone?.name) continue;
      if (!bones.has(bone.name)) bones.set(bone.name, bone);
      const named = bonesByName.get(bone.name) || [];
      if (!named.includes(bone)) named.push(bone);
      bonesByName.set(bone.name, named);
    }
    const skinIndex = node.geometry?.getAttribute?.('skinIndex');
    const skinWeight = node.geometry?.getAttribute?.('skinWeight');
    if (!skinIndex || !skinWeight) return;
    const slots = Math.min(4, skinIndex.itemSize || 0, skinWeight.itemSize || 0);
    for (let vertex = 0; vertex < skinIndex.count; vertex++) {
      for (let slot = 0; slot < slots; slot++) {
        const jointIndex = skinIndex[componentGetters[slot]](vertex);
        const weight = skinWeight[componentGetters[slot]](vertex);
        const bone = node.skeleton.bones?.[jointIndex];
        if (!bone || !Number.isFinite(weight) || weight <= 0) continue;
        weights.set(bone, (weights.get(bone) || 0) + weight);
      }
    }
  });
  return { bones, bonesByName, weights };
}

function weightedCandidates(usage, candidates) {
  return [...new Set(candidates)]
    .sort((a, b) => (usage.weights.get(b) || 0) - (usage.weights.get(a) || 0));
}

function pickWeightedBone(usage, exactNames, matches, excludes = []) {
  for (const name of exactNames) {
    const exact = weightedCandidates(usage, usage.bonesByName.get(name) || []);
    const weighted = exact.find((bone) => (usage.weights.get(bone) || 0) > 0.000001);
    if (weighted) return weighted;
    if (exact[0]) return exact[0];
  }
  const fuzzy = [];
  for (const namedBones of usage.bonesByName.values()) {
    for (const bone of namedBones) {
      const key = normalizedBoneName(bone.name);
      if (excludes.some((term) => key.includes(term))) continue;
      if (matches.some((term) => key.includes(term))) fuzzy.push(bone);
    }
  }
  const sorted = weightedCandidates(usage, fuzzy);
  return sorted.find((bone) => (usage.weights.get(bone) || 0) > 0.000001) || sorted[0] || null;
}

function findRig(root) {
  const usage = skinnedBoneUsage(root);
  const getNode = (name) => root.getObjectByName(name) || null;
  const bones = {
    leftArm: pickWeightedBone(
      usage,
      ['UpperArm_L', 'mixamorigLeftArm', 'UpperArm_Anim_L'],
      ['upperarml', 'leftupperarm', 'mixamorigleftarm', 'upperarmaniml'],
      ['forearm', 'lowerarm', 'hand'],
    ),
    rightArm: pickWeightedBone(
      usage,
      ['UpperArm_R', 'mixamorigRightArm', 'UpperArm_Anim_R'],
      ['upperarmr', 'rightupperarm', 'mixamorigrightarm', 'upperarmanimr'],
      ['forearm', 'lowerarm', 'hand'],
    ),
    leftLeg: pickWeightedBone(
      usage,
      ['UpperLeg_L', 'mixamorigLeftUpLeg'],
      ['upperlegl', 'leftupperleg', 'leftupleg', 'mixamorigleftupleg'],
      ['lowerleg', 'foot'],
    ),
    rightLeg: pickWeightedBone(
      usage,
      ['UpperLeg_R', 'mixamorigRightUpLeg'],
      ['upperlegr', 'rightupperleg', 'rightupleg', 'mixamorigrightupleg'],
      ['lowerleg', 'foot'],
    ),
    head: pickWeightedBone(usage, ['Head', 'mixamorigHead'], ['head'], ['headtopend']),
    hips: pickWeightedBone(usage, ['Hips', 'mixamorigHips'], ['hips'], []),
  };
  const anchors = {
    head: getNode('ZW_Anchor_Head') || bones.head,
    rightHand: pickWeightedBone(
      usage,
      ['Hand_R', 'mixamorigRightHand'],
      ['handr', 'righthand', 'mixamorigrighthand'],
      ['finger', 'thumb', 'index', 'middle', 'ring', 'pinky', 'little', 'prop'],
    ) || getNode('ZW_Anchor_RightHand') || getNode('Hand_Prop_R'),
    leftHand: pickWeightedBone(
      usage,
      ['Hand_L', 'mixamorigLeftHand'],
      ['handl', 'lefthand', 'mixamoriglefthand'],
      ['finger', 'thumb', 'index', 'middle', 'ring', 'pinky', 'little', 'prop'],
    ) || getNode('ZW_Anchor_LeftHand') || getNode('Hand_Prop_L'),
    chest: pickWeightedBone(
      usage,
      ['Chest', 'UpperChest', 'mixamorigSpine2'],
      ['chest', 'upperchest', 'mixamorigspine2'],
      [],
    ) || getNode('ZW_Anchor_Chest'),
  };
  root.userData.zwRigSelection = {
    source: 'highest-visible-skin-weight',
    selectionPolicy: 'ordered-deform-first',
    leftArm: bones.leftArm?.name || '',
    leftArmWeight: usage.weights.get(bones.leftArm) || 0,
    rightArm: bones.rightArm?.name || '',
    rightArmWeight: usage.weights.get(bones.rightArm) || 0,
    leftHand: anchors.leftHand?.name || '',
    rightHand: anchors.rightHand?.name || '',
    rejectedControlPreference: ['UpperArm_Anim_L', 'UpperArm_Anim_R'],
  };
  return { bones, anchors };
}

export async function createModularPlayerVisual(customInput, renderer, options = {}) {
  const custom = ensurePlayerCustom(customInput || {});
  const loaded = await loadModel(options.modelUrl || PLAYER_MODEL_URL, renderer);
  if (!loaded?.scene) return null;
  let model;
  try { model = skeletonClone(loaded.scene); }
  catch { model = loaded.scene.clone(true); }
  model.name = 'ZW_ModularPlayerModel';
  cloneMaterials(model);

  const group = new THREE.Group();
  group.name = options.name || 'modular-player:Sunbox-male-free';
  group.userData.characterRole = 'player';
  group.userData.sourcePack = 'sunbox-male-free';
  group.userData.zwVisualOwner = 'modular';
  group.add(model);

  const rig = findRig(model);
  const instance = {
    group,
    model,
    materials: materialsByName(model),
    bones: rig.bones,
    anchors: rig.anchors,
    custom,
    normalized: null,
    blinkPhase: Math.random() * 4,
    externalHairKey: null,
    jewelryKey: null,
    attachmentLayer: null,
    updateToken: 0,
  };
  setSlotVisibility(model, custom);
  applyMorphs(model, custom);
  await applyMaterials(instance, custom, renderer);
  instance.normalized = normalizeVisibleModel(model, custom);
  if (!instance.normalized) return null;
  await updateModularAttachments(instance, custom, renderer);
  return instance;
}

export async function updateModularPlayerVisual(instance, customInput, renderer) {
  if (!instance?.group || !instance.model) return false;
  const token = ++instance.updateToken;
  const custom = ensurePlayerCustom(customInput || {});
  instance.custom = custom;
  setSlotVisibility(instance.model, custom);
  applyMorphs(instance.model, custom);
  await applyMaterials(instance, custom, renderer);
  if (token !== instance.updateToken) return false;
  const previousScale = instance.normalized?.scale || 0;
  instance.normalized = normalizeVisibleModel(instance.model, custom);
  if (!instance.normalized) return false;
  if (Math.abs(previousScale - instance.normalized.scale) > 0.000001) {
    instance.externalHairKey = null;
    instance.jewelryKey = null;
  }
  await updateModularAttachments(instance, custom, renderer);
  return token === instance.updateToken;
}

export function tickModularPlayerVisual(instance, elapsed) {
  if (!instance?.group) return;
  const cycle = (elapsed + instance.blinkPhase) % 4.6;
  let blink = 0;
  if (cycle > 4.25 && cycle < 4.38) blink = Math.sin(((cycle - 4.25) / 0.13) * Math.PI);
  setMorph(instance.model || instance.group, 'Expression_Blink', blink);
  updateAttachmentTransforms(instance);
}

export function disposeModularPlayerVisual(instance) {
  if (!instance?.group) return;
  disposeModularAttachments(instance);
  instance.group.traverse((node) => {
    if (!node.isMesh) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) material?.dispose?.();
  });
}
