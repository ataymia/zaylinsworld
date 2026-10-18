// Hard release contract for every destination. A town cannot be promoted to
// playable without visible lane controls, nighttime lighting, moving traffic,
// and law/safety consequences appropriate to its traversal mode.
import { DISTRICTS } from './worldMapPlan.js';

const freeze = (value) => Object.freeze(value);

const SPECIALIZED = Object.freeze({
  'fishing-harbor': freeze({
    vehicleModes: freeze(['road-vehicle', 'working-boat']),
    controlTypes: freeze(['traffic-light', 'stop-sign', 'harbor-signal']),
    enforcementAgency: 'harbor-patrol',
  }),
  'obby-canyon': freeze({
    vehicleModes: freeze(['road-vehicle', 'service-vehicle']),
    controlTypes: freeze(['traffic-light', 'stop-sign', 'course-crossing-beacon']),
    enforcementAgency: 'ranger-rescue',
  }),
  'dungeon-outskirts': freeze({
    vehicleModes: freeze(['road-vehicle', 'wagon']),
    controlTypes: freeze(['traffic-light', 'stop-sign', 'gate-beacon']),
    enforcementAgency: 'warden-station',
  }),
  aqualume: freeze({
    vehicleModes: freeze(['sea-scooter', 'personal-sub', 'transit-pod']),
    controlTypes: freeze(['current-signal', 'yield-beacon', 'dock-stop']),
    enforcementAgency: 'current-guard',
  }),
});

export const TOWN_TRAFFIC_REQUIREMENTS = freeze(Object.fromEntries(DISTRICTS.map((town) => {
  const specialized = SPECIALIZED[town.id] || {};
  return [town.id, freeze({
    townId: town.id,
    requiredForPlayable: true,
    vehicleModes: specialized.vehicleModes || freeze(['road-vehicle', 'service-vehicle']),
    controlTypes: specialized.controlTypes || freeze(['traffic-light', 'stop-sign']),
    streetLighting: true,
    curbAndParcelSetbacks: true,
    pedestrianCrossings: true,
    collisionAvoidance: true,
    offenseDetection: true,
    policeOrSafetyResponse: true,
    enforcementAgency: specialized.enforcementAgency || 'local-public-safety',
  })];
})));

export function trafficRequirementsForTown(townId) {
  return TOWN_TRAFFIC_REQUIREMENTS[townId] || null;
}

export function assertTownTrafficReady(townId, evidence = {}) {
  const requirement = trafficRequirementsForTown(townId);
  if (!requirement) throw new Error(`Unknown town traffic contract: ${townId}`);
  const required = [
    'movingTraffic',
    'controlsVisible',
    'streetLighting',
    'roadClearPlacement',
    'pedestrianCrossings',
    'offenseDetection',
    'safetyResponse',
  ];
  const missing = required.filter((field) => evidence[field] !== true);
  return freeze({
    townId,
    ready: missing.length === 0,
    missing: freeze(missing),
  });
}

export default TOWN_TRAFFIC_REQUIREMENTS;
