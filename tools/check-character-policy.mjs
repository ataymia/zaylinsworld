import assert from 'node:assert/strict';
import * as THREE from 'three';
import { validateHumanoidGlb } from '../src/characterValidation.js';
import {
  CHARACTER_ROLE_POLICY,
  CIVILIAN_CHARACTER_CANDIDATES,
  POLICE_CHARACTER_CANDIDATES,
  stableCharacterCandidate,
} from '../src/config/characterRoles.js';

function boxScene(width, height, depth) {
  const root = new THREE.Group();
  root.add(new THREE.Mesh(new THREE.BoxGeometry(width, height, depth)));
  return root;
}

// Regression: PSX-scale source models around 400–590 units tall must normalize
// successfully instead of being rejected as raw giants.
const psxSized = validateHumanoidGlb(boxScene(90, 470, 180), 1.8);
assert.equal(psxSized.ok, true, psxSized.reason);
assert.ok(Math.abs(psxSized.finalHeight - 1.8) < 1e-6);
assert.ok(psxSized.scale > 0.003 && psxSized.scale < 0.005);

// A genuinely absurd post-normalization silhouette must still be rejected.
const wallBlob = validateHumanoidGlb(boxScene(900, 100, 900), 1.8);
assert.equal(wallBlob.ok, false);
assert.match(wallBlob.reason, /width\/depth/);

assert.equal(CHARACTER_ROLE_POLICY.player.mode, 'procedural-custom');
assert.ok(CHARACTER_ROLE_POLICY.civilian.maxLiveSkins <= 12);
assert.ok(CIVILIAN_CHARACTER_CANDIDATES.length >= 20);
assert.ok(POLICE_CHARACTER_CANDIDATES.every((name) => name.includes('police')));
assert.equal(
  stableCharacterCandidate(CIVILIAN_CHARACTER_CANDIDATES, 'citynpc-4'),
  stableCharacterCandidate(CIVILIAN_CHARACTER_CANDIDATES, 'citynpc-4'),
  'candidate selection must be stable for the same NPC id',
);

console.log('[characters] policy and bounds regression checks passed.');
