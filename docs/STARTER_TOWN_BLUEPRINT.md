# Starter Town Blueprint

Status: detailed planning blueprint and implementation specification  
Central hub: Dreamdrop District  
Scope: current-runtime audit, expanded geography, districts, roads, civic systems, housing, school, jobs, crime, tutorial, assets, and production phases  
Project: Zaylins Kid World, also called ZTA

**Starter Town** is the reference city for the entire world. It is where the player learns what it means to live in ZTA: maintaining needs, earning money, attending school, working jobs, shopping, owning a home, driving, following or breaking the law, meeting NPCs, using services, and deciding what kind of life they want.

Starter Town already has the correct major building categories. The expansion should not add a pile of new functional buildings. It should spread the existing locations across a much larger city, deepen the gameplay inside them, and place enough residential, commercial, civic, industrial, and environmental filler between destinations that the city reads as a real place rather than a showroom of interactable boxes.

The current compact grid becomes the historic commercial core called **Dreamdrop District**. The finished Starter Town expands outward into multiple neighborhoods and districts with a more intricate road network, difficult driving sections, meaningful travel distances, and several distinct ways to cross the city.

---

## 1. Non-negotiable design rules

```txt
1. Starter Town must become a large, district-based city.
2. The current 3x3 grid is a legacy core, not the final map.
3. Existing functional buildings are relocated and deepened before new ones are added.
4. Filler buildings and infrastructure create distance, density, and believable neighborhoods.
5. The player must encounter housing, school, work, law, shopping, health, transit, and crime choices here first.
6. Crime is optional. The tutorial must never force the player to mug someone or commit violence.
7. Every road, intersection, alley, lot, and district must have a geographic purpose.
8. No fake prompts. Decorative buildings remain clearly decorative until their handlers exist.
```

Missing services should be placed inside existing buildings or existing outdoor spaces whenever practical.

Examples:

- Home ownership is taught through the existing Starter Home and property desk in WorkTower.
- The job board, property desk, bank kiosk, and community-services counter share WorkTower's lobby.
- Basic health recovery uses a walk-in community health room inside WorkTower and the school nurse at Zaylins Prep.
- Delivery work uses 6twelve, Chicken Spot, Frostbox, Kicks & Fits, WorkTower, Auto Haus, and the residential district.
- Community service uses the sanitation NPC, parks, streets, and police station.
- Retail work uses existing stores.
- Police Academy information, fines, evidence, visitation, and community-service intake use the existing police station.

---

## 2. Current runtime foundation

Starter Town already includes:

```txt
- bounded 3x3 road grid
- traffic lights and stop signs
- sidewalks and crosswalks
- NPC traffic and pedestrian routes
- enterable stores and service interiors
- Starter Home
- Zaylins Prep school
- WorkTower office job
- Iron City Gym
- Auto Haus and City Garage
- 6twelve gas station/store and refueling
- police station, foot police, patrol cars, wanted stars, busting, and legal fees
- vehicle ownership, theft, damage, fuel, repair, and NPC-driver reactions
- weapons and stylized civilian/police consequences
- food, hunger, energy, fitness, smarts, hygiene, fun, and health
- day/time progression
- trash-cleanup job
- Chicken Spot shift
- Garage shift
- WorkTower shift
- starter mission chain
- save/load and owned inventory
```

The foundation is mechanically stronger than its small geography makes it appear. The expansion should preserve these systems while reorganizing them into a deliberate city experience.

Current major locations:

```txt
Frostbox
Chicken Spot
Kicks & Fits
Auto Haus
Zaylins Home
Block Supply
Iron City Gym
City Garage
Zaylins Prep
WorkTower
Police Station
6twelve gas station/store
Dreamdrop Park
```

Spelling standard for future-facing labels and documentation:

```txt
Zaylins Home
Zaylins Prep
Zaylins Kid World
```

Existing runtime labels using another spelling should be migrated during the implementation pass.

---

## 3. Design north star

Starter Town should feel:

```txt
familiar
compact at the neighborhood level but large as a whole
a little gritty but cared for
busy enough to feel inhabited
colorful without becoming toy-like
safe enough to learn
open enough to experiment
ordinary enough that later towns still feel special
```

Avoid:

```txt
an empty tutorial box
four square blocks surrounded by nothing
all businesses facing one intersection
forcing the player into crime
making every job the same timing bar
hiding housing ownership until another town
teaching systems through walls of text
adding functional buildings when existing ones can carry the service
random filler with no district logic
flat roads with no driving challenge
```

Core fantasy:

```txt
This is your first city.
Your home is in one neighborhood, school is across town,
work is somewhere else, shopping has its own district,
and the route you choose changes what you see and what can happen.
```

---

## 4. City scale and world position

Starter Town remains centered near world origin `(0, 0)`.

Recommended expanded playable footprint:

```txt
west edge:  x = -250
east edge:  x =  250
north edge: z = -235
south edge: z =  245
```

Recommended ground plane:

```txt
600 x 580 world units
```

This leaves room for:

- a north highway toward Fishing Harbor
- an east parkway toward Rich Hills
- future countryside or local routes to the south/west
- terrain and skyline buffers beyond the playable city

The current 260x260 ground and ±30 road grid are not large enough for the finished city.

---

## 5. Visual identity

### Palette

```txt
sky_day:          #9fc3e8
sky_evening:      #d59a78
ground_green:     #5b6b52
park_green:       #4f7a4d
road_charcoal:    #3a3d42
sidewalk:         #9b9589
brick_red:        #9a5146
storefront_blue:  #416b8a
warm_cream:       #d5c6a7
civic_navy:       #27324a
school_green:     #3a5a4a
accent_gold:      #c8a24a
utility_gray:     #62666b
residential_sage: #75836a
```

### Materials

- painted brick
- ordinary stucco
- concrete sidewalks
- patched asphalt
- chain-link and wood fences
- storefront glass
- painted metal awnings
- residential siding
- park grass and worn paths
- warehouse corrugated metal
- retaining walls and guardrails on grade changes

### Lighting

- bright readable daytime
- warm storefront and home windows at dusk
- park and crosswalk lighting after dark
- civic-blue police lighting used only at the precinct and during response
- no citywide neon wash
- darker industrial/service roads than downtown
- residential streets warm and quiet at night

### Soundscape

- traffic intensity changes by district
- crosswalk signals in Dreamdrop District
- garage tools in Northworks
- school bell and field activity in Scholar's Quarter
- basketball, children, and music in Parkside Commons
- quieter birds and neighborhood noise in Willowbend
- sirens only during response
- highway ambience at Eastgate and North Gate

### Weather

- clear and partly cloudy baseline
- light rain variant later
- wet-road reflections can make turns and braking visually different
- no punishing survival weather in the tutorial city

---

## 6. Expanded district map

Starter Town contains eight districts.

```txt
                                  NORTH / FISHING HIGHWAY

                  [North Gate]---------[Northworks / Auto Row]
                         |                       |
          [Scholar's Quarter]----[Dreamdrop District]----[Civic Heights]
                 |                      |                       |
          [Westside Blocks]------[Market Mile]----------[Eastgate Corridor]
                 |                      |                       |
             [Willowbend Residential]---[Parkside Commons]-----[Rich Hills Parkway]

                                  SOUTH / LOCAL ROADS
```

The diagram is conceptual. Exact road polylines and building coordinates are specified below.

---

## 7. District breakdown

## A. Dreamdrop District

Role: historic downtown, tutorial orientation, and central transfer point.

Approximate bounds:

```txt
x: -85 to 85
z: -75 to 70
```

Contains:

- Dreamdrop Cross central intersection
- Frostbox
- Chicken Spot
- small public square and map kiosk
- bus stops and taxi/rideshare curb
- mixed-use decorative storefronts
- upper-floor decorative apartments
- service alleys behind stores
- small parking pockets rather than one giant lot

Gameplay:

- first street NPC
- first food purchase and eating loop
- first retail interaction
- first optional store job
- traffic-light and crosswalk tutorial
- first crime-choice explanation after basic systems are learned

Visual character:

- painted brick
- storefront awnings
- street trees and utility boxes
- murals and signs
- denser pedestrian activity
- narrow service alleys behind the main street

Driving character:

- busy lights
- curbside delivery vehicles
- narrow turns into alleys
- pedestrians and parked cars reduce easy sightlines

## B. Market Mile

Role: style, gear, convenience, and lower-density retail corridor.

Approximate bounds:

```txt
x: -95 to 115
z: 55 to 125
```

Contains:

- Kicks & Fits
- selected decorative corner stores
- laundromat façade
- barbershop façade
- mini strip-mall shells
- parking lots
- delivery bays
- small outdoor vendor area

Block Supply sits at the western transition between Market Mile and Westside Blocks so weapons/gear are not directly across from the school or home.

Gameplay:

- wardrobe/style
- gear and weapon shopping
- retail stocking shift
- delivery route stop
- optional shoplifting/robbery hooks only after crime tutorial unlock

Driving character:

- commercial entrances
- parking-lot cut-throughs
- delivery trucks
- a one-way rear service lane

## C. Northworks / Auto Row

Role: vehicles, repair, industrial work, warehouses, and the north highway gateway.

Approximate bounds:

```txt
x: -165 to 80
z: -225 to -90
```

Contains:

- Auto Haus
- City Garage
- repair/test yard
- decorative warehouse shells
- tow yard
- fenced vehicle storage
- industrial utility lots
- North Gate highway services
- road toward Fishing Harbor

Gameplay:

- buy and test cars
- repair vehicles
- Garage Hand shift
- tow/inspection jobs later
- vehicle theft and chop-shop-style consequence hooks later, without adding a new functional building
- driving tutorial advanced section

Driving character:

- broad roads around dealership
- tighter service roads behind warehouses
- long acceleration section
- S-curve highway ramp
- barriers, loading docks, parked trucks, and blind exits

## D. Scholar's Quarter

Role: education, youth activity, library/community learning, and school-zone law.

Approximate bounds:

```txt
x: -235 to -110
z: -80 to 85
```

Contains:

- Zaylins Prep
- school yard and recreation field
- bus/shuttle loop
- decorative library/community-center wing
- student drop-off
- small neighborhood housing
- crossing guards and school-zone signs

Gameplay:

- basic academic classes
- school jobs
- tutoring
- school reputation
- traffic-law tutorial
- school-zone speeding consequences

Driving character:

- narrow loop road
- raised crosswalks
- buses at selected times
- strict speed zone
- awkward but readable drop-off loop

## E. Civic Heights

Role: police, WorkTower, public services, employment, law, and a hill-driving challenge.

Approximate bounds:

```txt
x: 90 to 225
z: -115 to 35
```

Contains:

- Police Station / Dreamdrop Public Safety campus
- WorkTower
- public-service plaza
- decorative city-hall annex façade
- employee parking garage shell
- small public overlook
- retaining walls

WorkTower ground-floor services:

```txt
- job board
- property desk
- community health room
- bank/paycheck kiosk
- city-services counter
```

Police Station services:

```txt
- legal fees
- wanted explanation
- community-service intake
- evidence information
- holding cells
- visitation/booking hooks
- police academy information
```

Driving character:

- Civic Rise uphill S-turn
- retaining walls and guardrails
- one roundabout
- downhill braking challenge
- police presence and speed enforcement

## F. Eastgate Corridor

Role: fuel, town gateway, highway services, and connection toward Rich Hills.

Approximate bounds:

```txt
x: 155 to 250
z: 15 to 105
```

Contains:

- 6twelve gas station and store
- fuel forecourt
- EV charging later
- roadside parking
- decorative motel/roadside façade
- bus/fast-travel node
- Eastgate roundabout or signal
- Rich Hills Parkway departure

Gameplay:

- refueling
- snack/drink purchase
- fuel shift
- delivery/package route
- highway-driving tutorial

Driving character:

- merging traffic
- fuel-station entrances
- highway acceleration lane
- sharper exit toward Parkside

## G. Parkside Commons

Role: recreation, fitness, social life, green space, and low-stakes activities.

Approximate bounds:

```txt
x: 55 to 200
z: 75 to 190
```

Contains:

- Dreamdrop Park expanded beyond the current circular plaza
- Iron City Gym
- basketball court
- playground
- walking/jogging loop
- picnic area
- small amphitheater shell
- community garden
- public restrooms as decorative/service props

Gameplay:

- gym workouts
- park races
- basketball or recreation later
- sanitation work
- social NPCs
- fitness tutorial

Driving character:

- Parkside Crescent
- traffic-calming islands
- roundabout
- parking pockets
- curved road bordering the park

## H. Willowbend Residential

Role: player home, housing tutorial, ordinary neighborhood life, and quiet routes.

Approximate bounds:

```txt
x: -115 to 135
z: 130 to 245
```

Contains:

- Zaylins Home
- decorative houses and duplexes
- small apartment shells
- cul-de-sac
- neighborhood parklet
- mailboxes and driveways
- community garden/lot
- alley and back-lane access
- future for-sale signs on selected decorative homes

Gameplay:

- rest
- wardrobe
- safe/storage
- hygiene/lineup
- first property ownership tutorial
- home upgrades
- neighborhood delivery route
- burglary/trespass hooks only if later implemented with real handlers

Driving character:

- Willowbend Loop
- narrow residential lanes
- several 90-degree turns
- one cul-de-sac
- parked cars
- back alley
- limited sightlines
- lower speed and stronger pedestrian caution

---

## 8. Proposed building relocation plan

Existing functional building count remains unchanged.

| Location | Proposed position | District | Reason |
|---|---:|---|---|
| Frostbox | `(-42, -22)` | Dreamdrop District | downtown style landmark |
| Chicken Spot | `(48, -38)` | Dreamdrop District | food anchor, not directly opposite Frostbox |
| Kicks & Fits | `(-18, 88)` | Market Mile | separates style shopping from downtown jewelry |
| Block Supply | `(-142, 70)` | Westside/Market transition | gear store away from school frontage |
| Auto Haus | `(-112, -165)` | Northworks | large lot and test route |
| City Garage | `(-28, -154)` | Northworks | service road connection |
| Zaylins Prep | `(-181, 18)` | Scholar's Quarter | real school district and bus loop |
| Police Station | `(158, -78)` | Civic Heights | civic visibility and fast dispatch route |
| WorkTower | `(166, -5)` | Civic Heights | jobs/public services across town from home |
| Iron City Gym | `(112, 112)` | Parkside Commons | fitness beside recreation |
| 6twelve | `(208, 58)` | Eastgate Corridor | gateway fuel and travel service |
| Zaylins Home | `(12, 207)` | Willowbend Residential | meaningful commute to school/work/shopping |
| Dreamdrop Park center | `(105, 142)` | Parkside Commons | expanded park district |

Coordinates are planning anchors. Collision and door-clearance validation may shift each by a few units.

---

## 9. Proposed road network

The implementation should replace the current full-width line grid with a polyline road graph.

### Road tiers

| Tier | Width | Sidewalk | Typical speed | Use |
|---|---:|---:|---:|---|
| Parkway/arterial | 12 | 3.0 | 11-14 | town gateways and major cross-city travel |
| Main street | 9 | 2.6 | 8-11 | district connections |
| Local street | 7 | 2.0 | 5-8 | residential, school, park |
| Service road | 5.5 | 1.2 | 4-6 | loading, warehouses, alleys |
| Alley/back lane | 4.5 | 0-0.8 | 3-5 | delivery and risky shortcuts |

### Primary roads

## Dreamdrop Boulevard

Type: arterial/main hybrid  
Purpose: west-east city spine and Rich Hills connection.

Proposed centerline:

```txt
(-245, 5)
(-190, -2)
(-128, -14)
(-72, -22)
(-18, -8)
(42, -12)
(105, -20)
(162, -2)
(215, 16)
(252, 22)
```

Features:

- several gentle curves
- signalized Dreamdrop Cross
- lane changes near Civic Heights
- eastbound merge toward Rich Hills Parkway
- downtown curb parking only in marked pockets

## Centre Avenue

Type: main street  
Purpose: north-south connection from Northworks to Willowbend.

Proposed centerline:

```txt
(-18, -238)
(-24, -190)
(-8, -132)
(-5, -72)
(0, -8)
(22, 58)
(5, 112)
(-2, 162)
(10, 220)
(12, 248)
```

Features:

- visible bend through downtown
- park edge curve
- residential traffic calming
- north connection to Fishing Highway

## Northworks Loop

Type: main/local loop  
Purpose: Auto Haus, Garage, warehouses, and highway access.

```txt
(-205, -92)
(-184, -148)
(-130, -194)
(-66, -214)
(5, -188)
(62, -132)
(48, -88)
(-18, -72)
(-92, -78)
(-160, -70)
```

Features:

- large sweeping turns
- warehouse blind exits
- test-drive route
- highway ramp branch

## Scholar Road

Type: local/school  
Purpose: school and west neighborhood circulation.

```txt
(-245, 88)
(-220, 58)
(-198, 18)
(-181, -28)
(-148, -67)
(-104, -82)
```

Features:

- raised crosswalks
- school bus loop branch
- strict speed zone
- narrow turning radius

## Willowbend Loop

Type: local residential loop  
Purpose: homes, player house, and neighborhood circulation.

```txt
(-112, 132)
(-92, 174)
(-52, 212)
(8, 232)
(70, 222)
(119, 190)
(139, 149)
(105, 112)
(48, 94)
(-22, 98)
(-78, 110)
```

Features:

- several turns and changing sightlines
- cul-de-sac branches
- alley shortcut
- parked cars
- lower speed

## Parkside Crescent

Type: local/main crescent  
Purpose: park, gym, and Eastgate connection.

```txt
(38, 62)
(82, 46)
(134, 52)
(177, 78)
(198, 120)
(180, 162)
(139, 188)
(92, 180)
(54, 148)
(36, 108)
```

Features:

- roundabout near gym/park
- curved road with pedestrian crossings
- parking entrances

## Civic Rise

Type: main/hill road  
Purpose: police, WorkTower, and Civic Heights.

```txt
(64, -68)
(96, -103)
(136, -118)
(181, -104)
(211, -72)
(202, -34)
(174, -8)
(150, 6)
```

Features:

- elevation change
- S-turn
- guardrails
- downhill braking challenge
- civic roundabout connection

## Eastgate Parkway

Type: arterial  
Purpose: Rich Hills gateway.

```txt
(150, 4)
(184, 20)
(216, 48)
(245, 78)
(300, 92)
```

The playable city ends near x=250; the road continues into world-connection streaming beyond it.

## Fishing Highway Connector

Type: arterial/highway  
Purpose: Fishing Harbor gateway.

```txt
(-18, -235)
(-8, -285)
(0, -350)
(0, -600)
```

The Starter Town scene only needs the first transition segment until the connected world is active.

### Secondary roads and shortcuts

```txt
Market Service Lane:
(-88, 48) -> (-36, 42) -> (18, 48) -> (74, 34)

Garage Service Road:
(-174, -122) -> (-116, -145) -> (-45, -140) -> (18, -116)

School Loop:
(-222, 12) -> (-198, -18) -> (-158, -4) -> (-150, 44) -> (-188, 72) -> (-225, 52)

Willowbend Back Lane:
(-74, 158) -> (-22, 182) -> (36, 180) -> (92, 158)

Civic Service Road:
(118, -76) -> (152, -58) -> (186, -48) -> (198, -18)
```

These roads create shortcuts, deliveries, police approach routes, and riskier driving without adding new functional destinations.

---

## 10. Intersections and driving challenge zones

### Signalized intersections

```txt
Dreamdrop Cross
Dreamdrop Boulevard x Scholar Road transition
Dreamdrop Boulevard x Civic Rise
Dreamdrop Boulevard x Eastgate Parkway
Centre Avenue x Parkside Crescent
```

### Roundabouts

```txt
Civic Circle: WorkTower / Police / Civic Rise
Parkside Circle: Gym / Park / Eastgate connection
```

### Stop-controlled intersections

- Willowbend neighborhood entries
- school loop
- Northworks warehouse/service junctions
- Market Service Lane
- Auto Haus/Garage lot exits

### Deliberate driving challenges

| Zone | Challenge |
|---|---|
| Civic Rise | uphill S-turn, guardrails, downhill braking |
| Northworks Ramp | broad fast curve into tighter service-road turn |
| Willowbend | parked cars, narrow lanes, frequent corners |
| School Loop | low-speed discipline, buses, raised crossings |
| Dreamdrop District | traffic, pedestrians, deliveries, signals |
| Parkside Circle | roundabout yielding and pedestrian exits |
| Eastgate Merge | acceleration, merge, fuel-station entrance |
| Market Service Lane | one-way alley, dumpsters, loading areas |

Crashes should arise from readable road difficulty, traffic, speed, and poor decisions, not invisible collision traps.

---

## 11. Filler city structure

Filler does not mean meaningless clutter. It means non-interactive architecture and infrastructure that explains who lives and works between major locations.

### Residential filler

- 10-14 detached-house variations
- 4-6 duplex/townhouse variations
- 3 apartment-shell variations
- garages, sheds, fences, bins, mailboxes, driveways
- porches, yard trees, parked cars

### Commercial filler

- row shops
- small offices
- laundromat façade
- pharmacy façade
- bakery/café façade
- barber/salon façade
- motel shell near Eastgate
- small strip-mall modules

### Civic filler

- city-hall annex façade
- library/community-center façade
- fire/rescue garage bay attached to Public Safety campus
- school annex and field structures
- bus shelters
- public restrooms at park

### Industrial filler

- warehouses
- loading docks
- fenced storage yards
- utility shed/substation
- tow yard
- stacked pallets/crates
- parked work trucks

### Environmental filler

- retaining walls
- guardrails
- landscaped medians
- empty lots
- drainage channels
- power poles and utility boxes
- alleys and dumpsters
- parking lots
- neighborhood parklets

All decorative entrances should lack interaction rings and prompts.

---

## 12. Civic infrastructure without new functional buildings

### Police and public safety

Existing Police Station becomes the **Dreamdrop Public Safety campus** while retaining a clearly labeled police station entrance.

Functions:

- fines and legal-fee payment
- wanted-level explanation
- evidence information
- holding cells
- booking/visitation later
- community-service intake
- police academy information
- stolen-vehicle impound information

Exterior additions:

- fire/rescue garage bay as non-enterable or shared-service shell
- ambulance/rescue dressing
- public-safety parking
- impound fence

### Basic healthcare

WorkTower ground floor gains a community-health room using the existing interior footprint or a reusable interior section.

Services:

- basic heal/recovery for a modest fee
- health tutorial
- no advanced specialty care

Zaylins Prep nurse handles school-hours recovery and school-specific tutorials.

### Banking/property/city services

WorkTower lobby includes:

- paycheck/bank kiosk
- job board
- property desk
- city information desk
- local travel information

### Fuel

6twelve remains the town's fuel and convenience hub.

Expansion functions:

- fuel
- snacks/drinks
- EV charging later
- fuel attendant shift
- package lockers
- highway information

### Sanitation

Existing sanitation worker and cleanup system expand across districts.

- district-specific cleanup contracts
- multiple dumpsters/deposit points
- litter density by district
- community-service version of cleanup

### Public recreation

Dreamdrop Park expands into Parkside Commons with:

- walking loop
- basketball court
- playground
- picnic area
- community garden
- event lawn

---

## 13. Housing and property progression

Starter Town must teach property ownership before the player encounters homes in other towns.

### Starting status

Recommended story options:

```txt
Option A: The player begins with access to Zaylins Home as a family/starter residence.
Option B: The player begins as an occupant and completes the Home Base tutorial to claim it as their first owned property.
```

The recommended implementation is Option B because it demonstrates ownership without charging the new player an impossible price.

### Home Base tutorial

1. Enter Zaylins Home.
2. Use the bed/rest station.
3. Open wardrobe.
4. Open safe/storage.
5. Use bathroom/hygiene station.
6. Visit WorkTower property desk.
7. Claim Starter Home deed for $0 after completing the orientation mission.
8. Choose Starter Home as primary residence.

### Property state required

```txt
ownedHomes: ['starter-home']
primaryHomeId: 'starter-home'
homeUpgrades: { 'starter-home': [] }
```

### Starter Home upgrades

- larger safe/storage
- kitchen food storage
- vehicle toolkit bay
- game/TV fun station
- study desk
- fitness corner
- display shelf for gems/jewelry
- mailbox/mission delivery

### Future Starter Town properties

No additional enterable property is required for the first pass. Later, selected decorative houses or apartments can use one standardized reusable residential interior.

Potential tiers:

| Property | District | Tier |
|---|---|---|
| Starter Home | Willowbend | Basic/Free tutorial claim |
| Willowbend Duplex | Residential | Mid |
| Dreamdrop Apartment | Downtown | Mid |
| Parkside Townhouse | Parkside | Premium |

The blueprint reserves them but does not require immediate new interior code.

---

## 14. School: Zaylins Prep

Zaylins Prep teaches broad foundational skills. Specialized cities teach advanced versions later.

### Curriculum

| Subject | Skill/stat | Future use |
|---|---|---|
| Basic Math | smarts | prices, wages, market calculations |
| Reading & Memory | smarts | dialogue, instructions, scripts |
| Computer Basics | smarts | TechTown prerequisites |
| Civics & Law | legal knowledge | police, permits, fines, consequences |
| Health & Hygiene | hygiene/health | needs management |
| Career Basics | job readiness | better starter jobs |
| Driver Education | driving/license | road test and legal driving |
| Physical Education | fitness | gym and Obby prerequisites |
| Arts & Rhythm | fun/basic arts | Starline prerequisites |
| World Geography | travel knowledge | town unlock explanation |

### Learning minigames

| Minigame | Mechanic |
|---|---|
| Number Rush | solve simple price/change problems |
| Memory Match | remember symbols/words/order |
| Computer Basics | click/sequence desktop tasks |
| Civics Choice | choose legal response to a scenario |
| Needs Balance | allocate food/rest/hygiene/time |
| Career Match | match skills to jobs |
| Driver Rules | signs, lights, and right-of-way |
| PE Timing | movement/reaction drill |
| Rhythm Basics | simple beat sequence |
| Map Reading | follow district route on town map |

### School jobs

- cafeteria helper
- library organizer
- office aide
- grounds cleanup
- tutor
- bus-loop crossing helper

### School progression

```txt
Foundation Certificate:
Complete one lesson in Math, Civics, Health, Career, and Driver Education.

Benefits:
- unlock full job board
- unlock road test
- unlock selected cross-town school prerequisites
- modest WorkTower pay bonus
```

The existing generic study timing game remains a fallback but should not be the final school system.

---

## 15. Jobs and career paths

Starter Town should provide stable low-to-medium wage work across several industries.

### Existing jobs to preserve

| Job | Location | Current status |
|---|---|---|
| Chicken Spot Worker | Chicken Spot | playable |
| WorkTower Associate | WorkTower | playable |
| Garage Hand | City Garage | playable |
| Sanitation Worker | city streets | playable |

### Jobs to deepen using existing buildings

| Job | Location | Gameplay |
|---|---|---|
| Chicken Cook/Counter | Chicken Spot | cook, pack, serve, clean |
| Retail Stocker | Kicks & Fits | sort sizes, restock, outfit orders |
| Jewelry Assistant | Frostbox | clean cases, match orders, appraise basics |
| Supply Clerk | Block Supply | restock gear/ammo, verify orders |
| Fuel Attendant | 6twelve | pump/charge, restock, package sorting |
| Office Associate | WorkTower | files, emails, deliveries, checklists |
| City Courier | WorkTower board | multi-district deliveries |
| Garage Hand | City Garage | inspect, clean, tighten, park |
| Auto Haus Lot Attendant | Auto Haus | wash, move, line up test vehicles |
| Gym Assistant | Iron City Gym | wipe equipment, restock, guide NPCs |
| School Aide | Zaylins Prep | library, cafeteria, tutoring, grounds |
| Sanitation Worker | streets | district cleanup contracts |
| Community Service Worker | Police desk | unpaid/low-paid legal consequence tasks |

### Job progression

```txt
Entry job
-> repeated good shifts
-> skill/stat requirement
-> advanced task set
-> higher pay and job title
```

Starter Town wages remain lower than specialist towns, but performance and education should matter.

### Job board

WorkTower job board displays:

- available jobs
- required smarts/fitness/reputation
- current title
- best shift grade
- next promotion requirement
- legal restrictions or temporary job bans

---

## 16. Crime and consequence system

Starter Town teaches the baseline crime system used everywhere else.

### Current crime foundation

The runtime already supports:

- car theft
- police-car theft
- mugging
- street fighting
- firing weapons in public
- attacking civilians
- attacking police
- reckless driving/wanted escalation
- foot police and patrol cruisers
- hiding and losing wanted level
- busting and cash penalty
- legal-fee payment
- evidence and holding-cell interaction hooks

### Crime categories to organize

| Category | Examples | Baseline consequence |
|---|---|---|
| Disorder | fighting, property damage, dangerous driving | warning or 1 star |
| Theft | mugging, shop theft, vehicle theft | 1-3 stars, stolen property |
| Weapons | public discharge, armed robbery | rapid escalation |
| Assault | harming civilians/officers | high heat and job/reputation loss |
| Civic crime | evidence tampering, police-car theft | high police response |
| Property crime | trespass/burglary later | homeowner/police response |

### Missing consequence depth

The finished baseline should include:

- stolen-item tags
- confiscation on bust
- vehicle impound
- short jail/booking flow
- fines by offense, not only star count
- community service
- temporary store/job bans
- civilian witness/alarm logic
- district-based patrol presence
- repair/restitution for damaged property

### District response

| District | Response identity |
|---|---|
| Dreamdrop District | normal patrol, many witnesses |
| Northworks | slower civilian reporting, fast vehicle patrol access |
| Scholar's Quarter | fast response to weapons/reckless driving |
| Civic Heights | fastest response near precinct |
| Eastgate | highway patrol/vehicle response |
| Parkside | normal response, many pedestrians |
| Willowbend | residents report suspicious activity, lower patrol density |
| Westside/Market | normal response with store security/alarm hooks |

### Clearing trouble

- lose active pursuit
- pay offense-based fine
- return stolen property or vehicle
- retrieve impounded vehicle legally
- complete community-service task
- repair damaged property
- wait out store/job ban
- attend Zaylins Prep civics lesson

---

## 17. Tutorial structure

The tutorial must show what a complete town offers before the player travels.

### Phase 1: Wake Up / Home Base

- subtle dream-framing opening
- character creation
- enter Zaylins Home
- rest, wardrobe, safe, hygiene
- claim Starter Home deed

### Phase 2: Neighborhood Basics

- leave Willowbend
- use minimap
- cross a street legally
- speak to an NPC
- learn that districts have names and different activity types

### Phase 3: Needs and Shopping

- travel to Dreamdrop District
- buy and eat food
- visit one optional store
- learn money and inventory

### Phase 4: School and Skills

- travel to Scholar's Quarter
- complete one foundation lesson
- learn how skills unlock jobs and other towns

### Phase 5: Work

- visit WorkTower job board
- choose one of several entry jobs
- complete a shift
- receive first paycheck

### Phase 6: Transportation

- obtain/access starter car
- refuel at 6twelve
- complete road test across multiple districts
- learn damage and repair at City Garage

### Phase 7: Law and Choice

Player chooses one of three introductions:

```txt
Legal path:
Complete sanitation, delivery, or school-aide work.

Risky path:
Commit a low-level optional crime, gain heat, and learn pursuit/consequences.

Observer path:
Visit the police desk, learn the law, and decline crime entirely.
```

No route is treated as the morally correct or required gameplay path. The crime route pays faster but creates risk and consequences.

### Phase 8: World Opens

- view world map
- learn that every town has homes, schools, jobs, law, and specialties
- unlock first travel road when implementation reaches connected-world phase

---

## 18. Minigames and repeatable activities

| Activity | Location | Role |
|---|---|---|
| Chicken Eating | Chicken Spot | hunger tutorial |
| Chicken Kitchen Shift | Chicken Spot | food job |
| Lineup Lab | Zaylins Home | hygiene/style |
| Strength/Cardio/Mobility | Iron City Gym | fitness |
| Foundation Classes | Zaylins Prep | smarts/skills |
| Office Shift | WorkTower | stable job |
| Garage Shift | City Garage | labor/vehicle job |
| Trash Cleanup | all districts | sanitation/community service |
| Fuel Pump Timing | 6twelve | fuel job |
| Road Test | citywide | driving/license |
| Delivery Route | citywide | map/job |
| Auto Lot Challenge | Auto Haus | parking/detailing |
| Retail Stocking | Kicks/Frostbox/Block Supply | sorting/job |
| Park Sprint | Parkside | fitness/time trial |
| Police Escape | citywide optional | crime tutorial |
| Civics Scenario | school/police | consequence learning |

The generic timing bar may support early prototypes, but final activities should use distinct task patterns wherever practical.

---

## 19. NPC population and routines

NPC profiles:

```txt
resident
student
teacher
school_worker
shop_worker
restaurant_worker
office_worker
mechanic
dealer_worker
gym_member
sanitation_worker
police_officer
courier
commuter
park_visitor
parent
highway_traveler
```

District routines:

- Willowbend residents leave for school/work in the morning.
- Scholar's Quarter gets students and buses during school hours.
- Northworks peaks during daytime shifts.
- Dreamdrop District peaks midday and evening.
- WorkTower peaks morning and late afternoon.
- Parkside peaks afternoon/evening.
- Eastgate has continuous traveler traffic.

NPCs should not all walk one square loop. Pedestrian routes must be district-specific and connected by selected cross-town paths.

---

## 20. Transportation and map UI

### Player transportation

- walking/running
- owned/stolen cars
- future bus/fast travel
- cross-town driving remains the primary Starter Town experience

### Transit nodes

No new enterable transit building is required.

Use:

- bus shelters at Dreamdrop, Zaylins Prep, WorkTower, Parkside, and Eastgate
- Eastgate fast-travel marker later
- North Gate highway marker

### Minimap requirements

- dynamic bounds for 500x480 city
- district labels
- roads visible by hierarchy
- player home marker
- school, job board, police, fuel, garage, shops, park
- active mission route
- wanted-search area later

### World map requirement

Starter Town should appear as a real city silhouette with recognizable district shapes, not a square icon.

---

## 21. Asset families

### A. Functional building exteriors

```txt
building_starter_frostbox_exterior_v02.glb
building_starter_chicken_spot_exterior_v02.glb
building_starter_kicks_fits_exterior_v02.glb
building_starter_block_supply_exterior_v02.glb
building_starter_auto_haus_exterior_v02.glb
building_starter_city_garage_exterior_v02.glb
building_starter_zaylins_prep_exterior_v02.glb
building_starter_police_station_exterior_v02.glb
building_starter_worktower_exterior_v02.glb
building_starter_iron_city_gym_exterior_v02.glb
building_starter_6twelve_exterior_v02.glb
building_starter_zaylins_home_exterior_v02.glb
```

### B. Road modules

```txt
road_starter_arterial_straight_a_v01.glb
road_starter_arterial_curve_a_v01.glb
road_starter_main_straight_a_v01.glb
road_starter_main_curve_a_v01.glb
road_starter_local_straight_a_v01.glb
road_starter_local_curve_a_v01.glb
road_starter_service_a_v01.glb
road_starter_alley_a_v01.glb
road_starter_roundabout_a_v01.glb
road_starter_hill_curve_a_v01.glb
road_starter_highway_ramp_a_v01.glb
sidewalk_starter_main_a_v01.glb
sidewalk_starter_residential_a_v01.glb
crosswalk_starter_standard_a_v01.glb
crosswalk_starter_school_raised_a_v01.glb
```

### C. Residential filler

```txt
building_starter_house_a_v01.glb
building_starter_house_b_v01.glb
building_starter_house_c_v01.glb
building_starter_duplex_a_v01.glb
building_starter_townhouse_a_v01.glb
building_starter_apartment_small_a_v01.glb
building_starter_apartment_mid_a_v01.glb
prop_starter_mailbox_a_v01.glb
prop_starter_driveway_gate_a_v01.glb
prop_starter_residential_bin_a_v01.glb
prop_starter_wood_fence_a_v01.glb
prop_starter_chainlink_fence_a_v01.glb
prop_starter_for_sale_sign_a_v01.glb
```

### D. Commercial filler

```txt
building_starter_rowshop_a_v01.glb
building_starter_corner_store_shell_a_v01.glb
building_starter_laundromat_shell_a_v01.glb
building_starter_barbershop_shell_a_v01.glb
building_starter_pharmacy_shell_a_v01.glb
building_starter_motel_shell_a_v01.glb
building_starter_small_office_a_v01.glb
building_starter_stripmall_module_a_v01.glb
prop_starter_store_awning_a_v01.glb
prop_starter_loading_dock_a_v01.glb
prop_starter_parking_bollard_a_v01.glb
```

### E. Civic and school filler

```txt
building_starter_cityhall_annex_shell_a_v01.glb
building_starter_library_shell_a_v01.glb
building_starter_fire_rescue_bay_shell_a_v01.glb
building_starter_school_annex_a_v01.glb
prop_starter_school_bus_stop_a_v01.glb
prop_starter_crossing_guard_sign_a_v01.glb
prop_starter_public_service_kiosk_a_v01.glb
prop_starter_bus_shelter_a_v01.glb
prop_starter_city_map_kiosk_a_v01.glb
```

### F. Industrial filler

```txt
building_starter_warehouse_a_v01.glb
building_starter_warehouse_b_v01.glb
building_starter_utility_shed_a_v01.glb
prop_starter_loading_crate_a_v01.glb
prop_starter_pallet_stack_a_v01.glb
prop_starter_tow_yard_fence_a_v01.glb
prop_starter_work_truck_parked_a_v01.glb
prop_starter_industrial_dumpster_a_v01.glb
prop_starter_substation_a_v01.glb
```

### G. Street and terrain props

```txt
prop_starter_streetlight_main_a_v01.glb
prop_starter_streetlight_residential_a_v01.glb
prop_starter_traffic_light_a_v01.glb
prop_starter_stop_sign_a_v01.glb
prop_starter_street_name_sign_a_v01.glb
prop_starter_district_sign_a_v01.glb
prop_starter_fire_hydrant_a_v01.glb
prop_starter_utility_box_a_v01.glb
prop_starter_power_pole_a_v01.glb
prop_starter_guardrail_a_v01.glb
prop_starter_retaining_wall_a_v01.glb
prop_starter_storm_drain_a_v01.glb
prop_starter_bench_a_v01.glb
prop_starter_trash_can_a_v01.glb
prop_starter_planter_a_v01.glb
```

### H. Park assets

```txt
prop_dreamdrop_basketball_hoop_a_v01.glb
prop_dreamdrop_playground_a_v01.glb
prop_dreamdrop_picnic_table_a_v01.glb
prop_dreamdrop_jogging_marker_a_v01.glb
prop_dreamdrop_community_garden_bed_a_v01.glb
prop_dreamdrop_event_stage_a_v01.glb
prop_dreamdrop_park_sign_a_v01.glb
```

### I. Interior/service assets

```txt
prop_worktower_job_board_a_v01.glb
prop_worktower_property_desk_a_v01.glb
prop_worktower_bank_kiosk_a_v01.glb
prop_worktower_health_desk_a_v01.glb
prop_school_math_station_a_v01.glb
prop_school_computer_station_a_v01.glb
prop_school_civics_board_a_v01.glb
prop_police_community_service_board_a_v01.glb
prop_police_impound_terminal_a_v01.glb
prop_home_deed_folder_a_v01.glb
prop_home_upgrade_terminal_a_v01.glb
```

### J. UI

```txt
ui_icon_starter_home.svg
ui_icon_starter_school.svg
ui_icon_starter_job.svg
ui_icon_starter_police.svg
ui_icon_starter_fuel.svg
ui_icon_starter_garage.svg
ui_icon_starter_district.svg
ui_panel_starter_job_board.svg
ui_panel_starter_property.svg
ui_panel_starter_tutorial_choice.svg
ui_panel_starter_city_map.svg
```

---

## 22. Required map-data architecture

The current `ROAD.hz`, `ROAD.vx`, and single `ROAD.extent` structure cannot represent the finished city.

Recommended replacement/addition:

```js
ROAD_SEGMENTS = [
  {
    id: 'dreamdrop-boulevard',
    district: 'dreamdrop',
    tier: 'arterial',
    points: [[-245, 5], [-190, -2], ...],
    width: 12,
    walk: 3,
    lanes: 2,
    speed: 12,
    markings: 'center-dash',
  },
]
```

Required supporting data:

```txt
ROAD_NODES
INTERSECTIONS
CROSSWALKS
DISTRICTS
DISTRICT_LABELS
LANDMARKS
FEATURE_BUILDINGS
PARKS
PARKING_LOTS
TRAFFIC_ROUTES
PEDESTRIAN_ROUTES
STREET_LIGHTS or generated light rules
SPAWN
WORLD_GATEWAYS
```

Required engine updates:

1. Build road strips along polyline segments.
2. Build sidewalks along each segment.
3. Measure point-to-segment distance for road-aware placement.
4. Generate road markings along segment length.
5. Support roundabouts and angled/local junctions.
6. Keep traffic routes on authored waypoints.
7. Expand ground, camera, fog, minimap, and spawn-safe bounds.
8. Validate all relocated building doors against sidewalks and collisions.
9. Move litter, dumpsters, street props, gas forecourt, police lot, and dealership parking to district-aware anchors.
10. Preserve procedural fallbacks when assets are missing.

---

## 23. First build sprint

### Starter Expansion Sprint 001: Road and District Proof

Do not move all gameplay at once.

```txt
1. Add expanded ground bounds.
2. Add ROAD_SEGMENTS support while retaining old grid as fallback.
3. Build Dreamdrop Boulevard.
4. Build Centre Avenue.
5. Build Willowbend Loop.
6. Build Civic Rise.
7. Add district boundary data and minimap labels.
8. Move Zaylins Home to Willowbend.
9. Move WorkTower and Police Station to Civic Heights.
10. Move 6twelve to Eastgate.
11. Verify doors, interiors, save positions, traffic, and refueling.
12. Add temporary procedural filler blocks before final assets.
```

This sprint proves that large-city geography works before every building is relocated.

---

## 24. Production phases

### Phase 1: Data and road engine

- polyline roads
- sidewalks
- point-to-road checks
- expanded bounds
- district data
- minimap scaling

### Phase 2: Core district skeleton

- Dreamdrop District
- Willowbend
- Civic Heights
- Eastgate
- primary landmarks moved

### Phase 3: Remaining districts

- Northworks
- Scholar's Quarter
- Market Mile
- Parkside Commons
- Westside filler

### Phase 4: Traffic and pedestrian life

- district routes
- signals/stops/roundabouts
- school traffic
- service traffic
- parked cars

### Phase 5: Housing, school, and jobs

- home deed/primary residence
- WorkTower job/property board
- school curriculum
- diverse shifts

### Phase 6: Tutorial rewrite

- district-based tutorial
- legal/risky/observer branch
- road test
- city opens to world travel

### Phase 7: Crime consequences

- offense records
- confiscation
- impound
- jail/booking
- community service
- store/job bans

### Phase 8: Filler and visual identity

- residential/commercial/industrial shells
- district signage
- street props
- terrain dressing
- skyline

### Phase 9: Optimization and QA

- collision audit
- route audit
- prompt audit
- save migration
- traffic performance
- low/medium/high graphics density
- mission regression

---

## 25. Agent handoff checklist

```txt
Town: Starter Town
District:
Road/route:
Old coordinate:
New coordinate:
Functional or decorative:
Existing interior reused:
Door/sidewalk clearance:
Traffic route affected:
Pedestrian route affected:
Police response tier:
Job/tutorial hook:
Housing/school/civic relevance:
Collision required:
Prompt handler ready:
Minimap marker:
Save migration impact:
Fallback:
Performance target:
```

---

## 26. Completion checklist

Starter Town is not complete until the player can:

- recognize and navigate all eight districts
- drive multiple routes rather than one square loop
- experience curves, hills, alleys, roundabouts, highway merges, and school zones
- travel meaningful distance between home, school, work, shopping, police, and fuel
- claim and select a first home
- use rest, wardrobe, storage, hygiene, and home upgrades
- attend multiple foundational classes
- choose among several starter jobs
- understand stats and how skills affect pay/unlocks
- buy food, clothing, gear, jewelry, vehicles, fuel, and repairs
- use basic healthcare and city services
- experience optional crime and real consequences
- complete the tutorial without committing crime
- see NPC routines appropriate to each district
- use a map that reads as a real city
- live in Starter Town without needing another town for basic systems
- understand that later towns specialize the same civic structure

Final identity:

```txt
Starter Town is not the small map before the real game.
Starter Town is the first real city, built to teach the rules of every city that follows.
```