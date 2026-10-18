// Rich Hills repeatable jobs and timing activities. Pure deterministic gameplay,
// no renderer or browser dependency. Saved state remains optional for old saves.
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
export function ensureRichHills(state){
 const old=state.richHills||{};
 state.richHills={
  golfRounds:Math.max(0,Math.floor(Number(old.golfRounds)||0)),
  golfBest:Math.max(0,Math.floor(Number(old.golfBest)||0)),
  golfXp:Math.max(0,Math.floor(Number(old.golfXp)||0)),
  valetRuns:Math.max(0,Math.floor(Number(old.valetRuns)||0)),
  deliveries:Math.max(0,Math.floor(Number(old.deliveries)||0)),
  financeLessons:Math.max(0,Math.floor(Number(old.financeLessons)||0)),
  tourVisits:Math.max(0,Math.floor(Number(old.tourVisits)||0)),
  activeJob:old.activeJob&&['valet','delivery'].includes(old.activeJob.kind)?{
   kind:old.activeJob.kind,startedAt:Number(old.activeJob.startedAt)||0,
   elapsed:Math.max(0,Number(old.activeJob.elapsed)||0,
  }:null,
 };
 return state.richHills;
}
export const GOLF_ROUND_TIME=9;
export function startGolf(state){
 const rich=ensureRichHills(state);
 if(rich.activeJob)return {error:'job-active'};
 return {phase:'aiming',elapsed:0,seconds:GOLF_ROUND_TIME,target:0.72};
}
export function golfMeter(session,dt){
 if(!session||session.phase!=='aiming')return 0;
 session.elapsed+=clamp(Number(dt)||0,0,0.12);
 if(session.elapsed>=session.seconds){session.phase='missed';return 0;}
 return (1+Math.sin(session.elapsed*4.6-Math.PI/2))/2;
}
export function swingGolf(session,state){
 if(!session||session.phase!=='aiming')return {type:'inactive'};
 const meter=(1+Math.sin(session.elapsed*4.6-Math.PI/2))/2;
 const deviation=Math.abs(meter-session.target);
 const score=deviation<0.07?100:deviation<0.16?75:deviation<0.28?50:20;
 const earned=Math.round(score*0.22);
 const rich=ensureRichHills(state);
 rich.golfRounds++;rich.golfBest=Math.max(rich.golfBest,score);rich.golfXp+=score;
 state.money=(Number(state.money)||0)+earned;
 session.phase='finished';
 return {type:'golf-shot',score,earned,meter,round:rich.golfRounds};
}
export function startRichJob(state,kind){
 if(!['valet','delivery'].includes(kind))return {error:'invalid'};
 const rich=ensureRichHills(state);
 if(rich.activeJob)return {error:'job-active',job:rich.activeJob.kind};
 rich.activeJob={kind,elapsed:0,startedAt:Date.now()};
 return {type:'started',kind};
}
export function tickRichJob(state,dt){
 const rich=ensureRichHills(state);
 if(rich.activeJob)rich.activeJob.elapsed+=clamp(Number(dt)||0,0,0.12);
}
export function completeRichJob(state,kind,{position,carPosition,inCar=false}={}){
 const rich=ensureRichHills(state);
 if(!rich.activeJob||rich.activeJob.kind!==kind)return {error:'no-job'};
 const target=kind==='valet'?{x:4935,z:-430}:{x:5850,z:-640};
 const observer=kind==='valet'?carPosition:position;
 if(!observer || Math.hypot(observer.x-target.x,observer.z-target.z)>32)
  return {error:'far',target};
 if(kind==='valet'&&!inCar)return {error:'need-car'};
 const seconds=rich.activeJob.elapsed;
 // Distance, not an arbitrary button mash. Completing a legal route earns wages.
 const base=kind==='valet'?75:95;
 const bonus=seconds<100?25:0;
 const pay=base+bonus;
 state.money=(Number(state.money)||0)+pay;
 if(kind==='valet')rich.valetRuns++;else rich.deliveries++;
 rich.activeJob=null;
 return {type:'completed',kind,pay,seconds:Math.round(seconds)};
}
export const FINANCE_QUESTIONS=Object.freeze([
 {text:'A home costs 1,000 DreamBucks. A 20% deposit is...',options:[100,200,400],correct:1},
 {text:'Your weekly pay is 500 and spending is 320. You save...',options:[180,820,120],correct:0},
 {text:'A 250 DreamBuck bill gets a 10% discount. You pay...',options:[225,240,200],correct:0},
]);
export function startFinanceQuiz(state){
 const rich=ensureRichHills(state);
 return {phase:'question',question:rich.financeLessons%FINANCE_QUESTIONS.length};
}
export function answerFinanceQuiz(state,session,index){
 if(session?.phase!=='question')return {error:'inactive'};
 const quiz=FINANCE_QUESTIONS[session.question];
 const correct=Number(index)===quiz.correct;
 const rich=ensureRichHills(state);
 if(correct){rich.financeLessons++;state.money=(Number(state.money)||0)+20;}
 session.phase='complete';
 return {type:'answered',correct,earned:correct?20:0,answer:quiz.options[quiz.correct]};
}
export function scenicTour(state){
 const rich=ensureRichHills(state);rich.tourVisits++;
 // Exploration stamp, not repeatable infinite cash.
 return {type:'tour',visits:rich.tourVisits};
}
