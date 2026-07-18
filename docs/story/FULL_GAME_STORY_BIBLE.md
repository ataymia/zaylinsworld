# Zaylins Complete Story, Quest, NPC, Dialogue, and Consequence Bible

Status: **canonical complete authoring baseline**

This document governs the story side of Zaylins. The detailed source of truth is the ten files in `src/config/story/packs/`. Those packs are expanded by `storyFactory.js`, indexed by `storyContentIndex.js`, audited by `tools/check-full-story-content.mjs`, and compiled with `npm run story:compile`.

The existing quest runtime and its Starter Town quests remain playable. The expanded catalog is deliberately marked `planned` until each required character, district, minigame, interaction, and event hook physically exists. No future implementation pass should need to invent the plot, NPC motivation, choice, consequence, dialogue behavior, reward, or repeatable activity.

## Locked authored inventory

- 10 story packs
- 100 cohesive quest arcs
- 800 quest chapters, eight chapters per arc
- 120 recurring named NPCs
- 120 conditional dialogue profiles
- more than 6,000 explicit dialogue lines
- 100 cause-and-effect contracts
- 100 repeatable mission families

## Central story

The dream opening is a frame, not the main plot. The player's actual story is **Make Your Mark**: arrive in Zaylins without a fixed identity, discover different ways to live, build relationships, learn skills, work, own property, take risks, break rules or uphold them, recover from mistakes, and leave a visible mark on every town.

There is no single correct life and no forced crime route. A player may become a student, officer, fisher, captain, engineer, performer, business owner, athlete, rescuer, dungeon explorer, property owner, community leader, criminal, reformed citizen, or a changing mixture of those paths.

## The eight-chapter arc contract

Every one of the 100 arcs expands into these stable chapters:

1. **The Invitation**: meet the lead NPC and learn the human problem.
2. **Learn the Ground**: train in the relevant skill and learn the rules.
3. **First Real Run**: perform ordinary work before the story escalates.
4. **Trouble Arrives**: investigate a complication through evidence and conversation.
5. **The Line in the Sand**: choose between two materially different routes.
6. **The Price of the Choice**: experience opened and closed opportunities, changed trust, and altered standing.
7. **Proving Ground**: resolve the major finale without erasing the selected route.
8. **A New Normal**: discuss the aftermath and unlock the repeatable activity family.

Quest IDs are deterministic: `full-<arc-id>-01` through `full-<arc-id>-08`. Every chapter includes objectives, event-hook names, location, lead NPC, prerequisites, rewards, relationship effects, reputation effects, consequence references, and implementation notes.

## Story laws

1. The player creates the life. The game supplies people, pressure, opportunity, and consequence.
2. The dream remains subtle. Ordinary systems keep ordinary names unless the established design says otherwise.
3. Crime is optional. Reform is a meaningful route, not a punishment closet.
4. Choices must open content, close incompatible content, affect dialogue, and remain remembered.
5. Closing one route should open a different route whenever the fiction supports it.
6. Named NPCs are people before they are service menus.
7. Personal relationship, town reputation, school standing, career standing, fame, hidden history, and official criminal record remain separate values.
8. Physical town discovery happens before GridLink travel.
9. The Gillyfish, Gillbound adaptation, Lighthouse Trench, Aqualume Gate, and Moonpool synchronization remain the canonical Aqualume sequence.
10. Failure may cost time, money, equipment condition, opportunity, reputation, or trust, but cannot corrupt saves or silently delete hours of work.
11. A planned quest cannot be promoted to runtime until all required physical hooks exist and are tested.
12. No implementation pass may compress an authored arc into generic filler merely because the physical content is unfinished.

## NPC and dialogue contract

Every recurring NPC includes:

- name, town, district, role, personality, goal, fear, secret, values, and pet peeve
- a morning, afternoon, and evening schedule
- owned quest arcs and services
- remembered promises, broken promises, help during crises, betrayals, route choices, and last-known player reputation
- relationship stages: stranger, familiar, regular, trusted, close, rival, and hostile
- greetings for every relationship stage
- schedule-aware reactions
- ordinary small talk
- personal questions and trust-gated disclosures
- local topic responses
- quest offer, acceptance, progress, route-A, route-B, completion, and failed-promise dialogue
- reactions to wanted level, positive or negative town reputation, broken promises, and past crisis help
- relationship actions including asking how they are, offering help, requesting favors, debating, apologizing, and leaving
- multiple farewells and a signature line

Ambient NPCs may use modular pools, but most public locations must include named recurring characters or context-rich town-aware dialogue. Police stations, schools, workplaces, shops, clinics, academies, transit hubs, housing districts, markets, and public events must not reduce to repeated one-line greetings.

## Cause-and-effect contract

Every arc has a matching `<arc-id>-choice` contract. Both routes define:

- choice label and decision event
- flags set
- content opened
- conflicting content closed
- town reputation adjustment
- lead-NPC relationship adjustment
- immediate dialogue response
- long-term world change
- a recovery route that can restore one opportunity without deleting the original decision or its remembered dialogue
- communication before and after the choice
- at least three later NPC references to the decision

A recovery quest may repair trust or reopen a service. It may not rewrite history, refund every consequence, or pretend the original route never happened.

## Core mandatory spine

The required progression remains system-focused rather than morality-focused:

- Lights Out and the dream-framed opening
- Welcome to Dreamdrop
- First Day, Your Way
- Home, backpack, food, school, work, map, driving, and ordinary-life tutorials
- Keys to the City and Open Roads
- physical town arrival and synchronization missions
- TechTown GridLink certification and purchase
- Gillyfish discovery and the permanent Gillbound adaptation
- Lighthouse Trench navigation
- activation of the Aqualume Gate
- Moonpool orientation and synchronization
- Make Your Mark and the personalized Story So Far legacy route

## Complete arc register

### Starter Town

1. Dreamdrop Neighborhood Network
2. Zaylins Prep Student Council
3. Iron City Championship
4. Market Mile Retail War
5. Dreamdrop Police Academy
6. WorkTower Career Ladder
7. Willowbend Neighborhood Watch
8. Parkside Sports League
9. Frostbox Custom Legacy
10. Street Route and Reform

### Fishing Harbor

1. Harbor Captain Certification
2. Market Wharf Price War
3. Marine Academy Research
4. Lighthouse Rescue Watch
5. Anchor and Axle Restoration
6. Protected Waters Line
7. Dockside Diner Family
8. Storm Season Command
9. Gillyfish Discovery Program
10. Harbor Patrol Career

### Rich Hills

1. Golden Key Property Ladder
2. Crown Greens Hospitality
3. Estate Ridge Security
4. Crownline Motors Legacy
5. Garden Commons Coalition
6. Legacy Academy Finance
7. Summit Yacht Club
8. Service Village Solidarity
9. Gallery Crown Authenticity
10. Wealth With Purpose

### TechTown

1. GridLink Mobility Network
2. CodeNest Startup Life
3. Drone District Flightpath
4. CyberCore Security Division
5. VoltByte Robotics League
6. Gadget Forge Underlayer
7. Neon Drift Motors
8. Server Relay Blackout
9. Synapse Clinic Bioethics
10. Smart City: Who Watches?

### Casino Strip

1. Grand Chance Dealer Track
2. Ticket Town Champion
3. Grand Aurora Hotel
4. Strip Showhouse Production
5. Eye in the Sky
6. BrightHouse Probability Lab
7. Neon Plaza Festival
8. Service Quarter Backstage
9. High Roller Reputation
10. Know When to Walk

### Dungeon Outskirts

1. Adventurer Academy Certification
2. Old Stone Halls
3. Root Caverns
4. Forgotten Library
5. Crystal Depths
6. Forge Chasm
7. Warden Rescue Corps
8. Relic Smugglers
9. Companion Bond
10. Royal Vault Endgame

### Obby Canyon

1. Beginner Valley Confidence
2. Moving Towers League
3. Cliffside Rescue Route
4. Hazard Basin Control
5. Skyrail Ridge Mastery
6. Momentum Academy Design
7. Canyon Rescue Corps
8. Build the Course
9. Rival League
10. Everybody Gets a Route

### Starline City

1. Unknown to Headliner
2. Rhythm Row Recording
3. Dance Floor to Stage
4. Glam Quarter House
5. Backlot Clockwork
6. Contract in the Fine Print
7. Public Image Crisis
8. Backlot Commons Stories
9. Spotlight Hills Property
10. Independent Studio

### Aqualume

1. Moonpool Citizen Orientation
2. Current Guard Career
3. Deep Current Research
4. Life Support Heart
5. Sanctuary of Motion
6. Sunken Salvage Guild
7. Bubble Transit Network
8. Deep Market Tides
9. Abyssal Edge Expedition
10. Surface and Sea Accord

### Cross-Town and World

1. Crownwater Courier Network
2. Academy Exchange Year
3. Intertown Justice Compact
4. Zaylins Festival Circuit
5. Business Without Borders
6. Crownwater Environmental Crisis
7. Starline World Tour
8. GridLink Cascade
9. Homes Across Zaylins
10. Make Your Mark: Legacy

Each arc's source file contains its district, lead character, premise, skill loop, ordinary work, complication, route A, route B, finale, permanent unlock, chapter IDs, consequence contract, and repeatable family.

## Repeatable mission families

Completing chapter eight unlocks a repeatable family for that arc. Every family contains routine service, quality challenge, urgent response, social dispute, choice-echo, and rare expert variants. Difficulty scales from routine to skilled, expert, and legend. Variations may use district, weather, time, client, cargo or target, difficulty, chosen route, and town reputation.

Repeatables do not replace authored chapters. They extend play after the story and provide money, relationship growth, town reputation, expertise, collectibles, and leaderboard opportunities.

## Implementation and promotion workflow

1. Build the physical district, NPC, minigame, object, or event.
2. Run `npm run story:compile`.
3. Use `generated/story/quest-hook-manifest.json` to identify the exact events required by each chapter.
4. Wire the matching event emitters.
5. Test prerequisites, objective counts, tracking, route A, route B, recovery, relationship memory, reputation, save/load, and reload after completion.
6. Promote only the tested quest or arc from `planned` to `runtime`.
7. Run `npm run story:check-full`, the existing story audit, and the full repository check.

## Repository commands

- `npm run story:check-full`: validates the 100 arcs, 800 quests, 120 NPCs, 120 dialogue profiles, 100 consequences, 100 repeatable families, IDs, references, objectives, routes, and recoveries.
- `npm run story:compile`: produces the complete expanded story JSON and physical-hook manifest.

The story work is considered authored when it exists in the packs and passes the complete audit. It is considered playable only after its physical hooks are implemented and the relevant chapters are promoted to runtime. Those two statuses must never be confused in documentation or release notes.
