// ───────────────────────────────────────────────────────────────────────────
//  placementRules.js — logical placement constraints (Phase 2D)
//
//  Pure geometry helpers + rule tables so props/furniture are NOT random soup:
//  trash hugs dumpsters/alley corners/storefront edges, streetlights line
//  sidewalks (never a driving lane), gas pumps stay in the forecourt, etc.
//  Builders call isInRoad()/clearOfRoads() as a guardrail so nothing ever ends
//  up in an active lane, and read the *_RULES tables for category-specific
//  anchoring + spacing.
//
//  Depends only on mapConfig (pure data) — no THREE, no DOM.
// ───────────────────────────────────────────────────────────────────────────
import { ROAD, ROAD_CLEAR, LANDMARKS, PARKING, PARK } from './mapConfig.js';

// ── road awareness ──────────────────────────────────────────────────────────
// True if (x,z) lies within `margin` of ANY road centre-line band (i.e. in a
// driving lane / on the asphalt). Roads run along ROAD.hz (z lines) and ROAD.vx
// (x lines) and only span ±ROAD.extent.
export function isInRoad(x, z, margin = 0) {
  const half = ROAD.width / 2 + margin;
  const ext = ROAD.extent + half;
  for (const oz of ROAD.hz) {
    if (Math.abs(z - oz) <= half && Math.abs(x) <= ext) return true;
  }
  for (const ox of ROAD.vx) {
    if (Math.abs(x - ox) <= half && Math.abs(z) <= ext) return true;
  }
  return false;
}

// True if (x,z) is on a sidewalk strip flanking a road (off the asphalt but
// within the walk band).
export function isOnSidewalk(x, z) {
  if (isInRoad(x, z, 0)) return false;
  return isInRoad(x, z, ROAD.walk + 0.2);
}

// True if the point is clear of every road's drivable band (safe for a static
// prop / building / streetlight that a car shouldn't have to dodge in-lane).
export function clearOfRoads(x, z, margin = 0.4) {
  return !isInRoad(x, z, margin);
}

// Nudge a point off the nearest road band if it accidentally lands in a lane.
// Returns a new {x,z} guaranteed clear of roads (or the input if already clear).
export function pushOffRoad(x, z, margin = ROAD_CLEAR + 0.3) {
  if (clearOfRoads(x, z, 0.3)) return { x, z };
  let bestX = x, bestZ = z, bestD = Infinity;
  const half = ROAD.width / 2;
  for (const oz of ROAD.hz) {
    if (Math.abs(x) > ROAD.extent + half) continue;
    for (const s of [-1, 1]) {
      const nz = oz + s * margin;
      const d = Math.abs(nz - z);
      if (d < bestD) { bestD = d; bestX = x; bestZ = nz; }
    }
  }
  for (const ox of ROAD.vx) {
    if (Math.abs(z) > ROAD.extent + half) continue;
    for (const s of [-1, 1]) {
      const nx = ox + s * margin;
      const d = Math.abs(nx - x);
      if (d < bestD) { bestD = d; bestX = nx; bestZ = z; }
    }
  }
  return { x: bestX, z: bestZ };
}

// Is the point inside (or near) a building footprint? Builders use this to avoid
// dropping props on top of buildings or blocking entrances.
export function inBuildingFootprint(x, z, pad = 1.5) {
  for (const b of LANDMARKS) {
    const hw = (b.w || 8) / 2 + pad, hd = (b.d || 8) / 2 + pad;
    if (Math.abs(x - b.x) <= hw && Math.abs(z - b.z) <= hd) return true;
  }
  return false;
}

// A point is a valid GROUND-PROP spot if it's off the road, off building
// footprints, and (optionally) off the park plaza.
export function validGroundProp(x, z, { avoidPark = false } = {}) {
  if (!clearOfRoads(x, z, 0.5)) return false;
  if (inBuildingFootprint(x, z, 1.2)) return false;
  if (avoidPark && Math.hypot(x - PARK.cx, z - PARK.cz) < PARK.r + 1) return false;
  return true;
}

// ── category placement rules (anchors + spacing the town builder reads) ──────
// `anchors` are seed points props cluster around. `spacing` is the min gap
// between two props of the same kind. `offRoad` forces a road guardrail.
export const PLACEMENT_RULES = {
  trash: {
    // hug storefront edges, alley corners, and the dealership lot edge — never
    // the middle of the street, never blocking a door.
    anchors: [
      { x: -15, z: -9.5, r: 1.6 },   // Frostbox frontage gutter
      { x: 15, z: -9.5, r: 1.8 },    // Chicken Spot frontage (food = more litter)
      { x: -15, z: 9.5, r: 1.5 },    // Kicks & Fits frontage
      { x: -26, z: -22, r: 2.0 },    // NW alley corner
      { x: 26, z: 22, r: 2.0 },      // SE alley corner
      { x: PARKING.cx, z: PARKING.cz + 3.5, r: 1.6 }, // dealership lot edge
    ],
    spacing: 0.7, offRoad: true, avoidDoors: true, collisionType: 'soft',
  },
  dumpster: {
    // one solid dumpster behind a couple of the busier lots.
    anchors: [
      { x: 21, z: -18, r: 0.5 },     // behind Chicken Spot
      { x: -21, z: -18, r: 0.5 },    // behind Frostbox
    ],
    spacing: 3, offRoad: true, collisionType: 'hard',
  },
  streetlight: {
    // validated by world.js against isInRoad(); these are the sidewalk bands.
    bands: ['main-st-sidewalk', 'centre-ave-sidewalk'],
    spacing: 6, offRoad: true, collisionType: 'breakable',
  },
  gas_pump: {
    // forecourt only — accessible by car, inside the refuel trigger, off-road.
    forecourt: { cx: -15, cz: -22.5, w: 8, d: 5 },
    spacing: 3.5, offRoad: false, collisionType: 'hard',
  },
  restaurant_furniture: {
    // tables/booths aligned in a grid against the interior walls.
    layout: 'grid', spacing: 2.2, alignToWall: true, collisionType: 'blocker',
  },
  block_supply_display: {
    // weapons on the wall, melee on a rack, ammo on shelves, upgrade counter by
    // the shopkeeper — never floating, never oversized.
    wall: true, maxScale: 0.8, spacing: 0.9, collisionType: 'none',
  },
  police_parking: {
    // cop cars parked in the station lot, nose-out for theft attempts.
    spacing: 4.5, collisionType: 'vehicle',
  },
  housing: {
    // for-sale signs near the walkway/driveway, bins outside.
    signOffset: 3.5, collisionType: 'breakable',
  },
};

// Generate jittered prop points around a rule's anchors using a seeded rng,
// honoring spacing + the off-road / footprint guardrails. `rng` is a 0..1 fn.
export function anchorPoints(ruleKey, count, rng) {
  const rule = PLACEMENT_RULES[ruleKey];
  if (!rule || !rule.anchors) return [];
  const pts = [];
  let guard = 0;
  while (pts.length < count && guard < count * 30) {
    guard++;
    const a = rule.anchors[Math.floor(rng() * rule.anchors.length)];
    const ang = rng() * Math.PI * 2;
    const rad = (a.r || 1.4) * Math.sqrt(rng());
    const x = a.x + Math.cos(ang) * rad;
    const z = a.z + Math.sin(ang) * rad;
    if (rule.offRoad && !clearOfRoads(x, z, 0.5)) continue;
    if (inBuildingFootprint(x, z, 1.0)) continue;
    if (pts.some(p => Math.hypot(p.x - x, p.z - z) < (rule.spacing || 0.6))) continue;
    pts.push({ x, z });
  }
  return pts;
}

export default { isInRoad, isOnSidewalk, clearOfRoads, pushOffRoad, inBuildingFootprint, validGroundProp, PLACEMENT_RULES, anchorPoints };
