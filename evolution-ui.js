/* AURA 6.0 — console lobby, career hub and playable modes. */
const AuraEvolution=(()=>{
  "use strict";
  let mode="career",modeOpen=false,recentMode=null,pinnedMode=null,leagueQuery="",clubQuery="",quickHome="barcelona",quickAway="madrid",quickQuery="",quickRivalry=null,draft=null,preview=null,previewFrame=0;
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
    stopPreview();
    // Keep keyboard/touch practice focused when buttons are re-rendered.
    if(skillFocus){
      const [action,value]=skillFocus;
      const selector=action==="skill-aim"?'[data-evo="skill-aim"][data-skill-aim="'+value+'"]':
        action==="skill-power"?'[data-evo="skill-power"][data-skill-power="'+value+'"]':
        '[data-evo="'+action+'"]';
      const button=document.querySelector(selector);
      try{button?.focus({preventScroll:true});}catch{button?.focus();}
      skillFocus=null;
    }
    // Preserve touch/keyboard selection across the rerender after a penalty kick.
    if(penaltyFocus){
      const button=document.querySelector('[data-evo="quick-penalty-kick"][data-penalty-dir="'+penaltyFocus+'"]')||
        document.querySelector('[data-evo="quick-penalty-new"]');
      try{button?.focus({preventScroll:true});}catch{button?.focus();}
      penaltyFocus=null;
    }
    if(typeof THREE==="undefined")return;const canvas=document.getElementById("lobby-stadium");
    if(canvas&&!AuraArena.isRunning()){
      try {preview=AuraGraphics.create(canvas,{preview:true,quality:"low",stadium:"night",home:getClub("barcelona"),away:getClub("madrid")});preview.render(null,"wide",0);}
      catch{try{preview=AuraGraphics.fallback(canvas,{preview:true,quality:"low",stadium:"night",home:getClub("barcelona"),away:getClub("madrid")});preview.render(null,"wide",0);}catch{canvas.classList.add("stadium-unavailable");}}
    }
  }
  const modeCards=[
    ["career","01","CARRERA MÁNAGER","TU CLUB, TUS REGLAS","Construye tu equipo, negocia fichajes y conquista tu liga.","Liga · Fichajes · Cantera","🏟️"],
    ["quick","02","PARTIDO RÁPIDO","AL CAMPO DIRECTAMENTE","Elige dos equipos, personaliza el estadio y juega sin compromisos.","11 contra 11 · Dos jugadores","⚡"],
    ["draft","03","DRAFT XI","ONCE ELECCIONES. UN TROFEO.","Elige 11 futbolistas y pelea en un torneo de cuatro eliminatorias.","Fichajes fantasy · Eliminatorias","🃏"],
    ["pro","04","CARRERA DE JUGADOR","TU NOMBRE EN LA CAMISETA","Controla a tu futbolista, suma minutos y haz historia.","Tu jugador · Experiencia · Goles","🌟"],
    ["cup","05","COPAS Y SELECCIONES","EL MUNDO EN JUEGO","Juega octavos, cuartos, semifinales y finales internacionales.","Champions · Libertadores · Mundial","🏆"],
    ["ultimate","06","ULTIMATE TEAM","TU CLUB. TUS CARTAS.","Colecciona, mejora tu once y juega los eventos especiales.","Mercado · Sobres · Liga Argentina","💎"],
    ["street","07","CALLE / VOLTA","LA CALLE ES TU ESTADIO","Partidos rápidos de tres contra tres: ritmo, técnica y espectáculo.","3 contra 3 · Fútbol urbano","🔥"]
  ];
  const savedFormations=typeof AuraQuickFormations!=="undefined"&&typeof localStorage!=="undefined"
    ?AuraQuickFormations.load(localStorage):{home:"4-3-3",away:"4-3-3"};
  let quickHomeFormation=savedFormations.home,quickAwayFormation=savedFormations.away;
  function persistQuickFormations(){
    try{if(typeof AuraQuickFormations!=="undefined"&&typeof localStorage!=="undefined")
      AuraQuickFormations.save(localStorage,{home:quickHomeFormation,away:quickAwayFormation});}catch{}
  }
  // Restore the last valid club pairing. Active rivalries override this below.
  try{
    if(typeof AuraQuickFormations!=="undefined"&&typeof localStorage!=="undefined"&&typeof clubs!=="undefined"){
      const remembered=AuraQuickFormations.loadTeams(localStorage,clubs.map(c=>c.id));
      if(remembered){quickHome=remembered.home;quickAway=remembered.away;}
    }
  }catch{}
  function persistQuickTeams(){
    try{if(typeof AuraQuickFormations!=="undefined"&&typeof localStorage!=="undefined"&&typeof clubs!=="undefined")
      AuraQuickFormations.saveTeams(localStorage,{home:quickHome,away:quickAway},clubs.map(c=>c.id));}catch{}
  }
  // Independent mode saves never read or modify Career or Ultimate Team.
  const savedModes=typeof AuraModeProgress!=="undefined"&&typeof localStorage!=="undefined"
    ?AuraModeProgress.load(localStorage):{draft:null,rivalry:null};
  quickRivalry=savedModes.rivalry||null;
  if(quickRivalry){quickHome=quickRivalry.home;quickAway=quickRivalry.away;}
  draft=savedModes.draft?{...savedModes.draft,pool:[]}:null;
  function persistModes(){
    try{if(typeof AuraModeProgress!=="undefined"&&typeof localStorage!=="undefined")
      AuraModeProgress.save(localStorage,draft,quickRivalry);}catch{}
  }
  // Penalty Challenge save lives outside Career, UT, Draft and Rivalry.
  let penaltyChallenge=null,penaltyFocus=null,penaltyHistory=[];
  try{
    if(typeof AuraPenaltyChallenge!=="undefined"&&typeof localStorage!=="undefined")
      penaltyChallenge=AuraPenaltyChallenge.load(localStorage);
    if(typeof AuraPenaltyHistory!=="undefined"&&typeof localStorage!=="undefined"){
      penaltyHistory=AuraPenaltyHistory.load(localStorage);
      // Migrate a completed shootout from before the history update, once only.
      if(penaltyChallenge?.status==="finished")
        penaltyHistory=AuraPenaltyHistory.record(localStorage,penaltyChallenge).rows;
    }
  }catch{}
  const savedSkill=typeof AuraSkillGames!=="undefined"&&typeof localStorage!=="undefined"?AuraSkillGames.load(localStorage):{session:null,best:{}};
  let skillSession=savedSkill.session,skillBest=savedSkill.best,skillAim="center",skillPower="medium",skillFeedback="",skillFocus=null;
  function persistSkill(){try{if(typeof AuraSkillGames!=="undefined"&&typeof localStorage!=="undefined")AuraSkillGames.save(localStorage,skillSession,skillBest);}catch{}}
  function persistPenalty(){
    try{if(typeof AuraPenaltyChallenge!=="undefined"&&typeof localStorage!=="undefined")
      AuraPenaltyChallenge.save(localStorage,penaltyChallenge);}catch{}
  }
  // Mode-navigation preferences are separate from career and Ultimate Team saves.
  try{
    const last=localStorage.getItem("aura-recent-mode-v1"),fav=localStorage.getItem("aura-pinned-mode-v1");
    if(modeCards.some(row=>row[0]===last))recentMode=last;
    if(modeCards.some(row=>row[0]===fav))pinnedMode=fav;
  }catch{}
  function modeMeta(id){return modeCards.find(row=>row[0]===id)||modeCards[0];}
  function chooseMode(id){
    if(!modeCards.some(row=>row[0]===id))return false;
    mode=id;modeOpen=true;recentMode=id;lobby=true;
    try{localStorage.setItem("aura-recent-mode-v1",id);}catch{}
    render();
    window.scrollTo(0,0);return true;
  }
  function modeTabs(){
    // Read each mode's own validated save; never create/overwrite a save on menu render.
    const progress={career:state,draft,rivalry:quickRivalry,penalty:penaltyChallenge};
    try{
      if(typeof localStorage!=="undefined"){
        if(typeof AuraCupSave!=="undefined")progress.cups=AuraCupSave.load(localStorage,AuraTour.cupTypes);
        if(typeof AuraStreetSave!=="undefined")progress.street=AuraStreetSave.load(localStorage);
        if(typeof AuraUTSave!=="undefined")progress.ultimate=AuraUTSave.load(localStorage).snapshot?.club||null;
      }
    }catch{} // Browsers with restricted storage still show every mode.
    const ordered=modeCards.slice().sort((a,b)=>Number(b[0]===pinnedMode)-Number(a[0]===pinnedMode));
    return '<section class="aura-mode-library" aria-labelledby="aura-mode-choose">'+
      '<div class="aura-mode-library-heading"><div><span class="eyebrow">AURA 27 · ELIGE TU MUNDO</span>'+
      '<h2 id="aura-mode-choose">SIETE MODOS.<br><em>SIETE HISTORIAS.</em></h2></div>'+
      '<p>Ya no son pestañas mezcladas. Cada modo abre su propio espacio y puedes volver sin perder el equipo que estabas preparando.</p></div>'+
      '<div class="mode-tabs aura-mode-cards">'+ordered.map(([id,num,title,slogan,description,feature,emoji])=>{
        const pin=pinnedMode===id;
        const status=typeof AuraModeProgress!=="undefined"?AuraModeProgress.progressLabel(id,progress):null;
        return '<article class="aura-mode-tile aura-mode-tile--'+id+'" data-mode-card="'+id+'">'+
          '<button class="aura-mode-launch" data-evo-mode="'+id+'" aria-label="Entrar a '+title+'">'+
            '<span class="aura-mode-tile-top"><span class="aura-mode-number">'+num+' / 07</span><span class="aura-mode-emoji" aria-hidden="true">'+emoji+'</span></span>'+
            '<strong>'+title+'</strong><em>'+slogan+'</em><span class="aura-mode-description">'+description+'</span>'+
            '<span class="aura-mode-feature">'+feature+'</span>'+
            (status?'<span class="aura-mode-progress" role="status">'+text(status)+'</span>':'')+
            '<span class="aura-mode-cta">'+(status?'VOLVER AL MODO':'ENTRAR AL MODO')+' <b>↗</b></span>'+
          '</button><button class="aura-mode-pin" data-evo-pin="'+id+'" aria-pressed="'+pin+'" aria-label="'+(pin?'Quitar de favoritos':'Destacar')+' '+title+'">'+
            (pin?'★ DESTACADO':'☆ DESTACAR')+'</button></article>';
      }).join('')+'</div></section>';
  }
  function modeHeader(){
    const [id,num,title,slogan,description,feature,emoji]=modeMeta(mode);
    return '<div class="aura-mode-breadcrumb"><button class="aura-mode-back" data-evo="mode-back">← TODOS LOS MODOS</button>'+
      '<span>AURA 27 / '+num+' / '+title+'</span></div>'+
      '<header class="aura-mode-detail-header aura-mode-detail-header--'+id+'"><div>'+
      '<span class="eyebrow">MODO '+num+' · '+title+'</span><h1>'+slogan+'</h1>'+
      '<p>'+description+'</p><span class="aura-mode-feature">'+feature+'</span></div>'+
      '<span class="aura-mode-detail-symbol" aria-hidden="true">'+emoji+'</span></header>';
  }
  function modeHub(){
    const stats=World.getStats(),loaded=World.isLoaded(),recent=recentMode&&modeMeta(recentMode);
    return '<div class="season-intro"><span>AURA 6.0 <b>/ LA NUEVA ERA</b></span>'+
      '<button data-evo="controls" class="club-controls-link">Controles y cómo jugar <span>→</span></button></div>'+
      '<section class="aura-mode-home-hero"><div class="aura-mode-home-mesh" aria-hidden="true"></div>'+
      '<span class="eyebrow">AURA 6.0 · UN JUEGO · SIETE EXPERIENCIAS</span>'+
      '<h1>ELIGE CÓMO<br><em>HACER HISTORIA.</em></h1>'+
      '<p>Carrera, partidos, Draft, copas, fútbol callejero y Ultimate Team. Entra en cada uno desde su propia pantalla. Puedes iniciar nueva carrera entrando en Carrera Mánager.</p>'+
      '<div class="aura-mode-home-actions"><button class="btn primary" data-evo="events-open">EVENTOS ACTUALES UT →</button>'+
      '<button class="btn" data-evo="hero-start">EXPLORAR MODOS ↓</button>'+
      (recent?'<button class="btn" data-evo="mode-resume">↗ VOLVER A '+recent[2]+'</button>':'')+
      '<button class="btn" data-evo="skill-open">🎯 CENTRO DE ENTRENAMIENTO</button></div>'+
      '<div class="aura60-live-strip"><div><span>EN ULTIMATE TEAM</span><strong>EVENTOS ACTUALES. TUS COLORES.</strong></div><div class="aura60-event-shortcuts"><button data-evo="magia-open">✧ MAGIA</button><button data-evo="barcelona-open">🔵🔴 BARÇA</button><button data-evo="muralla-open">◈ MURALLA</button><button data-evo="flashback-open">✦ FLASHBACK</button><button data-evo="argentina-open">🇦🇷 LIGA ARGENTINA</button></div></div>'+
      '<div class="aura-mode-home-metrics"><span><strong>07</strong> MODOS</span>'+
      '<span><strong>'+(loaded?Number(stats.clubs||0).toLocaleString("es-ES"):'11×11')+'</strong> CLUBES O JUGADORES</span>'+
      '<span><strong>3D</strong> PARTIDOS JUGABLES</span></div></section>'+modeTabs();
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
  function rivalryPanel(){
    const rivalry=quickRivalry;
    if(!rivalry)return '<section class="quick-rivalry"><span class="eyebrow">NUEVO MODO · RIVALIDAD</span>'+
      '<h2>AL MEJOR DE TRES.</h2><p>Enfrenta a tu rival en una serie. El primero en ganar dos partidos se lleva el trofeo. Si hay empate, se decide por penaltis.</p>'+
      '<button class="btn primary" data-evo="quick-rivalry-new">Empezar serie →</button></section>';
    const round=AuraRivalry.next(rivalry),finished=!round;
    return '<section class="quick-rivalry"><div class="quick-rivalry-top"><div><span class="eyebrow">RIVALIDAD · MEJOR DE TRES</span>'+
      '<h2>'+(finished?'🏆 SERIE TERMINADA':'ENCUENTRO '+round+' / 3')+'</h2>'+
      '<p>'+(finished?'Ganador: '+text(getClub(rivalry.champion).name):
        'Gana dos partidos. Los empates se resuelven por penaltis.')+'</p></div>'+
      '<div class="quick-rivalry-score"><span>'+text(getClub(rivalry.home).name)+'</span><strong>'+
        rivalry.wins[0]+' — '+rivalry.wins[1]+'</strong><span>'+text(getClub(rivalry.away).name)+'</span></div></div>'+
      '<div class="quick-rivalry-results">'+rivalry.results.map(match=>
        '<article><span>PARTIDO '+match.round+'</span><strong>'+match.score.home+' — '+match.score.away+'</strong>'+
        '<small>'+(match.penalties?'Penaltis '+match.penalties.home+' — '+match.penalties.away+' · ':'')+
        'Ganó '+text(getClub(match.winner===0?rivalry.home:rivalry.away).name)+'</small></article>').join('')+'</div>'+
      (round?'<button class="btn primary" data-evo="quick-rivalry-play">Jugar partido '+round+' →</button>'+
         '<button class="btn" data-evo="quick-rivalry-sim">Simular siguiente partido</button>'+
         '<button class="btn" data-evo="quick-rivalry-sim-all">Simular toda la serie</button>':'')+
      '<button class="btn" data-evo="quick-rivalry-reset">'+(finished?'Otra rivalidad':'Cancelar rivalidad')+'</button></section>';
  }
  function playRivalry(){
    const series=quickRivalry,round=AuraRivalry.next(series);
    if(!round)return false;
    const opponent=getClub(series.away),mine=getClub(series.home);
    AuraArena.preMatch(AuraArena.team(mine,null,null,quickHomeFormation),AuraArena.team(opponent,null,null,quickAwayFormation),{
      label:'AURA RIVALIDAD · PARTIDO '+round+' · '+mine.name+' vs '+opponent.name,
      onFinish:result=>{
        if(quickRivalry!==series||AuraRivalry.next(series)!==round)return;
        const match=AuraRivalry.record(series,result);
        if(match){persistModes();render();notify('Rivalidad · '+(series.status==='finished'?'¡Serie terminada!':'Partido registrado.')+
          ' '+series.wins[0]+' — '+series.wins[1]);}
      }
    });
    return true;
  }
  function penaltyHistoryPanel(){
    if(typeof AuraPenaltyHistory==="undefined")return "";
    const stats=AuraPenaltyHistory.stats(penaltyHistory);
    const label=id=>text(clubs.find(c=>c.id===id)?.name||id);
    return '<section class="quick-penalty-history" aria-label="Estadísticas e historial de penaltis">'+
      '<div class="quick-penalty-history-title"><span class="penalty-eyebrow">TU HISTORIAL</span>'+
      '<h3>LAS ÚLTIMAS '+AuraPenaltyHistory.MAX_ROWS+' TANDAS.</h3>'+
      '<p>Se conserva en este navegador, independientemente de tus otros modos.</p></div>'+
      '<div class="quick-penalty-metrics">'+[
        ["TANDAS",stats.played],["VICTORIAS",stats.wins],["DERROTAS",stats.losses],
        ["GOLES",stats.goals],["ATAJADAS",stats.saves],["PRECISIÓN",stats.accuracy+"%"],
        ["MEJOR RACHA",stats.bestStreak]
      ].map(([name,value])=>'<div><strong>'+value+'</strong><small>'+name+'</small></div>').join("")+'</div>'+
      (penaltyHistory.length?'<div class="quick-penalty-records">'+penaltyHistory.slice(0,6).map(item=>
        '<article><b class="'+(item.winner===item.home?"win":"loss")+'">'+
        (item.winner===item.home?"VICTORIA":"DERROTA")+'</b>'+
        '<span>'+label(item.home)+' '+item.score[0]+' — '+item.score[1]+' '+label(item.away)+'</span>'+
        '<small>'+item.saves+' atajadas · '+item.goals+'/'+item.kicksTaken+' goles</small></article>'
      ).join("")+'</div>':'<p class="quick-penalty-empty">Todavía no has terminado una tanda.</p>')+
      '<p class="save-info">Estadísticas de hasta 24 tandas recientes, no totales históricos de por vida.</p></section>';
  }
  function penaltyPanel(){
    const c=penaltyChallenge,dirNames={left:"IZQUIERDA",center:"CENTRO",right:"DERECHA"};
    if(!c)return '<section class="quick-penalties"><span class="penalty-eyebrow">NUEVO DESAFÍO · PARTIDO RÁPIDO</span>'+
      '<h3>EL MOMENTO DE LOS PENALTIS.</h3><p>Elige tus equipos y juega una tanda contra la IA. Tú decides dónde disparar y hacia dónde lanzarte. El progreso se guarda en este navegador.</p>'+
      '<button class="btn primary penalty-new" data-evo="quick-penalty-new">⚽ Comenzar tanda →</button></section>'+penaltyHistoryPanel();
    const finished=c.status==="finished",attack=AuraPenaltyChallenge.side(c)===0;
    const last=c.kicks[c.kicks.length-1],names={left:"izquierda",center:"centro",right:"derecha"};
    const lastResult=last?(last.scored?"¡GOL!":"¡ATAJADA O FALLO!")+
      " · Balón: "+names[last.aim]+" · Portero: "+names[last.dive]:"";
    const current=AuraPenaltyHistory.details(c);
    const kicks=c.kicks.map((shot,i)=>'<span class="quick-penalty-shot '+(shot.scored?"scored":"missed")+
      '" title="'+(shot.side===0?"Tu tiro":"Tiro rival")+' '+(i+1)+': '+(shot.scored?"gol":"fallo")+'">'+
      (shot.scored?"✓":"✕")+'</span>').join("");
    return '<section class="quick-penalties" aria-label="Desafío de penaltis">'+
      '<span class="penalty-eyebrow">⚽ TANDA DE PENALTIS · '+(finished?"TERMINADA":"EN JUEGO")+'</span>'+
      '<h3>'+(finished?"🏆 ¡TENEMOS GANADOR!":attack?"TU TURNO: DISPARAR":"TU TURNO: ATAJAR")+'</h3>'+
      '<div class="quick-penalty-score" role="status"><span>'+text(getClub(c.home).name)+'</span>'+
      '<strong>'+c.score[0]+' — '+c.score[1]+'</strong><span>'+text(getClub(c.away).name)+'</span></div>'+
      '<div class="quick-penalty-shots" aria-label="Historial de tiros">'+kicks+'</div>'+
      (last?'<p class="penalty-last" role="status">'+lastResult+'</p>':"")+
      '<div class="quick-penalty-current"><span>⚽ '+current.goals+'/'+current.kicksTaken+' GOLES</span>'+
      '<span>🧤 '+current.saves+' ATAJADAS</span><span>🎯 '+current.divesCorrect+' LECTURAS</span></div>'+
      (finished?'<p class="penalty-finished">Ganador: '+text(getClub(c.winner).name)+'</p>':
        '<p>'+(attack?"Elige dónde tirar. El portero rival intentará adivinar.":"Elige hacia dónde lanzarte. La IA disparará.")+
        ' Cinco tiros por equipo y muerte súbita si empatan.</p>'+
        '<div class="quick-penalty-goal" aria-hidden="true"><span>↖</span><span>↑</span><span>↗</span></div>'+
        '<div class="quick-penalty-choices">'+AuraPenaltyChallenge.directions.map(d=>
          '<button type="button" data-evo="quick-penalty-kick" data-penalty-dir="'+d+'">'+dirNames[d]+'</button>'
        ).join("")+'</div>')+
      '<button class="btn penalty-new" data-evo="quick-penalty-new">'+(finished?"↻ Jugar otra tanda":"↻ Reiniciar con los equipos seleccionados")+'</button>'+
      '<p class="save-info">Desafío independiente de Rivalidad, Draft, Carrera y Ultimate Team.</p></section>'+penaltyHistoryPanel();
  }
  function skillPanel(){
    if(typeof AuraSkillGames==="undefined")return "";
    const K=AuraSkillGames,g=skillSession,goal=g?K.target(g):null,L=K.names;
    const previous=g?.turn?K.target({...g,turn:g.turn-1}):null;
    return '<section class="skill-games" id="skill-games" aria-label="Desafíos de habilidad">'+
      '<span class="eyebrow">NUEVO · ENTRENAMIENTO</span><h2>DESAFÍOS DE HABILIDAD</h2>'+
      '<p class="skill-intro">Tres minijuegos de precisión con récords independientes. No son partidos 3D.</p>'+
      '<div class="skill-types">'+Object.entries(K.kinds).map(([id,item])=>
        '<button type="button" data-evo="skill-start" data-skill-kind="'+id+'" class="'+(g?.kind===id?"selected":"")+'">'+
        '<strong>'+item.name+'</strong><small>Récord: '+(skillBest[id]||0)+' / 900</small>'+
        '<span>'+(g?.kind===id&&g.status==="playing"?"REINICIAR":"EMPEZAR")+' ↗</span></button>').join("")+'</div>'+
      (g?'<div class="skill-board"><div class="skill-score"><strong>'+K.kinds[g.kind].name+'</strong>'+
        '<span>INTENTO '+g.turn+' / '+K.ROUNDS+'</span><span>'+g.score+' PUNTOS</span></div>'+
        '<progress max="'+K.ROUNDS+'" value="'+g.turn+'" aria-label="Intentos completados"></progress>'+
        '<div class="skill-goal-visual" aria-hidden="true"><div class="skill-goal-net">'+
        K.lanes.map(id=>'<div class="skill-goal-cell '+(skillAim===id?"aimed ":"")+
          (g.status==="playing"&&g.kind!=="keeping"&&goal.lane===id?"target":"")+'">'+
          '<span>'+L[id]+'</span></div>').join('')+
        (previous?'<span class="skill-last-ball skill-last-ball--'+previous.lane+'">⚽</span>':'')+
        '</div><small>'+(previous?"ÚLTIMO INTENTO · POSICIÓN DEL BALÓN":"SELECCIONA UNA ZONA PARA EMPEZAR")+'</small></div>'+
        (g.status==="playing"?(g.kind==="keeping"?
          '<p class="skill-tip">🧤 ¡Se acerca un disparo! Altura <b>'+({soft:"Baja",medium:"Media",strong:"Alta"}[goal.distance])+
          '</b>. Adivina el lado al que irá el balón y elige la altura de tu estirada.</p>':
          '<p class="skill-tip">Objetivo: <b>'+L[goal.lane]+'</b> · Potencia <b>'+L[goal.distance]+'</b>. Elige dirección y potencia.</p>')+
          '<div class="skill-choices"><fieldset><legend>Dirección</legend>'+
          K.lanes.map(id=>'<button type="button" data-evo="skill-aim" data-skill-aim="'+id+'" aria-pressed="'+(skillAim===id)+'" class="'+(skillAim===id?"selected":"")+'">'+L[id]+'</button>').join("")+
          '</fieldset><fieldset><legend>'+(g.kind==="keeping"?"Altura de la estirada":"Potencia")+'</legend>'+
          K.powers.map(id=>'<button type="button" data-evo="skill-power" data-skill-power="'+id+'" aria-pressed="'+(skillPower===id)+'" class="'+(skillPower===id?"selected":"")+'">'+(g.kind==="keeping"?({soft:"Baja",medium:"Media",strong:"Alta"}[id]):L[id])+'</button>').join("")+
          '</fieldset></div><button type="button" class="btn primary skill-fire" data-evo="skill-fire">'+K.kinds[g.kind].verb+' · '+(g.turn+1)+' / 9 →</button>':
          '<div class="skill-finish">🏅 '+K.medal(g)+' · '+g.score+' / 900 puntos</div>'+
          '<button type="button" class="btn skill-fire" data-evo="skill-reset">Cerrar resultado</button>')+
        (skillFeedback?'<p class="skill-result" role="status">'+text(skillFeedback)+'</p>':'')+'</div>':
        '<p class="skill-empty">Elige un ejercicio para comenzar.</p>')+'</section>';
  }
  function availableQuickFormations(){
    return typeof AuraQuickFormations!=="undefined"?AuraQuickFormations.formations:Object.keys(AuraSquad.formations);
  }
  function quickPicker(){
    const h=getClub(quickHome),a=getClub(quickAway);
    const team=(club,id,label)=>'<div class="quick-team"><span class="quick-team-label">'+label+'</span>'+badge(club,105)+'<label class="sr-only" for="'+id+'">'+label+'</label><select id="'+id+'" '+(quickRivalry?.status==='playing'?'disabled':'')+'>'+quickChoices(club.id)+'</select><label class="quick-formation-label" for="'+id+'-formation">Formación<select id="'+id+'-formation">'+availableQuickFormations().map(formation=>
        '<option value="'+formation+'" '+((id==="quick-home"?quickHomeFormation:quickAwayFormation)===formation?'selected':'')+'>'+formation+'</option>').join('')+
      '</select></label><button class="quick-roster-link" data-evo="view-roster" data-club="'+text(club.id)+'">Ver plantilla →</button><button class="quick-lineup-button" data-evo="quick-lineup" data-quick-side="'+(id==="quick-home"?"home":"away")+'">⚽ Ver once táctico →</button><div class="quick-strength"><strong>'+club.rating+'</strong><span>FORTALEZA<br>DEL CLUB</span></div><div class="quick-strength-track" aria-hidden="true"><i style="width:'+club.rating+'%"></i></div></div>';
    return '<section class="quick-match-panel"><div class="selection-heading"><div><span class="eyebrow">02 / DIRECTO AL PARTIDO</span><h2>EL CÉSPED TE ESPERA.</h2></div><span class="pill">11 contra 11 · Tú contra la IA</span></div><div class="quick-search-bar"><label for="quick-club-search">Encuentra un equipo<input id="quick-club-search" type="search" placeholder="Busca club o ciudad…" value="'+text(quickQuery)+'" autocomplete="off"></label><span id="quick-search-status" role="status">'+quickClubs().filter(c=>!quickQuery||normal(c.name+" "+c.city).includes(normal(quickQuery))).length+' equipos en la búsqueda</span></div><div class="quick-teams">'+team(h,"quick-home","TU EQUIPO")+'<div class="quick-versus"><b aria-hidden="true">VS</b><button class="quick-swap" data-evo="quick-swap" aria-label="Intercambiar tu equipo y el rival" title="Intercambiar equipos">⇄</button></div>'+team(a,"quick-away","EL RIVAL")+'</div><div class="quick-cta"><button class="btn primary" data-evo="quick-start">Preparar partido <span>→</span></button><p>Duración, dificultad, ambiente y gráficos. El siguiente paso lo eliges tú.</p></div></section>'+rivalryPanel()+penaltyPanel()+skillPanel();
  }
  function pool(){
    if(typeof AuraRosterSync!=="undefined")return AuraRosterSync.pool();
    const map=new Map(),catalog=World.allPlayers?.()||[],bundled=Real.allPlayers?.()||[];
    for(const p of [...catalog,...bundled,...clubs.flatMap(c=>Real.rosterFor(c))]){const key=normal(p.name);if(!p.real||!p.id||p.overall<65)continue;if(!map.has(key)||p.overall>map.get(key).overall)map.set(key,{...p});}
    return [...map.values()];
  }
  function startDraft(){
    draft={players:[],pool:pool(),offers:[],finished:false,tournament:null,rerollsLeft:3};
    offerDraft();persistModes();
  }
  function offerDraft(previous=[]){
    const index=draft.players.length;if(index===11){draft.offers=[];return;}
    if(!draft.pool?.length)draft.pool=pool();
    const position=AuraSquad.formations["4-3-3"][index][0],owned=new Set(draft.players.map(p=>normal(p.name)));
    const choices=draft.pool.filter(p=>!owned.has(normal(p.name))).sort((a,b)=>(b.overall-AuraSquad.positionPenalty(b,position)*2)-(a.overall-AuraSquad.positionPenalty(a,position)*2)).slice(0,80);
    const oldIds=new Set(previous.map(p=>p.id)),fresh=choices.filter(p=>!oldIds.has(p.id));
    const group=fresh.length>=5?fresh:choices;
    for(let i=group.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[group[i],group[j]]=[group[j],group[i]];}
    draft.offers=group.slice(0,5);
  }
  function rerollDraft(){
    if(!draft||draft.players.length>=11||draft.rerollsLeft<=0)return false;
    const previous=draft.offers.slice();offerDraft(previous);
    if(draft.offers.length<1)return false;
    draft.rerollsLeft--;persistModes();return true;
  }
  const draftRounds=["OCTAVOS","CUARTOS","SEMIFINALES","FINAL"];
  function draftTournamentView(){
    if(!draft||draft.players.length!==11)return "";
    const tournament=draft.tournament||(draft.tournament=AuraKnockout.createDraft(draft.players));
    const opponent=AuraKnockout.opponent(tournament);
    const club=opponent?getClub(opponent):null;
    const completed=tournament.results.map(match=>
      '<div class="draft-run-match"><span>'+draftRounds[match.round-1]+'</span>'+
      '<strong>AURA XI '+match.score.home+' — '+match.score.away+' '+text(getClub(match.opponent).name)+'</strong>'+
      '<small>'+(match.penalties?'Penaltis '+match.penalties.home+' — '+match.penalties.away+' · ':'')+
      (match.won?'✓ CLASIFICADO':'✕ ELIMINADO')+'</small></div>').join("");
    return '<section class="draft-run"><div class="draft-run-header"><span class="eyebrow">AURA DRAFT · TORNEO ELIMINATORIO</span>'+
      '<h3>'+(tournament.status==="champion"?'🏆 ¡CAMPEONES DEL DRAFT!':
        tournament.status==="eliminated"?'ELIMINADOS EN '+draftRounds[tournament.results.length-1]:
        draftRounds[tournament.round]+' · '+text(club.name))+'</h3>'+
      '<p>'+(tournament.status==="playing"?'Gana cuatro eliminatorias para levantar la copa. Si empatas, hay tanda de penaltis.':
        'Has ganado '+tournament.results.filter(m=>m.won).length+' eliminatorias. Tu recorrido termina aquí.')+'</p></div>'+
      '<div class="draft-run-progress">'+draftRounds.map((name,i)=>'<span class="'+(i<tournament.round?'passed':i===tournament.round&&tournament.status==="playing"?'current':'')+'">'+
         (i+1)+' · '+name+'</span>').join('')+'</div>'+
      '<div class="draft-run-history">'+(completed||'<p>Aún no hay encuentros disputados.</p>')+'</div>'+
      (tournament.status==="playing"?'<button class="btn primary" data-evo="draft-play">Jugar contra '+text(club.name)+' →</button>'+
         '<button class="btn" data-evo="draft-sim">Simular eliminatoria</button>'+
         '<button class="btn" data-evo="draft-sim-all">Simular hasta terminar el Draft</button>':
        '<button class="btn" data-evo="draft-retry">Reiniciar torneo con el mismo once →</button>')+'</section>';
  }
  function playDraftTournament(){
    if(!draft||draft.players.length!==11)return false;
    const tournament=draft.tournament||(draft.tournament=AuraKnockout.createDraft(draft.players));
    const opponent=AuraKnockout.opponent(tournament);
    if(!opponent)return false;
    const round=tournament.round,c={id:"aura-draft",name:"AURA Draft XI",rating:tournament.rating};
    AuraArena.preMatch(AuraArena.team(c,null,draft.players),AuraArena.team(getClub(opponent)),{
      draft:true,label:"AURA DRAFT · "+draftRounds[round],
      onFinish:result=>{
        if(draft?.tournament!==tournament||tournament.status!=="playing"||tournament.round!==round)return;
        const outcome=AuraKnockout.recordDraft(tournament,result,getClub(opponent).rating);
        if(outcome){persistModes();render();notify(outcome.won?"¡Eliminatoria superada!": "Fin de tu torneo Draft XI.");}
      }
    });
    return true;
  }
  function draftView(){
    if(!draft)return '<section class="draft-intro"><div><span class="eyebrow">DRAFT XI / SIN COSTE</span><h2>ONCE ELECCIONES.<br>UN EQUIPO<br><em>IRREPETIBLE.</em></h2><p>Elige uno de cinco futbolistas para cada posición. Completa tu once y sal al estadio contra un rival de élite.</p><button class="btn primary" data-evo="draft-new">Crear mi Draft XI →</button></div><div class="draft-card-fan">'+[88,92,90].map((n,i)=>'<div class="draft-art-card art-'+i+'"><span>'+n+'</span><small>'+(i===1?'AURA':'XI')+'</small><b>★</b></div>').join("")+'</div></section>';
    const done=draft.players.length===11,rating=Math.round(draft.players.reduce((n,p)=>n+p.overall,0)/Math.max(1,draft.players.length));
    return '<div class="draft-progress"><span>CONSTRUYE TU XI</span><progress max="11" value="'+draft.players.length+'" aria-label="Jugadores elegidos"></progress><b>'+draft.players.length+' / 11</b></div><div class="selection-heading"><div><span class="eyebrow">'+draft.players.length+' / 11 JUGADORES ELEGIDOS</span><h2>'+(done?'TU ONCE ESTÁ LISTO.':'ELIGE TU '+AuraSquad.formations["4-3-3"][draft.players.length][0])+ '</h2></div><span class="draft-rating">'+rating+' <small>GRL</small></span></div>'+
      (done?'<div class="draft-ready"><h3>EL TORNEO TE ESPERA.</h3>'+
          draftTournamentView()+'<button class="btn" data-evo="draft-new">Crear otro once</button></div>':'<div class="draft-offer-tools"><span>3 CAMBIOS DE OFERTAS POR DRAFT · '+draft.rerollsLeft+' RESTANTES</span><button class="btn" data-evo="draft-reroll" '+(!draft.rerollsLeft?'disabled':'')+'>↻ Nuevas cinco cartas</button></div><div class="draft-offers">'+draft.offers.map((p,i)=>'<button class="draft-player-card" data-draft-pick="'+i+'"><div class="draft-card-top"><strong>'+p.overall+'</strong><span>'+text(p.pos)+'</span></div>'+AuraPortraits.html(p,true)+'<h3>'+text(p.name)+'</h3><p>'+text(p.sourceClub||clubs.find(c=>c.id===p.club)?.name||p.nationality||"Futbolista real")+'</p><span class="draft-card-choice">Elegir jugador →</span></button>').join("")+'</div>')+
      '<div class="draft-selected"><h3>TU EQUIPO · 4-3-3</h3><div>'+AuraSquad.formations["4-3-3"].map(([pos],i)=>'<span class="draft-slot '+(draft.players[i]?'filled':'')+'"><small>'+pos+'</small><strong>'+text(draft.players[i]?.name||"Por elegir")+'</strong>'+(draft.players[i]?'<b>'+draft.players[i].overall+'</b>':'')+'</span>').join("")+'</div></div>';
  }
  function welcome(){
    if(!modeOpen)return modeHub();
    const content=mode==="ultimate"?AuraUTUI.render():
      mode==="career"?careerPicker():mode==="quick"?quickPicker():
      mode==="draft"?draftView():AuraTourUI.welcome(mode,mode==="pro"?careerPicker():"");
    return '<div class="aura-mode-page aura-mode-page--'+mode+'">'+modeHeader()+
      '<section class="aura-mode-stage" id="mode-content">'+content+'</section></div>';
  }
  function scheduleStrip(){
    if(state.version!==2)return "";
    const fixtures=state.competition.fixtures.flat().filter(f=>!f.score&&(f.home===state.club||f.away===state.club)).slice(0,3);
    if(!fixtures.length)return "";
    return '<section class="club-agenda" aria-label="Próximas jornadas"><div><span class="eyebrow">EN EL HORIZONTE</span><h3>Tu agenda</h3></div>'+fixtures.map(f=>{const home=f.home===state.club,rival=getClub(home?f.away:f.home);return '<button data-nav="calendar"><span>J'+f.round+' <small>'+ (home?'LOCAL':'VISITANTE')+'</small></span>'+badge(rival,27)+'<strong>'+text(rival.name)+'</strong><b aria-hidden="true">→</b></button>';}).join("")+'</section>';
  }
  function recentForm(){return state.history.slice(0,5).reverse().map(h=>'<span class="form-result '+(h.g1>h.g2?'win':h.g1===h.g2?'draw':'loss')+'">'+(h.g1>h.g2?'G':h.g1===h.g2?'E':'P')+'</span>').join("")||'<span class="muted-text">Tu temporada empieza aquí</span>';}
  function dashboard(){
    const c=myClub(),fixture=AuraContinental.next(state),op=fixture?getClub(fixture.home===state.club?fixture.away:fixture.home):null,sheet=AuraSquad.ensure(state),stars=AuraSquad.players(state).slice().sort((a,b)=>b.overall-a.overall).slice(0,3),row=seasonTable().find(x=>x.id===state.club),date=new Date(Date.UTC(state.season,7,15+state.round*7));
    return '<div class="career-season-strip"><span>TU CLUB <b>/ AURA 6.0</b></span><span>'+state.round+' DE '+totalRounds()+' JORNADAS<progress max="'+totalRounds()+'" value="'+state.round+'" aria-label="Avance de temporada"></progress></span></div><div class="career-topline"><div class="career-club-title">'+badge(c,44)+'<div><span class="eyebrow">TU CARRERA · '+state.season+'/'+String(state.season+1).slice(2)+'</span><h1>'+text(c.name)+'</h1></div></div><div class="career-date"><span>'+date.toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"})+'</span><small>Calendario de tu carrera</small></div></div><div class="career-hub"><section class="next-match-card"><div class="match-card-top"><span class="live-indicator"></span><span>'+text(fixture?.label||competitionName())+'</span><b>'+text(fixture?.phaseLabel||'TEMPORADA COMPLETADA')+'</b></div>'+(op?'<div class="next-match-title"><span>EL SIGUIENTE RETO</span><h2>EL PARTIDO<br><em>ES TUYO.</em></h2></div><div class="fixture-teams"><div>'+badge(getClub(fixture.home),55)+'<strong>'+text(getClub(fixture.home).name)+'</strong><small>LOCAL</small></div><span>VS</span><div>'+badge(getClub(fixture.away),55)+'<strong>'+text(getClub(fixture.away).name)+'</strong><small>VISITANTE</small></div></div><div class="next-match-buttons"><button class="btn primary" data-evo="career-play">Jugar partido 3D <span>→</span></button><button class="btn" data-action="play">Simular jornada →</button></div>':'<div class="next-match-title"><span>TEMPORADA COMPLETADA</span><h2>UNA HISTORIA<br><em>PARA RECORDAR.</em></h2><p>Posición final: '+rank()+'º · '+(state.wins*3+state.draws)+' puntos</p><button class="btn primary" data-action="play">Cerrar temporada →</button></div>')+'</section><aside class="career-summary"><div class="hub-stats"><div><span>POSICIÓN</span><strong>'+rank()+'<small>º</small></strong><p>'+row.pts+' puntos en '+row.p+' jornadas</p></div><div><span>PRESUPUESTO</span><strong>'+compact(state.budget)+'</strong><p>Disponible para fichajes</p></div><div><span>TU ONCE</span><strong>'+overall(state.club)+'<small> GRL</small></strong><p>'+sheet.formation+' · '+AuraSquad.players(state).length+' titulares</p></div><div><span>ÚLTIMOS PARTIDOS</span><div class="recent-form">'+recentForm()+'</div><p>'+state.wins+'G · '+state.draws+'E · '+state.losses+'P</p></div></div><div class="hub-tactics"><label for="evo-tactic">Identidad de juego<select id="evo-tactic">'+[["balanced","Equilibrado"],["possession","Posesión"],["press","Presión alta"],["counter","Contraataque"]].map(([id,label])=>'<option value="'+id+'" '+((state.tactic||"balanced")===id?'selected':'')+'>'+label+'</option>').join("")+'</select></label><p>Define los movimientos de tus compañeros en los partidos 3D.</p><button class="btn small" data-nav="squad">Ajustar once y formación →</button></div></aside></div>'+AuraContinental.summary()+AuraProgressionUI.boardSummary()+scheduleStrip()+'<div class="hub-links">'+[["squad","01","PLANTILLA","Tu talento, en su sitio."],["market","02","MERCADO","Una llamada lo cambia todo."],["academy","03","DESARROLLO","El futuro empieza en casa."],["calendar","04","CALENDARIO","Cada jornada, un nuevo reto."]].map(([id,num,title,desc])=>'<button data-nav="'+id+'"><span>'+num+'</span><h3>'+title+'</h3><p>'+desc+'</p><b>→</b></button>').join("")+'</div><div class="hub-bottom"><section class="card hub-table"><div class="panel-title"><h3>LA LUCHA POR LA CIMA</h3><button class="btn small" data-nav="table">Ver tabla →</button></div>'+tableHtml(7)+'</section><section class="club-news"><div class="panel-title"><h3>DENTRO DEL CLUB</h3><span>ACTUALIDAD</span></div>'+state.news.slice(0,4).map((n,i)=>'<article><span>0'+(i+1)+'</span><p>'+text(n)+'</p></article>').join("")+'<div class="hub-stars">'+stars.map(p=>'<span><b>'+p.overall+'</b>'+text(p.name)+'</span>').join("")+'</div></section></div><div class="career-footer-actions"><span>Carrera por sesión · resultados y movimientos reales dentro de tu partida</span><button class="btn small" data-action="new">Iniciar nueva carrera</button></div>';
  }
  function playCareer(){
    if(!state)return;AuraContinental.settleSpectators(state);const fixture=AuraContinental.next(state);if(!fixture){AuraContinental.advance();return;}
    const gameState=state,round=state.round,season=state.season,token=fixture.id;
    try{
      AuraTourUI.ensurePro();
      const home=AuraArena.team(getClub(fixture.home),state),away=AuraArena.team(getClub(fixture.away),state),userIsHome=fixture.home===state.club;
      // The match model always assigns keyboard control to the first team. The
      // fixture's actual home/away order is restored before recording a result.
      const controlled=userIsHome?home:away,rival=userIsHome?away:home;
      AuraArena.preMatch(controlled,rival,{career:true,label:fixture.label+" · "+fixture.phaseLabel,tactic:state.tactic,playerLock:state.playerCareer?.playerId,onFinish:result=>{
        if(state!==gameState||state.round!==round||state.season!==season||AuraContinental.next(state)?.id!==token){notify("La jornada ya cambió; este resultado no se volverá a registrar.");return;}
        const score=userIsHome?{home:result.home,away:result.away}:{home:result.away,away:result.home};
        AuraContinental.advance(score,{...result,userIsHome,played3D:true});
      }});
    }catch(error){notify(error.message);}
  }
  function controlsModal(){openModal("CÓMO JUGAR",'<div class="controls-explainer"><span class="eyebrow">TÚ LLEVAS EL BALÓN</span><h3>Del menú al césped.</h3><p>En <b>Partido rápido</b> eliges los equipos. En <b>Carrera</b>, pulsa <b>Jugar partido 3D</b> para disputar tu siguiente jornada.</p><div class="prematch-guide">'+[["WASD / Flechas","Mover al jugador"],["J","Mantener y soltar para disparar"],["K","Pasar hacia un compañero"],["L","Pase al espacio"],["Espacio","Intentar recuperar el balón"],["E","Cambiar al jugador más cercano"],["Shift","Sprint; consume energía"],["C","Cambiar entre tres cámaras"],["P / Esc","Pausar el partido"]].map(([k,v])=>'<span><kbd>'+k+'</kbd> '+v+'</span>').join("")+'</div><p>Atacas hacia la derecha en la primera parte y hacia la izquierda en la segunda. Tu jugador tiene un anillo verde. Los porteros y tus compañeros se mueven automáticamente.</p><p>Mando estándar: A/X pase, B/○ tiro, X/□ entrada, Y/△ al hueco, LB/L1 cambio, RB/R1 sprint. En pantalla táctil aparecen un joystick y botones.</p><p class="save-info">Fútbol arcade con fueras de juego y faltas. Elige el once y la formación antes de jugar. Durante la pausa puedes ajustar la táctica y hacer hasta cinco sustituciones.</p></div>');}
  function handleClick(button){
    const d=button.dataset;
    if(d.evoMode){return chooseMode(d.evoMode);}
    if(d.evoPin){
      if(!modeCards.some(row=>row[0]===d.evoPin))return true;
      pinnedMode=pinnedMode===d.evoPin?null:d.evoPin;
      try{
        localStorage.setItem("aura-pinned-mode-v1",pinnedMode||"");
      }catch{}
      render();return true;
    }
    if(d.draftPick!==undefined){const p=draft?.offers[Number(d.draftPick)];if(p&&draft.players.length<11){draft.players.push({...p});offerDraft();persistModes();render();}return true;}
    if(!d.evo)return false;
    if(d.evo==="mode-back"){modeOpen=false;render();window.scrollTo(0,0);return true;}
    if(d.evo==="mode-resume"&&recentMode)return chooseMode(recentMode);
    if(d.evo==="controls")controlsModal();
    if(d.evo==="skill-open"){
      chooseMode("quick");document.getElementById("skill-games")?.scrollIntoView({behavior:"smooth",block:"start"});return true;
    }
    if(d.evo==="skill-start"){
      if(!Object.hasOwn(AuraSkillGames.kinds,d.skillKind))return true;
      skillSession=AuraSkillGames.create(d.skillKind);skillAim="center";skillPower="medium";skillFeedback="";skillFocus=["skill-fire",""];
      persistSkill();render();document.getElementById("skill-games")?.scrollIntoView({block:"start"});return true;
    }
    if(d.evo==="skill-aim"&&AuraSkillGames.lanes.includes(d.skillAim)){
      skillAim=d.skillAim;skillFocus=["skill-aim",d.skillAim];render();return true;
    }
    if(d.evo==="skill-power"&&AuraSkillGames.powers.includes(d.skillPower)){
      skillPower=d.skillPower;skillFocus=["skill-power",d.skillPower];render();return true;
    }
    if(d.evo==="skill-reset"){skillSession=null;skillFeedback="";skillFocus=null;persistSkill();render();return true;}
    if(d.evo==="skill-fire"){
      if(!skillSession)return true;
      const result=AuraSkillGames.take(skillSession,skillAim,skillPower);
      if(!result)return true;
      skillFeedback="Intento "+skillSession.turn+": +"+result.points+" puntos."+
        (skillSession.kind==="keeping"?" El disparo fue hacia "+AuraSkillGames.names[result.target.lane]+".":"");
      if(result.finished){skillBest=AuraSkillGames.finish(skillBest,skillSession)||skillBest;skillFeedback+=" Medalla: "+result.medal+".";}
      skillFocus=[result.finished?"skill-reset":"skill-fire",""];
      persistSkill();render();return true;
    }
    if(d.evo==="quick-lineup"){
      const home=d.quickSide!=="away",club=getClub(home?quickHome:quickAway);
      const formation=home?quickHomeFormation:quickAwayFormation;
      try{
        const lineup=AuraArena.team(club,null,null,formation);
        const grl=Math.round(lineup.players.reduce((total,p)=>total+p.overall,0)/11);
        const field='<div class="quick-lineup-pitch" aria-label="Posiciones de los once titulares">'+
          lineup.players.map((p,i)=>'<span class="quick-lineup-player" style="left:'+lineup.slots[i][1]+
          '%;top:'+lineup.slots[i][2]+'%" title="'+text(p.name)+'">'+
          '<b>'+text(lineup.slots[i][0])+'</b><small>'+p.overall+'</small></span>').join('')+'</div>';
        const rows=lineup.players.map((p,i)=>'<tr><td>'+(i+1)+'</td><td>'+text(p.name)+
          '</td><td>'+text(lineup.slots[i][0])+'</td><td>'+p.overall+'</td></tr>').join('');
        openModal("ONCE TÁCTICO · "+club.name,'<section class="quick-lineup-modal"><span class="eyebrow">'+
          text(formation)+' · GRL '+grl+'</span>'+field+
          '<p>Este es el once que el juego usará con la formación elegida. Los futbolistas no se duplican.</p>'+
          '<div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>JUGADOR</th><th>POSICIÓN</th><th>GRL</th></tr></thead>'+
          '<tbody>'+rows+'</tbody></table></div></section>');
      }catch(err){notify("No se pudo preparar el once: "+err.message);}
      return true;
    }
    if(d.evo==="view-roster"){
      const club=clubs.find(c=>c.id===d.club);if(!club)return true;
      const players=typeof AuraRosterSync!=="undefined"?AuraRosterSync.rosterFor(club):starterRoster(club.id,71921,club.rating);
      const status=typeof AuraRosterSync!=="undefined"?AuraRosterSync.status(club):null;
      openModal("PLANTILLA · "+club.name,'<div class="club-roster-modal"><div class="club-roster-heading">'+badge(club,50)+'<div><span class="eyebrow">'+players.length+' FUTBOLISTAS</span><h3>'+text(club.name)+'</h3></div></div>'+(status?'<p class="save-info">'+text(status.note)+' · '+text(status.verifiedAt||status.snapshot)+' <a href="'+text(status.source)+'" target="_blank" rel="noopener noreferrer">Ver fuente</a>'+'</p>':'')+'<div class="table-wrap"><table class="table"><thead><tr><th>Jugador</th><th>POS</th><th>GRL</th></tr></thead><tbody>'+players.map(p=>'<tr><td><span class="face-name">'+AuraPortraits.html(p)+text(p.name)+'</span></td><td>'+text(p.pos)+'</td><td class="accent">'+p.overall+'</td></tr>').join("")+'</tbody></table></div></div>');
    }
    if(d.evo==="events-open"){
      chooseMode("ultimate");
      AuraUTUI.handleClick({dataset:{utTab:"events"}});
      return true;
    }
    if(d.evo==="magia-open"){
      chooseMode("ultimate");
      AuraUTUI.handleClick({dataset:{utTab:"magia"}});
      return true;
    }
    if(d.evo==="barcelona-open"){
      chooseMode("ultimate");
      AuraUTUI.handleClick({dataset:{utTab:"barcelona"}});
      return true;
    }
    if(d.evo==="muralla-open"){
      chooseMode("ultimate");
      AuraUTUI.handleClick({dataset:{utTab:"muralla"}});
      return true;
    }
    if(d.evo==="flashback-open"){
      chooseMode("ultimate");
      // Use the public click handler so Sigma and other UT overlays close correctly.
      if(AuraUTUI.getClub())AuraUTUI.handleClick({dataset:{utTab:"flashback"}});
      return true;
    }
    if(d.evo==="argentina-open"){
      mode="ultimate";modeOpen=true;recentMode="ultimate";lobby=true;
      try{localStorage.setItem("aura-recent-mode-v1","ultimate");}catch{}
      if(!AuraUTUI.openArgentinaEvent())render();
      return true;
    }
    if(d.evo==="hero-start"){
      if(!modeOpen){document.querySelector(".aura-mode-library")?.scrollIntoView({behavior:"smooth",block:"start"});return true;}
      if(mode==="draft"&&!draft){startDraft();render();}
      document.getElementById("mode-content")?.scrollIntoView({behavior:"smooth",block:"start"});
    }
    if(d.evo==="quick-swap"){
      if(quickRivalry?.status==="playing"){notify("Termina o cancela la rivalidad para cambiar equipos.");return true;}
      [quickHome,quickAway]=[quickAway,quickHome];persistQuickTeams();render();document.getElementById("quick-home")?.focus();
    }
    if(d.evo==="quick-rivalry-new"){
      try{quickRivalry=AuraRivalry.create(quickHome,quickAway,getClub(quickHome).rating,getClub(quickAway).rating);persistModes();render();}
      catch(error){notify(error.message);}
      return true;
    }
    if(d.evo==="quick-rivalry-reset"){quickRivalry=null;persistModes();render();return true;}
    if(d.evo==="quick-rivalry-play"){playRivalry();return true;}
    if(d.evo==="quick-rivalry-sim"||d.evo==="quick-rivalry-sim-all"){
      if(AuraArena.isRunning()){notify("Termina el partido activo antes de simular.");return true;}
      const results=AuraModeSimulation.simulateRivalry(quickRivalry,d.evo==="quick-rivalry-sim-all");
      if(results.length){persistModes();render();notify("Rivalidad: "+results.length+" partido(s) simulados.");}
      return true;
    }
    if(d.evo==="quick-penalty-new"){
      if(AuraArena.isRunning()){notify("Termina el partido activo antes de comenzar penaltis.");return true;}
      try{
        penaltyChallenge=AuraPenaltyChallenge.create(quickHome,quickAway,getClub(quickHome).rating,getClub(quickAway).rating);
        persistPenalty();render();
      }catch(error){notify(error.message);}
      return true;
    }
    if(d.evo==="quick-penalty-kick"){
      if(AuraArena.isRunning()||!penaltyChallenge)return true;
      const shot=AuraPenaltyChallenge.kick(penaltyChallenge,d.penaltyDir);
      if(shot){
        persistPenalty();
        if(penaltyChallenge.status==="finished"){
          try{if(typeof localStorage!=="undefined"){
            penaltyHistory=AuraPenaltyHistory.record(localStorage,penaltyChallenge).rows;
          }}catch{}
        }
        penaltyFocus=d.penaltyDir;
        render();if(penaltyChallenge.status==="finished")notify("¡Tanda de penaltis terminada!");
      }
      return true;
    }
    if(d.evo==="quick-start")try{if(quickHome===quickAway){notify("Elige dos clubes distintos para este partido.");return true;}AuraArena.preMatch(AuraArena.team(getClub(quickHome),null,null,quickHomeFormation),AuraArena.team(getClub(quickAway),null,null,quickAwayFormation),{});}catch(err){notify(err.message);}
    if(d.evo==="draft-new"){startDraft();render();}
    if(d.evo==="draft-reroll"){if(rerollDraft())render();else notify("No hay más cambios disponibles.");return true;}
    if(d.evo==="draft-retry"&&draft?.players.length===11){
      draft.tournament=AuraKnockout.createDraft(draft.players);persistModes();render();
    }
    if(d.evo==="draft-play"&&draft?.players.length===11)playDraftTournament();
    if(d.evo==="draft-sim"||d.evo==="draft-sim-all"){
      if(AuraArena.isRunning()){notify("Termina el partido activo antes de simular.");return true;}
      const results=AuraModeSimulation.simulateDraft(draft,id=>getClub(id).rating,d.evo==="draft-sim-all");
      if(results.length){persistModes();render();notify("Draft XI: "+results.length+" eliminatoria(s) simuladas.");}
      return true;
    }
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
    if(e.target.id==="quick-home"&&quickRivalry?.status!=="playing"){quickHome=e.target.value;persistQuickTeams();render();}
    if(e.target.id==="quick-away"&&quickRivalry?.status!=="playing"){quickAway=e.target.value;persistQuickTeams();render();}
    if(e.target.id==="quick-home-formation"&&availableQuickFormations().includes(e.target.value)){
      quickHomeFormation=e.target.value;persistQuickFormations();render();
    }
    if(e.target.id==="quick-away-formation"&&availableQuickFormations().includes(e.target.value)){
      quickAwayFormation=e.target.value;persistQuickFormations();render();
    }
    if(e.target.id==="evo-tactic"&&state){state.tactic=e.target.value;notify("Identidad de juego actualizada");}
  }
  return {welcome,dashboard,badge,handleClick,input,change,afterRender,stopPreview,playCareer,pool,setMode:name=>{
    if(name==="hub"){modeOpen=false;return;}
    if(modeCards.some(row=>row[0]===name)){mode=name;modeOpen=true;recentMode=name;}
  },getMode:()=>({mode:modeOpen?mode:"hub",recentMode,pinnedMode}),getRivalry:()=>quickRivalry};
})();
