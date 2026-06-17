// ───────────────────────────────────────────────────────────────────────────
//  audit-rigs.mjs — classify every served character GLB by how usable it is as
//  an animated, rigged skin (categorization is NOT rigging — this is the rig
//  pass that runs AFTER routing).
//
//  Run:  npm run audit:rigs   (or: node tools/audit-rigs.mjs)
//  Out:  docs/RIG_AUDIT_REPORT.md
//
//  For each GLB under public/assets/models/characters/** it reads the glTF JSON
//  chunk (no Three.js needed) and reports:
//    • has skins?          (skinned mesh present)
//    • has animations?     (clips present)
//    • clip names          (matched against the Animation State Machine)
//    • humanoid bounds      (rough height check from accessor min/max)
//  …then assigns one status:
//    static-prop-only | valid-skin-no-clips | rigged-with-clips |
//    needs-retarget | reject-bad-bounds
// ───────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CHAR_DIR = path.join(ROOT, 'public', 'assets', 'models', 'characters');
const OUT_DOC = path.join(ROOT, 'docs', 'RIG_AUDIT_REPORT.md');

// Clip names the Animation State Machine expects (docs/ANIMATION_STATE_MACHINE.md).
const STATE_CLIPS = [
  'idle', 'walk', 'run', 'jump', 'fall', 'sit', 'drive', 'talk', 'eat', 'workout',
];

function walk(dir, acc = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.toLowerCase().endsWith('.glb')) acc.push(p);
  }
  return acc;
}

// Read only the JSON chunk of a GLB (chunk type 0x4e4f534a = "JSON").
function readGlbJson(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const head = Buffer.alloc(20);
    fs.readSync(fd, head, 0, 20, 0);
    if (head.readUInt32LE(0) !== 0x46546c67) return null; // not glTF
    const jsonLen = head.readUInt32LE(12);
    const jsonType = head.readUInt32LE(16);
    if (jsonType !== 0x4e4f534a) return null;
    const json = Buffer.alloc(jsonLen);
    fs.readSync(fd, json, 0, jsonLen, 20);
    return JSON.parse(json.toString('utf8'));
  } catch {
    return null;
  } finally {
    fs.closeSync(fd);
  }
}

// Rough model height from the POSITION accessors actually referenced by mesh
// primitives (ignoring animation-output / joint accessors that would otherwise
// inflate the bounds). Returned in the GLB's raw units — node transforms are NOT
// applied here, so this is a sanity signal, not a normalized world height.
function estimateHeight(json) {
  if (!json.accessors || !json.meshes) return null;
  const posIdx = new Set();
  for (const mesh of json.meshes) {
    for (const prim of mesh.primitives || []) {
      if (prim.attributes && prim.attributes.POSITION != null) posIdx.add(prim.attributes.POSITION);
    }
  }
  let maxY = -Infinity, minY = Infinity;
  for (const i of posIdx) {
    const acc = json.accessors[i];
    if (acc && Array.isArray(acc.min) && Array.isArray(acc.max) && acc.min.length === 3) {
      minY = Math.min(minY, acc.min[1]);
      maxY = Math.max(maxY, acc.max[1]);
    }
  }
  if (!isFinite(maxY) || !isFinite(minY)) return null;
  return maxY - minY;
}

function classify({ hasSkin, clips, height }) {
  // bounds gate: only reject degenerate/non-finite geometry. Absolute height is
  // unit-dependent (cm vs m) and node-transform-dependent, so it is reported but
  // not used as a hard reject here — the runtime swap in src/monsters.js applies
  // node transforms and re-validates normalized bounds before showing a GLB.
  const badBounds = height != null && (height <= 0 || !isFinite(height));
  if (badBounds) return 'reject-bad-bounds';
  if (!hasSkin) return 'static-prop-only';
  const matched = clips.filter((c) => STATE_CLIPS.some((s) => c.toLowerCase().includes(s)));
  if (clips.length === 0) return 'valid-skin-no-clips';
  if (matched.length > 0) return 'rigged-with-clips';
  return 'needs-retarget'; // has a skin + clips, but none map to the state machine
}

const files = walk(CHAR_DIR);
const esc = (s) => String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/\|/g, '\\|');

const rows = files.map((abs) => {
  const rel = path.relative(path.join(ROOT, 'public', 'assets'), abs).split(path.sep).join('/');
  const json = readGlbJson(abs);
  if (!json) {
    return { rel, hasSkin: false, clips: [], height: null, status: 'reject-bad-bounds', note: 'unreadable GLB' };
  }
  const hasSkin = Array.isArray(json.skins) && json.skins.length > 0;
  const clips = (json.animations || []).map((a, i) => a.name || `clip_${i}`);
  const height = estimateHeight(json);
  const status = classify({ hasSkin, clips, height });
  return { rel, hasSkin, clips, height, status, note: '' };
}).sort((a, b) => a.rel.localeCompare(b.rel));

const counts = {};
for (const r of rows) counts[r.status] = (counts[r.status] || 0) + 1;

let md = '';
md += '# Character Rig Audit\n\n';
md += `_Generated by \`tools/audit-rigs.mjs\` (\`npm run audit:rigs\`). Categorization is not rigging — this pass reports which routed character GLBs are static props, valid skins, fully rigged, or need a retarget. Re-run after routing/conversion._\n\n`;
md += '## Status legend\n\n';
md += '- **static-prop-only** — no skin; usable as scenery only, not as an animated character.\n';
md += '- **valid-skin-no-clips** — has a skin but no animation clips; needs clips/retarget for motion.\n';
md += '- **rigged-with-clips** — has a skin and clip(s) matching the Animation State Machine.\n';
md += '- **needs-retarget** — has a skin and clips, but no clip names map to the state machine.\n';
md += '- **reject-bad-bounds** — unreadable or out-of-range bounds; do not use as a skin.\n\n';

md += '## Summary\n\n';
md += `- Character GLBs scanned: **${rows.length}**\n`;
for (const s of ['rigged-with-clips', 'needs-retarget', 'valid-skin-no-clips', 'static-prop-only', 'reject-bad-bounds']) {
  md += `- ${s}: **${counts[s] || 0}**\n`;
}
md += '\n';

md += '## Per-asset\n\n';
md += '| Asset | Skin | Clips | Height | Status | Clip names |\n';
md += '|---|:--:|:--:|---:|---|---|\n';
for (const r of rows) {
  const h = r.height == null ? '—' : r.height.toFixed(2);
  const names = r.clips.length ? r.clips.slice(0, 8).join(', ') + (r.clips.length > 8 ? ' …' : '') : '—';
  md += `| ${esc(r.rel)} | ${r.hasSkin ? 'yes' : 'no'} | ${r.clips.length} | ${h} | ${esc(r.status)} | ${esc(names)} |\n`;
}
md += '\n';

fs.mkdirSync(path.dirname(OUT_DOC), { recursive: true });
fs.writeFileSync(OUT_DOC, md);
console.log(`Wrote ${path.relative(ROOT, OUT_DOC)} — ${rows.length} character GLBs (` +
  Object.entries(counts).map(([k, v]) => `${k}:${v}`).join(', ') + ').');
