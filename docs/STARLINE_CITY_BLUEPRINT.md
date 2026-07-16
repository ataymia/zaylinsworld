# Starline City Blueprint

Status: planning blueprint, not runtime code  
Alias: Hollywood / Fame Town  
Scope: city layout, districts, roads, civic systems, housing, school, police, jobs, minigames, economy, assets, and build phases  
Project: Zaylin's Kid World, also called ZTA

**Starline City** is the official working name for the Hollywood/Fame town. It is ZTA's performance, media, style, reputation, and celebrity-economy city. The player should be able to arrive as an unknown background extra, attend performing-arts school, work ordinary production jobs, build skills, buy a home, gain fame, lose reputation, recover from scandal, and eventually headline major stages.

Starline City must be glamorous from the front and practical behind the curtain. Premiere Boulevard shows lights, theaters, billboards, and crowds. Backlot roads reveal loading docks, costume storage, prop warehouses, rehearsal rooms, studio trailers, and ordinary workers keeping the illusion alive.

---

## 1. Design north star

Starline City should feel:

```txt
cinematic
sunset-lit
glamorous
busy
performance-driven
music-forward
fashion-forward
studio-industrial behind the scenes
warm gold + magenta nightlife
red carpets + black stage equipment
aspirational without becoming adult or cruel
```

Avoid:

```txt
copying real Hollywood landmarks or brands
one endless red carpet
empty celebrity mansions with no gameplay
adult nightclub framing
paparazzi harassment played as realistic abuse
random luxury without ordinary jobs and housing
making fame the only way to succeed
```

Core fantasy:

```txt
Arrive unknown. Learn a craft. Work the backlot. Build a look. Earn a reputation.
Choose whether to become a performer, creator, stylist, technician, business owner,
or simply live a normal life in a city built around entertainment.
```

---

## 2. Visual identity

### Palette

| Use | Color direction |
|---|---|
| Sky/sunset | peach, apricot, violet dusk |
| Streets | charcoal asphalt, warm concrete |
| Primary accent | marquee gold |
| Secondary accent | magenta and deep plum |
| Event accent | red-carpet crimson |
| Studio utility | matte black, steel gray, safety yellow |
| Residential | cream stucco, dusty rose, muted sage |
| Police/security | navy, white, amber warning lights |

Suggested hexadecimal palette:

```txt
sky_day:       #f3b58f
sky_dusk:      #7b4c87
road:          #363238
sidewalk:      #a5968d
marquee_gold:  #f2c45f
magenta:       #d84a9b
plum:          #38233f
carpet_red:    #a8263d
studio_black:  #17181d
housing_cream: #d8c7aa
sage:          #7f9a82
```

### Materials

- warm stucco
- tinted theater glass
- brushed brass marquee trim
- black truss and stage steel
- painted plywood/set-wall textures
- velvet and carpet in premium interiors
- polished terrazzo in theaters and agencies
- concrete and corrugated metal in backlot/service zones

### Lighting

- golden-hour bias during daytime
- visible spotlights after dusk
- marquee bulbs and sign chasers
- soft studio floodlights in backlots
- warmer residential lighting away from downtown
- no rainbow neon soup; magenta and gold dominate

### Soundscape

- distant crowd cheers around event venues
- rehearsal music leaking from studios
- camera shutters in event zones
- rolling equipment carts and stage calls in backlots
- traffic and shuttle announcements downtown
- calmer birds/wind in residential hills

### Weather

- mostly clear and warm
- occasional marine haze/fog from the coastal direction
- rare light rain that makes marquees and roads reflective
- wind gusts in hillside and rooftop zones

---

## 3. World role and connections

Current macro-world plan places Hollywood/Fame beyond Casino Strip through a special strip/boulevard connection.

```txt
Casino Strip -> Studio Boulevard -> Starline City
```

Recommended world-space identity:

```txt
Existing reserved origin: x 0, z -1800
Primary gateway: south/east end of Studio Boulevard from Casino Strip
Secondary future gateway: scenic hill road toward Rich Hills or coast, only if world map expands
```

Arrival sequence:

1. Player leaves the Casino Strip's neon entertainment road.
2. Road lighting shifts from casino neon to gold/magenta marquees.
3. First visible landmark is the Starline Studios water-tower-style silhouette or studio gate.
4. Boulevard opens into Premiere Plaza with theater, talent agency, transit stop, and billboards.
5. Backlot roads and residential hills become visible beyond the glamour frontage.

---

## 4. Macro layout

```txt
                              NORTH / SPOTLIGHT HILLS

                    [Premium Homes]---[Scenic Overlook]
                           |                  |
                    [Starline Clinic]---[Hill Patrol Post]
                           |
 WEST / BACKLOT EDGE       |            EAST / MUSIC & GLAM

 [Production Yard]---[Starline Studios]---[Rhythm Row]
        |                  |                  |
 [Prop Warehouse]---[Premiere Boulevard]---[Glam Quarter]
        |                  |                  |
 [StarStop Fuel]----[Premiere Plaza]----[Encore Music Hall]
                           |
                 [Performing Arts Campus]
                           |
                 SOUTH GATE TO CASINO STRIP
```

The city should be walkable in the core, drivable across districts, and layered enough that glamorous frontages hide functioning service roads.

---

## 5. District breakdown

## A. Premiere Boulevard and Plaza

Purpose: public face of the city and first-arrival hub.

Contains:

- Red Carpet Theater
- Spotlight Talent Agency
- FameLine Transit Station
- premiere plaza/fountain
- public billboards
- café and restaurants
- city hall/media permits office
- street performers
- tourism kiosk

Gameplay:

- auditions and agency introductions
- red-carpet events
- talk-show and theater missions
- tourist photo jobs
- delivery and usher jobs
- public reputation events

Layout rules:

- boulevard is wide, straight, and visually ceremonial
- one major signalized intersection at Premiere Plaza
- broad sidewalks and controlled crosswalks
- event drop-off lane in front of theater
- no random parking directly on red-carpet frontage
- service access happens behind buildings

Visual anchors:

- gold marquee arch
- moving billboard panels
- red carpet canopy
- statue/award sculpture in plaza

## B. Starline Studios and Backlot

Purpose: production gameplay, ordinary work, controlled restricted zones, and film/TV minigames.

Contains:

- studio gate/security booth
- sound stages A, B, and C
- outdoor set street
- talk-show stage
- production offices
- costume warehouse
- prop warehouse
- stunt/rehearsal yard
- catering dock
- trailer row
- equipment rental shed

Gameplay:

- background-extra work
- hit-your-mark scene minigame
- stagehand cue jobs
- prop delivery
- costume tracking
- stunt timing
- restricted-set trespass/crime hooks

Layout rules:

- public studio tour path separated from active production area
- backlot service loop supports trucks and carts
- sound stages use large footprints and loading doors
- clear security checkpoints
- outdoor set façades can be decorative fronts with service backs

## C. Rhythm Row

Purpose: music, dance, rehearsal, performance, and nightlife that remains kid-safe.

Contains:

- Encore Music Hall
- recording studio
- dance academy/rehearsal loft
- instrument shop
- open-air performance plaza
- music rehearsal rooms
- radio/podcast booth
- late-night diner

Gameplay:

- rhythm audition
- dance battle
- music mix
- instrument practice
- stage setup
- radio interview timing

Road character:

- narrower entertainment street
- loading zones behind venues
- pedestrian-heavy evenings
- colored pavement markers leading between music venues

## D. Glam Quarter

Purpose: fashion, beauty, wardrobe, photography, and player customization.

Contains:

- GlamLab Salon
- Wardrobe Works flagship
- photo studio
- makeup academy
- costume rental
- accessory boutique
- fashion runway/event hall
- laundromat/dry-cleaning service for production costumes

Gameplay:

- salon assistant
- outfit styling challenge
- photo-pose minigame
- costume sorting
- runway timing
- cosmetic purchases

Visual character:

- mirrored storefronts
- gold/plum trim
- window displays
- street banners
- softer pedestrian-scale lighting

## E. Performing Arts Campus

Purpose: Starline City's school and skill-development district.

Contains:

- Premiere Arts Academy
- acting classrooms
- dance studios
- music rooms
- film/media lab
- costume/fashion classroom
- small black-box theater
- cafeteria
- library/script archive
- student dorms
- recreation gym

Gameplay:

- classes and learning minigames
- student performances
- tutoring jobs
- club auditions
- school event missions

Safety layout:

- school-zone speed limit
- raised crosswalks
- bus/shuttle loop
- campus pedestrian paths
- police/security response faster for reckless driving nearby

## F. Backlot Commons and Worker Housing

Purpose: affordable housing and everyday community supporting studio workers.

Contains:

- studio apartments
- trailer-style homes
- small duplexes
- grocery/convenience store
- community park
- basketball court or recreation lot
- daycare/community center
- laundromat
- bus stop

Gameplay:

- affordable home ownership/rent
- neighborhood errands
- community jobs
- normal life away from fame economy

## G. Spotlight Hills

Purpose: premium housing, scenic roads, celebrity/status property, and stricter security.

Contains:

- hillside homes
- gated premium lots
- scenic overlook
- private rehearsal room property
- small luxury market
- Starline Clinic
- hill patrol/security post

Road character:

- curved switchback roads
- fewer sidewalks on upper residential roads
- overlooks and retaining walls
- lower normal traffic, faster security response
- driveway gates and property boundaries must be readable

## H. Production and Utility Edge

Purpose: logistics, sanitation, power, fuel, storage, and less glamorous city operations.

Contains:

- StarStop Fuel & Charge
- production vehicle depot
- sanitation yard
- power/substation dressing
- prop fabrication workshop
- delivery warehouse
- tow/repair garage
- police impound/service lot

Gameplay:

- fuel attendant
- prop fabrication
- sanitation routes
- production truck delivery
- vehicle repair
- stolen prop resale hooks

---

## 6. Road and transportation plan

### Road hierarchy

| Road | Tier | Function |
|---|---|---|
| Premiere Boulevard | main/special | ceremonial city spine, theater and plaza |
| Studio Boulevard | main | connection from Casino Strip and studio gate |
| Starline Loop | main/local | circulates around central districts |
| Backlot Service Road | service | trucks, stage carts, prop deliveries |
| Rhythm Row | special/local | pedestrian-heavy music street |
| Glam Avenue | local/commercial | salon, wardrobe, photography |
| Academy Way | local/school | school and dorm access |
| Spotlight Drive | curved local | hillside housing |
| Utility Lane | service | fuel, sanitation, production depot |
| Red Carpet Walk | pedestrian | theater/event frontage only |

### Intersections

- Premiere Boulevard x Studio Boulevard: full traffic light and signature arch
- Premiere Boulevard x Glam Avenue: traffic light with broad crosswalks
- Starline Loop x Academy Way: traffic light/school zone
- Backlot gates: stop/yield controls and security booths
- Spotlight Drive: stop signs and roundabout at lower hill entrance
- Utility Lane: stop signs and truck warning markings

### Transit

- FameLine Transit Station as fast-travel node
- studio shuttle loop linking station, academy, backlot, and hills base
- marked taxi/rideshare/event pickup lanes
- future tour bus route
- player-owned car remains fully supported

### Parking

- theater event garage
- studio employee lot
- academy parking and bus loop
- music venue loading/limited parking
- residential curb/driveway parking
- hillside private garages
- fuel station short-term parking

### Pedestrian circulation

- highest density: Premiere Plaza, Rhythm Row, Glam Quarter
- moderate density: campus and studio tour path
- low density: utility edge and upper hills
- backstage restricted paths should never be mistaken for public sidewalks

---

## 7. Civic infrastructure

### Police/security

- Starline Police Department main precinct
- venue security substations at theater and studio gate
- hill patrol post for Spotlight Hills
- event barriers and crowd-control assets
- camera coverage at studios and red-carpet zones

### Health

- Starline Clinic for normal recovery
- small studio first-aid room
- school nurse office

### Fuel/charging

- StarStop Fuel & Charge at utility/backlot edge
- normal gas pumps, EV chargers, production-van service bay
- convenience store and package pickup

### Fire/emergency

- compact fire/rescue station near production edge
- studio fire lane markings
- emergency exits on sound stages and theaters

### Sanitation

- sanitation yard
- dumpsters behind venues/restaurants
- recycling props for sets/costumes
- street-cleaning job after events

### Public recreation

- Premiere Plaza
- Backlot Commons Park
- Academy recreation court
- Spotlight scenic overlook

---

## 8. Hero landmarks

| Landmark | District | Purpose |
|---|---|---|
| Starline Studios | Backlot | film/TV production and major jobs |
| Red Carpet Theater | Premiere Boulevard | premieres, talk-show/events, reputation |
| Spotlight Talent Agency | Premiere Plaza | auditions, career progression |
| Premiere Arts Academy | Campus | school and performing-arts learning |
| Encore Music Hall | Rhythm Row | music/dance performances |
| GlamLab Salon | Glam Quarter | beauty/customization and salon job |
| Wardrobe Works | Glam Quarter | outfits, costumes, styling jobs |
| FameLine Transit Station | Premiere Plaza | fast travel and transit jobs |
| Starline Police Department | Civic edge | heat clearing and law services |
| Starline Clinic | Spotlight Hills base | recovery and clinic work |
| PulseStage Fitness | Campus/Commons | dance conditioning and gym support |
| StarStop Fuel & Charge | Utility Edge | fuel, charging, snacks, job hub |
| Backlot Commons Apartments | Worker Housing | affordable homes |
| Spotlight Hills Estates | Hills | premium homes |
| Broadcast House | Rhythm/Premiere edge | radio, podcast, talk-show production |
| Production Depot | Utility Edge | trucks, props, sanitation/logistics |

---

## 9. StarStop Fuel & Charge

Starline City needs a fuel station that serves ordinary residents and production vehicles.

### Exterior

```txt
- warm black canopy with marquee-gold edge bulbs
- 3 normal pump islands
- 2 EV charge bays
- 1 production-van service lane
- 5 short-term store parking spaces
- digital fuel/charge sign
- small convenience store called StarStop Market
- package/prop locker wall
- car-wash/detail bay suitable for production vehicles
```

### Gameplay

| Loop | Description |
|---|---|
| Fuel Attendant Shift | assign NPC cars/vans to pump or charger |
| Production Van Check | match fuel, tire, and prop-delivery checklist |
| Detail for Camera | clean/polish a vehicle before a shoot |
| Snack Restock | restock drinks and celebrity-themed fictional snacks |
| Locker Sort | route packages to studio, academy, or hills |
| Crime Hook | steal prop shipment, tamper with pump, take production pass |

### Assets

```txt
building_starstop_fuel_exterior_v01.glb
building_starstop_market_shell_v01.glb
prop_starstop_canopy_marquee_v01.glb
prop_starstop_fuel_pump_a_v01.glb
prop_starstop_ev_charger_a_v01.glb
prop_starstop_price_sign_digital_v01.glb
prop_starstop_production_van_bay_v01.glb
prop_starstop_detail_station_v01.glb
prop_starstop_package_locker_v01.glb
prop_starstop_snack_shelf_a_v01.glb
prop_starstop_drink_cooler_a_v01.glb
```

---

## 10. Housing plan

| Home | District | Tier | Identity |
|---|---|---|---|
| Backlot Studio Apartment | Commons | Basic | affordable worker home |
| Academy Dorm Room | Campus | Basic/Special | student housing near classes |
| Trailer Row Unit | Backlot | Basic/Special | production-life flavor |
| Glam Quarter Loft | Glam Quarter | Mid | fashion/photo access |
| Rhythm Row Apartment | Music district | Mid | nightlife/music proximity |
| Premiere Condo | Downtown | Premium | city-center status |
| Spotlight Hills House | Hills | Premium | gated property and scenic view |
| Starline Penthouse | Premiere Boulevard | Luxury | top-tier status home |

All homes require:

- spawn selection
- rest/sleep
- wardrobe
- safe/storage
- kitchen/food station
- bathroom/hygiene station
- mail/messages
- property upgrade hooks

Town-specific home upgrades:

- rehearsal mirror
- recording booth
- wardrobe wall
- photo backdrop
- mini editing station
- rooftop screening area

---

## 11. School: Premiere Arts Academy

### Curriculum

| Department | Skills | Gameplay benefit |
|---|---|---|
| Acting | timing, expression, script memory | auditions and scene work |
| Dance | rhythm, stamina, coordination | dance battles and stage jobs |
| Music | beat matching, melody memory, mixing | performances and recording jobs |
| Film/Media | camera framing, editing order, cue timing | production jobs |
| Fashion/Costume | color/style matching, inventory | wardrobe and runway jobs |
| Stagecraft | lighting, props, safety cues | stagehand and theater work |
| Business/Agency | scheduling, negotiation, reputation | contracts and sponsorships |

### Learning minigames

| Minigame | Mechanic | Reward |
|---|---|---|
| Script Memory | remember dialogue sequence | acting skill |
| Hit Your Mark | move to floor marks on cue | stage skill |
| Rhythm Basics | beat timing | music/dance skill |
| Camera Framing | place subjects within frame | film skill |
| Costume Match | build outfit from scene brief | fashion skill |
| Light Board Lesson | trigger lights in correct order | stagecraft skill |
| Audition Etiquette | choose professional responses | reputation/agency unlock |

### School jobs

- teacher's aide
- cafeteria helper
- costume-room organizer
- rehearsal accompanist
- stage setup crew
- student tour guide

### School assets

```txt
building_premiere_arts_academy_exterior_v01.glb
prop_academy_marquee_sign_v01.glb
furniture_acting_class_chair_a_v01.glb
prop_stage_mark_floor_a_v01.glb
prop_script_binder_a_v01.glb
prop_dance_mirror_wall_a_v01.glb
prop_dance_barre_a_v01.glb
prop_music_keyboard_school_a_v01.glb
prop_drum_practice_pad_a_v01.glb
prop_camera_training_rig_a_v01.glb
prop_editing_station_school_a_v01.glb
prop_costume_rack_school_a_v01.glb
prop_light_board_training_a_v01.glb
prop_blackbox_stage_a_v01.glb
```

---

## 12. Jobs

| Job | Location | Core gameplay |
|---|---|---|
| Background Extra | Starline Studios | hit marks, react on cue, wardrobe check |
| Stagehand | Theater/Music Hall | move props, trigger cues, clear stage |
| Production Runner | Backlot | timed deliveries between stages/trailers |
| Wardrobe Runner | Glam Quarter/Studio | match costumes to performers |
| Salon Assistant | GlamLab | style/color matching and station cleanup |
| Music Studio Intern | Broadcast House | layer tracks, label clips, deliver files |
| Theater Usher | Red Carpet Theater | seat guests, scan tickets, manage rows |
| Talent Agency Assistant | Spotlight Agency | schedule auditions and route clients |
| Camera Assistant | Studio | frame setup, battery/lens matching |
| Set Builder | Production Yard | assemble modular scenery |
| StarStop Attendant | Fuel station | fuel, detail, package sorting |
| Clinic Assistant | Starline Clinic | check-ins and room matching |
| Venue Security Monitor | Theater/Studio | identify access violations |
| Street Cleanup Crew | Premiere Plaza | post-event sanitation |
| Tour Guide | Studio tour path | guide NPC groups through checkpoints |

Pay identity:

- entry jobs pay low/medium but build skills
- technical jobs pay medium/high
- successful performance jobs vary by score and reputation
- fame never replaces cash; both systems coexist

---

## 13. Minigames and activity loops

| Minigame | Location | Category | Core loop |
|---|---|---|---|
| Rhythm Audition | Academy/Studio | rhythm | hit beats and performance cues |
| Dance Battle | Rhythm Row | rhythm | combo against NPC rival |
| Talk Show Timing | Broadcast House | timing | answer/gesture on cue |
| Photo Shoot Pose | Glam Quarter | timing/memory | match poses before flash |
| Red Carpet Walk | Theater | route/timing | walk, stop, wave, pose |
| Music Studio Mix | Recording Studio | puzzle/rhythm | arrange stems in correct sequence |
| Script Memory | Academy/Studio | memory | repeat lines/actions |
| Scene Hit Marks | Sound Stage | movement/timing | reach marks and emote on cue |
| Wardrobe Styling | Wardrobe Works | sorting/style | satisfy scene brief |
| Stage Cue Control | Theater | sequence | trigger lights, curtains, sounds |
| Stunt Rehearsal | Stunt Yard | movement/timing | dodge/jump/land safely |
| Camera Framing | Studio | puzzle | frame moving subject |
| Set Build Sprint | Production Yard | assembly | place modular pieces correctly |
| Interview Practice | Talent Agency | dialogue/timing | choose answers and manage reputation |

---

## 14. Police, security, and crime

### Law structure

- Starline Police Department handles citywide wanted level
- venue security handles theater/music events first
- studio security handles backlot trespass and theft
- hill patrol/private security responds faster in Spotlight Hills
- school safety officers cover academy zone

### Local crimes

| Action | Consequence |
|---|---|
| Enter restricted set | warning, removal, escalating heat |
| Steal costume/prop | studio ban, evidence confiscation, wanted level |
| Fake event pass | venue ban and security escort |
| Crash a live production | reputation loss plus security response |
| Steal celebrity/luxury car | tracker response and faster patrols |
| Vandalize billboard/set | repair fine or community job |
| Trespass at hillside property | rapid private-security response |
| Harass performers/NPCs | reputation loss and removal from venue |
| Sabotage stage equipment | high heat, venue shutdown consequence |

### Scandal/reputation layer

Local fame/reputation should supplement, not replace, wanted heat.

```txt
Police heat = legal trouble.
Scandal = public/industry trust trouble.
Venue bans = location-specific access trouble.
```

### Clearing trouble

- pay legal fine
- return stolen property
- repair damaged set/equipment
- perform community cleanup
- complete agency reputation-recovery task
- wait out venue ban
- take academy professionalism class

---

## 15. Economy, shops, and services

### Shops/services

- Wardrobe Works
- GlamLab Salon
- Encore Instruments
- StarStop Market
- studio prop resale shop
- camera/equipment store
- ordinary grocery in Backlot Commons
- Pixel Premiere Café
- late-night Rhythm Diner
- Starline Clinic
- PulseStage Fitness
- talent agency
- property office

### Money sinks

- outfits and costumes
- salon styles
- instruments
- recording booth rental
- home upgrades
- premium event tickets
- vehicle detailing
- agency fees/classes
- property in Spotlight Hills

### Local currencies/reputation

- global cash remains primary
- Fame is a local progression/reputation value
- event tickets can be limited-use reward items
- no confusing stack of multiple permanent currencies

---

## 16. NPC population and routines

NPC profiles:

```txt
performer
background_extra
student
teacher
agent
producer
director
stagehand
camera_operator
wardrobe_worker
salon_worker
musician
dancer
security_guard
police_officer
tourist
resident
production_driver
street_performer
clinic_worker
```

Daily rhythm:

- morning: students, workers, commuters, deliveries
- afternoon: studio production, rehearsals, tours
- evening: theaters, concerts, restaurants, plaza crowds
- late night: reduced public crowd, active service crews, venue exits
- hills remain calmer throughout day

Social hubs:

- Premiere Plaza
- academy cafeteria
- Rhythm Row plaza
- Backlot Commons Park
- theater lobby
- studio commissary

---

## 17. Asset families

### A. Hero architecture

```txt
building_starline_studios_gate_exterior_v01.glb
building_starline_soundstage_a_exterior_v01.glb
building_red_carpet_theater_exterior_v01.glb
building_spotlight_talent_agency_exterior_v01.glb
building_premiere_arts_academy_exterior_v01.glb
building_encore_music_hall_exterior_v01.glb
building_glamlab_salon_exterior_v01.glb
building_wardrobe_works_exterior_v01.glb
building_fameline_transit_station_exterior_v01.glb
building_starline_police_precinct_exterior_v01.glb
building_starline_clinic_exterior_v01.glb
building_pulsestage_fitness_exterior_v01.glb
building_starstop_fuel_exterior_v01.glb
building_backlot_commons_apartments_exterior_v01.glb
building_spotlight_hills_house_a_v01.glb
building_broadcast_house_exterior_v01.glb
building_production_depot_exterior_v01.glb
```

### B. Modular architecture

```txt
arch_starline_stucco_wall_a_v01.glb
arch_starline_theater_facade_a_v01.glb
arch_starline_marquee_trim_a_v01.glb
arch_starline_storefront_glass_a_v01.glb
arch_starline_backlot_wall_a_v01.glb
arch_starline_soundstage_door_a_v01.glb
arch_starline_trailer_module_a_v01.glb
arch_starline_hills_balcony_a_v01.glb
arch_starline_retaining_wall_a_v01.glb
arch_starline_service_loading_dock_a_v01.glb
```

### C. Roads and street props

```txt
road_starline_premiere_straight_a_v01.glb
road_starline_spotlight_curve_a_v01.glb
sidewalk_starline_premiere_a_v01.glb
crosswalk_starline_marquee_a_v01.glb
prop_starline_streetlight_gold_a_v01.glb
prop_starline_marquee_billboard_a_v01.glb
prop_starline_bus_shelter_a_v01.glb
prop_starline_red_carpet_barrier_a_v01.glb
prop_starline_wayfinding_sign_a_v01.glb
prop_starline_bench_a_v01.glb
prop_starline_planter_a_v01.glb
prop_starline_trash_can_a_v01.glb
prop_starline_event_bollard_a_v01.glb
prop_starline_spotlight_tower_a_v01.glb
```

### D. Studio/backlot

```txt
prop_studio_camera_tripod_a_v01.glb
prop_studio_camera_dolly_a_v01.glb
prop_studio_light_stand_a_v01.glb
prop_studio_boom_mic_a_v01.glb
prop_studio_director_chair_a_v01.glb
prop_studio_clapperboard_a_v01.glb
prop_studio_floor_mark_a_v01.glb
prop_studio_prop_crate_a_v01.glb
prop_studio_costume_rack_a_v01.glb
prop_studio_makeup_mirror_a_v01.glb
prop_studio_catering_table_a_v01.glb
prop_studio_equipment_cart_a_v01.glb
prop_studio_set_wall_modular_a_v01.glb
prop_studio_trailer_a_v01.glb
```

### E. Music/dance/theater

```txt
prop_music_stage_platform_a_v01.glb
prop_music_microphone_stand_a_v01.glb
prop_music_speaker_stack_a_v01.glb
prop_music_keyboard_a_v01.glb
prop_music_drumkit_a_v01.glb
prop_music_mixing_console_a_v01.glb
prop_dance_mirror_wall_a_v01.glb
prop_dance_barre_a_v01.glb
prop_theater_ticket_scanner_a_v01.glb
prop_theater_seat_a_v01.glb
prop_theater_curtain_a_v01.glb
prop_theater_light_board_a_v01.glb
```

### F. Glam/fashion/photo

```txt
furniture_glamlab_salon_chair_a_v01.glb
prop_glamlab_mirror_station_a_v01.glb
prop_glamlab_hair_tool_cart_a_v01.glb
prop_wardrobe_clothing_rack_a_v01.glb
prop_wardrobe_shoe_wall_a_v01.glb
prop_wardrobe_costume_bin_a_v01.glb
prop_photo_backdrop_a_v01.glb
prop_photo_softbox_a_v01.glb
prop_photo_pose_marker_a_v01.glb
prop_runway_platform_a_v01.glb
```

### G. Residential

```txt
furniture_starline_apartment_bed_a_v01.glb
furniture_starline_sofa_a_v01.glb
furniture_starline_vanity_a_v01.glb
furniture_starline_recording_desk_a_v01.glb
furniture_starline_dining_set_a_v01.glb
prop_starline_home_wardrobe_wall_a_v01.glb
prop_starline_home_rehearsal_mirror_a_v01.glb
prop_starline_home_award_shelf_a_v01.glb
prop_starline_home_projector_a_v01.glb
```

### H. Police/security/clinic/gym

```txt
prop_starline_police_front_desk_a_v01.glb
prop_starline_security_monitor_wall_a_v01.glb
prop_starline_venue_scanner_gate_a_v01.glb
prop_starline_evidence_prop_locker_a_v01.glb
prop_starline_holding_cell_a_v01.glb
prop_starline_clinic_exam_bed_a_v01.glb
prop_starline_clinic_reception_a_v01.glb
equipment_pulsestage_treadmill_a_v01.glb
equipment_pulsestage_dance_cardio_pad_a_v01.glb
equipment_pulsestage_weight_bench_a_v01.glb
```

### I. Minigame UI

```txt
ui_icon_starline_fame.svg
ui_icon_starline_audition.svg
ui_icon_starline_dance.svg
ui_icon_starline_camera.svg
ui_icon_starline_wardrobe.svg
ui_icon_starline_stagecue.svg
ui_meter_starline_applause.svg
ui_meter_starline_reputation.svg
ui_panel_starline_audition.svg
```

---

## 18. First build sprint

### Starline Sprint 001: Style Anchor Pack

```txt
1. prop_starline_streetlight_gold_a_v01.glb
2. prop_starline_marquee_billboard_a_v01.glb
3. prop_starline_red_carpet_barrier_a_v01.glb
4. prop_studio_camera_tripod_a_v01.glb
5. prop_studio_light_stand_a_v01.glb
6. prop_studio_director_chair_a_v01.glb
7. prop_music_microphone_stand_a_v01.glb
8. prop_music_speaker_stack_a_v01.glb
9. furniture_glamlab_salon_chair_a_v01.glb
10. prop_wardrobe_clothing_rack_a_v01.glb
11. furniture_starline_apartment_bed_a_v01.glb
12. prop_starline_home_rehearsal_mirror_a_v01.glb
13. prop_starstop_fuel_pump_a_v01.glb
14. prop_starstop_ev_charger_a_v01.glb
15. ui_icon_starline_fame.svg
16. ui_icon_starline_audition.svg
```

The sprint proves boulevard, studio, music, glam, housing, and fuel identities before hero buildings are commissioned.

---

## 19. Production phases

### Phase 1: Style anchors

Streetlight, billboard, studio equipment, music equipment, salon chair, wardrobe rack, apartment set, fuel props.

### Phase 2: Map skeleton

Premiere Boulevard, Studio Boulevard, Starline Loop, Backlot Service Road, Academy Way, Spotlight Drive, district terrain, gateways.

### Phase 3: Hero exteriors

Starline Studios, theater, academy, music hall, talent agency, GlamLab, transit, precinct, apartments, StarStop.

### Phase 4: Core interiors

Academy, studio stage, theater, agency, salon, wardrobe, music studio, apartment, precinct, clinic, fuel market.

### Phase 5: Jobs and minigames

Background extra, rhythm audition, stage cues, wardrobe styling, photo pose, music mix, fuel shift.

### Phase 6: Reputation/crime/housing

Fame, scandal, venue bans, property purchase, primary residence, hill security response.

### Phase 7: Population and polish

NPC routines, evening crowds, event scheduling, billboard rotations, soundscape, optimization.

---

## 20. Agent handoff checklist

```txt
Town: Starline City
Planning alias: Hollywood / Fame Town
District:
Road connection:
Asset/landmark:
Public, restricted, or residential:
Gameplay purpose:
Job/minigame hook:
Police/security response:
Interior required:
Housing/support function:
Collision required:
Interactable handler ready:
Palette: charcoal, marquee gold, magenta, plum, carpet red, warm cream
Materials: stucco, brass, theater glass, black truss steel, velvet, concrete
Avoid: copied real brands/landmarks, adult nightlife framing, empty glamour
Fallback:
Performance target:
```

---

## 21. Completion checklist

Starline City is not complete until the player can:

- enter from Casino Strip through a clear gateway
- navigate every district by road and foot
- buy at least one basic and one premium home
- attend Premiere Arts Academy
- work at least four ordinary jobs
- play at least six distinct performance/production activities
- buy food, clothing, beauty services, fuel, and healthcare
- use transit and vehicle parking
- encounter studio/venue/hill security differences
- commit and resolve town-specific crimes
- gain and lose local reputation
- live there without needing Starter Town for basic survival
- revisit for auditions, performances, style, property, and technical work

Final identity:

```txt
Starter Town teaches ordinary life.
TechTown teaches systems.
Starline City teaches craft, presentation, and reputation.
```