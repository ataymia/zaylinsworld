// District-specific Fishing Harbor surfaces, signals, roadway furniture,
// lighthouse island and marked working water lanes. Real landmark GLBs are
// loaded separately by FishingHarborProductionAssets, just like Starter Town.
import * as THREE from 'three';
import {HARBOR_ROUTES,FISHING_HIGHWAY,HARBOR_WATERWAYS} from '../config/fishingHarborPlan.js';
const m=(hex,roughness=.84)=>new THREE.MeshStandardMaterial({color:hex,roughness});
const gray=m('#979e9e'),asphalt=m('#686c69'),work=m('#81888a'),sand=m('#c1ad7f'),
  navy=m('#354650'),steel=m('#586870'),light=m('#f6dfb2'),red=m('#c34039'),
  amber=m('#e4b45d'),green=m('#48b583'),stone=m('#8e938b'),wood=m('#8e7153');
function box(parent,name,x,y,z,w,h,d,material){
 const v=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
 v.name=name;v.position.set(x,y,z);v.receiveShadow=true;v.castShadow=h>2;
 parent.add(v);return v;
}
function roadClear(x,z,halfW=.5,halfD=.5,margin=2){
 const radius=Math.hypot(halfW,halfD);
 for(const route of [FISHING_HIGHWAY,...HARBOR_ROUTES]){
  for(let i=1;i<route.points.length;i++){
   const a=route.points[i-1],b=route.points[i],dx=b.x-a.x,dz=b.z-a.z;
   const squared=dx*dx+dz*dz,t=squared?Math.max(0,Math.min(1,
    ((x-a.x)*dx+(z-a.z)*dz)/squared)):0;
   if(Math.hypot(x-a.x-dx*t,z-a.z-dz*t)<route.width/2+radius+margin)return false;
  }
 }
 return true;
}
function addSignals(group){
 const lamps=[];
 const intersections=[[-650,-4710],[-310,-4710],[0,-4710],[320,-4710],[820,-4710],
  [-650,-4950],[-310,-4950],[0,-4950],[320,-4950],[820,-4950],
  [-310,-5220],[0,-5220],[320,-5220]];
 for(const [id,[x,z]] of intersections.entries()){
  const pole={x:x+13,z:z+13};
  if(!roadClear(pole.x,pole.z,.7,.7,1.1))continue;
  box(group,'FH_traffic_signal_post_'+id,pole.x,3.5,pole.z,.36,7,.36,steel);
  box(group,'FH_traffic_signal_arm_'+id,pole.x-4.8,6.9,pole.z,9.3,.3,.3,steel);
  box(group,'FH_signal_body_'+id,pole.x-9.3,6,pole.z,1.2,3.6,1.1,navy);
  const bulbs=[];
  for(const [j,color]of [red,amber,green].entries()){
   const item=new THREE.Mesh(new THREE.SphereGeometry(.36,10,7),color.clone());
   item.name='FH_signal_'+id+'_'+j;
   item.position.set(pole.x-9.3,7.06-j*1.09,pole.z+.66);
   group.add(item);bulbs.push(item);
  }
  lamps.push(bulbs);
  if(id<9)for(let j=0;j<7;j++){
   const stripe=box(group,'FH_crosswalk_'+id+'_'+j,
    x-8.4+j*2.7,.16,z+17,1.27,.019,3,gray);
   stripe.castShadow=false;
  }
 }
 return lamps;
}
function addLights(group){
 let count=0;
 for(const route of HARBOR_ROUTES.filter(r=>['main','local'].includes(r.tier))){
  for(let i=1;i<route.points.length;i++){
   const a=route.points[i-1],b=route.points[i];
   const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
   if(len<25)continue;
   const nx=dz/len,nz=-dx/len;
   for(let dist=38;dist<len-16;dist+=100)for(const side of [-1,1]){
    const x=a.x+dx*dist/len+nx*side*(route.width/2+4.8);
    const z=a.z+dz*dist/len+nz*side*(route.width/2+4.8);
    if(!roadClear(x,z,.22,.22,1.7))continue;
    box(group,'FH_safe_streetlight_post_'+count,x,3.4,z,.24,6.8,.24,steel);
    box(group,'FH_safe_streetlight_arm_'+count,x+1,6.6,z,2,.18,.2,steel);
    box(group,'FH_safe_streetlight_head_'+count,x+2,6.55,z,.9,.24,.72,light);
    count++;
   }
  }
 }
 return count;
}
function sidewalks(group){
 let count=0;
 for(const route of HARBOR_ROUTES.filter(r=>['main','local'].includes(r.tier))){
  for(let i=1;i<route.points.length;i++){
   const a=route.points[i-1],b=route.points[i];
   const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
   if(len<1)continue;
   const yaw=Math.atan2(dx,dz),nx=Math.cos(yaw),nz=-Math.sin(yaw);
   for(const side of [-1,1]){
    const x=(a.x+b.x)/2+side*nx*(route.width/2+2.5);
    const z=(a.z+b.z)/2+side*nz*(route.width/2+2.5);
    const strip=box(group,'FH_walkway_'+route.id+'_'+i+'_'+side,x,.017,z,
      4.5,.065,len,gray);
    strip.rotation.y=yaw;strip.castShadow=false;count++;
   }
  }
 }
 return count;
}
function coast(group){
 // Distinct paved harbor districts make commercial, civic, residential and
 // heavy-industry plots visually legible instead of a single featureless lawn.
 const paved=[
  [-660,-5015,430,320,asphalt],
  [-900,-4680,430,360,work],
  [0,-5010,320,260,gray],
  [535,-4990,435,365,stone],
  [650,-4610,420,275,asphalt],
 ];
 paved.forEach(([x,z,w,d,mat],i)=>{
  box(group,'FH_authored_district_surface_'+i,x,-.079,z,w,.10,d,mat);
 });
 // Island and foot bridge keep the hero lighthouse physically reachable.
 box(group,'FH_breakwater_lighthouse_island',870,.12,-5490,95,.26,86,stone);
 box(group,'FH_breakwater_walkway_bridge',870,.30,-5380,15,.28,210,wood);
 // Safe inland inlet is visible from coastal streets and never covers a road.
 box(group,'FH_channel_east_seawall',1003,.65,-4910,2,1.25,710,stone);
 box(group,'FH_channel_west_seawall',-1080,.65,-4900,2,1.25,670,stone);
 // Marina navigation lanes, no-wake markers, genuine harbor channel.
 let buoys=0;
 for(const lane of HARBOR_WATERWAYS)for(const [i,p]of lane.points.entries()){
  const color=i%2?red:amber;
  const cone=new THREE.Mesh(new THREE.ConeGeometry(2.0,3.5,8),color);
  cone.position.set(p.x,2,p.z);cone.name='FH_navigation_buoy_'+lane.id+'_'+i;
  group.add(cone);buoys++;
 }
 // Working dock clutter is set on legal service parcels, not on the pavement.
 let cargo=0;
 for(let i=0;i<21;i++){
  const x=-1010+(i%7)*30,z=-5090+Math.floor(i/7)*28;
  if(!roadClear(x,z,8,4,2))continue;
  box(group,'FH_stacked_cargo_'+i,x,2.1,z,14,4.2,7,
   m(i%3===0?'#839b9d':i%3===1?'#a05f4c':'#ac9d70'));
  cargo++;
 }
 return {navigationBuoys:buoys,cargo,coastalWaterVisible:true};
}
export function buildFishingHarborStreetscape(group){
 const lamps=addSignals(group),streetlights=addLights(group),walkways=sidewalks(group);
 const detail=coast(group);
 const report={signalizedIntersections:lamps.length,streetlightPoles:streetlights,
  sidewalks:walkways,...detail};
 const update=seconds=>{
  const phase=Math.floor(seconds/12)%2;
  for(const [i,bulbs]of lamps.entries())bulbs.forEach((node,index)=>{
   const active=index===(i%2===phase?2:0);
   node.material.emissive.setHex(active?(index===2?0x146c3d:0x8e2920):0);
   node.material.emissiveIntensity=active?1.3:0;
  });
 };
 return {update,report};
}
