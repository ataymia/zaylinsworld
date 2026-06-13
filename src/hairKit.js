// ───────────────────────────────────────────────────────────────────────────
//  hairKit.js — attach Kenney mini-kit glTF hair onto the procedural avatar.
//
//  The avatar's procedural head has radius R≈0.26 with named anchors
//  (scalp_center, head_top, hairline_front, scalp_back). Kenney hair assets are
//  authored in their own head-space (head ≈0.19 wide, sitting at y≈1.6). We:
//    1. CLONE the loaded scene (SkeletonUtils, so the loader cache stays pristine
//       and skinned meshes clone correctly),
//    2. re-center the clone by its OWN bounding box (XZ→0, bottom→0) — this
//       discards the asset's original position so hair can never land on the eyes,
//    3. scale it so its width matches the head, then
//    4. seat it on the requested scalp anchor with per-asset offset tuning.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { loadModel } from './assets.js';
import { assetUrl } from './manifest.js';
import { HAIR_GLTF, isGltfHair } from './avatar.js';

const HEAD_R = 0.26;
const KIT_DIR = 'models/characters/mini-kit/';

// Remove any previously attached glTF hair from the avatar's hair mount.
function clearMount(mount) {
  for (let i = mount.children.length - 1; i >= 0; i--) {
    const c = mount.children[i];
    mount.remove(c);
    c.traverse?.((o) => { if (o.isMesh && o.geometry) o.geometry.dispose?.(); });
  }
}

// Attach the configured glTF hairstyle to avatar.parts.hairGroup.
// Returns true on success, false on any failure (procedural fallback stays).
export async function attachGltfHair(avatar, styleId, hairColorHex, renderer) {
  if (!avatar || !isGltfHair(styleId)) return false;
  const cfg = HAIR_GLTF[styleId];
  if (!cfg) return false;
  const mount = avatar.parts && avatar.parts.hairGroup;
  const anchors = avatar.parts && avatar.parts.anchors;
  if (!mount || !anchors) return false;

  const model = await loadModel(assetUrl(KIT_DIR + cfg.file), renderer);
  if (!model || !model.scene) return false;

  // Stale-attach guard: if the avatar's hair selection changed while we were
  // loading, don't attach the now-wrong asset.
  if (mount.userData.gltfHair && mount.userData.gltfHair !== styleId) return false;

  const obj = skeletonClone(model.scene);

  // Re-center by the asset's own bounding box: XZ centered, bottom at y=0.
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  obj.position.x -= center.x;
  obj.position.z -= center.z;
  obj.position.y -= box.min.y;

  // Scale so the hair's footprint matches the head width.
  const width = Math.max(size.x, size.z) || 0.2;
  const scale = ((2 * HEAD_R) / width) * (cfg.scaleMul ?? 1);

  const wrapper = new THREE.Group();
  wrapper.name = 'gltf-hair:' + styleId;
  wrapper.add(obj);
  wrapper.scale.setScalar(scale);

  // Seat on the chosen scalp anchor (head-local). Sink slightly so the cap hugs
  // the skull rather than floating; per-asset offsets fine-tune the fit.
  const anchor = anchors[cfg.anchor] || anchors.scalp_center;
  wrapper.position.set(
    (cfg.xOffset ?? 0),
    anchor.position.y + (cfg.yOffset ?? 0) - HEAD_R * 0.18,
    anchor.position.z + (cfg.zOffset ?? 0),
  );
  wrapper.rotation.set(cfg.rotX ?? 0, cfg.rotY ?? 0, cfg.rotZ ?? 0);

  // Tint to the chosen hair color (multiplies the asset's base texture) and
  // enable shadows. Clone materials so we don't tint the shared cache.
  const tint = new THREE.Color(hairColorHex || '#241a13');
  obj.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false; // skinned hair on a moving head
      if (o.material) {
        o.material = o.material.clone();
        if (o.material.color) o.material.color.copy(tint);
      }
    }
  });

  clearMount(mount);
  mount.add(wrapper);
  mount.userData.attached = styleId;
  return true;
}

// Convenience: read the computed transform of the currently attached hair for
// the debug overlay. Returns null if none attached.
export function attachedHairInfo(avatar) {
  const mount = avatar?.parts?.hairGroup;
  const w = mount?.children?.find((c) => c.name?.startsWith('gltf-hair:'));
  if (!w) return null;
  return {
    style: mount.userData.attached,
    scale: w.scale.x,
    pos: w.position.clone(),
    rot: { x: w.rotation.x, y: w.rotation.y, z: w.rotation.z },
  };
}
