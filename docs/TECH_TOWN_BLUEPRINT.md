# TechTown Blueprint

Status: planning blueprint, not runtime code  
Scope: TechTown world layout, districts, civic systems, gas station, landmarks, schools, jobs, minigames, crime profile, assets, and build phases  
Project: Zaylin's Kid World, also called ZTA

TechTown is the smart-city district of ZTA. It should feel cyberpunk, neon-heavy, computer-forward, glass-and-metal, screen-dense, and urban without becoming sterile or goofy. This town is not a placeholder cube city. It is the place where the player learns tech skills, works higher-paying smart jobs, experiments with drones/robots/hover vehicles, and deals with a different kind of trouble: surveillance, restricted labs, stolen gadgets, black-market devices, and corporate security.

TechTown should be self-sustaining like every ZTA town: the player can live here, go to school here, work here, get food here, get medical help here, fuel/charge vehicles here, buy a home here, get in trouble here, and clear trouble here.

---

## 1. Design north star

TechTown should feel like:

```txt
cyberpunk
neon
holographic
Tron-adjacent
Ready Player One-adjacent
sleek panels
dark metallic
tinted glass
digital billboards
LED strips
hover tech
smart infrastructure
computer labs
drone systems
security systems
elevated roads
high-tech interiors
```

Avoid:

```txt
Jetsons retro-future
sterile Apple-store-only futurism
overly rounded toy sci-fi
empty sci-fi rooms with no gameplay purpose
random future props that do not support jobs, learning, crime, travel, or minigames
rainbow neon soup
```

Material rule:

```txt
Dark neutral base + neon accent.
```

Primary materials:

- dark brushed metal
- black composite panels
- tinted glass
- polished concrete
- glossy synthetic trim
- holographic screen planes

Accent colors:

- neon cyan
- electric blue
- magenta
- violet
- acid green only as a limited warning/security color
- white for screens/highlights

---

## 2. Town role in the full world

TechTown is the skill-pay and systems town.

| System | TechTown purpose |
|---|---|
| Housing | smart apartments, lofts, compact homes, high-tech penthouses |
| School | STEM academy, coding lab, robotics, drone theory |
| Jobs | coding, drone dispatch, robot repair, security monitoring, transit maintenance |
| Police/security | metro police plus corporate security and cameras |
| Economy | higher-pay skill jobs, tech purchases, vehicle charging, gadgets |
| Crime | restricted access, gadget theft, drone misuse, tech resale, system sabotage |
| Skills | coding, logic, drone control, robotics, repair, cybersecurity awareness |
| Minigames | debug puzzles, circuit matching, drone runs, robot repair, hack trace, fuel/charge timing |

Core fantasy:

```txt
You come here to get smarter, earn better, unlock tech toys, and deal with stricter digital consequences.
```

---

## 3. Macro layout

World plan reference:

```txt
Tech City / TechTown origin: x 700, z -600
Connection from Rich Hills: tunnel
Connection to Dungeon Outskirts: dirt/back road from the tech edge
```

TechTown should not be a flat grid. It should be dense in the center, layered with elevated pieces, then fade into industrial/utility edges.

### Suggested local layout

```txt
                         North / corporate skyline

                [CyberCore Security Tower]
                         |
       [Neon Core Plaza]---[GridLine Transit Hub]
                         |
[Tech Campus]---[Innovation Strip]---[VoltFuel Station]
                         |
             [Residential Tech Blocks]
                         |
              [Industrial / Utility Edge]
                         |
                dirt/back road to Dungeon
```

### Road hierarchy

| Road | Type | Use |
|---|---|---|
| GridLine Avenue | main | primary north/south city spine |
| Neon Loop | local/main | loops around downtown core |
| Innovation Strip | main/commercial | dealership, gadget lab, drone shop, fuel/charge station |
| Campus Circuit | local | school, dorms, student rec |
| Stack Lane | local | residential apartments and smart homes |
| Utility Road | service/dirt edge | server facility, delivery depot, restricted zones |
| Skybridge Route | pedestrian/elevated | connects towers/transit plaza visually |
| Drone Course Airpath | activity route | drone race/checkpoint path above town |

### Traffic feel

- Main roads should feel smoother and faster than Starter Town.
- Downtown should include more traffic lights, digital crosswalks, and transit gates.
- Utility edge should be lower traffic but more restricted.
- Corporate/security zones should have cameras and scanner gates.
- Hover/EV parking should be visually distinct from normal parking.

---

## 4. District breakdown

## A. Neon Core / Downtown

Purpose: central identity, high-density tech skyline, first-arrival wow moment.

Contains:

- CyberCore Security Tower
- CodeNest Co-Work
- electronics flagship
- digital billboard plaza
- transit hub entrance
- restaurants and kiosks
- public screens
- skybridges

Gameplay:

- legal cybersecurity jobs
- coding contracts
- meeting-room/social NPCs
- debug puzzle minigames
- tech delivery missions
- camera/security consequence zones

Visual notes:

- tallest towers in the town
- dark glass with cyan/magenta strips
- holographic screens above street level
- animated-looking signage using emissive materials

## B. Innovation Strip

Purpose: gadget shopping, hover/vehicle culture, repair/customization, fuel/charging.

Contains:

- Gadget Forge Lab
- Drone District
- Neon Drift Motors
- VoltFuel Station
- public charging plaza
- repair/custom tech shop
- black-market alley access points

Gameplay:

- drone races
- robot repair
- circuit matching
- vehicle charging/fuel timing
- hover vehicle buying
- illegal tech resale hooks

Visual notes:

- lower than downtown, more storefront-heavy
- lots of display windows
- repair benches visible through glass
- charging pads and hover docks

## C. Tech Campus

Purpose: school/training district.

Contains:

- VoltByte Academy
- computer lab
- robotics room
- coding classrooms
- cafeteria
- student rec/gym area
- dorm/apartment option

Gameplay:

- STEM learning minigames
- coding quizzes
- robotics club tasks
- school jobs/tutor work
- drone theory lessons

Visual notes:

- futuristic but still clearly a school
- lockers, classrooms, cafeteria, study pods
- school signage and safe pedestrian zones

## D. Residential Tech Blocks

Purpose: housing, rest, spawn, identity choice.

Contains:

- The Stack Apartments
- smart-home townhouses
- compact student housing
- premium penthouse options
- parking/hover docking
- home tech props

Gameplay:

- buy/rent homes
- choose TechTown as primary residence
- sleep/rest
- wardrobe/safe/storage
- local bills/maintenance later
- smart-home upgrade money sinks

Visual notes:

- livable, not cold
- LED strips, smart screens, compact furniture
- balcony modules and rooftop patios

## E. Industrial / Utility Edge

Purpose: infrastructure, restricted access, darker tech-crime hooks, route to Dungeon Outskirts.

Contains:

- server relay facility
- power relay
- drone storage depot
- delivery depot
- maintenance garage
- restricted corporate facility
- security outpost
- dirt/back road toward Dungeon Outskirts

Gameplay:

- restricted-area infiltration
- data courier jobs
- drone delivery dispatch
- server maintenance puzzles
- corporate security heat
- black-market gadget interactions

Visual notes:

- less polished, more cables, vents, service doors
- warning lights and acid-green security accents
- camera poles and restricted door panels

---

## 5. Required hero landmarks

| Landmark | District | Purpose |
|---|---|---|
| CyberCore Security Tower | Neon Core | cybersecurity office, legal high-pay jobs, security-monitor minigames |
| VoltByte Academy | Tech Campus | school, coding/robotics/drone learning |
| Neon Drift Motors | Innovation Strip | hover/electric car dealership and show floor |
| ByteMart | Innovation Strip / Core | convenience store, snacks, batteries, cheap tech items |
| Pixel Bites | Neon Core / Campus | restaurant and food-shift job |
| Drone District | Innovation Strip | drone store, drone race entry, drone parts |
| PulseFit | Tech Campus / Residential edge | futuristic gym and fitness job |
| Synapse Clinic | Neon Core / Residential edge | health/recovery, clinic job |
| GridLine Transit Hub | Neon Core | fast travel unlock, transit jobs, route puzzle |
| Metro Security Precinct | Neon Core / Utility edge | police/security station, heat clearing, restricted evidence/tech crimes |
| CodeNest Co-Work | Neon Core | startup jobs, coding contracts, freelance work |
| Gadget Forge Lab | Innovation Strip | repair, customization, circuit minigames |
| The Stack Apartments | Residential Tech Blocks | buyable housing and TechTown spawn/home base |
| Server Relay Facility | Utility Edge | restricted jobs, maintenance, security, crime hooks |
| VoltFuel Station | Innovation Strip / Utility edge | hybrid gas/EV/hover charging station, convenience, fuel job |

---

## 6. VoltFuel Station: TechTown gas station

TechTown still needs a gas station, but it should fit the town. It is not only old-school gasoline. It is a hybrid fuel and charging station for normal cars, electric/hover vehicles, and delivery drones.

Working name:

```txt
VoltFuel Station
```

Alternate names:

```txt
GridFuel
Charge & Go
VoltStop
Neon Pump
AmpWay Station
```

Recommended name: **VoltFuel Station** because it reads clearly as fuel but still feels tech.

### Location

Place VoltFuel Station on the Innovation Strip near the Utility Edge.

Reason:

- close to Neon Drift Motors and vehicle culture
- close to service roads and delivery depot
- believable spot for charging/fuel infrastructure
- accessible before heading toward Dungeon Outskirts or back to Rich Hills

### Exterior layout

```txt
Main store box: ByteMart Express convenience shell
Canopy: angular black roof with cyan/magenta strip lighting
Fuel pumps: 2 normal pump islands
Charge bays: 4 EV/hover charge pads
Drone dock: small roof-side drone recharge pad
Parking: 4 short-term store spots
Service kiosk: tire/repair/charge terminal
Sign: tall digital price board with fuel + charge rates
```

### Gameplay functions

| Function | Gameplay |
|---|---|
| Refuel normal cars | Drive into pump zone, pay, fill tank |
| Charge hover/electric vehicles | Park on charge pad, timing/price meter |
| Buy snacks | energy drinks, Computer Chips snack, quick food |
| Fuel/charge job | pump timing, clean pads, restock batteries |
| Delivery pickup | tech courier packages from store locker |
| Crime hook | steal charge cells, skim kiosk, restricted panel tampering |
| Police/security hook | scanner cameras catch tampering faster than Starter Town gas station |

### VoltFuel minigames / activity loops

| Activity | Gameplay |
|---|---|
| Charge Timing | Stop charge inside green zone for discount/bonus |
| Battery Restock | Match battery types to shelves/chargers under timer |
| Pump Helper Shift | Serve NPC cars at correct pump/charge bay |
| Kiosk Repair | Circuit match puzzle to restore broken payment terminal |
| Delivery Locker Sort | Sort tech packages into correct route bins |

### Asset list

```txt
building_voltfuel_station_exterior_v01.glb
building_voltfuel_store_shell_v01.glb
prop_voltfuel_digital_price_sign_v01.glb
prop_voltfuel_canopy_neon_v01.glb
prop_fuel_pump_future_a_v01.glb
prop_charge_pad_vehicle_a_v01.glb
prop_hover_charge_pedestal_a_v01.glb
prop_drone_charge_dock_roof_a_v01.glb
prop_battery_shelf_station_a_v01.glb
prop_air_water_service_terminal_future_a_v01.glb
prop_pay_kiosk_fuel_future_a_v01.glb
prop_store_locker_delivery_a_v01.glb
food_snack_computer_chips_bag_a_v01.glb
food_energy_drink_future_a_v01.glb
```

### Interior layout

Rooms/areas:

- convenience counter
- snack aisles
- battery/electronics shelf
- drink cooler
- package locker wall
- staff-only utility room
- restroom if needed

Interior stations:

- shop counter
- delivery locker
- battery shelf
- staff utility terminal
- exit door

### Implementation note

Do not reuse Starter Town's 6twelve gas station art directly. The gameplay loop can share code later, but TechTown needs its own visual shell, charge pads, signs, station props, and crime/security hooks.

---

## 7. Housing plan

TechTown should let the player live there, not just visit.

| Housing | District | Tier | Gameplay |
|---|---|---|---|
| Stack Micro Unit | The Stack Apartments | Basic | affordable apartment, spawn/rest/storage |
| Smart Loft | Neon Core edge | Mid | better view, more storage, digital decor |
| Campus Pod | Tech Campus | Basic/Special | student-style housing, school bonus flavor |
| Rooftop Condo | Neon Core | Premium | status, fast access to downtown jobs |
| Utility Edge Workshop Loft | Utility Edge | Special | repair/crafting flavor, close to gadget jobs |

Primary residence effects:

- spawn in TechTown
- sleep/rest
- wardrobe
- safe/storage
- local messages/mail
- possible local skill buff after future housing system matures

Home style:

- compact modern furniture
- wall screens
- smart speaker
- LED strips
- small PC/gaming setup
- smart kitchen
- glass shower/bathroom fixtures

---

## 8. School: VoltByte Academy

VoltByte Academy is the TechTown school/training center. It should teach STEM, coding, robotics, drone systems, and smart-city operations.

### School identity

```txt
not a plain office
not a hospital
not a generic classroom
futuristic but still a school
student spaces + labs + cafeteria + lockers
```

### Required spaces

| Space | Purpose |
|---|---|
| Coding classroom | debug puzzles, logic quizzes |
| Robotics lab | robot repair, build/test tasks |
| Drone theory room | drone safety, route planning |
| Computer lab | hacking/trace tutorial, typing/sequence practice |
| Cafeteria | student social space, food access |
| Locker corridor | school identity, NPC routes |
| Study pods/media center | study/rest, side tutoring jobs |
| Gym/rec room | school fitness or reaction minigames |

### Learning minigames

| Minigame | Gameplay | Reward |
|---|---|---|
| Debug Drill | fix logic errors under timer | smarts, tech skill |
| Circuit Class | rotate/connect circuit tiles | smarts, repair skill |
| Drone Theory | identify safe route/flight rule | drone control |
| Robot Lab Test | assemble parts and test movement | robotics skill |
| Smart City Quiz | match infrastructure systems | smarts, transit job unlock |
| Typing Trace | hit sequence before trace bar fills | cybersecurity awareness |

---

## 9. Police/security: Metro Security Precinct

TechTown uses a mixed law system: normal metro police plus corporate security, cameras, scanner gates, and restricted access systems.

### Law presence

| Authority | Where | Behavior |
|---|---|---|
| Metro Security Precinct | central/utility edge | town police, fines, wanted clearing |
| Corporate Security | CyberCore, Server Relay, Gadget Forge restricted areas | faster response indoors/restricted zones |
| Camera Network | downtown, transit, corporate areas | detects tampering, stolen tech, restricted access |
| Drone Patrols | Innovation Strip / Utility Edge | visual patrol flavor, future chase/scanner hooks |

### Response style

- faster than Starter Town in corporate/security zones
- more camera-triggered warnings
- stricter response to gadget theft and restricted doors
- less street-chase focused, more access-ban/security-lock focused
- heat can lead to locked terminals, denied jobs, or extra security scans

### Local crimes

| Risky action | Consequence flavor |
|---|---|
| gadget theft | store ban, heat, confiscation |
| restricted lab access | corporate security warning/escalation |
| drone misuse | drone license cooldown or fine |
| vehicle/hover car theft | metro police plus tracker response |
| charge station tampering | quick camera detection |
| black-market tech dealing | security heat and merchant distrust |
| hack-trace failure | terminal lockout, heat increase, job cooldown |

### Heat clearing

Options:

- pay fine at Metro Security Precinct
- complete community tech repair task
- return stolen tech
- wait out access ban
- take a cybersecurity ethics class at VoltByte Academy later

---

## 10. Jobs

TechTown jobs should feel skill-based. They can pay better than Starter Town jobs, but require learning, accuracy, or gear unlocks.

| Job | Location | Gameplay |
|---|---|---|
| Debug Contractor | CodeNest Co-Work / CyberCore | solve logic puzzles under timer |
| IT Support Tech | CyberCore / offices | fix terminals, route tickets, reset systems |
| Drone Courier | Drone District / Transit Hub | fly drone route through checkpoints |
| Electronics Store Worker | ByteMart / electronics flagship | match devices, restock shelves, checkout customers |
| Robot Repair Tech | Gadget Forge Lab | assemble parts, test movement, diagnose faults |
| Circuit Assembler | Gadget Forge Lab | connect circuit boards under timer |
| Transit Maintenance Worker | GridLine Transit Hub | repair gates, route passengers, fix ticket terminal |
| VoltFuel Attendant | VoltFuel Station | pump/charge timing, restock batteries, clean pads |
| Clinic Front Desk / Assistant | Synapse Clinic | check-in patients, match treatment rooms, restock medical devices |
| Teacher's Aide | VoltByte Academy | help NPC students with learning minigames |
| Security Monitor | Metro Security / CyberCore | watch cameras, flag issues, pattern spotting |

---

## 11. Minigames and activity loops

TechTown should have more than the minimum 3 to 4 loops. It is one of the best towns for puzzle/skill minigames.

| Minigame | Location | Category | Gameplay |
|---|---|---|---|
| Debug It | CodeNest / VoltByte | puzzle | fix code-like logic blocks under timer |
| Circuit Match | Gadget Forge / Academy | puzzle | rotate/connect circuits to power device |
| Drone Run | Drone District | driving/flight | fly through rings and avoid obstacles |
| Hack Trace | CyberCore / Utility Edge | timing/sequence | match sequence before trace fills |
| Robot Repair Bench | Gadget Forge | puzzle/timing | diagnose, place parts, run movement test |
| Delivery Drone Dispatch | Transit Hub | route puzzle | assign packages to efficient drone routes |
| Security Monitor Challenge | Metro Security | pattern recognition | watch screens and flag fictional incidents |
| Charge Timing | VoltFuel Station | timing | stop fuel/charge at ideal mark |
| Battery Restock | VoltFuel / ByteMart | sorting | match battery types to correct shelf/charger |
| Smart City Quiz | VoltByte Academy | learning | answer infrastructure/system questions |
| Transit Gate Repair | GridLine Transit Hub | timing/puzzle | restore gates and ticket terminals |
| Black Market Signal Jam | Utility Edge | risk/puzzle | illegal route: avoid security pings; failure increases heat |

---

## 12. Shops and services

| Shop/service | Purpose |
|---|---|
| ByteMart | snacks, cheap electronics, batteries, Computer Chips snack |
| Pixel Bites / Circuit Grill | restaurant, food, work shift |
| Drone District | drone buying/upgrades/race entry |
| Gadget Forge Lab | repairs, custom gadgets, circuit jobs |
| Neon Drift Motors | hover/electric vehicles |
| VoltFuel Station | gas, charging, snacks, delivery locker, fuel jobs |
| PulseFit | gym, fitness maintenance |
| Synapse Clinic | health/recovery |
| GridLine Transit Hub | fast travel, transit jobs |
| Metro Security Precinct | police, heat clearing |
| The Stack Apartments | housing and rest |
| CodeNest Co-Work | freelance coding jobs |
| CyberCore Security Tower | higher-pay corporate/cybersecurity jobs |

---

## 13. Asset families

The uploaded asset plan already breaks TechTown into useful asset families. This blueprint keeps that structure and adds town-function requirements.

### A. Architecture / exteriors

Hero exteriors:

```txt
building_cybercore_security_tower_exterior_v01.glb
building_voltbyte_academy_exterior_v01.glb
building_neon_drift_motors_exterior_v01.glb
building_bytemart_exterior_v01.glb
building_pixel_bites_exterior_v01.glb
building_drone_district_exterior_v01.glb
building_pulsefit_exterior_v01.glb
building_synapse_clinic_exterior_v01.glb
building_gridline_transit_hub_exterior_v01.glb
building_metro_security_precinct_exterior_v01.glb
building_codenest_cowork_exterior_v01.glb
building_gadget_forge_lab_exterior_v01.glb
building_stack_apartments_exterior_v01.glb
building_server_relay_facility_exterior_v01.glb
building_voltfuel_station_exterior_v01.glb
```

Modular kit:

```txt
arch_wall_panel_metal_a_v01.glb
arch_wall_panel_glass_a_v01.glb
arch_wall_panel_glass_b_v01.glb
arch_corner_panel_a_v01.glb
arch_roof_trim_neon_a_v01.glb
arch_roof_trim_neon_b_v01.glb
arch_door_frame_futuristic_a_v01.glb
arch_window_large_holo_a_v01.glb
arch_window_small_tint_a_v01.glb
arch_storefront_frame_a_v01.glb
arch_balcony_modern_a_v01.glb
arch_stair_exterior_metal_a_v01.glb
arch_skybridge_small_a_v01.glb
arch_platform_hoverdock_a_v01.glb
```

### B. Roads / infrastructure

```txt
road_futuristic_lane_straight_a_v01.glb
road_futuristic_lane_curve_a_v01.glb
road_hover_lane_marker_a_v01.glb
sidewalk_tech_a_v01.glb
crosswalk_neon_a_v01.glb
median_light_strip_a_v01.glb
street_divider_glow_a_v01.glb
elevated_road_support_a_v01.glb
hover_parking_pad_a_v01.glb
charging_bay_pad_a_v01.glb
prop_streetlight_neon_a_v01.glb
prop_hologram_billboard_small_a_v01.glb
prop_hologram_billboard_large_a_v01.glb
prop_digital_ad_kiosk_a_v01.glb
prop_public_screen_stand_a_v01.glb
prop_wayfinding_sign_digital_a_v01.glb
prop_security_camera_futuristic_a_v01.glb
prop_transit_gate_a_v01.glb
prop_ticket_terminal_a_v01.glb
```

### C. Office / cybersecurity / co-working

```txt
interior_office_reception_desk_futuristic_v01.glb
furniture_office_desk_futuristic_a_v01.glb
furniture_office_chair_futuristic_a_v01.glb
prop_multi_monitor_station_a_v01.glb
prop_laptop_station_a_v01.glb
prop_server_rack_a_v01.glb
prop_data_terminal_a_v01.glb
prop_glass_meeting_table_a_v01.glb
prop_hologram_meeting_table_a_v01.glb
prop_wall_screen_dashboard_a_v01.glb
prop_cybersecurity_ops_console_a_v01.glb
prop_keycard_reader_a_v01.glb
prop_digital_whiteboard_a_v01.glb
```

### D. School / academy

```txt
building_voltbyte_academy_sign_v01.glb
classroom_desk_tech_a_v01.glb
chair_student_modern_a_v01.glb
prop_teacher_console_future_a_v01.glb
prop_digital_board_classroom_a_v01.glb
prop_tablet_cart_a_v01.glb
prop_computer_lab_station_a_v01.glb
prop_robotics_workbench_a_v01.glb
prop_3d_printer_a_v01.glb
prop_small_robot_display_a_v01.glb
prop_school_locker_future_a_v01.glb
prop_school_cafeteria_table_modern_a_v01.glb
prop_library_terminal_a_v01.glb
prop_study_pod_a_v01.glb
```

### E. Food / restaurant / convenience

```txt
building_pixel_bites_sign_v01.glb
interior_restaurant_counter_futuristic_v01.glb
prop_order_kiosk_futuristic_a_v01.glb
prop_menu_board_digital_a_v01.glb
furniture_restaurant_booth_future_a_v01.glb
furniture_restaurant_table_future_a_v01.glb
prop_drink_dispenser_future_a_v01.glb
prop_food_warmer_future_a_v01.glb
prop_grill_station_future_a_v01.glb
prop_kitchen_prep_counter_future_a_v01.glb
food_burger_future_a_v01.glb
food_fries_future_a_v01.glb
food_noodle_bowl_future_a_v01.glb
food_snack_computer_chips_bag_a_v01.glb
food_energy_drink_future_a_v01.glb
food_softdrink_cup_future_a_v01.glb
```

### F. Electronics / drone / gadget retail

```txt
prop_display_shelf_electronics_a_v01.glb
prop_phone_display_table_a_v01.glb
prop_tablet_display_table_a_v01.glb
prop_headset_display_a_v01.glb
prop_console_display_a_v01.glb
prop_drone_display_small_a_v01.glb
prop_drone_display_medium_a_v01.glb
prop_drone_parts_wall_a_v01.glb
prop_repair_counter_tech_a_v01.glb
prop_tool_bench_precision_a_v01.glb
prop_gadget_case_a_v01.glb
prop_checkout_counter_tech_a_v01.glb
prop_customer_kiosk_tech_a_v01.glb
```

### G. Residential / home

```txt
furniture_bed_modern_tech_a_v01.glb
furniture_nightstand_tech_a_v01.glb
furniture_dresser_tech_a_v01.glb
furniture_desk_gaming_tech_a_v01.glb
furniture_desk_study_tech_a_v01.glb
furniture_chair_desk_tech_a_v01.glb
furniture_couch_modern_tech_a_v01.glb
furniture_coffee_table_tech_a_v01.glb
furniture_tv_unit_tech_a_v01.glb
furniture_kitchen_island_tech_a_v01.glb
furniture_bathroom_sink_future_a_v01.glb
furniture_toilet_future_a_v01.glb
furniture_shower_glass_future_a_v01.glb
prop_wall_screen_home_a_v01.glb
prop_smart_speaker_a_v01.glb
prop_holo_alarm_clock_a_v01.glb
prop_small_pc_setup_a_v01.glb
prop_led_light_strip_home_a_v01.glb
```

### H. Gym / wellness / clinic

```txt
building_pulsefit_sign_v01.glb
equipment_treadmill_future_a_v01.glb
equipment_bike_future_a_v01.glb
equipment_weight_bench_future_a_v01.glb
equipment_dumbbell_rack_future_a_v01.glb
equipment_cable_machine_future_a_v01.glb
prop_gym_locker_future_a_v01.glb
prop_gym_reception_desk_future_a_v01.glb
prop_wall_fitness_screen_a_v01.glb
building_synapse_clinic_sign_v01.glb
prop_clinic_reception_desk_a_v01.glb
prop_exam_bed_future_a_v01.glb
prop_medical_monitor_future_a_v01.glb
prop_health_terminal_a_v01.glb
```

### I. Police / security / crime

```txt
building_metro_security_sign_v01.glb
prop_security_front_desk_future_a_v01.glb
prop_security_monitor_wall_a_v01.glb
prop_holding_cell_future_a_v01.glb
prop_evidence_locker_future_a_v01.glb
prop_interview_room_table_a_v01.glb
prop_police_terminal_a_v01.glb
prop_barrier_security_a_v01.glb
prop_security_scanner_gate_a_v01.glb
prop_hidden_server_stack_a_v01.glb
prop_illegal_terminal_a_v01.glb
prop_data_drive_crate_a_v01.glb
prop_hacked_panel_open_a_v01.glb
prop_black_market_table_tech_a_v01.glb
prop_signal_scrambler_a_v01.glb
prop_cable_cluster_a_v01.glb
prop_restricted_door_panel_a_v01.glb
prop_rooftop_access_hatch_a_v01.glb
prop_security_override_console_a_v01.glb
```

### J. Minigame support UI/assets

```txt
prop_code_terminal_minigame_a_v01.glb
prop_debug_screen_minigame_a_v01.glb
prop_drone_controller_a_v01.glb
prop_drone_ring_checkpoint_a_v01.glb
prop_repair_board_minigame_a_v01.glb
prop_circuit_table_a_v01.glb
prop_security_node_a_v01.glb
prop_hack_port_a_v01.glb
ui_icon_code.svg
ui_icon_hack.svg
ui_icon_drone.svg
ui_meter_trace_progress.svg
ui_meter_signal_lock.svg
ui_panel_minigame_terminal.svg
```

---

## 14. First build sprint

Recommended first sprint is still a style anchor pack. Do not start with CyberCore Tower first. Start by proving the town reads correctly at prop scale.

## TechTown Sprint 001: Style Anchor Pack

```txt
1. prop_streetlight_neon_a_v01.glb
2. prop_hologram_billboard_small_a_v01.glb
3. prop_digital_ad_kiosk_a_v01.glb
4. prop_bench_futuristic_a_v01.glb
5. prop_charging_station_public_a_v01.glb
6. prop_fuel_pump_future_a_v01.glb
7. prop_charge_pad_vehicle_a_v01.glb
8. furniture_office_desk_futuristic_a_v01.glb
9. prop_multi_monitor_station_a_v01.glb
10. furniture_restaurant_booth_future_a_v01.glb
11. classroom_desk_tech_a_v01.glb
12. furniture_bed_modern_tech_a_v01.glb
13. prop_wall_screen_home_a_v01.glb
14. ui_icon_drone.svg
15. ui_icon_hack.svg
16. ui_icon_code.svg
```

Why these first:

- proves street identity
- proves neon/glass/metal palette
- proves office identity
- proves school identity
- proves restaurant identity
- proves residential identity
- adds gas/charge language immediately
- creates reusable kit pieces before hero buildings

---

## 15. Production phases

## Phase 1: Style anchors

- streetlight
- billboard
- kiosk
- bench
- charging station
- fuel pump
- office desk/monitor
- restaurant booth
- classroom desk
- apartment bed/wall screen

## Phase 2: Hero exteriors

- CyberCore Security Tower
- VoltByte Academy
- Neon Drift Motors
- Pixel Bites
- ByteMart
- VoltFuel Station
- Metro Security Precinct
- PulseFit
- The Stack Apartments

## Phase 3: Core interiors

- office/cybersecurity
- school classroom + robotics lab
- restaurant
- apartment/home
- gym
- dealership
- electronics/drone retail
- security precinct
- VoltFuel convenience store/service interior

## Phase 4: Supporting props

- street props
- signage
- digital kiosks
- home tech props
- transit props
- security/camera props
- charge pads
- hover parking props

## Phase 5: Crime / minigame support

- hacking assets
- drone checkpoint assets
- repair board assets
- restricted-area assets
- security monitor assets
- black market tech assets

---

## 16. GitHub/Codex agent handoff checklist

When asking an agent to build TechTown assets or map pieces, include this:

```txt
Town: TechTown
District:
Asset / landmark:
Purpose:
Gameplay hook:
Interior required? yes/no
Collision required? yes/no
Interactable? yes/no
If interactable, handler required before prompt? yes
Visual style: dark metal + tinted glass + neon cyan/magenta/violet
Avoid: retro Jetsons, sterile white-only sci-fi, rainbow neon soup
Export format: optimized GLB for models, SVG/PNG for UI as appropriate
Naming convention: <domain>_<location-or-function>_<descriptor>_<variant>
Performance: low-poly/stylized, instancing-friendly, avoid huge textures
Fallback: procedural shell/prop if GLB missing
```

Specific VoltFuel request example:

```txt
Build building_voltfuel_station_exterior_v01.glb as a TechTown hybrid gas/charge station.
Include angular neon canopy, two normal fuel pump islands, four vehicle charge pads,
one roof drone charge dock, digital price/rate sign, and ByteMart Express store shell.
Keep pumps and charge pads separate child meshes if possible so gameplay triggers can
align to them later. Use dark metal, tinted glass, cyan/magenta strips, and readable
fuel/charge signage. Do not include interior clutter in the exterior shell.
```

---

## 17. Final design rule

TechTown is not just "future buildings." It is a complete town with tech-specific life.

```txt
Live here: smart apartments and lofts.
Learn here: VoltByte Academy.
Work here: coding, robotics, drones, security, transit, fuel/charge jobs.
Eat here: Pixel Bites and ByteMart snacks.
Fuel here: VoltFuel Station.
Get healed here: Synapse Clinic.
Get in trouble here: restricted tech, gadget theft, drones, tampering.
Clear trouble here: Metro Security Precinct or repair/community tasks.
Return here: high-pay skill jobs, tech upgrades, vehicle charging, smart-home progression.
```

If Starter Town teaches the basics, TechTown teaches systems.