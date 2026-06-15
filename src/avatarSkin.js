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
import { loadAsset, makeMixer } from './assets.js';
import { trackMixer } from './manifest.js';

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
// Returns true on success. Keeps the procedural rig in the tree (hidden).
function skinAvatar(avatar, glb, { height = 1.78, play = true } = {}) {
  if (!avatar || !avatar.group || !glb || !glb.scene) return false;
  const skin = glb.scene.clone(true);
  skin.name = 'glb-skin';
  skin.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(skin);
  const h = (box.max.y - box.min.y) || 1;
  const s = height / h;
  skin.scale.setScalar(s);
  skin.position.y = -box.min.y * s;          // ground feet at root origin (y=0)
  skin.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  hideProceduralMeshes(avatar.group, null);  // hide procedural body first
  avatar.group.add(skin);                    // then add the visible skin
  avatar.skin = skin;

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

// Replace every city NPC's bubble body with a PSX humanoid GLB.
// `npcs` = array from createCityNPCs (each has `.av` = avatar). Returns count.
export async function applyNpcSkins(npcs, renderer, max = 99) {
  let done = 0;
  const jobs = npcs.slice(0, max).map(async (n, i) => {
    try {
      const name = CIVILIANS[i % CIVILIANS.length];
      const glb = await loadAsset('characters', 'psx', name, renderer);
      if (glb && skinAvatar(n.av, glb, { height: 1.75 })) { n.realSkin = true; done++; }
    } catch { /* keep procedural */ }
  });
  await Promise.all(jobs);
  if (done) console.info('[skins] NPCs reskinned with PSX models:', done);
  return done;
}

// Replace the player's procedural body with a PSX humanoid GLB skin.
// seed picks a stable model per save so the player looks consistent.
export async function applyPlayerSkin(avatar, renderer, seed = 0) {
  try {
    const name = CIVILIANS[Math.abs(seed) % CIVILIANS.length];
    const glb = await loadAsset('characters', 'psx', name, renderer);
    if (glb && skinAvatar(avatar, glb, { height: 1.8 })) {
      avatar.realSkin = true;
      console.info('[skins] player reskinned with', name);
      return true;
    }
  } catch { /* keep procedural */ }
  return false;
}

export { CIVILIANS };
