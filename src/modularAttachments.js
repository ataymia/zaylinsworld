// ─────────────────────────────────────────────────────────────────────────────
// modularAttachments.js — landmark-fitted cross-pack hair + draped jewelry.
//
// Hair is not treated as one rigid helmet. Every supported asset has normalized
// source landmarks (forehead, crown, temples, ears, back scalp and nape) that are
// warped onto the current player's measured head landmarks. Jewelry is generated
// as individual alternating links along a chest-surface curve, with a connected
// bail and pendant, rather than a flat tube intersecting the torso.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { loadModel } from './assets.js';
import { assetUrl } from './manifest.js';
import { HAIR_GLTF, HAIR_COLORS } from './avatar.js';
import {
  HEAD_LANDMARK_NAMES,
  JEWELRY_FIT,
  hairFitProfile,
} from './config/avatarAttachmentFit.js';

const KIT_DIR = 'models/characters/mini-kit/';
const hairPrototypeCache = new Map();
const tempVertex = new THREE.Vector3();
const tempWorldPosition = new THREE.Vector3();
const tempAnchorPosition = new THREE.Vector3();
const tempGroupQuaternion = new THREE.Quaternion();
const tempAnchorQuaternion = new THREE.Quaternion();
const tempLocalQuaternion = new THREE.Quaternion();
const X_AXIS = new THREE.Vector3(1, 0, 0);

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

async function hairPrototype(styleId, renderer) {
  const cfg = HAIR_GLTF[styleId];
  if (!cfg) return null;
  if (!hairPrototypeCache.has(styleId)) {
    hairPrototypeCache.set(styleId, (async () => {
      try {
        const model = await loadModel(assetUrl(KIT_DIR + cfg.file), renderer);
        if (!model?.scene) return null;
        const cloned = skeletonClone(model.scene);
        const baked = bakeToStatic(cloned);
        const box = new THREE.Box3().setFromObject(baked);
        const size = box.getSize(new THREE.Vector3());
        if (![size.x, size.y, size.z].every(Number.isFinite) || Math.max(size.x, size.z) <= 0 || size.y <= 0) return null;
        const center = box.getCenter(new THREE.Vector3());
        baked.position.set(-center.x, -box.min.y, -center.z);
        baked.updateMatrixWorld(true);
        return baked;
      } catch (error) {
        console.warn('[modular-attachments] hair prototype failed', styleId, error);
        return null;
      }
    })());
  }
  const result = await hairPrototypeCache.get(styleId);
  if (!result) hairPrototypeCache.delete(styleId);
  return result;
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

function findNamed(parent, name) {
  return parent?.children?.find((child) => child.name === name) || null;
}

function removeNamed(parent, name) {
  const existing = findNamed(parent, name);
  if (existing) disposeTree(existing);
}

function anchorLocalPose(instance, anchor, positionTarget, quaternionTarget) {
  if (!instance?.group || !anchor) {
    positionTarget?.set(0, 0, 0);
    quaternionTarget?.identity();
    return false;
  }
  instance.group.updateMatrixWorld(true);
  anchor.updateWorldMatrix(true, false);
  if (positionTarget) {
    anchor.getWorldPosition(tempWorldPosition);
    positionTarget.copy(tempWorldPosition);
    instance.group.worldToLocal(positionTarget);
  }
  if (quaternionTarget) {
    instance.group.getWorldQuaternion(tempGroupQuaternion);
    anchor.getWorldQuaternion(tempAnchorQuaternion);
    quaternionTarget.copy(tempGroupQuaternion).invert().multiply(tempAnchorQuaternion);
  }
  return true;
}

function captureAnchorRest(instance, mount, anchor, kind) {
  anchorLocalPose(instance, anchor, tempAnchorPosition, tempLocalQuaternion);
  mount.userData.zwAnchorKind = kind;
  mount.userData.zwAnchorOffset = [0, 0, 0];
  mount.userData.zwAnchorRestQuaternion = tempLocalQuaternion.toArray();
  mount.userData.zwSwaySeed = Math.random() * Math.PI * 2;
  mount.position.copy(tempAnchorPosition);
  mount.quaternion.identity();
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
  const headFloor = all.min.y + size.y * 0.75;
  const chestFloor = all.min.y + size.y * 0.53;
  const chestCeil = all.min.y + size.y * 0.79;
  for (let index = 0; index < position.count; index++) {
    const vertex = sample(index);
    const central = Math.abs(vertex.x - center.x) < size.y * 0.22;
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
    chestSize: chest.getSize(new THREE.Vector3()),
    chestCenter: chest.getCenter(new THREE.Vector3()),
    fallback: false,
  };
  instance.socketMetrics = metrics;
  return metrics;
}

function fallbackBodySockets(instance, custom = instance?.custom || {}) {
  const key = socketMetricKey(custom);
  const targetHeight = instance?.normalized?.targetHeight
    || 1.78 * THREE.MathUtils.clamp(Number(custom.heightScale) || 1, 0.82, 1.18);
  const headCenter = new THREE.Vector3();
  const chestCenter = new THREE.Vector3();
  anchorLocalPose(instance, instance?.anchors?.head, headCenter, null);
  anchorLocalPose(instance, instance?.anchors?.chest, chestCenter, null);
  const headSize = new THREE.Vector3(targetHeight * 0.125, targetHeight * 0.15, targetHeight * 0.115);
  const chestSize = new THREE.Vector3(targetHeight * 0.25, targetHeight * 0.23, targetHeight * 0.15);
  const head = new THREE.Box3(
    headCenter.clone().addScaledVector(headSize, -0.5),
    headCenter.clone().addScaledVector(headSize, 0.5),
  );
  const chest = new THREE.Box3(
    chestCenter.clone().addScaledVector(chestSize, -0.5),
    chestCenter.clone().addScaledVector(chestSize, 0.5),
  );
  const bodySize = new THREE.Vector3(targetHeight * 0.34, targetHeight, targetHeight * 0.20);
  const body = new THREE.Box3(
    new THREE.Vector3(-bodySize.x * 0.5, 0, -bodySize.z * 0.5),
    new THREE.Vector3(bodySize.x * 0.5, targetHeight, bodySize.z * 0.5),
  );
  const metrics = { key, body, head, chest, bodySize, headSize, headCenter, chestSize, chestCenter, fallback: true };
  instance.socketMetrics = metrics;
  return metrics;
}

function bodySockets(instance, custom) {
  return measuredBodySockets(instance, custom) || fallbackBodySockets(instance, custom);
}

function targetHeadLandmarks(metrics, profile) {
  const center = metrics.headCenter;
  const size = metrics.headSize;
  const halfWidth = Math.max(size.x * 0.5 * profile.widthMul, 0.12);
  const halfDepth = Math.max(size.z * 0.5 * profile.depthMul, 0.105);
  const crownY = metrics.head.max.y + size.y * profile.topLift;
  const foreheadY = center.y + size.y * 0.10;
  const templeY = center.y + size.y * 0.02;
  const earY = center.y - size.y * 0.08;
  const napeY = metrics.head.min.y - size.y * profile.bottomDrop;
  const frontZ = center.z + halfDepth + profile.frontClearance;
  const backZ = center.z - halfDepth - profile.backClearance;
  const leftX = center.x - halfWidth - profile.templeClearance;
  const rightX = center.x + halfWidth + profile.templeClearance;
  return Object.freeze({
    crown: new THREE.Vector3(center.x, crownY, center.z - size.z * 0.03),
    forehead: new THREE.Vector3(center.x, foreheadY, frontZ),
    leftTemple: new THREE.Vector3(leftX, templeY, center.z + size.z * 0.12),
    rightTemple: new THREE.Vector3(rightX, templeY, center.z + size.z * 0.12),
    leftEar: new THREE.Vector3(leftX - profile.earClearance, earY, center.z),
    rightEar: new THREE.Vector3(rightX + profile.earClearance, earY, center.z),
    backScalp: new THREE.Vector3(center.x, center.y, backZ),
    nape: new THREE.Vector3(center.x, napeY, backZ - profile.napeBack),
  });
}

function normalizedCoordinates(point, box, target = new THREE.Vector3()) {
  const size = box.getSize(new THREE.Vector3());
  return target.set(
    size.x > 0 ? ((point.x - box.min.x) / size.x) * 2 - 1 : 0,
    size.y > 0 ? (point.y - box.min.y) / size.y : 0,
    size.z > 0 ? ((point.z - box.min.z) / size.z) * 2 - 1 : 0,
  );
}

function targetBoxFromLandmarks(landmarks) {
  const box = new THREE.Box3().makeEmpty();
  for (const name of HEAD_LANDMARK_NAMES) box.expandByPoint(landmarks[name]);
  return box;
}

function baseMapToTarget(normalized, targetBox, target = new THREE.Vector3()) {
  return target.set(
    THREE.MathUtils.lerp(targetBox.min.x, targetBox.max.x, (normalized.x + 1) * 0.5),
    THREE.MathUtils.lerp(targetBox.min.y, targetBox.max.y, normalized.y),
    THREE.MathUtils.lerp(targetBox.min.z, targetBox.max.z, (normalized.z + 1) * 0.5),
  );
}

function warpPointToLandmarks(point, sourceBox, targetBox, sourceLandmarks, targetLandmarks, power, target = new THREE.Vector3()) {
  const normalized = normalizedCoordinates(point, sourceBox, new THREE.Vector3());
  baseMapToTarget(normalized, targetBox, target);
  const displacement = new THREE.Vector3();
  let totalWeight = 0;
  for (const name of HEAD_LANDMARK_NAMES) {
    const sourceNormalized = new THREE.Vector3(...sourceLandmarks[name]);
    const dx = normalized.x - sourceNormalized.x;
    const dy = normalized.y - sourceNormalized.y;
    const dz = normalized.z - sourceNormalized.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const weight = 1 / (0.035 + Math.pow(distance, power));
    const sourceMapped = baseMapToTarget(sourceNormalized, targetBox, new THREE.Vector3());
    displacement.addScaledVector(targetLandmarks[name].clone().sub(sourceMapped), weight);
    totalWeight += weight;
  }
  if (totalWeight > 0) target.addScaledVector(displacement, 1 / totalWeight);
  return target;
}

function warpHairPrototype(prototype, metrics, profile, anchorPosition, tint) {
  prototype.updateMatrixWorld(true);
  const sourceBox = new THREE.Box3().setFromObject(prototype);
  const sourceSize = sourceBox.getSize(new THREE.Vector3());
  if (![sourceSize.x, sourceSize.y, sourceSize.z].every(Number.isFinite) || sourceSize.x <= 0 || sourceSize.y <= 0 || sourceSize.z <= 0) {
    throw new Error('invalid hair source bounds');
  }
  const targetLandmarks = targetHeadLandmarks(metrics, profile);
  const targetBox = targetBoxFromLandmarks(targetLandmarks);
  const warped = new THREE.Group();
  warped.name = 'ZW_LandmarkWarpedHair';

  prototype.traverse((node) => {
    if (!node.isMesh) return;
    const source = node.geometry;
    const position = source?.attributes?.position;
    if (!position) return;
    const positions = new Float32Array(position.count * 3);
    for (let index = 0; index < position.count; index++) {
      tempVertex.fromBufferAttribute(position, index);
      node.localToWorld(tempVertex);
      warpPointToLandmarks(tempVertex, sourceBox, targetBox, profile.sourceLandmarks, targetLandmarks, profile.influencePower, tempVertex);
      tempVertex.sub(anchorPosition);
      positions[index * 3] = tempVertex.x;
      positions[index * 3 + 1] = tempVertex.y;
      positions[index * 3 + 2] = tempVertex.z;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    if (source.attributes.uv) geometry.setAttribute('uv', source.attributes.uv.clone());
    if (source.index) geometry.setIndex(source.index.clone());
    geometry.computeVertexNormals();
    const sourceMaterials = Array.isArray(node.material) ? node.material : [node.material];
    const clonedMaterials = sourceMaterials.map((material) => {
      const clone = material?.clone?.() || material;
      if (clone?.color) clone.color.copy(tint);
      if (clone) clone.needsUpdate = true;
      return clone;
    });
    const mesh = new THREE.Mesh(geometry, Array.isArray(node.material) ? clonedMaterials : clonedMaterials[0]);
    mesh.name = node.name || 'ZW_LandmarkHairMesh';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    warped.add(mesh);
  });

  if (!warped.children.length) throw new Error('hair asset produced no renderable meshes');
  warped.userData.zwHeadLandmarks = Object.fromEntries(HEAD_LANDMARK_NAMES.map((name) => [name, targetLandmarks[name].toArray()]));
  return warped;
}

function updateMountedAttachment(instance, mount, anchor, elapsedSeconds = 0) {
  if (!mount || !anchor) return;
  anchorLocalPose(instance, anchor, tempAnchorPosition, tempLocalQuaternion);
  const offset = mount.userData.zwAnchorOffset || [0, 0, 0];
  mount.position.copy(tempAnchorPosition).add(new THREE.Vector3(...offset));
  const rest = new THREE.Quaternion().fromArray(mount.userData.zwAnchorRestQuaternion || [0, 0, 0, 1]);
  const delta = tempLocalQuaternion.clone().multiply(rest.invert());
  if (mount.userData.zwAttachment === 'jewelry') {
    const seed = mount.userData.zwSwaySeed || 0;
    const sway = Math.sin(elapsedSeconds * 2.2 + seed) * 0.006;
    delta.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), sway));
  }
  mount.quaternion.copy(delta);
}

export function updateAttachmentTransforms(instance, elapsedSeconds = 0) {
  const layer = instance?.attachmentLayer;
  if (!layer) return;
  updateMountedAttachment(instance, findNamed(layer, 'ZW_ExternalHairMount'), instance.anchors?.head, elapsedSeconds);
  updateMountedAttachment(instance, findNamed(layer, 'ZW_ModularJewelryMount'), instance.anchors?.chest, elapsedSeconds);
}

export function isLegacyAssetHair(styleId) {
  return !!HAIR_GLTF[styleId];
}

export async function updateLegacyHair(instance, custom, renderer) {
  if (!instance?.anchors?.head) return false;
  const styleId = custom.modularHair;
  const fitKey = socketMetricKey(custom);
  const desiredKey = isLegacyAssetHair(styleId) ? `${styleId}:${custom.hairColor || 'jet'}:${fitKey}:landmark-v1` : 'none';
  const layer = attachmentLayer(instance);
  const existing = findNamed(layer, 'ZW_ExternalHairMount');

  if (desiredKey === 'none') {
    instance.externalHairRequest = (instance.externalHairRequest || 0) + 1;
    removeNamed(layer, 'ZW_ExternalHairMount');
    instance.externalHairKey = 'none';
    return false;
  }
  if (instance.externalHairKey === desiredKey && existing) return true;

  const request = (instance.externalHairRequest || 0) + 1;
  instance.externalHairRequest = request;
  removeNamed(layer, 'ZW_ExternalHairMount');
  instance.externalHairKey = null;

  try {
    const prototype = await hairPrototype(styleId, renderer);
    if (!prototype || instance.externalHairRequest !== request) return false;
    const metrics = bodySockets(instance, custom);
    const profile = hairFitProfile(styleId);
    anchorLocalPose(instance, instance.anchors.head, tempAnchorPosition, tempLocalQuaternion);
    const mount = new THREE.Group();
    mount.name = 'ZW_ExternalHairMount';
    mount.userData.zwAttachment = 'hair';
    mount.userData.zwItemId = styleId;
    mount.userData.zwFitKey = fitKey;
    mount.userData.zwFitContract = 'head-landmarks-v1';
    mount.userData.zwFallbackSocket = metrics.fallback;
    mount.add(warpHairPrototype(prototype, metrics, profile, tempAnchorPosition.clone(), colorForHair(custom)));
    captureAnchorRest(instance, mount, instance.anchors.head, 'head');

    if (instance.externalHairRequest !== request) {
      disposeTree(mount);
      return false;
    }
    layer.add(mount);
    instance.externalHairKey = desiredKey;
    updateAttachmentTransforms(instance);
    return true;
  } catch (error) {
    console.warn('[modular-attachments] landmark hair mount failed', styleId, error);
    removeNamed(layer, 'ZW_ExternalHairMount');
    instance.externalHairKey = null;
    return false;
  }
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

function jewelryLandmarks(metrics, fit) {
  const width = Math.max(metrics.chestSize.x, metrics.headSize.x * 1.7);
  const halfWidth = width * 0.31;
  const topY = metrics.chest.max.y - metrics.chestSize.y * 0.08;
  const centerY = topY - fit.drop;
  const frontZ = metrics.chest.max.z + fit.chestClearance;
  return {
    leftCollar: new THREE.Vector3(metrics.chestCenter.x - halfWidth, topY, frontZ),
    leftChest: new THREE.Vector3(metrics.chestCenter.x - halfWidth * 0.52, topY - fit.drop * 0.55, frontZ + 0.008),
    pendantHang: new THREE.Vector3(metrics.chestCenter.x, centerY, frontZ + 0.014),
    rightChest: new THREE.Vector3(metrics.chestCenter.x + halfWidth * 0.52, topY - fit.drop * 0.55, frontZ + 0.008),
    rightCollar: new THREE.Vector3(metrics.chestCenter.x + halfWidth, topY, frontZ),
  };
}

function makeChainLink(material, fit, kind, index) {
  const link = new THREE.Mesh(new THREE.TorusGeometry(fit.linkRadius, fit.linkTube, 5, kind === 'cuban' ? 12 : 10), material);
  link.name = `ZW_ChainLink_${kind}_${index}`;
  link.castShadow = true;
  if (kind === 'cuban') link.scale.set(1.28, 0.72, 0.72);
  else link.scale.set(1.10, 0.82, 0.82);
  return link;
}

function buildJewelry(kind, metrics, anchorPosition) {
  const fit = JEWELRY_FIT[kind] || JEWELRY_FIT.chain;
  const material = jewelryMaterial(kind);
  const landmarks = jewelryLandmarks(metrics, fit);
  const points = [landmarks.leftCollar, landmarks.leftChest, landmarks.pendantHang, landmarks.rightChest, landmarks.rightCollar]
    .map((point) => point.clone().sub(anchorPosition));
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);
  const group = new THREE.Group();
  group.name = 'ZW_ModularJewelryMount';
  group.userData.zwAttachment = 'jewelry';
  group.userData.zwItemId = kind;
  group.userData.zwFitContract = 'chest-landmarks-v1';
  group.userData.zwJewelryLandmarks = Object.fromEntries(Object.entries(landmarks).map(([name, point]) => [name, point.toArray()]));

  for (let index = 0; index < fit.links; index++) {
    const t = fit.links <= 1 ? 0.5 : index / (fit.links - 1);
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const link = makeChainLink(material, fit, kind, index);
    link.position.copy(point);
    const align = new THREE.Quaternion().setFromUnitVectors(X_AXIS, tangent);
    const alternatingTwist = new THREE.Quaternion().setFromAxisAngle(X_AXIS, index % 2 ? Math.PI * 0.5 : 0);
    link.quaternion.copy(align).multiply(alternatingTwist);
    group.add(link);
  }

  const centerPoint = curve.getPointAt(0.5);
  const bail = new THREE.Mesh(new THREE.TorusGeometry(fit.linkRadius * 0.72, fit.linkTube, 5, 12), material);
  bail.name = `ZW_PendantBail_${kind}`;
  bail.position.copy(centerPoint).add(new THREE.Vector3(0, -fit.linkRadius * 1.35, 0.002));
  bail.rotation.x = Math.PI * 0.5;
  bail.castShadow = true;
  group.add(bail);

  const pendant = new THREE.Group();
  pendant.name = `ZW_Pendant_${kind}`;
  pendant.position.copy(bail.position).add(new THREE.Vector3(0, -fit.linkRadius * 1.7, 0.003));
  pendant.scale.setScalar(fit.pendantScale);
  if (kind === 'iced') {
    const gemMaterial = new THREE.MeshPhysicalMaterial({
      color: '#dff5ff', roughness: 0.02, transmission: 0.35, metalness: 0.08,
      clearcoat: 1, clearcoatRoughness: 0, emissive: '#8edfff', emissiveIntensity: 0.12,
    });
    const setting = new THREE.Mesh(new THREE.OctahedronGeometry(0.022, 1), material);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.015, 1), gemMaterial);
    gem.position.z = 0.006;
    pendant.add(setting, gem);
  } else {
    const tag = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.008, 20), material);
    tag.rotation.x = Math.PI * 0.5;
    pendant.add(tag);
  }
  pendant.traverse((node) => { if (node.isMesh) node.castShadow = true; });
  group.add(pendant);
  return group;
}

export function updateJewelry(instance, custom) {
  if (!instance?.anchors?.chest) return false;
  const kind = custom.jewelry || 'none';
  const fitKey = socketMetricKey(custom);
  const desiredKey = kind === 'none' ? 'none' : `${kind}:${fitKey}:landmark-v1`;
  const layer = attachmentLayer(instance);
  const existing = findNamed(layer, 'ZW_ModularJewelryMount');

  if (kind === 'none') {
    removeNamed(layer, 'ZW_ModularJewelryMount');
    instance.jewelryKey = 'none';
    return false;
  }
  if (instance.jewelryKey === desiredKey && existing) return true;

  removeNamed(layer, 'ZW_ModularJewelryMount');
  instance.jewelryKey = null;
  try {
    const metrics = bodySockets(instance, custom);
    anchorLocalPose(instance, instance.anchors.chest, tempAnchorPosition, tempLocalQuaternion);
    const mount = buildJewelry(kind, metrics, tempAnchorPosition.clone());
    mount.userData.zwFitKey = fitKey;
    mount.userData.zwFallbackSocket = metrics.fallback;
    captureAnchorRest(instance, mount, instance.anchors.chest, 'chest');
    layer.add(mount);
    instance.jewelryKey = desiredKey;
    updateAttachmentTransforms(instance);
    return true;
  } catch (error) {
    console.warn('[modular-attachments] landmark jewelry mount failed', kind, error);
    removeNamed(layer, 'ZW_ModularJewelryMount');
    instance.jewelryKey = null;
    return false;
  }
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
    instance.externalHairRequest = 0;
    instance.jewelryKey = null;
    instance.socketMetrics = null;
  }
}
