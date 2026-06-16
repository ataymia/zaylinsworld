// ───────────────────────────────────────────────────────────────────────────
//  worldMapPlan.js — FORWARD-LOOKING world map data (NOT wired into gameplay).
//
//  Pure data (no THREE import). Describes the multi-town world: districts, the
//  road hierarchy, inter-town connections, landmarks, and activity zones — so
//  future work can build a connected world and an expanded map UI from a single
//  source. See docs/WORLD_MAP_DESIGN.md and docs/TOWN_ROADMAP.md.
//
//  IMPORTANT: Starter Town remains driven by src/config/mapConfig.js. This file
//  is intentionally additive and unconsumed by the engine. When a second
//  district is built, author its local grid as its own mapConfig-shaped file and
//  reference it here via `localGridRef` — never replace a town's local source of
//  truth from this plan.
//
//  World convention (matches mapConfig.js): +x = east, +z = south, y = 0 ground.
//  Town `origin` is the world-space offset of that district's local-grid centre.
// ───────────────────────────────────────────────────────────────────────────

// Road tiers — see docs/WORLD_MAP_DESIGN.md §2.
export const ROAD_TIERS = Object.freeze({
  highway: { width: 16, lanes: 4, speed: 22, pedestrians: false },
  main:    { width: 11, lanes: 2, speed: 14, pedestrians: true },
  local:   { width: 9,  lanes: 2, speed: 9,  pedestrians: true },   // Starter grid today
  bridge:  { width: 11, lanes: 2, speed: 14, pedestrians: true, rails: true },
  tunnel:  { width: 9,  lanes: 2, speed: 12, pedestrians: false, enclosed: true },
  dirt:    { width: 6,  lanes: 1, speed: 7,  pedestrians: false, rough: true },
  special: { width: 8,  lanes: 1, speed: 6,  pedestrians: true },   // strip / boardwalk / pier
});

// Map marker categories → expanded-map legend + minimap icons.
export const MARKER_CATEGORIES = Object.freeze({
  service:    { icon: '🛠️', label: 'Services' },
  store:      { icon: '🛒', label: 'Stores' },
  job:        { icon: '💼', label: 'Jobs' },
  mission:    { icon: '❗', label: 'Missions' },
  minigame:   { icon: '🎮', label: 'Activities' },
  fuel:       { icon: '⛽', label: 'Fuel' },
  fishing:    { icon: '🎣', label: 'Fishing' },
  casino:     { icon: '🎰', label: 'Casino' },
  property:   { icon: '🏠', label: 'Property' },
  collectible:{ icon: '💎', label: 'Collectibles' },
  fastTravel: { icon: '🚏', label: 'Fast Travel' },
});

// Each town/district. `themeId` → src/config/townThemes.js. `localGridRef` names
// the mapConfig-shaped module that owns its street layout (only Starter exists).
// `origin` reserves world-space so districts don't overlap when built.
export const DISTRICTS = Object.freeze([
  {
    id: 'starter-town', name: 'Starter Town', themeId: 'starter',
    origin: { x: 0, z: 0 }, localGridRef: 'mapConfig.js', playable: true,
    gateways: [
      { id: 'st-north-hwy', node: { x: 0, z: -42 }, tier: 'highway' },
      { id: 'st-east-main', node: { x: 42, z: 0 }, tier: 'main' },
    ],
    landmarks: ['block-supply', 'mini-market', 'chicken-spot', 'gas-station', 'gym', 'frostbox', 'police-station', 'home'],
    activityZones: [
      { id: 'st-refuel', category: 'fuel', shape: 'circle', x: -46, z: 24, r: 9 },
    ],
  },
  {
    id: 'fishing-harbor', name: 'Fishing Harbor', themeId: 'fishing',
    origin: { x: 0, z: -600 }, localGridRef: null, playable: false,
    gateways: [{ id: 'fh-south-hwy', node: { x: 0, z: -558 }, tier: 'highway' }],
    landmarks: ['bait-tackle', 'seafood-market', 'boat-rental', 'dockside-diner', 'harbor-master'],
    activityZones: [{ id: 'fh-pier', category: 'fishing', shape: 'rect', x: -20, z: -640, w: 60, h: 18 }],
  },
  {
    id: 'rich-hills', name: 'Rich Hills', themeId: 'rich',
    origin: { x: 700, z: 0 }, localGridRef: null, playable: false,
    gateways: [{ id: 'rh-west-main', node: { x: 658, z: 0 }, tier: 'main' }],
    landmarks: ['luxury-cars', 'real-estate', 'designer-fashion', 'country-club', 'private-clinic'],
    activityZones: [],
  },
  {
    id: 'tech-city', name: 'Tech City', themeId: 'tech',
    origin: { x: 700, z: -600 }, localGridRef: null, playable: false,
    gateways: [{ id: 'tc-tunnel', node: { x: 658, z: -600 }, tier: 'tunnel' }],
    landmarks: ['electronics', 'drone-shop', 'gadget-lab', 'co-working', 'transit-hub'],
    activityZones: [],
  },
  {
    id: 'casino-strip', name: 'Casino Strip', themeId: 'casino',
    origin: { x: 0, z: -1200 }, localGridRef: null, playable: false,
    gateways: [{ id: 'cs-bridge', node: { x: 0, z: -1158 }, tier: 'bridge' }],
    landmarks: ['casino-royale', 'arcade', 'pawn-shop', 'luxury-boutique', 'grand-hotel'],
    activityZones: [{ id: 'cs-floor', category: 'casino', shape: 'rect', x: 0, z: -1200, w: 80, h: 40 }],
  },
  {
    id: 'dungeon-outskirts', name: 'Dungeon Outskirts', themeId: 'dungeon',
    origin: { x: 1400, z: -600 }, localGridRef: null, playable: false,
    gateways: [{ id: 'do-dirt', node: { x: 1358, z: -600 }, tier: 'dirt' }],
    landmarks: ['adventurer-supply', 'blacksmith', 'potions', 'stash', 'shrine'],
    activityZones: [{ id: 'do-entrance', category: 'minigame', shape: 'circle', x: 1400, z: -640, r: 20 }],
  },
  {
    id: 'obby-canyon', name: 'Obby Canyon', themeId: 'obby',
    origin: { x: 1400, z: -1200 }, localGridRef: null, playable: false,
    gateways: [{ id: 'oc-trail', node: { x: 1400, z: -1158 }, tier: 'dirt' }],
    landmarks: ['cosmetic-shop', 'checkpoint-pass'],
    activityZones: [{ id: 'oc-course', category: 'minigame', shape: 'rect', x: 1380, z: -1240, w: 80, h: 40 }],
  },
  {
    id: 'hollywood-fame', name: 'Hollywood / Fame', themeId: 'hollywood',
    origin: { x: 0, z: -1800 }, localGridRef: null, playable: false,
    gateways: [{ id: 'hf-strip', node: { x: 0, z: -1758 }, tier: 'special' }],
    landmarks: ['wardrobe', 'talent-agency', 'music-store', 'salon', 'studio'],
    activityZones: [{ id: 'hf-stage', category: 'minigame', shape: 'rect', x: 0, z: -1800, w: 60, h: 30 }],
  },
]);

// Typed edges between district gateways → the inter-town road network.
export const CONNECTIONS = Object.freeze([
  { id: 'st-fh', from: 'st-north-hwy', to: 'fh-south-hwy', tier: 'highway', travelSec: 40, unlock: null },
  { id: 'st-rh', from: 'st-east-main', to: 'rh-west-main', tier: 'main', travelSec: 50, unlock: null },
  { id: 'rh-tc', from: 'rh-west-main', to: 'tc-tunnel', tier: 'tunnel', travelSec: 35, unlock: 'rich-hills' },
  { id: 'fh-cs', from: 'fh-south-hwy', to: 'cs-bridge', tier: 'bridge', travelSec: 45, unlock: 'fishing-harbor' },
  { id: 'tc-do', from: 'tc-tunnel', to: 'do-dirt', tier: 'dirt', travelSec: 55, unlock: 'tech-city' },
  { id: 'do-oc', from: 'do-dirt', to: 'oc-trail', tier: 'dirt', travelSec: 30, unlock: 'dungeon-outskirts' },
  { id: 'cs-hf', from: 'cs-bridge', to: 'hf-strip', tier: 'special', travelSec: 35, unlock: 'casino-strip' },
]);

// Expanded-map UI plan (evolution from the current minimap). Data-only.
export const MAP_UI = Object.freeze({
  zoomLevels: ['minimap', 'district', 'world'],
  features: ['pan', 'zoom', 'labels', 'markers', 'districtBounds', 'routeHints', 'legendFilters', 'fastTravelNodes'],
  defaultFilters: Object.keys(MARKER_CATEGORIES),
});

export default { ROAD_TIERS, MARKER_CATEGORIES, DISTRICTS, CONNECTIONS, MAP_UI };
