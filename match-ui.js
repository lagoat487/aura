/* Arena lifecycle, keyboard, touch and standard gamepad controls. */
const AuraArena=(()=>{
  "use strict";
  let session=null;
  const settings=typeof AuraMatchPreferences!=="undefined"
    ?AuraMatchPreferences.load(typeof localStorage!=="undefined"?localStorage:null)
    :{seconds:180,difficulty:1,stadium:"night",weather:"clear",quality:"medium",camera:"broadcast",sound:true,localTwoPlayer:false};
  function persistPreferences(){
    try{if(typeof AuraMatchPreferences!=="undefined"&&typeof localStorage!=="undefined")
      AuraMatchPreferences.save(localStorage,settings);}catch{}
  }
  const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const cameraNames={broadcast:'TV · Transmisión',tele:'Tele · Cercana',wide:'Panorámica',tactical:'Táctica'};
  const short=s=>String(s||"").replace(/FC | CF| CF|Club |Manchester /g,"").slice(0,19);
  function team(club,career=null,custom=null,preferredFormation="4-3-3"){
    let roster=custom||career?.rosters?.[club.id]||starterRoster(club.id,71921,club.rating);
    const formation=career&&club.id===career.club?AuraSquad.ensure(career).formation:
      (Object.hasOwn(AuraSquad.formations,preferredFormation)?preferredFormation:"4-3-3");
    const slots=AuraSquad.formations[formation];
    const ids=career&&club.id===career.club?AuraSquad.ensure(career).xi:AuraSquad.choose(roster,formation);
    const players=ids.map((id,index)=>{
      const player=roster.find(p=>p.id===id);if(!player)return null;
      return career&&club.id===career.club?{...player,overall:Math.round(AuraSquad.effective(player,slots[index][0]))}:player;
    }).filter(Boolean);
    if(players.length!==11)throw Error("No hay once jugadores disponibles para "+club.name);
    const reserves=roster.filter(p=>!ids.includes(p.id)&&!(p.injuryRounds>0)).sort((a,b)=>b.overall-a.overall);
    const selected=reserves.slice(0,9),keeper=reserves.find(p=>p.pos==='POR');
    // Keep a legal keeper change available even with stronger outfield reserves.
    if(keeper&&!selected.some(p=>p.pos==='POR'))selected[selected.length-1]=keeper;
    const bench=selected.map(p=>career&&club.id===career.club?{...p,slotRatings:slots.map(slot=>Math.round(AuraSquad.effective(p,slot[0])))}:p);
    return {...club,players,bench,slots,formation};
  }
  function scoreboardCrest(club){
    const path=AuraBadges.get(club);
    return path?'<img class="scoreboard-crest" src="'+escape(path)+'" alt="" onerror="this.hidden=true">':'';
  }
  function preMatch(home,away,options={}){
    if(session)return;
    const label=options.label|| (options.career?"JORNADA "+(state.round+1)+" · "+competitionName():options.draft?"DRAFT XI · AMISTOSO":"PARTIDO RÁPIDO");
    openModal("DÍA DE PARTIDO",'<div class="prematch"><div class="matchday-release">AURA / VISION 9.0 <span>CÉSPED DETALLADO · ESTADIO LLENO · CÁMARA TV</span></div><span class="eyebrow">'+escape(label)+'</span><div class="prematch-teams"><div>'+AuraEvolution.badge(home,70)+'<h3>'+escape(home.name)+'</h3><span>'+home.formation+'</span></div><b>VS</b><div>'+AuraEvolution.badge(away,70)+'<h3>'+escape(away.name)+'</h3><span>'+away.formation+'</span></div></div><div class="prematch-presets" role="group" aria-label="Configuración rápida del partido"><strong>PERFILES RÁPIDOS</strong><button type="button" data-match-preset="vision">✦ AURA VISION · Máximo</button><button type="button" data-match-preset="fast">⚡ Rápido</button><button type="button" data-match-preset="classic">📺 Clásico</button><button type="button" data-match-preset="epic">🏟️ Épico</button><button type="button" data-match-preset="default">↺ Restablecer</button><small id="arena-preset-status" aria-live="polite">Puedes personalizar las opciones después.</small></div><div class="prematch-options"><label>Duración<select id="arena-duration">'+[[120,"2 minutos"],[180,"3 minutos"],[300,"5 minutos"],[480,"8 minutos"]].map(([v,t])=>'<option value="'+v+'" '+(settings.seconds===v?'selected':'')+'>'+t+'</option>').join("")+'</select></label><label>Dificultad<select id="arena-difficulty">'+[[.68,"Principiante"],[.82,"Aficionado"],[1,"Normal"],[1.16,"Profesional"],[1.34,"Leyenda"]].map(([v,t])=>'<option value="'+v+'" '+(settings.difficulty===v?'selected':'')+'>'+t+'</option>').join("")+'</select></label><label>Ambiente<select id="arena-stadium">'+[["night","Noche de fútbol"],["sunset","Atardecer"],["day","Tarde soleada"]].map(([v,t])=>'<option value="'+v+'" '+(settings.stadium===v?'selected':'')+'>'+t+'</option>').join("")+'</select></label><label>Clima<select id="arena-weather">'+'<option value="clear" '+(settings.weather==="clear"?"selected":"")+'>Despejado</option><option value="rain" '+(settings.weather==="rain"?"selected":"")+'>Lluvia · césped mojado</option>'+'</select></label><label>Gráficos<select id="arena-quality">'+[["low","Rendimiento"],["medium","Equilibrado"],["high","Alto · sombras"],["ultra","Ultra · AURA VISION"]].map(([v,t])=>'<option value="'+v+'" '+(settings.quality===v?'selected':'')+'>'+t+'</option>').join("")+'</select></label><label>Cámara<select id="arena-camera">'+Object.entries(cameraNames).map(([v,t])=>'<option value="'+v+'" '+(settings.camera===v?'selected':'')+'>'+t+'</option>').join('')+'</select></label>'+( !options.career&&!options.draft&&!options.onFinish?'<label>Jugadores<select id="arena-local-players"><option value="1" '+(!settings.localTwoPlayer?'selected':'')+'>1 · Contra la IA</option><option value="2" '+(settings.localTwoPlayer?'selected':'')+'>2 · Local en teclado o mandos</option></select></label>':'')+'</div><div class="prematch-guide"><span><kbd>WASD</kbd> o <kbd>↑↓←→</kbd> Mover</span><span><kbd>J</kbd> Tiro · mantén para potencia</span><span><kbd>K</kbd> Pase</span><span><kbd>L</kbd> Al hueco</span><span><kbd>O</kbd> Pase largo</span><span><kbd>F</kbd> Centro</span><span><kbd>R</kbd> Regate</span><span><kbd>1/2/3</kbd> Tipo de tiro</span><span><kbd>Espacio</kbd> Entrada</span><span><kbd>V</kbd> Barrida</span><span><kbd>E</kbd> Cambiar jugador</span><span><kbd>Shift</kbd> Sprint</span><span><kbd>P</kbd> Pausa</span></div>'+( !options.career&&!options.draft&&!options.onFinish?'<p class="save-info">Si eliges 2 jugadores: J1 usa WASD, J/K/L/E y Shift. J2 usa flechas, 0 tiro, 9 pase, 8 al hueco, 7 cambio, 6 entrada y 5 sprint. También funcionan dos mandos conectados.</p>':'')+'<p class="save-info">Los porteros salen al mano a mano y pueden desviar tiros fuertes. Abre el ángulo y dirige el remate para superarlos. También puedes jugar con mando o controles táctiles. Mando estándar: RT/R2 para sprint, RB/R1 para centrar y R3 para regatear. Tu equipo comienza atacando hacia la derecha.</p><button id="arena-kickoff" class="btn primary">Entrar al estadio <span>→</span></button></div>');
    // Profiles only change the visible prematch controls until kickoff confirms.
    document.querySelectorAll("[data-match-preset]").forEach(button=>button.onclick=()=>{
      const values=typeof AuraMatchPreferences!=="undefined"?AuraMatchPreferences.preset(button.dataset.matchPreset):null;
      if(!values)return;
      for(const [key,id] of Object.entries({seconds:"arena-duration",difficulty:"arena-difficulty",
        stadium:"arena-stadium",weather:"arena-weather",quality:"arena-quality",camera:"arena-camera"})){
        const el=document.getElementById(id);
        if(el&&Object.hasOwn(values,key))el.value=String(values[key]);
      }
      const status=document.getElementById("arena-preset-status");
      if(status)status.textContent="Perfil seleccionado. Confirma con Entrar al estadio.";
    });
    document.getElementById("arena-kickoff").onclick=()=>{
      settings.seconds=Number(document.getElementById("arena-duration").value);settings.difficulty=Number(document.getElementById("arena-difficulty").value);settings.stadium=document.getElementById("arena-stadium").value;settings.weather=document.getElementById("arena-weather").value;settings.quality=document.getElementById("arena-quality").value;settings.camera=document.getElementById("arena-camera").value;if(!options.career&&!options.draft&&!options.onFinish)
        settings.localTwoPlayer=document.getElementById("arena-local-players")?.value==="2";
      persistPreferences();
      closeModal();start(home,away,options);
    };
  }
  function start(home,away,options={}){
    if(session)return;
    const game=AuraMatch.create({home,away,...settings,tactic:options.tactic||"balanced",playerLock:options.playerLock,localTwoPlayer:!!settings.localTwoPlayer&&!options.career&&!options.draft&&!options.onFinish});
    const node=document.createElement("section");node.id="arena";node.className="arena";node.setAttribute("role","dialog");node.setAttribute("aria-modal","true");node.setAttribute("aria-label","Partido de fútbol");node.tabIndex=-1;
    node.innerHTML='<div class="arena-view" id="arena-view"></div><header class="match-scoreboard"><span class="match-live">AURA <b>VISION 9.0</b></span><div class="scoreboard-team home"><i style="background:'+AuraGraphics.kit(home)[0]+'"></i>'+scoreboardCrest(home)+'<span>'+escape(short(home.name))+'</span><b id="arena-home-score">0</b></div><div class="match-clock"><span id="arena-clock">00:00</span><small id="arena-half">1.ª PARTE</small></div><div class="scoreboard-team away"><b id="arena-away-score">0</b>'+scoreboardCrest(away)+'<span>'+escape(short(away.name))+'</span><i style="background:'+AuraGraphics.kit(away)[0]+'"></i></div></header><div class="arena-top-actions"><button data-arena="camera" aria-label="Cambiar cámara" title="Cambiar cámara (C)">◫</button><button data-arena="sound" aria-label="Activar o desactivar sonido" title="Sonido">♪</button><button data-arena="pause" aria-label="Pausar partido" title="Pausa (P)">Ⅱ</button></div><div class="arena-camera-label" id="arena-camera-label"></div><div id="arena-setpiece" class="arena-setpiece" hidden aria-live="polite"></div><div class="arena-replay" id="arena-replay" hidden><span>REPETICIÓN CINEMÁTICA <b>●</b></span><button data-arena="skip-replay">Volver al directo →</button></div><div class="arena-banner" id="arena-banner"></div><div id="arena-label" class="arena-label"></div><div class="arena-bottom"><div class="controlled-card"><span id="arena-portrait" class="arena-portrait" aria-hidden="true"></span><span class="controlled-rating" id="arena-grl"></span><div><span id="arena-player"></span><small id="arena-pos"></small><div class="stamina-bar"><i id="arena-stamina"></i></div></div></div><div class="arena-commentary"><span id="arena-comment">Un nuevo partido. Una nueva historia.</span><small id="arena-direction">ATACAS HACIA LA DERECHA →</small></div><canvas id="arena-minimap" width="180" height="115" aria-label="Radar de posiciones"></canvas><div class="opponent-card"><div><span id="arena-opponent"></span><small id="arena-opponent-pos"></small></div><i id="arena-opponent-kit"></i></div></div><div id="arena-power" class="shot-power" hidden><span>POTENCIA</span><div><i></i></div></div><div class="arena-key-guide"><span><kbd>K</kbd> Pase</span><span><kbd>J</kbd> Tiro</span><span><kbd>L</kbd> Al hueco</span><span><kbd>O</kbd> Pase largo</span><span><kbd>R</kbd> Regate</span><span><kbd>1/2/3</kbd> Tiro</span><span><kbd>E</kbd> Cambio</span><span><kbd>Espacio</kbd> Entrada</span><span><kbd>V</kbd> Barrida</span><span><kbd>Shift</kbd> Sprint</span></div><div class="touch-controls"><div class="touch-stick" id="touch-stick" aria-label="Joystick de movimiento"><span></span></div><div class="touch-actions"><button data-touch="switch">CAMBIO</button><button data-touch="through">HUECO</button><button data-touch="lob">LARGO</button><button data-touch="cross">CENTRO</button><button data-touch="skill">REGATE</button><button data-touch="pass">PASE</button><button data-touch="shoot" class="touch-shot">TIRO</button><button data-touch="tackle">ENTRADA</button><button data-touch="slide">BARRIDA</button><button data-touch="sprint">SPRINT</button></div></div><div class="arena-layer" id="arena-layer" hidden></div>';
    document.body.appendChild(node);document.body.classList.add("in-match");
    AuraEvolution.stopPreview();
    if(typeof AuraTourUI!=="undefined")AuraTourUI.audio.suspend();
    let graphics;
    try {graphics=AuraGraphics.create(node.querySelector("#arena-view"),{home,away,...settings});}
    catch(error){graphics=AuraGraphics.fallback(node.querySelector("#arena-view"),{home,away,...settings});const badge=document.createElement("span");badge.className="arena-fallback";badge.textContent="3D compatible · sin aceleración gráfica";node.appendChild(badge);}
    const s=session={node,home,away,game,graphics,options,keys:new Set(),stick:{x:0,z:0},touchSprint:false,charging:null,shotStyle:"normal",raf:0,last:0,hudTime:0,lastEvent:null,done:false,gamepadButtons:[],awayPadButtons:[],audio:null,voice:null,disposed:false,replay:null,replayFrames:[],recordTime:0,seenGoals:0,portraitId:null,cameraNotice:0};
    const find=id=>node.querySelector("#"+id),layer=find("arena-layer"),previousFocus=document.activeElement;
    const touchPointers=new Map();
    const padSlots=[null,null];
    function ensureAudio(){
      if(!settings.sound)return null;
      try{
        const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return null;
        if(!s.audio){
          s.audio=new Audio();const count=Math.floor(s.audio.sampleRate*3),buffer=s.audio.createBuffer(1,count,s.audio.sampleRate),data=buffer.getChannelData(0);let value=0;
          for(let i=0;i<count;i++){value=value*.96+(Math.random()-.5)*.04;data[i]=value;}
          const crowd=s.audio.createBufferSource();crowd.buffer=buffer;crowd.loop=true;const filter=s.audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1500;
          s.crowdGain=s.audio.createGain();s.crowdGain.gain.value=.12;crowd.connect(filter);filter.connect(s.crowdGain);s.crowdGain.connect(s.audio.destination);crowd.start();
        }
        if(s.audio.state==='suspended')s.audio.resume();return s.audio;
      }catch{return null;}
    }
    function sound(type){
      const audio=ensureAudio();if(!audio)return;
      try{
        const now=audio.currentTime;
        if(type==='goal'){s.crowdGain.gain.cancelScheduledValues(now);s.crowdGain.gain.setValueAtTime(.12,now);s.crowdGain.gain.linearRampToValueAtTime(.55,now+.25);s.crowdGain.gain.exponentialRampToValueAtTime(.12,now+2.8);return;}
        const whistle=type==='whistle',o=audio.createOscillator(),gain=audio.createGain();o.type=whistle?'sine':'triangle';o.frequency.setValueAtTime(whistle?2400:type==='shot'?95:135,now);o.frequency.exponentialRampToValueAtTime(whistle?2850:45,now+(whistle?.14:.08));gain.gain.setValueAtTime(whistle?.022:.06,now);gain.gain.exponentialRampToValueAtTime(.0001,now+(whistle?.25:.1));o.connect(gain);gain.connect(audio.destination);o.start();o.stop(now+.3);
      }catch{}
    }
    function controls(){
      const key=s.keys,local=game.localTwoPlayer;
      const axes={x:(key.has("d")||(!local&&key.has("arrowright"))?1:0)-(key.has("a")||(!local&&key.has("arrowleft"))?1:0)+s.stick.x,
        z:(key.has("s")||(!local&&key.has("arrowdown"))?1:0)-(key.has("w")||(!local&&key.has("arrowup"))?1:0)+s.stick.z,
        sprint:key.has("shift")||s.touchSprint};
      const away={x:(key.has("arrowright")?1:0)-(key.has("arrowleft")?1:0),
        z:(key.has("arrowdown")?1:0)-(key.has("arrowup")?1:0),sprint:key.has("5")};
      let pads=[];
      try{
        if(typeof navigator.getGamepads==="function"){
          const available=Array.from(navigator.getGamepads()||[]);
          if(local){
            // Bind each local player once; a missing browser slot must not swap teams.
            for(let i=0;i<available.length;i++){
              if(!available[i]?.connected||padSlots.includes(i))continue;
              const slot=padSlots.indexOf(null);if(slot<0)break;
              padSlots[slot]=i;
            }
            pads=padSlots.map(i=>i!==null&&available[i]?.connected?available[i]:null);
          }else pads=available.filter(p=>p?.connected);
        }
      }catch{}
      const map=[[0,"pass"],[1,"shoot"],[2,"tackle"],[3,"through"],[4,"switch"],[5,"cross"],[6,"lob"],[11,"skill"],[8,"slide"]];
      const first=pads[0];
      if(first){
        axes.x+=Math.abs(first.axes[0]||0)>.15?first.axes[0]:0;
        axes.z+=Math.abs(first.axes[1]||0)>.15?first.axes[1]:0;
        axes.sprint||=!!first.buttons[7]?.pressed;
        for(const [index,type] of map)if(!s.replay&&!game.paused&&!s.done&&first.buttons[index]?.pressed&&!s.gamepadButtons[index])AuraMatch.action(game,type,axes);
        if(first.buttons[9]?.pressed&&!s.gamepadButtons[9])pause();
        s.gamepadButtons=first.buttons.map(b=>b.pressed);
      }else s.gamepadButtons=[];
      const second=local?pads[1]:null;
      if(second){
        away.x+=Math.abs(second.axes[0]||0)>.15?second.axes[0]:0;
        away.z+=Math.abs(second.axes[1]||0)>.15?second.axes[1]:0;
        away.sprint||=!!second.buttons[7]?.pressed;
        for(const [index,type] of map)if(!s.replay&&!game.paused&&!s.done&&second.buttons[index]?.pressed&&!s.awayPadButtons[index])
          AuraMatch.action(game,type,{...away,team:1,power:.72});
        if(second.buttons[9]?.pressed&&!s.awayPadButtons[9])pause();
        s.awayPadButtons=second.buttons.map(b=>b.pressed);
      }else s.awayPadButtons=[];
      return {...axes,away};
    }
    function playerReportView(){
      const data=s.result||AuraMatch.report(game),mvp=data.manOfTheMatch;
      const headings=[["MIN","minutes"],["G","goals"],["A","assists"],["TIR","shots"],["A PUERTA","onTarget"],
        ["PAS","completed"],["REC","tackles"],["INT","interceptions"],["PAR","saves"],["NOTA","rating"]];
      return '<div class="match-player-report"><span class="eyebrow">AURA 27 · ESTADÍSTICAS INDIVIDUALES</span>'+
        '<h2>INFORME DE PARTIDO</h2>'+
        (mvp?'<div class="match-mvp"><span>⭐ JUGADOR DEL PARTIDO</span><strong>'+escape(mvp.name)+'</strong>'+
          '<small>'+escape((mvp.team===0?home:away).name)+' · '+mvp.rating.toFixed(1)+'/10</small></div>':'')+
        '<div class="match-player-table-wrap"><table class="match-player-table"><thead><tr><th>Jugador</th><th>Equipo</th>'+
          headings.map(([label])=>'<th>'+label+'</th>').join('')+'</tr></thead><tbody>'+
          data.players.map((p,i)=>'<tr class="'+(i===0?'match-best-player':'')+'"><td>'+escape(p.name)+'</td>'+
            '<td>'+escape(short((p.team===0?home:away).name))+'</td>'+
            headings.map(([,key])=>'<td>'+p[key]+'</td>').join('')+'</tr>').join('')+
          '</tbody></table></div><p class="save-info">Notas orientativas de 4,5 a 10 según acciones registradas. Incluye a los jugadores sustituidos.</p>'+
        '<button class="btn primary" data-arena="report-back">← Volver '+(s.done?'al resultado':'a la pausa')+'</button></div>';
    }
    function pause(){
      if(s.done)return;game.paused=!game.paused;s.keys.clear();touchPointers.clear();releaseStick();s.touchSprint=false;s.charging=null;find("arena-power").hidden=true;layer.hidden=!game.paused;
      if(game.paused)layer.innerHTML='<div class="pause-card"><span class="eyebrow">RESPIRA. REPLANTEA. VUELVE.</span><h2>EL PARTIDO<br>ES TUYO.</h2><p>'+escape(home.name)+' <b>'+game.score[0]+' — '+game.score[1]+'</b> '+escape(away.name)+'</p><button class="btn primary" data-arena="resume">Seguir jugando →</button><button class="btn" data-arena="plan">Tácticas y sustituciones →</button><button class="btn" data-arena="report">⭐ Estadísticas de jugadores →</button><button class="btn" data-arena="camera">Cambiar cámara</button><button class="btn subtle" data-arena="exit">Salir sin resultado</button></div>';
      if(!game.paused)ensureAudio();node.focus();
    }
    function matchPlan(message="",focus=true){
      if(!game.paused||s.done)return;
      const changes=game.substitutions.filter(change=>change.team===0).length;
      const onPitch=game.players.filter(p=>p.team===0&&!p.sentOff&&p.id!==game.playerLock),bench=game.benches[0];
      const outgoing=onPitch.find(p=>p.index===s.planOut)||onPitch.find(p=>p.index===game.controlled)||onPitch.find(p=>p.index!==0)||onPitch[0];
      s.planOut=outgoing?.index??null;
      const rating=p=>Array.isArray(p.slotRatings)&&Number.isFinite(p.slotRatings[outgoing?.index])?p.slotRatings[outgoing.index]:p.overall;
      const eligible=outgoing?bench.filter(p=>(p.pos==='POR')===(outgoing.index===0)).sort((a,b)=>rating(b)-rating(a)):[];
      const feedback=message||(!eligible.length&&outgoing&&bench.length&&changes<5?'Sin recambio compatible para este puesto. Elige otro jugador para realizar el cambio.':'El reloj está detenido. Tus decisiones se aplican al volver al césped.');
      layer.innerHTML='<div class="match-plan"><div class="row spread"><div><span class="eyebrow">LEE EL PARTIDO. CAMBIA SU HISTORIA.</span><h2>PLAN DE PARTIDO</h2></div><span class="plan-counter">'+changes+' / 5 CAMBIOS</span></div><p class="plan-feedback" role="status">'+escape(feedback)+'</p><h3>IDENTIDAD DE JUEGO</h3><div class="plan-tactics">'+[["balanced","Equilibrado","Cobertura y apoyo en cada línea."],["possession","Posesión","Apoyos cortos y compañeros más juntos."],["press","Presión alta","Tu bloque se acerca al poseedor rival."],["counter","Contraataque","Tus atacantes buscan profundidad."]].map(([value,label,description])=>'<button data-match-tactic="'+value+'" aria-pressed="'+(game.tactic===value)+'" class="plan-tactic '+(game.tactic===value?'selected':'')+'"><b>'+label+'</b><small>'+description+'</small></button>').join("")+'</div><h3>PIERNAS FRESCAS</h3>'+(outgoing&&bench.length&&changes<5?'<div class="plan-subs"><label for="plan-out">Sale del campo<select id="plan-out">'+onPitch.map(p=>'<option value="'+p.index+'" '+(p.index===outgoing.index?'selected':'')+'>'+escape(p.name)+' · '+escape(p.pos)+' · '+Math.round(p.stamina)+'% energía</option>').join("")+'</select></label><span class="plan-swap" aria-hidden="true">⇄</span><label for="plan-in">Entra desde el banco<select id="plan-in" '+(eligible.length?'':'disabled')+'>'+(eligible.length?eligible.map(p=>'<option value="'+escape(p.id)+'">'+escape(p.name)+' · '+escape(p.pos)+' · '+rating(p)+' GRL en este puesto</option>').join(""):'<option value="">Sin recambio compatible</option>')+'</select></label><button class="btn" data-arena="substitute" '+(eligible.length?'':'disabled')+'>Confirmar cambio →</button></div><p class="save-info">Hasta cinco cambios. Un jugador sustituido no puede volver a entrar. Portero por portero.'+(game.playerLock?' Tu futbolista de carrera permanece en el campo.':'')+'</p>':'<p class="save-info">'+(changes>=5?'Has usado tus cinco sustituciones.':!outgoing?'No hay futbolistas disponibles para sustituir.':'Este equipo no tiene suplentes disponibles.')+'</p>')+(changes?'<div class="plan-history">'+game.substitutions.filter(change=>change.team===0).map(change=>{const out=home.players.concat(home.bench).find(p=>p.id===change.out),incoming=home.bench.find(p=>p.id===change.in);return '<span>'+change.minute+'′ <b>↑ '+escape(incoming?.name||change.in)+'</b> <small>↓ '+escape(out?.name||change.out)+'</small></span>';}).join("")+'</div>':'')+'<div class="plan-footer"><button class="btn primary" data-arena="resume">Volver al partido →</button></div></div>';
      if(focus)layer.querySelector('button')?.focus();
    }
    function finish(){
      if(s.done)return;s.done=true;const result=AuraMatch.result(game);s.result=result;
      find("arena-banner").classList.remove("visible");layer.hidden=false;
      layer.innerHTML='<div class="match-result"><span class="eyebrow">FINAL DEL PARTIDO · AURA CLUB EDITION</span><div class="result-teams"><div>'+AuraEvolution.badge(home,80)+'<h3>'+escape(home.name)+'</h3></div><strong>'+result.home+' <i>—</i> '+result.away+'</strong><div>'+AuraEvolution.badge(away,80)+'<h3>'+escape(away.name)+'</h3></div></div><p class="result-outcome">'+(result.home===result.away?"Hasta el último minuto.":result.home>result.away?"Una victoria para recordar.":"El próximo capítulo empieza ahora.")+'</p><div class="result-stats">'+[["Posesión","possession","%"],["Tiros","shots",""],["A puerta","onTarget",""],["Faltas","fouls",""],["Amarillas","yellows",""],["Rojas","reds",""],["Paradas","saves",""],["Desvíos del portero","parries",""],["Pases completados","completed",""],["Pases clave","keyPasses",""],["Remates bloqueados","blockedShots",""],["Goles esperados","xg",""]].map(([label,key,suffix])=>'<div><b>'+result.stats[0][key]+suffix+'</b><span>'+label+'</span><b>'+result.stats[1][key]+suffix+'</b></div>').join("")+'</div><div class="result-goals">'+result.goals.map(g=>'<span>'+g.minute+'′ '+escape(g.name)+(g.assist?' · Asistencia: '+escape(g.assist):'')+'</span>').join("")+'</div>'+
        (result.manOfTheMatch?'<div class="match-mvp"><span>⭐ JUGADOR DEL PARTIDO</span><strong>'+escape(result.manOfTheMatch.name)+'</strong><small>'+escape((result.manOfTheMatch.team===0?home:away).name)+' · '+result.manOfTheMatch.rating.toFixed(1)+'/10</small></div>':'')+
        '<button class="btn" data-arena="report">Ver calificaciones de todos →</button><button class="btn primary" data-arena="complete">'+(options.career?"Registrar resultado y volver a carrera":"Volver al menú")+' →</button></div>';
      sound("whistle");node.querySelector('[data-arena="complete"]').focus();
    }
    function dispose(commit=false){
      if(s.disposed)return;s.disposed=true;cancelAnimationFrame(s.raf);window.removeEventListener("keydown",keydown,true);window.removeEventListener("keyup",keyup,true);window.removeEventListener("blur",blur);document.removeEventListener("visibilitychange",visibility);graphics.dispose();s.audio?.close();node.remove();document.body.classList.remove("in-match");session=null;if(typeof AuraTourUI!=="undefined")AuraTourUI.audio.resume();previousFocus?.focus?.();
      if(commit&&s.result){options.onFinish?.(s.result);}else options.onCancel?.();
    }
    function keydown(e){
      if(e.ctrlKey||e.metaKey||e.altKey)return;
      const k=e.key.toLowerCase(),known=["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright","shift","j","k","l","o","r","v","f","1","2","3","5","6","7","8","9","0","e"," ","p","escape","c"];
      if(game.paused&&e.target.matches?.('select,input,textarea')&&k!=="escape")return;
      if(k===" "&&e.target.closest?.('button'))return;
      if(k==="tab"){const buttons=[...node.querySelectorAll('button:not([disabled]),select:not([disabled]),input:not([disabled])')].filter(b=>b.getClientRects().length);if(buttons.length){const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===node)){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}return;}
      if(!known.includes(k))return;e.preventDefault();e.stopImmediatePropagation();if(e.repeat)return;
      if(k==="p"||k==="escape"){pause();return;}if(k==="c"){changeCamera();return;}if(s.replay){if(k===" ")skipReplay();return;}if(game.paused||s.done||game.phase!=="playing")return;s.keys.add(k);
      if(["1","2","3"].includes(k)){s.shotStyle=({"1":"placed","2":"power","3":"curve"})[k];return;}
       if(game.localTwoPlayer){
         const awayAction=({"0":"shoot","9":"pass","8":"through","7":"switch","6":"tackle"})[k];
         if(awayAction){AuraMatch.action(game,awayAction,{...controls().away,team:1,power:.76});sound(awayAction==="shoot"?"shot":"pass");return;}
       }
       if(k==="j"){s.charging=performance.now();find("arena-power").hidden=false;}
      const types={k:"pass",l:"through",o:"lob",r:"skill",v:"slide",f:"cross",e:"switch"," ":"tackle"};if(types[k]){AuraMatch.action(game,types[k],controls());sound("pass");}
    }
    function shoot(){if(s.charging===null||s.replay||game.paused||s.done)return;const power=Math.min(1,(performance.now()-s.charging)/950+.2);AuraMatch.action(game,"shoot",{...controls(),power,style:s.shotStyle});s.charging=null;find("arena-power").hidden=true;sound("shot");}
    function keyup(e){const k=e.key.toLowerCase();s.keys.delete(k);if(k==="j"){e.preventDefault();e.stopImmediatePropagation();shoot();}}
    function blur(){if(!game.paused&&!s.done)pause();}
    function visibility(){if(document.hidden){blur();s.audio?.suspend();}}
    function changeCamera(){const cameras=Object.keys(cameraNames);settings.camera=cameras[(cameras.indexOf(settings.camera)+1)%cameras.length];persistPreferences();find('arena-camera-label').textContent=cameraNames[settings.camera];s.cameraNotice=performance.now()+2200;find('arena-camera-label').classList.add('visible');}
    function skipReplay(){s.replay=null;find('arena-replay').hidden=true;s.keys.clear();touchPointers.clear();s.charging=null;find('arena-power').hidden=true;}
    window.addEventListener("keydown",keydown,true);window.addEventListener("keyup",keyup,true);window.addEventListener("blur",blur);document.addEventListener("visibilitychange",visibility);
    node.addEventListener("click",e=>{
      const a=e.target.closest("[data-arena]")?.dataset.arena;
      const tactic=e.target.closest("[data-match-tactic]")?.dataset.matchTactic;
      if(tactic){const changed=AuraMatch.setTactic(game,tactic);matchPlan(changed?"Nueva táctica aplicada.":"No se pudo cambiar la táctica.");return;}
      if(a==="report"&&(game.paused||s.done)){s.reportBackHTML=layer.innerHTML;layer.innerHTML=playerReportView();layer.querySelector('button')?.focus();}
      if(a==="report-back"&&s.reportBackHTML){layer.innerHTML=s.reportBackHTML;layer.querySelector('button')?.focus();s.reportBackHTML=null;}
      if(a==="plan")matchPlan();
      if(a==="substitute"){
        const outgoing=Number(find("plan-out")?.value),incoming=game.benches[0].find(p=>p.id===find("plan-in")?.value);
        const changed=AuraMatch.substitute(game,outgoing,incoming);
        matchPlan(changed?"Cambio confirmado. "+incoming.name+" entra al campo.":"No se pudo hacer el cambio. El portero debe ser sustituido por otro portero.");
      }
      if(a==="pause"||a==="resume")pause();if(a==="camera")changeCamera();if(a==="sound"){settings.sound=!settings.sound;persistPreferences();if(settings.sound)ensureAudio();else s.audio?.suspend();e.target.closest("button").classList.toggle("muted",!settings.sound);}
      if(a==="skip-replay")skipReplay();if(a==="complete")dispose(true);
      if(a==="exit")layer.innerHTML='<div class="pause-card"><span class="eyebrow">SALIR DEL PARTIDO</span><h2>¿VOLVER AL MENÚ?</h2><p>Este partido no contará en la carrera.</p><button class="btn primary" data-arena="resume">Seguir jugando</button><button class="btn danger" data-arena="confirm-exit">Salir sin resultado</button></div>';
      if(a==="confirm-exit")dispose(false);
    });
    node.addEventListener("change",e=>{if(e.target.id==='plan-out'&&game.paused&&!s.done){s.planOut=Number(e.target.value);matchPlan('',false);find('plan-out')?.focus();}});
    const stick=find("touch-stick"),knob=stick.querySelector("span");let pointer=null;
    function stickMove(e){if(e.pointerId!==pointer||game.paused||s.done||s.replay||game.phase!=="playing")return;const r=stick.getBoundingClientRect(),dx=(e.clientX-r.left-r.width/2)/(r.width*.38),dz=(e.clientY-r.top-r.height/2)/(r.height*.38),len=Math.max(1,Math.hypot(dx,dz));s.stick={x:dx/len,z:dz/len};knob.style.transform='translate('+s.stick.x*30+'px,'+s.stick.z*30+'px)';}
    // Keep the joystick with its first active finger until that pointer releases it.
    stick.addEventListener("pointerdown",e=>{if(pointer!==null||game.paused||s.done||s.replay||game.phase!=="playing")return;pointer=e.pointerId;stick.setPointerCapture(pointer);stickMove(e);});stick.addEventListener("pointermove",stickMove);
    const releaseStick=e=>{if(e&&e.pointerId!==pointer)return;pointer=null;s.stick={x:0,z:0};knob.style.transform="";};stick.addEventListener("pointerup",releaseStick);stick.addEventListener("pointercancel",releaseStick);stick.addEventListener("lostpointercapture",releaseStick);
    node.querySelectorAll("[data-touch]").forEach(button=>{
      const type=button.dataset.touch,held=type==="shoot"||type==="sprint";
      button.addEventListener("pointerdown",e=>{
        e.preventDefault();
        if(s.replay||game.paused||s.done||game.phase!=="playing"||(held&&touchPointers.has(button)))return;
        button.setPointerCapture(e.pointerId);
        if(held)touchPointers.set(button,e.pointerId);
        if(type==="sprint")s.touchSprint=true;else if(type==="shoot"){s.charging=performance.now();find("arena-power").hidden=false;}else AuraMatch.action(game,type,controls());
      });
      button.addEventListener("pointerup",e=>{
        if(!held||touchPointers.get(button)!==e.pointerId)return;
        touchPointers.delete(button);
        if(type==="sprint")s.touchSprint=false;if(type==="shoot")shoot();
      });
      const cancelTouch=e=>{
        if(!held||touchPointers.get(button)!==e.pointerId)return;
        touchPointers.delete(button);
        if(type==="sprint")s.touchSprint=false;if(type==="shoot"){s.charging=null;find("arena-power").hidden=true;}
      };
      button.addEventListener("pointercancel",cancelTouch);button.addEventListener("lostpointercapture",cancelTouch);
      button.addEventListener("click",e=>{
        // Enter/Space and assistive clicks have no pointerdown. Pointer actions already ran.
        const type=button.dataset.touch;
        if(e.detail!==0||type==="sprint"||s.replay||game.paused||s.done||game.phase!=="playing")return;
        if(type==="shoot"){if(s.charging===null)s.charging=performance.now();shoot();}
        else AuraMatch.action(game,type,controls());
      });
    });
    const radar=find("arena-minimap"),radarCtx=radar.getContext("2d");
    function hud(now){
      const minutes=game.elapsed/game.seconds*90,seconds=Math.floor((minutes%1)*60);find("arena-clock").textContent=String(Math.floor(minutes)).padStart(2,"0")+":"+String(seconds).padStart(2,"0");find("arena-half").textContent=game.half===1?"1.ª PARTE":"2.ª PARTE";
      find("arena-home-score").textContent=game.score[0];find("arena-away-score").textContent=game.score[1];
      const p=game.players[game.controlled];find("arena-grl").textContent=p.overall;find("arena-player").textContent=p.name;find("arena-pos").textContent=p.pos+" · "+home.name;find("arena-stamina").style.width=p.stamina+"%";
      find("arena-direction").textContent=game.half===1?"ATACAS HACIA LA DERECHA →":"← ATACAS HACIA LA IZQUIERDA";
      if(s.portraitId!==p.id){s.portraitId=p.id;const original=home.players.concat(home.bench||[]).find(q=>q.id===p.id)||p;find('arena-portrait').innerHTML=typeof AuraPortraits!=='undefined'?AuraPortraits.html(original):'';}
      const opponent=game.ball.owner!==null&&game.players[game.ball.owner].team===1?game.players[game.ball.owner]:game.players[AuraMatch.nearest(game,1)];
      find('arena-opponent').textContent=opponent.name;find('arena-opponent-pos').textContent=opponent.pos+' · '+away.name;find('arena-opponent-kit').style.background=graphics.kits[1][0];
      if(now>s.cameraNotice)find('arena-camera-label').classList.remove('visible');
      const label=find("arena-label"),point=graphics.project(p);label.hidden=!point.visible||!!s.replay;label.textContent=p.name.split(" ").slice(-2).join(" ");label.style.left=point.x+"px";label.style.top=point.y+"px";
      const restart=find("arena-setpiece"),piece=game.setPiece;
       restart.hidden=(!piece&&!game.restart)||!!s.replay;
       if(game.restart)restart.textContent=game.restart.kind.toUpperCase()+" · BALÓN DETENIDO · Colocando jugadores";
       else if(piece)restart.textContent=piece.kind==="free-kick"?
         "TIRO LIBRE · "+(piece.wall?.length?piece.wall.length+" jugadores en la barrera":"Sin barrera")+" · J dispara / K pasa":
         piece.kind==="penalty"?"PENALTI · J dispara":piece.kind==="corner"?"CÓRNER · F centra":"";
       const banner=find("arena-banner"),phase=game.phase;banner.dataset.phase=phase;
      banner.classList.toggle("visible",!s.replay&&["goal","halftime","kickoff"].includes(phase));
      if(phase==="goal"){const g=game.goals.at(-1);banner.innerHTML='<small>'+escape(g?.name)+'</small><strong>GOOOL.</strong>';}
      if(phase==="halftime")banner.innerHTML='<small>CAMBIO DE CAMPO</small><strong>DESCANSO.</strong>';
      if(phase==="kickoff")banner.innerHTML='<small>'+escape(home.name)+' × '+escape(away.name)+'</small><strong>A JUGAR.</strong>';
      const ev=game.events.at(-1);if(ev&&ev!==s.lastEvent){s.lastEvent=ev;find("arena-comment").textContent=ev.text;if(['goal','shot','woodwork','save'].includes(ev.type))sound(ev.type);}
      if(s.charging!==null)find("arena-power").querySelector("i").style.width=Math.min(100,(now-s.charging)/9.5+20)+"%";
      radarCtx.clearRect(0,0,180,115);radarCtx.fillStyle="#101d309c";radarCtx.fillRect(0,0,180,115);radarCtx.strokeStyle="#c1d8e654";radarCtx.lineWidth=1;radarCtx.strokeRect(5,5,170,105);radarCtx.beginPath();radarCtx.moveTo(90,5);radarCtx.lineTo(90,110);radarCtx.arc(90,57.5,13,0,Math.PI*2);radarCtx.stroke();
      game.players.forEach((q,i)=>{if(q.sentOff)return;radarCtx.fillStyle=i===game.controlled?"#45e5e5":q.team===0?"#9addf2":"#f0eee6";radarCtx.beginPath();radarCtx.arc(90+q.x*1.56,57.5+q.z*1.5,i===game.controlled?3:2,0,Math.PI*2);radarCtx.fill();});radarCtx.fillStyle="white";radarCtx.beginPath();radarCtx.arc(90+game.ball.x*1.56,57.5+game.ball.z*1.5,2.3,0,Math.PI*2);radarCtx.fill();
    }
    function frame(now){
      if(s.disposed)return;const dt=s.last?Math.min(.15,(now-s.last)/1000):0;s.last=now;
      const input=controls();let view=game,cam=settings.camera;
      if(s.replay){
        if(!game.paused)s.replay.time+=dt;
        const replay=s.replay,duration=3.2,progress=Math.min(1,replay.time/duration),cursor=progress*(replay.frames.length-1),i=Math.floor(cursor);
        view=AuraPresentation.interpolate(replay.frames[i],replay.frames[Math.min(i+1,replay.frames.length-1)],cursor-i);
         // Start with television tracking; finish close to the ball on replay.
         cam=progress<.4?'broadcast':'replay';
        if(progress>=1){skipReplay();view=game;cam=settings.camera;}
      }else{
        let remaining=dt;
        while(remaining>0){const tick=Math.min(remaining,1/60);AuraMatch.step(game,tick,input);remaining-=tick;}
        if(game.phase==='restart'&&s.lastRestart!==game.restart){
          s.lastRestart=game.restart;s.keys.clear();touchPointers.clear();releaseStick();s.touchSprint=false;
          s.charging=null;find('arena-power').hidden=true;s.replayFrames=[];
        }
        if(!game.paused&&!s.done&&game.phase==='playing'&&now-s.recordTime>50){s.replayFrames.push(AuraPresentation.capture(game));if(s.replayFrames.length>62)s.replayFrames.shift();s.recordTime=now;}
        if(game.goals.length>s.seenGoals){
          s.seenGoals=game.goals.length;s.replayFrames.push(AuraPresentation.capture(game));
          if(s.replayFrames.length>5){s.replay={frames:s.replayFrames.slice(),time:0};find('arena-replay').hidden=false;s.keys.clear();touchPointers.clear();releaseStick();s.touchSprint=false;s.charging=null;find('arena-power').hidden=true;}
          s.replayFrames=[];
        }
      }
      graphics.render(view,cam,now);
      if(now-s.hudTime>80){hud(now);s.hudTime=now;}
      if(game.phase==='finished')finish();s.raf=requestAnimationFrame(frame);
    }
    s.dispose=dispose;node.querySelectorAll('.scoreboard-team i').forEach((stripe,i)=>stripe.style.background=graphics.kits[i][0]);sound('whistle');find('arena-camera-label').textContent=cameraNames[settings.camera];find('arena-camera-label').classList.add('visible');s.cameraNotice=performance.now()+2500;node.focus();s.raf=requestAnimationFrame(frame);
  }
  return {team,preMatch,start,isRunning:()=>!!session,getSession:()=>session,settings};
})();
