// ───────────────────────────────────────────────────────────────────────────
//  townThemes.js — per-town theme data skeleton (NOT wired into gameplay).
//
//  Pure data. One entry per town in docs/TOWN_ROADMAP.md, keyed by the `themeId`
//  referenced from src/config/worldMapPlan.js DISTRICTS. Holds the visual palette
//  + the ids of the services, stores, minigames, NPC profiles, and mission chains
//  that town offers. The ids point at:
//    - minigame ids   → src/config/minigameCatalog.js
//    - npcProfile ids → src/config/townNPCProfiles.js
//    - mission ids    → src/config/missionChains.js
//  These are design references for future towns; Starter Town gameplay still
//  runs from the existing engine code, not from this file.
// ───────────────────────────────────────────────────────────────────────────

export const TOWN_THEMES = Object.freeze({
  starter: {
    name: 'Starter Town',
    palette: { sky: '#9fc3e8', ground: '#5b6b52', accent: '#c8a24a', road: '#3a3d42' },
    mood: 'everyday small city',
    services: ['police', 'gym', 'fuel', 'food', 'home'],
    stores: ['block-supply', 'mini-market', 'chicken-spot', 'frostbox'],
    minigames: ['clippers-lineup', 'gym-training', 'food-shift', 'driving'],
    npcProfiles: ['shop-clerk', 'police-officer', 'gym-trainer', 'pedestrian'],
    missionChains: ['intro-jobs'],
    economy: { wageTier: 'low', priceTier: 'low' },
    legal: { policed: true, wantedSystem: true },
  },
  fishing: {
    name: 'Fishing Harbor',
    palette: { sky: '#bcd6e6', ground: '#6b7d6a', accent: '#2f7fa8', road: '#4a4f55' },
    mood: 'coastal docks',
    services: ['harbor-master', 'boat-repair', 'fuel-dock'],
    stores: ['bait-tackle', 'seafood-market', 'boat-rental', 'dockside-diner'],
    minigames: ['fishing', 'fish-transform', 'crab-traps'],
    npcProfiles: ['fisher', 'market-vendor', 'harbor-master'],
    missionChains: ['fishing-quotas'],
    economy: { wageTier: 'medium', priceTier: 'medium', special: 'fish-rarity-market' },
    legal: { policed: false, permits: ['fishing-permit'] },
  },
  dungeon: {
    name: 'Dungeon Outskirts',
    palette: { sky: '#3a3550', ground: '#2e2a33', accent: '#7a3b3b', road: '#26222a' },
    mood: 'dark ruins',
    services: ['healer', 'stash', 'shrine'],
    stores: ['adventurer-supply', 'blacksmith', 'potions'],
    minigames: ['dungeon-crawl', 'boss-fight'],
    npcProfiles: ['blacksmith', 'healer', 'quest-giver'],
    missionChains: ['dungeon-clears'],
    economy: { wageTier: 'variable', priceTier: 'high', special: 'loot-economy' },
    legal: { policed: false, pve: true },
  },
  obby: {
    name: 'Obby Canyon',
    palette: { sky: '#ffd9a0', ground: '#caa15a', accent: '#ff6f61', road: '#b3854a' },
    mood: 'colorful platforming',
    services: ['respawn-beacon', 'leaderboard'],
    stores: ['cosmetic-shop', 'checkpoint-pass'],
    minigames: ['obby-course', 'time-trial'],
    npcProfiles: ['course-host', 'cosmetic-vendor'],
    missionChains: ['obby-courses'],
    economy: { wageTier: 'reward', priceTier: 'cosmetic' },
    legal: { policed: false, fallReset: true },
  },
  casino: {
    name: 'Casino Strip',
    palette: { sky: '#1a1030', ground: '#2a2140', accent: '#ff3da6', road: '#201838' },
    mood: 'neon strip',
    services: ['bank', 'hotel', 'security'],
    stores: ['casino-royale', 'arcade', 'pawn-shop', 'luxury-boutique'],
    minigames: ['slots', 'blackjack', 'roulette', 'prize-wheel', 'arcade'],
    npcProfiles: ['dealer', 'high-roller', 'loan-shark', 'security-guard'],
    missionChains: ['high-roller'],
    economy: { wageTier: 'variable', priceTier: 'high', special: 'house-edge' },
    legal: { policed: true, cheatingBanned: true, debtRisk: true },
  },
  rich: {
    name: 'Rich Hills',
    palette: { sky: '#cfe6f2', ground: '#7fa36b', accent: '#d9c27a', road: '#454b50' },
    mood: 'wealthy hillside',
    services: ['private-clinic', 'valet', 'estate-agent'],
    stores: ['luxury-cars', 'real-estate', 'designer-fashion', 'jewelry'],
    minigames: ['golf', 'yacht-run', 'car-show'],
    npcProfiles: ['concierge', 'private-security', 'estate-agent'],
    missionChains: ['concierge-errands'],
    economy: { wageTier: 'high', priceTier: 'luxury', special: 'property-income' },
    legal: { policed: true, privateSecurity: true, statusGated: true },
  },
  tech: {
    name: 'Tech City',
    palette: { sky: '#0e1830', ground: '#2a3550', accent: '#36d3ff', road: '#1a2740' },
    mood: 'futuristic downtown',
    services: ['clinic', 'transit-hub', 'charging'],
    stores: ['electronics', 'drone-shop', 'gadget-lab', 'co-working'],
    minigames: ['coding-puzzle', 'drone-pilot', 'hacking'],
    npcProfiles: ['engineer', 'startup-founder', 'corp-security'],
    missionChains: ['debug-contracts'],
    economy: { wageTier: 'high', priceTier: 'medium', special: 'skill-pay' },
    legal: { policed: true, cybercrimeHeat: true },
  },
  hollywood: {
    name: 'Hollywood / Fame',
    palette: { sky: '#ffe0c0', ground: '#b89a6a', accent: '#ff4d6d', road: '#4a4038' },
    mood: 'studios & red carpets',
    services: ['agency', 'studio', 'salon'],
    stores: ['wardrobe', 'talent-agency', 'music-store'],
    minigames: ['rhythm-audition', 'dance-battle', 'talk-show'],
    npcProfiles: ['agent', 'paparazzi', 'director', 'fan'],
    missionChains: ['rising-star'],
    economy: { wageTier: 'variable', priceTier: 'high', special: 'fame-currency' },
    legal: { policed: true, scandalMeter: true },
  },
});

export default TOWN_THEMES;
