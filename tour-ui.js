/* World Tour lobby, cup brackets, player career, awards and session-only UT. */
const AuraTourUI=(()=>{
  "use strict";
  const T=AuraTour,esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  let cupType="champions",cupTeam="",friendlyCups=[],ultimate=null,packNotice="",utToken=0;
  const audio=(()=>{
    let ctx=null,bus=null,timer=null,enabled=false,step=0,visibilityBound=false;
    const melody=[0,7,12,10,7,3,5,7,0,7,15,12,10,7,5,3,5,12,17,15,12,8,7,5,3,10,15,12,10,7,5,7];
    function note(freq,time,duration,level,type="sine"){
      const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.value=freq;gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(level,time+.012);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);osc.connect(gain);gain.connect(bus);osc.start(time);osc.stop(time+duration+.02);
    }
    function tick(){if(!ctx||ctx.state!=="running")return;const time=ctx.currentTime+.03,beat=60/112/2,bar=Math.floor(step/8)%4,root=[45,41,48,43][bar],hz=n=>440*2**((n-69)/12);
      if(step%2===0)note(hz(root-12),time,.22,.1,"triangle");
      if(step%4===0){note(130,time,.08,.14);note(65,time+.04,.16,.1);}
      if(step%4===2)note(1800,time,.04,.012,"triangle");note(6500,time,.022,.006,"square");
      note(hz(57+melody[step%32]),time,beat*.8,.032,"triangle");if(step%8===0)for(const n of [0,3,7])note(hz(root+n+12),time,beat*6,.018,"sine");step++;
    }
    function suspend(){clearInterval(timer);timer=null;if(ctx?.state==="running")ctx.suspend().catch(()=>{});}
    function resume(){if(!enabled||typeof document==="undefined"||document.hidden||AuraArena.isRunning()||AuraStreet.isRunning())return;ctx?.resume().then(()=>{if(!enabled)return;clearInterval(timer);tick();timer=setInterval(tick,60/112/2*1000);}).catch(()=>{});}
    function toggle(){
      if(!enabled){try{const Context=window.AudioContext||window.webkitAudioContext;if(!Context)throw Error("Este navegador no admite audio.");if(!ctx){ctx=new Context();bus=ctx.createGain();bus.gain.value=.35;bus.connect(ctx.destination);}enabled=true;if(!visibilityBound){document.addEventListener("visibilitychange",()=>document.hidden?suspend():resume());visibilityBound=true;}resume();}catch(e){notify(e.message);return;}}
      else {enabled=false;suspend();}afterRender();
    }
    return {toggle,suspend,resume,isEnabled:()=>enabled};
  })();
  function face(p,large=false){
    const n=T.hash(p.id||p.name),skin=["#e0ae86","#ba825e","#82573d","#f0c7a5"][n%4],hair=["#231c1a","#593628","#b58b4c"][n%3],colors=typeof AuraGraphics!=="undefined"?AuraGraphics.kit({id:p.club||p.name}):["#435c85"];
    const photo=/^https:\/\/cdn\.sofifa\.net\/players\/\d+\/\d+\/26_120\.png$/.test(p.photo||"")?'<img src="'+p.photo+'" alt="" loading="lazy" onerror="this.hidden=true">':'';
    return '<span class="tour-face '+(large?'large':'')+'" title="'+(photo?'Retrato disponible con conexión; avatar de respaldo':'Avatar ilustrado de AURA')+'"><svg viewBox="0 0 100 110" role="img" aria-label="Avatar ilustrado"><path fill="'+colors[0]+'" d="M3 110V92Q5 75 38 73H62Q95 75 97 92V110"/><path fill="'+skin+'" d="M41 64H59V81Q50 89 41 81Z"/><ellipse fill="'+skin+'" cx="50" cy="43" rx="24" ry="31"/><path fill="'+hair+'" d="M25 43V27Q27 5 50 7Q79 7 76 40L66 23Q51 32 32 24L29 44Z"/><path stroke="#302729" stroke-width="2" d="M35 43H42M58 43H65M44 61Q50 64 57 61"/><path stroke="#9b694f" fill="none" d="M50 44L47 53H53"/></svg>'+photo+'</span>';
  }
  function cards(players,extra=""){
    return '<div class="tour-player-cards">'+players.map(p=>'<article class="tour-player-card"><span class="eyebrow">'+esc(p.pos)+' · '+(p.rating?p.rating.toFixed(1)+' NOTA':p.overall+' GRL')+'</span>'+face(p)+'<h3>'+esc(p.name)+'</h3><p>'+esc(clubs.find(c=>c.id===p.club)?.name||p.sourceClub||p.nationality||"AURA")+'</p>'+(p.goals!==undefined?'<b>'+p.goals+' goles</b>':'')+(p.duplicate?'<small>Repetido · +200 monedas</small>':'')+extra+'</article>').join("")+'</div>';
  }
  const headline=(tag,title,body)=>'<div class="tour-heading"><span class="eyebrow">'+tag+'</span><h2>'+title+'</h2><p>'+body+'</p></div>';
  function proPicker(picker){
    const ps=(state?clubPlayers(state.club):AuraRosterSync.rosterFor(getClub(selected))).filter(p=>p.pos!=="POR");
    const options='<section class="tour-pro-setup">'+headline('CARRERA DE JUGADOR','TU NOMBRE. TU CAMINO.','Controla a un solo futbolista en el campo. Suma partidos, goles y experiencia durante la temporada.')+'<div class="tour-form"><label>Futbolista<select id="tour-pro-player"><option value="new">Crear mi jugador · 68 GRL</option>'+ps.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+' · '+p.pos+' · '+p.overall+'</option>').join("")+'</select></label><label>Nombre de tu jugador<input id="tour-pro-name" maxlength="32" value="Emilio" autocomplete="off"></label><label>Posición del jugador creado<select id="tour-pro-pos">'+["DC","EI","ED","MCO","MC","MCD","DFC","LI","LD"].map(p=>'<option>'+p+'</option>').join("")+'</select></label></div></section>';
    return options+picker.replace('data-action="start"','data-tour="start-pro"').replace('Iniciar nueva carrera','Iniciar carrera de jugador');
  }
  function regionOf(club){
    if(/Ecuador|Brasil|Argentina|Colombia|Uruguay|Chile|Perú|CONMEBOL|LPF/i.test(club.city||""))return "south";
    const def=Competitions.definitions.find(d=>d.id!=="exhibition"&&d.clubIds.includes(club.id));
    return /Argentina|CONMEBOL|LPF/i.test((def?.country||"")+" "+(def?.name||""))?"south":/España|Inglaterra|Alemania|Italia|Francia|Portugal|Países Bajos|Belgium|Scotland|Turkey|Austria|Switzerland/i.test((def?.country||"")+" "+(club.city||""))?"europe":"other";
  }
  const nationList=[
    ["Argentina","Argentina","south"],["Brazil","Brasil","south"],["Ecuador","Ecuador","south"],["Uruguay","Uruguay","south"],["Colombia","Colombia","south"],["Chile","Chile","south"],["Peru","Perú","south"],["Paraguay","Paraguay","south"],["Venezuela","Venezuela","south"],["Bolivia","Bolivia","south"],
    ["United States","Estados Unidos","north"],["Mexico","México","north"],["Canada","Canadá","north"],["Costa Rica","Costa Rica","north"],["Panama","Panamá","north"],["Jamaica","Jamaica","north"],
    ["Spain","España","europe"],["France","Francia","europe"],["England","Inglaterra","europe"],["Germany","Alemania","europe"],["Portugal","Portugal","europe"],["Italy","Italia","europe"],["Netherlands","Países Bajos","europe"],["Belgium","Bélgica","europe"],["Croatia","Croacia","europe"],["Denmark","Dinamarca","europe"],["Switzerland","Suiza","europe"],["Sweden","Suecia","europe"],["Norway","Noruega","europe"],["Poland","Polonia","europe"],["Scotland","Escocia","europe"],["Turkey","Turquía","europe"],
    ["Japan","Japón","asia"],["Korea Republic","Corea del Sur","asia"],["Morocco","Marruecos","africa"],["Senegal","Senegal","africa"]
  ];
  let nationalCache=null,nationalSignature="";
  function nations(){
    const signature=World.getStats().players;if(nationalCache&&nationalSignature===signature)return nationalCache;nationalSignature=signature;
    const pool=AuraRosterSync.pool().filter(p=>p.nationality&&World.getClub(p.catalogClub)?.gender!=="women");
    nationalCache=nationList.map(([source,name,region])=>{
      const id="nation:"+norm(source).replace(/\s/g,"-"),known=pool.filter(p=>norm(p.nationality)===norm(source)).sort((a,b)=>b.overall-a.overall).slice(0,23),fills=genPlayers(id,T.hash(id),72,23).map((p,i)=>({...p,name:"Seleccionado AURA "+(i+1),real:false,academy:true}));
      const roster=known.concat(fills.filter(p=>!known.some(q=>q.id===p.id))).slice(0,23);if(!roster.some(p=>p.pos==="POR"))roster[22]=fills.find(p=>p.pos==="POR");
      const rating=Math.round(roster.slice(0,11).reduce((s,p)=>s+p.overall,0)/11);return {id,name,region,rating,roster,national:true};
    });return nationalCache;
  }
  function cupCandidates(){
    const def=T.cupTypes.find(d=>d.id===cupType);
    if(def.national)return nations().filter(n=>def.region==="world"||def.region==="americas"?["world"].includes(def.region)||["south","north"].includes(n.region):n.region===def.region).sort((a,b)=>b.rating-a.rating);
    const seen=new Set();return clubs.filter(c=>c.gender!=="women"&&(def.youth||regionOf(c)===def.region)).filter(c=>{const k=World.matchingClub(c)?.id||norm(c.name);if(seen.has(k))return false;seen.add(k);return true;}).sort((a,b)=>b.rating-a.rating);
  }
  function storage(){return state?T.initialize(state).cups:friendlyCups;}
  function currentCup(){return storage().find(c=>c.id===cupType);}
  function cupView(){
    const def=T.cupTypes.find(d=>d.id===cupType),candidates=cupCandidates(),cup=currentCup();
    if(!candidates.some(c=>c.id===cupTeam))cupTeam=candidates.some(c=>c.id===state?.club)?state.club:candidates[0]?.id||"";
    const controls='<div class="tour-form"><label>Competición<select id="tour-cup-type">'+T.cupTypes.map(c=>'<option value="'+c.id+'" '+(c.id===cupType?'selected':'')+'>'+c.name+'</option>').join("")+'</select></label><label>Tu equipo<select id="tour-cup-team">'+candidates.map(c=>'<option value="'+esc(c.id)+'" '+(c.id===cupTeam?'selected':'')+'>'+esc(c.name)+'</option>').join("")+'</select></label><button class="btn primary" data-tour="cup-create" '+(candidates.length<def.size?'disabled':'')+'>'+(cup?'Nueva edición':'Crear torneo')+' →</button></div>';
    const note='<p class="save-info">Formato AURA: '+def.size+' equipos, eliminación directa a un partido y penaltis automáticos si hay empate. Participantes elegidos del catálogo; '+(def.id==="america"?'10 selecciones sudamericanas y 6 invitadas. ':def.youth?'Plantillas Sub-21, completadas con canteranos identificados. ':'')+'No reproduce clasificación, grupos ni calendarios oficiales. Las copas avanzan desde este panel.</p>';
    if(!cup)return headline('CLUBES Y SELECCIONES','EL MUNDO TE ESPERA.','Juega o simula cada ronda; todos los cruces quedan registrados en el cuadro.')+controls+note+'<div class="tour-empty">Elige un torneo y un equipo para empezar.</div>';
    const team=id=>cup.entrants.find(t=>t.id===id),f=T.cupFixture(cup),champ=team(cup.champion);
    return headline('CAMINO A LA COPA',esc(cup.name),cup.champion?'Campeón: '+esc(champ.name):'Tu equipo: '+esc(team(cup.user).name)+' · '+cup.current.length+' equipos siguen en carrera.')+controls+note+
      '<section class="tour-cup-live">'+(cup.champion?'<div class="tour-trophy" aria-hidden="true">♜</div><h3>¡'+esc(champ.name)+' LEVANTA LA COPA!</h3>':f?'<span class="eyebrow">TU PRÓXIMO CRUCE</span><h3>'+esc(team(f.home).name)+' <em>vs</em> '+esc(team(f.away).name)+'</h3><button class="btn primary" data-tour="cup-play">Jugar eliminatoria →</button><button class="btn" data-tour="cup-sim">Simular ronda →</button>':'<h3>Tu equipo fue eliminado.</h3><button class="btn" data-tour="cup-sim">Avanzar los demás cruces →</button>')+'</section>'+
      '<div class="tour-bracket">'+cup.rounds.map((round,i)=>'<section><h3>'+({16:'OCTAVOS',8:'CUARTOS',4:'SEMIFINALES',2:'FINAL'}[round.length*2]||'RONDA '+(i+1))+'</h3>'+round.map(m=>'<article><div class="'+(m.winner===m.home?'winner':'')+'"><span>'+esc(team(m.home).name)+'</span><b>'+m.score.home+'</b></div><div class="'+(m.winner===m.away?'winner':'')+'"><span>'+esc(team(m.away).name)+'</span><b>'+m.score.away+'</b></div>'+(m.penalties?'<small>Penaltis '+m.penalties.home+' — '+m.penalties.away+'</small>':'')+'</article>').join("")+'</section>').join("")+'</div>';
  }
  function createCup(){
    const def=T.cupTypes.find(c=>c.id===cupType),candidates=cupCandidates(),chosen=candidates.find(c=>c.id===cupTeam);if(!chosen)throw Error("Elige un equipo.");
    let options=candidates.filter(c=>c.id!==chosen.id);
    if(def.id==="europa")options=options.slice(8);if(def.id==="conference")options=options.slice(20);
    const entrants=[chosen,...options.slice(0,def.size-1)].map(c=>({id:c.id,name:c.name,rating:c.rating,region:c.region,national:c.national}));
    const cup=T.createCup(cupType,entrants,chosen.id),list=storage(),old=list.findIndex(c=>c.id===cupType);if(old>=0)list.splice(old,1,cup);else list.push(cup);return cup;
  }
  function cupArenaTeam(cup,id){
    const def=T.cupTypes.find(c=>c.id===cup.id),entry=cup.entrants.find(c=>c.id===id),c=entry.national?nations().find(c=>c.id===id):getClub(id);
    const roster=entry.national?c.roster:state?.rosters[id]||starterRoster(id,T.hash(id),c.rating);
    const players=def.youth?T.youthRoster(c,roster,state?.season||2026):roster;
    return AuraArena.team(c,null,players);
  }
  function playCup(){
    const cup=currentCup(),f=cup&&T.cupFixture(cup);if(!f)return;
    const homeFirst=f.home===cup.user,round=cup.rounds.length;
    AuraArena.preMatch(cupArenaTeam(cup,cup.user),cupArenaTeam(cup,homeFirst?f.away:f.home),{label:cup.name+' · ELIMINATORIA',onFinish:result=>{
      if(currentCup()!==cup||cup.rounds.length!==round||cup.champion)return;
      T.advanceCup(cup,homeFirst?{home:result.home,away:result.away}:{home:result.away,away:result.home});render();
    }});
  }
  function awardsView(){
    const t=T.initialize(state),weekly=t.weekly[0],monthly=t.monthly[0],annual=t.annual[0];
    return headline('EL RENDIMIENTO TIENE PREMIO','LOS NOMBRES DE LA TEMPORADA.','Premios de tu liga calculados con los partidos de esta carrera. El mes AURA equivale a cuatro jornadas.')+
      '<section class="tour-award"><div class="panel-title"><h3>GALA DEL BALÓN DE ORO AURA</h3><button class="btn" data-tour="gala" '+(!annual?'disabled':'')+'>Entrar en la gala →</button></div>'+(annual?'<p>'+annual.season+' · '+esc(annual.winner.name)+' encabeza la clasificación anual.</p>':'<p>La gala se celebra al terminar la temporada. Juega o simula las jornadas para construir el ranking.</p>')+'</section>'+
      '<section class="tour-award"><h3>JUGADOR DEL MES</h3>'+(monthly?'<p>Mes '+monthly.period+' · '+monthly.season+' · Nota media '+monthly.rating+'</p>'+cards([monthly]):'<p>Se entrega cada cuatro jornadas; se necesitan al menos dos apariciones.</p>')+'</section>'+
      '<section class="tour-award"><h3>EQUIPO DE LA SEMANA</h3>'+(weekly?'<p>Jornada '+weekly.round+' · 4-3-3 por rendimiento y posición</p>'+cards(weekly.players):'<p>El primer once se anuncia después de la primera jornada.</p>')+'</section>'+
      '<section class="tour-award"><h3>EVENTOS INESPERADOS</h3>'+(t.events.length?t.events.map(e=>'<p><b>J'+e.round+'</b> · '+esc(e.text)+'</p>').join(""):'<p>Molestias, apoyo de la afición, patrocinadores y sesiones sorpresa pueden cambiar la temporada.</p>')+'</section>'+
      '<section class="tour-award"><h3>NUEVA GENERACIÓN / REENCARNACIONES</h3>'+(t.regens.length?t.regens.slice(-8).map(r=>'<p>'+esc(r.retired)+' se retira → '+esc(r.player.name)+' · '+r.player.pos+' · POT '+r.player.potential+'</p>').join(""):'<p>Al cambiar de temporada, algunos veteranos se retiran. Un juvenil ficticio hereda su posición, nacionalidad y potencial aproximado.</p>')+'</section>';
  }
  function careerHub(){return cupView()+awardsView();}
  function ensurePro(){
    if(!state?.playerCareer)return;const sheet=AuraSquad.ensure(state),p=clubPlayers(state.club).find(p=>p.id===state.playerCareer.playerId);if(!p)throw Error("Tu jugador ya no está en este club.");
    if(!sheet.xi.includes(p.id)){const slots=AuraSquad.formations[sheet.formation],index=slots.map(([slot],i)=>({i,penalty:AuraSquad.positionPenalty(p,slot)})).filter(x=>x.i>0).sort((a,b)=>a.penalty-b.penalty)[0].i;sheet.xi[index]=p.id;}
  }
  function enablePro(){
    const id=document.getElementById("tour-pro-player")?.value||"new",name=document.getElementById("tour-pro-name")?.value||"Mi jugador",pos=document.getElementById("tour-pro-pos")?.value||"DC";
    const player=T.startPlayer(state,id,name,pos);AuraSquad.ensure(state);ensurePro();screen="pro";render();notify("Tu carrera empieza con "+player.name+".");
  }
  function playerHub(){
    if(!state.playerCareer)return proPicker('<button class="btn primary" data-tour="enable-pro">Comenzar con este club →</button>');
    const pc=state.playerCareer,p=clubPlayers(state.club).find(p=>p.id===pc.playerId);if(!p)return '<p>No se encontró a tu jugador.</p>';
    return headline('CARRERA DE JUGADOR / '+esc(myClub().name),'EL PARTIDO EMPIEZA CONTIGO.','WASD o flechas para moverte; K para pasar y J para tirar. Mantienes el control de tu futbolista cuando un compañero recibe el balón.')+
      '<section class="tour-pro-hub">'+face(p,true)+'<div><span class="eyebrow">'+p.pos+' · '+p.age+' AÑOS</span><h2>'+esc(p.name)+'</h2><p>'+p.overall+' GRL · '+p.potential+' POT · '+money(p.value)+' valor estimado</p><div class="tour-metrics"><span><b>'+pc.appearances+'</b> PARTIDOS</span><span><b>'+pc.goals+'</b> GOLES</span><span><b>'+(pc.lastRating||'—')+'</b> ÚLTIMA NOTA</span></div><label>Desarrollo · '+pc.xp+' / 100 EXP<progress max="100" value="'+pc.xp+'"></progress></label><p>100 EXP = +1 GRL hasta el potencial. La nota depende de goles, resultado y rendimiento de la jornada; al simular es una estimación.</p><button class="btn primary" data-evo="career-play">Jugar mi siguiente partido →</button><button class="btn" data-action="play">Simular jornada</button><button class="btn" data-nav="academy">Entrenar →</button></div></section>';
  }
  function ultimateView(){
    if(!ultimate)return headline('ULTIMATE TEAM LOCAL / AURA UT','TU CLUB. TUS CARTAS.','Una colección por sesión con monedas ganadas jugando. Sobres de tres jugadores, once editable y partidos contra la IA.')+'<button class="btn primary" data-tour="ut-create">Crear mi club · 10.000 monedas →</button><p class="save-info">Sin dinero real. Colección por sesión; se reinicia al recargar, igual que las carreras.</p>';
    const u=ultimate;
    return headline('AURA UT / '+u.coins.toLocaleString('es-ES')+' MONEDAS','CONSTRUYE TU EQUIPO.','Balance: '+u.wins+' victorias · '+u.draws+' empates · '+u.losses+' derrotas.')+
      '<div class="tour-ut-actions"><button class="btn primary" data-tour="ut-play">Jugar contra la IA →</button><button class="btn" data-tour="ut-pack" '+(u.coins<2500?'disabled':'')+'>Abrir sobre · 2.500 monedas</button><button class="btn" data-tour="ut-auto">Elegir mejor once</button></div><p class="save-info">Victoria: 1.200 · Empate: 600 · Derrota: 350 monedas. Cada sobre: 3 cartas de 72–92 GRL; 12% de selección del grupo 84+ por carta. Repetidos: +200 monedas.</p>'+(packNotice?'<p role="status">'+esc(packNotice)+'</p>':'')+(u.lastPack.length?cards(u.lastPack):'')+
      '<div class="tour-ut-lineup">'+AuraSquad.formations['4-3-3'].map(([slot],i)=>{const p=u.owned.find(p=>p.id===u.xi[i]);return '<label>'+slot+' · '+p.overall+' GRL<select data-ut-slot="'+i+'">'+u.owned.map(card=>'<option value="'+esc(card.id)+'" '+(card.id===p.id?'selected':'')+'>'+esc(card.name)+' · '+card.pos+' · '+card.overall+'</option>').join('')+'</select></label>';}).join('')+'</div><p class="save-info">'+u.owned.length+' cartas en tu colección. Cambiar una carta ya titular intercambia ambas posiciones.</p>';
  }
  function playUltimate(){
    if(!ultimate)return;const u=ultimate,token=++utToken,players=u.xi.map(id=>u.owned.find(p=>p.id===id)),home={id:'aura-ut',name:'Mi AURA UT',rating:Math.round(players.reduce((n,p)=>n+p.overall,0)/11)};
    const controlled=AuraArena.team(home,null,players);controlled.players=players.map((p,i)=>({...p,overall:Math.round(AuraSquad.effective(p,controlled.slots[i][0]))}));
    AuraArena.preMatch(controlled,AuraArena.team(getClub(['madrid','liverpool','city','barcelona'][u.played%4])),{label:'AURA UT · PARTIDO POR MONEDAS',onFinish:r=>{if(ultimate!==u)return;const reward=T.rewardUltimate(u,token,r);if(reward){packNotice='Partido completado: +'+reward+' monedas.';render();}}});
  }
  function streetView(){
    return headline('AURA CALLE / INSPIRADO EN EL FÚTBOL VOLTA','LA CALLE TIENE SUS REGLAS.','3 contra 3 en una cancha urbana de Guayaquil. Paredes con rebote, sin porteros, primero a cinco goles o dos minutos.')+
      '<section class="tour-street-card"><span>GYE / 01</span><h2>JUEGA.<br>COMBINA.<br><em>ATRÉVETE.</em></h2><button class="btn primary" data-tour="street-play">Entrar a la cancha →</button><p>WASD / flechas · J tiro · K pase · E cambio · Espacio entrada · Shift sprint. Botones táctiles en pantalla.</p></section>';
  }
  function welcome(mode,picker){return mode==='pro'?proPicker(picker):mode==='cup'?cupView():mode==='ultimate'?ultimateView():streetView();}
  function afterRender(){
    if(typeof document==='undefined')return;const button=document.querySelector?.('[data-tour="music"]');if(button){button.textContent=audio.isEnabled()?'♫ Música ON':'♫ Música';button.setAttribute('aria-pressed',String(audio.isEnabled()));button.title='Música electrónica original de AURA · 112 BPM';}
  }
  function handleClick(button){
    const action=button.dataset.tour;if(!action)return false;
    try {
      if(action==='music')audio.toggle();
      if(action==='start-pro'){const previous=state;state=createGame(selected);try{enablePro();AuraProgression.initialize(state);}catch(error){state=previous;throw error;}}
      if(action==='enable-pro')enablePro();
      if(action==='cup-create'){createCup();render();}
      if(action==='cup-sim'){const cup=currentCup();if(cup){T.advanceCup(cup);render();}}
      if(action==='cup-play')playCup();
      if(action==='ut-create'){ultimate=T.ultimate(AuraEvolution.pool(),AuraSquad.choose);packNotice='';render();}
      if(action==='ut-pack'&&ultimate){const result=T.openPack(ultimate,AuraEvolution.pool());packNotice=result.error||'Sobre abierto: '+result.cards.map(p=>p.name+' ('+p.overall+')').join(', ');render();}
      if(action==='ut-auto'&&ultimate){ultimate.xi=AuraSquad.choose(ultimate.owned,'4-3-3');render();}
      if(action==='ut-play')playUltimate();
      if(action==='street-play'){const ps=AuraEvolution.pool().filter(p=>p.pos!=='POR'&&World.getClub(p.catalogClub)?.gender!=='women').sort((a,b)=>b.overall-a.overall);AuraStreet.open(ps.slice(0,3),ps.slice(3,6));}
      if(action==='gala'&&state){const annual=T.initialize(state).annual[0];if(annual)openModal('GALA DEL BALÓN DE ORO AURA','<div class="tour-gala"><span class="eyebrow">TEMPORADA '+annual.season+' · PREMIOS DE TU LIGA</span><div class="tour-trophy" aria-hidden="true">★</div><h2>'+esc(annual.winner.name)+'</h2><p>GANADOR DEL BALÓN DE ORO AURA</p><p>'+annual.winner.goals+' goles · '+annual.winner.appearances+' partidos · '+annual.winner.points.toFixed(1)+' puntos de rendimiento</p></div><ol class="tour-shortlist">'+annual.shortlist.map(p=>'<li><b>'+esc(p.name)+'</b><span>'+p.points.toFixed(1)+' puntos · '+p.goals+' goles</span></li>').join('')+'</ol>');}
    }catch(error){notify(error.message);}return true;
  }
  function change(e){
    if(e.target.id==='tour-cup-type'){cupType=e.target.value;cupTeam='';render();}
    if(e.target.id==='tour-cup-team')cupTeam=e.target.value;
    if(e.target.dataset?.utSlot!==undefined&&ultimate){const i=Number(e.target.dataset.utSlot),id=e.target.value;if(!Number.isInteger(i)||i<0||i>10||!ultimate.owned.some(p=>p.id===id))return;const j=ultimate.xi.indexOf(id),old=ultimate.xi[i];ultimate.xi[i]=id;if(j>=0)ultimate.xi[j]=old;render();}
  }
  function reset(){cupTeam='';}
  return {welcome,careerHub,playerHub,ensurePro,handleClick,change,afterRender,face,audio,reset,getUltimate:()=>ultimate,getCup:currentCup};
})();
