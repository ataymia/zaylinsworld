// ───────────────────────────────────────────────────────────────────────────
//  monsters.js — Monster Mode: spawn, chase, fight, despawn.
//
//  Spawns a small pack of visible monsters around the player when Monster Mode
//  turns on. Each monster gets a procedural body IMMEDIATELY (so it is always
//  visible even if the GLB is slow/missing), then swaps in a PSX creature GLB
//  when it loads. Monsters wander/chase the player, show a health bar, can be
//  shot (they expose hp via the weapon-target list in main.js), and are removed
//  when Monster Mode turns off.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { loadAsset } from './assets.js';

const MON_NAMES = ['character-monster-01', 'character-monster-02', 'character-monster-03',
  'character-monster-04', 'character-monster-05'];

function makeBar() {
  const grp = new THREE.Group();
  const bg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x101014, depthTest: false, transparent: true, opacity: 0.85 }));
  bg.scale.set(1.0, 0.15, 1);
  const fill = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xff3b5c, depthTest: false, transparent: true }));
  fill.scale.set(0.94, 0.11, 1);
  grp.add(bg, fill);
  grp.renderOrder = 1000;
  grp.userData.fill = fill;
  return grp;
}
function setBar(grp, frac) {
  frac = Math.max(0, Math.min(1, frac));
  const fill = grp.userData.fill;
  fill.scale.x = Math.max(0.001, 0.94 * frac);
  fill.position.x = -0.47 * (1 - frac);
}

// Build one monster at `pos`. Procedural first, GLB swapped in async.
export function createMonster(scene, pos, renderer) {
  const group = new THREE.Group();
  group.position.copy(pos);

  // procedural fallback body — a hunched purple brute (always visible)
  const skinMat = new THREE.MeshStandardMaterial({ color: 0x6a1fb0, roughness: 0.55, metalness: 0.05, emissive: 0x230048, emissiveIntensity: 0.35 });
  const proc = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 0.95, 6, 10), skinMat);
  body.position.y = 1.05; body.castShadow = true; proc.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 10), skinMat);
  head.position.y = 1.95; head.castShadow = true; proc.add(head);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffe23b, emissive: 0xff7a00, emissiveIntensity: 1.4 });
  for (const sx of [-0.15, 0.15]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), eyeMat);
    eye.position.set(sx, 1.99, 0.32); proc.add(eye);
  }
  for (const sx of [-0.45, 0.45]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.7, 4, 6), skinMat);
    arm.position.set(sx, 1.05, 0); arm.castShadow = true; proc.add(arm);
  }
  group.add(proc);

  const bar = makeBar();
  bar.position.set(0, 2.6, 0);
  group.add(bar);

  scene.add(group);

  const m = {
    kind: 'monster', group, proc, bar,
    hp: 120, maxHp: 120,
    speed: 2.0 + Math.random() * 1.4,
    hitT: 0, phase: Math.random() * Math.PI * 2,
    skin: null,
  };

  // swap in a real PSX creature model when it loads — gated behind a feature flag
  // so an unvalidated GLB can't break Monster Mode (procedural brute stays visible).
  const useGlb = typeof window !== 'undefined' && window.__ZW_FEATURES__ && window.__ZW_FEATURES__.USE_GLB_MONSTERS;
  if (useGlb) {
    const name = MON_NAMES[Math.floor(Math.random() * MON_NAMES.length)];
    loadAsset('characters', 'psx', name, renderer).then((res) => {
      if (!res || !res.scene) return;
      const skin = res.scene.clone(true);
      skin.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(skin);
      const h = (box.max.y - box.min.y) || 1;
      // reject unusable bounds → keep the procedural brute (never a giant blob)
      if (!isFinite(h) || h < 0.2 || h > 40) { console.warn('[monster] GLB rejected, bad height', h, name); return; }
      const s = 1.95 / h;                       // normalise to ~1.95m tall
      skin.scale.setScalar(s);
      skin.position.y = -box.min.y * s;
      skin.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
      group.add(skin);
      proc.visible = false;                     // hide the procedural stand-in
      m.skin = skin;
    }).catch(() => { /* keep procedural body */ });
  }

  return m;
}

// Spawn `count` monsters on a ring around `center`.
export function spawnMonsters(scene, center, count, renderer) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2 + Math.random() * 0.6;
    const R = 12 + Math.random() * 8;
    const pos = new THREE.Vector3(center.x + Math.cos(ang) * R, 0, center.z + Math.sin(ang) * R);
    out.push(createMonster(scene, pos, renderer));
  }
  return out;
}

// Chase the player, bob, face heading, keep the bar updated + billboard-flat.
export function updateMonsters(monsters, dt, t, playerPos) {
  for (const m of monsters) {
    if (m.dead) continue;
    if (m.hitT > 0) m.hitT -= dt;
    const g = m.group;
    if (playerPos) {
      const dx = playerPos.x - g.position.x, dz = playerPos.z - g.position.z;
      const d = Math.hypot(dx, dz) || 1;
      if (d > 1.4) {                          // stop short so they don't shove into the player
        g.position.x += (dx / d) * m.speed * dt;
        g.position.z += (dz / d) * m.speed * dt;
      }
      g.rotation.y = Math.atan2(dx, dz);
    }
    // lumbering bob
    const ph = t * 4 + m.phase;
    g.position.y = Math.abs(Math.sin(ph)) * 0.12;
    if (m.bar) setBar(m.bar, m.hp / m.maxHp);
    // flash on hit
    if (m.proc.visible && m.hitT > 0) {
      m.proc.traverse((o) => { if (o.isMesh && o.material && o.material.emissive) o.material.emissiveIntensity = 1.2; });
    } else if (m.proc.visible) {
      m.proc.traverse((o) => { if (o.isMesh && o.material && o.material.emissive) o.material.emissiveIntensity = 0.35; });
    }
  }
  // sweep out the dead
  for (let i = monsters.length - 1; i >= 0; i--) {
    const m = monsters[i];
    if (m.dead) { m.group.parent && m.group.parent.remove(m.group); monsters.splice(i, 1); }
  }
}

export function clearMonsters(scene, monsters) {
  for (const m of monsters) scene.remove(m.group);
  monsters.length = 0;
}
