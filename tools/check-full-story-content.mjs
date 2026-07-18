import {
  FULL_GAME_QUESTS,
  FULL_GAME_QUEST_ARCS,
  FULL_NPC_ROSTER,
  FULL_DIALOGUE_CATALOG,
  FULL_CONSEQUENCE_CATALOG,
  REPEATABLE_MISSION_CATALOG,
  STORY_CONTENT_COUNTS,
} from '../src/config/story/storyContentIndex.js';

const errors = [];
const unique = (items, label) => {
  const seen = new Set();
  for (const item of items) {
    if (!item?.id) errors.push(`${label} missing id`);
    else if (seen.has(item.id)) errors.push(`duplicate ${label} id: ${item.id}`);
    else seen.add(item.id);
  }
  return seen;
};

const arcIds = unique(FULL_GAME_QUEST_ARCS, 'arc');
const questIds = unique(FULL_GAME_QUESTS, 'quest');
const npcIds = unique(FULL_NPC_ROSTER, 'npc');
unique(FULL_DIALOGUE_CATALOG, 'dialogue');
const consequenceIds = unique(FULL_CONSEQUENCE_CATALOG, 'consequence');
const repeatableIds = unique(REPEATABLE_MISSION_CATALOG, 'repeatable');

if (FULL_GAME_QUEST_ARCS.length !== 100) errors.push(`expected 100 arcs, found ${FULL_GAME_QUEST_ARCS.length}`);
if (FULL_GAME_QUESTS.length !== 800) errors.push(`expected 800 planned quests, found ${FULL_GAME_QUESTS.length}`);
if (FULL_NPC_ROSTER.length !== 120) errors.push(`expected 120 recurring NPCs, found ${FULL_NPC_ROSTER.length}`);
if (FULL_DIALOGUE_CATALOG.length !== 120) errors.push(`expected 120 dialogue profiles, found ${FULL_DIALOGUE_CATALOG.length}`);
if (FULL_CONSEQUENCE_CATALOG.length !== 100) errors.push(`expected 100 consequence contracts, found ${FULL_CONSEQUENCE_CATALOG.length}`);
if (REPEATABLE_MISSION_CATALOG.length !== 100) errors.push(`expected 100 repeatable families, found ${REPEATABLE_MISSION_CATALOG.length}`);
if (STORY_CONTENT_COUNTS.explicitDialogueLines < 5000) errors.push(`expected at least 5000 explicit dialogue lines, found ${STORY_CONTENT_COUNTS.explicitDialogueLines}`);

for (const arc of FULL_GAME_QUEST_ARCS) {
  if (arc.chapterIds?.length !== 8) errors.push(`${arc.id} must have exactly 8 chapters`);
  for (const id of arc.chapterIds || []) if (!questIds.has(id)) errors.push(`${arc.id} references missing quest ${id}`);
  if (!npcIds.has(arc.leadNpcId)) errors.push(`${arc.id} references missing lead NPC ${arc.leadNpcId}`);
  if (!consequenceIds.has(`${arc.id}-choice`)) errors.push(`${arc.id} missing consequence contract`);
  if (!repeatableIds.has(`repeat-${arc.id}`)) errors.push(`${arc.id} missing repeatable family`);
}

for (const quest of FULL_GAME_QUESTS) {
  if (!arcIds.has(quest.arcId)) errors.push(`${quest.id} references missing arc ${quest.arcId}`);
  for (const id of quest.prerequisites || []) if (!questIds.has(id)) errors.push(`${quest.id} prerequisite missing: ${id}`);
  for (const id of quest.unlocks || []) if (!questIds.has(id)) errors.push(`${quest.id} unlock missing: ${id}`);
  for (const id of quest.npcIds || []) if (!npcIds.has(id)) errors.push(`${quest.id} NPC missing: ${id}`);
  for (const id of quest.consequenceRefs || []) if (!consequenceIds.has(id)) errors.push(`${quest.id} consequence missing: ${id}`);
  const objectiveIds = new Set();
  for (const objective of quest.objectives || []) {
    if (!objective.id || !objective.event || !objective.text) errors.push(`${quest.id} has malformed objective`);
    if (objectiveIds.has(objective.id)) errors.push(`${quest.id} duplicate objective id ${objective.id}`);
    objectiveIds.add(objective.id);
    if ((objective.count || 0) < 1) errors.push(`${quest.id}/${objective.id} invalid count`);
  }
}

for (const npc of FULL_NPC_ROSTER) {
  const profile = FULL_DIALOGUE_CATALOG.find((entry) => entry.npcId === npc.id);
  if (!profile) errors.push(`${npc.id} missing dialogue profile`);
  for (const arcId of npc.questArcIds || []) if (!arcIds.has(arcId)) errors.push(`${npc.id} references missing arc ${arcId}`);
  for (const questId of npc.questIds || []) if (!questIds.has(questId)) errors.push(`${npc.id} references missing quest ${questId}`);
}

for (const profile of FULL_DIALOGUE_CATALOG) {
  if (!npcIds.has(profile.npcId)) errors.push(`${profile.id} references missing NPC ${profile.npcId}`);
  for (const arcId of profile.questConversation?.arcIds || []) if (!arcIds.has(arcId)) errors.push(`${profile.id} references missing arc ${arcId}`);
}

for (const consequence of FULL_CONSEQUENCE_CATALOG) {
  if (!arcIds.has(consequence.arcId)) errors.push(`${consequence.id} references missing arc ${consequence.arcId}`);
  if (!consequence.routeA?.opens?.length || !consequence.routeB?.opens?.length) errors.push(`${consequence.id} routes must open content`);
  if (!consequence.routeA?.closes?.length || !consequence.routeB?.closes?.length) errors.push(`${consequence.id} routes must close content`);
  if (!consequence.recovery?.available) errors.push(`${consequence.id} missing recovery route`);
}

if (errors.length) {
  console.error(`Full story audit failed with ${errors.length} error(s):`);
  errors.forEach((error) => console.error(` - ${error}`));
  process.exit(1);
}

console.log('Full story content audit passed.');
console.log(JSON.stringify(STORY_CONTENT_COUNTS, null, 2));
