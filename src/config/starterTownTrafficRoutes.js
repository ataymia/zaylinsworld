// Closed, lane-safe traffic loops for the authoritative 2.4 km Starter Town.
// The legacy traffic loops in mapConfig.js only cover the old 60 m prototype.

const freezeLoop = (name, points) => Object.freeze({
  name,
  loop: Object.freeze(points.map(([x, z]) => Object.freeze([x, z]))),
});

export const LARGE_TOWN_TRAFFIC_ROUTES = Object.freeze([
  // Out-and-back lanes on Centre Avenue. The first waypoint is beside the
  // Dreamdrop Core arrival so traffic is visible immediately after spawning.
  freezeLoop('centre-avenue-local', [
    [2.2, 0], [2.2, 500], [-2.2, 500], [-2.2, -500], [2.2, -500],
  ]),
  // Two-way lane pair on Dreamdrop Boulevard.
  freezeLoop('dreamdrop-boulevard-local', [
    [0, -117.8], [500, -117.8], [500, -122.2], [-500, -122.2], [-500, -117.8],
  ]),
  // Slow service traffic through the mixed-use core.
  freezeLoop('dreamdrop-service-local', [
    [0, 77.8], [300, 77.8], [300, 82.2], [-300, 82.2], [-300, 77.8],
  ]),
  // A full-world loop keeps distant districts from feeling completely static.
  freezeLoop('dreamdrop-beltway', [
    [0, -857.8], [857.8, -857.8], [857.8, 857.8], [-857.8, 857.8], [-857.8, -857.8],
  ]),
]);

export default LARGE_TOWN_TRAFFIC_ROUTES;
