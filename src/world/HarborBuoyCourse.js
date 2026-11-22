// Real, authored Harbor race buoys. Temporary warning shapes show only until
// the existing prop_harbor_buoy_a_v01.glb is hydrated for each checkpoint.
import * as THREE from 'three';
import {loadModel} from '../assets.js';
import {BUOY_RACE_CHECKPOINTS} from '../runtime/HarborBuoyRace.js';
const assetPath='./assets/models/generated/fishing-harbor/modular_prop/prop_harbor_buoy_a_v01.glb';
function numberSprite(n){
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
 const context=canvas.getContext('2d');
 context.fillStyle='#15374c';context.beginPath();context.arc(64,64,50,0,Math.PI*2);context.fill();
 context.lineWidth=7;context.strokeStyle='#fbe59e';context.stroke();
 context.font='bold 65px system-ui';context.fillStyle='white';
 context.textAlign='center';context.textBaseline='middle';context.fillText(String(n),64,66);
 const texture=new THREE.CanvasTexture(canvas);
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));
 sprite.position.y=7;sprite.scale.set(12,12,1);return sprite;
}
export function createHarborBuoyCourse(scene){
 const group=new THREE.Group();group.name='FH_MarinaBuoyRun_Course';
 const markers=BUOY_RACE_CHECKPOINTS.map((location,i)=>{
  const node=new THREE.Group();node.name='FH_RaceBuoy_'+location.id;
  node.position.set(location.x,-.15,location.z);
  const fallback=new THREE.Mesh(new THREE.CylinderGeometry(1,1.4,3.3,12),
    new THREE.MeshStandardMaterial({color:'#e88340',roughness:.4}));
  fallback.position.y=1.7;node.add(fallback);
  const ring=new THREE.Mesh(new THREE.RingGeometry(10,13,40),
    new THREE.MeshBasicMaterial({color:'#87dce9',side:THREE.DoubleSide,transparent:true,opacity:.2,depthWrite:false}));
  ring.rotation.x=-Math.PI/2;ring.position.y=.16;node.add(ring);
  node.add(numberSprite(i+1));group.add(node);
  return {node,fallback,ring};
 });
 scene.add(group);
 let ready=null,loaded=false;
 const hydrate=renderer=>{
  if(ready)return ready;
  ready=loadModel(assetPath,renderer).then(gltf=>{
   if(!gltf?.scene)return false;
   let placed=0;
   for(const item of markers){
    const model=gltf.scene.clone(true);model.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(model),sz=bounds.getSize(new THREE.Vector3());
    if(Math.min(sz.x,sz.y,sz.z)<.001||!Number.isFinite(sz.x+sz.y+sz.z))continue;
    const scale=Math.min(3.8/sz.x,5/sz.y,3.8/sz.z);
    model.scale.setScalar(scale);
    model.position.set(-(bounds.min.x+sz.x/2)*scale,-bounds.min.y*scale,-(bounds.min.z+sz.z/2)*scale);
    model.name='FH_ProductionRaceBuoy';
    item.node.add(model);item.fallback.visible=false;placed++;
   }
   loaded=placed===markers.length;return loaded;
  }).catch(()=>false);
  return ready;
 };
 const update=(index=-1,time=0)=>{
  for(let i=0;i<markers.length;i++){
   const m=markers[i],selected=i===index;
   m.ring.material.color.set(selected?'#ffe189':'#86d5e5');
   m.ring.material.opacity=selected?.86:.2;
   m.ring.scale.setScalar(selected?1.18+Math.sin(time*3)*.06:1);
   m.node.position.y=-.15+Math.sin(time*1.5+i*.9)*.09;
  }
 };
 return {group,hydrate,update,get modelLoaded(){return loaded;}};
}
