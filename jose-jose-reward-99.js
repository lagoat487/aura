(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AuraJoseSpecial=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const photo='https://aura-admin-emilio-99.emilio-hilman.chatgpt.site/assets/cards/jose-jose-99.jpeg';
  const player=Object.freeze({id:'special:jose-jose-99',originalId:'special:jose-jose-99',name:'JOSE JOSE',overall:99,pos:'DC',real:true,club:'aura-special',sourceClub:'AURA SPECIAL',leagueId:'aura-special',leagueLabel:'AURA SPECIAL',photo});
  const promotion=Object.freeze({id:'jose-jose-special',name:'JOSE JOSE',description:'Edición especial de AURA · 99 GRL · 67.000.000 de monedas.',accent:'gold',paused:false,startsAt:'2026-11-12T00:00:00.000Z',endsAt:null,cards:Object.freeze([Object.freeze({id:'jose-jose-99',playerId:player.id,overall:99,price:67000000})])});
  function install(promotions){if(!promotions)throw Error('Falta el catálogo de promociones.');return promotions.isSpecialPromo?.(promotion.id)||promotions.registerSpecial(promotion,[player]);}
  return {player,promotion,photo,install};
});
