"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../competitions.js");
const { clubs, legacyClubs } = require("../clubs.js");

function checkSchedule(ids) {
  const fixtures = C.generateFixtures(ids, 2026, "test");
  const directedPairs = new Set();
  const homeCounts = new Map(ids.map(id => [id, 0]));
  for (const games of fixtures) {
    const playing = [];
    for (const game of games) {
      assert.notEqual(game.home, game.away);
      assert.equal(game.score, null);
      const pair = game.home + ":" + game.away;
      assert.ok(!directedPairs.has(pair), "An ordered pairing cannot be repeated");
      directedPairs.add(pair);
      playing.push(game.home, game.away);
      homeCounts.set(game.home, homeCounts.get(game.home) + 1);
    }
    assert.equal(new Set(playing).size, playing.length, "At most one match per club per round");
    assert.equal(playing.length, ids.length - ids.length % 2);
  }
  assert.equal(directedPairs.size, ids.length * (ids.length - 1));
  for (const home of ids) {
    assert.equal(homeCounts.get(home), ids.length - 1);
    for (const away of ids) if (home !== away) assert.ok(directedPairs.has(home + ":" + away));
  }
  return fixtures;
}

test("competition membership resolves to unique, stable club IDs", () => {
  assert.equal(new Set(clubs.map(c => c.id)).size, clubs.length);
  assert.equal(legacyClubs.length, 24);
  for (const definition of C.definitions) {
    assert.equal(new Set(definition.clubIds).size, definition.clubIds.length);
    assert.ok(definition.clubIds.every(id => clubs.some(c => c.id === id)));
  }
  assert.deepEqual(C.getDefinition("exhibition").clubIds, legacyClubs.map(c => c.id));
  assert.throws(() => C.getDefinition("champions"), /desconocida/);
});

test("LaLiga has 380 fixtures, 38 rounds and 19 home/19 away games per club", () => {
  const definition = C.getDefinition("laliga");
  assert.equal(definition.clubIds.length, 20);
  const fixtures = checkSchedule(definition.clubIds);
  assert.equal(fixtures.length, 38);
  assert.equal(fixtures.flat().length, 380);
  assert.ok(fixtures.every(games => games.length === 10));
  for (const id of definition.clubIds) {
    let previous, run = 0;
    for (const games of fixtures) {
      const home = games.find(game => game.home === id || game.away === id).home === id;
      run = home === previous ? run + 1 : 1;
      previous = home;
      assert.ok(run <= 3, "Avoid long runs of only home or only away matches");
    }
    const firstLegHome = fixtures.slice(0,19).filter(games => games.some(game => game.home === id)).length;
    assert.ok(firstLegHome === 9 || firstLegHome === 10);
  }
});

test("exhibition and odd-sized leagues have no duplicate pairings or double bookings", () => {
  assert.equal(checkSchedule(C.getDefinition("exhibition").clubIds).length, 46);
  assert.equal(checkSchedule(["a", "b", "c", "d", "e"]).length, 10);
  assert.throws(() => checkSchedule(["a", "a"]), /únicos/);
  assert.throws(() => checkSchedule(["a"]), /dos clubes/);
});

test("advancing is atomic and never overwrites a completed matchday", () => {
  const season = C.createSeason(C.getDefinition("laliga"), 2026);
  let calls = 0;
  assert.throws(() => C.simulateNextRound(season, () => ++calls === 5 ? { home: -1, away: 0 } : { home: 1, away: 0 }), /inválido/);
  assert.equal(C.playedRounds(season), 0);
  assert.ok(season.fixtures[0].every(game => game.score === null));
  assert.throws(() => C.simulateNextRound(season, () => { throw new Error("simulation failure"); }));
  assert.equal(C.playedRounds(season), 0);
  C.simulateNextRound(season, () => ({ home: 2, away: 1 }));
  const firstRound = JSON.stringify(season.fixtures[0]);
  C.simulateNextRound(season, () => ({ home: 0, away: 0 }));
  assert.equal(JSON.stringify(season.fixtures[0]), firstRound);
  assert.equal(C.playedRounds(season), 2);
  assert.ok(C.standings(season).every(row => row.p === 2));
});

test("a whole season conserves goals, wins/losses, points and saved results", () => {
  const season = C.createSeason(C.getDefinition("laliga"), 2026);
  let i = 0;
  while (C.simulateNextRound(season, () => ({ home: i++ % 4, away: i % 3 }))) {
    assert.ok(C.validateSeason(season));
  }
  const rows = C.standings(season), sum = key => rows.reduce((n, row) => n + row[key], 0);
  assert.ok(rows.every(row => row.p === 38 && row.w + row.d + row.l === row.p));
  assert.equal(sum("gf"), sum("ga"));
  assert.equal(sum("w"), sum("l"));
  assert.equal(sum("pts"), 3 * sum("w") + sum("d"));
  assert.equal(sum("p"), 760);
  const saved = JSON.stringify(season), restored = JSON.parse(saved);
  assert.ok(C.validateSeason(restored));
  assert.deepEqual(C.standings(restored), rows);
  assert.equal(C.simulateNextRound(restored, () => assert.fail("Season is already over")), null);
  assert.equal(JSON.stringify(restored), saved);
});

test("a save rejects partial, out-of-order or structurally corrupt matchdays", () => {
  const fresh = () => C.createSeason(C.getDefinition("laliga"), 2026);
  let season = fresh();
  season.fixtures[0][0].score = { home: 0, away: 0 };
  assert.equal(C.validateSeason(season), false);
  season = fresh();
  season.fixtures[1].forEach(game => { game.score = { home: 0, away: 0 }; });
  assert.equal(C.validateSeason(season), false);
  season = fresh(); season.fixtures[0][0].away = season.fixtures[0][0].home;
  assert.equal(C.validateSeason(season), false);
  season = fresh(); season.clubIds[0] = season.clubIds[1];
  assert.equal(C.validateSeason(season), false);
  season = fresh(); season.fixtures.pop();
  assert.equal(C.validateSeason(season), false);
});

function smallSeason(results) {
  const season = C.createSeason({ id: "laliga", name: "Test league", referenceSeason: null,
    clubIds: ["a", "b", "c", "d"], points: { win: 3, draw: 1, loss: 0 }, tieBreak: "head-to-head" }, 2026);
  season.fixtures.flat().forEach(game => {
    const score = results[game.home + game.away];
    assert.ok(score, "Missing score for " + game.home + game.away);
    game.score = { home: score[0], away: score[1] };
  });
  return season;
}

test("two-club ties use completed head-to-head before overall goal difference", () => {
  const season = smallSeason({ ab:[2,0], ba:[1,0], ac:[1,0], ca:[0,1], ad:[0,0], da:[0,0],
    bc:[4,0], cb:[0,0], bd:[7,0], db:[0,0], cd:[0,0], dc:[0,0] });
  const rows = C.standings(season);
  assert.equal(rows[0].pts, rows[1].pts);
  assert.ok(rows[0].gf - rows[0].ga < rows[1].gf - rows[1].ga);
  assert.deepEqual(rows.slice(0,2).map(row => row.id), ["a", "b"]);
});

test("multi-club ties reapply direct results after excluding a club", () => {
  const season = smallSeason({ ab:[0,1], ba:[0,0], ac:[8,0], ca:[0,8], ad:[0,0], da:[0,0],
    bc:[1,0], cb:[1,0], bd:[0,0], db:[0,0], cd:[1,0], dc:[0,1] });
  const rows = C.standings(season);
  assert.deepEqual(rows.slice(0,3).map(row => row.pts), [9,9,9]);
  assert.deepEqual(rows.map(row => row.id), ["b", "a", "c", "d"]);
});
