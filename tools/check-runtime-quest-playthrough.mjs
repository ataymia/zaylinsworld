import assert from 'node:assert/strict';
import fs from 'node:fs';
import { defaultState } from '../src/state.js';
import { QUEST_CATALOG, QUEST_IMPLEMENTATION } from '../src/config/questCatalog.js';
import {
  acceptQuest,
  getQuestSnapshot,
  initMissions,
  missionEvent,
} from '../src/missions.js';

const notifications = [];
let saves = 0;
const state = defaultState();
initMissions({
  state,
  headless: true,
  notify: (message) => notifications.push(message),
  saveNow: () => { saves += 1; },
});

const emit = (event, arg, count = 1) => {
  for (let index = 0; index < count; index++) missionEvent(event, arg);
};
const accept = (id) => assert.equal(acceptQuest(id), true, `${id} must be available from its real prerequisite state`);
const complete = (id) => assert.ok(getQuestSnapshot().completed[id], `${id} did not complete`);

emit('talk-city');
complete('welcome-to-dreamdrop');
emit('study-done');
complete('first-day-your-way');
assert.equal(state.wanted, 0, 'the legal first-day path must not require a wanted level');

accept('chicken-run');
emit('enter', 'chicken'); emit('talk-int', 'cashier'); emit('buy-chicken'); emit('eat-done');

accept('frostbox-first-look');
emit('enter', 'frostbox'); emit('talk-int', 'jeweler'); emit('gem');

accept('home-base'); emit('enter', 'home');
accept('home-haircut'); emit('haircut-done');

accept('gym-intro'); emit('enter', 'gym'); emit('workout-done');
accept('school-intro'); emit('enter', 'school'); emit('study-done');

accept('first-job'); emit('enter', 'office'); emit('job-done');
accept('worktower-three-shift-test'); emit('job-done', undefined, 3);

accept('cleanup-crew'); emit('talk-sanitation'); emit('trash-done');
accept('dealership-tour'); emit('enter', 'dealership'); emit('talk-int', 'dealer'); emit('enter-car');
emit('drive-checkpoint'); emit('exit-car');

accept('snack-stop'); emit('buy-snack'); emit('buy-drink');
accept('police-orientation'); emit('talk-police-desk'); emit('police-cells');
accept('gem-hunter'); emit('gem', undefined, 5);
accept('daily-life'); emit('buy-snack'); emit('buy-drink'); emit('haircut-done');
accept('well-rounded'); emit('study-done'); emit('workout-done'); emit('gem');

// Crime remains opt-in: these quests are only exercised after explicit acceptance.
assert.ok(!getQuestSnapshot().active['street-trouble'] && !getQuestSnapshot().active['risky-choice']);
accept('street-trouble'); emit('fight');
accept('risky-choice'); emit('rob-done');
emit('lost-cops');
accept('clean-up-your-name'); emit('talk-police-desk');

const runtimeQuests = QUEST_CATALOG.filter((quest) => quest.implementation === QUEST_IMPLEMENTATION.runtime);
const snapshot = getQuestSnapshot();
assert.equal(runtimeQuests.length, 22);
assert.equal(Object.keys(snapshot.completed).length, runtimeQuests.length);
assert.deepEqual(Object.keys(snapshot.active), []);
assert.ok(saves > runtimeQuests.length, 'quest transitions must request persistence');

const mainSource = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const runtimeEvents = new Set(runtimeQuests.flatMap((quest) => quest.objectives.map((objective) => objective.event)));
for (const event of runtimeEvents) {
  assert.ok(mainSource.includes(`missionEvent('${event}'`), `runtime has no gameplay producer for quest event ${event}`);
}

console.log('Runtime quest playthrough passed:');
console.log(`- ${runtimeQuests.length}/${runtimeQuests.length} quests completed from real prerequisites`);
console.log(`- ${runtimeEvents.size} objective event types have shipped gameplay producers`);
console.log('- the first-day route stays legal; crime quests remain explicitly opt-in');

