// First playable expansion outside Starter Town. World coordinates use +z south.
import { ROAD_TIERS } from './worldMapPlan.js';

// The harbor keeps its original authored local geometry. A world translation
// removes 2,600 meters of empty travel; old saves are migrated in state.js.
export const HARBOR_SHIFT_Z=2600;
export const HARBOR_BOUNDS = Object.freeze({ minX:-1200, maxX:1200, minZ:-3700, maxZ:-1500 });
export const HARBOR_SHORE_Z = -2780;
export const FISHING_HIGHWAY = Object.freeze({
  id:'starter-harbor-highway', name:'Fishing Harbor Highway', tier:'highway', width:22,
  points:Object.freeze([{x:0,z:-1200},{x:0,z:-1300},{x:0,z:-1400},{x:0,z:-1500}]),
});
const route=(id,name,tier,coords)=>Object.freeze({
  id,name,tier,width:ROAD_TIERS[tier]?.width||12,
  points:Object.freeze(coords.map(([x,z])=>Object.freeze({x,z:z+HARBOR_SHIFT_Z,y:0}))),
});
export const HARBOR_ROUTES=Object.freeze([
  route('harbor-arrival','Harbor Arrival Road','main',[[0,-4100],[0,-4500],[0,-4750],[0,-5000],[0,-5240]]),
  route('coastal-drive','Coastal Drive','main',[[-1030,-4710],[-650,-4710],[-300,-4710],[0,-4710],[380,-4710],[930,-4710]]),
  route('netmakers-avenue','Netmakers Avenue','local',[[-880,-4950],[-550,-4950],[-250,-4950],[0,-4950],[300,-4950],[830,-4950]]),
  route('dockside-drive','Dockside Drive','main',[[-1020,-5220],[-630,-5220],[-310,-5220],[0,-5220],[320,-5220],[920,-5220]]),
  route('west-wharf-road','West Wharf Road','local',[[-650,-4490],[-650,-4710],[-650,-4950],[-650,-5220]]),
  route('tackle-lane','Tackle Lane','local',[[-310,-4480],[-310,-4710],[-310,-4950],[-310,-5220]]),
  route('sea-glass-way','Sea Glass Way','local',[[320,-4380],[320,-4710],[320,-4950],[320,-5220]]),
  route('east-quay-street','East Quay Street','local',[[820,-4560],[820,-4710],[820,-4950],[820,-5220]]),
  route('harbor-ferry-approach','Ferry Approach','service',[[0,-5220],[120,-5300],[120,-5355]]),
  route('west-pier-access','West Pier Access','service',[[-310,-5220],[-330,-5300],[-330,-5355]]),
  route('east-pier-access','East Pier Access','service',[[320,-5220],[490,-5300],[490,-5355]]),
]);
export const ALL_FISHING_ROUTES=Object.freeze([FISHING_HIGHWAY,...HARBOR_ROUTES]);

const localLoop=(id,activity,coords)=>Object.freeze({
 id,activity,scheduleId:'retail-daytime',
 loop:Object.freeze(coords.map(([x,z])=>Object.freeze([x,z+HARBOR_SHIFT_Z]))),
});
export const HARBOR_PEDESTRIAN_LOOPS=Object.freeze([
 localLoop('harbor-market-workers','retail',[
   [-620,-5140],[-400,-5140],[-400,-5035],[-620,-5035]]),
 localLoop('harbor-boardwalk-residents','park',[
   [-560,-5335],[-150,-5335],[-150,-5260],[-560,-5260]]),
 localLoop('harbor-academy-students','school',[
   [625,-4635],[735,-4635],[735,-4530],[625,-4530]]),
 localLoop('harbor-patrol-beat','civic',[
   [-875,-4870],[-770,-4870],[-770,-4770],[-875,-4770]]),
 localLoop('harbor-village-neighbors','residential',[
   [650,-5050],[960,-5050],[960,-4800],[650,-4800]]),
 localLoop('harbor-boatworks-shift','industrial',[
   [-1050,-4970],[-750,-4970],[-750,-4800],[-1050,-4800]]),
]);
const trafficLoop=(id,name,coords,trafficKind='ambient')=>Object.freeze({
 id,name,trafficKind,baseSpeed:9.5,
 loop:Object.freeze(coords.map(([x,z])=>Object.freeze([x,z+HARBOR_SHIFT_Z]))),
});
export const HARBOR_TRAFFIC_LOOPS=Object.freeze([
 trafficLoop('harbor-central-traffic','Harbor Center Traffic',[
   [-650,-4710],[0,-4710],[0,-5220],[-650,-5220]]),
 trafficLoop('harbor-marina-traffic','Marina District Traffic',[
   [0,-4710],[820,-4710],[820,-5220],[0,-5220]]),
 trafficLoop('harbor-village-traffic','Village Delivery Loop',[
   [-310,-4710],[320,-4710],[320,-4950],[-310,-4950]],'service'),
 trafficLoop('harbor-market-delivery','Market Wharf Delivery',[
   [-650,-4710],[-310,-4710],[-310,-4950],[-650,-4950]],'service'),
]);

const ORIGINAL_HARBOR_LOCATIONS=Object.freeze([
  {id:'bait-tackle',name:'Bluefin Bait & Tackle',kind:'bait',x:-240,z:-5070,color:'#df9b4d'},
  {id:'seafood-market',name:'Harbor Catch Market',kind:'sell',x:-570,z:-5100,color:'#378caf'},
  {id:'harbor-master',name:'Harbor Master',kind:'master',x:-35,z:-5075,color:'#e6cd79'},
  {id:'dockside-diner',name:'Dockside Diner',kind:'diner',x:435,z:-5070,color:'#db7463'},
  {id:'boat-rental',name:'Bay Boat Rentals',kind:'boats',x:610,z:-5280,color:'#67b3c2'},
  {id:'harbor-patrol',name:'Harbor Patrol',kind:'patrol',x:-820,z:-4820,color:'#51779d'},
  {id:'harbor-academy',name:'Maritime Academy',kind:'academy',x:680,z:-4590,color:'#cebc8d'},
  {id:'tidefuel',name:'Tidefuel',kind:'fuel',x:120,z:-4590,color:'#68b5a6'},
]);
export const HARBOR_LOCATIONS=Object.freeze(ORIGINAL_HARBOR_LOCATIONS.map(a=>Object.freeze({...a,z:a.z+HARBOR_SHIFT_Z})));
const ORIGINAL_FISHING_SPOTS=Object.freeze([
  {id:'western-pier',name:'West Fishing Pier',kind:'fish',x:-330,z:-5620,water:'inshore'},
  {id:'central-pier',name:'Central Fishing Pier',kind:'fish',x:120,z:-5590,water:'harbor'},
  {id:'eastern-pier',name:'East Fishing Pier',kind:'fish',x:490,z:-5600,water:'deep'},
]);
export const FISHING_SPOTS=Object.freeze(ORIGINAL_FISHING_SPOTS.map(a=>Object.freeze({...a,z:a.z+HARBOR_SHIFT_Z})));
export const HARBOR_ACTIONS=Object.freeze([...HARBOR_LOCATIONS,...FISHING_SPOTS]);
export function inFishingHarbor(point){return !!point && point.x>=-1200 && point.x<=1200 && point.z>=-3700 && point.z<=-1500;}
export function onFishingHighway(point) {return !!point && Math.abs(point.x)<=65 && point.z<=-980 && point.z>=-1500;}
export function onHarborPier(point) {
 return !!point && point.z<=-2750 && point.z>=-3110
   && [-330,120,490].some(x=>Math.abs(point.x-x)<=11);
}
// Non-pier ocean is visible but not walkable/drivable: stay on solid land/deck.
export function harborSafePoint(point) {
 if(!inFishingHarbor(point))return {x:0,z:-1550};
 return {x:Math.max(-1170,Math.min(1170,point.x)),
   z:point.z<HARBOR_SHORE_Z-8 && !onHarborPier(point)?HARBOR_SHORE_Z+4:Math.max(-3650,Math.min(-1520,point.z))};
}
