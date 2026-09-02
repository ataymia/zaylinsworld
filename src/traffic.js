// ───────────────────────────────────────────────────────────────────────────
//  traffic.js — real traffic-control system (Phase 3A/3B)
//
//  Builds a control layer over the road grid: intersections with TRAFFIC LIGHTS
//  (red/yellow/green NS↔EW cycle) and STOP SIGNS (all-way), plus the visible
//  pole/sign models placed on the sidewalk corners (never in a driving lane).
//  npc.js asks the controller whether a car must stop on its approach, so cars
//  obey lights and signs, hold a stop line, and clear the box once committed.
//
//  Pure-ish: imports THREE for the visible props but the decision logic
//  (mustStop / lightState) is plain math so it can be reasoned about/tested.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { ROAD, INTERSECTIONS, TRAFFIC_TIMING } from './config/mapConfig.js';
import { STARTER_TOWN_TRAFFIC_CONTROL_PLAN } from './config/starterTownTrafficControlPlan.js';
import { registerWorldObject } from './worldCollision.js';

const STOP_WAIT = 1.1;                       // seconds a car waits at a stop sign
const DRIVER_STOP_WAIT = 0.8;

function compactControlPlan() {
  const roadHalf = ROAD.width / 2;
  return INTERSECTIONS.map((entry, index) => ({
    ...entry,
    id: `compact-control-${index}`,
    roadHalf,
    stopLine: roadHalf + 1,
    approach: roadHalf + 7,
    laneHalf: roadHalf + 0.5,
    hardwareOffset: roadHalf + 1.3,
    routeIds: [],
  }));
}

// Phase machine for one light intersection. Greens alternate NS↔EW with a
// yellow + brief all-red between. Returns 'green' | 'yellow' | 'red' per axis.
function makePhase(def) {
  const { green, yellow, allRed } = TRAFFIC_TIMING;
  const period = (green + yellow + allRed) * 2;
  // offset so axisGreenFirst starts green at t=0
  const firstNS = (def.axisGreenFirst || 'NS') === 'NS';
  return {
    def,
    period,
    stateAt(t) {
      let p = ((t % period) + period) % period;
      // segment order: [NS green][NS yellow][allRed][EW green][EW yellow][allRed]
      const segs = [
        ['green', 'red', green], ['yellow', 'red', yellow], ['red', 'red', allRed],
        ['red', 'green', green], ['red', 'yellow', yellow], ['red', 'red', allRed],
      ];
      for (const [ns, ew, dur] of segs) {
        if (p < dur) return firstNS ? { NS: ns, EW: ew } : { NS: ew, EW: ns };
        p -= dur;
      }
      return { NS: 'red', EW: 'red' };
    },
  };
}

// ── visible models ───────────────────────────────────────────────────────────
function mkMat(color, emissive, ei) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color), roughness: 0.6, metalness: 0.2,
    emissive: new THREE.Color(emissive || '#000'), emissiveIntensity: ei || 0,
  });
}

// A traffic-light pole with a 3-lamp head facing the approaching lane.
function buildLightPole(axisFacing) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 4.4, 8), mkMat('#2b2b30'));
  pole.position.y = 2.2; pole.castShadow = true; g.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.0), mkMat('#2b2b30'));
  arm.position.set(0, 4.1, 0.5); g.add(arm);
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.2, 0.32), mkMat('#15151a'));
  housing.position.set(0, 4.1, 1.0); g.add(housing);
  const lamp = (y, color) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), mkMat('#1a1a1a', color, 0));
    m.position.set(0, y, 1.17); housing.add ? g.add(m) : g.add(m); return m;
  };
  const red = lamp(4.46, '#ff3b30');
  const yellow = lamp(4.10, '#ffd23b');
  const green = lamp(3.74, '#39d353');
  return { group: g, lamps: { red, yellow, green } };
}

function buildStopSign() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.3, 6), mkMat('#9a9a9a'));
  pole.position.y = 1.15; pole.castShadow = true; g.add(pole);
  const face = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 8),
    mkMat('#c0211a', '#5a0f0c', 0.25));
  face.rotation.x = Math.PI / 2; face.position.y = 2.05; g.add(face);
  // "STOP" bar (simple white plate) so it reads at a glance
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.16, 0.02), mkMat('#f4f4f4', '#f4f4f4', 0.3));
  bar.position.set(0, 2.05, 0.04); g.add(bar);
  return { group: g };
}

// Set a light pole's lamps to the given state.
function setLamp(pole, state) {
  const { red, yellow, green } = pole.lamps;
  const on = (m, color) => { m.material.emissive.set(color); m.material.emissiveIntensity = 1.4; m.material.color.set(color); };
  const off = (m) => { m.material.emissive.set('#000'); m.material.emissiveIntensity = 0; m.material.color.set('#1a1a1a'); };
  off(red); off(yellow); off(green);
  if (state === 'red') on(red, '#ff3b30');
  else if (state === 'yellow') on(yellow, '#ffd23b');
  else on(green, '#39d353');
}

// Build the whole control layer (logic + visible props). Off-road, corner-placed.
export function buildTrafficControl(scene, { largeWorld = false } = {}) {
  const lights = [];   // { x, z, phase, poles:[{group,lamps,axis}] }
  const stops = [];    // { x, z, signs:[...] }
  const definitions = largeWorld
    ? STARTER_TOWN_TRAFFIC_CONTROL_PLAN.controls
    : compactControlPlan();

  for (const def of definitions) {
    const off = def.hardwareOffset;
    if (def.type === 'light') {
      const phase = makePhase(def);
      const poles = [];
      // NW + SE corners show NS state; NE + SW show EW state. Heads face the box.
      const corners = [
        { dx: -off, dz: -off, axis: 'NS' }, { dx: off, dz: off, axis: 'NS' },
        { dx: off, dz: -off, axis: 'EW' }, { dx: -off, dz: off, axis: 'EW' },
      ];
      for (const c of corners) {
        const p = buildLightPole(c.axis);
        p.group.position.set(def.x + c.dx, 0, def.z + c.dz);
        p.group.lookAt(def.x, 0, def.z);
        scene?.add(p.group);
        registerWorldObject(p.group, def.x + c.dx, def.z + c.dz, { r: 0.5, kind: 'traffic_light' });
        poles.push({ ...p, axis: c.axis });
      }
      lights.push({ ...def, phase, poles });
    } else {
      const signs = [];
      // one stop sign per approach corner, on the sidewalk
      const corners = [[-off, -off], [off, -off], [-off, off], [off, off]];
      for (const [dx, dz] of corners) {
        const s = buildStopSign();
        s.group.position.set(def.x + dx, 0, def.z + dz);
        s.group.lookAt(def.x, 0, def.z);
        scene?.add(s.group);
        registerWorldObject(s.group, def.x + dx, def.z + dz, { r: 0.4, kind: 'stop_sign' });
        signs.push(s);
      }
      stops.push({ ...def, signs });
    }
  }

  const driverState = new WeakMap();
  const controller = {
    t: 0,
    lights,
    stops,
    lightCount: lights.length,
    stopCount: stops.length,
    poleCount: lights.reduce((n, l) => n + l.poles.length, 0),
    signCount: stops.reduce((n, s) => n + s.signs.length, 0),

    // advance phases + sync visible lamps
    update(dt) {
      this.t += dt;
      for (const L of lights) {
        const st = L.phase.stateAt(this.t);
        for (const p of L.poles) setLamp(p, st[p.axis]);
      }
    },

    // light state for an axis ('NS'|'EW') at an intersection position
    lightStateAt(x, z, axis) {
      const L = lights.find(l => Math.abs(l.x - x) < 1 && Math.abs(l.z - z) < 1);
      if (!L) return 'green';
      return L.phase.stateAt(this.t)[axis];
    },

    // Decide whether a car must stop on its current approach.
    //   pos: THREE.Vector3, heading: normalized THREE.Vector3 (travel dir)
    //   car: the traffic car (for per-sign wait bookkeeping)
    //   returns { stop:boolean, holdDist:number }
    mustStop(pos, heading, car, dt) {
      const axis = Math.abs(heading.x) > Math.abs(heading.z) ? 'EW' : 'NS';
      // nearest control point ahead on this approach
      for (const node of [...lights, ...stops]) {
        const stopLine = node.stopLine;
        const approach = node.approach;
        const laneHalf = node.laneHalf;
        const dx = node.x - pos.x, dz = node.z - pos.z;
        const ahead = dx * heading.x + dz * heading.z;          // forward distance to centre
        if (ahead <= stopLine - 0.2 || ahead > approach) continue;  // already in box, or too far
        const lateral = Math.abs(dx * heading.z - dz * heading.x);
        if (lateral > laneHalf) continue;                        // not actually heading into it
        const holdDist = ahead - stopLine;                       // distance to the stop line

        if (node.phase) {                                        // traffic light
          const st = node.phase.stateAt(this.t)[axis];
          if (st === 'green') return { stop: false };
          if (st === 'yellow') {
            // commit if too close to stop safely; otherwise stop
            return holdDist < 1.4 ? { stop: false } : { stop: true, holdDist };
          }
          return { stop: true, holdDist };                       // red
        }
        // stop sign: pause STOP_WAIT, then proceed
        car._stopKey = `${node.x},${node.z}`;
        if (car._stopAt !== car._stopKey) {                      // arriving at a new sign
          car._stopAt = car._stopKey; car._stopTimer = STOP_WAIT;
          return { stop: true, holdDist };
        }
        if ((car._stopTimer || 0) > 0) {
          car._stopTimer -= dt;
          return { stop: true, holdDist };
        }
        return { stop: false };                                  // waited → go
      }
      // not approaching any control point → clear any stale stop-sign latch
      if (car._stopAt) { car._stopAt = null; car._stopTimer = 0; }
      return { stop: false };
    },

    // Player-driving law check. NPC traffic uses mustStop(); this watches the
    // player's actual stop-line crossing and reports one offense per junction.
    observeDriver(before, after, speed, car, dt) {
      if (!car || !before || !after) return null;
      const mx = after.x - before.x;
      const mz = after.z - before.z;
      const distance = Math.hypot(mx, mz);
      const record = driverState.get(car) || {
        dwell: new Map(),
        lastViolationId: null,
        cooldown: 0,
      };
      record.cooldown = Math.max(0, record.cooldown - dt);

      for (const node of [...lights, ...stops]) {
        const near = Math.hypot(node.x - after.x, node.z - after.z);
        if (near <= node.approach && Math.abs(speed) < 0.35) {
          record.dwell.set(node.id, (record.dwell.get(node.id) || 0) + dt);
        } else if (near > node.approach * 1.5) {
          record.dwell.delete(node.id);
        }
      }

      if (distance < 0.001 || record.cooldown > 0) {
        driverState.set(car, record);
        return null;
      }
      const heading = { x: mx / distance, z: mz / distance };
      const axis = Math.abs(heading.x) > Math.abs(heading.z) ? 'EW' : 'NS';
      for (const node of [...lights, ...stops]) {
        const bx = node.x - before.x, bz = node.z - before.z;
        const ax = node.x - after.x, az = node.z - after.z;
        const beforeAhead = bx * heading.x + bz * heading.z;
        const afterAhead = ax * heading.x + az * heading.z;
        const lateral = Math.abs(bx * heading.z - bz * heading.x);
        if (lateral > node.laneHalf) continue;
        if (!(beforeAhead > node.stopLine && afterAhead <= node.stopLine)) continue;

        let violation = null;
        if (node.phase) {
          const state = node.phase.stateAt(this.t)[axis];
          if (state !== 'green') violation = state === 'yellow' ? 'yellow-light' : 'red-light';
        } else if ((record.dwell.get(node.id) || 0) < DRIVER_STOP_WAIT) {
          violation = 'rolling-stop';
        }
        if (!violation) continue;
        record.lastViolationId = node.id;
        record.cooldown = 6;
        driverState.set(car, record);
        return Object.freeze({
          type: violation,
          controlId: node.id,
          routeIds: Object.freeze([...(node.routeIds || [])]),
          schoolZone: !!node.schoolZone,
        });
      }
      driverState.set(car, record);
      return null;
    },
  };

  // prime the lamps so they're correct on frame 0
  controller.update(0);
  controller.largeWorld = largeWorld;
  controller.controlCount = definitions.length;
  return controller;
}

export default { buildTrafficControl };
