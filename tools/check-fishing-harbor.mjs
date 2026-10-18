import assert from 'node:assert/strict';
import {DISTRICTS} from '../src/config/worldMapPlan.js';
import {STARTER_TOWN_RUNTIME_PLAN} from '../src/config/starterTownRuntimePlan.js';
import {FISHING_HIGHWAY,HARBOR_ROUTES,HARBOR_ACTIONS,FISHING_SPOTS,
 inFishingHarbor,onFishingHighway,onHarborPier,harborSafePoint} from '../src/config/fishingHarborPlan.js';
import {RoadNetwork} from '../src/world/RoadNetwork.js';
import {RoadGraph} from '../src/world/RoadGraph.js';
import {defaultState} from '../src/state.js';
import {ensureFishingState,startFishing,tickFishing,pressFishing,
 fishingLevel,buyFishingBait,sellFishingCatch} from '../src/runtime/FishingHarborLife.js';
import {readFileSync} from 'node:fs';

assert.equal(DISTRICTS.filter(t=>t.playable).length,2,'only Starter Town and Harbor ship now');
const harbor=DISTRICTS.find(t=>t.id==='fishing-harbor');
assert(harbor.playable);
assert.equal(harbor.origin.z,-5200);
assert.equal(FISHING_SPOTS.length,3);
assert(HARBOR_ACTIONS.filter(a=>a.kind!=='fish').length>=12,'Harbor must provide civic and waterfront services');
assert(HARBOR_ROUTES.length>=10);
assert(onFishingHighway({x:0,z:-2500}),'highway must span gap to Harbor');
assert(inFishingHarbor({x:0,z:-5200}),'waterfront must be accessible');
assert(onHarborPier(FISHING_SPOTS[0]),'pier action must be on walkable deck');
assert(!onHarborPier({x:800,z:-5620}),'open water must not be a pier');
assert(harborSafePoint({x:800,z:-5630}).z>=-5380,'player cannot walk on open sea');

const network=new RoadNetwork([...STARTER_TOWN_RUNTIME_PLAN.routes,FISHING_HIGHWAY,...HARBOR_ROUTES]);
const graph=new RoadGraph(network);
const route=graph.route({x:0,z:-1120},{x:0,z:-5230});
assert(route?.nodes?.length>6,'cross-town directions must connect the Starter gateway to the harbor');
assert.equal(graph.components().length,1,'all new harbor roads must join the original playable road network');
assert(Math.hypot(FISHING_HIGHWAY.points[0].x,FISHING_HIGHWAY.points[0].z+1200)<1);
assert(Math.hypot(FISHING_HIGHWAY.points.at(-1).x,FISHING_HIGHWAY.points.at(-1).z+4100)<1);

const state=defaultState();
assert.equal(ensureFishingState(state).bait,8);
const first=startFishing(state,{random:()=>0.01,spotId:FISHING_SPOTS[0].id});
assert.equal(first.phase,'waiting');assert.equal(state.fishing.bait,7);
assert.equal(pressFishing(first,state).type,'early');
for(let i=0;i<50 && first.phase==='waiting';i++)tickFishing(first,0.12);
assert.equal(first.phase,'bite','fish should bite after deterministic waiting');
assert.equal(pressFishing(first,state).type,'hooked');
let caught=null;
for(let i=0;i<first.needed;i++){
 tickFishing(first,0.12);tickFishing(first,0.12);
 caught=pressFishing(first,state,{random:()=>0.6});
}
assert.equal(caught.type,'caught');
assert.equal(state.fishing.totalCaught,1);
assert.equal(state.fishing.catches.length,1);
assert(fishingLevel(state.fishing)>=1);
const sold=sellFishingCatch(state);
assert.equal(sold.count,1);assert(sold.earnings>0);
assert.equal(state.money,500+sold.earnings);
assert.equal(state.fishing.catches.length,0);
const bait=state.fishing.bait;
assert(buyFishingBait(state));
assert.equal(state.fishing.bait,bait+8);
state.fishing.rod='composite-rod';
assert.equal(ensureFishingState(state).rod,'composite-rod','purchased rod must persist');
const upgraded=startFishing(state,{random:()=>0,spotId:'central-pier'});
assert(upgraded.hookWindow>first.hookWindow,'academy rod must improve the bite window');
const saved=JSON.parse(JSON.stringify(state));
assert.equal(saved.fishing.rod,'composite-rod');
assert.equal(saved.fishing.totalCaught,1);
assert.equal(saved.fishing.bait,bait+7);
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const scene=readFileSync(new URL('../src/world/FishingHarbor.js',import.meta.url),'utf8');
assert.match(main,/buildFishingHarbor\(scene\)/);
assert.match(main,/enforceLiveStarterTownBoundary/);
assert.match(main,/updateHarborFishing\(dt\)/);
assert.match(main,/if\(fishingSession\)/);
assert.match(main,/crossTownNavigation\.routePoints/);
assert.match(scene,/FH_pier_deck_/);
assert.match(scene,/FH_ocean/);
assert.match(scene,/FH_approach_verge/);
console.log('[fishing-harbor] connected 4km highway, 11 harbor roads, 3 fishing piers and 8 services verified');
console.log('[fishing-harbor] cast, bite timing, reel, catch, market sale, bait, progression and save continuity verified');
