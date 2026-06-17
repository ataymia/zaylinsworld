// ───────────────────────────────────────────────────────────────────────────
//  avatarSkin.js — visible-skin adapter.
//
//  The player + city NPCs are built as PROCEDURAL avatars (good controller,
//  walk animation, collision, customization). This adapter can attach an uploaded
//  humanoid GLB as the VISIBLE skin and hide the procedural body meshes, while
//  the procedural rig underneath keeps driving movement, anchors, combat and
//  interactions.
//
//  Important rules:
//  • Validate the GLB before hiding anything.
//  • Center the GLB on X/Z and ground it at the feet. Some uploaded characters
//    have off-center origins, so scaling + grounding alone is not enough.
//  • Keep the player's custom procedural hair visible over the GLB body so the
//    creator still matters. NPCs/cops can fully swap to GLB.
//  • Always fall back to the procedural avatar. Never invisible player. Never blob.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { loadAsset, makeMixer } from './assets.js';
import { trackMixer } from './manifest.js';

export const SKIN_STATUS = {
  player: { mode: 'pending', label: '—', reason: '', url: '', bounds: '', scale: 0 },
  npc: { glb: 0, fallback: 0, last: '' },
  cop: { glb: 0, fallback: 0, last: '' },
};
if (typeof window !== 'undefined') window.__ZW_SKIN_STATUS__ = SKIN_STATUS;

const slog = (...a) => console.info('[skin]', ...a);

// Runtime-tunable skin config so facing/scale can be corrected live from console.
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
    if (o === skin) return;
    if (o.isMesh || o.isSprite) {
      // Keep anything under the GLB skin we just added, plus explicitly preserved
      // procedural overlays like held weapons and the player's custom hair.
      let p = o;
      let keep = false;
      while (p) {
        if (p === skin) { keep = true; break; }
        p = p.parent;
      }
      if (!keep && isUnderNamed(o, keepNames)) keep = true;
      if (!keep) o.visible = false;
    }
  });
}

function tintMapsAndShadows(skin) {
  skin.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false;
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          if (m && m.map) m.map.colorSpace = THREE.SRGBColorSpace;
          if (m && m.color) m.color.convertSRGBToLinear?.();
        }
      }
    }
  });
}

// Attach `glb.scene` as the visible skin of `avatar` (from buildAvatar).
function skinAvatar(avatar, glb, { height = 1.78, play = true, label = 'skin', keepCustomHair = false } = {}) {
  if (!avatar || !avatar.group || !glb || !glb.scene) {
    slog('REQUEST', label, '→ no avatar/glb (procedural kept)');
    return false;
  }

  let skin;
  try {
    skin = skeletonClone(glb.scene);
  } catch (e) {
    slog('CLONE-FAIL', label, '→', e && e.message, '(falling back to shallow clone)');
    skin = glb.scene.clone(true);
  }
  skin.name = 'glb-skin';

  const v = validateHumanoidGlb(skin, height);
  const boundsStr = v.size ? `${v.size.x.toFixed(2)}x${v.size.y.toFixed(2)}x${v.size.z.toFixed(2)}` : '?';
  if (!v.ok) {
    slog('REJECTED', label, '→', v.reason, '| rawBounds', boundsStr, '(procedural body kept)');
    if (typeof window !== 'undefined' && window.__ZW_DEBUG__ && window.__ZW_DEBUG__.metrics) {
      window.__ZW_DEBUG__.metrics.failedAssets.push(label + ': ' + v.reason);
    }
    return false;
  }

  // Scale, CENTER on X/Z, and ground feet. This was the missing piece: GLB origins
  // are not guaranteed to be centered, so old skins could be offset even when the
  // load succeeded.
  skin.scale.setScalar(v.scale);
  skin.position.set(-v.center.x * v.scale, -v.box.min.y * v.scale, -v.center.z * v.scale);
  skin.rotation.y = SKIN_CFG.faceYaw;
  tintMapsAndShadows(skin);

  hideProceduralMeshes(avatar.group, skin, { keepCustomHair });
  avatar.group.add(skin);
  avatar.skin = skin;
  avatar.realSkin = true;

  slog('APPLIED', label, '| rawBounds', boundsStr, '| center',
    `${v.center.x.toFixed(2)},${v.center.y.toFixed(2)},${v.center.z.toFixed(2)}`,
    '| scale', v.scale.toFixed(3), '| keepHair', keepCustomHair,
    '| clips', (glb.animations && glb.animations.length) || 0);

  if (play && glb.animations && glb.animations.length) {
    const mm = makeMixer(skin, glb.animations);
    const first = glb.animations[0];
    if (first) mm.play(first.name, { loop: true, fade: 0.1 });
    trackMixer(mm);
    avatar.skinMixer = mm;
  }
  return true;
}

function validateHumanoidGlb(scene, targetHeight) {
  scene.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const { x: w, y: h, z: d } = size;
  if (![w, h, d].every((v) => Number.isFinite(v))) return { ok: false, reason: 'non-finite bounds' };
  if (w <= 0 || h <= 0 || d <= 0) return { ok: false, reason: 'empty bounds' };
  if (h < 0.05) return { ok: false, reason: 'tiny height ' + h.toFixed(3) + ' (huge scale)' };
  if (h > 80) return { ok: false, reason: 'huge height ' + h.toFixed(1) };
  const scale = targetHeight / h;
  const fw = w * scale, fd = d * scale, fh = h * scale;
  if (fh < 1.1 || fh > 2.55) return { ok: false, reason: 'final height ' + fh.toFixed(2) + ' out of 1.1–2.55m', size, center };
  // Looser than before: stylized characters, coats, arms, and accessories can be
  // wide after normalization. Still rejects true blobs.
  if (fw > 3.1 || fd > 3.1) return { ok: false, reason: 'final w/d ' + fw.toFixed(2) + '/' + fd.toFixed(2) + ' > 3.1m', size, center };
  return { ok: true, scale, size, box, center };
}

const sleepFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

// Replace city NPC bubble bodies with PSX humanoid GLBs. Small batches avoid the
// old "load everything at once" lag spike.
export async function applyNpcSkins(npcs, renderer, max = 16) {
  let done = 0, fail = 0;
  const list = npcs.slice(0, Math.min(max, npcs.length));
  for (let i = 0; i < list.length; i++) {
    const n = list[i];
    const name = CIVILIANS[i % CIVILIANS.length];
    try {
      const glb = await loadAsset('characters', 'psx', name, renderer);
      if (!glb) { fail++; SKIN_STATUS.npc.last = name + ': load-failed'; continue; }
      if (skinAvatar(n.av, glb, { height: 1.75, label: 'npc:' + name })) { n.realSkin = true; done++; SKIN_STATUS.npc.last = name + ': glb'; }
      else { fail++; SKIN_STATUS.npc.last = name + ': rejected'; }
    } catch (e) {
      fail++; slog('NPC EXC', name, e && e.message); SKIN_STATUS.npc.last = name + ': ' + (e && e.message);
    }
    if (i % 4 === 3) await sleepFrame();
  }
  SKIN_STATUS.npc.glb = done; SKIN_STATUS.npc.fallback = fail + Math.max(0, npcs.length - list.length);
  slog('NPC summary → glb:', done, 'fallback:', SKIN_STATUS.npc.fallback);
  return done;
}

const POLICE = [
  'character-17-police', 'character-18-police', 'character-19-police', 'character-20-police',
  'character-17-female-police', 'character-18-female-police', 'character-19-female-police',
  'character-20-female-police', 'character-25-female-police', 'character-26-female-police',
];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export async function applyCopSkin(avatar, renderer) {
  const name = pick(POLICE);
  try {
    const glb = await loadAsset('characters', 'psx', name, renderer);
    if (!glb) { SKIN_STATUS.cop.fallback++; SKIN_STATUS.cop.last = name + ': load-failed'; return null; }
    if (skinAvatar(avatar, glb, { height: 1.82, label: 'cop:' + name })) {
      avatar.realSkin = true; SKIN_STATUS.cop.glb++; SKIN_STATUS.cop.last = name + ': glb';
      return name;
    }
    SKIN_STATUS.cop.fallback++; SKIN_STATUS.cop.last = name + ': rejected';
  } catch (e) { slog('COP EXC', name, e && e.message); SKIN_STATUS.cop.fallback++; SKIN_STATUS.cop.last = name + ': ' + (e && e.message); }
  return null;
}

const PLAYER_CANDIDATES = [
  'character-29-female', 'character-30-female', 'character-31-female', 'character-32-female', 'character-33-female',
  'character-female-02', 'character-female-03', 'character-female-04', 'character-female-05',
  'character-female-11', 'character-female-12', 'character-female-13', 'character-female-14',
  'character-27-female-hm', 'character-28-female-hm',
];
export async function applyPlayerSkin(avatar, renderer, seed = 0) {
  const name = PLAYER_CANDIDATES[Math.abs(seed) % PLAYER_CANDIDATES.length];
  SKIN_STATUS.player.label = name;
  try {
    const glb = await loadAsset('characters', 'psx', name, renderer);
    if (!glb) { SKIN_STATUS.player.mode = 'fallback'; SKIN_STATUS.player.reason = 'load-failed'; return false; }
    if (skinAvatar(avatar, glb, { height: 1.8, label: 'player:' + name, keepCustomHair: true })) {
      SKIN_STATUS.player.mode = 'glb'; SKIN_STATUS.player.reason = ''; SKIN_STATUS.player.bounds = 'centered';
      return true;
    }
    SKIN_STATUS.player.mode = 'fallback'; SKIN_STATUS.player.reason = 'rejected';
  } catch (e) { SKIN_STATUS.player.mode = 'fallback'; SKIN_STATUS.player.reason = e && e.message; }
  return false;
}

export { CIVILIANS };
