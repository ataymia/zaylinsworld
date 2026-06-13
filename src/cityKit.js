// ───────────────────────────────────────────────────────────────────────────
//  cityKit.js — place Kenney Retro Urban Kit buildings into the city as real,
//  physically-collidable backdrop, driven by src/config/mapConfig.js (DECOR).
//
//  Each entry is loaded through the optimized glTF loader (assets.js), cloned
//  (the loader caches scenes, so we must clone before mutating), grounded (feet
//  to y=0), scaled, rotated, positioned, and given an axis-aligned box collider
//  (pushed into world.js's shared `colliders` array so the player and vehicles
//  bump into it). These are non-enterable skyline buildings — no door prompts.
//  Failures warn once and are skipped — the rest of the city is fine.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { DECOR } from './config/mapConfig.js';
import { loadModel } from './assets.js';
import { assetUrl } from './manifest.js';
import { colliders } from './world.js';

const KIT_DIR = 'models/buildings/urban-kit/';

// Place all configured decor buildings. Returns the list of placed positions so
// callers can use them for debug/markers.
export async function buildDistrict(scene, renderer) {
  const placed = [];
  for (const b of (DECOR || [])) {
    try {
      const model = await loadModel(assetUrl(KIT_DIR + b.model + '.gltf'), renderer);
      if (!model || !model.scene) { console.warn('[district] skip (load failed):', b.model); continue; }
      const obj = model.scene.clone(true);                 // clone: loader caches scenes
      const ry = Math.atan2(b.face ? b.face[0] : 0, b.face ? b.face[1] : 1);
      const scale = b.scale ?? 0.5;
      obj.scale.setScalar(scale);
      obj.rotation.y = ry;
      obj.updateWorldMatrix(true, true);
      // ground the model: lift so its lowest point sits on y=0
      const box = new THREE.Box3().setFromObject(obj);
      obj.position.set(b.x, -box.min.y, b.z);
      obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      scene.add(obj);

      // collider from the placed footprint
      const cb = new THREE.Box3().setFromObject(obj);
      colliders.push(cb);
      placed.push({ label: b.model, pos: new THREE.Vector3(b.x, 0, b.z) });
    } catch (e) {
      console.warn('[district] error placing', b.model, e);
    }
  }
  return placed;
}
