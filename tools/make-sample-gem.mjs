// ───────────────────────────────────────────────────────────────────────────
//  make-sample-gem.mjs — generates a tiny ORIGINAL (CC0) .glb diamond gem so
//  the asset pipeline has at least one real GLB to load in-world. No external
//  deps: writes a valid glTF 2.0 binary by hand (octahedral brilliant-cut gem,
//  flat-shaded facets, low-roughness PBR so it sparkles under the HDRI).
//
//  Run:  node tools/make-sample-gem.mjs
//  Out:  public/assets/models/jewelry/frostbox_gem_diamond.glb
// ───────────────────────────────────────────────────────────────────────────
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// Diamond silhouette: crown apex, girdle ring, deeper pavilion apex.
const T = [0, 0.95, 0];           // crown top
const B = [0, -1.15, 0];          // pavilion bottom
const R = [
  [0.85, 0.12, 0],
  [0, 0.12, 0.85],
  [-0.85, 0.12, 0],
  [0, 0.12, -0.85],
];

const faces = [
  // crown (outward CCW)
  [T, R[0], R[1]], [T, R[1], R[2]], [T, R[2], R[3]], [T, R[3], R[0]],
  // pavilion
  [B, R[1], R[0]], [B, R[2], R[1]], [B, R[3], R[2]], [B, R[0], R[3]],
];

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (v) => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

const positions = [];
const normals = [];
const indices = [];
let vi = 0;
for (const [a, b, c] of faces) {
  const n = norm(cross(sub(b, a), sub(c, a)));
  for (const p of [a, b, c]) { positions.push(...p); normals.push(...n); }
  indices.push(vi, vi + 1, vi + 2); vi += 3;
}

// bounds for the POSITION accessor
const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < positions.length; i += 3) {
  for (let k = 0; k < 3; k++) {
    min[k] = Math.min(min[k], positions[i + k]);
    max[k] = Math.max(max[k], positions[i + k]);
  }
}

const posBytes = positions.length * 4;
const nrmBytes = normals.length * 4;
const idxBytes = indices.length * 2;
const binLen = posBytes + nrmBytes + idxBytes;

const bin = Buffer.alloc(binLen);
let off = 0;
for (const v of positions) { bin.writeFloatLE(v, off); off += 4; }
for (const v of normals) { bin.writeFloatLE(v, off); off += 4; }
for (const v of indices) { bin.writeUInt16LE(v, off); off += 2; }

const gltf = {
  asset: { version: '2.0', generator: 'zaylinsworld-gem (CC0)' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: 'Diamond' }],
  meshes: [{
    name: 'Diamond',
    primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0, mode: 4 }],
  }],
  materials: [{
    name: 'DiamondPBR',
    pbrMetallicRoughness: { baseColorFactor: [0.82, 0.9, 1.0, 1], metallicFactor: 0.0, roughnessFactor: 0.06 },
    doubleSided: true,
  }],
  accessors: [
    { bufferView: 0, componentType: 5126, count: positions.length / 3, type: 'VEC3', min, max },
    { bufferView: 1, componentType: 5126, count: normals.length / 3, type: 'VEC3' },
    { bufferView: 2, componentType: 5123, count: indices.length, type: 'SCALAR' },
  ],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: posBytes, target: 34962 },
    { buffer: 0, byteOffset: posBytes, byteLength: nrmBytes, target: 34962 },
    { buffer: 0, byteOffset: posBytes + nrmBytes, byteLength: idxBytes, target: 34963 },
  ],
  buffers: [{ byteLength: binLen }],
};

// ── pack into a .glb container ────────────────────────────────────────────────
function pad4(n) { return (4 - (n % 4)) % 4; }

let json = Buffer.from(JSON.stringify(gltf), 'utf8');
json = Buffer.concat([json, Buffer.alloc(pad4(json.length), 0x20)]);   // pad with spaces

let binChunk = bin;
binChunk = Buffer.concat([binChunk, Buffer.alloc(pad4(binChunk.length), 0x00)]);

const header = Buffer.alloc(12);
const total = 12 + 8 + json.length + 8 + binChunk.length;
header.writeUInt32LE(0x46546c67, 0); // magic 'glTF'
header.writeUInt32LE(2, 4);          // version
header.writeUInt32LE(total, 8);      // total length

const jsonHeader = Buffer.alloc(8);
jsonHeader.writeUInt32LE(json.length, 0);
jsonHeader.writeUInt32LE(0x4e4f534a, 4); // 'JSON'

const binHeader = Buffer.alloc(8);
binHeader.writeUInt32LE(binChunk.length, 0);
binHeader.writeUInt32LE(0x004e4942, 4);  // 'BIN\0'

const glb = Buffer.concat([header, jsonHeader, json, binHeader, binChunk]);

const out = 'public/assets/models/jewelry/frostbox_gem_diamond.glb';
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, glb);
console.log(`Wrote ${out} (${glb.length} bytes, ${positions.length / 3} verts)`);
