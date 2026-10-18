import assert from 'node:assert/strict';
import fs from 'node:fs';
import { performanceBudget } from '../src/config/performanceBudgets.js';
import { ObjectPool } from '../src/runtime/ObjectPool.js';
import {
  POLICE_RELEVANCE_BANDS,
  policeSimulationBudget,
  policeStaffingFor,
} from '../src/runtime/PoliceSimulationPolicy.js';

assert.deepEqual(policeStaffingFor(0), { foot: 0, vehicles: 0 });
assert.deepEqual(policeStaffingFor(1), { foot: 1, vehicles: 0 });
assert.deepEqual(policeStaffingFor(2), { foot: 3, vehicles: 0 });
assert.deepEqual(policeStaffingFor(3), { foot: 4, vehicles: 1 });
assert.deepEqual(policeStaffingFor(4), { foot: 4, vehicles: 2 });
assert.deepEqual(policeStaffingFor(5), { foot: 4, vehicles: 2 });
assert.deepEqual(policeStaffingFor(99), policeStaffingFor(5), 'wanted staffing must clamp to five stars');
for (let wanted = 0; wanted <= 5; wanted++) {
  const staffing = policeStaffingFor(wanted);
  assert.ok(staffing.foot + staffing.vehicles <= performanceBudget('low').maxPoliceUnits,
    `${wanted}-star staffing must fit the low-spec police budget`);
}

assert.deepEqual(policeSimulationBudget(40, 'foot'), { tier: 'near', interval: 0, recycle: false });
assert.equal(policeSimulationBudget(POLICE_RELEVANCE_BANDS.near + 1, 'foot').tier, 'mid');
assert.equal(policeSimulationBudget(POLICE_RELEVANCE_BANDS.mid + 1, 'vehicle').tier, 'far');
assert.equal(policeSimulationBudget(POLICE_RELEVANCE_BANDS.far + 1, 'vehicle').tier, 'distant');
assert.equal(policeSimulationBudget(POLICE_RELEVANCE_BANDS.recycle + 1, 'foot').recycle, true);
assert.ok(policeSimulationBudget(300, 'vehicle').interval < policeSimulationBudget(300, 'foot').interval,
  'distant cruisers should update slightly more often than distant foot units');

let created = 0;
let deactivated = 0;
const pool = new ObjectPool({
  name: 'police-transfer-test',
  create: () => ({ id: ++created, visible: true }),
  deactivate: (item) => { item.visible = false; deactivated += 1; },
  maxSize: 2,
});
const stolenCruiser = pool.acquire();
assert.equal(pool.detach(stolenCruiser), true, 'stealing a cruiser must transfer it out of pool ownership');
assert.equal(stolenCruiser.visible, true, 'detaching must not hide the player-controlled cruiser');
assert.equal(deactivated, 0, 'detaching must not run pursuit cleanup');
assert.equal(pool.release(stolenCruiser), false, 'pursuit cleanup must not reclaim a detached cruiser');
assert.equal(pool.snapshot().detached, 1);
const pursuitCruiser = pool.acquire();
assert.notEqual(pursuitCruiser, stolenCruiser, 'the pool must create a replacement after a cruiser is stolen');
assert.equal(pool.release(pursuitCruiser), true);
assert.equal(pool.acquire(), pursuitCruiser, 'ordinary pursuit cleanup must reuse its cruiser');
assert.equal(pool.snapshot().reused, 1);

const mainSource = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
assert.match(mainSource, /registerLivePolicePool\('police'/, 'foot officers must use the named police pool');
assert.match(mainSource, /registerLivePolicePool\('police-vehicles'/, 'pursuit cruisers must use the named vehicle pool');
assert.match(mainSource, /policePools\?\.vehicles\?\.detach\(vehicle\)/,
  'stolen pursuit cruisers must transfer out of pool ownership');
assert.match(mainSource, /policePools\?\.foot\?\.release\(u,/,
  'foot-officer cleanup must release to the pool');
assert.match(mainSource, /policePools\?\.vehicles\?\.release\(c,/,
  'cruiser cleanup must release to the pool');
assert.match(mainSource, /policeSimulationBudget\(d, 'foot'\)/,
  'foot pursuit updates must consume the distance budget');
assert.match(mainSource, /policeSimulationBudget\(d, 'vehicle'\)/,
  'cruiser pursuit updates must consume the distance budget');
assert.match(mainSource, /const staffing = policeStaffingFor\(wanted\)/,
  'wanted staffing must use the deterministic policy');
assert.match(mainSource, /while \(policeCars\.length > wantCars\)/,
  'de-escalation must release excess cruisers');
assert.match(mainSource, /while \(policeUnits\.length > wantFoot\)/,
  'de-escalation must release excess officers');
assert.match(mainSource, /policePools:\s*\(\) => policePoolSnapshot\(\)/,
  'the browser acceptance bridge must expose real pool telemetry');

console.log('Starter Town police lifecycle acceptance passed:');
console.log('- 1–5 star staffing preserves the existing six-unit cap');
console.log('- near pursuit stays full-rate while distant units use bounded update intervals');
console.log('- officers and cruisers return to named pools after pursuit cleanup');
console.log('- a stolen cruiser detaches alive and cannot be reclaimed by cleanup');
