import { makeDialogue } from './storyConversationFactory.js';
import { makeConsequence, makeRepeatable } from './storyOutcomeFactory.js';

// Canonical factory for the complete Zaylins story package.
// Town packs provide explicit people, premises, conflicts, choices, finales, and
// unlocks. This factory expands every arc into eight implementation-ready quests,
// a recurring NPC profile, a full conversation profile, a consequence contract,
// and a repeatable mission family.

const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
};

const unique = (values) => [...new Set(values || [])];
const titleCase = (value) => String(value || '').replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const STAGES = Object.freeze([
  { id: 'invitation', title: 'The Invitation' },
  { id: 'foundation', title: 'Learn the Ground' },
  { id: 'first-run', title: 'First Real Run' },
  { id: 'complication', title: 'Trouble Arrives' },
  { id: 'choice', title: 'The Line in the Sand' },
  { id: 'consequence', title: 'The Price of the Choice' },
  { id: 'finale', title: 'Proving Ground' },
  { id: 'aftermath', title: 'A New Normal' },
]);

function objective(id, text, event, arg, count = 1, optional = false) {
  return { id, text, event, arg, count, optional };
}

function chapterObjectives(arc, stage) {
  switch (stage.id) {
    case 'invitation':
      return [objective('meet-lead', `Talk to ${arc.leadNpcName} at ${titleCase(arc.districtId)}`, 'talk-npc', arc.leadNpcId)];
    case 'foundation':
      return [
        objective('complete-training', `Complete training in ${arc.skill}`, 'complete-training', arc.id),
        objective('ask-questions', `Discuss the rules with ${arc.leadNpcName}`, 'dialogue-topic', `${arc.id}:rules`),
      ];
    case 'first-run':
      return [objective('contracts', `Complete 3 assignments involving ${arc.coreTask}`, 'complete-contract', arc.id, 3)];
    case 'complication':
      return [
        objective('clues', `Find 3 clues about why ${arc.complication}`, 'investigate-arc', arc.id, 3),
        objective('compare-stories', 'Compare two NPC accounts before deciding what happened', 'dialogue-compare', arc.id),
      ];
    case 'choice':
      return [objective('make-route-choice', `Choose: ${arc.routeA} OR ${arc.routeB}`, 'story-choice', `${arc.id}-route`)];
    case 'consequence':
      return [
        objective('route-a', `Resolve the consequences of choosing to ${arc.routeA}`, 'resolve-arc-route', `${arc.id}:a`, 1, true),
        objective('route-b', `Resolve the consequences of choosing to ${arc.routeB}`, 'resolve-arc-route', `${arc.id}:b`, 1, true),
      ];
    case 'finale':
      return [
        objective('finale', arc.finale.charAt(0).toUpperCase() + arc.finale.slice(1), 'complete-arc-finale', arc.id),
        objective('protect-consequence', 'Resolve the finale without silently erasing the chosen route', 'confirm-world-state', arc.id),
      ];
    default:
      return [
        objective('aftermath-conversation', `Return to ${arc.leadNpcName} and discuss what changed`, 'talk-npc', arc.leadNpcId),
        objective('register-repeatable', `Register the unlocked activity: ${arc.unlock}`, 'unlock-repeatable', `repeat-${arc.id}`),
      ];
  }
}

function chapterSummary(arc, stage) {
  switch (stage.id) {
    case 'invitation': return `Meet ${arc.leadNpcName} and learn the human problem behind ${arc.name}. ${arc.premise}`;
    case 'foundation': return `Train in ${arc.skill} and understand the rules before the work becomes serious.`;
    case 'first-run': return `Complete ordinary work involving ${arc.coreTask} before the arc changes shape.`;
    case 'complication': return `Investigate the complication: ${arc.complication}.`;
    case 'choice': return `Choose between ${arc.routeA} and ${arc.routeB}.`;
    case 'consequence': return 'Live through the immediate outcome, changed relationships, and altered opportunities.';
    case 'finale': return `Complete the finale: ${arc.finale}.`;
    default: return `Show the aftermath and unlock ${arc.unlock}.`;
  }
}

function makeQuest(arc, stage, chapter, baseMoney) {
  const id = `full-${arc.id}-${String(chapter).padStart(2, '0')}`;
  const next = chapter < 8 ? `full-${arc.id}-${String(chapter + 1).padStart(2, '0')}` : null;
  const objectives = chapterObjectives(arc, stage);
  return {
    id,
    arcId: arc.id,
    chapter,
    stage: stage.id,
    title: `${arc.name}: ${stage.title}`,
    summary: chapterSummary(arc, stage),
    category: arc.category || 'town',
    townId: arc.townId,
    districtId: arc.districtId,
    implementation: 'planned',
    ordered: true,
    completionMode: stage.id === 'consequence' ? 'any' : 'all',
    prerequisites: chapter === 1 ? [] : [`full-${arc.id}-${String(chapter - 1).padStart(2, '0')}`],
    entryConditions: chapter === 1 ? [arc.gate] : [],
    unlocks: next ? [next] : [],
    npcIds: [arc.leadNpcId],
    consequenceRefs: chapter >= 5 ? [`${arc.id}-choice`] : [],
    objectives,
    rewards: {
      money: baseMoney * chapter,
      reputation: { [arc.townId]: 2 + chapter },
      relationship: { [arc.leadNpcId]: chapter < 5 ? 2 : 4 },
      flags: unique([
        `${id}-complete`,
        ...(chapter === 5 ? [`${arc.id}-choice-recorded`] : []),
        ...(chapter === 8 ? [`${arc.id}-complete`, `${arc.id}-repeatable-unlocked`] : []),
      ]),
    },
    requiredSystems: unique([...(arc.tags || []), 'quest-journal', 'npc-memory', ...objectives.map((item) => item.event)]),
    implementationNotes: {
      physicalHooks: unique(objectives.map((item) => item.event)),
      location: arc.districtId,
      choiceAware: chapter >= 5,
      mustShowOutcome: chapter >= 5,
    },
  };
}

function makeLeadNpc(arc) {
  return {
    id: arc.leadNpcId,
    name: arc.leadNpcName,
    townId: arc.homeTownId || arc.townId,
    districtId: arc.districtId,
    role: arc.leadRole,
    personality: arc.personality,
    goal: `See ${arc.name} succeed without losing what makes it matter.`,
    fear: `That ${arc.complication} becomes the new normal.`,
    secret: `Knows more about ${arc.premise.split('.')[0].toLowerCase()} than they admit at first.`,
    values: [arc.skill, 'follow-through', 'honest consequences'],
    petPeeve: 'People who want the reward before learning the work.',
    questArcIds: [arc.id],
    questIds: Array.from({ length: 8 }, (_, index) => `full-${arc.id}-${String(index + 1).padStart(2, '0')}`),
    topics: unique([arc.skill, arc.coreTask, arc.complication, arc.routeA, arc.routeB]).slice(0, 8),
    tags: unique(arc.tags || []),
    schedule: {
      morning: `${titleCase(arc.districtId)} work site`,
      afternoon: `${titleCase(arc.districtId)} public area`,
      evening: `local social stop near ${titleCase(arc.districtId)}`,
    },
    relationshipStages: ['stranger', 'familiar', 'regular', 'trusted', 'close', 'rival', 'hostile'],
    memoryKeys: ['timesSpoken', 'lastConversationDay', 'relationship', 'promisesKept', 'promisesBroken', 'arcChoices', 'helpedInCrisis', 'betrayedTrust', 'publicReputationAtLastTalk'],
    signatureLine: `${arc.leadNpcName}: "${titleCase(arc.skill)} only looks simple after somebody did the hard part right."`,
  };
}

function mergeNpcs(npcs) {
  const byId = new Map();
  for (const npc of npcs) {
    const current = byId.get(npc.id);
    if (!current) {
      byId.set(npc.id, { ...npc, questArcIds: [...(npc.questArcIds || [])], questIds: [...(npc.questIds || [])], topics: [...(npc.topics || [])], tags: [...(npc.tags || [])] });
      continue;
    }
    current.questArcIds = unique([...current.questArcIds, ...(npc.questArcIds || [])]);
    current.questIds = unique([...current.questIds, ...(npc.questIds || [])]);
    current.topics = unique([...current.topics, ...(npc.topics || [])]).slice(0, 8);
    current.tags = unique([...current.tags, ...(npc.tags || [])]);
  }
  return [...byId.values()];
}

export function makeStoryPack({ townId, label, baseMoney, arcs: arcSpecs, supportNpcs = [] }) {
  const arcs = arcSpecs.map((arc) => ({
    category: 'town',
    tags: [],
    gate: 'open-roads',
    ...arc,
    townId,
    decisionId: `${arc.id}-route`,
    repeatableId: `repeat-${arc.id}`,
    chapterIds: Array.from({ length: 8 }, (_, index) => `full-${arc.id}-${String(index + 1).padStart(2, '0')}`),
  }));
  const quests = arcs.flatMap((arc) => STAGES.map((stage, index) => makeQuest(arc, stage, index + 1, baseMoney)));
  const leadNpcs = arcs.map(makeLeadNpc);
  const normalizedSupport = supportNpcs.map((npc) => ({
    relationshipStages: ['stranger', 'familiar', 'regular', 'trusted', 'close', 'rival', 'hostile'],
    memoryKeys: ['timesSpoken', 'lastConversationDay', 'relationship', 'promisesKept', 'promisesBroken', 'helpedInCrisis', 'betrayedTrust'],
    questArcIds: [],
    questIds: [],
    tags: ['support', 'ambient-story', 'relationship'],
    topics: [npc.role, titleCase(npc.districtId), npc.goal, npc.fear, npc.secret],
    values: [npc.value || 'community', 'reliability', 'fairness'],
    schedule: {
      morning: `${titleCase(npc.districtId)} work site`,
      afternoon: `${titleCase(npc.districtId)} public route`,
      evening: `home or local gathering in ${titleCase(npc.districtId)}`,
    },
    signatureLine: `${npc.name}: "${npc.goal.charAt(0).toUpperCase() + npc.goal.slice(1)}. That is the job, even when nobody notices."`,
    ...npc,
    townId: npc.townId || townId,
  }));
  const npcs = mergeNpcs([...leadNpcs, ...normalizedSupport]);
  return deepFreeze({
    townId,
    label,
    arcs,
    quests,
    npcs,
    dialogueProfiles: npcs.map(makeDialogue),
    consequences: arcs.map(makeConsequence),
    repeatables: arcs.map((arc) => makeRepeatable(arc, baseMoney)),
  });
}
