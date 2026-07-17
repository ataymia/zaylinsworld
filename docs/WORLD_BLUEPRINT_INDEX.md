# ZTA World Blueprint Index

Status: master planning index; world-design foundation complete  
Project: Zaylins Kid World, also called ZTA

This index is the front door for world implementation. It separates world-wide rules, visual direction, shared systems, and town-specific build specifications.

## World hierarchy

```txt
ZTA connected world
-> city/town
-> district
-> neighborhood/block
-> building, road, property, job, school, activity, or service
```

A town cannot be represented by one block of landmarks. Every town blueprint defines multiple districts or equivalent geographic zones with distinct movement, services, population, and gameplay.

---

## World-wide planning

1. [WORLD_DESIGN_HANDOFF.md](WORLD_DESIGN_HANDOFF.md) - completed design-phase handoff and change-control rules.
2. [LARGE_WORLD_SCALE_BLUEPRINT.md](LARGE_WORLD_SCALE_BLUEPRINT.md) - authoritative 2,000 x 2,000 Starter Town scale, world spacing, travel times, and streaming architecture.
3. [WORLD_MAP_DESIGN.md](WORLD_MAP_DESIGN.md) - connected-world route hierarchy and large-world layout.
4. [WORLD_VISUAL_REFERENCE_BIBLE.md](WORLD_VISUAL_REFERENCE_BIBLE.md) - approved concept-art translation for every town and the master map.
5. [WORLD_TRAVEL_VEHICLE_AND_RECOVERY_SYSTEMS.md](WORLD_TRAVEL_VEHICLE_AND_RECOVERY_SYSTEMS.md) - GridLink, Garage Concierge, vehicle damage, mechanics, towing, food, and health recovery.
6. [POLICE_CAREER_SYSTEM.md](POLICE_CAREER_SYSTEM.md) - jurisdictional records, police eligibility, reform, academy, ranks, and shifts.
7. [WATER_ECOSYSTEM_BLUEPRINT.md](WATER_ECOSYSTEM_BLUEPRINT.md) - Crownwater Basin, swimming, breath, fishing catches, Gillyfish, boats, yachts, sea life, currents, and Aqualume access.
8. [CITY_BLUEPRINT_STANDARD.md](CITY_BLUEPRINT_STANDARD.md) - mandatory city-detail standard.
9. [TOWN_SELF_SUSTAINING_SYSTEMS.md](TOWN_SELF_SUSTAINING_SYSTEMS.md) - housing, schools, jobs, skills, law, crime, and civic minimums.
10. [ZTA_WORLD_BLUEPRINT.md](ZTA_WORLD_BLUEPRINT.md) - macro world and integration direction.
11. [TOWN_ROADMAP.md](TOWN_ROADMAP.md) - compact final summary and links.
12. [MINIGAME_FRAMEWORK.md](MINIGAME_FRAMEWORK.md) - shared activity lifecycle.

Forward-looking planning data:

- [src/config/worldMapPlan.js](../src/config/worldMapPlan.js)
- [src/config/townThemes.js](../src/config/townThemes.js)
- [src/config/worldSystemsPlan.js](../src/config/worldSystemsPlan.js)

These files reserve implementation contracts and are not necessarily wired into runtime yet.

---

## Detailed town blueprints

| Town | Blueprint | Core identity | Status |
|---|---|---|---|
| Starter Town | [STARTER_TOWN_BLUEPRINT.md](STARTER_TOWN_BLUEPRINT.md), [LARGE_WORLD_SCALE_BLUEPRINT.md](LARGE_WORLD_SCALE_BLUEPRINT.md), and Starter checklists | 2,000 x 2,000 reference city, ordinary life, tutorial, property, foundational education, jobs, law | detailed; runtime audited; expansion locked |
| Fishing Harbor | [FISHING_HARBOR_BLUEPRINT.md](FISHING_HARBOR_BLUEPRINT.md) | fishing, boats, market, marine school, harbor life, Gillyfish | detailed |
| Rich Hills | [RICH_HILLS_BLUEPRINT.md](RICH_HILLS_BLUEPRINT.md) | property, luxury, hospitality, golf, marina, yachts, strict security | detailed |
| TechTown | [TECH_TOWN_BLUEPRINT.md](TECH_TOWN_BLUEPRINT.md) | smart city, coding, drones, robotics, transit, GridLink | detailed |
| Casino Strip | [CASINO_STRIP_BLUEPRINT.md](CASINO_STRIP_BLUEPRINT.md) | fictional game halls, arcade, hotels, hospitality, shows | detailed |
| Dungeon Outskirts | [DUNGEON_OUTSKIRTS_BLUEPRINT.md](DUNGEON_OUTSKIRTS_BLUEPRINT.md) | sparse surface outpost plus deep dungeon crawler | detailed |
| Obby Canyon | [OBBY_CANYON_BLUEPRINT.md](OBBY_CANYON_BLUEPRINT.md) | base settlement plus vertical platform mastery | detailed |
| Starline City | [STARLINE_CITY_BLUEPRINT.md](STARLINE_CITY_BLUEPRINT.md) | studios, performance, fashion, media, reputation | detailed |
| Aqualume | [AQUALUME_BLUEPRINT.md](AQUALUME_BLUEPRINT.md) | earned underwater final city, currents, sea life, salvage, advanced work | detailed |

All towns also use [WORLD_VISUAL_REFERENCE_BIBLE.md](WORLD_VISUAL_REFERENCE_BIBLE.md).

---

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
plus Crownwater Basin, underwater depth, terrain buffers, and future expansion
```

The forward-looking source of truth is `src/config/worldMapPlan.js`. The approved master-map image is a visual planning poster and does not replace these coordinates.

---

## Shared progression and convenience

### GridLink Personal Teleporter

```txt
Purchase location: Gadget Forge Mobility Lab, TechTown only
Recommended price: 250,000 DreamBucks
Ownership: permanent
Cooldown: 180 real-time seconds after successful teleport
Destinations: physically discovered and synchronized safe nodes only
Moves vehicle: no
```

GridLink cannot:

- reveal an undiscovered town;
- replace the first physical trip;
- bypass Gillyfish or Aqualume discovery;
- escape an active pursuit, arrest, combat, mission lock, dungeon floor, Obby course, or restricted interior;
- move a car, boat, yacht, scooter, or submarine with the player.

### Garage Concierge

Players may call eligible owned vehicles through the phone.

- Road vehicles arrive at a safe curb, lot, driveway, garage entrance, or service pull-off.
- Boats and yachts arrive at compatible marinas and slips.
- Sea scooters and submarines arrive at compatible underwater docks.
- Impounded, destroyed, repairing, already active, or unavailable vehicles cannot duplicate.
- Vehicle condition, fuel, charge, home garage, damage, repair, tow, insurance/reclaim, and impound state persist.

### Food and recovery

- Snacks restore hunger plus small health.
- Meals restore more hunger and health.
- Drinks primarily restore thirst and may support energy.
- Medical items restore stronger health.
- Clinics remain the strongest reliable full-recovery service.
- Consumption uses transaction-safe inventory logic and short use timing.

See [WORLD_TRAVEL_VEHICLE_AND_RECOVERY_SYSTEMS.md](WORLD_TRAVEL_VEHICLE_AND_RECOVERY_SYSTEMS.md).

---

## Police career structure

Police and equivalent law work are real careers in every jurisdiction.

```txt
Uncaught crime:
- hidden history only
- no official criminal record
- local police application may remain available

Conviction in a town:
- permanently disqualified from that town's department
- cannot be purchased, waited, or teleported away

Conviction elsewhere:
- finish sentence and obligations
- complete civics, community work, and clean period
- earn Reformed Citizen status
- may apply in another town without a local conviction
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

---

## Water-world structure

```txt
Fishing Harbor working coast
        |
Lighthouse Trench / Gillyfish route
        |
Crownwater Basin surface and reef ecosystem
        |
Aqualume Gate and Moonpool Terminal
        |
Aqualume city
        |
Abyssal Edge late-game zone
```

Rich Hills Marina connects through boats, yachts, and later pressure-sub travel. Casino Strip connects across the coastal bridge channel.

Aqualume remains an earned unlock. GridLink becomes available there only after the player has permanent gills, discovers the city physically, and synchronizes Moonpool Gateway.

---

## Visual reference status

The approved concept images are now protected through [WORLD_VISUAL_REFERENCE_BIBLE.md](WORLD_VISUAL_REFERENCE_BIBLE.md).

The visual bible records:

- Starter Town's Beltway, district massing, civic hill, school, auto district, park, housing, and waterworks silhouette;
- Fishing Harbor's lighthouse, marina, market, academy, patrol, TideFuel, traps, boats, homes, and rare-catch routes;
- Rich Hills' estates, country club, civic crest, marina, gates, CrestFuel, valet, and service village;
- TechTown's innovation core, transit, drones, smart homes, Cloudview skyline, security, VoltFuel, charge zone, delivery depot, and GridLink language;
- Casino Strip's hotels, arena, game halls, arcade, prize pavilion, worker housing, police, academy, parking, fuel, and backstage operations;
- Dungeon Outskirts' monumental descending gate, academy, guild, craft shops, shrine, healer, warden, fuel, cabins, caravans, and negative space;
- Obby Canyon's drivable base, academy, ranger, rescue, housing, fuel, summit, waterfall, and vertical foot-only courses;
- Starline City's public glamour, worker housing, academy, music, fashion, studios, backlots, warehouses, water tower, and StarStop;
- Aqualume's Pearl Spire, Tideglass, Current Guard, CurrentShift generators, Bluecore, market, homes, scooters, subs, gardens, and sea life;
- the master map's separated towns, biomes, Crownwater Basin, highways, bridges, tunnels, dirt roads, sea routes, and underwater routes.

Canonical blueprint names remain authoritative when generated poster text differs.

---

## Planning completion order

```txt
1. TechTown detailed blueprint
2. Starline City
3. Fishing Harbor
4. Dungeon Outskirts
5. Obby Canyon
6. Rich Hills
7. Casino Strip
8. Crownwater Basin ecosystem
9. Aqualume
10. Expanded Starter Town audit and blueprint
11. Large-world scale revision
12. Police careers and jurisdictional criminal records
13. Town concept images and master map
14. GridLink, Garage Concierge, vehicle recovery, and food systems
15. Visual reference bible and final world-design handoff
```

---

## Recommended implementation order

```txt
1. Save migration, large-world bounds, streaming cells, and debug tools
2. Starter Town polyline/curve roads and Beltway prototype
3. Starter Town 2,000 x 2,000 expansion and functional-building relocation
4. Instanced filler, LOD, district traffic, city-map UI, and visual-reference pass
5. Starter housing, school, jobs, food/needs, property, and branching tutorial
6. Vehicle ownership, garages, damage, mechanics, towing, impound, and call-a-car
7. Jurisdictional records, police eligibility, academy, shifts, discipline, and ranks
8. Basic water, swimming, breath, safe rescue, and shoreline boundaries
9. Fishing Harbor, expanded catches, Gillyfish, boats, docks, and Crownwater Basin
10. Obby Canyon course systems
11. Dungeon Outskirts surface and first dungeon floor
12. TechTown dense streaming, transit, Gadget Forge, and GridLink purchase/sync system
13. Rich Hills roads, property, marina, yachts, and security modifiers
14. Casino Strip hotels, crowds, currencies, security, shows, and arcade systems
15. Starline City rhythm, reputation, events, studios, and production systems
16. Aqualume arrival, Moonpool sync, underwater vehicles, full city, then Abyssal Edge
17. Whole-world visual continuity, route timing, performance, and QA
```

This is a dependency plan, not a creative priority ranking.

---

## Non-negotiable town completion rule

No town is complete until the player can:

```txt
- arrive and understand its geography
- recognize multiple districts
- travel through route complexity appropriate to the town
- buy or select housing
- attend school/training
- work multiple local jobs
- access its law career when eligible
- play multiple town-specific activities
- buy food and ordinary supplies
- recover and use local services
- fuel/charge supported vehicles
- own, store, call, damage, repair, tow, and recover compatible vehicles
- encounter local law and crime consequences
- clear trouble without a softlock
- live there without depending on Starter Town
- revisit for lasting progression
- visually match its approved concept promise
```

Additional shared rules:

```txt
- first visits remain physical
- GridLink is TechTown-only and has a 180-second cooldown
- GridLink cannot bypass discovery or progression
- Garage Concierge cannot duplicate vehicles
- snacks cannot become unlimited instant combat healing
- Gillyfish adaptation saves permanently
- Aqualume cannot be purchased
- local convictions permanently close local police careers
- approved concept landmarks and service infrastructure cannot be silently removed
```

---

## Agent rule

Before changing a town, an implementation agent must read:

1. the applicable town blueprint;
2. `CITY_BLUEPRINT_STANDARD.md`;
3. `LARGE_WORLD_SCALE_BLUEPRINT.md`;
4. `WORLD_VISUAL_REFERENCE_BIBLE.md`;
5. any applicable shared-system blueprint;
6. the relevant implementation checklist.

For travel, vehicles, mechanics, food, or teleporter work, read `WORLD_TRAVEL_VEHICLE_AND_RECOVERY_SYSTEMS.md` and `src/config/worldSystemsPlan.js`.

For Fishing Harbor, Rich Hills water, Casino coastal routes, or Aqualume, also read `WATER_ECOSYSTEM_BLUEPRINT.md`.

For police or criminal-record work, also read `POLICE_CAREER_SYSTEM.md`.

Agents must not:

- shrink the world back to adjacent playsets;
- collapse districts into a landmark block;
- move gateways without a map update;
- sell GridLink outside TechTown;
- lower or bypass the three-minute GridLink cooldown without approval;
- teleport players to undiscovered towns;
- use GridLink to bypass Aqualume;
- duplicate or erase personal vehicles through delivery;
- erase mechanic, garage, towing, or impound relevance;
- create a paid criminal-record bypass;
- force crime in the tutorial;
- turn Gillyfish into a purchase;
- replace canonical names because of generated poster text;
- discard approved visual landmarks, worker districts, or civic infrastructure.

Final status:

```txt
The world-design objective is complete.
The next objective is implementation.
```