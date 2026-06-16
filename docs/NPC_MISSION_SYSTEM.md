# NPC & Mission System

Design for **town-aware, role-aware** NPCs and multi-step missions in **Zaylin's
World**, so characters feel alive and quests have continuity — instead of
one-line corny dialogue. This is **design + data shape**; the configs are
skeletons, not yet wired into the running game.

Backing data:
- [src/config/townNPCProfiles.js](../src/config/townNPCProfiles.js) — roles & personalities per town
- [src/config/npcDialogueTrees.js](../src/config/npcDialogueTrees.js) — branching dialogue
- [src/config/missionChains.js](../src/config/missionChains.js) — multi-step quests

---

## 1. Goals

- **Town-aware:** an NPC's lines, jobs, and missions match their town theme
  (see [TOWN_ROADMAP.md](TOWN_ROADMAP.md)).
- **Role-aware:** a shop clerk, cop, trainer, dealer, or quest-giver behave and
  speak differently.
- **Personalities:** a small trait set (friendly/gruff/nervous/greedy/cheery)
  shifts tone and options.
- **Mission-givers & recurring NPCs:** named NPCs who remember the player and
  hand out chained quests.
- **Relationship/memory hooks:** track per-NPC familiarity + flags so dialogue
  evolves (first meeting → regular → ally).

---

## 2. NPC profile shape

```js
{
  id: 'gym-trainer',
  role: 'trainer',
  town: 'starter',
  name: 'Coach Rell',
  personality: 'gruff',          // tone selector for dialogue trees
  recurring: true,               // remembered across visits
  services: ['gym-training'],    // minigame/service ids they offer
  missionChains: ['intro-jobs'], // quest chains they can start
  dialogueTree: 'trainer-default',
  memory: { familiarity: 0, flags: [] }, // runtime-populated hooks
}
```

Personalities map to line variants so the same logical beat ("greeting") reads
differently per NPC without authoring whole separate trees.

---

## 3. Dialogue tree shape

Branching nodes with options that can gate on state, set flags, start missions,
or open a service/minigame:

```js
{
  id: 'trainer-default',
  start: 'greet',
  nodes: {
    greet: {
      text: { friendly: 'Back for more? Let\'s go!', gruff: 'You here to train or chat?' },
      options: [
        { label: 'Train me', goto: 'train' },
        { label: 'Any work?', goto: 'work', requires: { flagNot: 'introDone' } },
        { label: 'Later', end: true },
      ],
    },
    train: { action: { openMinigame: 'gym-training' }, end: true },
    work:  { action: { startMission: 'intro-jobs' }, setFlag: 'introOffered', end: true },
  },
}
```

- `text` may be a string or a `{ personality: line }` map.
- `options[].requires` reads player/NPC state (money, stats, flags, town).
- `action` hooks: `openMinigame`, `startMission`, `openShop`, `giveItem`,
  `setReputation` — resolved by whatever wires the tree later (kept generic).

---

## 4. Mission chain shape

Ordered steps with objectives, rewards, and stat/economy effects:

```js
{
  id: 'intro-jobs',
  town: 'starter',
  giver: 'gym-trainer',
  title: 'Finding Your Footing',
  steps: [
    { id: 'clean-up', type: 'collect', target: 'trash', count: 5,
      reward: { money: 40 }, stat: { fitness: 2 } },
    { id: 'food-shift', type: 'minigame', minigame: 'food-shift',
      reward: { money: 60 }, stat: { energy: -5, fun: 3 } },
    { id: 'first-wheels', type: 'reach', target: 'gas-station',
      reward: { money: 0, item: 'map-marker' } },
  ],
  onComplete: { reputation: 1, unlock: 'driving' },
}
```

Step `type`s reuse existing systems where possible: `collect` (trash job),
`minigame` (timing-game framework), `reach` (location trigger), `talk`,
`deliver`, `defeat`. Rewards map onto the existing wallet + `state.stats`
({health, energy, fitness, hygiene, fun, smarts}) — no invented stats.

---

## 5. Relationship & memory

- **Familiarity** increments on interaction; thresholds switch greeting tone
  (stranger → known → regular → ally).
- **Flags** record story beats (`introOffered`, `introDone`) so options appear
  once and chains don't repeat.
- **Reputation** is town-scoped and can gate luxury/status content (Rich Hills,
  Casino) per the town roadmap.

Memory lives on the NPC profile's `memory` object at runtime and can persist via
the existing save system when wired.

---

## 6. Non-breaking adoption

- Configs are pure data, not imported by the engine yet.
- When wiring, route NPC interactions through a small resolver that reads
  `townNPCProfiles` → `npcDialogueTrees` → `missionChains`, reusing
  `startTimingGame`/job systems for step execution.
- Start with **one** recurring mission-giver in Starter Town, verify, then
  expand per town.
