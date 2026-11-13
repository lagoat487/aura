(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./squad'):root.AuraSquad);if(typeof module==='object'&&module.exports)module.exports=api;else root.AuraStarterSquad80=api;})(typeof globalThis!=='undefined'?globalThis:this,function(Squad){
  'use strict';
  const ID='aura-starter80-20261113',clone=o=>JSON.parse(JSON.stringify(o)),identity=p=>p.originalId||p.id;
  function players(pool,formation='4-3-3'){
    const shape=Squad.formations[formation]||Squad.formations['4-3-3'],unique=new Map();
    for(const p of pool||[])if(p?.real&&!p.event&&!p.packOnly&&typeof p.id==='string'&&p.name&&p.pos&&Number.isFinite(p.overall)&&!unique.has(identity(p)))unique.set(identity(p),p);
    const available=[...unique.values()],chosen=Array(11),order=shape.map((_,i)=>i).sort((a,b)=>a===0?-1:b===0?1:available.filter(p=>Squad.positionPenalty(p,shape[a][0])===0).length-available.filter(p=>Squad.positionPenalty(p,shape[b][0])===0).length);
    if(available.length<11)return null;
    for(const index of order){
      const pos=shape[index][0];available.sort((a,b)=>Squad.positionPenalty(a,pos)-Squad.positionPenalty(b,pos)||Math.abs(a.overall-80)-Math.abs(b.overall-80)||String(a.id).localeCompare(String(b.id)));
      const base=available.shift();if(index===0&&base.pos!=='POR')return null;
      const p={...clone(base),id:'starter80:'+base.id,originalId:identity(base),overall:80,event:'starter-80',starter80Grant:ID,tradeable:false,fitness:95,morale:75};
      for(const key of ['uid','duplicate','adminPromoId','promoName','promoPrice','eventPrice','evolutionLevel'])delete p[key];
      chosen[index]=p;
    }
    return chosen;
  }
  function prepare(original,pool){
    if(original?.starter80Receipt===ID)return {ok:true,already:true,club:original,players:[]};
    const chosen=players(pool,original?.formation);if(!chosen)return {pending:true,error:'El catálogo inicial todavía está cargando.'};
    const club=clone(original),fresh=chosen.filter(p=>!club.owned.some(q=>q.id===p.id));
    if(club.owned.length+fresh.length>8000)return {error:'Libera espacio para recibir tus 11 jugadores iniciales.'};
    club.owned.push(...fresh);const used=new Set(club.xi.filter(Boolean).map(id=>identity(club.owned.find(p=>p.id===id)))),shape=Squad.formations[club.formation];
    for(let i=0;i<11;i++)if(club.xi[i]===null){
      const pos=shape[i][0],candidate=chosen.filter(p=>!used.has(identity(p))).sort((a,b)=>Squad.positionPenalty(a,pos)-Squad.positionPenalty(b,pos)||String(a.id).localeCompare(String(b.id)))[0];
      if(candidate){club.xi[i]=candidate.id;used.add(identity(candidate));}
    }
    club.starter80Receipt=ID;return {ok:true,club,players:fresh};
  }
  function grant(storage,session,pool,Save){
    if(!Save.normalize(session))return {error:'Primero crea o carga tu club.'};
    const current=Save.load(storage).snapshot;if(!current||JSON.stringify(current.club)!==JSON.stringify(session.club))return {error:'El club cambió. Recarga para recibir el once inicial.'};
    const result=prepare(session.club,pool);if(!result.ok||result.already)return result;
    if(!Save.save(storage,{...session,club:result.club}))return {error:'No se pudo guardar el once inicial. Vuelve a entrar en Ultimate Team.'};
    return result;
  }
  return {ID,players,prepare,grant};
});
