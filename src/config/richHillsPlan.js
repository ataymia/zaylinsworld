// Authoritative first Rich Hills playable plan at the locked 5,200, 0 world origin.
// Flat drivable streets are intentional in V1. Hill silhouettes rise beyond the
// paved envelope; physical grade changes need their own traversal/camera pass.
import { ROAD_TIERS } from './worldMapPlan.js';
const freeze=Object.freeze;
export const RICH_HILLS_BOUNDS=freeze({minX:4000,maxX:6400,minZ:-1200,maxZ:1200});
export const RICH_HILLS_PARKWAY=freeze({
 id:'starter-rich-hills-parkway',name:'Crest Parkway',tier:'parkway',width:23,
 points:freeze([[1200,0],[1700,0],[2400,0],[3100,0],[3600,0],[4000,0]]
   .map(([x,z])=>freeze({x,z,y:0}))),
});
const road=(id,name,tier,coords,extra={})=>freeze({
 id,name,tier,width:ROAD_TIERS[tier]?.width||11,
 points:freeze(coords.map(([x,z])=>freeze({x,z,y:0}))),...extra,
});
export const RICH_HILLS_ROUTES=freeze([
 road('rich-grand-boulevard','Grand Boulevard','main',[[4000,0],[4200,0],[4500,0],[4800,0],[5200,0],[5600,0],[6000,0],[6350,0]]),
 road('crest-avenue','Crest Avenue','main',[[4500,-400],[4800,-400],[5200,-400],[5600,-400],[6000,-400]]),
 road('estate-ridge','Estate Ridge Road','local',[[4800,-800],[5200,-800],[5600,-800],[6000,-800]]),
 road('garden-way','Garden Way','main',[[4200,500],[4500,500],[4800,500],[5200,500],[5600,500],[6000,500]]),
 road('marina-boulevard','Marina Boulevard','main',[[4200,850],[4500,850],[4800,850],[5200,850],[5600,850],[6000,850]]),
 road('service-village-road','Service Village Road','service',[[4200,0],[4200,500],[4200,850]]),
 road('grand-entry-circuit','Grand Entry Circuit','local',[[4500,-1100],[4500,-800],[4500,-400],[4500,0],[4500,500],[4500,850]]),
 road('luxury-row','Luxury Row','local',[[4800,-800],[4800,-400],[4800,0],[4800,500],[4800,850]]),
 road('civic-rise','Civic Rise','main',[[5200,-1100],[5200,-800],[5200,-400],[5200,0],[5200,500],[5200,850]]),
 road('academy-drive','Academy Drive','local',[[5600,-800],[5600,-400],[5600,0],[5600,500],[5600,850]]),
 road('mansion-loop','Mansion Loop','local',[[6000,-800],[6000,-400],[6000,0],[6000,500],[6000,850]]),
 road('country-club-drive','Country Club Drive','local',[[4800,-400],[4800,-650],[4800,-800]]),
 road('grand-marina-spur','Yacht Club Approach','service',[[4500,-400],[4500,-600],[4450,-710],[4400,-790]]),
 road('upper-ridge-crest','Ridgecrest Lane','local',[[5200,-1100],[5450,-1100],[5700,-1050],[6000,-800]]),
]);
export const ALL_RICH_HILLS_ROUTES=freeze([RICH_HILLS_PARKWAY,...RICH_HILLS_ROUTES]);
export const RICH_HILLS_SITES=freeze([
 {id:'crownline-motors',name:'Crownline Motors',kind:'valet',x:4780,z:98,w:42,d:29,color:'#d8c9a7'},
 {id:'golden-key-realty',name:'Golden Key Realty',kind:'realty',x:4890,z:185,w:35,d:25,color:'#c9aa58'},
 {id:'gallery-crown',name:'Gallery Crown',kind:'gallery',x:5050,z:170,w:36,d:26,color:'#dedbd0'},
 {id:'crown-greens',name:'Crown Greens Country Club',kind:'golf',x:4935,z:-625,w:49,d:37,color:'#ede1c0'},
 {id:'legacy-prep',name:'Legacy Preparatory Academy',kind:'academy',x:5420,z:170,w:57,d:42,color:'#c9b69a'},
 {id:'rich-hills-police',name:'Rich Hills Police',kind:'police',x:5650,z:135,w:44,d:36,color:'#7895a5'},
 {id:'crestview-clinic',name:'Crestview Private Clinic',kind:'clinic',x:5800,z:180,w:42,d:32,color:'#dedbd0'},
 {id:'crestfuel',name:'CrestFuel Motor Club',kind:'fuel',x:4350,z:665,w:42,d:32,color:'#b4baae'},
 {id:'staff-cafe',name:'Service Village Café',kind:'cafe',x:4180,z:235,w:35,d:24,color:'#cfad81'},
 {id:'service-depot',name:'Service Village Depot',kind:'delivery',x:4330,z:245,w:43,d:29,color:'#8a9391'},
 {id:'garden-commons',name:'Garden Commons Pavilion',kind:'commons',x:5010,z:635,w:40,d:27,color:'#b0c4a6'},
 {id:'rich-marina',name:'Rich Hills Marina',kind:'marina',x:4490,z:-790,w:25,d:23,color:'#729fa7'},
 {id:'summit-yacht-club',name:'Summit Yacht Club',kind:'yacht',x:4660,z:-1030,w:44,d:30,color:'#ddd5bf'},
 {id:'legacy-apartments',name:'Service Village Apartments',kind:'housing',x:4190,z:1040,w:51,d:36,color:'#adabab'},
 {id:'estate-gate',name:'Estate Ridge Gate',kind:'estate',x:5850,z:-640,w:24,d:16,color:'#dbc6a1'},
 {id:'summit-overlook',name:'Summit Scenic Overlook',kind:'overlook',x:6110,z:-1030,w:23,d:20,color:'#bdc4a1'},
]);
export const GOLF_TEE=freeze({x:4910,z:-690});
export const VALET_DESTINATION=freeze({x:4935,z:-430});
export const DELIVERY_DESTINATION=freeze({x:5850,z:-640});
export const MARINA_WATER=freeze({minX:3920,maxX:4405,minZ:-1150,maxZ:-715});
export function inRichHills(p){return !!p&&p.x>=4000&&p.x<=6400&&p.z>=-1200&&p.z<=1200;}
export function onRichParkway(p){return !!p&&p.x>=985&&p.x<=4005&&Math.abs(p.z)<=65;}
export function richHillsSafePoint(p){
 if(!p)return {x:4050,z:0};
 const x=Math.max(4022,Math.min(6378,p.x)),z=Math.max(-1178,Math.min(1178,p.z));
 if(x<MARINA_WATER.maxX && x>MARINA_WATER.minX && z<MARINA_WATER.maxZ
    && z>MARINA_WATER.minZ)return {x:MARINA_WATER.maxX+7,z};
 return {x,z};
}
export function roadFootprintClear(x,z,w=0,d=0,margin=4,routes=ALL_RICH_HILLS_ROUTES){
 const r=Math.hypot(w,d)*0.5;
 for(const route of routes){
  for(let i=1;i<route.points.length;i++){
   const a=route.points[i-1],b=route.points[i],dx=b.x-a.x,dz=b.z-a.z;
   const ll=dx*dx+dz*dz,t=ll?Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/ll)):0;
   if(Math.hypot(x-a.x-dx*t,z-a.z-dz*t)<route.width/2+r+margin)return false;
  }
 }
 return true;
}
