# ZTA Water Ecosystem Blueprint

Status: planning blueprint, not runtime code  
Scope: map-edge water, swimming, breath, fishing catches, Gillyfish progression, boats/yachts, sea life, underwater traversal, safe boundaries, and Aqualume access  
Project: Zaylin's Kid World, also called ZTA

ZTA now has a continuous water ecosystem linking Fishing Harbor, the Rich Hills Marina, the Casino bridge coast, and the final underwater town, **Aqualume**. Water is not decorative map edging. It is a navigable environment with surface traffic, swimming, fishing, underwater exploration, sea life, salvage, currents, law zones, and progression.

The surface coast should feel useful before Aqualume is unlocked. Players can fish, swim near shore, rent or own boats, buy yachts, race, rescue NPCs, explore reefs, and recover unusual catches. Aqualume becomes the reward for mastering and engaging with this ecosystem rather than buying a door key.

---

## 1. Geographic role

The shared body of water is provisionally named **Crownwater Basin**.

```txt
Fishing Harbor: western/northern working coast
Rich Hills Marina: eastern luxury coast
Casino Bridge: northern/southern bridge channel depending final map orientation
Aqualume: submerged in the deep central basin
```

Recommended planning position:

```txt
Aqualume center: approximately x 350, z -350, y -120
```

This places the underwater city beneath the shared water between Fishing Harbor and Rich Hills without forcing either surface town to move. Exact coordinates remain implementation-dependent after terrain scale testing.

### Water zones

| Zone | Depth | Purpose |
|---|---:|---|
| Shoreline | 0-3 m | wading, beginner swimming, rescue-safe return |
| Harbor/Marina Water | 3-12 m | boats, docks, public fishing, basic diving |
| Reef Shelf | 8-25 m | fish schools, collectibles, ecology missions |
| Open Basin | 20-60 m | yachts, boat routes, deep fishing, current events |
| Lighthouse Trench | 50-110 m | Gillyfish eligibility, salvage, rare catches |
| Aqualume Shelf | 90-140 m | underwater-city approach and gate |
| Abyssal Edge | 140 m+ | late Aqualume jobs, pressure hazards, rare resources |

The water boundary should use visible horizon, current walls, cliffs, storms, patrol warnings, or deep-ocean fade. It should not be a naked invisible wall.

---

## 2. Water traversal states

### Surface states

```txt
walking/wading
surface swimming
underwater swimming
boat passenger
boat driver
yacht driver/passenger
sea scooter driver
mini-sub driver/passenger
sea-life guided transit
```

### Base swimming

Before the Gillyfish is consumed:

- the player has a visible breath meter while underwater
- breath drains only when the head is submerged
- surfacing restores breath quickly
- swimming speed is lower than vehicle speed
- shallow water remains safe and beginner-friendly
- the player can dive for ordinary collectibles before unlocking Aqualume

### Breath failure

The intended fiction is that the player cannot survive the full trip to Aqualume without gills.

Implementation behavior should avoid a frustrating hard-death loop:

```txt
Breath reaches zero
-> brief blackout/warning animation
-> health may drain for a short grace period
-> player is returned to the nearest valid shore, dock, boat, or rescue buoy
-> small time/stamina penalty
-> no inventory corruption
```

A harsher death mode can exist only if the global game already treats ordinary drowning that way. The critical rule is that non-gilled players cannot brute-force the Aqualume route with healing items.

### Permanent gills

Consuming a Gillyfish grants the permanent account/character flag:

```txt
hasPermanentGills = true
```

Effects:

- underwater breath no longer drains
- Aqualume approach route becomes survivable
- Aqualume map marker and discovery quest unlock
- normal-city-depth water pressure is tolerated
- underwater dialogue, jobs, and housing become available
- gill visual can appear subtly at the neck or as an optional cosmetic toggle

The player never needs to eat another Gillyfish.

### Deep pressure

The Gillyfish adaptation covers normal Aqualume depth. The Abyssal Edge can still require later pressure gear, vehicle upgrades, or academy certifications. This preserves future progression without weakening the Gillyfish reward.

---

## 3. The Gillyfish

### Identity

```txt
Name: Gillyfish
Category: rare permanent-unlock fish
Primary use: consume once to gain permanent gills and unlock Aqualume
Secondary use: sell, trade, gift, display, or store duplicate catches
```

Visual direction:

- medium-small fish, not a giant boss catch
- teal/blue body
- luminous violet or cyan gill fronds
- subtle pearl sheen
- distinctive silhouette recognizable in inventory
- magical/rare, but still belongs in the marine ecosystem

### Catch locations

Eligible locations:

- Lighthouse Trench rare-fishing nodes
- Deepwater Buoy route outside Fishing Harbor
- limited Rich Hills Marina deep-water charter route
- occasional Catch of Legend event pool

The first realistic route should originate in Fishing Harbor so the fishing town owns the discovery.

### Rarity and anti-frustration system

The fish should be rare, but not absurdly rare.

Recommended planning values:

```txt
Base eligible catch chance: 2.5%
Event/tide bonus chance: up to 5%
Pity begins: after 20 eligible catches without a Gillyfish
Pity increase: +0.5 percentage points every 5 eligible catches
Pity cap: 10%
Hard guarantee: 60th eligible catch without one
Pity resets when Gillyfish is caught
```

Exact numbers require economy testing, but a hard guarantee is non-negotiable because the final town cannot depend on endless bad luck.

### Consumption rules

First consumption:

```txt
remove one Gillyfish item
set hasPermanentGills = true
play Gillbound Adaptation sequence
unlock Aqualume discovery mission
add Gillyfish discovery to collection
```

After adaptation:

- another Gillyfish cannot be consumed for additional power
- inventory action changes to sell, gift, trade, cook only if cooking it does not imply losing the rare unlock item accidentally, or display
- a confirmation prompt protects first consumption
- the permanent flag saves independently from the item inventory

### Trading and friendship

Duplicate Gillyfish may be:

- gifted directly to another player
- traded through a safe trade interface
- sold to a specialized Harbor or Aqualume buyer
- kept in aquarium/display storage

A gifted Gillyfish grants gills when the receiving player consumes it. The unlock is earned through another player's generosity rather than a cash-store purchase, which fits the intended social economy.

### Value

- high enough to feel exciting
- lower than the long-term value of unlocking Aqualume
- specialized buyer may pay more than ordinary fish market
- sale price should not encourage veteran players to monopolize all beginner fishing nodes

---

## 4. Fishing catch ecosystem

Fishing should not guarantee a fish every cast.

### Catch categories

| Category | Examples | Function |
|---|---|---|
| Common fish | perch-like, snapper-like, small coastal fish | regular sale/food |
| Uncommon fish | colorful reef fish, larger game fish | better cash, recipes |
| Rare fish | legendary/unique species | collection, quests, high value |
| Power fish | temporary stat fish | speed, luck, stamina, visibility bonuses |
| Permanent fish | Gillyfish | permanent progression unlock |
| Junk | boot, can, broken sign, tangled rope | low value, cleanup/crafting |
| Money catch | sealed wallet, coin pouch, old cash box | direct cash after verification |
| Gear catch | tool, clothing item, tackle part | inventory/use/sale |
| Weapon catch | sealed weapon case or usable weapon if world rules support it | gear/contraband consequence |
| Loot catch | locked crate, treasure chest, supply case | random item table |
| Quest catch | evidence bag, lost package, tagged research item | mission progression |
| Creature event | Catch of Legend transformation | special encounter |

### Suggested catch-table principles

- location changes the pool
- bait changes weighted probabilities
- weather/tide changes probabilities
- fishing skill improves quality, not only raw cash
- protected species create a decision and law consequence
- junk can feed cleanup/crafting loops
- weapons/contraband should be uncommon and may need police/Harbor Master handling
- no single catch table should contain every item

### Power fish examples

| Fish | Effect | Duration |
|---|---|---:|
| Zipfin | swim speed boost | temporary |
| Lantern Minnow | brighter underwater visibility | temporary |
| Lucky Koi-like original species | fishing luck boost | temporary |
| Ironjaw | temporary defense/stamina | temporary |
| Current Skipper | boat handling bonus | temporary |
| Gillyfish | permanent underwater breathing | permanent, one-time |

All names should be original during asset/content production.

---

## 5. Surface water ecosystem

### Fish simulation tiers

| Tier | Behavior | Performance approach |
|---|---|---|
| Ambient schools | decorative schooling fish | pooled/instanced, non-interactive |
| Catchable fish nodes | abstract fish population linked to fishing spots | data-driven, no full AI needed |
| Interactive wildlife | turtles, dolphins, rays, rescue animals | limited authored AI |
| Predators/hazards | kid-safe territorial creatures | rare, readable, non-gory |
| Story creatures | Catch of Legend and Aqualume quest animals | authored encounters |

Fishing catches do not need to match every visible ambient fish one-to-one. The systems should feel connected without simulating an ocean census.

### Sea-life interaction rules

- no harming friendly sea life for entertainment
- wildlife can flee, guide, rescue, race, or assist
- dolphins can provide a bonded guided ride/taxi activity after Aqualume unlock
- dolphins are not inventory mounts or property
- manta-like fictional creatures can support gliding routes
- sanctuary zones prohibit capture/harassment

### Environmental props

- reefs
- kelp forests
- rock shelves
- shipwrecks
- lost cargo
- buoy lines
- underwater cables
- current vents
- caves
- sea-grass beds
- sanctuary markers

---

## 6. Boats, yachts, and water vehicles

### Surface vehicles

| Vehicle | Primary town | Purpose |
|---|---|---|
| Rowboat/skiff | Fishing Harbor | beginner fishing and local movement |
| Rental motorboat | Fishing Harbor | routes, courier work, buoy course |
| Fishing boat | Fishing Harbor | storage, deeper catches, work |
| Patrol/rescue boat | Fishing Harbor | law/rescue |
| Speedboat | Rich Hills | recreation and racing |
| Yacht | Rich Hills | luxury ownership, parties/events, housing-adjacent status |
| Water taxi/ferry | both | NPC transit and jobs |

### Underwater vehicles

| Vehicle | Unlock | Purpose |
|---|---|---|
| Sea scooter | Aqualume entry | personal fast movement |
| Bubble taxi | Aqualume | public transit |
| Mini-sub | Aqualume jobs/ownership | cargo, salvage, deep travel |
| Current glider | Aqualume skill | current-surfing routes |
| Patrol sub | Current Guard | law/rescue |
| Manta glider partnership | sanctuary quest | guided traversal, not ownership |
| Dolphin guide ride | sea-life program | guided race/taxi activity, not purchased animal |

### Yacht ownership

Rich Hills yacht ownership should include:

- marina slip assignment
- boarding/interior zone
- storage
- cosmetic upgrades
- yacht route access
- event/guest missions
- fuel and maintenance
- optional mobile rest point where technically safe

Yachts cannot enter the Aqualume gate. Players transfer to swimming, sea scooter, or submarine routes.

---

## 7. Aqualume access route

### Discovery flow

```txt
1. Player fishes in Fishing Harbor.
2. Player catches Gillyfish.
3. Player chooses to consume it.
4. Gillbound Adaptation becomes permanent.
5. Harbor Academy/Harbor Master recognizes the adaptation.
6. A deep-current anomaly mission appears at Lighthouse Trench.
7. Player swims/dives through marked current rings and ruins.
8. Aqualume Gate activates and the city map is revealed.
9. First arrival unlocks local fast travel only from approved moonpool/transit nodes.
```

The Gillyfish alone unlocks biological access. The discovery mission teaches navigation and prevents the city from appearing as an unexplained map button.

### Non-gilled approach

If a player tries to follow the route without adaptation:

- breath depletion makes the full route impossible
- warnings explain that the pressure/depth is unsafe
- blackout returns player to Lighthouse rescue dock or nearest valid shore
- no permanent loss

### Multiplayer/group travel

- every player entering open water must personally have gills or use an approved pressure vehicle/passenger system
- a gilled friend cannot drag a non-gilled swimmer through the gate
- non-gilled passengers may visit later in sealed submarines only if the design intentionally allows guest access
- permanent free movement and local residence still require Gillyfish adaptation

This preserves the unlock while supporting future social travel.

---

## 8. Water law and safety

### Authorities

- Harbor Patrol: Fishing Harbor waters
- Rich Hills Marina Security/Police: luxury marina and yacht zones
- Bridge/coastal patrol: shared transit channel
- Current Guard: Aqualume and underwater approach
- sanctuary wardens: protected sea-life zones

### Water crimes

- boat theft
- reckless boating/no-wake violations
- fishing without permit
- keeping protected species
- illegal salvage
- stealing yacht/boat cargo
- fuel-dock tampering
- sanctuary harassment
- current-grid sabotage near Aqualume
- smuggling contraband between surface and underwater markets

### Rescue rules

- drowning returns to safe point
- boats can call tow/rescue
- disabled underwater vehicles trigger Current Guard rescue
- rescue fees should be modest and never create a progression softlock

---

## 9. Water physics and readability

### Required systems

```txt
water surface height
submerged-head detection
breath meter
swim acceleration/deceleration
vertical swim control
underwater camera effects
underwater audio filter
surface/underwater transition
boat buoyancy or constrained surface movement
water-vehicle entry/exit
current volumes
safe-return points
underwater visibility zones
```

### Camera rules

- camera must not repeatedly clip through water surface
- underwater fog/blue tint should not obscure prompts
- interaction markers remain readable
- vertical orientation indicator helps players understand up/down
- Aqualume streets and signs require strong depth cues

### Current volumes

Currents can:

- guide the Aqualume approach
- create races
- prevent access to unloaded/out-of-bounds areas
- move schools/particles
- create hazards in late zones

Currents must be visibly represented with particles, plants, bubbles, or flowing light.

---

## 10. Map and UI requirements

### Surface map

- coastlines and docks
- water routes
- boat slips
- fuel docks
- fishing spots by unlocked knowledge
- protected zones
- rescue points

### Underwater map

- depth layers
- current routes
- Aqualume districts
- moonpools
- transit nodes
- salvage sites
- sanctuary zones
- Abyssal Edge warnings

### UI

```txt
ui_meter_breath.svg
ui_icon_gillyfish.svg
ui_icon_permanent_gills.svg
ui_icon_water_current.svg
ui_icon_boat.svg
ui_icon_yacht.svg
ui_icon_sea_scooter.svg
ui_icon_submarine.svg
ui_icon_aqualume_gate.svg
ui_panel_fishing_catch_result.svg
ui_panel_gillyfish_unlock.svg
ui_panel_water_depth_map.svg
```

---

## 11. Shared asset families

### Water environment

```txt
water_surface_crownwater_basin_v01
prop_water_buoy_navigation_a_v01.glb
prop_water_buoy_protected_a_v01.glb
prop_water_rescue_float_a_v01.glb
prop_underwater_reef_cluster_a_v01.glb
prop_underwater_kelp_cluster_a_v01.glb
prop_underwater_seagrass_cluster_a_v01.glb
prop_underwater_rock_shelf_a_v01.glb
prop_underwater_current_vent_a_v01.glb
prop_underwater_shipwreck_small_a_v01.glb
prop_underwater_lost_cargo_a_v01.glb
prop_underwater_sanctuary_marker_a_v01.glb
```

### Fish and sea life

```txt
creature_fish_school_common_a_v01.glb
creature_fish_school_reef_a_v01.glb
creature_gillyfish_v01.glb
creature_zipfin_v01.glb
creature_lantern_minnow_v01.glb
creature_current_skipper_v01.glb
creature_sea_turtle_a_v01.glb
creature_dolphin_guide_a_v01.glb
creature_manta_glider_a_v01.glb
creature_crab_a_v01.glb
creature_jelly_glow_a_v01.glb
```

### Fishing catches

```txt
item_fishing_junk_boot_a_v01.glb
item_fishing_junk_can_a_v01.glb
item_fishing_money_pouch_a_v01.glb
item_fishing_locked_crate_a_v01.glb
item_fishing_weapon_case_a_v01.glb
item_fishing_lost_package_a_v01.glb
item_fishing_treasure_chest_a_v01.glb
item_gillyfish_inventory_v01.glb
```

### Vehicles

```txt
vehicle_water_skiff_a_v01.glb
vehicle_water_motorboat_a_v01.glb
vehicle_water_fishing_boat_a_v01.glb
vehicle_water_speedboat_a_v01.glb
vehicle_water_yacht_a_v01.glb
vehicle_water_patrol_boat_a_v01.glb
vehicle_underwater_sea_scooter_a_v01.glb
vehicle_underwater_minisub_a_v01.glb
vehicle_underwater_patrol_sub_a_v01.glb
vehicle_underwater_bubble_taxi_a_v01.glb
```

---

## 12. Implementation phases

### Phase 1: Water foundation

- one continuous test water body
- swimming and breath meter
- safe drowning return
- shoreline entry/exit
- basic underwater camera/audio

### Phase 2: Fishing catch expansion

- fish/non-fish catch categories
- item result panel
- protected catch logic
- Gillyfish item and permanent save flag
- pity/guarantee tracking

### Phase 3: Boats and surface routes

- skiff/motorboat
- marina slips
- fuel dock
- buoy routes
- boat rescue/return

### Phase 4: Underwater environment

- reef shelf
- trench
- current route
- ambient fish schools
- salvage props

### Phase 5: Aqualume gateway

- adaptation sequence
- discovery quest
- underwater gate
- map reveal
- first moonpool

### Phase 6: Aqualume town

Follow [AQUALUME_BLUEPRINT.md](AQUALUME_BLUEPRINT.md).

### Phase 7: Rich Hills yachts and shared economy

- yacht ownership
- marina slips
- yacht route/events
- surface-to-underwater trade jobs

### Phase 8: Ecosystem polish

- sea-life AI
- weather/tides
- water law zones
- performance and streaming
- multiplayer/trade validation

---

## 13. Non-negotiable safeguards

- Gillyfish unlock saves permanently and cannot be lost with inventory corruption.
- The final-town unlock cannot rely on endless random chance; use pity and a guarantee.
- Drowning never strands the player or destroys irreplaceable progression.
- Water boundaries are visually readable.
- Friendly sea life is not treated as disposable property.
- Fishing supports non-fish catches, including loot, money, gear, junk, and rare contraband.
- Aqualume remains earned through gameplay, not sold through a premium store.
- Duplicate Gillyfish remain valuable and socially tradable after adaptation.

Final identity:

```txt
The ocean is not the edge of the map anymore.
It is the road to the final city.
```