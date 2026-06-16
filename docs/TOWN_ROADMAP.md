# Town Roadmap

Per-town content design for **Zaylin's World**. Starter Town is **one district of
a larger world** (see [WORLD_MAP_DESIGN.md](WORLD_MAP_DESIGN.md)). Each town below
is captured as data in [src/config/townThemes.js](../src/config/townThemes.js)
(theme/palette/services/economy/minigame ids/npc profile ids) — **data only, not
playable code**.

For each town: **theme · purpose · stores · missions · minigames · economy ·
legal/risk · base services.**

---

## 1. Starter Town *(playable today)*

- **Theme:** everyday small city — the tutorial home base.
- **Purpose:** learn movement, jobs, money, stats, police, driving.
- **Stores:** Block Supply (weapons), Mini-Market, Chicken Spot (food + job),
  Gas Station, Gym, Frostbox (jewelry).
- **Missions:** intro jobs (trash cleanup, food shifts), basic deliveries.
- **Minigames:** hairline/clippers, gym training, food-prep shift, driving.
- **Economy:** low wages, cheap goods; teaches earn→spend loop.
- **Legal/risk:** police with wanted stars, car theft, evasion.
- **Base services:** police station, gym, gas/refuel, food, shops, home.

## 2. Fishing Harbor

- **Theme:** coastal docks, piers, boats, seafood market.
- **Purpose:** relaxed earning loop + the fishing minigame chain.
- **Stores:** bait & tackle, seafood market, boat rental, dockside diner.
- **Missions:** catch quotas, rare-fish hunts, supply runs by boat.
- **Minigames:** **fishing pole** cast/reel, fish→creature transform, crab traps.
- **Economy:** fish value by rarity; market price swings.
- **Legal/risk:** protected waters / fishing permits; poaching fines.
- **Base services:** harbor master, repair shop, fuel dock.

## 3. Dungeon Outskirts

- **Theme:** dark ruins/caverns on the world edge.
- **Purpose:** combat + loot progression.
- **Stores:** adventurer supply, blacksmith (weapon upgrades), potions.
- **Missions:** clear-the-dungeon chains, boss hunts, rescue quests.
- **Minigames:** **dungeon crawl** (rooms/keys/traps), boss timing fights.
- **Economy:** loot → sell/upgrade; risk-reward dives.
- **Legal/risk:** PvE danger (downed → respawn), no police.
- **Base services:** healer, stash/storage, checkpoint shrine.

## 4. Obby Canyon

- **Theme:** colorful platforming canyon/sky course.
- **Purpose:** pure skill challenge + cosmetics.
- **Stores:** cosmetic/skin shop, checkpoint passes.
- **Missions:** complete courses, time trials, no-fall runs.
- **Minigames:** **obby** parkour stages with checkpoints.
- **Economy:** course rewards, cosmetic currency.
- **Legal/risk:** fall = restart at checkpoint; no combat.
- **Base services:** respawn beacons, leaderboard board.

## 5. Casino / Vegas Strip

- **Theme:** neon strip, casinos, arcades, shows.
- **Purpose:** gambling + entertainment money sink/spike.
- **Stores:** casinos, arcade, pawn shop, luxury boutique.
- **Missions:** high-roller invites, heist-lite chains, debt collection.
- **Minigames:** **slots, blackjack, roulette, arcade cabinets**, prize wheel.
- **Economy:** high variance; house edge; loan sharks.
- **Legal/risk:** cheating → banned/wanted; loan debt risk.
- **Base services:** ATM/bank, hotel (save/rest), security.

## 6. Rich Hills

- **Theme:** wealthy hillside estates, marina, country club.
- **Purpose:** aspirational spending + property.
- **Stores:** luxury cars, real estate, designer fashion, jewelry.
- **Missions:** concierge errands, gallery/auction jobs, valet.
- **Minigames:** golf, yacht run, car-show judging.
- **Economy:** high prices, property ownership, passive income.
- **Legal/risk:** trespassing/private security; status gating.
- **Base services:** private clinic, valet, estate agent.

## 7. Tech City

- **Theme:** futuristic downtown, startups, labs, transit.
- **Purpose:** modern jobs + coding/automation minigames.
- **Stores:** electronics, drone shop, gadget lab, co-working.
- **Missions:** debug/build contracts, delivery drones, data runs.
- **Minigames:** **coding/logic puzzles**, drone piloting, hacking timing.
- **Economy:** skill-based high pay; gear upgrades.
- **Legal/risk:** corporate security; cybercrime heat.
- **Base services:** clinic, transit hub, charging stations.

## 8. Hollywood / Fame

- **Theme:** studios, red carpets, stages, fame economy.
- **Purpose:** rhythm/performance + reputation progression.
- **Stores:** wardrobe, talent agency, music store, salon.
- **Missions:** auditions, gigs, photo shoots, fan events.
- **Minigames:** **rhythm/audition**, dance battles, talk-show timing.
- **Economy:** fame currency + cash; sponsorships.
- **Legal/risk:** paparazzi/scandal meter; venue bans.
- **Base services:** agency, studio, glam salon.

---

## Cross-town systems

- **Travel:** roads/highways/bridges connect towns (see world map design); fast
  travel unlocks per town.
- **Economy continuity:** one wallet + bank; town-specific currencies (fame,
  casino chips) convert at hubs.
- **Reputation/legal:** wanted/heat is town-scoped but a global "notoriety" can
  carry consequences.
- **NPC depth & missions:** see [NPC_MISSION_SYSTEM.md](NPC_MISSION_SYSTEM.md).
- **Minigame framework:** see [MINIGAME_FRAMEWORK.md](MINIGAME_FRAMEWORK.md).

Every town must ship with an asset plan, interaction plan, UI plan, and fallback
plan before it becomes playable — no exposed placeholder gameplay.
