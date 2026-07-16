import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import {
  createCharacterMotionDriver,
  setCharacterMotionState,
} from '../src/characterMotion.js';

function makeAvatar() {
  const scene = new THREE.Scene();
  const group = new THREE.Group();
  scene.add(group);

  const names = [
    'hips', 'spine', 'spine2', 'neck', 'head',
    'leftupleg', 'leftleg', 'leftfoot',
    'rightupleg', 'rightleg', 'rightfoot',
    'leftarm', 'leftforearm', 'rightarm', 'rightforearm',
  ];
  const skinBones = Object.fromEntries(names.map((name) => [name, new THREE.Bone()]));
  const skin = new THREE.Group();
  skin.scale.setScalar(0.01);
  group.add(skin);
  return { scene, avatar: { group, skin, skinBones } };
}

test('motion driver infers locomotion and poses standard humanoid bones', () => {
  const { avatar } = makeAvatar();
  const driver = createCharacterMotionDriver(avatar);
  const rest = avatar.skinBones.leftupleg.quaternion.clone();

  driver.update(1 / 60);
  avatar.group.position.x += 0.25;
  for (let index = 0; index < 4; index++) driver.update(1 / 60);

  assert.notEqual(driver.state, 'idle');
  assert.equal(avatar.motionState, driver.state);
  assert.ok(rest.angleTo(avatar.skinBones.leftupleg.quaternion) > 0.001);
});

test('motion state can be explicitly forced and cleared', () => {
  const { avatar } = makeAvatar();
  const driver = createCharacterMotionDriver(avatar);

  setCharacterMotionState(avatar, 'run');
  driver.update(1 / 60);
  assert.equal(driver.state, 'run');

  setCharacterMotionState(avatar, null);
  for (let index = 0; index < 20; index++) driver.update(1 / 60);
  assert.equal(driver.state, 'idle');
});

test('motion driver requests removal after its avatar leaves the scene', () => {
  const { scene, avatar } = makeAvatar();
  const driver = createCharacterMotionDriver(avatar);
  driver.update(1 / 60);
  scene.remove(avatar.group);
  assert.equal(driver.update(1 / 60), undefined);
  assert.equal(driver.update(1 / 60), false);
});
