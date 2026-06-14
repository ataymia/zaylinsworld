// ───────────────────────────────────────────────────────────────────────────
//  hairKit.js — attach Kenney mini-kit glTF hair onto the procedural avatar.
//
//  IMPORTANT: the Kenney "hair" glTFs are authored as FULL-BODY SKINNED MESHES
//  (a 67-bone humanoid rig; the hair is one skinned mesh bound to that skeleton).
//  A SkinnedMesh ignores the transform of whatever you parent it under — it is
//  driven entirely by its skeleton — so naively reparenting it makes the hair
//  render at the skeleton's bind pose (full character height) → it "floats in
//  the sky" while the procedural head shows bald.
//
//  The fix is to BAKE the skinned mesh into a plain static mesh at bind pose
//  (apply each bone transform per-vertex, drop the skin attributes). The baked
//  mesh respects normal parenting, so we re-center it by its own bounding box,
//  scale it to the head, and seat it on a scalp anchor — and it rides the head
//  while the avatar walks/runs/enters interiors.
//
//  If anything fails (load error, no skin, bad geometry) we fall back to a
//  PROCEDURAL hairstyle so the character is never bald + floating.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { loadModel } from './assets.js';
import { assetUrl } from './manifest.js';
import { HAIR_GLTF, isGltfHair, buildHair } from './avatar.js';

const HEAD_R = 0.26;
const KIT_DIR = 'models/characters/mini-kit/';

// Remove everything currently mounted on the hair group (procedural or glTF).
function clearMount(mount) {
  for (let i = mount.children.length - 1; i >= 0; i--) {
    const c = mount.children[i];
    mount.remove(c);
    c.traverse?.((o) => { if (o.isMesh && o.geometry) o.geometry.dispose?.(); });
  }
}

// Bake a (possibly skinned) glTF scene into a flat group of static meshes at the
// current bind pose, expressed in world space. The caller re-centers afterwards,
// so absolute placement here doesn't matter — only that the geometry is solid
// and parent-transformable.
function bakeToStatic(root) {
  root.updateMatrixWorld(true);
  const out = new THREE.Group();
  const v = new THREE.Vector3();
  root.traverse((o) => {
    if (o.isSkinnedMesh) {
      const src = o.geometry;
      const posAttr = src.attributes.position;
      if (!posAttr) return;
      const positions = new Float32Array(posAttr.count * 3);
      for (let i = 0; i < posAttr.count; i++) {
        v.fromBufferAttribute(posAttr, i);
        o.applyBoneTransform(i, v); // skin deform → mesh-local skinned position
        o.localToWorld(v);          // → world space
        positions[i * 3] = v.x; positions[i * 3 + 1] = v.y; positions[i * 3 + 2] = v.z;
      }
      const baked = new THREE.BufferGeometry();
      baked.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      if (src.attributes.uv) baked.setAttribute('uv', src.attributes.uv.clone());
      if (src.index) baked.setIndex(src.index.clone());
      baked.computeVertexNormals();
      out.add(new THREE.Mesh(baked, o.material));
    } else if (o.isMesh) {
      const baked = o.geometry.clone();
      baked.applyMatrix4(o.matrixWorld);
      out.add(new THREE.Mesh(baked, o.material));
    }
  });
  return out;
}

// Drop a procedural hairstyle into the mount as a guaranteed fallback so the
// character is never bald when a glTF hair can't be used.
function mountFallback(mount, styleId, hairColorHex) {
  const cfg = HAIR_GLTF[styleId];
  const fallbackId = (cfg && cfg.fallback) || 'taper-fade';
  clearMount(mount);
  const hair = buildHair(fallbackId, hairColorHex || '#241a13');
  hair.name = 'hair-fallback:' + styleId;
  mount.add(hair);
  mount.userData.attached = 'fallback:' + fallbackId;
}

// Attach the configured glTF hairstyle to avatar.parts.hairGroup.
// Returns true if the glTF baked + attached; false if the procedural fallback
// was used instead. Either way the character ends up with visible hair.
export async function attachGltfHair(avatar, styleId, hairColorHex, renderer) {
  if (!avatar || !isGltfHair(styleId)) return false;
  const cfg = HAIR_GLTF[styleId];
  const mount = avatar.parts && avatar.parts.hairGroup;
  const anchors = avatar.parts && avatar.parts.anchors;
  if (!cfg || !mount || !anchors) { if (mount) mountFallback(mount, styleId, hairColorHex); return false; }

  let model = null;
  try {
    model = await loadModel(assetUrl(KIT_DIR + cfg.file), renderer);
  } catch (e) {
    console.warn('[hairKit] load failed for', styleId, e);
  }

  // Stale-attach guard: the avatar's hair selection changed while we were
  // loading → abandon (a newer attach call owns the mount now).
  if (mount.userData.gltfHair && mount.userData.gltfHair !== styleId) return false;

  if (!model || !model.scene) { mountFallback(mount, styleId, hairColorHex); return false; }

  let wrapper;
  try {
    // Clone (SkeletonUtils preserves skinned bindings) then BAKE to static.
    const cloned = skeletonClone(model.scene);
    const baked = bakeToStatic(cloned);

    const box = new THREE.Box3().setFromObject(baked);
    const size = box.getSize(new THREE.Vector3());
    if (!isFinite(size.x) || size.x <= 0 || size.y <= 0) throw new Error('empty hair bbox');

    // Shape sanity: a hair cap is roughly as wide as it is tall. If the baked
    // mesh is much taller than it is wide, the skin-bake produced a full body
    // (not just the hair) — using it would float a giant asset above the head,
    // so bail to the procedural fallback instead.
    const aspect = size.y / (Math.max(size.x, size.z) || 0.0001);
    if (aspect > 2.2) throw new Error('hair bbox not cap-shaped (aspect ' + aspect.toFixed(2) + ')');

    // Re-center by the baked bounding box: XZ centered, bottom at y=0. This
    // discards the asset's original head-space position so the hair seats on the
    // scalp instead of across the eyes.
    const center = box.getCenter(new THREE.Vector3());
    baked.position.x -= center.x;
    baked.position.z -= center.z;
    baked.position.y -= box.min.y;

    // Scale so the hair footprint matches the head width.
    const width = Math.max(size.x, size.z) || 0.2;
    const scale = ((2 * HEAD_R) / width) * (cfg.scaleMul ?? 1);

    wrapper = new THREE.Group();
    wrapper.name = 'gltf-hair:' + styleId;
    wrapper.add(baked);
    wrapper.scale.setScalar(scale);

    // Seat on the chosen scalp anchor (head-local). The baked cap has its bottom
    // at y=0, so to make it WRAP the skull (instead of perching on top like a hat
    // or sinking through the face) we sink it below the anchor by a per-style
    // fraction of its own height. `seat` larger ⇒ hair sits lower/hugs more;
    // yOffset is the fine vertical trim, zOffset the forward/back trim.
    const hairH = size.y * scale;
    const anchor = anchors[cfg.anchor] || anchors.scalp_center;
    const seatFrac = cfg.seat ?? 0.5;
    wrapper.position.set(
      (cfg.xOffset ?? 0),
      anchor.position.y + (cfg.yOffset ?? 0) - hairH * seatFrac,
      anchor.position.z + (cfg.zOffset ?? 0),
    );
    wrapper.rotation.set(cfg.rotX ?? 0, cfg.rotY ?? 0, cfg.rotZ ?? 0);

    // Tint to the chosen hair color and enable shadows. Clone materials so we
    // don't tint the shared loader cache.
    const tint = new THREE.Color(hairColorHex || '#241a13');
    baked.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false; // hair rides a moving head
        if (o.material) {
          o.material = o.material.clone();
          if (o.material.color) o.material.color.copy(tint);
        }
      }
    });
  } catch (e) {
    console.warn('[hairKit] bake/attach failed for', styleId, '→ procedural fallback', e);
    mountFallback(mount, styleId, hairColorHex);
    return false;
  }

  clearMount(mount);
  mount.add(wrapper);
  mount.userData.attached = styleId;
  return true;
}

// Read the computed transform of the currently attached hair for the debug
// overlay. Returns { style, kind, scale, pos, rot } or null.
export function attachedHairInfo(avatar) {
  const mount = avatar?.parts?.hairGroup;
  if (!mount) return null;
  const w = mount.children.find((c) => c.name?.startsWith('gltf-hair:'));
  if (!w) {
    const fb = mount.children.find((c) => c.name?.startsWith('hair-fallback:'));
    if (fb) return { style: mount.userData.attached, kind: 'fallback', scale: 1, pos: fb.position.clone(), rot: { x: 0, y: 0, z: 0 } };
    return null;
  }
  return {
    style: mount.userData.attached,
    kind: 'gltf',
    scale: w.scale.x,
    pos: w.position.clone(),
    rot: { x: w.rotation.x, y: w.rotation.y, z: w.rotation.z },
  };
}
