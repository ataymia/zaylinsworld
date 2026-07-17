// ─────────────────────────────────────────────────────────────────────────────
// modularAttachments.js — rig-space hair fitting + continuous jewelry.
//
// Imported mini-kit hairs are baked into their authored Head-bone coordinate
// frame, including the source bone's full rotation and scale. That canonical
// frame is then mapped onto the Sunbox player's real Head bone and the native
// Crew Cut reference that already fits it. This preserves both left and right
// sides of every style instead of aligning only the source head position.
//
// Jewelry remains one continuous closed collarbone loop made from individual
// links. The approved front drape is preserved while the rear arc is tightened
// independently around the neck.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { loadModel } from './assets.js';
import { assetUrl } from './manifest.js';
import { HAIR_GLTF, HAIR_COLORS } from './avatar.js';
import {
  FALLBACK_NATIVE_HAIR_REFERENCE_NODE,
  HAIR_REFERENCE_SETTINGS,
  JEWELRY_FIT,
  NATIVE_HAIR_REFERENCE_NODE,
  SOURCE_CANONICAL_HAIR_STYLE,
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
const TWO_PI = Math.PI * 2;

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

function cloneTintedMaterial(material, tint) {
  const clone = material?.clone?.() || material;
  if (clone?.color) clone.color.copy(tint);
  if (clone) clone.needsUpdate = true;
  return clone;
}

function bakedVertex(node, sourcePosition, index, target) {
  if (typeof node.getVertexPosition === 'function') node.getVertexPosition(index, target);
  else {
    target.fromBufferAttribute(sourcePosition, index);
    if (node.isSkinnedMesh) node.applyBoneTransform(index, target);
  }
  node.localToWorld(target);
  return target;
}

function bakeToHeadLocal(root, sourceHead) {
  root.updateMatrixWorld(true);
  sourceHead.updateMatrixWorld(true);
  const headWorldInverse = sourceHead.matrixWorld.clone().invert();
  const out = new THREE.Group();
  const vertex = new THREE.Vector3();

  root.traverse((node) => {
    if (!node.isMesh) return;
    const source = node.geometry;
    const position = source?.attributes?.position;
    if (!position) return;

    const positions = new Float32Array(position.count * 3);
    for (let index = 0; index < position.count; index++) {
      bakedVertex(node, position, index, vertex).applyMatrix4(headWorldInverse);
      positions[index * 3] = vertex.x;
      positions[index * 3 + 1] = vertex.y;
      positions[index * 3 + 2] = vertex.z;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    if (source.attributes.uv) geometry.setAttribute('uv', source.attributes.uv.clone());
    if (source.index) geometry.setIndex(source.index.clone());
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    const mesh = new THREE.Mesh(geometry, node.material);
    mesh.name = node.name || 'ZW_ExternalHairMesh';
    out.add(mesh);
  });

  out.updateMatrixWorld(true);
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
        cloned.updateMatrixWorld(true);
        const sourceHead = cloned.getObjectByName('Head');
        if (!sourceHead) throw new Error('source hair rig has no Head bone');

        const baked = bakeToHeadLocal(cloned, sourceHead);
        const box = new THREE.Box3().setFromObject(baked);
        const size = box.getSize(new THREE.Vector3());
        if (![size.x, size.y, size.z].every(Number.isFinite)
          || Math.max(size.x, size.y, size.z) < HAIR_REFERENCE_SETTINGS.minExtent) {
          throw new Error('invalid source-head-local hair bounds');
        }
        return Object.freeze({ styleId, group: baked, box, size });
      } catch (error) {
        console.warn('[modular-attachments] rig-space hair prototype failed', styleId, error);
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

function captureAnchorRest(instance, mount, anchor, kind, mode = 'delta') {
  anchorLocalPose(instance, anchor, tempAnchorPosition, tempLocalQuaternion);
  mount.userData.zwAnchorKind = kind;
  mount.userData.zwAnchorMode = mode;
  mount.userData.zwAnchorOffset = [0, 0, 0];
  mount.userData.zwAnchorRestQuaternion = tempLocalQuaternion.toArray();
  mount.userData.zwSwaySeed = Math.random() * TWO_PI;
  mount.position.copy(tempAnchorPosition);
  mount.quaternion.copy(mode === 'absolute' ? tempLocalQuaternion : new THREE.Quaternion());
}

function socketMetricKey(custom = {}) {
  const face = Object.values(custom.faceMorphs || {}).map((value) => Number(value || 0).toFixed(2)).join(',');
  return [custom.heightScale, custom.bodyMass, custom.bodyMuscle, custom.modularTop, face].join('|');
}

function vertexInInstanceSpace(instance, mesh, index, target) {
  const position = mesh.geometry?.attributes?.position;
  if (!position) return null;
  bakedVertex(mesh, position, index, target);
  instance.group.worldToLocal(target);
  return target;
}

function vertexInAnchorSpace(mesh, index, anchor, target) {
  const position = mesh.geometry?.attributes?.position;
  if (!position || !anchor) return null;
  bakedVertex(mesh, position, index, target);
  anchor.worldToLocal(target);
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
  const head = new THREE.Box3(headCenter.clone().addScaledVector(headSize, -0.5), headCenter.clone().addScaledVector(headSize, 0.5));
  const chest = new THREE.Box3(chestCenter.clone().addScaledVector(chestSize, -0.5), chestCenter.clone().addScaledVector(chestSize, 0.5));
  const bodySize = new THREE.Vector3(targetHeight * 0.34, targetHeight, targetHeight * 0.20);
  const body = new THREE.Box3(new THREE.Vector3(-bodySize.x * 0.5, 0, -bodySize.z * 0.5), new THREE.Vector3(bodySize.x * 0.5, targetHeight, bodySize.z * 0.5));
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

function targetHeadBone(instance) {
  return instance?.model?.getObjectByName('Head') || instance?.anchors?.head || null;
}

function nativeHairReference(instance, metrics, custom = instance?.custom || {}) {
  const key = `${socketMetricKey(custom)}:native-hair-reference-v2`;
  if (instance.nativeHairReference?.key === key) return instance.nativeHairReference;

  const headBone = targetHeadBone(instance);
  const candidates = [NATIVE_HAIR_REFERENCE_NODE, FALLBACK_NATIVE_HAIR_REFERENCE_NODE];
  let chosenNode = null;
  let box = null;
  if (headBone) {
    instance.group.updateMatrixWorld(true);
    headBone.updateMatrixWorld(true);
    for (const nodeName of candidates) {
      const root = instance.model?.getObjectByName(nodeName);
      if (!root) continue;
      const candidateBox = new THREE.Box3().makeEmpty();
      root.traverse?.((mesh) => {
        if (!mesh.isMesh || !mesh.geometry?.attributes?.position) return;
        mesh.updateMatrixWorld(true);
        const count = mesh.geometry.attributes.position.count;
        for (let index = 0; index < count; index++) {
          const point = vertexInAnchorSpace(mesh, index, headBone, tempVertex);
          if (point) candidateBox.expandByPoint(point);
        }
      });
      const size = candidateBox.getSize(new THREE.Vector3());
      if (!candidateBox.isEmpty() && Math.max(size.x, size.y, size.z) >= HAIR_REFERENCE_SETTINGS.minExtent) {
        chosenNode = nodeName;
        box = candidateBox;
        break;
      }
    }
  }

  if (!box) {
    const half = metrics.headSize.clone().multiplyScalar(0.5);
    box = new THREE.Box3(half.clone().multiplyScalar(-1), half);
  }
  const reference = {
    key,
    nodeName: chosenNode || 'body-head-fallback',
    headBone,
    box,
    center: box.getCenter(new THREE.Vector3()),
    size: box.getSize(new THREE.Vector3()),
  };
  instance.nativeHairReference = reference;
  return reference;
}

function safeScale(value) {
  return THREE.MathUtils.clamp(
    Number.isFinite(value) ? value : 1,
    HAIR_REFERENCE_SETTINGS.minScale,
    HAIR_REFERENCE_SETTINGS.maxScale,
  );
}

function fitHairToCanonicalHead(prototype, canonical, instance, metrics, profile, tint) {
  const target = nativeHairReference(instance, metrics, instance.custom || {});
  const sourceReferenceSize = canonical.size;
  const sourceReferenceCenter = canonical.box.getCenter(new THREE.Vector3());

  const scaleX = safeScale(target.size.x / Math.max(sourceReferenceSize.x, HAIR_REFERENCE_SETTINGS.minExtent)) * profile.widthScale;
  const scaleZ = safeScale(target.size.z / Math.max(sourceReferenceSize.z, HAIR_REFERENCE_SETTINGS.minExtent)) * profile.depthScale;
  const horizontalScale = Math.sqrt(Math.max(scaleX * scaleZ, 0.0001));
  const scaleY = horizontalScale * profile.heightScale;

  const targetOrigin = new THREE.Vector3(
    target.center.x - sourceReferenceCenter.x * scaleX,
    target.box.min.y - canonical.box.min.y * scaleY,
    target.center.z - sourceReferenceCenter.z * scaleZ,
  );
  targetOrigin.x += target.size.x * profile.xOffsetMul;
  targetOrigin.y += target.size.y * profile.yOffsetMul;
  targetOrigin.z += target.size.z * profile.zOffsetMul;

  const fitted = new THREE.Group();
  fitted.name = 'ZW_RigSpaceFittedHair';
  prototype.group.updateMatrixWorld(true);
  prototype.group.traverse((node) => {
    if (!node.isMesh || !node.geometry?.attributes?.position) return;
    const source = node.geometry;
    const position = source.attributes.position;
    const positions = new Float32Array(position.count * 3);
    for (let index = 0; index < position.count; index++) {
      tempVertex.fromBufferAttribute(position, index);
      node.localToWorld(tempVertex);
      tempVertex.set(
        targetOrigin.x + tempVertex.x * scaleX,
        targetOrigin.y + tempVertex.y * scaleY,
        targetOrigin.z + tempVertex.z * scaleZ,
      );
      positions[index * 3] = tempVertex.x;
      positions[index * 3 + 1] = tempVertex.y;
      positions[index * 3 + 2] = tempVertex.z;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    if (source.attributes.uv) geometry.setAttribute('uv', source.attributes.uv.clone());
    if (source.index) geometry.setIndex(source.index.clone());
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const materials = Array.isArray(node.material)
      ? node.material.map((material) => cloneTintedMaterial(material, tint))
      : cloneTintedMaterial(node.material, tint);
    const mesh = new THREE.Mesh(geometry, materials);
    mesh.name = node.name || 'ZW_RigSpaceHairMesh';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    fitted.add(mesh);
  });

  if (!fitted.children.length) throw new Error('hair asset produced no renderable meshes');
  fitted.userData.zwFitContract = 'full-head-matrix-to-native-reference-v5';
  fitted.userData.zwSourceReference = SOURCE_CANONICAL_HAIR_STYLE;
  fitted.userData.zwTargetReferenceNode = target.nodeName;
  fitted.userData.zwScale = [scaleX, scaleY, scaleZ];
  fitted.userData.zwTargetOrigin = targetOrigin.toArray();
  return fitted;
}

function updateMountedAttachment(instance, mount, anchor, elapsedSeconds = 0) {
  if (!mount || !anchor) return;
  anchorLocalPose(instance, anchor, tempAnchorPosition, tempLocalQuaternion);
  const offset = mount.userData.zwAnchorOffset || [0, 0, 0];
  mount.position.copy(tempAnchorPosition).add(new THREE.Vector3(...offset));

  if (mount.userData.zwAnchorMode === 'absolute') {
    mount.quaternion.copy(tempLocalQuaternion);
    return;
  }

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
  updateMountedAttachment(instance, findNamed(layer, 'ZW_ExternalHairMount'), targetHeadBone(instance), elapsedSeconds);
  updateMountedAttachment(instance, findNamed(layer, 'ZW_ModularJewelryMount'), instance.anchors?.chest, elapsedSeconds);
}

export function isLegacyAssetHair(styleId) {
  return !!HAIR_GLTF[styleId];
}

export async function updateLegacyHair(instance, custom, renderer) {
  const headBone = targetHeadBone(instance);
  if (!headBone) return false;
  const styleId = custom.modularHair;
  const fitKey = socketMetricKey(custom);
  const desiredKey = isLegacyAssetHair(styleId) ? `${styleId}:${custom.hairColor || 'jet'}:${fitKey}:rig-space-v5` : 'none';
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
    const [prototype, canonical] = await Promise.all([
      hairPrototype(styleId, renderer),
      hairPrototype(SOURCE_CANONICAL_HAIR_STYLE, renderer),
    ]);
    if (!prototype || !canonical || instance.externalHairRequest !== request) return false;
    const metrics = bodySockets(instance, custom);
    const profile = hairFitProfile(styleId);
    const mount = new THREE.Group();
    mount.name = 'ZW_ExternalHairMount';
    mount.userData.zwAttachment = 'hair';
    mount.userData.zwItemId = styleId;
    mount.userData.zwFitKey = fitKey;
    mount.userData.zwFitContract = 'full-head-matrix-to-native-reference-v5';
    mount.userData.zwFallbackSocket = metrics.fallback;
    mount.add(fitHairToCanonicalHead(
      prototype,
      canonical,
      instance,
      metrics,
      profile,
      colorForHair(custom),
    ));
    captureAnchorRest(instance, mount, headBone, 'head', 'absolute');

    if (instance.externalHairRequest !== request) {
      disposeTree(mount);
      return false;
    }
    layer.add(mount);
    instance.externalHairKey = desiredKey;
    updateAttachmentTransforms(instance);
    return true;
  } catch (error) {
    console.warn('[modular-attachments] rig-space hair mount failed', styleId, error);
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

function necklaceLoop(metrics, fit) {
  const points = [];
  const centerX = metrics.chestCenter.x;
  const baseY = Math.min(
    metrics.head.min.y + metrics.headSize.y * fit.neckHeightMul,
    metrics.chest.max.y - metrics.chestSize.y * fit.chestTopInsetMul,
  );
  const halfWidth = Math.max(metrics.headSize.x * fit.neckWidthMul, metrics.chestSize.x * fit.shoulderWidthMul);
  const frontAtCenter = weightedSurfaceZ(metrics, centerX, baseY - fit.drop, true);
  const backAtCenter = weightedSurfaceZ(metrics, centerX, baseY, false);
  const centerZ = (frontAtCenter + backAtCenter) * 0.5;
  const radiusZ = Math.max((frontAtCenter - backAtCenter) * 0.5, metrics.headSize.z * 0.20);

  for (let index = 0; index < fit.pathSamples; index++) {
    const t = index / fit.pathSamples;
    const angle = t * TWO_PI;
    const frontness = Math.cos(angle);
    const sideness = Math.sin(angle);
    const frontWeight = Math.max(0, frontness);
    const backWeight = Math.max(0, -frontness);
    const backTighten = THREE.MathUtils.lerp(1, fit.backWidthScale, Math.pow(backWeight, 1.5));
    const x = centerX
      + sideness * halfWidth * (1 + frontWeight * fit.frontWidthBoost) * backTighten;
    const y = baseY
      - fit.drop * Math.pow(frontWeight, fit.frontDropPower)
      + fit.backLift * Math.pow(backWeight, 1.5)
      - fit.sideDrop * Math.pow(Math.abs(sideness), 1.35);
    const frontSurface = weightedSurfaceZ(metrics, x, y, true) + fit.chestClearance;
    const backSurface = weightedSurfaceZ(metrics, x, y, false) - fit.backClearance + fit.backForward * backWeight;
    const ellipseZ = centerZ + frontness * radiusZ;
    const surfaceBlend = Math.abs(frontness);
    const desiredSurface = frontness >= 0 ? frontSurface : backSurface;
    const z = THREE.MathUtils.lerp(ellipseZ, desiredSurface, surfaceBlend);
    points.push(new THREE.Vector3(x, y, z));
  }
  return points;
}

function makeChainLink(material, fit, kind, index) {
  const link = new THREE.Mesh(new THREE.TorusGeometry(fit.linkRadius, fit.linkTube, 6, kind === 'cuban' ? 14 : 12), material);
  link.name = `ZW_ChainLink_${kind}_${index}`;
  link.castShadow = true;
  if (kind === 'cuban') link.scale.set(1.22, 0.72, 0.72);
  else link.scale.set(1.06, 0.84, 0.84);
  return link;
}

function buildJewelry(kind, metrics, anchorPosition) {
  const fit = JEWELRY_FIT[kind] || JEWELRY_FIT.chain;
  const material = jewelryMaterial(kind);
  const worldPoints = necklaceLoop(metrics, fit);
  const localPoints = worldPoints.map((point) => point.clone().sub(anchorPosition));
  const curve = new THREE.CatmullRomCurve3(localPoints, true, 'centripetal', 0.5);
  const group = new THREE.Group();
  group.name = 'ZW_ModularJewelryMount';
  group.userData.zwAttachment = 'jewelry';
  group.userData.zwItemId = kind;
  group.userData.zwFitContract = 'tight-back-collarbone-loop-v5';
  group.userData.zwSurfacePath = worldPoints.map((point) => point.toArray());

  for (let index = 0; index < fit.links; index++) {
    const t = index / fit.links;
    const curvePoint = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const link = makeChainLink(material, fit, kind, index);
    link.position.copy(curvePoint);
    const align = new THREE.Quaternion().setFromUnitVectors(X_AXIS, tangent);
    const alternatingTwist = new THREE.Quaternion().setFromAxisAngle(X_AXIS, index % 2 ? Math.PI * 0.5 : 0);
    link.quaternion.copy(align).multiply(alternatingTwist);
    link.userData.zwChainT = t;
    link.userData.zwBasePosition = link.position.toArray();
    group.add(link);
  }

  const frontWorld = worldPoints[0].clone();
  const bailWorld = frontWorld.clone().add(new THREE.Vector3(0, -fit.linkRadius * 1.15, fit.pendantClearance));
  const bail = new THREE.Mesh(new THREE.TorusGeometry(fit.linkRadius * 0.64, fit.linkTube, 6, 14), material);
  bail.name = `ZW_PendantBail_${kind}`;
  bail.position.copy(bailWorld).sub(anchorPosition);
  bail.rotation.x = Math.PI * 0.5;
  bail.castShadow = true;
  group.add(bail);

  const pendantY = bailWorld.y - fit.linkRadius * 1.50;
  const pendantSurfaceZ = weightedSurfaceZ(metrics, frontWorld.x, pendantY, true);
  const pendantWorld = new THREE.Vector3(
    frontWorld.x,
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
  const desiredKey = kind === 'none' ? 'none' : `${kind}:${fitKey}:tight-back-loop-v5`;
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
    console.warn('[modular-attachments] collarbone jewelry mount failed', kind, error);
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
    instance.nativeHairReference = null;
  }
}
