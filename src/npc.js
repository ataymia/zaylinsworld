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
//
// Cars are spread EVENLY around their assigned loop (by arc-length) with a
// minimum gap so they never spawn stacked in one clump behind town. A car is
// assigned a route + a parametric distance `s` along it; we resolve that to an
// (x,z) on the correct leg and the waypoint index just ahead.
function loopLength(wps) {
  let L = 0;
  for (let i = 0; i < wps.length; i++) {
    const a = wps[i], b = wps[(i + 1) % wps.length];
    L += Math.hypot(b.x - a.x, b.z - a.z);
  }
  return L;
}
// Resolve arc-distance `s` (0..loopLength) → { pos, nextWp }.
function pointAtDistance(wps, s) {
  const total = loopLength(wps) || 1;
  let d = ((s % total) + total) % total;
  for (let i = 0; i < wps.length; i++) {
    const a = wps[i], b = wps[(i + 1) % wps.length];
    const seg = Math.hypot(b.x - a.x, b.z - a.z) || 1e-3;
    if (d <= seg) {
      const f = d / seg;
      return { pos: new THREE.Vector3(a.x + (b.x - a.x) * f, 0, a.z + (b.z - a.z) * f), nextWp: (i + 1) % wps.length, a, b };
    }
    d -= seg;
  }
  return { pos: wps[0].clone(), nextWp: 1 % wps.length, a: wps[0], b: wps[1 % wps.length] };
}

export function createTraffic(scene, count = 6) {
  const colors = ['#c0392b', '#2980b9', '#27ae60', '#f1c40f', '#8e44ad', '#e67e22', '#ecf0f1', '#16a085'];
  const cars = [];
  const MIN_GAP = 9;                                   // metres between cars on the same loop
  // bucket cars per route so we can evenly space each route's share around it
  const perRoute = TRAFFIC_ROUTES.map(() => 0);
  for (let i = 0; i < count; i++) perRoute[i % TRAFFIC_ROUTES.length]++;

  let idx = 0;
  for (let r = 0; r < TRAFFIC_ROUTES.length; r++) {
    const routeDef = TRAFFIC_ROUTES[r];
    const route = toWaypoints(routeDef.loop);
    const n = perRoute[r];
    if (!n) continue;
    const total = loopLength(route);
    const gap = Math.max(MIN_GAP, total / n);          // even spacing, but never tighter than MIN_GAP
    for (let k = 0; k < n; k++) {
      const g = carMesh(pick(colors));
      const s = (k * gap) % total;
      const at = pointAtDistance(route, s);
      g.position.copy(at.pos);
      const b = route[at.nextWp];
      g.rotation.y = Math.atan2(b.x - at.pos.x, b.z - at.pos.z);
      scene.add(g);
      cars.push({
        g, route, wp: at.nextWp,
        speed: 0, baseSpeed: 7 + Math.random() * 4, damage: 0,
        wheels: g.userData.wheels,
        _stuckT: 0, _stopAt: null, _stopTimer: 0,
      });
      idx++;
    }
  }
  return cars;
}

// Find a clear arc-distance on `route` where no other car sits within MIN_GAP,
// so a stuck car can be teleported back into flow instead of jittering forever.
function findFreeSlot(route, cars, self) {
  const total = loopLength(route) || 1;
  const MIN = 7;
  for (let tries = 0; tries < 16; tries++) {
    const s = Math.random() * total;
    const at = pointAtDistance(route, s);
    let ok = true;
    for (const c of cars) {
      if (c === self || !c.g) continue;
      if (c.g.position.distanceTo(at.pos) < MIN) { ok = false; break; }
    }
    if (ok) return at;
  }
  return null;
}

// Traffic AI: follow waypoints, keep following distance, OBEY traffic lights and
// stop signs via the control layer, and recover/teleport cars that get stuck so
// a jam can never become permanent. `obstacles` are world positions (other cars
// + player); `control` is the traffic controller from traffic.js (optional).
export function updateTraffic(cars, dt, obstacles = [], control = null) {
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
      if (ahead <= 0.5 || ahead > 7.0) continue;
      const lateral = Math.abs(dx * heading.z - dz * heading.x); // perpendicular dist
      if (lateral < 2.2) { brake = true; break; }
    }

    // obey traffic lights / stop signs
    let controlStop = false;
    if (control) {
      const r = control.mustStop(cpos, heading, c, dt);
      controlStop = !!r.stop;
    }

    const tgtSpeed = (brake || controlStop) ? 0 : c.baseSpeed;
    c.speed += (tgtSpeed - c.speed) * Math.min(1, dt * 3.5);

    // ── stuck recovery ──────────────────────────────────────────────────────
    // Only count as "stuck" when we're NOT legitimately stopped at a light/sign
    // or queued behind another car at one. If a car idles too long in open road,
    // teleport it to a free slot on its route (or nudge its waypoint forward).
    if (c.speed < 0.4 && !controlStop) {
      c._stuckT += dt;
      if (c._stuckT > 5.5) {
        const slot = findFreeSlot(c.route, cars, c);
        if (slot) {
          cpos.copy(slot.pos);
          c.wp = slot.nextWp;
          const b = c.route[c.wp];
          c.g.rotation.y = Math.atan2(b.x - cpos.x, b.z - cpos.z);
          c.speed = 0;
        } else {
          c.wp = (c.wp + 1) % c.route.length;    // can't relocate → skip ahead
        }
        c._stuckT = 0;
      }
    } else {
      c._stuckT = 0;
    }

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
