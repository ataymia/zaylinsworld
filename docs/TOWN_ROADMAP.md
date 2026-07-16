# Town Roadmap

Per-town content design for **Zaylin's World**. Starter Town is one district of a larger connected world.

Master planning references:

- [CITY_BLUEPRINT_STANDARD.md](CITY_BLUEPRINT_STANDARD.md)
- [WORLD_MAP_DESIGN.md](WORLD_MAP_DESIGN.md)
- [ZTA_WORLD_BLUEPRINT.md](ZTA_WORLD_BLUEPRINT.md)
- [TOWN_SELF_SUSTAINING_SYSTEMS.md](TOWN_SELF_SUSTAINING_SYSTEMS.md)
- [WATER_ECOSYSTEM_BLUEPRINT.md](WATER_ECOSYSTEM_BLUEPRINT.md)
- [TECH_TOWN_BLUEPRINT.md](TECH_TOWN_BLUEPRINT.md)
- [STARLINE_CITY_BLUEPRINT.md](STARLINE_CITY_BLUEPRINT.md)
- [FISHING_HARBOR_BLUEPRINT.md](FISHING_HARBOR_BLUEPRINT.md)
- [DUNGEON_OUTSKIRTS_BLUEPRINT.md](DUNGEON_OUTSKIRTS_BLUEPRINT.md)
- [OBBY_CANYON_BLUEPRINT.md](OBBY_CANYON_BLUEPRINT.md)
- [RICH_HILLS_BLUEPRINT.md](RICH_HILLS_BLUEPRINT.md)
- [CASINO_STRIP_BLUEPRINT.md](CASINO_STRIP_BLUEPRINT.md)
- [AQUALUME_BLUEPRINT.md](AQUALUME_BLUEPRINT.md)

Each town is also represented as forward-looking data in
[src/config/townThemes.js](../src/config/townThemes.js). Those entries are design/data skeletons, not complete playable implementations.

## Design rules

- Every town must have at least 3 to 4 specific minigames or repeatable activity loops.
- Every town must have police/security, buyable housing, a school/training path, local jobs, local skills, town-specific crimes, and a local way to clear trouble.
- Every town must support food, recovery, fuel/charging where vehicles are allowed, sanitation, transportation, and ordinary life.
- Each town must sustain itself while belonging to the connected world.
- A town needs its own gameplay vocabulary, not only different buildings and colors.
- Detailed implementation must follow the town's standalone blueprint rather than inventing missing civic systems.
- Water is a shared traversable ecosystem, not a decorative map boundary.
- Aqualume is earned through the Gillyfish progression path and may never be converted into a premium-store unlock.

---

## 1. Starter Town *(playable today)*

- **Theme:** everyday small city and tutorial home base.
- **Purpose:** movement, jobs, money, stats, school, police, driving, housing, and ordinary life.
- **Stores/services:** Block Supply, Mini-Market, Chicken Spot, gas station, Iron City Gym, Frostbox, Kicks & Fits, Auto Haus, City Garage, police, school, home.
- **Activity loops:** Chicken Eating, Kitchen Shift, Line Up/Clippers, Gym Training, Road Test, Trash Cleanup, Study Sprint, Gas Pump Timing.
- **Economy:** low wages and affordable goods; teaches earn-to-spend loop.
- **Legal/risk:** standard wanted system, car theft, reckless driving, shop trouble.
- **Role in world:** baseline city used to teach systems that become more specialized elsewhere.

## 2. Fishing Harbor

- **Deeper spec:** [FISHING_HARBOR_BLUEPRINT.md](FISHING_HARBOR_BLUEPRINT.md)
- **Shared-water spec:** [WATER_ECOSYSTEM_BLUEPRINT.md](WATER_ECOSYSTEM_BLUEPRINT.md)
- **Theme:** working coastal town with docks, boats, seafood market, lighthouse, village, academy, and protected waters.
- **Purpose:** fishing, boating, marine education, market trading, harbor employment, and discovery of the final underwater-town progression path.
- **Activity loops:** Cast & Reel, Catch of Legend, Crab Traps, Seafood Market Rush, Boat Buoy Run, Net Toss, knot/navigation lessons, repair and rescue work.
- **Expanded catches:** ordinary fish, rare fish, temporary power fish, junk, cash, gear, loot crates, quest items, contraband/weapon cases, and the Gillyfish.
- **Gillyfish:** rare but pity-protected fish. Consuming one permanently grants gills and begins the Aqualume discovery mission. Duplicate catches can be sold, stored, traded, or gifted.
- **Housing:** dock rooms, village apartments, fisher cottages, marina condos, houseboats, waterfront homes.
- **School:** Harbor Academy teaches fish identification, ecology, knots, navigation, weather/tides, market math, boat safety, and supports the Gillyfish/Aqualume discovery lore.
- **Law:** Harbor Patrol handles land/water response, permits, protected catches, boat theft, unusual contraband catches, and water rescue.
- **Fuel:** TideFuel serves cars, EVs, and boats.

## 3. Dungeon Outskirts

- **Deeper spec:** [DUNGEON_OUTSKIRTS_BLUEPRINT.md](DUNGEON_OUTSKIRTS_BLUEPRINT.md)
- **Theme:** sparse persistent surface outpost above a large descending dungeon world.
- **Purpose:** preparation, floor dives, combat, traps, puzzles, loot, bosses, crafting, appraisal, and return-to-town progression.
- **Activity loops:** Floor Dive, Key & Door Rooms, Trap Timing, Boss Gates, Treasure Appraisal, Pet Helper Runs, Potion Craft, Shrine Blessings, Rune Locks, Forge Timing, Rescue Escort.
- **Housing:** guild bunks, outpost rooms, cabins, workshop lofts, ridge cabins, shrine cottages.
- **School:** Adventurer Academy teaches combat, monster study, trap safety, runes, potions, appraisal, cartography, rescue, and warden ethics.
- **Law:** Warden Station governs the surface, sealed ruins, permits, illegal relics, friendly-NPC crime, and rescue. Normal police chases do not operate inside dungeon floors.
- **Fuel:** Wayfarer Fuel & Supply supports travelers and supply vehicles.

## 4. Obby Canyon

- **Deeper spec:** [OBBY_CANYON_BLUEPRINT.md](OBBY_CANYON_BLUEPRINT.md)
- **Theme:** self-sustaining canyon base settlement connected to authored vertical platform courses.
- **Purpose:** movement mastery, checkpoints, time trials, course jobs, rescue, and cosmetic progression.
- **Activity loops:** Beginner Obby, Time Trial, No-Fall Challenge, Moving Platform Sprint, Hazard Tile Run, Zipline Rings, Balance Runs, Course Builder, Rescue Drill.
- **Housing:** camp bunks, academy dorms, base apartments, canyon cabins, coach lofts, cliff lodge units, summit homes.
- **School:** Momentum Academy teaches jump timing, balance, route memory, platform prediction, hazard rhythm, zipline control, safety, and course design.
- **Law:** Canyon Ranger & Safety Station handles base crime, course sabotage, checkpoint cheating, dangerous driving, access suspensions, and rescue.
- **Fuel:** Checkpoint Fuel & Supply sits before the vehicle-free course zone.

## 5. Casino Strip

- **Deeper spec:** [CASINO_STRIP_BLUEPRINT.md](CASINO_STRIP_BLUEPRINT.md)
- **Theme:** fictional neon entertainment city with game halls, arcades, hotels, shows, academy, housing, and service infrastructure.
- **Purpose:** luck games, probability education, arcade skill, hospitality, hotel work, and spectacle.
- **Activity loops:** Slots, Blackjack, Roulette, Prize Wheel, Arcade Cabinets, Claw Grab, Bellhop Rush, Housekeeping Sprint, Security Spotter, Table Setup, Odds Match, Event Cue Control.
- **Housing:** service apartments, academy dorms, neon lofts, family townhomes, hotel residences, Strip condos, penthouses.
- **School:** BrightHouse Hospitality & Games Institute teaches probability, budgeting, hospitality, arcade repair, event operations, security awareness, culinary service, and responsible play.
- **Law:** Strip Police plus game-hall/hotel security; consequences include venue bans, frozen fictional tokens, fines, repair tasks, and normal wanted escalation when appropriate.
- **Fuel:** LuckyLine Fuel & Market supports visitors, EVs, shuttles, and service vehicles.
- **Safety rule:** no real-money conversion, adult vice framing, or predatory debt systems.

## 6. Rich Hills

- **Deeper spec:** [RICH_HILLS_BLUEPRINT.md](RICH_HILLS_BLUEPRINT.md)
- **Shared-water spec:** [WATER_ECOSYSTEM_BLUEPRINT.md](WATER_ECOSYSTEM_BLUEPRINT.md)
- **Theme:** hillside estates, country club, marina, luxury retail, civic crest, service village, and visible worker economy.
- **Purpose:** property ownership, negotiation, hospitality, luxury vehicles, golf, marina life, yacht ownership, and high-pay service work.
- **Activity loops:** Golf, Yacht Run, Car Show Judging, Valet Dash, Mansion Chore Run, Auction Spotter, Negotiation Challenge, Property Match, Concierge Rush, Detail Challenge.
- **Water role:** Rich Hills Marina opens the luxury side of Crownwater Basin through speedboats, yachts, marina homes, charter routes, and a later pressure-sub route toward Aqualume.
- **Housing:** affordable worker apartments, academy dorms, townhouses, marina condos, ridge houses, estates, yacht-club residences, penthouses.
- **School:** Legacy Preparatory Academy teaches finance, business, real estate, negotiation, hospitality, leadership, appraisal, golf/club rules, and ethics.
- **Law:** Rich Hills Police plus private estate, club, and marina security. Rich/restricted areas have denser patrols, faster response, and higher fines.
- **Fuel:** CrestFuel Motor Club supports fuel, EV charging, detailing, roadside service, and a separate marina fuel service.

## 7. Tech City / TechTown

- **Deeper spec:** [TECH_TOWN_BLUEPRINT.md](TECH_TOWN_BLUEPRINT.md)
- **Theme:** neon smart city with startups, labs, transit, drones, electronics, smart housing, and layered security.
- **Purpose:** coding, automation, robotics, drone control, transit, tech jobs, and restricted-system crime.
- **Activity loops:** Debug It, Drone Run, Circuit Match, Hack Trace, Delivery Drone Dispatch, Robot Repair Bench, Security Monitor Challenge, Charge Timing, Battery Restock, Transit Gate Repair.
- **Housing:** micro units, smart lofts, campus pods, rooftop condos, workshop lofts.
- **School:** VoltByte Academy teaches STEM, coding, robotics, drone systems, circuits, and smart-city operations.
- **Law:** Metro Security plus corporate security, cameras, scanners, access bans, and faster response in restricted zones.
- **Fuel:** VoltFuel Station serves gas, EV/hover charging, drones, convenience, and delivery work.

## 8. Starline City *(Hollywood / Fame Town)*

- **Official working name:** Starline City.
- **Deeper spec:** [STARLINE_CITY_BLUEPRINT.md](STARLINE_CITY_BLUEPRINT.md)
- **Theme:** studios, theaters, music, fashion, performing arts, red carpets, worker backlots, and hillside homes.
- **Purpose:** craft, performance, production, style, reputation, media work, and ordinary entertainment-city life.
- **Activity loops:** Rhythm Audition, Dance Battle, Talk Show Timing, Photo Shoot Pose, Red Carpet Walk, Music Studio Mix, Script Memory, Scene Hit Marks, Wardrobe Styling, Stage Cue Control, Stunt Rehearsal, Camera Framing.
- **Housing:** worker apartments, academy dorms, trailer units, glam/music lofts, condos, hillside homes, penthouses.
- **School:** Premiere Arts Academy teaches acting, dance, music, film/media, fashion/costume, stagecraft, and agency/business skills.
- **Law:** Starline Police plus studio, venue, school, and hill security. Legal heat, scandal/reputation, and venue bans remain separate consequence layers.
- **Fuel:** StarStop Fuel & Charge supports residents, event traffic, production vans, and deliveries.

## 9. Aqualume *(final unlockable underwater town)*

- **Official working name:** Aqualume.
- **Deeper spec:** [AQUALUME_BLUEPRINT.md](AQUALUME_BLUEPRINT.md)
- **Unlock/system spec:** [WATER_ECOSYSTEM_BLUEPRINT.md](WATER_ECOSYSTEM_BLUEPRINT.md)
- **Theme:** luminous underwater city combining ancient coral-and-stone foundations, pressure glass, current-powered technology, pearl architecture, sea-life sanctuaries, and modern civic life.
- **Unlock:** catch and consume the Gillyfish to gain permanent gills, then complete the Lighthouse Trench discovery route. This unlock is earned, permanent, and not sold.
- **Purpose:** advanced aquatic movement, high-pay certified jobs, underwater vehicles, rare goods, sea-life partnerships, salvage, current engineering, premium housing, and Abyssal exploration.
- **Activity loops:** Current Surf, Sea-Scooter Slalom, Mini-Sub Docking, Sonar Mapping, Pearl Dive, Salvage Scanner, Coral Restoration, Sea-Life Rescue, Dolphin Guide Dash, Manta Glide, Pressure Seal, Turbine Balance, Bubble Taxi Dispatch, Abyss Courier.
- **Housing:** student bubble pods, Reefside shell pods/apartments, glass-tunnel condos, coral villas, pearl penthouses, workshop sub-lofts, and mobile house-subs.
- **School:** Tideglass Academy teaches current navigation, sonar, submarine engineering, coral ecology, sea-life care, salvage appraisal, pressure science, underwater law, trade, and current energy.
- **Law:** Current Guard, Sanctuary Wardens, Pearlworks Security, sonar scanners, patrol subs, bubble barriers, salvage permits, and stronger protection around wildlife and premium districts.
- **Vehicle service:** Bluecore Transit & Charge supports sea scooters, personal/cargo subs, bubble taxis, energy cores, pressure repairs, rescue, and cargo.
- **Economy:** jobs generally pay more because access, skills, certification, and risk are higher; local costs and equipment also scale upward so the global economy remains intact.

---

## Cross-town systems

- **Travel:** roads, highways, bridges, tunnels, dirt routes, transit nodes, boats, yachts, current lanes, submarines, and special pedestrian/swim paths connect towns.
- **Water:** Crownwater Basin links Fishing Harbor, Rich Hills Marina, the Casino bridge coast, and Aqualume through surface and underwater routes.
- **Swimming:** non-gilled players have a breath meter and return safely to shore/rescue when they run out. Gillyfish adaptation permanently removes normal underwater breath limits.
- **Housing:** one primary residence controls default spawn/rest/storage; players can own homes in multiple towns, including boats/houseboats and underwater property where supported.
- **Schools/skills:** each school teaches geographically appropriate skills with town-specific learning mechanics.
- **Economy:** global cash and bank; tightly scoped local values/materials such as Fame, game-hall chips, arcade tickets, course cosmetics, and Lumen Shards.
- **Law:** wanted/heat is town-aware; local bans, permits, reputation, confiscation, impound, water patrol, sonar pursuit, and community-repair tasks add geographic consequences.
- **No fake prompts:** every interaction requires a working handler and fallback.
- **Implementation:** every town must ship asset, interaction, UI, collision, fallback, performance, civic, housing, school, job, crime, and supported-travel plans before becoming playable.
