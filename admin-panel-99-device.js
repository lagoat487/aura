(function(){
  'use strict';
  const E=AuraLiveEvents,$=id=>document.getElementById(id),publisher=AuraAdminDevice.create(window.fetch.bind(window),{activation:AuraAdminDevice.takeActivation(window)}),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let current=null,selected=null,busy=false,notificationTimer;
  const normal=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  // The bundled catalog loads synchronously before the Promise returned by load.
  AuraWorld.load(AuraClubs.clubs,AuraCompetitions.definitions).catch(()=>notice('No se pudo cargar el catálogo completo. Recarga el panel.',true));
  const cards=E.catalog(AuraRosterSync.pool()).sort((a,b)=>b.overall-a.overall||a.name.localeCompare(b.name));
  const iso=local=>new Date(local+':00-05:00').toISOString();
  const local=stamp=>stamp?new Date(Date.parse(stamp)-5*3600000).toISOString().slice(0,16):'';
  const time=stamp=>new Date(stamp).toLocaleString('es-EC',{timeZone:'America/Guayaquil',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:true});
  const uid=prefix=>prefix+':'+crypto.randomUUID();
  function notice(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);clearTimeout(notificationTimer);notificationTimer=setTimeout(()=>{$('status').textContent='';},error?15000:9000);}
  function lock(value){busy=value;document.querySelectorAll('#admin-controls button,#pin-enter').forEach(b=>b.disabled=value);if(!value)$('publish-gift').disabled=!selected;}
  function eventRequired(){if(!current?.feed.event||current.feed.event.cancelled||E.status(current.feed)==='ended')throw Error('Programa o inicia un evento antes de publicar.');return current.feed.event;}
  function when(value){const event=eventRequired();if(value==='now'&&E.status(current.feed)!=='live')throw Error('El evento aún no está en vivo. Elige «Al comenzar el evento».');return value==='start'?event.startsAt:new Date().toISOString();}
  function render(){
    if(!current)return;const {feed}=current,event=feed.event,state=E.status(feed);
    $('event-title').textContent=event?.title||'TU PRÓXIMO EVENTO';$('event-name').value=event?.title||'ADMIN ABUSE';$('event-start').value=local(event?.startsAt);$('event-end').value=local(event?.endsAt);
    $('event-state').textContent=!event?'Sin evento programado.':state==='upcoming'?'PROGRAMADO · '+time(event.startsAt)+' · Ecuador':state==='live'?'EN VIVO · Los jugadores ya pueden entrar.':'FINALIZADO';
    $('message-when').value='now';$('gift-when').value=state==='live'?'now':'start';
    $('sync-state').textContent='ADMIN CONECTADO · REVISIÓN '+feed.revision;
    const items=[...feed.announcements.filter(a=>a.eventId==='global'||a.eventId===event?.id).map(a=>({id:a.id,type:'announcement',title:(a.eventId==='global'?'AVISO GLOBAL · ':'AVISO · ')+a.text,start:a.startsAt})),...feed.gifts.filter(g=>g.eventId===event?.id).map(g=>({id:g.id,type:'gift',title:'REGALO · '+(cards.find(p=>p.id===g.playerId)?.name||g.playerId),start:g.startsAt}))];
    $('published-items').innerHTML=items.length?items.reverse().map(item=>'<article class="history-item"><div>'+esc(item.title)+'<small>'+esc(time(item.start))+' · Ecuador</small></div><button data-remove="'+item.type+'" data-id="'+esc(item.id)+'" type="button">Retirar</button></article>').join(''):'<p>No has publicado regalos ni avisos para este evento.</p>';
  }
  function search(){const q=normal($('player-search').value.trim()),type=$('card-type').value,found=cards.filter(p=>(!q||normal(p.name+' '+(p.sourceClub||p.club||'')).includes(q))&&(type==='all'||type==='event'&&!!p.event||type==='base'&&!p.event)).slice(0,24);$('player-results').innerHTML=found.length?found.map(p=>'<button class="player-option" data-player="'+esc(p.id)+'" aria-pressed="'+(selected?.id===p.id)+'" type="button"><b>'+p.overall+'</b> <small>'+esc(p.pos)+'</small><strong>'+esc(p.name)+'</strong><span>'+esc(p.event||'CARTA BASE')+'</span></button>').join(''):'<p>No se encontraron futbolistas.</p>';}
  async function change(mutate,message){
    if(busy||!current)return;lock(true);
    try{current=await publisher.publish(current.sha,mutate);render();notice(message+' El tablón se actualizará para los jugadores.');}
    catch(error){notice(error.message,true);}
    finally{lock(false);}
  }
  function endSession(){publisher.disconnect();current=null;$('admin-controls').hidden=true;$('pin-panel').hidden=false;$('admin-pin').value='';$('owner-badge').textContent='ACCESO EXCLUSIVO · CREADOR';}
  $('pin-form').addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;const code=$('admin-pin').value;$('admin-pin').value='';lock(true);
    try{await publisher.connect(code);current=await publisher.read();$('pin-panel').hidden=true;$('admin-controls').hidden=false;$('owner-badge').textContent='CREADOR · NAVEGADOR AUTORIZADO';render();search();notice('Panel abierto. Ya puedes preparar el evento.');}
    catch(error){publisher.disconnect();notice(error.message,true);}finally{lock(false);}
  });
  $('disconnect').addEventListener('click',()=>{if(busy)return;endSession();notice('Sesión cerrada.');});
  $('refresh').addEventListener('click',async()=>{if(busy)return;lock(true);try{current=await publisher.read();render();notice('Tablón actualizado.');}catch(error){notice(error.message,true);}finally{lock(false);}});
  $('schedule-form').addEventListener('submit',event=>{
    event.preventDefault();try{const title=$('event-name').value.trim(),startsAt=iso($('event-start').value),endsAt=$('event-end').value?iso($('event-end').value):null;if(!title)throw Error('Escribe el nombre del evento.');if(endsAt&&Date.parse(endsAt)<=Date.parse(startsAt))throw Error('El fin debe ser posterior al inicio.');const previous=current?.feed.event,reuse=previous&&!previous.cancelled&&E.status(current.feed)!=='ended';change(feed=>{feed.event={id:reuse?previous.id:uid('event'),title,startsAt,endsAt,cancelled:false};if(!reuse){feed.announcements=feed.announcements.filter(a=>a.eventId==='global');feed.gifts=[];}if(reuse)for(const a of [...feed.announcements,...feed.gifts])if(a.eventId===previous.id){if(a.startsAt===previous.startsAt)a.startsAt=startsAt;if(a.endsAt===previous.endsAt)a.endsAt=endsAt;}},'Horario del evento guardado.');}catch(error){notice(error.message,true);}
  });
  $('start-now').addEventListener('click',()=>{const previous=current?.feed.event,reuse=previous&&!previous.cancelled&&E.status(current.feed)!=='ended',startsAt=new Date().toISOString();change(feed=>{feed.event={id:reuse?previous.id:uid('event'),title:$('event-name').value.trim()||'ADMIN ABUSE',startsAt,endsAt:null,cancelled:false};if(!reuse){feed.announcements=feed.announcements.filter(a=>a.eventId==='global');feed.gifts=[];}if(reuse){for(const a of [...feed.announcements,...feed.gifts])if(a.eventId===previous.id&&Date.parse(a.startsAt)>=Date.parse(previous.startsAt))a.startsAt=startsAt;}},'Evento en vivo.');});
  $('stop-event').addEventListener('click',()=>change(feed=>{if(feed.event)feed.event.cancelled=true;},'Evento finalizado. Los jugadores conservan sus cartas.'));
  $('announcement').addEventListener('input',()=>{$('message-count').textContent=$('announcement').value.length+' / 280';});
  $('message-form').addEventListener('submit',event=>{event.preventDefault();try{const text=$('announcement').value.trim();if(!text)throw Error('Escribe el aviso primero.');const scheduled=$('message-when').value==='start',e=scheduled?eventRequired():null,startsAt=scheduled?e.startsAt:new Date().toISOString();change(feed=>{feed.announcements.push({id:uid('notice'),eventId:scheduled?e.id:'global',text,startsAt,endsAt:scheduled?e.endsAt:null});},'Aviso publicado.');}catch(error){notice(error.message,true);}});
  $('player-search').addEventListener('input',search);$('card-type').addEventListener('change',search);
  $('player-results').addEventListener('click',event=>{const target=event.target.closest('[data-player]');if(!target)return;selected=cards.find(p=>p.id===target.dataset.player);if(!selected)return;$('selected-gift').innerHTML='<b>'+esc(selected.name)+' · '+selected.overall+' GRL</b> · '+esc(selected.pos)+' · '+esc(selected.event||'Carta base')+'<code>'+esc(selected.id)+'</code>';$('publish-gift').disabled=busy;search();});
  $('gift-form').addEventListener('submit',event=>{event.preventDefault();try{if(!selected)throw Error('Selecciona un futbolista.');const e=eventRequired(),startsAt=when($('gift-when').value),playerId=selected.id;change(feed=>{feed.gifts.push({id:uid('gift'),eventId:e.id,playerId,startsAt,endsAt:e.endsAt});},'Jugador de regalo publicado.');}catch(error){notice(error.message,true);}});
  $('published-items').addEventListener('click',event=>{const button=event.target.closest('[data-remove]');if(!button)return;const key=button.dataset.remove==='gift'?'gifts':'announcements';change(feed=>{feed[key]=feed[key].filter(item=>item.id!==button.dataset.id);},'Publicación retirada.');});
  window.addEventListener('pagehide',endSession);
})();
