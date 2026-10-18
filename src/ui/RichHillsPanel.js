// Key-driven golf and personal-finance overlay. No external UI framework.
// Panel always consumes its own input and keeps world movement suspended.
import {golfMeter,FINANCE_QUESTIONS} from '../runtime/RichHillsLife.js';
let element=null;
export function showRichActivity(activity){
 if(!element){
  element=document.createElement('section');
  element.id='zw-rich-hills-activity';
  element.setAttribute('role','status');
  element.setAttribute('aria-live','polite');
  Object.assign(element.style,{position:'fixed',zIndex:'175',left:'50%',bottom:'110px',
   transform:'translateX(-50%)',width:'min(480px,90vw)',padding:'18px',
   borderRadius:'16px',border:'2px solid #c9aa58',background:'rgba(22,32,40,.96)',
   color:'#fff8e7',boxShadow:'0 10px 30px #0009',fontFamily:'system-ui',
   pointerEvents:'none',textAlign:'center'});
  document.body.appendChild(element);
 }
 if(!activity){element.style.display='none';return;}
 element.style.display='block';
 element.replaceChildren();
 const h=document.createElement('h3');h.style.margin='0 0 8px';
 const desc=document.createElement('p');desc.style.fontSize='13px';
 const foot=document.createElement('div');foot.style.fontSize='12px';foot.style.color='#d6d0bd';
 if(activity.kind==='golf'){
  h.textContent='⛳ Crown Greens Putting Challenge';
  desc.textContent='Aim for the golden target. Tap SPACE when the moving pointer reaches it.';
  const line=document.createElement('div');
  Object.assign(line.style,{height:'20px',position:'relative',borderRadius:'9px',
   background:'linear-gradient(90deg,#8f4241,#d8b15c,#70b995,#d8b15c,#8f4241)'});
  const pointer=document.createElement('div');pointer.style.cssText='position:absolute;top:-4px;height:28px;width:4px;background:white;box-shadow:0 0 8px black';
  pointer.style.left=(golfMeter({...activity.session},0)*100).toFixed(1)+'%';
  const target=document.createElement('div');target.style.cssText='position:absolute;top:-7px;height:34px;width:3px;background:#ffd454';
  target.style.left=(activity.session.target*100)+'%';
  line.append(target,pointer);desc.append(line);
  foot.textContent='SPACE = swing · ESC = cancel · '+Math.max(0,Math.ceil(activity.session.seconds-activity.session.elapsed))+'s remaining';
 }else if(activity.kind==='finance'){
  const q=FINANCE_QUESTIONS[activity.session.question];
  h.textContent='🏡 Golden Key Property & Money Class';
  desc.textContent=q.text;
  const choices=document.createElement('div');
  choices.style.cssText='font-size:14px;text-align:left;padding:4px 18px';
  q.options.forEach((option,i)=>{
   const item=document.createElement('div');
   item.textContent=(i+1)+'. '+option+' DreamBucks';item.style.margin='6px 0';
   choices.appendChild(item);
  });
  desc.appendChild(choices);
  foot.textContent='Press 1, 2 or 3 to answer · ESC to close · Correct answer: 20 DreamBucks';
 }else return;
 element.append(h,desc,foot);
}
export function hideRichActivity(){if(element)element.style.display='none';}
