# NPC, Quest, Story, and Relationship System

Status: canonical data architecture plus partially wired runtime  
Project: Zaylins Kid World, also called ZTA

The earlier NPC/mission document described a small skeleton. The story system has now moved to the following canonical sources:

```txt
docs/STORY_MISSION_DIALOGUE_BIBLE.md
src/config/questCatalog.js
src/config/storyConsequences.js
src/config/npcStoryCatalog.js
src/config/npcDialogueTrees.js
src/config/townNPCProfiles.js
src/config/missionChains.js
src/missions.js
```

## Current runtime capability

`src/missions.js` now supports:

- multiple active quests;
- quest prerequisites;
- available versus accepted quests;
- objective counts;
- ordered and flexible objectives;
- “all” and “any” completion modes;
- rewards and story flags;
- three tracked quests and one primary quest;
- a Q-key Quest Journal;
- a compact HUD tracker;
- save/load persistence;
- legacy `missionIndex` migration;
- planned quest records that do not create fake runtime prompts.

## Data ownership

### Quests

`questCatalog.js` is the only canonical authored quest list. `missionChains.js` is a compatibility view generated from that catalog.

### Recurring NPCs

`npcStoryCatalog.js` owns names, roles, schedules, topics, services, opinions, relationships, and quest ownership. `townNPCProfiles.js` groups those profiles by town for compatibility.

### Dialogue

`npcDialogueTrees.js` owns state-aware conversation nodes. Trees may gate on relationship, reputation, quests, time, records, flags, and recent choices.

### Consequences

`storyConsequences.js` records what each choice closes, opens, and remembers. Runtime choice resolvers must apply those contracts transactionally.

## Adoption rule

Do not add a second mission array, a second NPC profile source, or hard-coded future story inside `main.js`. Emit gameplay events from physical systems and let the quest/dialogue resolvers consume them.

A live interaction must have a working handler. Planned content stays data-only until its physical location, event, service, or minigame exists.
