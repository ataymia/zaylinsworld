import test from 'node:test';
import assert from 'node:assert/strict';

import {
  STARTER_TOWN,
  STARTER_TOWN_ID,
  TOWN_SERVICE_TYPES,
  landmarkById,
  townById,
  townHasRequiredServices,
  townIds,
} from '../src/config/townRegistry.js';
import {
  TOWN_LOAD_STATE,
  desiredTownLoadState,
  distanceToTown,
  planTownLoads,
  townRuntimeBudget,
} from '../src/townStreaming.js';

test('Starter Town is registered with all shared service categories', () => {
  assert.equal(townById(STARTER_TOWN_ID), STARTER_TOWN);
  assert.deepEqual(townIds(), [STARTER_TOWN_ID]);
  assert.equal(townHasRequiredServices(STARTER_TOWN), true);
  assert.ok(TOWN_SERVICE_TYPES.every((type) => STARTER_TOWN.services[type].length > 0));
});

test('Starter Town registry exposes landmarks and public safety', () => {
  assert.equal(landmarkById(STARTER_TOWN, 'school')?.interiorId, 'school');
  assert.equal(landmarkById(STARTER_TOWN, 'blocksupply')?.interiorId, 'blocksupply');
  assert.equal(landmarkById(STARTER_TOWN, 'police')?.name, 'POLICE STATION');
  assert.equal(landmarkById(STARTER_TOWN, 'missing'), null);
});

test('town load state uses active, warm, and unload radii with hysteresis', () => {
  assert.equal(distanceToTown(STARTER_TOWN, { x: 0, z: 0 }), 0);
  assert.equal(
    desiredTownLoadState(STARTER_TOWN, { x: 20, z: 20 }),
    TOWN_LOAD_STATE.ACTIVE,
  );
  assert.equal(
    desiredTownLoadState(STARTER_TOWN, { x: 120, z: 0 }),
    TOWN_LOAD_STATE.WARM,
  );
  assert.equal(
    desiredTownLoadState(STARTER_TOWN, { x: 200, z: 0 }, TOWN_LOAD_STATE.ACTIVE),
    TOWN_LOAD_STATE.WARM,
  );
  assert.equal(
    desiredTownLoadState(STARTER_TOWN, { x: 260, z: 0 }, TOWN_LOAD_STATE.WARM),
    TOWN_LOAD_STATE.UNLOADED,
  );
});

test('town runtime budgets remove expensive systems before geometry', () => {
  const active = townRuntimeBudget(STARTER_TOWN, TOWN_LOAD_STATE.ACTIVE);
  const warm = townRuntimeBudget(STARTER_TOWN, TOWN_LOAD_STATE.WARM);
  const unloaded = townRuntimeBudget(STARTER_TOWN, TOWN_LOAD_STATE.UNLOADED);

  assert.equal(active.geometry, true);
  assert.ok(active.civilians > 0);
  assert.equal(warm.geometry, true);
  assert.equal(warm.civilians, 0);
  assert.equal(warm.interiors, false);
  assert.equal(unloaded.geometry, false);
});

test('load planning returns stable town ids, states, distances, and budgets', () => {
  const plan = planTownLoads([STARTER_TOWN], { x: 0, z: 0 });
  assert.equal(plan.length, 1);
  assert.equal(plan[0].townId, STARTER_TOWN_ID);
  assert.equal(plan[0].state, TOWN_LOAD_STATE.ACTIVE);
  assert.equal(plan[0].distance, 0);
  assert.equal(plan[0].budget.geometry, true);
});
