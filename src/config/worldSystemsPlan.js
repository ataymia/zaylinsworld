// ───────────────────────────────────────────────────────────────────────────
// worldSystemsPlan.js — FORWARD-LOOKING shared system data (NOT wired into gameplay).
//
// Pure data for the GridLink teleporter, garage vehicle delivery, mechanic/tow
// recovery, and consumable stat effects. See:
// docs/WORLD_TRAVEL_VEHICLE_AND_RECOVERY_SYSTEMS.md
//
// IMPORTANT: This file reserves design contracts only. Runtime systems must add
// save migration, validation, transaction safety, streaming, UI, and tests.
// ───────────────────────────────────────────────────────────────────────────

export const GRIDLINK_TELEPORTER = Object.freeze({
  id: 'gridlink-personal-teleporter',
  displayName: 'GridLink Personal Teleporter',
  vendorTownId: 'tech-city',
  vendorLocationId: 'gadget-forge-mobility-lab',
  supportLocationIds: ['bytemart-gridlink-display', 'gridline-gridlink-service-kiosk'],
  recommendedPriceDreamBucks: 250000,
  cooldownSec: 180,
  channelSec: 3,
  ownership: 'permanent-save-unlock',
  teleportsVehicle: false,
  destinationRule: 'discovered-and-synchronized-safe-nodes-only',
  firstTownVisitMustBePhysical: true,
  blockedStates: [
    'wanted',
    'active-pursuit',
    'arrest',
    'bust',
    'jail',
    'active-combat',
    'recent-damage',
    'inside-moving-vehicle',
    'mission-travel-lock',
    'active-dungeon-floor',
    'active-obby-course',
    'restricted-interior',
    'scripted-scene',
    'falling',
    'drowning',
    'incapacitated',
    'active-interaction',
    'unsafe-arrival-volume',
  ],
  requiredUnlocksByTownId: {
    aqualume: ['gillyfish-gills', 'aqualume-discovered', 'aqualume-moonpool-synchronized'],
  },
  nodes: Object.freeze([
    { id: 'gridlink-node-starter', townId: 'starter-town', locationId: 'dreamdrop-civic-arrival' },
    { id: 'gridlink-node-fishing', townId: 'fishing-harbor', locationId: 'harbor-center-transit' },
    { id: 'gridlink-node-rich', townId: 'rich-hills', locationId: 'civic-crest-richline-stop' },
    { id: 'gridlink-node-tech', townId: 'tech-city', locationId: 'gridline-transit-hub' },
    { id: 'gridlink-node-casino', townId: 'casino-strip', locationId: 'strip-transit-terminal' },
    { id: 'gridlink-node-dungeon', townId: 'dungeon-outskirts', locationId: 'outpost-return-shrine' },
    { id: 'gridlink-node-obby', townId: 'obby-canyon', locationId: 'base-camp-course-plaza' },
    { id: 'gridlink-node-starline', townId: 'starline-city', locationId: 'fameline-transit-station' },
    { id: 'gridlink-node-aqualume', townId: 'aqualume', locationId: 'moonpool-gateway-terminal' },
  ]),
});

export const VEHICLE_CALL_SERVICE = Object.freeze({
  id: 'garage-concierge',
  phonePath: ['Vehicles', 'My Garage', 'Call Vehicle'],
  oneActiveDeliveryAtATime: true,
  duplicateActiveVehicleForbidden: true,
  activePursuitBlocksDelivery: true,
  requiresLegalDeliveryNode: true,
  roadDeliveryNodeTypes: ['curb', 'parking-lane', 'driveway', 'parking-lot', 'garage-entrance', 'service-pull-off'],
  forbiddenRoadDeliveryNodeTypes: ['intersection', 'sidewalk', 'school-crossing', 'active-mission-zone', 'restricted-property'],
  waterDeliveryRules: {
    smallBoat: ['public-marina', 'owned-slip', 'boat-ramp', 'service-dock'],
    yacht: ['deep-water-marina', 'owned-yacht-berth'],
    seaScooter: ['bluecore-dock', 'approved-underwater-station'],
    personalSub: ['sub-dock', 'moonpool-terminal', 'compatible-owned-property'],
    cargoSub: ['industrial-dock', 'deepworks-dock'],
  },
  friendlySeaLifeIsGarageInventory: false,
  vehicleStatuses: [
    'stored',
    'delivering',
    'active',
    'worn',
    'damaged',
    'critical',
    'disabled',
    'destroyed-awaiting-reclaim',
    'impounded',
    'under-repair',
    'unavailable',
  ],
  personalVehiclePermanentLossByDefault: false,
});

export const MECHANIC_AND_TOW_SERVICE = Object.freeze({
  id: 'mechanic-tow-service',
  services: [
    'quick-repair',
    'full-repair',
    'cosmetic-repair',
    'detailing',
    'tire-replacement',
    'engine-repair',
    'battery-repair',
    'tow',
    'water-recovery',
    'garage-transfer',
    'insurance-reclaim',
  ],
  conditionLayers: ['cosmetic', 'engine', 'steering', 'tires', 'battery-energy', 'body-integrity'],
  impoundedVehiclesCallable: false,
  destroyedVehiclesRequireRecovery: true,
});

export const CONSUMABLE_RECOVERY = Object.freeze({
  smallSnack:   { hungerRange: [8, 15],  healthRange: [3, 6],  thirstRange: [0, 0],  energyRange: [0, 3] },
  heartySnack:  { hungerRange: [15, 25], healthRange: [5, 10], thirstRange: [0, 0],  energyRange: [0, 5] },
  quickMeal:    { hungerRange: [30, 45], healthRange: [10, 18], thirstRange: [0, 10], energyRange: [0, 5] },
  fullMeal:     { hungerRange: [50, 70], healthRange: [15, 25], thirstRange: [5, 15], energyRange: [0, 8] },
  basicDrink:   { hungerRange: [0, 0],   healthRange: [0, 3],  thirstRange: [15, 30], energyRange: [0, 5] },
  energyDrink:  { hungerRange: [0, 0],   healthRange: [0, 3],  thirstRange: [10, 20], energyRange: [10, 20] },
  medicalItem:  { hungerRange: [0, 0],   healthRange: [20, 60], thirstRange: [0, 0],  energyRange: [0, 0] },
  rules: {
    clampToMaxStats: true,
    transactionalInventoryUse: true,
    useAnimationRequired: true,
    damageMayInterruptLongUse: true,
    shortCategoryDelay: true,
    clinicsRemainStrongestReliableRecovery: true,
  },
});

export default {
  GRIDLINK_TELEPORTER,
  VEHICLE_CALL_SERVICE,
  MECHANIC_AND_TOW_SERVICE,
  CONSUMABLE_RECOVERY,
};