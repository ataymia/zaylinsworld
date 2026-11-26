// Maritime Academy's teachable, repeatable marine-safety course.
// Pure gameplay state: no DOM or Three.js, so save and grading rules are testable.
export const MARINE_CERTIFICATE_ID='fishing-harbor-maritime-safety';
export const MARINE_LESSON_QUESTIONS=Object.freeze([
 {id:'wake',prompt:'You are leaving a busy marina. What should you do?',choices:['Speed up beside the docks','Observe the no-wake zone','Race incoming workboats'],answer:1,topic:'Slow speed protects nearby boats, piers, and swimmers.'},
 {id:'channel',prompt:'A larger working boat approaches in the marked commercial channel. Best move?',choices:['Stay clear and give it room','Stop across the channel','Cut directly across its bow'],answer:0,topic:'Commercial boats need adequate room to turn and stop.'},
 {id:'jacket',prompt:'Before a boat leaves the dock, what safety equipment matters most?',choices:['Extra loud music','A fishing trophy','Properly fitted life jackets'],answer:2,topic:'Wear a properly fitted life jacket.'},
 {id:'weather',prompt:'Dark storm clouds appear while you are on the water. What is safest?',choices:['Head for a safe harbor early','Go farther offshore','Ignore the changing weather'],answer:0,topic:'Return to shelter when weather deteriorates.'},
 {id:'fuel',prompt:'The fuel gauge is getting low. What should your crew do?',choices:['Disable navigation lights','Plan a safe fuel stop','Keep going until the engine stops'],answer:1,topic:'Leave enough reserve fuel to reach a safe dock.'},
 {id:'water',prompt:'Which route is safer when entering shallow, unfamiliar water?',choices:['Leave the marked channel','Follow marked navigation channels','Drive directly toward rocks'],answer:1,topic:'Waterway marks identify safer navigable routes.'},
 {id:'wildlife',prompt:'A protected wildlife zone is marked beside the channel. What do you do?',choices:['Keep a respectful distance','Chase the animals','Anchor on the nest site'],answer:0,topic:'Protected wildlife and habitats must not be disturbed.'},
 {id:'distress',prompt:'Another boat signals that its engine failed. What is the best first step?',choices:['Approach without looking','Ignore it and accelerate','Alert Harbor Patrol and assist safely'],answer:2,topic:'Call for help and assist without endangering your own crew.'},
]);
const integer=value=>Math.max(0,Math.floor(Number.isFinite(Number(value))?Number(value):0));
export function normalizeMarineAcademyState(value={}){
 const input=value&&typeof value==='object'?value:{};
 return {
  attempts:integer(input.attempts),passes:integer(input.passes),
  lastScore:Math.min(4,integer(input.lastScore)),
  bestScore:Math.min(4,integer(input.bestScore)),
  lastDay:Number.isInteger(input.lastDay)&&input.lastDay>=1?input.lastDay:null,
  certified:input.certified===true,
 };
}
export function ensureMarineAcademyState(state){
 state.marineAcademy=normalizeMarineAcademyState(state.marineAcademy);
 if(!state.education||typeof state.education!=='object')state.education={certificates:[]};
 if(!Array.isArray(state.education.certificates))state.education.certificates=[];
 if(state.education.certificates.includes(MARINE_CERTIFICATE_ID))
   state.marineAcademy.certified=true;
 return state.marineAcademy;
}
export function startMarineLesson(state,{random=Math.random}={}){
 const progress=ensureMarineAcademyState(state);
 const day=Math.max(1,integer(state.day));
 if(progress.lastDay!==null&&progress.lastDay>=day)return {error:'already-studied'};
 const questions=MARINE_LESSON_QUESTIONS.map(question=>question);
 for(let i=questions.length-1;i>0;i--){
  const sample=Number(random());
  const safe=Number.isFinite(sample)?Math.max(0,Math.min(.999999,sample)):0;
  const j=Math.floor(safe*(i+1));
  [questions[i],questions[j]]=[questions[j],questions[i]];
 }
 return {day,questions:questions.slice(0,4),index:0,score:0,done:false};
}
export function answerMarineLesson(state,session,choice){
 if(!session||session.done)return {type:'inactive'};
 if(!Number.isInteger(choice)||choice<0||choice>2)return {type:'invalid'};
 const q=session.questions[session.index];
 if(!q)return {type:'invalid'};
 const correct=choice===q.answer;
 if(correct)session.score++;
 session.index++;
 if(session.index<session.questions.length)
  return {type:'next',correct,explanation:q.topic,score:session.score};
 session.done=true;
 const record=ensureMarineAcademyState(state);
 // Reject stale sessions as well as same-day duplicates; never rewind the daily lockout.
 if(record.lastDay!==null&&record.lastDay>=session.day)
  return {type:'finished',passed:false,score:session.score,awarded:0,duplicate:true};
 record.attempts++;
 record.lastDay=session.day;
 record.lastScore=session.score;
 record.bestScore=Math.max(record.bestScore,session.score);
 const passed=session.score>=3;
 let awarded=0,firstCertificate=false;
 if(passed){
  record.passes++;
  if(!record.certified){
   record.certified=true;firstCertificate=true;awarded=75;
   state.education.certificates.push(MARINE_CERTIFICATE_ID);
   state.money=(Number(state.money)||0)+awarded;
  }
  if(state.stats){
   state.stats.smarts=Math.min(100,(state.stats.smarts||0)+5);
  }
 }
 return {type:'finished',passed,score:session.score,awarded,firstCertificate,
   explanation:q.topic,duplicate:false};
}
