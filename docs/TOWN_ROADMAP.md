# Town Roadmap

Per-town content design for **Zaylin's World**. Starter Town is **one district of
a larger world** (see [WORLD_MAP_DESIGN.md](WORLD_MAP_DESIGN.md),
[ZTA_WORLD_BLUEPRINT.md](ZTA_WORLD_BLUEPRINT.md), and
[TOWN_SELF_SUSTAINING_SYSTEMS.md](TOWN_SELF_SUSTAINING_SYSTEMS.md)). Each town
below is captured as data in [src/config/townThemes.js](../src/config/townThemes.js)
(theme/palette/services/economy/minigame ids/npc profile ids) — **data only, not
playable code**.

For each town: **theme · purpose · stores · missions · minigames · economy ·
legal/risk · base services.**

Design rules:

- Every town should have at least **3 to 4 specific minigames or repeatable activity loops**.
- Every town should have a police/security presence, buyable housing, a school/training path, local jobs, local skills, and town-specific crime/consequence behavior.
- Each town should be able to sustain itself, while still belonging to the connected world.
- Some loops are classic minigames. Some are town jobs, time trials, dungeon floors, appraisals, races, or service tasks. The point is that each town has its own gameplay vocabulary, not just different buildings.

---

## 1. Starter Town *(playable today)*

- **Theme:** everyday small city — the tutorial home base.
- **Purpose:** learn movement, jobs, money, stats, police, driving.
- **Stores:** Block Supply, Mini-Market, Chicken Spot, Gas Station, Gym, Frostbox,
  Kicks & Fits, Auto Haus.
- **Missions:** intro jobs, trash cleanup, food shifts, basic deliveries, road test.
- **Minigames / activity loops:**
  - **Chicken Eating** — select flats/drums/wings, eat, restore hunger through the real hunger bridge.
  - **Kitchen Shift** — timed food-prep work at Chicken Spot.
  - **Line Up / Clippers** — bathroom mirror timing game for hygiene/style.
  - **Gym Training** — timing reps for fitness.
  - **Road Test** — drive through markers without wrecking/running lights.
  - **Trash Cleanup** — visible litter pickup and dumpster deposit.
  - **Study Sprint** — school memory/timing quiz for smarts.
  - **Gas Pump Timing** — fuel-stop timing task at the gas station.
- **Economy:** low wages, cheap goods; teaches earn→spend loop.
- **Legal/risk:** police with wanted stars, car theft, evasion.
- **Base services:** police station, gym, gas/refuel, food, shops, home.

## 2. Fishing Harbor

- **Theme:** coastal docks, piers, boats, seafood market.
- **Purpose:** relaxed earning loop + the fishing minigame chain.
- **Stores:** bait & tackle, seafood market, boat rental, dockside diner.
- **Missions:** catch quotas, rare-fish hunts, supply runs by boat, market rush orders.
- **Minigames / activity loops:**
  - **Cast & Reel** — established fishing pole cast/reel timing game.
  - **Catch of Legend** — established rare fish → creature/legend transform loop.
  - **Crab Traps** — place/pull traps on correct timing windows.
  - **Seafood Market Rush** — sort, weigh, and pack fish orders under timer.
  - **Boat Buoy Run** — drive boat through buoy rings.
  - **Net Toss** — aim/timing shore-fishing challenge.
- **Economy:** fish value by rarity; market price swings.
- **Legal/risk:** protected waters / fishing permits; poaching fines.
- **Base services:** harbor master, repair shop, fuel dock.

## 3. Dungeon Outskirts

- **Theme:** sparse outpost above ground, deep dungeon below ground.
- **Purpose:** completely different gameplay: dungeon-crawler progression, loot,
  bosses, traps, upgrades, and surface recovery.
- **Surface look:** intentionally bare — dirt lots, a shrine, blacksmith, healer,
  stash, potion stand, and one dominant dungeon gate. The quiet surface tells the
  player the real game is underneath.
- **Stores/services:** adventurer supply, blacksmith, potions, healer, stash/storage,
  checkpoint shrine.
- **Missions:** floor clears, boss gates, fetch relics, rescue quests, rare loot hunts.
- **Minigames / activity loops:**
  - **Floor Dive** — generated dungeon floor: fight, loot, find stairs down.
  - **Key & Door Rooms** — find keys, solve lock patterns, choose risk/reward doors.
  - **Trap Timing** — dodge spikes, tiles, swinging hazards, falling rocks.
  - **Boss Gate** — pattern fights every 5 or 10 floors.
  - **Treasure Appraisal** — identify loot rarity/value before sell/upgrade.
  - **Pet Helper Run** — optional helper pet carries loot or returns items to town.
  - **Potion Craft** — match dungeon ingredients into buffs.
  - **Shrine Blessing** — pick a temporary run modifier before descending.
- **Progression concept:** Floor 1–4 beginner rooms; Floor 5 mini-boss; Floor 6–9
  larger layouts/locked rooms; Floor 10 boss + town upgrade unlock; Floor 11+
  repeatable deeper floors with better loot and harder monsters.
- **Economy:** loot → sell/upgrade; risk-reward dives.
- **Legal/risk:** no police; PvE danger; downed player respawns at shrine with fair penalty.
- **Base services:** healer, stash/storage, checkpoint shrine.

## 4. Obby Canyon

- **Theme:** colorful platforming canyon/sky course.
- **Purpose:** pure skill challenge + cosmetics.
- **Stores:** cosmetic/skin shop, checkpoint passes.
- **Missions:** complete courses, time trials, no-fall runs, moving-platform challenges.
- **Minigames / activity loops:**
  - **Beginner Obby** — checkpoint platforming course.
  - **Time Trial** — beat the clock for bonus rewards.
  - **No-Fall Challenge** — finish without falling for rare cosmetic.
  - **Moving Platform Sprint** — jump across moving platforms.
  - **Lava/Floor Hazard Run** — avoid hazard tiles and reach checkpoints.
  - **Zipline Rings** — steer through rings for score.
- **Economy:** course rewards, cosmetic currency.
- **Legal/risk:** fall = restart at checkpoint; no combat.
- **Base services:** respawn beacons, leaderboard board.

## 5. Casino / Vegas Strip

- **Theme:** neon strip, casinos, arcades, shows.
- **Purpose:** gambling-style entertainment, arcade rewards, hotel jobs, high-variance
  money sink/spike. Keep it fictionalized and kid-safe.
- **Stores:** casinos, arcade, pawn shop, luxury boutique, grand hotel.
- **Missions:** high-roller invites, arcade challenges, hotel jobs, security spotter tasks.
- **Minigames / activity loops:**
  - **Slots** — luck spin with fictional chips.
  - **Blackjack** — simple card decisions using fake chips.
  - **Roulette** — color/number-group betting with controlled payouts.
  - **Prize Wheel** — cooldown spin for prizes/tickets/cash.
  - **Arcade Cabinets** — timing/memory games for tickets.
  - **Hotel Bellhop Rush** — deliver bags to room markers under timer.
  - **Security Spotter** — pattern game to spot fictional rule-breakers.
- **Economy:** high variance; house edge; chips/tickets; possible debt risk if added later.
- **Legal/risk:** cheating → banned/wanted; security response.
- **Base services:** ATM/bank, hotel (save/rest), security.

## 6. Rich Hills

- **Theme:** wealthy hillside estates, marina, country club.
- **Purpose:** aspirational spending + property + status jobs.
- **Stores:** luxury cars, real estate, designer fashion, jewelry.
- **Missions:** concierge errands, gallery/auction jobs, valet, mansion chores.
- **Minigames / activity loops:**
  - **Golf Putt Challenge** — aim/power timing on the country club green.
  - **Yacht Run** — boat race through marina buoys.
  - **Car Show Judging** — present/detail car for score.
  - **Valet Dash** — park NPC cars quickly without damage.
  - **Mansion Chore Run** — timed errands around estates.
  - **Auction Spotter** — memory/pattern game to identify valuable items.
- **Economy:** high prices, property ownership, passive income.
- **Legal/risk:** trespassing/private security; status gating.
- **Base services:** private clinic, valet, estate agent.

## 7. Tech City

- **Theme:** futuristic downtown, startups, labs, transit.
- **Purpose:** modern jobs + coding/automation minigames.
- **Stores:** electronics, drone shop, gadget lab, co-working.
- **Missions:** debug/build contracts, delivery drones, data runs, robot repairs.
- **Minigames / activity loops:**
  - **Debug It** — logic puzzle under timer for cash/smarts.
  - **Drone Run** — fly through rings and avoid obstacles.
  - **Circuit Match** — rotate/connect circuit tiles.
  - **Hack Trace** — kid-safe sequence/timing game with trace bar.
  - **Delivery Drone Dispatch** — route-planning puzzle.
  - **Robot Repair Bench** — match parts and test movement.
- **Economy:** skill-based high pay; gear upgrades.
- **Legal/risk:** corporate security; cybercrime heat only as abstract puzzle consequences.
- **Base services:** clinic, transit hub, charging stations.

## 8. Hollywood / Fame

- **Theme:** studios, red carpets, stages, fame economy.
- **Purpose:** rhythm/performance + reputation progression.
- **Stores:** wardrobe, talent agency, music store, salon.
- **Missions:** auditions, gigs, photo shoots, fan events.
- **Minigames / activity loops:**
  - **Rhythm Audition** — hit beats/arrows to impress the panel.
  - **Dance Battle** — rhythm combo duel against NPC rival.
  - **Talk Show Timing** — time funny answers for fame.
  - **Photo Shoot Pose** — match pose prompts before the flash.
  - **Red Carpet Walk** — wave/pose/route timing challenge.
  - **Music Studio Mix** — layer beats/samples in correct sequence.
- **Economy:** fame currency + cash; sponsorships.
- **Legal/risk:** paparazzi/scandal meter; venue bans.
- **Base services:** agency, studio, glam salon.

---

## Cross-town systems

- **Self-sustaining towns:** every town needs local housing, police/security, school/training, jobs, skills, shops/services, and local consequences. See [TOWN_SELF_SUSTAINING_SYSTEMS.md](TOWN_SELF_SUSTAINING_SYSTEMS.md).
- **Travel:** roads/highways/bridges connect towns (see world map design); fast
  travel unlocks per town.
- **Housing:** one primary residence controls default spawn/rest/storage, but players can later own homes in multiple towns for spawn options, storage, and status.
- **Schools/skills:** each school teaches geographically appropriate skills — Starter basic academics, Hollywood performing arts, Tech STEM, Fishing marine skills, Rich business/status, Dungeon survival, Obby movement.
- **Economy continuity:** one wallet + bank; town-specific currencies (fame,
  casino chips, tickets) convert at hubs only where appropriate.
- **Reputation/legal:** wanted/heat is town-scoped but a global "notoriety" can
  carry consequences. Police/security exists in every town, with faster/stricter response in rich, casino, corporate, school, and restricted areas.
- **NPC depth & missions:** see [NPC_MISSION_SYSTEM.md](NPC_MISSION_SYSTEM.md).
- **Minigame framework:** see [MINIGAME_FRAMEWORK.md](MINIGAME_FRAMEWORK.md).

Every town must ship with an asset plan, interaction plan, UI plan, and fallback
plan before it becomes playable — no exposed placeholder gameplay.