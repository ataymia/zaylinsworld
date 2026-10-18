// Accessible, self-contained fishing overlay; only the mini-game owns its input.
let element=null;
export function showFishingPanel(session,fishing){
 if(!element){
   element=document.createElement('div');
   element.id='zw-fishing-panel';
   Object.assign(element.style,{
     position:'fixed',left:'50%',bottom:'95px',transform:'translateX(-50%)',
     zIndex:'170',width:'min(450px,90vw)',padding:'17px 21px',
     border:'2px solid #62dce2',borderRadius:'16px',background:'rgba(5,25,38,.94)',
     boxShadow:'0 10px 28px #0009',color:'#fff',fontFamily:'system-ui',
     textAlign:'center',pointerEvents:'none',
   });
   document.body.appendChild(element);
 }
 if(!session){element.style.display='none';return;}
 element.style.display='block';
 const phase=session.phase;
 const title=phase==='waiting'?'🎣 Casting... wait for the bite':
   phase==='bite'?'🐟 BITE! Press SPACE NOW!':
   phase==='reeling'?'🎣 REEL IT IN! Tap SPACE':'🎣 Fishing';
 const message=phase==='waiting'?'Watch the bobber. Do not hook too early.':
   phase==='bite'?'You have about two seconds to hook the fish.':
   phase==='reeling'?'Reel progress: '+session.reelTaps+' / '+session.needed+
      ' · '+Math.max(0,Math.ceil(session.reelRemaining))+'s left':'';
 const progress=phase==='reeling'?session.reelTaps/session.needed:
   phase==='bite'?1-session.hooked/session.hookWindow:
     Math.min(1,session.elapsed/session.wait);
 const bar=document.createElement('div');
 Object.assign(bar.style,{height:'10px',borderRadius:'7px',background:'#17435a',
   margin:'12px 0 8px',overflow:'hidden'});
 const fill=document.createElement('div');fill.style.height='100%';
 fill.style.width=Math.round(Math.max(0,Math.min(1,progress))*100)+'%';
 fill.style.background=phase==='bite'?'#ffb649':'#53e6bc';
 bar.appendChild(fill);
 element.replaceChildren();
 const h=document.createElement('div');h.style.cssText='font-size:18px;font-weight:900';h.textContent=title;
 const sub=document.createElement('div');sub.style.cssText='font-size:12px;color:#c7e9ee;margin-top:8px';sub.textContent=message;
 const foot=document.createElement('div');foot.style.cssText='font-size:11px;color:#9db9c4';
 foot.textContent='Bait left: '+(fishing?.bait??0)+' · ESC cancels';
 element.append(h,sub,bar,foot);
}
export function hideFishingPanel(){if(element)element.style.display='none';}
