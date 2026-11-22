// Authentic production Harbor rental boat, with safe fallback during GLB loading.
import * as THREE from 'three';
import {loadModel} from '../assets.js';
import {HARBOR_BOAT_DOCK} from '../runtime/HarborBoatLife.js';
const path='./assets/models/generated/fishing-harbor/modular_prop/vehicle_harbor_rental_boat_a_v01.glb';
export function createHarborRentalBoat(scene){
 const group=new THREE.Group();group.name='FH_player_operated_rental_boat';
 group.position.set(HARBOR_BOAT_DOCK.x,-.18,HARBOR_BOAT_DOCK.z);
 const material=new THREE.MeshStandardMaterial({color:'#e5e8e5',roughness:.75});
 const hull=new THREE.Mesh(new THREE.BoxGeometry(8,1.4,14),material);
 hull.position.y=.25;group.add(hull);
 const seat=new THREE.Mesh(new THREE.BoxGeometry(5,1.3,3),new THREE.MeshStandardMaterial({color:'#20788a'}));
 seat.position.set(0,1.55,1);group.add(seat);
 scene.add(group);
 let hydration=null,loaded=false;
 const hydrate=renderer=>{
   if(hydration)return hydration;
   hydration=loadModel(path,renderer).then(gltf=>{
     if(!gltf?.scene)return false;
     const model=gltf.scene.clone(true);
     const bb=new THREE.Box3().setFromObject(model),sz=bb.getSize(new THREE.Vector3());
     if(Math.min(sz.x,sz.y,sz.z)<=.0001||!Number.isFinite(sz.x+sz.y+sz.z))return false;
     const sc=Math.min(10/sz.x,5/sz.y,18/sz.z);
     model.scale.setScalar(sc);
     model.position.set(-(bb.min.x+sz.x/2)*sc,-bb.min.y*sc-.55,-(bb.min.z+sz.z/2)*sc);
     model.name='FH_authentic_controllable_rental_boat';group.add(model);
     hull.visible=false;seat.visible=false;loaded=true;return true;
   }).catch(()=>false);
   return hydration;
 };
 const update=(b,time=0)=>{
   if(!b)return;
   group.position.set(b.x,-.18+Math.sin(time*1.1)*.065,b.z);
   group.rotation.set(0,b.yaw,Math.sin(time*.8)*.013);
 };
 return {group,hydrate,update,get modelLoaded(){return loaded;}};
}
