// ─────────────────────────────────────────────────────────────────────────────
// modularAttachments.js — cross-pack hair + jewelry on canonical body sockets.
//
// Imported bones use pack-specific axes. Attachments live in a Zaylins-owned,
// world-scale layer and follow measured body sockets instead of inheriting those
// axes. Hair is seated from the actual crown bounds; jewelry is seated on the
// measured front chest surface.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { loadModel } from './assets.js';
import { assetUrl } from './manifest.js';
import { HAIR_GLTF, HAIR_COLORS } from './avatar.js';

const KIT_DIR = 'models/characters/mini-kit/';
const hairPrototypeCache = new Map();
const tempWorld = new THREE.Vector3();
const tempVertex = new THREE.Vector3();

const MODULAR_HAIR_FIT = Object.freeze({
  'gltf-buzzed': Object.freeze({ widthMul: 1.03, heightMul: 0.62, crownSeat: 0.82, z: 0.006 }),
  'gltf-buzzed-f': Object.freeze({ widthMul: 1.04, heightMul: 0.70, crownSeat: 0.83, z: 0.006 }),
  'gltf-parted': Object.freeze({ widthMul: 1.08, heightMul: 0.86, crownSeat: 0.86, z: 0.01 }),
  'gltf-long': Object.freeze({ widthMul: 1.10, heightMul: 1.75, crownSeat: 0.90, z: 0.018 }),
  'gltf-buns': Object.freeze({ widthMul: 1.15, heightMul: 1.12, crownSeat: 0.66, z: 0.006 }),
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
    if (!node.isMesh) return;
    const source = node.geometry;
    const position = source?.attributes?.position;
    if (!position) return;
    const positions = new Float32Array(position.count * 3);
    for (let index = 0; index < position.count; index++) {
      if (typeof node.getVertexPosition === 'function') node.getVertexPosition(index, vertex);
      else {
        vertex.fromBufferAttribute(position, index);
        if (node.isSkinnedMesh) node.applyBoneTransform(index, vertex);
      }
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
    const mesh = new THREE.Mesh(geometry, node.material);
    mesh.name = node.name || 'ZW_ExternalHairMesh';
    out.add(mesh);
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
    node.frustumCulled = true;
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
      if (![size.x, size.y, size.z].every(Number.isFinite) || width <= 0 || size.y <= 0) return null;
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

function socketMetricKey(custom = {}) {
  const face = Object.values(custom.faceMorphs || {}).map((value) => Number(value || 0).toFixed(2)).join(',');
  return [custom.heightScale, custom.bodyMass, custom.bodyMuscle, face].join('|');
}

function measuredBodySockets(instance, custom = instance?.custom || {}) {
  const key = socketMetricKey(custom);
  if (instance?.socketMetrics?.key === key) return instance.socketMetrics;
  const body = instance?.model?.getObjectByName('ZW_Player_Body');
  const position = body?.geometry?.attributes?.position;
  if (!body || !position) return null;

  instance.group.updateMatrixWorld(true);
  body.updateMatrixWorld(true);
  const all = new THREE.Box3().makeEmpty();
  const sample = (index) => {
    if (typeof body.getVertexPosition === 'function') body.getVertexPosition(index, tempVertex);
    else {
      tempVertex.fromBufferAttribute(position, index);
      if (body.isSkinnedMesh) body.applyBoneTransform(index, tempVertex);
    }
    body.localToWorld(tempVertex);
    instance.group.worldToLocal(tempVertex);
    return tempVertex;
  };
  for (let index = 0; index < position.count; index++) all.expandByPoint(sample(index));
  const size = all.getSize(new THREE.Vector3());
  const center = all.getCenter(new THREE.Vector3());
  const head = new THREE.Box3().makeEmpty();
  const chest = new THREE.Box3().makeEmpty();
  const headFloor = all.min.y + size.y * 0.76;
  const chestFloor = all.min.y + size.y * 0.54;
  const chestCeil = all.min.y + size.y * 0.78;
  for (let index = 0; index < position.count; index++) {
    const vertex = sample(index);
    const central = Math.abs(vertex.x - center.x) < size.y * 0.20;
    if (central && vertex.y >= headFloor) head.expandByPoint(vertex);
    if (central && vertex.y >= chestFloor && vertex.y <= chestCeil) chest.expandByPoint(vertex);
  }
  if (head.isEmpty()) head.copy(all);
  if (chest.isEmpty()) chest.copy(all);
  const metrics = {
    key,
    body: all,
    head,
    chest,
    bodySize: size,
    headSize: head.getSize(new THREE.Vector3()),
    headCenter: head.getCenter(new THREE.Vector3()),
    chestCenter: chest.getCenter(new THREE.Vector3()),
  };
  instance.socketMetrics = metrics;
  return metrics;
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
  const metrics = measuredBodySockets(instance, custom);
  if (!metrics) return false;
  const cfg = HAIR_GLTF[styleId];
  const modularFit = MODULAR_HAIR_FIT[styleId] || { widthMul: 1.07, heightMul: 1, crownSeat: 0.84, z: 0 };
  const baked = cloneStaticGroup(prototype);
  const box = new THREE.Box3().setFromObject(baked);
  const size = box.getSize(new THREE.Vector3());
  const targetWidth = Math.max(0.18, metrics.headSize.x * modularFit.widthMul);
  const maxHeight = Math.max(0.18, metrics.headSize.y * modularFit.heightMul);
  const widthFit = targetWidth / Math.max(size.x, size.z, 0.0001);
  const heightFit = maxHeight / Math.max(size.y, 0.0001);
  const fit = Math.min(widthFit, heightFit);
  const hairHeight = size.y * fit;

  const mount = new THREE.Group();
  mount.name = 'ZW_ExternalHairMount';
  mount.userData.zwAttachment = 'hair';
  mount.userData.zwItemId = styleId;
  // The original mini-kit orientation already matches the Sunbox face. The prior
  // extra PI rotation made every hairstyle face the character's back.
  mount.rotation.set(cfg.rotX ?? 0, cfg.rotY ?? 0, cfg.rotZ ?? 0);
  anchorPosition(instance, instance.anchors.head, tempWorld);
  const targetBase = {
    x: metrics.headCenter.x + (cfg.xOffset ?? 0),
    y: metrics.head.max.y - hairHeight * modularFit.crownSeat + (cfg.yOffset ?? 0),
    z: metrics.headCenter.z + modularFit.z + (cfg.zOffset ?? 0),
  };
  mount.userData.zwOffset = {
    x: targetBase.x - tempWorld.x,
    y: targetBase.y - tempWorld.y,
    z: targetBase.z - tempWorld.z,
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
  if (!kind || kind === 'none') return group;

  const material = jewelryMaterial(kind);
  const thick = kind === 'cuban' ? 0.0105 : 0.0065;
  const halfWidth = kind === 'cuban' ? 0.135 : 0.128;
  const dropMax = kind === 'cuban' ? 0.105 : 0.112;
  const points = [];
  for (let index = 0; index <= 32; index++) {
    const t = index / 32;
    const x = THREE.MathUtils.lerp(-halfWidth, halfWidth, t);
    const drop = Math.sin(Math.PI * t);
    points.push(new THREE.Vector3(x, -drop * dropMax, 0));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  const chain = new THREE.Mesh(new THREE.TubeGeometry(curve, 56, thick, 8, false), material);
  chain.name = `ZW_Chain_${kind}`;
  chain.castShadow = true;
  group.add(chain);

  const bail = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0035, 6, 16), material);
  bail.name = `ZW_PendantBail_${kind}`;
  bail.position.set(0, -dropMax - 0.011, 0);
  group.add(bail);

  const pendant = new THREE.Group();
  pendant.name = `ZW_Pendant_${kind}`;
  pendant.position.set(0, -dropMax - 0.038, 0.002);
  if (kind === 'iced') {
    const gemMaterial = new THREE.MeshPhysicalMaterial({
      color: '#dff5ff', roughness: 0.02, transmission: 0.35, metalness: 0.08,
      clearcoat: 1, clearcoatRoughness: 0, emissive: '#8edfff', emissiveIntensity: 0.12,
    });
    const setting = new THREE.Mesh(new THREE.OctahedronGeometry(0.026, 1), material);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.018, 1), gemMaterial);
    gem.position.z = 0.008;
    pendant.add(setting, gem);
  } else {
    const tag = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.010, 20), material);
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
  const metrics = measuredBodySockets(instance, custom);
  if (!metrics) return false;
  const mount = buildJewelry(kind);
  anchorPosition(instance, instance.anchors.chest, tempWorld);
  // Screenshots confirmed Sunbox's visible front is +Z. Seat the necklace just
  // beyond the measured chest surface instead of guessing from the bone axis.
  const target = {
    x: metrics.chestCenter.x,
    y: metrics.chest.max.y - metrics.headSize.y * 0.18,
    z: metrics.chest.max.z + 0.018,
  };
  mount.userData.zwOffset = {
    x: target.x - tempWorld.x,
    y: target.y - tempWorld.y,
    z: target.z - tempWorld.z,
  };
  layer.add(mount);
  updateAttachmentTransforms(instance);
  return true;
}

export async function updateModularAttachments(instance, custom, renderer) {
  instance.socketMetrics = null;
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
    instance.socketMetrics = null;
  }
}
