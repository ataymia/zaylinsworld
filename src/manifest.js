// ───────────────────────────────────────────────────────────────────────────
//  manifest.js — asset slot resolution + GLB loading with procedural fallback.
//
//  Single source of truth for "what real model goes where". Reads
//  src/config/manifest.json (bundled), resolves slot paths to URLs under
//  public/assets/ (honoring Vite's BASE_URL so GH Pages subpaths work), loads
//  GLBs through the optimized loader in assets.js, and swaps them onto the
//  existing procedural meshes. Empty/failed slots warn ONCE and keep the
//  procedural fallback so the game never crashes.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import manifest from './config/manifest.json';
import { loadModel, makeMixer } from './assets.js';

const BASE = (import.meta.env && import.meta.env.BASE_URL) || './';

function assetUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;            // absolute CDN url
  const base = BASE.endsWith('/') ? BASE : BASE + '/';
  return base + 'assets/' + String(path).replace(/^\/+/, '');
}

// ── warn-once helpers ─────────────────────────────────────────────────────────
const _warned = new Set();
function warnOnce(key, msg) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[assets] ' + msg);
}

// ── slot lookup / normalization ───────────────────────────────────────────────
function rawSlot(category, slot) {
  const c = manifest[category];
  if (!c || !(slot in c)) {
    warnOnce(`missing:${category}.${slot}`, `No manifest slot "${category}.${slot}".`);
    return null;
  }
  return c[slot];
}

function normSlot(v) {
  if (!v) return null;
  if (typeof v === 'string') return { file: v, scale: 1, yOffset: 0, rotationY: 0 };
  if (!v.file) return null;
  return { file: v.file, scale: v.scale ?? 1, yOffset: v.yOffset ?? 0, rotationY: v.rotationY ?? 0 };
}

export function hdriUrl() {
  const v = manifest.environment && manifest.environment.hdri;
  return v ? assetUrl(v) : null;
}

// Load the GLB for a slot. Returns { scene, animations, meta } or null.
// Applies the slot's scale/offset/rotation transform to the loaded scene.
export async function loadSlotModel(category, slot, renderer) {
  const meta = normSlot(rawSlot(category, slot));
  if (!meta) {
    warnOnce(`empty:${category}.${slot}`, `Slot "${category}.${slot}" empty → procedural fallback.`);
    return null;
  }
  const url = assetUrl(meta.file);
  const model = await loadModel(url, renderer);
  if (!model || !model.scene) {
    warnOnce(`fail:${category}.${slot}`, `Failed to load "${url}" (${category}.${slot}) → procedural fallback.`);
    return null;
  }
  model.scene.scale.multiplyScalar(meta.scale);
  model.scene.position.y += meta.yOffset;
  model.scene.rotation.y += meta.rotationY;
  console.info(`[assets] Loaded ${category}.${slot} ← ${meta.file}`);
  return { ...model, meta };
}

// ── animation mixers ──────────────────────────────────────────────────────────
const _mixers = new Set();
export function trackMixer(m) { _mixers.add(m); return m; }
export function updateMixers(dt) { for (const m of _mixers) m.update(dt); }

// ── swap helpers ──────────────────────────────────────────────────────────────
function boxOf(obj) { return new THREE.Box3().setFromObject(obj); }

// Replace a procedural avatar's body with a humanoid GLB (keeps the procedural
// rig hidden as a fallback). Normalizes height + grounds the model; plays an
// idle/walk clip if the GLB ships animations.
export async function enhanceAvatar(avatar, category, slot, renderer) {
  const model = await loadSlotModel(category, slot, renderer);
  if (!model) return false;
  const before = [...avatar.group.children];
  const h = boxOf(model.scene).getSize(new THREE.Vector3()).y;
  if (h > 0.01) model.scene.scale.multiplyScalar(((avatar.eyeHeight || 1.6) * 1.16) / h);
  model.scene.position.y -= boxOf(model.scene).min.y;             // feet to floor
  model.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  avatar.group.add(model.scene);
  before.forEach((c) => { c.visible = false; });                  // hide procedural body
  avatar.usingModel = true;
  avatar.modelRoot = model.scene;
  if (model.animations && model.animations.length) {
    const mm = makeMixer(model.scene, model.animations);
    avatar.mixer = trackMixer(mm);
    mm.play('idle') || mm.play('Idle') || mm.play(model.animations[0].name);
  }
  return true;
}

// Replace a procedural car group's body with a vehicle GLB. Normalizes length,
// grounds it, and re-points userData.wheels at any wheel-named meshes so the
// existing spin code keeps working.
export async function enhanceVehicle(group, slot, renderer) {
  const model = await loadSlotModel('vehicles', slot, renderer);
  if (!model) return false;
  const before = [...group.children];
  const len = boxOf(model.scene).getSize(new THREE.Vector3()).z;
  if (len > 0.01) model.scene.scale.multiplyScalar(4.4 / len);    // ~4.4m long like the procedural cars
  model.scene.position.y -= boxOf(model.scene).min.y;
  model.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  group.add(model.scene);
  before.forEach((c) => { c.visible = false; });                  // hide procedural body
  const wheels = [];
  model.scene.traverse((o) => { if (o.isMesh && /wheel|tire|rim/i.test(o.name)) wheels.push(o); });
  if (wheels.length) group.userData.wheels = wheels;
  group.userData.usingModel = true;
  return true;
}

// Replace a procedural interior's visuals with an interior shell GLB. Hides the
// procedural room meshes (collision colliders are separate, so movement still
// works). Use only when the GLB provides its own walls/floor.
export async function enhanceInterior(parentGroup, addedMeshes, slot, renderer) {
  const model = await loadSlotModel('interiors', slot, renderer);
  if (!model) return false;
  model.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  parentGroup.add(model.scene);
  addedMeshes.forEach((m) => { if (m) m.visible = false; });
  return true;
}

export { manifest, assetUrl };
