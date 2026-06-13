// ───────────────────────────────────────────────────────────────────────────
//  npc.js — wandering, interactable city NPCs (with memory) + traffic + car
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { buildAvatar, SKIN_TONES, HAIRSTYLES, OUTFIT_TOPS, OUTFIT_BOTTOMS, SHOES } from './avatar.js';
import { buildCar, CAR_TYPES } from './vehicles.js';
import { TRAFFIC_ROUTES, PEDESTRIAN_ROUTES } from './config/mapConfig.js';

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const NAMES = ['Marcus', 'Tre', 'Jaylen', 'Keisha', 'Dee', 'Andre', 'Nia', 'Malik', 'Zara', 'Cam', 'Imani', 'Quan'];

// turn a [[x,z],…] config loop into THREE.Vector3 waypoints
const toWaypoints = loop => loop.map(([x, z]) => new THREE.Vector3(x, 0, z));

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
    // assign each pedestrian to a sidewalk/park route and start at a waypoint
    const route = toWaypoints(PEDESTRIAN_ROUTES[i % PEDESTRIAN_ROUTES.length].loop);
    const wp = Math.floor(Math.random() * route.length);
    const start = route[wp];
    av.group.position.set(start.x, 0, start.z);
    scene.add(av.group);
    npcs.push({
      id: 'citynpc-' + i, av,
      name: pick(NAMES),
      dialogue: 'random',
      mood: pick(['chill', 'hyped', 'busy', 'friendly']),
      route, wp: (wp + 1) % route.length,
      target: route[(wp + 1) % route.length].clone(),
      speed: 1.1 + Math.random() * 0.8,
      phase: Math.random() * Math.PI * 2,
    });
  }
  return npcs;
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
    if (dist < 1.0) {
      // advance to the next waypoint on this pedestrian's route (loops)
      n.wp = (n.wp + 1) % n.route.length;
      n.target = n.route[n.wp].clone();
      continue;
    }
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

// ── traffic (waypoint-routed) ──
function carMesh(color, type) {
  return buildCar(type || pick(CAR_TYPES), color);
}

// Spawn cars onto the closed loops defined in mapConfig.TRAFFIC_ROUTES. Each car
// drives toward its next waypoint, rotates to face its heading, brakes for
// obstacles ahead, and loops forever. The {g,speed,damage,wheels} shape stays
// compatible with main.js (drive/steal/collision) and vehicleKit visual swaps.
export function createTraffic(scene, count = 6) {
  const colors = ['#c0392b', '#2980b9', '#27ae60', '#f1c40f', '#8e44ad', '#e67e22', '#ecf0f1', '#16a085'];
  const cars = [];
  for (let i = 0; i < count; i++) {
    const g = carMesh(pick(colors));
    const routeDef = TRAFFIC_ROUTES[i % TRAFFIC_ROUTES.length];
    const route = toWaypoints(routeDef.loop);
    // stagger cars along the loop so they don't stack at the first waypoint
    const wp = (i * 2) % route.length;
    const next = (wp + 1) % route.length;
    const a = route[wp], b = route[next];
    const f = (Math.floor(i / TRAFFIC_ROUTES.length) * 0.45) % 1; // fraction along the leg
    g.position.set(a.x + (b.x - a.x) * f, 0, a.z + (b.z - a.z) * f);
    g.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
    scene.add(g);
    cars.push({
      g, route, wp: next,
      speed: 0, baseSpeed: 7 + Math.random() * 4, damage: 0,
      wheels: g.userData.wheels,
    });
  }
  return cars;
}

// Traffic AI: follow waypoints, roll wheels, and BRAKE for obstacles ahead.
// `obstacles` is an array of THREE.Vector3 world positions (other cars + player).
export function updateTraffic(cars, dt, obstacles = []) {
  const heading = new THREE.Vector3();
  for (const c of cars) {
    if (!c.route) continue;
    const cpos = c.g.position;
    const target = c.route[c.wp];
    heading.set(target.x - cpos.x, 0, target.z - cpos.z);
    const dist = heading.length();
    if (dist < 1.4) {                            // reached waypoint → advance (loops)
      c.wp = (c.wp + 1) % c.route.length;
      continue;
    }
    heading.normalize();

    // brake if an obstacle sits ahead in our path (dot>0) and laterally close
    let brake = false;
    for (const o of obstacles) {
      if (o === cpos) continue;
      const dx = o.x - cpos.x, dz = o.z - cpos.z;
      const ahead = dx * heading.x + dz * heading.z;          // forward distance
      if (ahead <= 0.5 || ahead > 7.5) continue;
      const lateral = Math.abs(dx * heading.z - dz * heading.x); // perpendicular dist
      if (lateral < 2.4) { brake = true; break; }
    }
    const tgtSpeed = brake ? 0 : c.baseSpeed;
    c.speed += (tgtSpeed - c.speed) * Math.min(1, dt * 3.5);

    const step = c.speed * dt;
    cpos.x += heading.x * step;
    cpos.z += heading.z * step;
    // smoothly rotate toward travel direction
    const yaw = Math.atan2(heading.x, heading.z);
    c.g.rotation.y = lerpAngle(c.g.rotation.y, yaw, Math.min(1, dt * 4));
    // roll wheels
    const spin = step / 0.36;
    (c.g.userData.wheels || []).forEach(w => { w.rotation.x += spin; });
  }
}

// ── player-drivable car ──
export function createDrivableCar(scene, x, z, color = '#1f6f8a') {
  const g = carMesh(color, 'coupe');
  g.position.set(x, 0, z); g.rotation.y = Math.PI / 2;   // parked facing east along Main St
  scene.add(g);
  return { g, speed: 0, damage: 0, spawn: new THREE.Vector3(x, 0, z), wheels: g.userData.wheels };
}
