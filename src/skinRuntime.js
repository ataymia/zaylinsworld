// ───────────────────────────────────────────────────────────────────────────
// skinRuntime.js — fallback-safe visible character skin hook.
//
// main.js already has the official applyPlayerSkin/applyNpcSkins imports, but the
// live status showed all skin counters stuck at pending/0/0, meaning the call path
// was not firing in the deployed game. This runtime hook is intentionally narrow:
// when an Object3D named `avatar` is added to a scene, try to attach a validated
// PSX character GLB directly to that avatar group. If the GLB fails, the original
// procedural avatar stays visible.
//
// This is not the final avatar creator. This is the visual bridge that makes the
// current player/NPC bodies stop looking unchanged while the full character
// system is designed later.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { loadAsset, makeMixer } from './assets.js';
import { trackMixer } from './manifest.js';
import { SKIN_STATUS } from './avatarSkin.js';

const CIVILIANS = [
  'character-29-female', 'character-30-female', 'character-31-female', 'character-32-female', 'character-33-female',
  'character-female-02', 'character-female-03', 'character-female-04', 'character-female-05',
  'character-female-11', 'character-female-12', 'character-female-13', 'character-female-14',
  'character-27-female-hm', 'character-28-female-hm',
  'character-01', 'character-02', 'character-03', 'character-04', 'character-05',
  'character-06', 'character-07', 'character-08', 'character-09', 'character-10',
  'character-11', 'character-12', 'character-13', 'character-14', 'character-15', 'character-16',
];

let avatarSeq = 0;
let installed = false;

export function installSkinRuntime() {
  if (installed || THREE.Object3D.prototype.__zwSkinRuntime) return;
  installed = true;
  THREE.Object3D.prototype.__zwSkinRuntime = true;
  const originalAdd = THREE.Object3D.prototype.add;
  THREE.Object3D.prototype.add = function (...objects) {
    const ret = originalAdd.apply(this, objects);
    for (const obj of objects) {
      if (obj && obj.name === 'avatar') queueEnhance(obj);
    }
    return ret;
  };
  console.info('[skin-runtime] installed avatar add hook');
}

function queueEnhance(group) {
  if (!group || group.userData.__skinRuntimeQueued) return;
  group.userData.__skinRuntimeQueued = true;
  const seq = avatarSeq++;
  // Let buildAvatar finish adding anchors/held weapons before we hide meshes.
  requestAnimationFrame(() => enhanceAvatarGroup(group, seq).catch((e) => {
    console.warn('[skin-runtime] failed', e && e.message);
  }));
}

function keepProcedural(node) {
  let p = node;
  while (p) {
    if (p.name === 'heldweapon') return true;
    if (p.name === 'hair') return true; // keep creator hair visible over the body skin
    if (String(p.name || '').startsWith('anchor:')) return true;
    p = p.parent;
  }
  return false;
}

function hideProcedural(group, skin) {
  group.traverse((o) => {
    if (!o.isMesh && !o.isSprite) return;
    let p = o;
    while (p) {
      if (p === skin) return;
      p = p.parent;
    }
    if (!keepProcedural(o)) o.visible = false;
  });
}

function validate(scene, targetHeight) {
  scene.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  if (![size.x, size.y, size.z].every(Number.isFinite)) return { ok: false, reason: 'non-finite bounds' };
  if (size.y < 0.05 || size.y > 80) return { ok: false, reason: 'bad height ' + size.y.toFixed(2) };
  const scale = targetHeight / size.y;
  const fw = size.x * scale;
  const fd = size.z * scale;
  if (fw > 3.3 || fd > 3.3) return { ok: false, reason: 'too wide ' + fw.toFixed(2) + '/' + fd.toFixed(2) };
  return { ok: true, box, size, center, scale };
}

function styleSkin(skin) {
  skin.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    o.frustumCulled = false;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (m && m.map) m.map.colorSpace = THREE.SRGBColorSpace;
      if (m && m.envMapIntensity == null) m.envMapIntensity = 1.0;
    }
  });
}

async function enhanceAvatarGroup(group, seq) {
  if (!group || group.userData.__skinRuntimeApplied) return;
  const name = CIVILIANS[seq % CIVILIANS.length];
  if (seq === 0) {
    SKIN_STATUS.player.mode = 'loading';
    SKIN_STATUS.player.label = name;
  } else {
    SKIN_STATUS.npc.last = name + ': loading';
  }

  const glb = await loadAsset('characters', 'psx', name, null);
  if (!glb || !glb.scene) {
    if (seq === 0) { SKIN_STATUS.player.mode = 'fallback'; SKIN_STATUS.player.reason = 'load-failed'; }
    else { SKIN_STATUS.npc.fallback++; SKIN_STATUS.npc.last = name + ': load-failed'; }
    return;
  }

  let skin;
  try { skin = skeletonClone(glb.scene); }
  catch { skin = glb.scene.clone(true); }
  skin.name = 'runtime-glb-skin';
  const v = validate(skin, seq === 0 ? 1.8 : 1.75);
  if (!v.ok) {
    if (seq === 0) { SKIN_STATUS.player.mode = 'fallback'; SKIN_STATUS.player.reason = v.reason; }
    else { SKIN_STATUS.npc.fallback++; SKIN_STATUS.npc.last = name + ': ' + v.reason; }
    return;
  }

  skin.scale.setScalar(v.scale);
  skin.position.set(-v.center.x * v.scale, -v.box.min.y * v.scale, -v.center.z * v.scale);
  styleSkin(skin);
  group.add(skin);
  hideProcedural(group, skin);
  group.userData.__skinRuntimeApplied = true;

  if (glb.animations && glb.animations.length) {
    const mm = makeMixer(skin, glb.animations);
    const first = glb.animations[0];
    if (first) mm.play(first.name, { loop: true, fade: 0.1 });
    trackMixer(mm);
  }

  if (seq === 0) {
    SKIN_STATUS.player.mode = 'glb-runtime';
    SKIN_STATUS.player.reason = '';
    SKIN_STATUS.player.bounds = `${v.size.x.toFixed(2)}x${v.size.y.toFixed(2)}x${v.size.z.toFixed(2)}`;
    SKIN_STATUS.player.scale = v.scale;
  } else {
    SKIN_STATUS.npc.glb++;
    SKIN_STATUS.npc.last = name + ': glb-runtime';
  }
  console.info('[skin-runtime] applied', name, 'seq', seq);
}

installSkinRuntime();
