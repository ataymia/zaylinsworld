# Starter Town Large-Scale and Police Career Checklist

Status: revision tracker  
Companion documents:

- [STARTER_TOWN_BLUEPRINT.md](STARTER_TOWN_BLUEPRINT.md)
- [STARTER_TOWN_IMPLEMENTATION_CHECKLIST.md](STARTER_TOWN_IMPLEMENTATION_CHECKLIST.md)
- [LARGE_WORLD_SCALE_BLUEPRINT.md](LARGE_WORLD_SCALE_BLUEPRINT.md)
- [POLICE_CAREER_SYSTEM.md](POLICE_CAREER_SYSTEM.md)

This checklist supersedes the earlier 500x480 Starter Town scale targets and adds police officer as a full career path.

Status legend:

```txt
[DONE] implemented and functional
[PARTIAL] foundation exists
[MISSING] not implemented
[BLOCKED] depends on another system
[VERIFY] requires in-game QA
```

---

## 1. Authoritative scale revision

- [DONE] Large-world planning document created.
- [DONE] Future world-map data moved from 600-700 unit spacing to multi-thousand-unit spacing.
- [DONE] Starter Town planning bounds set to `2,000 x 2,000`.
- [DONE] Starter terrain envelope set to approximately `2,400 x 2,400`.
- [DONE] Other town origins moved far enough to prevent overlap.
- [DONE] Aqualume added to forward-looking world-map data.
- [DONE] Inter-town travel targets changed to multi-minute trips.
- [DONE] Streaming-cell plan added to forward-looking data.
- [MISSING] Runtime Starter Town ground expanded to 2,400 x 2,400.
- [MISSING] Runtime playable bounds expanded to x `-1000..1000`, z `-1000..1000`.
- [MISSING] Runtime district chunks created.
- [MISSING] Runtime world streaming system.
- [MISSING] Runtime LOD and instanced filler system.
- [MISSING] Runtime far skyline and terrain impostors.
- [MISSING] Runtime city map sized for 2,000 x 2,000.
- [MISSING] Save-position migration for old compact-map saves.

Acceptance test:

```txt
A legal drive from Zaylins Home to Auto Haus takes several real minutes.
```

---

## 2. Starter Town large-road network

- [PARTIAL] Existing grid roads, traffic lights, stop signs, traffic AI, collision, and damage work.
- [MISSING] Dreamdrop Beltway.
- [MISSING] Dreamdrop Boulevard full arterial.
- [MISSING] Centre Avenue full north-south route.
- [MISSING] Northworks Expressway and Fishing Highway ramp.
- [MISSING] Eastgate Parkway and Rich Hills departure road.
- [MISSING] Civic Rise elevation and S-curves.
- [MISSING] Scholar Road and school loop.
- [MISSING] Willowbend local street network and cul-de-sacs.
- [MISSING] Parkside Crescent and roundabout.
- [MISSING] Market service lanes and one-way alley.
- [MISSING] Westside local streets.
- [MISSING] multiple road widths and speed classes.
- [MISSING] point-to-segment road placement rules.
- [MISSING] angled/curved traffic-light placement.
- [MISSING] highway merges, exits, and lane changes.
- [MISSING] parked-car rules by district.
- [VERIFY] police pursuit can traverse every route.
- [VERIFY] traffic stays on road at high-speed curves.
- [VERIFY] no filler asset blocks a lane or sight-critical turn.

Travel acceptance targets:

```txt
Home -> School: 2.5-4 minutes
Home -> WorkTower: 3-5 minutes
Home -> Auto Haus: 4-6 minutes
West edge -> East edge: 4-7 minutes
Full Beltway: 8-12 minutes
```

---

## 3. Large-city district migration

- [MISSING] Dreamdrop District expanded to several downtown blocks.
- [MISSING] Market Mile expanded to multi-block retail corridor.
- [MISSING] Northworks expanded to industrial/vehicle district.
- [MISSING] Scholar's Quarter expanded to school/community district.
- [MISSING] Civic Heights expanded to police/public-services hill district.
- [MISSING] Eastgate expanded to highway/fuel corridor.
- [MISSING] Parkside expanded to large recreation district.
- [MISSING] Willowbend expanded to multiple residential neighborhoods.
- [MISSING] Westside Blocks implemented as working mixed neighborhood.
- [MISSING] named sub-neighborhoods and district-entry labels.
- [MISSING] district-specific NPC density and routines.
- [MISSING] district-specific traffic mix.
- [MISSING] district-specific police patrol density.
- [MISSING] purposeful filler neighborhoods between functional buildings.

---

## 4. Revised functional-building anchors

- [MISSING] Frostbox moved near `(-168, -88)`.
- [MISSING] Chicken Spot moved near `(192, -152)`.
- [MISSING] Kicks & Fits moved near `(-72, 352)`.
- [MISSING] Block Supply moved near `(-568, 280)`.
- [MISSING] Auto Haus moved near `(-448, -660)`.
- [MISSING] City Garage moved near `(-112, -616)`.
- [MISSING] Zaylins Prep moved near `(-724, 72)`.
- [MISSING] Police Station moved near `(632, -312)`.
- [MISSING] WorkTower moved near `(664, -20)`.
- [MISSING] Iron City Gym moved near `(448, 448)`.
- [MISSING] 6twelve moved near `(832, 232)`.
- [MISSING] Zaylins Home moved near `(48, 828)`.
- [MISSING] Dreamdrop Park expanded near `(420, 568)`.
- [MISSING] all door-return positions updated.
- [MISSING] all minimap markers updated.
- [MISSING] all mission checkpoints updated.
- [MISSING] gas refuel trigger moved with 6twelve.
- [MISSING] police dispatch spawn routes moved with precinct.

---

## 5. Criminal-record foundation

- [PARTIAL] wanted, heat, bust, legal fees, car theft, weapons, police response, and civilian reactions exist.
- [MISSING] hidden crimes tracked by town.
- [MISSING] arrests tracked by town.
- [MISSING] convictions tracked by town.
- [MISSING] active cases tracked separately from active wanted level.
- [MISSING] sentence completion state.
- [MISSING] permanent local police-disqualification flag.
- [MISSING] out-of-town reform certificate.
- [MISSING] clean-period tracking after reform.
- [MISSING] official record UI at police desk.
- [MISSING] offense-specific case records.
- [MISSING] conviction created only after catch/processing.
- [VERIFY] uncaught crime never accidentally creates an official record.

---

## 6. Starter Town police-career eligibility

- [MISSING] police career option at Dreamdrop Public Safety desk.
- [MISSING] background-check logic.
- [MISSING] permanent rejection after any Starter Town conviction.
- [MISSING] temporary rejection for active wanted/open case.
- [MISSING] uncaught crime ignored by official background check.
- [MISSING] out-of-town conviction requires Reformed Citizen certificate.
- [MISSING] Foundation Certificate requirement.
- [MISSING] Civics & Law lesson requirement.
- [MISSING] Driver Education and road-test requirement.
- [MISSING] minimum fitness requirement.
- [MISSING] minimum smarts requirement.
- [MISSING] exact rejection-reason UI.
- [MISSING] no paid bypass for disqualification.

Eligibility acceptance cases:

```txt
Case A: No crimes -> eligible after prerequisites.
Case B: Crimes committed, never caught -> eligible after prerequisites.
Case C: Convicted in Starter Town -> permanently ineligible in Starter Town.
Case D: Convicted in Starter Town, reformed -> eligible in another town only.
Case E: Active wanted level -> temporarily blocked everywhere relevant.
```

---

## 7. Police academy

- [MISSING] application flow.
- [MISSING] academy progress save state.
- [MISSING] Civics and Law test.
- [MISSING] fitness test.
- [MISSING] police driver test.
- [MISSING] traffic-control training.
- [MISSING] de-escalation scenarios.
- [MISSING] evidence basics.
- [MISSING] radio procedure.
- [MISSING] patrol navigation across 2,000 x 2,000 city.
- [MISSING] arrest-procedure training.
- [MISSING] cadet ride-along.
- [MISSING] probationary officer state.

---

## 8. Police jobs and ranks

- [MISSING] Front Desk Cadet shift.
- [MISSING] School Crossing Detail.
- [MISSING] Traffic Control shift.
- [MISSING] Community Patrol.
- [MISSING] Report Filing.
- [MISSING] Vehicle Inspection.
- [MISSING] Dispatch Response.
- [MISSING] Reckless Driver Stop.
- [MISSING] Stolen Vehicle Recovery.
- [MISSING] Store Alarm response.
- [MISSING] Disturbance Call.
- [MISSING] Missing Item/Person search.
- [MISSING] Evidence Transport.
- [MISSING] Pursuit Assistance.
- [MISSING] Highway Patrol.
- [MISSING] shift scoring for safety/procedure.
- [MISSING] disciplinary strikes and suspension.
- [MISSING] firing and criminal processing for corrupt/offending officer.
- [MISSING] ranks: Cadet, Probationary, Patrol, Senior, Specialist.
- [MISSING] promotions and pay progression.

---

## 9. Cross-town police careers

- [DONE] design rule documented for every town's law equivalent.
- [PARTIAL] town theme data now lists law-career variants.
- [MISSING] Harbor Patrol academy and shifts.
- [MISSING] Rich Hills Police academy and shifts.
- [MISSING] TechTown Metro Security/Police academy and shifts.
- [MISSING] Casino Strip Police academy and shifts.
- [MISSING] Starline Police academy and shifts.
- [MISSING] Dungeon Warden/Ranger academy and shifts.
- [MISSING] Obby Canyon Ranger academy and shifts.
- [MISSING] Aqualume Current Guard academy and shifts.
- [MISSING] transfer/reform application flow.

---

## 10. Release gate

The scale revision is not complete until:

```txt
- Starter Town is approximately 2,000 x 2,000.
- Major city drives take real minutes.
- district streaming prevents the large map from loading everything at once.
- functional buildings remain usable after relocation.
- police can navigate the full city.
- police officer is a playable career.
- a local conviction permanently closes that local department.
- uncaught crimes do not appear on the official record.
- a reformed player may apply in a different jurisdiction.
- no tutorial forces crime or police employment.
```
