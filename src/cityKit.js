// ───────────────────────────────────────────────────────────────────────────
//  cityKit.js — place Kenney Retro Urban Kit buildings into the city as real,
//  physically-collidable assets, driven by src/config/district.json.
//
//  Each entry is loaded through the optimized glTF loader (assets.js), grounded
//  (feet to y=0), scaled, rotated, positioned, given an axis-aligned box
//  collider (pushed into world.js's shared `colliders` array so the player and
//  vehicles bump into it), and an optional storefront sign so landmarks read
//  clearly. Failures warn once and are skipped — the rest of the city is fine.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import district from './config/district.json';
import { loadModel } from './assets.js';
import { assetUrl } from './manifest.js';
import { colliders } from './world.js';

const KIT_DIR = 'models/buildings/urban-kit/';

function signSprite(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0c0c12'; ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = color || '#ffffff'; ctx.lineWidth = 8; ctx.strokeRect(8, 8, 496, 112);
  ctx.fillStyle = color || '#ffffff'; ctx.font = 'bold 56px Arial';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 66);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  spr.scale.set(6, 1.5, 1);
  return spr;
}

// Place all configured district buildings. Returns the list of placed landmark
// positions (those with a label) so callers can use them for routing/markers.
export async function buildDistrict(scene, renderer) {
  const defScale = (district.defaults && district.defaults.scale) || 0.6;
  const placed = [];
  for (const b of (district.buildings || [])) {
    try {
      const model = await loadModel(assetUrl(KIT_DIR + b.model + '.gltf'), renderer);
      if (!model || !model.scene) { console.warn('[district] skip (load failed):', b.model); continue; }
      const obj = model.scene;
      const scale = b.scale ?? defScale;
      obj.scale.setScalar(scale);
      obj.rotation.y = b.ry || 0;
      obj.updateWorldMatrix(true, true);
      // ground the model: lift so its lowest point sits on y=0
      const box = new THREE.Box3().setFromObject(obj);
      obj.position.set(b.x, -box.min.y, b.z);
      obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      scene.add(obj);

      // collider from the placed footprint
      const cb = new THREE.Box3().setFromObject(obj);
      colliders.push(cb);

      // storefront sign facing outward (+z of the building's local frame)
      if (b.label) {
        const spr = signSprite(b.label, b.sign);
        const size = new THREE.Vector3(); cb.getSize(size);
        const fwd = new THREE.Vector3(Math.sin(b.ry || 0), 0, Math.cos(b.ry || 0));
        spr.position.set(
          b.x + fwd.x * (Math.max(size.x, size.z) * 0.5 + 0.4),
          Math.min(size.y * 0.7, 7),
          b.z + fwd.z * (Math.max(size.x, size.z) * 0.5 + 0.4),
        );
        scene.add(spr);
        placed.push({ label: b.label, pos: new THREE.Vector3(b.x, 0, b.z) });
      }
      console.info('[district] placed', b.model, 'at', b.x, b.z);
    } catch (e) {
      console.warn('[district] error placing', b.model, e);
    }
  }
  return placed;
}
