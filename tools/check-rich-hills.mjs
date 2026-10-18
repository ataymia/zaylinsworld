// Regression acceptance for the third playable town. Pure data and gameplay,
// no screenshots or assertions that imply unbuilt building interiors are ready.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DISTRICTS,CONNECTIONS} from '../src/config/worldMapPlan.js';
import {STARTER_TOWN_RUNTIME_PLAN} from '../src/config/starterTownRuntimePlan.js';
import {FISHING_HIGHWAY,HARBOR_ROUTES} from '../src/config/fishingHarborPlan.js';
import {RICH_HILLS_BOUNDS,RICH_HILLS_PARKWAY,RICH_HILLS_ROUTES,
 ALL_RICH_HILLS_ROUTES,RICH_HILLS_SITES,inRichHills,onRichParkway,
 richHillsSafePoint,roadFootprintClear,VALET_DESTINATION,DELIVERY_DESTINATION,
} from '../src/config/richHillsPlan.js';
import {RoadNetwork} from '../src/world/RoadNetwork.js';
import {RoadGraph} from '../src/world/RoadGraph.js';
import {defaultState} from '../src/state.js';
import {ensureRichHills,startGolf,golfMeter,swingGolf,startRichJob,
 tickRichJob,completeRichJob,startFinanceQuiz,answerFinanceQuiz,scenicTour
} from '../src/runtime/RichHillsLife.js';

const rich=DISTRICTS.find(x=>x.id==='rich-hills');
assert(rich?.playable,'Rich Hills marked live only after real runtime is installed');
assert.equal(rich.origin.x,5200);
assert.equal(rich.bounds.w,2400);
assert.equal(DISTRICTS.filter(x=>x.playable).length,3,'only three towns should be listed as playable');
assert(CONNECTIONS.find(link=>link.id==='st-rh'),'starter east road must be a canonical world connection');
assert.equal(RICH_HILLS_PARKWAY.points[0].x,1200,'parkway connects to Starter Town east gateway');
assert.equal(RICH_HILLS_PARKWAY.points.at(-1).x,4000,'parkway connects to Rich Hills west edge');
assert(onRichParkway({x:2500,z:0}));
assert(inRichHills({x:5200,z:0}));
assert(!inRichHills({x:3000,z:0}));
assert.equal(RICH_HILLS_ROUTES.length>=11,true);
assert(RICH_HILLS_SITES.length>=15);
assert.deepEqual(richHillsSafePoint({x:9000,z:1300}),{x:6378,z:1178});
assert.equal(RICH_HILLS_BOUNDS.maxX,6400);

const roads=new RoadNetwork([...STARTER_TOWN_RUNTIME_PLAN.routes,
 FISHING_HIGHWAY,...HARBOR_ROUTES,...ALL_RICH_HILLS_ROUTES]);
const graph=new RoadGraph(roads);
assert.equal(graph.components().length,1,'Starter Town, Harbor, and Rich Hills must form one drivable graph');
const trip=graph.route({x:1170,z:0},{x:5600,z:-400});
assert(trip?.nodes?.length>5,'physical rich hills trip must use many authored road nodes');
const back=graph.route({x:5600,z:-400},{x:30,z:0});
assert(back?.nodes?.length>5,'Rich Hills needs a return route to Starter Town');
const far=graph.route({x:5250,z:0},{x:0,z:-5000});
assert(far?.nodes?.length>12,'new Rich Hills must route all the way to Fishing Harbor');
for(const site of RICH_HILLS_SITES){
 assert(roadFootprintClear(site.x,site.z,site.w,site.d,1),
   site.id+' overlaps a drivable road or sidewalk: '+JSON.stringify(site));
}

const state=defaultState();
assert.equal(ensureRichHills(state).golfRounds,0);
const round=startGolf(state);
assert.equal(round.phase,'aiming');
let meter=0;
for(let i=0;i<17;i++)meter=golfMeter(round,0.12);
assert(meter>=0&&meter<=1);
const putt=swingGolf(round,state);
assert.equal(putt.type,'golf-shot');
assert.equal(state.richHills.golfRounds,1);
assert(state.richHills.golfXp>=20);
assert(putt.earned>0);
const bad=startRichJob(state,'invalid');
assert.equal(bad.error,'invalid');
const job=startRichJob(state,'valet');
assert.equal(job.type,'started');
assert.equal(startRichJob(state,'delivery').error,'job-active','cannot exploit parallel shifts');
tickRichJob(state,13.5);
assert.equal(completeRichJob(state,'valet',{carPosition:{x:0,z:0},inCar:true}).error,'far');
assert.equal(completeRichJob(state,'valet',{carPosition:VALET_DESTINATION,inCar:false}).error,'need-car');
const paid=completeRichJob(state,'valet',{carPosition:VALET_DESTINATION,inCar:true});
assert.equal(paid.type,'completed');
assert(paid.pay>=75);
assert.equal(state.richHills.valetRuns,1);
assert.equal(startRichJob(state,'delivery').type,'started');
const delivered=completeRichJob(state,'delivery',{position:DELIVERY_DESTINATION});
assert.equal(delivered.type,'completed');
assert.equal(state.richHills.deliveries,1);

const lesson=startFinanceQuiz(state);
assert.equal(lesson.phase,'question');
const answer=answerFinanceQuiz(state,lesson,1);
assert(answer.correct,'20% of 1000 equals 200');
assert.equal(answer.earned,20);
assert.equal(state.richHills.financeLessons,1);
assert.equal(scenicTour(state).visits,1);
const old=JSON.parse(JSON.stringify(state));
assert.equal(ensureRichHills(old).golfRounds,1);
assert.equal(ensureRichHills(old).deliveries,1);
assert.equal(ensureRichHills(old).financeLessons,1);
assert.equal(ensureRichHills(old).activeJob,null);

const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const world=readFileSync(new URL('../src/world/RichHills.js',import.meta.url),'utf8');
const map=readFileSync(new URL('../src/minimap.js',import.meta.url),'utf8');
const save=readFileSync(new URL('../src/state.js',import.meta.url),'utf8');
assert.match(main,/richHillsWorld = buildRichHills\(scene\)/);
assert.match(main,/richHillsController\?\.checkValetParking/);
assert.match(main,/richHillsController\?\.handleAction/);
assert.match(main,/richHillsSafePoint/);
assert.match(map,/ALL_RICH_HILLS_ROUTES/);
assert.match(save,/data\.world\?\.townId/);
assert.match(world,/RH_marina_pier_/);
assert.match(world,/RH_entry_arch/);
assert.match(world,/RH_golf_practice_lawn/);
assert.match(world,/RH_instanced_tree_canopies/);
console.log('[rich-hills] 3-town connected navigation, east 2.8km approach, '+RICH_HILLS_ROUTES.length+
 ' local roads and '+RICH_HILLS_SITES.length+' service/attraction locations verified');
console.log('[rich-hills] safe buildings, golf timing, valet arrival, paid estate delivery, realty quiz and save continuity verified');
