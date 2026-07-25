# Zaylins Active Phase Status

Updated: 2026-07-25
Authoritative machine-readable source: `src/config/buildPhaseStatus.js`  
Repository workflow: direct commits to `main`; no pull requests unless Mia explicitly requests one  
Construction mirror: `agent/starter-town-construction`

This file overrides older status labels in `ZAYLINS_MASTER_EXECUTION_CHECKLIST.md`. The master checklist remains the detailed work inventory. This document answers the narrower question: **what is implemented, what still needs live verification, and what comes next?**

## Status language

- **Complete:** implemented and accepted for the current milestone.
- **Implemented:** coded and automatically guarded, but named live QA remains.
- **Partial:** useful foundation exists, with meaningful work still outstanding.
- **Planned:** approved and not started.

---

# Current headline

```txt
Phase 0: COMPLETE
Phase 1: CORE CHARACTER FOUNDATION WORKS; ANIMATION CLIPS AND SOME LIVE NPC/INTERACTION QA REMAIN
Phase 2: IMPLEMENTED; SAVE/LIFECYCLE FEATURE-PREVIEW QA REMAINS
Phase 3: IMPLEMENTED FOUNDATION; LIVE SOAK, ARRAY-TO-POOL MIGRATION, AND STRESS TESTS REMAIN
Phase 4: IMPLEMENTED FOUNDATION; LIVE VEHICLE/TRAFFIC/POLICE BINDING AND TRAVERSAL QA REMAIN
Phase 5: IMPLEMENTED GEOGRAPHIC SKELETON; LIVE DRIVE-TIME AND READABILITY QA REMAIN
Phase 6: IMPLEMENTED VISUAL FOUNDATION; LIVE ART-DIRECTION AND FPS QA REMAIN
Phase 7: IMPLEMENTED; LIVE FULL-TOWN ACCEPTANCE REMAINS
Phase 8: ACTIVE; INTENTIONAL CITY-DENSITY AND ACCESS SLICE IMPLEMENTED
Next construction work: PHASE 8 SHARED SIMULATION AND LIVE ACCEPTANCE
```

---

# Phase 0: repository and build discipline

Status: **Complete**

- [x] One authoritative `main` history.
- [x] Asset Lab additions preserved.
- [x] World-planning documents preserved.
- [x] Character/runtime work consolidated.
- [x] Direct GitHub workflow recorded.
- [x] Existing automated quality gate.
- [x] Runtime-foundation test included in `npm run check`.
- [x] Machine-readable phase ledger.

---

# Phase 1: player, NPC, and interactions

## Phase 1A: Modular player and Character Studio

Status: **Complete**

- [x] Customizable player body, face, height, appearance, clothes, hair, and accessories.
- [x] Twenty skin tones ordered from Obsidian to Porcelain.
- [x] Deep tones use minimal texture lift instead of being washed toward white.
- [x] Saved appearance reaches the runtime player.

## Phase 1B: Wearable attachment system

Status: **Complete**

- [x] Approved hair placement.
- [x] Approved necklace placement.
- [x] Reusable whole-body wearable attachment contracts.

## Phase 1C: Player animation state machine

Status: **Partial**

- [x] Hands-down waist pose.
- [x] Runtime uses actual weighted deform joints.
- [x] Existing mechanical walk/run/jump/drive/aim/interact states.
- [ ] Acquire or create the approved animation clip library.
- [ ] Retarget and blend named clips.
- [ ] Add locomotion plus upper-body action layering.
- [ ] Test every clip on clothing and body extremes.

## Phase 1D: NPC visual validation

Status: **Partial**

- [x] Staged imported civilians.
- [x] Procedural fallback and fallback retirement.
- [x] Hands-down NPC pose.
- [ ] Live feet/grounding/scale matrix.
- [ ] Police equipment visual QA.
- [ ] Interior population QA.
- [ ] Long-session mixer/texture cleanup test.

## Phase 1E: Interaction contract

Status: **Partial**

- [x] Prompt priority.
- [x] Fake-prompt prevention.
- [x] Explicit interior interaction points.
- [ ] Apply facing and line-of-sight rules to all legacy interactions.
- [ ] Apply hold/tap and disabled-reason policies.
- [ ] Add touch/controller mappings later.

---

# Phase 2: world runtime, data, saves, and lifecycle

Status: **Implemented foundation**

## Phase 2A: Runtime world registry

- [x] Stable town, district, route, gateway, location, parcel, service, and spawn IDs.
- [x] Global, town-local, and interior-local coordinate rules.
- [x] Validation for duplicates, bad references, invalid coordinates, and bounds.
- [x] `starterTownLargeWorld` feature flag.
- [x] Feature-gated large Starter Town builder.
- [ ] Live feature-preview review without changing production saves.

## Phase 2B: Asset runtime adapter

- [x] Stable Asset Lab ID resolver.
- [x] Ready-only model placement.
- [x] Placeholder fallback and unresolved asset report.
- [x] Filtering, preload lists, lazy loading, and load-failure tracking.
- [x] Final asset replacement does not change gameplay location IDs.
- [ ] Continue metadata coverage as Asset Lab generates new categories.

## Phase 2C: Save schema and migration

- [x] Explicit save schema version 4.
- [x] Checksum, backup, corruption fallback, and migration hooks.
- [x] Safe named-spawn contracts for the expanded city.
- [ ] Run the full fresh/current/legacy/driving/interior/mission/corruption test matrix.

## Phase 2D: Scene lifecycle

- [x] Deterministic scopes for objects, materials, textures, mixers, listeners, and timers.
- [x] Starter Town lifecycle scope.
- [x] Cleanup diagnostics.
- [ ] Repeated live interior and town-mode transition leak test.

## Phase 2E: Diagnostics

- [x] FPS and frame time.
- [x] Draw calls, triangles, geometries, textures, and estimated texture memory.
- [x] Asset, pool, lifecycle, world, district, cell, loader, and phase reports.
- [x] Copyable runtime report.
- [ ] Connect all values to a polished in-game development overlay.

---

# Phase 3: streaming and performance

Status: **Implemented foundation**

## Phase 3A: Streaming cells

- [x] 250-unit cell contract.
- [x] 100 cells across the 2,400 × 2,400 terrain envelope.
- [x] Roads, parcels, locations, districts, spawns, and buffers assigned to cells.
- [x] Border dependencies.

## Phase 3B: Streaming rings

- [x] Active, warm, far, and unloaded states.
- [x] Unload hysteresis.
- [x] Predictive loading in the direction of fast travel.
- [x] Gateway and interior preload hooks.
- [x] Collision and roads before decoration.

## Phase 3C: Object pools

- [x] Civilian pool.
- [x] Police pool.
- [x] Civilian traffic pool.
- [x] Police vehicle pool.
- [x] Parked vehicle pool.
- [x] Litter/pickup pool.
- [x] Effects pool.
- [x] Interaction-marker pool.
- [x] Cell unload releases pooled objects.
- [ ] Migrate remaining compact-map arrays to acquire/release these pools.

## Phase 3D: Instancing and LOD

- [x] Near, mid, far, and culled relevance rules.
- [x] Distant animation and AI intervals.
- [x] Instanced district massing.
- [x] Instanced roads and roadside infrastructure.
- [x] Instancing eligibility contract.
- [x] Bind current pedestrian and traffic update loops to distance-based LOD intervals.
- [ ] Bind police simulation and remaining compact-map systems to streaming/LOD intervals.

## Phase 3E: Budgets and Auto graphics

- [x] Low, medium, and high budgets.
- [x] Conservative Auto detection.
- [x] Sustained-FPS automatic downshift.
- [x] Loader waits for real critical work.
- [x] Loader hard escape after twelve seconds.
- [x] Optional HDRI/background assets cannot block entry.
- [x] Visual-performance audit.

## Phase 3F: Live acceptance

Status: **Planned verification**

- [ ] Five-minute stationary soak.
- [ ] Fifteen-minute full-speed large-city drive.
- [ ] Repeated interiors.
- [ ] Police pursuit across districts.
- [ ] Dense downtown and school-zone stress.
- [ ] Low-spec preset.
- [ ] Memory returns near baseline after leaving dense cells.

---

# Phase 4: road, terrain, and navigation engine

Status: **Implemented foundation**

## Phase 4A: Road data

- [x] Arbitrary polylines and road tiers.
- [x] Width, speed, restrictions, one-way, school, service, and gateway metadata.
- [x] Authored elevations.

## Phase 4B: Road geometry

- [x] Instanced arbitrary-angle road geometry.
- [x] Terrain-following slope alignment.
- [x] Center dashes and edge markings.
- [x] Sidewalks and curbs.
- [ ] Visual seam and vehicle collision-surface review.

## Phase 4C: Special road forms

- [x] Parkside roundabout.
- [x] Willowbend cul-de-sacs.
- [x] Gateway acceleration and merge contracts.
- [x] Raised school crossings.
- [x] Parking entrances and service aprons.
- [ ] Live yielding, merging, and vehicle-physics behavior.

## Phase 4D: Roadside placement

- [x] Streetlight spacing.
- [x] Guardrails.
- [x] Crosswalks and school signs.
- [x] Drains, benches, bins, bike rack, and wayfinding.
- [x] Ready Asset Lab streetscape search with fallbacks.
- [ ] Visual lane/door/sidewalk obstruction pass.

## Phase 4E: Terrain and grades

- [x] Civic Heights elevation.
- [x] Parkside rolling relief.
- [x] Flatter Northworks industrial land.
- [x] Drainage channel.
- [x] Authored road grades and grade validator.
- [ ] Live vehicle handling on graded segments.

## Phase 4F: Shared navigation

- [x] Geometric crossings become graph nodes.
- [x] One connected public graph.
- [x] Closures, service restrictions, and school-zone routing options.
- [x] Routes to every locked functional location.
- [ ] Bind legacy traffic, police, missions, delivery, and minimap movement to the shared graph.

## Phase 4G: Validation

- [x] Connectivity validation.
- [x] Functional road access validation.
- [x] Grade validation.
- [x] Automated route tests.
- [ ] Player and NPC traversal of every segment.

---

# Phase 5: Starter Town geographic skeleton

Status: **Implemented skeleton**

- [x] 2,000 × 2,000 playable city.
- [x] 2,400 × 2,400 terrain envelope.
- [x] North Fishing Highway and east Rich Hills gateway approaches.
- [x] Nine district boundaries and profiles.
- [x] Dreamdrop Beltway and Northworks Expressway.
- [x] Primary arterials.
- [x] Local roads, alleys, service roads, school loop, roundabout, and cul-de-sacs.
- [x] Terrain character.
- [x] Thirteen functional parcels.
- [x] Thirty-five filler parcels.
- [x] Six purposeful empty/future parcels.
- [x] Safe boundary recovery.

## Phase 5H live acceptance still required

- [ ] Home to School: 2.5–4 minutes.
- [ ] Home to WorkTower: 3–5 minutes.
- [ ] Home to Auto Haus: 4–6 minutes.
- [ ] West to east: 4–7 minutes.
- [ ] Beltway loop: 8–12 minutes.
- [ ] Every district reachable by car and foot.
- [ ] Police/service reachability.
- [ ] No accidental impossible dead ends.

---

# Phase 6: district massing and presentation

Status: **Implemented foundation**

## Phase 6A: District visual contracts

- [x] Palette, scale, roofline, density, roads, vegetation, lighting, signage, ambience, population, police, cleanliness, and weather response for all nine districts.

## Phase 6B: Building massing

- [x] Terrain-aware instanced massing.
- [x] Functional placeholders.
- [x] Ready Asset Lab model replacement.
- [x] Purposeful empty lots preserved.
- [ ] Live skyline, spacing, and composition review.

## Phase 6C: Streetscape

- [x] Generated infrastructure from road data.
- [x] Ready Asset Lab prop placement.
- [x] Procedural fallback reporting.
- [ ] Live scale and spacing review.

## Phase 6D: Environment

- [x] Day/night district lighting values.
- [x] Weather-response values.
- [x] District ambience contracts.
- [x] Traffic, pedestrian, and police density contracts.
- [ ] Bind all environment values to the live lighting, audio, and population systems.

## Phase 6E: Performance review

- [x] Instancing audit.
- [x] Estimated triangle/draw count.
- [x] Shadow, culling, placeholder, and repeated-geometry warnings.
- [x] Graphics-tier budgets.
- [ ] Capture live low/medium/high FPS and visual comparisons.

---

# Completed construction phase

## Phase 7: Functional-location relocation

Status: **Implemented — all Phase 7 functional locations are cut over; live full-town acceptance remains**

Required first:

1. Load the large-town feature preview.
2. Confirm terrain, roads, districts, scale, and performance are directionally correct.
3. Fix any city-skeleton blockers.
4. [x] Create the shared relocation/parity harness.
5. Move one existing functional location at a time without breaking its interior, job, NPCs, parking, map marker, save state, police access, or delivery access.

Recommended Phase 7 order:

```txt
7A Shared relocation framework — implemented
7B Zaylins Home — implemented
7C Zaylins Prep — implemented
7D Chicken Spot — implemented
7E Frostbox — implemented
7F Kicks & Fits — implemented
7G Block Supply — implemented
7H Auto Haus — implemented
7I City Garage — implemented
7J Dreamdrop Public Safety — implemented
7K WorkTower — implemented
7L Iron City Gym — implemented
7M 6twelve — implemented
7N Dreamdrop Park — implemented
```

---

# Current construction phase

## Phase 8: Living-city cohesion and live acceptance

Status: **In implementation on the active Starter Town draft**

The player's deployed-build observations are authoritative acceptance evidence.
Source code that merely declares a car, prop, route, or asset does not count as
working until the shipped runtime makes it visible, reachable, and stable.

### Phase 8A: World cohesion

- [x] Remove the compact 260 m terrain/road surface when the 2,000 m town is active.
- [x] Expand the town to 49 connected authored roads and draw the full network on the city map.
- [x] Add 18 district-spanning pedestrian loops and 72/108/156 density budgets.
- [x] Add 16 full-town traffic loops and 28/44/68 density budgets.
- [x] Start traffic vehicles in motion on the large-town routes.
- [x] Keep at least one occupied traffic vehicle within recovery distance of an on-foot player.
- [x] Increase landscaping to 1,400 trees and 240 rocks with road clearance and district minimums.
- [x] Increase production filler-building massing from 73 to 103 road-safe placements.
- [x] Give every enterable functional exterior exactly one readable identity sign.
- [x] Connect all twelve enterable destinations to their declared frontage roads with paved vehicle access and concrete walks.
- [x] Suppress duplicate legacy/production building shells while retaining interactions.
- [x] Make generated streetlights block slow vehicles, fall under a real impact, and restore after 30 minutes.
- [x] Register trees and rocks as hard off-road vehicle obstacles.
- [x] Give all 103 production filler buildings hard rectangular vehicle footprints.
- [x] Enforce the locked playable and terrain bounds, preserving only authored gateway exits.
- [x] Preserve the existing Shift sprint and stamina behavior instead of adding a conflicting run system.
- [x] Replace the prototype sanitation setup with Denise Hall on the sidewalk, a production dumpster with detailed fallback, and 28 citywide litter stops.
- [x] Render only the active interior and suspend town simulation during transitions.
- [x] Recover outside instead of crashing when an interior transition fails.
- [ ] Pass visual playtest for terrain stability, labels, traffic motion, pedestrian coverage, and building placement.
- [ ] Pass repeated entry/exit testing for all twelve interiors on the deployed preview.

### Phase 8B: Shared simulation

- [ ] Bind police patrol navigation to the authoritative road graph.
- [ ] Bind missions, deliveries, service access, and route guidance to the same graph.
- [ ] Add district schedules for pedestrian destinations, work shifts, school, shops, and nightlife.
- [x] Add distance-based update budgets for traffic and pedestrians.
- [x] Add a spatial collision index so increased scenery density does not require whole-city collision scans.
- [ ] Move police and remaining legacy simulation onto streaming/LOD budgets and named pools.
- [ ] Complete browser-driven 5-, 15-, and 60-minute stability runs.
