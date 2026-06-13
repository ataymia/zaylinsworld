// ───────────────────────────────────────────────────────────────────────────
//  world.js — low-poly 3D city: roads, detailed buildings with doors/windows,
//  props, and entrance trigger data for the interaction manager.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import {
  ROAD, CROSSWALKS, LANDMARKS, FEATURES,
  PARK, PARKING, STREET_LIGHTS, STREET_TREES, SPAWN,
} from './config/mapConfig.js';

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
  const { x, z, w, d, h, color, name, signColor, faceDir, door = true } = opt;
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

  scene.add(g);
  addCollider(body);
  return { doorPos, faceDir: fd, body };
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
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.4, 6), mat('#3a3a44'));
  pole.position.set(x, 1.7, z); pole.castShadow = true;
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6),
    new THREE.MeshStandardMaterial({ color: '#fff6cf', emissive: '#ffdf8a', emissiveIntensity: 1.4 }));
  lamp.position.set(x, 3.4, z);
  const glow = new THREE.PointLight('#ffe6a8', 3.2, 14, 1.8);
  glow.position.set(x, 3.3, z);
  scene.add(pole, lamp, glow);
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
      name: b.name, signColor: b.sign, faceDir: dirOf(b.face), door: true,
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
  STREET_LIGHTS.forEach(([x, z]) => streetLight(scene, x, z));
  STREET_TREES.forEach(([x, z]) => tree(scene, x, z));

  return { spawn: new THREE.Vector3(SPAWN.x, 0, SPAWN.z), spawnFaceY: SPAWN.faceY, entrances };
}
