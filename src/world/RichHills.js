// First playable Rich Hills. Retains original land and 2,000x2,000 Starter Town.
// Procedural meshes keep render budgets predictable; no external asset fetches.
import * as THREE from 'three';
import {
 RICH_HILLS_ROUTES,RICH_HILLS_PARKWAY,RICH_HILLS_SITES,
 roadFootprintClear,MARINA_WATER,
} from '../config/richHillsPlan.js';

const material=(hex,rough=0.82,metal=0)=>new THREE.MeshStandardMaterial({
 color:hex,roughness:rough,metalness:metal,
});
const surfaces=Object.freeze({
 lawn:material('#718b5d'),darkGrass:material('#4f7148'),
 road:material('#454b50'),paint:material('#f0e3ba'),stone:material('#d8c9a7'),
 cream:material('#dfd2b5'),roof:material('#a85e42'),gold:material('#c9aa58',0.55,0.25),
 marble:material('#dedbd0'),glass:material('#86c0d8',0.24,0.14),
 service:material('#71757a'),trunk:material('#76634c'),
 marina:material('#4d8396',0.3,0.2),deck:material('#957657'),hedge:material('#326444'),
});
function cube(parent,name,x,y,z,w,h,d,mat,collision=false,colliders=null){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
 mesh.name=name;mesh.position.set(x,y,z);
 mesh.castShadow=h>2;mesh.receiveShadow=true;parent.add(mesh);
 if(collision && colliders)colliders.push(new THREE.Box3(
  new THREE.Vector3(x-w/2,0,z-d/2),
  new THREE.Vector3(x+w/2,h+0.3,z+d/2)));
 return mesh;
}
function signText(name){
 const cvs=document.createElement('canvas');cvs.width=640;cvs.height=104;
 const ctx=cvs.getContext('2d');
 ctx.fillStyle='#25394bcc';ctx.fillRect(0,0,640,104);
 ctx.strokeStyle='#d1b66d';ctx.lineWidth=5;ctx.strokeRect(3,3,634,98);
 ctx.font='bold 37px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.fillStyle='#fff5d8';ctx.fillText(name,320,52,603);
 const texture=new THREE.CanvasTexture(cvs);texture.colorSpace=THREE.SRGBColorSpace;
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthWrite:false}));
 sprite.name='RH_label_'+name;sprite.scale.set(35,5.7,1);
 return sprite;
}
function surfaceRoads(group){
 let segments=0;
 for(const route of [RICH_HILLS_PARKWAY,...RICH_HILLS_ROUTES]){
  for(let i=1;i<route.points.length;i++){
   const a=route.points[i-1],b=route.points[i],dx=b.x-a.x,dz=b.z-a.z;
   const length=Math.hypot(dx,dz);if(length<=0.01)continue;
   const angle=Math.atan2(dx,dz);
   const segment=cube(group,'RH_road_'+route.id+'_'+i,(a.x+b.x)/2,0.07,
     (a.z+b.z)/2,route.width,0.12,length+0.5,surfaces.road);
   segment.rotation.y=angle;segment.castShadow=false;
   const marks=Math.max(0,Math.floor(length/46));
   for(let n=0;n<marks;n++){
    const t=(n+0.5)/marks;
    const dash=cube(group,'RH_line_'+route.id+'_'+i+'_'+n,
      a.x+dx*t,0.144,a.z+dz*t,0.22,0.018,5,surfaces.paint);
    dash.rotation.y=angle;dash.castShadow=false;
   }
   segments++;
  }
 }
 return segments;
}
function building(group,site,colliders){
 const w=site.w,d=site.d;
 const tower=['legacy-prep','rich-hills-police','legacy-apartments'].includes(site.id);
 const h=tower?17:['crownline-motors','summit-yacht-club'].includes(site.id)?11:8.4;
 const m=material(site.color||'#d8c9a7');
 cube(group,'RH_'+site.id+'_floor',site.x,0.11,site.z,w+8,0.2,d+8,surfaces.marble);
 cube(group,'RH_'+site.id+'_building',site.x,h/2,site.z,w,h,d,m,true,colliders);
 cube(group,'RH_'+site.id+'_roof',site.x,h+0.55,site.z,w+1.5,1.1,d+1.5,surfaces.roof);
 cube(group,'RH_'+site.id+'_entrance',site.x,2.2,site.z+d/2+0.16,3.7,4.4,0.3,surfaces.glass);
 for(const side of [-1,1])for(let level=0;level<(tower?3:1);level++)
  cube(group,'RH_window_'+site.id+'_'+side+'_'+level,site.x+side*w*.27,4+level*4.1,
   site.z+d/2+0.15,5.2,2,0.18,surfaces.glass);
 const label=signText(site.name);label.position.set(site.x,h+4.4,site.z+d/2+3);
 group.add(label);
}
function scenicRoadside(group){
 // Gateway arch spans the boulevard without putting posts in the traffic lanes.
 for(const side of [-1,1])
  cube(group,'RH_entry_pillar_'+side,4150,7,side*21,4,14,4,surfaces.stone);
 cube(group,'RH_entry_arch',4150,15,0,4.5,3.2,45,surfaces.gold);
 const sign=signText('WELCOME TO RICH HILLS');sign.position.set(4150,19,0);group.add(sign);
 // Gardens & fountain near Civic Crest, outside the actual road footprints.
 cube(group,'RH_garden_lawn',5040,-.07,690,240,.17,165,surfaces.darkGrass);
 const base=new THREE.Mesh(new THREE.CylinderGeometry(12,12,1.1,24),surfaces.marble);
 base.position.set(5050,.52,680);group.add(base);
 const fountain=new THREE.Mesh(new THREE.CylinderGeometry(6,6,.22,24),surfaces.marina);
 fountain.position.set(5050,1.2,680);group.add(fountain);
 const statue=new THREE.Mesh(new THREE.CylinderGeometry(1.4,2,8,12),surfaces.gold);
 statue.position.set(5050,5.2,680);group.add(statue);
 // Country club greens and a visible three-hole practice course.
 cube(group,'RH_golf_practice_lawn',4910,-.035,-680,250,.12,210,surfaces.darkGrass);
 for(let i=0;i<3;i++){
  const x=4860+i*55,z=-705-i*25;
  const green=new THREE.Mesh(new THREE.CircleGeometry(17,32),material('#9abd75'));
  green.rotation.x=-Math.PI/2;green.position.set(x,.062,z);group.add(green);
  const flag=cube(group,'RH_golf_flag_'+i,x,3,z,0.16,6,0.16,surfaces.marble);
  flag.castShadow=false;
  cube(group,'RH_golf_banner_'+i,x+1.5,5,z,3,1.9,.2,
    material(['#f0c36e','#cbe9ee','#eac69e'][i]));
 }
 // Terrace gardens/estate ridge silhouettes remain clear of driveable lanes.
 for(let i=0;i<4;i++){
  const x=5750+i*145,z=-1140;
  const ground=cube(group,'RH_upper_hill_'+i,x,2+i%2,z,140,4+i%2*2,87,surfaces.lawn);
  ground.castShadow=false;
 }
}
function buildMarina(group){
 const lake=new THREE.Mesh(new THREE.PlaneGeometry(
  MARINA_WATER.maxX-MARINA_WATER.minX,MARINA_WATER.maxZ-MARINA_WATER.minZ),
  new THREE.MeshStandardMaterial({color:'#4d8396',metalness:0.15,roughness:0.32,
   transparent:true,opacity:0.91,side:THREE.DoubleSide}));
 lake.rotation.x=-Math.PI/2;
 lake.position.set((MARINA_WATER.minX+MARINA_WATER.maxX)/2,.045,
  (MARINA_WATER.minZ+MARINA_WATER.maxZ)/2);
 lake.name='RH_marina_basin';group.add(lake);
 // East land promenade and two actual walkable finger piers into the basin.
 cube(group,'RH_marina_prom',4417,0.12,-910,24,.24,370,surfaces.deck);
 for(let i=0;i<3;i++){
  const z=-790-i*112;
  cube(group,'RH_marina_pier_'+i,4280,0.15,z,275,.25,17,surfaces.deck);
  for(let n=0;n<6;n++){
   const x=4410-n*44;
   for(const side of [-1,1])
    cube(group,'RH_marina_pile_'+i+'_'+n+'_'+side,x,-0.72,z+side*7,
      1.5,1.8,1.5,surfaces.trunk);
  }
  // Moored yachts are scenery until a separate boating controls pass.
  for(let side=0;side<2;side++){
   const x=4320-side*83;
   const boat=new THREE.Group();boat.name='RH_moored_yacht_'+i+'_'+side;
   boat.position.set(x,0,z+(side?25:-25));
   cube(boat,'RH_yacht_hull',0,0,0,14,2.1,7,surfaces.cream);
   cube(boat,'RH_yacht_cabin',-1.2,1.8,0,6,2.5,5,surfaces.glass);
   group.add(boat);
  }
 }
}
function workersAndHomes(group,colliders){
 const workerColors=['#b3b8b5','#c3b8a8','#acb7ae','#d1c6b6'];
 const luxuryColors=['#ded2ba','#ede2cb','#d7c6a9','#dcd5ca'];
 let workerHousing=0,estates=0;
 // Density follows a street-safe sampling grid. Buildings never override
 // playable road clearance even to satisfy a desired house count.
 for(let iz=0;iz<16;iz++)for(let ix=0;ix<19;ix++){
  const x=4080+ix*123,z=-1080+iz*142;
  const estate=(x>5450 && z<0);
  if(z>1160||x>6340)continue;
  if(x>4090&&x<4470&&z<-680)continue; // protected marina
  const w=estate?43:29,d=estate?33:24;
  if(!roadFootprintClear(x,z,w,d,9))continue;
  if(RICH_HILLS_SITES.some(site=>Math.abs(x-site.x)<(site.w+w)/2+29&&
    Math.abs(z-site.z)<(site.d+d)/2+28))continue;
  if(estate && estates>=27 || !estate && workerHousing>=65)continue;
  const id=estate?estates++:workerHousing++;
  const h=estate?11.8:6.4+(iz%3)*1.6;
  const color=material((estate?luxuryColors:workerColors)[(ix+iz)%4]);
  cube(group,'RH_'+(estate?'estate':'home')+'_'+id,x,h/2,z,w,h,d,color,true,colliders);
  cube(group,'RH_roof_'+(estate?'estate':'home')+'_'+id,x,h+.7,z,w+2,1.4,d+2,estate?surfaces.roof:surfaces.service);
  if(estate){
   for(const side of [-1,1])
    cube(group,'RH_hedge_'+id+'_'+side,x+side*(w/2+4),1.6,z,3,3.2,d+6,surfaces.hedge);
  }
 }
 return {workerHousing,estates};
}
function plantTrees(group){
 const positions=[];
 for(let i=0;i<17;i++)for(let j=0;j<20;j++){
  const x=4065+j*112,z=-1110+i*136;
  if(x>6380||z>1140)continue;
  if(!roadFootprintClear(x,z,9,9,7))continue;
  if(x>4000&&x<4480&&z<-680)continue;
  if(RICH_HILLS_SITES.some(s=>Math.abs(s.x-x)<s.w/2+18&&Math.abs(s.z-z)<s.d/2+18))continue;
  positions.push({x,z});if(positions.length>=190)break;
 }
 const trunk=new THREE.InstancedMesh(new THREE.CylinderGeometry(.5,.66,6,6),
  surfaces.trunk,positions.length);
 const top=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(4.9,0),
  surfaces.hedge,positions.length);
 const dummy=new THREE.Object3D();
 positions.forEach((p,i)=>{
  dummy.position.set(p.x,3,p.z);dummy.updateMatrix();trunk.setMatrixAt(i,dummy.matrix);
  dummy.position.y=8.5;dummy.updateMatrix();top.setMatrixAt(i,dummy.matrix);
 });
 trunk.count=positions.length;top.count=positions.length;
 trunk.instanceMatrix.needsUpdate=true;top.instanceMatrix.needsUpdate=true;
 trunk.name='RH_instanced_tree_trunks';top.name='RH_instanced_tree_canopies';
 group.add(trunk,top);
 return positions.length;
}
function livingResidents(group){
 const people=[];
 const colors=['#be8b63','#87aeb4','#d1b36e','#c48274','#a2aa91'];
 for(let i=0;i<20;i++){
  const x=4620+(i%10)*167,z=320+Math.floor(i/10)*520;
  if(x>6320||!roadFootprintClear(x,z,2,2,7))continue;
  const avatar=new THREE.Group();avatar.name='RH_resident_'+i;
  cube(avatar,'shirt',0,1.3,0,1,1.3,.6,material(colors[i%colors.length]));
  const head=new THREE.Mesh(new THREE.SphereGeometry(.32,9,7),
    material(['#91664a','#d2a581','#624334','#c3a07f'][i%4]));
  head.position.y=2.25;avatar.add(head);
  cube(avatar,'legs',0,.5,0,.55,.9,.5,surfaces.service);
  avatar.position.set(x,0,z);group.add(avatar);
  people.push({avatar,phase:i*1.2,z});
 }
 return people;
}
export function buildRichHills(scene){
 const group=new THREE.Group();group.name='ZW_RichHills_Playable_v1';
 // 3km link to Starter Town is real terrain, not a painted map connection.
 cube(group,'RH_parkway_land',2600,-.19,0,3000,.28,225,surfaces.lawn);
 cube(group,'RH_town_land',5200,-.18,0,2400,.27,2400,surfaces.lawn);
 const segments=surfaceRoads(group);
 const colliders=[];
 for(const site of RICH_HILLS_SITES)building(group,site,colliders);
 scenicRoadside(group);buildMarina(group);
 const homes=workersAndHomes(group,colliders);
 const trees=plantTrees(group);
 const people=livingResidents(group);
 let time=0;
 const update=dt=>{
  time+=Math.min(.05,Math.max(0,dt));
  for(const p of people){
   p.avatar.position.z=p.z+Math.sin(time*.6+p.phase)*4;
   p.avatar.rotation.y=Math.sin(time*.6+p.phase)>0?Math.PI:0;
  }
 };
 function nearestAction(position,radius=29){
  if(!position)return null;
  let choice=null,dist=Infinity;
  for(const action of RICH_HILLS_SITES){
   const distance=Math.hypot(position.x-action.x,position.z-action.z);
   const reach=Math.max(radius,(action.w||30)/2+10);
   if(distance<=reach && distance<dist){choice=action;dist=distance;}
  }
  return choice;
 }
 group.userData.report={id:'rich-hills',playable:true,streetSegments:segments,
  namedSites:RICH_HILLS_SITES.length,trees,residents:people.length,...homes,
  golf:true,marinaPiers:3};
 scene.add(group);
 return {group,colliders,nearestAction,update,report:group.userData.report};
}
