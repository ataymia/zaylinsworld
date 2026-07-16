import test from 'node:test';
import assert from 'node:assert/strict';

import { STARTER_TOWN_ID } from '../src/config/townRegistry.js';
import {
  clearSave,
  defaultState,
  hasSave,
  loadState,
  saveState,
} from '../src/state.js';

class MemoryStorage {
  constructor() {
    this.map = new Map();
  }

  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }

  setItem(key, value) {
    this.map.set(key, String(value));
  }

  removeItem(key) {
    this.map.delete(key);
  }
}

test.beforeEach(() => {
  globalThis.localStorage = new MemoryStorage();
});

test.afterEach(() => {
  delete globalThis.localStorage;
});

test('defaultState contains the required Starter Town systems', () => {
  const state = defaultState();
  assert.equal(state.createdCharacter, false);
  assert.equal(state.useRealSkin, true);
  assert.equal(state.townId, STARTER_TOWN_ID);
  assert.equal(state.townLoadStates[STARTER_TOWN_ID], 'active');
  assert.equal(state.equippedWeapon, 'fists');
  assert.deepEqual(state.ownedWeapons, ['fists']);
  assert.equal(typeof state.stats.health, 'number');
  assert.equal(typeof state.pos.x, 'number');
  assert.equal(typeof state.pos.z, 'number');
});

test('saveState and loadState preserve progress', () => {
  const state = defaultState();
  state.money = 1234;
  state.stats.fun = 88;
  state.ownedCars = ['starter'];

  assert.equal(saveState(state), true);
  assert.equal(hasSave(), true);

  const loaded = loadState();
  assert.equal(loaded.money, 1234);
  assert.equal(loaded.stats.fun, 88);
  assert.equal(loaded.townId, STARTER_TOWN_ID);
  assert.deepEqual(loaded.ownedCars, ['starter']);
});

test('loadState migrates stale real-skin and pre-town saves', () => {
  const legacy = {
    version: 2,
    useRealSkin: false,
    money: 777,
    custom: { hair: 'afro' },
  };
  globalThis.localStorage.setItem('zaylinsworld.save.v2', JSON.stringify(legacy));

  const loaded = loadState();
  assert.equal(loaded.useRealSkin, true);
  assert.equal(loaded.townId, STARTER_TOWN_ID);
  assert.equal(loaded.townLoadStates[STARTER_TOWN_ID], 'active');
  assert.equal(loaded.money, 777);
  assert.equal(loaded.custom.hair, 'afro');
  assert.equal(typeof loaded.custom.skin, 'string');
});

test('unknown future town ids safely fall back to Starter Town', () => {
  const invalid = {
    ...defaultState(),
    townId: 'missing-town',
    townLoadStates: { 'missing-town': 'active' },
  };
  globalThis.localStorage.setItem('zaylinsworld.save.v2', JSON.stringify(invalid));

  const loaded = loadState();
  assert.equal(loaded.townId, STARTER_TOWN_ID);
  assert.equal(loaded.townLoadStates[STARTER_TOWN_ID], 'active');
});

test('clearSave removes the stored save', () => {
  assert.equal(saveState(defaultState()), true);
  assert.equal(hasSave(), true);
  clearSave();
  assert.equal(hasSave(), false);
  assert.equal(loadState(), null);
});
