(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AuraPromotions=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const MAX_PROMOS=12,MAX_CARDS=40,MAX_PRICE=1000000000;
  const accents=['violet','gold','ice','fire','emerald','barca'];
  const id=s=>typeof s==='string'&&/^[a-zA-Z0-9:_-]{1,60}$/.test(s);
  const text=(s,n)=>typeof s==='string'&&s.trim().length>0&&s.length<=n;
  const time=s=>typeof s==='string'&&s.length<=32&&/Z$/.test(s)&&Number.isFinite(Date.parse(s));
  const clone=o=>JSON.parse(JSON.stringify(o));
  const specials=new Map(),specialPlayers=new Map();
  const autogolesEntry=(p,c)=>p.id==='autogoles-special'&&c.id==='autogoles-minus67'&&c.playerId==='special:autogoles-minus67'&&c.overall===-67&&c.price===0;
  function validate(value,allowSpecial=false){
    if(!Array.isArray(value)||value.length>MAX_PROMOS)return null;
    const seen=new Set(),result=[];
    for(const p of value){
      if(!p||!id(p.id)||seen.has(p.id)||!text(p.name,70)||typeof p.description!=='string'||p.description.length>200||!accents.includes(p.accent)||typeof p.paused!=='boolean'||!time(p.startsAt)||(p.endsAt!==null&&(!time(p.endsAt)||Date.parse(p.endsAt)<=Date.parse(p.startsAt)))||!Array.isArray(p.cards)||!p.cards.length||p.cards.length>MAX_CARDS)return null;
      seen.add(p.id);const entries=new Set(),players=new Set(),cards=[];
      for(const c of p.cards){
        if(!c||!id(c.id)||entries.has(c.id)||!text(c.playerId,200)||players.has(c.playerId)||!Number.isInteger(c.overall)||(c.overall<1&&!(allowSpecial&&autogolesEntry(p,c)))||c.overall>99||!Number.isSafeInteger(c.price)||c.price<0||c.price>MAX_PRICE)return null;
        entries.add(c.id);players.add(c.playerId);cards.push({id:c.id,playerId:c.playerId,overall:c.overall,price:c.price});
      }
      result.push({id:p.id,name:p.name.trim(),description:p.description.trim(),accent:p.accent,paused:p.paused,startsAt:p.startsAt,endsAt:p.endsAt,cards});
    }
    return result;
  }
  function validateList(value){return validate(value);}
  function status(p,now=Date.now()){return p.paused?'paused':now<Date.parse(p.startsAt)?'upcoming':p.endsAt!==null&&now>=Date.parse(p.endsAt)?'ended':'live';}
  function registerSpecial(promo,players){
    const checked=validate([promo],true);
    if(!checked||!Array.isArray(players)||specials.has(promo.id)||specials.size>=MAX_PROMOS)return false;
    const catalog=new Map(players.filter(p=>p?.real&&text(p.id,200)&&text(p.name,200)&&text(p.pos,20)&&Number.isInteger(p.overall)&&((p.overall>=1&&p.overall<=99)||(p.overall===-67&&p.id==='special:autogoles-minus67'&&p.name==='EL DE LOS AUTOGOLES'))).map(p=>[p.id,p]));
    if(checked[0].cards.some(c=>!catalog.has(c.playerId)))return false;
    for(const [id,player] of catalog)specialPlayers.set(id,clone(player));
    specials.set(promo.id,checked[0]);return true;
  }
  function active(feed,now=Date.now()){return [...specials.values(),...(validateList(feed?.promotions||[])||[]).filter(p=>!specials.has(p.id))].filter(p=>status(p,now)==='live').map(clone);}
  function card(promo,entry,pool){
    const base=specialPlayers.get(entry.playerId)||pool.find(p=>p.id===entry.playerId);
    if(!base?.real||base.event==='champions'||String(base.id).startsWith('champions:'))return null;
    return {...clone(base),id:'promo:'+promo.id+':'+entry.id,originalId:base.originalId||base.id,event:'admin-promo',adminPromoId:promo.id,promoName:promo.name,promoAccent:promo.accent,promoPrice:entry.price,overall:entry.overall,tradeable:false};
  }
  function purchase(storage,session,feed,promoId,entryId,pool,U,Save,now=Date.now()){
    if(!Save.normalize(session))return {error:'Primero crea tu club de Ultimate Team.'};
    const promo=active(feed,now).find(p=>p.id===promoId),entry=promo?.cards.find(c=>c.id===entryId),player=entry&&card(promo,entry,pool);
    if(!player)return {error:'Esta promoción ya no está disponible. Actualiza los eventos.'};
    const current=Save.load(storage).snapshot;
    if(!current||JSON.stringify(current.club)!==JSON.stringify(session.club))return {error:'Tu club cambió en otra pestaña. Recarga antes de comprar.'};
    if(session.club.owned.some(p=>p.id===player.id))return {error:'Esta carta ya está en tu club.'};
    if(session.club.owned.length>=8000)return {error:'Tu club está lleno. Libera espacio antes de comprar.'};
    if(!U.canAfford(session.club,entry.price))return {error:'No tienes monedas suficientes.'};
    const club=clone(session.club);
    if(!U.hasUnlimited(club))club.coins-=entry.price;
    club.owned.push(player);club.purchases++;
    if(!Save.save(storage,{...session,club}))return {error:'No se pudo guardar la compra. No se descontaron monedas.'};
    return {ok:true,club,player,cost:entry.price};
  }
  return {MAX_PROMOS,MAX_CARDS,MAX_PRICE,accents,validateList,status,active,card,purchase,registerSpecial,isSpecialPromo:id=>specials.has(id)};
});
