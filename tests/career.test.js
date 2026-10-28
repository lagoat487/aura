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
      addEventListener() {}, classList: { add() {}, remove() {} } });
    return nodes.get(id);
  };
  const context = vm.createContext({
    document: { getElementById: node, addEventListener: (type, handler) => { events[type] = handler; }, querySelector: () => null },
    window: { scrollTo() {} },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    setTimeout() {}, clearTimeout() {},
  });
  for (const file of ["clubs.js", "competitions.js", "world.js", "real-players.js", "squad.js", "progression.js", "negotiations.js", "career-ui.js", "progression-ui.js", "match-engine.js", "match-graphics.js", "match-ui.js", "evolution-ui.js", "game.js"]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), context, { filename: file });
  }
  return {
    run: code => vm.runInContext(code, context),
    json: code => JSON.parse(vm.runInContext("JSON.stringify(" + code + ")", context)),
    html: () => node("app").innerHTML,
    node,
    click: dataset => events.click({ target: { closest: () => ({ dataset }) } }),
    saved: () => storage.get("aura-fc27-save-v1"),
  };
}

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

test("season end cannot simulate or reward another match; rollover keeps squad and budget", () => {
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
  assert.deepEqual(app.json("state.rosters"), old.rosters);
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

