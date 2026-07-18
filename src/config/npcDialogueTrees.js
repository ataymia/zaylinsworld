// ───────────────────────────────────────────────────────────────────────────
// npcDialogueTrees.js — authored, state-aware conversation data.
//
// This is the canonical dialogue-tree contract for recurring NPCs. A resolver
// may choose text by relationship stage, memory flags, town reputation, record,
// schedule, and active quests. Services remain actions, not the whole exchange.
// ───────────────────────────────────────────────────────────────────────────

const freeze = (value) => Object.freeze(value);
const node = (definition) => freeze(definition);
const tree = (definition) => freeze({ start: 'greet', nodes: freeze(definition.nodes || {}), ...definition });

export const DIALOGUE_ACTIONS = freeze([
  'openService', 'offerQuest', 'startQuest', 'trackQuest', 'setFlag', 'setRelationship',
  'setReputation', 'giveItem', 'takeItem', 'storyChoice', 'close',
]);

export const DIALOGUE_TREES = freeze({
  'coach-rell': tree({
    npcId: 'coach-rell',
    nodes: {
      greet: node({
        textByStage: {
          stranger: 'You looking for the locker room, or you planning to keep holding that doorway up?',
          familiar: 'Back again. That is either discipline or you forgot something.',
          regular: 'You stopped negotiating with the weights. Progress.',
          trusted: 'I saved the good station. Do not make me regret being thoughtful.',
          rival: 'You can use the gym. You cannot use me as an excuse.',
        },
        reactions: [
          { requires: { flag: 'rell-caught-cheating' }, text: 'Before you ask, no, fake reps do not become real because you counted louder.' },
          { requires: { minStat: { fitness: 70 } }, text: 'Your form is finally making less noise than your confidence.' },
        ],
        options: [
          { label: 'I want to train.', action: { openService: 'gym-training' } },
          { label: 'You know anybody hiring?', goto: 'work' },
          { label: 'How am I doing?', goto: 'progress' },
          { label: 'What is happening around Parkside?', goto: 'parkside' },
          { label: 'I should go.', action: { close: true } },
        ],
      }),
      work: node({
        text: 'Work is everywhere. Reliable people are the rare part. Denise needs cleanup help, WorkTower needs bodies, and Chicken Spot always needs somebody who can read an order twice.',
        options: [
          { label: 'Tell me about cleanup work.', action: { offerQuest: 'cleanup-crew' } },
          { label: 'I want a bigger challenge.', action: { offerQuest: 'coach-rell-no-shortcuts' }, requires: { questComplete: 'gym-intro' } },
          { label: 'Back.', goto: 'greet' },
        ],
      }),
      progress: node({
        textByState: [
          { requires: { minStat: { fitness: 70 } }, text: 'Strong. Not finished. Those are different words.' },
          { requires: { minStat: { fitness: 40 } }, text: 'Better than when you walked in. Keep showing up when nobody is clapping.' },
          { text: 'Right now your biggest muscle is intention. We can work with that.' },
        ],
        options: [{ label: 'Train me.', action: { openService: 'gym-training' } }, { label: 'Back.', goto: 'greet' }],
      }),
      parkside: node({
        text: 'Parkside is calm until the basketball court gets loud, Denise finds another illegal dumping pile, or somebody tries to turn the roundabout into a racetrack.',
        options: [{ label: 'Who is Denise?', goto: 'denise' }, { label: 'Back.', goto: 'greet' }],
      }),
      denise: node({
        text: 'Sanitation lead. City would fold in four days without her. Tell her I said that and she will still complain about the gym dumpsters.',
        options: [{ label: 'I can help her.', action: { offerQuest: 'cleanup-crew' } }, { label: 'Back.', goto: 'greet' }],
      }),
    },
  }),

  'maya-brooks': tree({
    npcId: 'maya-brooks',
    nodes: {
      greet: node({
        textByStage: {
          stranger: 'Welcome in. Looking for something, or are you letting the air conditioning choose your outfit?',
          familiar: 'You came back. Good. I had opinions about your last look and nowhere to put them.',
          regular: 'Your size is on the left. New drops are in back. Neighborhood drama is free.',
          trusted: 'I saved something for you, and no, that does not mean it is discounted.',
          rival: 'You can shop. We are not pretending the delivery thing did not happen.',
        },
        reactions: [
          { requires: { flag: 'first-fresh-cut' }, text: 'Fresh cut. Okay, now the outfit has to keep up.' },
          { requires: { flag: 'maya-credit-stolen' }, text: 'Before you ask, I remember exactly who fixed that order and who smiled for the credit.' },
        ],
        options: [
          { label: 'Show me what came in.', action: { openService: 'kicks-and-fits-shop' } },
          { label: 'Any neighborhood gossip?', goto: 'gossip' },
          { label: 'Do you need anything?', goto: 'favor' },
          { label: 'What do you think of my outfit?', goto: 'style' },
          { label: 'Later.', action: { close: true } },
        ],
      }),
      gossip: node({
        textByState: [
          { requires: { flag: 'illegal-dumping-discovered' }, text: 'Everybody is blaming the stores for that alley mess. Check WorkTower loading docks before you believe everybody.' },
          { text: 'Malik missed another custom-order deadline, Coach Rell hates the gym playlist, and somebody keeps parking in front of the hydrant like fire has business hours.' },
        ],
        options: [{ label: 'Tell me about Malik.', goto: 'malik' }, { label: 'Back.', goto: 'greet' }],
      }),
      malik: node({
        text: 'Good jeweler. Bad clock. If he says “tomorrow,” ask which week.',
        options: [{ label: 'I will check Frostbox.', action: { offerQuest: 'frostbox-first-look' } }, { label: 'Back.', goto: 'greet' }],
      }),
      favor: node({
        textByState: [
          { requires: { questComplete: 'chicken-run', questNotStarted: 'maya-missed-order' }, text: 'Actually, yes. Chicken Spot lost an order with my name on it, and I have been too busy to chase it.' },
          { text: 'Not today. Ask me again when deliveries start acting strange, because they always do.' },
        ],
        options: [
          { label: 'I will handle the order.', action: { offerQuest: 'maya-missed-order' }, requires: { questComplete: 'chicken-run' } },
          { label: 'Maybe later.', goto: 'greet' },
        ],
      }),
      style: node({
        textByState: [
          { requires: { flag: 'first-fresh-cut' }, text: 'Hair is carrying. Clothes are cooperating. Shoes need to decide whether they came with you.' },
          { text: 'The outfit is not bad. It is just waiting for you to commit to the idea.' },
        ],
        options: [{ label: 'That was rude.', goto: 'rude' }, { label: 'Fair.', goto: 'greet' }],
      }),
      rude: node({ text: 'It was professional. Rude costs extra.', options: [{ label: 'Let me shop.', action: { openService: 'kicks-and-fits-shop' } }, { label: 'I am leaving.', action: { close: true } }] }),
    },
  }),

  'officer-dane': tree({
    npcId: 'officer-dane',
    nodes: {
      greet: node({
        textByState: [
          { requires: { localConviction: 'starter-town' }, text: 'The Dreamdrop academy desk is closed to you. Community service is not. Neither is the rest of your life, so pick what happens next.' },
          { requires: { wantedAbove: 0 }, text: 'You walked into a police station with active heat. Bold is not the word I would use, but it is nearby.' },
          { requires: { flag: 'dreamdrop-police-applicant' }, text: 'Applicant. You here about training, your record, or the cruiser you keep staring at?' },
          { text: 'You here to report something, ask about the academy, or admire the cruisers from a legally respectful distance?' },
        ],
        options: [
          { label: 'How do I become an officer?', goto: 'academy' },
          { label: 'How does a criminal record work?', goto: 'records' },
          { label: 'I need front-desk services.', action: { openService: 'police-desk' } },
          { label: 'What is happening around town?', goto: 'town' },
          { label: 'I am just looking.', action: { close: true } },
        ],
      }),
      academy: node({
        textByState: [
          { requires: { localConviction: 'starter-town' }, text: 'A local conviction permanently bars Dreamdrop employment. Reform can open another department later. It cannot rewrite this one.' },
          { text: 'Keep a clean local record, build your smarts, finish academy prerequisites, and prove you can follow a rule before enforcing one.' },
        ],
        options: [
          { label: 'Start the application.', action: { offerQuest: 'dreamdrop-police-applicant' }, requires: { noLocalConviction: 'starter-town' } },
          { label: 'What if I already messed up?', goto: 'reform' },
          { label: 'Back.', goto: 'greet' },
        ],
      }),
      records: node({
        text: 'Heat is what police are responding to now. An official record comes from being caught and convicted. Uncaught actions can still follow you through people, even when paperwork does not.',
        options: [{ label: 'So nobody knows if I was not caught?', goto: 'hidden' }, { label: 'Back.', goto: 'greet' }],
      }),
      hidden: node({
        text: 'I said no official record. I did not say witnesses forget, cameras blink, or trust grows back by itself.',
        options: [{ label: 'Understood.', goto: 'greet' }],
      }),
      reform: node({
        text: 'Finish your sentence, obligations, civics, community work, and a clean period. Reformed Citizen status can open another jurisdiction. Dreamdrop still remembers its own conviction.',
        options: [{ label: 'Show me the reform path.', action: { offerQuest: 'clean-up-your-name' } }, { label: 'Back.', goto: 'greet' }],
      }),
      town: node({
        text: 'School-zone speeders, stolen cars, store alarms, and people learning that the Civic Rise hill requires brakes. Ordinary city, ordinary chaos.',
        options: [{ label: 'Any work for a civilian?', goto: 'civilian-work' }, { label: 'Back.', goto: 'greet' }],
      }),
      'civilian-work': node({
        text: 'Crossing detail, community cleanup, witness statements, and evidence transport once the system is ready. Helpful does not always need a badge.',
        options: [{ label: 'I will keep that in mind.', goto: 'greet' }],
      }),
    },
  }),

  'denise-hall': tree({
    npcId: 'denise-hall',
    nodes: {
      greet: node({
        textByStage: {
          stranger: 'If you came to complain about trash, grab a bag while you talk.',
          familiar: 'Back for work, or did the city finally make you appreciate a clean sidewalk?',
          regular: 'Market route is posted. Park route is almost civilized. Almost.',
          trusted: 'I saved the route nobody wants because you are the only one who asks why it keeps failing.',
        },
        options: [
          { label: 'Give me a cleanup job.', action: { openService: 'sanitation-jobs' } },
          { label: 'Why does this route keep getting dirty?', goto: 'routes' },
          { label: 'What do people misunderstand about your job?', goto: 'respect' },
          { label: 'Later.', action: { close: true } },
        ],
      }),
      routes: node({
        textByState: [
          { requires: { questComplete: 'cleanup-crew' }, text: 'Because cleanup treats the symptom. Somebody is dumping behind WorkTower, Market Mile bins are undersized, and Parkside events end after my crew clocks out.' },
          { text: 'Finish one route first. Then I will tell you why picking up the same cup twice is not a cleaning problem.' },
        ],
        options: [{ label: 'Let me investigate.', action: { offerQuest: 'sanitation-routes' }, requires: { questComplete: 'cleanup-crew' } }, { label: 'Back.', goto: 'greet' }],
      }),
      respect: node({ text: 'Everybody notices sanitation when it stops. Almost nobody notices the planning that keeps it from stopping.', options: [{ label: 'Fair point.', goto: 'greet' }] }),
    },
  }),

  'malik-frost': tree({
    npcId: 'malik-frost',
    nodes: {
      greet: node({
        textByStage: { stranger: 'Welcome to Frostbox. Look with your eyes first. Your wallet gets a vote later.', familiar: 'Back for shine, or did a city gem lead you here again?', regular: 'Custom book is open. My schedule is not. Those are separate problems.', trusted: 'I held a piece for you. Do not make me regret understanding your taste.' },
        options: [
          { label: 'Show me the jewelry.', action: { openService: 'frostbox-shop' } },
          { label: 'I want something custom.', action: { openService: 'custom-chain-builder' } },
          { label: 'Any work?', goto: 'work' },
          { label: 'What is a city gem actually worth?', goto: 'gems' },
          { label: 'Later.', action: { close: true } },
        ],
      }),
      work: node({
        textByState: [
          { requires: { questComplete: 'frostbox-first-look' }, text: 'A custom order disappeared between my bench and the pickup shelf. I need quiet help before Market Mile turns it into a public sport.' },
          { text: 'Bring me one clean city gem and show me you can follow a simple instruction.' },
        ],
        options: [{ label: 'I will find the order.', action: { offerQuest: 'custom-made-name' }, requires: { questComplete: 'frostbox-first-look' } }, { label: 'Back.', goto: 'greet' }],
      }),
      gems: node({ text: 'Depends on quality, cut, buyer, and whether you found it or “found” it. That pause was intentional.', options: [{ label: 'Show me the legitimate route.', action: { offerQuest: 'frostbox-first-look' } }, { label: 'Back.', goto: 'greet' }] }),
    },
  }),

  'cap-odell': tree({
    npcId: 'cap-odell',
    nodes: {
      greet: node({
        textByState: [
          { requires: { flag: 'hasPermanentGills' }, text: 'You are breathing too calmly for somebody standing that close to deep water. We need to talk.' },
          { requires: { flag: 'caught-first-gillyfish' }, text: 'Keep that fish secure. Half this harbor will call it impossible. The other half will offer cash before asking what it does.' },
          { text: 'Tide is good. You fishing, working, or standing on my dock for decoration?' },
        ],
        options: [
          { label: 'I need a permit.', action: { openService: 'permits' } },
          { label: 'Tell me about the glowing fish.', goto: 'gillyfish' },
          { label: 'Any harbor work?', goto: 'work' },
          { label: 'What is below Lighthouse Point?', goto: 'lighthouse' },
          { label: 'Later.', action: { close: true } },
        ],
      }),
      gillyfish: node({
        textByState: [
          { requires: { flag: 'hasPermanentGills' }, text: 'It was never only a fish. Harbor Academy can confirm what changed. After that, the trench decides whether you are ready.' },
          { requires: { questComplete: 'fish-stories' }, text: 'I believe fishermen exaggerate. I also believe the lighthouse answered something that was not a boat.' },
          { text: 'Every dock has a story. Hear three versions before you decide which lie is closest to the truth.' },
        ],
        options: [
          { label: 'I will ask around.', action: { offerQuest: 'fish-stories' } },
          { label: 'I caught one.', action: { offerQuest: 'gillyfish-decision' }, requires: { flag: 'caught-first-gillyfish' } },
          { label: 'Back.', goto: 'greet' },
        ],
      }),
      work: node({ text: 'Permits, market quotas, boat runs, cleanup, repair, rescue. Water looks peaceful because somebody is working.', options: [{ label: 'Start me honestly.', action: { offerQuest: 'harbor-honest-work' } }, { label: 'Back.', goto: 'greet' }] }),
      lighthouse: node({ text: 'Rock, current, bad visibility, and a signal that does not behave. Get certified before curiosity becomes a rescue report.', options: [{ label: 'What certification?', action: { offerQuest: 'permit-to-go-deep' } }, { label: 'Back.', goto: 'greet' }] }),
    },
  }),

  'priya-shah': tree({
    npcId: 'priya-shah',
    nodes: {
      greet: node({
        textByStage: { stranger: 'You made it through the tunnel. Good. That means you understand travel before I start selling you shortcuts.', familiar: 'The beacon is still dropping handshakes. I am calling it a bug until the evidence earns a scarier noun.', regular: 'I have logs, caffeine, and one theory I dislike. Pick a chair.', trusted: 'I encrypted the ugly version of the report for you. Not from you. For you.' },
        options: [
          { label: 'Tell me about GridLink.', goto: 'gridlink' },
          { label: 'Do you have a contract?', goto: 'contract' },
          { label: 'Why so many cameras?', goto: 'surveillance' },
          { label: 'Open GridLink support.', action: { openService: 'gridlink-support' } },
          { label: 'Later.', action: { close: true } },
        ],
      }),
      gridlink: node({ text: 'GridLink moves a person between synchronized safe nodes. It does not reveal towns, move cars, cancel consequences, or rescue somebody mid-bad-decision.', options: [{ label: 'How do I earn one?', action: { offerQuest: 'signal-in-the-crowd' } }, { label: 'Back.', goto: 'greet' }] }),
      contract: node({ text: 'Start with the beacon. If it is a simple failure, you get paid. If it is sabotage, you get paid and a more complicated week.', options: [{ label: 'I am in.', action: { offerQuest: 'signal-in-the-crowd' } }, { label: 'Back.', goto: 'greet' }] }),
      surveillance: node({ text: 'Because TechTown likes convenience, safety, analytics, advertising, and pretending those are four unrelated systems.', options: [{ label: 'That sounds bad.', goto: 'ethics' }, { label: 'Back.', goto: 'greet' }] }),
      ethics: node({ text: 'It sounds powerful. Powerful is where “good” and “bad” stop being useful without rules.', options: [{ label: 'I want to investigate the logs.', action: { offerQuest: 'wrong-address' }, requires: { questComplete: 'gridlink-dead-zone' } }, { label: 'Back.', goto: 'greet' }] }),
    },
  }),

  'elder-wyn': tree({
    npcId: 'elder-wyn',
    nodes: {
      greet: node({
        textByStage: { stranger: 'The gate is larger up close because your choices are finally standing beside it.', familiar: 'You returned. Good. Curiosity without return is only a missing-person report.', regular: 'The lower halls shifted again. Bring a map and doubt any corridor that looks too generous.', trusted: 'I will tell you which relic the Wardens sealed, and why the guild still argues.' },
        options: [
          { label: 'Explain dungeon runs.', goto: 'runs' },
          { label: 'Any quests?', goto: 'quests' },
          { label: 'What happens if I fail?', goto: 'failure' },
          { label: 'Tell me about the sealed relic.', goto: 'relic', requires: { minRelationship: 50 } },
          { label: 'Later.', action: { close: true } },
        ],
      }),
      runs: node({ text: 'Prepare above. Descend. Choose risk room by room. Return before greed turns inventory into a rescue marker.', options: [{ label: 'I want the first run.', action: { offerQuest: 'arrival-dungeon-outskirts' } }, { label: 'Back.', goto: 'greet' }] }),
      quests: node({ text: 'The board has floor clears, rescues, maps, materials, and things nobody should touch twice.', options: [{ label: 'Open the quest board.', action: { openService: 'quest-board' } }, { label: 'Back.', goto: 'greet' }] }),
      failure: node({ text: 'You return hurt, lighter, wiser, or some combination. The game should punish decisions, not erase an evening.', options: [{ label: 'Good.', goto: 'greet' }] }),
      relic: node({ text: 'A crown-shaped key that opens doors by closing others. That is all I will say until the Warden says less.', options: [{ label: 'I will ask the Warden.', action: { setFlag: 'asked-about-sealed-relic' } }, { label: 'Back.', goto: 'greet' }] }),
    },
  }),

  'lana-starr': tree({
    npcId: 'lana-starr',
    nodes: {
      greet: node({
        textByStage: { stranger: 'Stars are made, not born. Before you get excited, so are stagehands, editors, stylists, and people who arrive on time.', familiar: 'You have a look. Now we find out whether you have a craft.', regular: 'Your name came up in a room you were not in. That can be excellent or expensive.', trusted: 'I turned down the easy offer for you. Ask why before you thank me.', rival: 'You still have talent. Trust is the part currently in rehearsal.' },
        options: [
          { label: 'I want an audition.', action: { openService: 'auditions' } },
          { label: 'What work is available off-camera?', goto: 'backlot' },
          { label: 'How is my reputation?', goto: 'reputation' },
          { label: 'What offer did you turn down?', goto: 'offer', requires: { minRelationship: 50 } },
          { label: 'Later.', action: { close: true } },
        ],
      }),
      backlot: node({ text: 'Stage cues, prop runs, costume tracking, catering, extra work, studio tours. Fame is the front door. Production is the building.', options: [{ label: 'Point me to the backlot.', action: { setFlag: 'starline-backlot-intro' } }, { label: 'Back.', goto: 'greet' }] }),
      reputation: node({ textByState: [{ requires: { reputationAbove: { 'starline-city': 50 } }, text: 'People know your work. Keep it that way by giving them work worth knowing.' }, { requires: { reputationBelow: { 'starline-city': -10 } }, text: 'They know the story before they know you. We can repair that, but pretending it is unfair will waste time.' }, { text: 'You are visible enough to be judged and unknown enough to recover quickly. Useful stage.' }], options: [{ label: 'How do I repair a scandal?', goto: 'repair' }, { label: 'Back.', goto: 'greet' }] }),
      repair: node({ text: 'Apologize when you are wrong, prove the change where people can see it, and stop feeding the version of you that caused the problem.', options: [{ label: 'Understood.', goto: 'greet' }] }),
      offer: node({ text: 'A fast headline that would have made you famous for somebody else’s secret. I would rather build your name than rent it.', options: [{ label: 'Thank you.', action: { setRelationship: 5 } }, { label: 'You should have asked me.', action: { storyChoice: 'starline-secret-choice' } }] }),
    },
  }),

  'captain-lyra-current': tree({
    npcId: 'captain-lyra-current',
    nodes: {
      greet: node({
        textByState: [
          { requires: { flag: 'aqualume-arrived', flagNot: 'aqualume-registered' }, text: 'Surface visitor, permanent gills confirmed. Welcome to Aqualume. Now tell me whether you came to explore, work, study, protect, or stay.' },
          { requires: { flag: 'aqualume-moonpool-synchronized' }, text: 'Moonpool recognizes you now. The city will feel smaller. Do not confuse smaller with safer.' },
          { text: 'Current Guard. State your business and keep clear of the sub lane.' },
        ],
        options: [
          { label: 'Register my arrival.', action: { offerQuest: 'visitor-or-resident' } },
          { label: 'Explain Aqualume law.', goto: 'law' },
          { label: 'I want Current Guard work.', goto: 'career' },
          { label: 'What is the Abyssal Edge?', goto: 'abyss' },
          { label: 'Later.', action: { close: true } },
        ],
      }),
      law: node({ text: 'Respect current lanes, salvage permits, private glassways, and sanctuary boundaries. Surface ignorance explains a mistake once. It does not license a second one.', options: [{ label: 'What is illegal salvage?', goto: 'salvage' }, { label: 'Back.', goto: 'greet' }] }),
      salvage: node({ text: 'Ownership marks, protected relics, evidence cargo, living coral, and anything taken from a sealed wreck. Ask Orin before “finders keepers” becomes “Current Guard evidence.”', options: [{ label: 'I will ask Orin.', action: { setFlag: 'orin-salvage-referral' } }, { label: 'Back.', goto: 'greet' }] }),
      career: node({ text: 'Navigation, rescue, law, pressure response, and restraint. The ocean gives everybody enough power to become a problem.', options: [{ label: 'Show me the requirements.', action: { openService: 'current-guard' } }, { label: 'Back.', goto: 'greet' }] }),
      abyss: node({ text: 'A deeper zone where gills are not enough. Pressure certification, equipment, and judgment are all mandatory. In that order if you are wise.', options: [{ label: 'How do I certify?', action: { setFlag: 'abyss-certification-interest' } }, { label: 'Back.', goto: 'greet' }] }),
    },
  }),

  // Modular ambient conversations by town. These are pools, not named stories.
  'ambient-starter': tree({
    start: 'greet',
    nodes: {
      greet: node({
        textPool: [
          'Dreamdrop lights take forever when you are late and two seconds when you are crossing.',
          'If you need work, WorkTower posts shifts before lunch.',
          'Do not take Civic Rise downhill with bad brakes. Ask me how I know.',
          'Market Mile has deals. “Deals” is doing flexible work in that sentence.',
        ],
        options: [
          { label: 'What is happening nearby?', goto: 'local' },
          { label: 'Any work rumors?', goto: 'work' },
          { label: 'Take care.', action: { close: true } },
        ],
      }),
      local: node({ textPool: ['Parkside has a game later.', 'Police are watching the school zone today.', 'Somebody keeps dumping behind WorkTower.'], options: [{ label: 'Thanks.', action: { close: true } }] }),
      work: node({ textPool: ['Chicken Spot needs help.', 'Sanitation is always hiring for a route.', 'The garage pays better when you know cars.'], options: [{ label: 'Good looking out.', action: { close: true } }] }),
    },
  }),
  'ambient-harbor': tree({ start: 'greet', nodes: { greet: node({ textPool: ['Fog is lifting. Market prices are not.', 'No-wake means no wake, not “small wake.”', 'Lighthouse beam skipped twice last night.'], options: [{ label: 'Ask about the water.', goto: 'water' }, { label: 'Later.', action: { close: true } }] }), water: node({ textPool: ['Deepwater Buoy is paying today.', 'Protected water starts past the green markers.', 'Cap Odell says the glowing fish is nonsense too loudly.'], options: [{ label: 'Thanks.', action: { close: true } }] }) } }),
  'ambient-rich': tree({ start: 'greet', nodes: { greet: node({ textPool: ['Public path is open. The gate beside it is not.', 'Service Village has better lunch than Luxury Row.', 'Country club valet scratched a car and aged ten years.'], options: [{ label: 'Ask about work.', goto: 'work' }, { label: 'Later.', action: { close: true } }] }), work: node({ textPool: ['Landscaping starts early.', 'Estate deliveries pay if you follow gate rules.', 'The marina needs dockhands before sunset.'], options: [{ label: 'Thanks.', action: { close: true } }] }) } }),
  'ambient-tech': tree({ start: 'greet', nodes: { greet: node({ textPool: ['The billboard knows I looked at shoes. I did not look at shoes.', 'GridLine is delayed because a delivery drone chose independence.', 'Utility Edge pays well because every door says restricted.'], options: [{ label: 'Ask about GridLink.', goto: 'gridlink' }, { label: 'Later.', action: { close: true } }] }), gridlink: node({ text: 'Great device. Still cannot teleport your car, your warrant, or your common sense.', options: [{ label: 'Fair.', action: { close: true } }] }) } }),
  'ambient-aqualume': tree({ start: 'greet', nodes: { greet: node({ textPool: ['Stay right in the current lane unless the arrows turn violet.', 'Surface fruit costs too much this week.', 'Sanctuary hatchlings are moving through the east glassway.'], options: [{ label: 'Ask about the city.', goto: 'city' }, { label: 'Later.', action: { close: true } }] }), city: node({ textPool: ['Moonpool is brightest so visitors stop swimming into cargo.', 'Bluecore can tow a sub, not your pride.', 'Abyss Gate is closed without certification.'], options: [{ label: 'Thanks.', action: { close: true } }] }) } }),
});

export function dialogueTreeById(id) {
  return DIALOGUE_TREES[id] || null;
}

export default DIALOGUE_TREES;
