// Interactive dockside dispatch: steer the ice chute and physically sort a
// fish crate on the conveyor. Three skills: cooling, hazard recognition, routing.
// Keyboard alternative: hold C to cool, 1/2/3 to select destination.
import {MARKET_DESTINATIONS,SAFE_MARKET_TEMPERATURE} from '../runtime/HarborMarketJob.js';
let root=null,canvas=null,ctx=null,ui={},cooling=false,chooseFn=null,cancelFn=null;
let icePointerId=null;
let dragging=false,activePointerId=null,crateX=310,crateY=92,visibleOrder=-1,nearBin=-1;
const W=620,H=308;
const clamp=(n,l,h)=>Math.max(l,Math.min(h,n));
const text=(s,x,y,color='#e5faff',font='bold 15px system-ui')=>{
 ctx.font=font;ctx.textAlign='left';ctx.fillStyle=color;ctx.fillText(s,x,y);
};
// A crate's cold-chain history matters even after its thermometer recovers.
export function getHarborCrateSafetyStatus(session){
 const order=session.orders[session.index];
 const overChilled=!!session.overChilled;
 const inRange=session.tempC>=SAFE_MARKET_TEMPERATURE.min
   && session.tempC<=SAFE_MARKET_TEMPERATURE.max;
 return {overChilled,inRange,requiresInspection:overChilled||order.answer==='inspect',
   dispatchReady:inRange&&!overChilled&&order.answer!=='inspect'};
}
function setup(){
 root=document.createElement('section');root.id='zw-harbor-market-job';
 root.setAttribute('role','dialog');root.setAttribute('aria-label','Harbor seafood dispatch minigame');
 root.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);'+
  'width:min(690px,96vw);max-height:94vh;overflow:auto;box-sizing:border-box;'+
  'padding:17px;z-index:185;border:2px solid #69e0df;border-radius:18px;'+
  'background:linear-gradient(145deg,#082936,#144958);color:#edfaff;'+
  'font:600 13px system-ui;box-shadow:0 12px 40px #000b;pointer-events:auto';
 const heading=document.createElement('h2');heading.textContent='🐟 HARBOR CATCH · DOCKSIDE DISPATCH';
 heading.style.cssText='margin:0;font-size:19px;color:#b9fff2';root.append(heading);
 const sub=document.createElement('div');sub.style.cssText='color:#c5e6ed;margin:6px 0 8px';root.append(sub);ui.sub=sub;
 const order=document.createElement('div');order.style.cssText='border-radius:10px;background:#235360;'+
  'padding:10px 12px;line-height:1.4;border:1px solid #477f87;margin:0 0 10px';root.append(order);ui.order=order;
 canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
 canvas.setAttribute('aria-label','Conveyor crate you can drag into three handling stations');
 canvas.style.cssText='width:100%;height:auto;display:block;border-radius:12px;'+
  'border:1px solid #4ca4a9;touch-action:none;cursor:grab;background:#123d4b';root.append(canvas);
 ctx=canvas.getContext('2d');
 const status=document.createElement('div');status.style.cssText='margin:10px 0 4px;line-height:1.4;color:#d0e9ee';root.append(status);ui.status=status;
 const actions=document.createElement('div');actions.style.cssText='display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;margin-top:10px';
 const chill=document.createElement('button');chill.textContent='❄️ HOLD ICE CHUTE (C)';chill.type='button';
 const cancel=document.createElement('button');cancel.type='button';cancel.textContent='End shift';
 const shared='min-height:45px;flex:1 1 180px;padding:10px;border-radius:12px;font-weight:800;border:1px solid #8de7e5;cursor:pointer;touch-action:none;';
 chill.style.cssText=shared+'background:#b7f4eb;color:#063244';ui.chill=chill;
 cancel.style.cssText=shared+'background:#1b3d4b;color:#ecf8fc';
 chill.addEventListener('pointerdown',e=>{
  if(icePointerId!==null)return;
  e.preventDefault();icePointerId=e.pointerId;cooling=true;
  chill.style.background='#a1d5ff';chill.setPointerCapture?.(e.pointerId);
 });
 const chillEnd=e=>{
  if(e.pointerId!==icePointerId)return;
  icePointerId=null;cooling=false;chill.style.background='#b7f4eb';
  if(e.type!=='lostpointercapture'){
   try{chill.releasePointerCapture?.(e.pointerId)}catch{}
  }
 };
 for(const event of ['pointerup','pointercancel','lostpointercapture'])chill.addEventListener(event,chillEnd);
 cancel.addEventListener('click',()=>cancelFn?.());
 actions.append(chill,cancel);
 const assist=document.createElement('div');assist.textContent='Drag crate onto the correct dock · Hold C or ICE CHUTE to chill · Choose station with 1/2/3 · ESC cancels';
 assist.style.cssText='margin-top:9px;color:#b7d9e6;font-size:12px;line-height:1.45';
 root.append(status,actions,assist);
 // A keyboard-accessible alternate to drag: choosing a target never bypasses
 // mandatory cooling, and the time/quality simulation runs either way.
 const buttons=document.createElement('div');buttons.style.cssText='display:flex;gap:7px;flex-wrap:wrap;margin-top:10px';
 for(const [index,dest] of MARKET_DESTINATIONS.entries()){
  const button=document.createElement('button');button.type='button';
  button.textContent=(index+1)+' · '+dest.label;
  button.style.cssText=shared+'min-width:125px;background:#235d68;color:white;flex:1';
  button.addEventListener('click',()=>chooseFn?.(dest.id));
  buttons.append(button);
 }
 root.append(buttons);
 document.body.appendChild(root);
 const getXY=e=>{
  const rect=canvas.getBoundingClientRect();return {
   x:(e.clientX-rect.left)*W/rect.width,
   y:(e.clientY-rect.top)*H/rect.height,
  };
 };
 canvas.addEventListener('pointerdown',e=>{
  const p=getXY(e);
  if(dragging||Math.hypot(p.x-crateX,p.y-crateY)>62)return;
  e.preventDefault();dragging=true;activePointerId=e.pointerId;canvas.setPointerCapture?.(e.pointerId);
  crateX=p.x;crateY=p.y;
 });
 canvas.addEventListener('pointermove',e=>{
  if(!dragging||e.pointerId!==activePointerId)return;
  const p=getXY(e);crateX=clamp(p.x,40,W-40);crateY=clamp(p.y,36,H-22);
  nearBin=crateY>211?clamp(Math.floor(crateX/(W/3)),0,2):-1;
 });
 function finishDrag(e){
  if(!dragging||e.pointerId!==activePointerId)return;
  dragging=false;activePointerId=null;
  if(nearBin>=0)chooseFn?.(MARKET_DESTINATIONS[nearBin].id);
  if(!dragging){crateX=310;crateY=92;nearBin=-1;}
 }
 canvas.addEventListener('pointerup',finishDrag);
 // Capture can be revoked by the browser (touch interruption, DOM changes).
 // Treat that as cancellation, never as a successful drop into a handling bay.
 const abortDrag=e=>{
  if(!dragging||e.pointerId!==activePointerId)return;
  dragging=false;activePointerId=null;crateX=310;crateY=92;nearBin=-1;
 };
 canvas.addEventListener('pointercancel',abortDrag);
 canvas.addEventListener('lostpointercapture',abortDrag);
}
// Closing a shift or changing rounds must release DOM pointer capture as well
// as clearing logical cooling state, or the old button can stay pressed.
function resetIceChute(){
 const previous=icePointerId;
 icePointerId=null;cooling=false;
 if(ui.chill){
  ui.chill.style.background='#b7f4eb';
  if(previous!==null){
   try{ui.chill.releasePointerCapture?.(previous)}catch{}
  }
 }
}
function fillRound(x,y,w,h,r,color,stroke=null){
 const c=ctx;c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=color;c.fill();
 if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}
}
function draw(s){
 const c=ctx;c.clearRect(0,0,W,H);
 const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1c5d6a');g.addColorStop(1,'#0b2736');
 c.fillStyle=g;c.fillRect(0,0,W,H);
 // Conveyor belt with animated rollers. The crate moves independently by drag.
 fillRound(0,51,W,102,9,'#2a3e48','#5c7f86');
 for(let i=0;i<24;i++){
  const x=(i*36+(s.orderTime*34)%36)%W;
  fillRound(x,68,17,69,6,'#587c82');
 }
 fillRound(0,153,W,22,3,'#141f29');
 text('PACKING CONVEYOR',15,31,'#b9dfeb','900 14px system-ui');
 text('TIME '+Math.ceil(s.orderTime)+'s',W-108,31,s.orderTime<6?'#ffab9b':'#ebffff');
 const safety=getHarborCrateSafetyStatus(s);
 const color=safety.overChilled?'#eaa4a4':safety.requiresInspection?'#f6c58d':safety.dispatchReady?'#a3e7b6':'#eaa4a4';
 c.fillStyle='rgba(0,0,0,.18)';c.beginPath();c.ellipse(crateX+7,crateY+34,67,16,0,0,Math.PI*2);c.fill();
 fillRound(crateX-54,crateY-32,108,65,11,'#a16d3f','#eac99d');
 fillRound(crateX-45,crateY-23,90,47,6,'#5b3d30','#ceaa76');
 fillRound(crateX-25,crateY-18,49,20,8,'#83c3cf');
 // Fish in the crate, crate temperature and dispatch stamp.
 c.fillStyle='#f1c18f';c.beginPath();c.ellipse(crateX,crateY-8,20,7,0,0,Math.PI*2);c.fill();
 c.beginPath();c.moveTo(crateX-18,crateY-7);c.lineTo(crateX-28,crateY-17);c.lineTo(crateX-28,crateY+3);c.fill();
 fillRound(crateX-37,crateY+5,74,17,4,color);
 text(safety.overChilled?'HOLD':s.tempC.toFixed(1)+'°C',crateX-23,crateY+18,'#092a32','900 12px system-ui');
 text('❄',crateX-44,crateY-11,'#dffbff','900 14px system-ui');
 // Separated physical dispatch bays under the active conveyor.
 const labels=['❄️ COLD STORAGE','🧾 CUSTOMER','🔎 INSPECTION'];
 const colors=['#26576b','#226454','#715136'];
 for(let i=0;i<3;i++){
  fillRound(i*207+5,216,197,83,11,nearBin===i?'#397d91':colors[i],nearBin===i?'#abffe9':'#57929a');
  text((i+1)+' '+labels[i],i*207+19,245,'#ecfcff','900 15px system-ui');
  text(['Store until pickup','Ready for collection','Hold for safety check'][i],
    i*207+19,269,'#c6e6e8','12px system-ui');
 }
 // Left thermometer is an actual changing process variable.
 fillRound(15,183,205,10,5,'#0a2736');
 fillRound(15,183,205*clamp((s.tempC-.1)/16,0,1),10,5,
   safety.overChilled?'#eaa4a4':safety.dispatchReady?'#83f2c0':s.tempC<1?'#8fbfff':'#ffb36d');
 text(safety.overChilled?'FROZEN · INSPECT':safety.dispatchReady?'SAFE 1–4°C':'TARGET 1–4°C',15,206,safety.overChilled?'#ffd4d4':'#c8fce3','12px system-ui');
}
export function getHarborMarketPanelInput(){return {cooling};}
export function hideHarborMarketPanel(){
 if(root)root.style.display='none';
 resetIceChute();dragging=false;activePointerId=null;nearBin=-1;
 // A canceled shift may restart at the same order index. Never retain its
 // dragged crate coordinates or round marker across separate sessions.
 visibleOrder=-1;crateX=310;crateY=92;
}
export function showHarborMarketPanel(session,{choose,cancel}={}){
 if(!root)setup();
 chooseFn=choose;cancelFn=cancel;
 root.style.display='block';
 if(visibleOrder!==session.index){
   visibleOrder=session.index;crateX=310;crateY=92;nearBin=-1;dragging=false;activePointerId=null;resetIceChute();
 }
 const order=session.orders[session.index];
 ui.sub.textContent='Order '+(session.index+1)+' / '+session.orders.length+
   ' · Correct '+session.score+' · Quality '+session.quality+
   ' · '+Math.ceil(session.orderTime)+'s remaining';
 ui.order.textContent='📋 '+order.text;
 const safety=getHarborCrateSafetyStatus(session);
 ui.status.textContent=safety.overChilled
   ?'⚠️ FROZEN CRATE: Cold-chain breach. Rewarming cannot restore safety. Route this crate to INSPECTION (3); no dispatch credit.'
   :safety.requiresInspection
   ?'⚠️ Suspect seafood must be quarantined for safety inspection, not repacked. Drag the crate to the correct bay.'
   :'❄️ Chill the crate into the 1–4°C safe band. Release the ice chute to avoid freezing it, then drag it to the proper bay. Current: '+session.tempC.toFixed(1)+'°C'+(safety.dispatchReady?' ✅ Safe':'');
 draw(session);
}
