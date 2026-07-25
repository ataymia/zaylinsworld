// District-spanning pedestrian loops for the authoritative 2,000 m Starter Town.
//
// The compact prototype routes cover only the old 60 m grid. These loops keep
// sidewalks, parks, campuses, shopping blocks, neighborhoods, and civic areas
// visibly occupied without allowing one downtown crowd to consume the whole
// character budget.

const freezeRoute = (id, districtId, points, extra = {}) => Object.freeze({
  id,
  districtId,
  loop: Object.freeze(points.map(([x, z]) => Object.freeze([x, z]))),
  ...extra,
});

export const LARGE_TOWN_PEDESTRIAN_ROUTES = Object.freeze([
  freezeRoute('dreamdrop-core-walk', 'dreamdrop-district', [
    [-315, -190], [-65, -190], [315, -190], [315, 145], [70, 145], [-315, 145],
  ], { activity: 'mixed-use' }),
  freezeRoute('scholars-campus-walk', 'scholars-quarter', [
    [-930, -315], [-620, -315], [-585, 170], [-815, 205], [-930, 90],
  ], { activity: 'school' }),
  freezeRoute('northworks-shift-walk', 'northworks-auto-row', [
    [-930, -805], [-520, -805], [-160, -790], [185, -620], [150, -410], [-480, -390], [-900, -430],
  ], { activity: 'industrial' }),
  freezeRoute('civic-heights-walk', 'civic-heights', [
    [285, -520], [520, -680], [850, -610], [925, -260], [780, 115], [430, 125], [275, -115],
  ], { activity: 'civic' }),
  freezeRoute('westside-neighborhood-walk', 'westside-blocks', [
    [-930, 250], [-570, 250], [-395, 420], [-420, 880], [-760, 930], [-930, 720],
  ], { activity: 'residential' }),
  freezeRoute('market-mile-walk', 'market-mile', [
    [-330, 255], [-85, 245], [185, 260], [195, 585], [-75, 600], [-330, 555],
  ], { activity: 'retail' }),
  freezeRoute('eastgate-travel-walk', 'eastgate-corridor', [
    [385, 155], [630, 145], [945, 155], [950, 395], [680, 405], [405, 385],
  ], { activity: 'travel' }),
  freezeRoute('parkside-recreation-walk', 'parkside-commons', [
    [255, 405], [520, 390], [810, 500], [930, 770], [680, 945], [350, 890], [235, 650],
  ], { activity: 'park' }),
  freezeRoute('willowbend-neighborhood-walk', 'willowbend-residential', [
    [-335, 650], [-75, 630], [200, 660], [220, 955], [-80, 980], [-330, 940],
  ], { activity: 'residential' }),
]);

export const LARGE_TOWN_PEDESTRIAN_BUDGET = Object.freeze({
  sparse: 32,
  normal: 48,
  busy: 72,
});

export function largeTownPedestrianCount(density = 0.72) {
  const value = Number(density);
  if (value >= 0.95) return LARGE_TOWN_PEDESTRIAN_BUDGET.busy;
  if (value >= 0.68) return LARGE_TOWN_PEDESTRIAN_BUDGET.normal;
  return LARGE_TOWN_PEDESTRIAN_BUDGET.sparse;
}

export default LARGE_TOWN_PEDESTRIAN_ROUTES;
