// Small interactive market job panel, usable with keyboard, mouse or touch.
import {MARKET_DESTINATIONS} from '../runtime/HarborMarketJob.js';
let root=null;
export function hideHarborMarketPanel(){if(root)root.style.display='none';}
export function showHarborMarketPanel(session,{choose,cancel}={}){
 if(!root){
  root=document.createElement('section');root.id='zw-harbor-market-job';
  Object.assign(root.style,{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
   width:'min(470px,94vw)',boxSizing:'border-box',padding:'22px',zIndex:'185',
   border:'2px solid #66dbe1',borderRadius:'16px',background:'rgba(8,30,42,.97)',
   color:'white',fontFamily:'system-ui',textAlign:'center',boxShadow:'0 12px 32px #000a',
   pointerEvents:'auto'});
  document.body.appendChild(root);
 }
 root.replaceChildren();root.style.display='block';
 const title=document.createElement('h2');
 title.textContent='🐟 Harbor Catch Market';title.style.cssText='font-size:20px;margin:0 0 10px';
 const progress=document.createElement('p');
 progress.textContent='Sorting shift · order '+(session.index+1)+' / 4 · correct '+session.score;
 progress.style.cssText='font-size:13px;color:#b2e5e9';
 const ticket=document.createElement('p');
 ticket.textContent=session.orders[session.index].text;
 ticket.style.cssText='background:#194a58;padding:15px;border-radius:10px;font-weight:600';
 const help=document.createElement('p');help.textContent='Select the appropriate handling station (1, 2, 3).';
 help.style.cssText='font-size:12px;color:#c9dce3';
 root.append(title,progress,ticket,help);
 MARKET_DESTINATIONS.forEach((station,i)=>{
  const btn=document.createElement('button');btn.type='button';
  btn.textContent=(i+1)+'. '+station.label;
  btn.style.cssText='display:block;width:100%;margin:8px 0;padding:11px;color:white;border:1px solid #8ee4e5;border-radius:10px;background:#1b5461;cursor:pointer';
  btn.addEventListener('click',()=>choose?.(station.id),{once:true});root.append(btn);
 });
 const close=document.createElement('button');close.type='button';close.textContent='Leave shift without pay';
 close.style.cssText='border:none;background:none;color:#cfdddd;text-decoration:underline;margin-top:10px;padding:8px;cursor:pointer';
 close.addEventListener('click',()=>cancel?.(),{once:true});root.append(close);
}
