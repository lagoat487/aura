(function(){
  'use strict';
  const M=AuraEventMusic,C=M.CONFIG,start=Date.parse(C.startsAt),end=Date.parse(C.expiresAt);
  if(Date.now()>=end)return;
  const box=document.createElement('aside');box.id='aura-event-music';box.setAttribute('aria-label','Música del evento');
  box.innerHTML='<div class="event-music-head"><div><small>11:00 A. M. · ECUADOR</small><b>TIKI TIKI · QMIIR</b></div><button type="button" data-music-close aria-label="Cerrar música del evento">✕</button></div><p data-music-status>Prepara el audio para el comienzo del evento.</p><button class="event-music-enable" type="button" data-music-enable>Activar música a las 11</button><div class="event-music-video" hidden><div id="aura-event-youtube"></div></div><a href="'+C.url+'" target="_blank" rel="noopener">Escuchar en YouTube ↗</a>';
  document.body.append(box);
  const status=box.querySelector('[data-music-status]'),button=box.querySelector('[data-music-enable]'),video=box.querySelector('.event-music-video');
  let player=null,conductor=null,loading=null,wanted=false,closed=false,readyTimer,prepareTimer;
  function update(state){
    clearTimeout(prepareTimer);
    if(state.phase==='preparing'||state.phase==='starting')prepareTimer=setTimeout(()=>{if(conductor?.state().phase===state.phase)conductor.blocked();},8000);
    const messages={off:'Prepara el audio para el comienzo del evento.',loading:'Cargando el reproductor oficial…',preparing:'Preparando el audio sin sonido…',armed:'Audio listo. Mantén AURA abierto para las 11:00.',starting:'Comenzando la canción…',playing:'Sonando: TIKI TIKI · QMIIR',blocked:'Pulsa Reproducir aquí o en el vídeo para habilitar el sonido.',error:'YouTube no pudo reproducir aquí. Puedes abrir la canción en su enlace.',ended:'La canción ha terminado.',expired:'La hora de inicio de esta sesión ya pasó.'};
    status.textContent=messages[state.phase]||messages.off;button.disabled=['loading','preparing','starting'].includes(state.phase);button.textContent=state.phase==='armed'?'Audio listo para las 11':state.phase==='playing'?'Pausar canción':state.phase==='blocked'?'Reproducir canción':state.phase==='ended'?'Volver a escuchar':state.phase==='error'?'Reintentar reproductor':'Activar música a las 11';
    if(state.phase==='playing'){const original=document.querySelector('[data-tour="music"][aria-pressed="true"]');original?.click();}
  }
  function api(){
    if(window.YT?.Player)return Promise.resolve(window.YT);if(loading)return loading;
    loading=new Promise((resolve,reject)=>{const previous=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{if(typeof previous==='function')previous();resolve(window.YT);};const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.onerror=()=>reject(Error('player'));document.head.append(script);setTimeout(()=>{if(!window.YT?.Player)reject(Error('timeout'));},15000);}).catch(error=>{loading=null;throw error;});return loading;
  }
  button.addEventListener('click',async()=>{
    if(conductor){if(conductor.state().phase==='playing'){conductor.stop();return;}wanted=true;conductor.arm();return;}
    wanted=true;closed=false;video.hidden=false;update({phase:'loading'});
    try{const YT=await api();if(closed)return;if(player){player.destroy();const target=document.createElement('div');target.id='aura-event-youtube';video.replaceChildren(target);}clearTimeout(readyTimer);readyTimer=setTimeout(()=>{if(!conductor&&!closed)update({phase:'error'});},15000);player=new YT.Player('aura-event-youtube',{width:'280',height:'200',host:'https://www.youtube-nocookie.com',videoId:C.videoId,playerVars:{playsinline:1,rel:0,controls:1,origin:location.origin},events:{onReady(event){clearTimeout(readyTimer);if(closed){event.target.destroy();return;}const iframe=event.target.getIframe();iframe.setAttribute('allow','autoplay; encrypted-media; picture-in-picture');iframe.setAttribute('referrerpolicy','strict-origin-when-cross-origin');conductor=M.create(event.target,{onChange:update});conductor.ready();if(wanted)conductor.arm();},onStateChange:event=>conductor?.changed(event.data),onAutoplayBlocked:()=>{if(conductor)conductor.blocked();else update({phase:'blocked'});},onError:()=>{clearTimeout(readyTimer);if(conductor)conductor.failed();else update({phase:'error'});}}});}
    catch{update({phase:'error'});}
  });
  box.querySelector('[data-music-close]').addEventListener('click',()=>{wanted=false;closed=true;clearTimeout(readyTimer);clearTimeout(prepareTimer);conductor?.stop();player?.destroy();box.remove();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)conductor?.tick();});
  window.addEventListener('pagehide',()=>{if(!closed)conductor?.stop();});
  setInterval(()=>{if(closed)return;if(conductor)conductor.tick();else if(Date.now()>=end)box.hidden=true;else if(Date.now()>=start){status.textContent='¡Comenzó el evento! Activa la canción para escucharla.';button.textContent='Reproducir TIKI TIKI';}},1000);
})();
