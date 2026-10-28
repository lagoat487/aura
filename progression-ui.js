/* Career facilities: development, board objectives, and original youth scouting. */
const AuraProgressionUI=(()=>{
  "use strict";
  let playerId=null,focus="balanced",region="ecuador";
  const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const cash=n=>"€"+Number(n).toLocaleString("es-ES");
  function boardSummary(){
    const view=AuraProgression.dashboard(state);
    return '<div class="progression-board-summary"><div><span class="eyebrow">CONFIANZA DE LA DIRECTIVA</span><strong>'+view.confidence+'<small>/100</small></strong></div><div><span>'+view.complete+' de 3 objetivos completados</span><button class="btn small" data-nav="academy">Ver desarrollo →</button></div></div>';
  }
  function objectiveCards(view){
    return '<section class="progression-objectives" aria-label="Objetivos de temporada">'+view.objectives.map(o=>'<article class="progression-objective '+(o.complete?'complete':'')+'"><div class="progression-objective-top"><span class="eyebrow">'+(o.claimed?'RECOMPENSA RECIBIDA':o.complete?'OBJETIVO COMPLETADO':'OBJETIVO DE TEMPORADA')+'</span><b>'+(o.complete?'✓':'→')+'</b></div><h3>'+escape(o.label)+'</h3><p>'+escape(o.description)+'</p><div class="progression-objective-value"><span>'+Math.min(o.current,o.target)+' / '+o.target+'</span><strong>'+cash(o.reward)+'</strong></div><progress value="'+Math.min(o.current,o.target)+'" max="'+o.target+'" aria-label="'+escape(o.label)+': '+Math.min(o.current,o.target)+' de '+o.target+'"></progress><button class="btn small" data-progression="claim" data-objective="'+o.id+'" '+(!o.complete||o.claimed?'disabled':'')+'>'+(o.claimed?'Recibida':o.complete?'Recibir recompensa':'En progreso')+'</button></article>').join("")+'</section>';
  }
  function renderScreen(){
    AuraSquad.ensure(state);
    const view=AuraProgression.dashboard(state),players=clubPlayers(state.club).slice().sort((a,b)=>a.age-b.age||b.potential-a.potential);
    if(!players.some(p=>p.id===playerId))playerId=players[0]?.id;
    const player=players.find(p=>p.id===playerId),used=player&&view.trained.includes(player.id),plan=AuraProgression.focuses[focus];
    const training='<section class="progression-panel"><div class="progression-panel-heading"><div><span class="eyebrow">CADA SESIÓN CUENTA</span><h2>Campo de entrenamiento</h2></div><span class="pill">'+view.sessionsLeft+' / 3 disponibles</span></div><p class="save-info">Tres sesiones por jornada, una por jugador. Cada 100 EXP ganas +1 GRL, hasta su potencial. Entrenar reduce la energía para el siguiente partido.</p><div class="progression-training-grid"><div><label for="progression-player">Jugador</label><select id="progression-player">'+players.map(p=>'<option value="'+escape(p.id)+'" '+(p.id===playerId?'selected':'')+'>'+escape(p.name)+' · '+p.pos+' · '+p.age+' años</option>').join("")+'</select><label for="progression-focus">Plan de esta sesión</label><select id="progression-focus">'+Object.entries(AuraProgression.focuses).map(([id,f])=>'<option value="'+id+'" '+(id===focus?'selected':'')+'>'+f.label+' · '+f.description+'</option>').join("")+'</select>'+(player?'<div class="progression-session-preview"><span>'+escape(player.name)+'</span><strong>'+player.overall+' <small>GRL → POT '+player.potential+'</small></strong><div><span>Desarrollo</span><b>'+(Number(player.trainingXP)||0)+' / 100 EXP</b></div><progress value="'+(Number(player.trainingXP)||0)+'" max="100" aria-label="Experiencia de entrenamiento"></progress><div><span>Energía actual</span><b>'+Math.round(player.fitness)+' %</b></div><progress value="'+player.fitness+'" max="100" aria-label="Energía actual"></progress><p>Después de esta sesión: <b>'+Math.max(0,Math.min(100,player.fitness+plan.energy))+' %</b> de energía.</p></div>':'')+'<button class="btn primary" data-progression="train" '+(!player||used||!view.sessionsLeft||view.finished?'disabled':'')+'>'+(used?'Sesión completada':view.finished?'Temporada completada':'Realizar sesión →')+'</button></div><aside class="progression-training-aside"><span class="progression-training-symbol" aria-hidden="true">→</span><span class="eyebrow">EL PRÓXIMO SALTO</span><h3>El talento se trabaja.</h3><p>Alterna sesiones intensivas y recuperación. La energía afecta al rendimiento de tu once.</p><ul><li>Equilibrado: +25 EXP, −6 energía.</li><li>Intensivo: +40 EXP, −12 energía.</li><li>Recuperación: +12 energía.</li></ul><small>Las sesiones se renuevan al disputar o simular una jornada. No requieren pagos.</small></aside></div></section>';
    const route=AuraProgression.regions[region];
    const scouting='<section class="progression-panel progression-scouting"><div class="progression-panel-heading"><div><span class="eyebrow">LA PRÓXIMA GENERACIÓN</span><h2>Red de ojeadores</h2></div><span class="pill">'+view.signings+' / 2 incorporaciones</span></div><p class="save-info">Un informe por jornada. Cada búsqueda reemplaza el informe anterior y presenta tres jugadores ficticios generados por AURA. Las incorporaciones ocupan plaza y margen salarial.</p><div class="progression-scout-controls"><label for="progression-region">Ruta de ojeo<select id="progression-region">'+Object.entries(AuraProgression.regions).map(([id,r])=>'<option value="'+id+'" '+(id===region?'selected':'')+'>'+r.label+' · '+cash(r.cost)+'</option>').join("")+'</select></label><p>'+route.description+'</p><button class="btn" data-progression="scout" '+(!view.canScout||state.budget<route.cost?'disabled':'')+'>'+(view.canScout?'Enviar ojeador · '+cash(route.cost):'Informe recibido esta jornada')+'</button></div>'+(view.report?'<div class="progression-report-title"><span class="eyebrow">'+AuraProgression.regions[view.report.region].label.toUpperCase()+' / INFORME DE JORNADA '+(view.report.round+1)+'</span><span>Cantera generada · sin datos de jugadores reales</span></div><div class="progression-prospects">'+view.report.prospects.map(c=>'<article class="progression-prospect"><div class="progression-prospect-rating">'+c.player.overall+'<small>GRL</small></div><span class="eyebrow">'+c.player.pos+' · '+c.player.age+' AÑOS</span><h3>'+escape(c.player.name)+'</h3><p>Potencial <b>'+c.player.potential+'</b></p><dl><div><dt>Incorporación</dt><dd>'+cash(c.fee)+'</dd></div><div><dt>Sueldo / semana</dt><dd>'+cash(c.player.wage)+'</dd></div></dl><button class="btn small" data-progression="sign" data-youth="'+escape(c.player.id)+'" '+(c.signed||view.signings>=2||view.finished?'disabled':'')+'>'+(c.signed?'En tu plantilla':'Incorporar →')+'</button></article>').join("")+'</div>':'<div class="progression-empty">Tu próximo descubrimiento empieza aquí. Selecciona una ruta para recibir tu primer informe.</div>')+'</section>';
    return '<div class="progression-heading"><div><span class="eyebrow">'+escape(myClub().name)+' / DESARROLLO DEL CLUB</span><h1>CONSTRUYE <em>EL FUTURO.</em></h1><p>Entrena, descubre talento y cumple los objetivos de tu temporada.</p></div><div class="progression-confidence"><span>CONFIANZA DIRECTIVA</span><strong>'+view.confidence+'<small>/100</small></strong></div></div>'+objectiveCards(view)+training+scouting;
  }
  function handleClick(t){
    if(!t.dataset.progression||!state)return false;
    let result;
    if(t.dataset.progression==="train")result=AuraProgression.train(state,playerId,focus);
    if(t.dataset.progression==="claim")result=AuraProgression.claim(state,t.dataset.objective);
    if(t.dataset.progression==="scout")result=AuraProgression.scout(state,region);
    if(t.dataset.progression==="sign")result=AuraProgression.signYouth(state,t.dataset.youth);
    if(result){if(result.ok){state.news.unshift(result.message);state.news=state.news.slice(0,20);save();render();}notify(result.error||result.message);}
    return true;
  }
  function change(e){
    if(e.target.id==="progression-player"){playerId=e.target.value;render();}
    if(e.target.id==="progression-focus"){focus=e.target.value;render();}
    if(e.target.id==="progression-region"){region=e.target.value;render();}
  }
  function reset(){playerId=null;focus="balanced";region="ecuador";}
  return {render:renderScreen,boardSummary,handleClick,change,reset};
})();
