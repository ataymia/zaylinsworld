# Aqualume Blueprint

Status: planning blueprint, not runtime code  
Alias: Atlantis-type Town / Undersea City  
Scope: underwater city geography, districts, current lanes, civic systems, housing, academy, police, jobs, minigames, sea life, economy, assets, and build phases  
Project: Zaylin's Kid World, also called ZTA

**Aqualume** is ZTA's final unlockable town: a luminous underwater city hidden in the Crownwater Basin beneath Fishing Harbor and Rich Hills. It is earned by catching and consuming the Gillyfish, permanently gaining gills, completing the Lighthouse Trench discovery route, and reaching the city gate.

Aqualume is a powered-up city. Its jobs pay more, its vehicles and homes are unusual, its activities require advanced movement and observation, and its shops sell rare items. It must still remain a complete town with school, housing, police, health, food, transit, utilities, ordinary workers, neighborhoods, and consequences.

The city is not only ancient ruins and it is not a copy of Atlantis. Its visual identity combines an old coral-and-stone foundation with living bioluminescence, glass pressure architecture, current-powered technology, sea-life partnerships, and a functioning modern community.

---

## 1. Unlock requirement

Aqualume cannot be purchased through a premium store.

Required progression:

```txt
1. Fish in eligible Fishing Harbor deep-water locations.
2. Catch the rare Gillyfish.
3. Consume one Gillyfish.
4. Permanently gain Gillbound Adaptation.
5. Complete the Lighthouse Trench discovery route.
6. Activate the Aqualume Gate.
7. Enter Moonpool Gateway and register the city on the map.
```

Permanent unlock flag:

```txt
hasPermanentGills = true
hasDiscoveredAqualume = true
```

Duplicate Gillyfish may be sold, stored, traded, or gifted to friends.

See [WATER_ECOSYSTEM_BLUEPRINT.md](WATER_ECOSYSTEM_BLUEPRINT.md) for breath, drowning, fishing, pity, water vehicles, and access rules.

---

## 2. Design north star

Aqualume should feel:

```txt
bioluminescent
mysterious but welcoming
ancient foundation + living future technology
coral architecture
glass tunnels
current-powered transit
pearl and shell details
sea-life integrated into the city
high-tier, exclusive, earned
quietly wealthy rather than casino-loud
```

Avoid:

```txt
copying Atlantis or The Little Mermaid imagery
one giant glass dome with nothing inside
random coral pasted onto surface buildings
making every resident a merperson stereotype
constant blue tint that destroys readability
friendly animals treated as vehicles for sale
infinite high wages that break the whole-world economy
requiring the player to re-eat Gillyfish
```

Core fantasy:

```txt
You earned the ability to enter a hidden civilization.
Now you can live beneath the sea, master currents, work rare jobs,
care for sea life, pilot underwater vehicles, explore the abyss,
and build a second life in the most advanced town in the world.
```

---

## 3. Visual identity

### Palette

```txt
water_dark:       #102f43
water_mid:        #1f6072
lumen_cyan:       #4ed8d1
lumen_blue:       #4b9fd8
coral_pink:       #d66d86
coral_orange:     #d88155
pearl:            #d9d4c5
shell_cream:      #cbbd9f
kelp_green:       #4e8069
royal_violet:     #6c5aa5
deep_gold:        #c6a95d
abyss_black:      #10141d
warning_red:      #a8444e
```

Palette hierarchy:

- deep blue/black backgrounds
- cyan as navigation/current color
- pearl/cream for civic architecture
- coral pink/orange for homes and markets
- violet/gold for rare/high-status areas
- red reserved for danger, law, and pressure warnings

### Materials

- carved ocean stone
- living coral surfaces
- mother-of-pearl panels
- translucent shell
- pressure glass
- dark metal current conduits
- kelp fiber fabric
- pearl terrazzo
- glowing algae strips
- crystal current cores

### Lighting

- bioluminescent plants and architectural strips
- clear district color coding
- no global muddy blue overlay inside city
- signs and doors remain readable
- bubble particles limited near camera
- moonpool/arrival area brighter than open sea
- Abyssal Edge visibly darker and more dangerous

### Soundscape

- filtered current hum
- distant whale-like fictional calls
- soft bubble and chime ambience
- transit sonar tones
- market chatter
- current turbines in industrial district
- sanctuary creature sounds
- pressure warnings in deep zones

### Weather and water conditions

Aqualume does not have surface weather, but it has water conditions:

- calm current
- strong current event
- plankton bloom
- murky sediment event
- deep-storm pressure event
- migration event with increased sea-life activity

Conditions should modify routes and activities without making the whole city inaccessible.

---

## 4. World location and boundaries

Recommended planning position:

```txt
Aqualume center: approximately x 350, z -350, y -120
Surface above: Crownwater Basin between Fishing Harbor and Rich Hills
Primary discovery route: Fishing Harbor Lighthouse Trench
Secondary later route: Rich Hills Marina pressure-sub channel
```

City boundary structure:

- canyon walls and deep reef shelves define the city basin
- strong current boundaries prevent map escape
- sanctuary walls and patrol markers define protected zones
- Abyssal Edge descends beyond the city and requires later pressure upgrades
- upper surface remains visible as distant light, but is not a short vertical swim during normal traversal

---

## 5. Macro layout

```txt
                             NORTH / ABYSSAL EDGE

                    [Deepworks]---[Abyss Gate]
                         |              |
              [Pearlworks Yard]---[Current Guard]
                         |              |
 WEST / INDUSTRY   [Lumen Plaza]   EAST / SANCTUARY

 [Bluecore Dock]---[Civic Crown]---[Sanctuary Gardens]
        |                 |                  |
 [Moonpool Gate]---[Coral Market]---[Tideglass Academy]
        |                 |                  |
 [Arrival Reef]---[Reefside Homes]---[Glassway Residences]
                         |
                   SOUTH CURRENT ROUTE
                TO LIGHTHOUSE TRENCH/SURFACE
```

The city should have open-swim spaces, enclosed glass corridors, current lanes, sub channels, and pedestrian-equivalent platforms. It should not force every trip through narrow tubes.

---

## 6. Transportation hierarchy

### Movement routes

| Route type | Equivalent | Use |
|---|---|---|
| Swimway | sidewalk | slow public swimming route |
| Current Lane | main road | fast directional swimming/current travel |
| Sea-Scooter Lane | bike lane | personal underwater vehicle |
| Sub Channel | vehicle road | mini-subs, cargo, patrol, taxis |
| Glassway | enclosed pedestrian corridor | homes, school, civic interiors |
| Moonpool | garage/airlock | transition between wet and dry interiors |
| Bubble Lift | elevator | vertical district travel |
| Creature Guide Route | tour/transit | dolphin/manta guided movement |

### Current traffic controls

Instead of ordinary traffic lights:

- sonar signal beacons
- colored current arrows
- bubble-stop barriers
- lane lights
- sub-channel gates
- patrol scanners
- yield rings at current intersections

Signals must use icons and shapes in addition to color.

### Public transit

- Bubble Taxi network
- Current Rail, a guided enclosed or open-current route
- moonpool fast-travel terminal after first arrival
- dolphin guide route for sanctuary tours
- manta glider route for advanced traversal

### Vehicle ownership

Players can own:

- sea scooters
- personal mini-subs
- cargo subs after job progression
- luxury pearl sub at high tier

Friendly dolphins and manta-like creatures are partners/guides, not purchasable inventory mounts.

---

## 7. District breakdown

## A. Moonpool Gateway and Arrival Reef

Purpose: first arrival, orientation, registration, rescue, and surface connection.

Contains:

- Aqualume Gate
- Moonpool Terminal
- visitor registration desk
- Current Guard checkpoint
- city map
- first-aid/rescue station
- sea-scooter rental
- surface package intake
- transition plaza

Gameplay:

- first-arrival quest
- map reveal
- vehicle tutorial
- current-lane tutorial
- surface delivery jobs
- breath/gill confirmation dialogue

Visual identity:

- brightest gateway district
- pearl stone and cyan current lights
- large circular gate silhouette
- visible route back toward trench

## B. Lumen Plaza and Civic Crown

Purpose: civic heart, town services, property office, banking, social hub, and major landmark.

Contains:

- Crown Reef Hall
- Current Guard Precinct
- property registry
- Aqualume Clinic
- central current fountain
- public meeting platform
- bank/ATM equivalent
- transit interchange
- public rest bubbles/benches

Gameplay:

- buy homes
- clear local heat/fines
- civic jobs
- local events
- high-tier contract board
- transit access

## C. Coral Market

Purpose: food, salvage, fashion, ordinary shopping, rare goods, and social density.

Contains:

- Reef & Root Market
- kelp-food restaurant
- pearl/jewelry shop
- salvage exchange
- sea-cloth clothing shop
- tool/gear store
- aquarium/display shop
- surface-goods importer
- package lockers

Gameplay:

- market shifts
- pearl appraisal
- salvage selling
- food preparation
- rare-item purchases
- Gillyfish duplicate buyer
- import/export missions

## D. Tideglass Academy

Purpose: school, certification, high-tier skills, sea-life ethics, current navigation, and career unlocks.

Contains:

- current-navigation classroom
- sonar lab
- marine ecology lab
- coral restoration lab
- submarine engineering workshop
- salvage law classroom
- creature-care sanctuary room
- academy moonpool
- cafeteria
- student residences

Gameplay:

- learning minigames
- certification for jobs and Abyssal Edge
- school employment
- sea-life rescue training

## E. Reefside Residential

Purpose: affordable/mid-tier homes and ordinary neighborhood life.

Contains:

- shell pods
- reef apartments
- community kitchen
- small park/reef garden
- school shuttle/current stop
- laundromat/kelp-fiber cleaning service
- neighborhood market
- pet/companion rest area

Gameplay:

- affordable residence
- ordinary errands
- community jobs
- home upgrades

## F. Glassway Residences

Purpose: premium enclosed housing, views, status, and luxury property.

Contains:

- glass tunnel condos
- coral villas
- pearl penthouses
- private mini-sub docks
- scenic observation lounges
- premium property office
- private garden bubbles

Law:

- higher patrol/security density
- clear public/private boundaries
- faster response to trespass

## G. Bluecore Transit and Charge Dock

Purpose: underwater equivalent of gas station, vehicle service, public transit, energy, and cargo.

Contains:

- sea-scooter charge racks
- mini-sub energy bays
- bubble-taxi terminal
- pressure-seal repair
- cargo lockers
- surface oxygen tank service for non-gilled NPC visitors
- convenience/snack kiosk
- tow/rescue dispatch

Gameplay:

- charge attendant shift
- sub inspection
- pressure-seal repair
- cargo sorting
- taxi dispatch
- rescue call routing

## H. Pearlworks and Deepworks

Purpose: industrial jobs, current energy, vehicle repair, salvage processing, and high-pay technical work.

Contains:

- current-turbine facility
- sub repair yard
- salvage processing hall
- pearl/crystal refinery
- cargo depot
- maintenance tunnels
- restricted power core
- worker housing annex

Gameplay:

- turbine balancing
- sub repair
- salvage scanning
- cargo routing
- power-grid maintenance
- restricted-area crime

Visual identity:

- dark metal and coral
- strong cyan currents
- industrial bubbles and machinery
- warning violet/red near restricted zones

## I. Sanctuary Gardens

Purpose: sea-life care, ecology, peaceful exploration, tours, and conservation jobs.

Contains:

- coral gardens
- sea-turtle rest area
- dolphin guide center
- manta glider route
- hatchery/nursery
- sanctuary clinic
- observation glassways
- protected nesting zones

Gameplay:

- coral restoration
- sea-life rescue
- creature feeding/care
- guided dolphin transit
- manta-current gliding
- photography/research

Rules:

- no capture or harassment
- protected-zone crime produces major local consequences
- wildlife partnership is earned through care missions

## J. Abyssal Edge

Purpose: late-game exploration, pressure progression, rare salvage, dangerous currents, and highest-paying contracts.

Contains:

- pressure gate
- deep research station
- rare crystal fields
- wreck sites
- unstable current vents
- abyssal creature observation areas
- emergency shelters

Requirements:

- permanent gills
- Tideglass pressure certification
- pressure suit or upgraded submarine for deepest zones

Gameplay:

- rare salvage
- sonar mapping
- pressure-lock repair
- deep rescue
- high-value courier jobs
- late-game story encounters

---

## 8. Civic infrastructure

### Law and safety

- Current Guard Precinct
- patrol mini-subs
- sonar scanner posts
- bubble barriers
- sanctuary wardens
- Abyss rescue unit
- evidence/relic storage

### Healthcare

- Aqualume Clinic in Civic Crown
- sanctuary veterinary/creature clinic
- academy first-aid lab
- emergency pressure shelters

### Fire/emergency equivalent

Underwater hazards differ from surface fire:

- pressure breaches
- electrical/current failures
- trapped sub rescue
- toxic fictional vent leaks
- structural coral damage

Aqualume Rescue handles these emergencies.

### Power

- current turbines
- bioluminescent collectors
- crystal energy cores
- backup generators in dry interiors

### Water/air

Residents have gills or adapted biology, but dry interiors and surface visitors require:

- moonpool pressure seals
- oxygen/air systems
- emergency air bubbles
- sealed visitor corridors

### Sanitation

- waste capture and recycling
- kelp compost
- salvage sorting
- reef cleanup
- no visible magical disappearance of city waste

---

## 9. Hero landmarks

| Landmark | District | Purpose |
|---|---|---|
| Aqualume Gate | Arrival | unlock/first city silhouette |
| Moonpool Terminal | Arrival | surface connection and fast travel |
| Crown Reef Hall | Civic | city government/property/events |
| Current Guard Precinct | Civic | police, fines, rescue |
| Tideglass Academy | Academy | underwater school and certifications |
| Reef & Root Market | Coral Market | food/ordinary shopping |
| Pearl Exchange | Coral Market | jewelry, appraisal, rare economy |
| Bluecore Transit & Charge | Transit | energy, vehicles, cargo, rescue |
| Aqualume Clinic | Civic | recovery |
| Pearlworks Yard | Industrial | repair, salvage, jobs |
| Current Turbine Hall | Industrial | power and engineering |
| Sanctuary Gardens | Sanctuary | sea-life care and recreation |
| Glassway Towers | Premium Housing | condos/penthouses |
| Reefside Pods | Residential | affordable housing |
| Abyss Gate | Deep Edge | late-game pressure zone |
| Current Rail Hub | Civic/Transit | local transport |

---

## 10. Bluecore Transit and Charge Dock

Bluecore is Aqualume's fuel station, garage, taxi hub, and convenience stop.

### Layout

```txt
- 8 sea-scooter charge racks
- 4 personal mini-sub energy bays
- 2 cargo/patrol sub service bays
- bubble-taxi platform
- tow/rescue dispatch desk
- cargo locker wall
- pressure-seal repair bench
- oxygen/air tank service for sealed visitors
- convenience kiosk
- creature-guide meeting point
```

### Activities

| Activity | Gameplay |
|---|---|
| Scooter Charge Shift | match vehicle to correct energy rack |
| Sub Inspection | check hull, seal, energy, sonar |
| Pressure Seal Repair | circuit/timing puzzle |
| Bubble Taxi Dispatch | route passengers efficiently |
| Cargo Locker Sort | assign surface/market/industrial deliveries |
| Rescue Routing | send correct rescue unit |
| Current Core Swap | replace energy cell under timer |
| Crime Hook | steal core, tamper with sub key, reroute cargo |

### Assets

```txt
building_bluecore_transit_charge_exterior_v01.glb
prop_bluecore_scooter_rack_a_v01.glb
prop_bluecore_sub_charge_bay_a_v01.glb
prop_bluecore_cargo_service_bay_a_v01.glb
prop_bluecore_bubble_taxi_platform_a_v01.glb
prop_bluecore_pressure_repair_bench_a_v01.glb
prop_bluecore_energy_core_a_v01.glb
prop_bluecore_cargo_locker_a_v01.glb
prop_bluecore_rescue_console_a_v01.glb
prop_bluecore_convenience_kiosk_a_v01.glb
```

---

## 11. Housing plan

| Home | District | Tier | Identity |
|---|---|---|---|
| Student Bubble Pod | Academy | Basic/Special | school housing |
| Reefside Shell Pod | Reefside | Basic | affordable compact home |
| Reef Apartment | Reefside | Mid | neighborhood family home |
| Glass Tunnel Condo | Glassway | Premium | panoramic transit-linked home |
| Coral Villa | Glassway/Sanctuary edge | Premium | garden and private room |
| Pearl Penthouse | Glassway Towers | Luxury | high-status city view |
| Workshop Sub-Loft | Pearlworks | Special | repair/crafting proximity |
| Mobile House-Sub | Bluecore/Premium | Luxury/Special | movable rest/storage within safe routes |

All housing provides:

- local spawn
- rest/sleep
- wardrobe
- safe/storage
- kitchen/food station
- hygiene/grooming station
- mail/messages
- property upgrades

Town-specific upgrades:

- aquarium/display wall
- sea-scooter dock
- current-view window
- coral garden
- pearl/relic display
- sonar map table
- creature-care station
- mini-sub garage for premium homes

---

## 12. School: Tideglass Academy

### Curriculum

| Subject | Skill | Gameplay use |
|---|---|---|
| Current Navigation | current reading and route timing | fast travel/races |
| Sonar Mapping | spatial scanning | salvage and Abyss exploration |
| Sub Engineering | repair and diagnostics | vehicles/jobs |
| Coral Ecology | restoration and habitat care | sanctuary jobs |
| Sea-Life Care | behavior and rescue | creature partnerships |
| Salvage Appraisal | material/value recognition | economy/jobs |
| Pressure Science | depth safety | Abyss access |
| Underwater Law | sanctuary, salvage, traffic rules | crime recovery/jobs |
| Surface Trade | import/export planning | courier/market jobs |
| Current Energy | turbine and grid logic | high-pay engineering |

### Learning minigames

| Minigame | Mechanic | Reward |
|---|---|---|
| Current Route | choose correct directional stream | navigation skill |
| Sonar Echo Match | identify object by echo pattern | sonar skill |
| Sub Diagnostics | match fault to repair | engineering skill |
| Coral Pattern | restore reef layout | ecology skill |
| Creature Signals | match behavior to safe response | care skill |
| Salvage Sort | identify safe, rare, illegal items | appraisal skill |
| Pressure Lock | balance seal meters | pressure certification |
| Underwater Traffic | choose correct lane/signal | license/job unlock |
| Trade Route | optimize surface/undersea deliveries | commerce skill |
| Turbine Balance | stabilize current output | engineering unlock |

### School jobs

- lab aide
- creature-care assistant
- academy moonpool attendant
- sonar archive assistant
- pressure-safety tutor
- cafeteria worker
- coral nursery helper
- vehicle workshop assistant

---

## 13. Jobs

Aqualume jobs pay more than equivalent Starter Town work, but require gills, skills, certifications, or equipment.

| Job | Location | Core gameplay |
|---|---|---|
| Current Engineer | Turbine Hall | balance current energy grid |
| Sea-Scooter Technician | Bluecore | charge and repair scooters |
| Mini-Sub Mechanic | Pearlworks | diagnose hull/sonar/seal faults |
| Salvage Diver | Basin/Abyss | scan and recover legal cargo |
| Pearl Appraiser | Pearl Exchange | identify quality and origin |
| Coral Gardener | Sanctuary | restore and maintain coral |
| Sea-Life Caretaker | Sanctuary | feeding, signals, rescue |
| Bubble Taxi Dispatcher | Bluecore | route passengers |
| Undersea Courier | city/current routes | deliver packages and supplies |
| Surface Trade Clerk | Coral Market | sort imports/exports |
| Current Guard Aide | Precinct | monitor sonar and public routes |
| Moonpool Attendant | Arrival | register visitors and seals |
| Kelp Kitchen Worker | Reef & Root | prepare food orders |
| Tideglass Tutor | Academy | learning minigames |
| Pressure Rescue Trainee | Rescue Unit | respond to disabled subs |
| Deep Research Assistant | Abyss Station | sonar/sample missions |
| Sanctuary Tour Guide | Gardens | guide visitors and wildlife routes |
| Reef Cleanup Specialist | city edge | remove debris and sort salvage |

### Pay balance

Recommended principles:

```txt
Aqualume job base pay: roughly 1.5x to 2.0x Starter equivalents
Aqualume ordinary costs: roughly 1.25x to 1.75x Starter equivalents
High pay requires skill, certification, risk, or equipment
No single repeatable loop may become an unlimited cash printer
Surface jobs remain relevant through trade and prerequisites
```

---

## 14. Minigames and activity loops

| Activity | Location | Category | Core loop |
|---|---|---|---|
| Current Surf | current lanes | movement | steer through fast current rings |
| Sea-Scooter Slalom | Bluecore/course | driving | navigate underwater gates |
| Mini-Sub Docking | Bluecore/Pearlworks | precision | dock without hull damage |
| Sonar Mapping | Academy/Abyss | scanning/puzzle | map hidden objects |
| Pearl Dive | reef fields | collection/timing | locate and grade pearls |
| Salvage Scanner | wreck sites | observation | identify safe/valuable cargo |
| Coral Restoration | Sanctuary | pattern | rebuild coral arrangement |
| Sea-Life Rescue | Sanctuary/open water | support | free/guide injured creature |
| Dolphin Guide Dash | sanctuary route | movement/partnership | follow dolphin through current course |
| Manta Glide | upper current | steering | glide through rings with manta guide |
| Pressure Seal | vehicles/buildings | timing/puzzle | stabilize a leaking seal |
| Turbine Balance | Deepworks | systems | balance flow/energy nodes |
| Bubble Taxi Dispatch | Bluecore | routing | optimize passenger routes |
| Current Guard Sonar | Precinct | pattern | identify fictional incidents |
| Abyss Courier | deep zone | risk/driving | deliver cargo through pressure route |
| Gillyfish Research | Academy | collection/lore | study duplicate Gillyfish without consuming |

---

## 15. Police, Current Guard, and crime

### Authority model

- Current Guard handles city law, underwater traffic, salvage permits, and rescue
- Sanctuary Wardens protect sea-life zones
- Pearlworks Security protects current-grid and industrial facilities
- Glassway Security responds quickly in premium residential zones
- patrol mini-subs and sonar posts replace most surface police cars/cameras

### Local crimes

| Action | Consequence |
|---|---|
| Illegal salvage | confiscation, fine, permit suspension |
| Steal sea scooter/sub | tracker/sonar response and impound |
| Enter restricted turbine core | industrial security escalation |
| Harass/capture sanctuary wildlife | major fine, sanctuary ban, reputation loss |
| Steal pearls/relics | Current Guard response and merchant distrust |
| Tamper with current lane | traffic shutdown and high heat |
| Smuggle surface contraband | cargo confiscation and trade suspension |
| Damage coral habitat | restoration task and fine |
| Trespass Glassway property | fast premium-security response |
| Forge pressure certification | Abyss access suspension |
| Tamper with Bluecore energy cells | quick scanner response |
| Attack friendly residents/sea-life | severe local consequence |

### Response behavior

- sonar pings mark suspect route rather than requiring line-of-sight car pursuit
- bubble barriers can close lanes
- patrol subs intercept vehicles
- swimmers can be slowed by current-control zones
- sanctuary and Glassway respond faster than ordinary Reefside areas

### Clearing trouble

- pay fine
- return stolen salvage/vehicle
- restore damaged coral
- complete rescue/community work
- attend underwater-law or sanctuary-ethics class
- wait out permit/access suspension
- repair tampered current infrastructure

---

## 16. Economy, shops, food, and services

### Shops/services

- Reef & Root Market
- Pearl Exchange
- Current Clothier
- Deep Salvage Supply
- Bluecore Convenience
- Kelp Kitchen
- Bubble Bakery/Café
- Aqualume Clinic
- property registry
- mini-sub dealer
- sea-scooter shop
- aquarium/display shop
- surface import counter

### Food identity

Food should be underwater-themed without requiring every meal to be fish.

Examples:

- kelp noodles
- reef vegetable wraps
- bubble-fruit drinks
- sea-salt fries
- algae energy bites
- shell-shaped pastries
- imported surface meals
- legally sourced seafood items where appropriate

### Money sinks

- sea scooters and submarines
- vehicle energy/repair
- premium housing
- coral/home upgrades
- pearl jewelry/cosmetics
- Abyss gear
- sanctuary partnership cosmetics
- imported surface luxury goods
- rare salvage tools

### Currency

- global cash remains salary and property currency
- **Lumen Shards** may serve as a limited upgrade/crafting material, not a second general wallet
- pearls are items/commodities, not universal currency

---

## 17. NPC population and routines

Profiles:

```txt
reefside_resident
glassway_resident
student
academy_teacher
current_guard
sanctuary_warden
current_engineer
sub_mechanic
salvage_diver
pearl_appraiser
market_vendor
kelp_cook
coral_gardener
sea_life_caretaker
bubble_taxi_driver
moonpool_attendant
clinic_worker
surface_trader
researcher
visitor
```

Daily rhythm:

- morning equivalent: academy, market deliveries, turbine checks
- midday: market and transit busiest
- evening: sanctuary tours, restaurants, residential social activity
- deep-cycle/night: lower public traffic, stronger bioluminescence, industrial/rescue jobs continue

Social hubs:

- Lumen Plaza
- Coral Market
- academy commons
- Sanctuary Gardens
- Reefside community reef
- Bluecore terminal

---

## 18. Sea-life partnerships

### Dolphin guide system

- unlocked through Sanctuary care/rescue missions
- dolphins guide players through specific transit/race routes
- player holds a safe harness or swims in their current wake
- dolphin is not purchased, stored, or summoned as disposable equipment
- partnership improves route options and cosmetic interactions

### Manta glide system

- fictional manta-like creature partnership
- unlocked through ecology/current lessons
- used for gliding routes above city
- no ownership or combat use

### Other interactions

- sea turtles guide players to cleanup sites
- small fish schools react to currents
- jelly-like creatures provide ambient light
- rescue missions can involve tangled or displaced animals

---

## 19. Asset families

### A. Hero architecture

```txt
building_aqualume_gate_exterior_v01.glb
building_aqualume_moonpool_terminal_exterior_v01.glb
building_crown_reef_hall_exterior_v01.glb
building_current_guard_precinct_exterior_v01.glb
building_tideglass_academy_exterior_v01.glb
building_reef_root_market_exterior_v01.glb
building_pearl_exchange_exterior_v01.glb
building_bluecore_transit_charge_exterior_v01.glb
building_aqualume_clinic_exterior_v01.glb
building_pearlworks_yard_exterior_v01.glb
building_current_turbine_hall_exterior_v01.glb
building_sanctuary_gardens_pavilion_v01.glb
building_glassway_towers_exterior_v01.glb
building_reefside_apartments_exterior_v01.glb
building_abyss_research_station_exterior_v01.glb
```

### B. Modular architecture

```txt
arch_aqualume_coral_wall_a_v01.glb
arch_aqualume_pearl_panel_a_v01.glb
arch_aqualume_pressure_glass_wall_a_v01.glb
arch_aqualume_glass_tunnel_straight_a_v01.glb
arch_aqualume_glass_tunnel_curve_a_v01.glb
arch_aqualume_moonpool_ring_a_v01.glb
arch_aqualume_bubble_lift_a_v01.glb
arch_aqualume_current_lane_ring_a_v01.glb
arch_aqualume_sub_channel_gate_a_v01.glb
arch_aqualume_reef_balcony_a_v01.glb
arch_aqualume_coral_villa_module_a_v01.glb
```

### C. Navigation and public infrastructure

```txt
prop_aqualume_current_beacon_a_v01.glb
prop_aqualume_sonar_signal_a_v01.glb
prop_aqualume_wayfinding_sign_a_v01.glb
prop_aqualume_bubble_stop_barrier_a_v01.glb
prop_aqualume_current_arrow_a_v01.glb
prop_aqualume_rest_bubble_a_v01.glb
prop_aqualume_public_seat_a_v01.glb
prop_aqualume_sanitation_collector_a_v01.glb
prop_aqualume_emergency_air_bubble_a_v01.glb
prop_aqualume_pressure_warning_sign_a_v01.glb
```

### D. Vehicles/transit

```txt
vehicle_aqualume_sea_scooter_a_v01.glb
vehicle_aqualume_personal_sub_a_v01.glb
vehicle_aqualume_cargo_sub_a_v01.glb
vehicle_aqualume_patrol_sub_a_v01.glb
vehicle_aqualume_bubble_taxi_a_v01.glb
prop_aqualume_scooter_dock_a_v01.glb
prop_aqualume_sub_dock_a_v01.glb
prop_aqualume_transit_console_a_v01.glb
```

### E. School/lab

```txt
prop_tideglass_current_table_a_v01.glb
prop_tideglass_sonar_lab_a_v01.glb
prop_tideglass_sub_engine_bench_a_v01.glb
prop_tideglass_coral_lab_a_v01.glb
prop_tideglass_creature_signal_board_a_v01.glb
prop_tideglass_pressure_chamber_a_v01.glb
prop_tideglass_salvage_sort_table_a_v01.glb
prop_tideglass_trade_route_board_a_v01.glb
```

### F. Market/food/retail

```txt
prop_aqualume_market_stall_a_v01.glb
prop_aqualume_pearl_case_a_v01.glb
prop_aqualume_salvage_counter_a_v01.glb
prop_aqualume_kelp_food_counter_a_v01.glb
prop_aqualume_import_crate_a_v01.glb
prop_aqualume_seacloth_rack_a_v01.glb
prop_aqualume_aquarium_display_a_v01.glb
food_aqualume_kelp_noodles_v01.glb
food_aqualume_bubble_fruit_drink_v01.glb
food_aqualume_reef_wrap_v01.glb
```

### G. Industrial/salvage

```txt
prop_aqualume_current_turbine_a_v01.glb
prop_aqualume_energy_core_a_v01.glb
prop_aqualume_sub_repair_lift_a_v01.glb
prop_aqualume_salvage_scanner_a_v01.glb
prop_aqualume_salvage_crate_a_v01.glb
prop_aqualume_pressure_seal_bench_a_v01.glb
prop_aqualume_cargo_locker_a_v01.glb
prop_aqualume_abyss_shelter_a_v01.glb
```

### H. Housing

```txt
furniture_aqualume_shellpod_bed_a_v01.glb
furniture_aqualume_reef_sofa_a_v01.glb
furniture_aqualume_pearl_table_a_v01.glb
furniture_aqualume_glassway_bed_a_v01.glb
prop_home_aqualume_aquarium_wall_a_v01.glb
prop_home_aqualume_scooter_dock_a_v01.glb
prop_home_aqualume_coral_garden_a_v01.glb
prop_home_aqualume_sonar_map_a_v01.glb
prop_home_aqualume_pearl_display_a_v01.glb
prop_home_aqualume_creature_care_station_a_v01.glb
```

### I. Police/clinic/rescue

```txt
prop_current_guard_front_desk_a_v01.glb
prop_current_guard_sonar_wall_a_v01.glb
prop_current_guard_bubble_barrier_a_v01.glb
prop_current_guard_evidence_vault_a_v01.glb
prop_current_guard_holding_bubble_a_v01.glb
prop_aqualume_clinic_recovery_pod_a_v01.glb
prop_aqualume_clinic_pressure_bed_a_v01.glb
prop_aqualume_rescue_gear_rack_a_v01.glb
```

### J. Sanctuary/sea life

```txt
prop_sanctuary_coral_nursery_a_v01.glb
prop_sanctuary_creature_feeder_a_v01.glb
prop_sanctuary_rescue_table_a_v01.glb
prop_sanctuary_dolphin_harness_station_a_v01.glb
prop_sanctuary_manta_route_ring_a_v01.glb
prop_sanctuary_observation_glass_a_v01.glb
creature_aqualume_dolphin_guide_a_v01.glb
creature_aqualume_manta_glider_a_v01.glb
creature_aqualume_turtle_a_v01.glb
creature_aqualume_jellylight_a_v01.glb
```

### K. Minigame UI

```txt
ui_icon_aqualume_city.svg
ui_icon_aqualume_current.svg
ui_icon_aqualume_sonar.svg
ui_icon_aqualume_sub.svg
ui_icon_aqualume_pearl.svg
ui_icon_aqualume_sanctuary.svg
ui_icon_aqualume_abyss.svg
ui_meter_aqualume_pressure.svg
ui_meter_aqualume_current_speed.svg
ui_panel_aqualume_salvage_result.svg
ui_panel_aqualume_certification.svg
```

---

## 20. First build sprint

### Aqualume Sprint 001: Underwater City Language Pack

```txt
1. arch_aqualume_coral_wall_a_v01.glb
2. arch_aqualume_pressure_glass_wall_a_v01.glb
3. arch_aqualume_glass_tunnel_straight_a_v01.glb
4. arch_aqualume_moonpool_ring_a_v01.glb
5. prop_aqualume_current_beacon_a_v01.glb
6. prop_aqualume_sonar_signal_a_v01.glb
7. prop_aqualume_wayfinding_sign_a_v01.glb
8. prop_aqualume_rest_bubble_a_v01.glb
9. vehicle_aqualume_sea_scooter_a_v01.glb
10. prop_aqualume_scooter_dock_a_v01.glb
11. prop_aqualume_market_stall_a_v01.glb
12. furniture_aqualume_shellpod_bed_a_v01.glb
13. prop_bluecore_scooter_rack_a_v01.glb
14. prop_current_guard_sonar_wall_a_v01.glb
15. ui_icon_aqualume_city.svg
16. ui_icon_aqualume_current.svg
```

This sprint proves architecture, readability, transit, ordinary commerce, housing, service, and law before the full city is built.

---

## 21. Production phases

### Phase 1: Water and gill foundation

Complete the shared systems in [WATER_ECOSYSTEM_BLUEPRINT.md](WATER_ECOSYSTEM_BLUEPRINT.md): swimming, breath, drowning return, Gillyfish, permanent save, current route.

### Phase 2: Gate and arrival prototype

- Lighthouse Trench route
- Aqualume Gate
- Moonpool Terminal
- first current lane
- city map reveal

### Phase 3: Civic minimum

- Lumen Plaza/Civic Crown
- Current Guard
- clinic
- Bluecore
- Coral Market
- affordable housing

### Phase 4: Academy and jobs

- Tideglass Academy
- current navigation
- sonar
- sub repair
- coral restoration
- market and transit jobs

### Phase 5: Vehicles and districts

- sea scooter
- personal mini-sub
- current lanes
- Pearlworks
- Glassway
- Sanctuary

### Phase 6: Economy and housing

- property purchase
- higher-pay balance
- rare goods
- vehicle ownership
- home upgrades

### Phase 7: Crime and rescue

- Current Guard sonar response
- sanctuary law
- stolen vehicles
- illegal salvage
- pressure rescue

### Phase 8: Abyssal Edge

- pressure certification
- upgraded sub/gear
- deep salvage
- rare contracts
- research station

### Phase 9: Sea-life partnerships and polish

- dolphin guide
- manta glide
- migration events
- sound/lighting
- streaming/performance
- multiplayer/trade validation

---

## 22. Agent handoff checklist

```txt
Town: Aqualume
District:
Depth:
Wet open-water, moonpool, or dry pressure interior:
Swimway, current lane, sub channel, or glassway:
Asset/landmark:
Public, residential, sanctuary, industrial, civic, or Abyss:
Gillyfish/gill requirement:
Pressure requirement:
Vehicle support:
Job/minigame hook:
Current Guard/sanctuary response:
Safe-return point:
Interior/collision:
Interactable handler ready:
Palette: deep blue, lumen cyan, coral pink/orange, pearl, violet, gold
Avoid: copied Atlantis imagery, blue readability fog, purchasable animals, economy-breaking wages
Fallback:
Performance/streaming target:
```

---

## 23. Completion checklist

Aqualume is not complete until the player can:

- permanently unlock gills through the Gillyfish
- discover the city through the Lighthouse Trench route
- enter and leave through a safe Moonpool Gateway
- navigate swimways, currents, glassways, and sub channels
- buy food and ordinary supplies
- recharge/repair underwater vehicles
- attend Tideglass Academy
- work at least six underwater-specific jobs
- play current, sonar, salvage, coral, sea-life, sub, and pressure activities
- buy affordable and premium underwater homes
- use Current Guard, clinic, rescue, transit, sanitation, and property services
- encounter and clear local crime consequences
- earn more without breaking the global economy
- interact with sea life through care and partnership
- live underwater without relying on Starter Town
- revisit for deep jobs, rare goods, homes, vehicles, sanctuary progression, and Abyssal exploration

Final identity:

```txt
Aqualume is not a secret room beneath the map.
It is the earned final city and the reason the ocean matters.
```