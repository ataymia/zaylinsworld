// Fishing Harbor has actual rigged citizens, patrol personnel and moving traffic,
// not just posed primitive cylinders. Uses the SAME NPC/traffic simulation APIs
// already exercised by Starter Town. Sleeps entirely outside the active town.
import * as THREE from 'three';
import {createCityNPCs,updateCityNPCs,createTraffic,updateTraffic} from '../npc.js';

const R=(id,activity,loop)=>Object.freeze({
 id,activity,districtId:'fishing-harbor',loop:Object.freeze(loop),
});
export const HARBOR_PEDESTRIAN_ROUTES=Object.freeze([
 R('harbor-center-civic','civic',
  [[-70,-5088],[-110,-5070],[-140,-5050],[-140,-5010],[-70,-5010]]),
 R('harbor-market-shoppers','retail',
  [[-590,-5150],[-520,-5150],[-475,-5115],[-450,-5050],[-515,-5020],[-590,-5050]]),
 R('harbor-patrol-walk','police',
  [[-840,-4855],[-790,-4855],[-780,-4780],[-855,-4765]]),
 R('marina-boardwalk','waterfront',
  [[-550,-5338],[-380,-5338],[-250,-5338],[-60,-5338],[120,-5338]]),
 R('dockside-village','residential',
  [[350,-5050],[430,-5030],[500,-5000],[550,-5060],[520,-5140]]),
 R('marine-academy','education',
  [[640,-4610],[690,-4580],[735,-4580],[735,-4550],[655,-4550]]),
]);
const T=(id,name,loop,{kind='ambient',color='#5b8a9a',speed=10,serviceType=null}={})=>Object.freeze({
 id,name,loop:Object.freeze(loop),trafficKind:kind,color,baseSpeed:speed,
 serviceType,source:'fishing-harbor-authored-live-traffic',
});
export const HARBOR_TRAFFIC_ROUTES=Object.freeze([
 T('harbor-waterfront-traffic','Waterfront local route',
  [[-650,-4710],[-310,-4710],[0,-4710],[320,-4710],[820,-4710],
   [820,-4950],[320,-4950],[0,-4950],[-310,-4950],[-650,-4950]],
  {color:'#bb8d54',speed:9}),
 T('harbor-village-traffic','Dockside village',
  [[0,-4710],[320,-4710],[320,-4950],[320,-5220],[0,-5220],[0,-4950]],
  {color:'#587ca9',speed:8}),
 T('harbor-patrol-route','Harbor Patrol Road Unit',
  [[-650,-4710],[-310,-4710],[-310,-4950],[-650,-4950]],
  {kind:'patrol',color:'#314c78',speed:10}),
 T('harbor-service-deliveries','Harbor Cargo Delivery',
  [[0,-4710],[0,-4950],[-310,-4950],[-310,-4710]],
  {kind:'service',serviceType:'harbor-delivery',color:'#ae956d',speed:7}),
]);
export function buildHarborTownLife(scene){
 const group=new THREE.Group();group.name='ZW_FishingHarbor_LiveTownLife';
 scene.add(group);
 const npcs=createCityNPCs(group,18,HARBOR_PEDESTRIAN_ROUTES);
 const traffic=createTraffic(group,12,HARBOR_TRAFFIC_ROUTES);
 let officers=0;
 for(const n of npcs)if(n.routeId==='harbor-patrol-walk'){
   n.name=officers++%2===0?'Officer Marina':'Officer Cove';
   n.role='Harbor Patrol Officer';
   n.dialogue='harbor-patrol';
 }
 const report={activeNPCs:npcs.length,movingCars:traffic.length,
   harborPatrolOfficers:officers,policeVehicles:traffic.filter(c=>c.trafficKind==='patrol').length,
   roadRoutes:HARBOR_TRAFFIC_ROUTES.length,pedestrianRoutes:HARBOR_PEDESTRIAN_ROUTES.length};
 let active=false;
 group.visible=false;
 const setActive=(enabled)=>{
   active=!!enabled;
   group.visible=active;
 };
 const update=(dt,t,observer,timeMin)=>{
   if(!active)return;
   updateCityNPCs(npcs,dt,t,observer,timeMin);
   const obstacles=traffic.filter(c=>c.g.visible!==false).map(c=>c.g.position);
   updateTraffic(traffic,dt,obstacles,null,observer,timeMin);
 };
 return {group,npcs,traffic,report,setActive,update,
   active:()=>active};
}
