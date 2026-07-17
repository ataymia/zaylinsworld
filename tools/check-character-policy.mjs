import assert from 'node:assert/strict';
import * as THREE from 'three';
import { validateHumanoidGlb } from '../src/characterValidation.js';
import {
  CHARACTER_ROLE_POLICY,
  CIVILIAN_CHARACTER_CANDIDATES,
  POLICE_CHARACTER_CANDIDATES,
  stableCharacterCandidate,
} from '../src/config/characterRoles.js';
import {
  PLAYER_AVATAR_CATALOG,
  PLAYER_CUSTOM_DEFAULTS,
  ensurePlayerCustom,
  clonePlayerAppearance,
} from '../src/config/playerAvatarCatalog.js';

function boxScene(width, height, depth) {
  const root = new THREE.Group();
  root.add(new THREE.Mesh(new THREE.BoxGeometry(width, height, depth)));
  return root;
}

const psxSized = validateHumanoidGlb(boxScene(90, 470, 180), 1.8);
assert.equal(psxSized.ok, true, psxSized.reason);
assert.ok(Math.abs(psxSized.finalHeight - 1.8) < 1e-6);
assert.ok(psxSized.scale > 0.003 && psxSized.scale < 0.005);

const wallBlob = validateHumanoidGlb(boxScene(900, 100, 900), 1.8);
assert.equal(wallBlob.ok, false);
assert.match(wallBlob.reason, /width\/depth/);

assert.equal(CHARACTER_ROLE_POLICY.player.mode, 'modular-custom');
assert.equal(CHARACTER_ROLE_POLICY.player.asset, 'sunbox-male-free');
assert.equal(CHARACTER_ROLE_POLICY.civilian.mode, 'glb-functional-direct');
assert.ok(CHARACTER_ROLE_POLICY.civilian.maxLiveSkins >= 20);
assert.equal(CHARACTER_ROLE_POLICY.civilian.playEmbeddedClip, false);
assert.equal(CHARACTER_ROLE_POLICY.civilian.castShadows, false);
assert.equal(CHARACTER_ROLE_POLICY.police.mode, 'procedural-functional');
assert.equal(CHARACTER_ROLE_POLICY.police.playEmbeddedClip, false);
assert.ok(CIVILIAN_CHARACTER_CANDIDATES.length >= 40);
assert.ok(POLICE_CHARACTER_CANDIDATES.every((name) => name.includes('police')));
assert.equal(
  stableCharacterCandidate(CIVILIAN_CHARACTER_CANDIDATES, 'citynpc-4'),
  stableCharacterCandidate(CIVILIAN_CHARACTER_CANDIDATES, 'citynpc-4'),
  'candidate selection must be stable for the same NPC id',
);

for (const slot of ['hair', 'facialHair', 'top', 'bottom', 'shoes', 'hat', 'glasses']) {
  assert.ok(PLAYER_AVATAR_CATALOG.slots[slot]?.length, `missing modular slot ${slot}`);
}
assert.ok(PLAYER_AVATAR_CATALOG.slots.hair.some((entry) => entry.id === 'gltf-long'), 'legacy asset hair must remain available');
assert.ok(PLAYER_AVATAR_CATALOG.slots.hair.some((entry) => entry.id === 'gltf-buns'), 'legacy asset hair must remain available');
assert.ok(PLAYER_AVATAR_CATALOG.hairColors.length >= 8, 'asset hair needs the existing color palette');
assert.ok(PLAYER_AVATAR_CATALOG.faceSliders.length >= 15, 'full face sculpt controls must stay available');
assert.ok(PLAYER_AVATAR_CATALOG.variants.eyes.length >= 17, 'all free eye textures must remain catalogued');
assert.equal(PLAYER_AVATAR_CATALOG.variants.eyelashes.length, 4);
const migrated = ensurePlayerCustom({ body: 'heavy', height: 'tall', hair: 'gltf-long' });
assert.ok(migrated.bodyMass > 0.5);
assert.ok(migrated.heightScale > 1);
assert.equal(migrated.modularHair, 'gltf-long');
assert.equal(migrated.hair, 'low-fade', 'legacy fallback must not double-load a hidden glTF hair');
assert.equal(clonePlayerAppearance(PLAYER_CUSTOM_DEFAULTS).modularTop, 'tshirt');
assert.ok(PLAYER_AVATAR_CATALOG.bodySliders.find((slider) => slider.key === 'heightScale').min <= 0.82);
assert.ok(PLAYER_AVATAR_CATALOG.bodySliders.find((slider) => slider.key === 'heightScale').max >= 1.18);

console.log('[characters] modular player, direct imported civilians, legacy hair and bounds checks passed.');
