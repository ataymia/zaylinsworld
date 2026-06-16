// ───────────────────────────────────────────────────────────────────────────
//  missionChains.js — multi-step quest data skeleton (NOT wired).
//
//  Pure data. Keyed by mission id referenced from townNPCProfiles.js /
//  npcDialogueTrees.js. Step `type`s reuse existing systems where possible:
//    collect  → pick up N of a target (reuses the trash-job style loop)
//    minigame → run a minigame id (minigameCatalog.js)
//    reach    → arrive at a location/landmark
//    talk     → speak to an NPC
//    deliver  → carry item A to target B
//    defeat   → down N enemies (dungeon/combat)
//  Rewards map ONTO existing systems only: wallet money + state.stats
//  ({health, energy, fitness, hygiene, fun, smarts}) + item ids. No invented
//  stats. See docs/NPC_MISSION_SYSTEM.md §4.
// ───────────────────────────────────────────────────────────────────────────

export const MISSION_CHAINS = Object.freeze({
  'intro-jobs': {
    town: 'starter-town', giver: 'gym-trainer', title: 'Finding Your Footing',
    steps: [
      { id: 'clean-up', type: 'collect', target: 'trash', count: 5, reward: { money: 40 }, stat: { fitness: 2 } },
      { id: 'food-shift', type: 'minigame', minigame: 'food-shift', reward: { money: 60 }, stat: { energy: -5, fun: 3 } },
      { id: 'first-wheels', type: 'reach', target: 'gas-station', reward: { item: 'map-marker' } },
    ],
    onComplete: { reputation: 1, unlock: 'driving' },
  },
  'fishing-quotas': {
    town: 'fishing-harbor', giver: 'harbor-master', title: "Harbor Master's Quota",
    steps: [
      { id: 'catch-small', type: 'minigame', minigame: 'fishing', count: 3, reward: { money: 75 }, stat: { fun: 4 } },
      { id: 'sell-catch', type: 'deliver', item: 'fish', target: 'seafood-market', reward: { money: 50 } },
      { id: 'rare-hunt', type: 'minigame', minigame: 'fishing', count: 1, reward: { money: 150, item: 'rare-fish' } },
    ],
    onComplete: { reputation: 1, unlock: 'fish-transform' },
  },
  'dungeon-clears': {
    town: 'dungeon-outskirts', giver: 'quest-giver', title: 'Into the Ruins',
    steps: [
      { id: 'first-dive', type: 'minigame', minigame: 'dungeon-crawl', reward: { money: 120, item: 'loot-cache' }, stat: { health: -10 } },
      { id: 'forge-edge', type: 'talk', target: 'blacksmith', reward: {} },
      { id: 'boss', type: 'defeat', target: 'ruin-boss', count: 1, reward: { money: 300, item: 'boss-relic' } },
    ],
    onComplete: { reputation: 2, unlock: 'deep-dungeon' },
  },
  'high-roller': {
    town: 'casino-strip', giver: 'loan-shark', title: "Kade's Favor",
    steps: [
      { id: 'win-big', type: 'minigame', minigame: 'blackjack', reward: { money: 0 }, note: 'reach a chip threshold' },
      { id: 'collect-debt', type: 'reach', target: 'pawn-shop', reward: { money: 200 } },
    ],
    onComplete: { reputation: -1, unlock: 'vip-floor' },
  },
  'debug-contracts': {
    town: 'tech-city', giver: 'startup-founder', title: 'Ship It',
    steps: [
      { id: 'fix-bug', type: 'minigame', minigame: 'coding-puzzle', reward: { money: 140 }, stat: { smarts: 3 } },
      { id: 'fly-drone', type: 'minigame', minigame: 'drone-pilot', reward: { money: 120 } },
    ],
    onComplete: { reputation: 1, unlock: 'lab-access' },
  },
  'rising-star': {
    town: 'hollywood-fame', giver: 'agent', title: 'First Audition',
    steps: [
      { id: 'audition', type: 'minigame', minigame: 'rhythm-audition', reward: { money: 100, item: 'fame:5' }, stat: { fun: 5 } },
      { id: 'photo-shoot', type: 'reach', target: 'studio', reward: { item: 'fame:5' } },
    ],
    onComplete: { reputation: 1, unlock: 'gigs' },
  },
});

export default MISSION_CHAINS;
