// Production Fishing Harbor model placement. These files are already in the
// repo's generated asset library. Never replace them with guessed placeholders.
// Loads only when a player approaches the harbor, with bounded concurrency.
import * as THREE from 'three';
import { loadModel } from '../assets.js';
import {HARBOR_ROUTES,HARBOR_SHIFT_Z,HARBOR_ACTIONS} from '../config/fishingHarborPlan.js';

// Coordinates are Harbor's AUTHORING-space coordinates. The parent town group
// applies any world-location offset, so old site IDs never lose their positions.
const asset=(id,name,kind,x,z,w,d,h,rot=0)=>Object.freeze({
 id,name,kind,x,z,w,d,h,rot,
 path:'./assets/models/generated/fishing-harbor/'+kind+'/'+name+'.glb',
});
export const HARBOR_PRODUCTION_SPECS=Object.freeze([
 // Functioning civic and service landmarks, anchored to real gameplay sites.
 asset('harbor-master','building_harbor_master_hall_exterior_v01','building_shell',-60,-5075,39,35,17),
 asset('harbor-patrol','building_harbor_patrol_station_exterior_v01','building_shell',-820,-4820,50,40,18),
 asset('harbor-academy','building_harbor_academy_exterior_v01','building_shell',680,-4590,65,50,25),
 asset('harbor-clinic','building_harbor_clinic_exterior_v01','building_shell',-140,-4480,38,32,16),
 asset('bait-tackle','building_castaway_bait_shop_exterior_v01','building_shell',-240,-5070,35,29,13),
 asset('seafood-market','building_tidetable_market_exterior_v01','building_shell',-570,-5100,50,37,19),
 asset('dockside-diner','building_dockside_diner_exterior_v01','building_shell',435,-5070,41,31,14),
 asset('boat-rental','building_bluecurrent_boat_rental_exterior_v01','building_shell',610,-5280,40,30,13),
 asset('tidefuel','building_tidefuel_harbor_station_exterior_v01','building_shell',120,-4590,48,38,14),
 // Complete working town, not a row of identical generic green boxes.
 asset('boatworks','building_anchor_axle_boatworks_exterior_v01','building_shell',-1010,-4600,58,48,18),
 asset('harbor-cannery','building_harbor_cannery_exterior_v01','building_shell',-945,-5050,72,51,22),
 asset('harbor-warehouse','arch_harbor_warehouse_wall_a_v01','building_shell',-970,-5150,40,21,13),
 asset('village-market','building_harbor_village_market_exterior_v01','building_shell',860,-4890,42,37,14),
 asset('village-apartments','building_harbor_village_apartments_exterior_v01','building_shell',960,-4635,63,52,24),
 asset('marina-condos','building_harbor_marina_condo_exterior_v01','building_shell',1080,-5160,56,46,21),
 asset('lighthouse','building_breakwater_lighthouse_exterior_v01','building_shell',-1060,-5430,34,34,64),
 asset('dock-room','building_harbor_dock_room_exterior_v01','building_shell',-750,-5300,30,27,12),
 asset('seaside-home-west','building_harbor_waterfront_house_a_v01','building_shell',1025,-5160,33,30,15),
 asset('seaside-home-east','building_harbor_waterfront_house_a_v01','building_shell',970,-5090,33,30,15),
 asset('fisher-cottage-1','building_harbor_houseboat_home_a_v01','building_shell',-430,-5490,25,12,12),
 asset('fisher-cottage-2','building_harbor_houseboat_home_a_v01','building_shell',750,-5530,25,12,12),
 // Authored watercraft must be recognizable at the marina.
 asset('rental-skiff','vehicle_harbor_skiff_a_v01','modular_prop',-385,-5745,14,7,6,Math.PI/2),
 asset('rental-boat','vehicle_harbor_rental_boat_a_v01','modular_prop',183,-5715,19,10,8,-.45),
 asset('patrol-boat','vehicle_harbor_patrol_boat_a_v01','modular_prop',530,-5770,20,11,8,-.2),
 // Pier architecture and water safety equipment on dedicated walkable decking.
 asset('pier-ramp-west','arch_harbor_pier_ramp_a_v01','building_shell',-330,-5365,17,18,4),
 asset('pier-ramp-center','arch_harbor_pier_ramp_a_v01','building_shell',120,-5365,17,18,4),
 asset('pier-ramp-east','arch_harbor_pier_ramp_a_v01','building_shell',490,-5365,17,18,4),
 asset('pier-module-west','arch_harbor_pier_straight_a_v01','building_shell',-330,-5550,16,28,3),
 asset('pier-module-center','arch_harbor_pier_straight_a_v01','building_shell',120,-5530,16,28,3),
 asset('pier-module-east','arch_harbor_pier_straight_a_v01','building_shell',490,-5520,16,28,3),
 asset('seawall-west','arch_harbor_seawall_a_v01','building_shell',-760,-5350,55,11,6),
 asset('seawall-east','arch_harbor_seawall_a_v01','building_shell',750,-5350,55,11,6),
 asset('boat-slip-west','arch_harbor_boat_slip_a_v01','building_shell',-420,-5570,25,16,5),
 asset('boat-slip-east','arch_harbor_boat_slip_a_v01','building_shell',680,-5500,25,16,5),
 // Themed, relevant props. No randomly generated "sea tubes" in a dry street.
 asset('fuel-pump-1','prop_tidefuel_car_pump_a_v01','modular_infrastructure',151,-4635,3,3,4),
 asset('fuel-pump-2','prop_tidefuel_car_pump_a_v01','modular_infrastructure',165,-4635,3,3,4),
 asset('boat-pump','prop_tidefuel_boat_pump_a_v01','modular_infrastructure',520,-5340,3,3,4),
 asset('rescue-ring-west','prop_harbor_life_ring_a_v01','modular_prop',-320,-5420,2,2,2),
 asset('rescue-ring-east','prop_harbor_life_ring_a_v01','modular_prop',480,-5410,2,2,2),
 asset('market-scale','prop_market_scale_a_v01','modular_prop',-538,-5123,2,2,2),
 asset('fish-ice-bin','prop_market_ice_bin_a_v01','modular_prop',-600,-5150,3,3,2.5),
 asset('dock-kiosk','prop_harbor_wayfinding_sign_a_v01','road_sign',-95,-5250,2.5,2,4),
 asset('no-wake-sign','prop_harbor_no_wake_sign_a_v01','modular_prop',610,-5380,2.5,2,4),
 asset('academy-sign','prop_harbor_academy_sign_v01','modular_prop',690,-4540,7,2,5),
 asset('boat-lift','prop_boat_service_lift_a_v01','modular_infrastructure',-1010,-5270,14,12,12),
 asset('repair-tools','prop_boat_tool_cart_a_v01','modular_prop',-975,-5160,3,3,2),
 asset('net-mending','prop_net_mending_table_a_v01','modular_prop',-925,-5180,5,4,3),
 asset('market-counter','furniture_harbor_market_counter_a_v01','modular_furniture',-520,-5160,8,4,4),
]);
const fit=(scene,spec)=>{
 const cloned=scene.clone(true);
 cloned.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(cloned);
 const dims=bounds.getSize(new THREE.Vector3());
 const center=bounds.getCenter(new THREE.Vector3());
 if (![dims.x,dims.y,dims.z].every(v=>v>.001&&Number.isFinite(v)))return null;
 const align=new THREE.Group();
 cloned.position.sub(new THREE.Vector3(center.x,bounds.min.y,center.z));
 align.add(cloned);
 const wrapper=new THREE.Group();wrapper.name='FH_production_'+spec.id;
 const sx=spec.w/dims.x,sz=spec.d/dims.z,sy=spec.h/dims.y;
 const scale=Math.max(.0001,Math.min(sx,sz,sy));
 align.scale.setScalar(scale);
 wrapper.add(align);
 wrapper.position.set(spec.x,0,spec.z);
 wrapper.rotation.y=spec.rot;
 wrapper.userData.assetPath=spec.path;
 wrapper.userData.production=true;
 wrapper.traverse(node=>{if(node.isMesh){node.castShadow=false;node.receiveShadow=true;}});
 return wrapper;
};

function pointToSegmentDistance(point,a,b) {
 const dx=b.x-a.x,dz=b.z-a.z,span=dx*dx+dz*dz;
 const t=span?Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.z-a.z)*dz)/span)):0;
 return Math.hypot(point.x-a.x-dx*t,point.z-a.z-dz*t);
}
export function harborStreetlightSites(limit=64) {
 // Both axes are AUTHORITATIVE world coordinates when checking every road.
 // We translate to harbor-scene local space only at the final placement.
 const result=[];
 for(const road of HARBOR_ROUTES) {
  if(!['main','local'].includes(road.tier))continue;
  for(let i=1;i<road.points.length;i++){
   const a=road.points[i-1],q=road.points[i],dx=q.x-a.x,dz=q.z-a.z;
   const len=Math.hypot(dx,dz);
   if(len<60)continue;
   const count=Math.floor(len/95);
   for(let j=0;j<count;j++){
    const t=(j+.5)/count;
    const side=(i+j)%2?-1:1;
    const offset=road.width/2+8;
    const world={x:a.x+dx*t-side*dz/len*offset,
      z:a.z+dz*t+side*dx/len*offset};
    if(HARBOR_ACTIONS.some(site=>Math.hypot(site.x-world.x,site.z-world.z)<22))continue;
    let safe=true;
    for(const other of HARBOR_ROUTES){
     for(let k=1;k<other.points.length;k++){
      if(pointToSegmentDistance(world,other.points[k-1],other.points[k])
         <other.width/2+4.2){safe=false;break;}
     }
     if(!safe)break;
    }
    if(!safe)continue;
    if(result.some(site=>Math.hypot(site.x-world.x,site.z+HARBOR_SHIFT_Z-world.z)<30))continue;
    result.push({x:world.x,z:world.z-HARBOR_SHIFT_Z,rot:Math.atan2(dx,dz)});
    if(result.length>=limit)return result;
   }
  }
 }
 return result;
}
async function addRealNeighborhoods(group,renderer,report){
 // Replace each geometrically cleared primitive cottage at ITS existing
 // gameplay-safe position. No new unvalidated footprints or save identifiers.
 const cottages=group.children.filter(child=>/^FH_cottage_\d+$/.test(child.name));
 const homeName='building_harbor_waterfront_house_a_v01';
 const homePath='./assets/models/generated/fishing-harbor/building_shell/'+homeName+'.glb';
 const house=await loadModel(homePath,renderer);
 report.neighborhoodHomes=0;
 if(house?.scene){
  for(let i=0;i<cottages.length;i++){
   const old=cottages[i];
   const model=fit(house.scene,{id:'neighborhood-'+i,w:22,d:20,h:6.5+(i%3)*1.1,rot:i%4===0?Math.PI:0,
    x:old.position.x,z:old.position.z});
   if(!model)continue;
   group.add(model);
   old.visible=false;
   const roof=group.getObjectByName('FH_cottage_roof_'+i);
   if(roof)roof.visible=false;
   report.neighborhoodHomes++;
  }
 }else report.failed.push({id:'neighborhood-houses',path:homePath,error:'GLB unavailable'});
 const lamps=await loadModel('./assets/models/generated/fishing-harbor/streetlight/prop_harbor_streetlight_a_v01.glb',renderer);
 report.realStreetlights=0;
 if(lamps?.scene){
  const positions=harborStreetlightSites();
  for(let i=0;i<positions.length;i++){
   const site=positions[i];
   const lamp=fit(lamps.scene,{id:'streetlight-'+i,w:3,d:3,h:9,x:site.x,z:site.z,rot:site.rot});
   if(!lamp)continue;
   group.add(lamp);report.realStreetlights++;
  }
 }else report.failed.push({id:'harbor-streetlight',error:'GLB unavailable'});
}

export async function populateHarborAssets({group,renderer,onModel=null}={}){
 const report={planned:HARBOR_PRODUCTION_SPECS.length,loaded:0,failed:[],byId:{},complete:false};
 if(!group)return report;
 const concurrency=3;let cursor=0;
 async function worker(){
  while(cursor<HARBOR_PRODUCTION_SPECS.length){
   const spec=HARBOR_PRODUCTION_SPECS[cursor++];
   try{
    const loaded=await loadModel(spec.path,renderer);
    const object=loaded?.scene?fit(loaded.scene,spec):null;
    if(!object)throw Error('model unavailable or empty');
    group.add(object);report.loaded++;report.byId[spec.id]=spec.path;
    onModel?.(spec,object);
   }catch(error){report.failed.push({id:spec.id,path:spec.path,error:String(error?.message||error)});}
  }
 }
 await Promise.all(Array.from({length:concurrency},worker));
 await addRealNeighborhoods(group,renderer,report);
 report.complete=true;
 group.userData.productionAssets=report;
 return report;
}
