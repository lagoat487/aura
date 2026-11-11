/* Non-blocking event drawer, shared by every game mode. No administrator secrets here. */
(function(){
  'use strict';
  const E=AuraLiveEvents,esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let feed=null,open=false,pending=false,lastOK=0,error='',selectedTab='',noticeTimer;
  const shown=new Set();let notice=null;
  const host=document.createElement('aside');host.id='aura-live';host.setAttribute('aria-label','Evento del creador');document.body.append(host);
  function announce(){
    const fresh=E.announcements(feed).filter(a=>!shown.has(a.id));
    if(!fresh.length)return;for(const a of fresh)shown.add(a.id);
    const a=fresh[fresh.length-1];if(!notice){notice=document.createElement('div');notice.className='live-announcement';notice.setAttribute('role','status');document.body.append(notice);}
    notice.replaceChildren();const label=document.createElement('strong'),message=document.createElement('p'),close=document.createElement('button');
    label.textContent='EMILIO · CREADOR';message.textContent=a.text;close.textContent='✕';close.setAttribute('aria-label','Cerrar aviso');close.onclick=()=>{notice.hidden=true;};notice.append(label,message,close);notice.hidden=false;
    clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{notice.hidden=true;},12000);
  }
  const format=s=>new Date(s).toLocaleString('es-EC',{timeZone:'America/Guayaquil',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:true});
  const catalog=()=>E.catalog(typeof AuraUTUI!=='undefined'?AuraUTUI.pool():AuraRosterSync.pool());
  function clock(){const e=feed?.event;if(!e)return '';const state=E.status(feed);if(state==='live')return 'EN VIVO';if(state==='upcoming'){const s=Math.max(0,Math.ceil((Date.parse(e.startsAt)-Date.now())/1000));return [Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(v=>String(v).padStart(2,'0')).join(':');}return 'FINALIZADO';}
  function render(){
    if(!feed?.event){host.innerHTML='<button class="live-chip" data-live="toggle" aria-expanded="'+open+'">✦ Eventos del creador</button>'+(open?'<section class="live-drawer"><h2>EVENTOS DEL CREADOR</h2><p>'+esc(error||'Cargando el tablón…')+'</p><button class="btn" data-live="refresh">Actualizar</button><button class="btn" data-live="toggle">Cerrar</button></section>':'');return;}
    const event=feed.event,state=E.status(feed),club=typeof AuraUTUI!=='undefined'?AuraUTUI.getClub():null,cards=catalog(),gifts=E.gifts(feed,club),messages=E.announcements(feed);
    host.innerHTML='<button class="live-chip '+(state==='live'?'is-live':'')+'" data-live="toggle" aria-expanded="'+open+'"><span class="live-dot"></span>'+esc(event.title)+' <b data-live-clock>'+clock()+'</b>'+(gifts.some(g=>!g.claimed)?'<span class="live-count">'+gifts.filter(g=>!g.claimed).length+' 🎁</span>':'')+'</button>'+(open?'<section class="live-drawer" role="region" aria-label="Tablón del evento"><div class="live-heading"><span class="eyebrow">AURA 9.9 · CREADOR</span><button class="live-close" data-live="toggle" aria-label="Cerrar evento">✕</button></div><h2>'+esc(event.title)+'</h2><p class="live-time">'+(state==='upcoming'?'Empieza '+format(event.startsAt)+' · Ecuador':state==='live'?'EN VIVO · '+(event.endsAt?'Hasta '+format(event.endsAt):'El creador anunciará el cierre.'):'Este evento ha finalizado.')+'</p>'+
      (messages.length?'<div class="live-messages" aria-label="Avisos del creador">'+messages.slice(-5).reverse().map(a=>'<article><b>EMILIO · CREADOR</b><p>'+esc(a.text)+'</p></article>').join(''):'<p class="live-empty">'+(state==='upcoming'?'Los avisos aparecerán cuando comience el evento.':'Todavía no hay avisos publicados.')+'</p>')+
      '<h3>JUGADORES DE REGALO</h3>'+(state!=='live'?'<p>Los regalos estarán disponibles durante el evento.</p>':!gifts.length?'<p>Espera a que el creador publique los futbolistas.</p>':gifts.map(g=>{const p=cards.find(p=>p.id===g.playerId);return '<article class="live-gift"><span class="live-rating">'+(p?.overall||'?')+'</span><div><b>'+esc(p?.name||'Carta pendiente de catálogo')+'</b><small>'+esc(p?.pos||'Actualiza AURA')+' · '+esc(p?.event||'Carta base')+'</small></div><button class="btn primary" data-live="claim" data-gift="'+esc(g.id)+'" '+(g.claimed||!p?'disabled':'')+'>'+(g.claimed?'Reclamado':club?'Reclamar':'Crear club UT')+'</button></article>';}).join(''))+
      '<p class="live-save-note">Un canje por regalo y club guardado en este navegador. Los repetidos se conservan en tu club.</p><div class="live-bottom"><button class="btn small" data-live="refresh" '+(pending?'disabled':'')+'>'+(pending?'Actualizando…':'Actualizar tablón')+'</button><span>'+(error?esc(error):lastOK?'Actualizado '+new Date(lastOK).toLocaleTimeString('es-EC',{timeZone:'America/Guayaquil',hour:'2-digit',minute:'2-digit'}):'')+'</span></div>'+
      (club&&AuraUT.hasUnlimited?.(club)?'<a class="live-owner-link" href="./admin-99.html" target="_blank" rel="noopener">Abrir panel del creador ↗</a>':'')+'</section>':'');
  }
  async function refresh(){
    if(pending)return;pending=true;error='';if(open)render();
    try{
      const hosted=/^(raw|rawcdn)\.githack\.com$/.test(location.hostname),url=hosted?(typeof AuraLiveService!=='undefined'?AuraLiveService.feed:E.RAW)+'?aura_live='+Date.now():'./'+E.PATH+'?aura_live='+Date.now();
      const response=await fetch(url,{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(12000)});
      if(!response.ok)throw Error('offline');const raw=await response.text();if(raw.length>E.MAX_BYTES)throw Error('size');
      const next=E.validate(JSON.parse(raw));if(!next)throw Error('invalid');if(!feed||next.revision>=feed.revision)feed=next;lastOK=Date.now();announce();
    }catch{error='Sin conexión al tablón. Vuelve a actualizar.';}finally{pending=false;render();}
  }
  host.addEventListener('click',event=>{
    const button=event.target.closest('[data-live]');if(!button)return;
    const action=button.dataset.live;
    if(action==='toggle'){open=!open;render();return;}
    if(action==='refresh'){refresh();return;}
    if(action==='claim'){
      const club=AuraUTUI.getClub();if(!club){notify('Crea tu club en Ultimate Team y vuelve a reclamar el regalo.');return;}
      const session=AuraUTSave.load(localStorage).snapshot;
      const result=session&&JSON.stringify(session.club)===JSON.stringify(club)?E.claim(localStorage,session,feed,button.dataset.gift,catalog()):{error:'Tu club cambió. Recarga antes de reclamar.'};
      if(result.ok)Object.assign(club,result.club);
      if(result?.ok)notify('¡'+result.player.name+' añadido a tu club!'+(result.duplicate?' Guardado como repetido.':''));else notify(result?.error||'Recarga AURA para reclamar.');render();
    }
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  window.addEventListener('online',refresh);
  window.addEventListener('storage',event=>{if(event.key===AuraUTSave.KEY){error='Tu club cambió en otra pestaña. Recarga antes de reclamar.';if(open)render();}});
  let lastState='';setInterval(()=>{const state=E.status(feed),next=clock(),clockEl=host.querySelector('[data-live-clock]');if(clockEl)clockEl.textContent=next;if(state!==lastState){lastState=state;render();announce();}else if(open&&typeof AuraUTUI!=='undefined'&&selectedTab!==String(!!AuraUTUI.getClub())){selectedTab=String(!!AuraUTUI.getClub());render();}},1000);
  setInterval(()=>{if(!document.hidden)refresh();},20000);
  render();refresh();
})();
