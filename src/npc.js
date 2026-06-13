// ───────────────────────────────────────────────────────────────────────────
//  npc.js — wandering, interactable city NPCs (with memory) + traffic + car
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { buildAvatar, SKIN_TONES, HAIRSTYLES, OUTFIT_TOPS, OUTFIT_BOTTOMS, SHOES } from './avatar.js';
import { buildCar, CAR_TYPES } from './vehicles.js';

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const NAMES = ['Marcus', 'Tre', 'Jaylen', 'Keisha', 'Dee', 'Andre', 'Nia', 'Malik', 'Zara', 'Cam', 'Imani', 'Quan'];

export function createCityNPCs(scene, count = 8) {
  const npcs = [];
  for (let i = 0; i < count; i++) {
    const custom = {
      skin: pick(SKIN_TONES).id, face: 'oval',
      body: pick(['slim', 'average', 'athletic', 'heavy']),
      height: pick(['short', 'average', 'tall']),
      hair: pick(HAIRSTYLES).id,
      hairColor: pick(['jet', 'black', 'darkbr', 'brown', 'auburn']),
      top: pick(OUTFIT_TOPS).id, bottom: pick(OUTFIT_BOTTOMS).id,
      shoes: pick(SHOES).id, accessory: pick(['none', 'none', 'shades']),
      jewelry: pick(['none', 'none', 'chain']),
    };
    const av = buildAvatar(custom);
    const angle = Math.random() * Math.PI * 2;
    const rr = 14 + Math.random() * 22;
    av.group.position.set(Math.cos(angle) * rr, 0, Math.sin(angle) * rr);
    scene.add(av.group);
    npcs.push({
      id: 'citynpc-' + i, av,
      name: pick(NAMES),
      dialogue: 'random',
      mood: pick(['chill', 'hyped', 'busy', 'friendly']),
      target: randomTarget(), speed: 1.1 + Math.random() * 0.8,
      phase: Math.random() * Math.PI * 2,
    });
  }
  return npcs;
}

function randomTarget() {
  const a = Math.random() * Math.PI * 2;
  const r = 10 + Math.random() * 30;
  return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
}

export function updateCityNPCs(npcs, dt, t, pausedFor) {
  for (const n of npcs) {
    const p = n.av.group.position;
    if (n.talking) { // face the player but stop walking
      animateLegs(n, 0, t);
      continue;
    }
    const dir = n.target.clone().sub(p); dir.y = 0;
    const dist = dir.length();
    if (dist < 1.0) { n.target = randomTarget(); continue; }
    dir.normalize();
    p.addScaledVector(dir, n.speed * dt);
    const targetYaw = Math.atan2(dir.x, dir.z);
    n.av.group.rotation.y = lerpAngle(n.av.group.rotation.y, targetYaw, Math.min(1, dt * 8));
    animateLegs(n, 1, t);
  }
}

function animateLegs(n, amt, t) {
  const parts = n.av.parts;
  const sp = (n.speed || 1.3) * 4.4;
  const ph = t * sp + n.phase;
  const sw = Math.sin(ph) * 0.6 * amt;          // hip swing
  // legs swing opposite; knees bend on the back-swing
  parts.leftLeg.rotation.x = sw;
  parts.rightLeg.rotation.x = -sw;
  // arms counter-swing with a slight bend
  parts.leftArm.rotation.x = -sw * 0.8;
  parts.rightArm.rotation.x = sw * 0.8;
  parts.leftArm.rotation.z = 0.08 * amt;
  parts.rightArm.rotation.z = -0.08 * amt;
  // vertical bob (two steps per stride) + subtle body sway
  const g = n.av.group;
  g.position.y = Math.abs(Math.sin(ph)) * 0.045 * amt;
  if (parts.torso) {
    parts.torso.rotation.y = Math.sin(ph) * 0.06 * amt;
    parts.torso.rotation.z = Math.cos(ph) * 0.03 * amt;
  }
  if (parts.headGroup) parts.headGroup.rotation.z = -Math.cos(ph) * 0.03 * amt;
}

function lerpAngle(a, b, f) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * f;
}

// ── traffic ──
function carMesh(color, type) {
  return buildCar(type || pick(CAR_TYPES), color);
}

export function createTraffic(scene, count = 6) {
  const colors = ['#c0392b', '#2980b9', '#27ae60', '#f1c40f', '#8e44ad', '#e67e22', '#ecf0f1', '#16a085'];
  const ROADS = [-40, 0, 40];                 // matches the street grid in world.js
  const cars = [];
  for (let i = 0; i < count; i++) {
    const g = carMesh(pick(colors));
    const horizontal = i % 2 === 0;
    const road = pick(ROADS);                  // which of the 3 parallel streets
    const lane = (Math.random() < 0.5 ? -2.2 : 2.2);
    const cross = road + lane;                 // lateral position = road + lane
    const speed = (7 + Math.random() * 5) * (Math.random() < 0.5 ? 1 : -1);
    if (horizontal) { g.position.set((Math.random() - 0.5) * 110, 0, cross); g.rotation.y = speed > 0 ? Math.PI / 2 : -Math.PI / 2; }
    else { g.position.set(cross, 0, (Math.random() - 0.5) * 110); g.rotation.y = speed > 0 ? 0 : Math.PI; }
    scene.add(g);
    cars.push({ g, horizontal, speed, baseSpeed: speed, damage: 0 });
  }
  return cars;
}

// Traffic AI: roll wheels, follow the lane, and BRAKE for obstacles ahead
// (other cars or the player). `obstacles` is an array of THREE.Vector3 world
// positions. If a car can't brake in time it will physically overlap an
// obstacle and the caller's collision pass resolves the impact.
export function updateTraffic(cars, dt, obstacles = []) {
  for (const c of cars) {
    if (c.baseSpeed === undefined) c.baseSpeed = c.speed;
    const cpos = c.g.position;
    const sign = Math.sign(c.baseSpeed) || 1;
    const ax = c.horizontal ? 'x' : 'z';        // travel axis
    const la = c.horizontal ? 'z' : 'x';        // lateral axis

    // brake if something sits ahead in this lane within braking distance
    let brake = false;
    for (const o of obstacles) {
      if (o === cpos) continue;
      const ahead = (o[ax] - cpos[ax]) * sign;  // >0 → in front of the car
      const lateral = Math.abs(o[la] - cpos[la]);
      if (ahead > 0.5 && ahead < 7.5 && lateral < 2.4) { brake = true; break; }
    }
    const target = brake ? 0 : c.baseSpeed;
    c.speed += (target - c.speed) * Math.min(1, dt * 3.5);

    const dist = Math.abs(c.speed) * dt;
    const spin = dist / 0.36;                    // roll the wheels
    (c.g.userData.wheels || []).forEach(w => { w.rotation.x += spin; });
    if (c.horizontal) {
      cpos.x += c.speed * dt;
      if (cpos.x > 65) cpos.x = -65;
      if (cpos.x < -65) cpos.x = 65;
    } else {
      cpos.z += c.speed * dt;
      if (cpos.z > 65) cpos.z = -65;
      if (cpos.z < -65) cpos.z = 65;
    }
  }
}

// ── player-drivable car ──
export function createDrivableCar(scene, x, z, color = '#1f6f8a') {
  const g = carMesh(color, 'coupe');
  g.position.set(x, 0, z); g.rotation.y = Math.PI;
  scene.add(g);
  return { g, speed: 0, damage: 0, spawn: new THREE.Vector3(x, 0, z), wheels: g.userData.wheels };
}
