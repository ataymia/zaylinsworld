# Town Self-Sustaining Systems Blueprint

Status: planning blueprint, not runtime code  
Scope: homes, schools, police, jobs, skills, town-specific crimes, and town identity systems  
Project: Zaylin's Kid World, also called ZTA

Every town in ZTA should feel like it could function on its own, while still belonging to the larger connected world. The player can stay loyal to Starter Town, move to another town, or eventually own homes across several towns. Each town should have its own police presence, school/training path, buyable houses, local jobs, local skills, local services, and local crime/consequence flavor.

This is the rule that keeps towns from becoming costumes on the same mannequin.

---

## 1. Core rule

Each town must ship with the following civic minimum:

```txt
1. Police station / law office / security HQ
2. School / academy / training center
3. Buyable housing
4. At least 3 to 4 town-specific jobs
5. At least 3 to 4 town-specific minigames or activity loops
6. Local shops/services that support the town economy
7. Town-specific skill progression
8. Town-specific crime profile and police response behavior
9. Local NPCs with routines and dialogue
10. A reason to live there instead of only visiting
```

A town is not complete just because it has roads and stores. A town is complete when the player can live there, learn there, work there, get in trouble there, recover there, and make choices that feel specific to that place.

---

## 2. Player housing model

The player should eventually be able to choose one of three living styles:

| Living style | Meaning | Gameplay purpose |
|---|---|---|
| Starter loyal | Keep Starter Town as primary home | Simple default, lower cost, beginner-friendly |
| Relocation | Move primary home to another town | Different spawn point, local bonuses, identity choice |
| Multi-home owner | Own homes in multiple towns | Fast travel, storage, status, passive income hooks later |

### Primary residence rules

```txt
Primary residence controls:
- Default spawn after loading in
- Sleep/rest location
- Wardrobe access
- Safe/storage access
- Mail/messages location
- Local bills/maintenance later
```

### Multi-home rules

```txt
Owned homes can provide:
- Local spawn option
- Local wardrobe/storage access
- Town-specific decor/cosmetic style
- Fast-travel anchor after visiting once
- Passive status or rental income later, if balanced
```

### Housing tiers

| Tier | Example | Purpose |
|---|---|---|
| Basic | small apartment, starter house, dock room | affordable living |
| Mid | townhouse, condo, small cottage | comfort and storage |
| Premium | mansion, penthouse, studio loft, marina house | status and bonuses |
| Special | dungeon outpost room, canyon cabin, studio trailer | town-flavored living |

Housing should be cosmetic plus functional, not just a money grave with walls.

---

## 3. Schools and learning identity

Each town needs a school or training equivalent. Starter Town teaches basic academics. Other towns teach skills that match the place.

| Town | School / training center | Learning identity | Example learning minigames |
|---|---|---|---|
| Starter Town | Zaylin Prep | basic academics and life skills | math sprint, memory quiz, spelling/timing, study streak |
| Fishing Harbor | Harbor School / Marine Club | fishing, ecology, boating, market math | fish ID quiz, tide timing, knot tying, boat safety |
| Rich Hills | Prep Academy / Business Club | finance, etiquette, real estate, leadership | budget challenge, appraisal math, negotiation timing, valet route planning |
| Tech City | STEM Academy / Coding Lab | coding, robotics, drones, circuits | debug puzzle, circuit match, drone theory, robot repair |
| Casino Strip | Hospitality & Games Institute | probability, hospitality, arcade ops, security awareness | odds math, guest-service rush, arcade repair, pattern spotting |
| Hollywood / Fame | Performing Arts School | acting, dance, music, fashion, media | rhythm audition, pose matching, script memory, music mix |
| Dungeon Outskirts | Adventurer Academy / Warden Training | survival, monsters, relics, potions, map reading | trap timing lesson, monster weakness quiz, potion recipe, rune lock puzzle |
| Obby Canyon | Movement Academy / Parkour Camp | movement, balance, timing, course design | jump timing, checkpoint routing, hazard rhythm, no-fall drill |

### Learning system rule

Learning should not be one generic school minigame duplicated everywhere. Same shared framework, different skin and mechanics.

```txt
Starter math quiz != Tech debug puzzle != Hollywood script memory != Dungeon rune lock.
```

Each town should teach a skill that helps in that town and has some value globally.

---

## 4. Town-specific skills

Each town can teach or strengthen one or more skills. These can be hidden modifiers at first, then exposed later through UI when the skill system is mature.

| Town | Primary skills | Gameplay use |
|---|---|---|
| Starter Town | basics, fitness, hygiene, driving, responsibility | tutorial stats and general readiness |
| Fishing Harbor | fishing, boating, patience, selling | better catches, safer boating, higher fish sale value |
| Rich Hills | negotiation, status, property, valet driving | better deals, luxury access, property rewards |
| Tech City | coding, logic, robotics, drone control | high-pay jobs, puzzle advantages, drone routes |
| Casino Strip | probability, focus, hospitality, risk control | better arcade/casino outcomes, job bonuses |
| Hollywood / Fame | rhythm, charisma, fashion, performance | auditions, fame, sponsorships, crowd response |
| Dungeon Outskirts | combat, survival, appraisal, crafting | deeper floors, better loot, potion buffs |
| Obby Canyon | parkour, balance, timing, route memory | better obby rewards, movement challenges |

Skill bonuses must be small and balanced. A player should feel rewarded for learning, not locked out because they picked the “wrong” town.

---

## 5. Jobs by town

Each town needs local jobs that match geography and culture. Jobs should not be copy-pasted with new signs. The work itself should feel different.

## Starter Town jobs

| Job | Location | Gameplay |
|---|---|---|
| Chicken Spot shift | Chicken Spot | Prep and serve timed orders |
| Sanitation cleanup | Streets/storefronts | Pick up visible trash, deposit in dumpster |
| Gas clerk / pump helper | 6twelve | Fuel timing, stock shelves, clean forecourt |
| Delivery runner | Main Street | Deliver packages/food around local grid |
| Study helper | Zaylin Prep | Tutor NPC kids with quiz minigames |

## Fishing Harbor jobs

| Job | Location | Gameplay |
|---|---|---|
| Dockhand | Docks | Move crates, tie ropes, unload boats |
| Fish market worker | Seafood Market | Sort/weigh/package fish orders |
| Bait shop helper | Bait & Tackle | Restock bait, match customer orders |
| Boat rental assistant | Boat Rental | Clean boats, fuel boats, route customers |
| Harbor courier | Harbor Master | Boat/walk deliveries around docks |

## Rich Hills jobs

| Job | Location | Gameplay |
|---|---|---|
| Valet | Country Club | Park cars quickly with no damage |
| Concierge runner | Hotel/clubhouse | Deliver items to rich NPCs |
| Estate helper | Mansion blocks | Garden, pool, package, and decor tasks |
| Gallery assistant | Auction/gallery | Spot valuable items, arrange displays |
| Real estate assistant | Real Estate Office | Show houses, match buyer preferences |

## Tech City jobs

| Job | Location | Gameplay |
|---|---|---|
| Debug contractor | Co-working Space | Solve code/logic puzzles |
| Drone dispatcher | Transit Hub | Route drones efficiently |
| Robot repair tech | Electronics/Gadget Lab | Match parts, test movement |
| Circuit assembler | Gadget Lab | Connect circuit boards under timer |
| Data courier | Tech offices | Deliver encrypted packages through route puzzle |

## Casino Strip jobs

| Job | Location | Gameplay |
|---|---|---|
| Bellhop | Grand Hotel | Deliver bags to rooms under timer |
| Arcade attendant | Arcade | Repair cabinets, hand out tickets |
| Casino floor helper | Casino | Clear tables, guide guests, spot issues |
| Security spotter | Casino entrance | Pattern recognition for fictional rule-breakers |
| Prize booth worker | Arcade/casino | Match tickets to prizes quickly |

## Hollywood / Fame jobs

| Job | Location | Gameplay |
|---|---|---|
| Background extra | Studio lot | Hit marks, pose, react on cue |
| Dance assistant | Stage/studio | Repeat rhythm patterns |
| Salon assistant | Salon | Match styles/colors to customers |
| Wardrobe runner | Wardrobe shop | Build outfits from prompts |
| Music studio intern | Music booth | Layer beats in correct order |

## Dungeon Outskirts jobs

| Job | Location | Gameplay |
|---|---|---|
| Relic runner | Dungeon floors | Retrieve item and return alive |
| Blacksmith helper | Forge | Time hammer strikes and upgrades |
| Potion gatherer | Outskirts/dungeon | Collect ingredients and craft potions |
| Shrine keeper | Shrine | Match blessings/runes for visitors |
| Monster cleanup | Dungeon lower floors | Clear safe beginner enemy rooms |

## Obby Canyon jobs

| Job | Location | Gameplay |
|---|---|---|
| Course marshal | Course gates | Reset hazards/checkpoints |
| Checkpoint attendant | Checkpoint booth | Log racers, sell passes, time runs |
| Safety crew | Canyon base | Rescue/reset fallen NPCs |
| Parkour coach | Training course | Demonstrate routes and timing drills |
| Zipline operator | Canyon bridge | Launch riders and score ring routes |

---

## 6. Police and consequence model

Every town needs some form of local law enforcement. The shared system is police/heat/consequence, but each town changes how it feels.

### Global police rules

```txt
Every town has:
- Police station, law office, security HQ, guard post, or warden station
- Local patrol/spawn points
- Local wanted/heat behavior
- A way to clear or reduce heat
- Town-specific restricted areas
- Consequences for town-specific crime
```

Police are the main shared con across the world. Other difficulty systems can exist, but police/authority is the consistent civic pressure.

### Police response by town

| Town | Law presence | Response style | Notes |
|---|---|---|---|
| Starter Town | normal police station | balanced response | tutorial wanted system |
| Fishing Harbor | harbor patrol / police dock | moderate response near docks/water | permit/fishing violations matter |
| Rich Hills | police + private security | faster patrols, stricter trespass response | rich parts react faster and patrol more |
| Tech City | police + corporate security | camera/security response, quick in corporate zones | cyber/puzzle crimes increase heat |
| Casino Strip | police + casino security | security first, police backup | cheating/banned-area behavior matters |
| Hollywood / Fame | police + venue security | security/paparazzi/scandal first, police if escalated | reputation and bans matter |
| Dungeon Outskirts | warden/ranger/police outpost | no normal street patrol inside dungeon, surface guard handles disputes | PvE danger replaces most civic policing below ground |
| Obby Canyon | ranger/safety patrol station | safety enforcement, cheating/course sabotage penalties | no normal city traffic/police chase inside courses |

### Response speed modifiers

| Area type | Patrol density | Reaction speed | Example |
|---|---:|---:|---|
| Low-income/basic starter areas | normal | normal | Starter Town Main Street |
| School zones | medium | faster for dangerous driving | Zaylin Prep, academies |
| Rich districts | high | fast | Rich Hills estates/country club |
| Casinos/hotels | high security | fast indoors | Casino Strip |
| Corporate tech zones | camera-heavy | fast if flagged | Tech City labs |
| Docks/countryside | low/medium | slower unless near harbor patrol | Fishing Harbor outer piers |
| Dungeon interiors | none/guardian only | PvE consequence | Dungeon floors |
| Obby courses | safety patrol only | reset/ban from course | Obby Canyon courses |

---

## 7. Town-specific crime profiles

Crime should be different based on geography. The player should not feel like every town is the same police chase with a different skybox.

| Town | Local crimes / risky actions | Consequence flavor |
|---|---|---|
| Starter Town | car theft, shop trouble, reckless driving, ignoring lights, bothering NPCs | standard wanted stars, police chase, fines |
| Fishing Harbor | fishing without permit, protected fish, stealing boats, trespassing on docks | harbor patrol fines, boat impound, permit suspension |
| Rich Hills | trespassing, stealing luxury cars, valet damage, breaking into estates | fast private security, higher fines, status loss |
| Tech City | gadget theft, restricted lab access, drone misuse, puzzle “hack” failure | corporate security heat, device lockouts, access bans |
| Casino Strip | cheating minigames, unpaid debts, trespassing VIP areas, stealing chips | banned from tables, security escort, chips frozen |
| Hollywood / Fame | crashing sets, stealing costumes, paparazzi/scandal actions, venue trespass | reputation/scandal hit, venue ban, police if escalated |
| Dungeon Outskirts | stealing from outpost, attacking friendly NPCs, cursed relic misuse | warden response on surface, shrine penalties, merchant refusal |
| Obby Canyon | course sabotage, checkpoint cheating, safety rule violations | course disqualification, cooldown, safety patrol reset |

### Crime system design note

Crime should create consequences, not softlocks. If the player makes a bad choice, the game should create a problem they can solve:

```txt
pay fine, lay low, do community job, recover reputation, return stolen item, finish apology task, or wait out a ban.
```

This keeps the game playful without removing teeth.

---

## 8. Town self-sustain matrix

| Town | Police/security | Housing | School/training | Jobs | Signature skills |
|---|---|---|---|---|---|
| Starter Town | police station | starter house, apartments | basic school | food, cleanup, gas, delivery | basics, driving, fitness |
| Fishing Harbor | harbor patrol station | dock rooms, seaside cottages | marine school | dockhand, market, boat rental | fishing, boating, selling |
| Rich Hills | police/private security | mansions, condos, marina homes | prep/business academy | valet, concierge, estate jobs | negotiation, property, status |
| Tech City | police/corp security | smart apartments, lofts | STEM academy | coding, drone, robot repair | logic, drones, tech |
| Casino Strip | police/casino security | hotel suites, strip apartments | hospitality/games institute | bellhop, arcade, casino floor | probability, focus, hospitality |
| Hollywood / Fame | police/venue security | studio trailers, apartments, hills homes | performing arts school | extra, salon, wardrobe, music | rhythm, charisma, fashion |
| Dungeon Outskirts | warden/ranger outpost | outpost room, cabin, guild bunk | adventurer academy | relic runs, forge, potions | combat, survival, appraisal |
| Obby Canyon | ranger/safety station | canyon cabin, camp bunk | movement academy | marshal, checkpoint, safety crew | parkour, balance, timing |

---

## 9. Design checklist per town

Before a town becomes playable, answer these:

```txt
Town name:
Police/security building:
Police response style:
Buyable homes:
Primary school/training center:
Local learning minigames:
Local jobs:
Town-specific skills:
Town-specific crimes:
How to clear local trouble:
Local shops/services:
Local rest/recovery point:
Local money sink:
Reason to live here:
Reason to revisit after leaving:
```

No town ships without this checklist. Otherwise it is not a town, it is a themed hallway.