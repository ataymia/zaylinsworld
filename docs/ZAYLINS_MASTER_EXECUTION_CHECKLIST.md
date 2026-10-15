# Zaylins Master Execution Checklist

Status: canonical operational build plan  
Active branch: `agent/starter-town-construction`  
Primary milestone: Starter Town playable demo  
Long-term milestone: complete connected Zaylins world

This is the document used when Mia says:

```txt
Start Phase 2A.
Continue to Phase 4C.
What is left in Phase 9?
```

The broader design documents explain what the world should be. This checklist defines the exact implementation order required to turn those designs into a functioning game.

Asset creation is handled in the Asset Lab and is intentionally not duplicated here. This checklist does include the code required to register, optimize, load, place, replace, collide with, animate, and test those assets.

---

# 0. HOW TO USE THIS PLAN

## Status legend

```txt
[COMPLETE]  implemented, merged, and materially functional
[PARTIAL]   foundation exists but still needs listed work
[NEXT]      next recommended implementation slice
[BLOCKED]   cannot begin until named dependency is complete
[PLANNED]   approved work not yet started
[DEFERRED]  intentionally postponed without blocking the current milestone
[VERIFY]    implemented but needs live visual or gameplay confirmation
```

## Slice rules

Every implementation slice must:

- have one phase ID;
- have a narrow goal;
- list files and systems it may change;
- preserve unrelated working systems;
- define save-state impact;
- define performance impact;
- include automated checks;
- include a live acceptance test;
- be committed before the next slice begins;
- be visually approved before destructive replacement work continues.

## Branch rules

- `main` is the latest approved stable game.
- `agent/starter-town-construction` is the active Starter Town construction branch.
- New construction work goes to the active construction branch.
- Asset Lab additions must be synchronized into the active branch before they are integrated into gameplay.
- Large phases should use a pull request and pass CI before merging.
- Never build an entire phase as one unreviewable mega-commit.

## Current project position

```txt
Phase 0: COMPLETE
Phase 1A-1B: COMPLETE
Phase 1C-1E: PARTIAL but not blocking map construction
Phase 2A: NEXT
Starter Town geography: NOT STARTED at final scale
Starter Town current systems: strong compact prototype foundation
Full-world construction: BLOCKED by Starter Town demo
```

## Starter Town authoritative scale

```txt
Playable city: approximately 2,000 x 2,000 world units
Terrain/streaming envelope: approximately 2,400 x 2,400
Starter Town center: world origin
Initial connected world: approximately 22,000 x 20,000 plus water/depth
```

Any older compact-map numbers are historical implementation notes, not the final city size.

---

# MILESTONE A: SAFE CONSTRUCTION BASELINE

# PHASE 0: SOURCE CONTROL, BASELINE, AND BUILD DISCIPLINE

## Phase 0A: Repository consolidation

Status: [COMPLETE]

- [x] Merge finished character/runtime work into `main`.
- [x] Preserve world-blueprint documents.
- [x] Preserve Asset Lab registry additions.
- [x] Preserve Character Studio and modular player.
- [x] Preserve NPC, school, Chicken Spot, Block Supply, police, and lag fixes.
- [x] Create `agent/starter-town-construction` from unified `main`.
- [x] Neutralize the retired character branch so it contains no divergent work.

Exit gate:

```txt
One approved baseline contains the planning, assets, characters, NPCs, and current gameplay.
```

## Phase 0B: Automated quality baseline

Status: [COMPLETE/PARTIAL]

- [x] Source syntax checks.
- [x] Structural smoke checks.
- [x] Character policy checks.
- [x] Player runtime checks.
- [x] Production build check.
- [x] Character asset audit.
- [x] Runtime asset audit.
- [x] GitHub quality workflow.
- [ ] Add road-graph validation after Phase 4.
- [ ] Add streaming validation after Phase 3.
- [ ] Add save-migration tests after Phase 2C.
- [ ] Add full Starter Town regression tests after Phase 14.

## Phase 0C: Project tracking discipline

Status: [NEXT SUPPORT TASK]

- [ ] Keep this document as the canonical implementation checklist.
- [ ] Update statuses after every approved slice.
- [ ] Record the current phase in the commit or PR title.
- [ ] Add a short implementation note for every completed subphase.
- [ ] Keep design decisions in blueprint documents, not hidden in code comments.
- [ ] Keep temporary compromises labeled as temporary.
- [ ] Do not mark a phase complete based only on compilation.

Exit gate:

```txt
At any time, Mia can ask where the project stands and receive one unambiguous answer.
```

---

# MILESTONE B: CORE GAME FOUNDATION LOCK

# PHASE 1: PLAYER, NPC, AND INTERACTION FOUNDATION

This phase is no longer the active bottleneck. Remaining tasks may be completed alongside later phases when relevant.

## Phase 1A: Modular player and Character Studio

Status: [COMPLETE]

- [x] One explicit player visual owner.
- [x] Customizable body and face.
- [x] Skin tone and eye options.
- [x] Clothing, shoes, hats, glasses, facial hair, hair, and jewelry slots.
- [x] Height/body controls.
- [x] Saved looks.
- [x] Live rotating preview.
- [x] Runtime player uses saved customization.
- [x] Procedural emergency fallback.

## Phase 1B: Wearable attachment pipeline

Status: [COMPLETE]

- [x] Reusable hair fit profiles.
- [x] Native reference mapping.
- [x] Head-space attachment logic.
- [x] Whole-body attachment blueprint.
- [x] Jewelry attachment system.
- [x] Final approved current hair placement.
- [x] Current chain placement accepted.
- [ ] Add future wearable-specific profiles only when new assets require them.

## Phase 1C: Player animation state machine

Status: [PARTIAL/DEFERRED UNTIL CLIPS EXIST]

- [x] Relaxed arm-pose foundation.
- [x] Player can walk, run, jump, drive, enter, exit, aim, and interact mechanically.
- [ ] Acquire or create named animation clips: idle, walk, run, jump, fall, land, sit, drive, enter vehicle, exit vehicle, interact, eat, use tool, aim, shoot, melee, hurt, arrest, and celebration.
- [ ] Retarget clips to the modular player rig.
- [ ] Create animation-state controller.
- [ ] Blend idle/walk/run using speed.
- [ ] Blend upper-body aim over locomotion.
- [ ] Prevent T-pose during runtime transitions.
- [ ] Keep Character Studio pose separate from gameplay pose.
- [ ] Test body extremes and all clothing.
- [ ] Add animation fallback when a clip is unavailable.

Exit gate:

```txt
No normal gameplay state exposes the authored T-pose or snaps between incompatible poses.
```

## Phase 1D: NPC visual and behavior validation

Status: [PARTIAL]

- [x] Imported civilian visuals load directly.
- [x] NPC loading is capped and staged.
- [x] Procedural fallback appears while assets load.
- [x] Bubble fallback retires after successful replacement.
- [x] NPC arms are no longer permanently splayed.
- [ ] Verify no duplicate fallback body survives any swap.
- [ ] Verify NPC skin variety and role variety.
- [ ] Verify NPCs keep correct feet position after skin swap.
- [ ] Verify NPCs do not sink, hover, or change scale while walking.
- [ ] Verify police visual and equipment.
- [ ] Verify NPC interior spawning.
- [ ] Verify long-session cleanup of mixers, meshes, and textures.

## Phase 1E: Interaction contract

Status: [PARTIAL]

- [x] Interaction manager avoids fake prompts.
- [x] Enterable interiors use explicit interaction points.
- [x] World labels can be hidden until relevant.
- [ ] Create one shared interaction schema for door, talk, inspect, buy, job, mission, activity, vehicle, service, and crime interactions.
- [ ] Add interaction priority when prompts overlap.
- [ ] Add distance, line-of-sight, and facing rules.
- [ ] Add hold-versus-tap behavior where appropriate.
- [ ] Add disabled-reason messages.
- [ ] Add controller/touch mappings later.

Exit gate:

```txt
A player always knows what can be interacted with, and clicking a prompt always produces a real result.
```

---

# MILESTONE C: TECHNICAL WORLD FOUNDATION

# PHASE 2: WORLD RUNTIME, DATA CONTRACTS, AND SAVE SAFETY

## Phase 2A: Runtime world registry

Status: [NEXT]

Goal: make the approved world plan executable without replacing the current playable map in one dangerous step.

- [ ] Create a runtime `WorldRegistry` adapter around `worldMapPlan.js`.
- [ ] Define town IDs, district IDs, route IDs, gateway IDs, landmark IDs, and service IDs.
- [ ] Define coordinate-space rules: global world coordinates, town-local coordinates, interior-local coordinates.
- [ ] Define town bounds and terrain envelopes.
- [ ] Define district polygons or boundaries.
- [ ] Define gateway direction and destination.
- [ ] Define functional-location IDs that remain stable when buildings move.
- [ ] Define placeholder/final asset references independently from location IDs.
- [ ] Add schema validation at startup.
- [ ] Add clear errors for duplicate IDs, missing destinations, invalid coordinates, and overlapping town origins.
- [ ] Keep the current compact map active behind a feature flag during transition.
- [ ] Add `starterTownLargeWorld` development flag.
- [ ] Add a minimal empty large-world scene generated from registry data.
- [ ] Confirm switching flags does not alter player inventory or save data.

Acceptance tests:

```txt
- The registry loads without rendering the entire world.
- Starter Town and all future town records are discoverable by ID.
- Functional location IDs do not depend on old coordinates.
- The compact map can still run until the large map reaches parity.
```

Exit gate:

```txt
The game can create an empty authoritative Starter Town from data while retaining the old map as a temporary fallback.
```

## Phase 2B: Asset runtime integration adapter

Status: [PLANNED; ASSET CREATION EXTERNAL]

Goal: consume the Asset Lab registry safely without duplicating its work.

- [ ] Read the Asset Lab metadata schema and asset index.
- [ ] Create a runtime asset resolver by stable asset ID.
- [ ] Support placeholder fallback when an approved asset is unavailable.
- [ ] Support town, district, category, and location filtering.
- [ ] Support scale, rotation, pivot, collision, interaction anchors, and license metadata.
- [ ] Support source/final asset replacement without changing gameplay code.
- [ ] Support GLB preload hints and lazy loading.
- [ ] Support LOD references when supplied.
- [ ] Support instancing eligibility.
- [ ] Support asset load failure reporting without crashing the world.
- [ ] Add a development overlay showing unresolved asset IDs.
- [ ] Add automated checks for missing indexed files and duplicate asset IDs.

Exit gate:

```txt
Any approved Asset Lab item can be placed by ID and later replaced without rewriting the location or gameplay system.
```

## Phase 2C: Save schema versioning and migration

Status: [PLANNED]

- [ ] Inventory every currently saved field.
- [ ] Create explicit save schema version.
- [ ] Separate player appearance, stats, inventory, money, vehicles, properties, school, jobs, missions, crime, police career, world discovery, and settings.
- [ ] Add migrations from every existing known save shape.
- [ ] Convert old raw coordinates to safe named spawn points when the city expands.
- [ ] Detect players saved inside removed geometry.
- [ ] Detect missing owned vehicle definitions.
- [ ] Detect missing equipped wearables.
- [ ] Preserve unknown future fields where practical.
- [ ] Add backup before migration.
- [ ] Add corruption fallback and recovery message.
- [ ] Add save checksum or validation.
- [ ] Add autosave throttling.
- [ ] Add manual save where appropriate.
- [ ] Add save-on-interior-transition, mission completion, purchase, property change, job completion, arrest, and town transition.

Acceptance tests:

- [ ] Fresh save.
- [ ] Current production save.
- [ ] Old compact-map save.
- [ ] Save while driving.
- [ ] Save inside interior.
- [ ] Save during mission.
- [ ] Corrupted save recovery.
- [ ] Deleted/missing asset recovery.

## Phase 2D: Scene lifecycle and ownership

Status: [PLANNED]

- [ ] Define owners for world geometry, town geometry, district geometry, interiors, characters, vehicles, effects, UI, and debug tools.
- [ ] Add deterministic cleanup methods.
- [ ] Prevent duplicate listeners when scenes reload.
- [ ] Prevent duplicate NPCs and vehicles after interior transitions.
- [ ] Dispose abandoned geometry, materials, textures, mixers, and audio.
- [ ] Separate persistent player state from disposable scene objects.
- [ ] Create interior enter/exit lifecycle.
- [ ] Create town enter/exit lifecycle.
- [ ] Create streaming-cell enter/exit lifecycle.
- [ ] Add lifecycle leak diagnostics.

Exit gate:

```txt
Repeatedly entering buildings and switching world modes does not multiply objects, listeners, or memory.
```

## Phase 2E: Developer diagnostics

Status: [PLANNED]

- [ ] FPS and frame-time display.
- [ ] Draw calls.
- [ ] Triangle count.
- [ ] Loaded textures and estimated texture memory.
- [ ] Loaded GLBs.
- [ ] Active NPCs.
- [ ] Active traffic vehicles.
- [ ] Active police units.
- [ ] Active streaming cells.
- [ ] Pool sizes.
- [ ] Current town, district, road segment, parcel, and interior.
- [ ] Player coordinates and safe-spawn ID.
- [ ] Current mission and interaction target.
- [ ] Toggleable district/cell/road/parcels overlays.
- [ ] One-copy diagnostics report for bug tickets.

---

# PHASE 3: STREAMING, LOD, POOLING, AND PERFORMANCE

## Phase 3A: Streaming-cell model

- [ ] Divide Starter Town envelope into approximately 250 x 250 cells.
- [ ] Assign roads, parcels, buildings, props, vegetation, NPC spawners, and traffic spawners to cells.
- [ ] Define persistent objects that never belong to disposable cells.
- [ ] Define cell dependencies at borders.
- [ ] Define interior cells independently.
- [ ] Prevent cell seams and missing road segments.

## Phase 3B: Streaming rings

- [ ] High-detail active radius.
- [ ] Warm preload radius.
- [ ] Low-detail skyline/terrain radius.
- [ ] Unload radius with hysteresis.
- [ ] Predictive loading based on player velocity and road direction.
- [ ] Gateway preloading before town travel.
- [ ] Interior preload during door approach.
- [ ] Loading priority for collision before decoration.

## Phase 3C: Object pooling

- [ ] Civilian NPC pool.
- [ ] Police NPC pool.
- [ ] Civilian traffic pool.
- [ ] Police vehicle pool.
- [ ] Parked vehicle pool.
- [ ] Litter and pickup pool.
- [ ] Common particles/effects pool.
- [ ] Repeated interaction marker pool.
- [ ] Reset contracts for pooled objects.

## Phase 3D: Instancing and LOD

- [ ] Instance repeated trees.
- [ ] Instance streetlights and poles.
- [ ] Instance repeated houses/buildings where material-compatible.
- [ ] Instance road props and fences.
- [ ] Define near/mid/far LOD behavior.
- [ ] Replace distant interiors with opaque windows or simple shells.
- [ ] Disable distant animation and physics.
- [ ] Reduce distant NPC update frequency.
- [ ] Cull objects outside camera/frustum and relevance radius.

## Phase 3E: Performance budgets

Create measurable budgets for:

- [ ] maximum active cells;
- [ ] maximum active NPCs;
- [ ] maximum active traffic;
- [ ] maximum police response units;
- [ ] maximum draw calls;
- [ ] maximum triangles near player;
- [ ] maximum texture memory estimate;
- [ ] maximum synchronous work per frame;
- [ ] maximum asset size by category;
- [ ] maximum interior load time;
- [ ] maximum district transition hitch.

## Phase 3F: Performance acceptance

- [x] Capture bounded, copyable deployed-session evidence for frames, heap/render samples, saves, input, graphics, errors, and interior transitions.
- [x] Provide an all-twelve-interior lifecycle runner with exact catalog and exterior-return validation.
- [ ] Five-minute stationary soak.
- [ ] Fifteen-minute full-speed city drive.
- [ ] Repeated interior entry/exit.
- [ ] Police pursuit across districts.
- [ ] Heavy downtown traffic.
- [ ] School-zone crowd.
- [ ] Low-spec preset.
- [ ] Memory returns near baseline after leaving a dense district.
- [ ] No continual NPC, texture, or mixer growth.

Exit gate:

```txt
The empty large city can stream smoothly before final visual density is added.
```

---

# MILESTONE D: STARTER TOWN PHYSICAL CONSTRUCTION

# PHASE 4: REUSABLE ROAD, TERRAIN, AND NAVIGATION ENGINE

## Phase 4A: Road data model

- [ ] Define polyline road segments.
- [ ] Define road tiers: expressway, highway, parkway, arterial, collector, local, service, alley, bridge, tunnel, dirt, water, underwater.
- [ ] Define lane count, lane width, direction, speed, shoulder, median, sidewalk, curb, parking, markings, lighting, and surface.
- [ ] Define intersections separately from road segments.
- [ ] Define grade/elevation points.
- [ ] Define route restrictions and one-way rules.
- [ ] Define school zones and pedestrian-priority zones.
- [ ] Define district ownership.

## Phase 4B: Road geometry generation

- [ ] Generate asphalt along arbitrary angles.
- [ ] Generate curves from authored control points.
- [ ] Generate lane markings.
- [ ] Generate road edges and shoulders.
- [ ] Generate medians.
- [ ] Generate sidewalks and curbs.
- [ ] Generate collision.
- [ ] Generate bridge decks and tunnel surfaces later through the same interface.
- [ ] Avoid cracks at segment joins.
- [ ] Support material/texture variation by district and tier.

## Phase 4C: Intersections and special road forms

- [ ] Four-way intersections.
- [ ] T-intersections.
- [ ] Offset intersections.
- [ ] Roundabouts.
- [ ] Highway ramps.
- [ ] Merge and acceleration lanes.
- [ ] Cul-de-sacs.
- [ ] One-way alleys.
- [ ] Raised school crosswalks.
- [ ] Parking-lot entrances.
- [ ] Service/loading entrances.

## Phase 4D: Roadside placement rules

- [ ] Streetlight spacing.
- [ ] Traffic light placement.
- [ ] Stop/yield sign placement.
- [ ] Crosswalk placement.
- [ ] Guardrails.
- [ ] Retaining walls.
- [ ] Hydrants, drains, bins, benches, signs, and utility boxes.
- [ ] Parked-car pockets.
- [ ] No-prop road-clearance zones.
- [ ] Accessible door and sidewalk clearance.

## Phase 4E: Terrain and grade system

- [ ] Base terrain mesh/tiles.
- [ ] Civic Heights elevation.
- [ ] Road-following grades.
- [ ] Cut/fill terrain around roads.
- [ ] Retaining walls where grade changes sharply.
- [ ] Drainage and low areas.
- [ ] Park terrain.
- [ ] Industrial terrain.
- [ ] Residential terrain.
- [ ] Gateway terrain buffers.
- [ ] Future water shoreline hooks.

## Phase 4F: Navigation graphs

- [ ] Vehicle lane graph.
- [ ] Pedestrian graph.
- [ ] Police response graph.
- [ ] Mission routing graph.
- [ ] Delivery routing graph.
- [ ] Map route graph.
- [ ] Interior access graph.
- [ ] Off-road forbidden/allowed metadata.
- [ ] Dynamic closure hooks for missions/events.

## Phase 4G: Road validation tools

- [ ] Detect disconnected route segments.
- [ ] Detect impossible turns.
- [ ] Detect overlapping parcels/buildings.
- [ ] Detect props in lanes.
- [ ] Detect doors without sidewalk access.
- [ ] Detect traffic lights without intersection ownership.
- [ ] Detect pedestrian routes crossing unsafe areas.
- [ ] Detect unreachable police/service locations.
- [ ] Test player vehicle on every segment.
- [ ] Test NPC traffic on every route.

Exit gate:

```txt
Player cars, traffic, police, pedestrians, missions, and minimap routing all use the same authoritative road network.
```

---

# PHASE 5: STARTER TOWN GEOGRAPHIC SKELETON

## Phase 5A: Coordinate and boundary lock

- [ ] Create 2,400 x 2,400 terrain/streaming envelope.
- [ ] Create approximately 2,000 x 2,000 playable boundary.
- [ ] Place Starter Town origin.
- [ ] Place north Fishing Harbor gateway.
- [ ] Place east Rich Hills gateway.
- [ ] Reserve skyline and terrain buffers.
- [ ] Add developer boundary overlay.
- [ ] Add safe recovery when crossing unfinished boundaries.

## Phase 5B: District boundaries

Create and validate:

- [ ] Dreamdrop District.
- [ ] Market Mile.
- [ ] Northworks / Auto Row.
- [ ] Scholar's Quarter.
- [ ] Civic Heights.
- [ ] Eastgate Corridor.
- [ ] Parkside Commons.
- [ ] Willowbend Residential.
- [ ] Westside Blocks.

For each district:

- [ ] polygon/bounds;
- [ ] entry roads;
- [ ] visual identity record;
- [ ] traffic density profile;
- [ ] pedestrian profile;
- [ ] police profile;
- [ ] parcel density;
- [ ] skyline range;
- [ ] lighting/audio profile;
- [ ] service coverage.

## Phase 5C: Beltway and highways

- [ ] Dreamdrop Beltway complete loop.
- [ ] Northworks Expressway.
- [ ] Fishing Highway approach.
- [ ] Eastgate Parkway/Rich Hills approach.
- [ ] Ramps and merges.
- [ ] Guardrails and shoulders.
- [ ] Highway signage.
- [ ] Police and service access.
- [ ] Target full-loop drive time: 8-12 minutes.

## Phase 5D: Primary arterials

- [ ] Dreamdrop Boulevard.
- [ ] Centre Avenue.
- [ ] Civic Rise.
- [ ] Scholar Road.
- [ ] Parkside Crescent.
- [ ] Major Market Mile routes.
- [ ] Northworks industrial routes.
- [ ] Eastgate main corridor.

## Phase 5E: Local networks

- [ ] School Loop.
- [ ] Parkside roundabout.
- [ ] Willowbend residential streets.
- [ ] Willowbend cul-de-sacs.
- [ ] Market service roads.
- [ ] Civic service roads.
- [ ] Westside alleys.
- [ ] Northworks loading roads.
- [ ] Parking lots and driveways.

## Phase 5F: Terrain character

- [ ] Civic Heights hill reads clearly.
- [ ] Parkside has open green relief.
- [ ] Northworks feels industrial and flatter.
- [ ] Willowbend feels residential and quieter.
- [ ] Gateways feel like real departures from the city.
- [ ] No steep grade breaks vehicle physics.
- [ ] No road floats above or sinks beneath terrain.

## Phase 5G: Parcel plan

- [ ] Functional building parcels.
- [ ] Residential parcels.
- [ ] Commercial parcels.
- [ ] Civic parcels.
- [ ] School campus.
- [ ] Park parcels.
- [ ] Industrial parcels.
- [ ] Parking parcels.
- [ ] Purposeful empty lots.
- [ ] Future update parcels.
- [ ] No-build buffers around roads and gateways.

## Phase 5H: Geographic acceptance

- [ ] Home to School: 2.5-4 minutes legal driving.
- [ ] Home to WorkTower: 3-5 minutes.
- [ ] Home to Auto Haus: 4-6 minutes.
- [ ] West edge to east edge: 4-7 minutes.
- [ ] Full Beltway: 8-12 minutes.
- [ ] Every district reachable by car and foot.
- [ ] Police reach every public district.
- [ ] No impossible dead ends unless intentionally gated.

Exit gate:

```txt
Even with placeholder buildings, driving through Starter Town feels like crossing a real city.
```

---

# PHASE 6: DISTRICT MASSING, VISUAL IDENTITY, AND WORLD DRESSING

Asset creation remains external. This phase places registered final assets or safe placeholders.

## Phase 6A: District visual contracts

For each district, lock:

- [ ] material palette;
- [ ] building scale;
- [ ] roofline/skyline;
- [ ] density;
- [ ] road treatment;
- [ ] vegetation;
- [ ] lighting;
- [ ] signage;
- [ ] ambient audio;
- [ ] traffic mix;
- [ ] pedestrian mix;
- [ ] cleanliness/litter level;
- [ ] weather-response details.

## Phase 6B: Building massing

- [ ] Place functional building shells.
- [ ] Place residential blocks.
- [ ] Place commercial rows.
- [ ] Place industrial buildings.
- [ ] Place civic buildings.
- [ ] Place school campus massing.
- [ ] Place park structures.
- [ ] Place parking and loading areas.
- [ ] Place filler skyline buildings outside playable detail areas.
- [ ] Replace plain colored boxes with registered city assets/placeholders.
- [ ] Keep specialized locations visually distinct.

## Phase 6C: Streetscape

- [ ] Streetlights.
- [ ] Traffic signals.
- [ ] Street names.
- [ ] Directional signage.
- [ ] Bus shelters/stops if retained.
- [ ] Hydrants.
- [ ] Drains.
- [ ] Benches.
- [ ] Bins/dumpsters.
- [ ] Fences and barriers.
- [ ] Utility poles/boxes.
- [ ] Planters.
- [ ] Crosswalks.
- [ ] District entry markers.

## Phase 6D: Environmental presentation

- [ ] Day/night lighting.
- [ ] Interior-window lighting at distance.
- [ ] District ambience.
- [ ] Traffic ambience.
- [ ] Park ambience.
- [ ] Industrial ambience.
- [ ] Weather hook without blocking demo.
- [ ] Fog/skyline settings.
- [ ] Shadow-quality presets.

## Phase 6E: Visual-performance validation

- [ ] LOD assigned while placing content.
- [ ] Instancing used for repeated content.
- [ ] No transparent overdraw disasters.
- [ ] No unnecessarily unique materials.
- [ ] No full-detail interior visible from far exterior.
- [ ] No obvious unloaded holes during normal driving.
- [ ] District identity remains visible at low graphics settings.

---

# PHASE 7: FUNCTIONAL LOCATION MIGRATION AND EXPANSION

## Phase 7A: Shared relocation contract

Every functional location must complete this checklist:

- [ ] Stable location ID preserved.
- [ ] New exterior parcel assigned.
- [ ] Exterior prefab placed.
- [ ] Door interaction moved.
- [ ] Interior preserved or upgraded.
- [ ] Interior-return point moved.
- [ ] Sidewalk access verified.
- [ ] Parking/loading/service points moved.
- [ ] NPC work points moved.
- [ ] Mission checkpoints moved.
- [ ] Minimap marker moved.
- [ ] Police and delivery access verified.
- [ ] Collision verified.
- [ ] Save/load inside verified.
- [ ] Old coordinate migration added.
- [ ] Final asset can replace placeholder by ID.

## Phase 7B: Zaylins Home

- [ ] Relocate to Willowbend.
- [ ] Preserve rest, wardrobe, safe, hygiene, and haircut loops.
- [ ] Add property deed.
- [ ] Add primary residence state.
- [ ] Add mailbox/mission delivery.
- [ ] Add kitchen/food storage.
- [ ] Add home-upgrade interface.
- [ ] Add standardized future-home contract.

## Phase 7C: Zaylins Prep

- [ ] Relocate to Scholar's Quarter campus.
- [ ] Preserve classroom pack and teacher interaction.
- [ ] Preserve study/smarts foundation.
- [ ] Add school entrance, drop-off, parking, fields, and nurse room anchors.
- [ ] Prepare subject/classroom activity slots.
- [ ] Prepare school-job slots.
- [ ] Add school-zone traffic controls.

## Phase 7D: Chicken Spot

- [ ] Relocate to Dreamdrop District.
- [ ] Preserve purchase, eating, and paid shift.
- [ ] Integrate approved fryer, breading station, heated holding station, counter/POS, and future registered assets.
- [ ] Remove temporary stove/griddle artifacts.
- [ ] Add order queue, pickup, kitchen work, delivery pickup, and security anchors.
- [ ] Verify no asset blocks counter or door.

## Phase 7E: Frostbox

- [ ] Relocate to Dreamdrop District.
- [ ] Preserve jewelry purchase and chain builder.
- [ ] Add appraisal/cleaning activity hooks.
- [ ] Add employee and security anchors.
- [ ] Add theft consequence hooks.

## Phase 7F: Kicks & Fits

- [ ] Relocate to Market Mile.
- [ ] Preserve wardrobe/customization access.
- [ ] Add stockroom and retail-job anchors.
- [ ] Add security/theft hooks.
- [ ] Prepare future clothing asset expansion.

## Phase 7G: Block Supply

- [ ] Relocate to Westside/Market transition.
- [ ] Preserve all weapon/gear ownership and upgrades.
- [ ] Preserve hover-only item labels.
- [ ] Preserve approved wall-display layout.
- [ ] Add stockroom, clerk-job, alarm, and robbery anchors.
- [ ] Verify no weapon floats, intersects walls, or blocks exits.

## Phase 7H: Auto Haus

- [ ] Relocate to Northworks / Auto Row.
- [ ] Preserve purchases, owned cars, active car selection, and test drives.
- [ ] Move showroom, lot, spawn pads, and road-test start.
- [ ] Add lot-attendant job anchors.
- [ ] Add future financing/insurance hooks without blocking demo.

## Phase 7I: City Garage

- [ ] Relocate to Northworks.
- [ ] Preserve repair and Garage Hand shift.
- [ ] Add inspection, towing, impound, restitution, and job anchors.
- [ ] Verify repair updates persistent vehicle condition.

## Phase 7J: Police Station / Dreamdrop Public Safety

- [ ] Relocate to Civic Heights.
- [ ] Preserve front desk, cruisers, evidence hook, cell hook, and legal fee.
- [ ] Add booking route.
- [ ] Add visitation.
- [ ] Add evidence recovery.
- [ ] Add impound terminal.
- [ ] Add community-service intake.
- [ ] Add academy/training wing.
- [ ] Add fire/rescue exterior dressing or future hook.

## Phase 7K: WorkTower

- [ ] Relocate to Civic Heights.
- [ ] Preserve office shift and manager interaction.
- [ ] Add job board.
- [ ] Add career progression interface.
- [ ] Add property desk.
- [ ] Add bank/paycheck kiosk.
- [ ] Add city-services counter.
- [ ] Add community health room.
- [ ] Add courier hub.

## Phase 7L: Iron City Gym

- [ ] Relocate to Parkside Commons.
- [ ] Preserve workout profiles and stat effects.
- [ ] Add gym-assistant job.
- [ ] Add park/gym challenge hooks.
- [ ] Add membership progression only if it improves gameplay.

## Phase 7M: 6twelve

- [ ] Relocate to Eastgate Corridor.
- [ ] Preserve snacks, drinks, and refueling.
- [ ] Move pumps, store door, parking, and highway approach.
- [ ] Add fuel-attendant job.
- [ ] Add charging hook.
- [ ] Add package lockers/delivery activity.
- [ ] Add travel information.
- [ ] Add security/crime consequences.

## Phase 7N: Dreamdrop Park

- [ ] Expand in Parkside Commons.
- [ ] Add paths, seating, activity zones, lighting, and landscaping.
- [ ] Add park challenges.
- [ ] Add sanitation work points.
- [ ] Add social/NPC gathering points.
- [ ] Keep vehicle access controlled.

Exit gate:

```txt
Every current gameplay loop works at its final Starter Town location and no mission points to the retired compact grid.
```

---

# MILESTONE E: LIVING STARTER TOWN

# PHASE 8: POPULATION, TRAFFIC, POLICE, AND CITY SCHEDULES

## Phase 8A: Pedestrian population

- [ ] District-specific spawn sets.
- [ ] Time-of-day density.
- [ ] Work/school/home/park/store destinations.
- [ ] Pedestrian route following.
- [ ] Safe crossing behavior.
- [ ] Interior enter/exit simulation where useful.
- [ ] Seated, standing, shopping, working, and social idles.
- [ ] Distance-based update throttling.
- [ ] No spawn in player view when avoidable.
- [ ] No crowd pileups at doors.

## Phase 8B: Traffic population

- [ ] District-specific vehicle mix.
- [ ] Rush-hour profiles.
- [ ] School traffic.
- [ ] Delivery traffic.
- [ ] Industrial traffic.
- [ ] Highway travelers.
- [ ] Parked-car rules.
- [ ] Traffic-light and sign compliance.
- [ ] Lane changing and merging.
- [ ] Recovery from stuck vehicles.
- [ ] Despawn without visible popping.

## Phase 8C: City schedules

- [ ] Morning.
- [ ] School start.
- [ ] Workday.
- [ ] Afternoon.
- [ ] Evening.
- [ ] Night.
- [ ] Business open/closed states.
- [ ] NPC role schedules.
- [ ] Lighting schedule.
- [ ] Traffic schedule.
- [ ] Police schedule.

## Phase 8D: Police simulation

- [ ] Patrol zones.
- [ ] Foot patrols.
- [ ] Cruiser patrols.
- [ ] Highway response.
- [x] Road-node dispatch routing for active wanted response.
- [ ] Witness reports.
- [ ] Alarm calls.
- [x] Pursuit escalation.
- [x] Search/hiding behavior.
- [ ] District response differences.
- [x] Wanted-resolution cleanup and despawn.
- [x] Deterministic 1–5 star response staffing within the low-spec police budget.
- [x] Named officer/cruiser pooling with reset and release contracts.
- [x] Stolen-cruiser ownership transfer that survives pursuit cleanup.
- [x] Distant pursuit update throttling and far-unit recycling.

## Phase 8E: Dialogue framework

- [x] Multi-step controllable conversations.
- [x] Player response choices.
- [x] Conditional lines based on mission, stats, crime, reputation, flags, and relationship.
- [x] Conversation relationship and repeat-visit persistence.
- [x] Clean exit and working-service handoff behavior.
- [x] No offers for planned quests until their gameplay is runtime-ready.
- [ ] Reusable speaker and portrait rules.
- [ ] Localization-ready text IDs.

## Phase 8F: Dynamic city events

- [ ] Minor traffic incidents.
- [ ] Deliveries.
- [ ] Lost-item or assistance events.
- [ ] Store alarms.
- [ ] Police calls.
- [ ] School/park events.
- [ ] Weather/event hooks later.
- [ ] Events obey performance budget.

---

# PHASE 9: LIFE SIMULATION, SCHOOL, JOBS, AND ECONOMY

## Phase 9A: Housing and property

- [ ] Property ownership model.
- [ ] Primary residence.
- [ ] Spawn/rest/storage rules.
- [ ] Property purchase requirements.
- [ ] Home upgrades.
- [ ] Multiple-home future compatibility.
- [ ] Property map markers.
- [ ] Property loss/recovery rules if any.

## Phase 9B: Needs and daily life

- [ ] Health.
- [ ] Energy.
- [ ] Hunger.
- [ ] Hygiene.
- [ ] Fun.
- [ ] Fitness.
- [ ] Smarts.
- [ ] Clear need effects without annoying micromanagement.
- [ ] Food categories.
- [ ] Rest quality.
- [ ] Hygiene actions.
- [ ] Illness/injury hooks only if they improve play.
- [ ] Balanced time progression.

## Phase 9C: School curriculum

- [ ] Subject-selection UI.
- [ ] Math activity.
- [ ] Reading/memory activity.
- [ ] Computer basics.
- [ ] Civics/law.
- [ ] Health/needs.
- [ ] Career lesson.
- [ ] Driver education.
- [ ] Physical education.
- [ ] Arts/rhythm foundation.
- [ ] Map/geography lesson.
- [ ] Attendance/progress tracking.
- [ ] Foundation Certificate.
- [ ] Skill prerequisites for jobs/careers.
- [ ] School nurse.
- [ ] School jobs.

## Phase 9D: Jobs and careers

- [ ] Shared job contract.
- [ ] Application and prerequisites.
- [ ] Start/end shift lifecycle.
- [ ] Task variety.
- [ ] Performance scoring.
- [ ] Time and stat costs.
- [ ] Pay calculation.
- [ ] Promotions/titles.
- [ ] Failure and quitting.
- [ ] Job restrictions after serious crime.
- [ ] Repeatable shifts without exploit.
- [ ] Current jobs deepened: Chicken Spot, WorkTower, Garage, sanitation.
- [ ] New Starter Town jobs: retail, supply clerk, jewelry assistant, gym assistant, lot attendant, fuel attendant, courier, school support, police later.

## Phase 9E: Economy and inventory

- [ ] DreamBucks ledger.
- [ ] Transaction-safe purchases.
- [ ] Income sources.
- [ ] Fines and fees.
- [ ] Item ownership.
- [ ] Consumables.
- [ ] Equipment.
- [ ] Vehicle ownership.
- [ ] Property ownership.
- [ ] Refund/recovery rules for failed transactions.
- [ ] Prevent duplicate purchases and negative money bugs.
- [ ] Price/balance config outside UI code.

## Phase 9F: Healthcare and recovery

- [ ] Basic city health room/clinic.
- [ ] Injury recovery.
- [ ] Arrest release recovery.
- [ ] Vehicle-stranding recovery.
- [ ] Stuck-player recovery.
- [ ] Needs-critical recovery.
- [ ] Fair cost and no permanent softlock.

## Phase 9G: City services hub

- [ ] Job information.
- [ ] Property desk.
- [ ] Bank/paycheck service.
- [ ] Community service.
- [ ] Travel information.
- [ ] City map/help.
- [ ] Lost/stuck recovery explanation.
- [ ] Police/legal information.

---

# PHASE 10: VEHICLES, GARAGE, FUEL, AND TRAVEL READINESS

## Phase 10A: Vehicle ownership and persistence

- [ ] Stable vehicle IDs.
- [ ] Owned vehicle list.
- [ ] Active vehicle.
- [ ] Vehicle condition.
- [ ] Fuel/charge.
- [ ] Location/storage state.
- [ ] Stolen status.
- [ ] Impound status.
- [ ] Insurance/reclaim state if retained.
- [ ] Prevent duplicate active vehicle spawns.

## Phase 10B: Driving polish

- [ ] Acceleration/braking balance.
- [ ] Steering at different speeds.
- [ ] Reverse.
- [ ] Camera.
- [ ] Collision response.
- [ ] Vehicle enter/exit placement.
- [ ] Slope behavior.
- [ ] Highway stability.
- [ ] Parking.
- [ ] Controller/touch later.

## Phase 10C: Fuel and charging

- [ ] Fuel consumption by vehicle.
- [ ] Refueling transaction.
- [ ] Empty-fuel behavior.
- [ ] Safe tow/recovery.
- [ ] Fuel map marker.
- [ ] Charging interface hook.

## Phase 10D: Damage and repair

- [ ] Damage layers.
- [ ] Visual damage.
- [ ] Performance effects.
- [ ] Repair estimate.
- [ ] Repair transaction.
- [ ] Garage work activity.
- [ ] Save persistence.

## Phase 10E: Towing, impound, and recovery

- [ ] Tow request.
- [ ] Garage Concierge safe delivery.
- [ ] Police impound.
- [ ] Impound fees.
- [ ] Stolen-car recovery.
- [ ] Vehicle lost outside loaded world recovery.
- [ ] Valid delivery nodes by district.

## Phase 10F: Driver education and road test

- [ ] School lesson prerequisite.
- [ ] Road-test route from Auto Haus/approved location.
- [ ] Stops, turns, signals, parking, speed, and collision checks.
- [ ] Pass/fail feedback.
- [ ] License state.
- [ ] Police consequences for violations if retained.

---

# PHASE 11: CRIME, CONSEQUENCES, AND POLICE CAREER

## Phase 11A: Offense model

- [ ] Offense IDs and severity.
- [ ] Assault.
- [ ] Theft.
- [ ] Vehicle theft.
- [ ] Robbery.
- [ ] Property damage.
- [ ] Trespass/restricted access if used.
- [ ] Traffic violations.
- [ ] Wanted contribution.
- [ ] Evidence and witness data.

## Phase 11B: Wanted and response

- [ ] Witness detection.
- [ ] Alarm detection.
- [ ] Dispatch.
- [ ] Search radius.
- [ ] Pursuit.
- [ ] Hiding/losing heat.
- [ ] Escalation/de-escalation.
- [ ] Foot versus vehicle response.
- [ ] District response times.

## Phase 11C: Arrest and booking

- [ ] Surrender/bust state.
- [ ] Weapon and stolen-item confiscation.
- [ ] Booking summary.
- [ ] Fine/bail/jail/community-service outcomes.
- [ ] Holding cell.
- [ ] Release location.
- [ ] Mission cleanup.
- [ ] Vehicle impound.

## Phase 11D: Persistent consequences

- [ ] Official conviction record.
- [ ] Hidden uncaught-history separation.
- [ ] Job bans/restrictions.
- [ ] Police-career eligibility.
- [ ] Restitution.
- [ ] Store hostility or security where appropriate.
- [ ] Reform/recovery paths.
- [ ] No permanent unwinnable state.

## Phase 11E: Police academy and career

- [ ] Eligibility rules.
- [ ] Starter Town conviction permanently blocks Starter Town police employment.
- [ ] Application.
- [ ] Academy lessons.
- [ ] Driving/traffic training.
- [ ] Evidence training.
- [ ] Dispatch training.
- [ ] Cadet tasks.
- [ ] Patrol tasks.
- [ ] Community calls.
- [ ] Traffic stops.
- [ ] Store alarms.
- [ ] Stolen vehicles.
- [ ] Highway calls.
- [ ] Pursuits.
- [ ] Ranks, pay, discipline, and promotions.

---

# PHASE 12: UI, MAPS, SETTINGS, AND ACCESSIBILITY

## Phase 12A: HUD cleanup

- [ ] Wallet.
- [ ] Time/day.
- [ ] Location/district.
- [ ] Job/status.
- [ ] Needs/stats.
- [ ] Wanted.
- [ ] Active mission.
- [ ] Equipped item.
- [ ] Responsive scaling.
- [ ] No overlapping panels.
- [ ] No stale old-interface elements.

## Phase 12B: Interaction UI

- [ ] Hover/proximity-only labels.
- [ ] Context prompt.
- [ ] Disabled reason.
- [ ] Hold progress where needed.
- [ ] Conversation choices.
- [ ] Shop details.
- [ ] Job/activity instructions.
- [ ] Clear success/failure feedback.

## Phase 12C: Minimap and city map

- [ ] District-aware minimap.
- [ ] Road hierarchy.
- [ ] Player facing.
- [ ] Mission route.
- [ ] Functional markers.
- [ ] Discovered locations.
- [ ] Gateway markers.
- [ ] Full Starter Town map.
- [ ] Route planning.
- [ ] Zoom and legend.

## Phase 12D: Menus

- [ ] Inventory.
- [ ] Wardrobe.
- [ ] Character Studio.
- [ ] Vehicles/garage.
- [ ] Properties.
- [ ] School.
- [ ] Jobs/career.
- [ ] Missions.
- [ ] Police record/career where appropriate.
- [ ] Settings.
- [ ] Help/tutorial recap.

## Phase 12E: Accessibility and settings

- [ ] UI scale.
- [ ] Text size.
- [ ] Subtitle options.
- [ ] Color-independent status signals.
- [ ] Motion/camera options.
- [ ] Volume categories.
- [ ] Graphics presets.
- [ ] Control instructions.
- [ ] Remapping where practical.
- [ ] Reduce flashing/rapid effects.
- [ ] Kid-readable language.

## Phase 12F: Loading and transitions

- [ ] Initial loading screen.
- [ ] Character Studio transition.
- [ ] Interior transition.
- [ ] Town transition later.
- [ ] Loading progress represents real work.
- [ ] Input locked safely during transitions.
- [ ] Failure recovery.
- [ ] Subtle dream-hop language only where appropriate.

---

# PHASE 13: OPENING, TUTORIAL, MISSIONS, DIALOGUE, AND MINIGAME INTEGRATION

## Phase 13A: Opening sequence

- [ ] Movie-marathon setup.
- [ ] Falling asleep transition.
- [ ] Subtle dream-world arrival.
- [ ] Character creation placement.
- [ ] Home Base introduction.
- [ ] Skip/replay rules.

## Phase 13B: Shared onboarding

- [ ] Movement.
- [ ] Camera.
- [ ] Interaction.
- [ ] Needs.
- [ ] Home/rest/storage.
- [ ] Food.
- [ ] Inventory.
- [ ] Map/minimap.
- [ ] School.
- [ ] Jobs.
- [ ] Vehicles.
- [ ] Save/return expectations.

## Phase 13C: Legal tutorial path

- [ ] Attend school or orientation.
- [ ] Choose a legal starter job.
- [ ] Complete a shift.
- [ ] Receive paycheck.
- [ ] Buy food or useful item.
- [ ] Learn city services.
- [ ] Finish without assault, robbery, or theft.

## Phase 13D: Risky tutorial path

- [ ] Optional low-level crime introduction.
- [ ] Witness/wanted explanation.
- [ ] Hiding or arrest outcome.
- [ ] Fine/community-service/recovery explanation.
- [ ] Path remains optional.

## Phase 13E: Observer/police path

- [ ] Visit police front desk.
- [ ] Learn offense/consequence system.
- [ ] Learn academy prerequisites.
- [ ] No crime required.

## Phase 13F: Mission architecture

- [ ] Mission IDs.
- [ ] Prerequisites.
- [ ] Objectives.
- [ ] Optional objectives.
- [ ] Branches.
- [ ] Fail/retry.
- [ ] Rewards.
- [ ] Save state.
- [ ] Location-independent targets by stable ID.
- [ ] Town/district routing.
- [ ] Cleanup on completion/cancel.

## Phase 13G: Starter Town mission set

- [ ] Home introduction.
- [ ] School introduction.
- [ ] First job.
- [ ] First paycheck/purchase.
- [ ] Driving/fuel/repair.
- [ ] Legal/risky/observer branch.
- [ ] District exploration.
- [ ] World gateway tease.
- [ ] Starter Town demo finale or free-play unlock.

## Phase 13H: Minigame integration contract

Asset/minigame design is external; integration uses one lifecycle:

- [ ] Start.
- [ ] Instructions.
- [ ] Input ownership.
- [ ] Pause/cancel.
- [ ] Timer if relevant.
- [ ] Scoring.
- [ ] Success/failure.
- [ ] Stat/time/money effects.
- [ ] Mission callback.
- [ ] Save safety.
- [ ] Cleanup and return to world.
- [ ] Mobile/controller readiness later.
- [ ] No developer payload or implementation notes in kid-facing UI.

---

# MILESTONE F: STARTER TOWN PLAYABLE DEMO

# PHASE 14: STARTER TOWN INTEGRATION, QA, AND DEMO RELEASE

## Phase 14A: Feature-complete audit

- [ ] Every Phase 2-13 required demo item complete or explicitly deferred.
- [ ] Every functional building reachable and working.
- [ ] Legal path complete.
- [ ] Risky path complete.
- [ ] Observer path complete.
- [ ] School, job, food, housing, vehicle, repair, police, and save loops functional.

## Phase 14B: Full-city regression

- [ ] Full Beltway drive.
- [ ] Every district by car.
- [ ] Every district on foot where intended.
- [ ] Every functional door.
- [ ] Every interior return.
- [ ] Every shop transaction.
- [ ] Every current job.
- [ ] Every tutorial branch.
- [ ] Police pursuit through every district.
- [ ] Save/load in every major state.

## Phase 14C: Visual QA

- [ ] No placeholder boxes where an approved asset exists.
- [ ] No floating or buried buildings/props.
- [ ] No blocked doors.
- [ ] No permanent clutter labels.
- [ ] No character T-pose in normal gameplay.
- [ ] No duplicate NPC fallback bodies.
- [ ] No weapon-display overlap.
- [ ] No old/new UI duplication.
- [ ] Districts visually distinct.

## Phase 14D: Performance QA

- [ ] Low preset.
- [ ] Medium preset.
- [ ] High preset.
- [ ] Full-speed traversal.
- [ ] Dense crowd.
- [ ] Dense traffic.
- [ ] Police response.
- [ ] Repeated interiors.
- [ ] 60-minute session.
- [ ] Memory stabilizes.
- [ ] No progressive lag.

## Phase 14E: Save and migration QA

- [ ] Fresh save.
- [ ] Old save.
- [ ] Character appearance.
- [ ] Inventory.
- [ ] Money.
- [ ] Vehicles.
- [ ] Property.
- [ ] School.
- [ ] Jobs.
- [ ] Missions.
- [ ] Crime record.
- [ ] Police career.
- [ ] World discovery.
- [ ] Corruption recovery.

## Phase 14F: Browser/device QA

- [ ] Supported desktop browsers.
- [ ] Common screen resolutions.
- [ ] Browser zoom.
- [ ] Keyboard/mouse.
- [ ] Touch path if supported for demo.
- [ ] Audio permissions.
- [ ] Background-tab recovery.
- [ ] Refresh/reload.
- [ ] Slow-network asset loading.

## Phase 14G: Demo release

- [ ] Freeze demo feature set.
- [ ] Final production build.
- [ ] Final automated quality gates.
- [ ] Live deployment.
- [ ] Live smoke test.
- [ ] Rollback plan.
- [ ] Known-issues list.
- [ ] Tag Starter Town demo version.

Starter Town demo definition of done:

```txt
A new player can play 60-90 minutes, customize a character, live legally,
choose optional crime, attend school, work, drive, refuel, repair, interact
with police, explore the full city, save, leave, and return without a blocker.
```

---

# MILESTONE G: CONNECTED WORLD FOUNDATION

# PHASE 15: GLOBAL WORLD AND INTER-TOWN TRAVEL

## Phase 15A: Global coordinate and terrain system

- [ ] Global town origins.
- [ ] Global terrain tiles.
- [ ] Biome transitions.
- [ ] Far skyline/town silhouettes.
- [ ] World streaming hierarchy.
- [ ] Water/depth coordinate support.

## Phase 15B: Travel routes

- [ ] Starter-to-Fishing Highway.
- [ ] Starter-to-Rich Hills Parkway.
- [ ] Future highways.
- [ ] Bridges.
- [ ] Tunnels.
- [ ] Dirt roads.
- [ ] Sea routes.
- [ ] Underwater routes.
- [ ] Service/fuel/recovery placement.

## Phase 15C: Gateway rules

- [ ] Physical first visit.
- [ ] Discovery state.
- [ ] Preload destination.
- [ ] Save during travel.
- [ ] Failure recovery.
- [ ] No instant teleport before intended discovery.
- [ ] Optional synchronized travel later.

## Phase 15D: World map

- [ ] Town positions.
- [ ] Major routes.
- [ ] Discovered/undiscovered states.
- [ ] Route conditions.
- [ ] Travel estimates.
- [ ] Player and vehicle location.
- [ ] Gateway status.

Exit gate:

```txt
The player can physically leave Starter Town and reach the first neighboring town through streamed terrain.
```

---

# PHASE 16: REUSABLE TOWN FRAMEWORK

## Phase 16A: Town lifecycle

- [ ] Register town.
- [ ] Load/unload town.
- [ ] Discover town.
- [ ] Enter district.
- [ ] Save town state.
- [ ] Restore town state.
- [ ] Town-specific graphics/audio profile.

## Phase 16B: Standard civic contract

Every town must have:

- [ ] housing;
- [ ] school/training;
- [ ] multiple jobs;
- [ ] law jurisdiction;
- [ ] food;
- [ ] health/recovery;
- [ ] fuel/charge/mechanic or equivalent;
- [ ] transportation;
- [ ] local map;
- [ ] signature activities;
- [ ] crime consequences;
- [ ] lasting progression.

## Phase 16C: Reusable system templates

- [ ] Property template.
- [ ] School template.
- [ ] Job template.
- [ ] Shop template.
- [ ] Police/law template.
- [ ] Fuel/service template.
- [ ] Health template.
- [ ] Minigame template.
- [ ] Mission template.
- [ ] Town-introduction template.
- [ ] Town completion QA template.

Exit gate:

```txt
New towns are assembled from proven systems and data instead of copied Starter Town code.
```

---

# MILESTONE H: TOWN-BY-TOWN WORLD EXPANSION

Each town phase follows this internal order:

```txt
A. Technical skeleton and routes
B. District boundaries and terrain
C. Visual massing and asset integration
D. Housing and services
E. School/training
F. Jobs and economy
G. Law and consequences
H. Signature gameplay
I. Missions and progression
J. Performance and QA
```

# PHASE 17: WATER SYSTEM FOUNDATION

- [ ] Swimming.
- [ ] Breath.
- [ ] Drowning prevention and rescue.
- [ ] Shoreline transitions.
- [ ] Water currents.
- [ ] Boats.
- [ ] Docks.
- [ ] Fishing/catch data foundation.
- [ ] Water streaming.
- [ ] Underwater camera and visibility.
- [ ] Sea-life spawning.
- [ ] Crownwater Basin foundation.

# PHASE 18: FISHING HARBOR

- [ ] Harbor routes and districts.
- [ ] Housing.
- [ ] Harbor Academy.
- [ ] Harbor jobs.
- [ ] Harbor Patrol.
- [ ] TideFuel and mechanics.
- [ ] Food/market/clinic/recovery.
- [ ] Fishing and catches.
- [ ] Boats and docks.
- [ ] Gillyfish progression foundation.
- [ ] Rare-catch routes.
- [ ] Town missions and QA.

# PHASE 19: OBBY CANYON

- [ ] Drivable canyon base town.
- [ ] Housing and services.
- [ ] Momentum Academy.
- [ ] Jobs.
- [ ] Canyon Ranger/law.
- [ ] Fuel and recovery.
- [ ] Vertical course framework.
- [ ] Checkpoints and timers.
- [ ] Rescue and reset.
- [ ] Rewards and authored courses.
- [ ] Town missions and QA.

# PHASE 20: DUNGEON OUTSKIRTS

- [ ] Surface outpost.
- [ ] Housing and services.
- [ ] Adventurer Academy.
- [ ] Jobs and crafting.
- [ ] Warden/Ranger law system.
- [ ] Healer, shrine, fuel, and stash.
- [ ] Dungeon instance/floor lifecycle.
- [ ] Combat framework expansion.
- [ ] Traps.
- [ ] Puzzles.
- [ ] Loot.
- [ ] Bosses.
- [ ] Extraction and save safety.
- [ ] Town missions and QA.

# PHASE 21: TECHTOWN

- [ ] Dense smart-city streaming.
- [ ] Transit system.
- [ ] Housing and services.
- [ ] VoltByte Academy.
- [ ] Tech jobs.
- [ ] Metro Security.
- [ ] VoltFuel/charging.
- [ ] Drones.
- [ ] Robotics.
- [ ] Coding/automation activities.
- [ ] Gadget Forge.
- [ ] GridLink purchase/synchronization.
- [ ] Town missions and QA.

# PHASE 22: RICH HILLS

- [ ] Switchback roads.
- [ ] Estates and worker/service district.
- [ ] Housing/property progression.
- [ ] Academy.
- [ ] Jobs and hospitality.
- [ ] Police/security response.
- [ ] Clinic and CrestFuel.
- [ ] Country club/golf.
- [ ] Luxury vehicles.
- [ ] Marina and yachts.
- [ ] Worker economy.
- [ ] Town missions and QA.

# PHASE 23: CASINO STRIP

- [ ] Hotels and worker housing.
- [ ] Arena and shows.
- [ ] Game halls and arcade.
- [ ] Prize pavilion.
- [ ] Academy.
- [ ] Jobs and hospitality.
- [ ] Strip Police/security.
- [ ] Fuel, food, clinic, and transport.
- [ ] Fictional currencies.
- [ ] Probability education.
- [ ] Non-predatory kid-safe game design.
- [ ] Town missions and QA.

# PHASE 24: STARLINE CITY

- [ ] Studios and backlots.
- [ ] Theaters and music venues.
- [ ] Fashion district.
- [ ] Worker housing and hillside homes.
- [ ] Academy.
- [ ] Jobs and production careers.
- [ ] Police and services.
- [ ] Performance/rhythm systems.
- [ ] Reputation and media progression.
- [ ] Events.
- [ ] Town missions and QA.

# PHASE 25: AQUALUME AND ABYSSAL EDGE

- [ ] Gillyfish permanent-gills progression.
- [ ] Lighthouse Trench discovery.
- [ ] Moonpool synchronization.
- [ ] Underwater city streaming.
- [ ] Housing and services.
- [ ] Tideglass Academy.
- [ ] Current Guard.
- [ ] Jobs and economy.
- [ ] Coral Market and Bluecore.
- [ ] Sea scooters and mini-subs.
- [ ] Sea-life systems.
- [ ] Abyssal Edge late-game zone.
- [ ] Town missions and QA.

---

# MILESTONE I: FULL GAME COMPLETION

# PHASE 26: CROSS-WORLD STORY AND PROGRESSION

- [ ] Main story arc.
- [ ] Town introduction arcs.
- [ ] Cross-town prerequisites.
- [ ] School/certificate progression.
- [ ] Career progression.
- [ ] Property progression.
- [ ] Vehicle progression.
- [ ] Skill progression.
- [ ] Law/reform progression.
- [ ] Police career progression.
- [ ] Gillyfish progression.
- [ ] GridLink progression.
- [ ] Aqualume progression.
- [ ] Optional crime and legal paths remain viable.
- [ ] Ending.
- [ ] Postgame loops.

# PHASE 27: ECONOMY, BALANCE, AND CONTENT DEPTH

- [ ] DreamBucks earning curve.
- [ ] Wages.
- [ ] Food prices.
- [ ] Clothing/accessory prices.
- [ ] Vehicles.
- [ ] Property.
- [ ] Fuel and repairs.
- [ ] Fines and restitution.
- [ ] Travel.
- [ ] Upgrades.
- [ ] Town-specific currencies where designed.
- [ ] Prevent grind walls.
- [ ] Prevent runaway inflation.
- [ ] Reward revisits and specialization.
- [ ] Balance needs against fun.
- [ ] Balance legal and risky progression.

# PHASE 28: WHOLE-WORLD TECHNICAL HARDENING

- [ ] Long-session memory testing.
- [ ] Cross-town streaming stress.
- [ ] Large save testing.
- [ ] Save migration testing.
- [ ] High NPC/traffic stress.
- [ ] Asset and texture budget enforcement.
- [ ] CDN/network failure recovery.
- [ ] Browser/device compatibility.
- [ ] Graphics presets.
- [ ] Error reporting without exposing developer internals.
- [ ] Deployment rollback.

# PHASE 29: ACCESSIBILITY, SAFETY, CREDITS, AND LEGAL REVIEW

- [ ] Accessibility pass.
- [ ] Kid-facing language review.
- [ ] Violence/crime tone review.
- [ ] Casino/probability safety review.
- [ ] No real-money gambling conversion.
- [ ] No developer payloads in gameplay UI.
- [ ] Third-party license review.
- [ ] Credits.
- [ ] Privacy/data review for deployed game.
- [ ] Community/reporting features only if safely supported.

# PHASE 30: RELEASE CANDIDATE AND LAUNCH

- [ ] Feature freeze.
- [ ] Content freeze.
- [ ] Asset freeze.
- [ ] Save-format freeze with migration support.
- [ ] Full regression matrix.
- [ ] Every town completion checklist.
- [ ] Every route and gateway.
- [ ] Every interior.
- [ ] Every job and school.
- [ ] Every police/law path.
- [ ] Every mission and minigame.
- [ ] Target-hardware performance acceptance.
- [ ] Final production deployment.
- [ ] Rollback plan.
- [ ] Launch candidate approval.
- [ ] Public launch.

# PHASE 31: POST-LAUNCH SUPPORT

- [ ] Crash/bug triage.
- [ ] Save emergency recovery.
- [ ] Performance monitoring.
- [ ] Balance patches.
- [ ] Accessibility fixes.
- [ ] Asset/content updates.
- [ ] New clothes, hair, vehicles, missions, and town content through existing pipelines.
- [ ] Preserve compatibility with old saves.

---

# IMMEDIATE NEXT COMMAND

The next implementation command should be:

```txt
Start Phase 2A: Runtime world registry.
```

Phase 2A must be completed before large-scale roads or district construction begin. The Asset Lab may continue independently during Phases 2-5, because placeholders and stable asset IDs allow construction to proceed without waiting for every final model.
