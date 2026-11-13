/* Private unlimited coins for this browser. Saved balances stay finite; no real money. */
(function(root,factory){
 const common=typeof module==='object'&&module.exports;
 const api=factory(common?require('./ultimate-save'):root.AuraUTSave,common?require('node:crypto').webcrypto:root.crypto,common?require('./ultimate-team'):root.AuraUT);
 if(common)module.exports=api;else root.AuraAdminLocal=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Save,Crypto,U){
 'use strict';
 const HASH='e8e758fc4921bc081f1249c363724fcce13214795d535174107a5a2c936a8e0d',KEY='aura-admin-local-'+HASH.slice(0,16);
 function marked(club){return Array.isArray(club?.localAdminCredits)&&club.localAdminCredits.includes(HASH);}
 function restore(storage,club){
  let enabled=false;
  try{enabled=marked(club)&&storage?.getItem(KEY)===HASH;}catch{}
  return !!U?.setUnlimited?.(club,enabled);
 }
 function rollbackReceipt(storage,previous){try{if(previous===null)storage.removeItem(KEY);else storage.setItem(KEY,previous);}catch{}}
 async function redeem(storage,session,code,formations,current=()=>true){
  if(!storage?.getItem||!storage?.setItem||!storage?.removeItem)return {error:'No se puede guardar en este navegador.'};
  if(!Save.normalize(session,formations))return {error:'Primero crea o carga tu club de Ultimate Team.'};
  if(typeof U?.setUnlimited!=='function')return {error:'Recarga la versión actualizada de AURA.'};
  const original=session.club,text=String(code||'').trim().toUpperCase();let before,receipt;
  try{before=storage.getItem(Save.KEY);receipt=storage.getItem(KEY);}catch{return {error:'No se puede leer el club guardado.'};}
  if(!text||text.length>96)return {error:'Introduce tu código privado.'};
  if(text==='45'||text==='88'){
   const counts=original.promoCodeUses||{},legacy45=(original.adminGiftReceipts||[]).filter(id=>id==='global:code45-jose-jose-99'||id.startsWith('global:code45-jose-jose-99:')).length;
   const uses=counts[text]??(text==='45'?legacy45:original.promoCode88Claimed?1:0);
   if(!Number.isSafeInteger(uses)||uses<0)return {error:'El historial del código no es válido.'};
   const saved=Save.load(storage,formations).snapshot;
   if(!current()||storage.getItem(Save.KEY)!==before||!saved||JSON.stringify(saved.club)!==JSON.stringify(original))return {error:'El club cambió. Recarga y vuelve a intentarlo.'};
   const club=JSON.parse(JSON.stringify(original));let player,duplicate=false;
   if(text==='45'){
    const common=typeof module==='object'&&module.exports,P=common?require('./creator-promotions-99'):globalThis.AuraPromotions,Jose=common?require('./jose-jose-special-99'):globalThis.AuraJoseSpecial;
    if(!P||!Jose)return {error:'Recarga AURA 9.9 para activar el código 45.'};
    player=P.card(Jose.promotion,Jose.promotion.cards[0],[Jose.player]);
    if(!player)return {error:'La carta JOSE JOSE todavía no está disponible. Recarga AURA.'};
    const giftId='code45-jose-jose-99:'+(uses+1);player={...player,tradeable:false,adminGiftId:giftId};duplicate=club.owned.some(p=>p.id===player.id);
    if(duplicate){if(club.duplicates.length>=8000)return {error:'Libera espacio entre tus repetidos.'};player.duplicate=true;player.uid='duplicate:'+(++club.serial);club.duplicates.push(player);}
    else{if(club.owned.length>=8000)return {error:'Tu club está lleno.'};club.owned.push(player);}
    const marker='global:code45-jose-jose-99';
    if(!(club.adminGiftReceipts||[]).includes(marker)&&(club.adminGiftReceipts||[]).length<5000)club.adminGiftReceipts=[...(club.adminGiftReceipts||[]),marker];
   }else{club.coins+=60000000;club.promoCode88Claimed=true;}
   club.promoCodeUses={...counts,[text]:uses+1};
   if(!Save.normalize({...session,club},formations))return {error:'El saldo o el club supera el límite de guardado.'};
   if(!Save.save(storage,{...session,club},formations))return {error:'No se pudo guardar el regalo. Vuelve a intentarlo.'};
   return {ok:true,club,rewardCode:text,uses:uses+1,unlimitedRedemptions:true,...(player?{player,duplicate}:{coins:60000000})};
  }
  if(!Crypto?.subtle)return {error:'Abre AURA mediante su enlace HTTPS para canjear el código.'};
  const digest=await Crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  const hash=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
  if(hash!==HASH)return {error:'Código no válido.'};
  try{if(!current()||storage.getItem(Save.KEY)!==before)return {error:'El club cambió. Vuelve a intentarlo.'};}catch{return {error:'No se puede leer el club guardado.'};}
  if(receipt&&((!marked(original)&&original.resetByCreator!==Save.RESET_ID)||receipt!==HASH))return {error:'Este código ya pertenece a otro club de este navegador.'};
  if(receipt===HASH&&marked(original)){restore(storage,original);return {ok:true,unlimited:true,already:true,club:original};}
  const club={...original,localAdminCredits:[...new Set([...(Array.isArray(original.localAdminCredits)?original.localAdminCredits:[]),HASH])]};
  const next={...session,club};
  try{Save.pack(next,formations);}catch{return {error:'No se pudo verificar el club.'};}
  try{
   storage.setItem(KEY,HASH);
   if(!Save.save(storage,next,formations)){rollbackReceipt(storage,receipt);return {error:'No se pudo guardar la activación. Vuelve a intentarlo.'};}
  }catch{rollbackReceipt(storage,receipt);return {error:'No se pudo guardar la activación.'};}
  restore(storage,club);
  return {ok:true,unlimited:true,club};
 }
 return {redeem,restore,receiptKey:KEY,grantId:HASH};
});
