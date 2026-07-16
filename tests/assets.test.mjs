import test from 'node:test';
import assert from 'node:assert/strict';

import { selectAssetEntry } from '../src/assets.js';

const entries = [
  { name: 'character-01-alt', path: 'alt.glb' },
  { name: 'character-01', path: 'exact.glb' },
  { name: 'character-010', path: 'ten.glb' },
];

test('selectAssetEntry prefers an exact case-insensitive match', () => {
  assert.equal(selectAssetEntry(entries, 'CHARACTER-01')?.path, 'exact.glb');
});

test('selectAssetEntry keeps substring lookup as a legacy fallback', () => {
  assert.equal(selectAssetEntry(entries, '01-alt')?.path, 'alt.glb');
  assert.equal(selectAssetEntry(entries, 'missing'), null);
});

test('selectAssetEntry safely handles empty inputs', () => {
  assert.equal(selectAssetEntry([], 'anything'), null);
  assert.equal(selectAssetEntry(null, 'anything'), null);
});
