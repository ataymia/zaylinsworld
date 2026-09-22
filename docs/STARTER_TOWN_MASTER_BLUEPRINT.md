# Starter Town Master Blueprint

Status: authoritative Starter Town planning front door  
Project: Zaylins Kid World, also called ZTA

Starter Town is ZTA's first complete reference city. It is a 2,000 x 2,000 playable city with multiple districts, multi-minute cross-city driving, housing, foundational education, ordinary and police careers, optional crime, public services, and gateways to the wider world.

This master page resolves planning precedence and prevents older compact-map numbers from being implemented accidentally.

---

## 1. Required reading order

Implementation work must read these documents in order:

1. [STARTER_TOWN_MASTER_BLUEPRINT.md](STARTER_TOWN_MASTER_BLUEPRINT.md)
2. [LARGE_WORLD_SCALE_BLUEPRINT.md](LARGE_WORLD_SCALE_BLUEPRINT.md)
3. [STARTER_TOWN_BLUEPRINT.md](STARTER_TOWN_BLUEPRINT.md)
4. [POLICE_CAREER_SYSTEM.md](POLICE_CAREER_SYSTEM.md)
5. [STARTER_TOWN_IMPLEMENTATION_CHECKLIST.md](STARTER_TOWN_IMPLEMENTATION_CHECKLIST.md)
6. [STARTER_TOWN_SCALE_AND_POLICE_CHECKLIST.md](STARTER_TOWN_SCALE_AND_POLICE_CHECKLIST.md)
7. [CITY_BLUEPRINT_STANDARD.md](CITY_BLUEPRINT_STANDARD.md)

---

## 2. Document precedence

When documents conflict, use this order:

```txt
1. This master page
2. Large World Scale Blueprint
3. Police Career System
4. Starter Town Scale and Police Checklist
5. Starter Town Blueprint
6. Older world/town summaries
```

The following earlier values are explicitly retired:

```txt
500 x 480 Starter Town footprint
600 x 580 Starter Town ground plane
600-700 unit spacing between town centers
sub-minute inter-town drives
```

Authoritative replacement:

```txt
Starter playable footprint: 2,000 x 2,000
Starter terrain envelope: about 2,400 x 2,400
Connected world envelope: about 22,000 x 20,000 before later expansion
Neighboring-town routes: generally 2.5-5 real minutes
```

---

## 3. Locked Starter Town identity

```txt
Central historic core: Dreamdrop District
Town role: first complete reference city and tutorial home base
Map identity: large city, not compact grid
Functional-building rule: relocate and deepen existing buildings before adding new ones
Crime rule: optional path, never forced tutorial homework
Housing rule: property ownership begins here
School rule: broad foundational curriculum begins here
Career rule: police officer is a major clean-record career
Travel rule: home, school, work, stores, police, gym, fuel, and garage are physically separated
```

---

## 4. Locked districts

```txt
Dreamdrop District
Market Mile
Northworks / Auto Row
Scholar's Quarter
Civic Heights
Eastgate Corridor
Parkside Commons
Willowbend Residential
Westside Blocks
```

Each district contains multiple blocks or sub-neighborhoods, not one landmark parcel.

---

## 5. Locked road identity

Starter Town requires:

```txt
Dreamdrop Beltway
Dreamdrop Boulevard
Centre Avenue
Northworks Expressway
Fishing Highway gateway
Eastgate Parkway / Rich Hills gateway
Civic Rise hill road
Scholar Road and School Loop
Parkside Crescent and roundabout
Willowbend local network and cul-de-sacs
Market and civic service roads
alleys and back lanes
```

Target legal travel times:

```txt
Home -> School: 2.5-4 minutes
Home -> WorkTower: 3-5 minutes
Home -> Auto Haus: 4-6 minutes
West edge -> East edge: 4-7 minutes
Full Beltway: 8-12 minutes
```

---

## 6. Locked functional-building anchors

```txt
Frostbox          (-168, -88)
Chicken Spot      (192, -152)
Kicks & Fits      (-72, 352)
Block Supply      (-568, 280)
Auto Haus         (-448, -660)
City Garage       (-112, -616)
Zaylins Prep      (-780, 72)
Police Station    (632, -312)
WorkTower         (664, -20)
Iron City Gym     (448, 448)
6twelve           (832, 232)
Zaylins Home      (48, 828)
Dreamdrop Park    (420, 568)
```

These are planning anchors and may shift slightly for collision, parcel, and road alignment.

---

## 7. Police career lock

Police officer is a Starter Town career.

```txt
No Starter Town conviction:
- career may remain available after academy prerequisites

Crime committed but never caught:
- hidden history only
- no official record
- background check may still pass

Convicted in Starter Town:
- permanently barred from Dreamdrop police employment

Convicted in Starter Town, later reformed:
- still barred in Starter Town
- may apply in another town after reform if no local conviction there
```

Starter police career progression:

```txt
Applicant
Cadet
Probationary Officer
Patrol Officer
Senior Patrol Officer
Traffic or Community Specialist
```

Core work includes academy training, school crossing detail, traffic enforcement, community patrol, dispatch calls, stolen-vehicle recovery, store alarms, evidence transport, highway patrol, and pursuit assistance.

---

## 8. Starter Town completion gates

Starter Town is not complete until:

```txt
- playable area is approximately 2,000 x 2,000
- districts are recognizable and connected by multiple route types
- cross-city travel takes real minutes
- existing functional buildings work after relocation
- filler neighborhoods make distance believable
- housing ownership begins here
- Zaylins Prep has foundational subjects
- several legal careers are available
- police officer is playable for eligible players
- local conviction permanently closes local police career
- uncaught crime does not create an official record
- crime tutorial is optional
- police, traffic, missions, minimap, and save migration work across the large map
- only one authoritative terrain surface is rendered; no green/brown depth flicker
- city-map roadways use the same route source as the drivable world
- every functional exterior visibly communicates its name and use
- traffic and pedestrians visibly circulate beyond the arrival district
- trees, rocks, curbs, signs, and streetlights have appropriate vehicle collision
- production filler buildings block vehicles across their full footprints
- breakable roadside infrastructure restores after the configured world-repair interval
- only the active interior renders and a failed transition safely returns the player outside
- streaming/LOD prevents the city from loading every asset at full detail
```

Final statement:

```txt
Starter Town is not the small town players outgrow in ten minutes.
It is their first city, their first home, and the measuring stick for every town that follows.
```
