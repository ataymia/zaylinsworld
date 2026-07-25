// ─────────────────────────────────────────────────────────────────────────────
// starterTownRuntimePlan.js — authoritative executable Starter Town contract.
//
// Pure data. Geometry/rendering systems consume this contract without owning the
// design decisions. Stable location IDs survive parcel shifts and asset swaps.
// World convention: +x east, +z south, y surface elevation.
// ─────────────────────────────────────────────────────────────────────────────

const freeze = (value) => Object.freeze(value);
const point = (x, z, y = 0) => freeze({ x, y, z });
const rectangle = (minX, minZ, maxX, maxZ) => freeze([
  point(minX, minZ), point(maxX, minZ), point(maxX, maxZ), point(minX, maxZ),
]);
const route = (id, name, tier, points, extra = {}) => freeze({
  id, name, tier, points: freeze(points.map(([x, z, y = 0]) => point(x, z, y))), ...extra,
});
const location = (id, name, districtId, x, z, extra = {}) => freeze({
  id,
  name,
  townId: 'starter-town',
  districtId,
  position: point(x, z),
  assetRef: freeze({
    preferred: extra.preferredAsset || `starter-town-${id}`,
    fallback: extra.fallbackAsset || 'procedural-location-shell',
  }),
  ...extra,
  frontageFace: extra.frontageFace ? freeze([...extra.frontageFace]) : null,
});

export const STARTER_TOWN_FEATURE_FLAGS = freeze({
  starterTownLargeWorld: freeze({
    defaultValue: false,
    queryParam: 'starterTownLargeWorld',
    storageKey: 'zaylinsworld.feature.starterTownLargeWorld',
    description: 'Render the authoritative large-world Starter Town instead of the compact compatibility map.',
  }),
});

export const STARTER_TOWN_DISTRICTS = freeze([
  freeze({
    id: 'northworks-auto-row', name: 'Northworks / Auto Row',
    polygon: rectangle(-1000, -1000, 220, -360),
    identity: 'industrial, garages, auto sales, broad roads and service yards',
  }),
  freeze({
    id: 'civic-heights', name: 'Civic Heights',
    polygon: rectangle(220, -1000, 1000, 220),
    identity: 'hillside civic buildings, public safety, offices and formal landscaping',
  }),
  freeze({
    id: 'scholars-quarter', name: "Scholar's Quarter",
    polygon: rectangle(-1000, -360, -360, 220),
    identity: 'school campus, youth services, study spaces and calm neighborhood streets',
  }),
  freeze({
    id: 'dreamdrop-district', name: 'Dreamdrop District',
    polygon: rectangle(-360, -360, 360, 220),
    identity: 'historic mixed-use core, tutorial services and the busiest pedestrian blocks',
  }),
  freeze({
    id: 'westside-blocks', name: 'Westside Blocks',
    polygon: rectangle(-1000, 220, -360, 1000),
    identity: 'dense working neighborhood, supplies, local courts, alleys and community spaces',
  }),
  freeze({
    id: 'market-mile', name: 'Market Mile',
    polygon: rectangle(-360, 220, 220, 620),
    identity: 'shopping, fashion, food, storefront parking and delivery lanes',
  }),
  freeze({
    id: 'eastgate-corridor', name: 'Eastgate Corridor',
    polygon: rectangle(360, 220, 1000, 420),
    identity: 'fuel, travel services, parkway frontage and the Rich Hills gateway',
  }),
  freeze({
    id: 'parkside-commons', name: 'Parkside Commons',
    polygon: rectangle(220, 420, 1000, 1000),
    identity: 'park, gym, recreation, trails, roundabout and lower-density streets',
  }),
  freeze({
    id: 'willowbend-residential', name: 'Willowbend Residential',
    polygon: rectangle(-360, 620, 220, 1000),
    identity: 'starter home, neighborhood services, cul-de-sacs and family housing',
  }),
]);

export const STARTER_TOWN_ROUTES = freeze([
  route('dreamdrop-beltway', 'Dreamdrop Beltway', 'expressway', [
    [-860, -860], [860, -860], [860, 860], [-860, 860], [-860, -860],
  ], { closed: true, lanes: 4 }),
  route('dreamdrop-boulevard', 'Dreamdrop Boulevard', 'main', [
    [-900, -120], [-500, -120], [0, -120], [300, -120], [500, -120], [900, -120],
  ]),
  route('centre-avenue', 'Centre Avenue', 'main', [
    [0, -900], [0, -700], [0, -500], [0, -120], [0, 0], [0, 40], [0, 500], [0, 700], [0, 900],
  ]),
  route('northworks-expressway', 'Northworks Expressway', 'expressway', [
    [-900, -700], [-450, -700], [0, -700], [500, -700], [900, -700],
  ], { lanes: 4 }),
  route('fishing-highway-gateway', 'Fishing Highway', 'highway', [
    [0, -860], [0, -1000], [0, -1200],
  ], { gatewayId: 'st-north-hwy' }),
  route('eastgate-parkway', 'Eastgate Parkway', 'parkway', [
    [0, 40], [360, 40], [650, 20], [860, 0], [1000, 0], [1200, 0],
  ], { gatewayId: 'st-east-parkway' }),
  route('civic-rise', 'Civic Rise', 'main', [
    [300, -120, 0], [360, -220, 4], [430, -320, 10], [560, -300, 18], [720, -180, 26],
  ], { graded: true }),
  route('scholar-road', 'Scholar Road', 'main', [
    [-720, -340], [-720, -120], [-720, 0], [-720, 240],
  ]),
  route('school-loop', 'School Loop', 'local', [
    [-810, 0], [-720, 0], [-640, 0], [-620, 150], [-800, 150], [-810, 0],
  ], { closed: true, schoolZone: true }),
  route('parkside-crescent', 'Parkside Crescent', 'local', [
    [0, 500], [250, 500], [340, 430], [470, 410], [590, 470], [650, 580], [610, 710], [500, 780],
  ], { roundaboutAt: point(420, 568) }),
  route('willowbend-main', 'Willowbend Drive', 'local', [
    [-300, 700], [0, 700], [180, 760], [180, 930],
  ]),
  route('willowbend-court-a', 'Willowbend Court', 'local', [
    [-180, 700], [-180, 880], [-235, 925],
  ], { culDeSac: true }),
  route('willowbend-court-b', 'Dreamleaf Court', 'local', [
    [60, 720], [60, 900], [115, 945],
  ], { culDeSac: true }),
  route('market-service-road', 'Market Service Road', 'service', [
    [-420, 360], [-330, 500], [-80, 500], [0, 500], [200, 500],
  ]),
  route('civic-service-road', 'Civic Service Road', 'service', [
    [430, -320], [650, -420], [790, -350],
  ]),
  route('westside-alley', 'Westside Back Lane', 'alley', [
    [-900, 360], [-650, 360], [-420, 360],
  ]),
  route('dreamdrop-alley', 'Dreamdrop Back Lane', 'alley', [
    [-300, 80], [0, 80], [300, 80],
  ]),
]);

export const STARTER_TOWN_LOCATIONS = freeze([
  location('frostbox', 'Frostbox', 'dreamdrop-district', -168, -88, {
    interiorId: 'frostbox', category: 'store',
    frontageFace: [0, -1],
    preferredAsset: 'library:buildings:zta-free-asset-factory:building-starter-frostbox-exterior-v02',
  }),
  location('chicken-spot', 'Chicken Spot', 'dreamdrop-district', 192, -152, {
    interiorId: 'chicken', category: 'store',
    frontageFace: [0, 1],
    preferredAsset: 'library:buildings:zta-free-asset-factory:building-starter-chicken-spot-exterior-v02',
  }),
  location('kicks-fits', 'Kicks & Fits', 'market-mile', -72, 352, {
    interiorId: 'kicks', category: 'store',
    frontageFace: [1, 0],
    preferredAsset: 'library:buildings:zta-free-asset-factory:building-starter-kicks-fits-exterior-v02',
  }),
  location('block-supply', 'Block Supply', 'westside-blocks', -568, 280, {
    interiorId: 'blocksupply', category: 'store',
    frontageFace: [0, 1],
    preferredAsset: 'library:buildings:zta-free-asset-factory:building-starter-block-supply-exterior-v02',
  }),
  location('auto-haus', 'Auto Haus', 'northworks-auto-row', -448, -660, {
    interiorId: 'dealership', category: 'vehicle',
    frontageFace: [0, -1],
    preferredAsset: 'library:buildings:zta-free-asset-factory:building-starter-auto-haus-exterior-v02',
  }),
  location('city-garage', 'City Garage', 'northworks-auto-row', -112, -616, {
    interiorId: 'garage', category: 'service',
    frontageFace: [0, -1],
    preferredAsset: 'library:buildings:zta-free-asset-factory:building-starter-city-garage-exterior-v02',
  }),
  location('zaylins-prep', 'Zaylins Prep', 'scholars-quarter', -780, 72, {
    interiorId: 'school', category: 'school',
    frontageFace: [1, 0],
    preferredAsset: 'library:buildings:zta-free-asset-factory:building-starter-zaylins-prep-exterior-v02',
  }),
  location('police-station', 'Dreamdrop Public Safety', 'civic-heights', 632, -312, {
    interiorId: 'police', category: 'law',
    frontageFace: [-1, 0],
    preferredAsset: 'library:buildings:zta-free-asset-factory:building-starter-police-station-exterior-v02',
  }),
  location('worktower', 'WorkTower', 'civic-heights', 664, -20, {
    interiorId: 'office', category: 'job',
    frontageFace: [0, 1],
    preferredAsset: 'library:buildings:zta-free-asset-factory:building-starter-worktower-exterior-v02',
  }),
  location('iron-city-gym', 'Iron City Gym', 'parkside-commons', 448, 448, {
    interiorId: 'gym', category: 'service',
    frontageFace: [0, -1],
    preferredAsset: 'library:buildings:zta-free-asset-factory:building-starter-iron-city-gym-exterior-v02',
  }),
  location('6twelve', '6twelve', 'eastgate-corridor', 832, 232, {
    interiorId: 'gas', category: 'fuel',
    frontageFace: [1, 0],
    preferredAsset: 'library:buildings:zta-free-asset-factory:building-starter-6twelve-exterior-v02',
  }),
  location('zaylins-home', "Zaylins Home", 'willowbend-residential', 48, 828, {
    interiorId: 'home', category: 'property', spawnId: 'starter-home',
    frontageFace: [1, 0],
    preferredAsset: 'library:buildings:zta-free-asset-factory:building-starter-zaylins-home-exterior-v02',
  }),
  location('dreamdrop-park', 'Dreamdrop Park', 'parkside-commons', 420, 568, { category: 'activity', enterable: false }),
]);

export const STARTER_TOWN_SPAWNS = freeze([
  freeze({ id: 'starter-home', townId: 'starter-town', districtId: 'willowbend-residential', position: point(48, 802), facing: Math.PI }),
  freeze({ id: 'dreamdrop-core', townId: 'starter-town', districtId: 'dreamdrop-district', position: point(0, 0), facing: 0 }),
  freeze({ id: 'north-gateway', townId: 'starter-town', districtId: 'northworks-auto-row', position: point(0, -920), facing: 0 }),
  freeze({ id: 'east-gateway', townId: 'starter-town', districtId: 'eastgate-corridor', position: point(920, 0), facing: Math.PI / 2 }),
  freeze({ id: 'safe-recovery', townId: 'starter-town', districtId: 'dreamdrop-district', position: point(0, 120), facing: 0 }),
]);

export const STARTER_TOWN_RUNTIME_PLAN = freeze({
  id: 'starter-town',
  version: 2,
  origin: point(0, 0),
  playableBounds: freeze({ minX: -1000, maxX: 1000, minZ: -1000, maxZ: 1000 }),
  terrainBounds: freeze({ minX: -1200, maxX: 1200, minZ: -1200, maxZ: 1200 }),
  streamingCellSize: 250,
  districts: STARTER_TOWN_DISTRICTS,
  routes: STARTER_TOWN_ROUTES,
  locations: STARTER_TOWN_LOCATIONS,
  spawns: STARTER_TOWN_SPAWNS,
  featureFlags: STARTER_TOWN_FEATURE_FLAGS,
});

export default STARTER_TOWN_RUNTIME_PLAN;
