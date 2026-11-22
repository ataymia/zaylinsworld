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
 return {day,orders:orders.slice(0,4),index:0,score:0,finished:false};
}
export function submitHarborMarketChoice(state,session,choice){
 if(!session||session.finished)return {type:'inactive'};
 if(!MARKET_DESTINATIONS.some(s=>s.id===choice))return {type:'invalid'};
 const order=session.orders[session.index];
 if(!order)return {type:'invalid'};
 const correct=choice===order.answer;
 session.score+=correct?1:0;session.index++;
 if(session.index<session.orders.length)return {type:'next',correct,score:session.score};
 session.finished=true;
 const market=ensureHarborJobsState(state).market;
 if(market.lastDay===session.day)return {type:'finished',score:session.score,payout:0,duplicate:true};
 const payout=15+session.score*8+(session.score===4?5:0);
 market.shifts++;market.totalEarnings+=payout;
 market.lastScore=session.score;market.bestScore=Math.max(market.bestScore,session.score);
 market.lastPayout=payout;market.lastDay=session.day;
 state.money=(Number(state.money)||0)+payout;
 if(state.stats){
  state.stats.energy=Math.max(0,(state.stats.energy||0)-7);
  state.stats.hygiene=Math.max(0,(state.stats.hygiene||0)-4);
  state.stats.smarts=Math.min(100,(state.stats.smarts||0)+1);
 }
 return {type:'finished',score:session.score,payout,duplicate:false};
}
