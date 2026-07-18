// Compatibility view over the canonical recurring-character roster.
// New story work belongs in npcStoryCatalog.js; this grouped export preserves the
// older town-aware API expected by planning documents and future resolvers.

import { NPC_STORY_CATALOG } from './npcStoryCatalog.js';

export const PERSONALITIES = Object.freeze(Array.from(new Set(NPC_STORY_CATALOG.map((npc) => npc.personality))));

export const TOWN_NPC_PROFILES = Object.freeze(
  NPC_STORY_CATALOG.reduce((groups, npc) => {
    const list = groups[npc.townId] || [];
    groups[npc.townId] = Object.freeze([...list, npc]);
    return groups;
  }, {}),
);

export function npcProfilesForTown(townId) {
  return TOWN_NPC_PROFILES[townId] || Object.freeze([]);
}

export default TOWN_NPC_PROFILES;
