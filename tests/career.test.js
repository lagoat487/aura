"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// A minimal DOM surface keeps these integration tests dependency-free.
// These checks exercise game wiring and HTML output, not browser layout.
function boot(saved, utUI = "ultimate-ui.js") {
  const nodes = new Map(), events = {}, storage = new Map();
  if (saved) storage.set("aura-fc27-save-v1", saved);
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, { innerHTML: "", hidden: true, value: "", onclick: null,
      addEventListener() {}, scrollIntoView() {}, classList: { add() {}, remove() {} } });
    return nodes.get(id);
  };
  const context = vm.createContext({
    document: { getElementById: node, addEventListener: (type, handler) => { events[type] = handler; }, querySelector: () => null },
    window: { scrollTo() {} },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    setTimeout() {}, clearTimeout() {},
  });
  for (const file of ["clubs.js", "competitions.js", "world.js", "real-players.js", "world-tour.js", "roster-sync.js", "club-badges.js", "portraits.js", "squad.js", "champions.js", "ultimate-team.js", "ultimate-save.js", "progression.js", "negotiations.js", "loans.js", "career-ui.js", "progression-ui.js", "match-engine.js", "match-presentation.js", "match-graphics.js", "match-ui.js", "mode-knockout.js", "quick-rivalry.js", "evolution-ui.js", "street.js", "street-circuit.js", "pro-training.js", "tour-ui.js", utUI, "argentina-event.js", "career-continental.js", "game.js"]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), context, { filename: file });
  }
  return {
    run: code => vm.runInContext(code, context),
    json: code => JSON.parse(vm.runInContext("JSON.stringify(" + code + ")", context)),
    html: () => node("app").innerHTML,
    node,
    click: dataset => events.click({ target: { closest: () => ({ dataset }) } }),
    change: (id, value) => events.change({ target: { id, value } }),
    submit: id => events.submit({ target: { id }, preventDefault() {} }),
    saved: () => storage.get("aura-fc27-save-v1"),
  };
}

test("World Tour adds four working lobby modes while preserving manager, quick match and draft",()=>{
 const app=boot();assert.equal((app.html().match(/data-evo-mode=/g)||[]).length,7);
 for(const [mode,label] of [["pro","TU NOMBRE. TU CAMINO."],["cup","EL MUNDO TE ESPERA."],["ultimate","TU CLUB. TUS CARTAS."],["street","LA CALLE TIENE SUS REGLAS."]]){app.click({evoMode:mode});assert.ok(app.html().includes(label));}
});
test("player career creation puts the protagonist in the XI and commits a locked match once",()=>{
 const app=boot();app.click({evoMode:"pro"});app.node("tour-pro-player").value="new";app.node("tour-pro-name").value="Emilio";app.node("tour-pro-pos").value="DC";app.click({tour:"start-pro"});
 assert.equal(app.run('clubPlayers(state.club).find(p=>p.id===state.playerCareer.playerId).name'),"Emilio");assert.ok(app.run('AuraSquad.ensure(state).xi.includes(state.playerCareer.playerId)'));
 app.run('AuraArena.preMatch=(home,away,options)=>{globalThis.pendingPro=options;globalThis.proTeam=home}');app.click({evo:"career-play"});assert.equal(app.run('pendingPro.playerLock'),app.run('state.playerCareer.playerId'));
 app.run('pendingPro.onFinish({home:2,away:0,goals:[{team:0,name:"Emilio"},{team:0,name:"Emilio"}],stats:[]})');assert.equal(app.run('state.playerCareer.appearances'),1);assert.equal(app.run('state.playerCareer.goals'),2);assert.equal(app.run('state.round'),1);
 const after=app.json('state');app.run('pendingPro.onFinish({home:2,away:0,goals:[],stats:[]})');assert.deepEqual(app.json('state'),after);
});
test("cup play commits the correct local and visiting score and cannot complete the same round twice",()=>{
 const app=boot();app.click({evoMode:"cup"});app.click({tour:"cup-create"});
 assert.equal(app.run('AuraTourUI.getCup().current.length'),16);const fixture=app.json('AuraTour.cupFixture(AuraTourUI.getCup())'),user=app.run('AuraTourUI.getCup().user');
 app.run('AuraArena.preMatch=(home,away,options)=>{globalThis.pendingCup=options}');app.click({tour:"cup-play"});app.run('pendingCup.onFinish({home:3,away:0})');
 const match=app.json('AuraTourUI.getCup().rounds[0].find(m=>m.home==='+JSON.stringify(user)+'||m.away==='+JSON.stringify(user)+')');assert.deepEqual(match.score,fixture.home===user?{home:3,away:0}:{home:0,away:3});assert.equal(match.winner,user);
 app.run('pendingCup.onFinish({home:3,away:0})');assert.equal(app.run('AuraTourUI.getCup().rounds.length'),1);
});
test("UT uses the selected XI, opening a pack spends session coins, and abandoning a match grants nothing",()=>{
 const app=boot();app.click({evoMode:"ultimate"});app.click({tour:"ut-create"});assert.equal(app.run('AuraTourUI.getUltimate().coins'),10000);app.click({tour:"ut-pack"});assert.ok(app.run('AuraTourUI.getUltimate().coins<=8100'));assert.equal(app.run('AuraTourUI.getUltimate().lastPack.length'),3);
 app.run('AuraArena.preMatch=(home,away,options)=>{globalThis.pendingUT=options;globalThis.utTeam=home}');const before=app.run('AuraTourUI.getUltimate().coins');app.click({tour:"ut-play"});assert.equal(app.run('AuraTourUI.getUltimate().coins'),before);assert.deepEqual(app.json('utTeam.players.map(p=>p.id)'),app.json('AuraTourUI.getUltimate().xi'));
 app.run('pendingUT.onFinish({home:1,away:0})');assert.equal(app.run('AuraTourUI.getUltimate().coins'),before+1200);app.run('pendingUT.onFinish({home:1,away:0})');assert.equal(app.run('AuraTourUI.getUltimate().coins'),before+1200);
});
for(const runtime of ['ultimate-ui.js','ultimate-ui-61.js'])test('UT onboarding accepts whitespace names and prepares a match with a valid named club: '+runtime,()=>{
 for(const name of ['   ','\u00a0 \t']){
  const app=boot(undefined,runtime);app.click({evoMode:'ultimate'});app.node('ut-club-name').value=name;app.click({ut:'create'});
  const club=app.json('AuraUTUI.getClub()');assert.equal(club.name,'Mi AURA FC');assert.equal(club.owned.length,23);assert.equal(club.coins,10000);
  assert.equal(app.run('AuraUTSave.validClub(AuraUTUI.getClub(),new Set(Object.keys(AuraSquad.formations)))'),true);
  assert.match(app.html(),/<h1>Mi AURA FC<\/h1>/);
  app.run('AuraArena.preMatch=(home,away,options)=>{globalThis.namedUTHome=home;globalThis.namedUTMatch=options}');
  app.click({utTab:'play'});app.click({ut:'play',opponent:'betis'});
  assert.equal(app.run('namedUTHome.name'),'Mi AURA FC');assert.deepEqual(app.json('namedUTHome.players.map(p=>p.id)'),club.xi);
  assert.deepEqual(app.json('AuraUTUI.getClub()'),club,'preparing a match must preserve the new club and its balance');
 }
});

test("Kitu is in Barcelona SC and the market finds his nickname; retirees stay retired after a roster refresh",()=>{
 const app=boot();app.click({competition:"exhibition"});app.click({pick:"boca"});app.click({action:"start"});app.run('marketSearch="Kitu"');assert.match(app.run('marketResults()'),/Kitu/);
 assert.equal(app.run('clubPlayers("guayaquil").find(p=>p.id===AuraTour.kitu.id).name'),"Damián ‘Kitu’ Díaz");
 app.run('globalThis.retiring=clubPlayers(state.club).find(p=>p.real);retiring.age=44;AuraTour.rollover(state);refreshRealRoster()');assert.ok(app.run('!Object.values(state.rosters).flat().some(p=>p.id===retiring.id)'));
 app.run('marketSearch=retiring.name');assert.ok(!app.run('marketResults()').includes('data-buy="'+app.run('retiring.id')+'"'));
});

test("roster refresh preserves the career protagonist, scouted youths and regenerated players",()=>{
 const app=boot();app.click({evoMode:"pro"});app.click({tour:"start-pro"});
 app.run('globalThis.proId=state.playerCareer.playerId;globalThis.youth={...clubPlayers(state.club)[0],id:"academy:scouted",name:"Mi canterano",real:false,academy:true,source:"Cantera generada de AURA"};globalThis.regen={...youth,id:"regen:test",regenOf:"Veterano",source:"Reencarnación"};state.rosters[state.club]=[...clubPlayers(state.club).slice(0,15),clubPlayers(state.club).find(p=>p.id===proId),youth,regen];refreshRealRoster()');
 assert.ok(app.run('clubPlayers(state.club).some(p=>p.id===proId)'));assert.ok(app.run('clubPlayers(state.club).some(p=>p.id===youth.id)'));assert.ok(app.run('clubPlayers(state.club).some(p=>p.id===regen.id)'));
});

test("mode hub returns from UT and preserves both the existing career and the UT collection",()=>{
 const app=boot();app.click({action:'start'});app.click({action:'play'});const career=app.json('state');
 app.click({nav:'modes'});assert.equal(app.run('lobby'),true);assert.match(app.html(),/Continuar carrera/);app.click({evoMode:'ultimate'});app.click({ut:'create'});app.click({ut:'pack',pack:'gold'});app.click({ut:'reveal-skip'});const ut=app.json('AuraUTUI.getClub()');
 app.click({ut:'lobby'});assert.equal((app.html().match(/data-evo-mode=/g)||[]).length,7);app.click({nav:'career'});assert.equal(app.run('lobby'),false);assert.deepEqual(app.json('state'),career);app.click({nav:'modes'});app.click({evoMode:'ultimate'});assert.deepEqual(app.json('AuraUTUI.getClub()'),ut);
});
test("Champions fixtures are interleaved with the same career, use its XI, and never advance the domestic table",async()=>{
 const app=boot();app.run(fs.readFileSync(path.join(__dirname,'..','data/world-rosters.js'),'utf8'));await app.run('World.load(clubs,Competitions.definitions)');app.click({action:'start'});
 assert.equal(app.run('state.champions.entrants.length'),36);assert.equal(app.run('AuraContinental.next(state).kind'),'league');app.click({action:'play'});app.click({action:'play'});assert.equal(app.run('state.round'),2);assert.equal(app.run('AuraContinental.next(state).kind'),'champions');
 const domestic=app.json('state.competition'),budget=app.run('state.budget');app.run('AuraArena.preMatch=(home,away,options)=>{globalThis.pendingEurope=options;globalThis.europeTeam=home}');app.click({evo:'career-play'});
 assert.deepEqual(app.json('europeTeam.players.map(p=>p.id)'),app.json('AuraSquad.ensure(state).xi'));app.run('pendingEurope.onFinish({home:2,away:1,goals:[],participants:[europeTeam.players.map(p=>p.id)],stats:[]})');assert.equal(app.run('state.round'),2);assert.deepEqual(app.json('state.competition'),domestic);assert.equal(app.run('state.continentalHistory.length'),1);assert.equal(app.run('state.budget'),budget+1500000);assert.equal(app.run('AuraContinental.next(state).kind'),'league');
 const after=app.json('state');app.run('pendingEurope.onFinish({home:2,away:1,goals:[],stats:[]})');assert.deepEqual(app.json('state'),after);app.click({nav:'champions'});assert.match(app.html(),/36 clubes/);assert.match(app.html(),/FASE LIGA/);
});

test('career call-ups exclude injured reserves and restore their availability after recovery without replacing the chosen XI',()=>{
 const app=boot();app.click({action:'start'});
 app.run('globalThis.injured=clubPlayers(state.club).slice().sort((a,b)=>b.overall-a.overall)[0];injured.injuryRounds=2;AuraSquad.ensure(state);globalThis.beforeCall=JSON.stringify(state);globalThis.callup=AuraArena.team(getClub(state.club),state)');
 const id=app.run('injured.id');assert.ok(!app.json('callup.players.map(p=>p.id)').includes(id));assert.ok(!app.json('callup.bench.map(p=>p.id)').includes(id),'a medically unavailable player must not be offered as a substitute');
 assert.ok(app.run('callup.bench.length>0&&callup.bench.every(p=>!(p.injuryRounds>0))'));assert.equal(app.run('JSON.stringify(state)'),app.run('beforeCall'));
 const xi=app.json('state.squad.xi');app.run('injured.injuryRounds=0;globalThis.recoveredCall=AuraArena.team(getClub(state.club),state)');
 assert.ok(app.json('recoveredCall.bench.map(p=>p.id)').includes(id),'a recovered reserve must be available again');assert.deepEqual(app.json('state.squad.xi'),xi);assert.equal(app.run('injured.injuryRounds'),0);
});

test('Champions preparation excludes injured substitutes without changing the career roster or calendar',async()=>{
 const app=boot();app.run(fs.readFileSync(path.join(__dirname,'..','data/world-rosters.js'),'utf8'));await app.run('World.load(clubs,Competitions.definitions)');app.click({action:'start'});app.click({action:'play'});app.click({action:'play'});
 assert.equal(app.run('AuraContinental.next(state).kind'),'champions');
 app.run('globalThis.injured=clubPlayers(state.club).slice().sort((a,b)=>b.overall-a.overall)[0];injured.injuryRounds=3;AuraSquad.ensure(state);AuraArena.preMatch=(home,away,options)=>{globalThis.europeCall=home}');
 const before=app.json('state'),id=app.run('injured.id');app.click({evo:'career-play'});
 assert.ok(!app.json('europeCall.players.concat(europeCall.bench).map(p=>p.id)').includes(id));assert.ok(app.run('europeCall.bench.length>0&&europeCall.bench.every(p=>!(p.injuryRounds>0))'));
 assert.deepEqual(app.json('state'),before,'preparing the match must not delete a player, advance recovery or change the calendar');
});

test('career bench keeps the strongest healthy reserve keeper and allows a match-only keeper substitution',()=>{
 const app=boot();app.click({action:'start'});
 app.run('globalThis.keptXI=AuraSquad.ensure(state).xi.slice();state.rosters[state.club]=keptXI.map(id=>clubPlayers(state.club).find(p=>p.id===id)).concat(Array.from({length:10},(_,i)=>({id:"reserve:field:"+i,name:"Reserve field "+i,pos:"MC",overall:80+i,real:false})),[{id:"reserve:keeper",name:"Healthy keeper",pos:"POR",overall:70,real:false},{id:"reserve:second-keeper",name:"Second keeper",pos:"POR",overall:65,real:false},{id:"reserve:injured-keeper",name:"Injured keeper",pos:"POR",overall:99,injuryRounds:2,real:false}]);AuraSquad.ensure(state);globalThis.beforeKeeperCall=JSON.stringify(state);globalThis.keeperCall=AuraArena.team(getClub(state.club),state)');
 const bench=app.json('keeperCall.bench');assert.equal(bench.length,9);assert.equal(bench.filter(p=>p.pos==='POR').length,1,'a full bench must keep keeper cover');
 assert.ok(bench.some(p=>p.id==='reserve:keeper'));assert.ok(!bench.some(p=>p.id==='reserve:injured-keeper'||p.id==='reserve:second-keeper'));
 assert.equal(bench.filter(p=>p.pos!=='POR').length,8);assert.ok(bench.filter(p=>p.pos!=='POR').every(p=>p.overall>=82),'retain the eight strongest outfield reserves');
 app.run('globalThis.keeperGame=AuraMatch.create({home:keeperCall,away:{...keeperCall,id:"opponent",players:keeperCall.players.map(p=>({...p,id:"opponent:"+p.id})),bench:[]},seconds:30,seed:31});keeperGame.paused=true');
 assert.equal(app.run('AuraMatch.substitute(keeperGame,0,keeperGame.benches[0].find(p=>p.id==="reserve:keeper"))'),true);assert.equal(app.run('keeperGame.players[0].id'),'reserve:keeper');
 assert.deepEqual(app.json('state.squad.xi'),app.json('keptXI'));assert.equal(app.run('JSON.stringify(state)'),app.run('beforeKeeperCall'),'the source career squad must not change');
});

test('arena call-ups keep empty and short benches and never invent an unavailable reserve keeper',()=>{
 const app=boot();
 app.run('globalThis.shortXI=AuraSquad.formations["4-3-3"].map(([pos],i)=>({id:"short:"+i,name:"Short "+i,pos,overall:80,real:false}))');
 for(const [extras,count,keepers] of [[[],0,0],[[{id:'short:keeper',name:'Reserve keeper',pos:'POR',overall:65,real:false}],1,1],[Array.from({length:10},(_,i)=>({id:'short:extra:'+i,name:'Extra '+i,pos:'MC',overall:81+i,real:false})),9,0]]){
  app.run('globalThis.shortRoster=shortXI.concat('+JSON.stringify(extras)+');globalThis.beforeShort=JSON.stringify(shortRoster);globalThis.shortCall=AuraArena.team(getClub("barcelona"),null,shortRoster)');
  assert.equal(app.run('shortCall.bench.length'),count);assert.equal(app.run('shortCall.bench.filter(p=>p.pos==="POR").length'),keepers);assert.equal(app.run('JSON.stringify(shortRoster)'),app.run('beforeShort'));
 }
});

test("player career can be created at a club with 28 real players without deleting a footballer",()=>{
 const app=boot();app.click({action:'start'});app.run('while(clubPlayers(state.club).length<28){const p={...clubPlayers(state.club)[1],id:"extra:"+clubPlayers(state.club).length};clubPlayers(state.club).push(p);}globalThis.initialIds=clubPlayers(state.club).map(p=>p.id);AuraTour.startPlayer(state,"new","Mi delantero","DC");AuraTourUI.ensurePro()');
 assert.equal(app.run('clubPlayers(state.club).length'),29);assert.ok(app.run('initialIds.every(id=>clubPlayers(state.club).some(p=>p.id===id))'));assert.ok(app.run('AuraSquad.ensure(state).xi.includes(state.playerCareer.playerId)'));assert.equal(app.run('state.squadLimit'),29);
});
test("a full interleaved season completes Champions before rollover and records the continental result",async()=>{
 const app=boot();app.run(fs.readFileSync(path.join(__dirname,'..','data/world-rosters.js'),'utf8'));await app.run('World.load(clubs,Competitions.definitions)');app.click({action:'start'});
 app.run('for(let guard=0;guard<70;guard++){if(state.round>=totalRounds()&&state.champions.champion)break;AuraContinental.advance();}');assert.equal(app.run('state.round'),38);assert.ok(app.run('state.champions.champion'));assert.equal(app.run('state.champions.rounds.flatMap(r=>r.matches).length'),189);
 const ownChampion=app.run('state.champions.champion');app.run('startNextSeason(state.competition.id)');assert.equal(app.run('state.season'),2027);assert.equal(app.run('state.round'),0);assert.equal(app.run('state.seasonHistory[0].champion'),ownChampion);
});

test("new career selects a real league and advances all ten fixtures with one action", () => {
  const app = boot();app.click({evoMode:"career"});
  assert.match(app.html(), /ELIGE TU COMPETICIÓN/);
  assert.equal((app.html().match(/data-pick=/g) || []).length, 20);
  app.click({ action: "start" });
  assert.equal(app.run("state.version"), 2);
  assert.equal(app.run("state.competition.id"), "laliga");
  app.click({ action: "play" });
  assert.equal(app.run("state.round"), 1);
  assert.equal(app.run("state.history.length"), 1);
  assert.ok(app.run("seasonTable().every(row=>row.p===1)"));
  assert.equal(app.run("state.competition.fixtures[0].filter(g=>g.score).length"), 10);
  assert.match(app.node("modal").innerHTML, /FINAL DEL PARTIDO/);
  const ownMatch=app.json("state.competition.fixtures[0].find(g=>g.home===state.club||g.away===state.club)");
  const ownResult=app.json("state.history[0]");
  assert.equal(ownResult.home, ownMatch.home === "barcelona");
  assert.equal(ownResult.g1, ownResult.home ? ownMatch.score.home : ownMatch.score.away);
  assert.equal(ownResult.g2, ownResult.home ? ownMatch.score.away : ownMatch.score.home);
  assert.ok(app.node("modal").innerHTML.includes(ownMatch.score.home+' — '+ownMatch.score.away));
  app.click({ nav: "calendar" });
  assert.match(app.html(), /PARTIDOS DE LA COMPETICIÓN/);
  app.click({ nav: "table" });
  assert.equal((app.html().match(/<tr class=/g) || []).length, 20);
  assert.equal(app.saved(), undefined);
  const reopened=boot();
  assert.equal(reopened.run("state"),null);
  assert.equal(reopened.run('AuraEvolution.getMode().mode'),"hub");
   reopened.click({evoMode:"career"});assert.match(reopened.html(),/Iniciar nueva carrera/);
});

test("exhibition keeps the original 24 clubs and rejects cross-league careers", () => {
  const app = boot();app.click({evoMode:"career"});
  assert.throws(() => app.run('createGame("boca","laliga")'), /no pertenece/);
  app.click({ competition: "exhibition" });
  assert.equal((app.html().match(/data-pick=/g) || []).length, 24);
  app.click({ pick: "boca" }); app.click({ action: "start" });
  assert.equal(app.run("totalRounds()"), 46);
  app.click({ action: "play" });
  assert.equal(app.run("state.competition.fixtures[0].filter(g=>g.score).length"), 12);
  app.click({ action: "new" });
  app.node("confirmnew").onclick();
  app.click({ competition: "laliga" });
  assert.notEqual(app.run("selected"), "boca");
  app.click({ action: "start" });
  assert.ok(app.run("state.competition.clubIds.includes(state.club)"));
});

test("season end cannot simulate or reward another match; rollover ages squads, creates regens and keeps budget", () => {
  const app = boot(); app.click({ action: "start" });
  app.run("for(let i=0;i<38;i++)playMatch()");
  const old = app.json("state"), oldTable = app.json("seasonTable()");
  assert.equal(app.run("nextOpponent()"), null);
  assert.match(app.html(), /Temporada completada/i);
  app.click({ action: "play" });
  assert.deepEqual(app.json("state"), old);
  assert.match(app.node("modal").innerHTML, /Campeón/);
  app.node("newseason").onclick();
  assert.equal(app.run("state.season"), 2027);
  assert.equal(app.run("state.round"), 0);
  assert.equal(app.run("state.budget"), old.budget + 12000000);
  const updated=app.json("state.rosters");
  for(const [cid,players] of Object.entries(old.rosters)){
    assert.equal(updated[cid].length,players.length);
    for(const player of players){const next=updated[cid].find(p=>p.id===player.id);if(next)assert.equal(next.age,player.age+1);else assert.ok(updated[cid].some(p=>p.regenOf===player.name&&p.age===17));}
  }
  assert.deepEqual(app.json("state.seasonHistory[0].table"), oldTable);
  assert.ok(app.run("seasonTable().every(row=>row.p===0&&row.pts===0)"));
  assert.ok(app.run("Competitions.validateSeason(state.competition)"));
});

test("no automatic progress saves, and always opens new career",()=>{
 const app=boot();app.click({action:"start"});app.click({action:"play"});
 assert.equal(app.saved(),undefined);
 const reopened=boot();
 assert.equal(reopened.run("state"),null);
 assert.equal(reopened.run('AuraEvolution.getMode().mode'),"hub");
   reopened.click({evoMode:"career"});assert.match(reopened.html(),/Iniciar nueva carrera/);
});
test("Barcelona starts with actual real names, including Yamal and Pedri",()=>{
 const app=boot();app.click({action:"start"});
 const players=app.json("state.rosters.barcelona");
 assert.ok(players.some(p=>p.real&&p.name==="Lamine Yamal"));
 assert.ok(players.some(p=>p.real&&p.name==="Pedri"));
 assert.ok(players.every(p=>p.real||p.academy));
});
test("market search includes rival-club footballers and excludes the manager's own squad",()=>{
 const app=boot();app.click({action:"start"});
 app.run('marketSearch="Mbapp"');
 assert.match(app.run("marketResults()"),/Kylian Mbappé/);
 const own=app.run('clubPlayers(state.club).find(p=>p.name==="Pedri").id');
 app.run('marketSearch="Pedri"');
 assert.ok(!app.run("marketResults()").includes('data-buy="'+own+'"'));
});
test("old fictional first XI is replaced with real footballers without losing results and budget", () => {
  const app=boot();
  app.click({action:"start"});
  app.run('state.rosters.barcelona=genPlayers("barcelona",84291,87);state.round=0;state.budget=23456789;save()');
  const oldNames=app.json("state.rosters.barcelona.map(p=>p.name)");
  assert.ok(oldNames.includes("Rafael García") || oldNames.length===18);
  const oldBudget=app.run("state.budget");
  app.click({nav:"squad"});
  assert.match(app.html(),/PONER JUGADORES REALES EN MI PLANTILLA/);
  app.click({action:"real-roster"});
  const names=app.json("state.rosters.barcelona.map(p=>p.name)");
  assert.ok(names.some(n=>n.includes("Yamal")));
  assert.ok(names.some(n=>n.includes("Pedri")));
  assert.equal(app.run("state.budget"),oldBudget);
  assert.equal(app.run("state.round"),0);
  assert.equal(app.saved(),undefined);
  assert.equal(boot().run("state"),null);
});

test("a manually played score advances the whole league exactly once and keeps match statistics",()=>{
 const app=boot();app.click({action:"start"});
 const fixture=app.json("nextFixture()"),detail={played3D:true,goals:[{team:0,name:"Pedri",minute:22}],stats:[{shots:7},{shots:3}]};
 app.run('playMatch({home:3,away:1},'+JSON.stringify(detail)+')');
 assert.equal(app.run("state.round"),1);assert.ok(app.run("seasonTable().every(c=>c.p===1)"));
 const played=app.json("state.competition.fixtures[0].find(g=>g.id==="+JSON.stringify(fixture.id)+")");
 assert.deepEqual(played.score,{home:3,away:1});
 assert.equal(app.run("state.history[0].match.played3D"),true);
 assert.equal(app.run("state.history[0].g1"),fixture.home==="barcelona"?3:1);
 const old=app.json("state");assert.throws(()=>app.run('playMatch({home:NaN,away:1})'),/inválido/);assert.deepEqual(app.json("state"),old);
});

test("Draft XI chooses eleven distinct footballers with five offers per slot and produces a playable eleven",()=>{
 const app=boot();app.click({evoMode:"draft"});app.click({evo:"draft-new"});
 for(let i=0;i<11;i++){
   assert.equal(app.run('document.getElementById("app").innerHTML.includes("data-draft-pick")'),true);
   assert.equal((app.html().match(/data-draft-pick=/g)||[]).length,5);
   app.click({draftPick:"0"});
 }
 assert.match(app.html(),/TU ONCE ESTÁ LISTO/);
 assert.equal((app.html().match(/class="draft-slot filled"/g)||[]).length,11);
 assert.ok(app.run('AuraEvolution.pool().length>500'));
 app.run('AuraArena.preMatch=(home)=>{globalThis.chosenDraft=home}');app.click({evo:"draft-play"});
 const chosen=app.json("chosenDraft.players");assert.equal(chosen.length,11);assert.equal(new Set(chosen.map(p=>p.id)).size,11);
});

test("bundled catalogue loads without the network, gives real ages, and does not duplicate Barça footballers",async()=>{
 const app=boot();app.run(fs.readFileSync(path.join(__dirname,"..","data/world-rosters.js"),"utf8"));
 const stats=await app.run("World.load(clubs,Competitions.definitions)");
 assert.equal(stats.clubs,739);assert.equal(stats.players,19423);assert.equal(stats.leagues,49);
 app.click({action:"start"});
 const roster=app.json("clubPlayers(state.club)");
 assert.ok(roster.find(p=>p.name==="Lamine Yamal").age<22);
 assert.equal(roster.filter(p=>p.name==="Pau Cubarsí").length,1);
 assert.equal(roster.filter(p=>p.name==="Jules Koundé").length,1);
 assert.ok(roster.find(p=>p.name==="Hamza Abdelkarim").overall<75);
 app.run('marketSearch="Pedri"');assert.equal(app.run('World.search("Pedri",60).filter(p=>p.name==="Pedri").some(p=>marketResults().includes(\'data-buy="\'+p.id+\'"\'))'),false);
});

test("opening or abandoning a playable match leaves the career unchanged and completion cannot commit twice",()=>{
 const app=boot();app.click({action:"start"});const before=app.json("state");
 app.run('AuraArena.preMatch=(home,away,options)=>{globalThis.pendingMatch=options}');
 app.click({evo:"career-play"});assert.deepEqual(app.json("state"),before);
 app.run('pendingMatch.onFinish({home:2,away:1,goals:[{team:0,name:"Pedri",minute:10},{team:0,name:"Pedri",minute:31}],stats:[{shots:4},{shots:2}]})');
 assert.equal(app.run("state.round"),1);const finished=app.json("state");
 app.run('pendingMatch.onFinish({home:2,away:1,goals:[],stats:[]})');assert.deepEqual(app.json("state"),finished);
});

test("career substitutions keep slot ratings and credit both starter and substitute appearances",()=>{
 const app=boot();app.click({action:"start"});
 app.run('globalThis.homeTeam=AuraArena.team(myClub(),state);globalThis.matchGame=AuraMatch.create({home:homeTeam,away:AuraArena.team(getClub("madrid"),state)});globalThis.sub=homeTeam.bench.find(p=>p.pos!=="POR");globalThis.outId=matchGame.players[9].id;');
 assert.equal(app.run("sub.slotRatings.length"),11);
 app.run('matchGame.paused=true;');
 assert.equal(app.run('AuraMatch.substitute(matchGame,9,{id:sub.id})'),true);
 assert.equal(app.run('matchGame.players[9].overall'),app.run('sub.slotRatings[9]'));
 app.run('AuraArena.preMatch=(home,away,options)=>{globalThis.pendingMatch=options}');app.click({evo:"career-play"});
 app.run('matchGame.phase="finished";pendingMatch.onFinish(AuraMatch.result(matchGame))');
 assert.equal(app.run('clubPlayers(state.club).find(p=>p.id===outId).appearances'),1);
 assert.equal(app.run('clubPlayers(state.club).find(p=>p.id===sub.id).appearances'),1);
 assert.equal(app.run('state.history[0].match.participants[0].length'),12);
 assert.equal(app.run('state.progression.training.round'),1);
});

test("new careers, quick teams, roster preview and market share current memberships",async()=>{
 const app=boot();app.run(fs.readFileSync(path.join(__dirname,"..","data/world-rosters.js"),"utf8"));
 await app.run("World.load(clubs,Competitions.definitions)");app.run("render()");
 app.click({evo:"view-roster",club:"barcelona"});
 assert.match(app.node("modal").innerHTML,/Gabriel Jesus/);
 assert.doesNotMatch(app.node("modal").innerHTML,/Ronald Ara/);
 app.click({action:"start"});
 assert.equal(app.run("clubPlayers(state.club).length"),27);
 assert.equal(app.run('clubPlayers(state.club).some(p=>p.name.includes("Araújo"))'),false);
 assert.equal(app.run('AuraArena.team(getClub("liverpool")).players.concat(AuraArena.team(getClub("liverpool")).bench).filter(p=>p.name==="Ronald Araújo").length'),1);
 app.run('marketSearch="araujo"');
 assert.match(app.run("marketResults()"),/Ronald Araújo/);
 assert.match(app.run("marketResults()"),/Liverpool/);
 assert.equal(app.run('AuraEvolution.pool().filter(p=>p.name==="Ronald Araújo").length'),1);
 const names=app.json('clubPlayers(state.club).map(p=>p.name)');
 app.click({action:"real-roster"});
 assert.deepEqual(app.json('clubPlayers(state.club).map(p=>p.name)'),names);
 app.run('globalThis.sold=clubPlayers(state.club).find(p=>p.name==="Rodri");state.departedPlayers={[sold.id]:{...sold,club:"outside-league"}};state.rosters[state.club]=clubPlayers(state.club).filter(p=>p.id!==sold.id)');
 app.click({action:"real-roster"});
 assert.equal(app.run('clubPlayers(state.club).some(p=>p.id===sold.id)'),false);
});


test('UT duplicate inspection sells the selected transferable copy while preserving its untradeable starter',()=>{
 const app=boot();app.click({evoMode:'ultimate'});app.click({ut:'create'});
 app.run('globalThis.utClub=AuraUTUI.getClub();globalThis.original=utClub.owned.find(p=>p.id===utClub.xi[0]);original.tradeable=false;utClub.duplicates.push({...original,uid:"duplicate:inspection",duplicate:true,tradeable:true});');
 const before=app.json('utClub.owned'),xi=app.json('utClub.xi'),coins=app.run('utClub.coins');app.click({utTab:'club'});
 assert.match(app.html(),/data-ut="inspect" data-player="duplicate:inspection" data-duplicate="yes"/);
 app.click({ut:'inspect',player:'duplicate:inspection',duplicate:'yes'});
 assert.match(app.node('modal').innerHTML,/Transferible/);assert.match(app.node('modal').innerHTML,/data-ut="sell" data-player="duplicate:inspection" data-duplicate="yes"/);
 app.click({ut:'sell',player:'duplicate:inspection',duplicate:'yes'});assert.equal(app.run('utClub.duplicates.length'),0);assert.ok(app.run('utClub.coins')>coins);assert.deepEqual(app.json('utClub.owned'),before);assert.deepEqual(app.json('utClub.xi'),xi);
});
test('UT untradeable duplicate cannot expose a sell action for its transferable original',()=>{
 const app=boot();app.click({evoMode:'ultimate'});app.click({ut:'create'});
 app.run('globalThis.utClub=AuraUTUI.getClub();globalThis.original=utClub.owned.find(p=>!utClub.xi.includes(p.id));original.tradeable=true;utClub.duplicates.push({...original,uid:"duplicate:locked",duplicate:true,tradeable:false});');
 app.click({ut:'inspect',player:'duplicate:locked',duplicate:'yes'});assert.match(app.node('modal').innerHTML,/Intransferible/);assert.doesNotMatch(app.node('modal').innerHTML,/data-ut="sell"|data-ut="buy"/);
 const before=app.json('utClub');app.click({ut:'sell',player:'duplicate:locked',duplicate:'yes'});assert.deepEqual(app.json('utClub'),before);
});

test('UT latest-pack cards inspect and sell the duplicate copy rather than its original',()=>{
 const app=boot();app.click({evoMode:'ultimate'});app.click({ut:'create'});
 app.run('globalThis.utClub=AuraUTUI.getClub();globalThis.original=utClub.owned.find(p=>p.id===utClub.xi[0]);original.tradeable=false;globalThis.copy={...original,uid:"duplicate:last-pack",duplicate:true,tradeable:true};utClub.duplicates.push({...copy});utClub.lastPack=[{...copy}];');
 const originals=app.json('utClub.owned'),xi=app.json('utClub.xi');app.click({utTab:'home'});
 assert.match(app.html(),/data-ut="inspect" data-player="duplicate:last-pack" data-duplicate="yes"/);
 app.click({ut:'inspect',player:'duplicate:last-pack',duplicate:'yes'});assert.match(app.node('modal').innerHTML,/Repetido · Transferible/);assert.match(app.node('modal').innerHTML,/data-ut="sell" data-player="duplicate:last-pack" data-duplicate="yes"/);
 app.click({ut:'sell',player:'duplicate:last-pack',duplicate:'yes'});assert.equal(app.run('utClub.duplicates.length'),0);assert.deepEqual(app.json('utClub.owned'),originals);assert.deepEqual(app.json('utClub.xi'),xi);
 const after=app.json('utClub');app.click({ut:'inspect',player:'duplicate:last-pack',duplicate:'yes'});assert.deepEqual(app.json('utClub'),after);
});

test('UT DCP releases a selected reserve after moving it into the starting XI',()=>{
 const app=boot();app.click({evoMode:'ultimate'});app.click({ut:'create'});app.run('globalThis.utClub=AuraUTUI.getClub();globalThis.selectedCard=AuraUT.sbcPool(utClub,"gold")[0];');
 app.click({utSbc:'gold'});app.click({utTab:'sbc'});app.click({ut:'sbc-pick',uid:app.run('selectedCard.uid')});assert.match(app.html(),/1\/3 cartas/);
 const coins=app.run('utClub.coins'),owned=app.json('utClub.owned');app.click({utTab:'squad'});app.click({ut:'pick',slot:'9'});app.click({ut:'choose',player:app.run('selectedCard.id')});assert.ok(app.run('utClub.xi.includes(selectedCard.id)'));
 app.click({utTab:'sbc'});assert.match(app.html(),/0\/3 cartas/,'an unavailable starter must not occupy a hidden selection slot');assert.equal(app.run('utClub.coins'),coins);assert.deepEqual(app.json('utClub.owned'),owned);
 const eligible=app.json('AuraUT.sbcPool(utClub,"gold").sort((a,b)=>b.overall-a.overall).slice(0,3).map(p=>p.uid)');for(const uid of eligible)app.click({ut:'sbc-pick',uid});assert.match(app.html(),/3\/3 cartas/);app.click({ut:'sbc-review'});assert.match(app.node('modal').innerHTML,/data-ut="sbc-confirm"/);
});
test('UT DCP drops a sold selected card without changing the remaining club on return',()=>{
 const app=boot();app.click({evoMode:'ultimate'});app.click({ut:'create'});app.run('globalThis.utClub=AuraUTUI.getClub();globalThis.selectedCard=AuraUT.sbcPool(utClub,"gold")[0];utClub.owned.find(p=>p.id===selectedCard.id).tradeable=true;');
 app.click({utSbc:'gold'});app.click({utTab:'sbc'});app.click({ut:'sbc-pick',uid:app.run('selectedCard.uid')});app.run('globalThis.otherCard=AuraUT.sbcPool(utClub,"gold").find(p=>p.uid!==selectedCard.uid)');app.click({ut:'sbc-pick',uid:app.run('otherCard.uid')});app.click({utTab:'club'});app.click({ut:'sell',player:app.run('selectedCard.id')});const after=app.json('utClub');
 app.click({utTab:'sbc'});assert.match(app.html(),/1\/3 cartas/,'the remaining eligible card stays selected');assert.deepEqual(app.json('utClub'),after);assert.ok(app.run('!AuraUT.sbcPool(utClub,"gold").some(p=>p.uid===selectedCard.uid)'));
});

for(const runtime of ['ultimate-ui.js','ultimate-ui-61.js'])test('UT DCP shows selected cards, disables full-capacity additions and allows replacement before delivery: '+runtime,()=>{
 const app=boot(undefined,runtime);app.click({evoMode:'ultimate'});app.click({ut:'create'});app.click({utSbc:'gold'});app.click({utTab:'sbc'});
 const before=app.json('AuraUTUI.getClub()'),cards=app.json('AuraUT.sbcPool(AuraUTUI.getClub(),"gold").sort((a,b)=>b.overall-a.overall).slice(0,4)');assert.equal(cards.length,4);
 const tag=uid=>[...app.html().matchAll(/<button\b[^>]*data-ut="sbc-pick"[^>]*>/g)].map(m=>m[0]).find(t=>t.includes('data-uid="'+uid+'"'));
 for(const p of cards)assert.doesNotMatch(tag(p.uid),/\bdisabled\b/);
 for(const p of cards.slice(0,3))app.click({ut:'sbc-pick',uid:p.uid});
 assert.match(app.html(),/3\/3 cartas/);assert.match(tag(cards[3].uid),/\bdisabled\b/,'unselected cards must stop inviting clicks at full capacity');
 assert.match(app.html(),/Cupo completo\. Desmarca una carta/);assert.equal((app.html().match(/Seleccionada · /g)||[]).length,3);
 for(const p of cards.slice(0,3)){assert.match(tag(p.uid),/aria-pressed="true"/);assert.doesNotMatch(tag(p.uid),/\bdisabled\b/,'selected cards must remain available for deselection');}
 assert.match(tag(cards[3].uid),/aria-pressed="false"/);assert.match(tag(cards[3].uid),/\bdisabled\b/);
 app.click({ut:'sbc-pick',uid:cards[3].uid});assert.match(app.html(),/3\/3 cartas/);assert.match(tag(cards[3].uid),/aria-pressed="false"/);
 app.click({ut:'sbc-pick',uid:cards[0].uid});assert.match(app.html(),/2\/3 cartas/);assert.doesNotMatch(app.html(),/Cupo completo\. Desmarca una carta/);assert.match(tag(cards[0].uid),/aria-pressed="false"/);assert.doesNotMatch(tag(cards[3].uid),/\bdisabled\b/);
 app.click({ut:'sbc-pick',uid:cards[3].uid});assert.match(tag(cards[3].uid),/aria-pressed="true"/);assert.match(tag(cards[0].uid),/\bdisabled\b/);
 assert.deepEqual(app.json('AuraUTUI.getClub()'),before,'editing delivery selections must not consume cards or coins');
 app.click({ut:'sbc-review'});assert.match(app.node('modal').innerHTML,/data-ut="sbc-confirm"/);assert.equal((app.node('modal').innerHTML.match(/class="ut-card /g)||[]).length,3);
 app.click({ut:'sbc-confirm'});const after=app.json('AuraUTUI.getClub()');assert.equal(after.sbcs,before.sbcs+1);assert.equal(after.coins,before.coins);assert.deepEqual(after.xi,before.xi);
 assert.deepEqual(after.owned.find(p=>p.id===cards[0].id),before.owned.find(p=>p.id===cards[0].id),'the deselected card must stay in the club');
 assert.equal(after.lastPack.length,3);app.click({ut:'sbc-confirm'});assert.deepEqual(app.json('AuraUTUI.getClub()'),after,'a stale confirmation must not deliver another reward');
});

test('UT market offers every squad position and filters and buys real wide midfielders',async()=>{
 const app=boot();app.run(fs.readFileSync(path.join(__dirname,'..','data/world-rosters.js'),'utf8'));
 await app.run('World.load(clubs,Competitions.definitions)');app.click({evoMode:'ultimate'});app.click({ut:'create'});app.click({utTab:'market'});
 const options=app.html().match(/<select id="ut-market-position">([\s\S]*?)<\/select>/)[1];
 const positions=app.json('[...new Set([...Object.values(AuraSquad.formations).flat().map(slot=>slot[0]),...AuraUTUI.pool().map(p=>p.pos)])]');
 for(const pos of positions)assert.ok(options.includes('value="'+pos+'"'),'missing market position: '+pos);
 app.run('globalThis.utClub=AuraUTUI.getClub()');const xi=app.json('utClub.xi');
 for(const pos of ['MI','MD']){
  app.change('ut-market-position',pos);assert.match(app.html(),new RegExp('value="'+pos+'" selected'));
  const ids=[...app.html().matchAll(/data-ut="buy" data-player="([^"]+)"/g)].map(m=>m[1]);assert.ok(ids.length>0,'real market candidates for '+pos);
  for(const id of ids)assert.equal(app.run('AuraUTUI.pool().find(p=>p.id==='+JSON.stringify(id)+').pos'),pos);
  const id=ids[0],coins=app.run('utClub.coins'),price=app.run('AuraUT.price(AuraUTUI.pool().find(p=>p.id==='+JSON.stringify(id)+'))');assert.ok(coins>=price);
  app.click({ut:'buy',player:id});assert.equal(app.run('utClub.coins'),coins-price);assert.ok(app.run('utClub.owned.some(p=>p.id==='+JSON.stringify(id)+')'));assert.deepEqual(app.json('utClub.xi'),xi);
  assert.ok(!app.html().includes('data-ut="buy" data-player="'+id+'"'),'purchased card leaves the market');
 }
});

test('imported South American league names cannot create Champions fixtures or continental rewards',async()=>{
 const app=boot();app.run(fs.readFileSync(path.join(__dirname,'..','data/world-rosters.js'),'utf8'));
 await app.run('World.load(clubs,Competitions.definitions)');
 const positions=['GK','LB','CB','CB','RB','CDM','CM','CM','LW','ST','RW'],leagues=['Brasileirão Serie A','LigaPro Serie A','Argentina Superliga'];
 const rows=leagues.flatMap((league,n)=>[0,1].flatMap(team=>positions.map((position,i)=>({
  player_id:String(900000+n*100+team*11+i),common_name:'Imported player '+n+' '+team+' '+i,overall_rating:'85',position,
  club:'Imported club '+n+' '+team,league,gender:"Men's Football",birthdate:'2000-01-01',nationality:'Brazil',
 }))));
 app.run('World.integrate(World.build('+JSON.stringify(rows)+',clubs,Competitions.definitions),clubs,Competitions.definitions)');
 for(const name of leagues){
  const definition=app.json('Competitions.definitions.find(d=>d.name==='+JSON.stringify(name)+')'),own=definition.clubIds[0];
  assert.equal(definition.country,'Mundo','the importer has no declared country for this league name');
  app.click({competition:definition.id});app.click({pick:own});app.click({action:'start'});
  assert.equal(app.run('state.champions'),null,name);assert.match(app.run('state.championsReason'),/europea/);
  assert.equal(app.run('state.budget'),app.run('getClub(state.club).budget'));const xi=app.json('AuraSquad.ensure(state).xi');
  assert.equal(app.run('AuraContinental.next(state).kind'),'league');app.click({action:'play'});
  assert.equal(app.run('state.round'),1);assert.equal(app.run('state.history.length'),1);assert.deepEqual(app.json('state.continentalHistory'),[]);assert.deepEqual(app.json('AuraSquad.ensure(state).xi'),xi);
  app.click({action:'play'});app.run('startNextSeason(state.competition.id)');
  assert.equal(app.run('state.season'),2027);assert.equal(app.run('state.champions'),null);assert.deepEqual(app.json('state.seasonHistory[0].continentalHistory'),[]);assert.deepEqual(app.json('state.continentalHistory'),[]);assert.equal(app.saved(),undefined);
  app.click({nav:'modes'});
 }
});

test('bundled European leagues and legacy aliases remain eligible without duplicate continental clubs',async()=>{
 const app=boot();app.run(fs.readFileSync(path.join(__dirname,'..','data/world-rosters.js'),'utf8'));
 await app.run('World.load(clubs,Competitions.definitions)');
 app.run('globalThis.continentalCandidates=AuraChampions.candidates(clubs,Competitions.definitions,c=>World.matchingClub(c))');
 const keys=app.json('continentalCandidates.map(c=>World.matchingClub(c)?.id||c.id)');assert.equal(new Set(keys).size,keys.length);
 for(const name of ['Trendyol Süper Lig','1A Pro League','Hellas Liga','Scottish Premiership','Česká Liga','Ukrayina Liha','Liga Hrvatska','Brack Super League','Ö. Bundesliga','Liga Cyprus','Ekstraklasa','Allsvenskan','Eliteserien','SUPERLIGA']){
  const ids=app.json('Competitions.definitions.find(d=>d.name==='+JSON.stringify(name)+').clubIds');assert.ok(ids.length>0);
  for(const id of ids)assert.ok(keys.includes(id),name+' / '+id);
 }
 assert.equal(app.run('continentalCandidates.some(c=>c.gender==="women")'),false);
 app.click({action:'start'});assert.equal(app.run('state.champions.entrants.length'),36);
 assert.equal(app.run('state.champions.entrants.filter(c=>(World.matchingClub(c)?.id||c.id)===(World.matchingClub(getClub(state.club))?.id||state.club)).length'),1);
});

test('UT highest division stops promising another promotion and preserves match rewards',()=>{
 const app=boot();app.click({evoMode:'ultimate'});app.click({ut:'create'});app.click({utTab:'play'});app.click({utMode:'divisions'});
 app.run('globalThis.utClub=AuraUTUI.getClub();AuraArena.preMatch=(home,away,options)=>{globalThis.pendingDivision=options}');
 assert.match(app.html(),/0 \/ 9 puntos para ascender/);
 const initialCoins=app.run('utClub.coins'),xi=app.json('utClub.xi');
 for(let i=0;i<27;i++){app.click({ut:'play',opponent:'madrid'});app.run('pendingDivision.onFinish({home:1,away:0})');}
 assert.equal(app.run('utClub.division'),1);assert.equal(app.run('utClub.divisionPoints'),0);assert.equal(app.run('utClub.coins'),initialCoins+27*1200+9*1500);
 assert.match(app.html(),/División máxima alcanzada/);assert.doesNotMatch(app.html(),/puntos para ascender/);
 for(let i=0;i<3;i++){app.click({ut:'play',opponent:'madrid'});app.run('pendingDivision.onFinish({home:1,away:0})');}
 assert.equal(app.run('utClub.division'),1);assert.equal(app.run('utClub.divisionPoints'),9);assert.equal(app.run('utClub.coins'),initialCoins+30*1200+9*1500);assert.match(app.html(),/9 puntos en División 1/);assert.deepEqual(app.json('utClub.xi'),xi);
});

test('career Champions calendar labels the final as a single match before and after completion',async()=>{
 const app=boot();app.run(fs.readFileSync(path.join(__dirname,'..','data/world-rosters.js'),'utf8'));await app.run('World.load(clubs,Competitions.definitions)');app.click({action:'start'});
 app.run('globalThis.europeSim=(h,a)=>({home:a===state.club?0:3,away:a===state.club?3:0});for(let guard=0;guard<20&&AuraChampions.next(state.champions)?.stage!=="final";guard++)AuraChampions.advance(state.champions,europeSim)');
 assert.equal(app.run('AuraChampions.next(state.champions).stage'),'final');
 for(const completed of [false,true]){
  if(completed)app.run('AuraChampions.advance(state.champions,europeSim)');
  app.click({nav:'champions'});assert.ok(app.html().includes('Final · Partido único'),'the final must not be advertised as a first leg');assert.doesNotMatch(app.html(),/Final · (Ida|Vuelta)/);assert.match(app.html(),/Semifinal · Ida/);assert.match(app.html(),/Semifinal · Vuelta/);
 }
 assert.equal(app.run('state.champions.rounds.filter(r=>r.stage==="final").length'),1);
});

test('career Champions calendar retains shootout results for a return leg and the single final without changing career state',async()=>{
 const app=boot();app.run(fs.readFileSync(path.join(__dirname,'..','data/world-rosters.js'),'utf8'));await app.run('World.load(clubs,Competitions.definitions)');app.click({action:'start'});
 app.run('globalThis.europeBase=JSON.stringify(state);globalThis.europeWinnerSim=(h,a)=>({home:a===state.club?0:3,away:a===state.club?3:0})');
 for(const stage of ['semi','final']){
  app.run('state=JSON.parse(europeBase);for(let guard=0;guard<20;guard++){const r=AuraChampions.next(state.champions);if(r?.stage==='+JSON.stringify(stage)+'&&(r.stage==="final"||r.leg===2))break;AuraChampions.advance(state.champions,europeWinnerSim)}');
  assert.equal(app.run('AuraChampions.next(state.champions).stage'),stage);
  app.run('state.round=Math.floor(AuraChampions.next(state.champions).due*totalRounds()/38);globalThis.shootoutFixture={...AuraChampions.fixture(state.champions)}');
  app.click({nav:'champions'});assert.doesNotMatch(app.html(),/Penaltis:/,'pending fixtures must not invent a shootout');
  const score=stage==='final'?{home:1,away:1}:app.run('shootoutFixture.home===state.club')?{home:0,away:3}:{home:3,away:0};
  app.run('AuraContinental.advance('+JSON.stringify(score)+')');
  const played=app.json('state.champions.rounds.flatMap(r=>r.matches).find(m=>m.id===shootoutFixture.id)');assert.ok(played.penalties);assert.notEqual(played.penalties.home,played.penalties.away);
  const text='Penaltis: '+played.penalties.home+' — '+played.penalties.away;
  assert.ok(app.node('modal').innerHTML.includes(text),'the result dialog already records the shootout');app.node('continue').onclick();
  const before=app.json('state');app.click({nav:'champions'});
  const label=stage==='final'?'Final · Partido único':'Semifinal · Vuelta',start=app.html().indexOf('<div class="statline"><span>'+label+'</span>');assert.ok(start>=0);
  const row=app.html().slice(start,app.html().indexOf('</div>',start)+6);
  assert.ok(row.includes('<small>'+text+'</small>'),'the career calendar must preserve the same home-away shootout score');
  assert.ok(row.includes(played.score.home+' — '+played.score.away));assert.ok(row.includes('Global '+played.aggregate.home+' — '+played.aggregate.away));
  app.click({nav:'champions'});assert.deepEqual(app.json('state'),before,'viewing shootouts must not change budgets, fixtures, rewards or the XI');
 }
});

test('UT match preparation does not put another edition of a starter on the bench',()=>{
 const app=boot();app.click({evoMode:'ultimate'});app.click({ut:'create'});
 app.run('globalThis.utClub=AuraUTUI.getClub();globalThis.starter=utClub.owned.find(p=>p.id===utClub.xi[9]);utClub.owned.unshift({...starter,id:"event:starter",originalId:starter.id,overall:90});globalThis.reserve=utClub.owned.find(p=>!utClub.xi.includes(p.id)&&!p.originalId);utClub.owned.unshift({...reserve,id:"event:reserve",originalId:reserve.id,overall:89});AuraArena.preMatch=(home,away,options)=>{globalThis.preparedUT=home}');
 const before=app.json('utClub');app.click({ut:'play',opponent:'madrid'});
 const people=app.json('preparedUT.players.concat(preparedUT.bench).map(p=>p.originalId||p.id)');assert.equal(new Set(people).size,people.length,'the match squad must contain one edition per footballer');assert.ok(app.run('preparedUT.bench.length>0'));assert.deepEqual(app.json('utClub'),before);
});

test('UT market ignores surrounding search whitespace and keeps blank searches on the default catalogue',async()=>{
 const app=boot();app.run(fs.readFileSync(path.join(__dirname,'..','data/world-rosters.js'),'utf8'));await app.run('World.load(clubs,Competitions.definitions)');app.click({evoMode:'ultimate'});app.click({ut:'create'});app.click({utTab:'market'});
 const before=app.json('AuraUTUI.getClub()');
 const search=value=>{app.run('AuraUTUI.input({target:{id:"ut-market-query",value:'+JSON.stringify(value)+'}})');return app.node('ut-market-results').innerHTML;};
 const clean=search('Pedri');assert.match(clean,/Pedri/);assert.equal(search('  Pedri  '),clean);
 const empty=search('');assert.equal(search('   '),empty,'spaces alone must not bypass the default rating range');assert.deepEqual(app.json('AuraUTUI.getClub()'),before);
});

for(const runtime of ['ultimate-ui.js','ultimate-ui-61.js'])test('UT player search tolerates quote styles and repeated spaces in the market and owned cards: '+runtime,async()=>{
 const app=boot(undefined,runtime);app.run(fs.readFileSync(path.join(__dirname,'..','data/world-rosters.js'),'utf8'));await app.run('World.load(clubs,Competitions.definitions)');
 app.click({evoMode:'ultimate'});app.click({ut:'create'});app.run('AuraUTUI.getClub().coins=100000');
 const initial=app.json('AuraUTUI.getClub()'),cases=[
  ['verified:kitu-diaz',['Kitu Diaz','‘Kitu’ Díaz','"Kitu"  Díaz',' Kitu\u00a0\u00a0Diaz ']],
  ['real:215914',['N’Golo Kanté',"N'Golo Kante",'NʼGolo   Kante',' NGolo\u00a0\u00a0Kanté ']],
 ];
 const search=(field,value)=>{
  app.run('AuraUTUI.input({target:{id:'+JSON.stringify('ut-'+field+'-query')+',value:'+JSON.stringify(value)+'}})');
  return app.node('ut-'+field+'-results').innerHTML;
 };
 for(const [id,queries] of cases){
  assert.ok(!initial.owned.some(p=>p.id===id));app.click({utTab:'market'});
  for(const query of queries)assert.ok(search('market',query).includes('data-ut="buy" data-player="'+id+'"'),query+' must find the existing market card');
  const coins=app.run('AuraUTUI.getClub().coins'),price=app.run('AuraUT.marketPrice(AuraUTUI.getClub(),AuraUTUI.pool().find(p=>p.id==='+JSON.stringify(id)+'))');
  app.click({ut:'buy',player:id});assert.equal(app.run('AuraUTUI.getClub().coins'),coins-price);
  assert.ok(!app.html().includes('data-ut="buy" data-player="'+id+'"'),'buying still removes the card from market results');
  app.click({utTab:'club'});const owned=app.json('AuraUTUI.getClub()');
  for(const query of queries)assert.ok(search('club',query).includes('data-player="'+id+'"'),query+' must find the purchased card');
  assert.deepEqual(app.json('AuraUTUI.getClub()'),owned,'search must preserve the card identity, name, portrait, rating and balance');
 }
 const after=app.json('AuraUTUI.getClub()');assert.equal(after.purchases,initial.purchases+2);assert.deepEqual(after.xi,initial.xi);
 assert.doesNotMatch(search('club','NoSuchPlayerForSearch'),/data-player=/);
 assert.equal((search('club','').match(/data-ut="inspect"/g)||[]).length,after.owned.length);assert.deepEqual(app.json('AuraUTUI.getClub()'),after);
});

test('the new Gavi SBC links with catalogue Pedri by club and country on the UT squad screen',async()=>{
 const app=boot();app.run(fs.readFileSync(path.join(__dirname,'..','data/world-rosters.js'),'utf8'));await app.run('World.load(clubs,Competitions.definitions)');
 app.click({evoMode:'ultimate'});app.click({ut:'create'});
 app.run('globalThis.utChem=AuraUTUI.getClub();utChem.owned=AuraSquad.formations[utChem.formation].map(([pos],i)=>({id:"chem-fixture:"+i,name:"Fixture "+i,pos,overall:75,real:false,club:"fixture:"+i,leagueId:"fixture:"+i,nationality:"Fixture "+i}));utChem.owned[6]=AuraUT.sbcRewardCard("cantera",AuraUTUI.pool());utChem.owned[7]={...AuraUTUI.pool().find(p=>p.id==="real:251854")};utChem.xi=utChem.owned.map(p=>p.id)');
 const before=app.json('utChem');app.click({utTab:'squad'});
 assert.equal(app.run('AuraUT.chemistry(utChem).players[6]'),2,'Gavi should share Pedri\'s club and nationality links');assert.equal(app.run('AuraUT.chemistry(utChem).players[7]'),2);
 assert.match(app.html(),/QUÍMICA<b>4<small>\/33/);assert.equal((app.html().match(/aria-label="Química 2 de 3"/g)||[]).length,2);
 assert.deepEqual(app.json('utChem'),before,'rendering chemistry must preserve card data, coins and XI');
});

for(const runtime of ['ultimate-ui.js','ultimate-ui-61.js'])test('UT event country links match the real catalogue for French and Dutch cards without mutating the club: '+runtime,async()=>{
 const app=boot(undefined,runtime);app.run(fs.readFileSync(path.join(__dirname,'..','data/world-rosters.js'),'utf8'));await app.run('World.load(clubs,Competitions.definitions)');
 app.click({evoMode:'ultimate'});app.click({ut:'create'});
 for(const [eventId,baseId,slot,eventNation,baseNation] of [
  ['barcelona:kounde','real:243715',4,'Francia','France'],
  ['barcelona:de-jong','real:203376',6,'Países Bajos','Holland'],
 ]){
  app.run('globalThis.utCountryClub=AuraUTUI.getClub();utCountryClub.owned=AuraSquad.formations[utCountryClub.formation].map(([pos],i)=>({id:"country-fixture:"+i,name:"Fixture "+i,pos,overall:75,real:false,club:"fixture:"+i,leagueId:"fixture:"+i,nationality:"Fixture "+i}));utCountryClub.owned['+slot+']=AuraUT.barcelonaCards(AuraUTUI.pool()).find(p=>p.id==='+JSON.stringify(eventId)+');utCountryClub.owned[2]={...AuraUTUI.pool().find(p=>p.id==='+JSON.stringify(baseId)+')};utCountryClub.xi=utCountryClub.owned.map(p=>p.id)');
  const before=app.json('utCountryClub');assert.equal(before.owned[slot].nationality,eventNation);assert.equal(before.owned[2].nationality,baseNation);
  app.click({utTab:'squad'});
  assert.equal(app.run('AuraUT.chemistry(utCountryClub).players['+slot+']'),1,eventId+' must share its nation link with the catalogue card');
  assert.equal(app.run('AuraUT.chemistry(utCountryClub).players[2]'),1);
  assert.match(app.html(),/QUÍMICA<b>2<small>\/33/);assert.equal((app.html().match(/aria-label="Química 1 de 3"/g)||[]).length,2);
  assert.deepEqual(app.json('utCountryClub'),before,'rendering the links must preserve original country labels, portraits, ratings, coins and XI');
 }
});

for(const runtime of ['ultimate-ui.js','ultimate-ui-61.js'])test('UT club search ignores surrounding and whitespace-only input without changing the collection: '+runtime,()=>{
 const app=boot(undefined,runtime);app.click({evoMode:'ultimate'});app.click({ut:'create'});app.click({utTab:'club'});
 const before=app.json('AuraUTUI.getClub()'),player=before.owned[0];
 const search=value=>{
  app.run('AuraUTUI.input({target:{id:"ut-club-query",value:'+JSON.stringify(value)+'}})');
  return [...app.node('ut-club-results').innerHTML.matchAll(/data-player="([^"]+)"/g)].map(m=>m[1]);
 };
 const clean=search(player.name);assert.ok(clean.includes(player.id));
 for(const value of ['  '+player.name+'  ','\u00a0'+player.name+'\t'])assert.deepEqual(search(value),clean,'pasted names must find the same owned cards');
 const all=search('');assert.equal(all.length,before.owned.length);assert.deepEqual(search(' \t\u00a0 '),all,'spaces alone must show the full collection');
 assert.deepEqual(app.json('AuraUTUI.getClub()'),before,'searching must preserve the XI, coins and cards');
});

for(const runtime of ['ultimate-ui.js','ultimate-ui-61.js'])test('UT explicit market ratings override the starter range without changing the club: '+runtime,async()=>{
 const app=boot(undefined,runtime);app.run(fs.readFileSync(path.join(__dirname,'..','data/world-rosters.js'),'utf8'));await app.run('World.load(clubs,Competitions.definitions)');
 app.click({evoMode:'ultimate'});app.click({ut:'create'});app.click({utTab:'market'});const before=app.json('AuraUTUI.getClub()');
 const results=()=>[...app.html().matchAll(/data-ut="buy" data-player="([^"]+)"/g)].map(m=>app.json('AuraUTUI.pool().find(p=>p.id==='+JSON.stringify(m[1])+')'));
 for(const minimum of [85,90]){
  app.change('ut-market-min',String(minimum));const cards=results();
  assert.ok(cards.length>0,'a blank search must offer players at '+minimum+'+');assert.ok(cards.every(p=>p.overall>=minimum));
 }
 app.change('ut-market-min','85');app.change('ut-market-max','50000');app.change('ut-market-position','DC');
 const filtered=results();assert.ok(filtered.length>0);assert.ok(filtered.every(p=>p.overall>=85&&p.pos==='DC'));
 for(const p of filtered)assert.ok(app.run('AuraUT.marketPrice(AuraUTUI.getClub(),'+JSON.stringify(p)+')')<=50000);
 app.change('ut-market-position','all');app.change('ut-market-max','0');app.change('ut-market-min','0');
 const defaults=results();assert.ok(defaults.length>0);assert.ok(defaults.every(p=>p.overall>=75&&p.overall<=83),'clearing the filter restores the default catalogue');
 assert.deepEqual(app.json('AuraUTUI.getClub()'),before,'browsing must preserve coins, collection and XI');
});

for(const runtime of ['ultimate-ui.js','ultimate-ui-61.js'])test('UT explicit budget and position filters include low-cost cards outside the starter range: '+runtime,async()=>{
 const app=boot(undefined,runtime);app.run(fs.readFileSync(path.join(__dirname,'..','data/world-rosters.js'),'utf8'));await app.run('World.load(clubs,Competitions.definitions)');
 app.click({evoMode:'ultimate'});app.click({ut:'create'});app.click({utTab:'market'});const before=app.json('AuraUTUI.getClub()');
 const available=app.json('AuraUTUI.pool().filter(p=>!AuraUTUI.getClub().owned.some(q=>q.id===p.id)).map(p=>({id:p.id,pos:p.pos,overall:p.overall,cost:AuraUT.marketPrice(AuraUTUI.getClub(),p)}))');
 const results=()=>[...app.html().matchAll(/data-ut="buy" data-player="([^"]+)"/g)].map(m=>available.find(p=>p.id===m[1]));
 const defaults=results();assert.ok(defaults.length>0);assert.ok(defaults.every(p=>p.overall>=75&&p.overall<=83));
 const check=(maximum,position)=>{
  app.change('ut-market-position','all');app.change('ut-market-max','0');
  if(maximum)app.change('ut-market-max',String(maximum));if(position!=='all')app.change('ut-market-position',position);
  const eligible=available.filter(p=>(!maximum||p.cost<=maximum)&&(position==='all'||p.pos===position)),cards=results();
  assert.ok(eligible.some(p=>p.overall<75),'the bundled catalogue must contain cheaper eligible cards');
  assert.ok(cards.length>0&&cards.length<=24);assert.ok(cards.every(p=>p&&(!maximum||p.cost<=maximum)&&(position==='all'||p.pos===position)));
  assert.equal(cards[0].cost,Math.min(...eligible.map(p=>p.cost)),'the displayed lowest-price order must include the cheapest eligible cards');
  assert.ok(cards.some(p=>p.overall<75),'an explicit filter must not retain the hidden starter rating floor');
  assert.deepEqual(app.json('AuraUTUI.getClub()'),before,'browsing must preserve the club, collection and balance');
  return cards;
 };
 check(5000,'all');check(0,'POR');check(5000,'MC');
 app.change('ut-market-position','all');app.change('ut-market-max','0');
 assert.deepEqual(results().map(p=>p.id),defaults.map(p=>p.id),'clearing the explicit filters must restore the starter catalogue');
 const chosen=check(5000,'MC')[0],original=app.json('AuraUTUI.pool().find(p=>p.id==='+JSON.stringify(chosen.id)+')');
 app.click({ut:'buy',player:chosen.id});const after=app.json('AuraUTUI.getClub()');
 assert.equal(after.coins,before.coins-chosen.cost);assert.equal(after.purchases,before.purchases+1);assert.deepEqual(after.xi,before.xi);
 assert.deepEqual(after.owned.slice(0,before.owned.length),before.owned);assert.equal(after.owned.length,before.owned.length+1);
 const {tradeable:wasTradeable,...catalogueCard}=original,{tradeable:isTradeable,...boughtCard}=after.owned.find(p=>p.id===chosen.id);
 assert.equal(isTradeable,true);assert.deepEqual(boughtCard,catalogueCard,'buying must retain the existing identity, portrait and attributes');
 assert.ok(!app.html().includes('data-ut="buy" data-player="'+chosen.id+'"'),'the bought card must leave the current filtered results');
});

for(const runtime of ['ultimate-ui.js','ultimate-ui-61.js'])test('UT select changes restore focus after rendering while preserving the club and formation choices: '+runtime,()=>{
 const app=boot(undefined,runtime);app.click({evoMode:'ultimate'});app.click({ut:'create'});app.click({utTab:'market'});
 const before=app.json('AuraUTUI.getClub()'),focused=[];
 const change=(id,value,selected)=>{
  app.node(id).focus=options=>{assert.match(app.html(),selected,'focus must return after the new selected value is rendered');focused.push({id,preventScroll:options?.preventScroll});};
  app.change(id,value);assert.deepEqual(focused.at(-1),{id,preventScroll:true},'the rebuilt selector must retain keyboard focus without scrolling');
 };
 change('ut-market-position','DC',/<option value="DC" selected>/);
 change('ut-market-min','85',/<option value="85" selected>/);
 change('ut-market-max','50000',/<option value="50000" selected>/);
 change('ut-market-order','overall',/<option value="overall" selected>/);
 assert.deepEqual(app.json('AuraUTUI.getClub()'),before,'market filtering must not change coins, cards or XI');
 app.click({utTab:'squad'});change('ut-formation','4-4-2',/<option selected>4-4-2<\/option>/);
 const after=app.json('AuraUTUI.getClub()');assert.equal(after.formation,'4-4-2');assert.deepEqual(after.xi.slice().sort(),before.xi.slice().sort());assert.deepEqual(after.owned,before.owned);assert.equal(after.coins,before.coins);assert.equal(focused.length,5);
 app.run('AuraUTUI.change({target:{id:"unrelated-control",value:"ignored"}})');assert.equal(focused.length,5);assert.deepEqual(app.json('AuraUTUI.getClub()'),after);
});

for(const runtime of ['ultimate-ui.js','ultimate-ui-61.js'])test('UT highest-rating market order includes elite cards and respects the remaining filters: '+runtime,async()=>{
 const app=boot(undefined,runtime);app.run(fs.readFileSync(path.join(__dirname,'..','data/world-rosters.js'),'utf8'));await app.run('World.load(clubs,Competitions.definitions)');
 app.click({evoMode:'ultimate'});app.click({ut:'create'});app.click({utTab:'market'});const before=app.json('AuraUTUI.getClub()');
 const results=()=>[...app.html().matchAll(/data-ut="buy" data-player="([^"]+)"/g)].map(m=>app.json('AuraUTUI.pool().find(p=>p.id==='+JSON.stringify(m[1])+')'));
 const defaults=results();assert.ok(defaults.length>0);assert.ok(defaults.every(p=>p.overall>=75&&p.overall<=83));
 app.change('ut-market-order','overall');assert.match(app.html(),/value="overall" selected/);
 const cards=results(),available=app.json('AuraUTUI.pool().filter(p=>!AuraUTUI.getClub().owned.some(q=>q.id===p.id))');
 assert.ok(cards.length>0&&cards.length<=24);assert.ok(cards[0].overall>=90,'highest GRL must include elite cards without requiring a name or minimum rating');
 assert.equal(cards[0].overall,Math.max(...available.map(p=>p.overall)));
 assert.ok(cards.every((p,i)=>!i||cards[i-1].overall>=p.overall));assert.ok(cards.every(p=>!before.owned.some(q=>q.id===p.id)));
 app.change('ut-market-position','POR');app.change('ut-market-max','50000');
 const filtered=results();assert.ok(filtered.length>0);assert.ok(filtered.every(p=>p.pos==='POR'));
 for(const p of filtered)assert.ok(app.run('AuraUT.marketPrice(AuraUTUI.getClub(),'+JSON.stringify(p)+')')<=50000);
 const keepers=available.filter(p=>p.pos==='POR'&&app.run('AuraUT.marketPrice(AuraUTUI.getClub(),'+JSON.stringify(p)+')')<=50000);
 assert.equal(filtered[0].overall,Math.max(...keepers.map(p=>p.overall)));
 app.change('ut-market-position','all');app.change('ut-market-max','0');app.change('ut-market-order','price');
 assert.deepEqual(results().map(p=>p.id),defaults.map(p=>p.id),'returning to price order must restore the starter catalogue');
 assert.deepEqual(app.json('AuraUTUI.getClub()'),before,'sorting and filtering must preserve coins, cards and XI');
});

test('UT calls up a stronger new signing on the displayed bench without changing the chosen XI',async()=>{
 const app=boot();app.run(fs.readFileSync(path.join(__dirname,'..','data/world-rosters.js'),'utf8'));await app.run('World.load(clubs,Competitions.definitions)');
 app.run(fs.readFileSync(path.join(__dirname,'..','ultimate-sigma.js'),'utf8'));
 app.run(fs.readFileSync(path.join(__dirname,'..','muralla-event.js'),'utf8'));
 app.click({evoMode:'ultimate'});app.click({ut:'create'});
 const xi=app.json('AuraUTUI.getClub().xi');
 app.run('AuraUTUI.getClub().coins=600000');app.click({utTab:'muralla'});app.click({ut:'muralla-buy',player:'muralla:hakimi'});
 assert.ok(app.run('AuraUTUI.getClub().owned.some(p=>p.id==="muralla:hakimi")'),'the active Muralla event purchase must succeed');
 const club=app.json('AuraUTUI.getClub()');app.click({utTab:'squad'});
 const bench=app.html().match(/<div class="ut-bench">([\s\S]*?)<\/section>/)[1];
 assert.match(bench,/data-player="muralla:hakimi"/,'a stronger signing must be available on the bench');
 app.run('AuraArena.preMatch=(home,away)=>{globalThis.preparedUT=home;globalThis.preparedOpponent=away}');app.click({ut:'play',opponent:'madrid'});
 const benchIds=app.json('preparedUT.bench.map(p=>p.id)'),displayedIds=[...bench.matchAll(/data-player="([^"]+)"/g)].map(m=>m[1]);
 assert.ok(benchIds.includes('muralla:hakimi'));assert.deepEqual(benchIds,displayedIds,'the displayed bench must match the match call-up');
 app.run('globalThis.matchWithSigning=AuraMatch.create({home:preparedUT,away:preparedOpponent,seconds:30,seed:9});matchWithSigning.paused=true');
 assert.equal(app.run('AuraMatch.substitute(matchWithSigning,4,matchWithSigning.benches[0].find(p=>p.id==="muralla:hakimi"))'),true,'the signing can enter from the bench');
 assert.equal(app.run('matchWithSigning.players[4].id'),'muralla:hakimi');
 assert.equal(benchIds.length,9);assert.deepEqual(app.json('AuraUTUI.getClub().xi'),xi);assert.deepEqual(app.json('AuraUTUI.getClub()'),club,'preparing the bench must not spend coins or change the collection');
});

test('career award portraits use the same real identities as the included catalogue',async()=>{
 const app=boot();app.run(fs.readFileSync(path.join(__dirname,'..','data/world-rosters.js'),'utf8'));await app.run('World.load(clubs,Competitions.definitions)');
 app.click({action:'start'});app.run('for(let guard=0;guard<12&&state.round<4;guard++)AuraContinental.advance()');app.click({nav:'tour'});
 assert.equal(app.run('state.round'),4);assert.equal(app.run('state.tour.monthly.length'),1);
 app.run('globalThis.awardedPlayers=[state.tour.weekly[0].players.find(p=>AuraPortraits.sources(state.rosters[p.club].find(q=>q.id===p.id)).length>0),state.tour.monthly[0]]');
 for(let i=0;i<2;i++){
  const original='state.rosters[awardedPlayers['+i+'].club].find(p=>p.id===awardedPlayers['+i+'].id)';
  const wasReal=app.run(original+'.real===true');
  assert.equal(app.run('awardedPlayers['+i+'].real'),wasReal,'awards must preserve the real or created status of their roster identity');
  const sources=app.json('AuraPortraits.sources('+original+')');if(i===0)assert.ok(sources.length>0);
  assert.deepEqual(app.json('AuraPortraits.sources(awardedPlayers['+i+'])'),sources);
  if(sources.length)assert.ok(app.html().includes('src="'+sources[0]+'"'),'the awards panel must render the available portrait');
 }
 assert.equal(app.saved(),undefined,'career progress remains session-only');
});

test('European cup selectors include supported catalogue leagues and their clubs can play without advancing the career',async()=>{
 const app=boot();app.run(fs.readFileSync(path.join(__dirname,'..','data/world-rosters.js'),'utf8'));await app.run('World.load(clubs,Competitions.definitions)');
 app.click({action:'start'});const career=app.json('({round:state.round,competition:state.competition,champions:state.champions,budget:state.budget})');app.click({evoMode:'cup'});
 const restoredClubs=app.json('["Galatasaray","Fenerbahçe","Ajax"].map(name=>clubs.find(c=>c.gender!=="women"&&c.name===name))');assert.ok(restoredClubs.every(Boolean));
 const excluded=app.json('clubs.filter(c=>["Boca Juniors","River Plate","Barcelona SC"].includes(c.name)).map(c=>c.id)');
 for(const type of ['champions','europa','conference']){
  app.change('tour-cup-type',type);
  const options=app.html().match(/<select id="tour-cup-team">([\s\S]*?)<\/select>/)[1],ids=[...options.matchAll(/value="([^"]+)"/g)].map(m=>m[1]);
  for(const club of restoredClubs)assert.ok(ids.includes(club.id),type+' must offer '+club.name+' from its supported European league');
  for(const id of excluded)assert.ok(!ids.includes(id),'South American clubs must keep their own cup pool');
  assert.equal(app.run('('+JSON.stringify(ids)+').some(id=>getClub(id).gender==="women")'),false,'the club cups retain their existing male-team filter');
  const identities=app.json('('+JSON.stringify(ids)+').map(id=>World.matchingClub(getClub(id))?.id||id)');assert.equal(new Set(identities).size,ids.length,'club aliases must not duplicate cup options');
  const user=restoredClubs[0].id;app.change('tour-cup-team',user);app.click({tour:'cup-create'});
  assert.equal(app.run('AuraTourUI.getCup().user'),user);assert.equal(app.run('AuraTourUI.getCup().entrants.length'),16);
  app.run('AuraArena.preMatch=(home,away,options)=>{globalThis.preparedCup=home;globalThis.pendingCup=options}');app.click({tour:'cup-play'});
  assert.equal(app.run('preparedCup.id'),user);assert.equal(app.run('preparedCup.players.length'),11);
  app.run('pendingCup.onFinish({home:2,away:0})');assert.equal(app.run('AuraTourUI.getCup().rounds.length'),1);
  assert.equal(app.run('AuraTourUI.getCup().rounds[0].find(m=>m.home===AuraTourUI.getCup().user||m.away===AuraTourUI.getCup().user).winner'),user);
  assert.deepEqual(app.json('({round:state.round,competition:state.competition,champions:state.champions,budget:state.budget})'),career);
 }
 assert.equal(app.saved(),undefined);
});

test('player career cannot lose its protagonist by signing a sale agreed before enabling the mode',()=>{
 const app=boot();app.click({action:'start'});const id=app.run('clubPlayers(state.club).find(p=>p.pos!=="POR").id');
 app.click({sell:id});app.node('deal-fee').value=app.run('state.negotiations.at(-1).ceiling');app.submit('deal-form');
 const dealId=app.run('state.negotiations.at(-1).id');assert.equal(app.run('state.negotiations.at(-1).stage'),'ready');app.click({dealAction:'pause'});
 app.click({nav:'pro'});app.node('tour-pro-player').value=id;app.click({tour:'enable-pro'});assert.equal(app.run('state.playerCareer.playerId'),id);
 app.click({nav:'market'});assert.ok(app.html().includes('data-open-deal="'+dealId+'"'));app.click({openDeal:dealId});
 const before=app.json('state');app.click({dealAction:'sign'});
 assert.equal(app.run('clubPlayers(state.club).some(p=>p.id===state.playerCareer.playerId)'),true,'signing an old agreement must not remove the controlled player');
 assert.deepEqual(app.json('state'),before,'a blocked sale must preserve funds, ownership, the XI and transactions');
 assert.match(app.node('deal-error').textContent,/carrera de jugador/);
 app.click({dealAction:'withdraw'});assert.equal(app.run('state.negotiations.at(-1).stage'),'withdrawn');app.node('closemodal').onclick();
 app.run('AuraArena.preMatch=(home,away,options)=>{globalThis.nextPlayerMatch=options;globalThis.playerTeam=home}');app.click({evo:'career-play'});
 assert.equal(app.run('nextPlayerMatch.playerLock'),id);assert.ok(app.run('playerTeam.players.some(p=>p.id===state.playerCareer.playerId)'));assert.equal(app.saved(),undefined);
});

test("career loan buttons show fixed terms, confirmation and optional purchase without touching UT",()=>{
 const app=boot();app.click({action:"start"});
 app.run('state.budget=200000000;state.wageBudget=200000000;globalThis.loanTarget=Object.entries(state.rosters).filter(([cid,ps])=>cid!==state.club&&ps.length>11).map(([cid,ps])=>ps[0]).find(p=>Number.isSafeInteger(p.value)&&p.value>0)');
 const id=app.run("loanTarget.id"),initial=app.json('({owned:state.rosters[state.club].map(p=>p.id),budget:state.budget})');
 app.click({nav:"market"});
 assert.match(app.html(),/JUGADORES CEDIDOS/);
 app.click({loan:id});
 assert.match(app.node("modal").innerHTML,/CESIÓN|Cesión|cesión/);
 assert.match(app.node("modal").innerHTML,/opción de compra/i);
 assert.deepEqual(app.json('state.rosters[state.club].map(p=>p.id)'),initial.owned,"preview is non-mutating");
 app.click({loanConfirm:id});
 assert.ok(app.run('state.rosters[state.club].some(p=>p.id===loanTarget.id)'));
 assert.equal(app.run('AuraLoans.active(state).length'),1);
 assert.ok(app.run('state.budget')<initial.budget);
 app.click({nav:"market"});
 assert.match(app.html(),/Comprar definitivamente/);
 app.click({loanOption:id});
 assert.match(app.node("modal").innerHTML,/PRECIO ACORDADO/);
 app.click({loanBuyConfirm:id});
 assert.equal(app.run('AuraLoans.active(state).length'),0);
 assert.ok(app.run('!state.rosters[state.club].find(p=>p.id===loanTarget.id).onLoan'));
 assert.ok(app.run('state.transactions.some(t=>t.mode==="loan-buy")'));
 assert.equal(app.saved(),undefined,"career remains session-only");
});

test("Liga Argentina menu lists 8 cards and paid matches grant 35000 once without touching other modes",()=>{
 const app=boot();app.click({evoMode:"ultimate"});app.click({ut:"create"});
 app.click({utTab:"argentina"});
 const markup=app.html();
 assert.match(markup,/LIGA ARGENTINA/);
 assert.equal((markup.match(/class="arg-product"/g)||[]).length,8);
 assert.match(markup,/35.000/);
 app.run('AuraArena.preMatch=(home,away,options)=>{globalThis.argentinaMatch=options;globalThis.argentinaAway=away}');
 const before=app.run('AuraUTUI.getClub().coins');
 app.click({ut:"argentina-play",opponent:"boca"});
 assert.match(app.run('argentinaMatch.label'),/LIGA ARGENTINA/);
 assert.equal(app.run('argentinaAway.id'),"boca");
 assert.equal(app.run('AuraUTUI.getClub().coins'),before);
 app.run('argentinaMatch.onFinish({home:0,away:3})');
 assert.equal(app.run('AuraUTUI.getClub().coins'),before+35000);
 assert.equal(app.run('AuraUTUI.getClub().argentinaPlayed'),1);
 app.run('argentinaMatch.onFinish({home:0,away:3})');
 assert.equal(app.run('AuraUTUI.getClub().coins'),before+35000);
 app.click({ut:"argentina-play",opponent:"river"});
 assert.equal(app.run('argentinaAway.id'),"river");
 app.run('argentinaMatch.onFinish({home:2,away:2})');
 assert.equal(app.run('AuraUTUI.getClub().coins'),before+70000);
 assert.equal(app.run('AuraUTUI.getClub().argentinaPlayed'),2);
 assert.equal(app.run('AuraUTUI.getClub().argentinaEarned'),70000);
 assert.equal(app.run('AuraUTUI.getClub().divisionPoints'),0);
 assert.equal(app.run('AuraUTUI.getClub().battlePoints'),0);
 assert.equal(app.run('AuraUTSave.load(localStorage,new Set(Object.keys(AuraSquad.formations))).snapshot.tab'),"argentina");
});
test("Liga Argentina buying special cards preserves the starting XI and saved original players",()=>{
 const app=boot();app.click({evoMode:"ultimate"});app.click({ut:"create"});
 app.click({utTab:"argentina"});app.run('AuraUTUI.getClub().coins=500000');
 const before=app.json('AuraUTUI.getClub().xi');
 const original=app.json('AuraUTUI.getClub().owned.map(p=>p.id)');
 app.click({ut:"argentina-buy",player:"argentina:enner-valencia"});
 assert.equal(app.run('AuraUTUI.getClub().coins'),80000);
 assert.ok(app.run('AuraUTUI.getClub().owned.some(p=>p.id==="argentina:enner-valencia")'));
 assert.deepEqual(app.json('AuraUTUI.getClub().xi'),before);
 assert.deepEqual(app.json('AuraUTUI.getClub().owned.slice(0,'+original.length+').map(p=>p.id)'),original);
 const snapshot=app.json('AuraUTUI.getClub()');
 app.click({ut:"argentina-buy",player:"argentina:enner-valencia"});
 assert.deepEqual(app.json('AuraUTUI.getClub()'),snapshot);
 assert.match(app.html(),/En tu club/);
});

test("Liga Argentina is discoverable from the first screen and preserves the UT club when re-entering",()=>{
 const app=boot();
 assert.match(app.html(),/data-evo="argentina-open"/);
 app.click({evo:"argentina-open"});
 assert.match(app.html(),/NUEVO EVENTO: LIGA ARGENTINA/);
 app.click({ut:"create"});
 app.click({ut:"lobby"});
 app.click({evo:"argentina-open"});
 assert.match(app.html(),/35.000 MONEDAS POR PARTIDO/);
 assert.equal((app.html().match(/class="arg-product"/g)||[]).length,8);
 assert.equal(app.run("AuraUTUI.getClub().coins"),10000);
 assert.equal(app.run('AuraUTSave.load(localStorage,new Set(Object.keys(AuraSquad.formations))).snapshot.tab'),"argentina");
});

test("Draft XI plays through four distinct knockout rounds and becomes champion without changing a club save",()=>{
 const app=boot();app.click({evoMode:"draft"});app.click({evo:"draft-new"});
 for(let i=0;i<11;i++)app.click({draftPick:"0"});
 assert.match(app.html(),/OCTAVOS/);
 assert.match(app.html(),/Jugar contra Real Betis/);
 app.run('AuraArena.preMatch=(home,away,options)=>{globalThis.pendingDraft={home,away,options}}');
 const opponents=["betis","atletico","madrid","city"];
 for(let i=0;i<4;i++){
   app.click({evo:"draft-play"});
   assert.equal(app.run('pendingDraft.away.id'),opponents[i]);
   assert.match(app.run('pendingDraft.options.label'),/AURA DRAFT/);
   const onFinish=app.run('pendingDraft.options.onFinish');
   onFinish({home:2,away:0});
   onFinish({home:2,away:0});
   assert.equal((app.html().match(/class="draft-run-match"/g)||[]).length,i+1);
 }
 assert.match(app.html(),/CAMPEONES DEL DRAFT/);
 const count=app.html().includes('data-evo="draft-play"');
 assert.equal(count,false);
 const previously=app.json('AuraEvolution.pool().length');
 app.click({evo:"draft-retry"});
 assert.match(app.html(),/OCTAVOS/);assert.equal(app.run('AuraEvolution.pool().length'),previously);
 assert.equal(app.saved(),undefined);
});
test("Draft XI losses eliminate the team, while replaying the same roster requires an explicit reset",()=>{
 const app=boot();app.click({evoMode:"draft"});app.click({evo:"draft-new"});
 for(let i=0;i<11;i++)app.click({draftPick:"0"});
 app.run('AuraArena.preMatch=(home,away,options)=>{globalThis.pendingDraft=options}');
 app.click({evo:"draft-play"});
 app.run('pendingDraft.onFinish({home:0,away:2})');
 assert.match(app.html(),/ELIMINADOS EN OCTAVOS/);
 assert.doesNotMatch(app.html(),/data-evo="draft-play"/);
 app.run('pendingDraft.onFinish({home:9,away:0})');
 assert.match(app.html(),/ELIMINADOS EN OCTAVOS/);
 app.click({evo:"draft-retry"});
 assert.match(app.html(),/data-evo="draft-play"/);
 assert.equal((app.html().match(/class="draft-slot filled"/g)||[]).length,11);
});
test("real Cup matches finishing level use score-dependent penalty winners recorded in the bracket",()=>{
 const app=boot();app.click({evoMode:"cup"});app.click({tour:"cup-create"});
 const prior=app.json('({rounds:AuraTourUI.getCup().rounds.length,user:AuraTourUI.getCup().user})');
 app.run('AuraArena.preMatch=(home,away,options)=>{globalThis.pendingCup=options}');
 app.click({tour:"cup-play"});
 app.run('pendingCup.onFinish({home:2,away:2})');
 const cup=app.json("AuraTourUI.getCup()");
 assert.equal(cup.rounds.length,prior.rounds+1);
 const played=cup.rounds[0].find(m=>m.home===prior.user||m.away===prior.user);
 assert.deepEqual([played.score.home,played.score.away],[2,2]);
 assert.ok(played.penalties&&played.penalties.home!==played.penalties.away);
 assert.equal(played.winner,played.penalties.home>played.penalties.away?played.home:played.away);
});

test("main menu presents seven large independent mode cards instead of shared tabs",()=>{
 const app=boot(),html=app.html();
 assert.equal(app.run('AuraEvolution.getMode().mode'),"hub");
 assert.equal((html.match(/class="aura-mode-tile aura-mode-tile--/g)||[]).length,7);
 assert.equal((html.match(/data-evo-mode="/g)||[]).length,7);
 assert.match(html,/SIETE MODOS/);
 assert.doesNotMatch(html,/id="mode-content"/,"no mode can take over the hub until selected");
 assert.match(html,/data-evo="argentina-open"/,"existing special event stays reachable");
});
test("every game mode gets its own full-width page, unique theme and a working back control",()=>{
 const app=boot();
 const cases=[
   ["career","MÁNAGER","CARRERA"],
   ["quick","PARTIDO RÁPIDO","PARTIDO RÁPIDO"],
   ["draft","DRAFT XI","DRAFT"],
   ["pro","CARRERA DE JUGADOR","JUGADOR"],
   ["cup","COPAS Y SELECCIONES","COPAS"],
   ["ultimate","ULTIMATE TEAM","ULTIMATE"],
   ["street","CALLE / VOLTA","CALLE"]
 ];
 for(const [id,title,content] of cases){
   app.click({evoMode:id});
   const html=app.html();
   assert.equal(app.run('AuraEvolution.getMode().mode'),id);
   assert.match(html,new RegExp('class="aura-mode-page aura-mode-page--'+id+'"'));
   assert.match(html,new RegExp('aura-mode-detail-header--'+id));
   assert.match(html,new RegExp(title));
   assert.match(html,new RegExp(content));
   assert.match(html,/data-evo="mode-back"/);
   assert.equal((html.match(/data-evo-mode=/g)||[]).length,0,"no shared tabs inside a mode");
   app.click({evo:"mode-back"});
   assert.equal(app.run('AuraEvolution.getMode().mode'),"hub");
   assert.equal((app.html().match(/data-evo-mode=/g)||[]).length,7);
 }
});
test("favorite mode is separately selectable and its priority persists across menu visits",()=>{
 const app=boot();
 const original=app.run('AuraEvolution.getMode().pinnedMode');
 assert.equal(original,null);
 app.click({evoPin:"cup"});
 assert.equal(app.run('AuraEvolution.getMode().pinnedMode'),"cup");
 assert.match(app.html(),/aria-pressed="true"/);
 assert.match(app.html().split('class="aura-mode-tile aura-mode-tile--')[1],/^cup/);
 app.click({evoMode:"draft"});app.click({evo:"mode-back"});
 assert.equal(app.run('AuraEvolution.getMode().pinnedMode'),"cup");
 app.click({evoPin:"cup"});
 assert.equal(app.run('AuraEvolution.getMode().pinnedMode'),null);
});
test("return to the last mode preserves Draft XI selections and never restarts the draft",()=>{
 const app=boot();app.click({evoMode:"draft"});app.click({evo:"draft-new"});
 for(let i=0;i<4;i++)app.click({draftPick:"0"});
 const drafted=app.html();assert.match(drafted,/4 \/ 11/);
 app.click({evo:"mode-back"});
 assert.match(app.html(),/VOLVER A DRAFT XI/);
 app.click({evo:"mode-resume"});
 assert.equal(app.run('AuraEvolution.getMode().mode'),"draft");
 assert.match(app.html(),/4 \/ 11/);
 app.click({evo:"mode-back"});
 assert.equal((app.html().match(/data-evo-mode=/g)||[]).length,7);
});
test("existing career and Ultimate Team club remain intact after changing separate modes",()=>{
 const app=boot();app.click({evoMode:"career"});app.click({action:"start"});
 const snapshot=app.json("state");
 app.click({nav:"modes"});
 assert.equal(app.run('AuraEvolution.getMode().mode'),"hub");
 app.click({evoMode:"ultimate"});app.click({ut:"create"});
 const initial=app.json('AuraUTUI.getClub()');
 app.click({ut:"lobby"});
 assert.equal((app.html().match(/data-evo-mode=/g)||[]).length,7);
 app.click({evoMode:"street"});app.click({evo:"mode-back"});
 app.click({evoMode:"ultimate"});
 assert.deepEqual(app.json('AuraUTUI.getClub()'),initial);
 app.click({evo:"mode-back"});
 app.click({nav:"career"});
 assert.deepEqual(app.json('state'),snapshot);
});

test("mode favorite and last-opened selection have isolated persistence keys",()=>{
 const app=boot();
 assert.equal(app.run('localStorage.getItem("aura-recent-mode-v1")'),null);
 app.click({evoMode:"draft"});
 assert.equal(app.run('localStorage.getItem("aura-recent-mode-v1")'),"draft");
 app.click({evo:"mode-back"});app.click({evoPin:"cup"});
 assert.equal(app.run('localStorage.getItem("aura-pinned-mode-v1")'),"cup");
 assert.equal(app.run("AuraEvolution.getMode().pinnedMode"),"cup");
 app.click({evoPin:"cup"});
 assert.equal(app.run('localStorage.getItem("aura-pinned-mode-v1")'),null,"test storage adapter converts empty strings into null");
 assert.equal(app.run("AuraEvolution.getMode().pinnedMode"),null);
 assert.equal(app.saved(),undefined,"UI preferences must not create a Career autosave");
});
test("Argentina quick event shortcut remembers Ultimate Team without altering club ownership",()=>{
 const app=boot();app.click({evoMode:"ultimate"});app.click({ut:"create"});
 const before=app.json("AuraUTUI.getClub().owned.map(p=>p.id)");
 app.click({ut:"lobby"});app.click({evo:"argentina-open"});
 assert.equal(app.run("AuraEvolution.getMode().mode"),"ultimate");
 assert.equal(app.run('localStorage.getItem("aura-recent-mode-v1")'),"ultimate");
 assert.deepEqual(app.json("AuraUTUI.getClub().owned.map(p=>p.id)"),before);
});

test("VOLTA circuit completes four unique fixtures with live 3v3 results and avoids duplicate scores",()=>{
 const app=boot();app.click({evoMode:"street"});
 assert.match(app.html(),/PARTIDO LIBRE/);
 app.click({tour:"street-mode",streetMode:"circuit"});
 assert.match(app.html(),/CIRCUITO VOLTA/);
 app.change("street-goals","3");app.change("street-duration","60");
 app.change("street-difficulty",".78");
 app.click({tour:"street-circuit-new"});
 assert.match(app.html(),/JORNADA 1/);
 assert.equal(app.run("AuraTourUI.getStreetCircuit().fixtures.length"),4);
 assert.equal(app.run("AuraTourUI.getStreetCircuit().seconds"),60);
 assert.equal(app.run("AuraTourUI.getStreetCircuit().goalLimit"),3);
 app.run("AuraStreet.open=(home,away,opts)=>{globalThis.voltaFixture={home,away,opts}}");
 const rivals=app.json("AuraTourUI.getStreetCircuit().fixtures");
 for(let i=0;i<4;i++){
   app.click({tour:"street-circuit-play"});
   assert.equal(app.run("voltaFixture.opts.awayName"),app.run("getClub("+JSON.stringify(rivals[i])+").name"));
   assert.equal(app.run("voltaFixture.opts.seconds"),60);
   assert.equal(app.run("voltaFixture.opts.goalLimit"),3);
   const finished=app.run("voltaFixture.opts.onFinish");
   finished({home:3,away:1});finished({home:3,away:1});
   assert.equal(app.run("AuraTourUI.getStreetCircuit().results.length"),i+1);
 }
 assert.match(app.html(),/ORO · CIRCUITO TERMINADO/);
 assert.equal(app.run("AuraTourUI.getStreetCircuit().points"),12);
 assert.equal(app.run("AuraTourUI.getStreetCircuit().wins"),4);
 assert.doesNotMatch(app.html(),/data-tour="street-circuit-play"/);
 assert.equal(app.saved(),undefined);
 app.click({nav:"modes"});app.click({evoMode:"street"});
 assert.equal(app.run("AuraTourUI.getStreetCircuit().points"),12);
 app.click({tour:"street-circuit-new"});
 assert.equal(app.run("AuraTourUI.getStreetCircuit().results.length"),0);
});
test("VOLTA free play remains available and independent of the circuit",()=>{
 const app=boot();app.click({evoMode:"street"});
 app.run("AuraStreet.open=(home,away,opts)=>{globalThis.voltaFriendly={home,away,opts}}");
 app.change("street-home","boca");app.change("street-away","madrid");
 app.change("street-goals","7");app.change("street-duration","180");
 app.click({tour:"street-play"});
 assert.equal(app.run("voltaFriendly.opts.homeName"),app.run('getClub("boca").name'));
 assert.equal(app.run("voltaFriendly.opts.awayName"),app.run('getClub("madrid").name'));
 assert.equal(app.run("voltaFriendly.opts.goalLimit"),7);
 assert.equal(app.run("voltaFriendly.opts.seconds"),180);
 assert.equal(app.run("voltaFriendly.opts.onFinish"),undefined);
 assert.equal(app.run("AuraTourUI.getStreetCircuit()"),null);
});

test("Quick Match offers a separate best-of-three rivalry without changing career or coins",()=>{
 const app=boot();app.click({evoMode:"quick"});
 assert.match(app.html(),/AL MEJOR DE TRES/);
 app.click({evo:"quick-rivalry-new"});
 assert.equal(app.run("AuraEvolution.getRivalry().status"),"playing");
 assert.equal(app.run("AuraEvolution.getRivalry().home"),"barcelona");
 app.run("AuraArena.preMatch=(home,away,options)=>{globalThis.rivalryMatch={home,away,options}}");
 app.click({evo:"quick-rivalry-play"});
 assert.match(app.run("rivalryMatch.options.label"),/PARTIDO 1/);
 const first=app.run("rivalryMatch.options.onFinish");
 first({home:3,away:0});first({home:3,away:0});
 assert.equal(app.run("AuraEvolution.getRivalry().results.length"),1);
 assert.equal(app.run("AuraEvolution.getRivalry().wins[0]"),1);
 app.click({evo:"quick-rivalry-play"});
 assert.match(app.run("rivalryMatch.options.label"),/PARTIDO 2/);
 const second=app.run("rivalryMatch.options.onFinish");
 second({home:0,away:2});second({home:0,away:2});
 assert.equal(app.run("AuraEvolution.getRivalry().results.length"),2);
 app.click({evo:"quick-rivalry-play"});
 app.run("rivalryMatch.options.onFinish({home:2,away:0})");
 assert.match(app.html(),/SERIE TERMINADA/);
 assert.equal(app.run("AuraEvolution.getRivalry().champion"),"barcelona");
 assert.equal(app.run("AuraEvolution.getRivalry().results.length"),3);
 assert.doesNotMatch(app.html(),/data-evo="quick-rivalry-play"/);
 assert.equal(app.saved(),undefined);
 app.click({nav:"modes"});app.click({evoMode:"quick"});
 assert.match(app.html(),/SERIE TERMINADA/);
 app.click({evo:"quick-rivalry-reset"});
 assert.equal(app.run("AuraEvolution.getRivalry()"),null);
});
test("Rivalry locks team selection while active and ignores stale callbacks after reset",()=>{
 const app=boot();app.click({evoMode:"quick"});
 app.click({evo:"quick-rivalry-new"});
 assert.match(app.html(),/id="quick-home" disabled/);
 app.run("AuraArena.preMatch=(home,away,opts)=>{globalThis.pendingSeries=opts}");
 app.click({evo:"quick-rivalry-play"});
 const callback=app.run("pendingSeries.onFinish");
 app.change("quick-home","boca");
 assert.equal(app.run("AuraEvolution.getRivalry().home"),"barcelona");
 app.click({evo:"quick-rivalry-reset"});
 callback({home:99,away:0});
 assert.equal(app.run("AuraEvolution.getRivalry()"),null);
 app.change("quick-home","boca");
 app.click({evo:"quick-rivalry-new"});
 assert.equal(app.run("AuraEvolution.getRivalry().home"),"boca");
});

test("Cup shows its full live next-round pairings, allows initial redraw and simulates to a champion",()=>{
 const app=boot();app.click({evoMode:"cup"});app.click({tour:"cup-create"});
 let cup=app.json("AuraTourUI.getCup()");
 assert.equal(cup.rounds.length,0);
 assert.equal(cup.current.length,16);
 assert.equal((app.html().match(/CUADRO DE PRÓXIMOS PARTIDOS/g)||[]).length,1);
 assert.equal((app.html().match(/class="yours"/g)||[]).length,1);
 assert.match(app.html(),/data-tour="cup-reroll"/);
 const seed=cup.seed,user=cup.user,entrants=cup.entrants.map(t=>t.id).sort();
 app.click({tour:"cup-reroll"});cup=app.json("AuraTourUI.getCup()");
 assert.equal(cup.seed,seed+1);assert.equal(cup.user,user);
 assert.deepEqual(cup.entrants.map(t=>t.id).sort(),entrants);
 assert.equal(cup.rounds.length,0);
 app.click({tour:"cup-finish"});cup=app.json("AuraTourUI.getCup()");
 assert.equal(cup.rounds.length,4);assert.ok(cup.champion);
 assert.equal(cup.rounds.flat().length,15);
 assert.equal(cup.current.length,1);
 assert.match(app.html(),/LEVANTA LA COPA/);
 assert.match(app.html(),/TANDAS DE PENALES/);
 assert.doesNotMatch(app.html(),/data-tour="cup-finish"/);
 assert.doesNotMatch(app.html(),/data-tour="cup-reroll"/);
 assert.equal(app.saved(),undefined);
 const frozen=app.json("AuraTourUI.getCup()");
 app.click({tour:"cup-finish"});app.click({tour:"cup-reroll"});
 assert.deepEqual(app.json("AuraTourUI.getCup()"),frozen);
});
test("Cup simulation leaves manager budget, rounds and squad intact",()=>{
 const app=boot();app.click({evoMode:"career"});app.click({action:"start"});
 const before=app.json("({round:state.round,budget:state.budget,club:state.club,rosters:state.rosters})");
 app.click({nav:"modes"});app.click({evoMode:"cup"});
 app.click({tour:"cup-create"});app.click({tour:"cup-sim"});
 assert.match(app.html(),/CUADRO DE PRÓXIMOS PARTIDOS/);
 app.click({tour:"cup-finish"});
 assert.ok(app.run("AuraTourUI.getCup().champion"));
 assert.deepEqual(app.json("({round:state.round,budget:state.budget,club:state.club,rosters:state.rosters})"),before);
});

test("Pro player career has a separate weekly training centre with four drills and no XP farming",()=>{
 const app=boot();
 app.click({evoMode:"pro"});
 app.node("tour-pro-player").value="new";
 app.node("tour-pro-name").value="Emilio";
 app.node("tour-pro-pos").value="DC";
 app.click({tour:"start-pro"});
 assert.match(app.html(),/PREPARA TU PRÓXIMO PARTIDO/);
 assert.equal((app.html().match(/data-tour="pro-train"/g)||[]).length,4);
 const before=app.run("state.playerCareer.xp");
 app.click({tour:"pro-train",drill:"shooting"});
 assert.equal(app.run("state.playerCareer.xp"),before+42);
 assert.match(app.html(),/HISTORIAL DE ENTRENAMIENTO/);
 assert.match(app.html(),/YA ENTRENADO \/ CERRADO/);
 assert.equal((app.html().match(/data-tour="pro-train"/g)||[]).length,4);
 const state=app.json("state");
 app.click({tour:"pro-train",drill:"sprint"});
 assert.deepEqual(app.json("state"),state,"second drill cannot grant EXP in the same round");
 app.run("state.round=1");app.click({nav:"pro"});
 assert.match(app.html(),/DISPONIBLE/);
 app.click({tour:"pro-train",drill:"recovery"});
 assert.equal(app.run("state.playerCareer.trainingHistory.length"),2);
 assert.ok(app.run("clubPlayers(state.club).find(p=>p.id===state.playerCareer.playerId).fitness")<=100);
 assert.equal(app.saved(),undefined);
});
test("Mode return to career, VOLTA, UT and back to Pro does not reset individual training",()=>{
 const app=boot();app.click({evoMode:"pro"});
 app.node("tour-pro-player").value="new";app.node("tour-pro-name").value="Emilio";
 app.click({tour:"start-pro"});app.click({tour:"pro-train",drill:"passing"});
 const xp=app.run("state.playerCareer.xp");
 app.click({nav:"modes"});app.click({evoMode:"street"});
 app.click({evo:"mode-back"});app.click({evoMode:"ultimate"});
 app.click({ut:"create"});const owned=app.json("AuraUTUI.getClub().owned.map(p=>p.id)");
 app.click({ut:"lobby"});app.click({nav:"pro"});
 assert.equal(app.run("state.playerCareer.xp"),xp);
 assert.match(app.html(),/Visión y pase/);
 assert.deepEqual(app.json("AuraUTUI.getClub().owned.map(p=>p.id)"),owned);
});



for(const runtime of ['ultimate-ui.js','ultimate-ui-61.js'])test('UT DCP keeps keyboard focus on the rebuilt card when selecting and deselecting: '+runtime,()=>{
 const app=boot(undefined,runtime);app.click({evoMode:'ultimate'});app.click({ut:'create'});app.click({utSbc:'gold'});app.click({utTab:'sbc'});
 const before=app.json('AuraUTUI.getClub()'),cards=app.json('AuraUT.sbcPool(AuraUTUI.getClub(),"gold").slice(0,3)');
 assert.equal(cards.length,3);
 const document=app.run('document'),root=app.node('app'),getElementById=document.getElementById,buttons=new Map(),ids=new Map(),focused=[];
 let html=root.innerHTML;
 // Replacing the app detaches every old button and clears its focus, as in the browser.
 Object.defineProperty(root,'innerHTML',{get:()=>html,set:value=>{
  html=value;document.activeElement=null;buttons.clear();ids.clear();
  for(const [tag] of html.matchAll(/<button\b[^>]*data-ut="sbc-pick"[^>]*>/g)){
   const uid=tag.match(/data-uid="([^"]+)"/)[1],id=tag.match(/\bid="([^"]+)"/)?.[1];
   const button={dataset:{ut:'sbc-pick',uid},disabled:/\bdisabled\b/.test(tag),pressed:tag.includes('aria-pressed="true"'),focus(options){
    if(this.disabled)return;document.activeElement=this;focused.push({uid,preventScroll:options?.preventScroll});
   }};
   buttons.set(uid,button);if(id)ids.set(id,button);
  }
 }});
 document.getElementById=id=>ids.get(id)||getElementById(id);root.innerHTML=html;
 const activate=uid=>{
  const previous=buttons.get(uid);assert.ok(previous&&!previous.disabled);previous.focus();
  app.run('AuraUTUI.handleClick(document.activeElement)');
  const current=buttons.get(uid);assert.notEqual(current,previous,'rendering must replace the old card element');
  assert.equal(document.activeElement,current,'keyboard focus must return to the same card after rendering');
  assert.deepEqual(focused.at(-1),{uid,preventScroll:true},'restoring focus must not move the viewport');
  return current;
 };
 assert.equal(activate(cards[0].uid).pressed,true);
 // A second Enter/Space activation on the focused replacement can deselect the same card.
 app.run('AuraUTUI.handleClick(document.activeElement)');
 assert.equal(document.activeElement,buttons.get(cards[0].uid));assert.equal(document.activeElement.pressed,false);
 for(const p of cards)assert.equal(activate(p.uid).pressed,true);
 assert.match(app.html(),/3\/3 cartas/);assert.equal(activate(cards[1].uid).pressed,false);assert.match(app.html(),/2\/3 cartas/);
 const count=focused.length;document.activeElement=null;app.click({ut:'sbc-pick',uid:cards[1].uid});
 assert.equal(focused.length,count,'an activation without focus must not take keyboard focus');
 assert.deepEqual(app.json('AuraUTUI.getClub()'),before,'selection and focus changes must not consume cards, coins or change the XI');
});
