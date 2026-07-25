// ───────────────────────────────────────────────────────────────────────────
//  npc.js — wandering, interactable city NPCs (with memory) + traffic + car
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { buildAvatar, SKIN_TONES, HAIRSTYLES, OUTFIT_TOPS, OUTFIT_BOTTOMS, SHOES } from './avatar.js';
import { applyNpcSkins } from './avatarSkin.js';
import { buildCar, CAR_TYPES } from './vehicles.js';
import { TRAFFIC_ROUTES, PEDESTRIAN_ROUTES } from './config/mapConfig.js';
import { trafficSpawnPlan } from './config/starterTownTrafficRoutes.js';

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const NAMES = ['Marcus', 'Tre', 'Jaylen', 'Keisha', 'Dee', 'Andre', 'Nia', 'Malik', 'Zara', 'Cam', 'Imani', 'Quan'];

// turn a [[x,z],…] config loop into THREE.Vector3 waypoints
const toWaypoints = loop => loop.map(([x, z]) => new THREE.Vector3(x, 0, z));

export function createCityNPCs(scene, count = 8, routeDefinitions = PEDESTRIAN_ROUTES) {
  const npcs = [];
  const routes = Array.isArray(routeDefinitions) && routeDefinitions.length
    ? routeDefinitions
    : PEDESTRIAN_ROUTES;
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
    const routeDef = routes[i % routes.length];
    const route = toWaypoints(routeDef.loop);
    // Deterministic staggering keeps every district populated immediately and
    // avoids one random clump consuming the whole pedestrian budget.
    const wp = Math.floor((i / routes.length) * route.length) % route.length;
    const start = route[wp];
    av.group.position.set(start.x, 0, start.z);
    scene.add(av.group);
    npcs.push({
      id: 'citynpc-' + i, av,
      name: pick(NAMES),
      dialogue: 'random',
      mood: pick(['chill', 'hyped', 'busy', 'friendly']),
      route, wp: (wp + 1) % route.length,
      routeId: routeDef.id || `pedestrian-route-${i % routes.length}`,
      districtId: routeDef.districtId || null,
      target: route[(wp + 1) % route.length].clone(),
      speed: 1.1 + Math.random() * 0.8,
      phase: Math.random() * Math.PI * 2,
    });
  }

  // Explicit visible-skin wiring. The player and foot cops already call their
  // role-specific adapters in main.js; civilians previously had no live call at
  // all. Cap the GLB pass so density settings never turn character loading into a
  // frame-time avalanche. Distant/excess pedestrians remain procedural.
  if (globalThis.__ZW_FEATURES__?.USE_REAL_NPC_SKINS !== false && npcs.length) {
    queueMicrotask(() => {
      applyNpcSkins(npcs, null, Math.min(12, npcs.length))
        .catch((error) => console.warn('[skin] civilian pass failed; procedural fallback kept', error));
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

// A lightweight seated driver silhouette (head + torso) so traffic cars aren't
// ghost-driven. Detached + made to flee when the car is stolen (see main.js).
const DRIVER_SKINS = ['#6b4a2f', '#8a5a3a', '#a9744f', '#c68642', '#e0ac69', '#5a3a22'];
const DRIVER_TOPS = ['#2c3e6b', '#7a1f2b', '#27543a', '#3a3f48', '#5a4a6b'];
function makeDriver() {
  const g = new THREE.Group();
  g.name = 'vehicle-driver';
  const skin = new THREE.MeshStandardMaterial({ color: pick(DRIVER_SKINS), roughness: 0.8 });
  const cloth = new THREE.MeshStandardMaterial({ color: pick(DRIVER_TOPS), roughness: 0.7 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.24), cloth);
  torso.position.y = 0.78; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), skin);
  head.position.y = 1.08; g.add(head);
  g.position.set(-0.3, 0, 0.28);          // driver seat: front-left
  g.castShadow = true;
  return g;
}

// Spawn cars onto caller-provided closed loops (or the compact-map defaults).
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

export function createTraffic(scene, count = 6, routeDefinitions = TRAFFIC_ROUTES) {
  const colors = ['#c0392b', '#2980b9', '#27ae60', '#f1c40f', '#8e44ad', '#e67e22', '#ecf0f1', '#16a085'];
  const cars = [];
  const routes = Array.isArray(routeDefinitions) && routeDefinitions.length
    ? routeDefinitions
    : TRAFFIC_ROUTES;
  const spawnPlan = trafficSpawnPlan(count, routes);
  for (const spawn of spawnPlan) {
    const r = spawn.routeIndex;
    const routeDef = routes[r];
    const route = toWaypoints(routeDef.loop);
    const g = carMesh(pick(colors));
    g.position.set(spawn.position.x, 0, spawn.position.z);
    const nextWp = spawn.position.nextWaypoint;
    const b = route[nextWp];
    g.rotation.y = Math.atan2(b.x - g.position.x, b.z - g.position.z);
    scene.add(g);
    const driver = makeDriver(); g.add(driver);
    const baseSpeed = 7 + Math.random() * 4;
    cars.push({
      g, route, wp: nextWp,
      // Start in motion so traffic visibly reads as traffic on the first frame;
      // controls and following-distance logic can still brake it immediately.
      speed: baseSpeed * 0.55, baseSpeed, damage: 0,
      wheels: g.userData.wheels, driver, hasDriver: true,
      routeName: routeDef.name || routeDef.id || `traffic-route-${r}`,
      _stuckT: 0, _stopAt: null, _stopTimer: 0,
    });
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
          c.wp = (c.wp + 1) % c.route.length;
        }
        c._stuckT = 0;
      }
    } else {
      c._stuckT = 0;
    }

    const step = c.speed * dt;
    cpos.x += heading.x * step;
    cpos.z += heading.z * step;
    const yaw = Math.atan2(heading.x, heading.z);
    c.g.rotation.y = lerpAngle(c.g.rotation.y, yaw, Math.min(1, dt * 4));
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
