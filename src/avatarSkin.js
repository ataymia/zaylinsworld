// ───────────────────────────────────────────────────────────────────────────
// avatarSkin.js — role-aware visible-character adapter.
//
// Exactly one visible body owns each character. The player uses an editable
// modular rig. Civilians use complete imported PSX bodies with direct bone
// drivers whose relaxed pose is solved from shoulder-to-hand geometry.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { loadAsset, makeMixer } from './assets.js';
import { trackMixer } from './manifest.js';
import { validateHumanoidGlb } from './characterValidation.js';
import { createModularPlayerVisual, disposeModularPlayerVisual } from './modularPlayer.js';
import { ensurePlayerCustom } from './config/playerAvatarCatalog.js';
import {
  CHARACTER_ROLE_POLICY,
  CIVILIAN_CHARACTER_CANDIDATES,
  POLICE_CHARACTER_CANDIDATES,
  stableCharacterCandidate,
} from './config/characterRoles.js';

export { validateHumanoidGlb } from './characterValidation.js';

export const SKIN_STATUS = {
  player: {
    mode: CHARACTER_ROLE_POLICY.player.mode,
    label: 'modular-player',
    reason: CHARACTER_ROLE_POLICY.player.reason,
    bounds: 'pending',
    scale: 1,
    asset: 'sunbox-male-free',
  },
  npc: {
    mode: CHARACTER_ROLE_POLICY.civilian.mode,
    requested: 0, loading: 0, glb: 0, fallback: 0, last: '',
  },
  cop: {
    mode: CHARACTER_ROLE_POLICY.police.mode,
    requested: 0, loading: 0, glb: 0, fallback: 0, last: '',
  },
};

function debugSnapshot() { return JSON.parse(JSON.stringify(SKIN_STATUS)); }
if (typeof window !== 'undefined') {
  window.__ZW_SKIN_STATUS__ = SKIN_STATUS;
  window.__ZW_CHARACTER_REPORT__ = debugSnapshot;
}
const slog = (...args) => console.info('[skin]', ...args);
const SKIN_CFG = { faceYaw: 0 };
if (typeof window !== 'undefined') window.__ZW_SKIN__ = SKIN_CFG;

function isDescendantOf(node, ancestor) {
  let current = node;
  while (current) {
    if (current === ancestor) return true;
    current = current.parent;
  }
  return false;
}

function isUnderName(node, name) {
  let current = node;
  while (current) {
    if (current.name === name) return true;
    current = current.parent;
  }
  return false;
}

function hideProceduralMeshes(group, visibleOwner) {
  group.traverse((node) => {
    if (!node.isMesh && !node.isSprite) return;
    if (isDescendantOf(node, visibleOwner)) return;
    if (isUnderName(node, 'heldweapon')) return;
    node.visible = false;
    node.userData.zwHiddenByVisualOwner = true;
  });
}

function showProceduralMeshes(group) {
  group.traverse((node) => {
    if ((!node.isMesh && !node.isSprite) || !node.userData.zwHiddenByVisualOwner) return;
    node.visible = true;
    delete node.userData.zwHiddenByVisualOwner;
  });
}

function retireProceduralMeshes(group, visibleOwner) {
  const retired = [];
  group.traverse((node) => {
    if (!node.isMesh && !node.isSprite) return;
    if (isDescendantOf(node, visibleOwner)) return;
    if (isUnderName(node, 'heldweapon')) return;
    if (node.userData.zwHiddenByVisualOwner) retired.push(node);
  });
  for (const node of retired) {
    node.parent?.remove(node);
    node.geometry?.dispose?.();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) material?.dispose?.();
  }
  return retired.length;
}

function rememberProceduralParts(avatar) {
  if (!avatar?._proceduralParts && avatar?.parts) {
    avatar._proceduralParts = {
      leftArm: avatar.parts.leftArm,
      rightArm: avatar.parts.rightArm,
      leftLeg: avatar.parts.leftLeg,
      rightLeg: avatar.parts.rightLeg,
      headGroup: avatar.parts.headGroup,
      torso: avatar.parts.torso,
      hairGroup: avatar.parts.hairGroup,
      anchors: avatar.parts.anchors,
    };
  }
}

function makeEulerDriver(bone, base = {}) {
  if (!bone) return null;
  const rest = bone.rotation.clone();
  rest.x += base.x || 0;
  rest.y += base.y || 0;
  rest.z += base.z || 0;
  bone.rotation.copy(rest);
  const offset = { x: 0, y: 0, z: 0 };
  const rotation = {
    get x() { return offset.x; },
    set x(value) { offset.x = Number(value) || 0; bone.rotation.x = rest.x + offset.x; },
    get y() { return offset.y; },
    set y(value) { offset.y = Number(value) || 0; bone.rotation.y = rest.y + offset.y; },
    get z() { return offset.z; },
    set z(value) { offset.z = Number(value) || 0; bone.rotation.z = rest.z + offset.z; },
    set(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; return this; },
  };
  return { rotation, userData: { modularBone: bone.name, driver: 'euler' }, bone };
}

function farthestBoneDescendant(bone) {
  const queue = [...(bone?.children || [])];
  let chosen = null;
  let bestDepth = -1;
  while (queue.length) {
    const node = queue.shift();
    const depth = node.userData?.zwBoneDepth || 1;
    if (node.isBone && depth > bestDepth) {
      chosen = node;
      bestDepth = depth;
    }
    for (const child of node.children || []) {
      child.userData.zwBoneDepth = depth + 1;
      queue.push(child);
    }
  }
  return chosen;
}

function makeDirectionalArmDriver(bone, endNode, root, desiredRootDirection) {
  if (!bone || !root) return null;
  const end = endNode || farthestBoneDescendant(bone);
  if (!end) return makeEulerDriver(bone);

  root.updateWorldMatrix(true, true);
  bone.updateWorldMatrix(true, true);
  end.updateWorldMatrix(true, true);

  const shoulder = new THREE.Vector3();
  const hand = new THREE.Vector3();
  const currentDirection = new THREE.Vector3();
  const desiredWorldDirection = desiredRootDirection.clone().normalize();
  const rootWorldQuaternion = new THREE.Quaternion();
  const boneWorldQuaternion = new THREE.Quaternion();
  const parentWorldQuaternion = new THREE.Quaternion();
  const inverseParentWorld = new THREE.Quaternion();
  const deltaWorld = new THREE.Quaternion();
  const desiredWorldQuaternion = new THREE.Quaternion();

  bone.getWorldPosition(shoulder);
  end.getWorldPosition(hand);
  currentDirection.copy(hand).sub(shoulder).normalize();
  root.getWorldQuaternion(rootWorldQuaternion);
  desiredWorldDirection.applyQuaternion(rootWorldQuaternion).normalize();
  deltaWorld.setFromUnitVectors(currentDirection, desiredWorldDirection);
  bone.getWorldQuaternion(boneWorldQuaternion);
  desiredWorldQuaternion.copy(deltaWorld).multiply(boneWorldQuaternion);
  bone.parent?.getWorldQuaternion(parentWorldQuaternion);
  inverseParentWorld.copy(parentWorldQuaternion).invert();
  const baseLocalQuaternion = inverseParentWorld.clone().multiply(desiredWorldQuaternion).normalize();

  const axisX = new THREE.Vector3(1, 0, 0).applyQuaternion(rootWorldQuaternion).applyQuaternion(inverseParentWorld).normalize();
  const axisY = new THREE.Vector3(0, 1, 0).applyQuaternion(rootWorldQuaternion).applyQuaternion(inverseParentWorld).normalize();
  const axisZ = new THREE.Vector3(0, 0, 1).applyQuaternion(rootWorldQuaternion).applyQuaternion(inverseParentWorld).normalize();
  const qx = new THREE.Quaternion();
  const qy = new THREE.Quaternion();
  const qz = new THREE.Quaternion();
  const composed = new THREE.Quaternion();
  const offset = { x: 0, y: 0, z: 0 };

  const apply = () => {
    qx.setFromAxisAngle(axisX, offset.x);
    qy.setFromAxisAngle(axisY, offset.y);
    qz.setFromAxisAngle(axisZ, offset.z);
    composed.copy(qx).multiply(qy).multiply(qz).multiply(baseLocalQuaternion);
    bone.quaternion.copy(composed).normalize();
  };
  apply();

  const rotation = {
    get x() { return offset.x; },
    set x(value) { offset.x = Number(value) || 0; apply(); },
    get y() { return offset.y; },
    set y(value) { offset.y = Number(value) || 0; apply(); },
    get z() { return offset.z; },
    set z(value) { offset.z = Number(value) || 0; apply(); },
    set(x = 0, y = 0, z = 0) { offset.x = Number(x) || 0; offset.y = Number(y) || 0; offset.z = Number(z) || 0; apply(); return this; },
  };
  return {
    rotation,
    userData: { modularBone: bone.name, driver: 'directional-arm', relaxed: true },
    bone,
    end,
  };
}

function normalizeBoneName(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function boneEntries(root) {
  const entries = [];
  root.traverse((node) => {
    if (node.isBone) entries.push({ node, key: normalizeBoneName(node.name) });
  });
  return entries;
}

function findBone(entries, patterns, excludes = []) {
  for (const pattern of patterns) {
    const found = entries.find(({ key }) => key.includes(pattern) && !excludes.some((exclude) => key.includes(exclude)));
    if (found) return found.node;
  }
  return null;
}

function importedRig(root) {
  const entries = boneEntries(root);
  return {
    leftArm: findBone(entries, ['mixamorigleftarm', 'leftupperarm', 'upperarmleft', 'upperarml', 'leftarm'], ['forearm', 'lowerarm', 'hand']),
    rightArm: findBone(entries, ['mixamorigrightarm', 'rightupperarm', 'upperarmright', 'upperarmr', 'rightarm'], ['forearm', 'lowerarm', 'hand']),
    leftLeg: findBone(entries, ['mixamorigleftupleg', 'leftupleg', 'leftupperleg', 'upperlegleft', 'upperlegl', 'leftthigh'], ['lowerleg', 'calf', 'foot']),
    rightLeg: findBone(entries, ['mixamorigrightupleg', 'rightupleg', 'rightupperleg', 'upperlegright', 'upperlegr', 'rightthigh'], ['lowerleg', 'calf', 'foot']),
    head: findBone(entries, ['mixamorighead', 'head'], ['headtopend']),
    torso: findBone(entries, ['mixamorigspine2', 'spine2', 'upperchest', 'chest', 'mixamorigspine1', 'spine1', 'spine']),
    rightHand: findBone(entries, ['mixamorigrighthand', 'righthand', 'handr']),
    leftHand: findBone(entries, ['mixamoriglefthand', 'lefthand', 'handl']),
  };
}

function remapPlayerRig(avatar, modular) {
  if (!avatar?.parts || !modular) return;
  rememberProceduralParts(avatar);
  const leftArm = makeDirectionalArmDriver(
    modular.bones.leftArm,
    modular.anchors.leftHand,
    avatar.group,
    new THREE.Vector3(-0.08, -1, 0.07),
  );
  const rightArm = makeDirectionalArmDriver(
    modular.bones.rightArm,
    modular.anchors.rightHand,
    avatar.group,
    new THREE.Vector3(0.08, -1, 0.07),
  );
  const leftLeg = makeEulerDriver(modular.bones.leftLeg);
  const rightLeg = makeEulerDriver(modular.bones.rightLeg);
  if (leftArm) avatar.parts.leftArm = leftArm;
  if (rightArm) avatar.parts.rightArm = rightArm;
  if (leftLeg) avatar.parts.leftLeg = leftLeg;
  if (rightLeg) avatar.parts.rightLeg = rightLeg;
  if (modular.bones.head) avatar.parts.headGroup = makeEulerDriver(modular.bones.head) || modular.bones.head;
  avatar.parts.anchors = { ...(avatar.parts.anchors || {}) };
  if (modular.anchors.head) {
    avatar.parts.anchors.head_top = modular.anchors.head;
    avatar.parts.anchors.scalp_center = modular.anchors.head;
  }
  if (modular.anchors.chest) {
    avatar.parts.anchors.upper_chest = modular.anchors.chest;
    avatar.parts.anchors.neck = modular.anchors.chest;
  }
  if (modular.anchors.rightHand) avatar.parts.anchors.right_hand = modular.anchors.rightHand;
  if (modular.anchors.leftHand) avatar.parts.anchors.left_hand = modular.anchors.leftHand;

  const held = avatar.group.getObjectByName('heldweapon');
  if (held && modular.anchors.rightHand && held.parent !== modular.anchors.rightHand) {
    try { modular.anchors.rightHand.attach(held); }
    catch { modular.anchors.rightHand.add(held); }
  }
  modular.group.userData.zwRelaxedArmPose = !!(leftArm && rightArm);
}

function remapImportedRig(avatar, skin) {
  if (!avatar?.parts || !skin) return false;
  rememberProceduralParts(avatar);
  const rig = importedRig(skin);
  const leftArm = makeDirectionalArmDriver(
    rig.leftArm,
    rig.leftHand,
    avatar.group,
    new THREE.Vector3(-0.10, -1, 0.05),
  );
  const rightArm = makeDirectionalArmDriver(
    rig.rightArm,
    rig.rightHand,
    avatar.group,
    new THREE.Vector3(0.10, -1, 0.05),
  );
  const leftLeg = makeEulerDriver(rig.leftLeg);
  const rightLeg = makeEulerDriver(rig.rightLeg);
  const head = makeEulerDriver(rig.head);
  const torso = makeEulerDriver(rig.torso);
  if (leftArm) avatar.parts.leftArm = leftArm;
  if (rightArm) avatar.parts.rightArm = rightArm;
  if (leftLeg) avatar.parts.leftLeg = leftLeg;
  if (rightLeg) avatar.parts.rightLeg = rightLeg;
  if (head) avatar.parts.headGroup = head;
  if (torso) avatar.parts.torso = torso;
  avatar.parts.anchors = { ...(avatar.parts.anchors || {}) };
  if (rig.head) {
    avatar.parts.anchors.head_top = rig.head;
    avatar.parts.anchors.scalp_center = rig.head;
  }
  if (rig.torso) {
    avatar.parts.anchors.upper_chest = rig.torso;
    avatar.parts.anchors.neck = rig.torso;
  }
  if (rig.rightHand) avatar.parts.anchors.right_hand = rig.rightHand;
  if (rig.leftHand) avatar.parts.anchors.left_hand = rig.leftHand;
  skin.userData.zwDirectRig = {
    leftArm: !!rig.leftArm,
    rightArm: !!rig.rightArm,
    leftLeg: !!rig.leftLeg,
    rightLeg: !!rig.rightLeg,
    head: !!rig.head,
    torso: !!rig.torso,
    relaxedArms: !!(leftArm && rightArm),
  };
  return !!(rig.leftArm && rig.rightArm && rig.leftLeg && rig.rightLeg);
}

function restoreProceduralRig(avatar) {
  const original = avatar?._proceduralParts;
  if (!original || !avatar.parts) return;
  avatar.parts.leftArm = original.leftArm;
  avatar.parts.rightArm = original.rightArm;
  avatar.parts.leftLeg = original.leftLeg;
  avatar.parts.rightLeg = original.rightLeg;
  avatar.parts.headGroup = original.headGroup;
  avatar.parts.torso = original.torso;
  avatar.parts.hairGroup = original.hairGroup;
  avatar.parts.anchors = original.anchors;
  showProceduralMeshes(avatar.group);
  avatar.group.userData.zwVisualOwner = 'procedural';
}

function styleImportedSkin(skin, role) {
  const civilian = role === 'civilian';
  skin.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = civilian ? false : true;
    node.receiveShadow = true;
    node.frustumCulled = true;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) {
      if (!material) continue;
      if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
      material.envMapIntensity = Math.max(0.55, material.envMapIntensity ?? 1);
    }
  });
}

function removeExistingImportedSkin(avatar) {
  if (!avatar) return;
  if (avatar.modularPlayer) {
    const modularGroup = avatar.modularPlayer.group;
    avatar.group.remove(modularGroup);
    disposeModularPlayerVisual(avatar.modularPlayer);
    avatar.modularPlayer = null;
    if (avatar.skin === modularGroup) avatar.skin = null;
    restoreProceduralRig(avatar);
  }
  if (avatar.skin) avatar.group.remove(avatar.skin);
  avatar.skin = null;
  avatar.realSkin = false;
}

function skinAvatar(avatar, glb, opts = {}) {
  const {
    height = 1.78,
    playEmbeddedClip = false,
    label = 'skin',
    role = 'civilian',
    assetName = '',
  } = opts;
  if (!avatar?.group || !glb?.scene) return { ok: false, reason: 'missing avatar or GLB' };
  let skin;
  try { skin = skeletonClone(glb.scene); }
  catch (error) { slog('clone fallback', label, error?.message); skin = glb.scene.clone(true); }
  skin.name = `glb-skin:${role}:${assetName || 'unknown'}`;
  skin.userData.characterRole = role;
  skin.userData.assetName = assetName;
  skin.userData.zwVisualOwner = 'imported-complete';
  const validation = validateHumanoidGlb(skin, height);
  const boundsStr = validation.size
    ? `${validation.size.x.toFixed(2)}x${validation.size.y.toFixed(2)}x${validation.size.z.toFixed(2)}`
    : '?';
  if (!validation.ok) {
    slog('rejected', label, validation.reason, '| raw bounds', boundsStr);
    return { ok: false, reason: validation.reason, bounds: boundsStr };
  }
  removeExistingImportedSkin(avatar);
  skin.scale.setScalar(validation.scale);
  skin.position.set(
    -validation.center.x * validation.scale,
    -validation.box.min.y * validation.scale,
    -validation.center.z * validation.scale,
  );
  skin.rotation.y = SKIN_CFG.faceYaw;
  styleImportedSkin(skin, role);
  avatar.group.add(skin);
  hideProceduralMeshes(avatar.group, skin);
  const directRig = role === 'civilian' ? remapImportedRig(avatar, skin) : false;
  const retiredMeshes = role === 'civilian' ? retireProceduralMeshes(avatar.group, skin) : 0;
  avatar.group.userData.zwVisualOwner = 'imported-complete';
  avatar.skin = skin;
  avatar.realSkin = true;
  avatar.skinAsset = assetName;
  avatar.skinRole = role;
  avatar.directImportedRig = directRig;
  avatar.retiredProceduralMeshes = retiredMeshes;
  let activeClip = '';
  if (playEmbeddedClip && glb.animations?.length) {
    const mixer = makeMixer(skin, glb.animations);
    const first = glb.animations[0];
    if (first) {
      mixer.play(first.name, { loop: true, fade: 0.1 });
      activeClip = first.name;
    }
    trackMixer(mixer);
    avatar.skinMixer = mixer;
    avatar.skinClipNames = mixer.clipNames;
  }
  return { ok: true, bounds: boundsStr, scale: validation.scale, clip: activeClip, directRig, retiredMeshes };
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

export async function applyNpcSkins(npcs, renderer) {
  const policyMax = CHARACTER_ROLE_POLICY.civilian.maxLiveSkins;
  if (policyMax <= 0 || CHARACTER_ROLE_POLICY.civilian.mode === 'procedural-functional') {
    Object.assign(SKIN_STATUS.npc, {
      requested: 0, loading: 0, glb: 0, fallback: npcs.length,
      last: 'complete procedural population active',
    });
    return 0;
  }
  const limit = Math.min(policyMax, npcs.length);
  const list = npcs.slice(0, limit);
  let applied = 0;
  let failed = 0;
  Object.assign(SKIN_STATUS.npc, {
    requested: list.length,
    loading: list.length,
    glb: 0,
    fallback: Math.max(0, npcs.length - list.length),
  });
  for (let index = 0; index < list.length; index++) {
    const npc = list[index];
    const name = stableCharacterCandidate(CIVILIAN_CHARACTER_CANDIDATES, npc.id || index);
    npc.skinState = 'loading';
    try {
      const glb = await loadAsset('characters', 'psx', name, renderer);
      if (!glb) {
        failed++;
        npc.skinState = 'procedural-load-failed';
      } else {
        const result = skinAvatar(npc.av, glb, {
          height: CHARACTER_ROLE_POLICY.civilian.height,
          playEmbeddedClip: CHARACTER_ROLE_POLICY.civilian.playEmbeddedClip,
          label: `npc:${npc.id || index}:${name}`,
          role: 'civilian',
          assetName: name,
        });
        if (result.ok) {
          applied++;
          npc.realSkin = name;
          npc.skinState = result.directRig ? 'glb-direct-rig' : 'glb-root-motion';
        } else {
          failed++;
          npc.skinState = `procedural-${result.reason}`;
        }
      }
    } catch (error) {
      failed++;
      npc.skinState = 'procedural-exception';
      slog('NPC exception', name, error?.message);
    }
    SKIN_STATUS.npc.loading = list.length - index - 1;
    SKIN_STATUS.npc.glb = applied;
    SKIN_STATUS.npc.fallback = failed + Math.max(0, npcs.length - list.length);
    SKIN_STATUS.npc.last = `${name}: ${npc.skinState}`;
    await nextFrame();
  }
  return applied;
}

let policeSkinSequence = 0;
export async function applyCopSkin(avatar, renderer) {
  if (CHARACTER_ROLE_POLICY.police.mode === 'procedural-functional') {
    SKIN_STATUS.cop.fallback++;
    SKIN_STATUS.cop.last = 'functional procedural police active';
    return null;
  }
  const name = POLICE_CHARACTER_CANDIDATES[policeSkinSequence++ % POLICE_CHARACTER_CANDIDATES.length];
  SKIN_STATUS.cop.requested++;
  SKIN_STATUS.cop.loading++;
  try {
    const glb = await loadAsset('characters', 'psx', name, renderer);
    if (!glb) {
      SKIN_STATUS.cop.fallback++;
      SKIN_STATUS.cop.last = `${name}: load-failed`;
      return null;
    }
    const result = skinAvatar(avatar, glb, {
      height: CHARACTER_ROLE_POLICY.police.height,
      playEmbeddedClip: CHARACTER_ROLE_POLICY.police.playEmbeddedClip,
      label: `cop:${name}`,
      role: 'police',
      assetName: name,
    });
    if (result.ok) {
      SKIN_STATUS.cop.glb++;
      SKIN_STATUS.cop.last = `${name}: glb`;
      return name;
    }
    SKIN_STATUS.cop.fallback++;
    SKIN_STATUS.cop.last = `${name}: ${result.reason}`;
  } catch (error) {
    SKIN_STATUS.cop.fallback++;
    SKIN_STATUS.cop.last = `${name}: ${error?.message}`;
  } finally {
    SKIN_STATUS.cop.loading = Math.max(0, SKIN_STATUS.cop.loading - 1);
  }
  return null;
}

export async function applyPlayerSkin(avatar, renderer) {
  rememberProceduralParts(avatar);
  const custom = ensurePlayerCustom((typeof window !== 'undefined' && window.__ZW_ACTIVE_CUSTOM__) || {});
  const request = (avatar._modularRequest || 0) + 1;
  avatar._modularRequest = request;
  SKIN_STATUS.player.mode = CHARACTER_ROLE_POLICY.player.mode;
  SKIN_STATUS.player.label = 'sunbox-male-free';
  SKIN_STATUS.player.reason = 'loading modular body and wardrobe';
  try {
    const modular = await createModularPlayerVisual(custom, renderer, { name: 'modular-player-live' });
    if (request !== avatar._modularRequest) {
      if (modular) disposeModularPlayerVisual(modular);
      return false;
    }
    if (!modular?.group || !modular.normalized) {
      SKIN_STATUS.player.reason = 'modular load failed; procedural fallback active';
      return false;
    }
    removeExistingImportedSkin(avatar);
    avatar.group.add(modular.group);
    hideProceduralMeshes(avatar.group, modular.group);
    avatar.group.userData.zwVisualOwner = 'modular';
    avatar.modularPlayer = modular;
    avatar.skin = modular.group;
    avatar.realSkin = true;
    avatar.skinAsset = 'sunbox-male-free';
    avatar.skinRole = 'player';
    avatar.eyeHeight = modular.normalized.targetHeight * 0.91;
    remapPlayerRig(avatar, modular);
    const size = modular.normalized.sourceSize;
    SKIN_STATUS.player.reason = 'editable modular player active with relaxed arm rig';
    SKIN_STATUS.player.bounds = `${size.x.toFixed(2)}x${size.y.toFixed(2)}x${size.z.toFixed(2)}`;
    SKIN_STATUS.player.scale = modular.normalized.scale;
    return true;
  } catch (error) {
    restoreProceduralRig(avatar);
    SKIN_STATUS.player.reason = `modular exception: ${error?.message || error}`;
    slog('PLAYER exception', error?.message || error);
    return false;
  }
}

export { CIVILIAN_CHARACTER_CANDIDATES as CIVILIANS };
