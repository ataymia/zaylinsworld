import assert from 'node:assert/strict';
import {defaultState} from '../src/state.js';
import {MARKET_DESTINATIONS,MARKET_ORDERS,ensureHarborJobsState,
 normalizeHarborJobsState,startHarborMarketShift,submitHarborMarketChoice,tickHarborMarketShift,
 SAFE_MARKET_TEMPERATURE}
 from '../src/runtime/HarborMarketJob.js';
import {readFileSync} from 'node:fs';
import {getHarborCrateSafetyStatus} from '../src/ui/HarborMarketPanel.js';
assert(MARKET_ORDERS.length>=8&&MARKET_DESTINATIONS.length===3);
for(const order of MARKET_ORDERS)assert(MARKET_DESTINATIONS.some(d=>d.id===order.answer));
const state=defaultState(),cash=state.money;
const s=startHarborMarketShift(state,{random:()=>0});
assert.equal(s.orders.length,4);
assert.equal(new Set(s.orders.map(o=>o.id)).size,4);
// A correct answer alone is not gameplay: cooling and temperature validation
// are required before transferring any real seafood to a sales/storage bay.
function prepAndDispatch(st,session){
 const order=session.orders[session.index];
 if(order.answer!=='inspect'){
   assert.equal(submitHarborMarketChoice(st,session,order.answer).type,'unprepared');
   let attempts=0;
   while(session.tempC>3.3&&attempts++<80)tickHarborMarketShift(st,session,.1,{cooling:true});
   assert(session.tempC>=SAFE_MARKET_TEMPERATURE.min);
   assert(session.tempC<=SAFE_MARKET_TEMPERATURE.max);
 }
 return submitHarborMarketChoice(st,session,order.answer);
}
for(let i=0;i<3;i++)assert.equal(prepAndDispatch(state,s).type,'next');
const end=prepAndDispatch(state,s);
assert.equal(end.type,'finished');assert.equal(end.score,4);
assert(end.payout>=52);assert.equal(state.money,cash+end.payout);
assert.equal(ensureHarborJobsState(state).market.shifts,1);
assert.equal(state.harborJobs.market.bestScore,4);
assert.equal(submitHarborMarketChoice(state,s,'ice').type,'inactive');
assert.equal(startHarborMarketShift(state).error,'already-worked');
assert.equal(normalizeHarborJobsState(JSON.parse(JSON.stringify(state.harborJobs))).market.lastDay,state.day);
// One poor shift does not delete high score or training progress.
state.day++;
const next=startHarborMarketShift(state,{random:()=>.5});
for(let i=0;i<4;i++){
 const order=next.orders[next.index];
 const wrong=MARKET_DESTINATIONS.find(d=>d.id!==order.answer).id;
 let result=submitHarborMarketChoice(state,next,wrong);
 if(result.type==='unprepared')result=submitHarborMarketChoice(state,next,'inspect');
 assert(['next','finished'].includes(result.type));
}
assert.equal(next.score,0);assert.equal(state.harborJobs.market.shifts,2);
assert.equal(state.harborJobs.market.bestScore,4);
assert.equal(state.harborJobs.market.lastPayout,15);
assert.equal(normalizeHarborJobsState({market:{bestScore:999,shifts:-100}}).market.bestScore,4);
// Overcooling and a conveyor timeout create genuine failure without an infinite shift.
const coldState=defaultState(),cold=startHarborMarketShift(coldState,{random:()=>0});
for(let i=0;i<35;i++)tickHarborMarketShift(coldState,cold,.1,{cooling:true});
assert(cold.tempC<1,'overuse of the ice chute must freeze the crate');
const initialOrder=cold.orders[cold.index];
if(initialOrder.answer!=='inspect')
 assert.equal(submitHarborMarketChoice(coldState,cold,initialOrder.answer).type,'unprepared');
// Freeze then rewarm must never earn a dispatch point or quality bonus.
const thawState=defaultState(),thaw=startHarborMarketShift(thawState,{random:()=>0});
const thawOrder=thaw.orders.findIndex(o=>o.answer!=='inspect');
while(thaw.index<thawOrder)assert.equal(submitHarborMarketChoice(thawState,thaw,'inspect').type,'next');
for(let i=0;i<35;i++)tickHarborMarketShift(thawState,thaw,.1,{cooling:true});
assert(thaw.overChilled&&thaw.tempC<1);
for(let i=0;i<100&&thaw.tempC<2;i++)tickHarborMarketShift(thawState,thaw,.1);
assert(thaw.tempC>=1&&thaw.tempC<=4);
const beforeScore=thaw.score,beforeQuality=thaw.quality;
const refused=submitHarborMarketChoice(thawState,thaw,thaw.orders[thaw.index].answer);
assert.equal(refused.type,'unprepared','previously frozen crate cannot be dispatched');
assert.equal(thaw.score,beforeScore);
assert.equal(thaw.quality,beforeQuality);
assert.equal(thaw.overChilled,true,'refusal must preserve cold-chain evidence');

// Visual state must follow cold-chain history, not just the current thermometer.
const thawSafety=getHarborCrateSafetyStatus(thaw);
assert.equal(thawSafety.inRange,true);
assert.equal(thawSafety.overChilled,true);
assert.equal(thawSafety.requiresInspection,true);
assert.equal(thawSafety.dispatchReady,false);

const thawResult=submitHarborMarketChoice(thawState,thaw,'inspect');
assert.equal(thawResult.type,'next','unsafe crate must be routable to inspection');
assert.equal(thawResult.correct,false);
assert.equal(thaw.score,beforeScore);
assert.equal(thaw.quality,beforeQuality);
assert.equal(thawResult.overChilled,true);
assert.equal(thaw.overChilled,false,'next crate must start with a clean temperature history');
const freshSafety=getHarborCrateSafetyStatus(thaw);
assert.equal(freshSafety.overChilled,false);
assert.equal(freshSafety.dispatchReady,false,'new warm crate still requires chilling');
const readySession={...thaw,tempC:2.5,overChilled:false};
const readySafety=getHarborCrateSafetyStatus(readySession);
assert.equal(readySafety.dispatchReady,readySession.orders[readySession.index].answer!=='inspect');

let expirations=0,finished=null;
for(let i=0;i<4*200;i++){
 if(!cold.finished){
   const result=tickHarborMarketShift(coldState,cold,.1);
   if(result?.timeout)expirations++;
   if(result.type==='finished')finished=result;
 }
}
assert(finished&&finished.score===0);
assert.equal(expirations,4);
assert.equal(coldState.harborJobs.market.lastScore,0);
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
assert.match(main,/startHarborMarketShift\(state\)/);
assert.match(main,/submitHarborMarketChoice\(state,harborMarketSession,choice\)/);
assert.match(main,/tickHarborMarketShift\(state,harborMarketSession,dt/);
assert.match(main,/getHarborMarketPanelInput\(\)/);
const panel=readFileSync(new URL('../src/ui/HarborMarketPanel.js',import.meta.url),'utf8');
assert.match(panel,/pointerdown/,'crate sorting must have physical drag and mobile support');
assert.match(panel,/crateX/,'the crate must be a manipulable object');
assert.match(panel,/cooling=true/,'the cold-chain is an independent input');
assert.match(panel,/safety\.overChilled\?'HOLD'/,'frozen crate must display a HOLD stamp');
assert.match(panel,/FROZEN · INSPECT/,'thermometer must retain the cold-chain warning');
assert.match(panel,/Rewarming cannot restore safety/,'instructions must explain inspection recovery');

assert.match(main,/showHarborMarketPanel\(harborMarketSession/);
assert.match(main,/!!harborMarketSession/);
assert.match(main,/harborAction.kind==='sell'/);
console.log('[harbor-market] real sorting choices, graded wages, daily cooldown, persistence, and UI wiring passed');
