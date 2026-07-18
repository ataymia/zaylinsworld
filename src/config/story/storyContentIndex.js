import { STARTER_TOWN_STORY_PACK } from './packs/starterTownStoryPack.js';
import { FISHING_HARBOR_STORY_PACK } from './packs/fishingHarborStoryPack.js';
import { RICH_HILLS_STORY_PACK } from './packs/richHillsStoryPack.js';
import { TECH_CITY_STORY_PACK } from './packs/techTownStoryPack.js';
import { CASINO_STRIP_STORY_PACK } from './packs/casinoStripStoryPack.js';
import { DUNGEON_OUTSKIRTS_STORY_PACK } from './packs/dungeonOutskirtsStoryPack.js';
import { OBBY_CANYON_STORY_PACK } from './packs/obbyCanyonStoryPack.js';
import { STARLINE_CITY_STORY_PACK } from './packs/starlineCityStoryPack.js';
import { AQUALUME_STORY_PACK } from './packs/aqualumeStoryPack.js';
import { WORLD_STORY_PACK } from './packs/worldStoryPack.js';

const uniqueById = (items) => {
  const map = new Map();
  for (const item of items) {
    const current = map.get(item.id);
    if (!current) {
      map.set(item.id, item);
      continue;
    }
    map.set(item.id, {
      ...current,
      ...item,
      questArcIds: [...new Set([...(current.questArcIds || []), ...(item.questArcIds || [])])],
      questIds: [...new Set([...(current.questIds || []), ...(item.questIds || [])])],
      topics: [...new Set([...(current.topics || []), ...(item.topics || [])])].slice(0, 8),
      tags: [...new Set([...(current.tags || []), ...(item.tags || [])])],
    });
  }
  return Object.freeze([...map.values()]);
};

export const STORY_PACKS = Object.freeze([STARTER_TOWN_STORY_PACK, FISHING_HARBOR_STORY_PACK, RICH_HILLS_STORY_PACK, TECH_CITY_STORY_PACK, CASINO_STRIP_STORY_PACK, DUNGEON_OUTSKIRTS_STORY_PACK, OBBY_CANYON_STORY_PACK, STARLINE_CITY_STORY_PACK, AQUALUME_STORY_PACK, WORLD_STORY_PACK]);
export const FULL_GAME_QUEST_ARCS = Object.freeze(STORY_PACKS.flatMap((pack) => pack.arcs));
export const FULL_GAME_QUESTS = Object.freeze(STORY_PACKS.flatMap((pack) => pack.quests));
export const FULL_NPC_ROSTER = uniqueById(STORY_PACKS.flatMap((pack) => pack.npcs));
export const FULL_DIALOGUE_CATALOG = uniqueById(STORY_PACKS.flatMap((pack) => pack.dialogueProfiles));
export const FULL_CONSEQUENCE_CATALOG = Object.freeze(STORY_PACKS.flatMap((pack) => pack.consequences));
export const REPEATABLE_MISSION_CATALOG = Object.freeze(STORY_PACKS.flatMap((pack) => pack.repeatables));

export const FULL_GAME_QUESTS_BY_ID = Object.freeze(Object.fromEntries(FULL_GAME_QUESTS.map((quest) => [quest.id, quest])));
export const FULL_GAME_ARCS_BY_ID = Object.freeze(Object.fromEntries(FULL_GAME_QUEST_ARCS.map((arc) => [arc.id, arc])));
export const FULL_NPCS_BY_ID = Object.freeze(Object.fromEntries(FULL_NPC_ROSTER.map((npc) => [npc.id, npc])));

const explicitDialogueLines = FULL_DIALOGUE_CATALOG.reduce((total, profile) => {
  const topicLines = Object.values(profile.topicResponses || {}).reduce((sum, lines) => sum + lines.length, 0);
  return total
    + Object.keys(profile.greetingsByRelationship || {}).length
    + Object.keys(profile.scheduleReactions || {}).length
    + (profile.smallTalk || []).length
    + (profile.personalTopics || []).length
    + topicLines
    + Object.keys(profile.questConversation || {}).length
    + (profile.worldStateReactions || []).length
    + (profile.farewells || []).length
    + (profile.signatureLine ? 1 : 0);
}, 0);

export const STORY_CONTENT_COUNTS = Object.freeze({
  storyPacks: STORY_PACKS.length,
  questArcs: FULL_GAME_QUEST_ARCS.length,
  plannedQuests: FULL_GAME_QUESTS.length,
  recurringNpcs: FULL_NPC_ROSTER.length,
  dialogueProfiles: FULL_DIALOGUE_CATALOG.length,
  consequenceContracts: FULL_CONSEQUENCE_CATALOG.length,
  repeatableMissionFamilies: REPEATABLE_MISSION_CATALOG.length,
  explicitDialogueLines,
});

export const STORY_IMPLEMENTATION_CONTRACT = Object.freeze({
  activationRule: 'A planned quest becomes runtime only after every required physical event hook exists and is tested.',
  singleCommandGoal: 'npm run story:compile',
  sourceOfTruth: 'src/config/story/packs/*.js',
  forbiddenShortcuts: [
    'Do not replace named NPC conversations with one-line greetings.',
    'Do not silently erase route decisions.',
    'Do not make crime mandatory.',
    'Do not unlock teleport destinations before physical discovery.',
    'Do not promote a planned quest when its event hooks do not exist.',
  ],
});

export function storyPackForTown(townId) {
  return STORY_PACKS.find((pack) => pack.townId === townId) || null;
}

export function questsForArc(arcId) {
  return FULL_GAME_QUESTS.filter((quest) => quest.arcId === arcId).sort((a, b) => a.chapter - b.chapter);
}
