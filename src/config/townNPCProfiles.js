// ───────────────────────────────────────────────────────────────────────────
//  townNPCProfiles.js — role/personality NPC data skeleton (NOT wired).
//
//  Pure data. Profiles are grouped by town id (matches worldMapPlan.js district
//  ids) and reference dialogue trees (npcDialogueTrees.js), mission chains
//  (missionChains.js), and minigames (minigameCatalog.js). See
//  docs/NPC_MISSION_SYSTEM.md for the schema and adoption plan. Starter Town
//  gameplay still runs from engine code — this is forward-looking design data.
// ───────────────────────────────────────────────────────────────────────────

// Personality → tone selector used by dialogue trees' `text` maps.
export const PERSONALITIES = Object.freeze(['friendly', 'gruff', 'nervous', 'greedy', 'cheery', 'cool']);

export const TOWN_NPC_PROFILES = Object.freeze({
  'starter-town': [
    { id: 'gym-trainer', role: 'trainer', name: 'Coach Rell', personality: 'gruff',
      recurring: true, services: ['gym-training'], missionChains: ['intro-jobs'],
      dialogueTree: 'trainer-default', memory: { familiarity: 0, flags: [] } },
    { id: 'shop-clerk', role: 'clerk', name: 'Maya', personality: 'cheery',
      recurring: true, services: ['open-shop'], missionChains: [],
      dialogueTree: 'clerk-default', memory: { familiarity: 0, flags: [] } },
    { id: 'police-officer', role: 'police', name: 'Officer Dane', personality: 'cool',
      recurring: true, services: ['police-desk'], missionChains: [],
      dialogueTree: 'cop-default', memory: { familiarity: 0, flags: [] } },
    { id: 'pedestrian', role: 'civilian', name: null, personality: 'friendly',
      recurring: false, services: [], missionChains: [],
      dialogueTree: 'smalltalk', memory: { familiarity: 0, flags: [] } },
  ],
  'fishing-harbor': [
    { id: 'harbor-master', role: 'authority', name: 'Cap Odell', personality: 'gruff',
      recurring: true, services: ['boat-rental'], missionChains: ['fishing-quotas'],
      dialogueTree: 'harbor-default', memory: { familiarity: 0, flags: [] } },
    { id: 'market-vendor', role: 'vendor', name: 'Sela', personality: 'greedy',
      recurring: true, services: ['open-shop'], missionChains: [],
      dialogueTree: 'vendor-default', memory: { familiarity: 0, flags: [] } },
  ],
  'casino-strip': [
    { id: 'dealer', role: 'dealer', name: 'Vince', personality: 'cool',
      recurring: true, services: ['blackjack', 'roulette'], missionChains: [],
      dialogueTree: 'dealer-default', memory: { familiarity: 0, flags: [] } },
    { id: 'loan-shark', role: 'antagonist', name: 'Mr. Kade', personality: 'greedy',
      recurring: true, services: [], missionChains: ['high-roller'],
      dialogueTree: 'loanshark-default', memory: { familiarity: 0, flags: [] } },
  ],
  'dungeon-outskirts': [
    { id: 'blacksmith', role: 'vendor', name: 'Borin', personality: 'gruff',
      recurring: true, services: ['weapon-upgrade'], missionChains: ['dungeon-clears'],
      dialogueTree: 'smith-default', memory: { familiarity: 0, flags: [] } },
    { id: 'quest-giver', role: 'quest-giver', name: 'Elder Wyn', personality: 'friendly',
      recurring: true, services: [], missionChains: ['dungeon-clears'],
      dialogueTree: 'elder-default', memory: { familiarity: 0, flags: [] } },
  ],
  'tech-city': [
    { id: 'startup-founder', role: 'quest-giver', name: 'Priya', personality: 'cheery',
      recurring: true, services: [], missionChains: ['debug-contracts'],
      dialogueTree: 'founder-default', memory: { familiarity: 0, flags: [] } },
  ],
  'hollywood-fame': [
    { id: 'agent', role: 'quest-giver', name: 'Lana', personality: 'cool',
      recurring: true, services: [], missionChains: ['rising-star'],
      dialogueTree: 'agent-default', memory: { familiarity: 0, flags: [] } },
    { id: 'paparazzi', role: 'antagonist', name: null, personality: 'nervous',
      recurring: false, services: [], missionChains: [],
      dialogueTree: 'paparazzi-default', memory: { familiarity: 0, flags: [] } },
  ],
});

export default TOWN_NPC_PROFILES;
