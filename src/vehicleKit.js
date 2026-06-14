// ───────────────────────────────────────────────────────────────────────────
//  vehicleKit.js — swap the procedural cars for real Kenney Car Kit GLBs (CC0).
//
//  The kit cars are static (non-skinned) meshes with SEPARATE wheel nodes
//  (`wheel-front-left`, …) so they keep rolling via the existing spin code.
//  Front of every kit car is +Z (matches the procedural convention), so no
//  re-orientation is needed. We clone PER CAR (cheap — geometry/materials are
//  shared) so many traffic cars never mutate one shared scene.
//
//  Strategy: preload a curated fleet once, then swap each procedural car's
//  visuals in place — the car's transform, collision circle, and drive/steal
//  logic are untouched; only the look changes. If preload fails, the procedural
//  car simply stays (graceful fallback).
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { loadModel } from './assets.js';
import { assetUrl } from './manifest.js';

const TARGET_LEN = 4.4;  // metres along Z, matching the procedural cars

// id → GLB path (relative to assets/models/vehicles/). Mixes the Cosmo "Low Poly
// Cars" pack (detailed bodies, separate wheel nodes named /wheel/i) with the
// Kenney Car Kit fallbacks. Front of every model is +Z (matches the procedural
// convention); per-id `ry` can flip a model whose nose points the other way.
export const VEHICLE_FILES = {
  // Cosmo Low Poly Cars (CC — free, no resale).
  coupe:  'lowpoly-cars/coupe.glb',  ghini:  'lowpoly-cars/ghini.glb',
  italia: 'lowpoly-cars/italia.glb', kamaro: 'lowpoly-cars/kamaro.glb',
  mobil:  'lowpoly-cars/mobil.glb',  van:    'lowpoly-cars/van.glb',
  jeep:   'lowpoly-cars/jeep.glb',   rally:  'lowpoly-cars/rally.glb',
  armor:  'lowpoly-cars/armor.glb',  police: 'lowpoly-cars/police.glb',
  fenyr:  'lowpoly-cars/fenyr.glb',  lamb:   'lowpoly-cars/lamb.glb',
};

// Optional per-id yaw correction (radians) if a model's nose points off +Z.
const VEHICLE_RY = {};

// Curated, road-appropriate fleets drawn from the pack above.
export const TRAFFIC_FLEET = ['coupe', 'ghini', 'kamaro', 'van', 'jeep', 'rally', 'mobil', 'police'];
export const DRIVABLE_DEFAULT = 'kamaro';
export const DEALER_FLEET = ['fenyr', 'lamb', 'italia', 'ghini'];

const _cache = new Map();   // id -> THREE.Object3D (source scene) | null

// Preload (and cache) the given car ids, or the full default fleet.
export async function preloadVehicles(renderer, ids) {
  const all = ids || [...new Set([...TRAFFIC_FLEET, DRIVABLE_DEFAULT, ...DEALER_FLEET])];
  await Promise.all(all.map(async (id) => {
    if (_cache.has(id)) return;
    const rel = VEHICLE_FILES[id];
    if (!rel) { _cache.set(id, null); return; }
    let m = null;
    try { m = await loadModel(assetUrl('models/vehicles/' + rel), renderer); } catch { /* fallback below */ }
    _cache.set(id, m && m.scene ? m.scene : null);
  }));
  return [...TRAFFIC_FLEET, DRIVABLE_DEFAULT, ...DEALER_FLEET].filter((id) => _cache.get(id));
}

export function isVehicleReady(id) { return !!_cache.get(id); }

// Build a grounded, length-normalized clone of a kit car. Returns
// { group, wheels } or null if the id wasn't preloaded.
export function buildKitCar(id) {
  const src = _cache.get(id);
  if (!src) return null;
  const scene = src.clone(true);
  if (VEHICLE_RY[id]) scene.rotation.y = VEHICLE_RY[id];
  // normalize length (Z) to ~4.4m
  let box = new THREE.Box3().setFromObject(scene);
  const len = box.getSize(new THREE.Vector3()).z;
  if (len > 0.01) scene.scale.multiplyScalar(TARGET_LEN / len);
  scene.updateMatrixWorld(true);
  // ground: lift so the lowest point (wheels) rests on y=0
  box = new THREE.Box3().setFromObject(scene);
  scene.position.y -= box.min.y;
  const wheels = [];
  scene.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true; o.receiveShadow = true;
      if (/wheel/i.test(o.name)) wheels.push(o);
    }
  });
  const group = new THREE.Group();
  group.name = 'kitcar:' + id;
  group.add(scene);
  group.userData.wheels = wheels;
  return { group, wheels };
}

// Swap a car object's procedural visuals for a kit car clone. `carObj` is the
// traffic/drivable record ({ g, … }) or a raw group ({ group } / Object3D).
// Keeps the transform + collision; re-points userData.wheels so spin still works.
export function swapVehicleVisual(carObj, id) {
  const built = buildKitCar(id);
  if (!built) return false;
  const g = carObj.g || carObj.group || (carObj.isObject3D ? carObj : null);
  if (!g) return false;
  // remove any prior kit clone, hide procedural body meshes
  for (let i = g.children.length - 1; i >= 0; i--) {
    const c = g.children[i];
    if (c.name && c.name.startsWith('kitcar:')) g.remove(c);
    else c.visible = false;
  }
  g.add(built.group);
  g.userData.wheels = built.wheels;
  if (carObj && typeof carObj === 'object' && 'wheels' in carObj) carObj.wheels = built.wheels;
  g.userData.usingModel = true;
  g.userData.kitCar = id;
  return true;
}
