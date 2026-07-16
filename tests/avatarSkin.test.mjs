import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import {
  CIVILIANS,
  PLAYER_CANDIDATES,
  POLICE,
  isUsableCharacterClip,
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

test('validateHumanoidGlb rejects empty and extreme-proportion scenes', () => {
  const empty = new THREE.Group();
  const emptyResult = validateHumanoidGlb(empty, 1.8);
  assert.equal(emptyResult.ok, false);

  // Large source units alone are fine because the adapter normalizes height.
  // What must be rejected is a model whose normalized proportions remain a blob.
  const wideBlob = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(200, 1, 200));
  mesh.position.y = 0.5;
  wideBlob.add(mesh);
  const blobResult = validateHumanoidGlb(wideBlob, 1.8);
  assert.equal(blobResult.ok, false);
  assert.match(blobResult.reason, /final w\/d/);
});

test('pose-only animation tracks are not treated as locomotion clips', () => {
  const poseClip = {
    duration: 0.033,
    tracks: [{ times: [0, 0.033] }],
  };
  assert.equal(isUsableCharacterClip(poseClip), false);

  const walkClip = {
    duration: 1,
    tracks: [{ times: [0, 0.5, 1] }],
  };
  assert.equal(isUsableCharacterClip(walkClip), true);
});

test('role pools contain distinct approved character candidates', () => {
  assert.ok(CIVILIANS.length >= 16);
  assert.ok(PLAYER_CANDIDATES.length >= 8);
  assert.ok(POLICE.length >= 8);
  assert.ok(POLICE.every((name) => name.includes('police')));
  assert.equal(new Set(PLAYER_CANDIDATES).size, PLAYER_CANDIDATES.length);
});
