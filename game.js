
"use strict";
const KEY="aura-fc27-save-v1";
const $=id=>document.getElementById(id);
const { clubs, legacyClubs } = AuraClubs;
const Competitions = AuraCompetitions;
const World = AuraWorld;
const Real = AuraRealPlayers;
const LEGACY_ROUNDS = (legacyClubs.length - 1) * 2;
const first=["Mateo","Leo","Andrés","Thiago","Gabriel","Nicolás","Santiago","Bruno","Lucas","Julián","Damián","Emilio","Diego","Enzo","David","Marco","Alan","Rafael","Sebastián","Cristian"];
const last=["Rivera","Torres","García","Moreno","Silva","Méndez","Castro","Vargas","Díaz","Rojas","López","Martínez","Paredes","Suárez","Lara","Cruz","Pinto","Bustos","Paz","Vega"];
const pos=["POR","LD","DFC","DFC","LI","MC","MCD","MCO","ED","DC","EI","MC","DFC","DC","EI","POR","LD","MCO"];
const money=n=>"€"+Math.round(n).toLocaleString("es-ES");
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let lobby=true;
let state=null,screen="home",selected="barcelona",selectedCompetition="laliga",calendarRound=null,toastTimer,marketSearch="";
function seeded(seed){let t=seed>>>0;return()=>{t=(Math.imul(1664525,t)+1013904223)>>>0;return t/4294967296}}
function genPlayers(cid,seed,rating,count=18){
const rng=seeded(seed);return Array.from({length:count},(_,i)=>{let age=18+Math.floor(rng()*15),overall=clamp(rating-7+Math.floor(rng()*13)-(i>=11?4:0),58,93);
return {id:cid+"-"+i,name:first[Math.floor(rng()*first.length)]+" "+last[Math.floor(rng()*last.length)],pos:pos[i%pos.length],age,overall,potential:clamp(overall+Math.floor(rng()*10),overall,95),value:Math.round((overall*overall*overall/130)*(age<23?1.3:1)*100),wage:Math.round(overall*overall*0.9),club:cid,form:65+Math.floor(rng()*31)};})}
function starterRoster(cid,seed,rating){
 const c=getClub(cid);
 // Use one reconciled membership source, never union old and new club lists.
 const result=AuraRosterSync.rosterFor(c).slice(0,28).map(p=>({...p,club:cid}));
 // Only generated academy players fill unavailable positions, labeled explicitly.
 const missing=Math.max(0,18-result.length);
 return result.concat(genPlayers(cid,seed,rating,missing).map((p,i)=>({
   ...p,id:"academy:"+cid+":"+i,name:"Canterano "+(i+1),academy:true
 })));
}
function createGame(id, competitionId=selectedCompetition) {
  const definition = Competitions.getDefinition(competitionId), c = getClub(id), rosters = {};
  if (!definition.clubIds.includes(id)) throw new Error("El club no pertenece a esta competición.");
  definition.clubIds.forEach((cid,i) => {
    const x=getClub(cid);
    rosters[cid]=starterRoster(cid,(i+1)*84291,x.rating);
  });
  const game={ version:2, club:id, season:2026, round:0, competition:Competitions.createSeason(definition,2026),
    worldSnapshot:definition.external?{definition:{...definition},clubs:definition.clubIds.map(cid=>({...getClub(cid)}))}:undefined,
    budget:c.budget, wins:0, draws:0, losses:0, goals:0, against:0, history:[], seasonHistory:[], rosters,
    news:["Bienvenido a "+c.name+". ¡Tu aventura comienza!"], savedAt:new Date().toISOString() };
  AuraContinental.initialize(game);return game;
}
// Session-only career: never read stored progress or write to localStorage.
function save(){}
function load(){return null}
function totalRounds(){return state.version===1?LEGACY_ROUNDS:state.competition.fixtures.length}
function competitionName(){return state.version===1?"Exhibición · guardado anterior":state.competition.name}
function syncRecord(game) {
  const row = Competitions.standings(game.competition).find(c=>c.id===game.club);
  game.wins=row.w; game.draws=row.d; game.losses=row.l; game.goals=row.gf; game.against=row.ga;
}
function getClub(id){return clubs.find(x=>x.id===id)||clubs[0]}
function myClub(){return getClub(state.club)}
function clubPlayers(id){return state.rosters[id]||[]}
function overall(id){if(id===state.club)return AuraSquad.strength(state);let p=clubPlayers(id).slice().sort((a,b)=>b.overall-a.overall).slice(0,11);return p.length?Math.round(p.reduce((s,x)=>s+x.overall,0)/p.length):65}
function seasonTable(){
if(state.version===2)return Competitions.standings(state.competition).map(row=>({...getClub(row.id),...row}));
return legacyClubs.map((c,i)=>{let played=state.round; if(c.id===state.club)return {...c,p:played,w:state.wins,d:state.draws,l:state.losses,gf:state.goals,ga:state.against,pts:state.wins*3+state.draws};
let rng=seeded((state.season*313+played*79+i*47)>>>0),w=Math.min(played,Math.floor(played*(.32+(c.rating-75)*.019+rng()*.17))),d=Math.min(played-w,Math.floor((played-w)*(.25+rng()*.33))),l=played-w-d;
return {...c,p:played,w,d,l,gf:w*2+d,ga:l*2+d,pts:w*3+d};}).sort((a,b)=>b.pts-a.pts||(b.gf-b.ga)-(a.gf-a.ga))}
function nextFixture() {
  if (state.round>=totalRounds()) return null;
  if (state.version===2) return state.competition.fixtures[state.round].find(g=>g.home===state.club||g.away===state.club);
  const others=legacyClubs.filter(x=>x.id!==state.club), rival=others[state.round%others.length];
  return {home:state.round%2===0?state.club:rival.id,away:state.round%2===0?rival.id:state.club};
}
function nextOpponent(){const game=nextFixture();return game?getClub(game.home===state.club?game.away:game.home):null}
function rand(){return Math.random()}
function poisson(lambda){let L=Math.exp(-lambda),k=0,p=1;do{k++;p*=rand()}while(p>L);return Math.min(k-1,8)}
function simulateFixture(homeId, awayId) {
  return AuraTour.simulate(overall(homeId),overall(awayId));
}
function startNextSeason(competitionId) {
  if(state.round<totalRounds()) return;
  const definition=Competitions.getDefinition(competitionId);
  if(!definition.clubIds.includes(state.club)) return;
  const previousPosition=rank();
  AuraContinental.settleSpectators(state,true);
  state.previousContinentalChampion=state.champions?.champion;
  state.seasonHistory=state.seasonHistory||[];
  state.seasonHistory.push({season:state.season,competition:competitionName(),position:rank(),
    table:seasonTable(),history:state.history.slice(),champion:state.champions?.champion,continentalHistory:(state.continentalHistory||[]).slice()});
  const regenerated=AuraTour.rollover(state);
  state.season++; state.version=2; state.round=0;
  AuraSquad.ensure(state);
  if(regenerated.length)state.news.unshift(regenerated.length+" veteranos se retiraron: una nueva generación llega a sus clubes.");
  state.competition=Competitions.createSeason(definition,state.season);
  state.wins=state.draws=state.losses=state.goals=state.against=0;
  state.history=[]; state.budget+=12000000; calendarRound=null;
  AuraContinental.initialize(state,previousPosition);
  state.news.unshift("Comienza la temporada "+state.season+" · "+definition.name);
  AuraProgression.initialize(state);
  save(); closeModal(); render();
}
function playMatch(suppliedScore=null,matchDetails=null) {
  if(suppliedScore&&(!Number.isInteger(suppliedScore.home)||!Number.isInteger(suppliedScore.away)||suppliedScore.home<0||suppliedScore.away<0))throw Error("Resultado inválido");
  if(state.round>=totalRounds()) {
    const eligible=Competitions.definitions.filter(c=>c.clubIds.includes(state.club));
    const champion=seasonTable()[0];
    const options=state.version===1?'<label for="nextcompetition">Próxima competición</label><select id="nextcompetition">'+
      eligible.map(c=>'<option value="'+c.id+'">'+c.name+'</option>').join("")+'</select>':'';
    openModal("Fin de temporada",'<p>¡Terminaste '+competitionName()+' '+state.season+'!</p><p>Posición final: <strong>'+rank()+
      '</strong> · Puntos: <strong>'+(state.wins*3+state.draws)+'</strong>.</p>'+
      (state.version===2?'<p>Campeón: <strong>'+champion.name+'</strong></p>':'')+options+
      '<button class="btn primary" id="newseason">Empezar siguiente temporada →</button>');
    $("newseason").onclick=()=>startNextSeason(state.version===1?$("nextcompetition").value:state.competition.id);
    return;
  }
  const fixture=nextFixture(), rival=nextOpponent(), home=fixture.home===state.club;
  let score;
  if(state.version===2) {
    Competitions.simulateNextRound(state.competition,(homeId,awayId)=>
      suppliedScore&&homeId===fixture.home&&awayId===fixture.away?suppliedScore:simulateFixture(homeId,awayId));
    state.round=Competitions.playedRounds(state.competition); syncRecord(state);
    score=fixture.score;
  } else {
    score=suppliedScore||simulateFixture(fixture.home,fixture.away); state.round++;
  }
  const g1=home?score.home:score.away, g2=home?score.away:score.home;
  if(state.version===1) {
    state.goals+=g1; state.against+=g2;
    if(g1>g2)state.wins++;else if(g1===g2)state.draws++;else state.losses++;
  }
  const names=AuraSquad.players(state).filter(x=>["DC","EI","ED","MCO","SD"].includes(x.pos));
  const scorers=matchDetails?matchDetails.goals.filter(g=>g.team===0).map(g=>g.name):Array.from({length:g1},()=>names[Math.floor(rand()*names.length)]?.name||"Jugador");
  state.history.unshift({round:state.round,season:state.season,rival:rival.id,home,g1,g2,scorers,...(matchDetails?{match:matchDetails}:{})});
  const reward=g1>g2?900000:g1===g2?400000:150000; state.budget+=reward;
  state.news.unshift((g1>g2?"¡Victoria! ":g1===g2?"Empate. ":"Derrota. ")+myClub().name+" "+g1+" - "+g2+" "+rival.name);
  state.news=state.news.slice(0,20);
  clubPlayers(state.club).forEach(p=>{p.form=clamp(p.form+(g1>g2?2:-2),55,100);if(rand()<.09&&p.age<27)p.overall=Math.min(p.potential,p.overall+1)});
  AuraSquad.afterMatch(state,g1>g2,g1===g2,matchDetails?.participants?.[0]);
  AuraProgression.afterMatch(state);
  AuraNegotiations.tick(state,clubs);
  AuraTour.afterRound(state,AuraSquad);
  save(); render();
  openModal("FINAL DEL PARTIDO",'<div class="score"><div class="eyebrow">'+competitionName()+' · JORNADA '+state.round+
    '</div><h2 style="font-size:62px;margin:20px 0">'+score.home+' — '+score.away+'</h2><h3>'+getClub(fixture.home).name+
    ' vs '+getClub(fixture.away).name+'</h3><p>Goleadores de tu club: '+(scorers.join(", ")||"Sin goles")+
    '</p><p class="accent">Ingresos por partido: '+money(reward)+'</p></div><button class="btn primary" id="continue">Continuar carrera →</button>');
  $("continue").onclick=()=>{closeModal();render()};
}
function rank(){return seasonTable().findIndex(c=>c.id===state.club)+1}
const nav=[["modes","Modos"],["home","Inicio"],["career","Carrera"],["squad","Plantilla"],["market","Mercado"],["calendar","Calendario"],["academy","Desarrollo"],["table","Clasificación"],["champions","Champions"],["tour","Premios"],["pro","Mi jugador"]];
function notify(msg){let el=$("toast");el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),3500)}
let modalReturnFocus=null;
function openModal(title,body){if($("modal").hidden)modalReturnFocus=document.activeElement;$("modal").hidden=false;$("modal").innerHTML='<section class="modal" role="dialog" aria-modal="true" aria-label="'+title+'"><div class="row spread"><h2>'+title+'</h2><button class="btn small" id="closemodal" aria-label="Cerrar ventana">✕</button></div>'+body+'</section>';$("closemodal").onclick=closeModal;$("closemodal").focus?.()}
function closeModal(){$("modal").hidden=true;$("modal").innerHTML="";modalReturnFocus?.focus?.();modalReturnFocus=null}
function card(title,body){return '<article class="card"><h3>'+title+'</h3>'+body+'</article>'}
function heading(title,desc){return '<div class="section-head"><div><span class="eyebrow">AURA FOOTBALL · '+(state?'TEMPORADA '+state.season:'NUEVA EXPERIENCIA')+'</span><h1>'+title+'</h1><p>'+desc+'</p></div></div>'}
function tableHtml(limit=Infinity){let arr=seasonTable().slice(0,limit);return '<div class="table-wrap"><table class="table"><thead><tr><th>POS</th><th>Club</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>DG</th><th>PTS</th></tr></thead><tbody>'+arr.map((x,i)=>'<tr class="'+(x.id===state.club?'highlight':'')+'"><td>'+(i+1)+'</td><td><span class="table-club">'+AuraEvolution.badge(x,23)+safeText(x.name)+'</span></td><td>'+x.p+'</td><td>'+x.w+'</td><td>'+x.d+'</td><td>'+x.l+'</td><td>'+x.gf+'</td><td>'+x.ga+'</td><td>'+(x.gf-x.ga)+'</td><td><strong>'+x.pts+'</strong></td></tr>').join("")+'</tbody></table></div>'}
function safeText(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function portrait(player){if(typeof AuraTourUI!=="undefined")return AuraTourUI.face(player);return player.photo&&/^https:\/\/cdn\.sofifa\.net\/players\/\d+\/\d+\/26_120\.png$/.test(player.photo)?
  '<img class="player-face" src="'+player.photo+'" alt="" loading="lazy" onerror="this.style.display=\'none\'">':
  '<span class="player-face placeholder">⚽</span>'}
function rosterHtml(players,actions=true){return '<div class="table-wrap"><table class="table"><thead><tr><th>Jugador</th><th>POS</th><th>Edad</th><th>GRL</th><th>POT</th><th>Valor</th>'+(actions?'<th>Acción</th>':'')+'</tr></thead><tbody>'+players.map(p=>'<tr><td><div class="face-name">'+portrait(p)+'<span>'+safeText(p.name)+'</span></div></td><td>'+safeText(p.pos)+'</td><td>'+p.age+'</td><td class="accent"><b>'+p.overall+'</b></td><td>'+p.potential+'</td><td>'+money(p.value)+'</td>'+(actions?'<td><button class="btn small" data-sell="'+safeText(p.id)+'">Vender</button></td>':'')+'</tr>').join("")+'</tbody></table></div>'}
function renderWelcome(){return AuraEvolution.welcome()}
function renderDashboard(){return AuraEvolution.dashboard()}
// Legacy save IDs are "<originClub>-<index>". Never replace signed players from other clubs.
function isGeneratedOriginal(player,clubId){
 const id=String(player?.id||"");
 return !player?.real&&!player?.academy&&id.startsWith(clubId+"-")&&
   /^\d+$/.test(id.slice(clubId.length+1));
}
function replaceableRosterPlayer(p,cid){return isGeneratedOriginal(p,cid)||(p.academy&&!p.regenOf&&!String(p.id).startsWith("pro:")&&p.source!=="Cantera generada de AURA")}
function realRosterCoverage(clubId){
 const roster=state?.rosters?.[clubId]||[];
 return {real:roster.filter(p=>p.real).length,generated:roster.filter(p=>isGeneratedOriginal(p,clubId)||p.academy).length};
}
function refreshRealRoster(){
 if(!state)return;
 let changed=0,renamed=0;
 for(const cid of Object.keys(state.rosters)){
   const current=state.rosters[cid]||[],base=getClub(cid);
   const real=AuraRosterSync.rosterFor(base);
   if(!real.length)continue;
   const accounted=Object.values(state.rosters).flat().concat(Object.values(state.departedPlayers||{}),Object.values(state.retiredPlayers||{}));
   const ownedIds=new Set(accounted.map(p=>p.id)),ownedNames=new Set(accounted.map(p=>AuraRosterSync.key(p)));
   const additions=real.filter(p=>!ownedIds.has(p.id)&&!ownedNames.has(AuraRosterSync.key(p)));
   let index=0;
   for(let i=0;i<current.length&&index<additions.length;i++){
     if(replaceableRosterPlayer(current[i],cid)){
       const added={...additions[index++],club:cid};
       current[i]=added;ownedIds.add(added.id);changed++;
     }
   }
   while(current.length<28&&index<additions.length){
     const added={...additions[index++],club:cid};
     current.push(added);ownedIds.add(added.id);changed++;
   }
   // Remaining unverified names should never masquerade as real footballers.
   let youthNumber=1;
   for(const p of current){
     if(isGeneratedOriginal(p,cid)){
       p.name="Canterano "+youthNumber++;
       p.academy=true;
       renamed++;
     }
   }
 }
 if(changed||renamed){
   state.news.unshift("Plantillas reales: "+changed+" futbolistas añadidos; "+renamed+" canteranos identificados.");
   state.news=state.news.slice(0,20);
   save();
 }
 const coverage=realRosterCoverage(state.club);
 notify(changed||renamed?
   "Plantilla actualizada: "+coverage.real+" jugadores reales en tu equipo.":
   "Sin cambios: "+coverage.real+" jugadores reales en tu equipo.");
 render();
}
function renderSquad(){return AuraCareerUI.renderSquad()}
function localMarketResults(){
 return marketResults();
}
function marketResults(){
  if(marketSearch.trim().length<2)return '<p class="save-info">Escribe al menos 2 letras del jugador o del club.</p>';
  const identity=p=>AuraRosterSync.key(p);
  const owned=new Set(clubPlayers(state.club).map(p=>p.id)),ownedNames=new Set(clubPlayers(state.club).map(identity)),seen=new Set(),q=AuraRosterSync.key(marketSearch);
  const existing=Object.entries(state.rosters).filter(([cid])=>cid!==state.club).flatMap(([,ps])=>ps)
    .filter(p=>AuraRosterSync.key(p.name).includes(q)||AuraRosterSync.key(getClub(p.club).name).includes(q));
  const retiredNames=new Set(Object.values(state.retiredPlayers||{}).map(identity));
  const matches=[...existing,...AuraRosterSync.search(marketSearch,50)]
    .filter(p=>{const key=identity(p);if(owned.has(p.id)||ownedNames.has(key)||seen.has(key)||retiredNames.has(key))return false;seen.add(key);return true})
    .slice(0,50).map(p=>findPlayer(p.id)?.p||p);
  if(!matches.length)return '<p class="save-info">No encontramos jugadores disponibles con ese nombre.</p>';
  return '<div class="table-wrap"><table class="table"><thead><tr><th>Jugador</th><th>Club</th><th>GRL</th><th>Valor</th><th>Negociar</th></tr></thead><tbody>'+
    matches.map(p=>'<tr><td><div class="face-name">'+portrait(p)+safeText(p.name)+'</div></td><td>'+safeText(clubs.find(c=>c.id===p.club)?.name||p.sourceClub||"Club de origen")+'</td><td class="accent">'+p.overall+'</td><td>'+money(p.value)+'</td><td><button class="btn small" data-buy="'+safeText(p.id)+'" '+(state.budget<=0?'disabled':'')+'>Negociar</button></td></tr>').join("")+'</tbody></table></div>';
}
function renderMarket(){
  const pool=Object.entries(state.rosters).filter(([cid])=>cid!==state.club).flatMap(([,ps])=>ps).sort((a,b)=>b.overall-a.overall);
  return heading("Mercado de fichajes","Presupuesto disponible: "+money(state.budget))+
    AuraCareerUI.transferHub()+'<div class="notice">Consulta → negociación con el club → contrato → firma. Los importes son de simulación; puedes pausar una llamada y retomarla aquí.</div>'+
    '<section class="card" style="margin:15px 0"><h3>BUSCADOR MUNDIAL DE JUGADORES</h3><label for="market-search">Nombre o club</label> <input id="market-search" type="search" placeholder="Ej. Lamine Yamal" value="'+safeText(marketSearch)+'" autocomplete="off"><div id="world-results" style="margin-top:12px">'+marketResults()+'</div></section>'+
    '<h3>Jugadores en las plantillas de tu competición</h3><div class="table-wrap"><table class="table"><thead><tr><th>Jugador</th><th>Club</th><th>POS</th><th>GRL</th><th>Valor</th><th>Acción</th></tr></thead><tbody>'+
    pool.slice(0,75).map(p=>'<tr><td><div class="face-name">'+portrait(p)+safeText(p.name)+'</div></td><td>'+safeText(getClub(p.club).name)+'</td><td>'+safeText(p.pos)+'</td><td class="accent">'+p.overall+'</td><td>'+money(p.value)+'</td><td><button class="btn small" data-buy="'+safeText(p.id)+'" '+(state.budget<=0?'disabled':'')+'>Negociar</button></td></tr>').join("")+'</tbody></table></div>';
}
function fixtureHtml(game) {
  const home=getClub(game.home),away=getClub(game.away);
  return '<div class="statline"><span>Jornada '+game.round+'</span><b class="fixture-versus"><span class="fixture-club">'+AuraEvolution.badge(home,22)+safeText(home.name)+'</span> '+
    (game.score?game.score.home+' — '+game.score.away:'vs')+' <span class="fixture-club">'+AuraEvolution.badge(away,22)+safeText(away.name)+'</span></b></div>';
}
function legacyNotice() {
  return state.version===1?'<div class="notice legacy-notice">Guardado anterior: se conserva tu temporada de exhibición y su progreso. Las tablas rivales son estimaciones. El calendario completo se activará en la próxima temporada.</div>':'';
}
function renderCalendar() {
  let played, future, league='';
  if(state.version===2) {
    const fixtures=state.competition.fixtures;
    const mine=fixtures.flat().filter(g=>g.home===state.club||g.away===state.club);
    played=mine.filter(g=>g.score).slice().reverse().map(fixtureHtml).join("");
    future=mine.filter(g=>!g.score).map(fixtureHtml).join("");
    const index=calendarRound===null?Math.max(0,state.round-1):calendarRound;
    league='<section class="card matchday"><div class="row spread"><h3>PARTIDOS DE LA COMPETICIÓN</h3><label for="calendar-round">Ver jornada <select id="calendar-round">'+
      fixtures.map((_,i)=>'<option value="'+i+'" '+(i===index?'selected':'')+'>'+(i+1)+'</option>').join("")+
      '</select></label></div>'+fixtures[index].map(fixtureHtml).join("")+'</section>';
  } else {
    played=state.history.map(h=>fixtureHtml({round:h.round,home:h.home?state.club:h.rival,away:h.home?h.rival:state.club,
      score:{home:h.home?h.g1:h.g2,away:h.home?h.g2:h.g1}})).join("");
    const others=legacyClubs.filter(c=>c.id!==state.club);
    future=Array.from({length:Math.max(0,totalRounds()-state.round)},(_,i)=>{
      const r=state.round+i,rival=others[r%others.length].id;
      return fixtureHtml({round:r+1,home:r%2===0?state.club:rival,away:r%2===0?rival:state.club});
    }).join("");
  }
  return heading("Calendario",competitionName()+" · "+state.round+" de "+totalRounds()+" jornadas jugadas")+legacyNotice()+league+
    '<div class="two-col">'+card("PARTIDOS DISPUTADOS",played||'<p>Todavía no hay resultados.</p>')+
    card("PRÓXIMOS PARTIDOS",future||'<p>La temporada ha terminado.</p>')+'</div><div class="row" style="margin-top:16px"><button class="btn primary" data-action="play">'+
    (state.round<totalRounds()?'Simular siguiente jornada →':'Ver cierre de temporada →')+'</button></div>';
}
function renderAcademy(){return AuraProgressionUI.render()}
function renderTable(){return heading("Clasificación",competitionName()+" · Jornada "+state.round)+legacyNotice()+tableHtml()+
  (state.version===2?'<p class="save-info">Resultados simulados de tu carrera. Desempates: '+
    (state.competition.tieBreak==='head-to-head'?'enfrentamientos directos completos, ':'')+
    'diferencia de goles y goles a favor. Igualdad total: orden estable por club.</p>':'')}
function findPlayer(id){
  if(state.retiredPlayers?.[id])return null;
  for(const [cid,players] of Object.entries(state.rosters)){let p=players.find(x=>x.id===id);if(p)return{p,cid}}
  if(state.departedPlayers?.[id]){const p=state.departedPlayers[id];return {p,cid:p.club,external:true}}
  const p=AuraRosterSync.getPlayer(id);
  return p?{p:{...p},cid:p.club,external:true}:null;
}
function buy(id){AuraCareerUI.start(id,"buy")}
function sell(id){AuraCareerUI.start(id,"sell")}
function train(id){const result=AuraProgression.train(state,id,"balanced");notify(result.error||result.message);save();render()}
function goToModes(){lobby=true;AuraEvolution.setMode("career");closeModal();render();window.scrollTo(0,0);}
function render(){
 AuraEvolution.stopPreview();const inLobby=lobby||!state,active=inLobby?"modes":screen;
 $("topnav").innerHTML=nav.map(([id,label])=>'<button class="'+(active===id?'active':'')+'" '+(active===id?'aria-current="page" ':'')+'data-nav="'+id+'">'+label+'</button>').join("");
 $("header-profile").innerHTML=state?'<strong>'+safeText(myClub().name)+'</strong>Jornada '+state.round+' · '+money(state.budget):'<strong>CLUB UPDATE 4.2</strong>Tu próxima gran historia';
 $("app").innerHTML=inLobby?(state?'<div class="resume-career"><span>Tu carrera sigue abierta.</span><button class="btn small" data-nav="career">Continuar carrera →</button></div>':'')+renderWelcome():({home:renderDashboard,career:renderDashboard,squad:renderSquad,market:renderMarket,calendar:renderCalendar,academy:renderAcademy,table:renderTable,champions:AuraContinental.render,tour:AuraTourUI.careerHub,pro:AuraTourUI.playerHub}[active]||renderDashboard)();
 AuraEvolution.afterRender();AuraTourUI.afterRender();
}
document.addEventListener("click",e=>{
  const t=e.target.closest("button");
  if(!t)return;
  if(AuraUTUI.handleClick(t))return;
  if(AuraTourUI.handleClick(t))return;
  if(AuraEvolution.handleClick(t))return;
  if(state&&AuraProgressionUI.handleClick(t))return;
  if(state&&AuraCareerUI.handleClick(t))return;
  if(t.dataset.nav==="modes"){goToModes();return;}
  if(t.dataset.nav){
    if(!state&&t.dataset.nav!=="home"){notify("Primero crea una carrera");return}
    lobby=false;screen=t.dataset.nav;render();window.scrollTo(0,0);
  }
  if((lobby||!state)&&t.dataset.competition){
    const definition=Competitions.getDefinition(t.dataset.competition);
    selectedCompetition=definition.id;
    if(!definition.clubIds.includes(selected))selected=definition.clubIds[0];
    render();
  }
  if((lobby||!state)&&t.dataset.pick){selected=t.dataset.pick;render()}
  if(t.dataset.buy)buy(t.dataset.buy);
  if(t.dataset.sell)sell(t.dataset.sell);
  if(t.dataset.train)train(t.dataset.train);
  if(t.dataset.action==="new"){
    if(state){
      openModal("Nueva carrera","<p>¿Empezar de cero? Se perderá el progreso de esta sesión. No se guarda automáticamente.</p><button id='confirmnew' class='btn danger'>Iniciar nueva carrera</button>");
      $("confirmnew").onclick=()=>{state=null;lobby=true;screen="home";selected="barcelona";selectedCompetition="laliga";calendarRound=null;AuraCareerUI.reset();AuraProgressionUI.reset();AuraTourUI.reset();closeModal();render()};
    }else document.querySelector(".competition-picker")?.scrollIntoView({behavior:"smooth"});
  }
  if(t.dataset.action==="start"){state=createGame(selected);lobby=false;AuraCareerUI.reset();AuraProgressionUI.reset();AuraSquad.ensure(state);AuraProgression.initialize(state);calendarRound=null;screen="career";save();render();window.scrollTo(0,0)}
  if(t.dataset.action==="play")AuraContinental.advance();
  if(t.dataset.action==="real-roster")refreshRealRoster();
});
document.addEventListener("input",e=>{
  AuraUTUI.input(e);
  AuraEvolution.input(e);
  if(state)AuraCareerUI.input(e);
  if(e.target.id==="market-search"&&state){
    marketSearch=String(e.target.value).slice(0,80);
    const results=$("world-results");if(results)results.innerHTML=marketResults();
  }
});
document.addEventListener("change",e=>{
  AuraUTUI.change(e);
  AuraTourUI.change(e);
  AuraEvolution.change(e);
  if(state)AuraCareerUI.change(e);
  if(state)AuraProgressionUI.change(e);
  if(e.target.id==="calendar-round"&&state?.version===2){
    const index=Number(e.target.value);
    if(Number.isInteger(index)&&index>=0&&index<totalRounds()){calendarRound=index;render()}
  }
});
$("modal").addEventListener("click",e=>{if(e.target===$("modal"))closeModal()});
document.addEventListener("submit",e=>AuraCareerUI.submit(e));
document.addEventListener("dragstart",e=>AuraCareerUI.dragStart(e));
document.addEventListener("dragover",e=>AuraCareerUI.dragOver(e));
document.addEventListener("drop",e=>AuraCareerUI.drop(e));
document.addEventListener("keydown",e=>{
  if(e.key==="Escape")closeModal();
  if(e.key==="Tab"&&!$("modal").hidden){
    const nodes=Array.from($("modal").querySelectorAll?.('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]')||[]),first=nodes[0],last=nodes[nodes.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}
  }
});
state=null;lobby=true;screen="home";selected="barcelona";selectedCompetition="laliga";AuraUTUI.bindRender(render);render();
if(typeof fetch==="function")World.load(clubs,Competitions.definitions,fetch).then(()=>{
  if(!state)render();
}).catch(()=>{if(!state)render()});

