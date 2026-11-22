// One save-safe Harbor watercraft. No automobile road rules are used at sea.
export const HARBOR_BOAT_DOCK=Object.freeze({x:690,z:-2840});
export const HARBOR_BOAT_EXIT=Object.freeze({x:610,z:-2657});
export const HARBOR_WATER_BOUNDS=Object.freeze({minX:-1120,maxX:1120,minZ:-3470,maxZ:-2814});
export const BOAT_RENT_DREAMBUCKS=45,BOAT_BUY_DREAMBUCKS=450;
const clamp=(v,l,h)=>Math.max(l,Math.min(h,v));
const num=(v,d)=>Number.isFinite(Number(v))?Number(v):d;
const moored=Object.freeze([{x:-375,z:-3145,r:25},{x:178,z:-3120,r:27},{x:550,z:-3180,r:25}]);
export const boatWaterPosition=p=>({
 x:clamp(num(p?.x,HARBOR_BOAT_DOCK.x),HARBOR_WATER_BOUNDS.minX,HARBOR_WATER_BOUNDS.maxX),
 z:clamp(num(p?.z,HARBOR_BOAT_DOCK.z),HARBOR_WATER_BOUNDS.minZ,HARBOR_WATER_BOUNDS.maxZ),
});
export function boatObstructed({x,z}){
 if([-330,120,490].some(p=>Math.abs(x-p)<21&&z>=-3150&&z<=-2810))return true;
 return moored.some(p=>Math.hypot(x-p.x,z-p.z)<p.r);
}
export function normalizeBoatState(src={}){
 const p=src&&typeof src==='object'?src:{},pos=boatWaterPosition(p);
 const valid=!boatObstructed(pos);
 const rentalDay=Number.isInteger(p.rentalDay)&&p.rentalDay>=1?p.rentalDay:null;
 const owned=p.owned===true;
 return {
   owned,rentalDay,fuel:clamp(num(p.fuel,100),0,100),hull:clamp(num(p.hull,100),0,100),
   x:valid?pos.x:HARBOR_BOAT_DOCK.x,z:valid?pos.z:HARBOR_BOAT_DOCK.z,
   yaw:clamp(num(p.yaw,Math.PI),-100*Math.PI,100*Math.PI),
   speed:clamp(num(p.speed,0),-5,18),
   riding:p.riding===true&&(owned||rentalDay!==null),
 };
}
export function ensureBoatState(state){state.boating=normalizeBoatState(state.boating);return state.boating;}
export function canDockBoat(b){return Math.hypot(b.x-HARBOR_BOAT_DOCK.x,b.z-HARBOR_BOAT_DOCK.z)<=44&&Math.abs(b.speed)<2;}
export function boardHarborBoat(state,{purchase=false}={}){
 const b=ensureBoatState(state),day=Math.max(1,Math.floor(num(state.day,1)));
 if(b.riding)return {ok:false,reason:'already-aboard'};
 let cost=0;
 if(purchase&&!b.owned){
   if((state.money||0)<BOAT_BUY_DREAMBUCKS)return {ok:false,reason:'need-purchase-funds'};
   cost=BOAT_BUY_DREAMBUCKS;state.money-=cost;b.owned=true;
 }
 if(!b.owned&&b.rentalDay!==day){
   if((state.money||0)<BOAT_RENT_DREAMBUCKS)return {ok:false,reason:'need-rental-funds'};
   cost+=BOAT_RENT_DREAMBUCKS;state.money-=BOAT_RENT_DREAMBUCKS;
   b.rentalDay=day;b.fuel=100;b.hull=100;
 }
 Object.assign(b,{x:HARBOR_BOAT_DOCK.x,z:HARBOR_BOAT_DOCK.z,yaw:Math.PI,speed:0,riding:true});
 return {ok:true,cost,owned:b.owned};
}
export function dockHarborBoat(state){
 const b=ensureBoatState(state);
 if(!b.riding||!canDockBoat(b))return {ok:false,reason:'return-to-marina'};
 b.speed=0;b.riding=false;return {ok:true};
}
export function serviceDockedBoat(state){
 const b=ensureBoatState(state);
 if(b.riding||!canDockBoat(b))return {ok:false,reason:'return-to-marina'};
 if(!b.owned&&b.rentalDay===null)return {ok:false,reason:'no-boat'};
 const cost=Math.ceil((100-b.fuel)*.8+(100-b.hull)*1.5);
 if((state.money||0)<cost)return {ok:false,reason:'need-service-funds',cost};
 state.money-=cost;b.fuel=100;b.hull=100;return {ok:true,cost};
}
// A no-softlock Harbor Patrol tow: even a player with zero DreamBucks can
// return safely when low fuel, disabled hull or an unfamiliar coastline traps them.
export function requestHarborBoatRescue(state){
 const b=ensureBoatState(state);
 if(!b.riding)return {ok:false,reason:'not-aboard'};
 const fee=(state.money||0)>=25?25:0;
 state.money=Math.max(0,(state.money||0)-fee);
 Object.assign(b,{x:HARBOR_BOAT_DOCK.x,z:HARBOR_BOAT_DOCK.z,
   yaw:Math.PI,speed:0,fuel:Math.max(25,b.fuel),hull:Math.max(35,b.hull)});
 return {ok:true,fee};
}
export function stepHarborBoat(boat,input={},dt=0){
 if(!boat?.riding)return {moved:false};
 const t=clamp(num(dt,0),0,.05),f=clamp(num(input.f,0),-1,1),
   s=clamp(num(input.s,0),-1,1),usable=boat.fuel>0&&boat.hull>0;
 if(f&&usable)boat.speed+=f*12*t;
 else boat.speed-=Math.sign(boat.speed)*Math.min(Math.abs(boat.speed),4*t);
 boat.speed=clamp(boat.speed,-5,18);
 if(s&&Math.abs(boat.speed)>.2)boat.yaw-=s*1.25*t*Math.sign(boat.speed);
 const from={x:boat.x,z:boat.z};
 const proposed={x:boat.x+Math.sin(boat.yaw)*boat.speed*t,z:boat.z+Math.cos(boat.yaw)*boat.speed*t};
 const safe=boatWaterPosition(proposed),collision=boatObstructed(safe),
   boundary=Math.hypot(proposed.x-safe.x,proposed.z-safe.z)>.01;
 if(collision||boundary){
   if(collision&&Math.abs(boat.speed)>1)boat.hull=clamp(boat.hull-.15,0,100);
   boat.speed=0;
 }else{boat.x=safe.x;boat.z=safe.z;}
 if(usable&&Math.abs(boat.speed)>.1)boat.fuel=clamp(boat.fuel-t*(.018+Math.abs(boat.speed)*.002),0,100);
 return {moved:Math.hypot(boat.x-from.x,boat.z-from.z)>.01,collision,boundary,atDock:canDockBoat(boat)};
}
