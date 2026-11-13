(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./ultimate-save'):root.AuraUTSave,typeof module==='object'&&module.exports?require('./squad'):root.AuraSquad);if(typeof module==='object'&&module.exports)module.exports=api;else root.AuraClubManagement=api;})(typeof globalThis!=='undefined'?globalThis:this,function(Save,Squad){
  'use strict';
  const clone=o=>JSON.parse(JSON.stringify(o));
  function change(storage,session,edit){
    if(!Save.normalize(session))return {error:'Primero crea o carga tu club.'};
    const current=Save.load(storage).snapshot;
    if(!current||JSON.stringify(current.club)!==JSON.stringify(session.club))return {error:'Tu club cambió. Recarga antes de borrar o recuperar una carta.'};
    const club=clone(session.club),result=edit(club);
    if(result.error)return result;
    if(!Save.save(storage,{...session,club}))return {error:'No se pudo guardar. Tu carta y tus monedas siguen intactas.'};
    return {...result,ok:true,club,cost:0};
  }
  function discard(storage,session,id,duplicate=false){return change(storage,session,club=>{
    const list=duplicate?club.duplicates:club.owned,index=list.findIndex(p=>(duplicate?p.uid:p.id)===id),player=list[index];
    if(!player)return {error:'Esta carta ya no está en tu club.'};
    const slot=duplicate?-1:club.xi.indexOf(id);list.splice(index,1);
    if(slot>=0){
      club.xi[slot]=null;
      const used=new Set(club.xi.filter(Boolean).map(key=>{const p=club.owned.find(p=>p.id===key);return p.originalId||p.id;})),pos=Squad.formations[club.formation][slot][0];
      const reserve=club.owned.filter(p=>!used.has(p.originalId||p.id)).sort((a,b)=>Squad.effective(b,pos)-Squad.effective(a,pos)||String(a.id).localeCompare(String(b.id)))[0];
      if(reserve)club.xi[slot]=reserve.id;
    }
    club.lastPack=club.lastPack.filter(p=>duplicate?p.uid!==id:!!p.duplicate||p.id!==id);
    club.discardUndo={card:clone(player),duplicate,slot};
    return {player};
  });}
  function undo(storage,session){return change(storage,session,club=>{
    const entry=club.discardUndo;if(!entry)return {error:'No hay una carta borrada para recuperar.'};
    const player=clone(entry.card),duplicate=entry.duplicate||club.owned.some(p=>p.id===player.id);
    if(duplicate){if(club.duplicates.length>=8000)return {error:'Libera espacio entre tus repetidos.'};player.duplicate=true;player.uid='duplicate:'+(++club.serial);club.duplicates.push(player);}
    else{
      if(club.owned.length>=8000)return {error:'Tu club está lleno.'};
      delete player.uid;delete player.duplicate;club.owned.push(player);
      if(entry.slot>=0&&club.xi[entry.slot]===null&&!club.xi.some(id=>{const p=club.owned.find(p=>p.id===id);return p&&(p.originalId||p.id)===(player.originalId||player.id);}))club.xi[entry.slot]=player.id;
    }
    club.discardUndo=null;return {player,duplicate};
  });}
  return {discard,undo};
});
