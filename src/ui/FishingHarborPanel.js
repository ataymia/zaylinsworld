// Fishing Harbor: skill-based catch game with actual moving fish, line tension,
// independent rod aiming and reel pressure. Keyboard, mouse and touch supported.
let root=null,canvas=null,ctx=null,hookButton=null,reelButton=null,aimActive=false,aimX=0,reelHeld=false;
let onHook=null,onCancel=null,els={};
const clamp=(n,l,h)=>Math.max(l,Math.min(h,n));
function makePanel(){
 root=document.createElement('section');root.id='zw-fishing-panel';
 root.setAttribute('role','dialog');root.setAttribute('aria-label','Fishing reel challenge');
 root.style.cssText='position:fixed;z-index:185;bottom:18px;left:50%;transform:translateX(-50%);'+
  'width:min(660px,96vw);max-height:85vh;overflow:auto;box-sizing:border-box;'+
  'color:#eafaff;background:linear-gradient(150deg,#062332,#0b4050 60%,#062334);'+
  'border:2px solid #74e5df;border-radius:18px;padding:14px 17px;'+
  'box-shadow:0 18px 60px #000b;font:600 13px system-ui,sans-serif;pointer-events:auto';
 const heading=document.createElement('h2');heading.textContent='🎣 CAST & REEL';
 heading.style.cssText='margin:0;color:#b9fff0;font-size:19px;font-weight:900;letter-spacing:.06em';
 els.heading=heading;
 const status=document.createElement('div');status.style.cssText='margin:4px 0 9px;font-weight:500;color:#cfe9f0';
 els.status=status;
 canvas=document.createElement('canvas');canvas.width=620;canvas.height=222;
 canvas.setAttribute('aria-label','Underwater fish and your rod aiming cursor. Drag left or right to follow the fish.');
 canvas.style.cssText='width:100%;height:auto;max-height:32vh;background:#06445c;border-radius:12px;'+
  'border:1px solid #3fa8b5;touch-action:none;display:block;cursor:crosshair';
 ctx=canvas.getContext('2d');
 const meterRow=document.createElement('div');meterRow.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:10px 0';
 for(const [key,title] of [['progress','CATCH PROGRESS'],['tension','LINE TENSION']]){
   const wrap=document.createElement('div');
   const label=document.createElement('div');label.style.cssText='font-size:11px;display:flex;justify-content:space-between';
   const name=document.createElement('span');name.textContent=title;
   const number=document.createElement('span');number.textContent='0%';label.append(name,number);
   const track=document.createElement('div');track.style.cssText='height:13px;border:1px solid #477c88;'+
     'border-radius:12px;background:#123b4d;overflow:hidden;margin-top:5px';
   const bar=document.createElement('div');bar.style.cssText='height:100%;width:0%;border-radius:10px;background:#7ee8b2';
   track.appendChild(bar);wrap.append(label,track);meterRow.appendChild(wrap);
   els[key]={number,bar};
 }
 const text=document.createElement('div');text.style.cssText='font-size:12px;color:#d1eaf0;margin:7px 0 11px;line-height:1.4';
 els.text=text;
 const actions=document.createElement('div');actions.style.cssText='display:flex;gap:10px;flex-wrap:wrap;justify-content:space-between';
 hookButton=document.createElement('button');hookButton.type='button';hookButton.textContent='⚡ SET HOOK';
 reelButton=document.createElement('button');reelButton.type='button';reelButton.textContent='🎣 HOLD TO REEL';
 const cancel=document.createElement('button');cancel.type='button';cancel.textContent='End cast';
 for(const b of [hookButton,reelButton,cancel]){
   b.style.cssText='flex:1 1 135px;padding:12px 10px;min-height:44px;'+
   'border-radius:12px;border:1px solid #8cece1;font-weight:800;color:#052a36;'+
   'background:#a2f4d9;cursor:pointer;touch-action:none';
 }
 cancel.style.cssText+='background:#183d4f;color:#d6f8f5';
 hookButton.addEventListener('click',()=>onHook?.());
 const down=e=>{e.preventDefault();reelHeld=true;reelButton.style.background='#ffd68b';reelButton.setPointerCapture?.(e.pointerId);};
 const up=e=>{reelHeld=false;reelButton.style.background='#a2f4d9';if(e?.pointerId!==undefined){try{reelButton.releasePointerCapture?.(e.pointerId);}catch{}}};
 reelButton.addEventListener('pointerdown',down);
 for(const event of ['pointerup','pointercancel','lostpointercapture','pointerleave'])reelButton.addEventListener(event,up);
 cancel.addEventListener('click',()=>onCancel?.());
 actions.append(hookButton,reelButton,cancel);
 root.append(heading,status,canvas,meterRow,text,actions);
 function moveAim(e){
   const r=canvas.getBoundingClientRect();
   if(r.width<=0)return;
   aimX=clamp(((e.clientX-r.left)/r.width-.5)*2,-1,1);
   aimActive=true;
 }
 canvas.addEventListener('pointerdown',e=>{e.preventDefault();moveAim(e);canvas.setPointerCapture?.(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(e.buttons||e.pointerType==='touch')moveAim(e);});
 document.body.appendChild(root);
}
export function getFishingPanelInput(){
 return {rodX:aimX,hasAim:aimActive,reel:reelHeld};
}
export function hideFishingPanel(){
 if(root)root.style.display='none';
 aimActive=false;aimX=0;reelHeld=false;
}
function meter(id,value,color){
 els[id].bar.style.width=Math.round(clamp(value,0,100))+'%';
 els[id].bar.style.background=color;
 els[id].number.textContent=Math.round(clamp(value,0,100))+'%';
}
function draw(session){
 if(!ctx)return;
 const c=ctx,w=canvas.width,h=canvas.height;
 c.clearRect(0,0,w,h);
 const bg=c.createLinearGradient(0,0,0,h);
 bg.addColorStop(0,'#287b91');bg.addColorStop(.52,'#0d5b78');bg.addColorStop(1,'#062638');
 c.fillStyle=bg;c.fillRect(0,0,w,h);
 // Sun shafts, a visible sand floor and small aquatic plant silhouettes.
 for(let i=0;i<8;i++){
   c.fillStyle='rgba(151,236,231,.035)';c.beginPath();
   c.moveTo(i*90-40,0);c.lineTo(i*90+15,0);c.lineTo(i*115+60,h);c.closePath();c.fill();
 }
 c.fillStyle='#164e59';c.fillRect(0,h-24,w,24);
 for(let i=0;i<21;i++){
   const x=(i*101)%w,y=(i*31)%120+15;
   c.strokeStyle='rgba(173,239,243,.19)';c.lineWidth=1.5;c.beginPath();
   c.arc(x,y+(session.elapsed*10%45),i%3+2,0,Math.PI*2);c.stroke();
 }
 for(let i=0;i<18;i++){
   c.strokeStyle='rgba(66,164,134,.55)';c.lineWidth=2;
   const x=i*36+12;c.beginPath();c.moveTo(x,h);
   c.quadraticCurveTo(x+Math.sin(session.elapsed+i)*8,h-25,x+7,h-42-i%4*7);c.stroke();
 }
 const toX=v=>(v+1)*.5*(w-70)+35;
 const rodX=toX(session.rodX||0),fishX=toX(session.fishX||0);
 // Dynamic alignment band around the target. This is not a static green timer.
 if(session.phase==='reeling'){
   c.fillStyle='rgba(131,255,194,.13)';
   c.fillRect(fishX-60,0,120,h-15);
   c.setLineDash([7,5]);c.strokeStyle='#8cf2cb';c.lineWidth=1.7;
   c.strokeRect(fishX-60,8,120,h-45);c.setLineDash([]);
 }
 c.strokeStyle=session.tension>80?'#ff7376':'#f9e4a6';c.lineWidth=2.5;
 c.beginPath();c.moveTo(rodX,0);c.quadraticCurveTo((rodX+fishX)*.5,88,fishX,128);c.stroke();
 // Render a live fish with fin, tail, eye and swim direction.
 c.save();c.translate(fishX,128);
 const facing=Math.cos(session.swimTime*1.3)>0?1:-1;c.scale(facing,1);
 const size=28+session.species.difficulty*2;
 c.fillStyle='#f6b96e';c.beginPath();c.ellipse(0,0,size,16,0,0,Math.PI*2);c.fill();
 c.fillStyle='#e48757';c.beginPath();c.moveTo(-size+2,0);c.lineTo(-size-21,-15);
 c.lineTo(-size-21,15);c.closePath();c.fill();
 c.beginPath();c.moveTo(-7,-13);c.lineTo(-16,-27);c.lineTo(12,-15);c.closePath();c.fill();
 c.fillStyle='#fff';c.beginPath();c.arc(size-11,-4,4.5,0,Math.PI*2);c.fill();
 c.fillStyle='#18353f';c.beginPath();c.arc(size-10,-4,2.2,0,Math.PI*2);c.fill();
 c.restore();
 // Rod position is an independent movable target aligned with the fish.
 c.fillStyle='#e9fff1';c.fillRect(rodX-3,2,6,17);
 c.beginPath();c.arc(rodX,20,9,0,Math.PI*2);c.fillStyle='#76ebcf';c.fill();
 c.strokeStyle='#073244';c.lineWidth=2;c.stroke();
 c.fillStyle='#f4ffff';c.font='bold 12px system-ui';
 c.fillText('ROD',clamp(rodX-15,2,w-45),34);
 c.fillText('FISH',clamp(fishX-15,2,w-45),164);
 if(session.phase==='waiting'){
   c.fillStyle='#ffffff';c.font='bold 19px system-ui';c.fillText('Watch the water...',18,64);
 }else if(session.phase==='bite'){
   c.fillStyle='#ffe68f';c.font='bold 24px system-ui';c.fillText('BITE! SET THE HOOK!',18,64);
 }
}
export function showFishingPanel(session,fishing,{hook,cancel}={}){
 if(!root)makePanel();
 if(!session){hideFishingPanel();return;}
 onHook=hook;onCancel=cancel;
 root.style.display='block';
 const phase=session.phase;
 els.status.textContent=phase==='waiting'?'The float is drifting. Watch for the bite.':
  phase==='bite'?'Fish on! Set the hook before it swims away.':
  phase==='reeling'?'Track the fish with your rod. Reel when aligned, release before tension snaps.':'Cast complete.';
 const left=Math.max(0,session.reelRemaining||0);
 els.text.textContent=phase==='reeling'
   ?'A/D or drag the water to aim · Hold SPACE or HOLD TO REEL · Release to cool tension · '+
     Math.ceil(left)+'s remaining · '+session.species.name
   :phase==='bite'
     ?'SPACE or SET HOOK to hook! '+Math.max(0,session.hookWindow-session.hooked).toFixed(1)+'s left'
     :'Use SPACE to set the hook when the fish bites. Bait remaining: '+(fishing?.bait??0);
 hookButton.style.display=phase==='bite'?'inline-block':'none';
 reelButton.style.display=phase==='reeling'?'inline-block':'none';
 meter('progress',session.progress||0,'#7deab0');
 meter('tension',session.tension||0,(session.tension||0)>80?'#ff6971':
  (session.tension||0)>60?'#f6c46a':'#7deab0');
 draw(session);
}
