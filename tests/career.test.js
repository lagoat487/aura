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
  for (const file of ["clubs.js", "competitions.js", "world.js", "real-players.js", "game.js"]) {
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
  assert.match(app.html(), /Temporada completada/);
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
