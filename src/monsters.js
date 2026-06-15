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

  // distinct creature palettes so the pack doesn't read as identical purple blobs
  const PALETTE = [
    { skin: 0x6a1fb0, em: 0x230048, eye: 0xffe23b },   // violet brute
    { skin: 0x1f7a3a, em: 0x05311a, eye: 0xb6ff3b },   // swamp ghoul
    { skin: 0x9c2b2b, em: 0x3a0808, eye: 0xffd23b },   // crimson fiend
    { skin: 0x2b3d9c, em: 0x080a3a, eye: 0x6bf0ff },   // abyssal stalker
  ];
  const pal = PALETTE[Math.floor(Math.random() * PALETTE.length)];
  const skinMat = new THREE.MeshStandardMaterial({ color: pal.skin, roughness: 0.5, metalness: 0.08, emissive: pal.em, emissiveIntensity: 0.4 });
  const clawMat = new THREE.MeshStandardMaterial({ color: 0xeae6dc, roughness: 0.35, metalness: 0.2 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: pal.eye, emissive: pal.eye, emissiveIntensity: 1.6 });

  // procedural fallback body — a hulking, hunched brute (always visible)
  const proc = new THREE.Group();
  const scaleUp = 1.15 + Math.random() * 0.25;     // size variety, all clearly bigger than a person
  proc.scale.setScalar(scaleUp);

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.6, 1.05, 6, 12), skinMat);
  body.position.y = 1.1; body.rotation.x = 0.16; body.castShadow = true; proc.add(body);
  // hunched upper back / shoulders
  const hump = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), skinMat);
  hump.position.set(0, 1.62, -0.18); hump.scale.set(1.2, 0.8, 1); proc.add(hump);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), skinMat);
  head.position.set(0, 1.95, 0.12); head.scale.set(1, 0.92, 1.05); head.castShadow = true; proc.add(head);
  // jaw
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.42), skinMat);
  jaw.position.set(0, 1.74, 0.2); proc.add(jaw);
  // fangs
  for (const sx of [-0.13, 0.13]) {
    const fang = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 6), clawMat);
    fang.position.set(sx, 1.7, 0.34); fang.rotation.x = Math.PI; proc.add(fang);
  }
  // glowing eyes
  for (const sx of [-0.16, 0.16]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), eyeMat);
    eye.position.set(sx, 2.0, 0.42); proc.add(eye);
  }
  // curved horns
  for (const sx of [-0.22, 0.22]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5, 7), clawMat);
    horn.position.set(sx, 2.32, -0.02); horn.rotation.z = sx > 0 ? -0.5 : 0.5; horn.rotation.x = -0.3; proc.add(horn);
  }
  // long clawed arms
  for (const sx of [-0.55, 0.55]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.85, 4, 8), skinMat);
    arm.position.set(sx, 1.05, 0.05); arm.rotation.x = 0.3; arm.castShadow = true; proc.add(arm);
    for (let c = 0; c < 3; c++) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 6), clawMat);
      claw.position.set(sx + (c - 1) * 0.1, 0.5, 0.32); claw.rotation.x = -1.2; proc.add(claw);
    }
  }
  // stumpy legs
  for (const sx of [-0.26, 0.26]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.5, 4, 8), skinMat);
    leg.position.set(sx, 0.42, 0); proc.add(leg);
  }
  group.add(proc);

  const bar = makeBar();
  bar.position.set(0, 2.6 * scaleUp, 0);
  group.add(bar);

  scene.add(group);

  const m = {
    kind: 'monster', group, proc, bar,
    hp: 120, maxHp: 120,
    speed: 2.0 + Math.random() * 1.4,
    hitT: 0, phase: Math.random() * Math.PI * 2,
    atkCd: 0, wander: null, wanderT: 0, stateLabel: 'roam',
    npcScareCd: 0,
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

// Spawn `count` monsters around the town, deliberately FAR from the player so
// they don't dogpile you on spawn — they roam in and terrorize the streets first.
export function spawnMonsters(scene, center, count, renderer) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2 + Math.random() * 0.8;
    const R = 30 + Math.random() * 22;            // 30–52 units out (across the map)
    const pos = new THREE.Vector3(center.x + Math.cos(ang) * R, 0, center.z + Math.sin(ang) * R);
    out.push(createMonster(scene, pos, renderer));
  }
  return out;
}

// Roam the city, terrorize NPCs, and chase the player only within a SHORT aggro
// radius (or when provoked). Bites the player when adjacent (damage via
// hooks.damagePlayer with a cooldown). Far from the player, monsters wander and
// scare nearby civilians via hooks.terrorize(pos) so they menace the whole town.
export function updateMonsters(monsters, dt, t, playerPos, hooks = {}) {
  const AGGRO = 14;        // only chase the player within this short distance
  const ATTACK = 1.8;      // bite range
  for (const m of monsters) {
    if (m.dead) continue;
    if (m.hitT > 0) m.hitT -= dt;
    if (m.atkCd > 0) m.atkCd -= dt;
    if (m.npcScareCd > 0) m.npcScareCd -= dt;
    const g = m.group;

    let dToPlayer = Infinity, dirx = 0, dirz = 0;
    if (playerPos) {
      const dx = playerPos.x - g.position.x, dz = playerPos.z - g.position.z;
      dToPlayer = Math.hypot(dx, dz) || 1;
      dirx = dx / dToPlayer; dirz = dz / dToPlayer;
    }
    // provoked monsters (recently shot) chase from further away
    const provoked = m.hitT > 0 || m._provoked > 0;
    if (m._provoked > 0) m._provoked -= dt;
    const aggroR = provoked ? AGGRO * 2.2 : AGGRO;

    if (playerPos && dToPlayer < aggroR) {
      // CHASE
      m.stateLabel = 'chase';
      if (dToPlayer > ATTACK) {
        g.position.x += dirx * m.speed * dt;
        g.position.z += dirz * m.speed * dt;
      } else if (m.atkCd <= 0) {
        // ATTACK — bite the player
        m.atkCd = 1.1;
        m.hitT = 0.18;
        if (hooks.damagePlayer) hooks.damagePlayer(8 + Math.floor(Math.random() * 6));
      }
      g.rotation.y = Math.atan2(dirx, dirz);
    } else {
      // WANDER — head for a nearby civilian to terrorize if there is one, else a
      // random roam point. This makes monsters menace the town, not circle you.
      m.stateLabel = 'roam';
      let tx = null, tz = null;
      if (hooks.nearestNpc) {
        const npc = hooks.nearestNpc(g.position, 16);
        if (npc) { tx = npc.x; tz = npc.z; }
      }
      if (tx == null) {
        if (!m.wander || m.wanderT <= 0) {
          const ang = Math.random() * Math.PI * 2;
          const R = 14 + Math.random() * 26;
          m.wander = { x: Math.cos(ang) * R, z: Math.sin(ang) * R };
          m.wanderT = 4 + Math.random() * 4;
        }
        m.wanderT -= dt;
        tx = m.wander.x; tz = m.wander.z;
      }
      const wx = tx - g.position.x, wz = tz - g.position.z;
      const wd = Math.hypot(wx, wz) || 1;
      if (wd > 1) {
        const sp = m.speed * 0.6;
        g.position.x += (wx / wd) * sp * dt;
        g.position.z += (wz / wd) * sp * dt;
        g.rotation.y = Math.atan2(wx / wd, wz / wd);
      } else { m.wanderT = 0; }
      // scare any civilians right next to the monster
      if (hooks.terrorize && m.npcScareCd <= 0) {
        const scared = hooks.terrorize(g.position, 4.5);
        if (scared) m.npcScareCd = 0.8;
      }
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
