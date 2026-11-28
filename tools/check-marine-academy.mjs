import assert from 'node:assert/strict';
import {defaultState} from '../src/state.js';
import {MARINE_CERTIFICATE_ID,MARINE_LESSON_QUESTIONS,normalizeMarineAcademyState,
 ensureMarineAcademyState,startMarineLesson,answerMarineLesson}
 from '../src/runtime/MarineAcademyLife.js';
import {readFileSync} from 'node:fs';
assert(MARINE_LESSON_QUESTIONS.length>=8);
assert(new Set(MARINE_LESSON_QUESTIONS.map(q=>q.id)).size===MARINE_LESSON_QUESTIONS.length);
for(const q of MARINE_LESSON_QUESTIONS){
 assert.equal(q.choices.length,3);assert(q.answer>=0&&q.answer<=2);
}
const s=defaultState(),startingMoney=s.money;
assert.equal(ensureMarineAcademyState(s).attempts,0);
const lesson=startMarineLesson(s,{random:()=>0});
assert.equal(lesson.questions.length,4);
assert.equal(new Set(lesson.questions.map(q=>q.id)).size,4);
assert.equal(answerMarineLesson(s,lesson,-1).type,'invalid');
for(let i=0;i<3;i++){
 const answer=lesson.questions[lesson.index].answer;
 assert.equal(answerMarineLesson(s,lesson,answer).type,'next');
}
const finished=answerMarineLesson(s,lesson,lesson.questions[lesson.index].answer);
assert.equal(finished.type,'finished');assert(finished.passed&&finished.firstCertificate);
assert.equal(finished.awarded,75);
assert.equal(s.money,startingMoney+75);
assert(s.education.certificates.includes(MARINE_CERTIFICATE_ID));
assert.equal(ensureMarineAcademyState(s).attempts,1);
assert.equal(s.marineAcademy.passes,1);
assert.equal(s.marineAcademy.bestScore,4);
assert.equal(startMarineLesson(s).error,'already-studied');
assert.equal(answerMarineLesson(s,lesson,0).type,'inactive');
assert.equal(normalizeMarineAcademyState(JSON.parse(JSON.stringify(s.marineAcademy))).certified,true);
s.day++;
const repeat=startMarineLesson(s,{random:()=>.5});
for(let i=0;i<4;i++){
 const right=repeat.questions[repeat.index].answer;
 answerMarineLesson(s,repeat,(right+1)%3);
}
assert.equal(s.marineAcademy.attempts,2);
assert.equal(s.marineAcademy.passes,1);
assert.equal(s.money,startingMoney+75,'failed repeat lessons cannot duplicate bonus');
const staleState=defaultState();
const stale=startMarineLesson(staleState,{random:()=>0});
staleState.day++;
const current=startMarineLesson(staleState,{random:()=>0});
for(let i=0;i<4;i++)answerMarineLesson(staleState,current,current.questions[current.index].answer);
const snapshot=JSON.stringify(staleState.marineAcademy),balance=staleState.money,smarts=staleState.stats?.smarts;
let staleResult;
for(let i=0;i<4;i++)staleResult=answerMarineLesson(staleState,stale,stale.questions[stale.index].answer);
assert.equal(staleResult.duplicate,true);
assert.equal(JSON.stringify(staleState.marineAcademy),snapshot,'stale lesson cannot rewind progress');
assert.equal(staleState.money,balance);
assert.equal(staleState.stats?.smarts,smarts);
assert.equal(startMarineLesson(staleState).error,'already-studied');
staleState.day--;
assert.equal(startMarineLesson(staleState).error,'already-studied','clock rollback cannot open an unfinishable lesson');
assert.equal(JSON.stringify(staleState.marineAcademy),snapshot);
staleState.day+=2;
assert.equal(startMarineLesson(staleState).questions.length,4,'study resumes after recorded day');
const saved=defaultState();
saved.education.certificates=[MARINE_CERTIFICATE_ID];
assert(ensureMarineAcademyState(saved).certified,'certificate survives old/migrated progress');
const recovered=defaultState();
recovered.marineAcademy={certified:true};
recovered.education.certificates=[];
const recoveredMoney=recovered.money;
ensureMarineAcademyState(recovered);
ensureMarineAcademyState(recovered);
assert.equal(recovered.education.certificates.filter(id=>id===MARINE_CERTIFICATE_ID).length,1);
assert.equal(recovered.money,recoveredMoney,'migration must not award cash again');
const clean=normalizeMarineAcademyState({attempts:-8,lastScore:500,bestScore:999,lastDay:-4});
assert.equal(clean.attempts,0);assert.equal(clean.bestScore,4);assert.equal(clean.lastDay,null);
const src=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
assert.match(src,/startMarineLesson\(state\)/);
assert.match(src,/answerMarineLesson\(state,marineLessonSession,choice\)/);
assert.match(src,/showMarineAcademyPanel\(marineLessonSession/);
assert.match(src,/!!marineLessonSession/);
assert.match(src,/if\(marineLessonSession\)\{/);
assert.match(src,/chooseMarineAcademyAnswer\(i\)/,'keyboard choices must reach the graded lesson');
assert.match(src,/harborAction\.kind==='academy'/,'Academy prompt must expose the Shift+E class');
const panelSource=readFileSync(new URL('../src/ui/MarineAcademyPanel.js',import.meta.url),'utf8');
assert.match(panelSource,/previousFocus=document\.activeElement/,'opening the lesson must remember prior focus');
assert.match(panelSource,/restore\?\.isConnected/,'closing the lesson must safely restore existing focus');
assert.match(panelSource,/panel\.onkeydown=\(event\)=>/,'the dialog must own its keyboard navigation');
assert.match(panelSource,/event\.key!=='Tab'/,'only Tab should enter the dialog focus-trap branch');
assert.match(panelSource,/first===last\?first\.focus\(\):last\.focus\(\)/,'reverse Tab wraps to the final choice');
assert.match(panelSource,/event\.preventDefault\(\);first\.focus\(\)/,'forward Tab wraps to the first choice');
assert.match(panelSource,/event\.key==='Escape'/,'Escape must cancel the lesson');
assert.match(panelSource,/panel\.querySelector\('button'\)\?\.focus\(\)/,'question choices must receive focus');
console.log('[marine-academy] 8 real water-safety questions, 4 graded attempts, one-time certificate, daily retakes, state migration and live UI wiring passed');

// Migrated/corrupt counters must not report more passes than attempts.
assert.equal(normalizeMarineAcademyState({attempts:2,passes:9}).passes,2);
assert.equal(normalizeMarineAcademyState({attempts:0,passes:3,certified:true}).passes,0);
assert.equal(normalizeMarineAcademyState({attempts:0,passes:3,certified:true}).certified,true);
assert.equal(normalizeMarineAcademyState({attempts:5,passes:3}).passes,3);

// A day rollover without any newer completion must also invalidate the old lesson.
const expiredState=defaultState();
const expired=startMarineLesson(expiredState,{random:()=>0});
expiredState.day++;
const beforeExpired=JSON.stringify(expiredState);
let expiredResult;
for(let i=0;i<4;i++)expiredResult=answerMarineLesson(expiredState,expired,expired.questions[expired.index].answer);
assert.equal(expiredResult.duplicate,true);
assert.equal(expiredResult.awarded,0);
assert.equal(JSON.stringify(expiredState),beforeExpired,'expired lesson cannot change progression');
assert.equal(startMarineLesson(expiredState).questions.length,4);

// A lesson must not corrupt the shared question bank for future players.
const immutableLesson=startMarineLesson(defaultState(),{random:()=>0});
const originalAnswer=immutableLesson.questions[0].answer;
assert.throws(()=>{immutableLesson.questions[0].answer=(originalAnswer+1)%3;},TypeError);
assert.throws(()=>{immutableLesson.questions[0].choices[0]='corrupted';},TypeError);
assert.equal(startMarineLesson(defaultState(),{random:()=>0}).questions[0].answer,originalAnswer);

// Active lesson order and length must remain stable throughout grading.
assert.throws(()=>immutableLesson.questions.pop(),TypeError);
assert.throws(()=>immutableLesson.questions.reverse(),TypeError);
assert.equal(immutableLesson.questions.length,4);
