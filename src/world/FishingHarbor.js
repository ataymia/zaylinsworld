// Procedural, playable first pass for Fishing Harbor. No remote assets,
// per-frame geometry creation or effect-heavy water shaders.
import * as THREE from 'three';
import {HARBOR_BOUNDS,HARBOR_SHORE_Z,HARBOR_ROUTES,FISHING_HIGHWAY,HARBOR_ACTIONS,FISHING_SPOTS} from '../config/fishingHarborPlan.js';

const mat=(color,roughness=0.85,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const earth=mat('#648467'),asphalt=mat('#303c4c'),lane=mat('#e4d5a0');
const deck=mat('#947251'),wood=mat('#705139'),concrete=mat('#a9b4b0');
const waterMat=new THREE.MeshStandardMaterial({color:'#236f9c',roughness:0.32,metalness:0.2,
 transparent:true,opacity:0.94,side:THREE.DoubleSide});
const grass=mat('#598b63'),sand=mat('#bbac79'),glass=mat('#8cc9df',0.27,0.16);
function block(parent,id,x,y,z,w,h,d,material){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
 mesh.name=id;mesh.position.set(x,y,z);mesh.receiveShadow=true;
 mesh.castShadow=h>=2;parent.add(mesh);return mesh;
}
function makeTextSprite(text){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;
 const ctx=canvas.getContext('2d');ctx.fillStyle='rgba(8,27,41,.92)';ctx.fillRect(0,0,512,96);
 ctx.strokeStyle='#c4dfdf';ctx.lineWidth=4;ctx.strokeRect(3,3,506,90);
 ctx.fillStyle='#fff8db';ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.font='bold 34px system-ui';ctx.fillText(text,256,49,478);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthWrite:false}));
 sprite.scale.set(25,4.8,1);sprite.userData.harborText=true;return sprite;
}
function roadSurface(group,route){
 let count=0;
 const points=route.points;
 for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z;
   const length=Math.hypot(dx,dz);if(length<1)continue;
   const yaw=Math.atan2(dx,dz);
   const road=block(group,'FH_road_'+route.id+'_'+i,(a.x+b.x)/2,0.045,(a.z+b.z)/2,route.width,0.07,length+0.5,asphalt);
   road.rotation.y=yaw;road.castShadow=false;
   const marks=Math.floor(length/38);
   for(let j=0;j<marks;j++){
     const t=(j+0.5)/Math.max(1,marks);
     const stripe=block(group,'FH_lane_'+route.id+'_'+i+'_'+j,
       a.x+dx*t,0.087,a.z+dz*t,0.2,0.015,5.2,lane);
     stripe.rotation.y=yaw;stripe.castShadow=false;
   }
   count++;
 }
 return count;
}
function pier(group,x,id,length=320){
 // Shore at -5380. Pier spans from land at -5330 into the ocean.
 const end=-5330-length;
 const z=(-5330+end)/2;
 block(group,'FH_pier_deck_'+id,x,0.12,z,19,0.23,length,deck);
 for(let dz=-5360;dz>end;dz-=42)for(const side of [-1,1]){
   block(group,'FH_pier_pile_'+id+'_'+side+'_'+dz,x+side*8, -1.0,dz,1.6,2.2,1.6,wood);
 }
 for(let dz=-5390;dz>end;dz-=72){
   const bollard=block(group,'FH_bollard_'+id+'_'+dz,x+7,0.7,dz,1.1,1.1,1.1,concrete);
   bollard.castShadow=false;
 }
 const mark=makeTextSprite('FISHING PIER');mark.position.set(x,6.2,-5340);group.add(mark);
}
function fishBoat(group,x,z,yaw=0){
 const boat=new THREE.Group();boat.name='FH_decorative_moored_boat';boat.position.set(x,-0.01,z);
 boat.rotation.y=yaw;
 block(boat,'hull',0,0,0,8,2,18,mat('#f5f2d9',0.7));
 block(boat,'deck',0,1.0,0,7,0.4,14,wood);
 block(boat,'cabin',0,2.5,1,5,2.7,6,mat('#e4e2cb'));
 block(boat,'glass',0,3.0,-2.12,3.4,0.9,0.18,glass);
 block(boat,'mast',0,5,3,0.3,6,0.3,concrete);
 group.add(boat);
}
function shop(group,action,colliders){
 const station=new THREE.Group();station.name='FH_'+action.id;
 const color=mat(action.color||'#b7bbb5');
 const large=['harbor-academy','harbor-patrol','seafood-market'].includes(action.id);
 const w=large?44:34,d=large?34:27,h=large?12:8.5;
 block(station,'FH_building_'+action.id,action.x,h/2,action.z,w,h,d,color);
 block(station,'FH_roof_'+action.id,action.x,h+0.48,action.z,w+1.3,0.9,d+1.3,mat('#283945'));
 // Doors and windows face the wharf; simple high-contrast front elevation.
 block(station,'FH_door_'+action.id,action.x,2.2,action.z+d/2+0.11,3.1,4.4,0.22,mat('#294553'));
 for(const side of [-1,1])block(station,'FH_window_'+action.id+'_'+side,
   action.x+side*w*0.29,4.15,action.z+d/2+0.13,4.2,2.4,0.2,glass);
 const name=makeTextSprite(action.name);name.position.set(action.x,h+3.5,action.z+d/2+1);station.add(name);
 group.add(station);
 colliders.push(new THREE.Box3(
  new THREE.Vector3(action.x-w/2,0,action.z-d/2),
  new THREE.Vector3(action.x+w/2,h+1,action.z+d/2)));
 return station;
}
// Geometric road clearance includes complete segments. Checking only waypoint
// vertices misses long uninterrupted lanes and puts scenery in traffic.
function roadClearAt(x,z,halfWidth=2,halfDepth=2,margin=4) {
 const footprintRadius=Math.hypot(halfWidth,halfDepth);
 for(const route of [FISHING_HIGHWAY,...HARBOR_ROUTES]) {
   for(let i=1;i<route.points.length;i++) {
     const a=route.points[i-1],b=route.points[i],dx=b.x-a.x,dz=b.z-a.z;
     const lengthSq=dx*dx+dz*dz;
     const t=lengthSq?Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/lengthSq)):0;
     const distance=Math.hypot(x-a.x-dx*t,z-a.z-dz*t);
     if(distance<route.width/2+footprintRadius+margin)return false;
   }
 }
 return true;
}
function decorate(group,colliders){
 // Three waterfront promenades; piers are continuous walkable geometry.
 for(const [i,x,length] of [[0,-330,335],[1,120,320],[2,490,330]])pier(group,x,String(i),length);
 block(group,'FH_wooden_boardwalk',10,0.11,-5345,1500,0.23,27,deck);
 block(group,'FH_beach',0,-0.025,-5402,2400,0.12,45,sand);
 fishBoat(group,-375,-5745,Math.PI/4);fishBoat(group,178,-5720,-0.3);fishBoat(group,550,-5780,-0.5);
 // Waterfront bollards, cargo crates, picnic tables, safety lights.
 for(let i=0;i<28;i++){
   const x=-1020+i*74;block(group,'FH_seawall_post_'+i,x,0.8,-5354,1.3,1.6,1.3,concrete);
 }
 for(let i=0;i<28;i++){
   const col=i%7,row=Math.floor(i/7);
   const x=-1000+col*27,z=-5200+row*24;
   if(Math.abs(x+310)<75 || Math.abs(x+570)<75)continue;
   block(group,'FH_crate_'+i,x,1.0,z,5,2,5,i%2?wood:mat('#927a53'));
 }
 // Trees and light poles are bounded and instanced, not individual draw calls.
 const count=160, trunk=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.34,0.52,5,6),wood,count);
 const crown=new THREE.InstancedMesh(new THREE.ConeGeometry(3.3,8,7),grass,count);
 const dummy=new THREE.Object3D();let placed=0;
 for(let row=0;row<10 && placed<count;row++)for(let col=0;col<22 && placed<count;col++){
   const x=-1120+col*105,z=-4245-row*110;
   if(z<-5300||Math.abs(x)<40||Math.abs(x+310)<50||Math.abs(x-320)<50||Math.abs(x-820)<50)continue;
   if(!roadClearAt(x,z,3.5,3.5,5))continue;
   dummy.position.set(x,2.5,z);dummy.updateMatrix();trunk.setMatrixAt(placed,dummy.matrix);
   dummy.position.y=8.2;dummy.updateMatrix();crown.setMatrixAt(placed,dummy.matrix);
   placed++;
 }
 trunk.count=placed;crown.count=placed;trunk.instanceMatrix.needsUpdate=true;crown.instanceMatrix.needsUpdate=true;
 group.add(trunk,crown);
 // Unnamed residential fishing cottages outside frontage lanes.
 const homeColors=['#b5c5b3','#a7b8bd','#d6bd99','#c6b1a4'];
 let houses=0;
 for(let row=0;row<8;row++)for(let col=0;col<14;col++){
   if(houses>=80)break;
   const x=-1000+col*146,z=-4270-row*142;
   if(z<-5130||Math.abs(x)<75||Math.abs(x+310)<75||Math.abs(x-320)<75||Math.abs(x-820)<75)continue;
   if(!roadClearAt(x,z,11,10,6))continue;
   if(HARBOR_ACTIONS.some(a=>Math.hypot(a.x-x,a.z-z)<75))continue;
   const w=22,d=20,h=5.2+row%3*1.3;
   block(group,'FH_cottage_'+houses,x,h/2,z,w,h,d,mat(homeColors[(row+col)%homeColors.length]));
   block(group,'FH_cottage_roof_'+houses,x,h+0.4,z,w+1,0.75,d+1,mat('#57646c'));
   houses++;
   colliders.push(new THREE.Box3(new THREE.Vector3(x-w/2,0,z-d/2),
     new THREE.Vector3(x+w/2,h+1,z+d/2)));
 }
 return {houses,trees:placed};
}
function harborPeople(group){
 // Pedestrians stay on the 27-meter-wide waterfront boardwalk. No collisions,
 // weapons, or looping city AI dependencies are added to the new town.
 const people=[],palette=['#bb7c68','#407e94','#c0a35e','#8d8ab4','#62a2a4'];
 const skin=['#7a4d39','#c78c61','#f0c6a4','#51322b','#a26849'];
 for(let i=0;i<18;i++){
   const x=-850+i*97;
   if(Math.abs(x+330)<32||Math.abs(x-120)<32||Math.abs(x-490)<32)continue;
   const person=new THREE.Group();person.name='FH_boardwalk_pedestrian_'+i;
   const torso=new THREE.Mesh(new THREE.CylinderGeometry(0.46,0.38,1.2,7),
     mat(palette[i%palette.length]));
   torso.position.y=1.2;
   const head=new THREE.Mesh(new THREE.SphereGeometry(0.33,9,7),
     mat(skin[i%skin.length]));
   head.position.y=2.12;
   const legs=new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.25,0.9,6),
     mat('#344556'));
   legs.position.y=0.46;
   person.add(torso,head,legs);
   person.position.set(x,0.17,-5345);
   group.add(person);
   people.push({group:person,originZ:-5345,phase:i*1.6});
 }
 return people;
}
export function buildFishingHarbor(scene){
 const group=new THREE.Group();group.name='ZW_FishingHarbor_Playable_v1';
 // Real separate landscape 4km north; the original Starter Town is untouched.
 block(group,'FH_approach_verge',0,-0.11,-2650,76,0.14,3100,earth);
 block(group,'FH_land',0,-0.15,-4740,2400,0.25,1320,earth);
 block(group,'FH_shore_grass',0,-0.015,-5300,2400,0.08,155,mat('#879a6e'));
 block(group,'FH_ocean',0,-0.27,-6000,2850,0.12,1450,waterMat);
 block(group,'FH_harbor_water_edge',0,-0.24,-5410,2850,0.06,150,waterMat);
 const roadCount=[FISHING_HIGHWAY,...HARBOR_ROUTES].reduce((n,road)=>n+roadSurface(group,road),0);
 const colliders=[];
 for(const action of HARBOR_ACTIONS.filter(a=>a.kind!=='fish'))shop(group,action,colliders);
 const decoration=decorate(group,colliders);
 const people=harborPeople(group);
 let elapsed=0;
 const update=(dt)=>{
   elapsed+=Math.min(0.05,Math.max(0,dt));
   for(const p of people){
     p.group.position.z=p.originZ+Math.sin(elapsed*0.52+p.phase)*5;
     p.group.rotation.y=Math.sin(elapsed*0.52+p.phase)>0?Math.PI:0;
   }
 };
 group.userData.report={playable:true,id:'fishing-harbor',roadSegments:roadCount,
   businesses:8,fishingSpots:FISHING_SPOTS.length,pedestrians:people.length,...decoration};
 scene.add(group);
 const actionByProximity=(position,radius=7)=> {
   let selected=null,distance=radius;
   for(const action of HARBOR_ACTIONS){
     const d=Math.hypot(action.x-position.x,action.z-position.z);
     const reach=action.kind==='fish'?radius:Math.max(radius,27);
     if(d<reach && (!selected || d<distance)){distance=d;selected=action;}
   }
   return selected;
 };
 return {group,colliders,nearestAction:actionByProximity,update,report:group.userData.report};
}
