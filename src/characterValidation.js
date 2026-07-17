// Pure, testable humanoid bounds validation shared by runtime and CI checks.
import * as THREE from 'three';

// Validate final normalized dimensions, not arbitrary source-unit magnitude.
// PSX characters are approximately 400–590 source units tall and legitimately
// normalize down to human scale, so raw source height alone is never a rejection.
export function validateHumanoidGlb(scene, targetHeight) {
  scene.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const { x: width, y: height, z: depth } = size;

  if (![width, height, depth].every(Number.isFinite)) {
    return { ok: false, reason: 'non-finite bounds', size, center, box };
  }
  if (width <= 0 || height <= 0 || depth <= 0) {
    return { ok: false, reason: 'empty bounds', size, center, box };
  }
  if (height < 0.001) {
    return { ok: false, reason: `degenerate source height ${height.toFixed(5)}`, size, center, box };
  }

  const scale = targetHeight / height;
  if (!Number.isFinite(scale) || scale < 0.00005 || scale > 100) {
    return { ok: false, reason: `unsafe normalization scale ${scale}`, size, center, box };
  }

  const finalWidth = width * scale;
  const finalDepth = depth * scale;
  const finalHeight = height * scale;
  if (finalHeight < 1.1 || finalHeight > 2.55) {
    return { ok: false, reason: `final height ${finalHeight.toFixed(2)}m outside 1.1–2.55m`, size, center, box };
  }
  if (finalWidth > 2.2 || finalDepth > 2.2) {
    return {
      ok: false,
      reason: `final width/depth ${finalWidth.toFixed(2)}/${finalDepth.toFixed(2)}m too large`,
      size, center, box,
    };
  }

  return { ok: true, scale, size, box, center, finalWidth, finalDepth, finalHeight };
}
