# Town Roadmap

Per-town content design for **Zaylins World**. The world contains connected cities/towns; each city contains districts and neighborhoods.

Status: world-design foundation complete; implementation remains

## Master planning references

- [WORLD_DESIGN_HANDOFF.md](WORLD_DESIGN_HANDOFF.md)
- [WORLD_BLUEPRINT_INDEX.md](WORLD_BLUEPRINT_INDEX.md)
- [CITY_BLUEPRINT_STANDARD.md](CITY_BLUEPRINT_STANDARD.md)
- [WORLD_VISUAL_REFERENCE_BIBLE.md](WORLD_VISUAL_REFERENCE_BIBLE.md)
- [WORLD_MAP_DESIGN.md](WORLD_MAP_DESIGN.md)
- [LARGE_WORLD_SCALE_BLUEPRINT.md](LARGE_WORLD_SCALE_BLUEPRINT.md)
- [WORLD_TRAVEL_VEHICLE_AND_RECOVERY_SYSTEMS.md](WORLD_TRAVEL_VEHICLE_AND_RECOVERY_SYSTEMS.md)
- [POLICE_CAREER_SYSTEM.md](POLICE_CAREER_SYSTEM.md)
- [WATER_ECOSYSTEM_BLUEPRINT.md](WATER_ECOSYSTEM_BLUEPRINT.md)
- [TOWN_SELF_SUSTAINING_SYSTEMS.md](TOWN_SELF_SUSTAINING_SYSTEMS.md)
- [ZTA_WORLD_BLUEPRINT.md](ZTA_WORLD_BLUEPRINT.md)
- [MINIGAME_FRAMEWORK.md](MINIGAME_FRAMEWORK.md)

Town blueprints:

- [STARTER_TOWN_BLUEPRINT.md](STARTER_TOWN_BLUEPRINT.md)
- [STARTER_TOWN_IMPLEMENTATION_CHECKLIST.md](STARTER_TOWN_IMPLEMENTATION_CHECKLIST.md)
- [STARTER_TOWN_SCALE_AND_POLICE_CHECKLIST.md](STARTER_TOWN_SCALE_AND_POLICE_CHECKLIST.md)
- [TECH_TOWN_BLUEPRINT.md](TECH_TOWN_BLUEPRINT.md)
- [STARLINE_CITY_BLUEPRINT.md](STARLINE_CITY_BLUEPRINT.md)
- [FISHING_HARBOR_BLUEPRINT.md](FISHING_HARBOR_BLUEPRINT.md)
- [DUNGEON_OUTSKIRTS_BLUEPRINT.md](DUNGEON_OUTSKIRTS_BLUEPRINT.md)
- [OBBY_CANYON_BLUEPRINT.md](OBBY_CANYON_BLUEPRINT.md)
- [RICH_HILLS_BLUEPRINT.md](RICH_HILLS_BLUEPRINT.md)
- [CASINO_STRIP_BLUEPRINT.md](CASINO_STRIP_BLUEPRINT.md)
- [AQUALUME_BLUEPRINT.md](AQUALUME_BLUEPRINT.md)

Forward-looking planning data:

- [src/config/worldMapPlan.js](../src/config/worldMapPlan.js)
- [src/config/townThemes.js](../src/config/townThemes.js)
- [src/config/worldSystemsPlan.js](../src/config/worldSystemsPlan.js)

These data files are planning contracts and are not necessarily wired into gameplay yet.

---

## Design rules

- Starter Town alone occupies a 2,000 x 2,000 playable footprint.
- Town centers are separated by thousands of units, with multi-minute physical travel corridors.
- Every town contains multiple districts with distinct geography, routes, population, services, and gameplay identity.
- Every town supports housing, school/training, jobs, food, recovery, fuel/charging where appropriate, sanitation, transportation, law, crime consequences, and a reason to revisit.
- Every town has at least 3 to 4 specific minigames or repeatable loops.
- Every town has a local law-career equivalent.
- A conviction in a town permanently closes that town's police/law career. Uncaught crime does not create an official record. Reform may open a different jurisdiction.
- Water is a shared traversable ecosystem, not decorative map scenery.
- Aqualume is earned through the Gillyfish progression path and may never become a premium-store unlock.
- The GridLink Personal Teleporter is sold only in TechTown, costs a major aspirational amount, and has a locked 180-second cooldown after successful use.
- GridLink can target only physically discovered and synchronized safe nodes. It cannot reveal towns or bypass Gillyfish, Aqualume, mission, dungeon, course, police, combat, or restricted-area progression.
- GridLink moves the player only. Vehicles remain part of the ownership, garage, mechanic, tow, fuel, charge, repair, and impound systems.
- Players may call an eligible owned vehicle through Garage Concierge. Delivery must use a safe legal road, parking, marina, or sub-dock location.
- Snacks restore hunger plus small health. Meals restore more. Drinks primarily restore thirst/energy. Medical items and clinics remain stronger health tools.
- The approved concept images are implementation references. Their district massing, skyline, roads, landmarks, support infrastructure, and atmosphere must be preserved through [WORLD_VISUAL_REFERENCE_BIBLE.md](WORLD_VISUAL_REFERENCE_BIBLE.md).

---

## 1. Starter Town

- **Status:** playable foundation; major expansion planned.
- **Deeper specs:** [STARTER_TOWN_BLUEPRINT.md](STARTER_TOWN_BLUEPRINT.md), [LARGE_WORLD_SCALE_BLUEPRINT.md](LARGE_WORLD_SCALE_BLUEPRINT.md), and Starter implementation checklists.
- **Theme:** large everyday city and tutorial home base, with Dreamdrop District as its historic core.
- **Scale:** 2,000 x 2,000 playable units inside an approximately 2,400 x 2,400 terrain/streaming envelope.
- **Districts:** Dreamdrop District, Market Mile, Northworks/Auto Row, Scholar's Quarter, Civic Heights, Eastgate Corridor, Parkside Commons, Willowbend Residential, and Westside Blocks.
- **Road identity:** Dreamdrop Beltway, expressway/highway ramps, parkways, arterials, hills, roundabouts, school zones, local streets, service roads, and alleys.
- **Purpose:** teach movement, needs, jobs, money, school, skills, police employment, optional crime, driving, vehicle ownership, property ownership, city services, and travel.
- **Housing:** Zaylins Home teaches deeds, primary residence, storage, rest, wardrobe, hygiene, garage access, and upgrades.
- **School:** Zaylins Prep teaches foundational math, reading/memory, computers, civics, health, career basics, driving, physical education, arts/rhythm, and geography.
- **Jobs:** Chicken Spot, WorkTower, garage, sanitation, retail, fuel, school aide, gym assistant, Auto Haus lot attendant, courier, and police officer.
- **Police career:** clean official local record, academy prerequisites, cadet work, patrol, traffic, dispatch, stolen-vehicle recovery, ranks, and discipline.
- **Tutorial:** legal, risky, or observer orientation. Crime is optional rather than mandatory.
- **Visual promise:** sprawling district city, historic downtown, civic hill, school campus, auto district, large park, deep residential massing, Beltway, difficult roads, and purposeful filler.

## 2. Fishing Harbor

- **Theme:** working coastal town with lighthouse, docks, boats, seafood market, village, academy, patrol, and protected water.
- **Purpose:** fishing, boating, marine education, market trading, harbor work, rare catches, and Aqualume discovery.
- **Activity loops:** Cast & Reel, Catch of Legend, Crab Traps, Seafood Market Rush, Boat Buoy Run, Net Toss, repair, navigation, rescue, and market work.
- **Catches:** fish, power fish, junk, cash, gear, loot, quest items, contraband/weapon cases, and Gillyfish.
- **Gillyfish:** pity-protected permanent-gills unlock. Duplicates may be stored, sold, traded, or gifted.
- **Housing:** dock rooms, village apartments, cottages, marina condos, houseboats, and waterfront homes.
- **School:** Harbor Academy.
- **Law/career:** Harbor Patrol.
- **Fuel:** TideFuel for cars, EVs, and boats.
- **Visual promise:** working marina, lighthouse, market, bait shop, diner, patrol dock, academy, TideFuel, nets, traps, boat lanes, hidden coves, rare-catch waters, cottages, and village apartments.

## 3. Dungeon Outskirts

- **Theme:** sparse surface outpost above a large descending dungeon world.
- **Purpose:** preparation, floor dives, combat, traps, puzzles, loot, bosses, crafting, appraisal, recovery, and return progression.
- **Housing:** guild bunks, outpost rooms, cabins, workshop lofts, ridge cabins, and shrine cottages.
- **School:** Adventurer Academy.
- **Law/career:** Warden/Ranger.
- **Fuel:** Wayfarer Fuel & Supply.
- **Visual promise:** colossal descending gate, negative space, academy, guild, blacksmith, potions, shrine, healer, stash, warden, cabins, workshops, caravans, and glowing underground depth.

## 4. Obby Canyon

- **Theme:** self-sustaining canyon base connected to authored vertical platform courses.
- **Purpose:** movement mastery, checkpoints, time trials, rescue, course work, and cosmetic progression.
- **Housing:** camp bunks, academy dorms, apartments, cabins, coach lofts, cliff lodge units, and summit homes.
- **School:** Momentum Academy.
- **Law/career:** Canyon Ranger & Safety.
- **Fuel:** Checkpoint Fuel & Supply.
- **Visual promise:** drivable base town, academy, ranger, rescue, housing, fuel, lookout paths, waterfall, summit destination, and enormous color-coded foot-only challenge towers.

## 5. Casino Strip

- **Theme:** fictional neon entertainment municipality with game halls, arcade, hotels, shows, academy, housing, and backstage logistics.
- **Purpose:** luck games, probability education, arcade skill, hospitality, hotel work, entertainment, and spectacle.
- **Housing:** worker apartments, dorms, neon lofts, townhomes, hotel residences, condos, and penthouses.
- **School:** BrightHouse Hospitality & Games Institute.
- **Law/career:** Strip Police; venue security remains separate.
- **Fuel:** LuckyLine Fuel & Market.
- **Safety:** no real-money conversion, adult vice framing, or predatory debt.
- **Visual promise:** hotel towers, major arena, game halls, arcade district, prize pavilion, police, academy, parking garage, restaurants, valet, worker housing, LuckyLine, and visible service roads/backstage warehouses.

## 6. Rich Hills

- **Theme:** hillside estates, golf, luxury retail, civic crest, marina, yachts, service village, and worker economy.
- **Purpose:** property, negotiation, hospitality, luxury vehicles, golf, marina life, yacht ownership, and high-pay service work.
- **Housing:** worker apartments, dorms, townhouses, marina condos, ridge houses, estates, yacht-club residences, and penthouses.
- **School:** Legacy Preparatory Academy.
- **Law/career:** Rich Hills Police; private security remains separate.
- **Fuel:** CrestFuel Motor Club plus marina fuel.
- **Visual promise:** summit estates, switchback roads, country club, civic plaza, academy, police, luxury retail, gated security, marina, yachts, CrestFuel, valet, and fully visible service village.

## 7. TechTown

- **Theme:** neon smart city with startups, labs, transit, drones, electronics, smart housing, and layered security.
- **Purpose:** coding, automation, robotics, drone control, transit, tech jobs, advanced mobility, and restricted-system crime.
- **Housing:** micro units, smart lofts, campus pods, rooftop condos, workshop lofts, and Cloudview premium residences.
- **School:** VoltByte Academy.
- **Law/career:** Metro Security/Police; corporate security remains separate.
- **Fuel:** VoltFuel Station.
- **Unique purchase:** GridLink Personal Teleporter at Gadget Forge Mobility Lab.
- **GridLink rule:** recommended 250,000 DreamBucks, permanent ownership, 180-second cooldown, discovered safe nodes only, player only.
- **Visual promise:** academy, innovation labs, startup hub, GridLine transit, central tech monument, ByteMart, drones, smart homes, Cloudview skyline, security checkpoint, VoltFuel, charge zone, delivery depot, and GridLink visual infrastructure.

## 8. Starline City

- **Theme:** studios, theaters, music, fashion, performing arts, red carpets, backlots, worker housing, and hillside homes.
- **Purpose:** craft, performance, production, style, reputation, and entertainment-city life.
- **Housing:** worker apartments, dorms, trailer units, fashion/music lofts, condos, hillside homes, and penthouses.
- **School:** Premiere Arts Academy.
- **Law/career:** Starline Police; venue/studio security remains separate.
- **Fuel:** StarStop Fuel & Charge.
- **Visual promise:** hillside STARLINE landmark, theater, red carpet, fashion street, nightlife, music venues, academy, studios, water tower, backlots, production warehouses, worker apartments, hillside homes, and StarStop.

## 9. Aqualume

- **Theme:** luminous underwater city combining coral-and-stone foundations, pressure glass, pearl architecture, current technology, sea-life sanctuaries, and civic life.
- **Unlock:** catch and consume Gillyfish, gain permanent gills, complete Lighthouse Trench, discover Aqualume, synchronize Moonpool.
- **Purpose:** aquatic movement, high-pay certified jobs, underwater vehicles, salvage, current engineering, premium housing, sea-life partnerships, and Abyssal exploration.
- **Housing:** bubble pods, Reefside homes, glass condos, coral villas, pearl penthouses, workshop sub-lofts, and house-subs.
- **School:** Tideglass Academy.
- **Law/career:** Current Guard.
- **Vehicle service:** Bluecore Transit & Charge.
- **Visual promise:** Pearl Spire, radial Bluecore hub, pressure-glass tunnels, Tideglass, Current Guard, CurrentShift generators, Coral Market, Reefside Homes, sea-scooter lanes, mini-sub docks, coral gardens, and integrated sea life.

---

## Cross-town systems

- **Hierarchy:** world -> town/city -> district -> neighborhood/block -> building/activity.
- **Scale:** initial world envelope is roughly 22,000 x 20,000 units plus water, depth, buffers, and future expansion.
- **Travel:** highways, parkways, bridges, tunnels, dirt roads, transit, boats, yachts, currents, submarines, swimming, and special paths.
- **Travel time:** first physical trips between neighboring towns generally target 2.5 to 5 real minutes.
- **Streaming:** 250 x 250 cells, active high-detail area, warm preload ring, far terrain/skyline mode, LOD, instancing, pooling, and interior unloading.
- **World map:** concept map defines emotional geography; `worldMapPlan.js` defines authoritative origins and routes.
- **GridLink:** late-game TechTown convenience, discovered nodes only, three-minute cooldown, no progression bypass.
- **Garage Concierge:** call eligible owned vehicles to safe legal delivery points. Water vehicles use docks.
- **Vehicle state:** ownership, fuel/charge, damage, mechanic, towing, insurance/reclaim, garage transfer, and impound persist.
- **Food:** snacks and meals restore hunger plus scaled health. Drinks and medical items keep separate roles.
- **Housing:** one primary residence controls default spawn/rest/storage; multiple properties may be owned.
- **Criminal records:** hidden crimes and official convictions are separate and jurisdictional.
- **Police careers:** local conviction permanently closes the local department; reform may open another town's career.
- **Visual continuity:** every town follows the visual bible and retains approved skyline, district contrast, roads, filler, and support infrastructure.
- **No fake prompts:** every interaction requires a working handler and fallback.

Final status:

```txt
World geography: designed
Town identities: designed
Districts and civic systems: designed
Water ecosystem: designed
Travel and convenience systems: designed
Visual direction: designed
Implementation: next phase
```