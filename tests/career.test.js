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
  for (const file of ["clubs.js", "competitions.js", "game.js"]) {
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
  const restored = boot(app.saved());
  assert.deepEqual(restored.json("state.competition"), app.json("state.competition"));
  assert.deepEqual(restored.json("seasonTable()"), app.json("seasonTable()"));
  assert.deepEqual(restored.json("state.history"), app.json("state.history"));
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

test("v1 saves keep their existing exhibition season, transfers and history until rollover", () => {
  const app = boot();
  app.run('state=createGame("barcelona","exhibition");state.version=1;delete state.competition;state.round=3;state.wins=2;state.draws=1;state.goals=5;state.against=1;state.budget=1234567;state.history=[{round:3,season:2026,rival:"liverpool",home:true,g1:2,g2:0,scorers:["Emilio Vega"]}];state.rosters.barcelona[0].overall=94;save()');
  const previous = app.json("state");
  const restored = boot(app.saved());
  assert.equal(restored.run("state.version"), 1);
  assert.equal(restored.run("state.round"), 3);
  assert.equal(restored.run("state.budget"), 1234567);
  assert.deepEqual(restored.json("state.history"), previous.history);
  assert.deepEqual(restored.json("state.rosters.barcelona"), previous.rosters.barcelona);
  assert.equal(restored.run("nextOpponent().id"), "boca");
  assert.match(restored.html(), /tablas rivales son estimaciones/);
  restored.run('state.round=46;startNextSeason("laliga")');
  assert.equal(restored.run("state.version"), 2);
  assert.equal(restored.run("state.competition.id"), "laliga");
  assert.equal(restored.run("state.round"), 0);
  assert.equal(restored.run("state.rosters.barcelona[0].overall"), 94);
  assert.deepEqual(restored.json("state.seasonHistory[0].history"), previous.history);
});

test("a corrupt v2 calendar is not loaded or overwritten", () => {
  const app = boot(); app.click({ action: "start" });
  const broken = JSON.parse(app.saved()); broken.competition.fixtures.pop();
  const serialized = JSON.stringify(broken), restored = boot(serialized);
  assert.equal(restored.run("state"), null);
  assert.equal(restored.saved(), serialized);
});
