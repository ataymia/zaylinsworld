import assert from 'node:assert/strict';
import {defaultState} from '../src/state.js';
import {boardHarborBoat,HARBOR_BOAT_DOCK} from '../src/runtime/HarborBoatLife.js';
import {MARINE_CERTIFICATE_ID} from '../src/runtime/MarineAcademyLife.js';
import {BUOY_RACE_CHECKPOINTS,BUOY_RACE_TIME_LIMIT,validBuoyRaceCourse,
 beginBuoyRace,tickBuoyRace,abortBuoyRace,normalizeHarborRaceRecord}
 from '../src/runtime/HarborBuoyRace.js';
import {readFileSync,existsSync} from 'node:fs';
assert(validBuoyRaceCourse(),'all checkpoints must be clear of piers and inside navigable water');
assert.equal(BUOY_RACE_CHECKPOINTS.length,6);
const state=defaultState(),money=state.money;
assert.equal(beginBuoyRace(state).error,'not-aboard');
assert(boardHarborBoat(state).ok);
const rentalMoney=state.money;
const s=beginBuoyRace(state);assert(!s.error);
assert.equal(tickBuoyRace(state,s,.05,HARBOR_BOAT_DOCK).type,'running');
for(const invalid of [{x:NaN,z:-2920},{x:800},{x:Infinity,z:-2920},{x:'800',z:-2920}]){
 assert.equal(tickBuoyRace(state,s,.05,invalid).type,'running');
 assert.equal(s.index,0,'invalid coordinates must not advance the race');
}
for(let i=0;i<BUOY_RACE_CHECKPOINTS.length;i++){
 const result=tickBuoyRace(state,s,.05,BUOY_RACE_CHECKPOINTS[i]);
 if(i<BUOY_RACE_CHECKPOINTS.length-1){
  assert.equal(result.type,'checkpoint');assert.equal(result.number,i+1);
 }else{
  assert.equal(result.type,'finished');assert(result.payout>0);
  assert.equal(state.money,rentalMoney+result.payout);
 }
}
assert.equal(state.harborRace.completions,1);
assert.equal(state.harborRace.attempts,1);
assert(state.harborRace.bestSeconds>0);
assert.equal(tickBuoyRace(state,s,1).type,'inactive');
const earned=state.money;
const repeat=beginBuoyRace(state);assert(!repeat.error);
for(const mark of BUOY_RACE_CHECKPOINTS){
 const result=tickBuoyRace(state,repeat,.05,mark);
 if(result.type==='finished')assert.equal(result.payout,0,'only pay once each in-game day');
}
assert.equal(state.money,earned);
state.day++;
const nextDay=beginBuoyRace(state);assert(!nextDay.error);
for(const mark of BUOY_RACE_CHECKPOINTS){
 const outcome=tickBuoyRace(state,nextDay,.05,mark);
 if(outcome.type==='finished')assert(outcome.payout>0);
}
const certified=defaultState();
certified.education.certificates.push(MARINE_CERTIFICATE_ID);
assert(boardHarborBoat(certified).ok);
const course=beginBuoyRace(certified);
let academyBonus;
for(const mark of BUOY_RACE_CHECKPOINTS){
 const result=tickBuoyRace(certified,course,.05,mark);
 if(result.type==='finished')academyBonus=result.payout;
}
assert(academyBonus>0);
const untrained=defaultState();boardHarborBoat(untrained);
const practice=beginBuoyRace(untrained);
let standardPrize;
for(const mark of BUOY_RACE_CHECKPOINTS){
 const result=tickBuoyRace(untrained,practice,.05,mark);
 if(result.type==='finished')standardPrize=result.payout;
}
assert.equal(academyBonus-standardPrize,25,'certificate should reward navigation study');
const timeTrial=beginBuoyRace(certified);timeTrial.seconds=BUOY_RACE_TIME_LIMIT-.02;
const timeout=tickBuoyRace(certified,timeTrial,.05,{x:0,z:0});
assert.equal(timeout.type,'timeout');assert.equal(timeout.payout,0);
assert.equal(certified.harborRace.attempts,2);
const cancelled=beginBuoyRace(certified);
assert.equal(abortBuoyRace(cancelled).type,'aborted');
assert.equal(abortBuoyRace(cancelled).type,'inactive');
const damaged=defaultState();boardHarborBoat(damaged);
damaged.boating.hull=10;
assert.equal(beginBuoyRace(damaged).error,'service-required');
damaged.boating.hull=100;damaged.boating.z=-3200;
assert.equal(beginBuoyRace(damaged).error,'start-at-marina');
const migrated=normalizeHarborRaceRecord({attempts:-10,completions:9,bestSeconds:-5,lastPaidDay:-1});
assert.equal(migrated.attempts,0);assert.equal(migrated.bestSeconds,null);assert.equal(migrated.lastPaidDay,null);
assert.equal(normalizeHarborRaceRecord(JSON.parse(JSON.stringify(state.harborRace))).completions,3);
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
assert.match(main,/createHarborBuoyCourse\(scene\)/);
assert.match(main,/beginBuoyRace\(state\)/);
assert.match(main,/tickBuoyRace\(state,buoyRaceSession,dt\)/);
assert.match(main,/controls\.consumePress\('b'\)/);
assert.match(main,/abortBuoyRace\(buoyRaceSession\)/);
assert(existsSync(new URL('../public/assets/models/generated/fishing-harbor/modular_prop/prop_harbor_buoy_a_v01.glb',import.meta.url)));
console.log('[buoy-race] authentic assets, water-safe course, timed six-marker navigation, payout once/day, certificate bonus, persistence, cancel and softlock checks passed');
