// Functional Harbor traffic signals. Lamps and traffic AI share one phase,
// rather than a green/red decoration that cars drive through indiscriminately.
import * as THREE from 'three';
import { HARBOR_SHIFT_Z } from '../config/fishingHarborPlan.js';
export const HARBOR_SIGNAL_NODES=Object.freeze([
 Object.freeze({id:'harbor-center',x:0,z:-4710}),
 Object.freeze({id:'market-crossing',x:0,z:-4950}),
 Object.freeze({id:'marina-entry',x:320,z:-4710}),
 Object.freeze({id:'cannery-crossing',x:-650,z:-4950}),
]);
const material=(color,emissiveIntensity=0)=>new THREE.MeshStandardMaterial({
 color,emissive:color,emissiveIntensity,roughness:.5,
});
const off=material('#202c31'),red=material('#e54542',.9),
 yellow=material('#f4c34a',.9),green=material('#46c674',.9),
 metal=material('#46545b'),black=material('#1d2932');
export function buildHarborSignals(parent) {
 const group=new THREE.Group();group.name='FH_PhysicalTrafficSignals';
 const indications=[];
 for(const node of HARBOR_SIGNAL_NODES){
  for(const side of [-1,1]){
   for(const perpendicular of [-1,1]){
    const head=new THREE.Group();
    head.name='FH_signal_'+node.id+'_'+side+'_'+perpendicular;
    const x=node.x+side*23,z=node.z+perpendicular*23;
    head.position.set(x,0,z);
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.23,.3,9,10),metal);
    stem.position.y=4.5;head.add(stem);
    const face=new THREE.Mesh(new THREE.BoxGeometry(1.35,4.2,1.45),black);
    face.position.y=9.7;head.add(face);
    const bulbs=[];
    for(let i=0;i<3;i++){
      const light=new THREE.Mesh(new THREE.SphereGeometry(.38,12,8),off);
      light.position.set(0,11-i*1.25,0.78);
      head.add(light);bulbs.push(light);
    }
    // Real sidewalk corner supports, well beyond both intersecting lanes.
    group.add(head);
    indications.push({node,side,perpendicular,bulbs});
   }
  }
 }
 parent.add(group);
 let elapsed=0;
 const phase=()=>Math.floor(elapsed/13)%2;
 const update=dt=>{
  elapsed+=Math.max(0,Math.min(.08,Number(dt)||0));
  const active=phase();
  for(const signal of indications){
   // Every 13 seconds vehicle priority changes east/west ↔ north/south.
   const direction=(signal.side===signal.perpendicular)?0:1;
   const go=direction===active;
   signal.bulbs[0].material=go?off:red;
   signal.bulbs[1].material=off;
   signal.bulbs[2].material=go?green:off;
  }
 };
 update(0);
 function mustStop(pos,heading){
  if(!pos||!heading)return {stop:false};
  for(const node of HARBOR_SIGNAL_NODES){
   const dz=node.z+HARBOR_SHIFT_Z-pos.z,dx=node.x-pos.x;
   const forward=dx*heading.x+dz*heading.z;
   if(forward<5||forward>26)continue;
   const eastWest=Math.abs(heading.x)>Math.abs(heading.z);
   const cross=eastWest?Math.abs(dz):Math.abs(dx);
   if(cross>12)continue;
   if((eastWest?1:0)!==phase())
     return {stop:true,reason:'harbor-red-light',intersectionId:node.id};
  }
  return {stop:false};
 }
 return {group,update,mustStop,phase:()=>phase(),nodes:HARBOR_SIGNAL_NODES};
}
