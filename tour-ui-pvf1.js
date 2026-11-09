/* World Tour lobby, cup brackets, player career, awards and session-only UT. */
const AuraTourUI=(()=>{
  "use strict";
  const T=AuraTour,esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  let streetHome="barcelona",streetAway="madrid",streetDifficulty=1,streetGoalLimit=5,streetSeconds=120,streetCircuit=null,streetMode="friendly";
  let cupType="champions",cupTeam="",friendlyCups=[];
  try{if(typeof AuraStreetSave!=="undefined"&&typeof localStorage!=="undefined")
    streetCircuit=AuraStreetSave.load(localStorage);}catch{}
  if(streetCircuit)streetMode="circuit";
  function saveStreetCircuit(){
    try{if(typeof AuraStreetSave!=="undefined"&&typeof localStorage!=="undefined")
      AuraStreetSave.save(localStorage,streetCircuit);}catch{}
  }
  try{if(typeof AuraCupSave!=="undefined"&&typeof localStorage!=="undefined")
    friendlyCups=AuraCupSave.load(localStorage,T.cupTypes);}catch{}
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
  function face(p,large=false){return AuraPortraits.html(p,large);}
  function cards(players,extra=""){
    return '<div class="tour-player-cards">'+players.map(p=>'<article class="tour-player-card"><span class="eyebrow">'+esc(p.pos)+' · '+(p.rating?p.rating.toFixed(1)+' NOTA':p.overall+' GRL')+'</span>'+face(p)+'<h3>'+esc(p.name)+'</h3><p>'+esc(clubs.find(c=>c.id===p.club)?.name||p.sourceClub||p.nationality||"AURA")+'</p>'+(p.goals!==undefined?'<b>'+p.goals+' goles</b>':'')+(p.duplicate?'<small>Repetido · +200 monedas</small>':'')+extra+'</article>').join("")+'</div>';
  }
  const headline=(tag,title,body)=>'<div class="tour-heading"><span class="eyebrow">'+tag+'</span><h2>'+title+'</h2><p>'+body+'</p></div>';
  function proPicker(picker,existing=false){
    const ps=(existing&&state?clubPlayers(state.club):AuraRosterSync.rosterFor(getClub(selected))).filter(p=>p.pos!=="POR");
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
      const keeper=pool.filter(p=>norm(p.nationality)===norm(source)&&p.pos==='POR').sort((a,b)=>b.overall-a.overall)[0];if(keeper&&!known.some(p=>p.pos==='POR')){if(known.length>=23)known.pop();known.push(keeper);}
      const roster=known.concat(fills.filter(p=>!known.some(q=>q.id===p.id))).slice(0,23);if(!roster.some(p=>p.pos==="POR"))roster[22]=fills.find(p=>p.pos==="POR");
      const rating=Math.round(roster.slice(0,11).reduce((s,p)=>s+p.overall,0)/11);return {id,name,region,rating,roster,national:true};
    });return nationalCache;
  }
  function cupCandidates(){
    const def=T.cupTypes.find(d=>d.id===cupType);
    if(def.national)return nations().filter(n=>def.region==="world"||def.region==="americas"?["world"].includes(def.region)||["south","north"].includes(n.region):n.region===def.region).sort((a,b)=>b.rating-a.rating);
    if(def.region==="europe")return AuraChampions.candidates(clubs,Competitions.definitions,c=>World.matchingClub(c));
    const seen=new Set();return clubs.filter(c=>T.eligibleForCup(def,c,regionOf)).filter(c=>{const k=World.matchingClub(c)?.id||norm(c.name);if(seen.has(k))return false;seen.add(k);return true;}).sort((a,b)=>b.rating-a.rating);
  }
  function storage(){return state?T.initialize(state).cups:friendlyCups;}
  function saveFriendlyCups(){
    if(state)return;
    try{if(typeof AuraCupSave!=="undefined"&&typeof localStorage!=="undefined")
      AuraCupSave.save(localStorage,friendlyCups,T.cupTypes);}catch{}
  }
  function currentCup(){return storage().find(c=>c.id===cupType);}
  function cupPreview(cup){
    if(!cup||cup.champion)return '';
    const pairings=[];
    for(let i=0;i<cup.current.length;i+=2){
      const home=cup.entrants.find(t=>t.id===cup.current[i]),away=cup.entrants.find(t=>t.id===cup.current[i+1]);
      if(!home||!away)continue;
      const selected=cup.user===home.id||cup.user===away.id;
      pairings.push('<article class="'+(selected?'yours':'')+'"><span>CRUCE '+(pairings.length+1)+'</span>'+
        '<strong>'+esc(home.name)+' <em>VS</em> '+esc(away.name)+'</strong>'+
        (selected?'<small>★ TU ELIMINATORIA</small>':'')+'</article>');
    }
    const phase=({16:'OCTAVOS',8:'CUARTOS',4:'SEMIFINALES',2:'FINAL'})[cup.current.length]||'SIGUIENTE RONDA';
    return '<section class="tour-upcoming-fixtures"><div><span class="eyebrow">CUADRO DE PRÓXIMOS PARTIDOS</span>'+
      '<h3>'+phase+' · '+pairings.length+' CRUCES</h3><p>Los rivales de la ronda actual ya están sorteados.</p></div>'+
      '<div class="tour-upcoming-grid">'+pairings.join('')+'</div></section>';
  }
  function cupRecord(cup){
    const games=cup.rounds.flat(),goals=games.reduce((n,m)=>n+m.score.home+m.score.away,0);
    const penalties=games.filter(m=>m.penalties).length;
    return '<div class="tour-cup-counters" aria-label="Estadísticas de esta copa">'+
      '<span><strong>'+cup.rounds.length+'</strong> RONDAS</span>'+
      '<span><strong>'+games.length+'</strong> PARTIDOS</span>'+
      '<span><strong>'+goals+'</strong> GOLES</span>'+
      '<span><strong>'+penalties+'</strong> TANDAS DE PENALES</span></div>';
  }
  function cupView(){
    const def=T.cupTypes.find(d=>d.id===cupType),candidates=cupCandidates(),cup=currentCup();
    if(!candidates.some(c=>c.id===cupTeam))cupTeam=candidates.some(c=>c.id===state?.club)?state.club:candidates[0]?.id||"";
    const controls='<div class="tour-form"><label>Competición<select id="tour-cup-type">'+T.cupTypes.map(c=>'<option value="'+c.id+'" '+(c.id===cupType?'selected':'')+'>'+c.name+'</option>').join("")+'</select></label><label>Tu equipo<select id="tour-cup-team">'+candidates.map(c=>'<option value="'+esc(c.id)+'" '+(c.id===cupTeam?'selected':'')+'>'+esc(c.name)+'</option>').join("")+'</select></label><button class="btn primary" data-tour="cup-create" '+(candidates.length<def.size?'disabled':'')+'>'+(cup?'Nueva edición':'Crear torneo')+' →</button></div>';
    const note='<p class="save-info">Formato AURA: '+def.size+' equipos, eliminación directa a un partido y penaltis automáticos si hay empate. Participantes elegidos del catálogo; '+(def.id==="clubworld"?'8 clubes de Sudamérica y 8 de Europa, incluido el tuyo. Competición ficticia, no oficial. ':["copadelrey","facup","copaecuador"].includes(def.id)?'Copa nacional en formato reducido adaptado a la selección de clubes AURA, no refleja el cuadro oficial. ':def.id==="america"?'10 selecciones sudamericanas y 6 invitadas. ':def.youth?'Plantillas Sub-21, completadas con canteranos identificados. ':'')+'No reproduce clasificación, grupos ni calendarios oficiales. Las copas avanzan desde este panel. Las copas independientes se guardan en este navegador; Carrera Mánager sigue sin autoguardado.</p>';
    if(!cup)return headline('CLUBES Y SELECCIONES','EL MUNDO TE ESPERA.','Juega o simula cada ronda; todos los cruces quedan registrados en el cuadro.')+controls+note+'<div class="tour-empty">Elige un torneo y un equipo para empezar.</div>';
    const team=id=>cup.entrants.find(t=>t.id===id),f=T.cupFixture(cup),champ=team(cup.champion);
    return headline('CAMINO A LA COPA',esc(cup.name),cup.champion?'Campeón: '+esc(champ.name):'Tu equipo: '+esc(team(cup.user).name)+' · '+cup.current.length+' equipos siguen en carrera.')+controls+note+
      '<section class="tour-cup-live">'+(cup.champion?'<div class="tour-trophy" aria-hidden="true">♜</div><h3>¡'+esc(champ.name)+' LEVANTA LA COPA!</h3>':f?'<span class="eyebrow">TU PRÓXIMO CRUCE</span><h3>'+esc(team(f.home).name)+' <em>vs</em> '+esc(team(f.away).name)+'</h3><button class="btn primary" data-tour="cup-play">Jugar eliminatoria →</button><button class="btn" data-tour="cup-sim">Simular ronda →</button>':'<h3>Tu equipo fue eliminado.</h3><button class="btn" data-tour="cup-sim">Avanzar los demás cruces →</button>')+
        (cup.champion?'':'<div class="tour-cup-actions"><button class="btn" data-tour="cup-finish">Simular hasta la final →</button>'+
          (!cup.rounds.length?'<button class="btn" data-tour="cup-reroll">Volver a sortear cruces ↻</button>':'')+'</div>')+'</section>'+
      cupPreview(cup)+cupRecord(cup)+
      '<div class="tour-bracket">'+cup.rounds.map((round,i)=>'<section><h3>'+({16:'OCTAVOS',8:'CUARTOS',4:'SEMIFINALES',2:'FINAL'}[round.length*2]||'RONDA '+(i+1))+'</h3>'+round.map(m=>'<article><div class="'+(m.winner===m.home?'winner':'')+'"><span>'+esc(team(m.home).name)+'</span><b>'+m.score.home+'</b></div><div class="'+(m.winner===m.away?'winner':'')+'"><span>'+esc(team(m.away).name)+'</span><b>'+m.score.away+'</b></div>'+(m.penalties?'<small>Penaltis '+m.penalties.home+' — '+m.penalties.away+'</small>':'')+'</article>').join("")+'</section>').join("")+'</div>';
  }
  function createCup(){
    const def=T.cupTypes.find(c=>c.id===cupType),candidates=cupCandidates(),chosen=candidates.find(c=>c.id===cupTeam);if(!chosen)throw Error("Elige un equipo.");
    let options=candidates.filter(c=>c.id!==chosen.id);
    if(def.id==="europa")options=options.slice(8);if(def.id==="conference")options=options.slice(20);
    if(def.id==="clubworld")options=T.clubWorldEntrants(candidates,chosen,regionOf).slice(1);
    const entrants=[chosen,...options.slice(0,def.size-1)].map(c=>({id:c.id,name:c.name,rating:c.rating,region:c.region,national:c.national}));
    const cup=T.createCup(cupType,entrants,chosen.id),list=storage(),old=list.findIndex(c=>c.id===cupType);if(old>=0)list.splice(old,1,cup);else list.push(cup);saveFriendlyCups();return cup;
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
      const orientation=homeFirst?{home:result.home,away:result.away}:{home:result.away,away:result.home};
      if(result.home===result.away){
        const opponent=homeFirst?f.away:f.home;
        const us=cup.entrants.find(t=>t.id===cup.user),them=cup.entrants.find(t=>t.id===opponent);
        const kicks=AuraKnockout.shootout(us.rating,them.rating,cup.seed+round*7919);
        orientation.penalties=homeFirst?{home:kicks.home,away:kicks.away}:{home:kicks.away,away:kicks.home};
        notify("Empate: tanda de penaltis "+kicks.home+" — "+kicks.away+".");
      }
      T.advanceCup(cup,orientation);saveFriendlyCups();render();
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
  function careerHub(){return awardsView();}
  function ensurePro(){
    if(!state?.playerCareer)return;const sheet=AuraSquad.ensure(state),p=clubPlayers(state.club).find(p=>p.id===state.playerCareer.playerId);if(!p)throw Error("Tu jugador ya no está en este club.");
    if(!sheet.xi.includes(p.id)){const slots=AuraSquad.formations[sheet.formation],index=slots.map(([slot],i)=>({i,penalty:AuraSquad.positionPenalty(p,slot)})).filter(x=>x.i>0).sort((a,b)=>a.penalty-b.penalty)[0].i;sheet.xi[index]=p.id;}
  }
  function enablePro(){
    const id=document.getElementById("tour-pro-player")?.value||"new",name=document.getElementById("tour-pro-name")?.value||"Mi jugador",pos=document.getElementById("tour-pro-pos")?.value||"DC";
    const player=T.startPlayer(state,id,name,pos);AuraSquad.ensure(state);ensurePro();lobby=false;screen="pro";render();window.scrollTo(0,0);notify("Tu carrera empieza con "+player.name+".");
  }
  function proTrainingView(){
    if(!state?.playerCareer)return "";
    const ready=AuraProTraining.status(state),pc=state.playerCareer;
    const options=Object.entries(AuraProTraining.drills);
    return '<section class="tour-pro-training"><header class="pro-training-heading"><div>'+
      '<span class="eyebrow">MODO CARRERA DE JUGADOR · ENTRENAMIENTO SEMANAL</span>'+
      '<h2>PREPARA TU PRÓXIMO PARTIDO.</h2>'+
      '<p>Escoge un ejercicio por jornada: ganarás experiencia con distintas consecuencias para energía, forma y moral. No utiliza monedas ni dinero real.</p></div>'+
      '<strong class="pro-training-ready">'+(ready?.available?'DISPONIBLE':'YA ENTRENADO / CERRADO')+'</strong></header>'+
      '<div class="pro-training-grid">'+options.map(([key,d])=>
        '<article class="pro-training-drill"><span class="pro-training-icon">'+d.icon+'</span>'+
        '<h3>'+d.name+'</h3><p>'+d.desc+'</p>'+
        '<div class="pro-training-effect"><span>+'+d.xp+' EXP</span>'+
        '<span>'+((d.fitness>=0)?'+':'')+d.fitness+' ENERGÍA</span>'+
        '<span>+'+d.form+' FORMA</span><span>+'+d.morale+' MORAL</span></div>'+
        '<button class="btn '+(ready?.available?'primary':'')+'" data-tour="pro-train" data-drill="'+key+'" '+(!ready?.available?'disabled':'')+'>Entrenar '+d.name+' →</button></article>'
      ).join('')+'</div>'+
      '<div class="pro-training-log"><h3>HISTORIAL DE ENTRENAMIENTO</h3>'+
      ((pc.trainingHistory||[]).length?pc.trainingHistory.slice(0,6).map(v=>
         '<div class="pro-training-row"><span>Jornada '+(v.round+1)+' · '+v.season+'</span>'+
         '<strong>'+esc(v.name)+'</strong><b>+'+v.xp+' EXP'+(v.leveled?' · +1 GRL':'')+'</b></div>').join(''):
         '<p>Aún no has hecho entrenamientos individuales.</p>')+
      '</div></section>';
  }
  function playerHub(){
    if(!state.playerCareer)return proPicker('<button class="btn primary" data-tour="enable-pro">Comenzar con este club →</button>',true);
    const pc=state.playerCareer,p=clubPlayers(state.club).find(p=>p.id===pc.playerId);if(!p)return '<p>No se encontró a tu jugador.</p>';
    return headline('CARRERA DE JUGADOR / '+esc(myClub().name),'EL PARTIDO EMPIEZA CONTIGO.','WASD o flechas para moverte; K para pasar y J para tirar. Mantienes el control de tu futbolista cuando un compañero recibe el balón.')+
      '<section class="tour-pro-hub">'+face(p,true)+'<div><span class="eyebrow">'+p.pos+' · '+p.age+' AÑOS</span><h2>'+esc(p.name)+'</h2><p>'+p.overall+' GRL · '+p.potential+' POT · '+money(p.value)+' valor estimado</p><div class="tour-metrics"><span><b>'+pc.appearances+'</b> PARTIDOS</span><span><b>'+pc.goals+'</b> GOLES</span><span><b>'+(pc.lastRating||'—')+'</b> ÚLTIMA NOTA</span></div><label>Desarrollo · '+pc.xp+' / 100 EXP<progress max="100" value="'+pc.xp+'"></progress></label><p>100 EXP = +1 GRL hasta el potencial. La nota depende de goles, resultado y rendimiento de la jornada; al simular es una estimación.</p><button class="btn primary" data-evo="career-play">Jugar mi siguiente partido →</button><button class="btn" data-action="play">Simular jornada</button><button class="btn" data-nav="academy">Desarrollo del club →</button></div></section>'+proTrainingView();
  }
  function streetView(){
    const seen=new Set(),options=clubs.filter(c=>c.gender!=="women").filter(c=>{const id=World.matchingClub(c)?.id||c.id;if(seen.has(id))return false;seen.add(id);return true;}).sort((a,b)=>a.name.localeCompare(b.name));
    const choices=id=>options.map(c=>'<option value="'+esc(c.id)+'" '+(c.id===id?'selected':'')+'>'+esc(c.name)+'</option>').join('');
    const selected=(id,opts)=>opts.map(([v,label])=>'<option value="'+v+'" '+(String(v)===String(id)?'selected':'')+'>'+label+'</option>').join('');
    const current=streetCircuit,opponent=current?AuraStreetCircuit.next(current):null;
    const rank=current?AuraStreetCircuit.rank(current):null;
    const circuitView=streetMode==="circuit"?(
      current?
        '<section class="volta-tour"><div class="volta-tour-head"><div><span class="eyebrow">AURA CALLE / CIRCUITO URBANO</span>'+
        '<h2>'+(rank?rank.icon+' '+rank.name+' · CIRCUITO TERMINADO':'🏆 CAMINO A LA CIMA')+'</h2>'+
        '<p>Cuatro partidos, puntos por ganar y medalla de campeón. El progreso se conserva en este navegador.</p></div>'+
        '<div class="volta-tour-points"><strong>'+current.points+'</strong><span>PUNTOS</span></div></div>'+
        '<div class="volta-tour-stats"><span><b>'+current.wins+'</b> GANADOS</span><span><b>'+current.draws+'</b> EMPATES</span>'+
        '<span><b>'+current.losses+'</b> PERDIDOS</span><span><b>'+current.goals+'</b> GOLES</span>'+
        '<span><b>'+current.bestStreak+'</b> MEJOR RACHA</span></div>'+
        '<div class="volta-tour-fixtures">'+current.fixtures.map((id,i)=>{
          const finished=current.results[i],isNext=!finished&&opponent===id;
          return '<article class="'+(finished?'completed':isNext?'next':'pending')+'">'+
            '<span>'+esc(AuraStreetCircuit.labels[i])+'</span><strong>'+esc(getClub(id).name)+'</strong>'+
            '<small>'+(finished?'AURA '+finished.home+' — '+finished.away+' · '+finished.points+' pts':
              isNext?'SIGUIENTE PARTIDO':'BLOQUEADO')+'</small></article>';
        }).join('')+'</div>'+
        (opponent?'<button class="btn primary" data-tour="street-circuit-play">Jugar contra '+esc(getClub(opponent).name)+' →</button>'+
          '<button class="btn" data-tour="street-circuit-sim">Simular siguiente partido</button>'+
          '<button class="btn" data-tour="street-circuit-sim-all">Simular el resto del circuito</button>':
          '<button class="btn primary" data-tour="street-circuit-new">Nuevo circuito →</button>')+
        '<button class="btn" data-tour="street-circuit-reset">Cambiar de club y comenzar otro circuito</button></section>'
      :'<section class="volta-tour volta-tour-welcome"><span class="eyebrow">4 PARTIDOS · UNA MEDALLA</span>'+
        '<h2>CONQUISTA LA CALLE.</h2><p>Recorre Guayaquil, Buenos Aires, Madrid y Manchester contra rivales cada vez más fuertes.</p>'+
        '<p>3 puntos por victoria, 1 por empate y 0 por derrota. Medallas al terminar el circuito.</p>'+
        '<button class="btn primary" data-tour="street-circuit-new">Iniciar circuito de 4 partidos →</button></section>'
    ):'<section class="tour-street-card"><span>GYE / 01</span><h2>JUEGA.<br>COMBINA.<br><em>ATRÉVETE.</em></h2>'+
      '<button class="btn primary" data-tour="street-play">Entrar a la cancha →</button>'+
      '<p>WASD / flechas para moverte y Shift para correr. Controles ProVision o AURA clásico según tu perfil guardado; la guía aparece al entrar a la cancha. También puedes jugar con mando y botones táctiles.</p></section>';
    return headline('AURA CALLE / FÚTBOL 3 CONTRA 3','LA CALLE TIENE SUS REGLAS.','Dos experiencias: amistosos personalizados o cuatro jornadas de un circuito urbano con medallas.')+
      '<nav class="volta-mode-choices" aria-label="Experiencias Calle / Volta">'+
      '<button class="btn '+(streetMode==="friendly"?'primary':'')+'" data-tour="street-mode" data-street-mode="friendly" aria-pressed="'+(streetMode==="friendly")+'">⚡ PARTIDO LIBRE</button>'+
      '<button class="btn '+(streetMode==="circuit"?'primary':'')+'" data-tour="street-mode" data-street-mode="circuit" aria-pressed="'+(streetMode==="circuit")+'">🏆 CIRCUITO VOLTA</button></nav>'+
      '<div class="tour-form"><label>Tu club<select id="street-home" '+(current&&streetMode==="circuit"?'disabled':'')+'>'+choices(current&&streetMode==="circuit"?current.home:streetHome)+'</select></label>'+
      (streetMode==="friendly"?'<label>Rival<select id="street-away">'+choices(streetAway)+'</select></label>':'')+
      '<label>Dificultad<select id="street-difficulty" '+(current&&streetMode==="circuit"?'disabled':'')+'>'+selected(current&&streetMode==="circuit"?current.difficulty:streetDifficulty,[[.78,"Principiante"],[1,"Normal"],[1.16,"Profesional"]])+'</select></label>'+
      '<label>Goles para ganar<select id="street-goals" '+(current&&streetMode==="circuit"?'disabled':'')+'>'+selected(current&&streetMode==="circuit"?current.goalLimit:streetGoalLimit,[[3,"3 goles"],[5,"5 goles"],[7,"7 goles"]])+'</select></label>'+
      '<label>Duración<select id="street-duration" '+(current&&streetMode==="circuit"?'disabled':'')+'>'+selected(current&&streetMode==="circuit"?current.seconds:streetSeconds,[[60,"1 minuto"],[120,"2 minutos"],[180,"3 minutos"]])+'</select></label></div>'+circuitView;
  }
  function welcome(mode,picker){return mode==='pro'?proPicker(picker):mode==='cup'?cupView():mode==='ultimate'?AuraUTUI.render():streetView();}
  function afterRender(){
    if(typeof document==='undefined')return;const button=document.querySelector?.('[data-tour="music"]');if(button){button.textContent=audio.isEnabled()?'♫ Música ON':'♫ Música';button.setAttribute('aria-pressed',String(audio.isEnabled()));button.title='Música electrónica original de AURA · 112 BPM';}
  }
  function handleClick(button){
    const action=button.dataset.tour;if(!action)return false;
    try {
      if(action==='music')audio.toggle();
      if(action==='start-pro'){const previous=state;state=createGame(selected);try{enablePro();AuraProgression.initialize(state);}catch(error){state=previous;throw error;}}
      if(action==='enable-pro')enablePro();
      if(action==='pro-train'){
        const result=AuraProTraining.train(state,button.dataset.drill);
        if(result.ok){render();notify(result.message);}
        else notify(result.error);
      }
      if(action==='cup-create'){createCup();render();}
      if(action==='cup-sim'){const cup=currentCup();if(cup){T.advanceCup(cup);saveFriendlyCups();render();}}
      if(action==='cup-finish'){
        const cup=currentCup();if(cup&&!cup.champion){
          for(let n=0;n<6&&!cup.champion;n++)T.advanceCup(cup);
          saveFriendlyCups();render();notify('Copa completada: revisa el campeón y los marcadores.');
        }
      }
      if(action==='cup-reroll'){
        const cup=currentCup();if(cup&&!cup.rounds.length&&!cup.champion){
          const retry=T.createCup(cup.id,cup.entrants,cup.user,cup.seed+1);
          const entries=storage(),i=entries.findIndex(c=>c===cup);
          if(i>=0){entries[i]=retry;saveFriendlyCups();render();notify('Nuevo sorteo completado.');}
        }
      }
      if(action==='cup-play')playCup();
      if(action==='street-mode'){
        if(['friendly','circuit'].includes(button.dataset.streetMode)){streetMode=button.dataset.streetMode;render();}
      }
      if(action==='street-circuit-reset'){streetCircuit=null;saveStreetCircuit();render();}
      if(action==='street-circuit-new'){
        streetCircuit=AuraStreetCircuit.create(streetHome,{difficulty:streetDifficulty,
          seconds:streetSeconds,goalLimit:streetGoalLimit});
        streetMode="circuit";saveStreetCircuit();render();
      }
      if(action==='street-circuit-sim'||action==='street-circuit-sim-all'){
        if(AuraStreet.isRunning()||AuraArena.isRunning()){notify("Termina el partido actual antes de simular.");return true;}
        if(!streetCircuit||!AuraStreetCircuit.next(streetCircuit))return true;
        const results=action==='street-circuit-sim-all'?
          AuraStreetSim.rest(streetCircuit,id=>getClub(id).rating):
          [AuraStreetSim.next(streetCircuit,getClub(streetCircuit.home).rating,
             getClub(AuraStreetCircuit.next(streetCircuit)).rating)].filter(Boolean);
        if(results.length){saveStreetCircuit();render();notify("Circuito VOLTA: "+results.length+" partido(s) simulados.");}
        return true;
      }
      if(action==='street-play'||action==='street-circuit-play'){
        const circuit=action==='street-circuit-play'?streetCircuit:null;
        const rival=circuit?AuraStreetCircuit.next(circuit):streetAway;
        const home=circuit?circuit.home:streetHome;
        if(!rival||home===rival){notify('Elige dos clubes distintos.');return true;}
        const top=id=>AuraArena.team(getClub(id)).players.filter(p=>p.pos!=='POR').sort((a,b)=>b.overall-a.overall).slice(0,3);
        AuraStreet.open(top(home),top(rival),{
          homeName:getClub(home).name,awayName:getClub(rival).name,
          difficulty:circuit?.difficulty||streetDifficulty,seconds:circuit?.seconds||streetSeconds,
          goalLimit:circuit?.goalLimit||streetGoalLimit,
          onFinish:circuit?(result=>{
            if(streetCircuit!==circuit||AuraStreetCircuit.next(circuit)!==rival)return;
            const done=AuraStreetCircuit.complete(circuit,result);
            if(done){saveStreetCircuit();render();notify('Calle: '+(done.points===3?'¡Ganaste!':done.points===1?'Empate':'Derrota')+
              ' · +'+done.points+' puntos de circuito.');}
          }):undefined
        });
      }
      if(action==='gala'&&state){const annual=T.initialize(state).annual[0];if(annual)openModal('GALA DEL BALÓN DE ORO AURA','<div class="tour-gala"><span class="eyebrow">TEMPORADA '+annual.season+' · PREMIOS DE TU LIGA</span><div class="tour-trophy" aria-hidden="true">★</div><h2>'+esc(annual.winner.name)+'</h2><p>GANADOR DEL BALÓN DE ORO AURA</p><p>'+annual.winner.goals+' goles · '+annual.winner.appearances+' partidos · '+annual.winner.points.toFixed(1)+' puntos de rendimiento</p></div><ol class="tour-shortlist">'+annual.shortlist.map(p=>'<li><b>'+esc(p.name)+'</b><span>'+p.points.toFixed(1)+' puntos · '+p.goals+' goles</span></li>').join('')+'</ol>');}
    }catch(error){notify(error.message);}return true;
  }
  function change(e){
    if(e.target.id==='street-home')streetHome=e.target.value;
    if(e.target.id==='street-away')streetAway=e.target.value;
    if(e.target.id==='street-difficulty'&&!streetCircuit)streetDifficulty=Number(e.target.value);
    if(e.target.id==='street-goals'&&!streetCircuit)streetGoalLimit=Number(e.target.value);
    if(e.target.id==='street-duration'&&!streetCircuit)streetSeconds=Number(e.target.value);
    if(e.target.id==='tour-cup-type'){cupType=e.target.value;cupTeam='';render();}
    if(e.target.id==='tour-cup-team')cupTeam=e.target.value;
    if(e.target.dataset?.utSlot!==undefined&&ultimate){const i=Number(e.target.dataset.utSlot),id=e.target.value;if(!Number.isInteger(i)||i<0||i>10||!ultimate.owned.some(p=>p.id===id))return;const j=ultimate.xi.indexOf(id),old=ultimate.xi[i];ultimate.xi[i]=id;if(j>=0)ultimate.xi[j]=old;render();}
  }
  function reset(){cupTeam='';}
  return {welcome,careerHub,playerHub,ensurePro,handleClick,change,afterRender,face,audio,reset,
    getUltimate:()=>AuraUTUI.getClub(),getCup:currentCup,getStreetCircuit:()=>streetCircuit};
})();
