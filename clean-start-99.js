(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.AuraCleanStart=api;api.install(root.AuraUT,root.AuraAdminLocal,root.AuraPromotions,root.AuraUTSave);}})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const installed=new WeakSet(),error=()=>({error:'Los regalos y bonos están pausados por el creador.'});
  function install(U,Admin,Promotions,Save){
    if(!U||!Admin||!Promotions||!Save)return false;
    if(installed.has(U))return true;
    const create=U.create,redeem=Admin.redeem,setTimedCoins=U.setTimedCoins;
    U.create=(...args)=>({...create(...args),resetId:Save.RESET_ID,resetByCreator:Save.RESET_ID,coins:0,owned:[],duplicates:[],xi:Array(11).fill(null),lastPack:[],promoCodeUses:{'45':0,'88':0}});
    for(const name of ['claimMagiaGift','claimBarcelonaGift','claimMurallaGift','claimFlashbackGift','claimSigmaGift'])U[name]=error;
    U.activeEvents=[];U.setTimedCoins=()=>{setTimedCoins?.(null);return false;};setTimedCoins?.(null);
    Admin.redeem=(storage,session,code,...args)=>['45','88'].includes(String(code||'').trim())?Promise.resolve(error()):redeem(storage,session,code,...args);
    Promotions.active=()=>[];Promotions.purchase=error;
    installed.add(U);return true;
  }
  return {enabled:true,install};
});
