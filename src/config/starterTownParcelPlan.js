// ─────────────────────────────────────────────────────────────────────────────
// starterTownParcelPlan.js — stable Phase 5G parcel IDs and no-build contracts.
//
// Parcels are gameplay locations, filler massing, parking, parks, purposeful empty
// lots, and future-update reserves. Asset swaps never change these IDs.
// ─────────────────────────────────────────────────────────────────────────────

const freeze = (value) => Object.freeze(value);
const rect = (x, z, w, d) => freeze({ x, z, w, d });
const parcel = (id, districtId, type, x, z, w, d, extra = {}) => freeze({
  id, townId: 'starter-town', districtId, type, bounds: rect(x, z, w, d), ...extra,
});

export const STARTER_TOWN_NO_BUILD_BUFFERS = freeze([
  freeze({ id: 'north-gateway-buffer', type: 'gateway', bounds: rect(0, -1080, 260, 240) }),
  freeze({ id: 'east-gateway-buffer', type: 'gateway', bounds: rect(1080, 0, 240, 260) }),
  freeze({ id: 'beltway-inner-clearance', type: 'road-loop', routeId: 'dreamdrop-beltway', clearance: 22 }),
  freeze({ id: 'northworks-expressway-clearance', type: 'road', routeId: 'northworks-expressway', clearance: 26 }),
  freeze({ id: 'school-loop-safety', type: 'school-zone', routeId: 'school-loop', clearance: 18 }),
  freeze({ id: 'parkside-roundabout-clearance', type: 'roundabout', center: freeze({ x: 420, z: 568 }), radius: 56 }),
]);

export const STARTER_TOWN_FUNCTIONAL_PARCELS = freeze([
  parcel('parcel-frostbox', 'dreamdrop-district', 'commercial', -168, -88, 42, 34, { locationId: 'frostbox', frontageRoute: 'dreamdrop-boulevard', parking: 4, serviceAccess: 'dreamdrop-alley' }),
  parcel('parcel-chicken-spot', 'dreamdrop-district', 'commercial', 192, -152, 46, 38, { locationId: 'chicken-spot', frontageRoute: 'dreamdrop-boulevard', parking: 5, serviceAccess: 'dreamdrop-alley' }),
  parcel('parcel-kicks-fits', 'market-mile', 'commercial', -72, 352, 50, 40, { locationId: 'kicks-fits', frontageRoute: 'centre-avenue', parking: 8, serviceAccess: 'market-service-road' }),
  parcel('parcel-block-supply', 'westside-blocks', 'commercial', -568, 280, 72, 56, { locationId: 'block-supply', frontageRoute: 'westside-alley', parking: 10, loadingBays: 2 }),
  parcel('parcel-auto-haus', 'northworks-auto-row', 'vehicle', -448, -660, 150, 110, { locationId: 'auto-haus', frontageRoute: 'northworks-expressway', parking: 30, loadingBays: 2, testDriveAccess: true }),
  parcel('parcel-city-garage', 'northworks-auto-row', 'service', -112, -616, 110, 86, { locationId: 'city-garage', frontageRoute: 'northworks-expressway', parking: 12, loadingBays: 4, towAccess: true }),
  parcel('parcel-zaylins-prep', 'scholars-quarter', 'school-campus', -724, 72, 250, 190, { locationId: 'zaylins-prep', frontageRoute: 'school-loop', parking: 36, dropOffBays: 10, fields: 2 }),
  parcel('parcel-police-station', 'civic-heights', 'civic', 632, -312, 150, 120, { locationId: 'police-station', frontageRoute: 'civic-rise', parking: 24, secureParking: 12, serviceAccess: 'civic-service-road' }),
  parcel('parcel-worktower', 'civic-heights', 'office', 664, -20, 120, 100, { locationId: 'worktower', frontageRoute: 'eastgate-parkway', parking: 24, serviceAccess: 'civic-service-road' }),
  parcel('parcel-iron-city-gym', 'parkside-commons', 'recreation', 448, 448, 110, 86, { locationId: 'iron-city-gym', frontageRoute: 'parkside-crescent', parking: 20, trailAccess: true }),
  parcel('parcel-6twelve', 'eastgate-corridor', 'fuel', 832, 232, 150, 110, { locationId: '6twelve', frontageRoute: 'eastgate-parkway', parking: 12, fuelPumps: 8, chargingPads: 4, loadingBays: 1 }),
  parcel('parcel-zaylins-home', 'willowbend-residential', 'residential', 48, 828, 42, 48, { locationId: 'zaylins-home', frontageRoute: 'willowbend-main', parking: 2, mailbox: true, upgradeable: true }),
  parcel('parcel-dreamdrop-park', 'parkside-commons', 'park', 420, 568, 250, 210, { locationId: 'dreamdrop-park', frontageRoute: 'parkside-crescent', parking: 18, pedestrianPriority: true }),
]);

export const STARTER_TOWN_FILLER_PARCELS = freeze([
  // Dreamdrop mixed-use blocks
  parcel('dd-block-nw-01', 'dreamdrop-district', 'mixed-use', -270, -250, 130, 90, { floors: [3, 7], storefronts: true }),
  parcel('dd-block-n-02', 'dreamdrop-district', 'mixed-use', -40, -250, 150, 92, { floors: [4, 8], storefronts: true }),
  parcel('dd-block-ne-03', 'dreamdrop-district', 'mixed-use', 250, -255, 120, 88, { floors: [2, 6], storefronts: true }),
  parcel('dd-block-w-04', 'dreamdrop-district', 'mixed-use', -280, 5, 120, 120, { floors: [3, 6], courtyard: true }),
  parcel('dd-block-e-05', 'dreamdrop-district', 'mixed-use', 285, 20, 112, 118, { floors: [3, 7], courtyard: true }),

  // Market Mile retail rows and parking
  parcel('mm-retail-west-01', 'market-mile', 'commercial-row', -275, 315, 120, 70, { floors: [1, 4], storefronts: true }),
  parcel('mm-retail-center-02', 'market-mile', 'commercial-row', 60, 315, 150, 70, { floors: [1, 5], storefronts: true }),
  parcel('mm-retail-east-03', 'market-mile', 'commercial-row', 175, 435, 80, 90, { floors: [1, 4], storefronts: true }),
  parcel('mm-parking-west', 'market-mile', 'parking', -255, 520, 150, 70, { stalls: 34 }),
  parcel('mm-parking-east', 'market-mile', 'parking', 95, 525, 160, 70, { stalls: 38 }),

  // Northworks industrial and vehicle service massing
  parcel('nw-yard-west-01', 'northworks-auto-row', 'industrial', -760, -650, 220, 140, { floors: [1, 3], loadingBays: 6 }),
  parcel('nw-yard-central-02', 'northworks-auto-row', 'industrial', -260, -470, 170, 110, { floors: [1, 4], loadingBays: 4 }),
  parcel('nw-yard-east-03', 'northworks-auto-row', 'industrial', 120, -560, 150, 120, { floors: [1, 4], loadingBays: 4 }),
  parcel('nw-truck-lot', 'northworks-auto-row', 'parking', -700, -420, 230, 100, { stalls: 24, heavyVehicle: true }),

  // Scholar's Quarter campus support and housing
  parcel('sq-library-01', 'scholars-quarter', 'civic', -480, -80, 100, 80, { floors: [2, 5], educationSupport: true }),
  parcel('sq-housing-north-02', 'scholars-quarter', 'residential-block', -520, -250, 180, 90, { floors: [2, 4] }),
  parcel('sq-field-support-03', 'scholars-quarter', 'recreation', -860, 190, 140, 90, { fields: 1 }),

  // Civic Heights offices, public space, and structured parking
  parcel('ch-civic-plaza-01', 'civic-heights', 'civic-plaza', 455, -160, 130, 105, { pedestrianPriority: true }),
  parcel('ch-office-north-02', 'civic-heights', 'office', 560, -650, 140, 110, { floors: [5, 12] }),
  parcel('ch-office-east-03', 'civic-heights', 'office', 835, -180, 120, 120, { floors: [4, 10] }),
  parcel('ch-parking-structure', 'civic-heights', 'parking-structure', 790, -500, 110, 90, { floors: [3, 5], stalls: 160 }),

  // Eastgate travel corridor
  parcel('eg-travel-plaza-01', 'eastgate-corridor', 'commercial', 520, 310, 120, 76, { floors: [1, 3], parking: 24 }),
  parcel('eg-roadside-row-02', 'eastgate-corridor', 'commercial-row', 705, 345, 130, 70, { floors: [1, 3] }),
  parcel('eg-park-ride', 'eastgate-corridor', 'parking', 930, 330, 110, 85, { stalls: 42 }),

  // Parkside recreation and low-density edges
  parcel('pc-rec-hall-01', 'parkside-commons', 'recreation', 690, 530, 110, 85, { floors: [1, 3] }),
  parcel('pc-trailhead-02', 'parkside-commons', 'park-support', 300, 760, 80, 60, { parking: 10 }),
  parcel('pc-housing-edge-03', 'parkside-commons', 'residential-block', 770, 790, 150, 100, { floors: [2, 4] }),

  // Willowbend homes and neighborhood services
  parcel('wb-homes-west-01', 'willowbend-residential', 'residential-row', -270, 790, 180, 100, { lots: 6, floors: [1, 2] }),
  parcel('wb-homes-north-02', 'willowbend-residential', 'residential-row', -60, 690, 170, 90, { lots: 5, floors: [1, 2] }),
  parcel('wb-homes-east-03', 'willowbend-residential', 'residential-row', 145, 850, 120, 100, { lots: 4, floors: [1, 2] }),
  parcel('wb-neighborhood-shop', 'willowbend-residential', 'commercial', -250, 655, 70, 55, { floors: [1, 2], parking: 6 }),

  // Westside working neighborhood and alleys
  parcel('ws-walkups-north-01', 'westside-blocks', 'residential-block', -730, 285, 180, 105, { floors: [3, 6] }),
  parcel('ws-walkups-south-02', 'westside-blocks', 'residential-block', -690, 620, 190, 120, { floors: [2, 5] }),
  parcel('ws-corner-row-03', 'westside-blocks', 'mixed-use', -430, 520, 100, 110, { floors: [2, 5], storefronts: true }),
  parcel('ws-community-court', 'westside-blocks', 'recreation', -860, 620, 110, 90, { courts: 2 }),
]);

export const STARTER_TOWN_RESERVE_PARCELS = freeze([
  parcel('reserve-dreamdrop-west', 'dreamdrop-district', 'future-update', -345, 160, 90, 70, { purpose: 'future tutorial or social service' }),
  parcel('reserve-northworks-east', 'northworks-auto-row', 'future-update', 160, -820, 170, 110, { purpose: 'future industrial career' }),
  parcel('reserve-civic-north', 'civic-heights', 'future-update', 790, -780, 140, 110, { purpose: 'future civic expansion' }),
  parcel('reserve-eastgate-gateway', 'eastgate-corridor', 'future-update', 950, 120, 90, 70, { purpose: 'future travel service' }),
  parcel('reserve-parkside-south', 'parkside-commons', 'purposeful-empty', 660, 900, 180, 90, { purpose: 'open event lawn' }),
  parcel('reserve-westside-lot', 'westside-blocks', 'purposeful-empty', -470, 840, 120, 90, { purpose: 'vacant lot and future community build' }),
]);

export const STARTER_TOWN_PARCELS = freeze([
  ...STARTER_TOWN_FUNCTIONAL_PARCELS,
  ...STARTER_TOWN_FILLER_PARCELS,
  ...STARTER_TOWN_RESERVE_PARCELS,
]);

export const PARCEL_BY_ID = freeze(Object.fromEntries(STARTER_TOWN_PARCELS.map((entry) => [entry.id, entry])));
export const PARCEL_BY_LOCATION_ID = freeze(Object.fromEntries(
  STARTER_TOWN_FUNCTIONAL_PARCELS.filter((entry) => entry.locationId).map((entry) => [entry.locationId, entry]),
));

export function parcelsForDistrict(districtId) {
  return STARTER_TOWN_PARCELS.filter((entry) => entry.districtId === districtId);
}

export default STARTER_TOWN_PARCELS;
