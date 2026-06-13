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

const KIT_DIR = 'models/vehicles/car-kit/';
const TARGET_LEN = 4.4;  // metres along Z, matching the procedural cars

// Curated, road-appropriate fleet (excludes karts / debris / cones / tractors).
export const TRAFFIC_FLEET = ['sedan', 'suv', 'taxi', 'van', 'truck', 'hatchback-sports', 'police', 'delivery'];
export const DRIVABLE_DEFAULT = 'hatchback-sports';
export const DEALER_FLEET = ['suv-luxury', 'sedan-sports', 'race-future', 'race'];

const _cache = new Map();   // id -> THREE.Object3D (source scene) | null

// Preload (and cache) the given car ids, or the full default fleet.
export async function preloadVehicles(renderer, ids) {
  const all = ids || [...new Set([...TRAFFIC_FLEET, DRIVABLE_DEFAULT, ...DEALER_FLEET])];
  await Promise.all(all.map(async (id) => {
    if (_cache.has(id)) return;
    let m = null;
    try { m = await loadModel(assetUrl(KIT_DIR + id + '.glb'), renderer); } catch { /* fallback below */ }
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
