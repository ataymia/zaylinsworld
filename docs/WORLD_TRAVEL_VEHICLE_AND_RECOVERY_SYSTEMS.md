# World Travel, Vehicle, and Recovery Systems

Status: authoritative shared-system blueprint, planning only  
Project: Zaylins Kid World, also called ZTA  
Scope: personal teleporter, discovered travel nodes, call-a-car service, garages, vehicle damage, towing, mechanic shops, snacks, meals, drinks, medical recovery, save-state, and implementation gates

This document defines the connective systems that make ZTA's large world practical without making physical travel meaningless.

The world is deliberately large. Starter Town alone measures 2,000 x 2,000 playable units, and neighboring towns sit thousands of world units apart. Players should physically discover places, learn roads, own vehicles, damage and repair those vehicles, and build a relationship with the map. Convenience systems arrive later as earned progression.

---

## 1. Core philosophy

```txt
Physical travel establishes the world.
Vehicle ownership supports daily life.
The call-a-car service prevents stranded players.
The teleporter rewards late-game TechTown progression.
Food and recovery support needs without replacing clinics or mechanics.
Convenience may reduce repetition, but it may never erase discovery or progression.
```

Non-negotiable rules:

1. The first trip to a normal town must be completed physically.
2. The first trip to Aqualume must follow the Gillyfish and Lighthouse Trench progression path.
3. Teleportation cannot bypass wanted states, missions, dungeon floors, active courses, restricted interiors, or unlock requirements.
4. The teleporter moves the player, not the player's car.
5. Owned vehicles keep their damage, fuel, charge, storage, impound, and repair state.
6. Called vehicles must appear at a legal delivery point rather than materializing inside walls, crowds, water, courses, or restricted zones.
7. Snacks restore hunger and a small amount of health. Meals restore more. Medical items remain the stronger health tool.
8. No convenience system may corrupt saves, duplicate vehicles, duplicate inventory, or strand the player.

---

## 2. GridLink Personal Teleporter

### Official working name

**GridLink Personal Teleporter**

Common player shorthand:

- GridLink
- teleporter
- jump device

GridLink is a premium piece of TechTown consumer technology. It is sold only in TechTown at the **Gadget Forge Mobility Lab**, with supporting display and service kiosks at ByteMart after purchase.

### Purchase rules

```txt
Vendor town: TechTown
Primary vendor: Gadget Forge Mobility Lab
Recommended starting price: 250,000 DreamBucks
Ownership: permanent account/save unlock
Recurring fuel item: none
Cooldown: 180 real-time seconds after a successful teleport
Channel time: 3 seconds
Teleports vehicle: no
```

The exact price may be balance-tested, but it must remain a major aspirational purchase rather than an early tutorial convenience.

### Why it is TechTown-exclusive

GridLink reinforces TechTown's role as the home of advanced systems, smart infrastructure, mobility technology, and expensive high-skill upgrades.

The player must physically reach TechTown before buying it. It cannot appear in a global premium store, Starter Town tutorial shop, random loot table, or paid shortcut.

### Destination rules

GridLink may target only **discovered and synchronized safe nodes**.

A normal town node becomes available when the player:

1. physically enters the town for the first time;
2. reaches its official arrival, transit, civic, or teleporter synchronization point;
3. completes any town-arrival gate required by that location;
4. receives the destination-unlocked confirmation.

Recommended destination nodes:

| Town | GridLink destination |
|---|---|
| Starter Town | Dreamdrop Transit / Civic Arrival Node |
| Fishing Harbor | Harbor Center Transit Stop |
| Rich Hills | Civic Crest RichLine Stop |
| TechTown | GridLine Transit Hub |
| Casino Strip | Strip Transit Terminal |
| Dungeon Outskirts | Outpost Commons Return Shrine |
| Obby Canyon | Base Camp Course Select Plaza |
| Starline City | FameLine Transit Station |
| Aqualume | Moonpool Gateway Terminal |

Owned homes may later become optional secondary destinations after the town node has been synchronized. A home cannot reveal or unlock a town by itself.

### Aqualume protection

Aqualume remains earned.

GridLink can target Aqualume only when all are true:

```txt
hasPermanentGills = true
hasDiscoveredAqualume = true
hasSynchronizedAqualumeMoonpool = true
```

GridLink can never replace:

- catching and consuming the Gillyfish;
- surviving the Lighthouse Trench discovery route;
- reaching Aqualume for the first time;
- synchronizing the Moonpool Gateway.

### Blocked states

GridLink cannot activate while the player is:

- wanted or actively pursued;
- under arrest, being busted, jailed, or transported;
- in active combat or taking recent damage;
- inside a moving vehicle;
- carrying a mission objective that forbids travel;
- inside an active dungeon floor;
- inside an active Obby course;
- inside a restricted interior;
- inside a scripted scene;
- falling, drowning, knocked down, or incapacitated;
- in an unsafe water volume without a valid underwater destination;
- using another interaction, shop, minigame, or dialogue;
- in a location without safe teleport clearance.

The UI must state the exact reason rather than showing a generic failure.

### Activation flow

```txt
Open phone or world map
-> select GridLink
-> choose unlocked destination
-> validate player state and destination state
-> show 3-second channel
-> cancel if player moves, takes damage, enters a blocked state, or manually cancels
-> reserve destination safe spawn
-> save transit intent
-> fade/visual effect
-> move player
-> restore camera and controls
-> verify ground/water state
-> clear transit intent
-> start 180-second cooldown
```

A failed validation or interrupted channel does not start the cooldown.

### Cooldown presentation

The three-minute cooldown must be visible in:

- phone GridLink app;
- world map destination panel;
- quick-action radial if one exists;
- optional wrist-device indicator.

Recommended display:

```txt
GridLink recharging: 02:17
```

Cooldown continues while driving, shopping, working, attending class, or playing ordinary gameplay. Pausing or closing the game must not create duplication or clock exploits. The save system should store either an authoritative remaining duration or timestamp according to the game's time architecture.

### Teleport safety

Destination nodes require:

- safe ground or water placement;
- clear collision radius;
- correct facing direction;
- nearby streaming cells warmed before control returns;
- no vehicle or NPC occupying the arrival pad;
- fallback node if the primary pad fails;
- protection from immediate traffic collision;
- protection from spawning inside a restricted zone.

### Visual identity

GridLink should feel like expensive TechTown hardware.

```txt
Device form: compact wrist module or pocket puck
Primary material: dark graphite metal
Primary light: cyan
Secondary light: violet
Status light: green ready, amber channeling, red blocked
Activation effect: clean geometric rings and a brief pixel-light dissolve
Sound: rising synthetic charge, soft transit snap, destination chime
```

Suggested assets:

```txt
item_gridlink_personal_teleporter_v01.glb
prop_gridlink_vendor_display_v01.glb
prop_gridlink_sync_beacon_a_v01.glb
prop_gridlink_arrival_pad_a_v01.glb
prop_gridlink_service_kiosk_a_v01.glb
fx_gridlink_channel_ring_v01
fx_gridlink_departure_dissolve_v01
fx_gridlink_arrival_dissolve_v01
ui_icon_gridlink.svg
ui_panel_gridlink_destination.svg
ui_meter_gridlink_cooldown.svg
```

---

## 3. Call-a-Car and Vehicle Concierge

### System role

Players may own multiple cars across a world where towns are thousands of units apart. The **Garage Concierge** allows a player to request an owned vehicle from the phone without deleting the meaning of garages, repairs, impound, fuel, or location.

This is the road-vehicle equivalent of calling a stored personal vehicle in a large open-world game.

### Access

The player opens:

```txt
Phone
-> Vehicles
-> My Garage
-> select vehicle
-> Call Vehicle
```

The menu shows:

- vehicle name and thumbnail;
- owning garage;
- current town;
- fuel or charge;
- condition;
- repair status;
- impound status;
- active, stored, delivering, destroyed, disabled, or unavailable state;
- delivery fee if applicable;
- legal delivery point.

### Call eligibility

A vehicle may be called when:

- the player owns it;
- it is stored or eligible for retrieval;
- it is not impounded;
- it is not currently occupied by the player or another authorized user;
- it is not destroyed and awaiting repair;
- it is not already being delivered;
- the player is near a valid road-access point;
- the player is not inside an active dungeon floor, Obby course, restricted interior, cutscene, or arrest state;
- the player is not in an active high-priority police pursuit.

A low wanted level may still block formal garage delivery according to balancing, but an active pursuit always blocks it.

### Delivery behavior

The vehicle does not pop directly on top of the player.

The service must:

1. search for the nearest legal curb, parking lane, driveway, lot, garage entrance, or service pull-off;
2. confirm adequate collision clearance;
3. avoid intersections, sidewalks, crowds, school crossings, railroad-style gates, active mission zones, and restricted property;
4. reserve the location;
5. stream the vehicle and delivery actor or use a short believable off-screen arrival;
6. mark the vehicle as active only after successful placement;
7. provide a map marker and short route to the parked vehicle.

Recommended player message:

```txt
Your vehicle has been delivered nearby.
```

If no safe road position exists, the system must explain why and point the player toward the nearest valid call zone.

### Request limits

Recommended anti-spam rules:

```txt
One active road-vehicle delivery at a time
Short request cooldown after successful delivery or cancellation
No duplicate active instance of the same owned vehicle
No delivery while the previous vehicle state is unresolved
```

The exact short cooldown can be balance-tested. It should prevent rapid vehicle duplication without making ordinary recovery annoying.

### Delivery costs

Suggested model:

- same-town stored vehicle: low or free basic delivery depending garage upgrade;
- cross-town retrieval: meaningful transport fee;
- premium garage membership or home upgrade: reduced delivery fee;
- damaged vehicle: repair or tow cost added;
- impounded vehicle: cannot be called until released;
- destroyed vehicle: must be repaired or reclaimed first.

The teleporter does not waive vehicle delivery fees or move the car with the player.

### Boats, yachts, and submarines

Water vehicles use the same ownership menu but different delivery rules.

| Vehicle type | Valid delivery destination |
|---|---|
| Small boat | public marina, owned slip, boat ramp, or rental/service dock |
| Yacht | compatible deep-water marina or owned yacht berth |
| Sea scooter | Aqualume Bluecore dock or approved underwater station |
| Personal mini-sub | sub dock, Moonpool terminal, or compatible owned property |
| Cargo sub | industrial/deepworks dock only |

Water vehicles cannot appear beside a road. Cars cannot appear in water.

Friendly dolphins, manta routes, and other sea-life partnerships are not treated as garage inventory or disposable summoned vehicles.

### Cross-town garage network

Every vehicle-supporting town may contain:

- public garage or service yard;
- property garage slots;
- mechanic or repair shop;
- fuel or charge station;
- impound or law-storage lot;
- vehicle dealership or specialist vendor where appropriate.

Owned vehicles have a recorded home garage, but may be transferred between compatible garages for a fee or by physically driving them.

### Suggested save state

```js
vehicleOwnership: {
  ownedVehicleIds: [],
  activeVehicleId: null,
  delivery: {
    status: 'idle',
    vehicleId: null,
    destinationNodeId: null,
    requestedAt: null
  },
  vehiclesById: {
    'vehicle-id': {
      modelId: 'car-model-id',
      homeGarageId: 'starter-home-garage',
      currentTownId: 'starter-town',
      status: 'stored',
      fuel: 100,
      charge: null,
      condition: 100,
      cosmeticDamage: 0,
      engineDamage: 0,
      impoundTownId: null,
      repairShopId: null,
      insured: true
    }
  }
}
```

---

## 4. Vehicle Damage, Mechanics, Towing, and Recovery

### Vehicle condition layers

```txt
Cosmetic damage:
- dents
- scratches
- cracked lights
- dirty exterior

Functional damage:
- engine condition
- steering/alignment
- tire condition
- battery/energy system
- body integrity
```

Normal collisions should create graduated damage. One low-speed bump should not total a car. Repeated high-speed impacts, water damage, fire, severe falls, or sustained attacks may disable it.

### Condition states

```txt
healthy
worn
damaged
critical
disabled
destroyed-awaiting-reclaim
impounded
under-repair
```

### Mechanic shop services

Mechanic shops may provide:

- quick repair;
- full repair;
- cosmetic repair;
- cleaning/detailing;
- tire replacement;
- engine repair;
- battery/charge-system repair;
- towing;
- recovery from water or inaccessible terrain;
- performance upgrade later;
- vehicle storage transfer.

### Recovery rules

Personal vehicles should not be permanently deleted by ordinary destruction.

Default rule:

```txt
Destroyed personal vehicle
-> marked unavailable
-> recovery or insurance fee
-> repair timer or mechanic task
-> returned to compatible garage
```

Permanent loss may exist only in a deliberately selected future hard mode, never as an accidental default.

### Impound

Police may impound:

- stolen vehicles;
- personal vehicles used during serious crimes;
- vehicles abandoned during arrest;
- illegally parked vehicles in selected systems;
- vehicles requiring evidence processing.

A vehicle in impound cannot be called. The player must resolve release conditions through fines, case completion, ownership proof, or an authorized mission.

### Towing

The player may call a tow when:

- the vehicle is disabled;
- the vehicle is stuck outside a safe road;
- the vehicle is stranded without fuel or charge;
- the vehicle is in shallow recoverable water;
- the vehicle is not under police evidence hold.

Tow destinations:

- nearest compatible mechanic;
- selected owned garage;
- town impound when legally required;
- marina repair for boats;
- Bluecore repair dock for underwater vehicles.

---

## 5. Food, Snacks, Drinks, and Health Recovery

### Core rule

Food supports both the needs system and light health recovery.

```txt
Snacks restore hunger and a small amount of health.
Meals restore more hunger and more health.
Drinks restore thirst and may support energy.
Medical items restore health without replacing hunger.
Clinics remain the strongest full-recovery service.
```

### Recommended item classes

| Class | Hunger | Health | Thirst | Energy | Use |
|---|---:|---:|---:|---:|---|
| Small snack | 8-15 | 3-6 | 0 | 0-3 | chips, candy, small pastry |
| Hearty snack | 15-25 | 5-10 | 0 | 0-5 | sandwich, protein snack, larger pastry |
| Quick meal | 30-45 | 10-18 | 0-10 | diner plate, fast-food combo |
| Full meal | 50-70 | 15-25 | 5-15 | restaurant or home-cooked meal |
| Basic drink | 0 | 0-3 | 15-30 | 0-5 | water, juice, soda |
| Energy drink | 0 | 0-3 | 10-20 | 10-20 | temporary energy support |
| Medical item | 0 | 20-60 | 0 | 0 | first aid or medicine |

These are initial balancing ranges, not final tuning.

### Consumption rules

- values cannot exceed the player's maximum stat;
- use requires a short animation or progress window;
- taking damage may interrupt longer consumption;
- rapid repeated consumption has a short item-use delay;
- the player cannot duplicate an item by interrupting save/load transitions;
- inventory quantity decreases only after the use transaction commits;
- spoiled, damaged, quest, or contraband items may have separate rules;
- food may be consumed from inventory, restaurant service, vending, home kitchen, or job reward;
- meals may cost more but provide better total value than snack-spamming.

### Combat balance

Snacks are not instant invincibility buttons.

Recommended behavior:

```txt
Small snack: short use, small recovery
Meal: longer use, larger recovery, unsafe during active attack
Medical item: stronger health recovery, separate cooldown or animation
Clinic: reliable full service with cost/time
```

### Town food identity

Each town keeps the same underlying logic with local presentation.

| Town | Food identity examples |
|---|---|
| Starter Town | Chicken Spot meals, Frostbox snacks, 6twelve drinks |
| Fishing Harbor | seafood plates, bait-shop snacks, Dockside Diner meals |
| Rich Hills | club meals, marina plates, premium market snacks |
| TechTown | Pixel Bites, Circuit Grill, ByteMart snacks, VoltFuel drinks |
| Casino Strip | hotel meals, arcade snacks, Strip cafés |
| Dungeon Outskirts | trail rations, stew, potion-adjacent drinks that do not replace food |
| Obby Canyon | checkpoint snacks, water, recovery meals |
| Starline City | studio catering, diner food, café items |
| Aqualume | coral-market foods, sea-crop meals, Bluecore travel snacks |

### Suggested consumable save model

```js
consumables: {
  inventoryByItemId: {},
  activeUse: null,
  lastUseAtByCategory: {},
  discoveredRecipes: [],
  favoriteQuickSlots: []
}
```

---

## 6. Shared UI requirements

### Phone apps

```txt
World Map
GridLink
My Garage
Mechanic & Tow
Food / Inventory
Property
Jobs
Police / Legal status where appropriate
```

### World map integration

The map must distinguish:

- physical route;
- unlocked GridLink node;
- undiscovered town;
- discovered but unsynchronized node;
- destination blocked by mission or law state;
- vehicle delivery point;
- garage;
- mechanic;
- impound;
- road, marina, and sub-compatible call zones.

### Exact failure messages

Avoid:

```txt
Cannot do that.
Unavailable.
Error.
```

Prefer:

```txt
GridLink is recharging for 01:42.
Lose the police pursuit before using GridLink.
Reach Aqualume through the Lighthouse Trench first.
No safe road delivery point is nearby.
This vehicle is currently impounded in Rich Hills.
Your car is under repair at City Garage.
Boats can only be delivered to a compatible dock.
```

---

## 7. Save and transaction safety

Every travel, vehicle, and consumable action must be transactional.

### Teleport transaction

```txt
validate
reserve destination
save transit intent
stream destination
move player
verify placement
clear transit intent
start cooldown
save
```

### Vehicle delivery transaction

```txt
validate ownership and status
reserve legal delivery point
mark delivering
spawn/stream one instance
verify vehicle identity
mark active
clear delivery reservation
save
```

### Consumable transaction

```txt
validate inventory
start use
commit quantity decrement
apply stat changes
save
```

Crash recovery must detect incomplete transactions and choose the safe state rather than duplicating assets.

---

## 8. Forward-looking data keys

Recommended player progression fields:

```js
worldAccess: {
  discoveredTownIds: [],
  synchronizedGridLinkNodeIds: [],
  gridLinkOwned: false,
  gridLinkCooldownEndsAt: null,
  hasPermanentGills: false,
  hasDiscoveredAqualume: false
}
```

Recommended system IDs:

```txt
gridlink-personal-teleporter
gadget-forge-mobility-lab
gridlink-node-starter
gridlink-node-fishing
gridlink-node-rich
gridlink-node-tech
gridlink-node-casino
gridlink-node-dungeon
gridlink-node-obby
gridlink-node-starline
gridlink-node-aqualume
garage-concierge
mechanic-tow-service
```

---

## 9. Implementation phases

### Phase 1: Consumable foundation

- item categories;
- hunger, health, thirst, and energy effects;
- use animation and transaction safety;
- Starter Town snacks/meals/drinks;
- clinic and medical-item distinction.

### Phase 2: Vehicle ownership foundation

- owned vehicle registry;
- garage storage;
- active vehicle uniqueness;
- fuel/charge persistence;
- damage state;
- mechanic repair.

### Phase 3: Call-a-Car

- phone garage UI;
- legal curb/delivery-node search;
- delivery state machine;
- map marker;
- duplicate prevention;
- blocked-state messages.

### Phase 4: Tow, impound, and cross-town garages

- tow service;
- impound state;
- release conditions;
- cross-town transfer;
- boat and sub delivery nodes.

### Phase 5: GridLink infrastructure

- TechTown vendor;
- purchase and save unlock;
- synchronization nodes;
- discovered-destination UI;
- 180-second cooldown;
- safe streaming and spawn;
- restriction validation.

### Phase 6: Advanced travel integration

- owned-home secondary nodes;
- Aqualume Moonpool support;
- district map integration;
- audio/visual polish;
- analytics and balance.

---

## 10. Completion checklist

```txt
[ ] GridLink can only be purchased in TechTown
[ ] GridLink is expensive and permanently owned
[ ] GridLink cooldown is exactly 180 seconds after successful use
[ ] interrupted or blocked teleport does not consume cooldown
[ ] only discovered and synchronized destinations appear
[ ] first physical town visit cannot be skipped
[ ] Gillyfish and Aqualume discovery cannot be bypassed
[ ] wanted, arrest, combat, mission, dungeon, course, and restricted states block teleport
[ ] safe destination reservation prevents bad spawns
[ ] GridLink moves player only
[ ] owned cars can be requested through phone garage
[ ] called vehicles use legal road/parking delivery points
[ ] boats, yachts, scooters, and subs use compatible docks
[ ] vehicle state persists across storage and delivery
[ ] damaged, disabled, destroyed, repaired, and impounded states work
[ ] personal vehicles are recoverable by default rather than permanently deleted
[ ] mechanic and tow services work without duplicating vehicles
[ ] snacks restore hunger plus small health
[ ] meals restore more hunger and health
[ ] drinks and medical items keep distinct roles
[ ] consumable transactions cannot duplicate items
[ ] exact UI failure reasons are shown
[ ] save/load during any transaction resolves safely
```

Final rule:

```txt
The world stays worth driving across.
GridLink makes mastery convenient.
Garage Concierge makes ownership practical.
Food makes daily life legible.
None of them erase geography, consequence, or progression.
```