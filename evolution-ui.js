/* AURA Club Edition 3.1 — console lobby, career hub and playable modes. */
const AuraEvolution=(()=>{
  "use strict";
  let mode="career",leagueQuery="",clubQuery="",quickHome="barcelona",quickAway="madrid",quickQuery="",draft=null,preview=null,previewFrame=0;
  const compact=n=>n>=1000000?"€"+(n/1e6).toLocaleString("es-ES",{maximumFractionDigits:1})+" M":money(n);
  const text=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const normal=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  function badge(club,size=45){
    const colors=AuraGraphics.kit(club),name=(club.short||club.name||"AURA").replace(/FC | CF|Club |de |del /g,"").split(/\s+/).slice(0,3).map(s=>s[0]).join("");
    const crest=AuraBadges.get(club);
    return '<span class="club-badge '+(crest?'authentic':'')+'" style="--club-a:'+colors[0]+';--club-b:'+colors[1]+';width:'+size+'px;height:'+Math.round(size*1.13)+'px" aria-hidden="true">'+(crest?'<img src="'+text(crest)+'" alt="" loading="lazy" onerror="this.hidden=true;this.parentElement.classList.remove(\'authentic\')">':'')+'<span>'+text(name)+'</span></span>';
  }
  function stopPreview(){globalThis.cancelAnimationFrame?.(previewFrame);preview?.dispose();preview=null;}
  function afterRender(){
    stopPreview();if(typeof THREE==="undefined")return;const canvas=document.getElementById("lobby-stadium");
    if(canvas&&!AuraArena.isRunning()){
      try {preview=AuraGraphics.create(canvas,{preview:true,quality:"low",stadium:"night",home:getClub("barcelona"),away:getClub("madrid")});preview.render(null,"wide",0);}
      catch{try{preview=AuraGraphics.fallback(canvas,{preview:true,quality:"low",stadium:"night",home:getClub("barcelona"),away:getClub("madrid")});preview.render(null,"wide",0);}catch{canvas.classList.add("stadium-unavailable");}}
    }
  }
  function modeTabs(){
    return '<div class="mode-tabs" role="group" aria-label="Modo de juego">'+[
      ["career","01","Carrera mánager","Dirige. Decide. Compite."],
      ["quick","02","Partido rápido","Elige tu equipo y sal a jugar."],
      ["draft","03","Draft XI","Construye tu once ideal."]
    ].map(([id,n,title,desc])=>'<button data-evo-mode="'+id+'" class="mode-tab '+(mode===id?'selected':'')+'" aria-pressed="'+(mode===id)+'"><span>'+n+'</span><div><strong>'+title+'</strong><small>'+desc+'</small></div><b aria-hidden="true">→</b></button>').join("")+'</div>';
  }
  function leagueControls(){
    const definition=Competitions.getDefinition(selectedCompetition),featured=Competitions.definitions.filter(c=>c.id==="laliga"||c.id==="exhibition"||["Premier League","Bundesliga","Serie A Enilive","Ligue 1 McDonalds"].includes(c.name)).slice(0,7);
    return '<div class="selection-heading"><div><span class="eyebrow">01 / TU COMPETICIÓN</span><h2>ELIGE TU COMPETICIÓN</h2></div><label class="league-dropdown">Todas las ligas<select id="evo-league">'+Competitions.definitions.filter(c=>!leagueQuery||normal(c.name).includes(normal(leagueQuery))).map(c=>'<option value="'+c.id+'" '+(c.id===definition.id?'selected':'')+'>'+text(c.name)+' · '+c.clubIds.length+' clubes</option>').join("")+'</select></label></div><div class="competition-picker compact-picker">'+featured.map(c=>'<button class="league-chip '+(c.id===selectedCompetition?'selected':'')+'" data-competition="'+c.id+'" aria-pressed="'+(c.id===selectedCompetition)+'"><span>'+text(c.country)+'</span><strong>'+text(c.id==="exhibition"?"Internacional":c.name)+'</strong></button>').join("")+'</div>';
  }
  function rosterStatus(club){
    if(typeof AuraRosterSync==="undefined")return "";
    const status=AuraRosterSync.status(club),date=status.verifiedAt||status.snapshot;
    return '<div class="roster-status '+(status.covered?'covered':'reference')+'"><i aria-hidden="true"></i><div><strong>'+(status.verifiedAt?'Plantilla verificada':'Plantilla de referencia')+'</strong><span>'+text(date)+' · '+status.players+' futbolistas</span></div></div>';
  }
  function careerPicker(){
    const def=Competitions.getDefinition(selectedCompetition),entrants=def.clubIds.map(getClub),club=getClub(selected),found=entrants.filter(c=>normal(c.name+" "+c.city).includes(normal(clubQuery)));
    return leagueControls()+'<div class="club-selection"><div class="club-list-pane"><div class="selection-heading"><div><span class="eyebrow">02 / TU PRÓXIMO CAPÍTULO</span><h2>ELIGE TU DESTINO</h2></div><label class="sr-only" for="evo-club-search">Buscar club</label><input id="evo-club-search" type="search" value="'+text(clubQuery)+'" placeholder="Buscar club…"></div><div class="club-picker" id="evo-clubs">'+clubCards(found)+'</div></div><aside class="club-preview" style="--club-accent:'+AuraGraphics.kit(club)[0]+'"><span class="eyebrow">TU NUEVA HISTORIA</span>'+badge(club,85)+'<h2>'+text(club.name)+'</h2><p>'+text(club.city)+'</p>'+rosterStatus(club)+'<div class="club-metrics"><div><strong>'+club.rating+'</strong><span>GRL del club</span></div><div><strong>'+compact(club.budget)+'</strong><span>Presupuesto de juego</span></div></div><div class="club-objective"><span>EL RETO</span><p>'+getObjective(club)+'</p></div><button class="btn club-roster-link" data-evo="view-roster" data-club="'+text(club.id)+'">Ver plantilla →</button><button class="btn primary" data-action="start">Iniciar nueva carrera <span>→</span></button><small>Carrera por sesión · comienza de cero al recargar</small></aside></div><p class="catalog-note">'+catalogNote()+'</p>';
  }
  function catalogNote(){const s=World.getStats();return World.isLoaded()?s.players.toLocaleString("es-ES")+' futbolistas · '+s.clubs+' clubes · '+s.leagues+' ligas del catálogo. Afiliaciones de referencia, medias y presupuestos de videojuego.':'1.248 identidades reales incluidas. '+(World.getError()?'Catálogo ampliado no disponible.':'Cargando catálogo ampliado…')+' Medias y presupuestos de videojuego.';}
  function getObjective(c){return c.rating>=85?"La cima se defiende cada jornada. Compite por el título.":c.rating>=79?"Haz crecer el proyecto y pelea por la parte alta de la tabla.":"Construye un once sólido. Cada punto cuenta.";}
  function clubCards(list){return list.map(c=>'<button class="club-option '+(selected===c.id?'selected':'')+'" data-pick="'+c.id+'" aria-pressed="'+(selected===c.id)+'">'+badge(c,35)+'<span class="club-option-copy"><strong>'+text(c.name)+'</strong><small>'+text(c.city)+'</small></span><b>'+c.rating+'</b></button>').join("")||'<div class="notice">No hay clubes con ese nombre en esta competición.</div>';}
  function quickClubs(){
    return clubs.filter((c,i,a)=>a.findIndex(x=>normal(x.name.replace(/fc|cf/gi,"").trim())===normal(c.name.replace(/fc|cf/gi,"").trim()))===i).slice().sort((a,b)=>a.name.localeCompare(b.name));
  }
  function quickChoices(id){
    return quickClubs().filter(c=>c.id===id||!quickQuery||normal(c.name+" "+c.city).includes(normal(quickQuery))).map(c=>'<option value="'+c.id+'" '+(c.id===id?'selected':'')+'>'+text(c.name)+'</option>').join("");
  }
  function quickPicker(){
    const h=getClub(quickHome),a=getClub(quickAway);
    const team=(club,id,label)=>'<div class="quick-team"><span class="quick-team-label">'+label+'</span>'+badge(club,105)+'<label class="sr-only" for="'+id+'">'+label+'</label><select id="'+id+'">'+quickChoices(club.id)+'</select><button class="quick-roster-link" data-evo="view-roster" data-club="'+text(club.id)+'">Ver plantilla →</button><div class="quick-strength"><strong>'+club.rating+'</strong><span>FORTALEZA<br>DEL CLUB</span></div><div class="quick-strength-track" aria-hidden="true"><i style="width:'+club.rating+'%"></i></div></div>';
    return '<section class="quick-match-panel"><div class="selection-heading"><div><span class="eyebrow">02 / DIRECTO AL PARTIDO</span><h2>EL CÉSPED TE ESPERA.</h2></div><span class="pill">11 contra 11 · Tú contra la IA</span></div><div class="quick-search-bar"><label for="quick-club-search">Encuentra un equipo<input id="quick-club-search" type="search" placeholder="Busca club o ciudad…" value="'+text(quickQuery)+'" autocomplete="off"></label><span id="quick-search-status" role="status">'+quickClubs().filter(c=>!quickQuery||normal(c.name+" "+c.city).includes(normal(quickQuery))).length+' equipos en la búsqueda</span></div><div class="quick-teams">'+team(h,"quick-home","TU EQUIPO")+'<div class="quick-versus"><b aria-hidden="true">VS</b><button class="quick-swap" data-evo="quick-swap" aria-label="Intercambiar tu equipo y el rival" title="Intercambiar equipos">⇄</button></div>'+team(a,"quick-away","EL RIVAL")+'</div><div class="quick-cta"><button class="btn primary" data-evo="quick-start">Preparar partido <span>→</span></button><p>Duración, dificultad, ambiente y gráficos. El siguiente paso lo eliges tú.</p></div></section>';
  }
  function pool(){
    if(typeof AuraRosterSync!=="undefined")return AuraRosterSync.pool();
    const map=new Map(),catalog=World.allPlayers?.()||[],bundled=Real.allPlayers?.()||[];
    for(const p of [...catalog,...bundled,...clubs.flatMap(c=>Real.rosterFor(c))]){const key=normal(p.name);if(!p.real||!p.id||p.overall<65)continue;if(!map.has(key)||p.overall>map.get(key).overall)map.set(key,{...p});}
    return [...map.values()];
  }
  function startDraft(){
    draft={players:[],pool:pool(),offers:[],finished:false};offerDraft();
  }
  function offerDraft(){
    const index=draft.players.length;if(index===11){draft.offers=[];return;}
    const position=AuraSquad.formations["4-3-3"][index][0],owned=new Set(draft.players.map(p=>normal(p.name)));
    const choices=draft.pool.filter(p=>!owned.has(normal(p.name))).sort((a,b)=>(b.overall-AuraSquad.positionPenalty(b,position)*2)-(a.overall-AuraSquad.positionPenalty(a,position)*2)).slice(0,60);
    for(let i=choices.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]];}
    draft.offers=choices.slice(0,5);
  }
  function draftView(){
    if(!draft)return '<section class="draft-intro"><div><span class="eyebrow">DRAFT XI / SIN COSTE</span><h2>ONCE ELECCIONES.<br>UN EQUIPO<br><em>IRREPETIBLE.</em></h2><p>Elige uno de cinco futbolistas para cada posición. Completa tu once y sal al estadio contra un rival de élite.</p><button class="btn primary" data-evo="draft-new">Crear mi Draft XI →</button></div><div class="draft-card-fan">'+[88,92,90].map((n,i)=>'<div class="draft-art-card art-'+i+'"><span>'+n+'</span><small>'+(i===1?'AURA':'XI')+'</small><b>★</b></div>').join("")+'</div></section>';
    const done=draft.players.length===11,rating=Math.round(draft.players.reduce((n,p)=>n+p.overall,0)/Math.max(1,draft.players.length));
    return '<div class="draft-progress"><span>CONSTRUYE TU XI</span><progress max="11" value="'+draft.players.length+'" aria-label="Jugadores elegidos"></progress><b>'+draft.players.length+' / 11</b></div><div class="selection-heading"><div><span class="eyebrow">'+draft.players.length+' / 11 JUGADORES ELEGIDOS</span><h2>'+(done?'TU ONCE ESTÁ LISTO.':'ELIGE TU '+AuraSquad.formations["4-3-3"][draft.players.length][0])+ '</h2></div><span class="draft-rating">'+rating+' <small>GRL</small></span></div>'+
      (done?'<div class="draft-ready"><h3>El talento está. Demuéstralo en el campo.</h3><button class="btn primary" data-evo="draft-play">Jugar contra Real Madrid →</button><button class="btn" data-evo="draft-new">Crear otro once</button></div>':'<div class="draft-offers">'+draft.offers.map((p,i)=>'<button class="draft-player-card" data-draft-pick="'+i+'"><div class="draft-card-top"><strong>'+p.overall+'</strong><span>'+text(p.pos)+'</span></div><div class="draft-player-monogram">'+text(p.name.split(" ").slice(0,2).map(n=>n[0]).join(""))+'</div><h3>'+text(p.name)+'</h3><p>'+text(p.sourceClub||clubs.find(c=>c.id===p.club)?.name||p.nationality||"Futbolista real")+'</p><span class="draft-card-choice">Elegir jugador →</span></button>').join("")+'</div>')+
      '<div class="draft-selected"><h3>TU EQUIPO · 4-3-3</h3><div>'+AuraSquad.formations["4-3-3"].map(([pos],i)=>'<span class="draft-slot '+(draft.players[i]?'filled':'')+'"><small>'+pos+'</small><strong>'+text(draft.players[i]?.name||"Por elegir")+'</strong>'+(draft.players[i]?'<b>'+draft.players[i].overall+'</b>':'')+'</span>').join("")+'</div></div>';
  }
  function welcome(){
    const stats=World.getStats(),loaded=World.isLoaded(),amount=n=>Number(n||0).toLocaleString("es-ES");
    return '<div class="season-intro"><span>AURA 27 <b>/ CLUB EDITION 3.1</b></span><button data-evo="controls" class="club-controls-link">Controles y cómo jugar <span>→</span></button></div>'+modeTabs()+
      '<section class="evolution-hero"><div class="lobby-stadium" id="lobby-stadium" aria-hidden="true"></div><div class="evolution-hero-overlay"></div><div class="hero-outline-number" aria-hidden="true">27</div>'+
      '<div class="hero-content"><span class="release-label"><i></i> TU CASA ES EL FÚTBOL <span>CLUB EDITION</span></span><h1>TU CLUB.<br>TU FÚTBOL.<br><em>TU HISTORIA.</em></h1><p>Del primer fichaje al último minuto.<br>Haz que cada decisión cuente.</p><div class="hero-actions"><button class="btn primary" data-evo="hero-start">'+(mode==="career"?'Empezar mi carrera':mode==="quick"?'Elegir equipos':'Crear mi Draft XI')+' <span>→</span></button></div><div class="hero-play-details"><span>11 contra 11</span><span>Partidos 3D</span><span>Teclado, mando o táctil</span></div></div>'+
      '<div class="hero-side-caption"><span>CLUB EDITION / 3.1</span><b>AURA 27</b></div></section>'+
      '<div class="season-signal"><span class="signal-heading"><i></i> EL MUNDO DEL FÚTBOL.<br>A TU ALCANCE.</span><div><strong>'+(loaded?amount(stats.players):"11 × 11")+'</strong><span>'+(loaded?'FUTBOLISTAS DEL CATÁLOGO':'EN EL TERRENO')+'</span></div><div><strong>'+(loaded?amount(stats.clubs):"3")+'</strong><span>'+(loaded?'CLUBES PARA ELEGIR':'MODOS DE JUEGO')+'</span></div><div><strong>'+(loaded?amount(stats.leagues):"3D")+'</strong><span>'+(loaded?'LIGAS DEL CATÁLOGO':'PARTIDOS JUGABLES')+'</span></div></div>'+
      '<div id="mode-content"><div class="mode-section-label"><span>ELIGE TU PRÓXIMO PASO</span><b>'+({career:'01 / CARRERA',quick:'02 / PARTIDO RÁPIDO',draft:'03 / DRAFT XI'}[mode])+'</b></div>'+(mode==="career"?careerPicker():mode==="quick"?quickPicker():draftView())+'</div>';
  }
  function scheduleStrip(){
    if(state.version!==2)return "";
    const fixtures=state.competition.fixtures.flat().filter(f=>!f.score&&(f.home===state.club||f.away===state.club)).slice(0,3);
    if(!fixtures.length)return "";
    return '<section class="club-agenda" aria-label="Próximas jornadas"><div><span class="eyebrow">EN EL HORIZONTE</span><h3>Tu agenda</h3></div>'+fixtures.map(f=>{const home=f.home===state.club,rival=getClub(home?f.away:f.home);return '<button data-nav="calendar"><span>J'+f.round+' <small>'+ (home?'LOCAL':'VISITANTE')+'</small></span>'+badge(rival,27)+'<strong>'+text(rival.name)+'</strong><b aria-hidden="true">→</b></button>';}).join("")+'</section>';
  }
  function recentForm(){return state.history.slice(0,5).reverse().map(h=>'<span class="form-result '+(h.g1>h.g2?'win':h.g1===h.g2?'draw':'loss')+'">'+(h.g1>h.g2?'G':h.g1===h.g2?'E':'P')+'</span>').join("")||'<span class="muted-text">Tu temporada empieza aquí</span>';}
  function dashboard(){
    const c=myClub(),op=nextOpponent(),fixture=nextFixture(),sheet=AuraSquad.ensure(state),stars=AuraSquad.players(state).slice().sort((a,b)=>b.overall-a.overall).slice(0,3),row=seasonTable().find(x=>x.id===state.club),date=new Date(Date.UTC(state.season,7,15+state.round*7));
    return '<div class="career-season-strip"><span>TU CLUB <b>/ CLUB EDITION 3.1</b></span><span>'+state.round+' DE '+totalRounds()+' JORNADAS<progress max="'+totalRounds()+'" value="'+state.round+'" aria-label="Avance de temporada"></progress></span></div><div class="career-topline"><div class="career-club-title">'+badge(c,44)+'<div><span class="eyebrow">TU CARRERA · '+state.season+'/'+String(state.season+1).slice(2)+'</span><h1>'+text(c.name)+'</h1></div></div><div class="career-date"><span>'+date.toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"})+'</span><small>Calendario de tu carrera</small></div></div><div class="career-hub"><section class="next-match-card"><div class="match-card-top"><span class="live-indicator"></span><span>'+text(competitionName())+'</span><b>JORNADA '+Math.min(state.round+1,totalRounds())+'</b></div>'+(op?'<div class="next-match-title"><span>EL SIGUIENTE RETO</span><h2>EL PARTIDO<br><em>ES TUYO.</em></h2></div><div class="fixture-teams"><div>'+badge(getClub(fixture.home),55)+'<strong>'+text(getClub(fixture.home).name)+'</strong><small>LOCAL</small></div><span>VS</span><div>'+badge(getClub(fixture.away),55)+'<strong>'+text(getClub(fixture.away).name)+'</strong><small>VISITANTE</small></div></div><div class="next-match-buttons"><button class="btn primary" data-evo="career-play">Jugar partido 3D <span>→</span></button><button class="btn" data-action="play">Simular jornada →</button></div>':'<div class="next-match-title"><span>TEMPORADA COMPLETADA</span><h2>UNA HISTORIA<br><em>PARA RECORDAR.</em></h2><p>Posición final: '+rank()+'º · '+(state.wins*3+state.draws)+' puntos</p><button class="btn primary" data-action="play">Cerrar temporada →</button></div>')+'</section><aside class="career-summary"><div class="hub-stats"><div><span>POSICIÓN</span><strong>'+rank()+'<small>º</small></strong><p>'+row.pts+' puntos en '+row.p+' jornadas</p></div><div><span>PRESUPUESTO</span><strong>'+compact(state.budget)+'</strong><p>Disponible para fichajes</p></div><div><span>TU ONCE</span><strong>'+overall(state.club)+'<small> GRL</small></strong><p>'+sheet.formation+' · '+AuraSquad.players(state).length+' titulares</p></div><div><span>ÚLTIMOS PARTIDOS</span><div class="recent-form">'+recentForm()+'</div><p>'+state.wins+'G · '+state.draws+'E · '+state.losses+'P</p></div></div><div class="hub-tactics"><label for="evo-tactic">Identidad de juego<select id="evo-tactic">'+[["balanced","Equilibrado"],["possession","Posesión"],["press","Presión alta"],["counter","Contraataque"]].map(([id,label])=>'<option value="'+id+'" '+((state.tactic||"balanced")===id?'selected':'')+'>'+label+'</option>').join("")+'</select></label><p>Define los movimientos de tus compañeros en los partidos 3D.</p><button class="btn small" data-nav="squad">Ajustar once y formación →</button></div></aside></div>'+AuraProgressionUI.boardSummary()+scheduleStrip()+'<div class="hub-links">'+[["squad","01","PLANTILLA","Tu talento, en su sitio."],["market","02","MERCADO","Una llamada lo cambia todo."],["academy","03","DESARROLLO","El futuro empieza en casa."],["calendar","04","CALENDARIO","Cada jornada, un nuevo reto."]].map(([id,num,title,desc])=>'<button data-nav="'+id+'"><span>'+num+'</span><h3>'+title+'</h3><p>'+desc+'</p><b>→</b></button>').join("")+'</div><div class="hub-bottom"><section class="card hub-table"><div class="panel-title"><h3>LA LUCHA POR LA CIMA</h3><button class="btn small" data-nav="table">Ver tabla →</button></div>'+tableHtml(7)+'</section><section class="club-news"><div class="panel-title"><h3>DENTRO DEL CLUB</h3><span>ACTUALIDAD</span></div>'+state.news.slice(0,4).map((n,i)=>'<article><span>0'+(i+1)+'</span><p>'+text(n)+'</p></article>').join("")+'<div class="hub-stars">'+stars.map(p=>'<span><b>'+p.overall+'</b>'+text(p.name)+'</span>').join("")+'</div></section></div><div class="career-footer-actions"><span>Carrera por sesión · resultados y movimientos reales dentro de tu partida</span><button class="btn small" data-action="new">Iniciar nueva carrera</button></div>';
  }
  function playCareer(){
    if(!state)return;const fixture=nextFixture();if(!fixture){playMatch();return;}
    const gameState=state,round=state.round,season=state.season,token=fixture.id;
    try{
      const home=AuraArena.team(getClub(fixture.home),state),away=AuraArena.team(getClub(fixture.away),state),userIsHome=fixture.home===state.club;
      // The match model always assigns keyboard control to the first team. The
      // fixture's actual home/away order is restored before recording a result.
      const controlled=userIsHome?home:away,rival=userIsHome?away:home;
      AuraArena.preMatch(controlled,rival,{career:true,tactic:state.tactic,onFinish:result=>{
        if(state!==gameState||state.round!==round||state.season!==season||nextFixture()?.id!==token){notify("La jornada ya cambió; este resultado no se volverá a registrar.");return;}
        const score=userIsHome?{home:result.home,away:result.away}:{home:result.away,away:result.home};
        playMatch(score,{...result,userIsHome,played3D:true});
      }});
    }catch(error){notify(error.message);}
  }
  function controlsModal(){openModal("CÓMO JUGAR",'<div class="controls-explainer"><span class="eyebrow">TÚ LLEVAS EL BALÓN</span><h3>Del menú al césped.</h3><p>En <b>Partido rápido</b> eliges los equipos. En <b>Carrera</b>, pulsa <b>Jugar partido 3D</b> para disputar tu siguiente jornada.</p><div class="prematch-guide">'+[["WASD / Flechas","Mover al jugador"],["J","Mantener y soltar para disparar"],["K","Pasar hacia un compañero"],["L","Pase al espacio"],["Espacio","Intentar recuperar el balón"],["E","Cambiar al jugador más cercano"],["Shift","Sprint; consume energía"],["C","Cambiar entre tres cámaras"],["P / Esc","Pausar el partido"]].map(([k,v])=>'<span><kbd>'+k+'</kbd> '+v+'</span>').join("")+'</div><p>Atacas hacia la derecha en la primera parte y hacia la izquierda en la segunda. Tu jugador tiene un anillo verde. Los porteros y tus compañeros se mueven automáticamente.</p><p>Mando estándar: A/X pase, B/○ tiro, X/□ entrada, Y/△ al hueco, LB/L1 cambio, RB/R1 sprint. En pantalla táctil aparecen un joystick y botones.</p><p class="save-info">Fútbol arcade: sin fueras de juego ni faltas. Elige el once y la formación antes de jugar. Durante la pausa puedes ajustar la táctica y hacer hasta cinco sustituciones.</p></div>');}
  function handleClick(button){
    const d=button.dataset;
    if(d.evoMode){mode=d.evoMode;render();return true;}
    if(d.draftPick!==undefined){const p=draft?.offers[Number(d.draftPick)];if(p&&draft.players.length<11){draft.players.push({...p});offerDraft();render();}return true;}
    if(!d.evo)return false;
    if(d.evo==="controls")controlsModal();
    if(d.evo==="view-roster"){
      const club=clubs.find(c=>c.id===d.club);if(!club)return true;
      const players=typeof AuraRosterSync!=="undefined"?AuraRosterSync.rosterFor(club):starterRoster(club.id,71921,club.rating);
      const status=typeof AuraRosterSync!=="undefined"?AuraRosterSync.status(club):null;
      openModal("PLANTILLA · "+club.name,'<div class="club-roster-modal"><div class="club-roster-heading">'+badge(club,50)+'<div><span class="eyebrow">'+players.length+' FUTBOLISTAS</span><h3>'+text(club.name)+'</h3></div></div>'+(status?'<p class="save-info">'+text(status.note)+' · '+text(status.verifiedAt||status.snapshot)+' <a href="'+text(status.source)+'" target="_blank" rel="noopener noreferrer">Ver fuente</a>'+'</p>':'')+'<div class="table-wrap"><table class="table"><thead><tr><th>Jugador</th><th>POS</th><th>GRL</th></tr></thead><tbody>'+players.map(p=>'<tr><td>'+text(p.name)+'</td><td>'+text(p.pos)+'</td><td class="accent">'+p.overall+'</td></tr>').join("")+'</tbody></table></div></div>');
    }
    if(d.evo==="hero-start"){if(mode==="draft"&&!draft){startDraft();render();}document.getElementById("mode-content")?.scrollIntoView({behavior:"smooth",block:"start"});}
    if(d.evo==="quick-swap"){[quickHome,quickAway]=[quickAway,quickHome];render();document.getElementById("quick-home")?.focus();}
    if(d.evo==="quick-start")try{if(quickHome===quickAway){notify("Elige dos clubes distintos para este partido.");return true;}AuraArena.preMatch(AuraArena.team(getClub(quickHome)),AuraArena.team(getClub(quickAway)),{});}catch(err){notify(err.message);}
    if(d.evo==="draft-new"){startDraft();render();}
    if(d.evo==="draft-play"&&draft?.players.length===11){const c={id:"aura-draft",name:"AURA Draft XI",rating:Math.round(draft.players.reduce((s,p)=>s+p.overall,0)/11)};AuraArena.preMatch(AuraArena.team(c,null,draft.players),AuraArena.team(getClub("madrid")),{draft:true});}
    if(d.evo==="career-play")playCareer();return true;
  }
  function input(e){
    if(e.target.id==="quick-club-search"){
      quickQuery=e.target.value.slice(0,80);
      const home=document.getElementById("quick-home"),away=document.getElementById("quick-away"),status=document.getElementById("quick-search-status");
      if(home)home.innerHTML=quickChoices(quickHome);if(away)away.innerHTML=quickChoices(quickAway);
      if(status)status.textContent=quickClubs().filter(c=>!quickQuery||normal(c.name+" "+c.city).includes(normal(quickQuery))).length+" equipos encontrados. Tus selecciones se conservan.";
    }
    if(e.target.id==="evo-club-search"){clubQuery=e.target.value.slice(0,80);const def=Competitions.getDefinition(selectedCompetition);document.getElementById("evo-clubs").innerHTML=clubCards(def.clubIds.map(getClub).filter(c=>normal(c.name+" "+c.city).includes(normal(clubQuery))));}
  }
  function change(e){
    if(e.target.id==="evo-league"){const def=Competitions.getDefinition(e.target.value);selectedCompetition=def.id;if(!def.clubIds.includes(selected))selected=def.clubIds[0];clubQuery="";render();}
    if(e.target.id==="quick-home"){quickHome=e.target.value;render();}
    if(e.target.id==="quick-away"){quickAway=e.target.value;render();}
    if(e.target.id==="evo-tactic"&&state){state.tactic=e.target.value;notify("Identidad de juego actualizada");}
  }
  return {welcome,dashboard,badge,handleClick,input,change,afterRender,stopPreview,playCareer,pool};
})();
