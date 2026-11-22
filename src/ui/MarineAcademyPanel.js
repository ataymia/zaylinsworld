// Native DOM learning panel: keyboard, pointer, touch, and screen-reader status.
let panel=null;
export function hideMarineAcademyPanel(){if(panel)panel.style.display='none';}
export function showMarineAcademyPanel(session,{answer,cancel}={}){
 if(!panel){
  panel=document.createElement('section');
  panel.id='zw-marine-academy';
  panel.setAttribute('role','dialog');
  panel.setAttribute('aria-label','Maritime Academy navigation lesson');
  panel.setAttribute('aria-modal','true');
  Object.assign(panel.style,{
   position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
   width:'min(480px,94vw)',boxSizing:'border-box',padding:'24px',zIndex:'186',
   border:'2px solid #87e2d3',borderRadius:'18px',background:'rgba(10,35,48,.97)',
   color:'#f3f8f5',fontFamily:'system-ui',boxShadow:'0 18px 48px #000a',
   textAlign:'center',pointerEvents:'auto',
  });
  document.body.appendChild(panel);
 }
 panel.replaceChildren();panel.style.display='block';
 const heading=document.createElement('h2');
 heading.textContent='🎓 Maritime Academy';
 heading.style.cssText='font-size:21px;margin:0 0 6px';
 const progress=document.createElement('p');
 progress.setAttribute('aria-live','polite');
 progress.style.cssText='font-size:13px;color:#a9f1e6';
 progress.textContent='Water Safety & Navigation · '+(session.index+1)+' / '+session.questions.length+' · correct '+session.score;
 const question=document.createElement('p');
 question.style.cssText='background:#17495b;padding:16px;border-radius:11px;font-weight:600;line-height:1.45';
 question.textContent=session.questions[session.index].prompt;
 const hint=document.createElement('p');
 hint.style.cssText='font-size:12px;color:#c3d7dc';
 hint.textContent='Choose a response with 1, 2 or 3, or tap a button. Score at least 3/4 to earn a certificate.';
 panel.append(heading,progress,question,hint);
 session.questions[session.index].choices.forEach((choice,i)=>{
  const button=document.createElement('button');
  button.type='button';
  button.textContent=(i+1)+'. '+choice;
  button.style.cssText='display:block;width:100%;margin:9px 0;padding:12px;border:1px solid #87e2d3;border-radius:10px;background:#205a67;color:white;cursor:pointer;min-height:44px;text-align:left';
  button.addEventListener('click',()=>answer?.(i),{once:true});
  panel.append(button);
 });
 const exit=document.createElement('button');
 exit.type='button';exit.textContent='Leave lesson (no grade)';
 exit.style.cssText='border:none;background:transparent;color:#c1d8d7;text-decoration:underline;margin-top:8px;padding:10px;cursor:pointer';
 exit.addEventListener('click',()=>cancel?.(),{once:true});
 panel.append(exit);
}
