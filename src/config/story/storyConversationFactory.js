const titleCase = (value) => String(value || '').replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

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

export function makeDialogue(npc) {
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
