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
import {readFileSync,existsSync} from 'node:fs';
import { HARBOR_TRAFFIC_LOOPS,HARBOR_PEDESTRIAN_LOOPS } from '../src/config/fishingHarborPlan.js';

assert.equal(DISTRICTS.filter(t=>t.playable).length,2,'only Starter Town and Harbor ship now');
const harbor=DISTRICTS.find(t=>t.id==='fishing-harbor');
assert(harbor.playable);
assert.equal(harbor.origin.z,-2600);
assert.equal(FISHING_SPOTS.length,3);
assert.equal(HARBOR_ACTIONS.filter(a=>a.kind!=='fish').length,8);
assert(HARBOR_ROUTES.length>=10);
assert(onFishingHighway({x:0,z:-1350}),'short highway must join Starter and Harbor');
assert(inFishingHarbor({x:0,z:-2600}),'waterfront must be accessible');
assert(onHarborPier(FISHING_SPOTS[0]),'pier action must be on walkable deck');
assert(!onHarborPier({x:800,z:-3020}),'open water must not be a pier');
assert(harborSafePoint({x:800,z:-3030}).z>=-2780,'player cannot walk on open sea');

const network=new RoadNetwork([...STARTER_TOWN_RUNTIME_PLAN.routes,FISHING_HIGHWAY,...HARBOR_ROUTES]);
const graph=new RoadGraph(network);
const route=graph.route({x:0,z:-1120},{x:0,z:-2630});
assert(route?.nodes?.length>6,'cross-town directions must connect the Starter gateway to the harbor');
assert.equal(graph.components().length,1,'all new harbor roads must join the original playable road network');
assert(Math.hypot(FISHING_HIGHWAY.points[0].x,FISHING_HIGHWAY.points[0].z+1200)<1);
assert(Math.hypot(FISHING_HIGHWAY.points.at(-1).x,FISHING_HIGHWAY.points.at(-1).z+1500)<1);

// Visual-world regression: real production GLBs must exist and actually have
// authored placement references in the runtime, not remain unused in a folder.
const production=readFileSync(new URL('../src/world/FishingHarborAssets.js',import.meta.url),'utf8');
const sourceAssets=[...production.matchAll(/asset\('[^']+','([^']+)','([^']+)'/g)];
assert(sourceAssets.length>=35,'Harbor needs a populated authored GLB placement map');
for(const [,name,category] of sourceAssets)
 assert(existsSync(new URL('../public/assets/models/generated/fishing-harbor/'+category+'/'+name+'.glb',import.meta.url)),
  'production Harbor model missing: '+category+'/'+name);
assert(HARBOR_TRAFFIC_LOOPS.length>=4,'Harbor needs separate car-service routes');
assert(HARBOR_PEDESTRIAN_LOOPS.length>=5,'Harbor needs local resident/school/patrol schedules');
const sceneCode=readFileSync(new URL('../src/world/FishingHarbor.js',import.meta.url),'utf8');
assert.match(sceneCode,/populateHarborAssets/,'scene must instantiate real Harbor models');
assert.match(sceneCode,/buildHarborSignals/,'town needs traffic signals rather than empty road crossings');
assert.match(sceneCode,/FH_Crownwater_OpenSea/,'Harbor needs a visible ocean');

const productionFootprints=[...production.matchAll(
 /asset\('([^']+)','([^']+)','([^']+)',(-?[\d.]+),(-?[\d.]+),([\d.]+),([\d.]+)/g,
)].map(m=>({id:m[1],kind:m[3],x:Number(m[4]),z:Number(m[5]),
 w:Number(m[6]),d:Number(m[7])}));
let checkedRoadFootprints=0;
for(const model of productionFootprints){
 if(model.id.startsWith('pier-ramp'))continue; // walking ramps meet service-road heads
 const radius=Math.hypot(model.w,model.d)/2;
 for(const road of HARBOR_ROUTES){
  const roadWidth=road.width||12;
  for(let i=1;i<road.points.length;i++){
   const a=road.points[i-1],b=road.points[i],dx=b.x-a.x,dz=b.z-a.z,ll=dx*dx+dz*dz;
   const t=ll?Math.max(0,Math.min(1,((model.x-a.x)*dx+(model.z+2600-a.z)*dz)/ll)):0;
   const distance=Math.hypot(model.x-a.x-dx*t,model.z+2600-a.z-dz*t);
   assert(distance>=roadWidth/2+radius+3.5,
    'Harbor asset '+model.id+' crosses '+road.id+' drivable road/sidewalk');
   checkedRoadFootprints++;
  }
 }
}
assert(checkedRoadFootprints>500,'test all asset footprints across full roadway segments');
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
console.log('[fishing-harbor] connected shortened highway, 11 harbor roads, 3 fishing piers and 8 services verified');
console.log('[fishing-harbor] '+sourceAssets.length+' existing harbor GLB paths, '+checkedRoadFootprints+' roadway-footprint clearance checks and runtime wiring passed');
console.log('[fishing-harbor] cast, bite timing, reel, catch, market sale, bait, progression and save continuity verified');
