// ───────────────────────────────────────────────────────────────────────────
// avatarSkin.js — role-aware visible-character adapter.
//
// Player, civilians and police use deliberately different strategies:
//   • player    → modular body/clothing rig with procedural emergency fallback
//   • civilians → curated complete-character GLBs, capped and staged
//   • police    → police GLBs with a procedural uniformed fallback
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

function isUnderNamed(node, names) {
  let p = node;
  while (p) { if (names.has(p.name)) return true; p = p.parent; }
  return false;
}

function hideProceduralMeshes(group, skin, opts = {}) {
  const keepNames = new Set(['heldweapon']);
  if (opts.keepCustomHair) keepNames.add('hair');
  group.traverse((o) => {
    if (!o.isMesh && !o.isSprite) return;
    let p = o;
    while (p) { if (p === skin) return; p = p.parent; }
    if (isUnderNamed(o, keepNames)) return;
    o.visible = false;
  });
}

function setPartMeshesVisible(part, visible) {
  if (!part) return;
  part.traverse?.((node) => {
    if ((!node.isMesh && !node.isSprite) || isUnderNamed(node, new Set(['heldweapon']))) return;
    node.visible = visible;
  });
}

function rememberProceduralParts(avatar) {
  if (!avatar?._proceduralParts && avatar?.parts) {
    avatar._proceduralParts = {
      leftArm: avatar.parts.leftArm,
      rightArm: avatar.parts.rightArm,
      leftLeg: avatar.parts.leftLeg,
      rightLeg: avatar.parts.rightLeg,
      headGroup: avatar.parts.headGroup,
      anchors: avatar.parts.anchors,
    };
  }
}

function setProceduralVisible(avatar, visible) {
  const p = avatar?._proceduralParts || avatar?.parts;
  if (!p) return;
  setPartMeshesVisible(avatar.parts?.torso, visible);
  setPartMeshesVisible(p.leftArm, visible);
  setPartMeshesVisible(p.rightArm, visible);
  setPartMeshesVisible(p.leftLeg, visible);
  setPartMeshesVisible(p.rightLeg, visible);
  setPartMeshesVisible(p.headGroup, visible);
}

function makeRotationDriver(bone) {
  if (!bone) return null;
  const rest = bone.rotation.clone();
  const offset = { x: 0, y: 0, z: 0 };
  const rotation = {
    get x() { return offset.x; }, set x(value) { offset.x = Number(value) || 0; bone.rotation.x = rest.x + offset.x; },
    get y() { return offset.y; }, set y(value) { offset.y = Number(value) || 0; bone.rotation.y = rest.y + offset.y; },
    get z() { return offset.z; }, set z(value) { offset.z = Number(value) || 0; bone.rotation.z = rest.z + offset.z; },
    set(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; return this; },
  };
  return { rotation, userData: { modularBone: bone.name }, bone };
}

function remapPlayerRig(avatar, modular) {
  if (!avatar?.parts || !modular) return;
  rememberProceduralParts(avatar);
  const leftArm = makeRotationDriver(modular.bones.leftArm);
  const rightArm = makeRotationDriver(modular.bones.rightArm);
  const leftLeg = makeRotationDriver(modular.bones.leftLeg);
  const rightLeg = makeRotationDriver(modular.bones.rightLeg);
  if (leftArm) avatar.parts.leftArm = leftArm;
  if (rightArm) avatar.parts.rightArm = rightArm;
  if (leftLeg) avatar.parts.leftLeg = leftLeg;
  if (rightLeg) avatar.parts.rightLeg = rightLeg;
  if (modular.bones.head) avatar.parts.headGroup = modular.bones.head;
  avatar.parts.anchors = { ...(avatar.parts.anchors || {}) };
  if (modular.anchors.head) avatar.parts.anchors.head_top = modular.anchors.head;
  if (modular.anchors.chest) avatar.parts.anchors.upper_chest = modular.anchors.chest;
  if (modular.anchors.rightHand) avatar.parts.anchors.right_hand = modular.anchors.rightHand;
  if (modular.anchors.leftHand) avatar.parts.anchors.left_hand = modular.anchors.leftHand;

  // Move an already-mounted weapon from the procedural fist to the imported hand.
  const held = avatar.group.getObjectByName('heldweapon');
  if (held && modular.anchors.rightHand && held.parent !== modular.anchors.rightHand) {
    try { modular.anchors.rightHand.attach(held); }
    catch { modular.anchors.rightHand.add(held); }
  }
}

function restoreProceduralRig(avatar) {
  const original = avatar?._proceduralParts;
  if (!original || !avatar.parts) return;
  avatar.parts.leftArm = original.leftArm;
  avatar.parts.rightArm = original.rightArm;
  avatar.parts.leftLeg = original.leftLeg;
  avatar.parts.rightLeg = original.rightLeg;
  avatar.parts.headGroup = original.headGroup;
  avatar.parts.anchors = original.anchors;
  setProceduralVisible(avatar, true);
}

function styleImportedSkin(skin) {
  skin.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const material of mats) {
      if (!material) continue;
      if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
      material.envMapIntensity = Math.max(0.7, material.envMapIntensity ?? 1);
    }
  });
}

function removeExistingImportedSkin(avatar) {
  if (!avatar) return;
  if (avatar.modularPlayer) {
    avatar.group.remove(avatar.modularPlayer.group);
    disposeModularPlayerVisual(avatar.modularPlayer);
    avatar.modularPlayer = null;
    restoreProceduralRig(avatar);
  }
  if (avatar.skin) avatar.group.remove(avatar.skin);
  avatar.skin = null; avatar.realSkin = false;
}

function skinAvatar(avatar, glb, opts = {}) {
  const { height = 1.78, playEmbeddedClip = true, label = 'skin', role = 'civilian', assetName = '', keepCustomHair = false } = opts;
  if (!avatar?.group || !glb?.scene) return { ok: false, reason: 'missing avatar or GLB' };
  let skin;
  try { skin = skeletonClone(glb.scene); }
  catch (error) { slog('clone fallback', label, error?.message); skin = glb.scene.clone(true); }
  skin.name = `glb-skin:${role}:${assetName || 'unknown'}`;
  skin.userData.characterRole = role; skin.userData.assetName = assetName;
  const validation = validateHumanoidGlb(skin, height);
  const boundsStr = validation.size ? `${validation.size.x.toFixed(2)}x${validation.size.y.toFixed(2)}x${validation.size.z.toFixed(2)}` : '?';
  if (!validation.ok) {
    slog('rejected', label, validation.reason, '| raw bounds', boundsStr);
    if (typeof window !== 'undefined' && window.__ZW_DEBUG__?.metrics?.failedAssets) window.__ZW_DEBUG__.metrics.failedAssets.push(`${label}: ${validation.reason}`);
    return { ok: false, reason: validation.reason, bounds: boundsStr };
  }
  removeExistingImportedSkin(avatar);
  skin.scale.setScalar(validation.scale);
  skin.position.set(-validation.center.x * validation.scale, -validation.box.min.y * validation.scale, -validation.center.z * validation.scale);
  skin.rotation.y = SKIN_CFG.faceYaw;
  styleImportedSkin(skin);
  avatar.group.add(skin);
  hideProceduralMeshes(avatar.group, skin, { keepCustomHair });
  avatar.skin = skin; avatar.realSkin = true; avatar.skinAsset = assetName; avatar.skinRole = role;
  let activeClip = '';
  if (playEmbeddedClip && glb.animations?.length) {
    const mixer = makeMixer(skin, glb.animations); const first = glb.animations[0];
    if (first) { mixer.play(first.name, { loop: true, fade: 0.1 }); activeClip = first.name; }
    trackMixer(mixer); avatar.skinMixer = mixer; avatar.skinClipNames = mixer.clipNames;
  }
  slog('applied', label, '| scale', validation.scale.toFixed(5), '| clip', activeClip || 'none');
  return { ok: true, bounds: boundsStr, scale: validation.scale, clip: activeClip };
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

export async function applyNpcSkins(npcs, renderer, max = CHARACTER_ROLE_POLICY.civilian.maxLiveSkins) {
  const limit = Math.min(max, CHARACTER_ROLE_POLICY.civilian.maxLiveSkins, npcs.length);
  const list = npcs.slice(0, limit); let applied = 0; let failed = 0;
  Object.assign(SKIN_STATUS.npc, { requested: list.length, loading: list.length, glb: 0, fallback: Math.max(0, npcs.length - list.length) });
  for (let i = 0; i < list.length; i++) {
    const npc = list[i]; const name = stableCharacterCandidate(CIVILIAN_CHARACTER_CANDIDATES, npc.id || i);
    npc.skinState = 'loading'; SKIN_STATUS.npc.last = `${name}: loading`;
    try {
      const glb = await loadAsset('characters', 'psx', name, renderer);
      if (!glb) { failed++; npc.skinState = 'procedural-load-failed'; SKIN_STATUS.npc.last = `${name}: load-failed`; }
      else {
        const result = skinAvatar(npc.av, glb, { height: CHARACTER_ROLE_POLICY.civilian.height, playEmbeddedClip: CHARACTER_ROLE_POLICY.civilian.playEmbeddedClip, label: `npc:${npc.id || i}:${name}`, role: 'civilian', assetName: name });
        if (result.ok) { applied++; npc.realSkin = name; npc.skinState = 'glb'; SKIN_STATUS.npc.last = `${name}: glb`; }
        else { failed++; npc.skinState = `procedural-${result.reason}`; SKIN_STATUS.npc.last = `${name}: ${result.reason}`; }
      }
    } catch (error) {
      failed++; npc.skinState = 'procedural-exception'; SKIN_STATUS.npc.last = `${name}: ${error?.message}`; slog('NPC exception', name, error?.message);
    }
    SKIN_STATUS.npc.loading = list.length - i - 1; SKIN_STATUS.npc.glb = applied;
    SKIN_STATUS.npc.fallback = failed + Math.max(0, npcs.length - list.length);
    await nextFrame();
  }
  slog('NPC summary', debugSnapshot().npc); return applied;
}

let policeSkinSequence = 0;
export async function applyCopSkin(avatar, renderer) {
  const name = POLICE_CHARACTER_CANDIDATES[policeSkinSequence++ % POLICE_CHARACTER_CANDIDATES.length];
  SKIN_STATUS.cop.requested++; SKIN_STATUS.cop.loading++; SKIN_STATUS.cop.last = `${name}: loading`;
  try {
    const glb = await loadAsset('characters', 'psx', name, renderer);
    if (!glb) { SKIN_STATUS.cop.fallback++; SKIN_STATUS.cop.last = `${name}: load-failed`; return null; }
    const result = skinAvatar(avatar, glb, { height: CHARACTER_ROLE_POLICY.police.height, playEmbeddedClip: CHARACTER_ROLE_POLICY.police.playEmbeddedClip, label: `cop:${name}`, role: 'police', assetName: name });
    if (result.ok) { SKIN_STATUS.cop.glb++; SKIN_STATUS.cop.last = `${name}: glb`; return name; }
    SKIN_STATUS.cop.fallback++; SKIN_STATUS.cop.last = `${name}: ${result.reason}`;
  } catch (error) {
    SKIN_STATUS.cop.fallback++; SKIN_STATUS.cop.last = `${name}: ${error?.message}`; slog('COP exception', name, error?.message);
  } finally { SKIN_STATUS.cop.loading = Math.max(0, SKIN_STATUS.cop.loading - 1); }
  return null;
}

// Attach the editable modular player model. The procedural character stays visible
// until the model, selected pieces, textures, morphs and final bounds are ready.
export async function applyPlayerSkin(avatar, renderer) {
  rememberProceduralParts(avatar);
  const custom = ensurePlayerCustom((typeof window !== 'undefined' && window.__ZW_ACTIVE_CUSTOM__) || {});
  SKIN_STATUS.player.mode = CHARACTER_ROLE_POLICY.player.mode;
  SKIN_STATUS.player.label = 'sunbox-male-free';
  SKIN_STATUS.player.reason = 'loading modular body and wardrobe';
  try {
    const modular = await createModularPlayerVisual(custom, renderer, { name: 'modular-player-live' });
    if (!modular?.group || !modular.normalized) {
      SKIN_STATUS.player.reason = 'modular load failed; procedural fallback active';
      return false;
    }
    removeExistingImportedSkin(avatar);
    avatar.group.add(modular.group);
    setProceduralVisible(avatar, false);
    avatar.modularPlayer = modular;
    avatar.skin = modular.group;
    avatar.realSkin = true;
    avatar.skinAsset = 'sunbox-male-free';
    avatar.skinRole = 'player';
    avatar.eyeHeight = modular.normalized.targetHeight * 0.91;
    remapPlayerRig(avatar, modular);
    const size = modular.normalized.sourceSize;
    SKIN_STATUS.player.reason = 'editable modular player active';
    SKIN_STATUS.player.bounds = `${size.x.toFixed(2)}x${size.y.toFixed(2)}x${size.z.toFixed(2)}`;
    SKIN_STATUS.player.scale = modular.normalized.scale;
    slog('player modular applied', SKIN_STATUS.player);
    return true;
  } catch (error) {
    restoreProceduralRig(avatar);
    SKIN_STATUS.player.reason = `modular exception: ${error?.message || error}`;
    slog('PLAYER exception', error?.message || error);
    return false;
  }
}

export { CIVILIAN_CHARACTER_CANDIDATES as CIVILIANS };
