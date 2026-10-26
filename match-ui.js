/* Arena lifecycle, keyboard, touch and standard gamepad controls. */
const AuraArena=(()=>{
  "use strict";
  let session=null;
  const settings={seconds:180,difficulty:1,stadium:"night",quality:"medium",camera:"broadcast",sound:true};
  const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const short=s=>String(s||"").replace(/FC | CF| CF|Club |Manchester /g,"").slice(0,19);
  function team(club,career=null,custom=null){
    let roster=custom||career?.rosters?.[club.id]||starterRoster(club.id,71921,club.rating);
    const formation=career&&club.id===career.club?AuraSquad.ensure(career).formation:"4-3-3";
    const slots=AuraSquad.formations[formation];
    const ids=career&&club.id===career.club?AuraSquad.ensure(career).xi:AuraSquad.choose(roster,formation);
    const players=ids.map(id=>roster.find(p=>p.id===id)).filter(Boolean);
    if(players.length!==11)throw Error("No hay once jugadores disponibles para "+club.name);
    return {...club,players,slots,formation};
  }
  function preMatch(home,away,options={}){
    if(session)return;
    const label=options.career?"JORNADA "+(state.round+1)+" · "+competitionName():options.draft?"DRAFT XI · AMISTOSO":"PARTIDO RÁPIDO";
    openModal("DÍA DE PARTIDO",'<div class="prematch"><span class="eyebrow">'+escape(label)+'</span><div class="prematch-teams"><div>'+AuraEvolution.badge(home,70)+'<h3>'+escape(home.name)+'</h3><span>'+home.formation+'</span></div><b>VS</b><div>'+AuraEvolution.badge(away,70)+'<h3>'+escape(away.name)+'</h3><span>'+away.formation+'</span></div></div><div class="prematch-options"><label>Duración<select id="arena-duration">'+[[120,"2 minutos"],[180,"3 minutos"],[300,"5 minutos"],[480,"8 minutos"]].map(([v,t])=>'<option value="'+v+'" '+(settings.seconds===v?'selected':'')+'>'+t+'</option>').join("")+'</select></label><label>Dificultad<select id="arena-difficulty">'+[[.78,"Principiante"],[1,"Normal"],[1.16,"Profesional"]].map(([v,t])=>'<option value="'+v+'" '+(settings.difficulty===v?'selected':'')+'>'+t+'</option>').join("")+'</select></label><label>Ambiente<select id="arena-stadium">'+[["night","Noche de fútbol"],["sunset","Atardecer"],["day","Tarde soleada"]].map(([v,t])=>'<option value="'+v+'" '+(settings.stadium===v?'selected':'')+'>'+t+'</option>').join("")+'</select></label><label>Gráficos<select id="arena-quality">'+[["low","Rendimiento"],["medium","Equilibrado"],["high","Alto · sombras"]].map(([v,t])=>'<option value="'+v+'" '+(settings.quality===v?'selected':'')+'>'+t+'</option>').join("")+'</select></label></div><div class="prematch-guide"><span><kbd>WASD</kbd> o <kbd>↑↓←→</kbd> Mover</span><span><kbd>J</kbd> Tiro · mantén para potencia</span><span><kbd>K</kbd> Pase</span><span><kbd>L</kbd> Al hueco</span><span><kbd>Espacio</kbd> Entrada</span><span><kbd>E</kbd> Cambiar jugador</span><span><kbd>Shift</kbd> Sprint</span><span><kbd>P</kbd> Pausa</span></div><p class="save-info">También puedes jugar con mando estándar o controles táctiles. Tu equipo comienza atacando hacia la derecha.</p><button id="arena-kickoff" class="btn primary">Entrar al estadio <span>↗</span></button></div>');
    document.getElementById("arena-kickoff").onclick=()=>{
      settings.seconds=Number(document.getElementById("arena-duration").value);settings.difficulty=Number(document.getElementById("arena-difficulty").value);settings.stadium=document.getElementById("arena-stadium").value;settings.quality=document.getElementById("arena-quality").value;
      closeModal();start(home,away,options);
    };
  }
  function start(home,away,options={}){
    if(session)return;
    const game=AuraMatch.create({home,away,...settings,tactic:options.tactic||"balanced"});
    const node=document.createElement("section");node.id="arena";node.className="arena";node.setAttribute("role","dialog");node.setAttribute("aria-modal","true");node.setAttribute("aria-label","Partido de fútbol");node.tabIndex=-1;
    node.innerHTML='<div class="arena-view" id="arena-view"></div><header class="match-scoreboard"><span class="match-live">AURA <b>LIVE</b></span><div class="scoreboard-team home"><i style="background:'+AuraGraphics.kit(home)[0]+'"></i><span>'+escape(short(home.name))+'</span><b id="arena-home-score">0</b></div><div class="match-clock"><span id="arena-clock">00:00</span><small id="arena-half">1.ª PARTE</small></div><div class="scoreboard-team away"><b id="arena-away-score">0</b><span>'+escape(short(away.name))+'</span><i style="background:'+AuraGraphics.kit(away)[0]+'"></i></div></header><div class="arena-top-actions"><button data-arena="camera" aria-label="Cambiar cámara" title="Cambiar cámara (C)">◫</button><button data-arena="sound" aria-label="Activar o desactivar sonido" title="Sonido">♪</button><button data-arena="pause" aria-label="Pausar partido" title="Pausa (P)">Ⅱ</button></div><div class="arena-banner" id="arena-banner"></div><div id="arena-label" class="arena-label"></div><div class="arena-bottom"><div class="controlled-card"><span class="controlled-rating" id="arena-grl"></span><div><span id="arena-player"></span><small id="arena-pos"></small><div class="stamina-bar"><i id="arena-stamina"></i></div></div></div><div class="arena-commentary"><span id="arena-comment">Un nuevo partido. Una nueva historia.</span><small id="arena-direction">ATACAS HACIA LA DERECHA →</small></div><canvas id="arena-minimap" width="180" height="115" aria-label="Radar de posiciones"></canvas></div><div id="arena-power" class="shot-power" hidden><span>POTENCIA</span><div><i></i></div></div><div class="arena-key-guide"><span><kbd>K</kbd> Pase</span><span><kbd>J</kbd> Tiro</span><span><kbd>L</kbd> Al hueco</span><span><kbd>E</kbd> Cambio</span><span><kbd>Espacio</kbd> Entrada</span><span><kbd>Shift</kbd> Sprint</span></div><div class="touch-controls"><div class="touch-stick" id="touch-stick" aria-label="Joystick de movimiento"><span></span></div><div class="touch-actions"><button data-touch="switch">CAMBIO</button><button data-touch="through">HUECO</button><button data-touch="pass">PASE</button><button data-touch="shoot" class="touch-shot">TIRO</button><button data-touch="tackle">ENTRADA</button><button data-touch="sprint">SPRINT</button></div></div><div class="arena-layer" id="arena-layer" hidden></div>';
    document.body.appendChild(node);document.body.classList.add("in-match");
    AuraEvolution.stopPreview();
    let graphics;
    try {graphics=AuraGraphics.create(node.querySelector("#arena-view"),{home,away,...settings});}
    catch(error){graphics=AuraGraphics.fallback(node.querySelector("#arena-view"),{home,away,...settings});const badge=document.createElement("span");badge.className="arena-fallback";badge.textContent="3D compatible · sin aceleración gráfica";node.appendChild(badge);}
    const s=session={node,home,away,game,graphics,options,keys:new Set(),stick:{x:0,z:0},touchSprint:false,charging:null,raf:0,last:0,hudTime:0,lastEvent:null,done:false,gamepadButtons:[],audio:null,voice:null,disposed:false};
    const find=id=>node.querySelector("#"+id),layer=find("arena-layer"),previousFocus=document.activeElement;
    function sound(type){
      if(!settings.sound)return;
      try {
        const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
        if(!s.audio)s.audio=new Audio();if(s.audio.state==="suspended")s.audio.resume();
        const o=s.audio.createOscillator(),gain=s.audio.createGain(),now=s.audio.currentTime;
        o.type=type==="goal"?"triangle":"sine";o.frequency.setValueAtTime(type==="goal"?260:type==="shot"?110:440,now);o.frequency.exponentialRampToValueAtTime(type==="goal"?620:170,now+.18);gain.gain.setValueAtTime(.045,now);gain.gain.exponentialRampToValueAtTime(.0001,now+(type==="goal"?.6:.16));o.connect(gain);gain.connect(s.audio.destination);o.start();o.stop(now+.7);
      }catch{}
    }
    function controls(){
      const key=s.keys,axes={x:(key.has("d")||key.has("arrowright")?1:0)-(key.has("a")||key.has("arrowleft")?1:0)+s.stick.x,z:(key.has("s")||key.has("arrowdown")?1:0)-(key.has("w")||key.has("arrowup")?1:0)+s.stick.z,sprint:key.has("shift")||s.touchSprint};
      let pads=[];try{if(typeof navigator.getGamepads==="function")pads=navigator.getGamepads();}catch{}
      let pad;for(const p of pads)if(p?.connected){pad=p;break;}
      if(pad){axes.x+=Math.abs(pad.axes[0]||0)>.15?pad.axes[0]:0;axes.z+=Math.abs(pad.axes[1]||0)>.15?pad.axes[1]:0;axes.sprint||=!!pad.buttons[5]?.pressed;
        for(const [index,type] of [[0,"pass"],[1,"shoot"],[2,"tackle"],[3,"through"],[4,"switch"]])if(pad.buttons[index]?.pressed&&!s.gamepadButtons[index])AuraMatch.action(game,type,axes);
        if(pad.buttons[9]?.pressed&&!s.gamepadButtons[9])pause();s.gamepadButtons=pad.buttons.map(b=>b.pressed);
      }
      return axes;
    }
    function pause(){
      if(s.done)return;game.paused=!game.paused;s.keys.clear();s.stick={x:0,z:0};s.touchSprint=false;s.charging=null;find("arena-power").hidden=true;layer.hidden=!game.paused;
      if(game.paused)layer.innerHTML='<div class="pause-card"><span class="eyebrow">RESPIRA. REPLANTEA. VUELVE.</span><h2>EL PARTIDO<br>ES TUYO.</h2><p>'+escape(home.name)+' <b>'+game.score[0]+' — '+game.score[1]+'</b> '+escape(away.name)+'</p><button class="btn primary" data-arena="resume">Seguir jugando →</button><button class="btn" data-arena="camera">Cambiar cámara</button><button class="btn subtle" data-arena="exit">Salir sin resultado</button></div>';
      node.focus();
    }
    function finish(){
      if(s.done)return;s.done=true;const result=AuraMatch.result(game);s.result=result;
      find("arena-banner").classList.remove("visible");layer.hidden=false;
      layer.innerHTML='<div class="match-result"><span class="eyebrow">FINAL DEL PARTIDO · AURA EVOLUTION</span><div class="result-teams"><div>'+AuraEvolution.badge(home,80)+'<h3>'+escape(home.name)+'</h3></div><strong>'+result.home+' <i>—</i> '+result.away+'</strong><div>'+AuraEvolution.badge(away,80)+'<h3>'+escape(away.name)+'</h3></div></div><p class="result-outcome">'+(result.home===result.away?"Hasta el último minuto.":result.home>result.away?"Una victoria para recordar.":"El próximo capítulo empieza ahora.")+'</p><div class="result-stats">'+[["Posesión","possession","%"],["Tiros","shots",""],["A puerta","onTarget",""],["Pases completados","completed",""]].map(([label,key,suffix])=>'<div><b>'+result.stats[0][key]+suffix+'</b><span>'+label+'</span><b>'+result.stats[1][key]+suffix+'</b></div>').join("")+'</div><div class="result-goals">'+result.goals.map(g=>'<span>'+g.minute+'′ '+escape(g.name)+'</span>').join("")+'</div><button class="btn primary" data-arena="complete">'+(options.career?"Registrar resultado y volver a carrera":"Volver al menú")+' →</button></div>';
      sound("goal");node.querySelector('[data-arena="complete"]').focus();
    }
    function dispose(commit=false){
      if(s.disposed)return;s.disposed=true;cancelAnimationFrame(s.raf);window.removeEventListener("keydown",keydown,true);window.removeEventListener("keyup",keyup,true);window.removeEventListener("blur",blur);document.removeEventListener("visibilitychange",visibility);graphics.dispose();s.audio?.close();node.remove();document.body.classList.remove("in-match");session=null;previousFocus?.focus?.();
      if(commit&&s.result){options.onFinish?.(s.result);}else options.onCancel?.();
    }
    function keydown(e){
      if(e.ctrlKey||e.metaKey||e.altKey)return;
      const k=e.key.toLowerCase(),known=["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright","shift","j","k","l","e"," ","p","escape","c"];
      if(k==="tab"){const buttons=[...node.querySelectorAll('button:not([disabled])')].filter(b=>b.getClientRects().length);if(buttons.length){const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===node)){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}return;}
      if(!known.includes(k))return;e.preventDefault();e.stopImmediatePropagation();if(e.repeat)return;
      if(k==="p"||k==="escape"){pause();return;}if(k==="c"){changeCamera();return;}if(game.paused||s.done)return;s.keys.add(k);
      if(k==="j"){s.charging=performance.now();find("arena-power").hidden=false;}
      const types={k:"pass",l:"through",e:"switch"," ":"tackle"};if(types[k]){AuraMatch.action(game,types[k],controls());sound("pass");}
    }
    function shoot(){if(s.charging===null)return;const power=Math.min(1,(performance.now()-s.charging)/950+.2);AuraMatch.action(game,"shoot",{...controls(),power});s.charging=null;find("arena-power").hidden=true;sound("shot");}
    function keyup(e){const k=e.key.toLowerCase();s.keys.delete(k);if(k==="j"){e.preventDefault();e.stopImmediatePropagation();shoot();}}
    function blur(){if(!game.paused&&!s.done)pause();}
    function visibility(){if(document.hidden)blur();}
    function changeCamera(){const cameras=["broadcast","wide","tactical"];settings.camera=cameras[(cameras.indexOf(settings.camera)+1)%3];}
    window.addEventListener("keydown",keydown,true);window.addEventListener("keyup",keyup,true);window.addEventListener("blur",blur);document.addEventListener("visibilitychange",visibility);
    node.addEventListener("click",e=>{
      const a=e.target.closest("[data-arena]")?.dataset.arena;
      if(a==="pause"||a==="resume")pause();if(a==="camera")changeCamera();if(a==="sound"){settings.sound=!settings.sound;e.target.closest("button").classList.toggle("muted",!settings.sound);}
      if(a==="complete")dispose(true);
      if(a==="exit")layer.innerHTML='<div class="pause-card"><span class="eyebrow">SALIR DEL PARTIDO</span><h2>¿VOLVER AL MENÚ?</h2><p>Este partido no contará en la carrera.</p><button class="btn primary" data-arena="resume">Seguir jugando</button><button class="btn danger" data-arena="confirm-exit">Salir sin resultado</button></div>';
      if(a==="confirm-exit")dispose(false);
    });
    const stick=find("touch-stick"),knob=stick.querySelector("span");let pointer=null;
    function stickMove(e){if(e.pointerId!==pointer)return;const r=stick.getBoundingClientRect(),dx=(e.clientX-r.left-r.width/2)/(r.width*.38),dz=(e.clientY-r.top-r.height/2)/(r.height*.38),len=Math.max(1,Math.hypot(dx,dz));s.stick={x:dx/len,z:dz/len};knob.style.transform='translate('+s.stick.x*30+'px,'+s.stick.z*30+'px)';}
    stick.addEventListener("pointerdown",e=>{pointer=e.pointerId;stick.setPointerCapture(pointer);stickMove(e);});stick.addEventListener("pointermove",stickMove);
    const releaseStick=()=>{pointer=null;s.stick={x:0,z:0};knob.style.transform="";};stick.addEventListener("pointerup",releaseStick);stick.addEventListener("pointercancel",releaseStick);
    node.querySelectorAll("[data-touch]").forEach(button=>{
      button.addEventListener("pointerdown",e=>{e.preventDefault();button.setPointerCapture(e.pointerId);const type=button.dataset.touch;if(type==="sprint")s.touchSprint=true;else if(type==="shoot"){s.charging=performance.now();find("arena-power").hidden=false;}else AuraMatch.action(game,type,controls());});
      for(const name of ["pointerup","pointercancel"])button.addEventListener(name,()=>{if(button.dataset.touch==="sprint")s.touchSprint=false;if(button.dataset.touch==="shoot")shoot();});
    });
    const radar=find("arena-minimap"),radarCtx=radar.getContext("2d");
    function hud(now){
      const minutes=game.elapsed/game.seconds*90,seconds=Math.floor((minutes%1)*60);find("arena-clock").textContent=String(Math.floor(minutes)).padStart(2,"0")+":"+String(seconds).padStart(2,"0");find("arena-half").textContent=game.half===1?"1.ª PARTE":"2.ª PARTE";
      find("arena-home-score").textContent=game.score[0];find("arena-away-score").textContent=game.score[1];
      const p=game.players[game.controlled];find("arena-grl").textContent=p.overall;find("arena-player").textContent=p.name;find("arena-pos").textContent=p.pos+" · "+home.name;find("arena-stamina").style.width=p.stamina+"%";
      find("arena-direction").textContent=game.half===1?"ATACAS HACIA LA DERECHA →":"← ATACAS HACIA LA IZQUIERDA";
      const label=find("arena-label"),point=graphics.project(p);label.hidden=!point.visible;label.textContent=p.name.split(" ").slice(-2).join(" ");label.style.left=point.x+"px";label.style.top=point.y+"px";
      const banner=find("arena-banner"),phase=game.phase;
      banner.classList.toggle("visible",["goal","halftime","kickoff"].includes(phase));
      if(phase==="goal"){const g=game.goals.at(-1);banner.innerHTML='<small>'+escape(g?.name)+'</small><strong>GOOOL.</strong>';}
      if(phase==="halftime")banner.innerHTML='<small>CAMBIO DE CAMPO</small><strong>DESCANSO.</strong>';
      if(phase==="kickoff")banner.innerHTML='<small>'+escape(home.name)+' × '+escape(away.name)+'</small><strong>A JUGAR.</strong>';
      const ev=game.events.at(-1);if(ev&&ev!==s.lastEvent){s.lastEvent=ev;find("arena-comment").textContent=ev.text;if(ev.type==="goal"||ev.type==="shot")sound(ev.type);}
      if(s.charging!==null)find("arena-power").querySelector("i").style.width=Math.min(100,(now-s.charging)/9.5+20)+"%";
      radarCtx.clearRect(0,0,180,115);radarCtx.fillStyle="#14271ed9";radarCtx.fillRect(0,0,180,115);radarCtx.strokeStyle="#b6c7b244";radarCtx.lineWidth=1;radarCtx.strokeRect(5,5,170,105);radarCtx.beginPath();radarCtx.moveTo(90,5);radarCtx.lineTo(90,110);radarCtx.arc(90,57.5,13,0,Math.PI*2);radarCtx.stroke();
      game.players.forEach((q,i)=>{radarCtx.fillStyle=i===game.controlled?"#cbff70":q.team===0?"#7caddd":"#f1e9d6";radarCtx.beginPath();radarCtx.arc(90+q.x*1.56,57.5+q.z*1.5,i===game.controlled?3:2,0,Math.PI*2);radarCtx.fill();});radarCtx.fillStyle="white";radarCtx.beginPath();radarCtx.arc(90+game.ball.x*1.56,57.5+game.ball.z*1.5,2.3,0,Math.PI*2);radarCtx.fill();
    }
    function frame(now){
      if(s.disposed)return;const dt=s.last?Math.min(.25,(now-s.last)/1000):0;s.last=now;
      const input=controls();let remaining=dt;
      while(remaining>0){const tick=Math.min(remaining,1/60);AuraMatch.step(game,tick,input);remaining-=tick;}
      graphics.render(game,settings.camera,now);
      if(now-s.hudTime>80){hud(now);s.hudTime=now;}
      if(game.phase==="finished")finish();s.raf=requestAnimationFrame(frame);
    }
    s.dispose=dispose;node.focus();s.raf=requestAnimationFrame(frame);
  }
  return {team,preMatch,start,isRunning:()=>!!session,getSession:()=>session,settings};
})();
