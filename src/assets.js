// ───────────────────────────────────────────────────────────────────────────
//  assets.js — real glTF asset pipeline + HDRI image-based lighting.
//  * GLTFLoader with Draco + meshopt decompression for optimized .glb/.gltf
//  * KTX2 (Basis) compressed-texture support when a transcoder is present
//  * RGBE HDRI environment loading with graceful fallback to a procedural sky
//  * a small async cache + skinned-animation helper (AnimationMixer)
//
//  Drop properly-licensed (CC0 / commercial-use / original) .glb files into
//  /assets and reference them from /assets/manifest.json — they load here with
//  PBR materials, shadows, and animations, no code changes required.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const CDN = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/';

let _gltf = null;
function gltfLoader(renderer) {
  if (_gltf) return _gltf;
  const draco = new DRACOLoader().setDecoderPath(CDN + 'draco/');
  const ktx2 = new KTX2Loader().setTranscoderPath(CDN + 'basis/');
  if (renderer) ktx2.detectSupport(renderer);
  _gltf = new GLTFLoader()
    .setDRACOLoader(draco)
    .setKTX2Loader(ktx2)
    .setMeshoptDecoder(MeshoptDecoder);
  return _gltf;
}

const _modelCache = new Map();

// Load a .glb/.gltf. Returns { scene, animations } or null if it can't load.
// Never throws — callers fall back to procedural meshes.
export async function loadModel(url, renderer) {
  if (_modelCache.has(url)) return _modelCache.get(url);
  const p = new Promise((resolve) => {
    gltfLoader(renderer).load(
      url,
      (gltf) => {
        gltf.scene.traverse((o) => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
            if (o.material) o.material.envMapIntensity = 1.0;
          }
        });
        resolve({ scene: gltf.scene, animations: gltf.animations || [] });
      },
      undefined,
      () => resolve(null),   // 404 / decode error → procedural fallback
    );
  });
  _modelCache.set(url, p);
  return p;
}

// Build an AnimationMixer + named-clip map for a loaded model.
export function makeMixer(root, animations) {
  const mixer = new THREE.AnimationMixer(root);
  const clips = {};
  for (const clip of animations) clips[clip.name.toLowerCase()] = clip;
  return {
    mixer,
    actions: {},
    play(name, { fade = 0.25, loop = true } = {}) {
      const clip = clips[name.toLowerCase()];
      if (!clip) return null;
      let act = this.actions[name];
      if (!act) { act = mixer.clipAction(clip); this.actions[name] = act; }
      act.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
      act.reset().fadeIn(fade).play();
      return act;
    },
    stop(name, fade = 0.2) { this.actions[name]?.fadeOut(fade); },
    update(dt) { mixer.update(dt); },
  };
}

// Image-based lighting: load a real CC0 HDRI for reflections + ambient light.
// Resolves to the equirect/PMREM env texture, or null on failure (use sky).
export async function loadHDRI(renderer, url, manager) {
  return new Promise((resolve) => {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    new RGBELoader(manager).load(
      url,
      (hdr) => {
        hdr.mapping = THREE.EquirectangularReflectionMapping;
        const env = pmrem.fromEquirectangular(hdr).texture;
        hdr.dispose();
        resolve(env);
      },
      undefined,
      () => resolve(null),
    );
  });
}

// Load the asset manifest (slots → model URLs). Empty/missing is fine.
export async function loadManifest(url = './assets/manifest.json') {
  try {
    const res = await fetch(url);
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}
