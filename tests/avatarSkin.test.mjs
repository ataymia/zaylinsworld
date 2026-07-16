import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import {
  CIVILIANS,
  PLAYER_CANDIDATES,
  POLICE,
  validateHumanoidGlb,
} from '../src/avatarSkin.js';

test('validateHumanoidGlb accepts and normalizes a plausible humanoid', () => {
  const scene = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2, 0.4));
  body.position.y = 1;
  scene.add(body);

  const result = validateHumanoidGlb(scene, 1.8);
  assert.equal(result.ok, true);
  assert.equal(Number(result.scale.toFixed(2)), 0.9);
  assert.equal(Number((result.size.y * result.scale).toFixed(2)), 1.8);
});

test('validateHumanoidGlb rejects empty and extreme scenes without mutation', () => {
  const empty = new THREE.Group();
  const emptyResult = validateHumanoidGlb(empty, 1.8);
  assert.equal(emptyResult.ok, false);

  const huge = new THREE.Group();
  huge.add(new THREE.Mesh(new THREE.BoxGeometry(200, 200, 200)));
  const hugeResult = validateHumanoidGlb(huge, 1.8);
  assert.equal(hugeResult.ok, false);
});

test('role pools contain distinct approved character candidates', () => {
  assert.ok(CIVILIANS.length >= 16);
  assert.ok(PLAYER_CANDIDATES.length >= 8);
  assert.ok(POLICE.length >= 8);
  assert.ok(POLICE.every((name) => name.includes('police')));
  assert.equal(new Set(PLAYER_CANDIDATES).size, PLAYER_CANDIDATES.length);
});
