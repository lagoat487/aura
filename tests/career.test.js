"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// A minimal DOM surface keeps these integration tests dependency-free.
// These checks exercise game wiring and HTML output, not browser layout.
function boot(saved) {
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
  for (const file of ["clubs.js", "competitions.js", "world.js", "real-players.js", "world-tour.js", "roster-sync.js", "club-badges.js", "portraits.js", "squad.js", "champions.js", "ultimate-team.js", "progression.js", "negotiations.js", "career-ui.js", "progression-ui.js", "match-engine.js", "match-presentation.js", "match-graphics.js", "match-ui.js", "evolution-ui.js", "street.js", "tour-ui.js", "ultimate-ui.js", "career-continental.js", "game.js"]) {
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
  const app = boot();
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
  assert.match(reopened.html(),/Iniciar nueva carrera/);
});

test("exhibition keeps the original 24 clubs and rejects cross-league careers", () => {
  const app = boot();
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
 assert.match(reopened.html(),/Iniciar nueva carrera/);
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

test('UT calls up a stronger new signing on the displayed bench without changing the chosen XI',async()=>{
 const app=boot();app.run(fs.readFileSync(path.join(__dirname,'..','data/world-rosters.js'),'utf8'));await app.run('World.load(clubs,Competitions.definitions)');
 app.run(fs.readFileSync(path.join(__dirname,'..','ultimate-sigma.js'),'utf8'));
 app.click({evoMode:'ultimate'});app.click({ut:'create'});
 const xi=app.json('AuraUTUI.getClub().xi');
 app.click({sigmaOpen:'yes'});app.click({sigmaGift:''});app.click({sigmaBuy:'sigma:espart'});
 assert.ok(app.run('AuraUTUI.getClub().owned.some(p=>p.id==="sigma:espart")'),'the existing event purchase must succeed');
 const club=app.json('AuraUTUI.getClub()');app.click({utTab:'squad'});
 const bench=app.html().match(/<div class="ut-bench">([\s\S]*?)<\/section>/)[1];
 assert.match(bench,/data-player="sigma:espart"/,'a stronger signing must be available on the bench');
 app.run('AuraArena.preMatch=(home,away)=>{globalThis.preparedUT=home;globalThis.preparedOpponent=away}');app.click({ut:'play',opponent:'madrid'});
 const benchIds=app.json('preparedUT.bench.map(p=>p.id)'),displayedIds=[...bench.matchAll(/data-player="([^"]+)"/g)].map(m=>m[1]);
 assert.ok(benchIds.includes('sigma:espart'));assert.deepEqual(benchIds,displayedIds,'the displayed bench must match the match call-up');
 app.run('globalThis.matchWithSigning=AuraMatch.create({home:preparedUT,away:preparedOpponent,seconds:30,seed:9});matchWithSigning.paused=true');
 assert.equal(app.run('AuraMatch.substitute(matchWithSigning,4,matchWithSigning.benches[0].find(p=>p.id==="sigma:espart"))'),true,'the signing can enter from the bench');
 assert.equal(app.run('matchWithSigning.players[4].id'),'sigma:espart');
 assert.equal(benchIds.length,9);assert.deepEqual(app.json('AuraUTUI.getClub().xi'),xi);assert.deepEqual(app.json('AuraUTUI.getClub()'),club,'preparing the bench must not spend coins or change the collection');
});

test('career award portraits use the same real identities as the included catalogue',async()=>{
 const app=boot();app.run(fs.readFileSync(path.join(__dirname,'..','data/world-rosters.js'),'utf8'));await app.run('World.load(clubs,Competitions.definitions)');
 app.click({action:'start'});app.run('for(let guard=0;guard<12&&state.round<4;guard++)AuraContinental.advance()');app.click({nav:'tour'});
 assert.equal(app.run('state.round'),4);assert.equal(app.run('state.tour.monthly.length'),1);
 app.run('globalThis.awardedPlayers=[state.tour.weekly[0].players.find(p=>AuraPortraits.sources(state.rosters[p.club].find(q=>q.id===p.id)).length>0),state.tour.monthly[0]]');
 for(let i=0;i<2;i++){
  const original='state.rosters[awardedPlayers['+i+'].club].find(p=>p.id===awardedPlayers['+i+'].id)';
  assert.equal(app.run(original+'.real'),true);assert.equal(app.run('awardedPlayers['+i+'].real'),true,'awards must not relabel a real footballer as created');
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
