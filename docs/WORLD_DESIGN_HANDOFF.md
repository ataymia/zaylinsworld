# ZTA World Design Handoff

Status: world-design foundation complete, ready for implementation workstreams  
Project: Zaylins Kid World, also called ZTA

This document marks the completion of the dedicated world and city design phase.

The world is not immutable. Future story, asset, gameplay, and QA work may reveal improvements. However, implementation no longer needs to invent the basic geography, identity, districts, civic systems, travel structure, housing, schools, law careers, jobs, services, or visual direction of the world.

---

## 1. Completed world structure

The planned connected world contains:

1. Starter Town
2. Fishing Harbor
3. Rich Hills
4. TechTown
5. Casino Strip
6. Dungeon Outskirts
7. Obby Canyon
8. Starline City
9. Aqualume
10. Crownwater Basin as a shared water ecosystem rather than a decorative boundary

Starter Town is a 2,000 x 2,000 reference city. The wider initial world spans roughly 22,000 x 20,000 planning units before future expansion and vertical/underwater depth.

---

## 2. Completed planning layers

The design library now defines:

- authoritative town origins and bounds;
- multi-minute travel corridors;
- district and neighborhood hierarchy;
- major roads, highways, parkways, bridges, tunnels, dirt roads, sea routes, and underwater routes;
- water, swimming, breath, Gillyfish, and Aqualume progression;
- town-specific visual identity and concept-art preservation;
- housing tiers and property roles;
- schools and curricula;
- ordinary jobs and local career paths;
- jurisdictional police careers and criminal records;
- crime, consequences, bans, fines, reform, and heat differences;
- shops, food, recovery, clinics, fuel, charging, mechanic, towing, and impound roles;
- GridLink teleporter progression;
- call-a-car and cross-town garage rules;
- vehicle damage and recovery;
- snacks, meals, drinks, and medical recovery;
- asset families and naming;
- streaming, LOD, filler massing, and performance intent;
- town completion and visual acceptance gates.

---

## 3. Authoritative shared documents

Implementation work must begin with the relevant documents:

- `WORLD_BLUEPRINT_INDEX.md`
- `LARGE_WORLD_SCALE_BLUEPRINT.md`
- `WORLD_MAP_DESIGN.md`
- `CITY_BLUEPRINT_STANDARD.md`
- `WORLD_VISUAL_REFERENCE_BIBLE.md`
- `TOWN_SELF_SUSTAINING_SYSTEMS.md`
- `POLICE_CAREER_SYSTEM.md`
- `WATER_ECOSYSTEM_BLUEPRINT.md`
- `WORLD_TRAVEL_VEHICLE_AND_RECOVERY_SYSTEMS.md`
- the applicable town blueprint;
- the applicable live implementation checklist.

Forward-looking data references:

- `src/config/worldMapPlan.js`
- `src/config/townThemes.js`
- `src/config/worldSystemsPlan.js`

These data files are planning contracts and are not necessarily wired into runtime yet.

---

## 4. Final cross-world convenience rules

### GridLink

- purchased only at TechTown;
- recommended aspirational price of 250,000 DreamBucks;
- permanently owned after purchase;
- 180-second cooldown after successful use;
- discovered and synchronized safe nodes only;
- player only, not vehicle;
- cannot bypass first visits, Gillyfish, Aqualume discovery, police, mission, dungeon, course, combat, or restriction states.

### Garage Concierge

- call owned road vehicles through the phone;
- deliver to a safe legal curb, lot, driveway, or pull-off;
- boats, yachts, sea scooters, and submarines use compatible docks;
- impounded, destroyed, repairing, or already active vehicles cannot duplicate;
- mechanic, tow, insurance, fuel, charge, and garage state remain meaningful.

### Food and recovery

- snacks restore hunger plus small health;
- meals restore more hunger and health;
- drinks primarily restore thirst and may support energy;
- medical items restore stronger health;
- clinics remain the most reliable full-recovery service;
- use is transactional and cannot duplicate inventory.

---

## 5. Visual promise

The approved town images are now translated into `WORLD_VISUAL_REFERENCE_BIBLE.md`.

Implementation must preserve:

- Starter Town's large district city, Beltway, civic hill, auto district, school campus, park, and residential massing;
- Fishing Harbor's lighthouse, working marina, market, patrol, academy, fuel, boats, traps, cottages, and rare-catch routes;
- Rich Hills' ridge estates, golf, civic crest, marina, gates, service village, and visible worker economy;
- TechTown's transit core, academy, drones, ByteMart, smart homes, security, VoltFuel, charge zones, Cloudview skyline, and GridLink visual language;
- Casino Strip's hotels, arena, game halls, arcade, prize pavilion, worker housing, police, academy, parking, fuel, and backstage logistics;
- Dungeon Outskirts' colossal descending gate, academy, guild, craft shops, shrine, healer, warden, fuel, cabins, and negative space;
- Obby Canyon's drivable base, academy, ranger, rescue, housing, fuel, summit, waterfall, and enormous foot-only vertical courses;
- Starline City's public glamour, hillside homes, worker apartments, academy, theaters, music, fashion, backlots, studios, warehouses, and StarStop;
- Aqualume's Pearl Spire, Tideglass Academy, Current Guard, CurrentShift generators, Bluecore transit, Coral Market, homes, scooter lanes, mini-sub docks, gardens, and sea life;
- the master map's large biome transitions, Crownwater Basin, physical roads, sea routes, underwater routes, and separated towns.

---

## 6. Next workstreams

World design now hands off into four parallel but coordinated workstreams:

```txt
Story and mission design
Asset design and production
Runtime implementation
UI, bug, QA, and release validation
```

Every implementation ticket should identify:

- town;
- district;
- road or travel dependency;
- assets;
- interactions;
- save state;
- jobs or activities;
- police/crime relevance;
- housing/school/service relevance;
- visual-reference requirements;
- streaming and performance requirements;
- acceptance checklist.

---

## 7. Change-control rule

Future additions are allowed, but they must not casually:

- shrink the world;
- collapse districts into one block;
- move town gateways without updating the master map;
- make Aqualume purchasable;
- bypass police-career consequences;
- sell GridLink outside TechTown;
- reduce GridLink's cooldown below the locked three-minute design without explicit approval;
- let teleportation reveal undiscovered towns;
- delete vehicle condition, garages, mechanic, or impound relevance;
- turn food into unlimited instant combat healing;
- discard approved concept-image landmarks or service infrastructure;
- replace canonical names because of accidental generated poster text.

Final handoff statement:

```txt
The world has a geography.
Every town has a civic identity.
Every road has a purpose.
Every convenience has a progression cost.
The design phase has delivered the map.
The next phase builds it.
```