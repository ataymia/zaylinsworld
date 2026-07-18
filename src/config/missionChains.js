// Compatibility view over the canonical quest catalog. The old file contained a
// handful of disconnected skeleton chains; questCatalog.js now owns progression,
// objectives, rewards, prerequisites, implementation status, and consequences.

import { QUEST_CATALOG } from './questCatalog.js';

export const MISSION_CHAINS = Object.freeze(Object.fromEntries(
  QUEST_CATALOG.map((quest) => [quest.id, Object.freeze({
    id: quest.id,
    town: quest.townId,
    giver: quest.giverId || null,
    title: quest.title,
    summary: quest.summary,
    category: quest.category,
    implementation: quest.implementation,
    prerequisites: quest.prerequisites,
    steps: quest.objectives,
    rewards: quest.rewards,
    unlocks: quest.unlocks,
    consequenceRefs: quest.consequenceRefs,
  })]),
));

export default MISSION_CHAINS;
