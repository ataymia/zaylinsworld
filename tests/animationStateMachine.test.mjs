import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AnimationController,
  STATES,
  resolveClip,
} from '../src/animation/animationStateMachine.js';

test('resolveClip maps common animation names to logical states', () => {
  const clips = ['Idle_Breathing', 'Walking', 'Running Fast', 'Pistol Aim', 'Reload Rifle'];
  assert.equal(resolveClip(STATES.IDLE, clips), 'Idle_Breathing');
  assert.equal(resolveClip(STATES.WALK, clips), 'Walking');
  assert.equal(resolveClip(STATES.RUN, clips), 'Running Fast');
  assert.equal(resolveClip(STATES.GUN_HOLD, clips), 'Pistol Aim');
  assert.equal(resolveClip(STATES.RELOAD, clips), 'Reload Rifle');
});

test('resolveClip safely returns null when a clip is unavailable', () => {
  assert.equal(resolveClip(STATES.SWIM, ['Idle', 'Walk']), null);
  assert.equal(resolveClip(STATES.IDLE, []), null);
  assert.equal(resolveClip(STATES.IDLE, null), null);
});

test('AnimationController drives locomotion states without a mixer', () => {
  const seen = [];
  const controller = new AnimationController({ onState: (state) => seen.push(state) });

  assert.equal(controller.state, STATES.IDLE);
  assert.equal(controller.setLocomotion(1), true);
  assert.equal(controller.state, STATES.WALK);
  assert.equal(controller.setLocomotion(7), true);
  assert.equal(controller.state, STATES.RUN);
  assert.equal(controller.setLocomotion(0), true);
  assert.equal(controller.state, STATES.IDLE);
  assert.deepEqual(seen, [STATES.WALK, STATES.RUN, STATES.IDLE]);
});

test('AnimationController resolves and plays matching clips', () => {
  const played = [];
  const mixer = {
    play(name, options) {
      played.push({ name, options });
      return {};
    },
  };
  const controller = new AnimationController({
    mixer,
    clipNames: ['Idle', 'Walking', 'Running'],
  });

  assert.equal(played[0].name, 'Idle');
  controller.set(STATES.WALK);
  controller.set(STATES.RUN);
  assert.deepEqual(played.map((entry) => entry.name), ['Idle', 'Walking', 'Running']);
});
