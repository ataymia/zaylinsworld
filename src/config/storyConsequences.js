// Canonical cause-and-effect contracts. These are data-first promises: when a
// branch is wired, it must close, open, remember, and communicate the listed
// outcomes instead of silently changing a number.

const freeze = (value) => Object.freeze(value);
const consequence = (definition) => freeze({ reversible: false, outcomes: [], ...definition, outcomes: freeze(definition.outcomes || []) });

export const STORY_CONSEQUENCES = freeze({
  'starter-crime-record': consequence({
    title: 'Heat Is Not the Same as a Record',
    summary: 'Uncaught actions stay hidden. Arrest and conviction create official town-scoped consequences.',
    reversible: 'partially',
    outcomes: [
      { choice: 'crime-uncaught', close: [], open: ['hidden-risk-dialogue', 'street-contacts'], memoryFlags: ['starter-hidden-crime'] },
      { choice: 'crime-convicted', close: ['dreamdrop-police-career'], open: ['community-service', 'reform-path', 'other-town-police-after-reform'], memoryFlags: ['starter-conviction'] },
    ],
  }),
  'dreamdrop-police-career-bar': consequence({
    title: 'Local Conviction, Local Career Closure',
    summary: 'A Starter Town conviction permanently closes Dreamdrop police employment, even after reform.',
    outcomes: [
      { choice: 'clean-record', close: [], open: ['dreamdrop-police-academy'], memoryFlags: ['dreamdrop-police-eligible'] },
      { choice: 'starter-conviction', close: ['dreamdrop-police-academy'], open: ['reformed-citizen', 'other-jurisdiction-application'], memoryFlags: ['dreamdrop-police-permanently-barred'] },
    ],
  }),
  'street-force-response': consequence({
    title: 'How You Handle Conflict',
    summary: 'Walking away, defending yourself, and escalating are remembered differently.',
    reversible: true,
    outcomes: [
      { choice: 'walk-away', close: [], open: ['peacekeeper-dialogue'], memoryFlags: ['walked-away-first-conflict'] },
      { choice: 'defend-only', close: [], open: ['self-control-training'], memoryFlags: ['defended-with-restraint'] },
      { choice: 'escalate', close: ['some-clean-reputation-bonuses'], open: ['street-rivalry'], memoryFlags: ['escalated-street-conflict'] },
    ],
  }),
  'maya-credit-choice': consequence({
    title: 'Who Gets the Credit?',
    summary: 'The player can tell the truth, take credit, or protect someone who caused the mistake.',
    reversible: 'relationship-repair-only',
    outcomes: [
      { choice: 'tell-truth', close: [], open: ['maya-trust-route'], relationship: { 'maya-brooks': 8 }, memoryFlags: ['maya-credit-truth'] },
      { choice: 'take-credit', close: ['maya-trust-route'], open: ['manager-favor-route'], relationship: { 'maya-brooks': -6 }, memoryFlags: ['maya-credit-stolen'] },
      { choice: 'cover-worker', close: ['manager-favor-route'], open: ['worker-solidarity-route'], relationship: { 'maya-brooks': 4 }, memoryFlags: ['maya-covered-worker'] },
    ],
  }),
  'frostbox-lost-chain': consequence({
    title: 'The Lost Custom Chain',
    outcomes: [
      { choice: 'return-chain', close: ['underground-buyer'], open: ['frostbox-custom-orders'], reputation: { 'starter-town': 1 }, memoryFlags: ['returned-lost-chain'] },
      { choice: 'expose-double-sale', close: [], open: ['merchant-investigation'], reputation: { 'market-mile': 1 }, memoryFlags: ['exposed-chain-scheme'] },
      { choice: 'sell-secretly', close: ['frostbox-custom-orders'], open: ['underground-buyer'], reputation: { 'starter-town': -1 }, memoryFlags: ['sold-lost-chain'] },
    ],
  }),
  'coach-rell-discipline-choice': consequence({
    title: 'Progress or Performance?',
    reversible: true,
    outcomes: [
      { choice: 'train-consistently', close: [], open: ['coach-rell-mentor-route'], relationship: { 'coach-rell': 10 }, memoryFlags: ['rell-consistent'] },
      { choice: 'fake-results', close: ['coach-rell-mentor-route'], open: ['gym-reputation-repair'], relationship: { 'coach-rell': -12 }, memoryFlags: ['rell-caught-cheating'] },
    ],
  }),
  'gridlink-sabotage-choice': consequence({
    title: 'The Route Log',
    outcomes: [
      { choice: 'report-sabotage', close: ['black-market-gridlink'], open: ['legal-gridlink-discount', 'priya-trust'], memoryFlags: ['gridlink-sabotage-reported'] },
      { choice: 'hide-sabotage', close: ['corporate-fast-track'], open: ['black-market-gridlink'], memoryFlags: ['gridlink-sabotage-hidden'] },
      { choice: 'investigate-first', close: [], open: ['gridlink-conspiracy-chain'], memoryFlags: ['gridlink-sabotage-investigated'] },
    ],
  }),
  'first-gillyfish-choice': consequence({
    title: 'One Fish, Three Futures',
    summary: 'The first Gillyfish choice changes the route, never deletes Aqualume permanently.',
    reversible: 'access-route-recoverable',
    outcomes: [
      { choice: 'consume', close: ['first-gillyfish-sale-payout'], open: ['gillbound-adaptation', 'aqualume-discovery'], memoryFlags: ['first-gillyfish-consumed'] },
      { choice: 'sell', close: ['immediate-aqualume-route'], open: ['gillyfish-buyer-story', 'large-sale-payout'], memoryFlags: ['first-gillyfish-sold'] },
      { choice: 'store', close: ['immediate-aqualume-route'], open: ['later-consumption'], memoryFlags: ['first-gillyfish-stored'] },
      { choice: 'gift', close: ['immediate-aqualume-route'], open: ['friendship-legacy', 'catch-or-recover-another'], memoryFlags: ['first-gillyfish-gifted'] },
    ],
  }),
  'aqualume-first-intent': consequence({
    title: 'Why Did You Come Below?',
    reversible: true,
    outcomes: [
      { choice: 'explore', open: ['sonar-mapping', 'abyss-research'], memoryFlags: ['aqualume-intent-explore'] },
      { choice: 'work', open: ['bluecore-jobs', 'pearlworks-jobs'], memoryFlags: ['aqualume-intent-work'] },
      { choice: 'study', open: ['tideglass-academy'], memoryFlags: ['aqualume-intent-study'] },
      { choice: 'protect', open: ['current-guard', 'sanctuary-warden'], memoryFlags: ['aqualume-intent-protect'] },
      { choice: 'live', open: ['reefside-property'], memoryFlags: ['aqualume-intent-live'] },
    ],
  }),
  'rich-hills-access-choice': consequence({
    title: 'Work In, Buy In, or Sneak In',
    outcomes: [
      { choice: 'service-route', open: ['worker-network', 'estate-recommendations'], memoryFlags: ['rich-service-route'] },
      { choice: 'wealth-route', open: ['country-club-status', 'premium-property'], memoryFlags: ['rich-wealth-route'] },
      { choice: 'trespass-route', close: ['some-security-jobs'], open: ['estate-infiltration'], memoryFlags: ['rich-trespass-route'] },
    ],
  }),
  'harbor-protected-water-choice': consequence({
    title: 'What the Water Is Worth',
    outcomes: [
      { choice: 'protect', close: ['poacher-contracts'], open: ['harbor-patrol', 'sanctuary-trust'], memoryFlags: ['protected-harbor-water'] },
      { choice: 'poach', close: ['clean-permit-bonuses'], open: ['poacher-contracts', 'permit-repair'], memoryFlags: ['poached-harbor-water'] },
    ],
  }),
  'starline-secret-choice': consequence({
    title: 'The Story Behind the Story',
    outcomes: [
      { choice: 'protect-source', open: ['trusted-production-route'], memoryFlags: ['protected-starline-source'] },
      { choice: 'publish', close: ['some-talent-trust'], open: ['media-career-route'], memoryFlags: ['published-starline-secret'] },
      { choice: 'sell-tip', close: ['trusted-production-route'], open: ['gossip-market'], memoryFlags: ['sold-starline-tip'] },
    ],
  }),
});

export function consequenceById(id) {
  return STORY_CONSEQUENCES[id] || null;
}

export default STORY_CONSEQUENCES;
