// First playable expansion outside Starter Town. World coordinates use +z south.
import { ROAD_TIERS } from './worldMapPlan.js';

export const HARBOR_BOUNDS = Object.freeze({ minX:-1200, maxX:1200, minZ:-6300, maxZ:-4100 });
export const HARBOR_SHORE_Z = -5380;
export const FISHING_HIGHWAY = Object.freeze({
  id:'starter-harbor-highway', name:'Fishing Harbor Highway', tier:'highway', width:22,
  points:Object.freeze([{x:0,z:-1200},{x:0,z:-1800},{x:0,z:-2600},{x:0,z:-3400},{x:0,z:-4100}]),
});
const route=(id,name,tier,coords)=>Object.freeze({
  id,name,tier,width:ROAD_TIERS[tier]?.width||12,
  points:Object.freeze(coords.map(([x,z])=>Object.freeze({x,z,y:0}))),
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
export const HARBOR_LOCATIONS=Object.freeze([
  {id:'bait-tackle',name:'Castaway Bait & Tackle',kind:'bait',x:-240,z:-5070,color:'#df9b4d'},
  {id:'seafood-market',name:'TideTable Seafood Market',kind:'sell',x:-570,z:-5100,color:'#378caf'},
  {id:'harbor-master',name:'Harbor Master Hall',kind:'master',x:-95,z:-5075,color:'#e6cd79'},
  {id:'dockside-diner',name:'Dockside Diner',kind:'diner',x:435,z:-5070,color:'#db7463'},
  {id:'boat-rental',name:'BlueCurrent Boat Rental',kind:'boats',x:610,z:-5280,color:'#67b3c2'},
  {id:'harbor-patrol',name:'Harbor Patrol',kind:'patrol',x:-820,z:-4820,color:'#51779d'},
  {id:'harbor-academy',name:'Maritime Academy',kind:'academy',x:680,z:-4590,color:'#cebc8d'},
  {id:'tidefuel',name:'Tidefuel',kind:'fuel',x:120,z:-4590,color:'#68b5a6'},
  {id:'harbor-clinic',name:'Harbor Clinic',kind:'clinic',x:-485,z:-4610,color:'#decdc2'},
  {id:'harbor-cannery',name:'Harbor Cannery & Fish Packing',kind:'cannery',x:-955,z:-5085,color:'#8496a0'},
  {id:'boatworks',name:'Anchor & Axle Boatworks',kind:'boatworks',x:-925,z:-4500,color:'#a9a18b'},
  {id:'pearl-gallery',name:'Pearl & Chain Jewelry',kind:'jewelry',x:655,z:-4790,color:'#b5d3cd'},

]);
export const HARBOR_LIGHTHOUSE = Object.freeze({id:'harbor-lighthouse',name:'Breakwater Lighthouse',
  x:870,z:-5490,w:35,d:35,kind:'lighthouse'});
export const HARBOR_WATERWAYS = Object.freeze([
  {id:'harbor-main-channel',name:'Main Harbor Channel',points:[{x:0,z:-5510},{x:40,z:-6000},{x:120,z:-6410}]},
  {id:'western-marina-lane',name:'West Marina Lane',points:[{x:-330,z:-5500},{x:-600,z:-5800},{x:-500,z:-6300}]},
  {id:'east-navigation-lane',name:'East Beacon Lane',points:[{x:490,z:-5500},{x:760,z:-5900},{x:680,z:-6350}]},
]);
export const FISHING_SPOTS=Object.freeze([
  {id:'western-pier',name:'West Fishing Pier',kind:'fish',x:-330,z:-5620,water:'inshore'},
  {id:'central-pier',name:'Central Fishing Pier',kind:'fish',x:120,z:-5590,water:'harbor'},
  {id:'eastern-pier',name:'East Fishing Pier',kind:'fish',x:490,z:-5600,water:'deep'},
]);
export const HARBOR_ACTIONS=Object.freeze([...HARBOR_LOCATIONS,...FISHING_SPOTS,HARBOR_LIGHTHOUSE].map(item=>Object.freeze(item)));
export function inFishingHarbor(point){return !!point && point.x>=-1200 && point.x<=1200 && point.z>=-6300 && point.z<=-4100;}
export function onFishingHighway(point) {return !!point && Math.abs(point.x)<=65 && point.z<=-980 && point.z>=-4100;}
export function onHarborPier(point) {
 if(!point)return false;
 const publicFishingDeck=point.z<=-5350 && point.z>=-5710
   && [-330,120,490].some(x=>Math.abs(point.x-x)<=11);
 // Lighthouse footbridge and breakwater island are legal shoreline walkways.
 const lighthouseBridge=Math.abs(point.x-870)<=9 && point.z<=-5260 && point.z>=-5535;
 const lighthouseIsland=Math.abs(point.x-870)<=45 && Math.abs(point.z+5490)<=44;
 return publicFishingDeck || lighthouseBridge || lighthouseIsland;
}
// Non-pier ocean is visible but not walkable/drivable: stay on solid land/deck.
export function harborSafePoint(point) {
 if(!inFishingHarbor(point))return {x:0,z:-4150};
 return {x:Math.max(-1170,Math.min(1170,point.x)),
   z:point.z<HARBOR_SHORE_Z-8 && !onHarborPier(point)?HARBOR_SHORE_Z+4:Math.max(-6250,Math.min(-4120,point.z))};
}
