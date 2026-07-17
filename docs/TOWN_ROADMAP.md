# Town Roadmap

Per-town content design for **Zaylins World**. The world contains connected cities/towns; each city contains districts and neighborhoods.

Master planning references:

- [CITY_BLUEPRINT_STANDARD.md](CITY_BLUEPRINT_STANDARD.md)
- [WORLD_MAP_DESIGN.md](WORLD_MAP_DESIGN.md)
- [LARGE_WORLD_SCALE_BLUEPRINT.md](LARGE_WORLD_SCALE_BLUEPRINT.md)
- [POLICE_CAREER_SYSTEM.md](POLICE_CAREER_SYSTEM.md)
- [ZTA_WORLD_BLUEPRINT.md](ZTA_WORLD_BLUEPRINT.md)
- [TOWN_SELF_SUSTAINING_SYSTEMS.md](TOWN_SELF_SUSTAINING_SYSTEMS.md)
- [WATER_ECOSYSTEM_BLUEPRINT.md](WATER_ECOSYSTEM_BLUEPRINT.md)
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

Each town is also represented as forward-looking data in
[src/config/townThemes.js](../src/config/townThemes.js). The large-world origins, bounds, gateways, and travel targets are reserved in
[src/config/worldMapPlan.js](../src/config/worldMapPlan.js). These are design/data skeletons, not complete playable implementations.

## Design rules

- Starter Town alone occupies a 2,000 x 2,000 playable footprint.
- Town centers are separated by thousands of units, with multi-minute physical travel corridors.
- Every town must contain multiple districts with distinct geography, routes, population, services, and gameplay identity.
- Every town must have at least 3 to 4 specific minigames or repeatable activity loops.
- Every town must have police/security, a local law-career equivalent, buyable housing, a school/training path, jobs, skills, town-specific crimes, and a local way to clear trouble.
- A conviction in a town permanently closes that town's police career. Uncaught crime does not create an official record. Reform may open a different town's department.
- Every town must support food, recovery, fuel/charging where vehicles are allowed, sanitation, transportation, and ordinary life.
- Each town must sustain itself while belonging to the connected world.
- A town needs its own gameplay vocabulary, not only different buildings and colors.
- Water is a shared traversable ecosystem, not a decorative map boundary.
- Aqualume is earned through the Gillyfish progression path and may never be converted into a premium-store unlock.

---

## 1. Starter Town *(playable foundation; major expansion planned)*

- **Deeper spec:** [STARTER_TOWN_BLUEPRINT.md](STARTER_TOWN_BLUEPRINT.md)
- **Authoritative scale revision:** [LARGE_WORLD_SCALE_BLUEPRINT.md](LARGE_WORLD_SCALE_BLUEPRINT.md)
- **Police-career spec:** [POLICE_CAREER_SYSTEM.md](POLICE_CAREER_SYSTEM.md)
- **Live audit/checklist:** [STARTER_TOWN_IMPLEMENTATION_CHECKLIST.md](STARTER_TOWN_IMPLEMENTATION_CHECKLIST.md)
- **Scale/career revision checklist:** [STARTER_TOWN_SCALE_AND_POLICE_CHECKLIST.md](STARTER_TOWN_SCALE_AND_POLICE_CHECKLIST.md)
- **Theme:** everyday city and tutorial home base, with Dreamdrop District as its historic commercial core.
- **Scale:** 2,000 x 2,000 playable units inside an approximately 2,400 x 2,400 terrain/streaming envelope. Cross-city trips should take real minutes.
- **Districts:** Dreamdrop District, Market Mile, Northworks/Auto Row, Scholar's Quarter, Civic Heights, Eastgate Corridor, Parkside Commons, Willowbend Residential, and Westside Blocks.
- **Road identity:** Dreamdrop Beltway, cross-city arterials, expressway/highway ramps, parkways, hills, roundabouts, school zones, local streets, service roads, and alleys.
- **Purpose:** teach movement, needs, jobs, money, school, skills, police employment, optional crime, driving, property ownership, city services, and ordinary life before travel.
- **Functional-building rule:** preserve and relocate the current functional building set rather than adding unnecessary new interactable buildings. Use filler homes, apartments, shops, warehouses, civic shells, parks, lots, and infrastructure to create a real city between destinations.
- **Activity loops:** Chicken Eating, Kitchen Shift, Lineup Lab, Gym Training, Foundation Classes, Office Shift, Garage Shift, Trash Cleanup, Fuel Shift, Road Test, Delivery Route, Auto Lot Challenge, Retail Stocking, Park Sprint, optional Police Escape, police academy, patrol, traffic enforcement, stolen-vehicle recovery, and community calls.
- **Housing:** Zaylins Home becomes the first claimable property and teaches deeds, primary residence, storage, rest, wardrobe, hygiene, and upgrades before the player visits other towns.
- **School:** Zaylins Prep teaches foundational math, reading/memory, computer basics, civics, health, career basics, driver education, physical education, arts/rhythm, and world geography.
- **Jobs:** Chicken Spot, WorkTower, Garage, sanitation, retail, fuel, school aide, gym assistant, Auto Haus lot attendant, city courier, and police officer.
- **Police career:** application requires a clean official Starter Town record, civics, driver education, road test, fitness, and smarts. A Starter Town conviction permanently closes Dreamdrop police employment. Crimes that were never discovered do not appear on the official background check.
- **Reform:** a player convicted in Starter Town may complete sentence, community work, civics, and a clean period to apply in another town, but can never become a Starter Town officer.
- **Legal/risk:** existing wanted, theft, combat, police, and pursuit systems gain official records, convictions, confiscation, impound, booking, community service, restitution, job bans, and district response modifiers.
- **Tutorial correction:** the player may choose legal, risky, or observer orientation. Assault and mugging are never mandatory tutorial objectives.
- **Role in world:** first complete reference city. Later towns specialize systems introduced here.

## 2. Fishing Harbor

- **Deeper spec:** [FISHING_HARBOR_BLUEPRINT.md](FISHING_HARBOR_BLUEPRINT.md)
- **Shared-water spec:** [WATER_ECOSYSTEM_BLUEPRINT.md](WATER_ECOSYSTEM_BLUEPRINT.md)
- **Theme:** working coastal town with docks, boats, seafood market, lighthouse, village, academy, and protected waters.
- **Purpose:** fishing, boating, marine education, market trading, harbor employment, and discovery of the final underwater-town progression path.
- **Activity loops:** Cast & Reel, Catch of Legend, Crab Traps, Seafood Market Rush, Boat Buoy Run, Net Toss, knot/navigation lessons, repair and rescue work.
- **Expanded catches:** ordinary fish, rare fish, temporary power fish, junk, cash, gear, loot crates, quest items, contraband/weapon cases, and the Gillyfish.
- **Gillyfish:** rare but pity-protected fish. Consuming one permanently grants gills and begins the Aqualume discovery mission. Duplicate catches can be sold, stored, traded, or gifted.
- **Housing:** dock rooms, village apartments, fisher cottages, marina condos, houseboats, waterfront homes.
- **School:** Harbor Academy teaches fish identification, ecology, knots, navigation, weather/tides, market math, boat safety, and Gillyfish/Aqualume lore.
- **Law/career:** Harbor Patrol handles land/water response, permits, protected catches, boat theft, contraband catches, and rescue. Reformed players may apply here if they have no Fishing Harbor conviction.
- **Fuel:** TideFuel serves cars, EVs, and boats.

## 3. Dungeon Outskirts

- **Deeper spec:** [DUNGEON_OUTSKIRTS_BLUEPRINT.md](DUNGEON_OUTSKIRTS_BLUEPRINT.md)
- **Theme:** sparse persistent surface outpost above a large descending dungeon world.
- **Purpose:** preparation, floor dives, combat, traps, puzzles, loot, bosses, crafting, appraisal, and return-to-town progression.
- **Activity loops:** Floor Dive, Key & Door Rooms, Trap Timing, Boss Gates, Treasure Appraisal, Pet Helper Runs, Potion Craft, Shrine Blessings, Rune Locks, Forge Timing, Rescue Escort.
- **Housing:** guild bunks, outpost rooms, cabins, workshop lofts, ridge cabins, shrine cottages.
- **School:** Adventurer Academy teaches combat, monster study, trap safety, runes, potions, appraisal, cartography, rescue, and warden ethics.
- **Law/career:** Warden Station governs the surface, sealed ruins, permits, illegal relics, friendly-NPC crime, and rescue. Warden/Ranger is the local law career. Normal police chases do not operate inside dungeon floors.
- **Fuel:** Wayfarer Fuel & Supply supports travelers and supply vehicles.

## 4. Obby Canyon

- **Deeper spec:** [OBBY_CANYON_BLUEPRINT.md](OBBY_CANYON_BLUEPRINT.md)
- **Theme:** self-sustaining canyon base settlement connected to authored vertical platform courses.
- **Purpose:** movement mastery, checkpoints, time trials, course jobs, rescue, and cosmetic progression.
- **Activity loops:** Beginner Obby, Time Trial, No-Fall Challenge, Moving Platform Sprint, Hazard Tile Run, Zipline Rings, Balance Runs, Course Builder, Rescue Drill.
- **Housing:** camp bunks, academy dorms, base apartments, canyon cabins, coach lofts, cliff lodge units, summit homes.
- **School:** Momentum Academy teaches jump timing, balance, route memory, platform prediction, hazard rhythm, zipline control, safety, and course design.
- **Law/career:** Canyon Ranger & Safety handles crime, sabotage, checkpoint cheating, dangerous driving, access suspensions, and rescue. Canyon Ranger is the local law career.
- **Fuel:** Checkpoint Fuel & Supply sits before the vehicle-free course zone.

## 5. Casino Strip

- **Deeper spec:** [CASINO_STRIP_BLUEPRINT.md](CASINO_STRIP_BLUEPRINT.md)
- **Theme:** fictional neon entertainment city with game halls, arcades, hotels, shows, academy, housing, and service infrastructure.
- **Purpose:** luck games, probability education, arcade skill, hospitality, hotel work, and spectacle.
- **Activity loops:** Slots, Blackjack, Roulette, Prize Wheel, Arcade Cabinets, Claw Grab, Bellhop Rush, Housekeeping Sprint, Security Spotter, Table Setup, Odds Match, Event Cue Control.
- **Housing:** service apartments, academy dorms, neon lofts, family townhomes, hotel residences, Strip condos, penthouses.
- **School:** BrightHouse Institute teaches probability, budgeting, hospitality, arcade repair, event operations, security awareness, culinary service, and responsible play.
- **Law/career:** Strip Police plus game-hall/hotel security. Strip Police Officer is the local law career; venue security remains a separate job.
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
- **Law/career:** Rich Hills Police plus private estate, club, and marina security. Rich Hills Police Officer is the local law career; private security is separate.
- **Fuel:** CrestFuel Motor Club supports fuel, EV charging, detailing, roadside service, and marina fuel.

## 7. TechTown

- **Deeper spec:** [TECH_TOWN_BLUEPRINT.md](TECH_TOWN_BLUEPRINT.md)
- **Theme:** neon smart city with startups, labs, transit, drones, electronics, smart housing, and layered security.
- **Purpose:** coding, automation, robotics, drone control, transit, tech jobs, and restricted-system crime.
- **Activity loops:** Debug It, Drone Run, Circuit Match, Hack Trace, Delivery Drone Dispatch, Robot Repair Bench, Security Monitor Challenge, Charge Timing, Battery Restock, Transit Gate Repair.
- **Housing:** micro units, smart lofts, campus pods, rooftop condos, workshop lofts.
- **School:** VoltByte Academy teaches STEM, coding, robotics, drone systems, circuits, and smart-city operations.
- **Law/career:** Metro Security/Police handles public law; corporate security remains separate. Metro officer is the local law career.
- **Fuel:** VoltFuel Station serves gas, EV/hover charging, drones, convenience, and delivery work.

## 8. Starline City *(Hollywood / Fame Town)*

- **Official working name:** Starline City.
- **Deeper spec:** [STARLINE_CITY_BLUEPRINT.md](STARLINE_CITY_BLUEPRINT.md)
- **Theme:** studios, theaters, music, fashion, performing arts, red carpets, worker backlots, and hillside homes.
- **Purpose:** craft, performance, production, style, reputation, media work, and ordinary entertainment-city life.
- **Activity loops:** Rhythm Audition, Dance Battle, Talk Show Timing, Photo Shoot Pose, Red Carpet Walk, Music Studio Mix, Script Memory, Scene Hit Marks, Wardrobe Styling, Stage Cue Control, Stunt Rehearsal, Camera Framing.
- **Housing:** worker apartments, academy dorms, trailer units, glam/music lofts, condos, hillside homes, penthouses.
- **School:** Premiere Arts Academy teaches acting, dance, music, film/media, fashion/costume, stagecraft, and agency/business skills.
- **Law/career:** Starline Police plus studio, venue, school, and hill security. Starline Police Officer is the local law career; venue security is separate.
- **Fuel:** StarStop Fuel & Charge supports residents, event traffic, production vans, and deliveries.

## 9. Aqualume *(final unlockable underwater town)*

- **Official working name:** Aqualume.
- **Deeper spec:** [AQUALUME_BLUEPRINT.md](AQUALUME_BLUEPRINT.md)
- **Unlock/system spec:** [WATER_ECOSYSTEM_BLUEPRINT.md](WATER_ECOSYSTEM_BLUEPRINT.md)
- **Theme:** luminous underwater city combining coral-and-stone foundations, pressure glass, current-powered technology, pearl architecture, sea-life sanctuaries, and civic life.
- **Unlock:** catch and consume the Gillyfish to gain permanent gills, then complete the Lighthouse Trench discovery route. This unlock is earned, permanent, and not sold.
- **Purpose:** advanced aquatic movement, high-pay certified jobs, underwater vehicles, rare goods, sea-life partnerships, salvage, current engineering, premium housing, and Abyssal exploration.
- **Activity loops:** Current Surf, Sea-Scooter Slalom, Mini-Sub Docking, Sonar Mapping, Pearl Dive, Salvage Scanner, Coral Restoration, Sea-Life Rescue, Dolphin Guide Dash, Manta Glide, Pressure Seal, Turbine Balance, Bubble Taxi Dispatch, Abyss Courier.
- **Housing:** student bubble pods, Reefside shell pods/apartments, glass-tunnel condos, coral villas, pearl penthouses, workshop sub-lofts, and mobile house-subs.
- **School:** Tideglass Academy teaches current navigation, sonar, submarine engineering, coral ecology, sea-life care, salvage appraisal, pressure science, underwater law, trade, and current energy.
- **Law/career:** Current Guard, Sanctuary Wardens, Pearlworks Security, sonar scanners, patrol subs, and salvage permits. Current Guard Officer is the local law career.
- **Vehicle service:** Bluecore Transit & Charge supports sea scooters, personal/cargo subs, bubble taxis, energy cores, pressure repairs, rescue, and cargo.

---

## Cross-town systems

- **Hierarchy:** world -> city/town -> district -> neighborhood/block -> building/activity.
- **Scale:** Starter Town is 2,000 x 2,000; the planned connected world spans roughly 22,000 x 20,000 units before later expansion.
- **Travel:** roads, highways, bridges, tunnels, dirt routes, transit nodes, boats, yachts, current lanes, submarines, and special pedestrian/swim paths connect towns.
- **Travel time:** first physical trips between neighboring towns generally target 2.5 to 5 real minutes.
- **Streaming:** 250 x 250 spatial cells, local high-detail activation, warm preload ring, and far terrain/skyline mode.
- **Water:** Crownwater Basin links Fishing Harbor, Rich Hills Marina, the Casino bridge coast, and Aqualume through surface and underwater routes.
- **Swimming:** non-gilled players have a breath meter and return safely to shore/rescue when they run out. Gillyfish adaptation permanently removes normal underwater breath limits.
- **Housing:** one primary residence controls default spawn/rest/storage; players can own homes in multiple towns, including boats/houseboats and underwater property where supported.
- **Schools/skills:** each school teaches geographically appropriate skills with town-specific learning mechanics.
- **Economy:** global cash and bank; tightly scoped local values/materials such as Fame, game-hall chips, arcade tickets, course cosmetics, and Lumen Shards.
- **Criminal records:** hidden crimes and official convictions are separate and tracked by jurisdiction.
- **Police careers:** local conviction permanently closes the local department; uncaught crime is absent from the official record; reform can open another town's law career.
- **No fake prompts:** every interaction requires a working handler and fallback.
- **Implementation:** every town must ship asset, interaction, UI, collision, fallback, performance, civic, housing, school, job, career, crime, district, streaming, and supported-travel plans before becoming playable.
