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
import { trackMixer } from './manifest.js';

export const SKIN_STATUS = {
  player: {
    mode: 'pending', attempted: 0, applied: 0, fallback: 0,
    label: '—', reason: '', url: '', bounds: '', scale: 0,
  },
  npc: { attempted: 0, loading: 0, glb: 0, fallback: 0, cap: 0, last: '' },
  cop: { attempted: 0, loading: 0, glb: 0, fallback: 0, last: '' },
};
if (typeof window !== 'undefined') window.__ZW_SKIN_STATUS__ = SKIN_STATUS;

const slog = (...args) => console.info('[skin]', ...args);

// Runtime-tunable facing correction for source packs whose forward axis differs.
const SKIN_CFG = { faceYaw: 0 };
if (typeof window !== 'undefined') window.__ZW_SKIN__ = SKIN_CFG;

const CIVILIANS = [
  'character-29-female', 'character-30-female', 'character-31-female', 'character-32-female', 'character-33-female',
  'character-27-female-hm', 'character-28-female-hm',
  'character-female-02', 'character-female-03', 'character-female-04', 'character-female-05',
  'character-female-06', 'character-female-07', 'character-female-08', 'character-female-09', 'character-female-10',
  'character-female-11', 'character-female-12', 'character-female-13', 'character-female-14', 'character-female-15', 'character-female-16',
  'character-01', 'character-02', 'character-03', 'character-04', 'character-05',
  'character-06', 'character-07', 'character-08', 'character-09', 'character-10',
  'character-11', 'character-12', 'character-13', 'character-14', 'character-15', 'character-16',
];

const POLICE = [
  'character-17-police', 'character-18-police', 'character-19-police', 'character-20-police',
  'character-17-female-police', 'character-18-female-police', 'character-19-female-police',
  'character-20-female-police', 'character-25-female-police', 'character-26-female-police',
];

const PLAYER_CANDIDATES = [
  'character-29-female', 'character-30-female', 'character-31-female', 'character-32-female', 'character-33-female',
  'character-female-02', 'character-female-03', 'character-female-04', 'character-female-05',
  'character-female-11', 'character-female-12', 'character-female-13', 'character-female-14',
  'character-27-female-hm', 'character-28-female-hm',
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

function claimSkinAttempt(avatar, role) {
  if (!avatar || !avatar.group) return false;
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
  if (height > 80) return { ok: false, reason: `huge height ${height.toFixed(1)}` };

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
  avatar.realSkin = true;
  avatar.group.userData.skinApplied = label;

  if (play && glb.animations?.length) {
    const mixer = makeMixer(skin, glb.animations);
    const first = glb.animations[0];
    if (first) mixer.play(first.name, { loop: true, fade: 0.1 });
    trackMixer(mixer);
    avatar.skinMixer = mixer;
    avatar.skinClipNames = glb.animations.map((clip) => clip.name);
  }

  slog(
    'APPLIED', label,
    '| rawBounds', bounds,
    '| scale', validation.scale.toFixed(3),
    '| keepHair', keepCustomHair,
    '| clips', glb.animations?.length || 0,
  );

  return { ok: true, bounds, scale: validation.scale, clips: glb.animations?.length || 0 };
}

const sleepFrame = () => new Promise((resolve) => {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(resolve);
  else setTimeout(resolve, 0);
});

// Replace only the first capped set of city civilians. Distant/excess NPCs remain
// procedural, which is deliberate for frame rate and draw-call control.
export async function applyNpcSkins(npcs, renderer, max = 8) {
  const source = Array.isArray(npcs) ? npcs : [];
  const list = source.slice(0, Math.min(max, source.length));
  SKIN_STATUS.npc.cap = list.length;
  SKIN_STATUS.npc.loading = list.length;

  let applied = 0;
  let fallback = 0;

  for (let index = 0; index < list.length; index++) {
    const npc = list[index];
    const avatar = npc?.av;
    const name = CIVILIANS[index % CIVILIANS.length];

    if (!claimSkinAttempt(avatar, 'civilian')) continue;
    SKIN_STATUS.npc.attempted++;
    SKIN_STATUS.npc.last = `${name}: loading`;

    try {
      const glb = await loadAsset('characters', 'psx', name, renderer);
      if (!glb) {
        fallback++;
        SKIN_STATUS.npc.last = `${name}: load-failed`;
      } else {
        const result = skinAvatar(avatar, glb, { height: 1.75, label: `npc:${name}` });
        if (result.ok) {
          npc.realSkin = name;
          applied++;
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
    if (index % 2 === 1) await sleepFrame();
  }

  SKIN_STATUS.npc.glb += applied;
  SKIN_STATUS.npc.fallback += fallback + Math.max(0, source.length - list.length);
  slog('NPC summary → glb:', applied, 'fallback:', fallback, 'capped:', source.length - list.length);
  return applied;
}

export async function applyCopSkin(avatar, renderer) {
  if (!claimSkinAttempt(avatar, 'police')) return avatar?.realSkin || null;

  const name = pick(POLICE);
  SKIN_STATUS.cop.attempted++;
  SKIN_STATUS.cop.loading++;
  SKIN_STATUS.cop.last = `${name}: loading`;

  try {
    const glb = await loadAsset('characters', 'psx', name, renderer);
    if (!glb) {
      SKIN_STATUS.cop.fallback++;
      SKIN_STATUS.cop.last = `${name}: load-failed`;
      return null;
    }

    const result = skinAvatar(avatar, glb, { height: 1.82, label: `cop:${name}` });
    if (!result.ok) {
      SKIN_STATUS.cop.fallback++;
      SKIN_STATUS.cop.last = `${name}: ${result.reason}`;
      return null;
    }

    avatar.realSkin = name;
    SKIN_STATUS.cop.glb++;
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
  if (!claimSkinAttempt(avatar, 'player')) return !!avatar?.realSkin;

  const name = PLAYER_CANDIDATES[Math.abs(seed) % PLAYER_CANDIDATES.length];
  SKIN_STATUS.player.mode = 'loading';
  SKIN_STATUS.player.attempted++;
  SKIN_STATUS.player.label = name;
  SKIN_STATUS.player.reason = '';

  try {
    const glb = await loadAsset('characters', 'psx', name, renderer);
    if (!glb) {
      SKIN_STATUS.player.mode = 'fallback';
      SKIN_STATUS.player.fallback++;
      SKIN_STATUS.player.reason = 'load-failed';
      return false;
    }

    const result = skinAvatar(avatar, glb, {
      height: 1.8,
      label: `player:${name}`,
      keepCustomHair: true,
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
    return true;
  } catch (error) {
    SKIN_STATUS.player.mode = 'fallback';
    SKIN_STATUS.player.fallback++;
    SKIN_STATUS.player.reason = error?.message || 'exception';
    return false;
  }
}

export { CIVILIANS, PLAYER_CANDIDATES, POLICE };
