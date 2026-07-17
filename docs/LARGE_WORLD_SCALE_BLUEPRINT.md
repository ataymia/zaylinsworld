# Large World Scale Blueprint

Status: authoritative scale revision, planning data only  
Project: Zaylins Kid World, also called ZTA  
Supersedes: every earlier town origin, 500x480 Starter Town footprint, and sub-minute inter-town travel estimate

This document locks ZTA as a genuinely large connected world. Starter Town alone occupies a 2,000 x 2,000 playable footprint. Other towns sit thousands of world units away, with countryside, highways, coastline, water, tunnels, hills, and transition corridors between them.

The goal is not empty bigness. The goal is enough physical distance that homes, schools, jobs, stores, civic services, and town gateways feel geographically separate, and driving from one side of a city to the other takes real minutes.

---

## 1. Non-negotiable scale rules

```txt
1. Starter Town playable bounds are 2,000 x 2,000 world units.
2. Starter Town terrain/streaming envelope is at least 2,400 x 2,400.
3. Town centers must be separated by several thousand units.
4. Inter-town corridors must take multiple real minutes to drive.
5. No neighboring town origin may sit inside another town's playable bounds.
6. Large scale must use streaming, LOD, instancing, and district activation.
7. Empty distance must be shaped as countryside, water, infrastructure, neighborhoods, or terrain, not blank grass.
8. Fast travel may be unlocked later, but it may not replace the first physical trip.
9. Road difficulty must come from readable geometry, traffic, terrain, and speed.
10. Earlier coordinates in town documents are concept anchors only unless revised here.
```

---

## 2. Starter Town authoritative footprint

Starter Town remains centered at world origin.

```txt
playable west edge:  x = -1000
playable east edge:  x =  1000
playable north edge: z = -1000
playable south edge: z =  1000

playable footprint: 2,000 x 2,000
terrain envelope:   2,400 x 2,400
recommended buffer: 200 units beyond each playable edge
```

The existing compact grid becomes a small historic core inside Dreamdrop District. It should occupy only a fraction of the finished city.

### Target real-time travel

Assuming legal city driving with traffic, turns, lights, and normal acceleration:

| Route | Target travel time |
|---|---:|
| Willowbend home to Zaylins Prep | 2.5 to 4 minutes |
| Willowbend home to WorkTower | 3 to 5 minutes |
| Willowbend home to Auto Haus | 4 to 6 minutes |
| Dreamdrop District to Eastgate | 2 to 4 minutes |
| West edge to east edge | 4 to 7 minutes |
| North Gate to south residential edge | 4 to 7 minutes |
| Full Beltway loop | 8 to 12 minutes |

These are ordinary driving targets, not speed-run records.

---

## 3. Starter Town large-scale districts

Starter Town keeps the established district identities, but each district becomes a city-sized area containing multiple blocks and neighborhoods.

| District | Revised approximate bounds | Internal role |
|---|---|---|
| Dreamdrop District | x -300..300, z -300..280 | historic downtown and tutorial core |
| Market Mile | x -450..500, z 220..520 | retail corridor and service alleys |
| Northworks / Auto Row | x -900..350, z -1000..-360 | vehicle, industrial, warehouses, north highway |
| Scholar's Quarter | x -1000..-420, z -420..320 | school, youth, library/community district |
| Civic Heights | x 340..1000, z -500..280 | police, WorkTower, public services, hill roads |
| Eastgate Corridor | x 650..1000, z 120..560 | fuel, highway services, Rich Hills gateway |
| Parkside Commons | x 220..900, z 420..860 | park, gym, recreation, community life |
| Willowbend Residential | x -600..620, z 600..1000 | player home, houses, apartments, local streets |
| Westside Blocks | x -1000..-420, z 260..800 | mixed housing, Block Supply transition, working neighborhood |

Districts may overlap at transition edges. Those overlaps are intentional mixed-use corridors rather than hard walls.

### District sub-neighborhoods

Large districts should contain named subareas for navigation and NPC routines.

```txt
Dreamdrop District:
- Dreamdrop Cross
- Old Market Blocks
- Downtown East
- Service Alley Quarter

Northworks:
- Auto Row
- Warehouse Bend
- Tow Yard Flats
- North Gate Services

Scholar's Quarter:
- Prep Campus
- Library Blocks
- School Loop Homes

Civic Heights:
- Public Safety Hill
- WorkTower Plaza
- Civic Circle
- Overlook Road

Willowbend:
- Starter Home Block
- Willowbend Loop
- South Cul-de-Sacs
- Back Lane Homes
```

---

## 4. Revised functional-building anchors

These replace the earlier 500x480 planning anchors.

| Functional location | Revised anchor | District |
|---|---:|---|
| Frostbox | `(-168, -88)` | Dreamdrop District |
| Chicken Spot | `(192, -152)` | Dreamdrop District |
| Kicks & Fits | `(-72, 352)` | Market Mile |
| Block Supply | `(-568, 280)` | Westside / Market transition |
| Auto Haus | `(-448, -660)` | Northworks / Auto Row |
| City Garage | `(-112, -616)` | Northworks |
| Zaylins Prep | `(-724, 72)` | Scholar's Quarter |
| Police Station | `(632, -312)` | Civic Heights |
| WorkTower | `(664, -20)` | Civic Heights |
| Iron City Gym | `(448, 448)` | Parkside Commons |
| 6twelve | `(832, 232)` | Eastgate Corridor |
| Zaylins Home | `(48, 828)` | Willowbend Residential |
| Dreamdrop Park center | `(420, 568)` | Parkside Commons |

These are initial anchor coordinates. Each property receives a larger parcel, parking, service access, sidewalks, scenery, and neighborhood context.

---

## 5. Starter Town road hierarchy

Starter Town uses an inner-city network and an outer high-speed network.

### Major cross-city routes

```txt
Dreamdrop Boulevard:
west-east arterial through downtown and Civic Heights

Centre Avenue:
north-south arterial connecting Northworks, downtown, Parkside, and Willowbend

Dreamdrop Beltway:
large outer ring/partial ring connecting every outer district

Northworks Expressway:
fast industrial route and Fishing Highway approach

Eastgate Parkway:
Rich Hills connection and east-side commercial route

Civic Rise:
hill route with switchbacks, roundabout, guardrails, and downhill braking
```

### Secondary networks

```txt
Scholar Road and School Loop
Market Mile collector streets
Market Service Lane
Willowbend Loop and cul-de-sacs
Willowbend Back Lane
Parkside Crescent
Garage Service Road
Civic Service Road
Westside local grid
Northworks warehouse lanes
```

### Dreamdrop Beltway concept

The Beltway should prevent every cross-city trip from funneling through downtown.

```txt
(-900, -620)
(-520, -900)
(0, -980)
(520, -900)
(900, -560)
(980, 0)
(900, 520)
(560, 900)
(0, 980)
(-560, 900)
(-900, 520)
(-980, 0)
```

Branches connect the Beltway to every district. Portions may use freeway barriers, frontage roads, bridges over local streets, or terrain cuts.

### Road tiers

| Tier | Width | Typical speed | Use |
|---|---:|---:|---|
| Expressway/highway | 16-20 | 20-30 units/sec | gateways and outer travel |
| Parkway/arterial | 12-14 | 13-20 | cross-city travel |
| Main street | 9-11 | 9-14 | district spines |
| Local street | 7-9 | 5-9 | neighborhoods and school roads |
| Service road | 5.5-7 | 4-7 | warehouses, deliveries, civic access |
| Alley/back lane | 4.5-5.5 | 3-5 | risky shortcuts and local service |

---

## 6. Driving difficulty targets

Starter Town must teach several kinds of driving before the player reaches specialist towns.

| Zone | Driving identity |
|---|---|
| Dreamdrop core | traffic lights, pedestrians, curb parking, delivery vans |
| Northworks | long acceleration, trucks, blind loading exits, wide-to-tight turns |
| Civic Rise | elevation, S-curves, guardrails, downhill braking |
| Scholar's Quarter | school buses, raised crossings, strict low speed |
| Willowbend | parked cars, tight corners, alleys, cul-de-sacs |
| Parkside | roundabouts, curved roads, pedestrian exits |
| Eastgate | highway merge, gas-station entrances, faster traffic |
| Beltway | sustained speed, lane changes, ramps, exits |

A skilled driver can move efficiently. A reckless driver can crash, damage a vehicle, attract police, miss an exit, or end up taking a longer route.

---

## 7. Large connected-world origins

The earlier 600-700 unit town spacing is retired.

Recommended authoritative planning origins:

| Town | World origin | Suggested local footprint |
|---|---:|---:|
| Starter Town | `(0, 0)` | 2,000 x 2,000 |
| Fishing Harbor | `(0, -5200)` | 2,400 x 2,200 plus water |
| Rich Hills | `(5200, 0)` | 2,400 x 2,400 |
| TechTown | `(5200, -5200)` | 2,400 x 2,400 |
| Casino Strip | `(0, -10400)` | 2,200 x 2,600 |
| Dungeon Outskirts | `(10400, -5200)` | 2,000 x 2,000 surface plus dungeon layers |
| Obby Canyon | `(10400, -10400)` | 2,400 x 2,400 base/course envelope |
| Starline City | `(0, -15600)` | 2,600 x 2,600 |
| Aqualume | `(3000, -7800)` | 3,000 x 3,000 underwater envelope |

Approximate world envelope before later expansion:

```txt
width:  about 22,000 units including buffers and water
height: about 20,000 units including buffers and water
```

Aqualume occupies underwater space inside Crownwater Basin and may overlap surface X/Z travel corridors because it is vertically separated.

---

## 8. Inter-town corridor targets

| Connection | Route type | Target first-trip time |
|---|---|---:|
| Starter -> Fishing Harbor | highway/countryside | 3 to 5 minutes |
| Starter -> Rich Hills | parkway/hills | 3 to 5 minutes |
| Rich Hills -> TechTown | tunnel/mountain route | 2.5 to 4 minutes |
| Fishing Harbor -> Casino Strip | coast bridge/coastal highway | 3 to 5 minutes |
| TechTown -> Dungeon Outskirts | utility road/dirt route | 3 to 5 minutes |
| Dungeon -> Obby Canyon | canyon trail | 2.5 to 4 minutes |
| Casino Strip -> Starline City | entertainment boulevard | 3 to 5 minutes |
| Fishing/Rich water -> Aqualume | boat, trench, underwater route | 4 to 7 minutes |

Corridors require scenery and gameplay hooks:

- gas/service pull-offs
- countryside houses or farms
- water views
- bridges and tunnels
- occasional traffic
- police/highway patrol zones
- weather/lighting changes
- hidden routes or collectibles later
- safe streaming transition points

They should not be empty straight tubes.

---

## 9. Streaming and performance architecture

A 2,000 x 2,000 Starter Town cannot remain one always-active object pile.

### Recommended spatial chunks

```txt
Starter Town chunk size: 250 x 250
Starter grid: 8 x 8 playable chunks
Active high-detail radius: player chunk plus neighboring 3 x 3
Warm/preload ring: surrounding 5 x 5 as budget allows
Far view: skyline, terrain impostors, and low-detail roads only
```

### Required optimization systems

- district-based activation
- chunk streaming and disposal
- instanced filler buildings and vegetation
- LOD for buildings, vehicles, props, and NPCs
- pooled traffic and pedestrians
- far-distance skyline shells
- occlusion/frustum culling
- texture atlases and material reuse
- audio zones rather than citywide emitters
- nav/traffic simulation only near active routes
- interior unloading when outside
- saved persistent state separated from loaded visual state

### Persistence rule

Unloading a chunk must not erase:

- owned vehicles or homes
- active missions
- wanted/record state
- stored items
- damaged persistent objects that matter
- NPC relationship memory where saved

---

## 10. Map UI scale

Three required map levels:

```txt
Minimap:
nearby streets, immediate route, local markers

City map:
all Starter Town districts, Beltway, properties, jobs, services, active route

World map:
town silhouettes, inter-town corridors, water routes, gateways, unlock state
```

The city map must support pan/zoom. A fixed tiny minimap cannot communicate a 2,000 x 2,000 road network.

---

## 11. Implementation phases

### Phase 1: Large-world data

- update world origins
- add town bounds and gateway nodes
- add travel-time targets
- add streaming-cell metadata

### Phase 2: Starter road engine

- polyline/curve roads
- multiple widths
- Beltway prototype
- roundabouts, ramps, grade metadata
- point-to-segment road placement rules

### Phase 3: Starter district migration

- build 2,000 x 2,000 terrain envelope
- relocate functional buildings
- create district chunks
- preserve interior and mission hooks

### Phase 4: Filler and traffic

- instanced neighborhoods
- route-specific traffic
- parked cars
- service roads
- district pedestrians

### Phase 5: UI and streaming

- city map
- district labels
- route selection
- chunk activation and LOD

### Phase 6: Gateway corridors

- Fishing Highway
- Rich Hills Parkway
- first multi-minute inter-town drive

---

## 12. Acceptance tests

```txt
- Starter Town playable bounds measure about 2,000 x 2,000.
- Zaylins Home to Auto Haus takes several real minutes by legal roads.
- Player can choose inner roads or Beltway routes.
- Downtown is not visible in full detail from every city edge.
- Traffic and police can navigate every public route.
- No town origin overlaps another town's playable footprint.
- Driving across the entire connected world is a substantial trip.
- Chunk unloading never corrupts player progression.
- Filler explains geography instead of creating blank distance.
- Fast travel is optional convenience after physical discovery.
```

Final scale statement:

```txt
ZTA is not a collection of adjacent playsets.
It is a large world containing cities, towns, districts, roads, water, and distance.
```