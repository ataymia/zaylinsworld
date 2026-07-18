import fs from 'node:fs';
import path from 'node:path';
import {
  FULL_GAME_QUESTS,
  FULL_GAME_QUEST_ARCS,
  FULL_NPC_ROSTER,
  FULL_DIALOGUE_CATALOG,
  FULL_CONSEQUENCE_CATALOG,
  REPEATABLE_MISSION_CATALOG,
  STORY_CONTENT_COUNTS,
} from '../src/config/story/storyContentIndex.js';

const root = process.cwd();
const outputDir = path.join(root, 'generated', 'story');
fs.mkdirSync(outputDir, { recursive: true });

const payload = {
  generatedAt: new Date().toISOString(),
  counts: STORY_CONTENT_COUNTS,
  questArcs: FULL_GAME_QUEST_ARCS,
  quests: FULL_GAME_QUESTS,
  npcs: FULL_NPC_ROSTER,
  dialogue: FULL_DIALOGUE_CATALOG,
  consequences: FULL_CONSEQUENCE_CATALOG,
  repeatables: REPEATABLE_MISSION_CATALOG,
};

fs.writeFileSync(path.join(outputDir, 'full-story-content.json'), JSON.stringify(payload, null, 2));
fs.writeFileSync(path.join(outputDir, 'quest-hook-manifest.json'), JSON.stringify(
  FULL_GAME_QUESTS.map((quest) => ({
    id: quest.id,
    arcId: quest.arcId,
    townId: quest.townId,
    chapter: quest.chapter,
    physicalHooks: quest.implementationNotes?.physicalHooks || [],
    location: quest.implementationNotes?.location || null,
    choiceAware: !!quest.implementationNotes?.choiceAware,
  })), null, 2,
));
console.log(`Compiled ${STORY_CONTENT_COUNTS.plannedQuests} quests across ${STORY_CONTENT_COUNTS.questArcs} arcs.`);
console.log('Wrote generated/story/full-story-content.json and quest-hook-manifest.json.');
