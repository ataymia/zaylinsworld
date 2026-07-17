import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { deflateSync } from 'node:zlib';

const ASSET_ID = 'prop_chicken_spot_triple_digital_menu_v01';
const OUT_DIR = 'public/assets/models/props/starter-town/chicken-spot';
const OUT_PATH = `${OUT_DIR}/${ASSET_ID}.glb`;
const META_PATH = `${OUT_DIR}/${ASSET_ID}.meta.json`;
const INDEX_PATH = 'public/assets/models/asset-index-v2.json';

const FONT = {
  'A':['01110','10001','10001','11111','10001','10001','10001'],
  'B':['11110','10001','10001','11110','10001','10001','11110'],
  'C':['01111','10000','10000','10000','10000','10000','01111'],
  'D':['11110','10001','10001','10001','10001','10001','11110'],
  'E':['11111','10000','10000','11110','10000','10000','11111'],
  'F':['11111','10000','10000','11110','10000','10000','10000'],
  'G':['01111','10000','10000','10111','10001','10001','01111'],
  'H':['10001','10001','10001','11111','10001','10001','10001'],
  'I':['11111','00100','00100','00100','00100','00100','11111'],
  'J':['00111','00010','00010','00010','10010','10010','01100'],
  'K':['10001','10010','10100','11000','10100','10010','10001'],
  'L':['10000','10000','10000','10000','10000','10000','11111'],
  'M':['10001','11011','10101','10101','10001','10001','10001'],
  'N':['10001','11001','10101','10011','10001','10001','10001'],
  'O':['01110','10001','10001','10001','10001','10001','01110'],
  'P':['11110','10001','10001','11110','10000','10000','10000'],
  'Q':['01110','10001','10001','10001','10101','10010','01101'],
  'R':['11110','10001','10001','11110','10100','10010','10001'],
  'S':['01111','10000','10000','01110','00001','00001','11110'],
  'T':['11111','00100','00100','00100','00100','00100','00100'],
  'U':['10001','10001','10001','10001','10001','10001','01110'],
  'V':['10001','10001','10001','10001','10001','01010','00100'],
  'W':['10001','10001','10001','10101','10101','11011','10001'],
  'X':['10001','10001','01010','00100','01010','10001','10001'],
  'Y':['10001','10001','01010','00100','00100','00100','00100'],
  'Z':['11111','00001','00010','00100','01000','10000','11111'],
  '0':['01110','10001','10011','10101','11001','10001','01110'],
  '1':['00100','01100','00100','00100','00100','00100','01110'],
  '2':['01110','10001','00001','00010','00100','01000','11111'],
  '3':['11110','00001','00001','01110','00001','00001','11110'],
  '4':['00010','00110','01010','10010','11111','00010','00010'],
  '5':['11111','10000','10000','11110','00001','00001','11110'],
  '6':['01110','10000','10000','11110','10001','10001','01110'],
  '7':['11111','00001','00010','00100','01000','01000','01000'],
  '8':['01110','10001','10001','01110','10001','10001','01110'],
  '9':['01110','10001','10001','01111','00001','00001','01110'],
  '$':['00100','01111','10100','01110','00101','11110','00100'],
  '&':['01100','10010','10100','01000','10101','10010','01101'],
  '.':['00000','00000','00000','00000','00000','00110','00110'],
  '-':['00000','00000','00000','11111','00000','00000','00000'],
  '/':['00001','00010','00100','01000','10000','00000','00000'],
  ' ':['00000','00000','00000','00000','00000','00000','00000'],
};

const W = 1536, H = 768;
const px = new Uint8Array(W * H * 4);
function rgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n>>16)&255,(n>>8)&255,n&255,255]; }
const C = {
  bg:rgb('#10161f'), panel:rgb('#18212d'), border:rgb('#3f4a58'), white:rgb('#f3f6fa'), gray:rgb('#aeb8c4'),
  red:rgb('#c82418'), gold:rgb('#f2aa25'), cyan:rgb('#1aa8df'), green:rgb('#78a840'), orange:rgb('#e66a22'),
  chicken:rgb('#b76a25'), chickenDark:rgb('#7f3d12'), fries:rgb('#f0bd39'), cream:rgb('#f1eee5'), black:rgb('#12151a'),
};
function setPixel(x,y,c){x|=0;y|=0;if(x<0||y<0||x>=W||y>=H)return;const i=(y*W+x)*4;px[i]=c[0];px[i+1]=c[1];px[i+2]=c[2];px[i+3]=255;}
function rect(x,y,w,h,c){for(let yy=Math.max(0,y|0);yy<Math.min(H,(y+h)|0);yy++){let i=(yy*W+Math.max(0,x|0))*4;for(let xx=Math.max(0,x|0);xx<Math.min(W,(x+w)|0);xx++){px[i++]=c[0];px[i++]=c[1];px[i++]=c[2];px[i++]=255;}}}
function circle(cx,cy,r,c){const r2=r*r;for(let y=Math.floor(cy-r);y<=Math.ceil(cy+r);y++)for(let x=Math.floor(cx-r);x<=Math.ceil(cx+r);x++)if((x-cx)**2+(y-cy)**2<=r2)setPixel(x,y,c);}
function textWidth(text,scale){return text.length*6*scale-scale;}
function text(x,y,text,scale,c){let ox=x;for(const ch of text.toUpperCase()){const g=FONT[ch]||FONT[' '];for(let row=0;row<7;row++)for(let col=0;col<5;col++)if(g[row][col]==='1')rect(ox+col*scale,y+row*scale,scale,scale,c);ox+=6*scale;}}
function centeredText(x,y,w,label,scale,c){text(x+(w-textWidth(label,scale))/2,y,label,scale,c);}
function badge(x,y,label,color){rect(x,y,95,42,color);centeredText(x,y+9,95,label,3,C.black);}
function header(panelX,label,color,scale=4){rect(panelX+24,24,464,76,color);centeredText(panelX+24,47,464,label,scale,color===C.gold?C.black:C.white);}
function chickenBucket(x,y,s=1){rect(x,y+65*s,150*s,125*s,C.cream);rect(x+18*s,y+102*s,114*s,30*s,C.red);for(const [dx,dy,rr] of [[25,35,30],[68,20,33],[102,42,28],[58,55,32]])circle(x+dx*s,y+dy*s,rr*s,dx%2?C.chicken:C.chickenDark);}
function fries(x,y,s=1){rect(x+12*s,y+55*s,95*s,90*s,C.red);for(let i=0;i<8;i++)rect(x+(20+i*11)*s,y+(8+(i%3)*8)*s,8*s,68*s,C.fries);}
function drink(x,y,s=1){rect(x,y+25*s,78*s,135*s,C.red);rect(x-3*s,y+18*s,84*s,14*s,C.cream);rect(x+54*s,y-12*s,5*s,45*s,C.white);}
function bowl(x,y,s,color){circle(x+50*s,y+55*s,50*s,C.cream);rect(x+3*s,y+45*s,94*s,45*s,C.cream);for(let i=0;i<7;i++)circle(x+(20+i*11)*s,y+(45+(i%2)*8)*s,8*s,color);}
function menuRow(panelX,y,name,price){text(panelX+202,y,name,3,C.white);badge(panelX+390,y-5,price,C.gold);rect(panelX+202,y+31,276,2,C.border);}

rect(0,0,W,H,C.bg);
for(let p=0;p<3;p++){const x=p*512;rect(x+12,12,488,744,C.panel);rect(x+12,12,488,3,C.border);rect(x+12,753,488,3,C.border);}
header(0,'CHICKEN COMBOS',C.red,4);
chickenBucket(45,145,0.9);fries(38,390,0.75);drink(132,390,0.68);
menuRow(0,150,'2 PC COMBO','$9');text(202,180,'2 PIECES FRIES BISCUIT DRINK',2,C.gray);
menuRow(0,270,'3 PC COMBO','$11');text(202,300,'3 PIECES FRIES BISCUIT DRINK',2,C.gray);
menuRow(0,390,'WINGS COMBO','$12');text(202,420,'6 WINGS FRIES DRINK',2,C.gray);
menuRow(0,510,'FAMILY BOX','$20');text(202,540,'8 PIECES 4 BISCUITS',2,C.gray);

header(512,'SIGNATURE CHICKEN',C.gold,4);
rect(548,135,205,490,C.bg);chickenBucket(575,210,1.0);
text(780,150,'CRISPY JUICY HOT',3,C.white);text(780,185,'MADE TO ORDER',2,C.gray);
for(const [i,n,p] of [['2 PC CHICKEN','$6'],['4 PC CHICKEN','$11'],['8 PC CHICKEN','$20'],['12 PC CHICKEN','$28'],['16 WINGS','$19']].map((v,i)=>[i,...v]))menuRow(512,245+i*78,n,p);
rect(782,650,200,56,C.red);centeredText(782,668,200,'ADD BISCUIT DRINK',2,C.white);

header(1024,'SIDES DRINKS DESSERTS',C.cyan,3);
function sideCard(x,y,name,price,kind){rect(x,y,210,150,C.bg);if(kind==='fries')fries(x+12,y+15,0.55);else if(kind==='drink')drink(x+20,y+10,0.48);else if(kind==='mac')bowl(x+12,y+25,0.62,C.gold);else if(kind==='slaw')bowl(x+12,y+25,0.62,C.green);else circle(x+62,y+70,45,C.gold);text(x+105,y+36,name,2,C.white);text(x+105,y+78,price,3,C.gold);}
sideCard(1045,135,'FRIES','$3','fries');sideCard(1280,135,'MAC CHEESE','$4','mac');sideCard(1045,315,'COLESLAW','$3','slaw');sideCard(1280,315,'BISCUIT','$1','biscuit');sideCard(1045,505,'FOUNTAIN DRINK','$3','drink');text(1270,535,'SWEET TEA',2,C.white);text(1270,568,'LEMONADE',2,C.white);text(1270,601,'COLA',2,C.white);

function crc32(buf){let c=0xffffffff;for(const b of buf){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(type,data){const t=Buffer.from(type);const out=Buffer.alloc(12+data.length);out.writeUInt32BE(data.length,0);t.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc32(Buffer.concat([t,data])),8+data.length);return out;}
function png(){const raw=Buffer.alloc((W*4+1)*H);for(let y=0;y<H;y++){raw[y*(W*4+1)]=0;Buffer.from(px.buffer,px.byteOffset+y*W*4,W*4).copy(raw,y*(W*4+1)+1);}const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(W,0);ihdr.writeUInt32BE(H,4);ihdr[8]=8;ihdr[9]=6;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);}

const materials=[
 {name:'MenuScreen_Mounting_Steel',pbrMetallicRoughness:{baseColorFactor:[0.22,0.25,0.29,1],metallicFactor:0.88,roughnessFactor:0.27}},
 {name:'MenuScreen_Bolts',pbrMetallicRoughness:{baseColorFactor:[0.42,0.45,0.48,1],metallicFactor:0.95,roughnessFactor:0.16}},
 {name:'MenuScreen_Casing_Black',pbrMetallicRoughness:{baseColorFactor:[0.02,0.024,0.028,1],metallicFactor:0.35,roughnessFactor:0.26}},
 {name:'MenuScreen_Bezel_Trim',pbrMetallicRoughness:{baseColorFactor:[0.10,0.115,0.13,1],metallicFactor:0.68,roughnessFactor:0.20}},
 {name:'MenuScreen_Inner_Bezel',pbrMetallicRoughness:{baseColorFactor:[0.008,0.008,0.012,1],metallicFactor:0.12,roughnessFactor:0.22}},
 {name:'ChickenSpot_Menu_Atlas',pbrMetallicRoughness:{baseColorTexture:{index:0},metallicFactor:0,roughnessFactor:0.16},emissiveTexture:{index:0},emissiveFactor:[0.3,0.3,0.3]},
];
const parts=[];
function boxGeo(w,h,d,c){const [cx,cy,cz]=c,x=w/2,y=h/2,z=d/2;const faces=[[[0,0,1],[[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]]],[[0,0,-1],[[x,-y,-z],[-x,-y,-z],[-x,y,-z],[x,y,-z]]],[[1,0,0],[[x,-y,z],[x,-y,-z],[x,y,-z],[x,y,z]]],[[-1,0,0],[[-x,-y,-z],[-x,-y,z],[-x,y,z],[-x,y,-z]]],[[0,1,0],[[-x,y,z],[x,y,z],[x,y,-z],[-x,y,-z]]],[[0,-1,0],[[-x,-y,-z],[x,-y,-z],[x,-y,z],[-x,-y,z]]]];const pos=[],norm=[],idx=[];let i=0;for(const [n,vs] of faces){for(const v of vs){pos.push(v[0]+cx,v[1]+cy,v[2]+cz);norm.push(...n);}idx.push(i,i+1,i+2,i,i+2,i+3);i+=4;}return{pos,norm,idx};}
function cylGeo(r,h,c,seg=14){const [cx,cy,cz]=c,pos=[],norm=[],idx=[];let base=0;for(let i=0;i<seg;i++){const a=i/seg*Math.PI*2,b=(i+1)/seg*Math.PI*2;for(const [ang,y] of [[a,-h/2],[b,-h/2],[b,h/2],[a,h/2]]){pos.push(cx+Math.cos(ang)*r,cy+y,cz+Math.sin(ang)*r);norm.push(Math.cos(ang),0,Math.sin(ang));}idx.push(base,base+1,base+2,base,base+2,base+3);base+=4;}return{pos,norm,idx};}
function add(name,g,mat,uv=null){parts.push({name,...g,mat,uv});}
add('Mount_Rail_Upper',boxGeo(3.43,.085,.075,[0,1.33,-.105]),0);add('Mount_Rail_Lower',boxGeo(3.43,.085,.075,[0,.32,-.105]),0);
for(const [side,x] of [['Left',-1.705],['Right',1.705]]){add(`Mount_Wing_${side}`,boxGeo(.2,.58,.075,[x,.83,-.105]),0);add(`Mount_Wing_${side}_Bolt_0`,cylGeo(.028,.022,[x,.66,-.058]),1);add(`Mount_Wing_${side}_Bolt_1`,cylGeo(.028,.022,[x,1,-.058]),1);}
const names=['Combos','SignatureChicken','SidesDrinksDesserts'],centers=[-1.035,0,1.035];
for(let s=0;s<3;s++){const n=`Screen_${names[s]}`,x=centers[s];add(`${n}_Rear_Mount_Plate`,boxGeo(.36,.3,.055,[x,.83,-.093]),0);add(`${n}_Housing`,boxGeo(1,1.5,.115,[x,.845,-.005]),2);add(`${n}_Outer_Bezel`,boxGeo(.975,1.475,.033,[x,.845,.061]),3);add(`${n}_Inner_Bezel`,boxGeo(.92,1.42,.025,[x,.845,.081]),4);const u0=s/3,u1=(s+1)/3;add(n,{pos:[x-.4475,.14,.096,x+.4475,.14,.096,x+.4475,1.535,.096,x-.4475,1.535,.096],norm:[0,0,1,0,0,1,0,0,1,0,0,1],idx:[0,1,2,0,2,3]},5,[u0,1,u1,1,u1,0,u0,0]);for(const dx of [-.465,.465])for(const y of [.145,1.545])add(`${n}_Fastener_${dx}_${y}`,cylGeo(.012,.01,[x+dx,y,.083],12),1);}

const chunks=[],views=[],accessors=[],meshes=[],nodes=[{name:'world',children:[]}];let offset=0;
function align4(){const pad=(4-offset%4)%4;if(pad){chunks.push(Buffer.alloc(pad));offset+=pad;}}
function addBuf(buf,target){align4();const i=views.length;views.push({buffer:0,byteOffset:offset,byteLength:buf.length,...(target?{target}:{})});chunks.push(buf);offset+=buf.length;return i;}
function acc(view,componentType,type,count,min,max){const i=accessors.length;accessors.push({bufferView:view,componentType,type,count,...(min?{min}:{}) ,...(max?{max}:{})});return i;}
for(const p of parts){const ib=Buffer.from(new Uint16Array(p.idx).buffer);const pb=Buffer.from(new Float32Array(p.pos).buffer);const nb=Buffer.from(new Float32Array(p.norm).buffer);const iv=addBuf(ib,34963),pv=addBuf(pb,34962),nv=addBuf(nb,34962);const xs=[],ys=[],zs=[];for(let i=0;i<p.pos.length;i+=3){xs.push(p.pos[i]);ys.push(p.pos[i+1]);zs.push(p.pos[i+2]);}const ia=acc(iv,5123,'SCALAR',p.idx.length,[Math.min(...p.idx)],[Math.max(...p.idx)]),pa=acc(pv,5126,'VEC3',p.pos.length/3,[Math.min(...xs),Math.min(...ys),Math.min(...zs)],[Math.max(...xs),Math.max(...ys),Math.max(...zs)]),na=acc(nv,5126,'VEC3',p.norm.length/3);const attrs={POSITION:pa,NORMAL:na};if(p.uv){const uvv=addBuf(Buffer.from(new Float32Array(p.uv).buffer),34962);attrs.TEXCOORD_0=acc(uvv,5126,'VEC2',p.uv.length/2,[Math.min(...p.uv.filter((_,i)=>i%2===0)),Math.min(...p.uv.filter((_,i)=>i%2===1))],[Math.max(...p.uv.filter((_,i)=>i%2===0)),Math.max(...p.uv.filter((_,i)=>i%2===1))]);}const mi=meshes.length;meshes.push({name:p.name,primitives:[{attributes:attrs,indices:ia,material:p.mat,mode:4}]});nodes.push({name:p.name,mesh:mi});nodes[0].children.push(nodes.length-1);}
const image=png();const imageView=addBuf(image);const gltf={asset:{version:'2.0',generator:'ZTA Asset Lab procedural menu generator'},scene:0,scenes:[{nodes:[0],extras:{asset_id:ASSET_ID,display_name:'Chicken Spot Triple Digital Menu',units:'meters',up_axis:'Y',forward_axis:'+Z',placement:'wall-mounted'}}],nodes,meshes,accessors,bufferViews:views,buffers:[{byteLength:offset}],materials,images:[{bufferView:imageView,mimeType:'image/png'}],textures:[{sampler:0,source:0}],samplers:[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}]};
const bin=Buffer.concat(chunks);let json=Buffer.from(JSON.stringify(gltf));const jp=(4-json.length%4)%4;if(jp)json=Buffer.concat([json,Buffer.alloc(jp,0x20)]);const bp=(4-bin.length%4)%4;const bin4=bp?Buffer.concat([bin,Buffer.alloc(bp)]):bin;const total=12+8+json.length+8+bin4.length;const out=Buffer.alloc(12);out.write('glTF',0);out.writeUInt32LE(2,4);out.writeUInt32LE(total,8);const jh=Buffer.alloc(8);jh.writeUInt32LE(json.length,0);jh.write('JSON',4);const bh=Buffer.alloc(8);bh.writeUInt32LE(bin4.length,0);bh.write('BIN\0',4);mkdirSync(dirname(OUT_PATH),{recursive:true});writeFileSync(OUT_PATH,Buffer.concat([out,jh,json,bh,bin4]));
const meta={asset_id:ASSET_ID,display_name:'Chicken Spot Triple Digital Menu',category:'menu_board',town:'Starter Town',district:'Dreamdrop District',location:'Chicken Spot back wall above service counter',format:'glb',units:'meters',up_axis:'Y',forward_axis:'+Z',dimensions_m:{width:3.61,height:1.5,depth:.238},pivot:'bottom-center',triangle_count:parts.reduce((n,p)=>n+p.idx.length/3,0),component_meshes:parts.length,embedded_textures:1,screen_nodes:['Screen_Combos','Screen_SignatureChicken','Screen_SidesDrinksDesserts'],collision_plan:'three simple monitor housing boxes; mounting hardware cosmetic',interaction_plan:{station_id:'chicken-spot-menu',action:'Open Chicken Spot menu'},menu_prices:{combos:[['2 PC Combo',9],['3 PC Combo',11],['Wings Combo',12],['Family Box',20]],chicken:[['2 PC Chicken',6],['4 PC Chicken',11],['8 PC Chicken',20],['12 PC Chicken',28],['16 Wings',19]],sides:[['Fries',3],['Mac & Cheese',4],['Coleslaw',3],['Biscuit',1],['Fountain Drink',3]]},approval_status:'APPROVED',approved_in_chat:'2026-07-17',license:'Original ZTA geometry and artwork'};writeFileSync(META_PATH,JSON.stringify(meta,null,2)+'\n');
if(existsSync(INDEX_PATH)){const index=JSON.parse(readFileSync(INDEX_PATH,'utf8'));index.props??={};const pack='starter-town-chicken-spot';index.props[pack]??=[];const entry={name:ASSET_ID,path:`models/props/starter-town/chicken-spot/${ASSET_ID}.glb`,type:'glb',tex:1};const i=index.props[pack].findIndex(x=>x.name===ASSET_ID);if(i>=0)index.props[pack][i]=entry;else index.props[pack].push(entry);index.props[pack].sort((a,b)=>a.name.localeCompare(b.name));writeFileSync(INDEX_PATH,JSON.stringify(index,null,2)+'\n');}
console.log(`[starter-assets] generated ${OUT_PATH} (${(total/1024).toFixed(1)} KB)`);
