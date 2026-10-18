// Fishing is deterministic under an injected random source so timing, catches,
// prices and save migration can be tested without the browser or Three.js.
export const FISH_SPECIES=Object.freeze([
  {id:'bluegill',name:'Bluegill',value:12,xp:8,weight:40,difficulty:3},
  {id:'harbor-bass',name:'Harbor Bass',value:24,xp:15,weight:27,difficulty:4},
  {id:'speckled-trout',name:'Speckled Trout',value:38,xp:23,weight:17,difficulty:4},
  {id:'silver-snapper',name:'Silver Snapper',value:65,xp:39,weight:11,difficulty:5},
  {id:'golden-gillyfish',name:'Golden Gillyfish',value:135,xp:85,weight:5,difficulty:6},
]);
const bounded=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
export function ensureFishingState(state) {
 const old=state.fishing||{};
 state.fishing={
   rod:'starter-rod',bait:Math.max(0,Math.floor(Number(old.bait??8)||0)),
   xp:Math.max(0,Math.floor(Number(old.xp)||0)),
   totalCaught:Math.max(0,Math.floor(Number(old.totalCaught)||0)),
   catches:Array.isArray(old.catches)?old.catches.slice(0,120).filter(f=>FISH_SPECIES.some(s=>s.id===f.id)):[],
   ...old,
 };
 state.fishing.rod='starter-rod';
 state.fishing.bait=bounded(Math.floor(Number(state.fishing.bait)||0),0,999);
 state.fishing.catches=state.fishing.catches.slice(0,120);
 return state.fishing;
}
export function fishingLevel(f){return Math.max(1,Math.floor(Math.sqrt((Number(f.xp)||0)/50))+1);}
export function startFishing(state,{random=Math.random,spotId='western-pier'}={}) {
 const fishing=ensureFishingState(state);
 if(fishing.bait<=0)return {error:'no-bait'};
 if(fishing.catches.length>=120)return {error:'full-bag'};
 fishing.bait-=1;
 const pool=FISH_SPECIES.reduce((sum,f)=>sum+f.weight,0);
 let roll=bounded(Number(random())||0,0,0.999999)*pool;
 const species=FISH_SPECIES.find(f=>((roll-=f.weight)<0))||FISH_SPECIES[0];
 return {phase:'waiting',spotId,species,elapsed:0,wait:1.4+bounded(Number(random())||0,0,1)*2.5,
   hooked:0,hookWindow:2.1,reelRemaining:11,reelTaps:0,needed:species.difficulty,
   lastTap:0};
}
export function tickFishing(session,dt){
 if(!session||['caught','escaped'].includes(session.phase))return null;
 const step=bounded(Number(dt)||0,0,0.12);
 session.elapsed+=step;
 if(session.phase==='waiting'&&session.elapsed>=session.wait){
   session.phase='bite';session.hooked=0;return {type:'bite'};
 }
 if(session.phase==='bite'){
   session.hooked+=step;
   if(session.hooked>=session.hookWindow){session.phase='escaped';return {type:'escaped'};}
 }
 if(session.phase==='reeling'){
   session.reelRemaining-=step;
   session.lastTap+=step;
   if(session.reelRemaining<=0){session.phase='escaped';return {type:'escaped'};}
 }
 return null;
}
export function pressFishing(session,state,{random=Math.random}={}){
 if(!session)return {type:'inactive'};
 if(session.phase==='waiting')return {type:'early'};
 if(session.phase==='bite'){session.phase='reeling';session.lastTap=1;return {type:'hooked'};}
 if(session.phase!=='reeling')return {type:'inactive'};
 if(session.lastTap<0.13)return {type:'too-fast'};
 session.lastTap=0;session.reelTaps+=1;
 if(session.reelTaps<session.needed)return {type:'reeling',remaining:session.needed-session.reelTaps};
 const species=session.species;
 const sizeKg=Math.round((0.4+bounded(Number(random())||0,0,1)*3.1)*10)/10;
 const value=Math.round(species.value*(0.7+sizeKg/3.5));
 const fish={id:species.id,name:species.name,value,sizeKg,spotId:session.spotId};
 const fishing=ensureFishingState(state);
 fishing.catches.push(fish);fishing.totalCaught+=1;fishing.xp+=species.xp;
 session.phase='caught';
 return {type:'caught',fish,level:fishingLevel(fishing)};
}
export function sellFishingCatch(state){
 const fishing=ensureFishingState(state);
 const count=fishing.catches.length;
 const earnings=fishing.catches.reduce((sum,fish)=>sum+Math.max(0,Number(fish.value)||0),0);
 state.money=(Number(state.money)||0)+earnings;
 fishing.catches=[];
 return {count,earnings};
}
export function buyFishingBait(state,{quantity=8,cost=16}={}){
 const f=ensureFishingState(state);
 if(state.money<cost)return false;
 state.money-=cost;f.bait=bounded(f.bait+quantity,0,999);return true;
}
