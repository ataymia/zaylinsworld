// Marina Buoy Run: deterministic water course, progression, rewards and save rules.
import {canDockBoat,boatObstructed,HARBOR_BOAT_DOCK,HARBOR_WATER_BOUNDS} from './HarborBoatLife.js';
import {MARINE_CERTIFICATE_ID} from './MarineAcademyLife.js';
export const BUOY_RACE_TIME_LIMIT=240;
export const BUOY_RACE_CHECKPOINTS=Object.freeze([
 {id:'outbound',name:'Outbound marker',x:800,z:-2920,radius:34},
 {id:'east',name:'East channel',x:900,z:-3145,radius:34},
 {id:'outer',name:'Outer water',x:735,z:-3350,radius:34},
 {id:'west',name:'West crossing',x:400,z:-3260,radius:34},
 {id:'return',name:'Return channel',x:570,z:-3030,radius:34},
 {id:'finish',name:'Marina finish',x:HARBOR_BOAT_DOCK.x,z:HARBOR_BOAT_DOCK.z,radius:40},
].map(c=>Object.freeze(c)));
const count=v=>Math.max(0,Math.floor(Number.isFinite(Number(v))?Number(v):0));
export function normalizeHarborRaceRecord(value={}){
 const r=value&&typeof value==='object'?value:{},best=Number(r.bestSeconds);
 return {
  attempts:count(r.attempts),completions:count(r.completions),
  bestSeconds:Number.isFinite(best)&&best>0?Math.round(Math.min(BUOY_RACE_TIME_LIMIT,best)*10)/10:null,
  totalEarnings:count(r.totalEarnings),
  lastPaidDay:Number.isInteger(r.lastPaidDay)&&r.lastPaidDay>=1?r.lastPaidDay:null,
 };
}
export function ensureHarborRaceRecord(state){
 state.harborRace=normalizeHarborRaceRecord(state.harborRace);return state.harborRace;
}
export function validBuoyRaceCourse(){
 return BUOY_RACE_CHECKPOINTS.every(c=>c.x>=HARBOR_WATER_BOUNDS.minX&&c.x<=HARBOR_WATER_BOUNDS.maxX
  &&c.z>=HARBOR_WATER_BOUNDS.minZ&&c.z<=HARBOR_WATER_BOUNDS.maxZ&&!boatObstructed(c));
}
export function beginBuoyRace(state){
 const b=state.boating;
 if(!b?.riding)return {error:'not-aboard'};
 if(!canDockBoat(b))return {error:'start-at-marina'};
 if(b.fuel<3||b.hull<15)return {error:'service-required'};
 ensureHarborRaceRecord(state);
 return {index:0,seconds:0,day:Math.max(1,count(state.day)),finished:false};
}
export function abortBuoyRace(session){
 if(!session||session.finished)return {type:'inactive'};
 session.finished=true;return {type:'aborted'};
}
function finalizeRace(state,session,completed){
 session.finished=true;const r=ensureHarborRaceRecord(state);r.attempts++;
 if(!completed)return {type:'timeout',payout:0,seconds:BUOY_RACE_TIME_LIMIT};
 r.completions++;
 const seconds=Math.round(session.seconds*10)/10;
 r.bestSeconds=r.bestSeconds===null?seconds:Math.min(r.bestSeconds,seconds);
 const paid=r.lastPaidDay!==session.day;
 const academy=state.education?.certificates?.includes(MARINE_CERTIFICATE_ID)===true;
 const payout=paid?50+Math.max(0,Math.ceil((BUOY_RACE_TIME_LIMIT-seconds)/20))*3+(academy?25:0):0;
 if(paid){
  r.lastPaidDay=session.day;r.totalEarnings+=payout;state.money=(Number(state.money)||0)+payout;
 }
 if(state.stats)state.stats.fun=Math.min(100,(state.stats.fun||0)+6);
 return {type:'finished',payout,seconds,academy,bestSeconds:r.bestSeconds};
}
export function tickBuoyRace(state,session,dt,position=state.boating){
 if(!session||session.finished)return {type:'inactive'};
 if(!state.boating?.riding)return abortBuoyRace(session);
 const step=Number(dt);
 session.seconds+=Number.isFinite(step)?Math.max(0,Math.min(.05,step)):0;
 if(session.seconds>BUOY_RACE_TIME_LIMIT){
  session.seconds=BUOY_RACE_TIME_LIMIT;return finalizeRace(state,session,false);
 }
 const mark=BUOY_RACE_CHECKPOINTS[session.index];
 if(!mark)return {type:'invalid'};
 if(!position||!Number.isFinite(position.x)||!Number.isFinite(position.z)||Math.hypot(position.x-mark.x,position.z-mark.z)>mark.radius)
  return {type:'running'};
 session.index++;
 if(session.index<BUOY_RACE_CHECKPOINTS.length)
  return {type:'checkpoint',number:session.index,next:BUOY_RACE_CHECKPOINTS[session.index].name};
 return finalizeRace(state,session,true);
}
