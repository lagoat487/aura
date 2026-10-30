/* Connect continental fixtures to the same career, XI, energy, budget and season. */
const AuraContinental=(()=>{
  "use strict";
  const C=AuraChampions;
  function initialize(game,position=null){
    C.initCareer(game,clubs,Competitions.definitions,c=>World.matchingClub(c),position);
    if(game.champions)for(const c of game.champions.entrants)if(!game.rosters[c.id])game.rosters[c.id]=starterRoster(c.id,AuraTour.hash(c.id),c.rating);
  }
  function next(game){
    const c=game.champions,round=C.next(c),f=C.fixture(c);
    if(round&&f&&C.dueNow(game))return {...f,kind:'champions',label:'Champions League',phaseLabel:C.labels[round.stage]+' · '+(round.stage==='league'?'Jornada '+round.leg:round.stage==='final'?'Partido único':round.leg===1?'Ida':'Vuelta')};
    const league=game.competition?.fixtures[game.round]?.find(f=>f.home===game.club||f.away===game.club);
    return league?{...league,kind:'league',label:game.competition.name,phaseLabel:'Jornada '+(game.round+1)}:null;
  }
  function strength(game,id){
    if(id===game.club)return AuraSquad.strength(game);const roster=game.rosters[id]||[];if(!roster.length)return getClub(id).rating;
    const xi=AuraSquad.choose(roster,'4-3-3').map(id=>roster.find(p=>p.id===id)).filter(Boolean);return xi.reduce((n,p)=>n+p.overall,0)/Math.max(1,xi.length);
  }
  function simulator(game){return (h,a)=>AuraTour.simulate(strength(game,h),strength(game,a));}
  function settleSpectators(game,all=false){
    const c=game.champions;if(!c)return;let safety=0;
    while(C.next(c)&&(all||C.dueNow(game))&&!C.fixture(c)&&safety++<20)C.advance(c,simulator(game));
  }
  function advance(score=null,details=null){
    settleSpectators(state);const f=next(state);
    if(!f||f.kind==='league'){playMatch(score,details);return;}
    const c=state.champions,round=C.next(c),resultRound=C.advance(c,simulator(state),score),result=resultRound.matches.find(m=>m.id===f.id),home=f.home===state.club,g1=home?result.score.home:result.score.away,g2=home?result.score.away:result.score.home;
    const participants=details?.participants?.[0]||AuraSquad.ensure(state).xi;
    const names=AuraSquad.players(state).filter(p=>p.pos!=='POR');
    const scorers=details?.goals?details.goals.filter(g=>g.team===0).map(g=>g.name):Array.from({length:g1},()=>names[Math.floor(Math.random()*names.length)]?.name||'Jugador');
    state.continentalHistory=state.continentalHistory||[];state.continentalHistory.unshift({id:f.id,season:state.season,stage:round.stage,phase:f.phaseLabel,rival:home?f.away:f.home,home,g1,g2,scorers,match:details});
    const reward=g1>g2?1500000:g1===g2?500000:150000;state.budget+=reward;AuraSquad.afterMatch(state,g1>g2,g1===g2,participants);
    const pc=state.playerCareer,p=pc&&clubPlayers(state.club).find(p=>p.id===pc.playerId);
    if(p&&participants.includes(p.id)){const goals=scorers.filter(n=>n===p.name).length;pc.appearances++;pc.goals+=goals;pc.lastRating=Math.min(10,6+(g1>g2?.7:0)+goals);pc.xp+=Math.round(25+goals*20);if(pc.xp>=100&&p.overall<p.potential){pc.xp-=100;p.overall++;}pc.xp=Math.min(pc.xp,99);}
    if(c.champion===state.club&&!c.payouts.includes('champion')){c.payouts.push('champion');state.budget+=10000000;state.news.unshift('¡Campeones de Europa! La directiva añade €10.000.000 al presupuesto.');}
    state.news.unshift('Champions · '+myClub().name+' '+g1+' — '+g2+' '+getClub(home?f.away:f.home).name);state.news=state.news.slice(0,20);save();render();
    openModal('FINAL DEL PARTIDO','<div class="score"><span class="eyebrow">CHAMPIONS LEAGUE · '+safeText(f.phaseLabel)+'</span><h2>'+result.score.home+' — '+result.score.away+'</h2><h3>'+safeText(getClub(f.home).name)+' vs '+safeText(getClub(f.away).name)+'</h3>'+(result.aggregate?'<p>Global: '+result.aggregate.home+' — '+result.aggregate.away+'</p>':'')+(result.penalties?'<p>Penaltis: '+result.penalties.home+' — '+result.penalties.away+'</p>':'')+'<p>Ingresos: '+money(reward)+'</p></div><button class="btn primary" id="continue">Continuar carrera →</button>');
    $('continue').onclick=()=>{closeModal();render();};
  }
  function summary(){
    if(!state?.champions)return '';
    const c=state.champions,r=C.next(c),f=C.fixture(c),table=C.table(c),row=table.find(t=>t.id===state.club),rank=table.indexOf(row)+1;
    return '<section class="career-europe-summary"><div><span class="eyebrow">UEFA CHAMPIONS LEAGUE / TU CARRERA</span><h3>'+(c.champion?(c.champion===state.club?'¡CAMPEONES DE EUROPA!':'Campeón: '+safeText(getClub(c.champion).name)):r?.stage==='league'?rank+'º en fase liga · '+row.pts+' puntos':C.labels[r?.stage]||'Europa')+'</h3><p>'+(f?safeText(getClub(f.home===state.club?f.away:f.home).name)+' · '+C.labels[r.stage]+' · después de la jornada '+Math.floor(r.due*totalRounds()/38):C.pendingUser(c)?'Esperando el desenlace del play-off.':c.champion?'Torneo finalizado.':'Eliminado. El torneo continúa con los demás clubes.')+'</p></div><button class="btn" data-nav="champions">Ver Champions →</button></section>';
  }
  function renderScreen(){
    const c=state.champions;
    if(!c)return heading('Champions League',state.championsReason||'Termina entre los cuatro primeros de una liga europea para clasificar.')+'<button class="btn" data-nav="career">Volver a la carrera →</button>';
    const r=C.next(c),f=C.fixture(c),table=C.table(c),due=C.dueNow(state);
    const calendar=c.rounds.flatMap(r=>r.matches.filter(m=>m.home===state.club||m.away===state.club).map(m=>({r,m})));
    return heading('Champions League','36 clubes · 8 jornadas · play-off y eliminatorias de ida y vuelta. Sorteo y participantes de AURA.')+summary()+'<section class="champions-next"><span class="eyebrow">'+(r?C.labels[r.stage]:'FINALIZADA')+'</span><h2>'+(f?safeText(getClub(f.home).name)+' vs '+safeText(getClub(f.away).name):c.champion?safeText(getClub(c.champion).name)+' levanta la copa':'Esperando los siguientes cruces')+'</h2>'+(f&&due?'<button class="btn primary" data-evo="career-play">Jugar Champions →</button><button class="btn" data-action="play">Simular partido →</button>':f?'<p>Este partido llegará después de la jornada '+Math.floor(r.due*totalRounds()/38)+' de liga. El calendario alterna ambas competiciones.</p><button class="btn" data-nav="career">Continuar temporada →</button>':'<button class="btn" data-nav="career">Volver a carrera →</button>')+'</section><div class="two-col"><section class="card"><h3>TUS PARTIDOS EUROPEOS</h3>'+calendar.map(({r,m})=>'<div class="statline"><span>'+C.labels[r.stage]+' · '+(r.stage==='league'?'J'+r.leg:r.stage==='final'?'Partido único':r.leg===1?'Ida':'Vuelta')+'</span><b>'+safeText(getClub(m.home).name)+' '+(m.score?m.score.home+' — '+m.score.away:'vs')+' '+safeText(getClub(m.away).name)+'</b>'+(m.aggregate?'<small>Global '+m.aggregate.home+' — '+m.aggregate.away+'</small>':'')+'</div>').join('')+'</section><section class="card"><h3>FASE LIGA / CLASIFICACIÓN</h3><p class="save-info">1–8: octavos · 9–24: play-off · 25–36: eliminados</p><div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>Club</th><th>PJ</th><th>DG</th><th>PTS</th></tr></thead><tbody>'+table.map((t,i)=>'<tr class="'+(t.id===state.club?'highlight':'')+'"><td>'+ (i+1)+'</td><td>'+safeText(t.name)+'</td><td>'+t.p+'</td><td>'+(t.gf-t.ga)+'</td><td>'+t.pts+'</td></tr>').join('')+'</tbody></table></div></section></div>';
  }
  return {initialize,next,advance,settleSpectators,summary,render:renderScreen};
})();
