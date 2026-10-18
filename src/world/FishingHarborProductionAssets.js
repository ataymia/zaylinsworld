// Production Fishing Harbor GLB placement. Same tracked glTF/cache pipeline,
// grounding and authored placement ownership as StarterTownBuildingAssets.
// Never count a placeholder as a loaded authored model.
import * as THREE from 'three';
import { loadModel } from '../assets.js';
import { HARBOR_LOCATIONS,FISHING_SPOTS } from '../config/fishingHarborPlan.js';

const BASE='./assets/models/generated/fishing-harbor/';
const model=(folder,name)=>BASE+folder+'/'+name+'.glb';
const named=Object.freeze({
 'bait-tackle':'building_castaway_bait_shop_exterior_v01',
 'seafood-market':'building_tidetable_market_exterior_v01',
 'harbor-master':'building_harbor_master_hall_exterior_v01',
 'dockside-diner':'building_dockside_diner_exterior_v01',
 'boat-rental':'building_bluecurrent_boat_rental_exterior_v01',
 'harbor-patrol':'building_harbor_patrol_station_exterior_v01',
 'harbor-academy':'building_harbor_academy_exterior_v01',
 tidefuel:'building_tidefuel_harbor_station_exterior_v01',
 'harbor-clinic':'building_harbor_clinic_exterior_v01',
 'harbor-cannery':'building_harbor_cannery_exterior_v01',
 'boatworks':'building_anchor_axle_boatworks_exterior_v01',
 'harbor-apartments':'building_harbor_village_apartments_exterior_v01',
 'harbor-condos':'building_harbor_marina_condo_exterior_v01',
 'fisher-homes':'building_harbor_waterfront_house_a_v01',
 'dock-rooms':'building_harbor_dock_room_exterior_v01',
 'harbor-market':'building_harbor_village_market_exterior_v01',
 'harbor-lighthouse':'building_breakwater_lighthouse_exterior_v01',
 'pearl-gallery':'building_harbor_village_market_exterior_v01',
});
const extra=Object.freeze([
 {id:'harbor-apartments',name:'Harbor Village Apartments',x:985,z:-4500,w:53,d:36},
 {id:'harbor-condos',name:'Marina Condos',x:1010,z:-5100,w:54,d:35},
 {id:'fisher-homes',name:'Fisher Homes',x:945,z:-4890,w:36,d:29},
 {id:'dock-rooms',name:'Dock Rooms',x:-800,z:-4570,w:35,d:29},
 {id:'harbor-market',name:'Dockside Shops',x:575,z:-4850,w:42,d:30},
]);
const placed=new Map();
const all=Object.freeze([...HARBOR_LOCATIONS,...extra].map(p=>Object.freeze({
 ...p,model:model('building_shell',named[p.id]),type:'building',
})).concat(Object.freeze({
 id:'harbor-lighthouse',name:'Breakwater Lighthouse',x:870,z:-5490,
 w:35,d:35,model:model('building_shell',named['harbor-lighthouse']),type:'lighthouse',
})));
const fixtures=Object.freeze([
 {id:'harbor-patrol-boat',name:'Harbor Patrol Boat',x:-780,z:-5500,w:13,d:19,
  model:model('modular_prop','vehicle_harbor_patrol_boat_a_v01'),type:'boat'},
 {id:'harbor-rental-boat-1',name:'Rental Boat',x:580,z:-5575,w:13,d:19,
  model:model('modular_prop','vehicle_harbor_rental_boat_a_v01'),type:'boat'},
 {id:'harbor-skiff-1',name:'Local Fishing Skiff',x:-390,z:-5740,w:10,d:15,
  model:model('modular_prop','vehicle_harbor_skiff_a_v01'),type:'boat'},
 {id:'harbor-skiff-2',name:'Local Fishing Skiff',x:200,z:-5780,w:10,d:15,
  model:model('modular_prop','vehicle_harbor_skiff_a_v01'),type:'boat'},
 {id:'seafood-ice',name:'Market Ice Bin',x:-575,z:-5131,w:4,d:3,
  model:model('modular_prop','prop_market_ice_bin_a_v01'),type:'prop'},
 {id:'seafood-auction',name:'Market Auction Board',x:-595,z:-5131,w:5,d:3,
  model:model('modular_prop','prop_market_auction_board_a_v01'),type:'prop'},
 {id:'seafood-scale',name:'Fish Market Scale',x:-560,z:-5131,w:3,d:3,
  model:model('modular_prop','prop_market_scale_a_v01'),type:'prop'},
 {id:'harbor-bait-cooler',name:'Bait Cooler',x:-265,z:-5098,w:4,d:4,
  model:model('modular_infrastructure','prop_tidefuel_bait_cooler_a_v01'),type:'prop'},
 {id:'harbor-car-pump',name:'Tidefuel Car Pump',x:145,z:-4610,w:5,d:5,
  model:model('modular_infrastructure','prop_tidefuel_car_pump_a_v01'),type:'prop'},
 {id:'harbor-ev-charger',name:'Tidefuel EV Charger',x:160,z:-4610,w:5,d:5,
  model:model('modular_infrastructure','prop_tidefuel_ev_charger_a_v01'),type:'prop'},
 {id:'harbor-lifering-west',name:'Pier Life Ring',x:-323,z:-5470,w:4,d:4,
  model:model('modular_prop','prop_harbor_life_ring_a_v01'),type:'prop'},
 {id:'harbor-lifering-center',name:'Pier Life Ring',x:127,z:-5460,w:4,d:4,
  model:model('modular_prop','prop_harbor_life_ring_a_v01'),type:'prop'},
 {id:'harbor-navigation-light',name:'Harbor Navigation Light',x:700,z:-5425,w:3,d:3,
  model:model('modular_prop','prop_harbor_navigation_light_a_v01'),type:'prop'},
 {id:'boatwork-lift',name:'Boatworks Lift',x:-925,z:-4810,w:10,d:12,
  model:model('modular_infrastructure','prop_boat_service_lift_a_v01'),type:'prop'},
 {id:'harbor-buoy-1',name:'Channel Buoy',x:40,z:-5835,w:6,d:6,
  model:model('modular_prop','prop_harbor_buoy_a_v01'),type:'buoy'},
 {id:'harbor-buoy-2',name:'Channel Buoy',x:350,z:-5985,w:6,d:6,
  model:model('modular_prop','prop_harbor_buoy_a_v01'),type:'buoy'},
]);
export const HARBOR_PRODUCTION_PLACEMENTS=Object.freeze([...all,...fixtures]);

function normalizeAsset(raw){
 raw.updateWorldMatrix(true,true);
 const box=new THREE.Box3().setFromObject(raw);
 const size=box.getSize(new THREE.Vector3());
 const center=box.getCenter(new THREE.Vector3());
 if(![size.x,size.y,size.z].every(n=>Number.isFinite(n)&&n>0.001))return null;
 const anchor=new THREE.Group();
 raw.position.set(-center.x,-box.min.y,-center.z);
 anchor.userData.sourceSize={x:size.x,y:size.y,z:size.z};
 anchor.add(raw);
 return anchor;
}
function fitToFootprint(group,placement){
 const source=group.userData.sourceSize;
 const straight=Math.min(placement.w/source.x,placement.d/source.z);
 const rotated=Math.min(placement.w/source.z,placement.d/source.x);
 const rotate=rotated>straight*1.05;
 group.rotation.y=rotate?Math.PI/2:0;
 const s=Math.max(0.01,Math.min(rotate?rotated:straight,14));
 group.scale.setScalar(s);
 // Recompute grounding from authored pivot, not arbitrary GLB origins.
 return s;
}
function namedSiteAnchor(sceneRoot,id){
 return sceneRoot.getObjectByName('FH_building_'+id);
}
function hideLegacyBuilding(sceneRoot,id) {
 for(const prefix of ['FH_building_','FH_roof_','FH_door_','FH_window_']){
  sceneRoot.traverse(node=>{
   if(node.name===prefix+id||node.name.startsWith(prefix+id+'_'))node.visible=false;
  });
 }
}
const uniqueModels=Object.freeze([...new Set(HARBOR_PRODUCTION_PLACEMENTS.map(p=>p.model))]);
export async function hydrateFishingHarborProductionAssets({sceneRoot,renderer=null,
 onProgress=null}={}){
 if(!sceneRoot)return {error:'missing-harbor-root'};
 if(sceneRoot.userData.productionLoadPromise)return sceneRoot.userData.productionLoadPromise;
 const report={expected:HARBOR_PRODUCTION_PLACEMENTS.length,loaded:0,failed:0,
  uniqueAssetsLoaded:[],missing:[],productionInstances:0,proceduralSurrogatesReplaced:0};
 sceneRoot.userData.productionReport=report;
 const task=(async()=>{
  const templates=new Map();
  let next=0;
  const worker=async()=>{
   while(next<uniqueModels.length){
    const asset=uniqueModels[next++];
    try{
     const record=await loadModel(asset,renderer);
     const normalized=record?.scene?normalizeAsset(record.scene.clone(true)):null;
     if(normalized){templates.set(asset,normalized);report.uniqueAssetsLoaded.push(asset);}
     else report.missing.push(asset);
    }catch(error){
     report.missing.push(asset);
     console.warn('[fishing-harbor] production GLB not loaded:',asset,error);
    }
    onProgress?.({...report});
   }
  };
  await Promise.all(Array.from({length:Math.min(3,uniqueModels.length)},worker));
  for(const spot of HARBOR_PRODUCTION_PLACEMENTS){
   const template=templates.get(spot.model);
   if(!template){report.failed++;continue;}
   const instance=template.clone(true);
   fitToFootprint(instance,spot);
   instance.name='ZW_FishingHarborAsset_'+spot.id;
   instance.position.set(spot.x,spot.type==='boat'?0.02:spot.type==='buoy'?0.14:0.04,spot.z);
   instance.userData.assetPath=spot.model;
   instance.userData.productionAsset=true;
   instance.userData.placementId=spot.id;
   instance.traverse(node=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=true;}});
   sceneRoot.add(instance);
   report.loaded++;report.productionInstances++;
   placed.set(spot.id,instance);
   if(namedSiteAnchor(sceneRoot,spot.id)){
    hideLegacyBuilding(sceneRoot,spot.id);
    report.proceduralSurrogatesReplaced++;
   }
  }
  // Direct assets are also used on existing stylized residential plots rather
  // than leaving rows of untextured procedurally generated boxes.
  const homeNames=[
    'building_harbor_waterfront_house_a_v01',
    'building_harbor_dock_room_exterior_v01',
    'building_harbor_village_apartments_exterior_v01',
  ];
  const homes=homeNames.map(name=>templates.get(model('building_shell',name)));
  let converted=0;
  sceneRoot.traverse(object=>{
   if(!/^FH_cottage_\d+$/.test(object.name))return;
   const source=homes[converted%homes.length];
   if(!source)return;
   const shell=source.clone(true);
   fitToFootprint(shell,{w:22,d:20});
   shell.position.copy(object.position);shell.position.y=0.03;
   shell.name='ZW_FishingHarborAsset_infill_'+converted;
   shell.userData.productionAsset=true;
   object.visible=false;
   // In-place group addition is safe once the loop completes.
   placed.set(shell.name,shell);
   converted++;
  });
  for(const [id,shell] of placed)if(id.startsWith('ZW_FishingHarborAsset_infill_'))sceneRoot.add(shell);
  report.infillReplacements=converted;
  report.successRate=report.expected?report.loaded/report.expected:0;
  sceneRoot.userData.productionReport=report;
  console.info('[fishing-harbor] production asset proof:',report);
  return report;
 })();
 sceneRoot.userData.productionLoadPromise=task;
 return task;
}
export const HARBOR_PRODUCTION_MODELS=uniqueModels;
