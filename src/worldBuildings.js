// ───────────────────────────────────────────────────────────────────────────
//  worldBuildings.js — drop the uploaded GLB landmark buildings (gas station,
//  diner, mini-market) into the open lots around the city's ring road.
//
//  These are the converted, web-ready models catalogued in asset-index-v2.json
//  (see tools/organize-assets.mjs). Each is loaded through the optimized glTF
//  loader, normalized to a sane footprint, grounded (feet to y=0), rotated to
//  face its road, given an axis-aligned collider, and topped with a canvas
//  label sign. The gas station also exposes a forecourt refuel point so the
//  fuel system can let drivers fill up. Failures warn once and are skipped.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { loadModel } from './assets.js';
import { assetUrl } from './manifest.js';
import { colliders } from './world.js';

// Placement: x/z = footprint centre, face = unit vector toward the fronting
// road, size = target max horizontal span (m), label/sign = floating marquee.
// `model` is the path under assets/ (from asset-index-v2.json).
const BUILDINGS = [
  {
    id: 'gas', model: 'models/buildings/gas-station/gas-station.glb',
    x: -30, z: 48, face: [0, -1], size: 16, y: 0,
    label: 'GAS-N-GO', sign: '#7dffa1', icon: '⛽',
    refuel: { x: -30, z: 36, r: 8 },        // forecourt where a car fills up
  },
  {
    id: 'diner', model: 'models/buildings/diner/diner.glb',
    x: 44, z: -26, face: [-1, 0], size: 15, y: 0,
    label: 'CITY DINER', sign: '#ffcf6b', icon: '🍔',
  },
  {
    id: 'market', model: 'models/buildings/mini-market/market.glb',
    x: 30, z: 44, face: [0, -1], size: 13, y: 0,
    label: 'MINI MARKET', sign: '#9fe8ff', icon: '🛒',
  },
];

// floating canvas marquee sign
function makeSign(text, color) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(10,12,20,0.88)'; round(ctx, 8, 8, 496, 112, 16); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 6; round(ctx, 8, 8, 496, 112, 16); ctx.stroke();
  ctx.fillStyle = color; ctx.font = 'bold 64px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 68);
  const tex = new THREE.CanvasTexture(c);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  spr.scale.set(6, 1.5, 1);
  return spr;
}
function round(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

// Place all GLB landmark buildings. Returns
// { placed:[{id,label,pos}], refuels:[{x,z,r,id}], markers:[{x,z,icon,color}] }.
export async function placeWorldBuildings(scene, renderer) {
  const out = { placed: [], refuels: [], markers: [] };
  for (const b of BUILDINGS) {
    try {
      const model = await loadModel(assetUrl(b.model), renderer);
      if (!model || !model.scene) { console.warn('[worldbld] skip (load failed):', b.id); continue; }
      const obj = model.scene.clone(true);
      // normalize footprint: scale so the larger of (width,depth) ≈ b.size
      obj.updateWorldMatrix(true, true);
      let box = new THREE.Box3().setFromObject(obj);
      const sz = box.getSize(new THREE.Vector3());
      const span = Math.max(sz.x, sz.z) || 1;
      obj.scale.multiplyScalar(b.size / span);
      // face the road
      obj.rotation.y = Math.atan2(b.face[0], b.face[1]);
      obj.updateWorldMatrix(true, true);
      // ground it (feet to y=0) and position
      box = new THREE.Box3().setFromObject(obj);
      obj.position.set(b.x, (b.y || 0) - box.min.y, b.z);
      obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      scene.add(obj);

      // collider from the placed footprint (slightly inset so the sign/awning
      // overhang doesn't create an invisible wall in the street)
      const cb = new THREE.Box3().setFromObject(obj);
      colliders.push(cb);

      // marquee sign above the roof
      const top = cb.max.y;
      const sign = makeSign(b.label, b.sign);
      sign.position.set(b.x, top + 1.6, b.z);
      scene.add(sign);

      out.placed.push({ id: b.id, label: b.label, pos: new THREE.Vector3(b.x, 0, b.z) });
      out.markers.push({ x: b.x, z: b.z, icon: b.icon, color: b.sign });
      if (b.refuel) out.refuels.push({ ...b.refuel, id: b.id });
    } catch (e) {
      console.warn('[worldbld] error placing', b.id, e);
    }
  }
  if (out.placed.length) console.info('[worldbld] placed:', out.placed.map(p => p.label).join(', '));
  return out;
}
