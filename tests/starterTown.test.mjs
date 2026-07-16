import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';

import { INTERIOR_PREFABS } from '../src/config/interiorPrefabs.js';
import { SHOP_ZONES, zoneSlot } from '../src/config/blockSupplyLayout.js';
import { buildChickenFryerLine } from '../src/chickenSpotKitchen.js';

test('Block Supply wall slots stay inside the registered room and clear of the entrance', () => {
  const prefab = INTERIOR_PREFABS.block_supply_interior;
  const halfW = prefab.size.w / 2;
  const halfD = prefab.size.d / 2;

  for (const [zoneId, zone] of Object.entries(SHOP_ZONES)) {
    const sampleCount = Math.max(zone.perRow, 8);
    for (let index = 0; index < sampleCount; index++) {
      const { pos } = zoneSlot(zoneId, index);
      assert.ok(pos[0] >= -halfW && pos[0] <= halfW, `${zoneId} x out of room: ${pos[0]}`);
      assert.ok(pos[2] >= -halfD && pos[2] <= halfD, `${zoneId} z out of room: ${pos[2]}`);
      assert.ok(pos[1] >= 0.25 && pos[1] <= prefab.size.h, `${zoneId} y out of room: ${pos[1]}`);

      // Right-wall displays may use only the rear wall segment, leaving the
      // centered entrance at x=4.5, z=0 unobstructed.
      if (Math.abs(pos[0] - halfW) < 0.6) {
        assert.ok(pos[2] < -0.75, `${zoneId} enters the Block Supply doorway lane`);
      }
    }
  }
});

test('school prefab contains classroom rows and a study interaction', () => {
  const school = INTERIOR_PREFABS.classroom_interior;
  const desks = school.zones.filter((zone) => zone.pool === 'classroom_desk');
  assert.ok(desks.length >= 3);
  assert.ok(desks.reduce((sum, zone) => sum + (zone.count || 0), 0) >= 12);
  assert.ok(school.stations.some((station) => station.id === 'study'));
  assert.ok(school.npcSpawns.some((spawn) => spawn.role === 'teacher'));
});

test('police prefab exposes front desk, academy, and evidence interactions', () => {
  const police = INTERIOR_PREFABS.police_interior;
  const ids = new Set(police.stations.map((station) => station.id));
  assert.ok(ids.has('frontdesk'));
  assert.ok(ids.has('academy'));
  assert.ok(ids.has('evidence-locker'));
  assert.ok(police.npcSpawns.some((spawn) => spawn.role === 'police'));
});

test('Chicken Spot prefab keeps order, eating, and shift interactions', () => {
  const restaurant = INTERIOR_PREFABS.restaurant_interior;
  const ids = new Set(restaurant.stations.map((station) => station.id));
  assert.deepEqual([...ids].sort(), ['eat', 'order', 'shift']);
  assert.ok(restaurant.zones.some((zone) => zone.pool === 'fryer_kitchen'));
});

test('procedural fryer line creates grounded kitchen equipment and support surfaces', () => {
  const root = new THREE.Group();
  const result = buildChickenFryerLine(root, 0, 0);
  assert.equal(result.items, 3);
  assert.equal(result.supports.length, 3);
  assert.ok(root.getObjectByName('chicken-fryer-double'));
  assert.ok(root.getObjectByName('chicken-fryer-single'));
  assert.ok(root.getObjectByName('chicken-drain-rack'));
  assert.ok(result.supports.every((box) => box instanceof THREE.Box3 && box.max.y > 0.9));
});

test('Chicken Spot furnishing excludes bakery-style stove assets', () => {
  const source = readFileSync(resolve('src/furnish.js'), 'utf8');
  assert.doesNotMatch(source, /name:\s*['"]stove-griddle['"]/);
  assert.doesNotMatch(source, /name:\s*['"]burner-stove['"]/);
  assert.match(source, /buildChickenFryerLine/);
});
