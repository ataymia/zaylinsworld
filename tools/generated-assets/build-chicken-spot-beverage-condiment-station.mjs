import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const OUT = 'public/assets/models/props/starter-town/chicken-spot/prop_chicken_spot_beverage_condiment_station_v02.glb';
const META = 'public/assets/models/props/starter-town/chicken-spot/prop_chicken_spot_beverage_condiment_station_v02.meta.json';
const INDEX = 'public/assets/models/asset-index-v2.json';

const materials = [];
const materialMap = new Map();
function material(name, color, metallic = 0, roughness = 0.5, emissive = null) {
  const key = JSON.stringify([name,color,metallic,roughness,emissive]);
  if (materialMap.has(key)) return materialMap.get(key);
  const def = { name, pbrMetallicRoughness: { baseColorFactor: [...color,1], metallicFactor: metallic, roughnessFactor: roughness } };
  if (emissive) def.emissiveFactor = emissive;
  const index = materials.length;
  materials.push(def);
  materialMap.set(key,index);
  return index;
}

const M = {
  red: material('ChickenSpot_Red',[0.64,0.035,0.024],0.06,0.34),
  redDark: material('ChickenSpot_Red_Dark',[0.27,0.018,0.016],0.08,0.42),
  gold: material('ChickenSpot_Gold',[0.94,0.57,0.07],0.10,0.28),
  charcoal: material('Station_Charcoal',[0.045,0.052,0.061],0.28,0.30),
  black: material('Station_Black',[0.014,0.018,0.022],0.15,0.48),
  steel: material('Brushed_Stainless',[0.57,0.62,0.67],0.90,0.25),
  steelLight: material('Polished_Stainless',[0.80,0.84,0.87],0.96,0.16),
  steelDark: material('Dark_Stainless',[0.19,0.22,0.26],0.84,0.30),
  white: material('Cup_White',[0.91,0.92,0.90],0,0.64),
  paper: material('Napkin_Paper',[0.94,0.93,0.88],0,0.78),
  rubber: material('Rubber_Black',[0.018,0.021,0.024],0,0.82),
  ketchup: material('Ketchup_Red',[0.79,0.025,0.015],0,0.38),
  mustard: material('Mustard_Yellow',[0.97,0.62,0.045],0,0.38),
  ranch: material('Ranch_Cream',[0.91,0.87,0.73],0,0.46),
  hot: material('Hot_Sauce_Orange',[0.95,0.16,0.018],0,0.34),
  blue: material('Status_Blue',[0.035,0.50,0.82],0.02,0.18,[0,0.18,0.35]),
  green: material('Status_Green',[0.035,0.76,0.16],0.02,0.18,[0,0.30,0.04]),
  ice: material('Ice_Opaque',[0.68,0.84,0.91],0,0.18),
  cola: material('Cola_Badge',[0.42,0.035,0.020],0,0.34),
  diet: material('Diet_Badge',[0.66,0.67,0.70],0,0.30),
  lime: material('LemonLime_Badge',[0.39,0.74,0.055],0,0.32),
  orange: material('Orange_Badge',[0.96,0.28,0.025],0,0.32),
  root: material('RootBeer_Badge',[0.30,0.105,0.035],0,0.36),
  tea: material('Tea_Badge',[0.55,0.25,0.055],0,0.36),
};

const parts = [];
function boxGeo(w,h,d) {
  const x=w/2,y=h/2,z=d/2;
  const faces=[
    [[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z],[0,0,1]],
    [[x,-y,-z],[-x,-y,-z],[-x,y,-z],[x,y,-z],[0,0,-1]],
    [[x,-y,z],[x,-y,-z],[x,y,-z],[x,y,z],[1,0,0]],
    [[-x,-y,-z],[-x,-y,z],[-x,y,z],[-x,y,-z],[-1,0,0]],
    [[-x,y,z],[x,y,z],[x,y,-z],[-x,y,-z],[0,1,0]],
    [[-x,-y,-z],[x,-y,-z],[x,-y,z],[-x,-y,z],[0,-1,0]],
  ];
  const positions=[],normals=[],indices=[]; let i=0;
  for (const f of faces) { for (let k=0;k<4;k++){positions.push(...f[k]);normals.push(...f[4]);} indices.push(i,i+1,i+2,i,i+2,i+3); i+=4; }
  return {positions,normals,indices};
}
function cylGeo(radius,height,segments=16) {
  const positions=[],normals=[],indices=[]; const y0=-height/2,y1=height/2; let base=0;
  for(let i=0;i<segments;i++){
    const a0=i/segments*Math.PI*2,a1=(i+1)/segments*Math.PI*2;
    const c0=Math.cos(a0),s0=Math.sin(a0),c1=Math.cos(a1),s1=Math.sin(a1);
    positions.push(c0*radius,y0,s0*radius,c1*radius,y0,s1*radius,c1*radius,y1,s1*radius,c0*radius,y1,s0*radius);
    normals.push(c0,0,s0,c1,0,s1,c1,0,s1,c0,0,s0);
    indices.push(base,base+1,base+2,base,base+2,base+3); base+=4;
  }
  for(const [y,dir] of [[y1,1],[y0,-1]]){
    const center=base; positions.push(0,y,0); normals.push(0,dir,0); base++;
    for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;positions.push(Math.cos(a)*radius,y,Math.sin(a)*radius);normals.push(0,dir,0);base++;}
    for(let i=0;i<segments;i++){if(dir>0)indices.push(center,center+1+i,center+2+i);else indices.push(center,center+2+i,center+1+i);}
  }
  return {positions,normals,indices};
}
function transformGeo(geo, center, rotation=[0,0,0]) {
  const [rx,ry,rz]=rotation; const cx=Math.cos(rx),sx=Math.sin(rx),cy=Math.cos(ry),sy=Math.sin(ry),cz=Math.cos(rz),sz=Math.sin(rz);
  function rot(v){let [x,y,z]=v; let y1=y*cx-z*sx,z1=y*sx+z*cx;y=y1;z=z1;let x1=x*cy+z*sy,z2=-x*sy+z*cy;x=x1;z=z2;let x2=x*cz-y*sz,y2=x*sz+y*cz;return[x2+center[0],y2+center[1],z+center[2]];}
  function rotN(v){const p=rot(v);return[p[0]-center[0],p[1]-center[1],p[2]-center[2]];}
  const positions=[]; for(let i=0;i<geo.positions.length;i+=3)positions.push(...rot(geo.positions.slice(i,i+3)));
  const normals=[]; for(let i=0;i<geo.normals.length;i+=3){const n=rotN(geo.normals.slice(i,i+3));const l=Math.hypot(...n)||1;normals.push(n[0]/l,n[1]/l,n[2]/l);}
  return {positions,normals,indices:geo.indices};
}
function addBox(name,center,size,mat,rotation=[0,0,0]){parts.push({name,mat,...transformGeo(boxGeo(...size),center,rotation)});}
function addCyl(name,center,radius,height,mat,axis='y',segments=16){const rotation=axis==='x'?[0,0,Math.PI/2]:axis==='z'?[Math.PI/2,0,0]:[0,0,0];parts.push({name,mat,...transformGeo(cylGeo(radius,height,segments),center,rotation)});}
function addRod(name,a,b,radius,mat){const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],len=Math.hypot(dx,dy,dz);const yaw=Math.atan2(dx,dz),pitch=-Math.atan2(dy,Math.hypot(dx,dz))+Math.PI/2;parts.push({name,mat,...transformGeo(cylGeo(radius,len,12),[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2],[pitch,yaw,0])});}

const FONT={
 A:['01110','10001','10001','11111','10001','10001','10001'],B:['11110','10001','10001','11110','10001','10001','11110'],C:['01111','10000','10000','10000','10000','10000','01111'],D:['11110','10001','10001','10001','10001','10001','11110'],E:['11111','10000','10000','11110','10000','10000','11111'],F:['11111','10000','10000','11110','10000','10000','10000'],G:['01111','10000','10000','10111','10001','10001','01111'],H:['10001','10001','10001','11111','10001','10001','10001'],I:['11111','00100','00100','00100','00100','00100','11111'],J:['00111','00010','00010','00010','10010','10010','01100'],K:['10001','10010','10100','11000','10100','10010','10001'],L:['10000','10000','10000','10000','10000','10000','11111'],M:['10001','11011','10101','10101','10001','10001','10001'],N:['10001','11001','10101','10011','10001','10001','10001'],O:['01110','10001','10001','10001','10001','10001','01110'],P:['11110','10001','10001','11110','10000','10000','10000'],Q:['01110','10001','10001','10001','10101','10010','01101'],R:['11110','10001','10001','11110','10100','10010','10001'],S:['01111','10000','10000','01110','00001','00001','11110'],T:['11111','00100','00100','00100','00100','00100','00100'],U:['10001','10001','10001','10001','10001','10001','01110'],V:['10001','10001','10001','10001','10001','01010','00100'],W:['10001','10001','10001','10101','10101','11011','10001'],X:['10001','10001','01010','00100','01010','10001','10001'],Y:['10001','10001','01010','00100','00100','00100','00100'],Z:['11111','00001','00010','00100','01000','10000','11111'],' ':['00000','00000','00000','00000','00000','00000','00000']};
function addText(name,text,center,maxWidth,height,mat,zDepth=0.008){text=text.toUpperCase();const charW=5,charGap=1,totalCols=Math.max(1,text.length*(charW+charGap)-charGap);const pixel=Math.min(maxWidth/totalCols,height/7);const startX=center[0]-totalCols*pixel/2;const startY=center[1]+height/2-pixel/2;let n=0;for(let ci=0;ci<text.length;ci++){const glyph=FONT[text[ci]]||FONT[' '];for(let row=0;row<7;row++)for(let col=0;col<5;col++)if(glyph[row][col]==='1'){addBox(`${name}_${n++}`,[startX+(ci*6+col)*pixel,startY-row*pixel,center[2]],[pixel*0.82,pixel*0.82,zDepth],mat);}}}

// Main cabinet and service structure.
addBox('Base_Cabinet',[0,0.42,0],[1.84,0.78,0.72],M.redDark);
addBox('Base_Front_Fascia',[0,0.46,0.371],[1.72,0.62,0.034],M.red);
addBox('Countertop_Core',[0,0.845,0],[1.92,0.10,0.82],M.charcoal);
addBox('Countertop_Edge_Front',[0,0.865,0.425],[1.94,0.055,0.045],M.gold);
addBox('Backsplash',[0,1.28,-0.382],[1.88,0.82,0.055],M.steel);
addBox('Top_Marquee_Housing',[0,1.91,-0.15],[1.92,0.20,0.26],M.charcoal);
addBox('Marquee_Face',[0,1.91,-0.011],[1.73,0.15,0.012],M.red);
addText('Marquee_Text','DRINKS SAUCES',[0,1.91,-0.003],1.45,0.10,M.white);
for(const [i,x] of [-0.62,0,0.62].entries()){addBox(`Base_Door_${i}`,[x,0.46,0.393],[0.52,0.54,0.025],M.steel);addRod(`Base_Door_Handle_${i}`,[x-0.11,0.64,0.423],[x+0.11,0.64,0.423],0.010,M.black);}
addBox('Toe_Kick',[0,0.105,0.35],[1.72,0.14,0.05],M.black);
for(const x of [-0.76,-0.25,0.25,0.76])for(const z of [-0.27,0.27])addCyl(`Foot_${x}_${z}`,[x,0.035,z],0.032,0.07,M.rubber,'y',14);
addBox('Rear_Service_Panel',[0,0.44,-0.374],[1.50,0.56,0.026],M.steelDark);
for(let j=0;j<7;j++)addBox(`Rear_Vent_${j}`,[0.36,0.28+j*0.052,-0.391],[0.54,0.017,0.010],M.black);
addCyl('Water_Inlet',[-0.55,0.27,-0.405],0.038,0.030,M.blue,'z');addCyl('Drain_Outlet',[-0.37,0.27,-0.405],0.038,0.030,M.steelLight,'z');

// Fountain housing and six readable drink heads.
addBox('Fountain_Housing',[-0.15,1.31,-0.08],[1.12,0.82,0.50],M.charcoal);
addBox('Fountain_Faceplate',[-0.15,1.34,0.184],[1.04,0.67,0.035],M.steelDark);
addBox('Fountain_Top_Cap',[-0.15,1.755,-0.08],[1.16,0.07,0.54],M.red);
addBox('Fountain_Gold_Trim',[-0.15,1.775,0.18],[1.15,0.040,0.055],M.gold);
const flavors=[['Cola',-0.58,M.cola,'COLA'],['Diet',-0.41,M.diet,'DIET'],['LemonLime',-0.24,M.lime,'LEMON LIME'],['Orange',-0.07,M.orange,'ORANGE'],['RootBeer',0.10,M.root,'ROOT BEER'],['SweetTea',0.27,M.tea,'SWEET TEA']];
for(const [name,x,badge,label] of flavors){addBox(`Flavor_${name}_Badge_Housing`,[x,1.56,0.221],[0.145,0.17,0.055],M.black);addBox(`Flavor_${name}_Badge_Color`,[x,1.56,0.252],[0.126,0.148,0.014],badge);addText(`Flavor_${name}_Label`,label,[x,1.56,0.262],0.108,0.115,M.white,0.006);addBox(`Nozzle_${name}_Body`,[x,1.37,0.248],[0.095,0.14,0.09],M.black);addCyl(`Nozzle_${name}`,[x,1.245,0.268],0.016,0.115,M.steelLight,'y',14);addBox(`Lever_${name}`,[x,1.155,0.288],[0.055,0.105,0.025],M.rubber);addCyl(`Nozzle_${name}_Status`,[x+0.045,1.43,0.300],0.010,0.012,M.green,'z',12);}
addBox('Ice_Chute_Housing',[0.25,1.075,0.225],[0.30,0.25,0.16],M.steel);addBox('Ice_Chute_Opening',[0.25,1.075,0.312],[0.22,0.14,0.020],M.black);addText('Ice_Label','ICE',[0.25,1.205,0.323],0.14,0.055,M.white,0.006);
for(const [i,p] of [[0,[-0.05,0.02]],[1,[0.02,-0.01]],[2,[0.06,0.04]],[3,[-0.01,0.055]]])addBox(`Ice_Cube_${i}`,[0.25+p[0],0.99+p[1],0.315],[0.045,0.045,0.030],M.ice);
addBox('Drip_Tray_Base',[-0.15,0.955,0.22],[1.04,0.075,0.39],M.steelDark);addBox('Drip_Tray_Inset',[-0.15,0.990,0.22],[0.96,0.025,0.33],M.black);
for(let j=0;j<9;j++)addRod(`Drip_Grate_Rail_${j}`,[-0.60,1.010,0.08+j*0.035],[0.30,1.010,0.08+j*0.035],0.006,M.steelLight);

// Condiment bins and pumps.
addBox('Condiment_Section_Base',[-0.73,1.12,0.02],[0.38,0.50,0.58],M.steel);addBox('Condiment_Section_Back',[-0.73,1.42,-0.25],[0.40,0.62,0.045],M.charcoal);addBox('Condiment_Shelf',[-0.73,1.36,-0.02],[0.40,0.045,0.48],M.steelLight);
const bins=[['Ketchup',-0.845,1.16,M.ketchup,'KETCHUP'],['Mustard',-0.615,1.16,M.mustard,'MUSTARD'],['HotSauce',-0.845,1.49,M.hot,'HOT SAUCE'],['Ranch',-0.615,1.49,M.ranch,'RANCH']];
for(const [name,x,y,color,label] of bins){addBox(`Packet_Bin_${name}`,[x,y,0.16],[0.20,0.22,0.28],M.charcoal);addBox(`Packet_Bin_${name}_Interior`,[x,y+0.025,0.215],[0.16,0.15,0.16],color);addBox(`Packet_Bin_${name}_Lip`,[x,y-0.09,0.312],[0.20,0.055,0.035],M.steelDark);addText(`Packet_Bin_${name}_Label`,label,[x,y-0.09,0.333],0.15,0.040,M.white,0.005);}
for(const [name,x,color] of [['Ketchup',-0.84,M.ketchup],['Mustard',-0.73,M.mustard],['Ranch',-0.62,M.ranch]]){addCyl(`Pump_${name}_Bottle`,[x,1.67,-0.07],0.045,0.19,color,'y',18);addCyl(`Pump_${name}_Cap`,[x,1.78,-0.07],0.032,0.035,M.black,'y',14);addRod(`Condiment_Pump_${name}`,[x,1.80,-0.07],[x+0.065,1.80,-0.07],0.008,M.black);}

// Cups, lids, straws and napkins.
addBox('Cup_Section_Back',[0.64,1.39,-0.25],[0.48,0.72,0.045],M.charcoal);addBox('Cup_Section_Shelf',[0.64,1.18,-0.04],[0.48,0.045,0.46],M.steelLight);
for(const [name,x,r] of [['Small',0.48,0.062],['Medium',0.64,0.072],['Large',0.80,0.082]]){addCyl(`Cup_Dispenser_${name}_Tube`,[x,1.53,-0.11],r+0.018,0.52,M.steelDark,'y',22);for(let j=0;j<5;j++){const y=1.34+j*0.072;addCyl(`Cup_${name}_${j}`,[x,y,-0.105],r,0.10,M.white,'y',22);addCyl(`Cup_${name}_${j}_Band`,[x,y+0.020,-0.105],r+0.003,0.018,M.red,'y',22);}addCyl(`Cup_Dispenser_${name}_Ring`,[x,1.245,-0.105],r+0.022,0.035,M.steelLight,'y',22);addText(`Cup_Size_${name}_Label`,name[0],[x,1.215,0.016],0.055,0.050,M.white,0.005);}
addBox('Lid_Organizer',[0.64,1.03,0.14],[0.44,0.22,0.28],M.charcoal);for(const [name,x,r] of [['Small',0.50,0.054],['Medium',0.64,0.064],['Large',0.78,0.074]]){addCyl(`Lid_Stack_${name}`,[x,1.08,0.285],r,0.055,M.black,'z',22);addCyl(`Lid_Rim_${name}`,[x,1.08,0.315],r+0.006,0.012,M.steelLight,'z',22);}
for(let i=0;i<3;i++){const x=0.52+i*0.12;addCyl(`Straw_Bin_${i}`,[x,1.29,0.12],0.035,0.19,i%2?M.gold:M.red,'y',16);for(let j=0;j<3;j++)addRod(`Straw_${i}_${j}`,[x-0.012+j*0.012,1.35,0.12],[x-0.012+j*0.012,1.58,0.12],0.004,M.paper);}
addBox('Napkin_Dispenser',[0.64,0.955,0.26],[0.38,0.19,0.18],M.charcoal);addBox('Napkin_Slot',[0.64,0.955,0.357],[0.22,0.055,0.010],M.paper);addText('Napkins_Label','NAPKINS',[0.64,1.045,0.359],0.19,0.045,M.white,0.005);

// Trash, rear service and finishing details.
addBox('Trash_Chute_Housing',[-0.44,0.43,0.411],[0.42,0.30,0.05],M.charcoal);addBox('Trash_Chute',[-0.44,0.43,0.443],[0.30,0.18,0.025],M.black);addText('Trash_Label','TRASH',[-0.44,0.61,0.431],0.18,0.050,M.white,0.005);addRod('Trash_Flap_Hinge',[-0.58,0.51,0.458],[-0.30,0.51,0.458],0.009,M.steelLight);
addBox('Sanitizer_Bracket',[0.90,1.18,-0.26],[0.08,0.24,0.07],M.steelDark);addCyl('Sanitizer_Bottle',[0.90,1.31,-0.21],0.036,0.16,M.blue,'y',16);addBox('Sanitizer_Pump_Head',[0.90,1.405,-0.21],[0.11,0.026,0.035],M.black);
for(const x of [-0.935,0.935])addBox(`Side_Protector_${x}`,[x,0.70,0],[0.045,1.28,0.70],M.steelDark);

// glTF/GLB writer.
const chunks=[]; let byteOffset=0; const bufferViews=[],accessors=[],meshes=[],nodes=[];
function align4(n){return (n+3)&~3;}
function appendBuffer(buffer,target){const aligned=align4(byteOffset);if(aligned>byteOffset)chunks.push(Buffer.alloc(aligned-byteOffset));byteOffset=aligned;const view=bufferViews.length;bufferViews.push({buffer:0,byteOffset,byteLength:buffer.length,target});chunks.push(buffer);byteOffset+=buffer.length;return view;}
function accessorForFloat(values,type,min,max){const arr=Float32Array.from(values);const view=appendBuffer(Buffer.from(arr.buffer),34962);const acc=accessors.length;accessors.push({bufferView:view,componentType:5126,count:values.length/(type==='VEC3'?3:2),type,min,max});return acc;}
function accessorForIndices(values){const max=Math.max(...values);const Arr=max<65535?Uint16Array:Uint32Array;const componentType=max<65535?5123:5125;const arr=Arr.from(values);const view=appendBuffer(Buffer.from(arr.buffer),34963);const acc=accessors.length;accessors.push({bufferView:view,componentType,count:values.length,type:'SCALAR',min:[Math.min(...values)],max:[max]});return acc;}
for(const part of parts){const pos=part.positions;const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<pos.length;i+=3)for(let k=0;k<3;k++){min[k]=Math.min(min[k],pos[i+k]);max[k]=Math.max(max[k],pos[i+k]);}const p=accessorForFloat(pos,'VEC3',min,max),n=accessorForFloat(part.normals,'VEC3'),idx=accessorForIndices(part.indices);const meshIndex=meshes.length;meshes.push({name:part.name,primitives:[{attributes:{POSITION:p,NORMAL:n},indices:idx,material:part.mat}]});nodes.push({name:part.name,mesh:meshIndex});}
const bin=Buffer.concat(chunks);const gltf={asset:{version:'2.0',generator:'Zaylins Asset Lab'},scene:0,scenes:[{nodes:nodes.map((_,i)=>i),extras:{asset_id:'prop_chicken_spot_beverage_condiment_station_v02',display_name:'Chicken Spot Beverage & Condiment Station',units:'meters',up_axis:'Y',forward_axis:'+Z',pivot:'ground-center'}}],nodes,meshes,materials,buffers:[{byteLength:bin.length}],bufferViews,accessors};
let json=Buffer.from(JSON.stringify(gltf));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,0x20)]);const paddedBin=Buffer.concat([bin,Buffer.alloc((4-bin.length%4)%4)]);const header=Buffer.alloc(12);header.write('glTF',0);header.writeUInt32LE(2,4);header.writeUInt32LE(12+8+json.length+8+paddedBin.length,8);const jh=Buffer.alloc(8);jh.writeUInt32LE(json.length,0);jh.write('JSON',4);const bh=Buffer.alloc(8);bh.writeUInt32LE(paddedBin.length,0);bh.write('BIN\0',4);mkdirSync(dirname(OUT),{recursive:true});writeFileSync(OUT,Buffer.concat([header,jh,json,bh,paddedBin]));

const meta={asset_id:'prop_chicken_spot_beverage_condiment_station_v02',display_name:'Chicken Spot Beverage & Condiment Station',category:'restaurant_service_station',town:'Starter Town',district:'Dreamdrop District',location:'Chicken Spot dining area',format:'glb',units:'meters',up_axis:'Y',forward_axis:'+Z',dimensions_m:{width:1.94,height:2.006,depth:0.909},pivot:'ground-center',triangle_count:parts.reduce((n,p)=>n+p.indices.length/3,0),component_meshes:parts.length,collision_plan:['base cabinet box','fountain housing box','left condiment module box','right cup module box'],interaction_plan:{station_id:'chicken-spot-beverage-condiments',actions:['dispense six drink flavors','dispense ice','take small, medium or large cup','take lid and straw','take napkins','use ketchup, mustard or ranch pump','take sauce packets','discard trash'],nodes:['Nozzle_Cola','Nozzle_Diet','Nozzle_LemonLime','Nozzle_Orange','Nozzle_RootBeer','Nozzle_SweetTea','Ice_Chute_Opening','Cup_Dispenser_Small_Tube','Cup_Dispenser_Medium_Tube','Cup_Dispenser_Large_Tube','Condiment_Pump_Ketchup','Condiment_Pump_Mustard','Condiment_Pump_Ranch','Trash_Chute']},approval_status:'APPROVED'};writeFileSync(META,JSON.stringify(meta,null,2));

try{const index=JSON.parse(readFileSync(INDEX,'utf8'));const entry={id:meta.asset_id,name:meta.display_name,path:'props/starter-town/chicken-spot/prop_chicken_spot_beverage_condiment_station_v02.glb',category:meta.category,town:meta.town,district:meta.district,approved:true,dimensions:meta.dimensions_m,interaction:meta.interaction_plan.station_id};const list=Array.isArray(index)?index:Array.isArray(index.assets)?index.assets:Array.isArray(index.models)?index.models:(index.assets=[]);const at=list.findIndex(v=>v.id===entry.id||v.path===entry.path);if(at>=0)list[at]=entry;else list.push(entry);writeFileSync(INDEX,JSON.stringify(index,null,2)+'\n');}catch(error){console.warn('Asset index update skipped:',error.message);}
console.log(`Generated ${OUT} with ${parts.length} named meshes.`);
