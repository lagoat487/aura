(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.AuraAutogolesSpecial=api;api.install(root.AuraPromotions);}})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const photo='./assets/cards/el-de-los-autogoles-minus67.png';
  const player=Object.freeze({id:'special:autogoles-minus67',originalId:'special:autogoles-minus67',name:'EL DE LOS AUTOGOLES',overall:-67,pos:'DFC',real:true,club:'aura-special',sourceClub:'AURA SPECIAL',leagueId:'aura-special',leagueLabel:'AURA SPECIAL',photo});
  const promotion=Object.freeze({id:'autogoles-special',name:'EL DE LOS AUTOGOLES',description:'Carta especial de AURA · −67 GRL · Gratis para tu club.',accent:'ice',paused:false,startsAt:'2026-11-13T00:00:00.000Z',endsAt:null,cards:Object.freeze([Object.freeze({id:'autogoles-minus67',playerId:player.id,overall:-67,price:0})])});
  function install(promotions){if(!promotions)throw Error('Falta el catálogo de promociones.');return promotions.isSpecialPromo?.(promotion.id)||promotions.registerSpecial(promotion,[player]);}
  return {player,promotion,photo,install};
});
