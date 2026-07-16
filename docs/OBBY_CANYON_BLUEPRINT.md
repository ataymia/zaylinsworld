# Obby Canyon Blueprint

Status: planning blueprint, not runtime code  
Alias: Obby Town  
Scope: canyon base settlement, platforming zones, roads, course paths, civic systems, housing, academy, ranger/safety enforcement, jobs, minigames, assets, and build phases  
Project: Zaylin's Kid World, also called ZTA

**Obby Canyon** is ZTA's movement and platform-skill town. It is not a city grid with floating blocks nearby. The drivable town exists at canyon base, where players can live, learn, work, recover, refuel, shop, and prepare. Beyond the vehicle gate, the landscape becomes a network of authored platform courses, checkpoint trails, moving structures, ziplines, hazard basins, and vertical towers.

Obby Canyon must be friendly to beginners, rewarding to experts, readable at speed, and safe from unfair collision or reset behavior. Every course must communicate where the player is going, what will reset them, and which checkpoint they currently own.

---

## 1. Design north star

Obby Canyon should feel:

```txt
sunlit canyon
bright course markers
athletic camp
vertical exploration
clear checkpoint beams
playful danger
competition without cruelty
skill, timing, balance, route memory
```

Avoid:

```txt
random floating parts with no visual route
identical rainbow platforms everywhere
unmarked kill floors
long walks after failure
vehicles mixed into active platform courses
pay-to-win checkpoint design
courses that require camera angles the player cannot reasonably use
```

Core fantasy:

```txt
Arrive at base camp. Learn movement. Choose a course.
Climb, swing, dodge, balance, fall, respawn, improve, and master the canyon.
```

---

## 2. Visual identity

### Palette

```txt
sandstone:        #c8864b
sunlit_rock:      #dda968
deep_canyon:      #6f493b
checkpoint_cyan:  #38c4d5
course_coral:     #ef6f61
course_lime:      #9ac34a
course_violet:    #755ab8
safety_yellow:    #e3b83f
base_cream:       #d8c6a1
road:             #725b48
shade_blue:       #557990
```

Palette rule:

- canyon terrain stays warm and natural
- course difficulty families use controlled accent colors
- checkpoint cyan remains consistent everywhere
- danger uses yellow/red symbols plus shape/pattern, not color alone

### Materials

- sandstone and packed dirt
- painted metal platforms
- rope, canvas, safety netting
- rubberized training surfaces
- wood bridges
- steel zipline towers
- glowing checkpoint/ring materials

### Lighting

- strong daylight and clear shadows
- course-critical edges use readable trim
- evening floodlights at base camp and main courses
- checkpoint beams visible from distance
- no blinding bloom around active platforms

### Soundscape

- wind through canyon
- distant checkpoint chimes
- crowd reactions at finish areas
- zipline hum
- safety announcements at base
- calmer residential and academy areas

### Weather

- mostly clear
- wind events can affect select advanced courses only when clearly announced
- dust gusts visual, not vision-blocking
- no rain physics unless courses are explicitly designed for it

---

## 3. World role and connections

Reserved origin:

```txt
Obby Canyon: x 1400, z -1200
Primary connection: dirt trail from Dungeon Outskirts
```

Arrival sequence:

1. Dungeon trail exits dark rocky terrain.
2. Canyon opens into bright sandstone valley.
3. Checkpoint beams and course towers appear above base camp.
4. Checkpoint Fuel & Supply sits before the vehicle restriction gate.
5. Player reaches Base Camp Commons, Ranger Station, Academy, housing, and course selection plaza.

Map layers:

```txt
Base Settlement = vehicles, housing, school, services, jobs.
Course Zone = on-foot platforming, checkpoints, no normal vehicles.
Sky/Ridge Zone = advanced courses, ziplines, premium views.
Hazard Basin = controlled lava/floor-hazard courses, not town streets.
```

---

## 4. Macro layout

```txt
                         NORTH / SKYRIDGE

                 [Skyrail Ridge]---[Summit Course]
                        |                  |
              [Moving Towers]---[Cliffside Courses]
                        |                  |
 WEST / ADVANCED   [Course Select Plaza]   EAST / BEGINNER

 [Hazard Basin]---[Base Camp Commons]---[Beginner Valley]
        |                  |                    |
 [Maintenance Yard]---[Momentum Academy]---[Practice Park]
        |                  |                    |
 [Checkpoint Fuel]---[Ranger & Rescue]---[Residential Camp]
                           |
              TRAIL TO DUNGEON OUTSKIRTS
```

---

## 5. District breakdown

## A. Arrival Gate and Checkpoint Fuel

Purpose: vehicle arrival, fuel, convenience, orientation, and course safety messaging.

Contains:

- Checkpoint Fuel & Supply
- road parking
- bus/fast-travel stop
- vehicle restriction gate
- canyon map
- course difficulty board
- equipment rental lockers
- tow/repair pad

Gameplay:

- refuel
- fuel/convenience shift
- rent basic safety gear/cosmetics
- course orientation
- package delivery from Dungeon/Tech routes

## B. Base Camp Commons

Purpose: social and civic heart of Obby Canyon.

Contains:

- course selection plaza
- leaderboard wall
- Checkpoint Café
- TrailMart convenience store
- cosmetic/reward shop
- property office
- public restrooms
- seating/shade canopies
- event stage

Gameplay:

- choose course
- view records
- collect rewards
- join daily challenge
- meet coaches/rivals
- accept jobs

## C. Momentum Academy

Purpose: school, movement training, safety education, and skill progression.

Contains:

- classrooms
- indoor practice gym
- balance lab
- timing lane
- route-planning room
- course-design workshop
- cafeteria
- dorm wing
- first-aid training room

Gameplay:

- learn movement mechanics
- unlock advanced courses through skill, not only money
- coach/tutor jobs
- course-design education

## D. Beginner Valley

Purpose: low-pressure introduction to obby movement.

Contains:

- ground-level platforms
- wide jumps
- simple moving platforms
- clear checkpoints
- practice wall climb
- beginner finish pavilion
- spectator path

Rules:

- short checkpoint spacing
- immediate visual route
- no surprise hazards
- easy return to base

## E. Moving Towers District

Purpose: vertical mid-level challenge.

Contains:

- rotating platforms
- elevators/lifts
- timed doors
- moving beams
- tower checkpoints
- rescue ladders/dev paths hidden from normal gameplay

Gameplay:

- Moving Platform Sprint
- tower time trials
- route-choice challenge

## F. Cliffside Courses

Purpose: balance, wall routes, narrow bridges, and canyon traversal.

Contains:

- cliff ledges
- rope bridges
- wall-jump segments if supported
- swinging ropes/bars
- checkpoint caves
- scenic overlook finish

Safety:

- visible fall zones
- quick reset
- no collision gaps at ledges

## G. Hazard Basin

Purpose: controlled danger courses with lava/floor tiles, disappearing platforms, and rhythm hazards.

Contains:

- hazard floor arena
- timed stepping stones
- rising/falling columns
- safe spectator ring
- emergency reset hub

Visual rule:

Hazards are stylized energy/lava, never realistic injury. Failure means poof/reset.

## H. Skyrail Ridge

Purpose: zipline, ring routes, long aerial traversal, and premium challenge.

Contains:

- zipline launch towers
- ring checkpoints
- suspended bridges
- wind indicator flags
- ridge station
- summit lodge

Gameplay:

- Zipline Rings
- aerial time trial
- wind-reading challenge

## I. Residential Camp

Purpose: player homes and everyday canyon life.

Contains:

- camp bunks
- canyon cabins
- academy dorms
- base apartments
- premium cliff lodge homes
- community fire/picnic area
- small garden
- laundry and storage building

## J. Ranger, Rescue, and Maintenance Yard

Purpose: law/safety, course maintenance, emergency response, and practical jobs.

Contains:

- Canyon Ranger & Safety Station
- first-aid clinic
- rescue equipment garage
- maintenance workshop
- platform parts storage
- checkpoint control room
- course impound/evidence storage

Gameplay:

- safety patrol jobs
- platform repairs
- rescue/reset missions
- crime/cheating consequences

---

## 6. Roads, course paths, and transportation

### Vehicle roads

| Road | Type | Function |
|---|---|---|
| Canyon Approach | dirt/main | Dungeon connection and arrival |
| Base Camp Loop | local | commons, academy, housing, ranger |
| Service Track | service | maintenance and rescue yard |
| Residential Trail | local | cabins/apartments |
| Fuel Access Lane | local | station and tow pad |

### Non-vehicle routes

| Route | Function |
|---|---|
| Course Select Walk | base to course gates |
| Beginner Trail | spectator/player beginner circulation |
| Tower Route | vertical moving-course path |
| Cliff Route | advanced traversal |
| Hazard Route | arena access |
| Skyrail Route | ziplines/rings |
| Staff Rescue Route | invisible-to-player logic or clearly restricted maintenance path |

### Vehicle restriction

- vehicles stop at Base Camp vehicle gate
- parking provided before course zone
- ranger/rescue vehicles may use service tracks only
- no car collision inside platform courses

### Checkpoint system

Each course requires:

```txt
course id
course difficulty
ordered checkpoint ids
checkpoint world positions
respawn facing direction
safe spawn radius
completion trigger
best time
no-fall flag
reset reason
```

---

## 7. Civic infrastructure

### Law/safety

- Canyon Ranger & Safety Station
- course marshals
- checkpoint control room
- rescue equipment and response routes
- anti-cheat/course-sabotage consequence system

### Healthcare

- Canyon First Aid Clinic
- academy first-aid room
- reset beacons handle falls; clinic handles health/stat recovery

### Fuel

- Checkpoint Fuel & Supply at arrival gate

### Fire/rescue

- compact rescue garage
- rope/rescue gear
- hazard-basin emergency shutoff props
- summit rescue beacon

### Sanitation

- base camp trash/recycling
- course litter cleanup jobs
- maintenance yard
- portable waste/service props only in sensible locations

### Utilities

- base generator/solar array dressing
- checkpoint power relays
- water tank
- shade canopies
- course control cables/panels

---

## 8. Hero landmarks

| Landmark | District | Purpose |
|---|---|---|
| Momentum Academy | Campus | school and movement training |
| Course Select Plaza | Commons | activity hub and leaderboards |
| Canyon Ranger & Safety Station | Civic | law, safety, heat clearing |
| Checkpoint Fuel & Supply | Arrival | fuel, convenience, jobs |
| Checkpoint Café | Commons | food and café job |
| TrailMart | Commons | gear/snacks/basic supplies |
| Canyon Cosmetics | Commons | course reward shop |
| Beginner Gate Pavilion | Beginner Valley | first course entry |
| Moving Towers | Mid Canyon | vertical challenge landmark |
| Hazard Basin Arena | Advanced | hazard courses |
| Skyrail Ridge Station | Ridge | zipline/aerial courses |
| Summit Lodge | Ridge | premium home/rest/view |
| Canyon First Aid Clinic | Civic | recovery |
| Maintenance Yard | Service | course repair/jobs |
| Residential Camp | Base | buyable homes |

---

## 9. Checkpoint Fuel & Supply

### Exterior

```txt
- 2 normal fuel pumps
- 2 EV charge pedestals
- 1 off-road repair/tire pad
- 5 parking spaces
- shaded convenience porch
- course map billboard
- water refill station
- package/equipment lockers
- vehicle gate nearby
```

Gameplay:

| Activity | Description |
|---|---|
| Fuel Shift | serve NPC vehicles |
| Off-Road Tire Check | inspect/repair tires before travel |
| Water Restock | sort water bottles/coolers for courses |
| Equipment Locker Sort | route gear to course gates |
| Map Guide | match visitor to correct difficulty course |
| Crime Hook | steal passes/gear or tamper with gate terminal |

Assets:

```txt
building_checkpoint_fuel_supply_exterior_v01.glb
prop_checkpoint_fuel_canopy_a_v01.glb
prop_checkpoint_fuel_pump_a_v01.glb
prop_checkpoint_ev_charger_a_v01.glb
prop_checkpoint_tire_pad_a_v01.glb
prop_checkpoint_water_station_a_v01.glb
prop_checkpoint_equipment_locker_a_v01.glb
prop_checkpoint_course_map_a_v01.glb
prop_checkpoint_gate_terminal_a_v01.glb
```

---

## 10. Housing plan

| Home | District | Tier | Identity |
|---|---|---|---|
| Camp Bunk | Residential Camp | Basic | low-cost shared/camp style |
| Academy Dorm | Campus | Basic/Special | student housing |
| Base Apartment | Commons edge | Mid | convenient everyday home |
| Canyon Cabin | Residential Trail | Mid | private and scenic |
| Coach's Loft | Academy edge | Special | training-room upgrade |
| Cliff Lodge Unit | Ridge | Premium | view and advanced-course access |
| Summit Home | Skyrail Ridge | Luxury | prestige property |

Town-specific upgrades:

- practice balance beam
- timing target wall
- trophy/medal shelf
- course map board
- zipline/cosmetic display
- recovery mat
- equipment storage

All homes provide spawn, rest, wardrobe, safe/storage, food, hygiene, and mail.

---

## 11. School: Momentum Academy

### Curriculum

| Subject | Skill | Gameplay use |
|---|---|---|
| Jump Timing | timing | standard courses |
| Balance | precision | beams and narrow paths |
| Route Memory | memory/navigation | branching courses |
| Moving Platforms | prediction | tower courses |
| Hazard Rhythm | pattern reading | basin courses |
| Zipline Control | steering/timing | ridge courses |
| Course Safety | rules/rescue | jobs and consequence recovery |
| Course Design | logic/assembly | maintenance and builder jobs |
| Fitness/Recovery | stamina management | repeated runs |

Learning minigames:

| Minigame | Mechanic |
|---|---|
| Jump Window Drill | press/jump in timing zone |
| Balance Meter | maintain center while moving |
| Route Recall | repeat checkpoint order |
| Platform Prediction | choose where moving platform will arrive |
| Hazard Pattern | step on safe tiles in rhythm |
| Zipline Steering | pass training rings |
| Safety Inspection | identify broken/unsafe course part |
| Course Builder | assemble valid short route |

School jobs:

- coach assistant
- equipment clerk
- course tester
- cafeteria helper
- first-aid trainee
- beginner guide

---

## 12. Jobs

| Job | Location | Core gameplay |
|---|---|---|
| Course Marshal | Course gates | start runs, verify checkpoints, reset course |
| Checkpoint Attendant | routes | log racers and maintain checkpoint devices |
| Safety Crew | Ranger Station | rescue/reset NPCs and inspect hazards |
| Platform Maintenance Tech | Maintenance Yard | repair moving platforms and sensors |
| Course Builder Assistant | Academy/Yard | assemble/test route modules |
| Parkour Coach | Academy/Beginner Valley | demonstrate and teach patterns |
| Zipline Operator | Skyrail Ridge | launch riders and inspect line |
| Café Worker | Checkpoint Café | prepare/serve orders |
| Fuel Attendant | Checkpoint Fuel | fuel, gear, water, gate tasks |
| Course Photographer | finish zones | capture players at marked moments |
| Trail Cleanup Worker | courses/base | remove litter and reset props |
| Ranger Trainee | Safety Station | patrol restricted routes and assist visitors |
| Event Timer | Plaza | record tournament runs and verify results |
| Gear Shop Worker | TrailMart/Cosmetics | restock and match gear/cosmetics |

---

## 13. Minigames and activity loops

| Activity | Location | Category | Core loop |
|---|---|---|---|
| Beginner Obby | Beginner Valley | platform | checkpoint course |
| Time Trial | any course | speed/platform | beat target time |
| No-Fall Challenge | advanced course | platform | finish without reset |
| Moving Platform Sprint | Moving Towers | timing/platform | predict and jump |
| Hazard Tile Run | Hazard Basin | rhythm/platform | follow safe pattern |
| Zipline Rings | Skyrail | steering | pass through rings |
| Balance Beam Run | Academy/Cliffs | precision | maintain balance/path |
| Disappearing Path | Hazard Basin | memory | remember safe route |
| Tower Relay | Moving Towers | route | select fastest branch |
| Wall Route | Cliffside | movement | traverse wall/ledge sequence if controls support |
| Rescue Drill | Ranger Course | support | reach NPC and return |
| Course Builder | Academy | puzzle/assembly | create valid mini route |
| Checkpoint Repair | Maintenance | puzzle/timing | reconnect device |
| Tournament Circuit | multiple zones | event | aggregate course scores |

Difficulty tiers:

```txt
Green: beginner
Blue: intermediate
Violet: advanced
Gold: expert/event
```

---

## 14. Police, ranger, and local crime

### Authority model

- Canyon Rangers act as local police and safety authority
- course marshals handle rule violations first
- normal police-style response occurs at base settlement
- course violations usually produce disqualification, reset, pass suspension, or fine rather than chase

### Local crimes/risky actions

| Action | Consequence |
|---|---|
| Sabotage checkpoint | course ban, fine, repair task |
| Bypass locked course gate | reset and access suspension |
| Steal checkpoint pass | confiscation and heat |
| Enter staff rescue route | ranger warning/escalation |
| Damage moving platform | repair cost and course closure |
| Dangerous driving at base | ranger/police response |
| Steal maintenance vehicle/gear | standard wanted heat |
| Harass or block competitors | disqualification/reputation loss |
| Fake leaderboard result | event ban and score reset |
| Tamper with fuel/gate terminal | base heat and security response |

### Response density

- normal at residential/base roads
- faster at academy and course gates
- immediate reset authority inside active courses
- rescue priority overrides crime chase during active emergency

### Clearing trouble

- pay fine
- repair checkpoint/course part
- complete safety/community shift
- return stolen pass/gear
- attend Course Safety class
- wait out event/course suspension

---

## 15. Economy, shops, and services

### Shops/services

- TrailMart
- Checkpoint Café
- Canyon Cosmetics
- Checkpoint Fuel & Supply
- Canyon First Aid Clinic
- property office
- equipment rental
- course pass booth
- Momentum Academy
- Ranger Station

### Money sinks

- cosmetics and trails/effects
- course entry for special events
- checkpoint passes where balanced
- home upgrades
- gear storage
- recovery items/food
- premium ridge housing
- tournament registration

### Reward identity

- cash for jobs and standard completions
- cosmetic tokens/tickets for course mastery
- leaderboard/status records
- no paid shortcut should invalidate skill leaderboards

---

## 16. NPC population and routines

Profiles:

```txt
student
coach
course_marshal
ranger
rescue_worker
maintenance_tech
competitor
beginner_visitor
spectator
cafe_worker
fuel_attendant
resident
shop_vendor
photographer
event_host
```

Daily rhythm:

- morning: academy classes, maintenance inspections
- midday: casual visitors and beginner courses
- afternoon: busiest course activity
- evening: tournaments, plaza events, lit courses
- night: limited courses, maintenance, quiet housing

---

## 17. Asset families

### A. Hero architecture

```txt
building_momentum_academy_exterior_v01.glb
building_canyon_ranger_station_exterior_v01.glb
building_checkpoint_fuel_supply_exterior_v01.glb
building_checkpoint_cafe_exterior_v01.glb
building_trailmart_exterior_v01.glb
building_canyon_cosmetics_exterior_v01.glb
building_canyon_firstaid_clinic_exterior_v01.glb
building_course_select_pavilion_exterior_v01.glb
building_canyon_maintenance_yard_exterior_v01.glb
building_canyon_base_apartments_exterior_v01.glb
building_canyon_cabin_a_v01.glb
building_summit_lodge_exterior_v01.glb
```

### B. Canyon terrain/course architecture

```txt
arch_canyon_cliff_wall_a_v01.glb
arch_canyon_ledge_a_v01.glb
arch_course_platform_static_a_v01.glb
arch_course_platform_moving_a_v01.glb
arch_course_platform_rotating_a_v01.glb
arch_course_balance_beam_a_v01.glb
arch_course_rope_bridge_a_v01.glb
arch_course_tower_module_a_v01.glb
arch_course_zipline_tower_a_v01.glb
arch_course_finish_pavilion_a_v01.glb
arch_course_checkpoint_base_a_v01.glb
arch_course_safety_net_a_v01.glb
```

### C. Course props

```txt
prop_course_checkpoint_beam_a_v01.glb
prop_course_ring_checkpoint_a_v01.glb
prop_course_timer_gate_a_v01.glb
prop_course_arrow_sign_a_v01.glb
prop_course_difficulty_sign_a_v01.glb
prop_course_hazard_tile_a_v01.glb
prop_course_disappearing_tile_a_v01.glb
prop_course_swing_bar_a_v01.glb
prop_course_zipline_handle_a_v01.glb
prop_course_wind_flag_a_v01.glb
prop_course_reset_beacon_a_v01.glb
prop_course_leaderboard_a_v01.glb
```

### D. Base camp/street

```txt
road_canyon_approach_a_v01.glb
road_canyon_base_loop_a_v01.glb
prop_canyon_streetlight_a_v01.glb
prop_canyon_shade_canopy_a_v01.glb
prop_canyon_bench_a_v01.glb
prop_canyon_water_station_a_v01.glb
prop_canyon_wayfinding_sign_a_v01.glb
prop_canyon_vehicle_gate_a_v01.glb
prop_canyon_trash_bin_a_v01.glb
prop_canyon_rescue_bell_a_v01.glb
```

### E. Academy/maintenance

```txt
prop_academy_balance_trainer_a_v01.glb
prop_academy_timing_pad_a_v01.glb
prop_academy_route_board_a_v01.glb
prop_academy_course_builder_table_a_v01.glb
prop_maintenance_platform_parts_a_v01.glb
prop_maintenance_tool_cart_a_v01.glb
prop_checkpoint_control_console_a_v01.glb
prop_rescue_gear_rack_a_v01.glb
prop_rescue_stretcher_cart_a_v01.glb
```

### F. Housing

```txt
furniture_canyon_bunk_a_v01.glb
furniture_canyon_cabin_bed_a_v01.glb
furniture_canyon_sofa_a_v01.glb
prop_home_balance_beam_a_v01.glb
prop_home_trophy_shelf_a_v01.glb
prop_home_course_map_a_v01.glb
prop_home_equipment_rack_a_v01.glb
prop_home_recovery_mat_a_v01.glb
```

### G. Ranger/clinic

```txt
prop_ranger_front_desk_a_v01.glb
prop_ranger_checkpoint_monitor_a_v01.glb
prop_ranger_evidence_locker_a_v01.glb
prop_ranger_holding_room_a_v01.glb
prop_clinic_recovery_bed_canyon_a_v01.glb
prop_clinic_firstaid_cabinet_canyon_a_v01.glb
```

### H. Minigame UI

```txt
ui_icon_obby_checkpoint.svg
ui_icon_obby_timer.svg
ui_icon_obby_nofall.svg
ui_icon_obby_zipline.svg
ui_icon_obby_hazard.svg
ui_icon_obby_rescue.svg
ui_meter_obby_course_progress.svg
ui_meter_obby_balance.svg
ui_panel_obby_results.svg
ui_panel_obby_leaderboard.svg
```

---

## 18. First build sprint

### Obby Canyon Sprint 001: Course Readability Pack

```txt
1. arch_course_platform_static_a_v01.glb
2. arch_course_platform_moving_a_v01.glb
3. arch_course_balance_beam_a_v01.glb
4. arch_course_checkpoint_base_a_v01.glb
5. prop_course_checkpoint_beam_a_v01.glb
6. prop_course_timer_gate_a_v01.glb
7. prop_course_arrow_sign_a_v01.glb
8. prop_course_difficulty_sign_a_v01.glb
9. prop_course_hazard_tile_a_v01.glb
10. prop_course_reset_beacon_a_v01.glb
11. prop_canyon_vehicle_gate_a_v01.glb
12. prop_canyon_water_station_a_v01.glb
13. furniture_canyon_cabin_bed_a_v01.glb
14. prop_checkpoint_fuel_pump_a_v01.glb
15. ui_icon_obby_checkpoint.svg
16. ui_icon_obby_timer.svg
```

---

## 19. Production phases

### Phase 1: Movement prototype

Static platforms, checkpoint, fall reset, finish, course state.

### Phase 2: Base settlement

Arrival road, fuel, commons, academy, ranger, clinic, housing.

### Phase 3: Beginner Valley

Full beginner course, spectator path, jobs/tutorials.

### Phase 4: Advanced course systems

Moving platforms, hazard tiles, ziplines, no-fall tracking.

### Phase 5: School/jobs/crime

Academy lessons, marshal/maintenance/rescue jobs, ranger consequences.

### Phase 6: Housing/economy/events

Homes, cosmetics, tournaments, leaderboards, premium ridge.

### Phase 7: Polish/testing

Collision regression, checkpoint safety, camera readability, mobile/performance testing, accessibility cues.

---

## 20. Agent handoff checklist

```txt
Town: Obby Canyon
Layer: base settlement or course zone
District/course:
Difficulty tier:
Course start/finish:
Ordered checkpoints:
Fall/reset volume:
Respawn position/facing:
Vehicle access allowed? usually no inside courses
Asset/landmark:
Moving/static/hazard:
Collision validation:
Ranger/safety relevance:
Job/minigame hook:
Interactable handler ready:
Palette: sandstone + controlled coral/lime/violet + checkpoint cyan
Accessibility: color plus symbol/shape
Fallback:
Performance target:
```

---

## 21. Completion checklist

Obby Canyon is not complete until the player can:

- arrive, park, refuel, eat, heal, shop, and choose a home
- attend Momentum Academy
- understand difficulty colors/symbols
- complete a beginner course with reliable checkpoints
- attempt moving, hazard, zipline, and no-fall activities
- work at least five canyon-specific jobs
- use ranger/safety services and clear local consequences
- buy multiple housing tiers
- live at base without Starter Town support
- enter no course with a fake prompt, broken checkpoint, or unclear route
- revisit for tournaments, records, cosmetics, housing, coaching, and mastery

Final identity:

```txt
Obby Canyon is a town built around movement.
The base sustains life. The canyon sustains challenge.
```