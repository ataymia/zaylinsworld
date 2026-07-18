# Zaylins Story, Mission, Character, and Dialogue Bible

Status: canonical story-system direction and implementation contract  
Project: Zaylins Kid World, also called ZTA  
Canonical player story: **Make Your Mark**

This document is the source of truth for why the player is here, how the sandbox produces story, how quests are paced, how characters remember choices, and how cause-and-effect changes opportunity without deleting the player’s game.

The dream opening is a framing device. It is not permission to rename every normal system after sleep, fill every town with dream lore, or force the player to solve a single “wake up” plot. DreamBucks and Dreamdrop District remain approved names. Existing towns and districts keep their established identities.

---

## 1. The story promise

The player arrives in Zaylins without an established identity. They have a home, a small amount of money, basic needs, and an open city. Every town offers a different version of who they could become.

The game asks:

```txt
What kind of life will you build?
Who will remember you?
What will your choices cost?
What becomes possible because of the person you chose to be?
```

The player may become a student, worker, police officer, entrepreneur, fisher, technician, performer, explorer, athlete, property owner, criminal, reformed citizen, ordinary resident, or a mixture that changes over time.

There is no required morality route and no singular correct career. The game provides consequences, not a morality lecture.

Core statement:

```txt
The dream explains the impossible world.
The player’s choices create the actual story.
```

---

## 2. Opening fiction: Lights Out

The first-time opening begins in a bedroom or living space after a movie marathon. The player has watched several genres that loosely echo the different towns: neighborhood life, coastal adventure, wealth drama, technology, spectacle, fantasy exploration, athletic challenge, performance, and underwater mystery.

The player interacts with a few ordinary objects, settles into bed, and falls asleep. The transition does not explain every town or announce a prophecy. The player wakes in Dreamdrop District.

The opening teaches interaction before the city teaches life systems.

Recommended beats:

1. Character creation.
2. Brief bedroom movement and interaction.
3. Television/movie-marathon environmental storytelling.
4. Sleep interaction.
5. Dream transition/loading treatment.
6. Arrival in Dreamdrop District.
7. First street conversation.

The player is not required to escape. Zaylins is a sandbox, not a coma puzzle.

---

## 3. Main progression spine: Make Your Mark

The main progression spine gives direction without becoming a rigid story mode.

### Chapter 0: Lights Out

- Create the player.
- Learn basic movement and interaction.
- Enter the dream.

### Chapter 1: Welcome to Dreamdrop

- Meet the block.
- Learn the quest journal.
- Learn food, needs, home, shopping, school, work, transportation, and law.
- Choose whether the first meaningful act is study, work, or community help.

### Chapter 2: Find Your Lane

- Earn the first paycheck.
- Build initial relationships.
- Learn driving, repair, fuel, and property.
- Accept or ignore optional trouble routes.
- Understand that reputation, relationship, heat, and criminal record are different systems.

### Chapter 3: Open Roads

- Physically discover Fishing Harbor and Rich Hills.
- Register town maps and synchronization nodes.
- Learn that first visits must be physical.

### Chapter 4: A Bigger Life

- Reach specialized careers and lifestyles.
- Discover TechTown, Casino Strip, Dungeon Outskirts, Obby Canyon, and Starline City through their connected routes.
- Purchase and earn convenience systems without erasing physical discovery.

### Chapter 5: Beneath Crownwater

- Investigate the Gillyfish.
- Gain permanent gills.
- Complete Lighthouse Trench.
- Activate Aqualume Gate.
- Register at Moonpool Gateway.

### Chapter 6: Make Your Mark

- Reach meaningful standing across the connected world.
- Unlock cross-town contracts, advanced relationship chapters, festivals, and a personalized “Your Story So Far” montage.
- Continue playing after recognition. No forced end state.

---

## 4. Mandatory versus optional

“Mandatory” means required to unlock a specific system, destination, certification, or route. It does not mean required to keep enjoying the sandbox.

Mandatory progression examples:

- first-time control and save tutorial;
- first legal vehicle and full driving certification;
- physical first arrival in each town;
- GridLink certification and purchase;
- Gillyfish adaptation and Lighthouse Trench for free movement in Aqualume;
- town-specific certifications for restricted careers or areas.

Optional routes include:

- crime;
- police career;
- fame;
- luxury status;
- dungeon combat;
- competitive Obby progression;
- property ownership beyond the starter home;
- deep relationships with any specific NPC.

Crime must never be forced tutorial homework. The runtime prototype previously placed fighting, robbery, and police escape in the mandatory sequence. That design is retired. Those quests remain available only as optional choices after the player receives a clear explanation of law and records.

---

## 5. Quest architecture

The canonical quest data lives in:

```txt
src/config/questCatalog.js
```

The functioning runtime lives in:

```txt
src/missions.js
```

Quest categories:

```txt
Story       world progression and major unlocks
Town        district problems, civic events, and local identity
People      named-character relationships and personal conflicts
Career      jobs, school, certification, rank, and professional stories
Activities  minigames, collection, lifestyle, and mastery challenges
```

Quest statuses:

```txt
locked
planned
available
active
completed
failed, only when a meaningful authored failure route exists
```

A quest definition includes:

- stable ID;
- title and summary;
- category;
- town and optional district;
- giver or owning system;
- runtime or planned implementation status;
- prerequisites;
- objectives;
- ordered or flexible completion;
- all-objectives or any-objective completion;
- rewards;
- unlocks;
- cause-and-effect references;
- secrecy/spoiler behavior;
- repeatability.

### Runtime rules

- Multiple quests may be active concurrently.
- The player may track up to three quests.
- One tracked quest is primary and appears in the compact HUD bubble.
- Q opens the Quest Journal.
- Completing one gameplay event may progress multiple relevant active quests.
- Objective counts persist through save/load.
- Planned quests may exist in data before their physical systems are implemented.
- Secret quests stay hidden until their prerequisites expose them.
- New saves begin with Welcome to Dreamdrop.
- Legacy single-index saves migrate without deleting progress.

### Journal tabs

```txt
Tracked
Story
Town
People
Career
Activities
Completed
```

The journal must show objectives, rewards, status, town, and a consequence warning when a choice matters. It must not expose secret towns or plot beats before prerequisites are met.

---

## 6. Mission volume and pacing

The long-term authored target is approximately:

| Layer | Target |
|---|---:|
| Main progression | 28 |
| Town introductions and signature stories | 108 |
| Named-character storylines | 135 |
| Career ladders | 162 |
| School and certification | 81 |
| Property, vehicle, and lifestyle | 72 |
| Crime, law, and reform | 54 |
| Discovery, secrets, and collections | 90 |
| Cross-town stories | 45 |
| Dynamic event templates | 80+ |

The total should grow through meaningful layers, not hundreds of cloned fetch quests.

Content pacing rules:

1. The journal may hold many quests, but the HUD shows only the primary quest.
2. Town arrival should expose a small set of high-quality leads, not dump the entire town catalog.
3. Named-character chapters unlock through familiarity, time, choices, or previous missions.
4. Career missions mix ordinary work, problems, interpersonal conflict, and advancement.
5. Repeatable jobs vary origin, destination, conditions, customer, cargo, weather, urgency, and complication.
6. A planned mission may reserve a future event ID, but must be marked planned until the event exists.
7. Rewards must respect the world economy. No repeatable loop becomes an unlimited cash printer.

---

## 7. Cause and effect

Canonical consequence data lives in:

```txt
src/config/storyConsequences.js
```

A major choice must produce three layers:

```txt
immediate result
persistent memory
alternate opportunity
```

The design goal is not “every choice is reversible.” The design goal is “every meaningful closure redirects the player toward another meaningful route whenever logically possible.”

Examples:

| Choice | Door closed | Door opened |
|---|---|---|
| Starter Town conviction | Dreamdrop police career | reform, community work, other-town application after reform |
| Sell first Gillyfish | immediate Aqualume route | major payout and recovery/catch-another storyline |
| Report GridLink sabotage | black-market GridLink contacts | legal tech trust and discount route |
| Hide GridLink sabotage | corporate fast track | underground technology route |
| Protect harbor wildlife | poacher contracts | patrol and sanctuary trust |
| Poach protected water | clean permit bonuses | poacher route and permit-repair story |
| Return Frostbox chain | underground buyer | custom-order trust |
| Secretly sell chain | Frostbox trust | underground buyer network |
| Publish Starline secret | some talent trust | media career route |

Consequences must be communicated before irreversible choices when the player could not reasonably predict them.

### Law and records

- Heat is immediate police attention.
- Uncaught crime creates hidden history and witness memory, not an official conviction.
- Arrest and conviction create town-scoped official consequences.
- A Starter Town conviction permanently closes Dreamdrop police employment.
- Reform may open another jurisdiction after obligations and a clean period.
- Reform does not erase the local conviction.

---

## 8. Character architecture

Canonical recurring-character data lives in:

```txt
src/config/npcStoryCatalog.js
```

Canonical authored conversation trees live in:

```txt
src/config/npcDialogueTrees.js
```

Every recurring NPC needs:

- a name;
- town and district;
- job or role;
- personality;
- schedule;
- services;
- conversation topics;
- opinions about other characters;
- relationship stages;
- at least one story, conflict, service, or recurring purpose;
- memory of important player actions.

Relationship stages:

```txt
hostile
rival
stranger
familiar
regular
trusted
close
```

Not every relationship becomes friendship. An NPC may respect but dislike the player, like but distrust the player, fear the player, become a rival, refuse service, recommend the player, call with opportunities, forgive the player, or remember a betrayal.

### Separate social values

Do not collapse everything into one “reputation” number.

```txt
relationship score      how one named NPC feels
familiarity             how well they know the player
local reputation        how a town or district sees the player
career reputation       professional standing
school reputation       student standing
fame                    Starline public visibility
fear / hostility        risk response where needed
criminal record         official legal history
hidden history          uncaught actions and private memory
```

---

## 9. Dialogue standards

A conversation is not a disguised shop menu.

Every recurring conversation should be assembled from:

1. greeting based on relationship and mood;
2. reaction to current state, clothing, record, quest, recent event, or time;
3. player-selected topics;
4. services and quests when relevant;
5. an exit line that reflects the relationship.

Common topic options:

- How have you been?
- What is happening around here?
- Tell me about this town.
- What do you think about another named NPC?
- You mentioned something last time.
- Do you need anything?
- How am I doing?
- Explain this career or rule.
- Open the shop/service.
- I should go.

Dialogue tone rules:

- conversational, specific, and grounded in place;
- jokes come from character and circumstance;
- no endless slang pile;
- no generic “Greetings, traveler” unless the character would actually speak that way;
- no one-line “hey” for recurring NPCs;
- no unrestricted generative chatbot dependency for canonical story;
- no copied quotes, brands, characters, or dialogue from reference games;
- kid-safe edge is allowed;
- characters may disagree with, challenge, or dislike the player.

Ambient pedestrians use modular town-aware pools. Named NPCs use authored state-aware trees.

---

## 10. Town story engines

### Starter Town

Central tension: build a stable life or chase shortcuts.

Core routes:

- school;
- ordinary jobs;
- community service;
- police career;
- neighborhood relationships;
- style, vehicles, home, and property;
- optional street and crime route;
- reform.

### Fishing Harbor

Central tension: earn from the water without destroying what makes the harbor valuable.

Core routes:

- fishing;
- marine academy;
- market work;
- boat ownership;
- Harbor Patrol;
- protected-water conservation;
- poaching and permit consequences;
- Gillyfish mystery.

### Rich Hills

Central tension: access to wealth and property versus the systems guarding it.

Core routes:

- service work;
- hospitality;
- negotiation and business education;
- luxury vehicles;
- property ownership;
- country club status;
- private security;
- trespass and infiltration.

### TechTown

Central tension: innovation versus surveillance and control.

Core routes:

- coding;
- robotics;
- drone work;
- legal cybersecurity;
- corporate security;
- black-market technology;
- GridLink;
- sabotage investigation.

### Casino Strip

Central tension: entertainment and probability versus greed and manipulation.

Core routes:

- game halls;
- arcade skill;
- hospitality;
- hotel operations;
- stage work;
- security;
- high-status regular route;
- hustler and ban/recovery routes.

Casino content remains fictional, uses only in-world currency, and does not imitate real-money predatory systems.

### Dungeon Outskirts

Central tension: discovery versus dangerous obsession.

Core routes:

- dungeon expeditions;
- crafting;
- appraisal;
- healing and support;
- Warden service;
- rescue;
- legal relic handling;
- smuggling and sealed-floor consequences.

### Obby Canyon

Central tension: mastery versus ego and cheating.

Core routes:

- movement training;
- competition;
- coaching;
- course design;
- ranger and rescue;
- maintenance;
- official championship;
- sabotage and underground challenge route.

### Starline City

Central tension: authentic craft versus fame at any cost.

Core routes:

- acting;
- music;
- dance;
- styling;
- production work;
- media;
- talent representation;
- reputation damage and recovery;
- ordinary backlot life.

### Aqualume

Central tension: advancement and high-tier opportunity versus protection of a hidden ecosystem.

Core routes:

- Current Guard;
- current engineering;
- salvage;
- Tideglass Academy;
- sea-life care;
- property;
- surface trade;
- illegal salvage;
- Abyssal Edge research and rescue.

---

## 11. GridLink storyline

GridLink is earned convenience, not an early shortcut.

Canonical chain:

```txt
Tunnel Vision
A Signal in the Crowd
Dead Zone
Wrong Address
Three Points Make a Grid
Mobility Certification
The Price of Convenience
Now You See Me
```

Rules:

- TechTown must be reached physically.
- The player must synchronize discovered nodes.
- GridLink costs approximately 250,000 DreamBucks.
- It does not move vehicles.
- It does not reveal towns.
- It does not bypass active pursuit, arrest, combat, restricted areas, missions, dungeon floors, Obby courses, or unsafe arrival states.
- Aqualume remains protected by permanent gills, physical discovery, and Moonpool synchronization.

---

## 12. Gillyfish and Aqualume storyline

Canonical chain:

```txt
Fish Stories
Permit to Go Deep
Lighthouse Static
The Catch That Watches Back
One Fish, Three Futures
Breathe Different / The One That Got Away
Something Changed
The Lighthouse Trench
No More Surface
The Gate Wakes
Crown of the Deep
Visitor or Resident?
Under New Pressure
```

The first Gillyfish decision may change the route:

- consume it for immediate Gillbound Adaptation;
- sell it for money and begin a recovery/second-catch route;
- store it and delay the decision;
- gift it and create a friendship legacy while seeking another route.

Aqualume access is never permanently deleted because the player sold or gifted the first fish. The consequence is delay, story, and opportunity cost.

The rare catch system must retain pity protection and a hard guarantee. Final-town access cannot depend on endless bad luck.

---

## 13. Save and migration contract

Quest state is stored under:

```js
state.quests = {
  version,
  active,
  completed,
  failed,
  availableIds,
  trackedIds,
  primaryId,
  flags,
  decisions
}
```

Requirements:

- legacy `missionIndex` and `missionProgress` migrate;
- old completed objectives remain completed where mapping exists;
- crime quests are not automatically forced by migration unless the player was already on that legacy step;
- unknown save fields remain preserved;
- quest progress never corrupts inventory, money, world position, or vehicle state;
- objective counts are clamped to their target;
- rewards are granted once;
- completion and reward must save together;
- planned quest data does not imply a live interaction prompt.

---

## 14. Implementation order

1. Multi-quest runtime and Q journal.
2. Starter Town runtime quest conversion.
3. Named recurring NPC resolver and memory bridge.
4. Starter Town cast placement and schedules.
5. Opening dream/bedroom sequence.
6. Full driving/property/police tutorial branches.
7. Town-arrival event hooks and synchronization.
8. GridLink event hooks.
9. Fishing, Gillyfish, and Lighthouse Trench hooks.
10. Aqualume arrival and city orientation.
11. Career ladders and relationship chapters per town.
12. Dynamic events and cross-town stories.

A future implementation agent must read this document, `questCatalog.js`, `storyConsequences.js`, `npcStoryCatalog.js`, and `npcDialogueTrees.js` before adding story content.

---

## 15. Acceptance gates

The story system is not complete until:

- Q opens a usable quest journal;
- multiple quests can progress concurrently;
- the player can accept and track optional quests;
- one primary objective appears compactly on the HUD;
- save/load preserves all quest counts and statuses;
- legacy mission saves migrate;
- crime is optional;
- consequences distinguish heat, hidden history, conviction, reputation, and relationships;
- recurring NPCs remember meaningful actions;
- every town has named characters and signature quest chains;
- GridLink cannot bypass discovery;
- Aqualume cannot be purchased or teleported into before discovery;
- selling the first Gillyfish creates a recovery route rather than a dead save;
- planned prompts remain absent until handlers exist;
- content checks catch duplicate IDs, missing prerequisites, missing NPCs, and missing consequence references.

Final statement:

```txt
Zaylins does not tell one story at the player.
It remembers the life the player built and tells that story back.
```
