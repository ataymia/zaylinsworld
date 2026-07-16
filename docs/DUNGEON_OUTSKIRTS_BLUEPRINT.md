# Dungeon Outskirts Blueprint

Status: planning blueprint, not runtime code  
Alias: Dungeon Town  
Scope: sparse surface settlement, underground dungeon world, roads, civic services, housing, academy, warden system, jobs, combat/loot loops, assets, and build phases  
Project: Zaylin's Kid World, also called ZTA

**Dungeon Outskirts** is ZTA's dungeon-crawler town. It must not resemble a normal city with fantasy paint. The surface is intentionally sparse: an arrival road, fuel/supply stop, academy, warden outpost, forge, potion shop, healer, shrine, housing, and one enormous dungeon gate. The underground is the real city-sized gameplay space.

The player drives into a quiet settlement, prepares for a run, descends through floors, fights cartoony monsters, solves rooms, finds loot, chooses whether to continue or return, then sells, stores, appraises, crafts, heals, upgrades, studies, and goes back down.

The structural reference is the town-to-dungeon loop of classic dungeon crawlers such as FATE, translated into ZTA's original kid-safe world and systems.

---

## 1. Design north star

Dungeon Outskirts should feel:

```txt
quiet above ground
vast below ground
mysterious, not horror-gory
weathered stone, wood, canvas, iron, moss, glowing runes
preparation -> descent -> risk -> loot -> return -> upgrade
cartoony danger with real consequences
```

Avoid:

```txt
busy city blocks on the surface
realistic gore or torture imagery
only one repeated gray room
random procedural corridors without landmarks or goals
punishing loss that deletes hours of progress
police chases inside dungeon floors
forcing combat on players who only want crafting, school, or support jobs
```

Core fantasy:

```txt
The town is the breath before the dive.
The dungeon is an expedition, not a hallway.
Every return to the surface should change what the player can attempt next.
```

---

## 2. Visual identity

### Surface palette

```txt
ground_dirt:     #4b443b
stone:           #55505a
moss:            #52664a
canvas:          #9b8767
wood:            #6e5037
iron:            #2b2c31
forge_orange:    #d77735
shrine_cyan:     #63c7c1
rune_violet:     #7557a6
warning_red:     #8e3f3f
```

### Dungeon palette by floor family

| Floor family | Colors | Mood |
|---|---|---|
| Old Stone Halls | gray, moss, torch amber | beginner ruins |
| Root Caverns | brown, green, bioluminescent cyan | natural tunnels |
| Forgotten Library | dusty blue, parchment, violet runes | puzzle-heavy |
| Crystal Depths | dark stone, blue/pink crystal | treasure and reflection |
| Forge Chasm | black rock, iron, orange heat | mechanical/trap-heavy |
| Royal Vault | dark purple, gold, red banners | boss/high-loot floors |

### Materials

- rough stone blocks
- packed dirt
- timber supports
- iron gates and chains
- canvas tents
- glowing rune planes
- crystal clusters
- moss and roots
- wooden chests and shelves
- blacksmith metal/coal

### Lighting

Surface:

- overcast or late-afternoon mood
- forge and shrine are major warm/cool anchors
- sparse lanterns, no bright city glow

Dungeon:

- strong local lighting hierarchy
- torches, crystals, fungus, rune lamps
- gameplay-critical doors/traps clearly lit
- darkness creates atmosphere, never hides required information

### Soundscape

- surface wind, forge hammer, distant creature call, shrine hum
- dungeon footsteps, room ambience, trap mechanisms, creature sounds
- safe rooms noticeably calmer
- boss gates use distinct warning audio

---

## 3. World role and connections

Reserved origin:

```txt
Dungeon Outskirts: x 1400, z -600
West connection: dirt/back road from TechTown Utility Edge
South/north trail connection: Obby Canyon
```

Arrival sequence:

1. TechTown infrastructure fades into rough service road.
2. Road lighting disappears and terrain becomes rocky/dry.
3. Wayfarer Fuel & Supply appears at settlement edge.
4. Forge glow and shrine light guide the player inward.
5. Dungeon Gate dominates the horizon beyond a nearly empty commons.

Map structure:

```txt
Surface district = persistent open-world town.
Dungeon instance/layer = separate generated or assembled floor world.
Player vehicle remains on surface.
Dungeon entry stores surface return position and switches rule set.
```

---

## 4. Surface macro layout

```txt
                         NORTH / RUIN RIDGE

                 [Warden Watch]---[Sealed Ruins]
                         |               |
 [Cabin Trail]---[Outpost Commons]---[Dungeon Gate]
       |                 |               |
 [Housing]----[Guild & Academy]----[Shrine Court]
       |                 |               |
 [Wayfarer Fuel]---[Forge & Potions]---[Healer Tent]
                         |
               WEST ROAD TO TECHTOWN
                         |
               TRAIL TOWARD OBBY CANYON
```

The surface should have large negative space. Empty dirt, exposed rock, and distance between buildings are intentional. The dungeon gate must remain visible from most of the settlement.

---

## 5. Surface districts

## A. Arrival Road and Wayfarer Stop

Purpose: vehicle arrival, fuel, supplies, orientation, and final ordinary-world service before the outpost.

Contains:

- Wayfarer Fuel & Supply
- vehicle parking
- rugged EV/utility charger
- map board
- roadside snack counter
- tow/repair shed
- road checkpoint sign

Gameplay:

- refuel before/after trip
- supply restock
- fuel attendant shift
- delivery pickup from TechTown
- vehicle repair
- first tutorial dialogue about dungeon rules

## B. Outpost Commons

Purpose: town center and social/quest hub.

Contains:

- quest board
- guild hall entrance
- communal fire
- trader stalls
- town notice board
- fast-travel shrine/stop
- benches/crates
- dungeon-run leaderboards later

Gameplay:

- accept floor quests
- form/select helper pet
- compare run results
- meet NPCs
- seasonal outpost events

Visual rule:

- open dirt area, not paved plaza
- limited props clustered around functional anchors

## C. Guild and Adventurer Academy

Purpose: school, certification, class selection, maps, training, and support jobs.

Contains:

- Adventurer Academy
- guild reception
- training yard
- practice monster dummies
- map/archive room
- potion classroom
- appraisal classroom
- survival classroom
- academy bunks

Gameplay:

- learn combat, survival, appraisal, rune, and potion skills
- unlock deeper-floor access
- take support jobs
- practice without losing health/items

## D. Forge and Craft Row

Purpose: item progression and crafting economy.

Contains:

- Ironroot Blacksmith
- potion stand/lab
- relic appraiser
- repair bench
- material storage
- crafting stall
- merchant carts

Gameplay:

- upgrade weapons/tools
- repair gear
- appraise relics
- craft potions
- sell materials
- blacksmith/potion jobs

## E. Shrine Court and Healer Camp

Purpose: recovery, respawn, blessings, run preparation, and consequences.

Contains:

- checkpoint shrine
- healer tent/clinic cabin
- blessing stones
- memorial/achievement wall
- safe storage chest
- pet rest area

Gameplay:

- heal
- select temporary blessing
- recover after defeat
- store valuables
- cleanse cursed item
- revive/rest helper pet

## F. Warden and Ranger Outpost

Purpose: surface law, rescue coordination, sealed-zone control, and dungeon safety.

Contains:

- Warden Station
- holding/interview room
- evidence/relic vault
- rescue gear
- watchtower
- patrol parking
- sealed-ruin gate controls

Gameplay:

- pay fines/clear surface heat
- turn in illegal/cursed items
- rescue missions
- obtain restricted floor permit
- warden trainee jobs

## G. Outpost Housing and Cabin Trail

Purpose: buyable homes, ordinary residents, and a reason to live in the Outskirts.

Contains:

- guild bunks
- simple outpost rooms
- small cabins
- workshop loft
- premium ridge cabin
- storage sheds
- shared garden/well

Gameplay:

- choose Outskirts as residence
- rest/storage/wardrobe
- crafting room upgrades
- pet housing
- trophy/relic display

## H. Dungeon Gate Complex

Purpose: clear transition from surface life into dungeon rules.

Contains:

- giant gate
- staging platform
- run checklist board
- difficulty/floor selection interface
- return portal/stairs
- rescue bell
- gear-locker station
- sealed side gate for future content

No vehicle access beyond staging area.

---

## 6. Surface roads and transportation

| Route | Type | Function |
|---|---|---|
| Outskirts Road | dirt/main | TechTown connection and town arrival |
| Commons Loop | dirt/local | circles civic/services core |
| Forge Lane | local | fuel, forge, healer access |
| Cabin Trail | narrow dirt | residential cabins |
| Gate Approach | special/pedestrian | dungeon staging path |
| Warden Ridge Road | service | warden/sealed ruins |
| Canyon Trail | dirt | connection to Obby Canyon |

Controls:

- stop signs at Commons Loop
- no traffic lights
- speed bumps/rough terrain naturally slow vehicles
- warning gate before dungeon staging area
- parking at Wayfarer Stop, academy, and commons edge
- rescue/warden vehicles use dedicated route

NPC traffic:

- very low car density
- occasional supply truck from TechTown
- warden/rescue vehicle
- no normal traffic around gate approach

---

## 7. Underground dungeon architecture

The dungeon should be assembled from authored room modules and rules. Procedural generation should arrange meaningful pieces, not produce featureless maze soup.

### Floor structure

```txt
Entry room
-> 4-8 standard rooms/corridors
-> optional side rooms
-> locked/reward branch
-> safe room or merchant chance
-> stairs/boss gate
```

### Room types

| Room type | Purpose |
|---|---|
| Entry Room | establish floor theme and return rule |
| Combat Room | enemies and loot |
| Trap Hall | timing/movement challenge |
| Key Room | required key or puzzle component |
| Locked Treasure Room | optional risk/reward |
| Puzzle Room | rune, sequence, tile, or lever logic |
| Shrine Room | heal/blessing chance |
| Merchant Pocket | limited sell/buy opportunity |
| Pet Passage | helper retrieves inaccessible loot |
| Rescue Room | trapped NPC mission |
| Lore/Map Room | reveal route or weakness |
| Boss Antechamber | checkpoint and warning |
| Boss Room | pattern fight and major reward |
| Exit/Stairs | continue deeper or return |

### Floor bands

| Floors | Theme | Difficulty | Key unlocks |
|---|---|---|---|
| 1-4 | Old Stone Halls | beginner | basic loot, simple enemies/traps |
| 5 | Gatekeeper Arena | mini-boss | first relic tier |
| 6-9 | Root Caverns | moderate | ingredients, pet routes |
| 10 | Root Guardian | boss | crafting upgrade |
| 11-14 | Forgotten Library | puzzle-heavy | rune skills, maps |
| 15 | Archivist Boss | boss | appraisal upgrade |
| 16-19 | Crystal Depths | hard | rare gems, reflection puzzles |
| 20 | Crystal Colossus | boss | premium loot tier |
| 21+ | rotating deeper families | repeatable/endless | seasonal/high-tier rewards |

Additional floor families can be added later without changing surface town layout.

### Generation rules

- every floor has a reachable exit
- critical key cannot spawn behind its own locked door
- safe return option after boss or major milestone
- room repetition limit
- floor map seed saved during active run
- failure never corrupts persistent save
- no invisible hazards
- difficulty scales with floor, player skills, and chosen run modifier

---

## 8. Combat and creature rules

Combat remains cartoony and readable.

```txt
Allowed presentation:
- knockback
- stars/sparks/poofs
- exaggerated monster reactions
- breakable armor pieces
- health bars and clear tells

Avoid:
- gore
- dismemberment
- realistic suffering
- horror jump-scare dependence
```

Creature roles:

- slow tank
- fast skitterer
- ranged spitter/projectile caster
- shielded guardian
- trap-trigger creature
- support/healer creature
- mimic/loot trickster
- floor boss with readable phases

---

## 9. Civic infrastructure

### Law/safety

- Warden Station
- rescue bell and response team
- sealed relic vault
- restricted ruin permits

### Health

- healer clinic/tent
- academy practice infirmary
- shrine respawn

### Fuel/vehicle service

- Wayfarer Fuel & Supply
- normal pumps
- rugged EV charger
- tow/repair shed

### Fire/utilities

- forge fire-safety water barrels/cabinets
- generator/substation dressing
- well/water tank
- sanitation and ash disposal

### Food

- supply market
- stew/snack counter
- potion drinks remain buffs, not replacement for food

---

## 10. Hero landmarks

| Landmark | District | Purpose |
|---|---|---|
| Dungeon Gate | Gate Complex | entrance and town silhouette |
| Adventurer Academy | Guild District | school and skill unlocks |
| Guild Hall | Commons | quests, run records, helper selection |
| Ironroot Blacksmith | Craft Row | upgrades and repair |
| Moonwort Potions | Craft Row | potion crafting and ingredients |
| Relic Appraiser | Craft Row | loot identification and selling |
| Shrine of Return | Shrine Court | checkpoint, blessings, respawn |
| Healer's Lodge | Shrine Court | recovery |
| Warden Station | Ridge | law, rescue, restricted zones |
| Wayfarer Fuel & Supply | Arrival Road | fuel, food, road service |
| Outpost Commons Market | Commons | ordinary supplies |
| Ridge Cabins | Housing | premium/special homes |
| Sealed Ruins | Warden Ridge | future missions and restricted crime hooks |

---

## 11. Wayfarer Fuel & Supply

This station should look rugged and practical, not futuristic like TechTown or polished like Rich Hills.

### Layout

```txt
- 2 normal fuel pump islands
- 1 rugged EV/utility charger
- 1 repair/tow bay
- 5 parking spaces
- covered supply porch
- convenience counter
- food/soup warmer
- dungeon supply shelves
- package locker for TechTown deliveries
- road map and warning board
```

Gameplay:

| Activity | Description |
|---|---|
| Fuel Shift | serve travelers and supply vehicles |
| Supply Pack | assemble requested dungeon kits |
| Tow Check | repair tire/battery on stranded NPC car |
| Delivery Sort | route goods to forge, academy, healer |
| Warning Board Quiz | match floor warning to correct supplies |
| Crime Hook | steal restricted supply crate or forged permit |

Assets:

```txt
building_wayfarer_fuel_supply_exterior_v01.glb
prop_wayfarer_canopy_a_v01.glb
prop_wayfarer_fuel_pump_a_v01.glb
prop_wayfarer_utility_charger_a_v01.glb
prop_wayfarer_repair_bay_a_v01.glb
prop_wayfarer_supply_shelf_a_v01.glb
prop_wayfarer_map_board_a_v01.glb
prop_wayfarer_warning_sign_a_v01.glb
prop_wayfarer_package_locker_a_v01.glb
prop_wayfarer_food_warmer_a_v01.glb
```

---

## 12. Housing plan

| Home | Area | Tier | Identity |
|---|---|---|---|
| Guild Bunk | Academy/Guild | Basic | cheapest room, shared style |
| Outpost Room | Commons | Basic | small private room |
| Trail Cabin | Cabin Trail | Mid | storage and pet space |
| Workshop Loft | Forge Lane | Special/Mid | crafting bench upgrade |
| Ridge Cabin | Warden Ridge | Premium | scenic and private |
| Shrine Cottage | Shrine Court edge | Special | recovery/blessing flavor |

Home upgrades:

- relic display wall
- material chest
- potion shelf
- crafting table
- pet bed/storage
- dungeon map board
- trophy/achievement rack

All homes support spawn, rest, wardrobe, safe/storage, food, hygiene, and mail.

---

## 13. School: Adventurer Academy

### Curriculum

| Subject | Skill | Use |
|---|---|---|
| Combat Basics | attack timing, blocking, positioning | safer floor runs |
| Monster Study | weaknesses and tells | combat advantage |
| Trap Safety | hazard timing | trap halls |
| Rune Reading | symbol/sequence logic | doors and puzzles |
| Potion Craft | ingredient matching | buffs and healing |
| Relic Appraisal | rarity/value recognition | sell/upgrade decisions |
| Cartography | route memory and mapping | floor navigation |
| Rescue Training | carry/guide NPC, emergency route | rescue jobs |
| Warden Ethics | legal relic handling | permits and heat recovery |

Learning minigames:

| Minigame | Mechanic |
|---|---|
| Training Dummy Timing | attack/block in cue windows |
| Monster Weakness Quiz | match creature to weakness |
| Trap Drill | dodge safe tiles |
| Rune Lock Practice | sequence/symbol puzzle |
| Potion Recipe | combine correct ingredients |
| Relic Sort | identify rarity/fake/cursed item |
| Map Memory | recreate room path |
| Rescue Route | choose safest return path |

School jobs:

- training-yard assistant
- map archive organizer
- potion lab helper
- beginner tutor
- equipment clerk
- rescue trainee

---

## 14. Jobs

| Job | Location | Core gameplay |
|---|---|---|
| Relic Runner | Dungeon | retrieve specific item and return |
| Monster Cleanup | Beginner Floors | clear assigned rooms |
| Rescue Scout | Dungeon | locate and escort NPC |
| Cartographer | Dungeon/Academy | reveal/map floor rooms |
| Blacksmith Helper | Forge | strike timing, cool, sort parts |
| Potion Gatherer | Caverns/Outpost | collect ingredients safely |
| Potion Crafter | Moonwort | recipe matching |
| Relic Appraisal Clerk | Appraiser | identify and price loot |
| Shrine Keeper | Shrine Court | match blessings/cleanse items |
| Warden Trainee | Warden Station | patrol, permits, rescue drills |
| Wayfarer Attendant | Fuel Stop | fuel, repair, supply packing |
| Supply Courier | Tech road/Outpost | deliver crates between towns |
| Guild Clerk | Guild Hall | assign quests and log results |
| Pet Handler | Commons | care, train, equip helper pets |

---

## 15. Minigames and activity loops

| Activity | Location | Category | Core loop |
|---|---|---|---|
| Floor Dive | Dungeon | combat/exploration | clear rooms and find stairs |
| Key & Door Rooms | Dungeon | puzzle | locate keys and choose doors |
| Trap Timing | Dungeon | timing/movement | dodge hazards |
| Boss Gate | milestone floors | combat | read tells and defeat boss |
| Treasure Appraisal | Surface | observation/puzzle | identify rarity/value/curses |
| Pet Helper Run | Dungeon | support/strategy | send helper through small route |
| Potion Craft | Surface | matching | combine ingredients |
| Shrine Blessing | Surface | choice | choose temporary modifier |
| Rune Lock | Dungeon/Academy | sequence | decode symbols |
| Map Memory | Academy/Dungeon | memory | reconstruct route |
| Forge Timing | Blacksmith | timing | hammer/cool/finish gear |
| Rescue Escort | Dungeon | movement/protection | guide NPC to exit |
| Merchant Bargain | Surface/rare room | timing/dialogue | negotiate loot price |
| Cursed Item Cleanse | Shrine | rhythm/sequence | remove curse safely |

---

## 16. Police/warden and crime

### Authority model

- no normal police patrol inside generated dungeon floors
- Warden Station governs surface crime, permits, sealed ruins, and illegal relics
- rescue wardens may enter dungeon only through specific mission/event logic
- friendly NPC attacks trigger strong surface consequences

### Local crimes

| Action | Consequence |
|---|---|
| Steal merchant/relic items | merchant refusal, heat, confiscation |
| Attack friendly NPC | immediate warden response and service lockout |
| Enter sealed ruin | warden escalation |
| Use forged floor permit | dungeon access suspension |
| Sell cursed/illegal relic | appraiser distrust and heat |
| Sabotage shrine | respawn/blessing penalty and major fine |
| Lure monster to surface | emergency event and high consequence |
| Steal helper pet/gear | guild ban and restitution mission |
| Tamper with Wayfarer supplies | road checkpoint response |

### Clearing trouble

- pay fine
- return relic/supplies
- cleanse cursed item
- complete rescue/community defense mission
- repair shrine or merchant property
- attend Warden Ethics class
- wait out guild/dungeon permit suspension

---

## 17. Loot and economy

### Loot categories

- coins/cash equivalents
- crafting materials
- potion ingredients
- common gear
- rare gear
- relics
- cursed items
- pet/helper items
- maps/keys
- cosmetic trophies

### Risk rules

- player keeps equipped/core progression on defeat
- some unbanked run loot may be lost or reduced
- stash before descending protects chosen items
- milestones create safe return/checkpoint options
- deeper floors raise reward and risk

### Money sinks

- gear repair/upgrades
- potions and supplies
- appraisal fees
- housing/workshop upgrades
- pet equipment
- dungeon permits
- shrine blessings
- cosmetics/trophies

---

## 18. NPC population and routines

Profiles:

```txt
adventurer
student
academy_teacher
guild_clerk
blacksmith
potion_vendor
relic_appraiser
healer
warden
ranger
rescue_worker
merchant
resident
pet_handler
supply_driver
fuel_attendant
quest_giver
```

Daily rhythm:

- morning: academy, forge, supply deliveries
- midday: most dungeon parties depart
- afternoon: merchants/appraisers busiest
- evening: returning adventurers, healer/shrine activity
- night: surface quiet, forge/shrine remain visual anchors

---

## 19. Asset families

### A. Surface hero architecture

```txt
building_dungeon_gate_exterior_v01.glb
building_adventurer_academy_exterior_v01.glb
building_dungeon_guild_hall_exterior_v01.glb
building_ironroot_blacksmith_exterior_v01.glb
building_moonwort_potions_exterior_v01.glb
building_relic_appraiser_exterior_v01.glb
building_shrine_of_return_exterior_v01.glb
building_healer_lodge_exterior_v01.glb
building_warden_station_exterior_v01.glb
building_wayfarer_fuel_supply_exterior_v01.glb
building_outpost_cabin_a_v01.glb
building_outpost_workshop_loft_exterior_v01.glb
```

### B. Surface props

```txt
prop_outpost_lantern_a_v01.glb
prop_outpost_quest_board_a_v01.glb
prop_outpost_communal_fire_a_v01.glb
prop_outpost_supply_crate_a_v01.glb
prop_outpost_direction_sign_a_v01.glb
prop_outpost_well_a_v01.glb
prop_outpost_training_dummy_a_v01.glb
prop_outpost_rescue_bell_a_v01.glb
prop_shrine_blessing_stone_a_v01.glb
prop_relic_display_case_a_v01.glb
```

### C. Dungeon modular kit

```txt
arch_dungeon_room_stone_small_a_v01.glb
arch_dungeon_room_stone_large_a_v01.glb
arch_dungeon_corridor_straight_a_v01.glb
arch_dungeon_corridor_corner_a_v01.glb
arch_dungeon_stairs_down_a_v01.glb
arch_dungeon_locked_door_a_v01.glb
arch_dungeon_boss_gate_a_v01.glb
arch_dungeon_safe_room_a_v01.glb
arch_dungeon_root_cavern_a_v01.glb
arch_dungeon_library_room_a_v01.glb
arch_dungeon_crystal_room_a_v01.glb
arch_dungeon_forge_chasm_a_v01.glb
```

### D. Dungeon props/traps

```txt
prop_dungeon_torch_a_v01.glb
prop_dungeon_rune_lamp_a_v01.glb
prop_dungeon_treasure_chest_a_v01.glb
prop_dungeon_key_a_v01.glb
prop_dungeon_lever_a_v01.glb
prop_dungeon_pressure_tile_a_v01.glb
prop_dungeon_spike_trap_a_v01.glb
prop_dungeon_swinging_hazard_a_v01.glb
prop_dungeon_falling_rock_marker_a_v01.glb
prop_dungeon_crystal_cluster_a_v01.glb
prop_dungeon_mushroom_glow_a_v01.glb
prop_dungeon_safe_shrine_a_v01.glb
```

### E. Forge/potion/appraisal

```txt
prop_blacksmith_anvil_a_v01.glb
prop_blacksmith_forge_a_v01.glb
prop_blacksmith_hammer_a_v01.glb
prop_blacksmith_cooling_barrel_a_v01.glb
prop_potion_cauldron_a_v01.glb
prop_potion_ingredient_shelf_a_v01.glb
prop_potion_mix_table_a_v01.glb
prop_appraisal_table_a_v01.glb
prop_appraisal_lens_a_v01.glb
prop_relic_scale_a_v01.glb
```

### F. Housing

```txt
furniture_outpost_bunk_a_v01.glb
furniture_outpost_cabin_bed_a_v01.glb
furniture_outpost_table_a_v01.glb
prop_home_relic_wall_a_v01.glb
prop_home_material_chest_a_v01.glb
prop_home_potion_shelf_a_v01.glb
prop_home_pet_bed_a_v01.glb
prop_home_dungeon_map_board_a_v01.glb
```

### G. Warden/healer

```txt
prop_warden_front_desk_a_v01.glb
prop_warden_relic_vault_a_v01.glb
prop_warden_holding_cell_a_v01.glb
prop_warden_rescue_gear_a_v01.glb
prop_healer_bed_a_v01.glb
prop_healer_supply_shelf_a_v01.glb
prop_healer_recovery_crystal_a_v01.glb
```

### H. Minigame UI

```txt
ui_icon_dungeon_floor.svg
ui_icon_dungeon_key.svg
ui_icon_dungeon_boss.svg
ui_icon_dungeon_relic.svg
ui_icon_dungeon_potion.svg
ui_icon_dungeon_pet.svg
ui_meter_dungeon_floor_progress.svg
ui_meter_dungeon_boss_health.svg
ui_panel_dungeon_run_summary.svg
ui_panel_dungeon_loot_appraisal.svg
```

---

## 20. First build sprint

### Dungeon Sprint 001: Surface + First Floor Anchor Pack

```txt
1. prop_outpost_lantern_a_v01.glb
2. prop_outpost_quest_board_a_v01.glb
3. prop_shrine_blessing_stone_a_v01.glb
4. prop_blacksmith_anvil_a_v01.glb
5. prop_potion_mix_table_a_v01.glb
6. prop_wayfarer_fuel_pump_a_v01.glb
7. arch_dungeon_room_stone_small_a_v01.glb
8. arch_dungeon_corridor_straight_a_v01.glb
9. arch_dungeon_corridor_corner_a_v01.glb
10. arch_dungeon_stairs_down_a_v01.glb
11. prop_dungeon_torch_a_v01.glb
12. prop_dungeon_treasure_chest_a_v01.glb
13. prop_dungeon_locked_door_a_v01.glb
14. prop_dungeon_pressure_tile_a_v01.glb
15. ui_icon_dungeon_floor.svg
16. ui_icon_dungeon_relic.svg
```

---

## 21. Production phases

### Phase 1: Surface silhouette

Road, negative space, gate, shrine, forge, Wayfarer Stop, commons.

### Phase 2: First dungeon floor

Room kit, corridor, enemy, chest, key, stairs, return flow.

### Phase 3: Surface services

Academy, guild, blacksmith, potion, appraiser, healer, warden, housing.

### Phase 4: Run lifecycle

Start, active floor, continue/return choice, defeat, loot summary, stash/appraisal.

### Phase 5: Floor variety

Root Caverns, puzzle library, boss gate, safe rooms, traps.

### Phase 6: Jobs/school/crime

Academy lessons, forge/potion jobs, warden permits, illegal relic consequences.

### Phase 7: Housing/pets/progression

Homes, workshop upgrades, helper pets, trophies, deeper-floor unlocks.

### Phase 8: Polish/optimization

Generation validation, performance, lighting readability, sound, save safety.

---

## 22. Agent handoff checklist

```txt
Town: Dungeon Outskirts
Layer: surface or dungeon
Surface district / dungeon floor family:
Room type:
Asset/landmark:
Persistent or generated:
Combat, puzzle, trap, service, housing, or civic:
Entry/exit guarantee:
Key/lock dependency:
Return-to-surface path:
Loot/reward:
Failure consequence:
Warden/police relevance:
Interior/collision:
Interactable handler ready:
Palette/floor family:
Kid-safe combat check:
Fallback:
Performance target:
```

---

## 23. Completion checklist

Dungeon Outskirts is not complete until the player can:

- arrive by dirt road and refuel
- recognize the gate as the dominant destination
- buy supplies, food, healing, and storage
- attend Adventurer Academy
- buy at least one home
- accept surface and dungeon jobs
- enter a generated/assembled floor safely
- fight, solve, loot, descend, and return
- use appraisal, forge, potion, shrine, stash, and healer loops
- lose a run without save corruption or unfair total loss
- encounter warden-specific crime and consequences
- live on the surface without relying on Starter Town
- revisit for deeper floors, bosses, crafting, pets, housing, and loot

Final identity:

```txt
The surface is a town built to support expeditions.
The dungeon is a second world built to test everything the player prepared above.
```