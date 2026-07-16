// ─────────────────────────────────────────────────────────────────────────────
// modularAttachments.js — cross-pack hair + jewelry fitted to canonical anchors.
//
// These attachments are intentionally independent of the Sunbox wardrobe nodes.
// They let existing uploaded hairstyles and Frostbox jewelry ride the modular
// player's head/chest bones without reviving the hidden procedural body.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { loadModel } from './assets.js';
import { assetUrl } from './manifest.js';
import { HAIR_GLTF, HAIR_COLORS } from './avatar.js';

const KIT_DIR = 'models/characters/mini-kit/';
const hairPrototypeCache = new Map();

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
      if (![size.x, size.y, size.z].every(Number.isFinite) || width <= 0 || size.y <= 0 || aspect > 2.2) return null;
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

function parentWorldScale(parent) {
  parent.updateWorldMatrix(true, false);
  const scale = new THREE.Vector3();
  parent.getWorldScale(scale);
  scale.x = Math.max(Math.abs(scale.x), 0.0001);
  scale.y = Math.max(Math.abs(scale.y), 0.0001);
  scale.z = Math.max(Math.abs(scale.z), 0.0001);
  return scale;
}

function removeNamed(parent, name) {
  const existing = parent?.children?.find((child) => child.name === name);
  if (existing) disposeTree(existing);
}

export function isLegacyAssetHair(styleId) {
  return !!HAIR_GLTF[styleId];
}

export async function updateLegacyHair(instance, custom, renderer) {
  const anchor = instance?.anchors?.head;
  if (!anchor) return false;
  const styleId = custom.modularHair;
  const desiredKey = isLegacyAssetHair(styleId) ? `${styleId}:${custom.hairColor || 'jet'}` : 'none';
  if (instance.externalHairKey === desiredKey) return desiredKey !== 'none';
  instance.externalHairKey = desiredKey;
  removeNamed(anchor, 'ZW_ExternalHairMount');
  if (desiredKey === 'none') return false;

  const prototype = await hairPrototype(styleId, renderer);
  if (!prototype || instance.externalHairKey !== desiredKey) return false;
  const cfg = HAIR_GLTF[styleId];
  const baked = cloneStaticGroup(prototype);
  const box = new THREE.Box3().setFromObject(baked);
  const size = box.getSize(new THREE.Vector3());
  const scaleWorld = parentWorldScale(anchor);
  const targetWorldWidth = 0.36;
  const localTargetWidth = targetWorldWidth / Math.max(scaleWorld.x, scaleWorld.z);
  const fit = (localTargetWidth / Math.max(size.x, size.z, 0.0001)) * (cfg.scaleMul ?? 1);
  const hairHeight = size.y * fit;

  const mount = new THREE.Group();
  mount.name = 'ZW_ExternalHairMount';
  mount.userData.zwAttachment = 'hair';
  mount.userData.zwItemId = styleId;
  const wrapper = new THREE.Group();
  wrapper.name = `ZW_ExternalHair_${styleId}`;
  wrapper.add(baked);
  wrapper.scale.setScalar(fit);
  wrapper.position.set(
    (cfg.xOffset ?? 0) / scaleWorld.x,
    (cfg.yOffset ?? 0) / scaleWorld.y - hairHeight * (cfg.seat ?? 0.5),
    (cfg.zOffset ?? 0) / scaleWorld.z,
  );
  wrapper.rotation.set(cfg.rotX ?? 0, cfg.rotY ?? 0, cfg.rotZ ?? 0);
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
  anchor.add(mount);
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
  if (!kind || kind === 'none') return group;

  const material = jewelryMaterial(kind);
  const thick = kind === 'cuban' ? 0.018 : 0.011;
  const points = [];
  for (let index = 0; index <= 24; index++) {
    const t = index / 24;
    const x = THREE.MathUtils.lerp(-0.18, 0.18, t);
    const front = Math.sin(Math.PI * t);
    points.push(new THREE.Vector3(x, -0.02 - front * 0.14, 0.02 + front * 0.08));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  const chain = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, thick, 8, false), material);
  chain.name = `ZW_Chain_${kind}`;
  chain.castShadow = true;
  group.add(chain);

  const pendant = new THREE.Group();
  pendant.name = `ZW_Pendant_${kind}`;
  pendant.position.set(0, -0.27, 0.115);
  if (kind === 'iced') {
    const gemMaterial = new THREE.MeshPhysicalMaterial({
      color: '#dff5ff', roughness: 0.02, transmission: 0.35, metalness: 0.08,
      clearcoat: 1, clearcoatRoughness: 0, emissive: '#8edfff', emissiveIntensity: 0.12,
    });
    const setting = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 1), material);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.043, 1), gemMaterial);
    gem.position.z = 0.018;
    pendant.add(setting, gem);
  } else {
    const tag = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.018, 20), material);
    tag.rotation.x = Math.PI / 2;
    pendant.add(tag);
  }
  pendant.traverse((node) => { if (node.isMesh) node.castShadow = true; });
  group.add(pendant);
  return group;
}

export function updateJewelry(instance, custom) {
  const anchor = instance?.anchors?.chest;
  if (!anchor) return false;
  const kind = custom.jewelry || 'none';
  if (instance.jewelryKey === kind) return kind !== 'none';
  instance.jewelryKey = kind;
  removeNamed(anchor, 'ZW_ModularJewelryMount');
  if (kind === 'none') return false;

  const mount = buildJewelry(kind);
  const scaleWorld = parentWorldScale(anchor);
  mount.scale.set(1 / scaleWorld.x, 1 / scaleWorld.y, 1 / scaleWorld.z);
  mount.position.set(0, -0.055 / scaleWorld.y, 0.105 / scaleWorld.z);
  anchor.add(mount);
  return true;
}

export async function updateModularAttachments(instance, custom, renderer) {
  await updateLegacyHair(instance, custom, renderer);
  updateJewelry(instance, custom);
}

export function disposeModularAttachments(instance) {
  removeNamed(instance?.anchors?.head, 'ZW_ExternalHairMount');
  removeNamed(instance?.anchors?.chest, 'ZW_ModularJewelryMount');
  if (instance) {
    instance.externalHairKey = null;
    instance.jewelryKey = null;
  }
}
