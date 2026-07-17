// ─────────────────────────────────────────────────────────────────────────────
// modularAttachments.js — native-reference hair fitting + continuous jewelry.
//
// Imported hair is no longer fit to a rectangular head box. The runtime samples
// the pack-native Crew Cut / Close Crop meshes that already fit the current head,
// builds a curved scalp field from those vertices, and binds every imported hair
// vertex to that field while preserving style volume away from the roots.
//
// Jewelry is a single closed collarbone loop made from individual links. The path
// is projected against front/back torso samples, so there are no stitched seams
// or dangling divots between a neck ring and a separate chest drape.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { loadModel } from './assets.js';
import { assetUrl } from './manifest.js';
import { HAIR_GLTF, HAIR_COLORS } from './avatar.js';
import {
  JEWELRY_FIT,
  NATIVE_SCALP_REFERENCE_NODES,
  SCALP_FIELD_SETTINGS,
  hairFitProfile,
} from './config/avatarAttachmentFit.js';

const KIT_DIR = 'models/characters/mini-kit/';
const hairPrototypeCache = new Map();
const sourceFieldCache = new WeakMap();
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
  mount.userData.zwSwaySeed = Math.random() * TWO_PI;
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

function angleDistance(a, b) {
  const raw = Math.abs(a - b) % TWO_PI;
  return Math.min(raw, TWO_PI - raw);
}

function angleBin(theta, count) {
  return Math.floor(((theta + Math.PI) / TWO_PI) * count + count) % count;
}

function heightBin(v, count) {
  return THREE.MathUtils.clamp(Math.floor(v * count), 0, count - 1);
}

function gridKey(a, h) {
  return `${a}:${h}`;
}

function analyticScalpPoint(metrics, theta, v, target = new THREE.Vector3()) {
  const clampedV = THREE.MathUtils.clamp(v, 0, 1);
  const phi = THREE.MathUtils.lerp(-0.30 * Math.PI, 0.50 * Math.PI, clampedV);
  const cosPhi = Math.max(0.08, Math.cos(phi));
  const rx = metrics.headSize.x * 0.50;
  const ry = metrics.headSize.y * 0.50;
  const rz = metrics.headSize.z * 0.50;
  target.set(
    metrics.headCenter.x + Math.sin(theta) * rx * cosPhi,
    metrics.headCenter.y + Math.sin(phi) * ry,
    metrics.headCenter.z + Math.cos(theta) * rz * cosPhi,
  );
  return target;
}

function nativeScalpField(instance, metrics, custom) {
  const key = `${socketMetricKey(custom)}:native-scalp-v1`;
  if (instance.nativeScalpField?.key === key) return instance.nativeScalpField;
  const angleBins = SCALP_FIELD_SETTINGS.angleBins;
  const heightBins = SCALP_FIELD_SETTINGS.heightBins;
  const grid = new Map();
  const samples = [];
  instance.group.updateMatrixWorld(true);

  for (const nodeName of NATIVE_SCALP_REFERENCE_NODES) {
    const root = instance.model?.getObjectByName(nodeName);
    root?.traverse?.((mesh) => {
      if (!mesh.isMesh || !mesh.geometry?.attributes?.position) return;
      mesh.updateMatrixWorld(true);
      const count = mesh.geometry.attributes.position.count;
      const stride = Math.max(1, Math.ceil(count / SCALP_FIELD_SETTINGS.maxReferenceSamples));
      for (let index = 0; index < count; index += stride) {
        const point = vertexInInstanceSpace(instance, mesh, index, tempVertex);
        if (!point) continue;
        const v = THREE.MathUtils.clamp((point.y - metrics.head.min.y) / Math.max(metrics.headSize.y, 0.0001), 0, 1);
        if (v < SCALP_FIELD_SETTINGS.minReferenceHeight) continue;
        const theta = Math.atan2(point.x - metrics.headCenter.x, point.z - metrics.headCenter.z);
        const entry = { theta, v, point: point.clone() };
        samples.push(entry);
        const a = angleBin(theta, angleBins);
        const h = heightBin(v, heightBins);
        const bucketKey = gridKey(a, h);
        if (!grid.has(bucketKey)) grid.set(bucketKey, []);
        grid.get(bucketKey).push(entry);
      }
    });
  }

  const field = { key, angleBins, heightBins, grid, samples, metrics };
  instance.nativeScalpField = field;
  return field;
}

function queryScalpPoint(field, theta, v, target = new THREE.Vector3()) {
  if (!field?.samples?.length) return analyticScalpPoint(field.metrics, theta, v, target);
  const a0 = angleBin(theta, field.angleBins);
  const h0 = heightBin(v, field.heightBins);
  const candidates = [];
  for (let da = -SCALP_FIELD_SETTINGS.searchRadius; da <= SCALP_FIELD_SETTINGS.searchRadius; da++) {
    for (let dh = -SCALP_FIELD_SETTINGS.searchRadius; dh <= SCALP_FIELD_SETTINGS.searchRadius; dh++) {
      const a = (a0 + da + field.angleBins) % field.angleBins;
      const h = THREE.MathUtils.clamp(h0 + dh, 0, field.heightBins - 1);
      const bucket = field.grid.get(gridKey(a, h));
      if (bucket) candidates.push(...bucket);
    }
  }
  if (!candidates.length) return analyticScalpPoint(field.metrics, theta, v, target);
  candidates.sort((left, right) => {
    const ld = angleDistance(left.theta, theta) ** 2 + (left.v - v) ** 2 * SCALP_FIELD_SETTINGS.heightWeight;
    const rd = angleDistance(right.theta, theta) ** 2 + (right.v - v) ** 2 * SCALP_FIELD_SETTINGS.heightWeight;
    return ld - rd;
  });
  target.set(0, 0, 0);
  let total = 0;
  const take = Math.min(SCALP_FIELD_SETTINGS.neighborCount, candidates.length);
  for (let index = 0; index < take; index++) {
    const sample = candidates[index];
    const distance = angleDistance(sample.theta, theta) ** 2 + (sample.v - v) ** 2 * SCALP_FIELD_SETTINGS.heightWeight;
    const weight = 1 / (SCALP_FIELD_SETTINGS.weightFloor + distance);
    target.addScaledVector(sample.point, weight);
    total += weight;
  }
  if (total <= 0) return analyticScalpPoint(field.metrics, theta, v, target);
  return target.multiplyScalar(1 / total);
}

function sourceHairField(prototype) {
  if (sourceFieldCache.has(prototype)) return sourceFieldCache.get(prototype);
  prototype.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(prototype);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const angleBins = SCALP_FIELD_SETTINGS.sourceAngleBins;
  const heightBins = SCALP_FIELD_SETTINGS.sourceHeightBins;
  const grid = new Map();
  const allValues = [];

  prototype.traverse((mesh) => {
    if (!mesh.isMesh || !mesh.geometry?.attributes?.position) return;
    const position = mesh.geometry.attributes.position;
    for (let index = 0; index < position.count; index++) {
      tempVertex.fromBufferAttribute(position, index);
      mesh.localToWorld(tempVertex);
      const nx = (tempVertex.x - center.x) / Math.max(size.x * 0.5, 0.0001);
      const nz = (tempVertex.z - center.z) / Math.max(size.z * 0.5, 0.0001);
      const v = THREE.MathUtils.clamp((tempVertex.y - box.min.y) / Math.max(size.y, 0.0001), 0, 1);
      const theta = Math.atan2(nx, nz);
      const radius = Math.sqrt(nx * nx + nz * nz);
      const a = angleBin(theta, angleBins);
      const h = heightBin(v, heightBins);
      const key = gridKey(a, h);
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(radius);
      allValues.push(radius);
    }
  });

  for (const values of grid.values()) values.sort((a, b) => a - b);
  allValues.sort((a, b) => a - b);
  const fallbackShell = allValues[Math.floor(allValues.length * 0.18)] || 0.42;
  const field = { box, size, center, angleBins, heightBins, grid, fallbackShell };
  sourceFieldCache.set(prototype, field);
  return field;
}

function sourceShellRadius(field, theta, v) {
  const a0 = angleBin(theta, field.angleBins);
  const h0 = heightBin(v, field.heightBins);
  const values = [];
  for (let da = -1; da <= 1; da++) {
    for (let dh = -1; dh <= 1; dh++) {
      const a = (a0 + da + field.angleBins) % field.angleBins;
      const h = THREE.MathUtils.clamp(h0 + dh, 0, field.heightBins - 1);
      const bucket = field.grid.get(gridKey(a, h));
      if (bucket?.length) values.push(bucket[Math.floor((bucket.length - 1) * 0.18)]);
    }
  }
  if (!values.length) return field.fallbackShell;
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length * 0.5)];
}

function targetStyleBounds(metrics, sourceSize, profile) {
  const width = Math.max(metrics.headSize.x * profile.widthMul, 0.16);
  const depth = Math.max(metrics.headSize.z * profile.depthMul, 0.14);
  const scale = Math.min(width / Math.max(sourceSize.x, 0.0001), depth / Math.max(sourceSize.z, 0.0001));
  const naturalHeight = sourceSize.y * scale;
  const height = Math.min(naturalHeight * profile.heightScale, metrics.headSize.y * profile.maxHeightMul);
  const top = metrics.head.max.y + metrics.headSize.y * profile.topLiftMul;
  const bottom = Math.min(top - height, metrics.head.min.y - metrics.headSize.y * profile.bottomDropMul);
  return new THREE.Box3(
    new THREE.Vector3(metrics.headCenter.x - width * 0.5, bottom, metrics.headCenter.z - depth * 0.5),
    new THREE.Vector3(metrics.headCenter.x + width * 0.5, top, metrics.headCenter.z + depth * 0.5),
  );
}

function baseMapToStyle(nx, ny, nz, bounds, profile, target = new THREE.Vector3()) {
  const frontness = Math.max(0, nz);
  target.set(
    THREE.MathUtils.lerp(bounds.min.x, bounds.max.x, (nx + 1) * 0.5),
    THREE.MathUtils.lerp(bounds.min.y, bounds.max.y, ny),
    THREE.MathUtils.lerp(bounds.min.z, bounds.max.z, (nz + 1) * 0.5),
  );
  target.z += profile.frontSeatMul * frontness * bounds.getSize(new THREE.Vector3()).z;
  return target;
}

function scalpNormal(metrics, point, target = new THREE.Vector3()) {
  const rx = Math.max(metrics.headSize.x * 0.5, 0.0001);
  const ry = Math.max(metrics.headSize.y * 0.5, 0.0001);
  const rz = Math.max(metrics.headSize.z * 0.5, 0.0001);
  target.set(
    (point.x - metrics.headCenter.x) / (rx * rx),
    (point.y - metrics.headCenter.y) / (ry * ry),
    (point.z - metrics.headCenter.z) / (rz * rz),
  );
  if (target.lengthSq() < 0.000001) target.set(0, 1, 0);
  return target.normalize();
}

function rootAdhesion(profile, normalizedHeight, volume) {
  const shell = Math.exp(-Math.max(0, volume) / Math.max(profile.shellBand, 0.0001));
  let vertical = 1;
  if (normalizedHeight < profile.releaseBelow) {
    vertical = THREE.MathUtils.smoothstep(normalizedHeight, profile.releaseFloor, profile.releaseBelow);
  }
  return THREE.MathUtils.clamp(profile.rootAdhesion * shell * vertical, 0, 1);
}

function fitHairToNativeScalp(prototype, instance, metrics, profile, anchorPosition, tint) {
  const sourceField = sourceHairField(prototype);
  const scalpField = nativeScalpField(instance, metrics, instance.custom || {});
  const sourceBox = sourceField.box;
  const sourceSize = sourceField.size;
  const sourceCenter = sourceField.center;
  const styleBounds = targetStyleBounds(metrics, sourceSize, profile);
  const volumeUnit = Math.min(metrics.headSize.x, metrics.headSize.z) * 0.5;
  const warped = new THREE.Group();
  warped.name = 'ZW_NativeScalpFittedHair';

  prototype.traverse((node) => {
    if (!node.isMesh) return;
    const source = node.geometry;
    const position = source?.attributes?.position;
    if (!position) return;
    const positions = new Float32Array(position.count * 3);
    const base = new THREE.Vector3();
    const scalp = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const projected = new THREE.Vector3();
    const final = new THREE.Vector3();

    for (let index = 0; index < position.count; index++) {
      tempVertex.fromBufferAttribute(position, index);
      node.localToWorld(tempVertex);
      const nx = (tempVertex.x - sourceCenter.x) / Math.max(sourceSize.x * 0.5, 0.0001);
      const nz = (tempVertex.z - sourceCenter.z) / Math.max(sourceSize.z * 0.5, 0.0001);
      const ny = THREE.MathUtils.clamp((tempVertex.y - sourceBox.min.y) / Math.max(sourceSize.y, 0.0001), 0, 1);
      const theta = Math.atan2(nx, nz);
      const radial = Math.sqrt(nx * nx + nz * nz);
      const sourceShell = sourceShellRadius(sourceField, theta, ny);
      const volume = Math.max(0, radial - sourceShell);
      const targetV = THREE.MathUtils.clamp(profile.scalpVMin + ny * profile.scalpVSpan, 0, 1);

      baseMapToStyle(nx, ny, nz, styleBounds, profile, base);
      queryScalpPoint(scalpField, theta, targetV, scalp);
      scalpNormal(metrics, scalp, normal);
      const outward = profile.rootClearance + volume * volumeUnit * profile.volumeScale;
      projected.copy(scalp).addScaledVector(normal, outward);
      projected.y += metrics.headSize.y * profile.crownBiasMul * Math.max(0, ny - 0.65);

      const adhesion = rootAdhesion(profile, ny, volume);
      final.copy(base).lerp(projected, adhesion);
      if (ny < profile.releaseBelow) {
        const lower = 1 - THREE.MathUtils.smoothstep(ny, profile.releaseFloor, profile.releaseBelow);
        final.z += metrics.headSize.z * profile.napeBackMul * lower;
      }
      final.sub(anchorPosition);
      positions[index * 3] = final.x;
      positions[index * 3 + 1] = final.y;
      positions[index * 3 + 2] = final.z;
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
    mesh.name = node.name || 'ZW_NativeScalpHairMesh';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    warped.add(mesh);
  });

  if (!warped.children.length) throw new Error('hair asset produced no renderable meshes');
  warped.userData.zwFitContract = 'native-pack-scalp-surface-v3';
  warped.userData.zwNativeReferenceNodes = [...NATIVE_SCALP_REFERENCE_NODES];
  warped.userData.zwStyleBounds = { min: styleBounds.min.toArray(), max: styleBounds.max.toArray() };
  warped.userData.zwScalpSampleCount = scalpField.samples.length;
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
    const time = elapsedSeconds || ((typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000);
    const seed = mount.userData.zwSwaySeed || 0;
    const sway = Math.sin(time * 2.1 + seed) * 0.004;
    delta.multiply(new THREE.Quaternion().setFromAxisAngle(Z_AXIS, sway));
    mount.children.forEach((child) => {
      if (child.userData.zwChainT == null || !child.userData.zwBasePosition) return;
      const frontWeight = Math.max(0, Math.cos(child.userData.zwChainT * TWO_PI));
      child.position.fromArray(child.userData.zwBasePosition);
      child.position.y += Math.sin(time * 3.1 + child.userData.zwChainT * TWO_PI * 2) * 0.0008 * frontWeight;
    });
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
  const desiredKey = isLegacyAssetHair(styleId) ? `${styleId}:${custom.hairColor || 'jet'}:${fitKey}:native-scalp-v3` : 'none';
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
    mount.userData.zwFitContract = 'native-pack-scalp-surface-v3';
    mount.userData.zwFallbackSocket = metrics.fallback;
    mount.add(fitHairToNativeScalp(prototype, instance, metrics, profile, tempAnchorPosition.clone(), colorForHair(custom)));
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
    console.warn('[modular-attachments] native scalp hair mount failed', styleId, error);
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
    const x = centerX + sideness * halfWidth * (1 + frontWeight * fit.frontWidthBoost);
    const y = baseY
      - fit.drop * Math.pow(frontWeight, fit.frontDropPower)
      + fit.backLift * Math.pow(backWeight, 1.5)
      - fit.sideDrop * Math.pow(Math.abs(sideness), 1.35);
    const frontSurface = weightedSurfaceZ(metrics, x, y, true) + fit.chestClearance;
    const backSurface = weightedSurfaceZ(metrics, x, y, false) - fit.backClearance;
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
  group.userData.zwFitContract = 'single-closed-collarbone-loop-v3';
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
  const desiredKey = kind === 'none' ? 'none' : `${kind}:${fitKey}:closed-loop-v3`;
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
    console.warn('[modular-attachments] closed loop jewelry mount failed', kind, error);
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
    instance.nativeScalpField = null;
  }
}
