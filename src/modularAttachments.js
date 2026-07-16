// ─────────────────────────────────────────────────────────────────────────────
// modularAttachments.js — dense landmark hair fitting + surface-draped jewelry.
//
// Hair vertices are deformed through a reusable head cage rather than scaling one
// rigid helmet. Necklaces are projected over sampled neck/chest surfaces, loop
// behind the nape, and descend through a front drape made from individual links.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { loadModel } from './assets.js';
import { assetUrl } from './manifest.js';
import { HAIR_GLTF, HAIR_COLORS } from './avatar.js';
import {
  CHEST_DRAPE_SEGMENTS,
  HEAD_CAGE_POINTS,
  HEAD_LANDMARK_NAMES,
  JEWELRY_FIT,
  NECK_RING_SEGMENTS,
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
const Z_AXIS = new THREE.Vector3(0, 0, 1);

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
  anchor.updateMatrixWorld(true);
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
  return [custom.heightScale, custom.bodyMass, custom.bodyMuscle, custom.modularTop, face].join('|');
}

function vertexInInstanceSpace(instance, mesh, index, target) {
  const position = mesh.geometry?.attributes?.position;
  if (!position) return null;
  if (typeof mesh.getVertexPosition === 'function') mesh.getVertexPosition(index, target);
  else {
    target.fromBufferAttribute(position, index);
    if (mesh.isSkinnedMesh) mesh.applyBoneTransform(index, target);
  }
  mesh.localToWorld(target);
  instance.group.worldToLocal(target);
  return target;
}

function isTorsoSurfaceMesh(node) {
  if (!node?.isMesh || node.visible === false) return false;
  return /(ZW_Player_Body|ZW_Top_|TShirt|Hoodie|Shirt|Jacket)/i.test(node.name || '');
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
  for (let index = 0; index < position.count; index++) {
    const vertex = vertexInInstanceSpace(instance, body, index, tempVertex);
    if (vertex) all.expandByPoint(vertex);
  }
  const size = all.getSize(new THREE.Vector3());
  const center = all.getCenter(new THREE.Vector3());
  const head = new THREE.Box3().makeEmpty();
  const chest = new THREE.Box3().makeEmpty();
  const headFloor = all.min.y + size.y * 0.75;
  const chestFloor = all.min.y + size.y * 0.52;
  const chestCeil = all.min.y + size.y * 0.79;
  for (let index = 0; index < position.count; index++) {
    const vertex = vertexInInstanceSpace(instance, body, index, tempVertex);
    if (!vertex) continue;
    const central = Math.abs(vertex.x - center.x) < size.y * 0.22;
    if (central && vertex.y >= headFloor) head.expandByPoint(vertex);
    if (central && vertex.y >= chestFloor && vertex.y <= chestCeil) chest.expandByPoint(vertex);
  }
  if (head.isEmpty()) head.copy(all);
  if (chest.isEmpty()) chest.copy(all);

  const surfaceSamples = [];
  instance.model.traverse((mesh) => {
    if (!isTorsoSurfaceMesh(mesh)) return;
    const meshPosition = mesh.geometry?.attributes?.position;
    if (!meshPosition) return;
    mesh.updateMatrixWorld(true);
    const stride = Math.max(1, Math.ceil(meshPosition.count / 4500));
    for (let index = 0; index < meshPosition.count; index += stride) {
      const vertex = vertexInInstanceSpace(instance, mesh, index, tempVertex);
      if (!vertex) continue;
      if (vertex.y < chestFloor - size.y * 0.05 || vertex.y > head.min.y + size.y * 0.08) continue;
      if (Math.abs(vertex.x - center.x) > chest.getSize(new THREE.Vector3()).x * 0.72) continue;
      surfaceSamples.push(vertex.clone());
    }
  });

  const metrics = {
    key,
    body: all,
    head,
    chest,
    bodySize: size,
    bodyCenter: center,
    headSize: head.getSize(new THREE.Vector3()),
    headCenter: head.getCenter(new THREE.Vector3()),
    chestSize: chest.getSize(new THREE.Vector3()),
    chestCenter: chest.getCenter(new THREE.Vector3()),
    surfaceSamples,
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
  const metrics = {
    key, body, head, chest, bodySize, bodyCenter: body.getCenter(new THREE.Vector3()),
    headSize, headCenter, chestSize, chestCenter, surfaceSamples: [], fallback: true,
  };
  instance.socketMetrics = metrics;
  return metrics;
}

function bodySockets(instance, custom) {
  return measuredBodySockets(instance, custom) || fallbackBodySockets(instance, custom);
}

function hairTargetBounds(metrics, sourceSize, profile) {
  const targetWidth = Math.max(metrics.headSize.x * profile.widthMul, 0.16);
  const targetDepth = Math.max(metrics.headSize.z * profile.depthMul, 0.14);
  const naturalScale = Math.min(targetWidth / Math.max(sourceSize.x, 0.0001), targetDepth / Math.max(sourceSize.z, 0.0001));
  const naturalHeight = sourceSize.y * naturalScale;
  const cappedHeight = Math.min(naturalHeight, metrics.headSize.y * profile.maxHeightMul);
  const topY = metrics.head.max.y + metrics.headSize.y * profile.topLiftMul;
  const requestedBottom = metrics.head.min.y - metrics.headSize.y * profile.bottomDropMul;
  const height = Math.min(metrics.headSize.y * profile.maxHeightMul, Math.max(cappedHeight, topY - requestedBottom));
  const bottomY = topY - height;
  return new THREE.Box3(
    new THREE.Vector3(metrics.headCenter.x - targetWidth * 0.5, bottomY, metrics.headCenter.z - targetDepth * 0.5),
    new THREE.Vector3(metrics.headCenter.x + targetWidth * 0.5, topY, metrics.headCenter.z + targetDepth * 0.5),
  );
}

function baseMapToBounds(normalized, box, target = new THREE.Vector3()) {
  return target.set(
    THREE.MathUtils.lerp(box.min.x, box.max.x, (normalized.x + 1) * 0.5),
    THREE.MathUtils.lerp(box.min.y, box.max.y, normalized.y),
    THREE.MathUtils.lerp(box.min.z, box.max.z, (normalized.z + 1) * 0.5),
  );
}

function targetHeadCage(metrics, profile, targetBounds) {
  const landmarks = {};
  const targetSize = targetBounds.getSize(new THREE.Vector3());
  for (const cagePoint of HEAD_CAGE_POINTS) {
    const normalized = new THREE.Vector3(...cagePoint.source);
    const target = baseMapToBounds(normalized, targetBounds, new THREE.Vector3());
    const name = cagePoint.name;
    if (normalized.z > 0.45) target.z += profile.frontClearance * normalized.z;
    if (normalized.z < -0.45) target.z += profile.backClearance * normalized.z;
    if (Math.abs(normalized.x) > 0.72) target.x += Math.sign(normalized.x) * profile.sideClearance;
    if (/Ear/.test(name)) target.x += Math.sign(normalized.x || 1) * profile.earClearance;
    if (/nape/i.test(name)) {
      target.y = metrics.head.min.y - metrics.headSize.y * profile.napeDropMul;
      target.z = metrics.headCenter.z - targetSize.z * 0.5 - metrics.headSize.z * profile.napeBackMul;
    }
    const offset = profile.targetOffsets?.[name];
    if (offset) {
      target.x += offset[0] * metrics.headSize.x;
      target.y += offset[1] * metrics.headSize.y;
      target.z += offset[2] * metrics.headSize.z;
    }
    landmarks[name] = target;
  }
  return Object.freeze(landmarks);
}

function normalizedCoordinates(point, box, target = new THREE.Vector3()) {
  const size = box.getSize(new THREE.Vector3());
  return target.set(
    size.x > 0 ? ((point.x - box.min.x) / size.x) * 2 - 1 : 0,
    size.y > 0 ? (point.y - box.min.y) / size.y : 0,
    size.z > 0 ? ((point.z - box.min.z) / size.z) * 2 - 1 : 0,
  );
}

function warpPointToCage(point, sourceBox, targetBounds, sourceLandmarks, targetLandmarks, power, target = new THREE.Vector3()) {
  const normalized = normalizedCoordinates(point, sourceBox, new THREE.Vector3());
  baseMapToBounds(normalized, targetBounds, target);
  const displacement = new THREE.Vector3();
  let totalWeight = 0;
  for (const name of HEAD_LANDMARK_NAMES) {
    const sourceNormalized = new THREE.Vector3(...sourceLandmarks[name]);
    const dx = normalized.x - sourceNormalized.x;
    const dy = normalized.y - sourceNormalized.y;
    const dz = normalized.z - sourceNormalized.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const weight = 1 / (0.018 + Math.pow(distance, power));
    const sourceMapped = baseMapToBounds(sourceNormalized, targetBounds, new THREE.Vector3());
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
  const targetBounds = hairTargetBounds(metrics, sourceSize, profile);
  const targetLandmarks = targetHeadCage(metrics, profile, targetBounds);
  const warped = new THREE.Group();
  warped.name = 'ZW_DenseLandmarkWarpedHair';

  prototype.traverse((node) => {
    if (!node.isMesh) return;
    const source = node.geometry;
    const position = source?.attributes?.position;
    if (!position) return;
    const positions = new Float32Array(position.count * 3);
    for (let index = 0; index < position.count; index++) {
      tempVertex.fromBufferAttribute(position, index);
      node.localToWorld(tempVertex);
      warpPointToCage(tempVertex, sourceBox, targetBounds, profile.sourceLandmarks, targetLandmarks, profile.influencePower, tempVertex);
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
    mesh.name = node.name || 'ZW_DenseLandmarkHairMesh';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    warped.add(mesh);
  });

  if (!warped.children.length) throw new Error('hair asset produced no renderable meshes');
  warped.userData.zwHeadLandmarks = Object.fromEntries(HEAD_LANDMARK_NAMES.map((name) => [name, targetLandmarks[name].toArray()]));
  warped.userData.zwTargetBounds = { min: targetBounds.min.toArray(), max: targetBounds.max.toArray() };
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
    delta.multiply(new THREE.Quaternion().setFromAxisAngle(Z_AXIS, sway));
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
  const desiredKey = isLegacyAssetHair(styleId) ? `${styleId}:${custom.hairColor || 'jet'}:${fitKey}:dense-cage-v2` : 'none';
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
    mount.userData.zwFitContract = 'dense-head-cage-v2';
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
    console.warn('[modular-attachments] dense landmark hair mount failed', styleId, error);
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

function weightedSurfaceZ(metrics, x, y, front = true) {
  const samples = metrics.surfaceSamples || [];
  if (!samples.length) return front ? metrics.chest.max.z : metrics.chest.min.z;
  const radiusX = Math.max(metrics.chestSize.x * 0.12, 0.025);
  const radiusY = Math.max(metrics.chestSize.y * 0.10, 0.025);
  let selected = front ? -Infinity : Infinity;
  let found = false;
  for (const sample of samples) {
    const nx = (sample.x - x) / radiusX;
    const ny = (sample.y - y) / radiusY;
    const distance = nx * nx + ny * ny;
    if (distance > 1.4) continue;
    if (front) selected = Math.max(selected, sample.z);
    else selected = Math.min(selected, sample.z);
    found = true;
  }
  return found ? selected : (front ? metrics.chest.max.z : metrics.chest.min.z);
}

function neckEnvelope(metrics, fit) {
  const samples = metrics.surfaceSamples || [];
  const neckY = Math.min(
    metrics.head.min.y + metrics.headSize.y * 0.06,
    metrics.chest.max.y - metrics.chestSize.y * 0.04,
  );
  const band = samples.filter((sample) => Math.abs(sample.y - neckY) <= Math.max(metrics.headSize.y * 0.12, 0.035));
  const centerX = metrics.chestCenter.x;
  let minX = centerX - metrics.headSize.x * 0.22;
  let maxX = centerX + metrics.headSize.x * 0.22;
  let minZ = metrics.chestCenter.z - metrics.headSize.z * 0.20;
  let maxZ = metrics.chestCenter.z + metrics.headSize.z * 0.20;
  if (band.length) {
    minX = Math.min(...band.map((sample) => sample.x));
    maxX = Math.max(...band.map((sample) => sample.x));
    minZ = Math.min(...band.map((sample) => sample.z));
    maxZ = Math.max(...band.map((sample) => sample.z));
  }
  const centerZ = (minZ + maxZ) * 0.5;
  return {
    y: neckY,
    center: new THREE.Vector3((minX + maxX) * 0.5, neckY, centerZ),
    radiusX: Math.max((maxX - minX) * 0.5 + fit.neckClearance, metrics.headSize.x * 0.18),
    radiusZ: Math.max((maxZ - minZ) * 0.5 + fit.neckClearance, metrics.headSize.z * 0.17),
  };
}

function neckRingPoint(envelope, angle, fit) {
  const radialX = Math.sin(angle);
  const radialZ = Math.cos(angle);
  return new THREE.Vector3(
    envelope.center.x + radialX * envelope.radiusX,
    envelope.y + (radialZ < 0 ? fit.neckClearance * 0.35 : -fit.neckClearance * 0.20),
    envelope.center.z + radialZ * envelope.radiusZ,
  );
}

function projectedChestDrape(metrics, fit) {
  const points = [];
  const halfWidth = Math.max(metrics.chestSize.x * fit.shoulderWidthMul, metrics.headSize.x * 0.52);
  const topY = metrics.chest.max.y - metrics.chestSize.y * 0.12;
  for (let index = 0; index < CHEST_DRAPE_SEGMENTS; index++) {
    const t = index / (CHEST_DRAPE_SEGMENTS - 1);
    const x = THREE.MathUtils.lerp(metrics.chestCenter.x - halfWidth, metrics.chestCenter.x + halfWidth, t);
    const y = topY - Math.sin(Math.PI * t) * fit.drop;
    const z = weightedSurfaceZ(metrics, x, y, true) + fit.chestClearance;
    points.push(new THREE.Vector3(x, y, z));
  }
  return points;
}

function necklaceSurfacePath(metrics, fit) {
  const envelope = neckEnvelope(metrics, fit);
  const points = [];
  const sideCount = Math.max(4, Math.floor(NECK_RING_SEGMENTS / 2));
  const leftFrontAngle = Math.PI * 2 - 0.55;
  const rightFrontAngle = 0.55;

  for (let index = 0; index <= sideCount; index++) {
    const t = index / sideCount;
    points.push(neckRingPoint(envelope, THREE.MathUtils.lerp(Math.PI, leftFrontAngle, t), fit));
  }

  const drape = projectedChestDrape(metrics, fit);
  points.push(...drape);

  for (let index = 0; index <= sideCount; index++) {
    const t = index / sideCount;
    points.push(neckRingPoint(envelope, THREE.MathUtils.lerp(rightFrontAngle, Math.PI, t), fit));
  }
  return { points, drape, envelope };
}

function makeChainLink(material, fit, kind, index) {
  const link = new THREE.Mesh(new THREE.TorusGeometry(fit.linkRadius, fit.linkTube, 5, kind === 'cuban' ? 12 : 10), material);
  link.name = `ZW_ChainLink_${kind}_${index}`;
  link.castShadow = true;
  if (kind === 'cuban') link.scale.set(1.24, 0.70, 0.70);
  else link.scale.set(1.08, 0.82, 0.82);
  return link;
}

function buildJewelry(kind, metrics, anchorPosition) {
  const fit = JEWELRY_FIT[kind] || JEWELRY_FIT.chain;
  const material = jewelryMaterial(kind);
  const { points, drape, envelope } = necklaceSurfacePath(metrics, fit);
  const localPoints = points.map((point) => point.clone().sub(anchorPosition));
  const curve = new THREE.CatmullRomCurve3(localPoints, false, 'centripetal', 0.5);
  const group = new THREE.Group();
  group.name = 'ZW_ModularJewelryMount';
  group.userData.zwAttachment = 'jewelry';
  group.userData.zwItemId = kind;
  group.userData.zwFitContract = 'neck-chest-surface-v2';
  group.userData.zwNeckEnvelope = {
    center: envelope.center.toArray(), radiusX: envelope.radiusX, radiusZ: envelope.radiusZ,
  };
  group.userData.zwSurfacePath = points.map((point) => point.toArray());

  for (let index = 0; index < fit.links; index++) {
    const t = fit.links <= 1 ? 0.5 : index / (fit.links - 1);
    const curvePoint = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const link = makeChainLink(material, fit, kind, index);
    link.position.copy(curvePoint);
    const align = new THREE.Quaternion().setFromUnitVectors(X_AXIS, tangent);
    const alternatingTwist = new THREE.Quaternion().setFromAxisAngle(X_AXIS, index % 2 ? Math.PI * 0.5 : 0);
    link.quaternion.copy(align).multiply(alternatingTwist);
    group.add(link);
  }

  const centerWorld = drape[Math.floor(drape.length / 2)].clone();
  const bailWorld = centerWorld.clone().add(new THREE.Vector3(0, -fit.linkRadius * 1.20, fit.pendantClearance));
  const bail = new THREE.Mesh(new THREE.TorusGeometry(fit.linkRadius * 0.66, fit.linkTube, 5, 12), material);
  bail.name = `ZW_PendantBail_${kind}`;
  bail.position.copy(bailWorld).sub(anchorPosition);
  bail.rotation.x = Math.PI * 0.5;
  bail.castShadow = true;
  group.add(bail);

  const pendantY = bailWorld.y - fit.linkRadius * 1.55;
  const pendantSurfaceZ = weightedSurfaceZ(metrics, centerWorld.x, pendantY, true);
  const pendantWorld = new THREE.Vector3(
    centerWorld.x,
    pendantY,
    Math.max(bailWorld.z, pendantSurfaceZ + fit.pendantClearance),
  );
  const pendant = new THREE.Group();
  pendant.name = `ZW_Pendant_${kind}`;
  pendant.position.copy(pendantWorld).sub(anchorPosition);
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
  const fitKey = socketMetricKey(custom);
  const desiredKey = kind === 'none' ? 'none' : `${kind}:${fitKey}:surface-v2`;
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
    console.warn('[modular-attachments] surface jewelry mount failed', kind, error);
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
