// ───────────────────────────────────────────────────────────────────────────
//  avatarSkin.js — role-aware visible-character adapter.
//
//  Player, civilians and police do NOT use the same visual strategy:
//    • player    → procedural-custom until modular body/clothing assets exist
//    • civilians → curated complete-character GLBs, capped and staged
//    • police    → police GLBs with a procedural uniformed fallback
//
//  Complete GLBs are validated before the procedural body is hidden. Source-unit
//  scale is intentionally unrestricted: the PSX roster is roughly 400–590 source
//  units tall and is supposed to normalize down to ~1.8 metres.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { loadAsset, makeMixer } from './assets.js';
import { trackMixer } from './manifest.js';
import { validateHumanoidGlb } from './characterValidation.js';
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
    label: 'creator-avatar',
    reason: CHARACTER_ROLE_POLICY.player.reason,
    bounds: 'procedural',
    scale: 1,
  },
  npc: {
    mode: CHARACTER_ROLE_POLICY.civilian.mode,
    requested: 0,
    loading: 0,
    glb: 0,
    fallback: 0,
    last: '',
  },
  cop: {
    mode: CHARACTER_ROLE_POLICY.police.mode,
    requested: 0,
    loading: 0,
    glb: 0,
    fallback: 0,
    last: '',
  },
};

function debugSnapshot() {
  return JSON.parse(JSON.stringify(SKIN_STATUS));
}
if (typeof window !== 'undefined') {
  window.__ZW_SKIN_STATUS__ = SKIN_STATUS;
  window.__ZW_CHARACTER_REPORT__ = debugSnapshot;
}

const slog = (...args) => console.info('[skin]', ...args);

// Runtime-tunable facing correction for imported complete-character models.
const SKIN_CFG = { faceYaw: 0 };
if (typeof window !== 'undefined') window.__ZW_SKIN__ = SKIN_CFG;

function isUnderNamed(node, names) {
  let p = node;
  while (p) {
    if (names.has(p.name)) return true;
    p = p.parent;
  }
  return false;
}

function hideProceduralMeshes(group, skin, opts = {}) {
  const keepNames = new Set(['heldweapon']);
  if (opts.keepCustomHair) keepNames.add('hair');

  group.traverse((o) => {
    if (!o.isMesh && !o.isSprite) return;
    let p = o;
    while (p) {
      if (p === skin) return;
      p = p.parent;
    }
    if (isUnderNamed(o, keepNames)) return;
    o.visible = false;
  });
}

function styleImportedSkin(skin) {
  skin.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    o.frustumCulled = false;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const material of mats) {
      if (!material) continue;
      if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
      material.envMapIntensity = Math.max(0.7, material.envMapIntensity ?? 1);
    }
  });
}

function removeExistingImportedSkin(avatar) {
  if (!avatar || !avatar.skin) return;
  avatar.group.remove(avatar.skin);
  avatar.skin = null;
  avatar.realSkin = false;
}

// Attach `glb.scene` as the visible skin of a procedural avatar. Returns a
// structured result so role callers can report the exact fallback reason.
function skinAvatar(avatar, glb, opts = {}) {
  const {
    height = 1.78,
    playEmbeddedClip = true,
    label = 'skin',
    role = 'civilian',
    assetName = '',
    keepCustomHair = false,
  } = opts;

  if (!avatar || !avatar.group || !glb || !glb.scene) {
    return { ok: false, reason: 'missing avatar or GLB' };
  }

  let skin;
  try {
    skin = skeletonClone(glb.scene);
  } catch (error) {
    slog('clone fallback', label, error && error.message);
    skin = glb.scene.clone(true);
  }
  skin.name = `glb-skin:${role}:${assetName || 'unknown'}`;
  skin.userData.characterRole = role;
  skin.userData.assetName = assetName;

  const validation = validateHumanoidGlb(skin, height);
  const boundsStr = validation.size
    ? `${validation.size.x.toFixed(2)}x${validation.size.y.toFixed(2)}x${validation.size.z.toFixed(2)}`
    : '?';
  if (!validation.ok) {
    slog('rejected', label, validation.reason, '| raw bounds', boundsStr);
    if (typeof window !== 'undefined' && window.__ZW_DEBUG__?.metrics?.failedAssets) {
      window.__ZW_DEBUG__.metrics.failedAssets.push(`${label}: ${validation.reason}`);
    }
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
  styleImportedSkin(skin);

  avatar.group.add(skin);
  hideProceduralMeshes(avatar.group, skin, { keepCustomHair });
  avatar.skin = skin;
  avatar.realSkin = true;
  avatar.skinAsset = assetName;
  avatar.skinRole = role;

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

  slog('applied', label, '| scale', validation.scale.toFixed(5), '| clip', activeClip || 'none');
  return {
    ok: true,
    bounds: boundsStr,
    scale: validation.scale,
    clip: activeClip,
  };
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

// Replace only the nearest/capped civilian set. Excess pedestrians remain the
// lightweight procedural models, protecting frame time and texture memory.
export async function applyNpcSkins(npcs, renderer, max = CHARACTER_ROLE_POLICY.civilian.maxLiveSkins) {
  const limit = Math.min(max, CHARACTER_ROLE_POLICY.civilian.maxLiveSkins, npcs.length);
  const list = npcs.slice(0, limit);
  let applied = 0;
  let failed = 0;

  SKIN_STATUS.npc.requested = list.length;
  SKIN_STATUS.npc.loading = list.length;
  SKIN_STATUS.npc.glb = 0;
  SKIN_STATUS.npc.fallback = Math.max(0, npcs.length - list.length);

  for (let i = 0; i < list.length; i++) {
    const npc = list[i];
    const name = stableCharacterCandidate(CIVILIAN_CHARACTER_CANDIDATES, npc.id || i);
    npc.skinState = 'loading';
    SKIN_STATUS.npc.last = `${name}: loading`;

    try {
      const glb = await loadAsset('characters', 'psx', name, renderer);
      if (!glb) {
        failed++;
        npc.skinState = 'procedural-load-failed';
        SKIN_STATUS.npc.last = `${name}: load-failed`;
      } else {
        const result = skinAvatar(npc.av, glb, {
          height: CHARACTER_ROLE_POLICY.civilian.height,
          playEmbeddedClip: CHARACTER_ROLE_POLICY.civilian.playEmbeddedClip,
          label: `npc:${npc.id || i}:${name}`,
          role: 'civilian',
          assetName: name,
        });
        if (result.ok) {
          applied++;
          npc.realSkin = name;
          npc.skinState = 'glb';
          SKIN_STATUS.npc.last = `${name}: glb`;
        } else {
          failed++;
          npc.skinState = `procedural-${result.reason}`;
          SKIN_STATUS.npc.last = `${name}: ${result.reason}`;
        }
      }
    } catch (error) {
      failed++;
      npc.skinState = 'procedural-exception';
      SKIN_STATUS.npc.last = `${name}: ${error && error.message}`;
      slog('NPC exception', name, error && error.message);
    }

    SKIN_STATUS.npc.loading = list.length - i - 1;
    SKIN_STATUS.npc.glb = applied;
    SKIN_STATUS.npc.fallback = failed + Math.max(0, npcs.length - list.length);
    // One character per frame keeps decoding and scene insertion from clumping.
    await nextFrame();
  }

  slog('NPC summary', debugSnapshot().npc);
  return applied;
}

let policeSkinSequence = 0;
export async function applyCopSkin(avatar, renderer) {
  const name = POLICE_CHARACTER_CANDIDATES[policeSkinSequence++ % POLICE_CHARACTER_CANDIDATES.length];
  SKIN_STATUS.cop.requested++;
  SKIN_STATUS.cop.loading++;
  SKIN_STATUS.cop.last = `${name}: loading`;

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
    SKIN_STATUS.cop.last = `${name}: ${error && error.message}`;
    slog('COP exception', name, error && error.message);
  } finally {
    SKIN_STATUS.cop.loading = Math.max(0, SKIN_STATUS.cop.loading - 1);
  }
  return null;
}

// Kept for API compatibility because main.js calls this after every creator
// rebuild. A complete GLB is deliberately NOT applied to the player: doing so
// would hide the creator-selected body, skin, outfit and shoes. Returning false
// correctly tells the existing debug key that no complete imported body is active.
export async function applyPlayerSkin(avatar) {
  removeExistingImportedSkin(avatar);
  SKIN_STATUS.player.mode = CHARACTER_ROLE_POLICY.player.mode;
  SKIN_STATUS.player.label = 'creator-avatar';
  SKIN_STATUS.player.reason = CHARACTER_ROLE_POLICY.player.reason;
  SKIN_STATUS.player.bounds = 'procedural';
  SKIN_STATUS.player.scale = 1;
  return false;
}

export { CIVILIAN_CHARACTER_CANDIDATES as CIVILIANS };
