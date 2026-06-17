// ───────────────────────────────────────────────────────────────────────────
//  avatarSkin.js — visible-skin adapter.
//
//  The player + city NPCs are built as PROCEDURAL avatars (good controller,
//  walk animation, collision, customization). This adapter attaches an uploaded
//  humanoid GLB as the VISIBLE skin and hides the procedural body meshes, so the
//  uploaded character art actually shows up in gameplay — while the procedural
//  rig underneath keeps driving position, facing and the walk cycle.
//
//  • The GLB is normalised to the avatar's height and grounded at the feet.
//  • If the GLB has a built-in animation, it plays (idle/walk) via a tracked
//    mixer so it isn't a frozen T-pose.
//  • Procedural meshes are hidden (not removed) so eyeHeight / anchors / the
//    controller stay valid. If the GLB fails to load, nothing is hidden and the
//    procedural avatar remains — never a worse result than before.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { loadAsset, makeMixer } from './assets.js';
import { trackMixer } from './manifest.js';

// Runtime skin telemetry — read by main.js to drive the on-screen debug HUD.
// Each entry: { mode:'glb'|'fallback', label, reason, url, bounds, scale }.
export const SKIN_STATUS = {
  player: { mode: 'pending', label: '—', reason: '', url: '', bounds: '', scale: 0 },
  npc: { glb: 0, fallback: 0, last: '' },
  cop: { glb: 0, fallback: 0, last: '' },
};
if (typeof window !== 'undefined') window.__ZW_SKIN_STATUS__ = SKIN_STATUS;

const slog = (...a) => console.info('[skin]', ...a);

// Runtime-tunable skin config so facing/scale can be corrected LIVE from the
// console without a rebuild (these PSX models vary in their authored forward
// axis). `faceYaw` is added to every skin's Y rotation; flip it to Math.PI if a
// roster reads back-to-front in-game. Kept additive + reversible.
const SKIN_CFG = { faceYaw: 0 };
if (typeof window !== 'undefined') window.__ZW_SKIN__ = SKIN_CFG;

// PSX civilian roster (low-poly humanoids, each with a built-in clip).
const CIVILIANS = [
  'character-01', 'character-02', 'character-03', 'character-04', 'character-05',
  'character-06', 'character-07', 'character-08', 'character-09', 'character-10',
  'character-11', 'character-12', 'character-13', 'character-14', 'character-15',
  'character-16', 'character-female-01', 'character-female-02', 'character-female-03',
  'character-female-04', 'character-female-05', 'character-female-06', 'character-female-07',
  'character-female-08', 'character-female-09', 'character-female-10',
];

function hideProceduralMeshes(group, skin) {
  group.traverse((o) => {
    if (o === skin) return;
    if (o.isMesh || o.isSprite) {
      // keep anything under the skin we just added, and keep the held-weapon prop
      let p = o;
      let keep = false;
      while (p) {
        if (p === skin) { keep = true; break; }
        if (p.name === 'heldweapon') { keep = true; break; }
        p = p.parent;
      }
      if (!keep) o.visible = false;
    }
  });
}

// Attach `glb.scene` as the visible skin of `avatar` (from buildAvatar).
// Validates the GLB bounds FIRST; only hides the procedural body if it passes.
// Returns true on success, false (procedural kept visible) on reject.
//
// CRITICAL: skinned-mesh GLBs must be cloned with SkeletonUtils.clone(), NOT
// Object3D.clone(true) — the plain clone does not rebind the skeleton, so the
// visible mesh collapses/goes invisible while the procedural body is hidden,
// which is exactly the "skins not showing" bug. SkeletonUtils rebinds bones.
function skinAvatar(avatar, glb, { height = 1.78, play = true, label = 'skin' } = {}) {
  if (!avatar || !avatar.group || !glb || !glb.scene) {
    slog('REQUEST', label, '→ no avatar/glb (procedural kept)');
    return false;
  }
  slog('REQUEST', label, 'height', height);
  let skin;
  try {
    skin = skeletonClone(glb.scene);     // skeleton-aware clone (fixes invisible/broken rig)
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
  skin.scale.setScalar(v.scale);
  skin.position.y = -v.box.min.y * v.scale;   // ground feet at root origin (y=0)
  skin.rotation.y = SKIN_CFG.faceYaw;         // live-tunable forward-axis correction
  skin.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  hideProceduralMeshes(avatar.group, skin);  // hide procedural body (validated GLB only)
  avatar.group.add(skin);                    // then add the visible skin
  avatar.skin = skin;
  slog('APPLIED', label, '| rawBounds', boundsStr, '| scale', v.scale.toFixed(3),
    '| faceYaw', SKIN_CFG.faceYaw.toFixed(2), '| clips', (glb.animations && glb.animations.length) || 0);

  if (play && glb.animations && glb.animations.length) {
    const mm = makeMixer(skin, glb.animations);
    const first = glb.animations[0];
    if (first) mm.play(first.name, { loop: true, fade: 0.1 });
    trackMixer(mm);
    avatar.skinMixer = mm;
  }
  return true;
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Strict GLB sanity check BEFORE we hide the procedural body. Rejects empty /
// tiny / huge / NaN bounding boxes and any final size outside a humanoid range,
// so a bad asset can never become a giant blob or an invisible player.
//  Returns { ok, reason, scale, size }.
function validateHumanoidGlb(scene, targetHeight) {
  scene.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  box.getSize(size);
  const { x: w, y: h, z: d } = size;
  if (![w, h, d].every((v) => Number.isFinite(v))) return { ok: false, reason: 'non-finite bounds' };
  if (w <= 0 || h <= 0 || d <= 0) return { ok: false, reason: 'empty bounds' };
  if (h < 0.05) return { ok: false, reason: 'tiny height ' + h.toFixed(3) + ' (huge scale)' };
  if (h > 60) return { ok: false, reason: 'huge height ' + h.toFixed(1) };
  const scale = targetHeight / h;
  const fw = w * scale, fd = d * scale, fh = h * scale;
  if (fh < 1.2 || fh > 2.4) return { ok: false, reason: 'final height ' + fh.toFixed(2) + ' out of 1.2–2.4m', size };
  // A-pose/idle characters can be a touch wider; 1.9m keeps the giant-blob guard
  // while no longer rejecting valid arms-out idle poses.
  if (fw > 1.9 || fd > 1.9) return { ok: false, reason: 'final w/d ' + fw.toFixed(2) + '/' + fd.toFixed(2) + ' > 1.9m', size };
  return { ok: true, scale, size, box };
}

// Replace every city NPC's bubble body with a PSX humanoid GLB.
// `npcs` = array from createCityNPCs (each has `.av` = avatar). Returns count.
export async function applyNpcSkins(npcs, renderer, max = 99) {
  let done = 0, fail = 0;
  const jobs = npcs.slice(0, max).map(async (n, i) => {
    const name = CIVILIANS[i % CIVILIANS.length];
    try {
      const glb = await loadAsset('characters', 'psx', name, renderer);
      if (!glb) { slog('NPC load FAILED', name, '(no GLB at ./assets/models/characters/psx/' + name + '.glb)'); fail++; SKIN_STATUS.npc.last = name + ': load-failed'; return; }
      if (skinAvatar(n.av, glb, { height: 1.75, label: 'npc:' + name })) { n.realSkin = true; done++; SKIN_STATUS.npc.last = name + ': glb'; }
      else { fail++; SKIN_STATUS.npc.last = name + ': rejected'; }
    } catch (e) { fail++; slog('NPC EXC', name, e && e.message); SKIN_STATUS.npc.last = name + ': ' + (e && e.message); }
  });
  await Promise.all(jobs);
  SKIN_STATUS.npc.glb = done; SKIN_STATUS.npc.fallback = fail;
  slog('NPC summary → glb:', done, 'fallback:', fail);
  return done;
}

// PSX police roster (uniformed officers, each with a built-in clip). Used for
// foot-patrol cops so they read clearly as POLICE instead of a hooded civilian.
const POLICE = [
  'character-17-police', 'character-18-police', 'character-19-police',
  'character-20-police', 'character-21-police', 'character-22-police',
  'character-17-female-police', 'character-18-female-police', 'character-19-female-police',
  'character-20-female-police', 'character-25-female-police', 'character-26-female-police',
];

// Replace a foot-cop's procedural body with a real PSX POLICE OFFICER GLB.
// Validated like every other skin — if it fails, the procedural cop is kept.
export async function applyCopSkin(avatar, renderer) {
  const name = pick(POLICE);
  try {
    const glb = await loadAsset('characters', 'psx', name, renderer);
    if (!glb) { slog('COP load FAILED', name); SKIN_STATUS.cop.fallback++; SKIN_STATUS.cop.last = name + ': load-failed'; return null; }
    if (skinAvatar(avatar, glb, { height: 1.82, label: 'cop:' + name })) {
      avatar.realSkin = true; SKIN_STATUS.cop.glb++; SKIN_STATUS.cop.last = name + ': glb';
      return name;
    }
    SKIN_STATUS.cop.fallback++; SKIN_STATUS.cop.last = name + ': rejected';
  } catch (e) { slog('COP EXC', name, e && e.message); SKIN_STATUS.cop.fallback++; SKIN_STATUS.cop.last = name + ': ' + (e && e.message); }
  return null;
}

// Replace the player's procedural body with a PSX humanoid GLB skin.
// seed picks a stable model per save so the player looks consistent.
export async function applyPlayerSkin(avatar, renderer, seed = 0) {
  const name = CIVILIANS[Math.abs(seed) % CIVILIANS.length];
  SKIN_STATUS.player.label = name;
  try {
    const glb = await loadAsset('characters', 'psx', name, renderer);
    if (!glb) { slog('PLAYER load FAILED', name); SKIN_STATUS.player.mode = 'fallback'; SKIN_STATUS.player.reason = 'load-failed'; return false; }
    if (skinAvatar(avatar, glb, { height: 1.8, label: 'player:' + name })) {
      avatar.realSkin = true; SKIN_STATUS.player.mode = 'glb'; SKIN_STATUS.player.reason = '';
      return true;
    }
    SKIN_STATUS.player.mode = 'fallback'; SKIN_STATUS.player.reason = 'rejected';
  } catch (e) { slog('PLAYER EXC', name, e && e.message); SKIN_STATUS.player.mode = 'fallback'; SKIN_STATUS.player.reason = e && e.message; }
  return false;
}

export { CIVILIANS };
