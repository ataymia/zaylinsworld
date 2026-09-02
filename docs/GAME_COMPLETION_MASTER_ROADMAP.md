# Zaylins Game Completion Master Roadmap

Status: implementation master plan  
Project: Zaylins Kid World, also called ZTA  
Primary near-term target: a polished, browser-playable Starter Town demo  
Long-term target: the complete connected world

This roadmap connects the completed world design, the current playable runtime, the modular character system, the ongoing asset-production workflow, story and minigame planning, and release QA into one build order.

The world-design phase is complete. The next job is not to invent more geography. The next job is to build the approved geography and systems without losing the working game underneath them.

---

## 1. Authoritative planning order

Before implementing any town, read the planning documents in this order:

1. `WORLD_DESIGN_HANDOFF.md`
2. `WORLD_BLUEPRINT_INDEX.md`
3. the applicable town master blueprint
4. `LARGE_WORLD_SCALE_BLUEPRINT.md`
5. `WORLD_MAP_DESIGN.md`
6. `CITY_BLUEPRINT_STANDARD.md`
7. `WORLD_VISUAL_REFERENCE_BIBLE.md`
8. `TOWN_SELF_SUSTAINING_SYSTEMS.md`
9. `POLICE_CAREER_SYSTEM.md`
10. `WORLD_TRAVEL_VEHICLE_AND_RECOVERY_SYSTEMS.md`
11. the applicable implementation checklist
12. this roadmap

Planning data contracts:

- `src/config/worldMapPlan.js`
- `src/config/townThemes.js`
- `src/config/worldSystemsPlan.js`

When old planning documents conflict with newer master documents, the newer master document wins.

Starter Town uses the locked large-world values:

```txt
Playable footprint: approximately 2,000 x 2,000
Terrain/streaming envelope: approximately 2,400 x 2,400
Connected initial world: approximately 22,000 x 20,000 plus water and depth
Starter Town center: world origin (0, 0)
```

Retired compact-map values must not be used as the final city size.

---

## 2. Product milestones

### Milestone A: Starter Town Internal Alpha

The entire city skeleton exists, all current mechanics survive relocation, and developers can drive across every district.

### Milestone B: Starter Town Playable Demo

A new player can create a character, claim a home, attend school, take a job, buy food, drive, refuel, repair a car, interact with police, choose a legal or risky path, save, leave, and return without a blocker.

### Milestone C: Connected World Alpha

Starter Town connects physically to at least one neighboring town through streamed terrain and a real travel corridor.

### Milestone D: Full World Beta

All planned towns exist with their required civic systems, signature gameplay, housing, school, jobs, law, services, and travel.

### Milestone E: Release Candidate

The complete game is stable, balanced, optimized, accessible, save-safe, and content-complete for launch.

---

## 3. Parallel workstreams

These lanes run together but meet at phase gates.

### Runtime implementation

- world architecture
- roads and terrain
- streaming and LOD
- gameplay systems
- save state
- UI and maps
- AI, traffic, police, and interactions

### Asset production

- preview image
- approval or revision
- source asset
- optimized runtime GLB
- collision and interaction metadata
- LOD variants
- asset registry entry
- runtime placement
- visual QA

### Story and activities

- opening and tutorial
- mission chains
- dialogue
- jobs
- school lessons
- minigames
- town progression
- optional crime routes

### QA and release

- regression tests
- live visual checks
- performance budgets
- save migration
- browser/device testing
- accessibility
- deployment checks

No lane should silently change another lane's approved contract.

---

# MILESTONE A-B: STARTER TOWN DEMO

## Phase 0: Branch convergence and construction safety

Goal: combine the finished world-planning work on `main` with the character/runtime work on `agent/starter-town-finish` before map construction.

Current risk: the character branch is ahead of and behind `main`. Building directly on the unsynchronized branch would omit the new world blueprints.

Checklist:

- [ ] Tag or record the current known-good character branch head.
- [ ] Record the current `main` head containing the completed world design.
- [ ] Merge or rebase `main` into the construction branch using a reviewed conflict-resolution pass.
- [ ] Preserve the modular player, NPC, Block Supply, Chicken Spot, school, police, and performance fixes.
- [ ] Preserve all world-blueprint documents and planning config files from `main`.
- [ ] Run syntax, smoke, character-policy, player-runtime, build, character-audit, and asset-audit checks.
- [ ] Deploy the synchronized branch and confirm the current game still loads.
- [ ] Create a construction checkpoint tag or branch before altering the map.

Exit gate:

```txt
One branch contains both the approved world design and the working character/runtime foundation.
```

---

## Phase 1: Character and NPC foundation lock

Goal: stop treating character work as the active bottleneck while preserving a scalable customization system.

Checklist:

- [x] One explicit modular player pipeline.
- [x] Character Studio with body, face, skin, eyes, clothes, hair, accessories, and saved looks.
- [x] Imported hairstyles mapped through a reusable attachment contract.
- [x] Whole-body attachment blueprint for future hair, clothes, shoes, facial hair, glasses, and jewelry.
- [x] Direct imported NPC visuals with staged loading and procedural fallback.
- [x] Relaxed player and NPC arm pose foundation.
- [ ] Final live visual approval of the latest two-notch hair seat.
- [ ] Verify every current hairstyle at minimum, maximum, and default body/height settings.
- [ ] Verify hats, glasses, facial hair, jewelry, tops, bottoms, and shoes across body extremes.
- [ ] Verify NPC swaps never leave duplicate bubble bodies visible.
- [ ] Verify police visual, weapon grip, vehicle entry, and interior transitions.
- [ ] Add or retarget named idle, walk, run, drive, interact, aim, and combat clips later without blocking the map build.

Exit gate:

```txt
The current characters are acceptable for the demo and future wearable assets have a documented attachment pipeline.
```

---

## Phase 2: Asset registry, prefab, and replacement pipeline

Goal: make every new asset easy to place, replace, optimize, and reuse without hardcoding raw file paths throughout gameplay code.

Checklist:

- [ ] Define one asset metadata schema.
- [ ] Required fields: asset ID, town, district, category, source, runtime path, scale, pivot, rotation, collision type, interaction type, LODs, streaming weight, license, and status.
- [ ] Create prefab definitions for roads, buildings, houses, stores, civic buildings, props, vegetation, vehicles, interiors, and activity stations.
- [ ] Separate source files from optimized runtime files.
- [ ] Add automated missing-file, duplicate, oversize, texture, and license checks.
- [ ] Add placeholder IDs so geometry work continues while final art is being produced.
- [ ] Make asset replacement data-driven so approved final assets can replace placeholders without changing gameplay logic.
- [ ] Add standard anchors for door, interaction ring, parking, delivery, NPC work point, interior return, signage, and spawn clearance.
- [ ] Add collision classes: hard, breakable, soft/no-collision, trigger-only.
- [ ] Add LOD and instancing eligibility fields.
- [ ] Document the asset workflow used by the asset chat.

Asset workflow:

```txt
Preview -> approve -> build/source -> optimize -> register -> place -> test -> replace placeholder -> final QA
```

Exit gate:

```txt
A new asset can enter the repository and become a safe reusable prefab without custom one-off code.
```

---

## Phase 3: Large-world runtime foundation

Goal: make the engine capable of supporting Starter Town's 2,000 x 2,000 city and the later 22,000 x 20,000 connected world without loading everything at once.

Checklist:

- [ ] Wire `worldMapPlan.js` into a runtime world registry without deleting the current map.
- [ ] Create town, district, streaming-cell, gateway, and route data types.
- [ ] Use approximately 250 x 250 streaming cells.
- [ ] Define active high-detail radius, warm preload ring, far terrain/skyline mode, and unload distance.
- [ ] Add object pooling for NPCs, traffic, police, litter, particles, and common props.
- [ ] Add instancing for repeated houses, trees, lights, road props, fences, and filler buildings.
- [ ] Add texture and geometry budgets per cell.
- [ ] Add interior loading/unloading independent from exterior cells.
- [ ] Add a debug overlay for FPS, frame time, draw calls, triangles, loaded cells, loaded textures, active NPCs, active cars, and memory estimates.
- [ ] Add district/town debug boundaries and labels.
- [ ] Add safe-spawn and old-save migration for map expansion.
- [ ] Add recovery when a player loads inside removed geometry, water, a building, or an unloaded cell.
- [ ] Preserve lazy character loading.

Performance gate:

```txt
Driving across an empty 2,000 x 2,000 test city does not continuously increase memory, duplicate NPCs, or load every asset at full detail.
```

---

## Phase 4: Road, terrain, and navigation engine

Goal: replace the legacy 3 x 3 strip grid with a data-driven road graph that supports the entire world.

Checklist:

- [ ] Add polyline road segments.
- [ ] Support expressway, highway, parkway, main, local, service, alley, bridge, tunnel, dirt, water, and underwater route tiers.
- [ ] Generate asphalt, sidewalks, curbs, markings, shoulders, medians, and collision from segment data.
- [ ] Support authored curves and curve approximation.
- [ ] Support roundabouts, ramps, merge lanes, cul-de-sacs, service roads, and one-way alleys.
- [ ] Support grades, hills, retaining walls, barriers, and guardrails.
- [ ] Replace grid-only road tests with point-to-segment and route-graph checks.
- [ ] Build intersection metadata for lights, stop signs, yield, school zones, and crosswalks.
- [ ] Build route lanes for traffic and separate pedestrian paths.
- [ ] Add road-safe prop placement and parked-car rules.
- [ ] Add route validation that detects disconnected roads, impossible turns, lane obstructions, and overlapping parcels.
- [x] Add navigation graph hooks for police pursuit, physical mission objectives, and minimap routing.
- [ ] Bind delivery and scheduled service-vehicle movement to the navigation graph.

Exit gate:

```txt
A player car, civilian traffic, and police can traverse angled, curved, elevated, and multi-tier roads without leaving asphalt or hitting invisible blockers.
```

---

## Phase 5: Starter Town geographic skeleton

Goal: construct the approved 2,000 x 2,000 Starter Town before detailed decoration.

Locked districts:

- Dreamdrop District
- Market Mile
- Northworks / Auto Row
- Scholar's Quarter
- Civic Heights
- Eastgate Corridor
- Parkside Commons
- Willowbend Residential
- Westside Blocks

Locked major route identity:

- Dreamdrop Beltway
- Dreamdrop Boulevard
- Centre Avenue
- Northworks Expressway
- Fishing Highway gateway
- Eastgate Parkway / Rich Hills gateway
- Civic Rise
- Scholar Road and School Loop
- Parkside Crescent and roundabout
- Willowbend local network and cul-de-sacs
- Market and civic service roads
- alleys and back lanes

Checklist:

- [ ] Create the 2,400 x 2,400 Starter terrain/streaming envelope.
- [ ] Establish the 2,000 x 2,000 playable city bounds.
- [ ] Preserve the current compact grid only as the historic Dreamdrop core concept, not the whole city.
- [ ] Build Beltway, primary arterials, district connectors, local roads, and gateways.
- [ ] Build terrain grades, Civic Heights hill, drainage, park land, industrial land, residential land, and skyline buffers.
- [ ] Create district parcels and no-build buffers.
- [ ] Create the authoritative functional-building anchor parcels from `STARTER_TOWN_MASTER_BLUEPRINT.md`.
- [ ] Validate target driving times.

Target legal driving times:

```txt
Home -> School: 2.5-4 minutes
Home -> WorkTower: 3-5 minutes
Home -> Auto Haus: 4-6 minutes
West edge -> East edge: 4-7 minutes
Full Beltway: 8-12 minutes
```

Exit gate:

```txt
The empty city already feels like a real place to drive through before final buildings are installed.
```

---

## Phase 6: District massing and high-definition city dressing

Goal: make Starter Town visually legible, distinct, inhabited, and attractive using approved assets and optimized placeholders.

Checklist:

- [ ] Establish each district's palette, materials, lighting, vegetation, density, skyline, sound, and traffic identity.
- [ ] Place residential blocks, commercial rows, warehouses, civic shells, school campus massing, park structures, parking, and service infrastructure.
- [ ] Use the approved low-poly/base city pack as temporary or final filler where it fits.
- [ ] Keep specialized buildings visually distinct.
- [ ] Add streetscape families: lights, signs, hydrants, bins, benches, poles, utility boxes, drains, barriers, fences, planters, and bus shelters.
- [ ] Add district signage and street names.
- [ ] Add parking pockets, lots, loading zones, driveways, alleys, and service yards.
- [ ] Add purposeful empty lots and negative space.
- [ ] Add LOD and instancing during placement, not after the city becomes too heavy.
- [ ] Keep decorative buildings free of fake interaction prompts.
- [ ] Match the Starter Town visual-reference promise.

Exit gate:

```txt
Players can identify every district without opening the map, and the city no longer reads as scattered placeholder boxes.
```

---

## Phase 7: Functional-building relocation and preservation

Goal: move the existing working locations into the approved city without breaking their systems.

Functional locations:

- Frostbox
- Chicken Spot
- Kicks & Fits
- Block Supply
- Auto Haus
- City Garage
- Zaylins Prep
- Police Station / Dreamdrop Public Safety
- WorkTower
- Iron City Gym
- 6twelve
- Zaylins Home
- Dreamdrop Park

For each location:

- [ ] Place exterior prefab on approved parcel.
- [ ] Preserve or improve the existing interior.
- [ ] Move door and interaction trigger.
- [ ] Move interior-return point.
- [ ] Move parking, vehicle spawn, job, NPC, and mission anchors.
- [ ] Move minimap marker and route target.
- [ ] Revalidate collision and sidewalk access.
- [ ] Revalidate save/load inside the location.
- [ ] Revalidate police access and delivery access.
- [ ] Replace temporary exterior when the final asset arrives without changing the location ID.

Exit gate:

```txt
Every previously working location still works after relocation, and no mission points to the old grid.
```

---

## Phase 8: City population, traffic, police, and map UI

Goal: make the large city function as a living simulation rather than an empty shell.

Checklist:

- [ ] District-specific pedestrian route networks.
- [ ] District-specific civilian vehicle routes and density.
- [ ] Morning, school, work, afternoon, evening, and night population profiles.
- [ ] School buses, delivery vehicles, work traffic, travelers, and parked cars.
- [x] Police road-node dispatch and pursuit routes.
- [ ] Police ambient patrol zones, district response times, and highway response.
- [ ] Witness and alarm logic by district.
- [ ] Traffic lights, stops, yielding, school zones, and merging.
- [ ] District-aware minimap with road hierarchy and labels.
- [x] Full Starter Town map with shared-graph active mission routes.
- [ ] Map markers for home, school, jobs, police, fuel, garage, stores, park, services, and gateways.
- [ ] Clear hovered/interactable labels without permanent world-text clutter.
- [x] State-aware NPC dialogue framework with controlled multi-step conversations and live service actions.

Exit gate:

```txt
The city remains populated and responsive while driving across districts without the old lag spike or label clutter.
```

---

## Phase 9: Starter Town life systems

Goal: complete the ordinary-life side of the GTA-style sandbox so crime is a choice, not the only meaningful path.

### Housing

- [ ] Starter Home deed and ownership.
- [ ] Primary residence.
- [ ] Default spawn/rest/storage ownership rules.
- [ ] Home upgrades.
- [ ] Standard future-property interface.

### School

- [ ] Subject-selection interface.
- [ ] Foundation curriculum.
- [ ] Foundation Certificate.
- [ ] Skill and job prerequisites.
- [ ] School jobs and school nurse.

### Jobs

- [ ] Job board.
- [ ] Multiple entry jobs.
- [ ] Distinct task patterns instead of one universal timing bar.
- [ ] Performance grades, promotions, wages, restrictions, and repeatable shifts.
- [ ] Cross-district delivery work.

### Needs and recovery

- [ ] Health room/clinic service.
- [ ] Food categories and transaction-safe recovery.
- [ ] Hygiene, rest, energy, hunger, fun, fitness, and smarts balance.

### City services

- [ ] Property desk.
- [ ] Bank/paycheck kiosk.
- [ ] Community-service intake.
- [ ] Job/city information.
- [ ] Travel information.

Exit gate:

```txt
A player can spend several sessions living legally in Starter Town without running out of meaningful progression.
```

---

## Phase 10: Vehicles, crime consequences, and police career

Goal: deepen the existing vehicle and wanted systems into a complete civic loop.

### Vehicles

- [ ] Persistent owned-vehicle condition.
- [ ] Garage storage and active-vehicle rules.
- [ ] Damage layers and visual damage.
- [ ] Mechanics, repairs, towing, insurance/reclaim, and impound.
- [ ] Fuel and later charging.
- [ ] Garage Concierge safe delivery nodes.
- [ ] No duplicated active vehicles.
- [ ] Road test and license progression.

### Crime and consequences

- [ ] Offense categories and offense-specific fines.
- [ ] Stolen-item and stolen-vehicle state.
- [ ] Confiscation, evidence, booking, jail, community service, bans, restitution, and impound.
- [ ] District witness and response differences.
- [ ] Clear recovery paths without softlocks.

### Police career

- [ ] Official jurisdictional criminal record separate from hidden uncaught history.
- [ ] Starter Town conviction permanently bars Starter Town police employment.
- [ ] Academy prerequisites and application.
- [ ] Cadet and patrol tasks.
- [ ] Traffic, community, dispatch, alarm, evidence, stolen-vehicle, highway, and pursuit work.
- [ ] Ranks, pay, discipline, and promotion.

Exit gate:

```txt
Lawbreaking, reform, legal work, vehicle ownership, and police employment all use consistent saved consequences.
```

---

## Phase 11: Opening, tutorial, missions, and activities

Goal: turn the systems into a coherent first-play experience.

Opening direction:

- subtle movie-marathon/falling-asleep dream framing;
- dream language remains light rather than covering every system;
- DreamBucks and Dreamdrop District remain approved names.

Tutorial branches:

```txt
Legal path: school, job, sanitation, delivery, or civic work
Risky path: optional low-level crime and consequence tutorial
Observer path: police desk and law explanation without committing crime
```

Checklist:

- [ ] Character creation to Home Base transition.
- [ ] Home claim and needs tutorial.
- [ ] Neighborhood and district navigation.
- [ ] Food and inventory.
- [ ] School and skills.
- [ ] Job choice and first paycheck.
- [ ] Driving, fuel, damage, repair, and road test.
- [ ] Legal/risky/observer branch.
- [ ] World map and gateway reveal.
- [ ] Mission state survives save/load and relocation.
- [ ] Full conversations use controllable dialogue flow rather than single prompt responses.
- [ ] Integrate approved minigames through the shared activity lifecycle.
- [ ] Preserve Lineup Lab as a kid-facing game with no developer payload text.

Exit gate:

```txt
A first-time player understands the city and reaches free play without being forced into crime or buried in text.
```

---

## Phase 12: Starter Town demo stabilization

Goal: produce a public-facing playable demo before multi-town expansion.

Checklist:

- [ ] Complete all Starter Town acceptance checks.
- [ ] Verify no broken prompts or dead-end interactions.
- [ ] Verify no permanent debug text or developer payloads in kid-facing UI.
- [ ] Verify character customization persistence.
- [ ] Verify vehicle, mission, inventory, job, property, school, police, and crime saves.
- [ ] Verify old-save migration.
- [ ] Verify refresh/reload resilience.
- [ ] Verify keyboard/mouse and supported touch behavior.
- [ ] Verify common desktop resolutions and browser zoom.
- [ ] Verify low, medium, and high graphics presets.
- [ ] Set frame-time, memory, draw-call, and asset-size budgets.
- [ ] Test a full Beltway drive, all districts, all enterable interiors, all jobs, and all tutorial branches.
- [ ] Run regression, character, asset, and production-build gates.
- [ ] Deploy a demo branch and complete live QA.
- [ ] Freeze the Starter Town demo build before beginning connected-world work.

Demo definition of done:

```txt
A new player can play for at least 60-90 minutes, make meaningful choices,
progress, save, return, and explore the full city without a blocker.
```

---

# MILESTONE C: CONNECTED WORLD FOUNDATION

## Phase 13: World terrain and inter-town travel

Goal: turn separated planning coordinates into a streamed connected world.

Checklist:

- [ ] World terrain tiles and biome transitions.
- [ ] Starter-to-Fishing Highway.
- [ ] Starter-to-Rich Hills Parkway.
- [ ] Bridges, tunnels, dirt roads, sea routes, and underwater routes.
- [ ] Physical first-visit rules.
- [ ] Safe travel recovery and roadside services.
- [ ] World map with undiscovered, discovered, and synchronized states.
- [ ] Far skyline and town silhouette loading.
- [ ] Travel-time validation.
- [ ] No town loads at full detail while several kilometers away.

Exit gate:

```txt
The player can physically leave Starter Town and arrive at the first neighboring town through a real route.
```

---

## Phase 14: Reusable town framework

Goal: turn Starter Town's systems into reusable town modules without copy-pasting bugs.

Checklist:

- [ ] Town registry and lifecycle.
- [ ] District registry.
- [ ] Standard town services contract.
- [ ] Housing/property template.
- [ ] School/training template.
- [ ] Job/career template.
- [ ] Law/jurisdiction template.
- [ ] Fuel/charge/mechanic template.
- [ ] Food/recovery template.
- [ ] Town-specific minigame registration.
- [ ] Town save namespace.
- [ ] Town minimap and world-map integration.
- [ ] Town visual theme and asset-family hooks.
- [ ] Town completion automated checklist.

Exit gate:

```txt
A new town can be created from data and prefabs while retaining its own identity, law, services, and progression.
```

---

# MILESTONE D: FULL WORLD BETA

## Phase 15: Basic water and Crownwater Basin

- [ ] Swimming and breath.
- [ ] Safe rescue.
- [ ] Shoreline and water boundaries.
- [ ] Boats, docks, currents, catches, and water streaming.
- [ ] Crownwater Basin ecosystem foundation.

## Phase 16: Fishing Harbor

- [ ] Working harbor districts and routes.
- [ ] Housing, Harbor Academy, jobs, Harbor Patrol, TideFuel, food, clinic/recovery, sanitation, and market.
- [ ] Fishing, catches, Gillyfish, boats, docks, rare-catch routes, and Crownwater progression.

## Phase 17: Obby Canyon

- [ ] Drivable self-sustaining base town.
- [ ] Momentum Academy, housing, work, Canyon Ranger, fuel, recovery, and services.
- [ ] Course framework, checkpoints, timers, rescue, rewards, and authored vertical courses.

## Phase 18: Dungeon Outskirts

- [ ] Surface outpost and services.
- [ ] Adventurer Academy, housing, jobs, Warden/Ranger, fuel, crafting, healer, shrine, and stash.
- [ ] Dungeon-floor lifecycle, combat, traps, puzzles, loot, bosses, extraction, and save safety.

## Phase 19: TechTown

- [ ] Dense smart-city streaming and transit.
- [ ] VoltByte Academy, housing, jobs, Metro Security, VoltFuel, services, drones, robotics, coding, and automation.
- [ ] Gadget Forge and GridLink purchase/synchronization system.

## Phase 20: Rich Hills

- [ ] Switchback roads, estates, worker/service district, country club, civic crest, academy, police, clinic, CrestFuel, marina, and yachts.
- [ ] Property, hospitality, golf, luxury vehicles, security response, and worker economy.

## Phase 21: Casino Strip

- [ ] Hotels, arena, game halls, arcade, prize pavilion, worker housing, backstage/service roads, academy, Strip Police, fuel, food, clinic, and transport.
- [ ] Fictional currencies, probability education, hospitality, shows, security, and non-predatory kid-safe game design.

## Phase 22: Starline City

- [ ] Studios, backlots, theaters, music, fashion, worker housing, hillside homes, academy, police, StarStop, food, clinic, and transport.
- [ ] Performance, rhythm, reputation, production, events, and media careers.

## Phase 23: Aqualume and Abyssal Edge

- [ ] Gillyfish permanent-gills progression.
- [ ] Lighthouse Trench and physical discovery.
- [ ] Moonpool synchronization.
- [ ] Full Aqualume civic city, Tideglass Academy, Current Guard, jobs, housing, Coral Market, Bluecore, sea scooters, mini-subs, services, and sea life.
- [ ] Abyssal Edge late-game zone.

Town completion rule:

No town is complete until the player can arrive, understand multiple districts, live there, own or select housing, attend school/training, work multiple jobs, access local law work when eligible, buy food, recover, use local vehicle services, face local crime consequences, play several signature activities, revisit for lasting progression, and visually recognize the approved concept promise.

---

# MILESTONE E: RELEASE CANDIDATE

## Phase 24: Cross-world progression and story completion

- [ ] Main story arc across towns.
- [ ] Town-introduction missions.
- [ ] Cross-town careers, prerequisites, reputation, and relationships.
- [ ] Property, school, job, vehicle, skill, law, reform, Gillyfish, GridLink, and Aqualume progression balance.
- [ ] Optional crime and legal paths remain viable.
- [ ] Ending and postgame loops.

## Phase 25: Economy and content balance

- [ ] DreamBucks earning and spending curves.
- [ ] Wages, prices, property, vehicles, repairs, fines, food, clothes, travel, GridLink, and upgrades.
- [ ] Prevent grind walls and trivial inflation.
- [ ] Reward town specialization and revisits.
- [ ] Validate no premium-style shortcut invalidates gameplay progression.

## Phase 26: Whole-world performance and technical hardening

- [ ] Long-session memory tests.
- [ ] Streaming stress tests.
- [ ] NPC and traffic density tests.
- [ ] Asset and texture budgets.
- [ ] Save corruption recovery and schema migration.
- [ ] Network/CDN/deployment resilience.
- [ ] Browser and device compatibility.
- [ ] Graphics presets and fallback behavior.
- [ ] Crash/error reporting without exposing developer internals to children.

## Phase 27: Accessibility, safety, and kid-facing polish

- [ ] Readable text sizes and scaling.
- [ ] Color-blind-safe signals.
- [ ] Subtitle and dialogue controls.
- [ ] Remappable controls where practical.
- [ ] Motion/camera options.
- [ ] Clear parental/kid-safe language.
- [ ] No real-money gambling conversion.
- [ ] No developer payloads, geometry notes, raw IDs, or debug output in gameplay UI.
- [ ] Consistent interaction prompts and recovery options.

## Phase 28: Full QA, content freeze, and launch

- [ ] Feature freeze.
- [ ] Asset freeze.
- [ ] Save-format freeze with migration support.
- [ ] Full regression matrix.
- [ ] Every town completion checklist.
- [ ] Every route, gateway, interior, job, school, law career, minigame, and mission.
- [ ] Performance acceptance on target hardware.
- [ ] Deployment rollback plan.
- [ ] Credits and third-party licenses.
- [ ] Launch candidate.
- [ ] Post-launch bug and content roadmap.

---

## 4. Immediate next execution sequence

After the final hair visual check, work should proceed in this order:

```txt
1. Synchronize the character branch with the completed world-design main branch.
2. Preserve a known-good checkpoint.
3. Build the asset/prefab registry contract.
4. Wire the large-world registry and streaming-cell skeleton.
5. Build the reusable polyline road and terrain engine.
6. Construct the 2,000 x 2,000 Starter Town road/terrain skeleton.
7. Place district parcels and functional-building anchor parcels.
8. Add optimized filler massing and visual identity.
9. Relocate each functional building one at a time with regression checks.
10. Expand traffic, NPCs, police, minimap, and district schedules.
11. Finish housing, school, jobs, recovery, crime consequences, and police career.
12. Rebuild the tutorial around legal, risky, and observer paths.
13. Stabilize and publish the Starter Town demo.
14. Only then begin connected-world and town-by-town expansion.
```

---

## 5. Build discipline

Every implementation slice must:

- identify the exact phase and checklist item;
- preserve working systems;
- use the authoritative blueprint;
- list assets and placeholders;
- include save-state changes;
- include performance impact;
- include acceptance tests;
- pass automated checks;
- receive live visual confirmation before broadening scope;
- avoid unrelated cleanup during a focused slice.

The rule going forward:

```txt
Build the skeleton first.
Keep the game playable.
Replace placeholders as assets arrive.
Finish Starter Town as the reference implementation.
Then scale the proven system across the world.
```
