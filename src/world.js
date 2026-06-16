// ───────────────────────────────────────────────────────────────────────────
//  world.js — low-poly 3D city: roads, detailed buildings with doors/windows,
//  props, and entrance trigger data for the interaction manager.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import {
  ROAD, CROSSWALKS, LANDMARKS, FEATURES,
  PARK, PARKING, STREET_LIGHTS, STREET_TREES, SPAWN, POLICE_POST,
} from './config/mapConfig.js';
import { clearOfRoads } from './config/placementRules.js';
import { registerWorldObject, clearWorldObjects } from './worldCollision.js';

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: opts.rough ?? 0.9,
    metalness: opts.metal ?? 0.0,
    flatShading: opts.flat ?? false,
    emissive: opts.emissive ? new THREE.Color(opts.emissive) : new THREE.Color('#000'),
    emissiveIntensity: opts.emissiveIntensity ?? 1,
  });
}

export const colliders = [];

// ── procedural textures (canvas noise) for ground realism ─────────────────────
function noiseTexture(base, speck, density, repeat) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < density; i++) {
    const x = Math.random() * 256, y = Math.random() * 256;
    const r = Math.random() * 2.2 + 0.4;
    ctx.fillStyle = speck[(Math.random() * speck.length) | 0];
    ctx.globalAlpha = 0.18 + Math.random() * 0.4;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addCollider(mesh, pad = 0) {
  mesh.updateWorldMatrix(true, false);
  const bb = new THREE.Box3().setFromObject(mesh);
  bb.expandByScalar(pad);
  colliders.push(bb);
}

function textSign(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0c0c12'; ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = color; ctx.lineWidth = 8; ctx.strokeRect(8, 8, 496, 112);
  ctx.fillStyle = color; ctx.font = 'bold 58px Arial';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 66);
  const tex = new THREE.CanvasTexture(canvas);
  const m = new THREE.MeshBasicMaterial({ map: tex });
  return new THREE.Mesh(new THREE.PlaneGeometry(5, 1.25), m);
}

// Build a detailed building. faceDir = unit vector the storefront/door faces.
function makeBuilding(scene, opt) {
  const { x, z, w, d, h, color, name, signColor, faceDir, door = true, kind = null } = opt;
  const g = new THREE.Group();

  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, { rough: 0.85 }));
  body.position.set(x, h / 2, z);
  body.castShadow = true; body.receiveShadow = true;
  g.add(body);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 1.04, 0.5, d * 1.04), mat('#23232e'));
  roof.position.set(x, h + 0.25, z);
  g.add(roof);

  const fd = faceDir ? faceDir.clone().normalize() : new THREE.Vector3(0, 0, 1);
  const along = Math.abs(fd.z) > Math.abs(fd.x);
  const faceOffset = (along ? d : w) / 2;
  const faceCenter = new THREE.Vector3(x, 0, z).addScaledVector(fd, faceOffset);

  // windows on the facing wall
  const winM = mat('#bfe3ff', { rough: 0.2, metal: 0.3, emissive: '#27406b', emissiveIntensity: 0.4 });
  const faceW = along ? w : d;
  const cols = Math.max(2, Math.floor(faceW / 1.8));
  const rows = Math.max(1, Math.floor(h / 1.9));
  const right = along ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
  for (let r = 0; r < rows; r++) {
    for (let cc = 0; cc < cols; cc++) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.0), winM);
      const lateral = (cc - (cols - 1) / 2) * (faceW / cols);
      win.position.copy(faceCenter).addScaledVector(right, lateral).addScaledVector(fd, 0.06);
      win.position.y = 1.7 + r * 1.95;
      win.lookAt(win.position.clone().add(fd));
      g.add(win);
    }
  }

  let doorPos = null;
  if (door) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.0, 0.4), mat('#15151c'));
    frame.position.copy(faceCenter).addScaledVector(fd, 0.05); frame.position.y = 1.5;
    frame.lookAt(frame.position.clone().add(fd)); g.add(frame);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.6, 0.18), mat('#3a3f55', { rough: 0.4, metal: 0.3 }));
    panel.position.copy(faceCenter).addScaledVector(fd, 0.22); panel.position.y = 1.4;
    panel.lookAt(panel.position.clone().add(fd)); g.add(panel);
    // glowing entrance marker
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.3, 24),
      new THREE.MeshBasicMaterial({ color: signColor || '#4eff91', transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(faceCenter).addScaledVector(fd, 1.4); ring.position.y = 0.05;
    g.add(ring);
    doorPos = faceCenter.clone().addScaledVector(fd, 1.7); doorPos.y = 0;
  }

  if (name) {
    const sign = textSign(name, signColor || '#ffffff');
    sign.position.copy(faceCenter).addScaledVector(fd, 0.12);
    sign.position.y = Math.min(h - 0.7, 3.7);
    sign.lookAt(sign.position.clone().add(fd));
    g.add(sign);
  }

  // ── Phase 3D: storefront identity (awning + rooftop billboard + props) ──────
  // Makes each business recognizable from the road without reading a label.
  const along2 = Math.abs(fd.z) > Math.abs(fd.x);
  const faceW2 = along2 ? w : d;
  const rightV = along2 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
  // awning over the storefront in the sign colour
  if (door) {
    const awn = new THREE.Mesh(new THREE.BoxGeometry(Math.min(faceW2 - 0.6, 6.5), 0.22, 1.5),
      mat(signColor || '#cccccc', { rough: 0.6, emissive: signColor || '#888', emissiveIntensity: 0.18 }));
    awn.position.copy(faceCenter).addScaledVector(fd, 0.9); awn.position.y = 3.0;
    awn.rotation.y = Math.atan2(fd.x, fd.z); awn.rotation.x = -0.12;
    g.add(awn);
    // valance stripes under the awning
    for (let s = -2; s <= 2; s++) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.04),
        mat(s % 2 ? '#f4f4f4' : (color), { rough: 0.7 }));
      st.position.copy(faceCenter).addScaledVector(fd, 1.6).addScaledVector(rightV, s * 0.95);
      st.position.y = 2.78; st.rotation.y = Math.atan2(fd.x, fd.z);
      g.add(st);
    }
  }
  // rooftop billboard — a raised, lit nameplate readable from a block away
  if (name) {
    const board = textSign(name, signColor || '#ffffff');
    board.scale.set(1.15, 1.15, 1);
    board.position.copy(faceCenter).addScaledVector(fd, 0.3); board.position.y = h + 1.4;
    board.lookAt(board.position.clone().add(fd));
    g.add(board);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.4, 0.16), mat('#1a1a22'));
    post.position.copy(faceCenter).addScaledVector(fd, 0.1); post.position.y = h + 0.6;
    g.add(post);
  }
  // type-specific exterior props
  if (kind) storefrontProps(g, kind, faceCenter, fd, rightV, signColor, color);

  scene.add(g);
  addCollider(body);
  return { doorPos, faceDir: fd, body };
}

// Cheap, reliable procedural props that signal what a building IS. Additive and
// off to the sides of the entrance so they never block the door ring.
function storefrontProps(g, kind, faceCenter, fd, rightV, signColor, color) {
  const place = (mesh, fwd, side, y = 0) => {
    mesh.position.copy(faceCenter).addScaledVector(fd, fwd).addScaledVector(rightV, side);
    mesh.position.y = y; g.add(mesh);
  };
  const M = (c, o) => mat(c, o || {});
  switch (kind) {
    case 'chicken': {                       // outdoor menu board + stools
      const board = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.6, 0.12), M('#1c1c22'));
      board.position.y = 0.8; place(board, 1.4, 3.2, 0); board.position.y = 0.8;
      const menu = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.3), M('#ffcf3f', { emissive: '#caa23a', emissiveIntensity: 0.3 }));
      menu.position.copy(board.position).addScaledVector(fd, 0.08); menu.position.y = 0.95;
      menu.lookAt(menu.position.clone().add(fd)); g.add(menu);
      for (let s = -1; s <= 1; s += 2) {
        const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 10), M('#b5302a'));
        place(stool, 2.2, s * 1.3, 0.25);
      }
      break;
    }
    case 'frostbox': {                      // glowing gem pedestal
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 1.0, 12), M('#26406b'));
      place(ped, 1.6, 2.6, 0.5);
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0),
        M('#9fe8ff', { emissive: '#5fd0ff', emissiveIntensity: 0.9, metal: 0.4, rough: 0.15 }));
      place(gem, 1.6, 2.6, 1.25);
      break;
    }
    case 'kicks': {                         // oversized shoe-box display
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.6, 1.6), M('#2c6b4b'));
      place(box, 1.5, 2.8, 0.3);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.16, 1.65), M('#b3ffd1'));
      place(lid, 1.5, 2.8, 0.66);
      break;
    }
    case 'gym': {                           // dumbbell rack
      for (let s = -1; s <= 1; s++) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 8), M('#888'));
        bar.rotation.z = Math.PI / 2; place(bar, 1.6, s * 0.5, 0.4 + (s + 1) * 0.18);
        for (const e of [-0.45, 0.45]) {
          const w8 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 12), M('#222'));
          w8.rotation.z = Math.PI / 2;
          w8.position.copy(bar.position).addScaledVector(rightV, e); g.add(w8);
        }
      }
      break;
    }
    case 'blocksupply': {                   // stacked supply crates
      for (const [fwd, side, y, c] of [[1.4, 2.6, 0.4, '#5a3d2b'], [1.4, 2.6, 1.1, '#6b4a32'], [2.0, 3.1, 0.4, '#4b2c6b']]) {
        const crate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.8), M(c, { rough: 0.85 }));
        place(crate, fwd, side, y);
      }
      break;
    }
    case 'school': {                        // flagpole
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.2, 8), M('#cfd6e2'));
      place(pole, 1.8, 3.0, 2.1);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.6), M('#b9ffd6', { emissive: '#7fd0a8', emissiveIntensity: 0.3 }));
      place(flag, 1.8, 3.55, 3.6); flag.rotation.y = Math.PI / 2;
      break;
    }
    case 'office': {                        // entry planters
      for (let s = -1; s <= 1; s += 2) {
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.5, 10), M('#3a3f4a'));
        place(pot, 1.4, s * 2.0, 0.25);
        const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 1), M('#2f7d3a', { flat: true }));
        place(bush, 1.4, s * 2.0, 0.7);
      }
      break;
    }
    case 'home': {                          // mailbox
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 0.1), M('#6b4a2a'));
      place(post, 2.2, 2.4, 0.5);
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.5), M('#bfe3ff', { metal: 0.3 }));
      place(box, 2.2, 2.4, 1.05);
      break;
    }
    case 'garage': {                        // tire stack + tool sign
      for (let i = 0; i < 3; i++) {
        const tire = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.14, 8, 16), M('#1a1a1a', { rough: 0.95 }));
        tire.rotation.x = Math.PI / 2; place(tire, 1.5, 2.8, 0.16 + i * 0.3);
      }
      break;
    }
    case 'dealership': {                    // showroom pennant pole
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.0, 8), M('#9fe8ff'));
      place(pole, 1.8, 3.4, 2.0);
      break;
    }
    case 'police': {                        // flagpole + blue lamp + barrier
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.2, 8), M('#cfd6e2'));
      place(pole, 1.6, 3.2, 2.1);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8),
        M('#3aa0ff', { emissive: '#1d6fd6', emissiveIntensity: 0.9 }));
      place(beacon, 1.6, 3.2, 4.3);
      // low barrier rail by the entrance
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 2.6), M('#2b66c4', { emissive: '#16345f', emissiveIntensity: 0.35 }));
      place(rail, 1.3, -1.6, 0.35);
      break;
    }
    default: break;
  }
}

function tree(scene, x, z) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 1.2, 6), mat('#5a3b22', { flat: true }));
  trunk.position.set(x, 0.6, z);
  const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 1), mat('#2f7d3a', { flat: true }));
  leaves.position.set(x, 1.7, z);
  trunk.castShadow = leaves.castShadow = true;
  scene.add(trunk, leaves);
}
function streetLight(scene, x, z) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.4, 6), mat('#3a3a44'));
  pole.position.set(0, 1.7, 0); pole.castShadow = true;
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6),
    new THREE.MeshStandardMaterial({ color: '#fff6cf', emissive: '#ffdf8a', emissiveIntensity: 1.4 }));
  lamp.position.set(0, 3.4, 0);
  const glow = new THREE.PointLight('#ffe6a8', 3.2, 14, 1.8);
  glow.position.set(0, 3.3, 0);
  g.add(pole, lamp, glow);
  g.position.set(x, 0, z);
  scene.add(g);
  // breakable: a car ramming the post knocks it down + takes light damage.
  registerWorldObject(g, x, z, { r: 0.5, kind: 'streetlight' });
  return g;
}
function bench(scene, x, z, ry = 0) {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.5), mat('#6b4a2a'));
  seat.position.y = 0.5;
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.12), mat('#6b4a2a'));
  back.position.set(0, 0.75, -0.2);
  g.add(seat, back); g.position.set(x, 0, z); g.rotation.y = ry;
  scene.add(g);
}

export function buildCity(scene) {
  colliders.length = 0;
  clearWorldObjects();

  const grassTex = noiseTexture('#3f7140', ['#356030', '#4c8048', '#2e5a2c', '#5a8a52'], 2600, 60);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 260),
    new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1, metalness: 0 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  const asphaltTex = noiseTexture('#2a2a2e', ['#222226', '#333339', '#1c1c20'], 1600, 14);
  const roadM = new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.95, metalness: 0 });
  const lineM = mat('#d9c24a', { rough: 0.7, emissive: '#6b5a18', emissiveIntensity: 0.25 });
  const walkTex = noiseTexture('#9a9aa0', ['#888890', '#a8a8b0', '#7e7e86'], 900, 10);
  const walkM = new THREE.MeshStandardMaterial({ map: walkTex, roughness: 0.95, metalness: 0 });
  const stripeM = new THREE.MeshBasicMaterial({ color: '#e9e9ef' });

  // ── street grid (driven by mapConfig.ROAD) ────────────────────────────────
  const LEN = ROAD.extent * 2;          // closed grid: roads meet exactly at the corners
  const { width: ROAD_W, walk: WALK_W } = ROAD;
  const addRoad = (horizontal, offset) => {
    const geo = horizontal ? new THREE.PlaneGeometry(LEN, ROAD_W) : new THREE.PlaneGeometry(ROAD_W, LEN);
    const road = new THREE.Mesh(geo, roadM);
    road.rotation.x = -Math.PI / 2;
    road.position.set(horizontal ? 0 : offset, 0.015, horizontal ? offset : 0);
    road.receiveShadow = true; scene.add(road);
    [-1, 1].forEach(side => {
      const wg = horizontal ? new THREE.PlaneGeometry(LEN, WALK_W) : new THREE.PlaneGeometry(WALK_W, LEN);
      const w = new THREE.Mesh(wg, walkM);
      w.rotation.x = -Math.PI / 2;
      const dd = (ROAD_W / 2 + WALK_W / 2) * side;
      w.position.set(horizontal ? 0 : offset + dd, 0.012, horizontal ? offset + dd : 0);
      w.receiveShadow = true; scene.add(w);
    });
    for (let i = -LEN / 2 + 5; i <= LEN / 2 - 5; i += 5) {
      const dg = horizontal ? new THREE.PlaneGeometry(2.2, 0.2) : new THREE.PlaneGeometry(0.2, 2.2);
      const dash = new THREE.Mesh(dg, lineM);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(horizontal ? i : offset, 0.03, horizontal ? offset : i);
      scene.add(dash);
    }
  };
  ROAD.hz.forEach(o => addRoad(true, o));
  ROAD.vx.forEach(o => addRoad(false, o));

  // crosswalk stripes at the configured intersections (all four approaches)
  CROSSWALKS.forEach(([cx, cz]) => {
    const edge = ROAD_W / 2 + 0.5;
    for (const [ox, oz, horiz] of [[0, -edge, true], [0, edge, true], [-edge, 0, false], [edge, 0, false]]) {
      for (let s = -3; s <= 3; s++) {
        const g = horiz ? new THREE.PlaneGeometry(0.55, 2.0) : new THREE.PlaneGeometry(2.0, 0.55);
        const m = new THREE.Mesh(g, stripeM);
        m.rotation.x = -Math.PI / 2;
        m.position.set(cx + ox + (horiz ? s * 0.95 : 0), 0.028, cz + oz + (horiz ? 0 : s * 0.95));
        scene.add(m);
      }
    }
  });

  // ── dealership parking lot ────────────────────────────────────────────────
  const lot = new THREE.Mesh(new THREE.PlaneGeometry(PARKING.w, PARKING.d),
    new THREE.MeshStandardMaterial({ color: '#33333a', roughness: 0.95 }));
  lot.rotation.x = -Math.PI / 2; lot.position.set(PARKING.cx, 0.018, PARKING.cz);
  lot.receiveShadow = true; scene.add(lot);
  for (let s = 1; s < PARKING.stalls; s++) {
    const lx = PARKING.cx - PARKING.w / 2 + (PARKING.w / PARKING.stalls) * s;
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.12, PARKING.d - 0.8), stripeM);
    line.rotation.x = -Math.PI / 2; line.position.set(lx, 0.03, PARKING.cz); scene.add(line);
  }

  // ── park / plaza block ────────────────────────────────────────────────────
  const paveTex = noiseTexture('#8d8d95', ['#7a7a82', '#9a9aa2', '#6f6f77'], 1400, 8);
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(PARK.r, 40),
    new THREE.MeshStandardMaterial({ map: paveTex, roughness: 0.92, metalness: 0 }));
  plaza.rotation.x = -Math.PI / 2; plaza.position.set(PARK.cx, 0.02, PARK.cz);
  plaza.receiveShadow = true; scene.add(plaza);
  PARK.trees.forEach(([x, z]) => tree(scene, x, z));
  PARK.benches.forEach(([x, z, ry]) => bench(scene, x, z, ry));
  PARK.lights.forEach(([x, z]) => streetLight(scene, x, z));

  // ── enterable landmarks (working doors + interiors) ───────────────────────
  const dirOf = ([dx, dz]) => new THREE.Vector3(dx, 0, dz).normalize();
  const entrances = [];
  LANDMARKS.forEach(b => {
    const r = makeBuilding(scene, {
      x: b.x, z: b.z, w: b.w, d: b.d, h: b.h, color: b.color,
      name: b.name, signColor: b.sign, faceDir: dirOf(b.face), door: true, kind: b.id,
    });
    entrances.push({ id: b.id, name: b.name, interiorId: b.interiorId, doorPos: r.doorPos, faceDir: r.faceDir });
  });

  // ── non-enterable feature buildings (no prompt) ───────────────────────────
  FEATURES.forEach(f => {
    makeBuilding(scene, {
      x: f.x, z: f.z, w: f.w, d: f.d, h: f.h, color: f.color,
      name: f.name, signColor: f.sign, faceDir: dirOf(f.face), door: false,
    });
  });

  // ── street furniture lining Main Street ───────────────────────────────────
  // Guardrail: skip any configured light that would land in a driving lane
  // (placement-rule check) so a lamp can never sit in the middle of a road.
  let skippedLights = 0;
  STREET_LIGHTS.forEach(([x, z]) => {
    if (!clearOfRoads(x, z, 0.4)) { skippedLights++; return; }
    streetLight(scene, x, z);
  });
  if (skippedLights) console.warn('[world] skipped', skippedLights, 'streetlight(s) that fell in a road lane');
  STREET_TREES.forEach(([x, z]) => { if (clearOfRoads(x, z, 0.3)) tree(scene, x, z); });

  // ── police post (Phase 3J) ────────────────────────────────────────────────
  const police = buildPolicePost(scene, walkM, stripeM);

  return {
    spawn: new THREE.Vector3(SPAWN.x, 0, SPAWN.z), spawnFaceY: SPAWN.faceY,
    entrances, police,
  };
}

// Visible civic-safety HQ: labelled building, a small cruiser lot, and two
// parked cruiser pads. Returns { deskPos, faceDir, cruisers:[{x,z,ry}] } so the
// game layer can wire a front-desk interaction and spawn stealable cruisers.
function buildPolicePost(scene, walkM, stripeM) {
  const P = POLICE_POST;
  const fd = new THREE.Vector3(P.face[0], 0, P.face[1]).normalize();
  const r = makeBuilding(scene, {
    x: P.x, z: P.z, w: P.w, d: P.d, h: P.h, color: P.color,
    name: P.name, signColor: P.sign, faceDir: fd, door: true, kind: 'police',
  });

  // cruiser lot pavement + stall lines
  const lot = new THREE.Mesh(new THREE.PlaneGeometry(P.lot.w, P.lot.d),
    new THREE.MeshStandardMaterial({ color: '#30323c', roughness: 0.95 }));
  lot.rotation.x = -Math.PI / 2; lot.position.set(P.lot.cx, 0.018, P.lot.cz);
  lot.receiveShadow = true; scene.add(lot);
  const line = new THREE.Mesh(new THREE.PlaneGeometry(0.12, P.lot.d - 1.0), stripeM);
  line.rotation.x = -Math.PI / 2; line.position.set(P.lot.cx, 0.03, P.lot.cz); scene.add(line);

  // blue/white curb posts framing the lot entrance (decorative, registered)
  [[-1], [1]].forEach(([s]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.0, 8),
      mat('#2b66c4', { emissive: '#16345f', emissiveIntensity: 0.4 }));
    post.position.set(P.lot.cx - P.lot.w / 2 - 0.3, 0.5, P.lot.cz + s * (P.lot.d / 2 - 0.4));
    post.castShadow = true; scene.add(post);
  });

  // front desk sits just in front of the (non-opening) door
  const deskPos = r.doorPos.clone().add(fd.clone().multiplyScalar(P.deskOffset));
  return {
    deskPos,
    doorPos: r.doorPos.clone(),                 // E here ENTERS the precinct interior
    entryFaceDir: fd.clone(),                   // direction the player faces walking in
    faceDir: fd.clone().multiplyScalar(-1),     // cars face out toward town
    cruisers: P.cruisers.map(([x, z]) => ({ x, z })),
  };
}
