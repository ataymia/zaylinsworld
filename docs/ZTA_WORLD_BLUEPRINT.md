# ZTA World Buildout Blueprint

Status: planning blueprint, not runtime code  
Scope: world feel, map bones, roads, towns, neighborhoods, location purpose, and implementation order  
Project: Zaylin's Kid World, also called ZTA

This document turns the current playable city into a long-term world plan that can be handed to GitHub/Codex agents without making them burn tokens guessing the city. The goal is a kid-safe urban sandbox with freedom, jobs, choices, trouble, recovery, shopping, driving, and minigames. It should feel like a real little city, not a flat menu wearing asphalt shoes.

---

## 1. What exists right now

The repo already has a working browser-based 3D city using Three.js and Vite. The current playable area is Starter Town. Runtime world geometry is mostly driven by `src/config/mapConfig.js`, while the bigger multi-town future is described in `src/config/worldMapPlan.js` and docs.

### Current Starter Town structure

World coordinate rule:

```txt
+x = east
+z = south
y = vertical height
```

Current street grid:

```txt
Road center-lines:
Horizontal z roads: -30, 0, 30
Vertical x roads:   -30, 0, 30
Road extent:        -30 to +30
Road width:         9
Sidewalk width:     2.6
```

That means the playable downtown is currently a bounded 3x3 grid: perimeter ring plus a cross through the center.

Current enterable landmarks from `mapConfig.js`:

| Area | Current position | Role |
|---|---:|---|
| Frostbox | x -15, z -15 | jewelry store |
| Chicken Spot | x 15, z -15 | food, eating, work shift |
| Kicks & Fits | x -15, z 15 | clothing and shoes |
| Auto Haus | x -15, z -44 | dealership north of ring |
| Zaylen's Home | x 0, z 44 | home base |
| Block Supply | x -44, z 0 | gear and weapons shop |
| Iron City Gym | x 44, z 0 | fitness minigame |
| City Garage | x 15, z -44 | repair/service |
| Zaylin Prep | x -44, z -24 | school |
| Worktower | x 44, z 24 | job/office tower |
| Police Station | x 48, z -24 | police, wanted, cruisers, precinct interior |

Current runtime extras:

| Area | Current position | Role | Notes |
|---|---:|---|---|
| 6twelve Gas Station | x -46, z 24 | fuel, gas store interior | Built procedurally in `main.js` because the GLB includes visible interior clutter. |
| Mini Market | x 30, z 44 | store landmark | Exists in GLB landmark file but GLB world buildings are currently feature-flagged off. |
| City Diner | x 44, z -26 | food landmark | Same as above. |
| Park Plaza | x 15, z 15 | park, benches, gems | Currently overlaps the same inner block neighborhood as Kicks/Fits visually. |
| Collectible Gems | sidewalks and park | quick cash and fun | Non-colliding pickups. |
| Trash Cleanup | storefronts/alley edges | sanitation job | Uses placement rules so trash is visible and pickupable. |

### Current gap

Starter Town is playable, but the world is not yet spatially expressive enough. The existing map has a strong foundation but feels like a compact test district. We need to turn it into a city with neighborhoods, road identity, landmarks you can recognize from far away, and future routes to other towns.

Key mismatch to fix soon:

- `worldMapPlan.js` lists Starter Town landmarks like `mini-market` and `gas-station` as part of the town plan.
- Runtime `mapConfig.js` landmarks do not include mini-market/gas station as normal `LANDMARKS`.
- The gas station exists through procedural runtime code in `main.js`, not as regular map data.
- `placementRules.js` still has a `gas_pump` forecourt rule that does not match the actual procedural gas station position.

Do not bulldoze this. Fix the source-of-truth mismatch first.

---

## 2. Core world identity

ZTA should feel like:

```txt
Kid city sandbox + urban adventure + neighborhood RPG + job/life simulator + minigame arcade.
```

The player should be able to choose between:

1. Straight path: school, jobs, gym, errands, saving money, buying clothes, cars, houses.
2. Risk path: theft, police heat, evasion, debt, restricted spaces, consequences.
3. Skill path: minigames, tournaments, time trials, fishing, coding, performance, racing.
4. Style path: wardrobe, jewelry, cars, homes, reputation, fame.

The world should never be explicit or adult. It can have edge, comedy, consequences, and street energy, but it must stay original and kid-safe.

### World design commandments

1. No fake prompts. If a marker or door exists, it needs a working handler or it stays decorative with no prompt.
2. Every town needs a job loop, a money sink, a rest/service point, a minigame, and a reason to revisit.
3. Roads must teach the player geography. Main roads should be memorable. Local roads can be slower and tighter.
4. Each town should have a visual silhouette. You should know where you are before reading signs.
5. The first city should be dense. Future towns can be larger and more specialized.
6. Keep locations original. GTA is an energy reference, not an asset, brand, or content reference.
7. Every future town ships data-first: map config, landmarks, interactions, minimap markers, assets, fallback plan.

---

## 3. Starter Town v2 plan

Starter Town should become the tutorial city and permanent home base. Keep the current coordinates stable where possible so existing interactions do not break, but reframe the current grid as the downtown core of a larger Starter Town district.

### Starter Town neighborhoods

#### A. Main Street Core

```txt
Center: around x 0, z 0
Roads: Main St east/west, Centre Ave north/south
Feel: busy, readable, tutorial-friendly
```

Purpose:

- First walking area.
- Teaches crosswalks, traffic lights, cars, NPCs, shop entrances, gem pickups.
- Should be the densest signage area.

Key places:

- Frostbox, northwest inner block.
- Chicken Spot, northeast inner block.
- Kicks & Fits, southwest inner block.
- Park Plaza, southeast inner block.

Road notes:

- Keep central intersection as the strongest visual anchor.
- Add visible traffic-light poles on all four corners.
- Add crosswalks with wider striping and school-zone style curb paint near Zaylin Prep.
- Add street-name signs: Main St, Centre Ave, Prep Row, Homebend Road.

#### B. Food & Fuel Corner

```txt
Center: west/southwest edge, around x -46, z 24
Roads: ring road access plus a curved driveway/forecourt
Feel: convenience-store corner, snack run, car stop
```

Purpose:

- Gas/refuel loop.
- Mini-market shopping.
- Snacks, drinks, cheap energy boosts.
- Early delivery job pickup.

Key places:

- 6twelve Gas Station.
- Mini Market.
- Possible ATM.
- Trash dumpster behind store for cleanup job.

Road notes:

- Needs a clear pull-in lane from the ring road.
- Pump islands should not block traffic.
- Add parking slots between store and road.
- Gas station forecourt should be stored in one source of truth, not scattered between `main.js`, `worldMapPlan.js`, and `placementRules.js`.

#### C. School & Civic Row

```txt
Center: northwest to northeast edge, around x -44 to +48, z -24
Roads: north ring road, local school frontage
Feel: kid-world structure, safety, rules, early smarts progression
```

Purpose:

- School/study loop.
- Police/legal consequences.
- Community jobs and academy future.

Key places:

- Zaylin Prep.
- Police Station.
- Police cruiser lot.
- Future library or community center.

Road notes:

- Add school crossing markings in front of Zaylin Prep.
- Add slower traffic behavior in school zone later.
- Police station lot should have cruiser exit lane aimed toward the main road.

#### D. Hustle Row

```txt
Center: east and west edges
Roads: ring road frontage
Feel: work, training, gear, practical city services
```

Purpose:

- Worktower jobs.
- Gym progression.
- Block Supply inventory/shop loop.
- Garage repair and vehicle upgrades.

Key places:

- Worktower.
- Iron City Gym.
- Block Supply.
- City Garage.

Road notes:

- Add alley/service drives behind Block Supply and Gym.
- Add signage visible from ring road.
- Add a small loading dock behind Worktower for delivery missions.

#### E. Homebend Residential

```txt
Center: south edge, around x 0, z 44
Roads: south ring road plus small local lane
Feel: calm home base, softer lighting, less traffic
```

Purpose:

- Sleep/rest.
- Wardrobe and safe.
- Hairline/clippers minigame.
- Future property/rent/home upgrades.

Key places:

- Zaylen's Home.
- Future neighbor houses.
- Future laundromat or corner basketball court.

Road notes:

- Stop signs instead of traffic lights.
- Lower traffic density.
- Add driveways, mailboxes, bins, porch lights.

#### F. Auto Row

```txt
Center: north edge, around x -15 to +15, z -44
Roads: north frontage road
Feel: dealership, garage, car progression
```

Purpose:

- Car buying.
- Vehicle repair.
- Starter driving tests.
- Future street-race tutorial.

Key places:

- Auto Haus.
- City Garage.
- Dealer lot.

Road notes:

- Add a small test-drive loop north of dealership in a later map expansion.
- Keep the first drivable car near the center for tutorial convenience.

---

## 4. Starter Town road buildout

### Current code-safe road layout

Right now, roads are generated from center-line arrays. Keep this for the immediate phase:

```txt
z = -30  north ring road
z = 0    Main Street
z = 30   south ring road
x = -30  west ring road
x = 0    Centre Avenue
x = 30   east ring road
```

Immediate improvements without changing the road engine:

1. Add better curb/sign props to clarify neighborhoods.
2. Add turn arrows at the ring-road corners.
3. Add stop-sign identity at perimeter corners.
4. Add school crossing in front of Zaylin Prep.
5. Add gas station driveway striping as decorative non-collider planes.
6. Add minimap labels for gas, market, garage, police, home, school.

### Next road engine upgrade

The current `ROAD.hz` and `ROAD.vx` grid works, but it cannot make curves, ramps, angled roads, cul-de-sacs, or twisty hillside roads. For the bigger world, introduce additive road segment data while keeping the old grid as a compatibility layer.

Proposed future shape:

```js
export const ROAD_SEGMENTS = [
  {
    id: 'main-st-west',
    tier: 'main',
    kind: 'straight',
    from: { x: -90, z: 0 },
    to: { x: 90, z: 0 },
    width: 11,
    sidewalks: true,
    traffic: true,
  },
  {
    id: 'homebend-curve',
    tier: 'local',
    kind: 'bezier',
    points: [
      { x: -30, z: 30 },
      { x: -42, z: 38 },
      { x: -46, z: 24 },
    ],
    width: 8,
    sidewalks: true,
    traffic: false,
  },
];
```

Implementation rule:

- `ROAD.hz/vx` remains supported.
- `ROAD_SEGMENTS` gets added later.
- Builders render both.
- Placement rules must learn both road types before angled/curved roads become active.

### Traffic control plan

Current town uses five lighted intersections and four stop signs. Keep that logic, but make it more expressive:

| Location | Control | Reason |
|---|---|---|
| Center Main/Centre | Traffic light | Main tutorial crossing |
| Main x west ring | Traffic light | Block Supply and gas traffic |
| Main x east ring | Traffic light | Gym and Worktower traffic |
| Centre x north ring | Traffic light | Auto Row and school/civic flow |
| Centre x south ring | Traffic light | Residential and park flow |
| Four ring corners | Stop signs | Slow local turns |
| School frontage | Crossing sign/speed bump | Kid-world identity |
| Gas forecourt driveway | Yield/painted arrows | Prevent chaos at pumps |

---

## 5. Full world map v1

Use the existing `worldMapPlan.js` layout as the first macro-world skeleton. Do not move origins unless a full migration is planned.

```txt
                         Hollywood / Fame
                              (0,-1800)
                                  |
                           Casino Strip
                              (0,-1200)
                                  |
                           Fishing Harbor
                               (0,-600)
                                  |
Starter Town (0,0)  ----  Rich Hills (700,0)
                                  |
                             Tech City
                             (700,-600)
                                  |
                         Dungeon Outskirts
                            (1400,-600)
                                  |
                            Obby Canyon
                            (1400,-1200)
```

Note: the diagram is conceptual. Existing data places Obby Canyon north of Dungeon Outskirts by z coordinate, but the intended traversal should feel like a trail from the dungeon edge into a canyon challenge zone.

### Road connections

| Connection | Road type | Feel | Unlock logic |
|---|---|---|---|
| Starter Town to Fishing Harbor | highway | fast northern highway | open early |
| Starter Town to Rich Hills | main road | east suburban arterial | open early or money/status gated |
| Rich Hills to Tech City | tunnel | clean hillside tunnel | unlock after Rich Hills intro |
| Fishing Harbor to Casino Strip | bridge | coast bridge/boardwalk approach | unlock after harbor intro |
| Tech City to Dungeon Outskirts | dirt/back road | tech edge into wilderness | unlock after Tech intro |
| Dungeon Outskirts to Obby Canyon | dirt trail | rugged canyon trail | unlock after dungeon intro |
| Casino Strip to Hollywood/Fame | special strip | neon boulevard/studio road | unlock after casino intro |

---

## 6. Town-by-town blueprint

## Starter Town

Theme: everyday kid city, home base, tutorial sandbox.  
Shape: compact urban grid with ring road.  
Primary mood: small city with personality, not sterile test blocks.

Visual anchors:

- Red/yellow Chicken Spot.
- Blue/glass Frostbox.
- Green Kicks & Fits.
- Blue police station with cruiser lot.
- Tan home block.
- 6twelve gas canopy and pumps.

Core loops:

- Walk around, collect gems, talk to NPCs.
- Buy chicken, sit and eat chicken, work a kitchen shift.
- Sleep, change clothes, use safe, do hairline/clippers minigame.
- Train at gym.
- Buy gear/weapons at Block Supply.
- Buy cars at dealership.
- Refuel car at gas station.
- Clean up trash for money.
- Obey or break rules, police/wanted system responds.

World design tasks:

1. Normalize gas/market/diner into map data.
2. Add Starter Town minimap labels.
3. Add road-name signs and neighborhood signs.
4. Add residential props around home.
5. Add school-zone road dressing.
6. Add garage/service props around City Garage.
7. Add one decorative skyline layer beyond the current ring.

## Fishing Harbor

Theme: coast, docks, seafood, working water.  
Shape: road descends from highway into a crescent harbor. Pier/boardwalk runs east-west.  
Primary mood: relaxed grind with salty air, gulls, crates, wet planks, boat fuel.

Road layout:

```txt
Highway gate from Starter enters from south.
Main Harbor Road bends toward the docks.
Pier Road is slow/special, pedestrian-heavy.
Service Alley runs behind seafood market and bait shop.
Boat ramp connects to water gameplay.
```

Key locations:

| Location | Purpose |
|---|---|
| Bait & Tackle | Buy rods, bait, permits |
| Seafood Market | Sell fish, price swings |
| Boat Rental | Rent/upgrade boats later |
| Dockside Diner | Food/rest/social NPCs |
| Harbor Master | Permit/rules/missions |
| Fuel Dock | Boat fuel and repair |

Minigames:

- Cast & Reel.
- Rare fish transform.
- Crab traps.
- Boat route deliveries later.

Signature landmarks:

- Big pier sign.
- Fish statue or giant hook sculpture.
- Lighthouse/watchtower.
- Warehouse crates.

Implementation notes:

- Needs water plane with safe boundary.
- Boardwalk props should be non-blocking unless clearly solid.
- Fishing spots should be marker zones, not random prompts.

## Rich Hills

Theme: wealthy hillside estates, country club, marina, luxury.  
Shape: east of Starter Town, rolling roads and gated loops.  
Primary mood: expensive, polished, slightly intimidating.

Road layout:

```txt
Starter Main Road enters west gate.
Hillside Boulevard climbs in switchbacks.
Estate Loops branch off into cul-de-sacs.
Country Club Drive loops around golf/clubhouse.
Marina Road drops toward water.
Tunnel Gate leads to Tech City.
```

Key locations:

| Location | Purpose |
|---|---|
| Luxury Cars | High-end vehicles |
| Real Estate Office | Property ownership |
| Designer Fashion | Expensive clothing |
| Country Club | Golf, status, NPCs |
| Private Clinic | Premium recovery |
| Marina | Yacht run, future boat storage |

Minigames:

- Golf.
- Yacht run.
- Car show judging.
- Valet/concierge errands.

Signature landmarks:

- Gated arch.
- Hilltop mansions.
- Country club green.
- Gold-trim signs.

Implementation notes:

- Requires curved roads or staged straight segments.
- Private-security zones should increase heat/status consequence without feeling unfair.
- Property plots should be data-marked from day one.

## Tech City

Theme: futuristic downtown, startups, labs, electric transit.  
Shape: dense grid with taller skyline and elevated accents.  
Primary mood: neon-blue, smart, clean, fast.

Road layout:

```txt
Tunnel enters west side.
Central Circuit loops around transit hub.
Lab Row runs north-south.
Drone Course floats above/around rooftops.
Service alleys behind tech shops.
```

Key locations:

| Location | Purpose |
|---|---|
| Electronics Store | Gadgets and upgrades |
| Drone Shop | Drone gear/minigames |
| Gadget Lab | Hacking/crafting jobs |
| Co-working Space | Coding contracts |
| Transit Hub | Fast travel unlock |
| Charging Station | Electric vehicle support later |

Minigames:

- Coding/logic puzzle.
- Drone piloting.
- Hacking timing.

Signature landmarks:

- Transit station glow.
- Tall glass towers.
- Drone hoops/rings.
- Animated billboards with original fake brands.

Implementation notes:

- Keep cybercrime risk abstract and kid-safe.
- Hacking should be puzzle/sequence gameplay, not real-world intrusion instructions.
- Best first use of expanded map UI and route hints.

## Casino Strip

Theme: neon strip, arcades, hotels, games, big money swings.  
Shape: one iconic boulevard with casinos on both sides.  
Primary mood: bright, loud, expensive, controlled chaos.

Road layout:

```txt
Bridge from Fishing Harbor lands at south strip gate.
Main Strip is a straight special road with low speed.
Service Road runs behind casinos.
Hotel Loop circles the grand hotel.
Studio Boulevard eventually connects to Hollywood/Fame.
```

Key locations:

| Location | Purpose |
|---|---|
| Main Casino | Slots, blackjack, roulette |
| Arcade | Tickets, kid-safe games |
| Pawn Shop | Sell items, risk economy |
| Luxury Boutique | Expensive cosmetics |
| Grand Hotel | Rest/save/social hub |
| Bank/ATM | Cash/chips management |

Minigames:

- Slots.
- Blackjack.
- Roulette.
- Prize wheel.
- Arcade cabinets.

Signature landmarks:

- Neon welcome arch.
- Giant prize wheel sign.
- Hotel tower.
- Flashy crosswalks.

Implementation notes:

- Gambling must be stylized and fictionalized for kid safety.
- Use chips or tickets as internal game currency if needed.
- Strong daily cooldowns and house-edge explanations keep economy sane.

## Hollywood / Fame

Theme: studios, red carpets, music, dance, acting, fame economy.  
Shape: boulevard plus studio lots/backlots.  
Primary mood: aspirational, dramatic, funny, cosmetic-heavy.

Road layout:

```txt
Strip Road enters from Casino.
Fame Boulevard runs to studio gates.
Backlot Loop wraps around sound stages.
Red Carpet Walk is pedestrian/special only.
```

Key locations:

| Location | Purpose |
|---|---|
| Talent Agency | Fame missions |
| Studio | Auditions and rhythm games |
| Music Store | Instruments, dance/music props |
| Salon | Hair/beauty upgrades |
| Wardrobe Shop | Fame cosmetics |
| Talk Show Stage | Talk-show timing minigame |

Minigames:

- Rhythm audition.
- Dance battle.
- Talk show timing.
- Photo-shoot timing later.

Signature landmarks:

- Studio gate.
- Red carpet.
- Spotlight beams.
- Billboard with player/NPC posters later.

Implementation notes:

- Fame should be a town-specific reputation/currency.
- Paparazzi/scandal meter should be playful, not mean or adult.
- Best town for outfits, emotes, dances, and social NPCs.

## Dungeon Outskirts

Theme: ruins, wilderness edge, caves, monsters, loot.  
Shape: small outpost plus dungeon entrance.  
Primary mood: risky, darker, adventurous, not horror-gory.

Road layout:

```txt
Dirt road from Tech City enters western checkpoint.
Outpost Road loops around shops and healer.
Ruin Trail leads to dungeon entrance.
Canyon Trail branches toward Obby Canyon.
```

Key locations:

| Location | Purpose |
|---|---|
| Adventurer Supply | Gear and consumables |
| Blacksmith | Weapon upgrades |
| Potions | Healing/boosts |
| Healer | Recovery |
| Stash | Storage |
| Shrine | Checkpoint/respawn |
| Dungeon Gate | Dungeon crawl entry |

Minigames:

- Dungeon crawl.
- Boss fight.
- Trap/key room puzzles.

Signature landmarks:

- Stone gate.
- Glowing cave mouth.
- Broken statues.
- Torch trails.

Implementation notes:

- No police here. Danger is PvE.
- Downed player should respawn at shrine with a fair penalty.
- Loot must route back into economy without inflating cash too hard.

## Obby Canyon

Theme: colorful canyon, platform courses, checkpoint towers.  
Shape: vertical and looped rather than city-grid.  
Primary mood: skill challenge, bright, replayable.

Road layout:

```txt
Dirt trail arrives from Dungeon Outskirts.
Canyon Base Camp has stores and leaderboard.
Checkpoint Trail leads to obby towers.
Course paths are not roads, they are platforms.
```

Key locations:

| Location | Purpose |
|---|---|
| Cosmetic Shop | Obby rewards and skins |
| Checkpoint Pass Booth | Paid shortcuts or save spots |
| Leaderboard Board | Time trial scores |
| Respawn Beacon | Fall reset |
| Course Gates | Difficulty tiers |

Minigames:

- Obby course.
- Time trial.
- No-fall challenge later.

Signature landmarks:

- Giant course arch.
- Floating platforms.
- Canyon bridges.
- Colored checkpoint beams.

Implementation notes:

- Needs strict collision and respawn testing.
- Best built as a separate arena/district, not mixed with traffic.
- Vehicles should probably be blocked past base camp.

---

## 7. Location-to-minigame placement

| Minigame | First location | World reason |
|---|---|---|
| Chicken eating | Chicken Spot | Food/hunger/fun loop |
| Food shift | Chicken Spot kitchen | Early money job |
| Hairline/clippers | Home bathroom mirror | Hygiene/customization |
| Gym training | Iron City Gym | Fitness/stat progression |
| Driving road test | Auto Row or Garage | Teaches vehicle control |
| Trash cleanup | Starter storefronts/dumpster | Early money and visible city cleanup |
| Fishing | Fishing Harbor pier | Travel unlock and chill grind |
| Crab traps | Fishing Harbor dock edge | Puzzle/job variant |
| Golf | Rich Hills country club | Wealth/status gameplay |
| Yacht run | Rich Hills marina | Vehicle variety |
| Coding puzzle | Tech City co-working | Skill pay/smarts |
| Drone pilot | Tech City drone course | New movement challenge |
| Slots/cards/roulette | Casino Strip casino floor | Money sink/spike |
| Arcade | Casino Strip arcade | Safer ticket economy |
| Rhythm audition | Hollywood studio | Fame progression |
| Dance battle | Hollywood stage/plaza | Social/fun/fame |
| Dungeon crawl | Dungeon Gate | Combat/loot |
| Boss fight | Dungeon deep room | High-risk reward |
| Obby course | Obby Canyon gate | Platform challenge |
| Time trial | Obby Canyon course | Repeatable skill loop |

---

## 8. Visual style guide

### Starter Town

Palette:

```txt
Grass/ground: #5b6b52, #3f7140
Road:         #2a2a2e, #3a3d42
Sidewalk:     #9a9aa0
Accent:       #c8a24a
Sky:          #9fc3e8
```

Textures:

- Low-poly but not empty.
- Procedural asphalt speckles.
- Canvas signs for readability.
- Strong storefront colors.
- Props grouped by purpose, not random scatter.

### Future town silhouettes

| Town | Silhouette |
|---|---|
| Starter Town | small colorful storefronts, parks, streetlights |
| Fishing Harbor | piers, water, boats, crates, lighthouse |
| Rich Hills | gates, mansions, hills, gold/cream signage |
| Tech City | glass towers, blue neon, transit hub, drone rings |
| Casino Strip | neon arches, hotel tower, glowing signs |
| Hollywood/Fame | studio gates, spotlights, red carpet, stage facades |
| Dungeon Outskirts | ruins, torches, cave gate, dark terrain |
| Obby Canyon | vertical platforms, colored beams, canyon cliffs |

---

## 9. Integration sequence

### Pass 1: Starter Town truth cleanup

Goal: one coherent source of truth for Starter Town world landmarks.

Tasks:

1. Add gas station, mini-market, and diner to a clear map-data layer.
2. Decide whether they are `LANDMARKS`, `FEATURES`, or `WORLD_BUILDINGS`.
3. Keep gas station procedural until the GLB is split into exterior/interior pieces.
4. Fix `PLACEMENT_RULES.gas_pump` so it matches the actual gas station forecourt.
5. Add minimap markers for gas, market, diner, school, home, garage, police.
6. Add a small `docs/STARTER_TOWN_MAP.md` with current coordinates after cleanup.

### Pass 2: Starter Town dressing

Goal: make Starter Town feel like neighborhoods, not a geometry test.

Tasks:

1. Road-name signs.
2. Neighborhood signs.
3. School zone striping.
4. Residential props around home.
5. Garage props and parking lines.
6. Gas forecourt signage and driveway arrows.
7. Benches/bins/bike racks outside key stores.
8. Improve park plaza identity.

### Pass 3: Starter Town expansion

Goal: expand the tutorial city without breaking existing locations.

Tasks:

1. Add an outer decorative road layer beyond the current ring.
2. Add non-enterable homes and storefronts as backdrop.
3. Create room for future laundromat/community center/library.
4. Add a test-drive loop north of Auto Row.
5. Add a delivery route loop for early missions.

### Pass 4: Road segment system

Goal: support curves, angled roads, highways, bridges, tunnels, dirt trails.

Tasks:

1. Add `ROAD_SEGMENTS` as optional data.
2. Update road renderer to draw both grid roads and segments.
3. Update placement rules for segment-aware road clearance.
4. Update traffic routes to snap to segment lanes.
5. Keep existing grid behavior unchanged until segment roads are tested.

### Pass 5: First new playable town

Recommended first expansion: Fishing Harbor.

Reason:

- It gives the world a dramatically different visual flavor.
- Fishing minigame is lower-risk than combat/casino/economy-heavy systems.
- It can teach travel, permits, selling, and town-specific economy.

Tasks:

1. Create `src/config/districts/fishingHarborMapConfig.js`.
2. Add water plane and dock geometry.
3. Add Bait & Tackle, Seafood Market, Dockside Diner, Harbor Master.
4. Add fishing spot interaction zones.
5. Add basic travel gate from Starter Town.
6. Keep fast travel locked until the player visits once.

---

## 10. Agent handoff checklist

Before asking an agent to build a town or district, provide this checklist.

```txt
Town/district name:
Playable now or data-only:
Local map config path:
Origin:
Road types needed:
Landmarks:
Enterable interiors:
Decor-only features:
Minigames:
NPCs:
Traffic behavior:
Pedestrian routes:
Minimap markers:
Asset slots/models:
Fallback plan:
Collision risks:
No-fake-prompt check:
Performance budget:
```

For Starter Town specifically:

```txt
Current runtime city source: src/config/mapConfig.js
Current world renderer: src/world.js
Current gas station special-case: src/main.js buildProceduralGasStation()
Current GLB world landmark loader: src/worldBuildings.js
Current placement rules: src/config/placementRules.js
Current traffic controls: src/config/mapConfig.js INTERSECTIONS + src/traffic.js
Current interiors: src/interiors.js
Current minimap: src/minimap.js
```

---

## 11. Non-negotiable next move

The next practical world-design task is not adding another town yet. The next move is to clean up Starter Town's source-of-truth problem.

Priority order:

1. Make gas station, mini-market, and diner represented consistently in map data.
2. Correct gas pump/forecourt placement rules.
3. Add map labels/markers for all active services.
4. Add neighborhood dressing so Starter Town feels intentional.
5. Then start Fishing Harbor as the first second-town prototype.

Do this in that order. Otherwise, the world will grow like a junk drawer with traffic lights.