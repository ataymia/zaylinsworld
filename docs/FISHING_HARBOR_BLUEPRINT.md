# Fishing Harbor Blueprint

Status: planning blueprint, not runtime code  
Alias: Fishing Town  
Scope: harbor geography, roads, waterways, districts, civic systems, housing, school, police, jobs, fishing systems, minigames, economy, assets, and build phases  
Project: Zaylin's Kid World, also called ZTA

**Fishing Harbor** is ZTA's coastal working town. It is not only a pier with a fishing prompt. It is a complete harbor community where roads, docks, boats, markets, permits, weather, schools, housing, fuel, repairs, public safety, and the seafood economy all connect.

The player can live here as a dock worker, fisher, boat mechanic, market seller, harbor courier, marine student, restaurant worker, or relaxed resident. Fishing Harbor should reward patience and routine while still offering rare catches, boat challenges, storms, protected waters, and risky poaching or theft paths.

---

## 1. Design north star

Fishing Harbor should feel:

```txt
coastal
working-class
weathered but cared for
wood, rope, painted metal, nets, boats, gulls, fog
slow mornings and busy market hours
relaxed exploration with bursts of physical work
water routes as important as streets
```

Avoid:

```txt
one decorative ocean plane with no boat logic
only blue buildings and fish signs
pirate-theme caricature
empty piers
making every resident a fisher
random tropical resort styling
waterfront obstacles that look passable but are not
```

Core fantasy:

```txt
Learn the water. Earn from the catch. Build a boat life.
Choose between honest harbor work, rare-fish hunting, marine study,
market trading, boat ownership, or risky protected-water trouble.
```

---

## 2. Visual identity

### Palette

```txt
sky_clear:       #b9d5e7
sky_fog:         #a8b7bd
water_deep:      #285f72
water_shallow:   #4f98a1
harbor_teal:     #2d7c7a
boat_red:        #a9443f
cream:           #d7cfb8
weathered_wood:  #826b51
rope_tan:        #b4976a
market_yellow:   #d8ad4a
rust:            #8a563e
road:            #484c50
```

### Materials

- weathered wood planks
- painted corrugated metal
- rough concrete seawalls
- wet asphalt
- rope and canvas
- galvanized steel rails
- glass/ice display cases
- rubber boat bumpers
- faded painted signage

### Lighting

- cool bright mornings
- soft fog at dawn
- warm market lamps at evening
- lighthouse beam after dusk
- small dock lamps and boat navigation lights
- reflective wet surfaces near water

### Soundscape

- water against pilings
- gulls and distant boat engines
- market chatter and ice scoops
- rope creaks and buoy bells
- foghorn/lighthouse signal at intervals
- quieter residential waves at night

### Weather

- clear, foggy, windy, and light-rain variants
- visual tide state can change subtly without moving core collision geometry
- storms remain event/mission conditions, not constant punishment

---

## 3. World role and connections

Reserved world origin:

```txt
Fishing Harbor: x 0, z -600
South gateway: highway connection to Starter Town
North/coastal gateway: bridge connection to Casino Strip
```

Arrival sequence:

1. Highway descends from countryside toward visible water.
2. Lighthouse and crane silhouettes appear first.
3. Road splits between Harbor Center and Marina Loop.
4. Player passes Harbor Patrol Station and visitor permit kiosk.
5. Boardwalk, fish market, fuel dock, and boat rental establish the core loop.

Travel hierarchy:

- car/highway travel reaches land districts
- boat lanes reach fishing zones and outer docks
- boardwalk/footpaths handle dense waterfront movement
- bridge north leads toward Casino Strip

---

## 4. Macro layout

```txt
                           NORTH / COAST BRIDGE TO CASINO

                    [Lighthouse Point]---[Breakwater]
                            |                 |
                [Outer Fishing Water]---[Fuel Dock]
                            |                 |
 WEST / WORKING EDGE   [Marina Loop]---[Market Wharf]   EAST / VILLAGE

 [Cannery/Depot]---[Boatworks Yard]---[Harbor Center]---[Dockside Village]
        |                 |                 |                  |
 [Utility Yard]----[Harbor Patrol]---[Marine Academy]---[Seaside Homes]
                            |
                  SOUTH HIGHWAY TO STARTER
```

Water and land must be planned together. Every dock should have a reason, every boat route needs safe bounds, and every visible island/platform must be intentionally reachable or clearly decorative.

---

## 5. District breakdown

## A. Harbor Center

Purpose: civic hub, first arrival, permits, local services, and town orientation.

Contains:

- Harbor Master Hall
- Harbor Patrol Station
- Harbor Clinic
- Marine Academy entrance
- visitor parking
- public restrooms
- town map and permit kiosk
- small plaza with anchor/fish sculpture
- bus/fast-travel stop

Gameplay:

- obtain fishing permit
- learn protected-water rules
- accept harbor courier jobs
- clear local fines/heat
- attend school
- access clinic and transit

Layout:

- visible from highway gateway
- central roundabout or signalized T-intersection
- broad pedestrian route to Market Wharf
- patrol boat dock directly behind station

## B. Market Wharf

Purpose: seafood economy, selling, sorting, food, and social activity.

Contains:

- TideTable Seafood Market
- bait and tackle flagship
- Dockside Diner
- fish auction shed
- ice house
- public fishing pier
- package/courier booth
- boardwalk stalls

Gameplay:

- sell fish by rarity/condition
- market price changes
- seafood market shift
- auction spotting
- bait purchases
- diner food/job loop
- public fishing spots

Layout:

- pedestrian-heavy boardwalk edge
- rear service lane for deliveries
- no vehicle access on main pier
- clear rails and safe fishing nodes

## C. Marina and Boat Rental

Purpose: boat ownership, rental, races, repairs, and water travel.

Contains:

- BlueCurrent Boat Rental
- marina office
- rental slips
- player boat slips
- small yacht/boat dealership
- launch ramp
- fuel dock
- wash/repair station
- buoy-course start

Gameplay:

- rent or buy boats
- Boat Buoy Run
- boat-cleaning/inspection jobs
- fuel and repair
- boat storage
- courier routes

Water layout:

- marked no-wake zone near marina
- outbound lane toward fishing waters
- buoy race route outside dense dock area
- visible safe boundary markers

## D. Boatworks and Industrial Yard

Purpose: working harbor, mechanics, storage, processing, and tougher jobs.

Contains:

- Anchor & Axle Boatworks
- dry dock/service lift
- net repair shed
- crate warehouse
- cannery/processing building
- cold storage
- delivery depot
- sanitation/utility yard

Gameplay:

- boat repair minigame
- crate moving
- net mending
- delivery jobs
- industrial trespass/theft hooks
- sanitation cleanup

Visual character:

- cranes, forklifts, stacked crates, ropes, nets
- rust and safety-yellow details
- wider service roads
- lower pedestrian density

## E. Dockside Village

Purpose: everyday commercial/residential life beyond fishing jobs.

Contains:

- grocery/convenience store
- bakery/café
- laundromat
- pharmacy counter in clinic or market
- small clothing/rain-gear shop
- community center
- playground/recreation court
- affordable apartments above shops

Gameplay:

- ordinary errands
- retail jobs
- social NPCs
- affordable housing
- town events

## F. Seaside Residential

Purpose: player housing and quieter coastal life.

Contains:

- fisher cottages
- duplexes
- small apartment building
- premium waterfront homes
- houseboat slips
- community garden
- beach/tide-pool path

Road character:

- narrow local roads
- lower traffic
- stop signs
- driveways and small parking pads
- pedestrian paths toward water

## G. Marine Academy Campus

Purpose: school, skill progression, marine education, and youth/community identity.

Contains:

- Harbor Academy main building
- marine biology classroom
- navigation lab
- knot/gear workshop
- boat safety pool/simulator
- weather station
- cafeteria
- library/specimen room
- school pier
- student dorm rooms or academy housing

Gameplay:

- fish identification
- tide/weather timing
- knot tying
- navigation route planning
- permit training
- tutoring jobs

## H. Lighthouse Point and Coastal Nature

Purpose: landmark, exploration, environmental learning, rare catches, and scenic housing edge.

Contains:

- lighthouse
- keeper cottage
- rocky path
- tide pools
- protected nesting/wetland zone
- scenic overlook
- rescue equipment shed
- rare-fishing access point

Gameplay:

- lighthouse signal job
- protected-species missions
- rare Catch of Legend zone
- coastal cleanup
- weather observation

Restrictions:

- some waters require permit/skill
- protected zones clearly marked
- off-limit rocks use readable barriers, not invisible walls

---

## 6. Roads, waterways, and transportation

### Land roads

| Road | Tier | Function |
|---|---|---|
| Harbor Road | main | highway gateway to Harbor Center |
| Wharf Street | special/local | market frontage and service access |
| Marina Loop | local/main | boat rental, slips, fuel dock |
| Cannery Road | service | industrial deliveries and boatworks |
| Saltwind Lane | local | Dockside Village and housing |
| Seaside Drive | curved local | waterfront homes and lighthouse |
| Breakwater Approach | bridge/main | route toward Casino bridge |
| Academy Way | local/school | campus and school pier |
| Boardwalk | pedestrian | market and public pier |

### Water routes

| Route | Function |
|---|---|
| Marina Exit Lane | safe route out of docks |
| Public Fishing Lane | beginner fishing water |
| Commercial Channel | NPC/work boats and deliveries |
| Buoy Course | boat race/time trial |
| Protected Water Boundary | permit/poaching system |
| Lighthouse Route | rare fishing and rescue missions |
| Casino Bridge Channel | visual/travel connection north |

### Traffic controls

- traffic light at Harbor Road x Market/Marina split
- stop signs in village/residential blocks
- raised school crossing on Academy Way
- railroad-style barrier or flashing warning at active industrial crane/service crossing if used
- no-wake signs and buoy markers replace traffic lights on water

### Parking/docking

- visitor parking at Harbor Center
- market service loading behind wharf
- residential driveways and curb spaces
- player boat slips
- rental slips
- commercial loading dock
- emergency/patrol dock

---

## 7. Civic infrastructure

### Police and water safety

- Harbor Patrol Station with land entrance and patrol dock
- police cars for roads
- patrol/rescue boats for water
- permit desk and evidence freezer/locker
- holding/interview room
- small lighthouse rescue post

### Healthcare

- Harbor Clinic
- marine first-aid room at marina
- school nurse
- rescue/lifeguard station

### Fuel

- **TideFuel Harbor Station** combines roadside fuel, EV charging, convenience store, and boat fuel dock

### Fire/rescue

- compact Harbor Fire & Rescue building
- rescue boat
- dock fire cabinets
- cannery/boatworks emergency lanes

### Sanitation

- fish waste/recycling area behind market
- town sanitation yard
- coastal cleanup jobs
- oil/fuel spill response props for missions

### Power/water

- utility shed/substation on industrial edge
- water tower or pump station silhouette
- dock power pedestals
- shore-power hookups at marina

---

## 8. Hero landmarks

| Landmark | District | Purpose |
|---|---|---|
| Harbor Master Hall | Harbor Center | permits, missions, civic services |
| Harbor Patrol Station | Harbor Center | police, fines, patrol boats |
| TideTable Seafood Market | Market Wharf | fish selling and market jobs |
| Castaway Bait & Tackle | Market Wharf | rods, bait, permits, gear |
| Dockside Diner | Market Wharf | food and restaurant jobs |
| BlueCurrent Boat Rental | Marina | rentals, sales, boat minigames |
| Anchor & Axle Boatworks | Industrial | repair/upgrades/jobs |
| TideFuel Harbor Station | Marina/Harbor Road | car and boat fuel, convenience |
| Harbor Academy | Campus | marine school and learning |
| Harbor Clinic | Center/Village | recovery |
| Breakwater Lighthouse | Lighthouse Point | landmark, jobs, rare water access |
| Dockside Village Market | Village | ordinary groceries/services |
| Seaside Cottages | Residential | buyable homes |
| Cannery & Cold Storage | Industrial | processing/jobs/crime hooks |
| Harbor Transit Stop | Center | fast travel |

---

## 9. TideFuel Harbor Station

TideFuel must support cars and boats without becoming two unrelated stations.

### Layout

```txt
Road side:
- 3 car fuel pump islands
- 2 EV charge bays
- 5 convenience-store spaces
- air/water terminal
- tall fuel/charge price sign

Water side:
- 2 boat fuel positions
- dock power pedestals
- small marine supply counter
- oil/spill response cabinet
- delivery tie-up spot
```

Store:

- snacks/drinks
- bait basics
- batteries
- rain gear
- maps
- ice
- delivery locker

Activities:

| Activity | Gameplay |
|---|---|
| Car Pump Shift | serve road vehicles |
| Boat Fuel Shift | select fuel/amount and secure boat |
| Spill Response | contain fictional spill markers under timer |
| Ice & Bait Restock | sort cold/storage items |
| Dock Power Repair | connect shore-power circuit |
| Package Sort | route marina, market, academy deliveries |

Assets:

```txt
building_tidefuel_harbor_station_exterior_v01.glb
building_tidefuel_market_shell_v01.glb
prop_tidefuel_car_pump_a_v01.glb
prop_tidefuel_ev_charger_a_v01.glb
prop_tidefuel_boat_pump_a_v01.glb
prop_tidefuel_dock_power_pedestal_a_v01.glb
prop_tidefuel_price_sign_a_v01.glb
prop_tidefuel_ice_freezer_a_v01.glb
prop_tidefuel_bait_cooler_a_v01.glb
prop_tidefuel_spill_kit_a_v01.glb
prop_tidefuel_delivery_locker_a_v01.glb
```

---

## 10. Housing plan

| Home | District | Tier | Identity |
|---|---|---|---|
| Dock Room | Market/Village | Basic | tiny affordable room above shops |
| Village Apartment | Dockside Village | Basic/Mid | ordinary family housing |
| Fisher Cottage | Seaside Residential | Mid | porch, storage shed, coastal style |
| Marina Condo | Marina Loop | Premium | boat-slip proximity |
| Lighthouse Keeper Cottage | Lighthouse Point | Special | scenic, job-flavored property |
| Houseboat Home | Marina | Special/Premium | water-based home and spawn |
| Waterfront House | Seaside Drive | Premium | larger home and dock access |

Home functions:

- spawn/rest/storage/wardrobe
- fish/freezer storage upgrade
- rod/gear rack
- boat slip assignment where applicable
- kitchen for catch-based recipes later
- weather radio/map display

Housing assets:

```txt
building_harbor_dock_room_exterior_v01.glb
building_harbor_village_apartments_exterior_v01.glb
building_harbor_fisher_cottage_a_v01.glb
building_harbor_marina_condo_exterior_v01.glb
building_harbor_houseboat_home_a_v01.glb
building_harbor_waterfront_house_a_v01.glb
furniture_harbor_bed_a_v01.glb
furniture_harbor_sofa_a_v01.glb
prop_harbor_home_gear_rack_a_v01.glb
prop_harbor_home_freezer_a_v01.glb
prop_harbor_home_weather_radio_a_v01.glb
```

---

## 11. School: Harbor Academy

### Curriculum

| Subject | Skills | Use |
|---|---|---|
| Fish Identification | species recognition | rarity/protected-fish decisions |
| Marine Ecology | habitat and conservation | permit access and eco missions |
| Knot & Gear | knot timing and equipment | trap/boat efficiency |
| Navigation | map routes and buoy reading | boat travel and courier work |
| Weather & Tides | timing and forecasts | catch bonuses and safe routes |
| Market Math | weight, price, quality | seafood selling/jobs |
| Boat Safety | checks and emergency response | rentals and licenses |

Learning minigames:

| Minigame | Mechanic |
|---|---|
| Fish ID Quiz | match silhouette/color/habitat |
| Knot Tying | sequence/timing pattern |
| Tide Window | choose safe/best time from visual chart |
| Navigation Plot | route boat around buoys/hazards |
| Market Weight | calculate/estimate weight and price |
| Safety Checklist | inspect boat before launch |
| Weather Signal | match flags/lights to conditions |

School jobs:

- lab assistant
- school-pier helper
- cafeteria worker
- tutor
- specimen organizer
- weather-station reader

School assets:

```txt
building_harbor_academy_exterior_v01.glb
prop_harbor_academy_sign_v01.glb
prop_marine_classroom_desk_a_v01.glb
prop_fish_specimen_display_a_v01.glb
prop_navigation_chart_table_a_v01.glb
prop_knot_training_board_a_v01.glb
prop_boat_safety_simulator_a_v01.glb
prop_weather_station_school_a_v01.glb
prop_school_pier_training_boat_a_v01.glb
prop_market_math_scale_school_a_v01.glb
```

---

## 12. Jobs

| Job | Location | Core gameplay |
|---|---|---|
| Fisher | public/permit waters | cast, reel, store catch |
| Dockhand | marina/industrial docks | tie ropes, move crates, unload boats |
| Seafood Market Worker | TideTable Market | sort, weigh, ice, package orders |
| Bait Shop Helper | Castaway | match bait/gear to customers |
| Boat Rental Assistant | BlueCurrent | inspect, fuel, clean, assign boats |
| Harbor Courier | Harbor Master | deliver by foot, car, or boat |
| Boat Mechanic | Anchor & Axle | diagnose/repair parts |
| Diner Worker | Dockside Diner | prepare/serve seafood orders |
| TideFuel Attendant | TideFuel | car/boat fuel and restocking |
| Lighthouse Keeper | Lighthouse Point | signal, maintenance, weather checks |
| Coastal Cleanup Worker | shoreline | remove litter/debris and sort recycling |
| Cannery Worker | industrial edge | processing/sorting sequence |
| Patrol/Rescue Trainee | Harbor Patrol | buoy route and safety drills |
| Marine Tutor | Academy | help students with learning games |
| Ferry/Water Taxi Operator | harbor routes | transport NPCs safely |

---

## 13. Minigames and activity loops

| Minigame | Location | Category | Core loop |
|---|---|---|---|
| Cast & Reel | public pier/water | timing | established fishing loop |
| Catch of Legend | rare water | timing/event | rare fish transforms into special creature/catch |
| Crab Traps | dock/trap zones | puzzle/timing | place, wait, pull, sort |
| Seafood Market Rush | market | sorting/timing | fulfill orders |
| Boat Buoy Run | marina course | driving | steer through buoys |
| Net Toss | small dock | aim/timing | catch fish schools |
| Knot Challenge | academy/boatworks | sequence | tie correct knot |
| Boat Inspection | rental/academy | observation | find faults before launch |
| Net Mending | boatworks | pattern | repair net grid |
| Fish Auction Spotter | auction shed | memory/value | identify valuable catch |
| Lighthouse Signal | lighthouse | sequence/timing | operate light/foghorn pattern |
| Tide-Pool Survey | nature zone | observation | identify creatures without harming them |
| Rescue Route | patrol dock | driving/timing | reach buoy/NPC safely |
| Cannery Sort | industrial | conveyor sorting | process catch accurately |

---

## 14. Police, permits, and crime

### Law structure

- Harbor Patrol Station handles land and water law
- patrol boats operate in marked routes
- market inspectors handle stolen/protected catches
- industrial security covers cannery and cold storage
- lighthouse/nature ranger assists protected zones

### Local crimes

| Action | Consequence |
|---|---|
| Fish without permit | warning/fine/permit lock |
| Keep protected catch | larger fine and catch confiscation |
| Enter closed water | patrol response |
| Steal boat | tracker/patrol chase and impound |
| Steal market catch | merchant distrust and heat |
| Trespass cannery/cold storage | security and police response |
| Tamper with fuel dock | fast response, dock closure |
| Dump waste/oil | major fine and cleanup mission |
| Damage nets/traps | restitution or repair task |

### Response behavior

- normal response in village/center
- faster near patrol station, market, and fuel dock
- slower at outer waters, but patrol boats can cut routes
- permits and boat impound matter more than long foot chases

### Clearing trouble

- pay fine
- return boat/catch
- complete coastal cleanup
- repair damaged gear
- attend permit/safety class
- wait out fishing/boat license suspension

---

## 15. Economy, shops, and services

### Shops/services

- Castaway Bait & Tackle
- TideTable Seafood Market
- Dockside Diner
- BlueCurrent Boat Rental
- Anchor & Axle Boatworks
- TideFuel Market
- Dockside Village Grocery
- Rain & Rope clothing/gear shop
- Harbor Clinic
- property office
- marina office

### Money sinks

- rods, reels, bait, traps
- permits
- boat rental/ownership
- boat fuel and repairs
- house/boat storage upgrades
- rain gear and cosmetics
- marina slip fees later
- fish freezer/storage

### Market behavior

- fish values depend on rarity and quality
- daily or session-based market preference changes
- protected species cannot be legally sold
- rare fish/creature catches may route to special missions rather than simple cash

---

## 16. NPC population and routines

Profiles:

```txt
fisher
dockhand
market_vendor
harbor_master
patrol_officer
boat_mechanic
student
marine_teacher
diner_worker
resident
tourist
courier
lighthouse_keeper
cannery_worker
clinic_worker
ranger
```

Daily rhythm:

- dawn: fishers depart, market receives catch
- morning: academy and industrial shifts begin
- midday: tourists/boardwalk busiest
- afternoon: boat rentals and repair work
- evening: diner/market social activity
- night: lower village traffic, lighthouse/patrol activity remains

---

## 17. Asset families

### A. Hero architecture

```txt
building_harbor_master_hall_exterior_v01.glb
building_harbor_patrol_station_exterior_v01.glb
building_tidetable_market_exterior_v01.glb
building_castaway_bait_shop_exterior_v01.glb
building_dockside_diner_exterior_v01.glb
building_bluecurrent_boat_rental_exterior_v01.glb
building_anchor_axle_boatworks_exterior_v01.glb
building_tidefuel_harbor_station_exterior_v01.glb
building_harbor_academy_exterior_v01.glb
building_harbor_clinic_exterior_v01.glb
building_breakwater_lighthouse_exterior_v01.glb
building_harbor_cannery_exterior_v01.glb
building_harbor_village_market_exterior_v01.glb
```

### B. Modular docks/waterfront

```txt
arch_harbor_pier_straight_a_v01.glb
arch_harbor_pier_corner_a_v01.glb
arch_harbor_pier_ramp_a_v01.glb
arch_harbor_seawall_a_v01.glb
arch_harbor_boat_slip_a_v01.glb
arch_harbor_breakwater_a_v01.glb
arch_harbor_boardwalk_railing_a_v01.glb
arch_harbor_warehouse_wall_a_v01.glb
arch_harbor_shopfront_a_v01.glb
arch_harbor_cottage_wall_a_v01.glb
```

### C. Roads/street/coastal props

```txt
road_harbor_main_straight_a_v01.glb
road_harbor_seaside_curve_a_v01.glb
sidewalk_harbor_boardwalk_a_v01.glb
prop_harbor_streetlight_a_v01.glb
prop_harbor_buoy_a_v01.glb
prop_harbor_no_wake_sign_a_v01.glb
prop_harbor_wayfinding_sign_a_v01.glb
prop_harbor_bench_a_v01.glb
prop_harbor_trash_bin_a_v01.glb
prop_harbor_life_ring_a_v01.glb
prop_harbor_rope_post_a_v01.glb
prop_harbor_navigation_light_a_v01.glb
```

### D. Fishing/market

```txt
prop_fishing_rod_rack_a_v01.glb
prop_fishing_bait_fridge_a_v01.glb
prop_fishing_tackle_wall_a_v01.glb
prop_fishing_crab_trap_a_v01.glb
prop_fishing_net_a_v01.glb
prop_fishing_bucket_a_v01.glb
prop_market_fish_case_a_v01.glb
prop_market_ice_bin_a_v01.glb
prop_market_scale_a_v01.glb
prop_market_fish_crate_a_v01.glb
prop_market_pack_table_a_v01.glb
prop_market_auction_board_a_v01.glb
```

### E. Boats/repair

```txt
vehicle_harbor_skiff_a_v01.glb
vehicle_harbor_rental_boat_a_v01.glb
vehicle_harbor_patrol_boat_a_v01.glb
vehicle_harbor_fishing_boat_a_v01.glb
prop_boat_service_lift_a_v01.glb
prop_boat_engine_stand_a_v01.glb
prop_boat_tool_cart_a_v01.glb
prop_boat_parts_shelf_a_v01.glb
prop_net_mending_table_a_v01.glb
prop_dock_power_pedestal_a_v01.glb
```

### F. Interiors/residential

```txt
furniture_harbor_diner_booth_a_v01.glb
furniture_harbor_market_counter_a_v01.glb
furniture_harbor_cottage_bed_a_v01.glb
furniture_harbor_cottage_sofa_a_v01.glb
furniture_harbor_houseboat_bed_a_v01.glb
prop_harbor_home_freezer_a_v01.glb
prop_harbor_home_gear_rack_a_v01.glb
prop_harbor_home_weather_radio_a_v01.glb
prop_harbor_home_boat_map_a_v01.glb
```

### G. Police/clinic/rescue

```txt
prop_harbor_patrol_front_desk_a_v01.glb
prop_harbor_patrol_radio_wall_a_v01.glb
prop_harbor_evidence_freezer_a_v01.glb
prop_harbor_holding_cell_a_v01.glb
prop_harbor_rescue_gear_rack_a_v01.glb
prop_harbor_clinic_reception_a_v01.glb
prop_harbor_clinic_exam_bed_a_v01.glb
prop_harbor_firstaid_cabinet_a_v01.glb
```

### H. Minigame UI

```txt
ui_icon_harbor_fishing.svg
ui_icon_harbor_boat.svg
ui_icon_harbor_crabtrap.svg
ui_icon_harbor_market.svg
ui_icon_harbor_tide.svg
ui_icon_harbor_permit.svg
ui_meter_harbor_reel_tension.svg
ui_meter_harbor_boat_damage.svg
ui_panel_harbor_market_order.svg
```

---

## 18. First build sprint

### Fishing Harbor Sprint 001: Style Anchor Pack

```txt
1. arch_harbor_pier_straight_a_v01.glb
2. arch_harbor_boardwalk_railing_a_v01.glb
3. prop_harbor_streetlight_a_v01.glb
4. prop_harbor_buoy_a_v01.glb
5. prop_harbor_life_ring_a_v01.glb
6. prop_fishing_rod_rack_a_v01.glb
7. prop_fishing_crab_trap_a_v01.glb
8. prop_market_fish_case_a_v01.glb
9. prop_market_fish_crate_a_v01.glb
10. prop_boat_service_lift_a_v01.glb
11. furniture_harbor_cottage_bed_a_v01.glb
12. prop_harbor_home_freezer_a_v01.glb
13. prop_tidefuel_car_pump_a_v01.glb
14. prop_tidefuel_boat_pump_a_v01.glb
15. ui_icon_harbor_fishing.svg
16. ui_icon_harbor_boat.svg
```

---

## 19. Production phases

### Phase 1: Water/terrain prototype

Water plane, shoreline, safe bounds, pier collision, marina lane, buoy markers.

### Phase 2: Road and district skeleton

Harbor Road, Marina Loop, Wharf Street, Cannery Road, village streets, school route, bridge gateway.

### Phase 3: Hero exteriors

Harbor Master, patrol, market, bait shop, diner, rental, boatworks, TideFuel, academy, lighthouse, housing.

### Phase 4: Fishing and boat loops

Cast & Reel, Catch of Legend, boat entry/exit, fuel, storage, safe water routing.

### Phase 5: Jobs/interiors/school

Market, academy, boatworks, diner, housing, patrol, clinic, fuel station.

### Phase 6: Economy/crime/weather

Market prices, permits, protected fish, patrol response, fog/weather dressing.

### Phase 7: Population/polish

NPC schedules, boat traffic, soundscape, distant silhouettes, performance optimization.

---

## 20. Agent handoff checklist

```txt
Town: Fishing Harbor
District:
Land or water route:
Public, commercial, industrial, protected, or residential:
Asset/landmark:
Fishing/boat/job hook:
Permit requirement:
Water collision/safe boundary:
Docking point:
Police/patrol response:
Interior required:
Interactable handler ready:
Palette: deep blue, teal, boat red, cream, wood, rope tan, market yellow, rust
Materials: weathered wood, corrugated metal, concrete seawall, rope, canvas, wet asphalt
Avoid: pirate caricature, decorative unusable piers, empty water
Fallback:
Performance target:
```

---

## 21. Completion checklist

Fishing Harbor is not complete until the player can:

- arrive by highway and understand the town immediately
- navigate land and water routes safely
- obtain permits and learn protected-water rules
- use the two established fishing minigames
- buy/rent and fuel a boat
- sell fish through a functional market
- attend Harbor Academy
- work at least five geographically specific jobs
- buy a dock room, cottage, condo, or special water home
- use clinic, police, fuel, food, grocery, repair, and transit services
- encounter harbor-specific crime and consequences
- live here without returning to Starter Town for basic needs
- revisit for fishing seasons, rare catches, boat progression, market prices, and coastal life

Final identity:

```txt
Fishing Harbor is not a fishing minigame location.
It is a working town whose economy, school, police, homes, roads, and water all orbit the harbor.
```