export function makeConsequence(arc) {
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

export function makeRepeatable(arc, baseMoney) {
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
