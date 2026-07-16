// ───────────────────────────────────────────────────────────────────────────
//  avatarSkin.js — explicit, fallback-safe visible-skin adapter.
//
//  Player, civilian, and police call sites own their own skin requests. This file
//  never intercepts Object3D globally and never guesses an avatar's role. A GLB is
//  validated before the procedural body is hidden, and each avatar group can be
//  claimed only once so duplicate async paths cannot create double bodies.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { loadAsset, makeMixer } from './assets.js';
import { createCharacterMotionDriver } from './characterMotion.js';
import { trackMixer } from './updateRegistry.js';
import {
  CHARACTER_PACK,
  CHARACTER_POLICY,
  CHARACTER_POOLS,
  characterForRole,
  randomCharacterForRole,
} from './config/characterPools.js';

export const SKIN_STATUS = {
  player: {
    mode: 'pending', attempted: 0, applied: 0, fallback: 0,
    label: '—', reason: '', url: '', bounds: '', scale: 0,
    usableClips: 0, poseOnlyClips: 0, proceduralMotion: false,
  },
  npc: {
    attempted: 0, loading: 0, glb: 0, fallback: 0, cap: 0,
    usableClips: 0, poseOnlyClips: 0, proceduralMotion: 0, last: '',
  },
  cop: {
    attempted: 0, loading: 0, glb: 0, fallback: 0,
    usableClips: 0, poseOnlyClips: 0, proceduralMotion: 0, last: '',
  },
};
if (typeof window !== 'undefined') window.__ZW_SKIN_STATUS__ = SKIN_STATUS;

const slog = (...args) => console.info('[skin]', ...args);

// Runtime-tunable facing correction for source packs whose forward axis differs.
const SKIN_CFG = { faceYaw: 0 };
if (typeof window !== 'undefined') window.__ZW_SKIN__ = SKIN_CFG;

function claimSkinAttempt(avatar, role) {
  if (!avatar?.group) return false;
  const data = avatar.group.userData;
  if (data.skinAttempted) return false;
  data.skinAttempted = role;
  data.skinRole = role;
  return true;
}

function isUnderNamed(node, names) {
  let current = node;
  while (current) {
    if (names.has(current.name)) return true;
    current = current.parent;
  }
  return false;
}

function hideProceduralMeshes(group, skin, { keepCustomHair = false } = {}) {
  const keepNames = new Set(['heldweapon']);
  if (keepCustomHair) keepNames.add('hair');

  group.traverse((node) => {
    if (!node.isMesh && !node.isSprite) return;

    let current = node;
    while (current) {
      if (current === skin) return;
      current = current.parent;
    }

    if (!isUnderNamed(node, keepNames)) node.visible = false;
  });
}

function prepareSkinMaterials(skin) {
  skin.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
    node.frustumCulled = false;

    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) {
      if (material?.map) material.map.colorSpace = THREE.SRGBColorSpace;
      if (material && material.envMapIntensity == null) material.envMapIntensity = 1;
    }
  });
}

function normalizeBoneName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/^mixamorig[:_]?/, '')
    .replace(/[^a-z0-9]/g, '');
}

function collectSkinBones(skin) {
  const bones = {};
  skin.traverse((node) => {
    if (!node.isBone) return;
    const key = normalizeBoneName(node.name);
    if (key && !bones[key]) bones[key] = node;
  });
  return bones;
}

function clipKeyCount(clip) {
  let maxKeys = 0;
  for (const track of clip?.tracks || []) {
    maxKeys = Math.max(maxKeys, track.times?.length || 0);
  }
  return maxKeys;
}

export function isUsableCharacterClip(clip) {
  return !!clip && Number(clip.duration || 0) >= 0.2 && clipKeyCount(clip) >= 3;
}

function classifyRuntimeClips(animations) {
  const all = Array.isArray(animations) ? animations : [];
  const usable = all.filter(isUsableCharacterClip);
  return {
    usable,
    poseOnly: all.filter((clip) => !isUsableCharacterClip(clip)),
  };
}

// Public for the audit/test pipeline. Validation never mutates or hides the source.
export function validateHumanoidGlb(scene, targetHeight = 1.78) {
  if (!scene) return { ok: false, reason: 'missing scene' };
  scene.updateWorldMatrix(true, true);

  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const { x: width, y: height, z: depth } = size;

  if (![width, height, depth].every(Number.isFinite)) return { ok: false, reason: 'non-finite bounds' };
  if (width <= 0 || height <= 0 || depth <= 0) return { ok: false, reason: 'empty bounds' };
  if (height < 0.05) return { ok: false, reason: `tiny height ${height.toFixed(3)} (huge scale)` };
  if (height > 1000) return { ok: false, reason: `huge height ${height.toFixed(1)}` };

  const scale = targetHeight / height;
  const finalWidth = width * scale;
  const finalDepth = depth * scale;
  const finalHeight = height * scale;

  if (finalHeight < 1.1 || finalHeight > 2.55) {
    return { ok: false, reason: `final height ${finalHeight.toFixed(2)} out of 1.1–2.55m`, size, center, box };
  }
  if (finalWidth > 3.1 || finalDepth > 3.1) {
    return { ok: false, reason: `final w/d ${finalWidth.toFixed(2)}/${finalDepth.toFixed(2)} > 3.1m`, size, center, box };
  }

  return { ok: true, scale, size, box, center };
}

function skinAvatar(avatar, glb, {
  height = 1.78,
  play = true,
  label = 'skin',
  keepCustomHair = false,
} = {}) {
  if (!avatar?.group || !glb?.scene) {
    slog('REQUEST', label, '→ no avatar/glb; procedural kept');
    return { ok: false, reason: 'missing avatar or GLB' };
  }

  let skin;
  try {
    skin = skeletonClone(glb.scene);
  } catch (error) {
    slog('CLONE-FAIL', label, '→', error?.message, '(using Object3D clone)');
    skin = glb.scene.clone(true);
  }
  skin.name = 'glb-skin';

  const validation = validateHumanoidGlb(skin, height);
  const bounds = validation.size
    ? `${validation.size.x.toFixed(2)}x${validation.size.y.toFixed(2)}x${validation.size.z.toFixed(2)}`
    : '?';

  if (!validation.ok) {
    slog('REJECTED', label, '→', validation.reason, '| rawBounds', bounds, '| procedural kept');
    if (typeof window !== 'undefined' && window.__ZW_DEBUG__?.metrics?.failedAssets) {
      window.__ZW_DEBUG__.metrics.failedAssets.push(`${label}: ${validation.reason}`);
    }
    return { ok: false, reason: validation.reason, bounds };
  }

  skin.scale.setScalar(validation.scale);
  skin.position.set(
    -validation.center.x * validation.scale,
    -validation.box.min.y * validation.scale,
    -validation.center.z * validation.scale,
  );
  skin.rotation.y = SKIN_CFG.faceYaw;
  prepareSkinMaterials(skin);

  // Add first so traversal can positively identify and preserve the GLB subtree.
  avatar.group.add(skin);
  hideProceduralMeshes(avatar.group, skin, { keepCustomHair });

  avatar.skin = skin;
  avatar.skinBones = collectSkinBones(skin);
  avatar.realSkin = true;
  avatar.group.userData.skinApplied = label;

  const clips = classifyRuntimeClips(glb.animations);
  avatar.skinClipNames = clips.usable.map((clip) => clip.name);
  avatar.poseOnlyClipNames = clips.poseOnly.map((clip) => clip.name);

  let proceduralMotion = false;
  if (play && clips.usable.length) {
    const mixer = makeMixer(skin, clips.usable);
    mixer.play(clips.usable[0].name, { loop: true, fade: 0.1 });
    trackMixer(mixer);
    avatar.skinMixer = mixer;
  } else if (Object.keys(avatar.skinBones).length) {
    // Current PSX assets are valid skinned characters with pose-only tracks.
    // Drive their bones procedurally instead of looping the bind pose.
    avatar.skinMotion = trackMixer(createCharacterMotionDriver(avatar, {
      role: avatar.group.userData.skinRole,
    }));
    proceduralMotion = true;
  }

  slog(
    'APPLIED', label,
    '| rawBounds', bounds,
    '| scale', validation.scale.toFixed(3),
    '| keepHair', keepCustomHair,
    '| usableClips', clips.usable.length,
    '| poseOnlyClips', clips.poseOnly.length,
    '| bones', Object.keys(avatar.skinBones).length,
    '| proceduralMotion', proceduralMotion,
  );

  return {
    ok: true,
    bounds,
    scale: validation.scale,
    usableClips: clips.usable.length,
    poseOnlyClips: clips.poseOnly.length,
    boneCount: Object.keys(avatar.skinBones).length,
    proceduralMotion,
  };
}

const sleepFrame = () => new Promise((resolve) => {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(resolve);
  else setTimeout(resolve, 0);
});

// Replace only the first capped set of city civilians. Distant/excess NPCs remain
// procedural, which is deliberate for frame rate and draw-call control.
export async function applyNpcSkins(npcs, renderer, max = CHARACTER_POLICY.civilian.maxLive) {
  if (!CHARACTER_POLICY.civilian.enabled) return 0;
  const source = Array.isArray(npcs) ? npcs : [];
  const list = source.slice(0, Math.min(max, source.length));
  SKIN_STATUS.npc.cap = list.length;
  SKIN_STATUS.npc.loading = list.length;

  let applied = 0;
  let fallback = 0;

  for (let index = 0; index < list.length; index++) {
    const npc = list[index];
    const avatar = npc?.av;
    const name = characterForRole('civilian', npc?.id ?? index);

    if (!name || !claimSkinAttempt(avatar, 'civilian')) {
      SKIN_STATUS.npc.loading = Math.max(0, SKIN_STATUS.npc.loading - 1);
      continue;
    }
    SKIN_STATUS.npc.attempted++;
    SKIN_STATUS.npc.last = `${name}: loading`;

    try {
      const glb = await loadAsset('characters', CHARACTER_PACK, name, renderer);
      if (!glb) {
        fallback++;
        SKIN_STATUS.npc.last = `${name}: load-failed`;
      } else {
        const result = skinAvatar(avatar, glb, {
          height: CHARACTER_POLICY.civilian.targetHeight,
          label: `npc:${name}`,
          keepCustomHair: CHARACTER_POLICY.civilian.keepCustomHair,
        });
        if (result.ok) {
          npc.realSkin = name;
          applied++;
          SKIN_STATUS.npc.usableClips += result.usableClips;
          SKIN_STATUS.npc.poseOnlyClips += result.poseOnlyClips;
          if (result.proceduralMotion) SKIN_STATUS.npc.proceduralMotion++;
          SKIN_STATUS.npc.last = `${name}: glb`;
        } else {
          fallback++;
          SKIN_STATUS.npc.last = `${name}: ${result.reason}`;
        }
      }
    } catch (error) {
      fallback++;
      SKIN_STATUS.npc.last = `${name}: ${error?.message || 'exception'}`;
      slog('NPC EXC', name, error?.message);
    }

    SKIN_STATUS.npc.loading = Math.max(0, SKIN_STATUS.npc.loading - 1);
    if ((index + 1) % CHARACTER_POLICY.civilian.staggerEvery === 0) await sleepFrame();
  }

  SKIN_STATUS.npc.glb += applied;
  SKIN_STATUS.npc.fallback += fallback + Math.max(0, source.length - list.length);
  slog('NPC summary → glb:', applied, 'fallback:', fallback, 'capped:', source.length - list.length);
  return applied;
}

export async function applyCopSkin(avatar, renderer) {
  if (!CHARACTER_POLICY.police.enabled) return null;
  if (!claimSkinAttempt(avatar, 'police')) return avatar?.realSkin || null;

  const name = randomCharacterForRole('police');
  SKIN_STATUS.cop.attempted++;
  SKIN_STATUS.cop.loading++;
  SKIN_STATUS.cop.last = `${name}: loading`;

  try {
    const glb = await loadAsset('characters', CHARACTER_PACK, name, renderer);
    if (!glb) {
      SKIN_STATUS.cop.fallback++;
      SKIN_STATUS.cop.last = `${name}: load-failed`;
      return null;
    }

    const result = skinAvatar(avatar, glb, {
      height: CHARACTER_POLICY.police.targetHeight,
      label: `cop:${name}`,
      keepCustomHair: CHARACTER_POLICY.police.keepCustomHair,
    });
    if (!result.ok) {
      SKIN_STATUS.cop.fallback++;
      SKIN_STATUS.cop.last = `${name}: ${result.reason}`;
      return null;
    }

    avatar.realSkin = name;
    SKIN_STATUS.cop.glb++;
    SKIN_STATUS.cop.usableClips += result.usableClips;
    SKIN_STATUS.cop.poseOnlyClips += result.poseOnlyClips;
    if (result.proceduralMotion) SKIN_STATUS.cop.proceduralMotion++;
    SKIN_STATUS.cop.last = `${name}: glb`;
    return name;
  } catch (error) {
    SKIN_STATUS.cop.fallback++;
    SKIN_STATUS.cop.last = `${name}: ${error?.message || 'exception'}`;
    slog('COP EXC', name, error?.message);
    return null;
  } finally {
    SKIN_STATUS.cop.loading = Math.max(0, SKIN_STATUS.cop.loading - 1);
  }
}

export async function applyPlayerSkin(avatar, renderer, seed = 0) {
  if (!CHARACTER_POLICY.player.enabled) return false;
  if (!claimSkinAttempt(avatar, 'player')) return !!avatar?.realSkin;

  const name = characterForRole('player', seed);
  SKIN_STATUS.player.mode = 'loading';
  SKIN_STATUS.player.attempted++;
  SKIN_STATUS.player.label = name || '—';
  SKIN_STATUS.player.reason = '';

  if (!name) {
    SKIN_STATUS.player.mode = 'fallback';
    SKIN_STATUS.player.fallback++;
    SKIN_STATUS.player.reason = 'empty player pool';
    return false;
  }

  try {
    const glb = await loadAsset('characters', CHARACTER_PACK, name, renderer);
    if (!glb) {
      SKIN_STATUS.player.mode = 'fallback';
      SKIN_STATUS.player.fallback++;
      SKIN_STATUS.player.reason = 'load-failed';
      return false;
    }

    const result = skinAvatar(avatar, glb, {
      height: CHARACTER_POLICY.player.targetHeight,
      label: `player:${name}`,
      keepCustomHair: CHARACTER_POLICY.player.keepCustomHair,
    });

    if (!result.ok) {
      SKIN_STATUS.player.mode = 'fallback';
      SKIN_STATUS.player.fallback++;
      SKIN_STATUS.player.reason = result.reason;
      SKIN_STATUS.player.bounds = result.bounds || '';
      return false;
    }

    SKIN_STATUS.player.mode = 'glb';
    SKIN_STATUS.player.applied++;
    SKIN_STATUS.player.bounds = result.bounds;
    SKIN_STATUS.player.scale = result.scale;
    SKIN_STATUS.player.usableClips = result.usableClips;
    SKIN_STATUS.player.poseOnlyClips = result.poseOnlyClips;
    SKIN_STATUS.player.proceduralMotion = result.proceduralMotion;
    return true;
  } catch (error) {
    SKIN_STATUS.player.mode = 'fallback';
    SKIN_STATUS.player.fallback++;
    SKIN_STATUS.player.reason = error?.message || 'exception';
    return false;
  }
}

export const CIVILIANS = CHARACTER_POOLS.civilian;
export const PLAYER_CANDIDATES = CHARACTER_POOLS.player;
export const POLICE = CHARACTER_POOLS.police;
