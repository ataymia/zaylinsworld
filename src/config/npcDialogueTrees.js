// ───────────────────────────────────────────────────────────────────────────
//  npcDialogueTrees.js — branching dialogue data skeleton (NOT wired).
//
//  Pure data. Keyed by `dialogueTree` id referenced from townNPCProfiles.js.
//  Node schema (see docs/NPC_MISSION_SYSTEM.md §3):
//    text   : string | { <personality>: line }    (personality from the NPC)
//    options: [{ label, goto?, end?, requires?, action?, setFlag? }]
//    action : { openMinigame?, startMission?, openShop?, giveItem?, setReputation? }
//    requires: { flag?, flagNot?, minMoney?, minStat?: {stat,value}, town? }
//  A resolver wired later interprets `action`/`requires`; this file holds no
//  engine logic so it stays additive and safe.
// ───────────────────────────────────────────────────────────────────────────

export const DIALOGUE_TREES = Object.freeze({
  'trainer-default': {
    start: 'greet',
    nodes: {
      greet: {
        text: { friendly: "Back for more? Let's go!", gruff: 'You here to train or chat?' },
        options: [
          { label: 'Train me', goto: 'train' },
          { label: 'Any work?', goto: 'work', requires: { flagNot: 'introOffered' } },
          { label: 'Later', end: true },
        ],
      },
      train: { text: 'Pick your station.', action: { openMinigame: 'gym-training' }, options: [{ label: 'Done', end: true }] },
      work: { text: "Prove you've got grit. Start here.", action: { startMission: 'intro-jobs' }, setFlag: 'introOffered', options: [{ label: "I'm in", end: true }] },
    },
  },
  'clerk-default': {
    start: 'greet',
    nodes: {
      greet: {
        text: { cheery: 'Welcome in! Looking for anything?', friendly: 'Hey there — need something?' },
        options: [
          { label: 'Show me the goods', action: { openShop: true }, end: true },
          { label: 'Just browsing', end: true },
        ],
      },
    },
  },
  'cop-default': {
    start: 'greet',
    nodes: {
      greet: {
        text: { cool: 'Keep it clean and we won\'t have a problem.' },
        options: [
          { label: 'Front desk', action: { openShop: 'police-desk' }, end: true },
          { label: 'Move along', end: true },
        ],
      },
    },
  },
  'smalltalk': {
    start: 'greet',
    nodes: {
      greet: {
        text: { friendly: 'Nice day, huh?', nervous: 'Oh — uh, hi.', cheery: 'Hey hey!' },
        options: [{ label: 'Hey', end: true }],
      },
    },
  },
  'harbor-default': {
    start: 'greet',
    nodes: {
      greet: {
        text: { gruff: 'Tide\'s good. You fishing or just standing on my dock?' },
        options: [
          { label: 'Rent a boat', action: { openShop: 'boat-rental' }, end: true },
          { label: 'Got work?', action: { startMission: 'fishing-quotas' }, end: true },
          { label: 'Later', end: true },
        ],
      },
    },
  },
  'vendor-default': {
    start: 'greet',
    nodes: { greet: { text: { greedy: 'Best prices on the coast — for you, almost.' }, options: [{ label: 'Buy', action: { openShop: true }, end: true }, { label: 'No thanks', end: true }] } },
  },
  'dealer-default': {
    start: 'greet',
    nodes: { greet: { text: { cool: 'Place your bets. House always thanks you.' }, options: [{ label: 'Blackjack', action: { openMinigame: 'blackjack' }, end: true }, { label: 'Roulette', action: { openMinigame: 'roulette' }, end: true }, { label: 'Walk away', end: true }] } },
  },
  'loanshark-default': {
    start: 'greet',
    nodes: { greet: { text: { greedy: 'Need a little... liquidity? I can help. For a price.' }, options: [{ label: 'Hear the offer', action: { startMission: 'high-roller' }, end: true }, { label: 'Not today', end: true }] } },
  },
  'smith-default': {
    start: 'greet',
    nodes: { greet: { text: { gruff: 'Bring me steel and coin, I\'ll bring you an edge.' }, options: [{ label: 'Upgrade weapon', action: { openShop: 'weapon-upgrade' }, end: true }, { label: 'Quests?', action: { startMission: 'dungeon-clears' }, end: true }, { label: 'Later', end: true }] } },
  },
  'elder-default': {
    start: 'greet',
    nodes: { greet: { text: { friendly: 'The ruins stir again. Will you answer?' }, options: [{ label: 'Accept the call', action: { startMission: 'dungeon-clears' }, end: true }, { label: 'Not yet', end: true }] } },
  },
  'founder-default': {
    start: 'greet',
    nodes: { greet: { text: { cheery: 'We ship fast here. Got an engineer\'s eye?' }, options: [{ label: 'Take a contract', action: { startMission: 'debug-contracts' }, end: true }, { label: 'Maybe later', end: true }] } },
  },
  'agent-default': {
    start: 'greet',
    nodes: { greet: { text: { cool: 'Stars are made, not born. Want me to make you?' }, options: [{ label: 'Make me a star', action: { startMission: 'rising-star' }, end: true }, { label: 'Think about it', end: true }] } },
  },
  'paparazzi-default': {
    start: 'greet',
    nodes: { greet: { text: { nervous: 'Just — one shot! Come on!' }, options: [{ label: 'No comment', end: true }] } },
  },
});

export default DIALOGUE_TREES;
