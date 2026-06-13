// ───────────────────────────────────────────────────────────────────────────
//  world.js — low-poly 3D city: roads, detailed buildings with doors/windows,
//  props, and entrance trigger data for the interaction manager.
// ───────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';

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

  const paveTex = noiseTexture('#8d8d95', ['#7a7a82', '#9a9aa2', '#6f6f77'], 1400, 8);
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(16, 40),
    new THREE.MeshStandardMaterial({ map: paveTex, roughness: 0.92, metalness: 0 }));
  plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.02; plaza.receiveShadow = true; scene.add(plaza);

  const asphaltTex = noiseTexture('#2a2a2e', ['#222226', '#333339', '#1c1c20'], 1600, 14);
  const roadM = new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.95, metalness: 0 });
  const lineM = mat('#d9c24a', { rough: 0.7, emissive: '#6b5a18', emissiveIntensity: 0.25 });
  const hRoad = new THREE.Mesh(new THREE.PlaneGeometry(140, 9), roadM);
  hRoad.rotation.x = -Math.PI / 2; hRoad.position.y = 0.015; hRoad.receiveShadow = true; scene.add(hRoad);
  const vRoad = new THREE.Mesh(new THREE.PlaneGeometry(9, 140), roadM);
  vRoad.rotation.x = -Math.PI / 2; vRoad.position.y = 0.016; vRoad.receiveShadow = true; scene.add(vRoad);
  for (let i = -65; i <= 65; i += 5) {
    const a = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.2), lineM);
    a.rotation.x = -Math.PI / 2; a.position.set(i, 0.03, 0); scene.add(a);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 2.2), lineM);
    b.rotation.x = -Math.PI / 2; b.position.set(0, 0.031, i); scene.add(b);
  }

  const toCenter = (x, z) => new THREE.Vector3(-x, 0, -z).normalize();
  const defs = [
    { id: 'dealership', name: 'AUTO HAUS',     interiorId: 'dealership', x: 0,   z: -34, w: 18, d: 12, h: 8, color: '#5b6470', sign: '#9fe8ff' },
    { id: 'frostbox',   name: 'FROSTBOX',      interiorId: 'frostbox',   x: -30, z: -20, w: 11, d: 10, h: 6, color: '#26406b', sign: '#9fe8ff' },
    { id: 'blocksupply',name: 'BLOCK SUPPLY',  interiorId: 'blocksupply',x: 30,  z: -20, w: 11, d: 10, h: 6, color: '#4b2c6b', sign: '#d9b3ff' },
    { id: 'chicken',    name: 'CHICKEN SPOT',  interiorId: 'chicken',    x: -30, z: 20,  w: 12, d: 10, h: 6, color: '#b5302a', sign: '#ffcf3f' },
    { id: 'home',       name: "ZAYLEN'S HOME", interiorId: 'home',       x: 30,  z: 20,  w: 11, d: 10, h: 5, color: '#8a7a5a', sign: '#bfe3ff' },
    { id: 'kicks',      name: 'KICKS & FITS',  interiorId: 'kicks',      x: -34, z: 0,   w: 11, d: 10, h: 6, color: '#2c6b4b', sign: '#b3ffd1' },
  ];

  const entrances = [];
  defs.forEach(b => {
    const r = makeBuilding(scene, {
      x: b.x, z: b.z, w: b.w, d: b.d, h: b.h, color: b.color,
      name: b.name, signColor: b.sign, faceDir: toCenter(b.x, b.z), door: true,
    });
    entrances.push({ id: b.id, name: b.name, interiorId: b.interiorId, doorPos: r.doorPos, faceDir: r.faceDir });
  });

  makeBuilding(scene, { x: 34, z: 0, w: 11, d: 10, h: 7, color: '#6b2c2c',
    name: 'IRON CITY GYM', signColor: '#ff9f9f', faceDir: toCenter(34, 0), door: false });

  const palette = ['#586273', '#735858', '#586b5e', '#6b6358', '#62587a'];
  const rand = (a, b) => a + Math.random() * (b - a);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const rr = rand(52, 70);
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    makeBuilding(scene, { x, z, w: rand(6, 10), d: rand(6, 10), h: rand(10, 24),
      color: palette[i % palette.length], faceDir: toCenter(x, z), door: false, name: null });
  }

  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    tree(scene, Math.cos(a) * 19, Math.sin(a) * 19);
  }
  [[8, 8], [-8, 8], [8, -8], [-8, -8], [16, 0], [-16, 0], [0, 16], [0, -16]]
    .forEach(([x, z]) => streetLight(scene, x, z));
  bench(scene, 6, 12, 0.3); bench(scene, -6, -12, 2.8);

  return { spawn: new THREE.Vector3(0, 0, 12), entrances };
}
