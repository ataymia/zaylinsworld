// Paid seafood-handling shift with real decisions, wages and saved progression.
export const MARKET_DESTINATIONS=Object.freeze([
 {id:'ice',label:'Cold storage'},
 {id:'counter',label:'Customer counter'},
 {id:'inspect',label:'Safety inspection'},
]);
export const MARKET_ORDERS=Object.freeze([
 {text:'Fresh snapper. The paying customer is at pickup.',answer:'counter'},
 {text:'Sealed trout delivery. The market opens in one hour.',answer:'ice'},
 {text:'Broken crate seal with an unknown storage temperature.',answer:'inspect'},
 {text:'Fresh bluegill has been paid for at the counter.',answer:'counter'},
 {text:'Unlabeled fish with an unusual smell.',answer:'inspect'},
 {text:'Chilled bass delivery. Customer pickup is later.',answer:'ice'},
 {text:'Cracked ice chest holding lukewarm fish.',answer:'inspect'},
 {text:'Verified and chilled seafood takeout order.',answer:'counter'},
]);
const nonnegative=v=>Math.max(0,Math.floor(Number.isFinite(Number(v))?Number(v):0));
export function normalizeHarborJobsState(source={}){
 const entry=source&&typeof source==='object'&&source.market&&typeof source.market==='object'?source.market:{};
 return {market:{
  shifts:nonnegative(entry.shifts),totalEarnings:nonnegative(entry.totalEarnings),
  lastScore:Math.min(4,nonnegative(entry.lastScore)),
  bestScore:Math.min(4,nonnegative(entry.bestScore)),
  lastPayout:nonnegative(entry.lastPayout),
  bestQuality:Math.min(100,nonnegative(entry.bestQuality)),
  lastQuality:Math.min(100,nonnegative(entry.lastQuality)),
  lastDay:Number.isInteger(entry.lastDay)&&entry.lastDay>=1?entry.lastDay:null,
 }};
}
export function ensureHarborJobsState(state){
 state.harborJobs=normalizeHarborJobsState(state.harborJobs);
 return state.harborJobs;
}
export function startHarborMarketShift(state,{random=Math.random}={}){
 const market=ensureHarborJobsState(state).market;
 const day=Math.max(1,nonnegative(state.day));
 if(market.lastDay===day)return {error:'already-worked'};
 const orders=MARKET_ORDERS.map((order,i)=>({...order,id:i}));
 for(let i=orders.length-1;i>0;i--){
  const value=Number(random()),roll=Number.isFinite(value)?Math.max(0,Math.min(.999999,value)):0;
  const j=Math.floor(roll*(i+1));[orders[i],orders[j]]=[orders[j],orders[i]];
 }
 return {day,orders:orders.slice(0,4),index:0,score:0,finished:false,
   tempC:11,orderTime:19,quality:0,cooledSeconds:0,overChilled:false,expired:0};
}
// A physical cold-chain simulation: players must manage the crate's temperature
// while the dispatch clock runs and then deliver it to the correct station.
// A multiple-choice answer without the required preparation cannot earn wages.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const SAFE_MARKET_TEMPERATURE=Object.freeze({min:1,max:4});
export function tickHarborMarketShift(state,session,dt,{cooling=false}={}){
 if(!session||session.finished)return {type:'inactive'};
 const step=clamp(Number.isFinite(Number(dt))?Number(dt):0,0,.12);
 session.orderTime=Math.max(0,session.orderTime-step);
 if(cooling){
   session.tempC=clamp(session.tempC-4.7*step,.1,18);
   session.cooledSeconds+=step;
 }else{
   session.tempC=clamp(session.tempC+.4*step,.1,18);
 }
 if(session.tempC<SAFE_MARKET_TEMPERATURE.min)session.overChilled=true;
 if(session.orderTime<=0){
   session.expired++;
   return submitHarborMarketChoice(state,session,'expired',{timeout:true});
 }
 return {type:'running',tempC:session.tempC,timeLeft:session.orderTime};
}
export function submitHarborMarketChoice(state,session,choice,{timeout=false}={}){
 if(!session||session.finished)return {type:'inactive'};
 if(!timeout&&!MARKET_DESTINATIONS.some(s=>s.id===choice))return {type:'invalid'};
 const order=session.orders[session.index];
 if(!order)return {type:'invalid'};
 const inRange=session.tempC>=SAFE_MARKET_TEMPERATURE.min
   && session.tempC<=SAFE_MARKET_TEMPERATURE.max;
 // Inspection crates should bypass cold storage: preserve their safety evidence.
 // For a legitimate pickup/storage order, moving a hot or frozen crate without
 // cooling and checking the thermometer is an actual mechanical failure.
 if(!timeout && order.answer!=='inspect' && choice!=='inspect' && !inRange){
   return {type:'unprepared',tempC:session.tempC};
 }
 const correct=!timeout && choice===order.answer && (order.answer==='inspect'||inRange);
 if(correct){
   session.score++;
   if(session.orderTime>=10)session.quality+=2;
   if(order.answer!=='inspect'&&session.tempC>=1.5&&session.tempC<=3.5)
     session.quality+=2;
 }
 const remaining=session.orderTime;
 session.index++;
 if(session.index<session.orders.length){
   session.tempC=11+session.index%3*1.4;
   session.orderTime=19;
   session.cooledSeconds=0;
   session.overChilled=false;
   return {type:'next',correct,score:session.score,timeout,remaining};
 }
 session.finished=true;
 const market=ensureHarborJobsState(state).market;
 if(market.lastDay===session.day)return {type:'finished',score:session.score,payout:0,duplicate:true};
 const tip=Math.round(session.quality*1.5);
 const payout=15+session.score*8+(session.score===4?5:0)+tip;
 market.shifts++;market.totalEarnings+=payout;
 market.lastScore=session.score;market.bestScore=Math.max(market.bestScore,session.score);
 market.lastQuality=session.quality;market.bestQuality=Math.max(market.bestQuality,session.quality);
 market.lastPayout=payout;market.lastDay=session.day;
 state.money=(Number(state.money)||0)+payout;
 if(state.stats){
  state.stats.energy=Math.max(0,(state.stats.energy||0)-7);
  state.stats.hygiene=Math.max(0,(state.stats.hygiene||0)-4);
  state.stats.smarts=Math.min(100,(state.stats.smarts||0)+1);
 }
 return {type:'finished',score:session.score,payout,tip,duplicate:false,timeout,quality:session.quality};
}
