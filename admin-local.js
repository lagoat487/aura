/* Private-code credit for the club stored in this browser. No server or real money. */
(function(root,factory){
 const common=typeof module==='object'&&module.exports;
 const api=factory(common?require('./ultimate-save'):root.AuraUTSave,common?require('node:crypto').webcrypto:root.crypto);
 if(common)module.exports=api;else root.AuraAdminLocal=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Save,Crypto){
 'use strict';
 const HASH='e8e758fc4921bc081f1249c363724fcce13214795d535174107a5a2c936a8e0d',AMOUNT=30000000,KEY='aura-admin-local-'+HASH.slice(0,16);
 async function redeem(storage,session,code,formations,current=()=>true){
  if(!storage?.getItem||!storage?.setItem||!storage?.removeItem)return {error:'No se puede guardar en este navegador.'};
  if(!Save.normalize(session,formations))return {error:'Primero crea o carga tu club de Ultimate Team.'};
  const original=session.club,before=storage.getItem(Save.KEY),text=String(code||'').trim().toUpperCase();
  if(!text||text.length>96)return {error:'Introduce tu código privado.'};
  if(!Crypto?.subtle)return {error:'Abre AURA mediante su enlace HTTPS para canjear el código.'};
  const digest=await Crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  const hash=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
  if(hash!==HASH)return {error:'Código no válido.'};
  if(!current()||storage.getItem(Save.KEY)!==before)return {error:'El club cambió. Vuelve a intentarlo.'};
  if(storage.getItem(KEY)||(Array.isArray(original.localAdminCredits)&&original.localAdminCredits.includes(HASH)))return {error:'Este código ya se canjeó en este navegador.'};
  if(!Number.isSafeInteger(original.coins)||original.coins<0||original.coins>1e12-AMOUNT)return {error:'El saldo no admite esta recarga.'};
  const club={...original,coins:original.coins+AMOUNT,localAdminCredits:[...(Array.isArray(original.localAdminCredits)?original.localAdminCredits:[]),HASH]};
  const next={...session,club};
  // Verify the entire saved club before claiming the browser receipt.
  try{Save.pack(next,formations);}catch{return {error:'No se pudo verificar el club. No se añadieron monedas.'};}
  try{
   storage.setItem(KEY,HASH);
   if(!Save.save(storage,next,formations)){
    storage.removeItem(KEY);return {error:'No se pudo guardar la recarga. Vuelve a intentarlo.'};
   }
  }catch{try{storage.removeItem(KEY);}catch{}return {error:'No se pudo guardar la recarga.'};}
  return {ok:true,coins:AMOUNT,club};
 }
 return {redeem,amount:AMOUNT,receiptKey:KEY,grantId:HASH};
});
