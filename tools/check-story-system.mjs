import { QUEST_CATALOG, QUESTS_BY_ID, QUEST_IMPLEMENTATION } from '../src/config/questCatalog.js';
import { STORY_CONSEQUENCES } from '../src/config/storyConsequences.js';
import { NPC_STORY_CATALOG, NPCS_BY_ID } from '../src/config/npcStoryCatalog.js';
import { DIALOGUE_TREES } from '../src/config/npcDialogueTrees.js';
import { MISSION_CHAINS } from '../src/config/missionChains.js';
import { TOWN_NPC_PROFILES } from '../src/config/townNPCProfiles.js';

const errors = [];
const warn = [];
const seen = new Set();

for (const quest of QUEST_CATALOG) {
  if (!quest.id || !quest.title || !quest.summary) errors.push(`Quest missing required identity: ${JSON.stringify(quest)}`);
  if (seen.has(quest.id)) errors.push(`Duplicate quest id: ${quest.id}`);
  seen.add(quest.id);
  if (!['story', 'town', 'people', 'career', 'activities'].includes(quest.category)) errors.push(`Unknown category ${quest.category} on ${quest.id}`);
  if (!Object.values(QUEST_IMPLEMENTATION).includes(quest.implementation)) errors.push(`Unknown implementation ${quest.implementation} on ${quest.id}`);
  for (const prereq of quest.prerequisites) if (!QUESTS_BY_ID[prereq]) errors.push(`${quest.id} has missing prerequisite ${prereq}`);
  for (const unlock of quest.unlocks) if (!QUESTS_BY_ID[unlock]) errors.push(`${quest.id} unlocks missing quest ${unlock}`);
  for (const ref of quest.consequenceRefs) if (!STORY_CONSEQUENCES[ref]) errors.push(`${quest.id} references missing consequence ${ref}`);
  const objectiveIds = new Set();
  for (const objective of quest.objectives) {
    if (objectiveIds.has(objective.id)) errors.push(`${quest.id} has duplicate objective ${objective.id}`);
    objectiveIds.add(objective.id);
    if (!objective.text || !objective.event) errors.push(`${quest.id}/${objective.id} missing text or event`);
    if (!Number.isInteger(objective.count) || objective.count < 1) errors.push(`${quest.id}/${objective.id} has invalid count`);
  }
  if (quest.implementation === 'runtime' && !quest.objectives.length) errors.push(`Runtime quest ${quest.id} has no objectives`);
  if (quest.giverId && !NPCS_BY_ID[quest.giverId]) warn.push(`${quest.id} giver ${quest.giverId} is reserved but not in recurring NPC catalog`);
}

for (const npc of NPC_STORY_CATALOG) {
  if (!npc.id || !npc.name || !npc.townId || !npc.role) errors.push(`NPC missing required identity: ${JSON.stringify(npc)}`);
  for (const questId of npc.questIds) if (!QUESTS_BY_ID[questId]) errors.push(`NPC ${npc.id} references missing quest ${questId}`);
}

for (const [treeId, dialogue] of Object.entries(DIALOGUE_TREES)) {
  if (!dialogue.start || !dialogue.nodes?.[dialogue.start]) errors.push(`Dialogue ${treeId} has invalid start node`);
  if (dialogue.npcId && !NPCS_BY_ID[dialogue.npcId]) errors.push(`Dialogue ${treeId} references missing NPC ${dialogue.npcId}`);
  for (const [nodeId, node] of Object.entries(dialogue.nodes || {})) {
    for (const option of node.options || []) {
      if (option.goto && !dialogue.nodes[option.goto]) errors.push(`Dialogue ${treeId}/${nodeId} points to missing node ${option.goto}`);
      const offered = option.action?.offerQuest || option.action?.startQuest;
      if (offered && !QUESTS_BY_ID[offered]) errors.push(`Dialogue ${treeId}/${nodeId} offers missing quest ${offered}`);
    }
  }
}

if (Object.keys(MISSION_CHAINS).length !== QUEST_CATALOG.length) errors.push('missionChains compatibility view does not match quest catalog size');
const groupedNpcCount = Object.values(TOWN_NPC_PROFILES).reduce((sum, list) => sum + list.length, 0);
if (groupedNpcCount !== NPC_STORY_CATALOG.length) errors.push('townNPCProfiles compatibility view lost NPC records');

console.log(`Story system audit: ${QUEST_CATALOG.length} quests, ${NPC_STORY_CATALOG.length} recurring NPCs, ${Object.keys(DIALOGUE_TREES).length} dialogue trees, ${Object.keys(STORY_CONSEQUENCES).length} consequence contracts.`);
for (const message of warn) console.warn(`WARN: ${message}`);
if (errors.length) {
  for (const message of errors) console.error(`ERROR: ${message}`);
  process.exitCode = 1;
} else {
  console.log('Story system audit passed.');
}
