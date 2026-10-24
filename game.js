
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
let state=null,screen="home",selected="barcelona",selectedCompetition="laliga",calendarRound=null,toastTimer,marketSearch="";
function seeded(seed){let t=seed>>>0;return()=>{t=(Math.imul(1664525,t)+1013904223)>>>0;return t/4294967296}}
function genPlayers(cid,seed,rating,count=18){
const rng=seeded(seed);return Array.from({length:count},(_,i)=>{let age=18+Math.floor(rng()*15),overall=clamp(rating-7+Math.floor(rng()*13)-(i>=11?4:0),58,93);
return {id:cid+"-"+i,name:first[Math.floor(rng()*first.length)]+" "+last[Math.floor(rng()*last.length)],pos:pos[i%pos.length],age,overall,potential:clamp(overall+Math.floor(rng()*10),overall,95),value:Math.round((overall*overall*overall/130)*(age<23?1.3:1)*100),wage:Math.round(overall*overall*0.9),club:cid,form:65+Math.floor(rng()*31)};})}
function starterRoster(cid,seed,rating){
 const c=getClub(cid);
 const world=World.rosterFor(cid).length?World.rosterFor(cid):World.matchRoster(c);
 const fixed=Real.rosterFor(c);
 const unique=new Map();
 for(const p of [...world,...fixed])if(!unique.has(p.name.toLowerCase()))unique.set(p.name.toLowerCase(),{...p,club:cid});
 const result=[...unique.values()].slice(0,28);
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
  return { version:2, club:id, season:2026, round:0, competition:Competitions.createSeason(definition,2026),
    worldSnapshot:definition.external?{definition:{...definition},clubs:definition.clubIds.map(cid=>({...getClub(cid)}))}:undefined,
    budget:c.budget, wins:0, draws:0, losses:0, goals:0, against:0, history:[], seasonHistory:[], rosters,
    news:["Bienvenido a "+c.name+". ¡Tu aventura comienza!"], savedAt:new Date().toISOString() };
}
function save(){if(!state)return;state.savedAt=new Date().toISOString();try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){notify("No se pudo guardar. Revisa el almacenamiento del navegador.")}}
function load() {
  try {
    const x = JSON.parse(localStorage.getItem(KEY));
    if(x?.worldSnapshot)World.registerSnapshot(x.worldSnapshot,clubs,Competitions.definitions);
    if (!x || ![1,2].includes(x.version) || !clubs.some(c=>c.id===x.club) || !x.rosters ||
        !Array.isArray(x.history) || !Array.isArray(x.news) || !Number.isInteger(x.round) || x.round<0) return null;
    if (x.version===1 && (!legacyClubs.some(c=>c.id===x.club) || x.round>LEGACY_ROUNDS)) return null;
    if (x.version===2) {
      if (!Competitions.validateSeason(x.competition) || x.competition.season!==x.season ||
          !x.competition.clubIds.includes(x.club) ||
          !x.competition.clubIds.every(id=>clubs.some(c=>c.id===id))) return null;
      x.round = Competitions.playedRounds(x.competition);
      syncRecord(x);
    }
    (x.version===1?legacyClubs.map(c=>c.id):x.competition.clubIds).forEach((cid,i)=>{
      if(!x.rosters[cid]){
        const c=getClub(cid);
        x.rosters[cid]=starterRoster(cid,(i+1)*84291,c.rating);
      }
    });
    return x;
  } catch { return null; }
}
function totalRounds(){return state.version===1?LEGACY_ROUNDS:state.competition.fixtures.length}
function competitionName(){return state.version===1?"Exhibición · guardado anterior":state.competition.name}
function syncRecord(game) {
  const row = Competitions.standings(game.competition).find(c=>c.id===game.club);
  game.wins=row.w; game.draws=row.d; game.losses=row.l; game.goals=row.gf; game.against=row.ga;
}
function getClub(id){return clubs.find(x=>x.id===id)||clubs[0]}
function myClub(){return getClub(state.club)}
function clubPlayers(id){return state.rosters[id]||[]}
function overall(id){let p=clubPlayers(id).slice().sort((a,b)=>b.overall-a.overall).slice(0,11);return p.length?Math.round(p.reduce((s,x)=>s+x.overall,0)/p.length):65}
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
  const difference=overall(homeId)-overall(awayId);
  return {home:poisson(clamp(1.53+difference*.067,.3,3.4)),
    away:poisson(clamp(1.22-difference*.067,.3,3.4))};
}
function startNextSeason(competitionId) {
  if(state.round<totalRounds()) return;
  const definition=Competitions.getDefinition(competitionId);
  if(!definition.clubIds.includes(state.club)) return;
  state.seasonHistory=state.seasonHistory||[];
  state.seasonHistory.push({season:state.season,competition:competitionName(),position:rank(),
    table:seasonTable(),history:state.history.slice()});
  state.season++; state.version=2; state.round=0;
  state.competition=Competitions.createSeason(definition,state.season);
  state.wins=state.draws=state.losses=state.goals=state.against=0;
  state.history=[]; state.budget+=12000000; calendarRound=null;
  state.news.unshift("Comienza la temporada "+state.season+" · "+definition.name);
  save(); closeModal(); render();
}
function playMatch() {
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
    Competitions.simulateNextRound(state.competition,simulateFixture);
    state.round=Competitions.playedRounds(state.competition); syncRecord(state);
    score=fixture.score;
  } else {
    score=simulateFixture(fixture.home,fixture.away); state.round++;
  }
  const g1=home?score.home:score.away, g2=home?score.away:score.home;
  if(state.version===1) {
    state.goals+=g1; state.against+=g2;
    if(g1>g2)state.wins++;else if(g1===g2)state.draws++;else state.losses++;
  }
  const names=clubPlayers(state.club).filter(x=>["DC","EI","ED","MCO"].includes(x.pos));
  const scorers=Array.from({length:g1},()=>names[Math.floor(rand()*names.length)]?.name||"Jugador");
  state.history.unshift({round:state.round,season:state.season,rival:rival.id,home,g1,g2,scorers});
  const reward=g1>g2?900000:g1===g2?400000:150000; state.budget+=reward;
  state.news.unshift((g1>g2?"¡Victoria! ":g1===g2?"Empate. ":"Derrota. ")+myClub().name+" "+g1+" - "+g2+" "+rival.name);
  state.news=state.news.slice(0,20);
  clubPlayers(state.club).forEach(p=>{p.form=clamp(p.form+(g1>g2?2:-2),55,100);if(rand()<.09&&p.age<27)p.overall=Math.min(p.potential,p.overall+1)});
  save(); render();
  openModal("FINAL DEL PARTIDO",'<div class="score"><div class="eyebrow">'+competitionName()+' · JORNADA '+state.round+
    '</div><h2 style="font-size:62px;margin:20px 0">'+score.home+' — '+score.away+'</h2><h3>'+getClub(fixture.home).name+
    ' vs '+getClub(fixture.away).name+'</h3><p>Goleadores de tu club: '+(scorers.join(", ")||"Sin goles")+
    '</p><p class="accent">Ingresos por partido: '+money(reward)+'</p></div><button class="btn primary" id="continue">Continuar carrera →</button>');
  $("continue").onclick=()=>{closeModal();render()};
}
function rank(){return seasonTable().findIndex(c=>c.id===state.club)+1}
const nav=[["home","Inicio"],["career","Carrera"],["squad","Plantilla"],["market","Mercado"],["calendar","Calendario"],["academy","Cantera"],["table","Clasificación"]];
function notify(msg){let el=$("toast");el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),3500)}
function openModal(title,body){$("modal").hidden=false;$("modal").innerHTML='<section class="modal" role="dialog" aria-modal="true" aria-label="'+title+'"><div class="row spread"><h2>'+title+'</h2><button class="btn small" id="closemodal">✕</button></div>'+body+'</section>';$("closemodal").onclick=closeModal}
function closeModal(){$("modal").hidden=true;$("modal").innerHTML=""}
function card(title,body){return '<article class="card"><h3>'+title+'</h3>'+body+'</article>'}
function heading(title,desc){return '<div class="section-head"><div><span class="eyebrow">AURA FOOTBALL · '+(state?'TEMPORADA '+state.season:'NUEVA EXPERIENCIA')+'</span><h1>'+title+'</h1><p>'+desc+'</p></div></div>'}
function tableHtml(limit=Infinity){let arr=seasonTable().slice(0,limit);return '<div class="table-wrap"><table class="table"><thead><tr><th>POS</th><th>Club</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>DG</th><th>PTS</th></tr></thead><tbody>'+arr.map((x,i)=>'<tr class="'+(x.id===state.club?'highlight':'')+'"><td>'+(i+1)+'</td><td>'+x.name+'</td><td>'+x.p+'</td><td>'+x.w+'</td><td>'+x.d+'</td><td>'+x.l+'</td><td>'+x.gf+'</td><td>'+x.ga+'</td><td>'+(x.gf-x.ga)+'</td><td><strong>'+x.pts+'</strong></td></tr>').join("")+'</tbody></table></div>'}
function safeText(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function portrait(player){return player.photo&&/^https:\/\/cdn\.sofifa\.net\/players\/\d+\/\d+\/26_120\.png$/.test(player.photo)?
  '<img class="player-face" src="'+player.photo+'" alt="" loading="lazy" onerror="this.style.display=\'none\'">':
  '<span class="player-face placeholder">⚽</span>'}
function rosterHtml(players,actions=true){return '<div class="table-wrap"><table class="table"><thead><tr><th>Jugador</th><th>POS</th><th>Edad</th><th>GRL</th><th>POT</th><th>Valor</th>'+(actions?'<th>Acción</th>':'')+'</tr></thead><tbody>'+players.map(p=>'<tr><td><div class="face-name">'+portrait(p)+'<span>'+safeText(p.name)+'</span></div></td><td>'+safeText(p.pos)+'</td><td>'+p.age+'</td><td class="accent"><b>'+p.overall+'</b></td><td>'+p.potential+'</td><td>'+money(p.value)+'</td>'+(actions?'<td><button class="btn small" data-sell="'+safeText(p.id)+'">Vender</button></td>':'')+'</tr>').join("")+'</tbody></table></div>'}
function renderWelcome() {
  const definition=Competitions.getDefinition(selectedCompetition);
  const entrants=definition.clubIds.map(getClub);
  return '<section class="hero"><span class="eyebrow">TU HISTORIA EMPIEZA AQUÍ</span><h1>EL FÚTBOL<br>ES TUYO.</h1><p>Construye una dinastía. Dirige tu club, descubre talentos, negocia fichajes y conquista la liga.</p><div class="hero-actions"><button class="btn primary" data-action="new">Nueva carrera →</button>'+
    (load()?'<button class="btn" data-action="load">Continuar carrera</button>':'')+'</div></section>'+
    '<span class="eyebrow">1.248 futbolistas reales guardados localmente</span>'+heading("ELIGE TU COMPETICIÓN","Ligas reales de la base externa (instantánea septiembre 2026) cuando hay conexión. Fichajes y presupuestos: simulación.")+
    (World.isLoaded()?'<p class="notice">'+World.getStats().leagues+' ligas y '+World.getStats().players+' jugadores cargados desde un catálogo externo. Fotos sujetas a disponibilidad del proveedor.</p>':
      '<p class="notice">Catálogo mundial: '+(World.getError()?'no disponible; puedes usar LaLiga o exhibición sin conexión.':'cargando ligas y plantillas...')+'</p>')+
    '<div class="competition-picker">'+Competitions.definitions.map(c=>'<button class="card card-link '+
      (selectedCompetition===c.id?'selected':'')+'" data-competition="'+c.id+'" aria-pressed="'+(selectedCompetition===c.id)+
      '"><span class="eyebrow">'+c.country+'</span><h3>'+c.name+'</h3><p>'+c.clubIds.length+' clubes · '+
      ((c.clubIds.length-1)*2)+' jornadas · ida y vuelta</p></button>').join("")+'</div>'+
    heading("ELIGE TU DESTINO",definition.name+(definition.referenceSeason?' · Clubes de referencia '+definition.referenceSeason:'')+
      ' · Calendario generado para tu carrera')+'<div class="club-picker">'+entrants.map(c=>'<button class="club-option '+
      (selected===c.id?'selected':'')+'" data-pick="'+c.id+'"><strong>'+c.name+'</strong><span>'+c.city+' · GRL '+c.rating+
      ' · '+money(c.budget)+'</span></button>').join("")+'</div><div class="row" style="margin-top:18px"><button class="btn primary" data-action="start">Comenzar con '+getClub(selected).name+' →</button></div>';
}
function renderDashboard(){let c=myClub(),op=nextOpponent(),fixture=nextFixture();return legacyNotice()+'<div class="dashboard"><section class="hero"><span class="eyebrow">'+competitionName()+'</span><h1>'+c.name+'</h1><p>Temporada '+state.season+' · Jornada '+Math.min(state.round+1,totalRounds())+'/'+totalRounds()+' · '+c.city+'</p><div class="row"><span class="pill">Posición '+rank()+'º</span><span class="pill">Puntos '+(state.wins*3+state.draws)+'</span><span class="pill">Presupuesto '+money(state.budget)+'</span></div><div class="hero-actions"><button class="btn primary" data-action="play">'+(op?'Simular siguiente jornada ⚽':'Ver cierre de temporada →')+'</button><button class="btn" data-nav="squad">Gestionar plantilla</button><button class="btn" data-action="new">Nueva carrera</button></div><p>'+(op?'Próximo rival: <strong>'+op.name+'</strong> · '+(fixture.home===state.club?'Local':'Visitante'):'Temporada completada')+'</p></section><section class="card"><h3>CLASIFICACIÓN</h3>'+tableHtml(6)+'</section></div><div class="grid" style="margin-top:15px">'+[['squad','⚽ PLANTILLA','Gestiona tu once y tus estrellas.'],['market','↔ MERCADO','Compra y vende futbolistas.'],['calendar','▦ CALENDARIO','Resultados de toda la jornada.'],['academy','★ CANTERA','Forma a tus futuras estrellas.']].map(x=>'<button class="card card-link" data-nav="'+x[0]+'"><h3>'+x[1]+'</h3><p>'+x[2]+'</p><span class="accent">Explorar →</span></button>').join("")+'</div>'+heading("Noticias del club","Lo último en tu carrera")+'<div class="stack">'+state.news.slice(0,4).map(n=>'<div class="notice">'+n+'</div>').join("")+'</div>'}
function refreshRealRoster(){
 if(!state)return;
 let changed=0;
 for(const cid of Object.keys(state.rosters)){
   const current=state.rosters[cid]||[];
   const base=getClub(cid),real=Real.rosterFor(base);
   if(!real.length)continue;
   const existing=new Set(current.filter(p=>!p.academy).map(p=>p.name.toLowerCase()));
   const replacements=real.filter(p=>!existing.has(p.name.toLowerCase()));
   let index=0;
   for(let i=0;i<current.length&&index<replacements.length;i++){
     if(current[i].academy || (/^[^:]+-\\d+$/.test(current[i].id)&&!current[i].real)){
       current[i]={...replacements[index++],club:cid};changed++;
     }
   }
   while(current.length<28&&index<replacements.length){current.push({...replacements[index++],club:cid});changed++}
 }
 if(changed){state.news.unshift("Plantillas actualizadas: "+changed+" futbolistas reales incorporados.");save()}
 notify(changed?changed+" futbolistas reales añadidos sin perder progreso.":"No hay sustituciones disponibles.");render();
}
function renderSquad(){let ps=clubPlayers(state.club).slice().sort((a,b)=>b.overall-a.overall);let eleven=ps.slice(0,11),rows=[eleven.slice(0,3),eleven.slice(3,6),eleven.slice(6,10),eleven.slice(10,11)];return heading("Plantilla","Valoración media "+overall(state.club)+" · "+ps.length+" jugadores")+
 '<div class="notice"><b>Futbolistas reales:</b> catálogo local de 1.248 convocados al Mundial 2026. Plantillas parciales y medias estimadas. <button class="btn small" data-action="real-roster">Actualizar jugadores reales</button></div>'+ '<div class="two-col"><div class="card"><h3>ONCE IDEAL · 4-3-3 (orientativo)</h3><div class="formation">'+rows.map(row=>'<div class="formation-row">'+row.map(p=>'<div class="player-dot"><b>'+p.overall+'</b><br>'+p.name.split(" ").pop()+'<br>'+p.pos+'</div>').join("")+'</div>').join("")+'</div></div><div>'+rosterHtml(ps)+'</div></div>'}
function localMarketResults(){
 const owned=new Set(Object.values(state.rosters).flat().map(p=>p.id));
 const ps=Real.search(marketSearch,50).filter(p=>!owned.has(p.id));
 if(!ps.length)return '<p class="save-info">No hay coincidencias en el catálogo local.</p>';
 return '<div class="table-wrap"><table class="table"><tbody>'+ps.map(p=>'<tr><td>'+safeText(p.name)+'</td><td>'+safeText(p.sourceClub)+'</td><td>'+p.overall+'</td><td><button class="btn small" data-buy="'+safeText(p.id)+'">Fichar</button></td></tr>').join("")+'</tbody></table></div>';
}
function marketResults(){
  if(!World.isLoaded())return '<p class="save-info">Puedes buscar futbolistas reales del catálogo local sin conexión.</p>'+localMarketResults();
  if(marketSearch.trim().length<2)return '<p class="save-info">Escribe al menos 2 letras del jugador o del club.</p>';
  const owned=new Set(Object.values(state.rosters).flat().map(p=>p.id));
  const matches=World.search(marketSearch,36).filter(p=>!owned.has(p.id));
  if(!matches.length)return '<p class="save-info">No encontramos jugadores disponibles con ese nombre.</p>';
  return '<div class="table-wrap"><table class="table"><thead><tr><th>Jugador</th><th>Club</th><th>GRL</th><th>Valor</th><th>Fichar</th></tr></thead><tbody>'+
    matches.map(p=>'<tr><td><div class="face-name">'+portrait(p)+safeText(p.name)+'</div></td><td>'+safeText(getClub(p.club).name)+'</td><td class="accent">'+p.overall+'</td><td>'+money(p.value)+'</td><td><button class="btn small" data-buy="'+p.id+'" '+(p.value>state.budget?'disabled':'')+'>Fichar</button></td></tr>').join("")+'</tbody></table></div>';
}
function renderMarket(){
  const pool=Object.entries(state.rosters).filter(([cid])=>cid!==state.club).flatMap(([,ps])=>ps).sort((a,b)=>b.overall-a.overall);
  return heading("Mercado de fichajes","Presupuesto disponible: "+money(state.budget))+
    '<div class="notice">Medias de la instantánea FC27 de septiembre de 2026, cuando están disponibles. Valores, sueldos y presupuestos son estimaciones ficticias.</div>'+
    '<section class="card" style="margin:15px 0"><h3>BUSCADOR MUNDIAL DE JUGADORES</h3><label for="market-search">Nombre o club</label> <input id="market-search" type="search" placeholder="Ej. Lamine Yamal" value="'+safeText(marketSearch)+'" autocomplete="off"><div id="world-results" style="margin-top:12px">'+marketResults()+'</div></section>'+
    '<h3>Jugadores en las plantillas de tu competición</h3><div class="table-wrap"><table class="table"><thead><tr><th>Jugador</th><th>Club</th><th>POS</th><th>GRL</th><th>Valor</th><th>Acción</th></tr></thead><tbody>'+
    pool.slice(0,75).map(p=>'<tr><td><div class="face-name">'+portrait(p)+safeText(p.name)+'</div></td><td>'+safeText(getClub(p.club).name)+'</td><td>'+safeText(p.pos)+'</td><td class="accent">'+p.overall+'</td><td>'+money(p.value)+'</td><td><button class="btn small" data-buy="'+safeText(p.id)+'" '+(p.value>state.budget?'disabled':'')+'>Fichar</button></td></tr>').join("")+'</tbody></table></div>';
}
function fixtureHtml(game) {
  return '<div class="statline"><span>Jornada '+game.round+'</span><b>'+getClub(game.home).name+' '+
    (game.score?game.score.home+' — '+game.score.away:'vs')+' '+getClub(game.away).name+'</b></div>';
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
function renderAcademy(){let youth=clubPlayers(state.club).filter(p=>p.age<=22).sort((a,b)=>b.potential-a.potential);return heading("Cantera y desarrollo","Entrena a tus promesas y aumenta sus medias")+'<div class="notice">El entrenamiento cuesta €150.000 y puede aumentar +1 GRL, sin superar el potencial.</div><div class="grid" style="margin-top:15px">'+youth.map(p=>'<div class="card"><span class="eyebrow">'+p.pos+' · '+p.age+' años</span><h3 style="margin-top:10px">'+p.name+'</h3><div class="big accent">'+p.overall+'</div><p>Potencial: <b>'+p.potential+'</b></p><button class="btn small" data-train="'+p.id+'" '+(p.overall>=p.potential||state.budget<150000?'disabled':'')+'>Entrenar €150.000</button></div>').join("")+'</div>'}
function renderTable(){return heading("Clasificación",competitionName()+" · Jornada "+state.round)+legacyNotice()+tableHtml()+
  (state.version===2?'<p class="save-info">Resultados simulados de tu carrera. Desempates: '+
    (state.competition.tieBreak==='head-to-head'?'enfrentamientos directos completos, ':'')+
    'diferencia de goles y goles a favor. Igualdad total: orden estable por club.</p>':'')}
function findPlayer(id){
  for(const [cid,players] of Object.entries(state.rosters)){let p=players.find(x=>x.id===id);if(p)return{p,cid}}
  const p=World.getPlayer(id)||Real.getPlayer(id);
  return p?{p:{...p},cid:p.club,external:true}:null;
}
function buy(id){let result=findPlayer(id);if(!result||result.cid===state.club)return;let {p,cid}=result;if(state.budget<p.value)return notify("No tienes presupuesto suficiente");if(clubPlayers(state.club).length>=28)return notify("Plantilla llena (máximo 28)");state.budget-=p.value;if(state.rosters[cid])state.rosters[cid]=state.rosters[cid].filter(x=>x.id!==p.id);p.club=state.club;state.rosters[state.club].push(p);state.news.unshift("Nuevo fichaje: "+p.name+" por "+money(p.value));save();notify("¡Fichaje confirmado! "+p.name);render()}
function sell(id){let result=findPlayer(id);if(!result||result.cid!==state.club)return;let {p}=result;if(clubPlayers(state.club).length<=11)return notify("Debes mantener al menos 11 jugadores");openModal("Confirmar venta",'<p>¿Vender a <b>'+p.name+'</b> por su valor de mercado de <strong>'+money(p.value)+'</strong>?</p><button class="btn danger" id="confirmsell">Confirmar venta</button>');$("confirmsell").onclick=()=>{state.rosters[state.club]=clubPlayers(state.club).filter(x=>x.id!==p.id);state.budget+=p.value;state.news.unshift("Venta confirmada: "+p.name+" por "+money(p.value));save();closeModal();notify("¡Jugador vendido!");render()}}
function train(id){let f=findPlayer(id);if(!f||f.cid!==state.club||state.budget<150000||f.p.overall>=f.p.potential)return;state.budget-=150000;f.p.overall++;state.news.unshift(f.p.name+" mejoró a "+f.p.overall+" de media");save();notify(f.p.name+" ganó +1 GRL");render()}
function render(){let active=state?screen:"home";$("topnav").innerHTML=nav.map(([id,label])=>'<button class="'+(active===id?'active':'')+'" data-nav="'+id+'">'+label+'</button>').join("");$("header-profile").innerHTML=state?'<strong>'+myClub().name+'</strong>Jornada '+state.round+' · '+money(state.budget):'<strong>AURA FC27</strong>Modo carrera';$("app").innerHTML=!state?renderWelcome():({home:renderDashboard,career:renderDashboard,squad:renderSquad,market:renderMarket,calendar:renderCalendar,academy:renderAcademy,table:renderTable}[active]||renderDashboard)();}
document.addEventListener("click",e=>{
  const t=e.target.closest("button");
  if(!t)return;
  if(t.dataset.nav){
    if(!state&&t.dataset.nav!=="home"){notify("Primero crea una carrera");return}
    screen=t.dataset.nav;render();window.scrollTo(0,0);
  }
  if(!state&&t.dataset.competition){
    const definition=Competitions.getDefinition(t.dataset.competition);
    selectedCompetition=definition.id;
    if(!definition.clubIds.includes(selected))selected=definition.clubIds[0];
    render();
  }
  if(!state&&t.dataset.pick){selected=t.dataset.pick;render()}
  if(t.dataset.buy)buy(t.dataset.buy);
  if(t.dataset.sell)sell(t.dataset.sell);
  if(t.dataset.train)train(t.dataset.train);
  if(t.dataset.action==="new"){
    if(state){
      openModal("Nueva carrera","<p>¿Empezar de nuevo? Se sustituirá el guardado anterior al comenzar la nueva carrera.</p><button id='confirmnew' class='btn danger'>Sí, empezar de nuevo</button>");
      $("confirmnew").onclick=()=>{state=null;calendarRound=null;closeModal();render()};
    }else document.querySelector(".competition-picker")?.scrollIntoView({behavior:"smooth"});
  }
  if(t.dataset.action==="start"){state=createGame(selected);calendarRound=null;screen="career";save();render();window.scrollTo(0,0)}
  if(t.dataset.action==="load"){state=load();if(state){screen="career";render()}else notify("No se encontró una partida guardada")}
  if(t.dataset.action==="play")playMatch();
  if(t.dataset.action==="real-roster")refreshRealRoster();
});
document.addEventListener("input",e=>{
  if(e.target.id==="market-search"&&state){
    marketSearch=String(e.target.value).slice(0,80);
    const results=$("world-results");if(results)results.innerHTML=marketResults();
  }
});
document.addEventListener("change",e=>{
  if(e.target.id==="calendar-round"&&state?.version===2){
    const index=Number(e.target.value);
    if(Number.isInteger(index)&&index>=0&&index<totalRounds()){calendarRound=index;render()}
  }
});
$("modal").addEventListener("click",e=>{if(e.target===$("modal"))closeModal()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});
state=load();screen=state?"career":"home";render();
if(typeof fetch==="function")World.load(clubs,Competitions.definitions,fetch).then(()=>{
  if(!state)render();
}).catch(()=>{if(!state)render()});
