import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CHARACTER_POLICY,
  CHARACTER_POOLS,
  characterForRole,
  isApprovedCharacter,
  randomCharacterForRole,
} from '../src/config/characterPools.js';

test('civilian pool excludes special-service and hostile appearances', () => {
  const forbidden = /police|doctor|firefighter|killer|monster/i;
  assert.ok(CHARACTER_POOLS.civilian.length >= 30);
  assert.ok(CHARACTER_POOLS.civilian.every((name) => !forbidden.test(name)));
});

test('role selection is deterministic for stable seeds', () => {
  assert.equal(characterForRole('player', 'same-save'), characterForRole('player', 'same-save'));
  assert.equal(characterForRole('civilian', 4), CHARACTER_POOLS.civilian[4]);
  assert.ok(isApprovedCharacter('police', characterForRole('police', 2)));
});

test('random role selection stays inside the approved pool', () => {
  assert.equal(randomCharacterForRole('police', () => 0), CHARACTER_POOLS.police[0]);
  assert.equal(
    randomCharacterForRole('police', () => 0.999999),
    CHARACTER_POOLS.police[CHARACTER_POOLS.police.length - 1],
  );
});

test('runtime character budgets remain capped for performance', () => {
  assert.equal(CHARACTER_POLICY.player.maxLive, 1);
  assert.ok(CHARACTER_POLICY.civilian.maxLive <= 8);
  assert.ok(CHARACTER_POLICY.police.maxLive <= 6);
});
