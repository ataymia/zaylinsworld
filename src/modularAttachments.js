// ─────────────────────────────────────────────────────────────────────────────
// modularAttachments.js — cross-pack hair + jewelry on canonical world sockets.
//
// Imported bones often use pack-specific local axes. Attachments therefore live
// in an unscaled Zaylins-owned layer and FOLLOW bone positions while keeping a
// predictable player-facing orientation. This prevents chains from growing out
// of backs and old hair packs from arriving backwards or sideways.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { loadModel } from './assets.js';
import { assetUrl } from './manifest.js';
import { HAIR_GLTF, HAIR_COLORS } from './avatar.js';

const KIT_DIR = 'models/characters/mini-kit/';
const hairPrototypeCache = new Map();
const tempWorld = new THREE.Vector3();

// The old mini-kit styles were built around a different head. Width AND height
// are capped independently so a narrow source mesh can never become a giant egg.
const MODULAR_HAIR_FIT = Object.freeze({
  'gltf-buzzed': Object.freeze({ width: 0.245, maxHeight: 0.255, lift: 0.18, seat: 0.62 }),
  'gltf-buzzed-f': Object.freeze({ width: 0.25, maxHeight: 0.285, lift: 0.18, seat: 0.60 }),
  'gltf-parted': Object.freeze({ width: 0.275, maxHeight: 0.33, lift: 0.18, seat: 0.50 }),
  'gltf-long': Object.freeze({ width: 0.29, maxHeight: 0.58, lift: 0.18, seat: 0.48 }),
  'gltf-buns': Object.freeze({ width: 0.29, maxHeight: 0.37, lift: 0.18, seat: 0.48 }),
});

function disposeTree(root) {
  if (!root) return;
  root.traverse?.((node) => {
    if (!node.isMesh) return;
    node.geometry?.dispose?.();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) material?.dispose?.();
  });
  root.parent?.remove(root);
}

function bakeToStatic(root) {
  root.updateMatrixWorld(true);
  const out = new THREE.Group();
  const vertex = new THREE.Vector3();
  root.traverse((node) => {
    if (node.isSkinnedMesh) {
      const source = node.geometry;
      const position = source.attributes.position;
      if (!position) return;
      const positions = new Float32Array(position.count * 3);
      for (let index = 0; index < position.count; index++) {
        vertex.fromBufferAttribute(position, index);
        node.applyBoneTransform(index, vertex);
        node.localToWorld(vertex);
        positions[index * 3] = vertex.x;
        positions[index * 3 + 1] = vertex.y;
        positions[index * 3 + 2] = vertex.z;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      if (source.attributes.uv) geometry.setAttribute('uv', source.attributes.uv.clone());
      if (source.index) geometry.setIndex(source.index.clone());
      geometry.computeVertexNormals();
      out.add(new THREE.Mesh(geometry, node.material));
    } else if (node.isMesh) {
      const geometry = node.geometry.clone();
      geometry.applyMatrix4(node.matrixWorld);
      out.add(new THREE.Mesh(geometry, node.material));
    }
  });
  return out;
}

function cloneStaticGroup(source) {
  const clone = source.clone(true);
  clone.traverse((node) => {
    if (!node.isMesh) return;
    node.geometry = node.geometry?.clone?.() || node.geometry;
    if (Array.isArray(node.material)) node.material = node.material.map((material) => material?.clone?.() || material);
    else node.material = node.material?.clone?.() || node.material;
    node.castShadow = true;
    node.receiveShadow = true;
    node.frustumCulled = false;
  });
  return clone;
}

async function hairPrototype(styleId, renderer) {
  const cfg = HAIR_GLTF[styleId];
  if (!cfg) return null;
  if (!hairPrototypeCache.has(styleId)) {
    hairPrototypeCache.set(styleId, (async () => {
      const model = await loadModel(assetUrl(KIT_DIR + cfg.file), renderer);
      if (!model?.scene) return null;
      const cloned = skeletonClone(model.scene);
      const baked = bakeToStatic(cloned);
      const box = new THREE.Box3().setFromObject(baked);
      const size = box.getSize(new THREE.Vector3());
      const width = Math.max(size.x, size.z);
      const aspect = size.y / Math.max(width, 0.0001);
      if (![size.x, size.y, size.z].every(Number.isFinite) || width <= 0 || size.y <= 0 || aspect > 4.5) return null;
      const center = box.getCenter(new THREE.Vector3());
      baked.position.set(-center.x, -box.min.y, -center.z);
      baked.updateMatrixWorld(true);
      return baked;
    })());
  }
  return hairPrototypeCache.get(styleId);
}

function colorForHair(custom) {
  const entry = HAIR_COLORS.find((color) => color.id === custom.hairColor) || HAIR_COLORS[0];
  return new THREE.Color(entry?.color || '#15100c');
}

function attachmentLayer(instance) {
  if (instance.attachmentLayer) return instance.attachmentLayer;
  const layer = new THREE.Group();
  layer.name = 'ZW_ModularAttachmentLayer';
  layer.userData.zwAttachmentLayer = true;
  instance.group.add(layer);
  instance.attachmentLayer = layer;
  return layer;
}

function removeNamed(parent, name) {
  const existing = parent?.children?.find((child) => child.name === name);
  if (existing) disposeTree(existing);
}

function anchorPosition(instance, anchor, target) {
  if (!instance?.group || !anchor) return target.set(0, 0, 0);
  instance.group.updateMatrixWorld(true);
  anchor.getWorldPosition(target);
  return instance.group.worldToLocal(target);
}

export function updateAttachmentTransforms(instance) {
  const layer = instance?.attachmentLayer;
  if (!layer) return;
  const hair = layer.getObjectByName('ZW_ExternalHairMount');
  if (hair && instance.anchors?.head) {
    anchorPosition(instance, instance.anchors.head, tempWorld);
    const offset = hair.userData.zwOffset || { x: 0, y: 0, z: 0 };
    hair.position.set(tempWorld.x + offset.x, tempWorld.y + offset.y, tempWorld.z + offset.z);
  }
  const jewelry = layer.getObjectByName('ZW_ModularJewelryMount');
  if (jewelry && instance.anchors?.chest) {
    anchorPosition(instance, instance.anchors.chest, tempWorld);
    const offset = jewelry.userData.zwOffset || { x: 0, y: 0, z: 0 };
    jewelry.position.set(tempWorld.x + offset.x, tempWorld.y + offset.y, tempWorld.z + offset.z);
  }
}

export function isLegacyAssetHair(styleId) {
  return !!HAIR_GLTF[styleId];
}

export async function updateLegacyHair(instance, custom, renderer) {
  if (!instance?.anchors?.head) return false;
  const styleId = custom.modularHair;
  const desiredKey = isLegacyAssetHair(styleId) ? `${styleId}:${custom.hairColor || 'jet'}` : 'none';
  if (instance.externalHairKey === desiredKey) return desiredKey !== 'none';
  instance.externalHairKey = desiredKey;
  const layer = attachmentLayer(instance);
  removeNamed(layer, 'ZW_ExternalHairMount');
  if (desiredKey === 'none') return false;

  const prototype = await hairPrototype(styleId, renderer);
  if (!prototype || instance.externalHairKey !== desiredKey) return false;
  const cfg = HAIR_GLTF[styleId];
  const modularFit = MODULAR_HAIR_FIT[styleId] || { width: 0.27, maxHeight: 0.4, lift: 0.18, seat: cfg.seat ?? 0.5 };
  const baked = cloneStaticGroup(prototype);
  const box = new THREE.Box3().setFromObject(baked);
  const size = box.getSize(new THREE.Vector3());
  const widthFit = modularFit.width / Math.max(size.x, size.z, 0.0001);
  const heightFit = modularFit.maxHeight / Math.max(size.y, 0.0001);
  const fit = Math.min(widthFit, heightFit) * (cfg.scaleMul ?? 1);
  const hairHeight = size.y * fit;

  const mount = new THREE.Group();
  mount.name = 'ZW_ExternalHairMount';
  mount.userData.zwAttachment = 'hair';
  mount.userData.zwItemId = styleId;
  // The Kenney mini-kit faces the opposite way from the Sunbox player.
  mount.rotation.set(cfg.rotX ?? 0, Math.PI + (cfg.rotY ?? 0), cfg.rotZ ?? 0);
  mount.userData.zwOffset = {
    x: cfg.xOffset ?? 0,
    y: modularFit.lift + (cfg.yOffset ?? 0) - hairHeight * modularFit.seat,
    // Old configs define +Z as forward. The modular player faces -Z.
    z: -(cfg.zOffset ?? 0),
  };

  const wrapper = new THREE.Group();
  wrapper.name = `ZW_ExternalHair_${styleId}`;
  wrapper.add(baked);
  wrapper.scale.setScalar(fit);
  const tint = colorForHair(custom);
  baked.traverse((node) => {
    if (!node.isMesh) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) {
      if (material?.color) material.color.copy(tint);
      if (material) material.needsUpdate = true;
    }
  });
  mount.add(wrapper);
  layer.add(mount);
  updateAttachmentTransforms(instance);
  return true;
}

function jewelryMaterial(kind) {
  const iced = kind === 'iced';
  return new THREE.MeshPhysicalMaterial({
    color: iced ? '#edf6ff' : '#f1c84b',
    metalness: 1,
    roughness: iced ? 0.08 : 0.16,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    envMapIntensity: 1.8,
  });
}

function buildJewelry(kind) {
  const group = new THREE.Group();
  group.name = 'ZW_ModularJewelryMount';
  group.userData.zwAttachment = 'jewelry';
  group.userData.zwItemId = kind;
  group.userData.zwOffset = { x: 0, y: 0.045, z: 0 };
  if (!kind || kind === 'none') return group;

  const material = jewelryMaterial(kind);
  const thick = kind === 'cuban' ? 0.014 : 0.0085;
  const points = [];
  for (let index = 0; index <= 28; index++) {
    const t = index / 28;
    const x = THREE.MathUtils.lerp(-0.15, 0.15, t);
    const drop = Math.sin(Math.PI * t);
    // Sunbox front is negative Z. Keep the full necklace in front of the chest.
    points.push(new THREE.Vector3(x, -drop * 0.125, -0.018 - drop * 0.055));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  const chain = new THREE.Mesh(new THREE.TubeGeometry(curve, 52, thick, 8, false), material);
  chain.name = `ZW_Chain_${kind}`;
  chain.castShadow = true;
  group.add(chain);

  const pendant = new THREE.Group();
  pendant.name = `ZW_Pendant_${kind}`;
  pendant.position.set(0, -0.205, -0.08);
  if (kind === 'iced') {
    const gemMaterial = new THREE.MeshPhysicalMaterial({
      color: '#dff5ff', roughness: 0.02, transmission: 0.35, metalness: 0.08,
      clearcoat: 1, clearcoatRoughness: 0, emissive: '#8edfff', emissiveIntensity: 0.12,
    });
    const setting = new THREE.Mesh(new THREE.OctahedronGeometry(0.044, 1), material);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.032, 1), gemMaterial);
    gem.position.z = -0.012;
    pendant.add(setting, gem);
  } else {
    const tag = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.014, 20), material);
    tag.rotation.x = Math.PI / 2;
    pendant.add(tag);
  }
  pendant.traverse((node) => { if (node.isMesh) node.castShadow = true; });
  group.add(pendant);
  return group;
}

export function updateJewelry(instance, custom) {
  if (!instance?.anchors?.chest) return false;
  const kind = custom.jewelry || 'none';
  if (instance.jewelryKey === kind) return kind !== 'none';
  instance.jewelryKey = kind;
  const layer = attachmentLayer(instance);
  removeNamed(layer, 'ZW_ModularJewelryMount');
  if (kind === 'none') return false;
  layer.add(buildJewelry(kind));
  updateAttachmentTransforms(instance);
  return true;
}

export async function updateModularAttachments(instance, custom, renderer) {
  await updateLegacyHair(instance, custom, renderer);
  updateJewelry(instance, custom);
  updateAttachmentTransforms(instance);
}

export function disposeModularAttachments(instance) {
  removeNamed(instance?.attachmentLayer, 'ZW_ExternalHairMount');
  removeNamed(instance?.attachmentLayer, 'ZW_ModularJewelryMount');
  if (instance?.attachmentLayer) {
    instance.group?.remove(instance.attachmentLayer);
    instance.attachmentLayer = null;
  }
  if (instance) {
    instance.externalHairKey = null;
    instance.jewelryKey = null;
  }
}
