// ───────────────────────────────────────────────────────────────────────────
//  worldMapPlan.js — FORWARD-LOOKING world map data (NOT wired into gameplay).
//
//  Pure data (no THREE import). Describes the multi-town world: town bounds,
//  districts, road/water hierarchy, inter-town connections, landmarks, activity
//  zones, travel targets, and streaming cells. See docs/WORLD_MAP_DESIGN.md,
//  docs/LARGE_WORLD_SCALE_BLUEPRINT.md, and docs/TOWN_ROADMAP.md.
//
//  IMPORTANT: Starter Town remains driven by src/config/mapConfig.js today.
//  This file is additive and unconsumed by the current engine. Its coordinates
//  reserve the authoritative large-world layout for future implementation.
//
//  World convention: +x = east, +z = south, y = 0 surface ground.
// ───────────────────────────────────────────────────────────────────────────

export const ROAD_TIERS = Object.freeze({
  expressway: { width: 20, lanes: 4, speed: 30, pedestrians: false },
  highway:    { width: 16, lanes: 4, speed: 24, pedestrians: false },
  parkway:    { width: 14, lanes: 2, speed: 18, pedestrians: false },
  main:       { width: 11, lanes: 2, speed: 14, pedestrians: true },
  local:      { width: 9,  lanes: 2, speed: 9,  pedestrians: true },
  service:    { width: 6,  lanes: 1, speed: 6,  pedestrians: true },
  alley:      { width: 5,  lanes: 1, speed: 4,  pedestrians: true },
  bridge:     { width: 12, lanes: 2, speed: 16, pedestrians: true, rails: true },
  tunnel:     { width: 11, lanes: 2, speed: 15, pedestrians: false, enclosed: true },
  dirt:       { width: 7,  lanes: 1, speed: 8,  pedestrians: false, rough: true },
  special:    { width: 9,  lanes: 1, speed: 7,  pedestrians: true },
  water:      { width: 80, lanes: 2, speed: 18, boats: true },
  underwater: { width: 50, lanes: 2, speed: 14, submarines: true },
});

export const MARKER_CATEGORIES = Object.freeze({
  service:     { icon: '🛠️', label: 'Services' },
  store:       { icon: '🛒', label: 'Stores' },
  job:         { icon: '💼', label: 'Jobs' },
  career:      { icon: '🪪', label: 'Careers' },
  law:         { icon: '🚓', label: 'Law & Safety' },
  school:      { icon: '🎓', label: 'Schools' },
  mission:     { icon: '❗', label: 'Missions' },
  minigame:    { icon: '🎮', label: 'Activities' },
  fuel:        { icon: '⛽', label: 'Fuel' },
  fishing:     { icon: '🎣', label: 'Fishing' },
  casino:      { icon: '🎰', label: 'Casino' },
  property:    { icon: '🏠', label: 'Property' },
  collectible: { icon: '💎', label: 'Collectibles' },
  fastTravel:  { icon: '🚏', label: 'Fast Travel' },
  water:       { icon: '🌊', label: 'Water Routes' },
});

const town = (def) => Object.freeze(def);

export const DISTRICTS = Object.freeze([
  town({
    id: 'starter-town', name: 'Starter Town', themeId: 'starter',
    origin: { x: 0, z: 0 }, bounds: { w: 2000, h: 2000 }, terrain: { w: 2400, h: 2400 },
    localGridRef: 'mapConfig.js', playable: true, streamingCell: 250,
    gateways: [
      { id: 'st-north-hwy', node: { x: 0, z: -1000 }, tier: 'highway' },
      { id: 'st-east-parkway', node: { x: 1000, z: 0 }, tier: 'parkway' },
    ],
    landmarks: ['block-supply', 'mini-market', 'chicken-spot', 'gas-station', 'gym', 'frostbox', 'police-station', 'home', 'school', 'worktower', 'auto-haus', 'city-garage'],
    activityZones: [
      { id: 'st-dreamdrop-core', category: 'service', shape: 'rect', x: 0, z: 0, w: 600, h: 580 },
      { id: 'st-police-career', category: 'career', shape: 'circle', x: 632, z: -312, r: 35 },
      { id: 'st-refuel', category: 'fuel', shape: 'circle', x: 832, z: 232, r: 22 },
    ],
  }),
  town({
    id: 'fishing-harbor', name: 'Fishing Harbor', themeId: 'fishing',
    origin: { x: 0, z: -5200 }, bounds: { w: 2400, h: 2200 }, terrain: { w: 2800, h: 3000 },
    localGridRef: null, playable: false, streamingCell: 250,
    gateways: [
      { id: 'fh-south-hwy', node: { x: 0, z: -4100 }, tier: 'highway' },
      { id: 'fh-north-coast', node: { x: 0, z: -6300 }, tier: 'bridge' },
      { id: 'fh-aqualume-water', node: { x: 850, z: -5900 }, tier: 'water' },
    ],
    landmarks: ['bait-tackle', 'seafood-market', 'boat-rental', 'dockside-diner', 'harbor-master', 'harbor-patrol', 'harbor-academy', 'tidefuel'],
    activityZones: [
      { id: 'fh-pier', category: 'fishing', shape: 'rect', x: -250, z: -5600, w: 500, h: 180 },
      { id: 'fh-gillyfish-route', category: 'mission', shape: 'rect', x: 650, z: -6100, w: 700, h: 500 },
    ],
  }),
  town({
    id: 'rich-hills', name: 'Rich Hills', themeId: 'rich',
    origin: { x: 5200, z: 0 }, bounds: { w: 2400, h: 2400 }, terrain: { w: 3000, h: 3000 },
    localGridRef: null, playable: false, streamingCell: 250,
    gateways: [
      { id: 'rh-west-parkway', node: { x: 4000, z: 0 }, tier: 'parkway' },
      { id: 'rh-north-tunnel', node: { x: 5200, z: -1200 }, tier: 'tunnel' },
      { id: 'rh-aqualume-water', node: { x: 4200, z: -900 }, tier: 'water' },
    ],
    landmarks: ['luxury-cars', 'real-estate', 'designer-fashion', 'country-club', 'private-clinic', 'police-station', 'legacy-academy', 'marina', 'crestfuel'],
    activityZones: [{ id: 'rh-marina', category: 'water', shape: 'rect', x: 4300, z: -700, w: 700, h: 600 }],
  }),
  town({
    id: 'tech-city', name: 'TechTown', themeId: 'tech',
    origin: { x: 5200, z: -5200 }, bounds: { w: 2400, h: 2400 }, terrain: { w: 2800, h: 2800 },
    localGridRef: null, playable: false, streamingCell: 250,
    gateways: [
      { id: 'tc-south-tunnel', node: { x: 5200, z: -4000 }, tier: 'tunnel' },
      { id: 'tc-east-utility', node: { x: 6400, z: -5200 }, tier: 'dirt' },
    ],
    landmarks: ['electronics', 'drone-shop', 'gadget-lab', 'co-working', 'transit-hub', 'metro-security', 'voltbyte-academy', 'voltfuel'],
    activityZones: [],
  }),
  town({
    id: 'casino-strip', name: 'Casino Strip', themeId: 'casino',
    origin: { x: 0, z: -10400 }, bounds: { w: 2200, h: 2600 }, terrain: { w: 2800, h: 3200 },
    localGridRef: null, playable: false, streamingCell: 250,
    gateways: [
      { id: 'cs-south-bridge', node: { x: 0, z: -9100 }, tier: 'bridge' },
      { id: 'cs-north-strip', node: { x: 0, z: -11700 }, tier: 'special' },
    ],
    landmarks: ['casino-royale', 'arcade', 'grand-hotel', 'strip-police', 'brighthouse-institute', 'luckyline-fuel'],
    activityZones: [{ id: 'cs-floor', category: 'casino', shape: 'rect', x: 0, z: -10400, w: 900, h: 700 }],
  }),
  town({
    id: 'dungeon-outskirts', name: 'Dungeon Outskirts', themeId: 'dungeon',
    origin: { x: 10400, z: -5200 }, bounds: { w: 2000, h: 2000 }, terrain: { w: 2600, h: 2600 },
    localGridRef: null, playable: false, streamingCell: 250,
    gateways: [
      { id: 'do-west-dirt', node: { x: 9400, z: -5200 }, tier: 'dirt' },
      { id: 'do-south-trail', node: { x: 10400, z: -6200 }, tier: 'dirt' },
    ],
    landmarks: ['adventurer-academy', 'blacksmith', 'potions', 'stash', 'shrine', 'warden-station', 'wayfarer-fuel', 'dungeon-gate'],
    activityZones: [{ id: 'do-entrance', category: 'minigame', shape: 'circle', x: 10400, z: -5600, r: 120 }],
  }),
  town({
    id: 'obby-canyon', name: 'Obby Canyon', themeId: 'obby',
    origin: { x: 10400, z: -10400 }, bounds: { w: 2400, h: 2400 }, terrain: { w: 3000, h: 3000 },
    localGridRef: null, playable: false, streamingCell: 250,
    gateways: [{ id: 'oc-north-trail', node: { x: 10400, z: -9200 }, tier: 'dirt' }],
    landmarks: ['momentum-academy', 'ranger-station', 'checkpoint-fuel', 'course-select', 'residential-camp'],
    activityZones: [{ id: 'oc-course', category: 'minigame', shape: 'rect', x: 10400, z: -10800, w: 1600, h: 1200 }],
  }),
  town({
    id: 'starline-city', name: 'Starline City', themeId: 'hollywood',
    origin: { x: 0, z: -15600 }, bounds: { w: 2600, h: 2600 }, terrain: { w: 3200, h: 3200 },
    localGridRef: null, playable: false, streamingCell: 250,
    gateways: [{ id: 'sl-south-strip', node: { x: 0, z: -14300 }, tier: 'special' }],
    landmarks: ['starline-studios', 'talent-agency', 'music-hall', 'salon', 'premiere-academy', 'starline-police', 'starstop-fuel'],
    activityZones: [{ id: 'sl-stage', category: 'minigame', shape: 'rect', x: 0, z: -15600, w: 1000, h: 800 }],
  }),
  town({
    id: 'aqualume', name: 'Aqualume', themeId: 'aqualume',
    origin: { x: 3000, z: -7800 }, bounds: { w: 3000, h: 3000 }, terrain: { w: 3600, h: 3600, layer: 'underwater' },
    localGridRef: null, playable: false, streamingCell: 250,
    gateways: [
      { id: 'aq-fishing-trench', node: { x: 2100, z: -7000 }, tier: 'underwater' },
      { id: 'aq-rich-subroute', node: { x: 3900, z: -7000 }, tier: 'underwater' },
    ],
    landmarks: ['moonpool-gateway', 'tideglass-academy', 'current-guard', 'coral-market', 'bluecore-transit', 'reefside-housing'],
    activityZones: [{ id: 'aq-city', category: 'water', shape: 'rect', x: 3000, z: -7800, w: 2200, h: 2200 }],
  }),
]);

export const CONNECTIONS = Object.freeze([
  { id: 'st-fh', from: 'st-north-hwy', to: 'fh-south-hwy', tier: 'highway', travelSec: 240, unlock: null },
  { id: 'st-rh', from: 'st-east-parkway', to: 'rh-west-parkway', tier: 'parkway', travelSec: 240, unlock: null },
  { id: 'rh-tc', from: 'rh-north-tunnel', to: 'tc-south-tunnel', tier: 'tunnel', travelSec: 190, unlock: 'rich-hills' },
  { id: 'fh-cs', from: 'fh-north-coast', to: 'cs-south-bridge', tier: 'bridge', travelSec: 240, unlock: 'fishing-harbor' },
  { id: 'tc-do', from: 'tc-east-utility', to: 'do-west-dirt', tier: 'dirt', travelSec: 250, unlock: 'tech-city' },
  { id: 'do-oc', from: 'do-south-trail', to: 'oc-north-trail', tier: 'dirt', travelSec: 190, unlock: 'dungeon-outskirts' },
  { id: 'cs-sl', from: 'cs-north-strip', to: 'sl-south-strip', tier: 'special', travelSec: 240, unlock: 'casino-strip' },
  { id: 'fh-aq', from: 'fh-aqualume-water', to: 'aq-fishing-trench', tier: 'underwater', travelSec: 300, unlock: 'gillyfish-gills' },
  { id: 'rh-aq', from: 'rh-aqualume-water', to: 'aq-rich-subroute', tier: 'underwater', travelSec: 270, unlock: 'aqualume-discovered' },
]);

export const STREAMING_PLAN = Object.freeze({
  defaultCellSize: 250,
  activeRadiusCells: 1,
  warmRadiusCells: 2,
  farMode: 'terrain-skyline-roads-only',
  unloadInteriorsOutsideActiveTown: true,
});

export const MAP_UI = Object.freeze({
  zoomLevels: ['minimap', 'district', 'city', 'world'],
  features: ['pan', 'zoom', 'labels', 'markers', 'districtBounds', 'townBounds', 'routeHints', 'legendFilters', 'fastTravelNodes', 'waterRoutes', 'streamingCellsDebug'],
  defaultFilters: Object.keys(MARKER_CATEGORIES),
});

export default { ROAD_TIERS, MARKER_CATEGORIES, DISTRICTS, CONNECTIONS, STREAMING_PLAN, MAP_UI };