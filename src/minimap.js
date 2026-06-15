// ───────────────────────────────────────────────────────────────────────────
//  minimap.js — corner radar/minimap for the city.
//
//  Self-contained 2D canvas overlay that draws the street grid, every labelled
//  landmark, gas stations + the diner, live traffic blips and a heading arrow
//  for the player. Reads the static layout from mapConfig.js; dynamic markers
//  (gas/diner) and live blips are pushed in each frame by main.js. Press N to
//  toggle between the compact corner radar and an expanded town map.
// ───────────────────────────────────────────────────────────────────────────
import { ROAD, LANDMARKS } from './config/mapConfig.js';

let canvas = null, ctx = null, expanded = false;
let markers = [];            // [{ x, z, color, icon }] extra points (gas/diner)

const COMPACT = 168;         // px size of the corner radar (small so it never covers HUD)
const EXPANDED = 460;        // px size of the expanded map
const VIEW_COMPACT = 46;     // world-units radius shown when compact (player-centred)
const VIEW_EXPANDED = 70;    // world-units radius shown when expanded (origin-centred)

export function initMinimap() {
  canvas = document.getElementById('minimap');
  if (!canvas) return null;
  ctx = canvas.getContext('2d');
  resize();
  return { setMarkers, draw, toggleExpand, isExpanded: () => expanded };
}

export function setMarkers(list) { markers = list || []; }

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const css = expanded ? EXPANDED : COMPACT;
  canvas.style.width = css + 'px';
  canvas.style.height = css + 'px';
  canvas.width = css * dpr;
  canvas.height = css * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // The compact radar lives bottom-left (clear of the stats/wanted HUD on the
  // right). The expanded town map centres on screen so it never sits on top of
  // gameplay HUD while open, and fully clears the corner when shrunk again.
  if (expanded) {
    canvas.style.left = '50%';
    canvas.style.top = '50%';
    canvas.style.right = 'auto';
    canvas.style.bottom = 'auto';
    canvas.style.transform = 'translate(-50%, -50%)';
  } else {
    canvas.style.left = '14px';
    canvas.style.bottom = '46px';
    canvas.style.top = 'auto';
    canvas.style.right = 'auto';
    canvas.style.transform = 'none';
  }
}

export function toggleExpand() {
  expanded = !expanded;
  resize();
}

// Draw one frame. playerPos = {x,z}; headingRad = world heading (0 = +z/north);
// traffic = array of {x,z}; npcs = optional array of {x,z}.
export function draw(playerPos, headingRad, traffic = [], npcs = []) {
  if (!ctx) return;
  const css = expanded ? EXPANDED : COMPACT;
  const view = expanded ? VIEW_EXPANDED : VIEW_COMPACT;
  const cx = expanded ? 0 : playerPos.x;   // map centre in world coords
  const cz = expanded ? 0 : playerPos.z;
  const scale = (css / 2) / view;          // px per world-unit

  // world (x,z) → canvas (px,py).  +x = east → right, +z = south → down.
  const px = (x) => css / 2 + (x - cx) * scale;
  const py = (z) => css / 2 + (z - cz) * scale;

  ctx.clearRect(0, 0, css, css);
  // backdrop
  ctx.fillStyle = 'rgba(10,14,22,0.82)';
  roundRect(ctx, 0, 0, css, css, 12); ctx.fill();

  // clip to the rounded card so nothing spills out
  ctx.save();
  roundRect(ctx, 0, 0, css, css, 12); ctx.clip();

  // grass blocks tint
  ctx.fillStyle = 'rgba(34,52,40,0.5)';
  ctx.fillRect(0, 0, css, css);

  // roads — draw each grid line as a thick gray band spanning ±extent
  ctx.strokeStyle = '#4a5160';
  ctx.lineWidth = Math.max(3, ROAD.width * scale);
  ctx.lineCap = 'round';
  const e = ROAD.extent;
  for (const z of ROAD.hz) { line(px(-e), py(z), px(e), py(z)); }
  for (const x of ROAD.vx) { line(px(x), py(-e), px(x), py(e)); }
  // centre dashes
  ctx.strokeStyle = '#c9cf3a'; ctx.lineWidth = 1; ctx.setLineDash([4, 5]);
  for (const z of ROAD.hz) { line(px(-e), py(z), px(e), py(z)); }
  for (const x of ROAD.vx) { line(px(x), py(-e), px(x), py(e)); }
  ctx.setLineDash([]);

  // landmarks — coloured squares with first letter
  for (const lm of LANDMARKS) {
    const x = px(lm.x), y = py(lm.z);
    ctx.fillStyle = lm.color || '#888';
    const s = expanded ? 10 : 7;
    roundRect(ctx, x - s / 2, y - s / 2, s, s, 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.stroke();
    if (expanded) {
      ctx.fillStyle = '#e9eefb'; ctx.font = '9px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(lm.name, x, y + s / 2 + 1);
    }
  }

  // dynamic markers (gas station ⛽, diner 🍔, etc.)
  for (const m of markers) {
    const x = px(m.x), y = py(m.z);
    ctx.fillStyle = m.color || '#ffd54a';
    ctx.beginPath(); ctx.arc(x, y, expanded ? 5 : 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#0b0e16'; ctx.lineWidth = 1.4; ctx.stroke();
    if (m.icon) {
      ctx.font = (expanded ? 11 : 9) + 'px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(m.icon, x, y);
    }
  }

  // traffic blips
  ctx.fillStyle = '#ffce54';
  for (const c of traffic) {
    ctx.beginPath(); ctx.arc(px(c.x), py(c.z), 2, 0, Math.PI * 2); ctx.fill();
  }
  // pedestrian blips
  ctx.fillStyle = 'rgba(120,200,255,0.7)';
  for (const n of npcs) {
    ctx.beginPath(); ctx.arc(px(n.x), py(n.z), 1.5, 0, Math.PI * 2); ctx.fill();
  }

  // player heading arrow
  const x = px(playerPos.x), y = py(playerPos.z);
  ctx.save();
  ctx.translate(x, y);
  // canvas +z(down) is world south; heading 0 = +z. rotate so arrow points along heading.
  ctx.rotate(-headingRad);            // screen y already points to +z, so rotate by -heading
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#1b6fff'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 7); ctx.lineTo(-5, -5); ctx.lineTo(0, -2); ctx.lineTo(5, -5);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();

  ctx.restore();   // unclip

  // border + label
  ctx.strokeStyle = 'rgba(120,140,180,0.55)'; ctx.lineWidth = 2;
  roundRect(ctx, 1, 1, css - 2, css - 2, 12); ctx.stroke();
  ctx.fillStyle = '#9fb2d6'; ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(expanded ? 'TOWN MAP — N to shrink' : 'N: map', 8, 7);
}

function line(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function roundRect(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
