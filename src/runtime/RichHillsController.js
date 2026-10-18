// Rich Hills activities run as a small controller beside the existing world
// simulation. The Starter Town gameplay loop and weapon controls stay intact.
import {
 ensureRichHills,startGolf,golfMeter,swingGolf,startRichJob,tickRichJob,
 completeRichJob,startFinanceQuiz,answerFinanceQuiz,scenicTour,
} from './RichHillsLife.js';
import {showRichActivity,hideRichActivity} from '../ui/RichHillsPanel.js';
import {VALET_DESTINATION,DELIVERY_DESTINATION} from '../config/richHillsPlan.js';

export function createRichHillsController({
 getState,getPlayer,getCar,isDriving,notify,save,setDestination,refuel,
}){
 let activity=null;
 const state=()=>getState();
 const rich=()=>ensureRichHills(state());
 const busy=()=>!!activity;
 const finish=()=>{
  activity=null;hideRichActivity();
 };
 function onKey(key){
  if(!activity)return false;
  if(key==='escape'){finish();notify('Activity closed.');return true;}
  if(activity.kind==='golf' && key===' '){
   const result=swingGolf(activity.session,state());
   if(result.type==='golf-shot'){
    notify('⛳ '+result.score+'-point swing! +'+result.earned+' DreamBucks. Best: '+rich().golfBest+'.');
    save();
   }
   finish();return true;
  }
  if(activity.kind==='finance' && ['1','2','3'].includes(key)){
   const result=answerFinanceQuiz(state(),activity.session,Number(key)-1);
   notify(result.correct?'🏡 Correct! +20 DreamBucks and a finance lesson complete.'
     :'🏡 Keep learning! The correct answer was '+result.answer+' DreamBucks.');
   finish();save();return true;
  }
  return true;
 }
 function handleAction(action){
  const s=state(),r=rich(),job=r.activeJob;
  switch(action.kind){
   case 'golf':
    if(job){notify('⛳ Finish the active service shift before golfing.');break;}
    if(activity)return;
    activity={kind:'golf',session:startGolf(s)};
    showRichActivity(activity);
    notify('⛳ Crown Greens: tap SPACE when the pointer reaches the golden mark.');
    return;
   case 'realty':
    activity={kind:'finance',session:startFinanceQuiz(s)};
    showRichActivity(activity);
    notify('🏡 Golden Key Realty: answer using number keys 1, 2 or 3.');
    return;
   case 'valet':{
    const result=startRichJob(s,'valet');
    if(result.type==='started'){
     setDestination(VALET_DESTINATION);
     notify('🚘 Valet shift: drive to Crown Greens drop-off (4935, -430). Stop to deliver.');
    }else notify('🚘 Finish your existing service shift first.');
    break;
   }
   case 'delivery':{
    const result=startRichJob(s,'delivery');
    if(result.type==='started'){
     setDestination(DELIVERY_DESTINATION);
     notify('📦 Delivery accepted. Take the parcel to Estate Ridge Gate, then press E.');
    }else notify('📦 Complete the previous service job first.');
    break;
   }
   case 'estate':
    if(job?.kind==='delivery'){
     const result=completeRichJob(s,'delivery',{position:getPlayer()?.group?.position});
     if(result.type==='completed'){
      setDestination(null);
      notify('📦 Estate delivery completed! +'+result.pay+' DreamBucks.');
     }else notify('📦 Move up to the estate gate to deliver.');
    }else notify('🏘️ These estates are lived-in. Home purchasing and gate access come later.');
    break;
   case 'overlook':{
    const visit=scenicTour(s);
    notify('🌄 Panoramic overlook visited! Exploration stamp #'+visit.visits+'.');break;
   }
   case 'fuel':
    if(!getCar()||Math.hypot(getCar().g.position.x-action.x,getCar().g.position.z-action.z)>48)
     notify('⛽ Bring your own car to CrestFuel to refuel.');
    else refuel();
    break;
   case 'cafe':
    if(s.money<14){notify('☕ Service Village lunch costs 14 DreamBucks.');break;}
    s.money-=14;
    s.stats.hunger=Math.min(100,(s.stats.hunger||0)+32);
    s.stats.energy=Math.min(100,(s.stats.energy||0)+22);
    notify('☕ Lunch restored hunger and energy.');break;
   case 'clinic':
    if(s.money<25){notify('🏥 Clinic visit costs 25 DreamBucks.');break;}
    s.money-=25;s.stats.health=Math.min(100,(s.stats.health||0)+45);
    notify('🏥 Crestview Clinic restored health.');break;
   case 'academy':
    if(r.lastAcademyDay===s.day){notify('🎓 You completed today’s business class.');break;}
    r.lastAcademyDay=s.day;
    s.stats.smarts=Math.min(100,(s.stats.smarts||0)+6);
    notify('🎓 Legacy Prep business class complete. Smarts +6!');break;
   case 'police':
    notify('👮 Rich Hills Police desk is open. Officer careers arrive in a later phase.');break;
   case 'housing':
    notify('🏠 Service Village offers worker apartments; leases and interiors are still planned.');break;
   case 'marina':
    notify('⚓ Visit Rich Hills Marina piers. Moored yachts are scenery for now.');break;
   case 'yacht':
    notify('⛵ Summit Yacht Club welcomes visitors. Yacht piloting comes in a future pass.');break;
   case 'commons':notify('🌳 Garden Commons is open. Enjoy the fountain and green space.');break;
   case 'gallery':notify('🖼️ Gallery Crown exhibits are being prepared.');break;
   default:notify(action.name);
  }
  save();
 }
 function update(dt,active=false){
  if(active)tickRichJob(state(),dt);
  if(activity?.kind==='golf'){
   golfMeter(activity.session,dt);
   if(activity.session.phase==='missed'){
    finish();notify('⛳ Missed the swing window. Try another round.');return;
   }
  }
  if(activity)showRichActivity(activity);
 }
 function checkValetParking(vehicle){
  if(!vehicle||!isDriving()||Math.abs(vehicle.speed||0)>1.5)return false;
  if(rich().activeJob?.kind!=='valet')return false;
  const result=completeRichJob(state(),'valet',{
   inCar:true,carPosition:vehicle.g.position,
  });
  if(result.type!=='completed')return false;
  setDestination(null);
  notify('🚘 Car parked for the country club! +'+result.pay+' DreamBucks.');
  save();return true;
 }
 return {handleAction,onKey,update,busy,checkValetParking,
  snapshot:()=>({activity:activity?.kind||null,life:{...rich()}})};
}
