// ─────────────────────────────────────────────────────────────────────────────
// buildPhaseStatus.js — machine-readable implementation ledger.
//
// Status meanings:
//   complete    = implemented and accepted for its current milestone
//   implemented = coded and automatically guarded, but still needs named live QA
//   partial     = useful foundation exists; remaining work is listed
//   planned     = approved but not started
//   blocked     = dependency prevents responsible implementation
// ─────────────────────────────────────────────────────────────────────────────

const freeze = (value) => Object.freeze(value);
const phase = (id, name, status, values = {}) => freeze({ id, name, status, ...values });

export const BUILD_PHASE_STATUS_VERSION = 3;
export const BUILD_PHASE_UPDATED_AT = '2026-07-18';

export const BUILD_PHASES = freeze([
  phase('0', 'Repository, baseline, and build discipline', 'complete', {
    completed: freeze(['0A repository consolidation', '0B automated quality baseline', '0C direct GitHub workflow']),
    notes: 'Main is authoritative. Routine development uses direct commits without pull requests.',
  }),
  phase('1A', 'Modular player and Character Studio', 'complete'),
  phase('1B', 'Wearable attachment pipeline', 'complete'),
  phase('1C', 'Player animation state machine', 'partial', {
    completed: freeze(['hands-down waist pose', 'mechanical locomotion/action overrides', 'T-pose deform-bone correction']),
    remaining: freeze(['source/retarget named clips', 'clip blending', 'upper-body aim layer', 'full clothing/body-extreme animation QA']),
    blocking: freeze(['approved animation clip library']),
  }),
  phase('1D', 'NPC visual and behavior validation', 'partial', {
    completed: freeze(['staged imported visuals', 'procedural fallback', 'fallback retirement', 'hands-down NPC arm pose']),
    remaining: freeze(['live feet/scale validation', 'police equipment QA', 'interior population QA', 'long-session mixer/texture cleanup test']),
  }),
  phase('1E', 'Universal interaction contract', 'partial', {
    completed: freeze(['real-result prompt filtering', 'interaction priority', 'explicit interior interaction points']),
    remaining: freeze(['line-of-sight/facing rules across all legacy interactions', 'hold/tap policy', 'disabled reasons', 'touch/controller mappings']),
  }),
  phase('2A', 'Runtime world registry', 'implemented', {
    completed: freeze(['town/district/route/gateway/location/spawn IDs', 'coordinate spaces', 'validation', 'large-world feature flag', 'large-town builder']),
    verify: freeze(['live feature-flag preview without mutating saves']),
  }),
  phase('2B', 'Asset runtime integration', 'implemented', {
    completed: freeze(['stable-ID resolver', 'ready-only placement', 'fallback reporting', 'filters', 'lazy loading', 'load-failure tracking']),
    verify: freeze(['final asset metadata coverage as Asset Lab continues']),
  }),
  phase('2C', 'Save schema and migration', 'implemented', {
    completed: freeze(['schema version 4', 'checksum', 'backup', 'corruption fallback', 'legacy position recovery contracts']),
    verify: freeze(['production-save matrix', 'driving/interior/mission saves', 'deleted asset recovery']),
  }),
  phase('2D', 'Scene lifecycle and ownership', 'implemented', {
    completed: freeze(['deterministic scopes', 'object/material/texture cleanup', 'listener/timer/mixer ownership', 'town lifecycle scope']),
    verify: freeze(['repeated live interior/town transition leak test']),
  }),
  phase('2E', 'Developer diagnostics', 'implemented', {
    completed: freeze(['FPS/frame time', 'draw calls/triangles/textures', 'world/district/cell', 'assets', 'pools', 'lifecycle', 'copyable report']),
    verify: freeze(['live diagnostic overlay presentation']),
  }),
  phase('3A', 'Streaming-cell content model', 'implemented', {
    completed: freeze(['100 deterministic cells', 'roads/parcels/locations/districts/spawns/buffers indexed', 'border dependencies']),
  }),
  phase('3B', 'Streaming rings and priorities', 'implemented', {
    completed: freeze(['active/warm/far/unload rings', 'hysteresis', 'predictive driving preload', 'gateway/interior preload hooks', 'collision-first priorities']),
  }),
  phase('3C', 'Named object pools', 'implemented', {
    completed: freeze(['civilian', 'police', 'traffic', 'police vehicle', 'parked vehicle', 'litter', 'effect', 'interaction marker pools', 'cell unload release']),
    verify: freeze(['migrate remaining legacy live arrays to acquire/release pools']),
  }),
  phase('3D', 'Instancing and LOD', 'implemented', {
    completed: freeze(['distance/relevance policy', 'instancing eligibility', 'instanced massing', 'instanced roadside infrastructure', 'distant update intervals']),
    verify: freeze(['live NPC/traffic update throttling integration']),
  }),
  phase('3E', 'Performance budgets and adaptive graphics', 'implemented', {
    completed: freeze(['tier budgets', 'budget violations', 'conservative Auto preset', 'sustained-FPS downshift', 'visual audit']),
  }),
  phase('3F', 'Performance acceptance', 'planned', {
    verify: freeze(['5-minute stationary soak', '15-minute full-speed drive', 'interior repetition', 'pursuit', 'downtown/school stress', 'low-spec preset', 'memory return']),
    dependsOn: freeze(['feature-flagged large town live preview']),
  }),
  phase('4A', 'Road data model', 'implemented', {
    completed: freeze(['polyline routes', 'tiers', 'width/speed/restrictions', 'grades', 'district/location access metadata']),
  }),
  phase('4B', 'Road geometry', 'implemented', {
    completed: freeze(['arbitrary-angle instanced asphalt', 'terrain-following grade alignment', 'lane/edge markings', 'sidewalks', 'curbs']),
    verify: freeze(['visual seam inspection', 'vehicle collision surface parity']),
  }),
  phase('4C', 'Special road forms', 'implemented', {
    completed: freeze(['roundabout', 'cul-de-sacs', 'gateway acceleration/merge contracts', 'raised school crossings', 'parking entrances', 'service aprons']),
    verify: freeze(['live traffic yielding/merging', 'roundabout and ramp vehicle physics']),
  }),
  phase('4D', 'Roadside placement', 'implemented', {
    completed: freeze(['streetlight spacing', 'guardrails', 'crosswalks', 'school signs', 'drains', 'benches/bins', 'district/route signs', 'ready Asset Lab props']),
    verify: freeze(['door/sidewalk clearance visual pass', 'lane obstruction pass']),
  }),
  phase('4E', 'Terrain and grades', 'implemented', {
    completed: freeze(['2,400-unit terrain', 'Civic Heights elevation', 'Parkside rolling relief', 'Northworks flattening', 'drainage', 'authored road grades', 'grade validator']),
    verify: freeze(['vehicle handling on every graded segment']),
  }),
  phase('4F', 'Shared navigation graph', 'implemented', {
    completed: freeze(['geometric intersection splitting', 'one connected public graph', 'closures', 'service restrictions', 'school avoidance', 'routing to all functional locations']),
    verify: freeze(['bind legacy traffic/police/minimap movement to the shared graph']),
  }),
  phase('4G', 'Road validation', 'implemented', {
    completed: freeze(['connectivity', 'geometric crossings', 'functional access', 'route validation', 'grade validation']),
    verify: freeze(['live player and NPC traversal of every segment']),
  }),
  phase('5A', 'Coordinate, boundary, and gateway lock', 'implemented', {
    completed: freeze(['2,000-unit playable bounds', '2,400-unit envelope', 'north/east gateways', 'boundary clamp', 'safe recovery']),
  }),
  phase('5B', 'Nine district boundaries and profiles', 'implemented'),
  phase('5C', 'Beltway and highways', 'implemented', { verify: freeze(['8–12 minute live Beltway target', 'ramps/merges/shoulder visual pass']) }),
  phase('5D', 'Primary arterials', 'implemented'),
  phase('5E', 'Local roads and service networks', 'implemented'),
  phase('5F', 'Terrain character', 'implemented', { verify: freeze(['live district readability and vehicle-grade QA']) }),
  phase('5G', 'Parcel plan', 'implemented', {
    completed: freeze(['13 functional parcels', '35 filler parcels', '6 reserve/empty parcels', 'no-build buffers']),
  }),
  phase('5H', 'Geographic acceptance', 'planned', {
    verify: freeze(['home-school', 'home-work', 'home-auto', 'west-east', 'Beltway drive times', 'car/foot/police reachability']),
    dependsOn: freeze(['large-town live preview', 'basic traffic routing integration']),
  }),
  phase('6A', 'District visual contracts', 'implemented'),
  phase('6B', 'Building massing', 'implemented', {
    completed: freeze(['terrain-aware instanced district massing', 'functional placeholders', 'ready final asset replacement', 'reserve lots preserved']),
    verify: freeze(['live skyline/composition review']),
  }),
  phase('6C', 'Streetscape', 'implemented', {
    completed: freeze(['generated infrastructure', 'Asset Lab ready-prop search', 'procedural fallbacks', 'placement reports']),
    verify: freeze(['visual spacing/scale review']),
  }),
  phase('6D', 'Environmental presentation', 'implemented', {
    completed: freeze(['district lighting', 'day/night values', 'weather response', 'ambience contracts', 'traffic/pedestrian/police density contracts']),
    verify: freeze(['bind values to live lighting/audio/population systems']),
  }),
  phase('6E', 'Visual-performance validation', 'implemented', {
    completed: freeze(['instancing audit', 'triangle/draw estimate', 'shadow/unculled/repeated-geometry warnings', 'performance budgets']),
    verify: freeze(['live low/medium/high visual and FPS capture']),
  }),
  phase('7', 'Functional location relocation', 'implemented', {
    completed: freeze(['Phase 7A stable contracts', '15-field parity evidence gate', 'legacy-coordinate migration guard', 'production diagnostics report', 'Phase 7B Zaylins Home fallback-safe cutover', 'Phase 7C Zaylins Prep fallback-safe cutover', 'Phase 7D Chicken Spot fallback-safe cutover', 'Phase 7E–7G retail cutovers', 'Phase 7H–7I vehicle-service cutovers', 'Phase 7J–7L civic/work cutovers', 'Phase 7M–7N infrastructure/public-space cutovers']),
    verify: freeze(['live full-town preview, save/load, and performance acceptance pass']),
    dependsOn: freeze(['Phase 2–6 live feature-preview review']),
  }),
]);

export const BUILD_PHASE_BY_ID = freeze(Object.fromEntries(BUILD_PHASES.map((entry) => [entry.id, entry])));
export const NEXT_BUILD_PHASE = BUILD_PHASES.find((entry) => entry.next) || null;

export function buildPhaseSummary() {
  const totals = {};
  for (const entry of BUILD_PHASES) totals[entry.status] = (totals[entry.status] || 0) + 1;
  return freeze({
    version: BUILD_PHASE_STATUS_VERSION,
    updatedAt: BUILD_PHASE_UPDATED_AT,
    next: NEXT_BUILD_PHASE?.id || null,
    totals: freeze(totals),
    phases: BUILD_PHASES,
  });
}

if (typeof window !== 'undefined') {
  window.__ZW_BUILD_PHASES__ = BUILD_PHASE_BY_ID;
  window.__ZW_BUILD_PHASE_REPORT__ = buildPhaseSummary;
}

export default BUILD_PHASES;
