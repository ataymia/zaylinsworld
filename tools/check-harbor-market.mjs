import assert from 'node:assert/strict';
import {defaultState} from '../src/state.js';
import {MARKET_DESTINATIONS,MARKET_ORDERS,ensureHarborJobsState,
 normalizeHarborJobsState,startHarborMarketShift,submitHarborMarketChoice}
 from '../src/runtime/HarborMarketJob.js';
import {readFileSync} from 'node:fs';
assert(MARKET_ORDERS.length>=8&&MARKET_DESTINATIONS.length===3);
for(const order of MARKET_ORDERS)assert(MARKET_DESTINATIONS.some(d=>d.id===order.answer));
const state=defaultState(),cash=state.money;
const s=startHarborMarketShift(state,{random:()=>0});
assert.equal(s.orders.length,4);
assert.equal(new Set(s.orders.map(o=>o.id)).size,4);
for(let i=0;i<3;i++)assert.equal(submitHarborMarketChoice(state,s,s.orders[s.index].answer).type,'next');
const end=submitHarborMarketChoice(state,s,s.orders[s.index].answer);
assert.equal(end.type,'finished');assert.equal(end.score,4);
assert.equal(end.payout,52);assert.equal(state.money,cash+52);
assert.equal(ensureHarborJobsState(state).market.shifts,1);
assert.equal(state.harborJobs.market.bestScore,4);
assert.equal(submitHarborMarketChoice(state,s,'ice').type,'inactive');
assert.equal(startHarborMarketShift(state).error,'already-worked');
assert.equal(normalizeHarborJobsState(JSON.parse(JSON.stringify(state.harborJobs))).market.lastDay,state.day);
state.day++;
const next=startHarborMarketShift(state,{random:()=>.5});
for(let i=0;i<4;i++){
 const wrong=MARKET_DESTINATIONS.find(d=>d.id!==next.orders[next.index].answer).id;
 submitHarborMarketChoice(state,next,wrong);
}
assert.equal(next.score,0);assert.equal(state.harborJobs.market.shifts,2);
assert.equal(state.harborJobs.market.bestScore,4);
assert.equal(state.harborJobs.market.lastPayout,15);
assert.equal(normalizeHarborJobsState({market:{bestScore:999,shifts:-100}}).market.bestScore,4);
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
assert.match(main,/startHarborMarketShift\(state\)/);
assert.match(main,/submitHarborMarketChoice\(state,harborMarketSession,choice\)/);
assert.match(main,/showHarborMarketPanel\(harborMarketSession/);
assert.match(main,/!!harborMarketSession/);
assert.match(main,/harborAction.kind==='sell'/);
console.log('[harbor-market] real sorting choices, graded wages, daily cooldown, persistence, and UI wiring passed');
