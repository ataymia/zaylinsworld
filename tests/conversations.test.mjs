import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyDialogueEnhancers,
  dialogueEnhancerIds,
} from '../src/conversationRegistry.js';
import { enhancePoliceDialogue } from '../src/config/policeConversations.js';

function choice(options, pattern) {
  return options.choices.find((entry) => pattern.test(entry.label));
}

test('Police Station root becomes a controllable branching conversation', () => {
  const legalAction = () => 'keep';
  const original = {
    name: 'Police Station — Front Desk',
    text: 'Welcome to the station.',
    choices: [
      { label: 'How do I lower my wanted level?', onPick: legalAction },
      { label: 'Tell me about the academy', onPick: () => undefined },
      { label: 'Leave', onPick: () => undefined },
    ],
  };

  const enhanced = enhancePoliceDialogue(original);
  assert.equal(enhanced.name, 'Desk Officer');
  assert.ok(enhanced.choices.length >= 5);
  assert.equal(enhanced.choices[0].onPick, legalAction);

  const academy = choice(enhanced, /academy/i).onPick();
  assert.ok(academy.choices.length >= 5);
  const training = choice(academy, /train for/i).onPick();
  assert.match(training.text, /traffic control/i);
  assert.ok(training.choices.some((entry) => /back/i.test(entry.label)));
});

test('evidence conversation preserves the risky heat-changing callback', () => {
  let tampered = 0;
  const risky = () => { tampered++; };
  const original = {
    name: 'Evidence Locker — RESTRICTED',
    text: 'Restricted evidence cage.',
    choices: [
      { label: 'Inspect the cage', onPick: () => undefined },
      { label: 'Try the lock anyway', onPick: risky },
      { label: 'Walk away', onPick: () => undefined },
    ],
  };

  const enhanced = enhancePoliceDialogue(original);
  const preserved = choice(enhanced, /try the lock/i);
  assert.equal(preserved.onPick, risky);
  preserved.onPick();
  assert.equal(tampered, 1);
  assert.ok(choice(enhanced, /property be released/i));
});

test('holding cells expose booking, visitation, inspection, and exit choices', () => {
  const peer = () => undefined;
  const enhanced = enhancePoliceDialogue({
    name: 'Holding Cells',
    text: 'Three cells.',
    choices: [
      { label: 'Peer into a cell', onPick: peer },
      { label: 'Head back to the lobby', onPick: () => undefined },
    ],
  });

  assert.ok(choice(enhanced, /booking/i));
  assert.ok(choice(enhanced, /visit/i));
  assert.equal(choice(enhanced, /peer/i).onPick, peer);
  assert.ok(choice(enhanced, /lobby/i));
});

test('registered enhancer runs once for a dialogue object', () => {
  assert.ok(dialogueEnhancerIds().includes('starter-town-police'));
  const source = {
    name: 'Police Station — Front Desk',
    text: 'Welcome.',
    choices: [{ label: 'Legal information', onPick: () => undefined }],
  };
  const once = applyDialogueEnhancers(source);
  const twice = applyDialogueEnhancers(once);
  assert.equal(once, twice);
  assert.equal(once.choices.length, 5);
});
