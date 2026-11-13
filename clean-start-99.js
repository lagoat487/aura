(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.AuraCleanStart=api;api.install(root.AuraUT,root.AuraAdminLocal,root.AuraPromotions,root.AuraUTSave,root.AuraStarterSquad80);}})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const installed=new WeakSet(),error=()=>({error:'Los regalos y bonos están pausados por el creador.'});
  function install(U,Admin,Promotions,Save,Starter){
    if(!U||!Admin||!Promotions||!Save||!Starter)return false;
    if(installed.has(U))return true;
    const create=U.create,setTimedCoins=U.setTimedCoins;
    U.create=(...args)=>{const seed=Starter.players(args[0]);if(!seed)throw Error('El catálogo inicial todavía está cargando.');const empty={...create(seed.map(p=>({...p,overall:76})),...args.slice(1)),resetId:Save.RESET_ID,resetByCreator:Save.RESET_ID,coins:0,owned:[],duplicates:[],xi:Array(11).fill(null),lastPack:[],promoCodeUses:{'45':0,'88':0}},result=Starter.prepare(empty,args[0]);if(!result.ok)throw Error(result.error);return result.club;};
    for(const name of ['claimMagiaGift','claimBarcelonaGift','claimMurallaGift','claimFlashbackGift','claimSigmaGift'])U[name]=error;
    U.activeEvents=[];U.setTimedCoins=()=>{setTimedCoins?.(null);return false;};setTimedCoins?.(null);
    installed.add(U);return true;
  }
  return {enabled:true,install};
});
