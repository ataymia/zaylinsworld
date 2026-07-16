// ───────────────────────────────────────────────────────────────────────────
// policeConversations.js — controllable Police Station dialogue trees.
//
// The enhancer recognizes the existing front-desk, evidence, and holding-cell
// dialogue objects opened by main.js. Dynamic gameplay choices are preserved,
// while one-line replies become player-controlled branches. Conversation events
// form stable hooks for future academy, visitation, and evidence missions.
// ───────────────────────────────────────────────────────────────────────────
import { registerDialogueEnhancer } from '../conversationRegistry.js';

function emitConversationEvent(id, detail = {}) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  window.dispatchEvent(new CustomEvent('zaylins:conversation-event', {
    detail: { id, ...detail },
  }));
}

function open(label, factory) {
  return {
    label,
    onPick: () => factory(),
  };
}

function close(label = 'End conversation') {
  return { label, onPick: () => undefined };
}

function frontDeskRoot(original) {
  const originalChoices = original.choices || [];
  const legalChoice = originalChoices[0];

  const root = {
    ...original,
    name: 'Desk Officer',
    text: `${original.text}\n\nThe officer sets a clipboard aside. "What do you need to know?"`,
  };

  const academy = () => academyRoot(root);
  const response = () => policeResponseRoot(root);
  const services = () => stationServicesRoot(root);

  root.choices = [
    legalChoice,
    open('Ask about the Police Academy', academy),
    open('How does police response work?', response),
    open('What can I do at this station?', services),
    close('That is all for now'),
  ].filter(Boolean);
  return root;
}

function academyRoot(frontRoot) {
  emitConversationEvent('police-academy-topic');
  const root = {
    name: 'Desk Officer',
    text: '"The academy is where recruits learn judgment before they ever get a badge. Driving and drills matter, but knowing when not to escalate matters more."',
    choices: [],
  };
  root.choices = [
    open('What do recruits train for?', () => academyTraining(root)),
    open('Can my character apply?', () => academyApplication(root)),
    open('What happens after graduation?', () => academyCareer(root)),
    open('Ask something else', () => frontRoot),
    close('Leave the desk'),
  ];
  return root;
}

function academyTraining(academyRootNode) {
  return {
    name: 'Desk Officer',
    text: '"Recruits rotate through traffic control, pursuit driving, de-escalation, report writing, fitness, first aid, and scenario drills. Passing one skill does not excuse failing the others."',
    choices: [
      open('Tell me about pursuit training', () => ({
        name: 'Desk Officer',
        text: '"They learn controlled stops, safe following distance, roadblocks, and when a chase is too dangerous to continue. Wrecking half the town is not good police work."',
        choices: [open('Back to academy questions', () => academyRootNode), close()],
      })),
      open('Tell me about scenario drills', () => ({
        name: 'Desk Officer',
        text: '"One scenario might be a lost kid, another a robbery witness, another a loud argument. Recruits have to listen, identify the actual problem, and choose a proportionate response."',
        choices: [open('Back to academy questions', () => academyRootNode), close()],
      })),
      open('Back to academy questions', () => academyRootNode),
    ],
  };
}

function academyApplication(academyRootNode) {
  emitConversationEvent('police-academy-interest');
  return {
    name: 'Desk Officer',
    text: '"Not yet. The application board is being prepared. When academy progression opens, you will need a clean enough record, basic fitness, and completed town-service objectives."',
    choices: [
      open('What should I work on now?', () => ({
        name: 'Desk Officer',
        text: '"Keep your wanted level down, learn the roads, help with lawful jobs, and build fitness and smarts. Those records will matter when applications open."',
        choices: [open('Back to academy questions', () => academyRootNode), close()],
      })),
      open('Back to academy questions', () => academyRootNode),
      close(),
    ],
  };
}

function academyCareer(academyRootNode) {
  return {
    name: 'Desk Officer',
    text: '"Graduates start with supervised patrols. Later paths can include traffic, investigations, community response, training, and specialized driving. Rank should unlock responsibility, not just a shinier uniform."',
    choices: [open('Back to academy questions', () => academyRootNode), close()],
  };
}

function policeResponseRoot(frontRoot) {
  const root = {
    name: 'Desk Officer',
    text: '"Response depends on what happened, who saw it, and how much active heat you have. A minor report is not handled like an armed robbery."',
    choices: [],
  };
  root.choices = [
    open('What do wanted stars mean?', () => ({
      name: 'Desk Officer',
      text: '"Stars represent active urgency. More stars bring faster and heavier response. Heat is the longer memory of your behavior, even after the immediate search cools."',
      choices: [open('Back to response questions', () => root), close()],
    })),
    open('How do I end a chase?', () => ({
      name: 'Desk Officer',
      text: '"Break line of sight, stop creating new reports, and stay hidden long enough for officers to lose your trail. Entering the station with active heat is a terrible hiding strategy."',
      choices: [open('Back to response questions', () => root), close()],
    })),
    open('What happens if I am caught?', () => ({
      name: 'Desk Officer',
      text: '"You can be busted, lose time and money, and have property logged as evidence. The full booking, jail, and recovery systems will connect to the cells and evidence locker."',
      choices: [open('Back to response questions', () => root), close()],
    })),
    open('Ask something else', () => frontRoot),
    close(),
  ];
  return root;
}

function stationServicesRoot(frontRoot) {
  return {
    name: 'Desk Officer',
    text: '"The front desk handles legal-fee payments and information. The academy desk tracks future recruitment. The cell block supports booking and visitation. The evidence cage stores confiscated property."',
    choices: [
      open('Can I report something?', () => ({
        name: 'Desk Officer',
        text: '"A formal report system is planned. It will connect witnesses, vehicle theft, missing property, and mission leads instead of functioning as decorative dialogue."',
        choices: [open('Back to station services', () => stationServicesRoot(frontRoot)), close()],
      })),
      open('Can I recover confiscated property?', () => evidenceReleaseConversation(frontRoot)),
      open('Ask something else', () => frontRoot),
      close(),
    ],
  };
}

function holdingCellsRoot(original) {
  emitConversationEvent('police-cells-viewed');
  const root = {
    ...original,
    name: 'Cell Block Officer',
    text: `${original.text}\n\nAn officer remains near the control panel. "You can look, but stay behind the line."`,
    choices: [],
  };
  const originalPeer = (original.choices || []).find((choice) => /peer/i.test(choice.label));
  root.choices = [
    open('How does booking work?', () => ({
      name: 'Cell Block Officer',
      text: '"An arrest is logged, property is inventoried, and the person is placed in a cell until release, transfer, or a hearing. Future jail gameplay will use time, fines, reputation, and visitation rather than a blank teleport."',
      choices: [open('Back to cell-block questions', () => root), close('Return to the lobby')],
    })),
    open('Can I visit someone?', () => {
      emitConversationEvent('police-visitation-interest');
      return {
        name: 'Cell Block Officer',
        text: '"Visitation is not open yet. When it is, the desk will verify who is being held, the visiting hours, and whether the situation is safe."',
        choices: [open('Back to cell-block questions', () => root), close('Return to the lobby')],
      };
    }),
    originalPeer,
    open('What happens to seized belongings?', () => evidenceReleaseConversation(root)),
    close('Head back to the lobby'),
  ].filter(Boolean);
  return root;
}

function evidenceRoot(original) {
  emitConversationEvent('police-evidence-viewed');
  const originalChoices = original.choices || [];
  const tamperChoice = originalChoices.find((choice) => /try the lock/i.test(choice.label));
  const leaveChoice = originalChoices.find((choice) => /walk away|leave it alone/i.test(choice.label));
  const root = {
    ...original,
    name: 'Evidence Officer',
    text: `${original.text}\n\nA camera pivots toward you while the evidence officer closes the ledger.`,
    choices: [],
  };
  root.choices = [
    open('How is evidence tracked?', () => ({
      name: 'Evidence Officer',
      text: '"Every item gets a case number, seal, owner or source, intake time, and release status. Breaking that chain makes the evidence unreliable."',
      choices: [open('Back to evidence questions', () => root), close('Leave the restricted area')],
    })),
    open('How can property be released?', () => evidenceReleaseConversation(root)),
    open('Inspect the cage security', () => ({
      name: 'Evidence Officer',
      text: '"Steel mesh, controlled access, camera coverage, and an electronic log. The point is accountability, not making the cage look dramatic."',
      choices: [open('Back to evidence questions', () => root), close('Leave the restricted area')],
    })),
    tamperChoice,
    leaveChoice || close('Walk away'),
  ].filter(Boolean);
  return root;
}

function evidenceReleaseConversation(backNode) {
  emitConversationEvent('police-evidence-release-interest');
  return {
    name: 'Evidence Officer',
    text: '"Property can be released when the case allows it, the owner is verified, and any required fee or court condition is satisfied. Stolen or illegal property is not simply handed back."',
    choices: [
      open('What if the property is mine?', () => ({
        name: 'Evidence Officer',
        text: '"Then the future recovery screen will show its case status, release requirements, and whether it returns to your inventory. The system will not silently erase owned items."',
        choices: [open('Back', () => backNode), close('Leave the restricted area')],
      })),
      open('Back', () => backNode),
      close('Leave the restricted area'),
    ],
  };
}

function nestedFrontDesk(original) {
  const text = String(original.text || '');
  if (/academy/i.test(text)) {
    return academyRoot({
      name: 'Desk Officer',
      text: '"What else can I explain?"',
      choices: [close()],
    });
  }
  if (/clean right now|wanted level/i.test(text)) {
    return {
      ...original,
      name: 'Desk Officer',
      choices: [
        open('What creates heat?', () => ({
          name: 'Desk Officer',
          text: '"Vehicle theft, robbery, reckless crashes, attacking people, and interfering with officers all create reports. Repeating trouble also builds longer-term heat."',
          choices: [close('Understood')],
        })),
        close('Understood'),
      ],
    };
  }
  return original;
}

export function enhancePoliceDialogue(options) {
  const name = String(options?.name || '');
  if (name === 'Police Station — Front Desk') return frontDeskRoot(options);
  if (name === 'Holding Cells') return holdingCellsRoot(options);
  if (name === 'Evidence Locker — RESTRICTED') return evidenceRoot(options);
  if (name === 'Front Desk') return nestedFrontDesk(options);
  return options;
}

registerDialogueEnhancer('starter-town-police', enhancePoliceDialogue);
