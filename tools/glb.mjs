// ───────────────────────────────────────────────────────────────────────────
//  glb.mjs — tiny dependency-free glTF 2.0 / GLB writer + geometry toolkit.
//
//  Used by the asset-generation scripts to author ORIGINAL (CC0) starter models
//  directly in the repo: builds parametric geometry (box, cylinder, sphere,
//  cone, torus, octahedron), accumulates parts by PBR material into a single
//  optimized mesh, and packs everything into a valid binary .glb.
//
//  Everything here is original geometry — no third-party/ripped assets.
// ───────────────────────────────────────────────────────────────────────────
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// ── small vec/matrix helpers ──────────────────────────────────────────────────
function mat4Identity() { return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]; }
function mat4Mul(a, b) {
  const o = new Array(16).fill(0);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++)
    for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}
function mat4Translate(x, y, z) { const m = mat4Identity(); m[12] = x; m[13] = y; m[14] = z; return m; }
function mat4Scale(x, y, z) { const m = mat4Identity(); m[0] = x; m[5] = y; m[10] = z; return m; }
function mat4RotX(a) { const c = Math.cos(a), s = Math.sin(a); const m = mat4Identity(); m[5]=c; m[6]=s; m[9]=-s; m[10]=c; return m; }
function mat4RotY(a) { const c = Math.cos(a), s = Math.sin(a); const m = mat4Identity(); m[0]=c; m[2]=-s; m[8]=s; m[10]=c; return m; }
function mat4RotZ(a) { const c = Math.cos(a), s = Math.sin(a); const m = mat4Identity(); m[0]=c; m[1]=s; m[4]=-s; m[5]=c; return m; }

// Build a transform from translation / euler(XYZ) / scale.
export function transform({ t = [0,0,0], r = [0,0,0], s = [1,1,1] } = {}) {
  let m = mat4Identity();
  m = mat4Mul(m, mat4Translate(t[0], t[1], t[2]));
  m = mat4Mul(m, mat4RotZ(r[2]));
  m = mat4Mul(m, mat4RotY(r[1]));
  m = mat4Mul(m, mat4RotX(r[0]));
  m = mat4Mul(m, mat4Scale(s[0], s[1], s[2]));
  return m;
}
function applyPoint(m, p) {
  return [
    m[0]*p[0] + m[4]*p[1] + m[8]*p[2] + m[12],
    m[1]*p[0] + m[5]*p[1] + m[9]*p[2] + m[13],
    m[2]*p[0] + m[6]*p[1] + m[10]*p[2] + m[14],
  ];
}
function applyNormal(m, n) {
  // ignore translation; use upper-3x3 (good enough for our rot+uniform/axis scales)
  const x = m[0]*n[0] + m[4]*n[1] + m[8]*n[2];
  const y = m[1]*n[0] + m[5]*n[1] + m[9]*n[2];
  const z = m[2]*n[0] + m[6]*n[1] + m[10]*n[2];
  const l = Math.hypot(x, y, z) || 1;
  return [x/l, y/l, z/l];
}

// ── geometry generators → { positions:[], normals:[], indices:[] } ─────────────
export function boxGeo(w = 1, h = 1, d = 1) {
  const x = w/2, y = h/2, z = d/2;
  const faces = [
    { n: [0,0,1],  v: [[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]] },
    { n: [0,0,-1], v: [[x,-y,-z],[-x,-y,-z],[-x,y,-z],[x,y,-z]] },
    { n: [1,0,0],  v: [[x,-y,z],[x,-y,-z],[x,y,-z],[x,y,z]] },
    { n: [-1,0,0], v: [[-x,-y,-z],[-x,-y,z],[-x,y,z],[-x,y,-z]] },
    { n: [0,1,0],  v: [[-x,y,z],[x,y,z],[x,y,-z],[-x,y,-z]] },
    { n: [0,-1,0], v: [[-x,-y,-z],[x,-y,-z],[x,-y,z],[-x,-y,z]] },
  ];
  const positions = [], normals = [], indices = [];
  let i = 0;
  for (const f of faces) {
    for (const v of f.v) { positions.push(...v); normals.push(...f.n); }
    indices.push(i, i+1, i+2, i, i+2, i+3); i += 4;
  }
  return { positions, normals, indices };
}

// Cylinder/cone along +Y, centered at origin. rt=top radius, rb=bottom radius.
export function cylGeo(rt = 0.5, rb = 0.5, h = 1, seg = 16, caps = true) {
  const positions = [], normals = [], indices = [];
  const y0 = -h/2, y1 = h/2;
  const slope = Math.atan2(rb - rt, h);
  const cs = Math.cos(slope), sn = Math.sin(slope);
  let base = 0;
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2, a1 = ((i+1) / seg) * Math.PI * 2;
    const dirs = [[Math.cos(a0), Math.sin(a0)], [Math.cos(a1), Math.sin(a1)]];
    const quad = [
      [dirs[0][0]*rb, y0, dirs[0][1]*rb], [dirs[1][0]*rb, y0, dirs[1][1]*rb],
      [dirs[1][0]*rt, y1, dirs[1][1]*rt], [dirs[0][0]*rt, y1, dirs[0][1]*rt],
    ];
    const norms = [
      [dirs[0][0]*cs, sn, dirs[0][1]*cs], [dirs[1][0]*cs, sn, dirs[1][1]*cs],
      [dirs[1][0]*cs, sn, dirs[1][1]*cs], [dirs[0][0]*cs, sn, dirs[0][1]*cs],
    ];
    for (let k = 0; k < 4; k++) { positions.push(...quad[k]); normals.push(...norms[k]); }
    indices.push(base, base+1, base+2, base, base+2, base+3); base += 4;
  }
  if (caps) {
    if (rt > 1e-5) base = addCap(positions, normals, indices, base, rt, y1, seg, 1);
    if (rb > 1e-5) base = addCap(positions, normals, indices, base, rb, y0, seg, -1);
  }
  return { positions, normals, indices };
}
function addCap(positions, normals, indices, base, r, y, seg, dir) {
  const c = base; positions.push(0, y, 0); normals.push(0, dir, 0); base++;
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    positions.push(Math.cos(a)*r, y, Math.sin(a)*r); normals.push(0, dir, 0); base++;
  }
  for (let i = 0; i < seg; i++) {
    if (dir > 0) indices.push(c, c+1+i, c+2+i);
    else indices.push(c, c+2+i, c+1+i);
  }
  return base;
}

export function sphereGeo(r = 0.5, seg = 16, rings = 12) {
  const positions = [], normals = [], indices = [];
  for (let y = 0; y <= rings; y++) {
    const v = y / rings, phi = v * Math.PI;
    for (let x = 0; x <= seg; x++) {
      const u = x / seg, theta = u * Math.PI * 2;
      const nx = Math.sin(phi) * Math.cos(theta);
      const ny = Math.cos(phi);
      const nz = Math.sin(phi) * Math.sin(theta);
      positions.push(nx*r, ny*r, nz*r); normals.push(nx, ny, nz);
    }
  }
  const row = seg + 1;
  for (let y = 0; y < rings; y++) for (let x = 0; x < seg; x++) {
    const a = y*row + x, b = a + row;
    indices.push(a, b, a+1, a+1, b, b+1);
  }
  return { positions, normals, indices };
}

// Half-sphere dome (for afros/heads). openBottom by default.
export function domeGeo(r = 0.5, seg = 16, rings = 8, squash = 1) {
  const positions = [], normals = [], indices = [];
  for (let y = 0; y <= rings; y++) {
    const v = y / rings, phi = v * (Math.PI / 2);
    for (let x = 0; x <= seg; x++) {
      const u = x / seg, theta = u * Math.PI * 2;
      const nx = Math.sin(phi) * Math.cos(theta);
      const ny = Math.cos(phi);
      const nz = Math.sin(phi) * Math.sin(theta);
      positions.push(nx*r, ny*r*squash, nz*r); normals.push(nx, ny, nz);
    }
  }
  const row = seg + 1;
  for (let y = 0; y < rings; y++) for (let x = 0; x < seg; x++) {
    const a = y*row + x, b = a + row;
    indices.push(a, b, a+1, a+1, b, b+1);
  }
  return { positions, normals, indices };
}

export function torusGeo(R = 0.5, r = 0.15, seg = 20, sides = 12) {
  const positions = [], normals = [], indices = [];
  for (let i = 0; i <= seg; i++) {
    const u = (i / seg) * Math.PI * 2, cu = Math.cos(u), su = Math.sin(u);
    for (let j = 0; j <= sides; j++) {
      const v = (j / sides) * Math.PI * 2, cv = Math.cos(v), sv = Math.sin(v);
      positions.push((R + r*cv)*cu, r*sv, (R + r*cv)*su);
      normals.push(cv*cu, sv, cv*su);
    }
  }
  const row = sides + 1;
  for (let i = 0; i < seg; i++) for (let j = 0; j < sides; j++) {
    const a = i*row + j, b = (i+1)*row + j;
    indices.push(a, b, a+1, a+1, b, b+1);
  }
  return { positions, normals, indices };
}

export function octaGeo(r = 0.5) {
  const T = [0, r, 0], B = [0, -r*1.2, 0];
  const ring = [[r,r*0.15,0],[0,r*0.15,r],[-r,r*0.15,0],[0,r*0.15,-r]];
  const faces = [
    [T,ring[0],ring[1]],[T,ring[1],ring[2]],[T,ring[2],ring[3]],[T,ring[3],ring[0]],
    [B,ring[1],ring[0]],[B,ring[2],ring[1]],[B,ring[3],ring[2]],[B,ring[0],ring[3]],
  ];
  const positions = [], normals = [], indices = [];
  const sub = (a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const nrm=v=>{const l=Math.hypot(...v)||1;return[v[0]/l,v[1]/l,v[2]/l];};
  let i = 0;
  for (const [a,b,c] of faces) {
    const n = nrm(cross(sub(b,a),sub(c,a)));
    for (const p of [a,b,c]) { positions.push(...p); normals.push(...n); }
    indices.push(i,i+1,i+2); i += 3;
  }
  return { positions, normals, indices };
}

// ── model accumulator: group parts by material into one mesh ───────────────────
export class Model {
  constructor() { this.materials = []; this.matKey = new Map(); this.prims = new Map(); }
  material(def) {
    const key = JSON.stringify(def);
    if (this.matKey.has(key)) return this.matKey.get(key);
    const idx = this.materials.length; this.materials.push(def);
    this.matKey.set(key, idx); this.prims.set(idx, { positions: [], normals: [], indices: [] });
    return idx;
  }
  add(geo, matIndex, M = mat4Identity()) {
    const prim = this.prims.get(matIndex);
    const base = prim.positions.length / 3;
    for (let i = 0; i < geo.positions.length; i += 3) {
      const p = applyPoint(M, [geo.positions[i], geo.positions[i+1], geo.positions[i+2]]);
      const n = applyNormal(M, [geo.normals[i], geo.normals[i+1], geo.normals[i+2]]);
      prim.positions.push(p[0], p[1], p[2]);
      prim.normals.push(n[0], n[1], n[2]);
    }
    for (const idx of geo.indices) prim.indices.push(base + idx);
  }
}

// ── PBR material presets (baseColor, metallic, roughness, emissive) ────────────
export function pbr(color, { metal = 0, rough = 0.8, emissive = null, emissiveStrength = 1, alpha = 1, double = false } = {}) {
  const c = hexToLin(color);
  const def = {
    pbrMetallicRoughness: { baseColorFactor: [c[0], c[1], c[2], alpha], metallicFactor: metal, roughnessFactor: rough },
    doubleSided: double,
  };
  if (alpha < 1) def.alphaMode = 'BLEND';
  if (emissive) { const e = hexToLin(emissive); def.emissiveFactor = [e[0]*emissiveStrength, e[1]*emissiveStrength, e[2]*emissiveStrength]; }
  return def;
}
function hexToLin(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0,2),16)/255, g = parseInt(h.slice(2,4),16)/255, b = parseInt(h.slice(4,6),16)/255;
  const lin = (x) => (x <= 0.04045 ? x/12.92 : Math.pow((x+0.055)/1.055, 2.4));
  return [lin(r), lin(g), lin(b)];
}

// ── pack a Model into a .glb file ──────────────────────────────────────────────
export function writeGLB(model, outPath, { name = 'Model' } = {}) {
  const buffers = [];          // raw little-endian chunks
  const accessors = [];
  const bufferViews = [];
  let byteLength = 0;

  function pushView(buf, target) {
    // 4-byte align
    const pad = (4 - (byteLength % 4)) % 4;
    if (pad) { buffers.push(Buffer.alloc(pad)); byteLength += pad; }
    const off = byteLength;
    buffers.push(buf); byteLength += buf.length;
    bufferViews.push({ buffer: 0, byteOffset: off, byteLength: buf.length, ...(target ? { target } : {}) });
    return bufferViews.length - 1;
  }
  function floatAccessor(arr, type, withBounds) {
    const buf = Buffer.alloc(arr.length * 4);
    for (let i = 0; i < arr.length; i++) buf.writeFloatLE(arr[i], i * 4);
    const view = pushView(buf, 34962);
    const count = arr.length / (type === 'VEC3' ? 3 : type === 'VEC2' ? 2 : 1);
    const acc = { bufferView: view, componentType: 5126, count, type };
    if (withBounds) {
      const dim = type === 'VEC3' ? 3 : 2;
      const min = new Array(dim).fill(Infinity), max = new Array(dim).fill(-Infinity);
      for (let i = 0; i < arr.length; i += dim) for (let k = 0; k < dim; k++) {
        min[k] = Math.min(min[k], arr[i+k]); max[k] = Math.max(max[k], arr[i+k]);
      }
      acc.min = min; acc.max = max;
    }
    accessors.push(acc); return accessors.length - 1;
  }
  function intAccessor(arr) {
    const use32 = arr.length > 0 && Math.max(...arr) > 65535;
    const buf = Buffer.alloc(arr.length * (use32 ? 4 : 2));
    for (let i = 0; i < arr.length; i++) use32 ? buf.writeUInt32LE(arr[i], i*4) : buf.writeUInt16LE(arr[i], i*2);
    const view = pushView(buf, 34963);
    accessors.push({ bufferView: view, componentType: use32 ? 5125 : 5123, count: arr.length, type: 'SCALAR' });
    return accessors.length - 1;
  }

  const primitives = [];
  for (const [matIndex, prim] of model.prims) {
    if (prim.indices.length === 0) continue;
    const pAcc = floatAccessor(prim.positions, 'VEC3', true);
    const nAcc = floatAccessor(prim.normals, 'VEC3', false);
    const iAcc = intAccessor(prim.indices);
    primitives.push({ attributes: { POSITION: pAcc, NORMAL: nAcc }, indices: iAcc, material: matIndex, mode: 4 });
  }

  const gltf = {
    asset: { version: '2.0', generator: 'zaylinsworld-assetpack (CC0)' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name }],
    meshes: [{ name, primitives }],
    materials: model.materials.map((m, i) => ({ name: 'mat' + i, ...m })),
    accessors, bufferViews,
    buffers: [{ byteLength }],
  };

  const bin = Buffer.concat(buffers);
  let json = Buffer.from(JSON.stringify(gltf), 'utf8');
  const jpad = (4 - (json.length % 4)) % 4;
  if (jpad) json = Buffer.concat([json, Buffer.alloc(jpad, 0x20)]);
  const bpad = (4 - (bin.length % 4)) % 4;
  const binC = bpad ? Buffer.concat([bin, Buffer.alloc(bpad)]) : bin;

  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + json.length + 8 + binC.length, 8);
  const jh = Buffer.alloc(8); jh.writeUInt32LE(json.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
  const bh = Buffer.alloc(8); bh.writeUInt32LE(binC.length, 0); bh.writeUInt32LE(0x004e4942, 4);

  const glb = Buffer.concat([header, jh, json, bh, binC]);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, glb);
  return glb.length;
}
