import assert from 'node:assert/strict';
import fs from 'node:fs';
import { starterTownNavigation as navigation } from '../src/runtime/StarterTownNavigation.js';
import { DialogueRuntime } from '../src/runtime/DialogueRuntime.js';
import { questNavigationTargetFor } from '../src/missions.js';

const mainSource = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const minimapSource = fs.readFileSync(new URL('../src/minimap.js', import.meta.url), 'utf8');
const interiorSource = fs.readFileSync(new URL('../src/interiors.js', import.meta.url), 'utf8');
const factoryWorkflow = fs.readFileSync(new URL('../.github/workflows/generate-free-asset-factory.yml', import.meta.url), 'utf8');

const snapshot = navigation.snapshot();
assert.equal(snapshot.roads.routes, 49, 'shared navigation must use all 49 authored roads');
assert.equal(snapshot.graph.components, 1, 'Starter Town road graph must be connected');
assert.equal(snapshot.locations, 13, 'all functional Starter Town locations must be routable');
assert.equal(snapshot.targets, 14, 'sanitation must be a named quest target in addition to functional locations');

const police = navigation.location('police-station');
assert.ok(police, 'police station navigation anchor is missing');
for (const target of navigation.targets.values()) {
  const route = navigation.routePointsToTarget(police.position, target.id, { allowService: true });
  assert.ok(route, `police/service route cannot reach ${target.id}`);
  assert.ok(route.points.length >= 2, `route to ${target.id} needs drawable points`);
  assert.ok(route.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.z)),
    `route to ${target.id} contains invalid coordinates`);
}

const dispatch = navigation.dispatchPoint({ x: 0, z: 0 }, { random: () => 0, preferChance: 0 });
assert.ok(navigation.roadGraph.nearestNode(dispatch).distance < 0.01, 'police dispatch must spawn on a road node');
const follower = navigation.createFollower({ allowService: true });
const pursuit = navigation.follow(follower, police.position, navigation.location('frostbox').position, { now: 1000 });
assert.ok(pursuit.routed && pursuit.remainingWaypoints > 0, 'police follower must receive a multi-node pursuit route');

const objectiveTargets = [
  [{ event: 'enter', arg: 'chicken' }, 'chicken-spot'],
  [{ event: 'talk-int', arg: 'jeweler' }, 'frostbox'],
  [{ event: 'haircut-done' }, 'zaylins-home'],
  [{ event: 'workout-done' }, 'iron-city-gym'],
  [{ event: 'study-done' }, 'zaylins-prep'],
  [{ event: 'job-done' }, 'worktower'],
  [{ event: 'talk-sanitation' }, 'dreamdrop-sanitation-stop'],
  [{ event: 'buy-snack' }, '6twelve'],
  [{ event: 'talk-police-desk' }, 'police-station'],
];
for (const [objective, targetId] of objectiveTargets) {
  assert.equal(questNavigationTargetFor(objective), targetId, `${objective.event} must guide to ${targetId}`);
  assert.ok(navigation.target(targetId), `${targetId} must resolve through shared navigation`);
}

const dialogueState = {
  day: 1,
  wanted: 0,
  stats: { fitness: 20 },
  npcMemory: {},
  storyFlags: {},
  crimeRecord: { convictionsByTown: {} },
};
const dialogueQuests = { active: {}, completed: {}, flags: {} };
const services = [];
const dialogue = new DialogueRuntime({
  state: dialogueState,
  quests: dialogueQuests,
  random: () => 0,
  canOfferQuest: (questId) => questId === 'cleanup-crew',
  actions: { openService: (serviceId) => { services.push(serviceId); return 'keep'; } },
});
for (const npcId of ['coach-rell', 'maya-brooks', 'officer-dane', 'denise-hall', 'malik-frost']) {
  const view = dialogue.begin(npcId);
  assert.ok(view?.name && view.text && view.choices.length >= 3, `${npcId} must render a live branching conversation`);
}
dialogue.view('coach-rell', 'greet').choices.find((choice) => choice.label.includes('train')).onPick();
assert.deepEqual(services, ['gym-training'], 'authored dialogue must reach existing gameplay services');
dialogueState.wanted = 2;
assert.match(dialogue.view('officer-dane', 'greet').text, /active heat/i, 'Officer Dane must react to wanted state');
dialogueState.crimeRecord.convictionsByTown['starter-town'] = 1;
assert.match(dialogue.view('officer-dane', 'greet').text, /academy desk is closed/i,
  'Officer Dane must react to local convictions');

for (const [name, storyId] of [
  ['Malik Frost', 'malik-frost'],
  ['Maya Brooks', 'maya-brooks'],
  ['Coach Rell', 'coach-rell'],
  ['Officer Dane', 'officer-dane'],
]) {
  assert.ok(interiorSource.includes(`name: '${name}', storyId: '${storyId}'`), `${name} is not wired into a live interior`);
}
assert.match(mainSource, /starterTownNavigation\.follow\(u\.navigation/, 'foot police must use shared road routing');
assert.match(mainSource, /starterTownNavigation\.follow\(c\.navigation/, 'police cruisers must use shared road routing');
assert.match(mainSource, /activeQuestGuidance\(\)/, 'live quest state must feed map guidance');
assert.match(minimapSource, /export function setGuidanceRoute/, 'minimap must expose route guidance');
assert.match(minimapSource, /#4ee7ff/, 'minimap must render a visible guidance route');
assert.doesNotMatch(factoryWorkflow, /^\s*schedule\s*:/m, 'empty asset queue must not run on a timer');
assert.doesNotMatch(factoryWorkflow, /^\s*push\s*:/m, 'asset factory must not trigger itself after report commits');
assert.match(factoryWorkflow, /has_work/, 'asset factory needs queue preflight gating');

console.log('Regular gameplay cohesion checks passed:');
console.log(`- ${snapshot.roads.routes} roads / ${snapshot.graph.nodes} nodes / ${snapshot.targets} live targets`);
console.log('- police pursuit + quest guidance share the RoadGraph');
console.log('- 5 canonical Starter Town NPCs render state-aware service dialogue');
console.log('- empty asset-factory queue cannot create recurring no-op commits');
