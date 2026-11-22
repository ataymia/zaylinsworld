// Fishing is deterministic under an injected random source so timing, catches,
// prices and save migration can be tested without the browser or Three.js.
export const FISH_SPECIES=Object.freeze([
  {id:'bluegill',name:'Bluegill',value:12,xp:8,weight:40,difficulty:3},
  {id:'harbor-bass',name:'Harbor Bass',value:24,xp:15,weight:27,difficulty:4},
  {id:'speckled-trout',name:'Speckled Trout',value:38,xp:23,weight:17,difficulty:4},
  {id:'silver-snapper',name:'Silver Snapper',value:65,xp:39,weight:11,difficulty:5},
  {id:'golden-gillyfish',name:'Golden Gillyfish',value:135,xp:85,weight:5,difficulty:6},
]);
// Shore-specific catch tables make the water distinct without disrupting old saves.
// Beginner docks are public; East Pier holds the permit-gated rare catches.
export const FISHING_SPOT_CATCH_WEIGHTS=Object.freeze({
 'western-pier':Object.freeze({'bluegill':68,'harbor-bass':25,'speckled-trout':7}),
 'central-pier':Object.freeze({'bluegill':30,'harbor-bass':38,'speckled-trout':24,'silver-snapper':8}),
 'eastern-pier':Object.freeze({'bluegill':10,'harbor-bass':17,'speckled-trout':30,'silver-snapper':38,'golden-gillyfish':5}),
});
const bounded=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
export function ensureFishingState(state) {
 const old=state.fishing && typeof state.fishing==='object'?state.fishing:{};
 // Keep extension fields from old saves, then validate all canonical fields.
 state.fishing={
   ...old,
   rod:old.rod==='composite-rod'?'composite-rod':'starter-rod',
   bait:bounded(Math.floor(Number(old.bait??8)||0),0,999),
   xp:Math.max(0,Math.floor(Number(old.xp)||0)),
   totalCaught:Math.max(0,Math.floor(Number(old.totalCaught)||0)),
   catches:(Array.isArray(old.catches)?old.catches:[]).slice(0,120)
     .filter(f=>f && FISH_SPECIES.some(s=>s.id===f.id)),
   permit:old.permit===true,
   masterRewards:Math.max(0,Math.floor(Number(old.masterRewards)||0)),
 };
 return state.fishing;
}
export function fishingLevel(f){return Math.max(1,Math.floor(Math.sqrt((Number(f.xp)||0)/50))+1);}
export function startFishing(state,{random=Math.random,spotId='western-pier'}={}) {
 const fishing=ensureFishingState(state);
 const weights=FISHING_SPOT_CATCH_WEIGHTS[spotId];
 if(!weights)return {error:'unknown-spot'};
 if(spotId==='eastern-pier' && !fishing.permit)return {error:'permit-required'};
 if(fishing.bait<=0)return {error:'no-bait'};
 if(fishing.catches.length>=120)return {error:'full-bag'};
 fishing.bait-=1;
 const pool=FISH_SPECIES.reduce((sum,f)=>sum+(weights[f.id]||0),0);
 let roll=bounded(Number(random())||0,0,0.999999)*pool;
 const species=FISH_SPECIES.find(f=>((roll-=(weights[f.id]||0))<0))||FISH_SPECIES[0];
 return {phase:'waiting',spotId,species,elapsed:0,wait:1.4+bounded(Number(random())||0,0,1)*2.5,
   hooked:0,hookWindow:fishing.rod==='composite-rod'?3:2.1,
   reelRemaining:24+species.difficulty*1.65,progress:0,tension:18,
   rodX:0,fishX:0,swimTime:0,swimSeed:bounded(Number(random())||0,0,1)*Math.PI*2,
   peakTension:18,precision:0,reelSeconds:0,releaseSeconds:0,escapedReason:null};
}
// Fish move independently across the water. The player must aim the rod at the
// moving fish AND decide when to hold/release the reel to manage line tension.
// No number of spacebar taps alone can land a fish.
export function tickFishing(session,dt,input={}){
 if(!session||['claimed','landed','escaped'].includes(session.phase))return null;
 const step=bounded(Number(dt)||0,0,.12);
 session.elapsed+=step;
 if(session.phase==='waiting'&&session.elapsed>=session.wait){
   session.phase='bite';session.hooked=0;return {type:'bite'};
 }
 if(session.phase==='bite'){
   session.hooked+=step;
   if(session.hooked>=session.hookWindow){
     session.phase='escaped';session.escapedReason='missed hook';return {type:'escaped',reason:session.escapedReason};
   }
 }
 if(session.phase!=='reeling')return null;
 session.reelRemaining=Math.max(0,session.reelRemaining-step);
 session.swimTime+=step;
 const difficulty=session.species.difficulty;
 const wave=session.swimTime*(.68+difficulty*.105);
 // Two overlapping swimming patterns avoid static one-direction target movement.
 session.fishX=bounded(Math.sin(wave+session.swimSeed)*.6+
   Math.sin(wave*2.13+session.swimSeed*.7)*.28,-.91,.91);
 session.rodX=bounded(Number.isFinite(Number(input.rodX))?Number(input.rodX):session.rodX,-1,1);
 const offset=Math.abs(session.rodX-session.fishX);
 const aligned=offset<.48;
 const pulling=input.reel===true;
 if(pulling){
   session.reelSeconds+=step;
   // Wrong angle pulls on the line and increases snap risk dramatically.
   session.tension=bounded(session.tension+(15+difficulty*1.35+offset*65)*step,0,110);
   if(aligned&&session.tension<94){
     session.progress=bounded(session.progress+
       (24-difficulty*1.35)*(1-offset*.62)*step,0,100);
     session.precision+=step;
   }else if(!aligned){
     session.progress=Math.max(0,session.progress-2.3*step);
   }
 }else{
   session.releaseSeconds+=step;
   session.tension=Math.max(4,session.tension-(26+(aligned?8:0))*step);
   session.progress=Math.max(0,session.progress-1.2*step);
 }
 session.peakTension=Math.max(session.peakTension,session.tension);
 if(session.tension>=100){
   session.phase='escaped';session.escapedReason='line snapped';
   return {type:'escaped',reason:session.escapedReason};
 }
 if(session.progress>=100){
   session.phase='landed';return {type:'landed'};
 }
 if(session.reelRemaining<=0){
   session.phase='escaped';session.escapedReason='fish escaped';
   return {type:'escaped',reason:session.escapedReason};
 }
 return {type:'fighting',aligned,tension:session.tension,progress:session.progress};
}
export function pressFishing(session){
 if(!session)return {type:'inactive'};
 if(session.phase==='waiting')return {type:'early'};
 if(session.phase==='bite'){
   session.phase='reeling';session.tension=18;session.progress=0;
   return {type:'hooked'};
 }
 return {type:'in-progress'};
}
// Awards are triggered ONLY after the skill loop reaches the landing goal.
// Claim-once guard prevents repeated input from duplicating rare fish/rewards.
export function landFishingCatch(session,state,{random=Math.random}={}){
 if(!session||session.phase!=='landed')return {type:'inactive'};
 const species=session.species;
 const sizeKg=Math.round((.4+bounded(Number(random())||0,0,1)*3.1)*10)/10;
 const quality=session.peakTension<72&&session.precision>4?'clean':
   session.peakTension<93?'steady':'rough';
 const multiplier=quality==='clean'?1.15:quality==='rough'?.9:1;
 const fishing=ensureFishingState(state);
 if(fishing.catches.length>=120)return {type:'full-bag'};
 const value=Math.round(species.value*(.7+sizeKg/3.5)*
   (fishing.rod==='composite-rod'?1.2:1)*multiplier);
 const fish={id:species.id,name:species.name,value,sizeKg,spotId:session.spotId,quality};
 fishing.catches.push(fish);fishing.totalCaught+=1;fishing.xp+=species.xp;
 session.phase='claimed';
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
