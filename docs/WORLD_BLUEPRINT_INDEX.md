# ZTA World Blueprint Index

Status: master planning index  
Project: Zaylins Kid World, also called ZTA

This index is the front door for world implementation. It separates world-wide rules from town-specific build specifications.

## World hierarchy

```txt
ZTA connected world
-> city/town
-> district
-> neighborhood/block
-> building, road, property, job, school, activity, or service
```

A city/town cannot be represented by one block of landmarks. Every town blueprint must define multiple districts or equivalent geographic zones with distinct movement and gameplay.

## World-wide planning

1. [LARGE_WORLD_SCALE_BLUEPRINT.md](LARGE_WORLD_SCALE_BLUEPRINT.md) — authoritative 2,000 x 2,000 Starter Town scale, multi-thousand-unit town spacing, travel-time targets, and streaming architecture.
2. [WORLD_MAP_DESIGN.md](WORLD_MAP_DESIGN.md) — connected-world route hierarchy and large-world layout.
3. [POLICE_CAREER_SYSTEM.md](POLICE_CAREER_SYSTEM.md) — jurisdictional criminal records, police eligibility, reform, academy, ranks, and shifts.
4. [ZTA_WORLD_BLUEPRINT.md](ZTA_WORLD_BLUEPRINT.md) — macro world, town silhouettes, and integration sequence.
5. [CITY_BLUEPRINT_STANDARD.md](CITY_BLUEPRINT_STANDARD.md) — mandatory detail standard for every city.
6. [TOWN_SELF_SUSTAINING_SYSTEMS.md](TOWN_SELF_SUSTAINING_SYSTEMS.md) — housing, schools, jobs, skills, police, crime, and civic minimums.
7. [WATER_ECOSYSTEM_BLUEPRINT.md](WATER_ECOSYSTEM_BLUEPRINT.md) — Crownwater Basin, swimming, breath, fishing catches, Gillyfish, boats, yachts, sea life, currents, and underwater access.
8. [TOWN_ROADMAP.md](TOWN_ROADMAP.md) — compact summary and links.
9. [MINIGAME_FRAMEWORK.md](MINIGAME_FRAMEWORK.md) — shared activity lifecycle.

## Detailed town blueprints

| Town | Blueprint | Core identity | Planning status |
|---|---|---|---|
| Starter Town | [STARTER_TOWN_BLUEPRINT.md](STARTER_TOWN_BLUEPRINT.md), [LARGE_WORLD_SCALE_BLUEPRINT.md](LARGE_WORLD_SCALE_BLUEPRINT.md), [STARTER_TOWN_IMPLEMENTATION_CHECKLIST.md](STARTER_TOWN_IMPLEMENTATION_CHECKLIST.md), [STARTER_TOWN_SCALE_AND_POLICE_CHECKLIST.md](STARTER_TOWN_SCALE_AND_POLICE_CHECKLIST.md) | 2,000 x 2,000 reference city, ordinary life, tutorial, housing, foundational school/jobs/law | detailed; runtime audited; scale revision locked |
| TechTown | [TECH_TOWN_BLUEPRINT.md](TECH_TOWN_BLUEPRINT.md) | smart city, coding, drones, robotics, tech crime | detailed |
| Starline City | [STARLINE_CITY_BLUEPRINT.md](STARLINE_CITY_BLUEPRINT.md) | studios, performance, fashion, media, reputation | detailed |
| Fishing Harbor | [FISHING_HARBOR_BLUEPRINT.md](FISHING_HARBOR_BLUEPRINT.md) | fishing, boats, market, marine school, harbor economy, Gillyfish discovery | detailed |
| Dungeon Outskirts | [DUNGEON_OUTSKIRTS_BLUEPRINT.md](DUNGEON_OUTSKIRTS_BLUEPRINT.md) | sparse surface outpost + deep dungeon crawler | detailed |
| Obby Canyon | [OBBY_CANYON_BLUEPRINT.md](OBBY_CANYON_BLUEPRINT.md) | base settlement + vertical platform mastery | detailed |
| Rich Hills | [RICH_HILLS_BLUEPRINT.md](RICH_HILLS_BLUEPRINT.md) | property, luxury, hospitality, golf, marina, yachts, strict security | detailed |
| Casino Strip | [CASINO_STRIP_BLUEPRINT.md](CASINO_STRIP_BLUEPRINT.md) | fictional game halls, arcade, hotels, hospitality | detailed |
| Aqualume | [AQUALUME_BLUEPRINT.md](AQUALUME_BLUEPRINT.md) | earned underwater final city, currents, sea life, salvage, advanced jobs | detailed |

## Authoritative large-world origins

```txt
Starter Town        (0, 0)
Fishing Harbor      (0, -5200)
Rich Hills          (5200, 0)
TechTown            (5200, -5200)
Casino Strip        (0, -10400)
Dungeon Outskirts   (10400, -5200)
Obby Canyon         (10400, -10400)
Starline City       (0, -15600)
Aqualume            (3000, -7800) underwater
```

Approximate initial world envelope:

```txt
22,000 x 20,000 units
plus water, underwater depth, terrain buffers, and future expansion
```

The forward-looking source of truth is
[src/config/worldMapPlan.js](../src/config/worldMapPlan.js).

## Starter Town expansion structure

```txt
Dreamdrop District       historic downtown/tutorial core
Market Mile              style, gear, retail, service lanes
Northworks / Auto Row    vehicles, garage, industry, highway ramp
Scholar's Quarter        school, youth, foundational skills
Civic Heights            police, WorkTower, city services, hill roads
Eastgate Corridor        fuel, travel, Rich Hills gateway
Parkside Commons         gym, recreation, park, curved roads
Willowbend Residential   player home, housing, neighborhood life
Westside Blocks          working neighborhood and market transition
```

The current compact grid is a runtime foundation only. The final Starter Town is 2,000 x 2,000 with a Beltway, expressway/highway approaches, parkways, multiple arterials, local roads, hills, alleys, roundabouts, school zones, and filler neighborhoods between functional buildings.

Target legal driving times:

```txt
Home -> School: 2.5-4 minutes
Home -> WorkTower: 3-5 minutes
Home -> Auto Haus: 4-6 minutes
West edge -> East edge: 4-7 minutes
Full Starter Beltway: 8-12 minutes
```

## Police career structure

Police is a real career family in every jurisdiction.

```txt
Uncaught crime:
- hidden history only
- no official criminal record
- police application may remain available

Conviction in a town:
- permanent disqualification from that town's department
- cannot be purchased or waited away

Conviction elsewhere:
- complete sentence, civics, community work, and clean period
- earn Reformed Citizen status
- may apply in a different town with no local conviction
```

Department variants:

```txt
Starter Town      Dreamdrop Police / Public Safety
Fishing Harbor    Harbor Patrol
Rich Hills        Rich Hills Police
TechTown          Metro Security / Police
Casino Strip      Strip Police
Starline City     Starline Police
Dungeon           Warden / Ranger
Obby Canyon       Canyon Ranger / Safety
Aqualume          Current Guard
```

See [POLICE_CAREER_SYSTEM.md](POLICE_CAREER_SYSTEM.md).

## Water-world structure

```txt
Fishing Harbor working coast
        |
Lighthouse Trench / Gillyfish discovery route
        |
Crownwater Basin surface and reef ecosystem
        |
Aqualume Gate and Moonpool Terminal
        |
Aqualume city
        |
Abyssal Edge late-game zone

Rich Hills Marina connects to Crownwater Basin through yachts, speedboats,
and a later pressure-sub route. Casino Strip connects across the coastal bridge channel.
```

## Planning order

```txt
1. TechTown
2. Starline City / Hollywood-Fame Town
3. Fishing Harbor
4. Dungeon Outskirts
5. Obby Canyon
6. Rich Hills
7. Casino Strip
8. Crownwater Basin water ecosystem
9. Aqualume final underwater town
10. Expanded Starter Town and live-runtime gap audit
11. Large-world scale revision
12. Police career and jurisdictional criminal-record system
```

## Recommended implementation order

```txt
1. Add large-world bounds, streaming-cell metadata, and safe old-save migration.
2. Build Starter Town polyline/curve-road engine and Dreamdrop Beltway prototype.
3. Expand Starter Town to 2,000 x 2,000 and relocate existing functional buildings.
4. Add instanced filler neighborhoods, LOD, district traffic, and city-map UI.
5. Implement Starter housing, foundational school, job board, city services, and optional branching tutorial.
6. Implement jurisdictional criminal records and police-career eligibility.
7. Build Starter police academy, cadet work, patrol shifts, discipline, and ranks.
8. Deepen Starter crime consequences after the expanded road/police map is stable.
9. Implement basic water, swimming, breath, safe drowning return, and shore boundaries.
10. Build Fishing Harbor as the first new connected town.
11. Expand fishing catch tables, including non-fish loot and Gillyfish.
12. Add boats, marina slips, fuel docks, and Crownwater Basin routes.
13. Build Obby Canyon course prototype.
14. Build Dungeon Outskirts surface + first dungeon floor.
15. Build TechTown after curved roads, transit, and dense streaming are proven.
16. Build Rich Hills after hill roads, property, marina, yachts, and security modifiers exist.
17. Build Casino Strip after local currencies, hotels, crowds, security, and payout controls exist.
18. Build Starline City after rhythm, reputation, events, studios, and crowd scheduling exist.
19. Build Aqualume arrival after water streaming, currents, camera, Gillyfish persistence, and underwater vehicles are stable.
20. Build full Aqualume, then Abyssal Edge.
```

This is a dependency recommendation, not a creative priority ranking.

## Non-negotiable town completion rule

No town is complete until the player can:

```txt
- arrive and understand its geography
- identify and navigate multiple districts
- travel safely by its supported transportation modes
- experience route complexity appropriate to the town
- buy or select local housing
- attend its school/training center
- work multiple geographically appropriate jobs
- access its law-career equivalent when eligible
- play multiple town-specific activities
- buy food and ordinary supplies
- recover health/energy and use local services
- refuel/charge where vehicles are allowed
- encounter local police/security and local crime consequences
- clear local trouble without a softlock
- live there without depending on Starter Town
- revisit for a lasting progression reason
```

Starter Town has additional rules:

```txt
- it must measure approximately 2,000 x 2,000 playable units
- cross-city driving must take real minutes
- it must introduce housing, school, jobs, law, police career, shopping, needs, driving, and travel
- it must be completable without committing assault, robbery, or any other crime
- an optional risky path must still demonstrate the crime sandbox and consequences
```

Police-career completion rules:

```txt
- hidden crimes and official records are separate
- uncaught crimes do not appear in a normal background check
- local conviction permanently closes the local department
- reform may open another town's department, never the convicting town
- officer gameplay scores lawful procedure and civilian safety
- no paid bypass can restore eligibility
```

Additional water-city completion rules:

```txt
- breath and safe-return behavior cannot corrupt inventory or saves
- Gillyfish adaptation must save permanently
- Gillyfish access must include pity and a hard guarantee
- water boundaries and depth changes must be readable
- friendly sea life cannot be sold as disposable mounts
- Aqualume cannot be purchased as a premium unlock
```

## Asset implementation order inside each town

```txt
1. Style-anchor props
2. Terrain, water, road/current skeleton, and streaming cells
3. District boundaries, routes, and filler massing
4. Civic/service exteriors
5. Housing and school exteriors
6. Hero entertainment/gameplay exteriors
7. Core interiors
8. Jobs, careers, and minigame support assets
9. Police/crime/housing systems
10. NPC/creature population and schedules
11. Lighting, sound, signage, performance, and QA
```

## Agent rule

An implementation agent must read the relevant town blueprint,
[CITY_BLUEPRINT_STANDARD.md](CITY_BLUEPRINT_STANDARD.md), [LARGE_WORLD_SCALE_BLUEPRINT.md](LARGE_WORLD_SCALE_BLUEPRINT.md), and any applicable shared-system blueprint before changing a town.

For Starter Town, the agent must also read:

- [STARTER_TOWN_IMPLEMENTATION_CHECKLIST.md](STARTER_TOWN_IMPLEMENTATION_CHECKLIST.md)
- [STARTER_TOWN_SCALE_AND_POLICE_CHECKLIST.md](STARTER_TOWN_SCALE_AND_POLICE_CHECKLIST.md)
- [POLICE_CAREER_SYSTEM.md](POLICE_CAREER_SYSTEM.md)

For Fishing Harbor, Rich Hills Marina, Casino Bridge water, or Aqualume, the agent must also read [WATER_ECOSYSTEM_BLUEPRINT.md](WATER_ECOSYSTEM_BLUEPRINT.md).

Agents must not shrink the world back to adjacent playsets, invent missing districts, move gateways, replace established names, expose placeholder interactions, force crime in the tutorial, create a paid police-record bypass, turn Gillyfish into a purchase, or bypass permanent-unlock save rules without an explicit planning update.
