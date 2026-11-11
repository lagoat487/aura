/* Shared admin event data. Publishing authority belongs to GitHub, never a local flag. */
(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./ultimate-team'):root.AuraUT,typeof module==='object'&&module.exports?require('./ultimate-save'):root.AuraUTSave);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.AuraLiveEvents=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(U,Save){
  'use strict';
  const REPO='lagoat487/aura',OWNER_ID=300236178,PATH='data/admin-live-99.json',MAX_BYTES=100000;
  const API='https://api.github.com/repos/'+REPO+'/contents/'+PATH;
  const RAW='https://raw.githubusercontent.com/'+REPO+'/main/'+PATH;
  const id=s=>typeof s==='string'&&/^[a-zA-Z0-9:_-]{1,100}$/.test(s);
  const text=(s,n)=>typeof s==='string'&&s.trim().length>0&&s.length<=n;
  const time=s=>typeof s==='string'&&s.length<=32&&Number.isFinite(Date.parse(s))&&/Z$/.test(s);
  const windowOK=o=>time(o.startsAt)&&(o.endsAt===null||time(o.endsAt)&&Date.parse(o.endsAt)>Date.parse(o.startsAt));
  const inWindow=(o,now)=>now>=Date.parse(o.startsAt)&&(o.endsAt===null||now<Date.parse(o.endsAt));
  const clone=o=>JSON.parse(JSON.stringify(o));
  function validate(data){
    if(!data||data.version!==1||!Number.isSafeInteger(data.revision)||data.revision<0||!Array.isArray(data.announcements)||data.announcements.length>30||!Array.isArray(data.gifts)||data.gifts.length>100)return null;
    const e=data.event;
    if(e!==null&&(!e||!id(e.id)||!text(e.title,70)||!windowOK(e)||typeof e.cancelled!=='boolean'))return null;
    const cues={};
    for(const [field,limit] of [['musicCue',900000],['fireworksCue',60000]]){const cue=data[field];if(cue===undefined)continue;if(cue!==null&&(!id(cue.id)||!time(cue.startsAt)||!time(cue.endsAt)||Date.parse(cue.endsAt)<=Date.parse(cue.startsAt)||Date.parse(cue.endsAt)-Date.parse(cue.startsAt)>limit))return null;cues[field]=cue?{id:cue.id,startsAt:cue.startsAt,endsAt:cue.endsAt}:null;}
    const boost=data.coinBoost;
    if(boost!==undefined&&boost!==null&&(!id(boost.id)||!time(boost.startsAt)||!time(boost.endsAt)||Date.parse(boost.endsAt)<=Date.parse(boost.startsAt)||Date.parse(boost.endsAt)-Date.parse(boost.startsAt)>60000))return null;
    const seen=new Set();
    for(const a of data.announcements){if(!a||!id(a.id)||seen.has('a:'+a.id)||!id(a.eventId)||!text(a.text,280)||!windowOK(a))return null;seen.add('a:'+a.id);}
    for(const g of data.gifts){if(!g||!id(g.id)||seen.has('g:'+g.id)||!id(g.eventId)||!text(g.playerId,200)||!windowOK(g)||(g.scope!==undefined&&g.scope!=='global'))return null;seen.add('g:'+g.id);}
    if(JSON.stringify(data).length>MAX_BYTES)return null;
    return {version:1,revision:data.revision,...cues,...(boost!==undefined?{coinBoost:boost?{id:boost.id,startsAt:boost.startsAt,endsAt:boost.endsAt}:null}:{}),event:e?{id:e.id,title:e.title,startsAt:e.startsAt,endsAt:e.endsAt,cancelled:e.cancelled}:null,
      announcements:data.announcements.map(a=>({id:a.id,eventId:a.eventId,text:a.text,startsAt:a.startsAt,endsAt:a.endsAt})),
      gifts:data.gifts.map(g=>({id:g.id,eventId:g.eventId,playerId:g.playerId,startsAt:g.startsAt,endsAt:g.endsAt,...(g.scope==='global'?{scope:'global'}:{})}))};
  }
  function status(feed,now=Date.now()){
    const e=feed?.event;
    return !e?'none':e.cancelled?'cancelled':now<Date.parse(e.startsAt)?'upcoming':e.endsAt!==null&&now>=Date.parse(e.endsAt)?'ended':'live';
  }
  function catalog(pool){
    const cards=[...pool];
    for(const fn of ['magiaCards','barcelonaCards','murallaCards','flashbackCards'])if(typeof U?.[fn]==='function')cards.push(...U[fn](pool));
    // Champions remains exclusive to promotional packs, as in the existing 9.9 economy.
    return [...new Map(cards.filter(p=>p?.real&&p.id&&p.overall>=1&&p.overall<=99&&!U.isChampions?.(p)).map(p=>[p.id,p])).values()];
  }
  function announcements(feed,now=Date.now()){
    const live=status(feed,now)==='live';
    return (feed?.announcements||[]).filter(a=>inWindow(a,now)&&(a.eventId==='global'||live&&a.eventId===feed.event.id));
  }
  function giftEntries(feed,club,now=Date.now()){
    const event=feed?.event,state=status(feed,now);
    const receipts=Array.isArray(club?.adminGiftReceipts)?club.adminGiftReceipts:[];
    return (feed?.gifts||[]).filter(g=>{
      if(g.endsAt!==null&&now>=Date.parse(g.endsAt))return false;
      return g.scope==='global'||g.eventId==='global'||event&&g.eventId===event.id&&!event.cancelled&&state!=='ended';
    }).map(g=>{
      const global=g.scope==='global'||g.eventId==='global',availableAt=global?Date.parse(g.startsAt):Math.max(Date.parse(g.startsAt),Date.parse(event.startsAt));
      return {...g,claimed:receipts.includes(g.eventId+':'+g.id),available:now>=availableAt&&(global||state==='live'),availableAt:new Date(availableAt).toISOString()};
    });
  }
  function gifts(feed,club,now=Date.now()){return giftEntries(feed,club,now).filter(g=>g.available);}
  function claim(storage,session,feed,giftId,cards,now=Date.now()){
    const checked=validate(feed),normalized=Save.normalize(session);
    if(!checked||!normalized)return {error:'Primero crea tu club de Ultimate Team.'};
    const gift=gifts(checked,session.club,now).find(g=>g.id===giftId);
    if(!gift)return {error:'Este regalo todavía no está disponible o ya finalizó.'};
    if(gift.claimed)return {error:'Ya reclamaste este regalo.'};
    const player=cards.find(p=>p.id===gift.playerId);
    if(!player?.real||U.isChampions?.(player))return {error:'La carta no está disponible en este catálogo. Actualiza AURA e inténtalo de nuevo.'};
    const original=session.club;
    if(original.adminGiftReceipts!==undefined&&(!Array.isArray(original.adminGiftReceipts)||original.adminGiftReceipts.some(s=>typeof s!=='string'||s.length>201)))return {error:'El historial de regalos de este respaldo no es válido.'};
    if((original.adminGiftReceipts||[]).length>=5000)return {error:'Se alcanzó el límite de regalos guardados.'};
    let current;
    try{current=Save.load(storage).snapshot;}catch{return {error:'No se pudo leer tu club.'};}
    if(!current||JSON.stringify(current.club)!==JSON.stringify(original))return {error:'Tu club cambió en otra pestaña. Recarga antes de reclamar.'};
    const club=clone(original),duplicate=club.owned.some(p=>p.id===player.id),copy={...clone(player),tradeable:false,adminGiftId:gift.id};
    if(duplicate){if(club.duplicates.length>=8000)return {error:'Libera espacio entre tus repetidos.'};copy.duplicate=true;copy.uid='duplicate:'+(++club.serial);club.duplicates.push(copy);}
    else{if(club.owned.length>=8000)return {error:'Tu club está lleno. Libera una carta antes de reclamar.'};club.owned.push(copy);}
    club.adminGiftReceipts=[...(club.adminGiftReceipts||[]),gift.eventId+':'+gift.id];
    if(!Save.save(storage,{...session,club}))return {error:'No se pudo guardar el regalo. Libera espacio y vuelve a intentarlo.'};
    return {ok:true,club,player:copy,duplicate};
  }
  function owner(user,repo){return user?.id===OWNER_ID&&repo?.full_name===REPO&&repo?.owner?.id===OWNER_ID&&repo?.permissions?.push===true;}
  function responseError(r){return r.status===401?'Acceso no válido. Conecta de nuevo tu GitHub.':r.status===409?'Otra publicación cambió el evento. Actualiza el panel y vuelve a intentarlo.':r.status===403?'GitHub no permite esta operación. Revisa el permiso Contents: Read and write del repositorio aura.':'No se pudo completar la operación con GitHub ('+r.status+').';}
  function encode(value){const bytes=new TextEncoder().encode(JSON.stringify(value,null,2)+'\n');let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s);}
  function decode(value){const s=atob(value.replace(/\s/g,''));return new TextDecoder().decode(Uint8Array.from(s,c=>c.charCodeAt(0)));}
  function publisher(fetcher){
    let token='',connected=false;
    const headers=()=>({Accept:'application/vnd.github+json',Authorization:'Bearer '+token});
    async function request(url,options={}){const r=await fetcher(url,{...options,headers:{...headers(),...options.headers},cache:'no-store',credentials:'omit',redirect:'error'});if(!r.ok)throw Error(responseError(r));return r.json();}
    async function connect(value){
      token=String(value||'').trim();connected=false;
      if(!token||token.length>500){token='';throw Error('Introduce el token de tu cuenta creadora.');}
      try{const user=await request('https://api.github.com/user'),repo=await request('https://api.github.com/repos/'+REPO);if(!owner(user,repo))throw Error('Solo la cuenta creadora lagoat487 puede publicar.');connected=true;return {login:user.login};}
      catch(error){token='';throw error;}
    }
    async function read(){if(!connected)throw Error('Conecta la cuenta creadora primero.');const file=await request(API+'?ref=main');if(file.encoding!=='base64'||file.size>MAX_BYTES)throw Error('Formato del evento no válido.');const feed=validate(JSON.parse(decode(file.content)));if(!feed)throw Error('El evento compartido contiene datos no válidos.');return {feed,sha:file.sha};}
    async function publish(expectedSha,mutate){
      const current=await read();if(current.sha!==expectedSha)throw Error('Otra publicación cambió el evento. Actualiza el panel y revisa los cambios.');
      const next=clone(current.feed);mutate(next);next.revision++;
      const feed=validate(next);if(!feed)throw Error('Revisa los datos, horarios o el límite de publicaciones.');
      const result=await request(API,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'AURA 9.9: actualizar evento del creador',branch:'main',sha:current.sha,content:encode(feed)})});
      if(!result.content?.sha)throw Error('GitHub no confirmó la publicación. Actualiza antes de volver a intentar.');
      return {feed,sha:result.content.sha};
    }
    return {connect,read,publish,disconnect(){token='';connected=false;},isConnected:()=>connected};
  }
  return {REPO,OWNER_ID,PATH,API,RAW,MAX_BYTES,validate,status,catalog,announcements,giftEntries,gifts,claim,owner,publisher};
});
