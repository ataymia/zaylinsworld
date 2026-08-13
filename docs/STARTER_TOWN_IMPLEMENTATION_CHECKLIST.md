# Starter Town Implementation Checklist

> Historical gap inventory. Its original `[DONE]` / `[MISSING]` labels predate
> the large-town cutover and are retained for design traceability. Use
> `ACTIVE_PHASE_STATUS.md`, `buildPhaseStatus.js`, and
> `END_OF_WEEK_GAMEPLAY_PLAN.md` for current implementation truth.

Status: live audit and implementation tracker  
Companion blueprint: [STARTER_TOWN_BLUEPRINT.md](STARTER_TOWN_BLUEPRINT.md)  
Project: Zaylins Kid World, also called ZTA

This checklist compares the current Starter Town runtime to the finished-city blueprint.

Status legend:

```txt
[DONE]    implemented and materially functional
[PARTIAL] foundation exists but does not meet final blueprint
[MISSING] not implemented
[BLOCKED] depends on another system or design decision
[VERIFY]  appears implemented but needs in-game QA/regression confirmation
```

The checklist is intentionally strict. A system is not marked DONE merely because a building or prompt exists.

---

## 1. Executive gap summary

### Strong current foundations

```txt
[DONE] character creation
[DONE] needs/stats and time progression
[DONE] save/load
[DONE] enterable functional interiors
[DONE] store purchasing and ownership for cars/jewelry/gear/weapons
[DONE] vehicle driving, fuel, damage, repair, ownership, and theft
[DONE] traffic and traffic-control logic
[DONE] wanted stars, foot police, patrol vehicles, busting, hiding, and legal-fee clearing
[DONE] basic combat and NPC reactions
[DONE] Chicken Spot, WorkTower, Garage, and sanitation jobs
[DONE] gym, school study, food, home rest, wardrobe, safe, and haircut loops
[DONE] starter mission manager and saved mission progression
[DONE] no-fake-prompt interaction manager principle
```

### Largest missing or incomplete areas

```txt
[DONE] large district-based city geography
[DONE] curved/polyline road engine
[DONE] home ownership and primary residence system
[DONE] ten-subject school curriculum and Foundation Certificate
[PARTIAL] job variety and career progression
[PARTIAL] crime consequence depth
[MISSING] optional branching tutorial
[PARTIAL] district NPC schedules: ambient population is scheduled; recurring named characters remain stationary
[DONE] district traffic identities and saved-clock schedules
[DONE] district-aware minimap and city map
[DONE] basic city healthcare service
[DONE] property/job/city-services hub
[PARTIAL] travel gateways are integrated; destination towns are not yet playable
[DONE] filler neighborhoods and civic/industrial infrastructure
```

### Critical design correction

The current mission chain eventually requires:

```txt
- landing a hit in a street fight
- mugging an NPC
- gaining and losing police heat
```

Crime should remain playable, but it must become an optional tutorial branch. A player choosing school, work, housing, and legal progression must be able to finish orientation without committing assault or robbery.

---

## 2. Map scale and districts

- [PARTIAL] Starter Town has a coherent bounded grid.
- [MISSING] Expand playable bounds to approximately x `-250..250`, z `-235..245`.
- [MISSING] Expand ground plane to approximately `600 x 580`.
- [MISSING] Add district data objects.
- [MISSING] Add district-entry labels/notifications.
- [MISSING] Add Dreamdrop District.
- [MISSING] Add Market Mile.
- [MISSING] Add Northworks / Auto Row.
- [MISSING] Add Scholar's Quarter.
- [MISSING] Add Civic Heights.
- [MISSING] Add Eastgate Corridor.
- [MISSING] Add Parkside Commons.
- [MISSING] Add Willowbend Residential.
- [MISSING] Add Westside Blocks transition area.
- [MISSING] Add north gateway toward Fishing Harbor.
- [MISSING] Add east gateway toward Rich Hills.
- [MISSING] Add terrain/skyline buffer around expanded city.
- [MISSING] Relocate all existing functional buildings to district anchors.
- [MISSING] Add filler neighborhoods between functional destinations.
- [VERIFY] Confirm world spacing does not overlap neighboring town origins.

Acceptance test:

```txt
Driving from Zaylins Home to Auto Haus should feel like crossing a city,
not crossing one intersection.
```

---

## 3. Road engine

### Current

- [DONE] horizontal and vertical asphalt strips.
- [DONE] sidewalks beside grid roads.
- [DONE] center-line markings.
- [DONE] configured traffic lights and stop signs.
- [DONE] waypoint-based traffic routes.
- [DONE] NPC cars obey lights/signs.
- [DONE] vehicle collision/damage foundation.

### Required expansion

- [MISSING] Add `ROAD_SEGMENTS` polyline data.
- [MISSING] Support multiple road widths and tiers.
- [MISSING] Build asphalt strips along arbitrary segment angles.
- [MISSING] Build sidewalks along arbitrary segment angles.
- [MISSING] Generate center lines/edge markings by segment length.
- [MISSING] Add curved-road approximation or authored curve modules.
- [MISSING] Add roundabout geometry.
- [MISSING] Add hill/grade metadata for Civic Rise.
- [MISSING] Add guardrails and retaining walls.
- [MISSING] Replace line-based `isInRoad` checks with point-to-segment distance.
- [MISSING] Update `isOnSidewalk`, `clearOfRoads`, and `pushOffRoad` for segments.
- [MISSING] Update litter/prop generation for district roads.
- [MISSING] Update streetlight placement for segment sidewalks.
- [MISSING] Update traffic-control placement for non-grid intersections.
- [MISSING] Add school-zone raised crosswalks.
- [MISSING] Add service roads and one-way alley rules.
- [MISSING] Add highway merge/acceleration lane.
- [MISSING] Add parked-car placement that does not block traffic.
- [VERIFY] Test player-car collision on angled roads.
- [VERIFY] Test traffic waypoint turning radius at sharp corners.
- [VERIFY] Test police pursuit across every route.

Road acceptance tests:

```txt
- NPC traffic stays on asphalt.
- No streetlight, dumpster, tree, or building sits in a driving lane.
- A player can complete every route without invisible collision.
- Difficult turns are difficult because of geometry and speed, not bugs.
- Police can reach every public district.
```

---

## 4. Building relocation

- [MISSING] Move Frostbox to Dreamdrop District `(-42, -22)` planning anchor.
- [MISSING] Move Chicken Spot to Dreamdrop District `(48, -38)`.
- [MISSING] Move Kicks & Fits to Market Mile `(-18, 88)`.
- [MISSING] Move Block Supply to Westside/Market transition `(-142, 70)`.
- [MISSING] Move Auto Haus to Northworks `(-112, -165)`.
- [MISSING] Move City Garage to Northworks `(-28, -154)`.
- [MISSING] Move Zaylins Prep to Scholar's Quarter `(-181, 18)`.
- [MISSING] Move Police Station to Civic Heights `(158, -78)`.
- [MISSING] Move WorkTower to Civic Heights `(166, -5)`.
- [MISSING] Move Iron City Gym to Parkside `(112, 112)`.
- [MISSING] Move 6twelve to Eastgate `(208, 58)`.
- [MISSING] Move Zaylins Home to Willowbend `(12, 207)`.
- [MISSING] Move/expand Dreamdrop Park to `(105, 142)`.
- [MISSING] Move dealership parking and police lots with their buildings.
- [MISSING] Move refuel trigger and gas-store entrance with 6twelve.
- [MISSING] Move trash/dumpster anchors with relevant districts.
- [MISSING] Update minimap markers.
- [MISSING] Update mission checkpoints.
- [MISSING] Add save-position migration for old saves inside removed geometry.
- [VERIFY] Validate every door ring on a sidewalk.
- [VERIFY] Validate every interior return position.
- [VERIFY] Validate every building collider and parking entrance.

---

## 5. Functional buildings audit

## Zaylins Home

- [DONE] enterable interior.
- [DONE] rest/energy restoration.
- [DONE] wardrobe.
- [DONE] safe/storage interaction.
- [DONE] haircut/lineup minigame.
- [PARTIAL] hygiene system, because bathroom actions are limited.
- [MISSING] property deed/ownership state.
- [MISSING] primary residence selection.
- [MISSING] home-upgrade system.
- [MISSING] mailbox/mission delivery.
- [MISSING] kitchen/food storage.
- [MISSING] owned-home minimap marker state.
- [MISSING] standardized interface for future homes.

## Zaylins Prep

- [DONE] enterable school.
- [DONE] teacher dialogue.
- [DONE] study activity raises smarts.
- [PARTIAL] school mission.
- [DONE] subject selection across ten named subjects.
- [MISSING] math minigame.
- [MISSING] reading/memory minigame.
- [MISSING] computer-basics minigame.
- [PARTIAL] named subject lessons currently share the stable timing-game fallback; bespoke math/reading/computer/civics/health/career/driver/PE/arts/map mechanics remain future depth.
- [DONE] Foundation Certificate after Math, Civics, Health, Career, and Driver Education.
- [MISSING] school jobs.
- [PARTIAL] attendance, lesson count, last score, and best score persist; schedules and reputation remain.
- [DONE] school nurse/basic recovery.

## WorkTower

- [DONE] enterable office.
- [DONE] manager dialogue.
- [DONE] office shift with performance/smarts pay scaling.
- [DONE] first-job mission.
- [DONE] job board UI.
- [DONE] career titles/promotions for the four playable careers.
- [DONE] property desk.
- [DONE] bank/paycheck kiosk.
- [DONE] community-health room.
- [DONE] city-services counter.
- [MISSING] courier job hub.
- [MISSING] job bans/restrictions after serious crime.

## Chicken Spot

- [DONE] enterable restaurant.
- [DONE] buy chicken.
- [DONE] eating minigame and needs bridge.
- [DONE] paid shift.
- [PARTIAL] job depth, because the shift needs more distinct food-service tasks.
- [MISSING] job progression.
- [MISSING] delivery-order job.
- [MISSING] store security/robbery consequence layer.

## Frostbox

- [DONE] enterable store.
- [DONE] jewelry stock.
- [DONE] custom chain builder.
- [DONE] purchases and equipped jewelry.
- [MISSING] jewelry-assistant job.
- [MISSING] basic appraisal/cleaning activity.
- [MISSING] theft/security consequences.

## Kicks & Fits

- [DONE] enterable store.
- [DONE] wardrobe/customization access.
- [MISSING] retail-stocking job.
- [MISSING] size/order sorting activity.
- [MISSING] theft/security consequences.

## Block Supply

- [DONE] enterable store.
- [DONE] gear stock.
- [DONE] weapon/ammo/upgrade system.
- [DONE] physical weapon displays.
- [MISSING] supply-clerk job.
- [MISSING] order verification/restocking activity.
- [MISSING] store alarm/robbery consequences.
- [VERIFY] Confirm kid-safe tone and balancing remain aligned with the overall game.

## Iron City Gym

- [DONE] enterable gym.
- [DONE] strength, cardio, resistance, and mobility profiles.
- [DONE] workout raises fitness and affects energy/hygiene/fun/time.
- [MISSING] gym-assistant job.
- [MISSING] membership/progression if desired.
- [MISSING] park/gym challenge integration.

## Auto Haus

- [DONE] enterable dealership.
- [DONE] five purchasable vehicles.
- [DONE] owned-car state and active-car selection.
- [DONE] test-drive interaction.
- [MISSING] lot-attendant job.
- [MISSING] actual city road-test route from dealership.
- [MISSING] financing/insurance systems if retained as future concepts.
- [VERIFY] Move showroom/parking without breaking active-car spawn.

## City Garage

- [DONE] enterable garage.
- [DONE] vehicle repair.
- [DONE] Garage Hand shift.
- [PARTIAL] repair/shift gameplay variety.
- [MISSING] towing/inspection job.
- [MISSING] impound integration.
- [MISSING] repair restitution for crime/damage missions.

## 6twelve

- [DONE] enterable store.
- [DONE] snack and drink purchase.
- [DONE] car refueling.
- [PARTIAL] gas-station asset/source-of-truth stability.
- [MISSING] fuel-attendant job.
- [MISSING] EV charging.
- [MISSING] package lockers/delivery activity.
- [MISSING] highway/travel information.
- [MISSING] station security/crime consequences.

## Police Station

- [DONE] visible precinct.
- [DONE] enterable interior.
- [DONE] parked stealable cruisers.
- [DONE] front desk.
- [DONE] legal-fee option.
- [DONE] evidence-locker interaction hook.
- [DONE] holding-cell inspection hook.
- [PARTIAL] academy information.
- [MISSING] offense-specific fines.
- [MISSING] booking/jail flow.
- [MISSING] visitation.
- [MISSING] confiscated-item recovery.
- [MISSING] impound terminal.
- [MISSING] community-service intake.
- [MISSING] police academy training.
- [MISSING] attached public-safety/fire-rescue exterior dressing.

---

## 6. Housing and property

- [DONE] one usable home.
- [MISSING] `ownedHomes` state.
- [MISSING] `primaryHomeId` state.
- [MISSING] `homeUpgrades` state.
- [MISSING] deed-claim tutorial.
- [MISSING] property-desk interaction.
- [MISSING] home selection/spawn menu.
- [MISSING] property markers.
- [MISSING] scalable residential interior contract for future homes.
- [MISSING] home kitchen/storage upgrades.
- [MISSING] first-home achievement/reward.
- [BLOCKED] additional buyable Starter properties can wait for reusable home interiors.

Acceptance test:

```txt
Before leaving Starter Town, the player understands that homes can be owned,
selected as a primary residence, upgraded, and later purchased in other towns.
```

---

## 7. School and skills

- [DONE] smarts stat.
- [DONE] study activity.
- [DONE] named skill/certificate data.
- [DONE] subject-specific lesson catalog.
- [DONE] lesson completion tracking.
- [DONE] Foundation Certificate.
- [PARTIAL] Foundation education grants the WorkTower pay benefit; broader job prerequisites remain.
- [MISSING] skill prerequisites for other towns.
- [PARTIAL] attendance persists; the school-hours schedule remains.
- [MISSING] school job board.
- [MISSING] student/teacher routines.
- [MISSING] school-zone traffic behavior.
- [MISSING] school-zone crime modifiers.

---

## 8. Jobs and careers

### Implemented

- [DONE] Chicken Spot shift.
- [DONE] WorkTower office shift.
- [DONE] Garage shift.
- [DONE] Sanitation contracts with three quotas and visible cleanup.

### Required

- [DONE] job catalog/config for Chicken Spot, WorkTower, Garage, and sanitation.
- [DONE] WorkTower job board.
- [DONE] persistent active career and title state.
- [DONE] shift history, earnings, last grade, and best grade.
- [DONE] promotions at stable shift thresholds.
- [MISSING] skill requirements.
- [MISSING] job reputation.
- [MISSING] retail stocking at Kicks & Fits.
- [MISSING] jewelry assistant at Frostbox.
- [MISSING] supply clerk at Block Supply.
- [MISSING] fuel attendant at 6twelve.
- [MISSING] Auto Haus lot attendant.
- [MISSING] Gym assistant.
- [MISSING] school aide.
- [MISSING] city courier.
- [MISSING] district-based sanitation contracts.
- [MISSING] community-service variant.
- [MISSING] job bans/discipline after relevant crime.

Acceptance test:

```txt
The player can choose at least four meaningfully different legal jobs
without each job feeling like the same meter with a renamed title.
```

---

## 9. Crime and police

### Implemented foundation

- [DONE] 0-5 wanted stars.
- [DONE] long-term heat value.
- [DONE] car theft.
- [DONE] police-car theft with higher risk.
- [DONE] civilian-driver ejection and fleeing witness presentation.
- [DONE] mugging mission/event.
- [DONE] public gunfire alert.
- [DONE] civilian and officer takedown escalation.
- [DONE] foot police.
- [DONE] police cruisers.
- [DONE] chase and hide/cooldown behavior.
- [DONE] bust timer and cash penalty.
- [DONE] legal-fee desk.
- [DONE] police-station entry.

### Missing depth

- [MISSING] offense records.
- [MISSING] offense-specific fines.
- [MISSING] stolen-item/vehicle tags.
- [MISSING] confiscation.
- [MISSING] impound.
- [MISSING] booking/jail.
- [MISSING] community service.
- [MISSING] store alarms.
- [MISSING] shoplifting/robbery handlers.
- [MISSING] burglary/trespass handlers.
- [MISSING] property-damage restitution.
- [MISSING] witness/reporting variation.
- [MISSING] district patrol modifiers.
- [MISSING] school/public-safety restricted-area modifiers.
- [MISSING] temporary store/job bans.
- [MISSING] criminal reputation or record effects if desired.
- [VERIFY] reckless-driving wanted triggers and tuning.
- [VERIFY] police pathing across expanded curved road network.

### Tutorial correction

- [MISSING] remove mandatory street-fight objective from universal chain.
- [MISSING] remove mandatory mugging objective from universal chain.
- [MISSING] add legal/risky/observer branch selection.
- [MISSING] ensure all branches can reach world-unlock state.

---

## 10. Tutorial and missions

### Current

- [DONE] saved ordered mission chain.
- [DONE] NPC introduction.
- [DONE] Chicken Spot introduction.
- [DONE] Frostbox introduction.
- [DONE] dealership/car introduction.
- [DONE] driving checkpoint.
- [DONE] home haircut.
- [DONE] gym introduction.
- [DONE] school introduction.
- [DONE] first office job.
- [DONE] sanitation introduction.
- [DONE] crime and police missions.

### Required rewrite

- [MISSING] start at/near Willowbend home.
- [MISSING] home deed and primary residence tutorial.
- [MISSING] district map tutorial.
- [MISSING] legal street crossing tutorial.
- [MISSING] multi-district food/shopping trip.
- [MISSING] Foundation lesson.
- [MISSING] job choice rather than one required employer.
- [MISSING] full city road test.
- [MISSING] refueling and repair tutorial.
- [MISSING] legal/risky/observer branch.
- [MISSING] world-map/travel introduction.
- [MISSING] tutorial skip/replay strategy for returning players.
- [MISSING] migration for saves already deep in the old mission chain.

---

## 11. Health, needs, and recovery

- [DONE] health stat.
- [DONE] energy.
- [DONE] hunger.
- [DONE] fitness.
- [DONE] smarts.
- [DONE] hygiene.
- [DONE] fun.
- [DONE] need decay over time.
- [DONE] food/rest/workout/study effects.
- [DONE] downed-player respawn and cash penalty.
- [DONE] recovery works at home, WorkTower Community Health, and the school nurse.
- [DONE] WorkTower community-health room.
- [DONE] school nurse recovery.
- [DONE] health-service fee/treatment interaction.
- [MISSING] clear tutorial explaining health versus other needs.

---

## 12. Traffic, NPCs, and city life

- [DONE] traffic cars with visible drivers.
- [DONE] waypoint traffic.
- [DONE] traffic collision avoidance.
- [DONE] traffic-light and stop-sign obedience.
- [DONE] wandering NPCs.
- [DONE] NPC dialogue and memory.
- [DONE] NPC panic/flee reaction when attacked.
- [DONE] NPC density scaling.
- [DONE] district-specific pedestrian routes.
- [DONE] time-of-day schedules for pedestrian and ambient-traffic activity.
- [DONE] road-routed school commute shuttle.
- [DONE] road-routed Northworks parts/service vehicle.
- [DONE] scheduled traveler traffic and city courier at Eastgate.
- [MISSING] parked cars by district.
- [PARTIAL] Willowbend residential rhythm and school commute; individual resident home/work ownership remains.
- [PARTIAL] activity-specific NPC roles; authored appearance/dialogue profiles remain for ambient citizens.
- [MISSING] event crowds at Parkside/Dreamdrop.

---

## 13. Minimap and navigation

- [DONE] minimap foundation.
- [DONE] accumulated town markers.
- [DONE] police/garage/gas/building marker support.
- [MISSING] expanded bounds.
- [MISSING] polyline-road rendering.
- [MISSING] district labels.
- [MISSING] primary-home marker.
- [MISSING] job-board marker.
- [MISSING] school class marker.
- [MISSING] active route/GPS line.
- [MISSING] gateway markers.
- [MISSING] wanted search area.
- [MISSING] world-map city silhouette.

---

## 14. Filler and environmental storytelling

- [PARTIAL] decorative skyline buildings exist.
- [PARTIAL] streetlights, trees, park benches, litter, and dumpsters exist.
- [MISSING] residential street blocks.
- [MISSING] apartment shells.
- [MISSING] commercial filler blocks.
- [MISSING] industrial warehouses/yards.
- [MISSING] city-hall/library/fire-rescue shells.
- [MISSING] parking lots by district.
- [MISSING] alleys and loading docks.
- [MISSING] fences, mailboxes, hydrants, drains, utilities.
- [MISSING] retaining walls and guardrails.
- [MISSING] district signs and street names.
- [MISSING] school yard and bus loop.
- [MISSING] expanded park assets.
- [MISSING] Eastgate highway dressing.
- [MISSING] Northworks industrial dressing.

---

## 15. Data and save migration

- [MISSING] map data version.
- [MISSING] old-to-new safe position migration.
- [MISSING] home ownership fields.
- [MISSING] school/skill fields.
- [MISSING] job progression fields.
- [MISSING] crime/offense fields.
- [MISSING] district discovery fields.
- [MISSING] tutorial branch fields.
- [MISSING] gateway unlock fields.
- [VERIFY] old owned vehicles/items remain intact.
- [VERIFY] old mission saves do not softlock.
- [VERIFY] interior return positions remain safe after relocation.

Recommended new state fields:

```js
mapVersion: 3,
ownedHomes: [],
primaryHomeId: null,
homeUpgrades: {},
skills: {},
certificates: [],
jobProgress: {},
offenses: [],
impoundedVehicles: [],
discoveredDistricts: [],
tutorialPath: null,
worldGateways: {},
```

---

## 16. Implementation order

### Sprint 1: Road-engine proof

- [ ] Add `ROAD_SEGMENTS` alongside old grid fallback.
- [ ] Expand ground and camera/minimap bounds.
- [ ] Build Dreamdrop Boulevard.
- [ ] Build Centre Avenue.
- [ ] Build Willowbend Loop.
- [ ] Build Civic Rise.
- [ ] Add district data and labels.
- [ ] Relocate Home, WorkTower, Police, and 6twelve.
- [ ] Validate save, doors, traffic, gas, and interiors.

### Sprint 2: Full geography

- [ ] Add Northworks Loop.
- [ ] Add Scholar Road and school loop.
- [ ] Add Parkside Crescent and roundabout.
- [ ] Add Eastgate Parkway.
- [ ] Add service roads/alleys.
- [ ] Relocate remaining functional buildings.
- [ ] Add temporary filler shells.

### Sprint 3: City life

- [x] District traffic routes.
- [x] District pedestrian routes.
- [ ] parked vehicles.
- [x] school/commute/service schedules.
- [x] district signage and minimap.

### Sprint 4: Home and school

- [x] deed claim.
- [x] primary residence.
- [x] property desk.
- [x] school subjects.
- [x] Foundation Certificate.
- [ ] job prerequisites.

### Sprint 5: Jobs

- [x] job board.
- [ ] retail/fuel/school/auto/gym/courier jobs.
- [x] promotions and shift history for the four currently playable careers.
- [ ] district sanitation.

### Sprint 6: Tutorial

- [ ] rewrite mission chain.
- [ ] legal/risky/observer branch.
- [ ] road test.
- [ ] refuel/repair lesson.
- [ ] world-open mission.

### Sprint 7: Crime consequences

- [ ] offense data.
- [ ] fines/confiscation/impound.
- [ ] booking/jail.
- [ ] community service.
- [ ] store/job bans.
- [ ] district response modifiers.

### Sprint 8: Final assets and polish

- [ ] replace procedural filler with approved assets.
- [ ] lighting/sound by district.
- [ ] weather/wet-road pass.
- [ ] optimization and LOD.
- [ ] full QA/regression.

---

## 17. Release gates

### Geography gate

- [ ] All district roads are driveable.
- [ ] No destination requires crossing terrain illegally.
- [ ] No road prop blocks traffic.
- [ ] Police and NPC traffic reach every district.
- [ ] Minimap matches world geometry.

### Gameplay gate

- [ ] Home ownership works.
- [ ] Multiple lessons work.
- [ ] At least four distinct legal jobs work.
- [ ] Tutorial can finish without crime.
- [ ] Optional crime path produces consequences.
- [ ] Basic healthcare works.

### Interaction gate

- [ ] Every prompt has a working handler.
- [ ] Decorative filler has no prompt.
- [ ] Every interior exit returns safely.
- [ ] Moved refuel and repair points work.

### Save gate

- [ ] New save completes tutorial.
- [ ] Old save migrates safely.
- [ ] Reload works in every district/interior.
- [ ] Owned inventory and vehicles persist.
- [ ] Wanted/job/home/school progress persists.

### Performance gate

- [ ] Low preset remains playable.
- [ ] Filler density scales by preset.
- [ ] Traffic density scales without emptying the city.
- [ ] No major frame spikes crossing district boundaries.
- [ ] Distant filler uses LOD or culling.

---

## 18. Definition of Starter Town complete

Starter Town is complete when it is no longer possible to describe it as:

```txt
four squares, a ring road, and all the useful buildings facing each other.
```

The finished city must demonstrate the full ZTA promise:

```txt
live somewhere
learn something
work somewhere else
travel through real geography
buy and maintain things
meet people with routines
choose legal or risky paths
face understandable consequences
and eventually leave town because you are curious,
not because Starter Town feels unfinished.
```
