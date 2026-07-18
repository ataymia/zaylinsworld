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

function relationshipGreeting(npc, stage) {
  const lines = {
    stranger: `You're new to me. I'm ${npc.name}, and around here I handle ${npc.role}. Ask before you assume.`,
    familiar: 'Back again. Good. I was starting to think our first conversation scared you off.',
    regular: 'I know your face now. I can skip the brochure version and tell you what is actually happening.',
    trusted: 'I kept the honest version for you. Do not make me regret deciding you could handle it.',
    close: 'You know the public story. Sit down. I will tell you the part that keeps me awake.',
    rival: 'We can disagree without pretending you are invisible. Do not expect me to hand you an advantage.',
    hostile: 'This conversation is happening because the town still has rules. Keep it respectful and brief.',
  };
  return lines[stage];
}

function makeDialogue(npc) {
  const topicResponses = {};
  for (const topic of (npc.topics || []).slice(0, 6)) {
    topicResponses[String(topic).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48)] = [
      `${titleCase(topic)} is not background decoration here. It affects who works, who pays, and who gets heard.`,
      `My honest opinion about ${topic}: people notice the exciting part and ignore the maintenance.`,
      `To understand ${topic}, follow the money, the schedule, and whoever cleans up afterward.`,
    ];
  }
  return {
    id: `${npc.id}-dialogue`,
    npcId: npc.id,
    openingNode: 'greet',
    greetingsByRelationship: Object.fromEntries(npc.relationshipStages.map((stage) => [stage, relationshipGreeting(npc, stage)])),
    scheduleReactions: {
      morning: `Morning is when I am at ${npc.schedule.morning}. Catch me before the day invents emergencies.`,
      afternoon: `Afternoons put me at ${npc.schedule.afternoon}. That is usually when the real work shows itself.`,
      evening: `By evening I am around ${npc.schedule.evening}. If you bring work, bring a reason too.`,
    },
    smallTalk: [
      'People keep saying this town is changing. Towns always change. The question is who gets carried forward.',
      `My goal is simple: ${npc.goal}. Simple goals usually have the most paperwork.`,
      `My pet peeve? ${npc.petPeeve}. You would be surprised how often that becomes my problem.`,
      'Everybody has a version of this place in their head. Mine includes the people who open it and close it.',
    ],
    personalTopics: [
      { label: 'What are you working toward?', response: `I am trying to ${npc.goal}. Some days that feels possible. Some days the city schedules a meeting against it.` },
      { label: 'What worries you?', response: `I worry about ${npc.fear}. Worry is useful when it becomes preparation instead of panic.` },
      { label: 'Tell me something people do not know.', response: `Not yet. Earn close trust first. But I will say this: ${npc.secret}` },
      { label: 'What do you respect?', response: `I respect ${(npc.values || []).join(', ')}. Talent is nice. Follow-through keeps the lights on.` },
    ],
    topicResponses,
    questConversation: {
      arcIds: npc.questArcIds || [],
      offer: 'I have work that starts small and stops being small when you understand what is at stake.',
      accepted: 'Listen carefully. I do not need a hero pose. I need the next step done correctly.',
      progress: 'Do not confuse being busy with moving the situation forward.',
      routeAReaction: 'You chose the harder honest route. That does not guarantee applause. It tells me what your word costs.',
      routeBReaction: 'You chose advantage over trust. I understand why. Understanding is not forgetting.',
      complete: 'You changed the situation. Maybe not perfectly, but permanently.',
      failedPromise: 'The task can be retried. My trust does not reset with the button.',
    },
    worldStateReactions: [
      { requires: { wantedAtLeast: 1 }, text: 'Handle whatever heat is following you before it lands on everybody near me.' },
      { requires: { townReputationAtLeast: 50 }, text: 'People use your name as evidence now. Be careful what argument you help them win.' },
      { requires: { townReputationAtMost: -20 }, text: 'You have a reputation here. I am giving you a conversation, not pretending it does not exist.' },
      { requires: { promisesBrokenAtLeast: 2 }, text: 'You make promises faster than you keep them. Choose your words like they cost money.' },
      { requires: { helpedInCrisis: true }, text: 'I remember what you did when the town stopped being easy.' },
    ],
    relationshipActions: [
      { label: 'Ask how they are doing', effect: { relationship: 1, topic: 'personal' } },
      { label: 'Offer help', effect: { relationship: 2, topic: 'quests' } },
      { label: 'Ask for a favor', requires: { stageAtLeast: 'regular' }, effect: { topic: 'service' } },
      { label: 'Challenge their opinion', effect: { relationship: -1, topic: 'debate' } },
      { label: 'Apologize for a broken promise', requires: { memoryFlag: 'promise-broken' }, effect: { relationship: 3, setFlag: 'apology-attempted' } },
      { label: 'End conversation', effect: { close: true } },
    ],
    farewells: [
      'Do what you said you would do. That is the easiest way to improve the next conversation.',
      'Come back when something changed, even if the thing that changed was your mind.',
      'Stay aware. Most trouble announces itself quietly first.',
    ],
    signatureLine: npc.signatureLine,
  };
}

function makeConsequence(arc) {
  return {
    id: `${arc.id}-choice`,
    arcId: arc.id,
    decisionEvent: `${arc.id}-route`,
    routeA: {
      label: arc.routeA,
      sets: [`${arc.id}-route-a`, `${arc.townId}-trust-route`],
      opens: [`${arc.id}-honest-contracts`, `repeat-${arc.id}-community`],
      closes: [`${arc.id}-advantage-contracts`],
      reputation: { [arc.townId]: 12 },
      relationship: { [arc.leadNpcId]: 10 },
      immediateDialogue: 'The lead acknowledges the principled choice but warns that trust pays slowly.',
      longTermWorldChange: `${arc.name} resolves toward public trust, transparent rules, and sustainable rewards.`,
    },
    routeB: {
      label: arc.routeB,
      sets: [`${arc.id}-route-b`, `${arc.townId}-advantage-route`],
      opens: [`${arc.id}-advantage-contracts`, `repeat-${arc.id}-underground`],
      closes: [`${arc.id}-honest-contracts`],
      reputation: { [arc.townId]: -6 },
      relationship: { [arc.leadNpcId]: -8 },
      immediateDialogue: 'The lead understands the calculation but remembers that the player chose leverage over trust.',
      longTermWorldChange: `${arc.name} resolves toward faster rewards, tighter access, and visible social costs.`,
    },
    recovery: {
      available: true,
      questId: `recovery-${arc.id}`,
      requirements: [`${arc.id}-complete`, 'wait-one-game-day', 'speak-to-affected-npcs'],
      restores: ['one closed service or relationship route'],
      doesNotErase: ['public record', 'remembered dialogue', 'money already gained or lost', 'the original decision flag'],
    },
    communicationContract: {
      beforeChoice: 'Show both routes, likely benefits, and the type of relationship or reputation risk.',
      afterChoice: 'Display the chosen route, immediate state change, and newly opened or closed opportunities.',
      futureDialogue: 'At least three NPCs reference the decision in later conversations.',
    },
  };
}

function makeRepeatable(arc, baseMoney) {
  return {
    id: `repeat-${arc.id}`,
    arcId: arc.id,
    name: arc.unlock,
    townId: arc.townId,
    districtId: arc.districtId,
    giverNpcId: arc.leadNpcId,
    unlocksAfter: `full-${arc.id}-08`,
    taskPool: [
      { type: 'service', description: `Complete a routine assignment involving ${arc.coreTask}.`, weight: 30 },
      { type: 'quality', description: `Complete the work with a high score in ${arc.skill}.`, weight: 20 },
      { type: 'urgent', description: `Respond quickly when ${arc.complication}.`, weight: 15 },
      { type: 'social', description: `Resolve a dispute connected to ${arc.name}.`, weight: 15 },
      { type: 'choice-echo', description: 'Handle a situation reflecting the route chosen in the story arc.', weight: 10 },
      { type: 'rare', description: `Complete an expert contract leading toward ${arc.finale}.`, weight: 10 },
    ],
    difficultyTiers: [
      { id: 'routine', multiplier: 1, requirements: [] },
      { id: 'skilled', multiplier: 1.5, requirements: [`${arc.id}-complete`] },
      { id: 'expert', multiplier: 2.25, requirements: [`${arc.townId}-reputation-50`] },
      { id: 'legend', multiplier: 3.5, requirements: ['make-your-mark-complete'] },
    ],
    rewardFormula: {
      baseDreamBucks: baseMoney,
      qualityBonus: '0-100% based on score',
      speedBonus: '0-35% when a timer is used',
      relationship: 1,
      townReputation: 1,
    },
    failureRules: {
      retryable: true,
      losesStoryProgress: false,
      penalty: 'time, repair cost, relationship nudge, or reduced payout only',
      noPermanentLockout: true,
    },
    variationKeys: ['district', 'weather', 'timeOfDay', 'client', 'cargoOrTarget', 'difficulty', 'chosenRoute', 'townReputation'],
  };
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
