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
import { STARTER_TOWN_RUNTIME_PLAN } from './config/starterTownRuntimePlan.js';
import { ROAD_TIERS, DISTRICTS as WORLD_TOWNS, CONNECTIONS as WORLD_CONNECTIONS } from './config/worldMapPlan.js';

let canvas = null, ctx = null, expanded = false;
let markers = [];            // [{ x, z, color, icon }] extra points (gas/diner)
let landmarkLayout = LANDMARKS;
let routeLayout = [];
let districtLayout = [];
let guidance = null;          // { points:[{x,z}], destination:{x,z}, label }
let largeWorldMode = false;
let expandedView = 70;
let worldView = 12800;
let mapMode = 'city';  // city street navigation or honest all-nine-town blueprint
let cityCenter = { x: 0, z: 0 };
let worldCenter = { x: 4100, z: -7900 };
let selectDestination = null;
let selectTown = null;
let pointerDrag = null;

const COMPACT = 168;
const EXPANDED = 560;
const VIEW_COMPACT = 46;
const CITY_MIN_ZOOM = 110;
const CITY_MAX_ZOOM = 1950;
const WORLD_MIN_ZOOM = 2600;
const WORLD_MAX_ZOOM = 22000;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const mapSize = () => expanded ? Math.round(Math.min(EXPANDED, window.innerWidth - 28, window.innerHeight - 28)) : COMPACT;
function mapProjection(playerPos = { x: 0, z: 0 }) {
  const css = mapSize();
  const world = expanded && mapMode === 'world';
  const radius = !expanded ? VIEW_COMPACT : world ? worldView : expandedView;
  const center = !expanded ? playerPos : world ? worldCenter : cityCenter;
  return { css, center, radius, scale: (css / 2) / radius };
}
function mapPositionAt(clientX, clientY, playerPos) {
  const rect = canvas.getBoundingClientRect();
  const { css, center, scale } = mapProjection(playerPos);
  // CSS and backing size are kept equal in CSS pixels; use rect ratios for DPI.
  const px = (clientX - rect.left) * css / rect.width;
  const py = (clientY - rect.top) * css / rect.height;
  return { x: center.x + (px - css / 2) / scale,
    z: center.z + (py - css / 2) / scale, px, py };
}
let lastPlayerPosition = { x: 0, z: 0 };

const DISTRICT_COLORS = Object.freeze({
  'northworks-auto-row': '#645c53',
  'civic-heights': '#596985',
  'scholars-quarter': '#557762',
  'dreamdrop-district': '#79624f',
  'westside-blocks': '#684f68',
  'market-mile': '#87594d',
  'eastgate-corridor': '#756d47',
  'parkside-commons': '#477451',
  'willowbend-residential': '#657452',
});

export function minimapRoadPlan({
  largeWorld = false,
  routes = STARTER_TOWN_RUNTIME_PLAN.routes,
} = {}) {
  if (!largeWorld) {
    return Object.freeze([
      ...ROAD.hz.map((z, index) => Object.freeze({
        id: `compact-h-${index}`,
        name: '',
        tier: 'main',
        width: ROAD.width,
        points: Object.freeze([{ x: -ROAD.extent, z }, { x: ROAD.extent, z }]),
      })),
      ...ROAD.vx.map((x, index) => Object.freeze({
        id: `compact-v-${index}`,
        name: '',
        tier: 'main',
        width: ROAD.width,
        points: Object.freeze([{ x, z: -ROAD.extent }, { x, z: ROAD.extent }]),
      })),
    ]);
  }
  return Object.freeze(routes.map((route) => Object.freeze({
    id: route.id,
    name: route.name,
    tier: route.tier,
    width: Number(route.width) || Number(ROAD_TIERS[route.tier]?.width) || 9,
    points: Object.freeze(route.points.map((point) => Object.freeze({
      x: Number(point.x) || 0,
      z: Number(point.z) || 0,
    }))),
  })));
}

export function initMinimap({
  landmarks = LANDMARKS,
  largeWorld = false,
  routes = STARTER_TOWN_RUNTIME_PLAN.routes,
  districts = STARTER_TOWN_RUNTIME_PLAN.districts,
  onSelectDestination = null,
  onSelectTown = null,
} = {}) {
  landmarkLayout = landmarks;
  largeWorldMode = largeWorld;
  routeLayout = minimapRoadPlan({ largeWorld, routes });
  districtLayout = largeWorld ? districts : [];
  expandedView = largeWorld ? 1220 : 70;
  selectDestination = onSelectDestination;
  selectTown = onSelectTown;
  mapMode = 'city';
  canvas = document.getElementById('minimap');
  if (!canvas) return null;
  ctx = canvas.getContext('2d');
  // Wheel zooms around the map center; drag pans; click selects a destination.
  // Pointer input is enabled ONLY for the expanded map, keeping gameplay intact.
  canvas.addEventListener('wheel', (event) => {
    if (!expanded) return;
    event.preventDefault();
    const factor = event.deltaY > 0 ? 1.22 : 1 / 1.22;
    if (mapMode === 'world') worldView = clamp(worldView * factor, WORLD_MIN_ZOOM, WORLD_MAX_ZOOM);
    else expandedView = clamp(expandedView * factor, CITY_MIN_ZOOM, CITY_MAX_ZOOM);
  }, { passive: false });
  canvas.addEventListener('pointerdown', (event) => {
    if (!expanded) return;
    event.preventDefault();
    pointerDrag = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    canvas.setPointerCapture?.(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!expanded || !pointerDrag || event.pointerId !== pointerDrag.id) return;
    const dx = event.clientX - pointerDrag.x, dy = event.clientY - pointerDrag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) pointerDrag.moved = true;
    const { scale } = mapProjection(lastPlayerPosition);
    const center = mapMode === 'world' ? worldCenter : cityCenter;
    center.x -= dx / scale;
    center.z -= dy / scale;
    pointerDrag.x = event.clientX; pointerDrag.y = event.clientY;
  });
  canvas.addEventListener('pointerup', (event) => {
    if (!expanded || !pointerDrag || event.pointerId !== pointerDrag.id) return;
    const moved = pointerDrag.moved;
    pointerDrag = null;
    if (moved) return;
    const position = mapPositionAt(event.clientX, event.clientY, lastPlayerPosition);
    const { css } = mapProjection(lastPlayerPosition);
    // Top-right badge switches between street navigation and the nine-town view.
    if (position.py < 40 && position.px > css - 128) {
      toggleMapLevel();
      return;
    }
    if (mapMode === 'world') {
      const hit = WORLD_TOWNS.map(town => ({
        town, distance: Math.hypot(town.origin.x - position.x, town.origin.z - position.z),
      })).sort((a,b) => a.distance - b.distance)[0];
      if (hit && hit.distance < worldView * 0.075) selectTown?.(hit.town);
      return;
    }
    if (largeWorldMode && Math.abs(position.x) <= 1000 && Math.abs(position.z) <= 1000) {
      selectDestination?.({ x: position.x, z: position.z });
    }
  });
  canvas.addEventListener('pointercancel', () => { pointerDrag = null; });
  resize();
  return { setMarkers, setGuidanceRoute, draw, toggleExpand, toggleMapLevel,
    isExpanded: () => expanded, mapLevel: () => mapMode };
}

export function setMarkers(list) { markers = list || []; }

export function setGuidanceRoute(value) {
  const points = Array.isArray(value?.points)
    ? value.points.filter((entry) => Number.isFinite(Number(entry?.x)) && Number.isFinite(Number(entry?.z)))
      .map((entry) => ({ x: Number(entry.x), z: Number(entry.z) }))
    : [];
  guidance = points.length >= 2 ? {
    points,
    destination: value?.destination || points[points.length - 1],
    label: String(value?.label || ''),
  } : null;
}

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const css = mapSize();
  canvas.style.width = css + 'px';
  canvas.style.height = css + 'px';
  canvas.width = css * dpr;
  canvas.height = css * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Compact radar sits halfway down the RIGHT side so bottom-left command
  // hints, left mission tracker and bottom-right weapon HUD remain legible.
  canvas.style.pointerEvents = expanded ? 'auto' : 'none';
  if (expanded) {
    canvas.style.left = '50%';
    canvas.style.top = '50%';
    canvas.style.right = 'auto';
    canvas.style.bottom = 'auto';
    canvas.style.transform = 'translate(-50%, -50%)';
  } else {
    canvas.style.left = 'auto';
    canvas.style.bottom = 'auto';
    canvas.style.top = '50%';
    canvas.style.right = '14px';
    canvas.style.transform = 'translateY(-50%)';
  }
}

export function toggleExpand() {
  expanded = !expanded;
  if (expanded) { mapMode = 'city'; cityCenter = { x: 0, z: 0 }; }
  resize();
}
export function toggleMapLevel() {
  if (!expanded) return mapMode;
  mapMode = mapMode === 'city' ? 'world' : 'city';
  resize();
  return mapMode;
}
if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => { if (canvas) resize(); });
}

// Draw one frame. playerPos = {x,z}; headingRad = world heading (0 = +z/north);
// traffic = array of {x,z}; npcs = optional array of {x,z}.
export function draw(playerPos, headingRad, traffic = [], npcs = []) {
  if (!ctx) return;
  lastPlayerPosition = { x: playerPos.x, z: playerPos.z };
  const { css, center, scale } = mapProjection(playerPos);
  const cx = center.x;
  const cz = center.z;

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

  // District shapes make the expanded map read as one town instead of icons
  // floating in empty space.
  ctx.fillStyle = 'rgba(34,52,40,0.5)';
  ctx.fillRect(0, 0, css, css);
  if (expanded && mapMode === 'world') {
    drawWorldOverview(playerPos, css, px, py);
    ctx.restore();
    return;
  }
  if (largeWorldMode) {
    for (const district of districtLayout) {
      const points = district.polygon || [];
      if (!points.length) continue;
      ctx.beginPath();
      ctx.moveTo(px(points[0].x), py(points[0].z));
      for (let index = 1; index < points.length; index++) {
        ctx.lineTo(px(points[index].x), py(points[index].z));
      }
      ctx.closePath();
      ctx.fillStyle = `${DISTRICT_COLORS[district.id] || '#55665a'}99`;
      ctx.fill();
    }
  }

  // Authoritative road polylines. Width and tier come from the same plan that
  // builds the drivable world and routes traffic.
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const route of routeLayout) {
    if (route.points.length < 2) continue;
    ctx.strokeStyle = route.tier === 'dirt' ? '#8b6746'
      : route.tier === 'alley' ? '#55545a'
        : route.tier === 'expressway' || route.tier === 'highway' ? '#303744'
          : '#4a5160';
    ctx.lineWidth = Math.max(expanded ? 1.8 : 2.4, route.width * scale);
    ctx.setLineDash(route.tier === 'dirt' ? [5, 4] : route.tier === 'alley' ? [3, 3] : []);
    ctx.beginPath();
    ctx.moveTo(px(route.points[0].x), py(route.points[0].z));
    for (let index = 1; index < route.points.length; index++) {
      ctx.lineTo(px(route.points[index].x), py(route.points[index].z));
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Main-route center markings keep intersections and turns legible.
  for (const route of routeLayout.filter((entry) => !['alley', 'dirt'].includes(entry.tier))) {
    ctx.strokeStyle = route.tier === 'expressway' || route.tier === 'highway' ? '#e8e4d0' : '#d2bd43';
    ctx.lineWidth = expanded ? 0.8 : 1;
    ctx.setLineDash(expanded ? [3, 3] : [4, 5]);
    ctx.beginPath();
    ctx.moveTo(px(route.points[0].x), py(route.points[0].z));
    for (let index = 1; index < route.points.length; index++) {
      ctx.lineTo(px(route.points[index].x), py(route.points[index].z));
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Active quest guidance uses the exact same RoadGraph route that emergency
  // services and future delivery jobs follow. It sits above road markings and
  // below landmark icons so the player gets an honest, readable route.
  if (guidance?.points?.length > 1) {
    ctx.save();
    ctx.strokeStyle = '#4ee7ff';
    ctx.shadowColor = '#087fbb';
    ctx.shadowBlur = expanded ? 5 : 3;
    ctx.lineWidth = expanded ? 4 : 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(px(guidance.points[0].x), py(guidance.points[0].z));
    for (let index = 1; index < guidance.points.length; index++) {
      ctx.lineTo(px(guidance.points[index].x), py(guidance.points[index].z));
    }
    ctx.stroke();
    ctx.restore();

    const destination = guidance.destination || guidance.points[guidance.points.length - 1];
    const gx = px(destination.x), gy = py(destination.z);
    ctx.fillStyle = '#4ee7ff';
    ctx.strokeStyle = '#06131e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(gx, gy, expanded ? 7 : 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  if (expanded && largeWorldMode) {
    ctx.font = '8px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const route of routeLayout.filter((entry) => ['expressway', 'highway', 'parkway', 'main'].includes(entry.tier))) {
      const point = route.points[Math.floor(route.points.length / 2)];
      ctx.fillStyle = 'rgba(7,10,16,.78)';
      ctx.fillRect(px(point.x) - 30, py(point.z) - 6, 60, 12);
      ctx.fillStyle = '#e8edf8';
      ctx.fillText(route.name, px(point.x), py(point.z));
    }
  }

  // landmarks — coloured squares with first letter
  for (const lm of landmarkLayout) {
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
  ctx.fillText(expanded ? 'CITY MAP · wheel: zoom · drag: pan · click: route · N: close' : 'N: map', 8, 7);
  if (expanded) {
    ctx.fillStyle = 'rgba(36,88,110,.93)';
    roundRect(ctx, css - 124, 6, 116, 27, 7); ctx.fill();
    ctx.fillStyle = '#ecf8ff'; ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center'; ctx.fillText('WORLD MAP →', css - 66, 15);
  }
  if (expanded && guidance?.label) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#9feeff';
    ctx.fillText(`ROUTE: ${guidance.label}`, css - 8, 7);
  }
}


function drawWorldOverview(playerPos, css, px, py) {
  ctx.fillStyle = '#112337';
  ctx.fillRect(0, 0, css, css);
  const gateways = new Map();
  for (const town of WORLD_TOWNS) for (const gateway of town.gateways || []) {
    gateways.set(gateway.id, { town, node: gateway.node });
  }
  // Draw planned travel corridors as dashed lines, never as drivable roads.
  ctx.save();
  ctx.setLineDash([6, 5]);
  ctx.lineWidth = 2;
  for (const link of WORLD_CONNECTIONS) {
    const from = gateways.get(link.from), to = gateways.get(link.to);
    if (!from || !to) continue;
    ctx.strokeStyle = link.tier === 'underwater' ? '#3d91b6' : '#7e9ba3';
    ctx.beginPath();
    ctx.moveTo(px(from.node.x), py(from.node.z));
    ctx.lineTo(px(to.node.x), py(to.node.z));
    ctx.stroke();
  }
  ctx.restore();
  for (const town of WORLD_TOWNS) {
    const x = px(town.origin.x), y = py(town.origin.z);
    const w = Math.max(14, town.bounds.w * css / (worldView * 2));
    const h = Math.max(14, town.bounds.h * css / (worldView * 2));
    ctx.fillStyle = town.playable ? 'rgba(52,139,113,.7)'
      : town.id === 'aqualume' ? 'rgba(49,105,160,.35)'
        : 'rgba(82,97,122,.42)';
    ctx.strokeStyle = town.playable ? '#63efbd' : '#8a9db4';
    ctx.lineWidth = town.playable ? 2.5 : 1;
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.strokeRect(x - w / 2, y - h / 2, w, h);
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.font = 'bold 12px system-ui';
    ctx.fillStyle = town.playable ? '#bbffe2' : '#e1e7f2';
    ctx.fillText(town.name, x, y - h / 2 - 5);
    ctx.font = '10px system-ui';
    ctx.fillStyle = town.playable ? '#73f2bb' : '#f0c58c';
    ctx.textBaseline = 'top';
    ctx.fillText(town.playable ? 'PLAYABLE' : 'PLANNED · NOT BUILT', x, y + h / 2 + 4);
  }
  const x = px(playerPos.x), y = py(playerPos.z);
  ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.strokeStyle = '#2ca5ff'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = 'rgba(4,12,23,.89)';
  ctx.fillRect(0, 0, css, 37);
  ctx.font = '11px system-ui'; ctx.fillStyle = '#edf3ff';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('WORLD MAP · wheel: zoom · drag: pan · click town: status', 9, 12);
  ctx.fillStyle = 'rgba(36,88,110,.96)';
  roundRect(ctx, css - 124, 6, 116, 27, 7); ctx.fill();
  ctx.fillStyle = '#f4fdff'; ctx.font = 'bold 11px system-ui';
  ctx.textAlign = 'center'; ctx.fillText('← CITY MAP', css - 66, 15);
  ctx.fillStyle = '#b1c2dd'; ctx.font = '10px system-ui';
  ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
  ctx.fillText('Dashed connections are planned routes, not playable highways.', 9, css - 12);
}

function line(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function roundRect(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
