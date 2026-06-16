// ───────────────────────────────────────────────────────────────────────────
//  mapConfig.js — single source of truth for the starter district layout.
//
//  Pure data (no THREE import) so it can be consumed by world.js (geometry),
//  npc.js (traffic + pedestrian routing) and state.js / main.js (spawn).
//  World convention: +x = east, +z = south, ground plane y = 0.
//
//  Layout is a BOUNDED 3×3 grid: roads only span ±extent, forming a closed
//  perimeter ring plus a Main St (z=0) / Centre Ave (x=0) cross. Buildings sit
//  either in the four inner blocks (frontage from the cross streets) or just
//  outside the perimeter (frontage from the ring road) — because the cross
//  streets stop at the perimeter, no road ever cuts through a building.
//
//  To author a new city (Phoenix, Chicago, …) copy this file, keep the same
//  shape, and the engine lays it out automatically.
// ───────────────────────────────────────────────────────────────────────────

// ── street grid ────────────────────────────────────────────────────────────
export const ROAD = {
  hz: [-30, 0, 30],      // horizontal road centre-lines (z)
  vx: [-30, 0, 30],      // vertical road centre-lines (x)
  extent: 30,            // roads span exactly -extent .. +extent (closed grid)
  width: 9,              // asphalt width
  walk: 2.6,             // sidewalk width flanking each road
  laneOffset: 2.0,       // distance from centre-line a car drives (right lane)
};

// Half-clearance from a road centre-line to the far edge of its sidewalk.
export const ROAD_CLEAR = ROAD.width / 2 + ROAD.walk; // 7.1

// Intersections where crosswalk stripes are painted.
export const CROSSWALKS = [
  [0, 0], [-30, 0], [30, 0], [0, -30], [0, 30],
];

// ── enterable landmarks (procedural buildings with working doors/interiors) ──
// faceDir points from the building toward the road it fronts.
export const LANDMARKS = [
  // Inner blocks, fronting Main Street (z = 0).
  { id: 'frostbox',    name: 'FROSTBOX',      interiorId: 'frostbox',    x: -15, z: -15, w: 11, d: 9,  h: 6, color: '#26406b', sign: '#9fe8ff', face: [0, 1] },
  { id: 'chicken',     name: 'CHICKEN SPOT',  interiorId: 'chicken',     x: 15,  z: -15, w: 12, d: 9,  h: 6, color: '#b5302a', sign: '#ffcf3f', face: [0, 1] },
  { id: 'kicks',       name: 'KICKS & FITS',  interiorId: 'kicks',       x: -15, z: 15,  w: 11, d: 9,  h: 6, color: '#2c6b4b', sign: '#b3ffd1', face: [0, -1] },
  // Auto Row — just north of the perimeter (z = -30), set back with a lot.
  { id: 'dealership',  name: 'AUTO HAUS',     interiorId: 'dealership',  x: -15, z: -44, w: 14, d: 12, h: 8, color: '#5b6470', sign: '#9fe8ff', face: [0, 1] },
  // Residential — just south of the perimeter (z = 30).
  { id: 'home',        name: "ZAYLEN'S HOME", interiorId: 'home',        x: 0,   z: 44,  w: 11, d: 10, h: 5, color: '#8a7a5a', sign: '#bfe3ff', face: [0, -1] },
  // West edge — just outside the perimeter (x = -30).
  { id: 'blocksupply', name: 'BLOCK SUPPLY',  interiorId: 'blocksupply', x: -44, z: 0,   w: 11, d: 10, h: 6, color: '#4b2c6b', sign: '#d9b3ff', face: [1, 0] },
  // East edge — Iron City Gym fronts the perimeter ring road.
  { id: 'gym',         name: 'IRON CITY GYM', interiorId: 'gym',         x: 44,  z: 0,   w: 11, d: 10, h: 7, color: '#6b2c2c', sign: '#ff9f9f', face: [-1, 0] },
  // Auto Row neighbour — City Garage next to the dealership.
  { id: 'garage',      name: 'CITY GARAGE',   interiorId: 'garage',      x: 15,  z: -44, w: 11, d: 10, h: 6, color: '#454a55', sign: '#cfd6e2', face: [0, 1] },
  // West edge, north of Block Supply — the school.
  { id: 'school',      name: 'ZAYLIN PREP',   interiorId: 'school',      x: -44, z: -24, w: 12, d: 10, h: 7, color: '#3a5a4a', sign: '#b9ffd6', face: [1, 0] },
  // East edge, south of the gym — the job/office tower.
  { id: 'office',      name: 'WORKTOWER',     interiorId: 'office',      x: 44,  z: 24,  w: 12, d: 10, h: 8, color: '#2c3a5a', sign: '#bcd8ff', face: [-1, 0] },
];

// ── non-enterable landmarks (visible, labelled, no interior / no prompt) ─────
export const FEATURES = [
];

// ── decorative skyline buildings (Kenney Retro Urban Kit GLBs) ───────────────
// Non-enterable backdrop placed well beyond the outer landmarks so they never
// collide with roads or landmarks. Colliders are added.
export const DECOR = [
  { model: 'Building_Large_2',      x: -54, z: -54, scale: 0.45, face: [1, 1] },
  { model: 'Building_Large_2',      x: 54,  z: -54, scale: 0.45, face: [-1, 1] },
  { model: 'Building_Medium_2_001', x: -54, z: 54,  scale: 0.45, face: [1, -1] },
  { model: 'Building_Medium_2_001', x: 54,  z: 54,  scale: 0.45, face: [-1, -1] },
  { model: 'Building_Small_1',      x: -56, z: -24, scale: 0.5,  face: [1, 0] },
  { model: 'Building_Small_1',      x: -56, z: 24,  scale: 0.5,  face: [1, 0] },
  { model: 'Building_Small_1',      x: 56,  z: -24, scale: 0.5,  face: [-1, 0] },
  { model: 'Building_Small_1',      x: 56,  z: 24,  scale: 0.5,  face: [-1, 0] },
];

// ── park / plaza block (SE inner block) ──────────────────────────────────────
export const PARK = {
  cx: 15, cz: 15, r: 7,
  trees: [[9, 9], [21, 9], [9, 21], [21, 21], [15, 10], [10, 15], [20, 15], [15, 20]],
  benches: [[15, 9, 0], [15, 21, Math.PI], [9, 15, Math.PI / 2], [21, 15, -Math.PI / 2]],
  lights: [[10, 10], [20, 10], [10, 20], [20, 20]],
};

// ── dealership parking lot (in front of Auto Haus) ───────────────────────────
export const PARKING = {
  cx: -15, cz: -35, w: 18, d: 5, stalls: 5,
};

// ── street furniture lining the cross streets ────────────────────────────────
// Lights sit on the SIDEWALK strip (|z|≈6.5 beside Main St, |x|≈6.5 beside
// Centre Ave) and never on a road centre-line. Anything within ROAD_CLEAR of a
// road centre-line would land in a driving lane, so these are kept at mid-block
// x/z values (±15, ±22) that are clear of the -30/0/30 road lines.
export const STREET_LIGHTS = [
  // Main Street — north & south sidewalks (z = ±6.5)
  [-22, 6.5], [-15, 6.5], [15, 6.5], [22, 6.5],
  [-22, -6.5], [-15, -6.5], [15, -6.5], [22, -6.5],
  // Centre Avenue — east & west sidewalks (x = ±6.5)
  [6.5, -22], [6.5, -15], [6.5, 15], [6.5, 22],
  [-6.5, -22], [-6.5, -15], [-6.5, 15], [-6.5, 22],
];
export const STREET_TREES = [
  [-23, -8], [-7, -8], [7, -8], [23, -8],
  [-23, 8], [-7, 8], [7, 8], [23, 8],
];

// ── traffic routes (closed waypoint loops, all on real asphalt) ──────────────
// Inner clockwise + slightly-inner counter-clockwise perimeter loops give a
// two-way feel; Main St + Centre Ave shuttles keep the cross streets busy.
const L = ROAD.laneOffset;
export const TRAFFIC_ROUTES = [
  { name: 'perimeter-cw',  loop: [[-28, -28], [28, -28], [28, 28], [-28, 28]] },
  { name: 'perimeter-ccw', loop: [[-26, 26], [26, 26], [26, -26], [-26, -26]] },
  { name: 'main-st',       loop: [[-28, L], [28, L], [28, -L], [-28, -L]] },
  { name: 'centre-ave',    loop: [[L, -28], [L, 28], [-L, 28], [-L, -28]] },
];

// ── pedestrian routes (sidewalk + park loops NPCs stroll along) ──────────────
export const PEDESTRIAN_ROUTES = [
  { name: 'main-north',  loop: [[-26, -6], [26, -6], [26, -7], [-26, -7]] },
  { name: 'main-south',  loop: [[-26, 6], [26, 6], [26, 7], [-26, 7]] },
  { name: 'park',        loop: [[9, 9], [21, 9], [21, 21], [9, 21]] },
  { name: 'residential', loop: [[-8, 23], [8, 23], [8, 24], [-8, 24]] },
];

// ── street litter (Trash & Debris GLB clusters) ──────────────────────────────
// Small, non-colliding clusters of trash scattered along gutters, sidewalk
// edges and alley corners — placed off the driving lanes so they read as grime
// without blocking the player or traffic. `n` items per cluster, spread within
// `r` metres of the anchor; `scale` multiplies the (already small) props.
export const LITTER = [
  { x: -20, z: -9,  n: 5, r: 1.4 }, { x: -10, z: -9, n: 4, r: 1.2 },
  { x: 10,  z: -9,  n: 5, r: 1.4 }, { x: 20,  z: -9, n: 4, r: 1.2 },
  { x: -20, z: 9,   n: 4, r: 1.3 }, { x: 20,  z: 9,  n: 5, r: 1.4 },
  { x: -9,  z: -20, n: 4, r: 1.2 }, { x: 9,   z: -20, n: 5, r: 1.4 },
  { x: -9,  z: 20,  n: 4, r: 1.2 }, { x: 9,   z: 20,  n: 4, r: 1.3 },
  { x: -26, z: -26, n: 6, r: 1.8, scale: 1.2 }, { x: 26, z: 26, n: 6, r: 1.8, scale: 1.2 },
  { x: 26,  z: -26, n: 5, r: 1.6 }, { x: -26, z: 26,  n: 5, r: 1.6 },
  { x: 38,  z: 5,   n: 5, r: 1.5 }, { x: -38, z: -5,  n: 5, r: 1.5 },
];

// ── collectible gems (Ultimate Gem Collection sprites) ───────────────────────
// Floating, twinkling gem pickups the player walks over for cash. Anchors sit
// on the sidewalks flanking Main St / Centre Ave and inside the park plaza —
// always off the asphalt and clear of building footprints so they read as loot
// without blocking movement. `value` overrides the default cash reward.
export const GEMS = [
  // Main Street sidewalks (z = ±6.5, just off the asphalt)
  { x: -22, z: 6.5 }, { x: -11, z: 6.5 }, { x: 11, z: 6.5 }, { x: 22, z: 6.5 },
  { x: -22, z: -6.5 }, { x: -11, z: -6.5 }, { x: 11, z: -6.5 }, { x: 22, z: -6.5 },
  // Centre Avenue sidewalks (x = ±6.5)
  { x: 6.5, z: -22 }, { x: -6.5, z: -22 }, { x: 6.5, z: 22 }, { x: -6.5, z: 22 },
  // Park plaza (SE inner block) — the centre gem is worth more
  { x: 15, z: 15, value: 150 }, { x: 11, z: 19 }, { x: 19, z: 11 },
];

// ── spawn (sidewalk corner by the central intersection, facing the park) ─────
export const SPAWN = { x: 9, z: 9, faceY: Math.PI + Math.PI / 4 };

// Reserved for future mission system (kept empty — missions are on hold).
export const MISSION_MARKERS = [];

export default {
  ROAD, ROAD_CLEAR, CROSSWALKS, LANDMARKS, FEATURES, DECOR,
  PARK, PARKING, STREET_LIGHTS, STREET_TREES,
  TRAFFIC_ROUTES, PEDESTRIAN_ROUTES, LITTER, GEMS, SPAWN, MISSION_MARKERS,
};
