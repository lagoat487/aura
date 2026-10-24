/* Shared by the browser and Node's built-in test runner; no runtime dependencies. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.AuraCompetitions = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // Freeze edition membership in each save: later data updates must not alter a season.
  const definitions = [
    {
      id: "laliga",
      name: "LaLiga",
      country: "España",
      referenceSeason: "2026/27",
      clubIds: ["alaves", "athletic", "atletico", "barcelona", "betis", "celta",
        "deportivo", "elche", "espanyol", "getafe", "levante", "madrid", "malaga",
        "osasuna", "racing", "rayo", "sociedad", "sevilla", "valencia", "villarreal"],
      points: { win: 3, draw: 1, loss: 0 },
      tieBreak: "head-to-head",
    },
    {
      id: "exhibition",
      name: "Liga internacional de exhibición",
      country: "Internacional",
      referenceSeason: null,
      clubIds: ["barcelona", "madrid", "city", "liverpool", "boca", "river", "guayaquil",
        "quito", "milan", "munich", "paris", "london", "emelec", "idv", "atletico",
        "arsenal", "united", "juventus", "acmilan", "dortmund", "flamengo", "palmeiras",
        "nacional", "america"],
      points: { win: 3, draw: 1, loss: 0 },
      tieBreak: "goal-difference",
    },
  ];

  function getDefinition(id) {
    const definition = definitions.find(item => item.id === id);
    if (!definition) throw new Error("Competición desconocida: " + id);
    return definition;
  }

  function generateFixtures(clubIds, season, competitionId) {
    if (clubIds.length < 2 || new Set(clubIds).size !== clubIds.length ||
        clubIds.some(id => typeof id !== "string" || !id)) {
      throw new Error("Una liga necesita al menos dos clubes con IDs únicos.");
    }
    // Circle method, with a bye for an odd number of participants.
    const rotating = clubIds.slice();
    if (rotating.length % 2) rotating.push(null);
    const firstLeg = [];
    for (let round = 0; round < rotating.length - 1; round++) {
      const games = [];
      for (let pair = 0; pair < rotating.length / 2; pair++) {
        let home = rotating[pair], away = rotating[rotating.length - 1 - pair];
        if (!home || !away) continue;
        // Alternate the fixed pairing by round and the others by position.
        // This balances each half-season without long all-home/all-away runs.
        if (pair === 0 ? round % 2 : pair % 2) [home, away] = [away, home];
        games.push({ home, away });
      }
      firstLeg.push(games);
      rotating.splice(1, 0, rotating.pop());
    }
    const rounds = firstLeg.concat(firstLeg.map(games =>
      games.map(game => ({ home: game.away, away: game.home }))));
    return rounds.map((games, index) => games.map(game => ({
      id: [competitionId, season, index + 1, game.home, game.away].join(":"),
      round: index + 1,
      home: game.home,
      away: game.away,
      score: null,
    })));
  }

  function createSeason(definition, season) {
    return {
      id: definition.id,
      name: definition.name,
      referenceSeason: definition.referenceSeason,
      season,
      clubIds: definition.clubIds.slice(),
      points: { ...definition.points },
      tieBreak: definition.tieBreak,
      fixtures: generateFixtures(definition.clubIds, season, definition.id),
    };
  }

  function validScore(score) {
    return score && Number.isInteger(score.home) && Number.isInteger(score.away) &&
      score.home >= 0 && score.away >= 0;
  }

  function playedRounds(competition) {
    return competition.fixtures.filter(games => games.every(game => game.score !== null)).length;
  }

  function validateSeason(competition) {
    try {
      getDefinition(competition.id);
      if (!Number.isInteger(competition.season) || !Array.isArray(competition.clubIds) ||
          !["head-to-head", "goal-difference"].includes(competition.tieBreak) ||
          ["win", "draw", "loss"].some(key => !Number.isInteger(competition.points[key]) ||
            competition.points[key] < 0)) return false;
      const expected = generateFixtures(competition.clubIds, competition.season, competition.id);
      if (competition.fixtures.length !== expected.length) return false;
      let pending = false;
      return competition.fixtures.every((games, index) => {
        if (games.length !== expected[index].length) return false;
        const complete = games.every(game => validScore(game.score));
        const unplayed = games.every(game => game.score === null);
        if ((!complete && !unplayed) || (pending && complete)) return false;
        pending ||= unplayed;
        return games.every((game, i) => ["id", "round", "home", "away"].every(key =>
          game[key] === expected[index][i][key]));
      });
    } catch { return false; }
  }

  function simulateNextRound(competition, simulate) {
    const index = competition.fixtures.findIndex(games => games.some(game => game.score === null));
    if (index === -1) return null;
    const games = competition.fixtures[index];
    if (games.some(game => game.score !== null)) throw new Error("Jornada incompleta en el guardado.");
    // Calculate everything first. A failed simulator must not leave half a matchday saved.
    const scores = games.map(game => simulate(game.home, game.away));
    if (!scores.every(validScore)) throw new Error("Resultado de simulación inválido.");
    games.forEach((game, i) => { game.score = { home: scores[i].home, away: scores[i].away }; });
    return { round: index + 1, games };
  }

  function aggregate(clubIds, games, points) {
    const rows = new Map(clubIds.map(id => [id, { id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }]));
    for (const game of games) {
      if (!validScore(game.score) || !rows.has(game.home) || !rows.has(game.away)) continue;
      const home = rows.get(game.home), away = rows.get(game.away), score = game.score;
      home.p++; away.p++;
      home.gf += score.home; home.ga += score.away;
      away.gf += score.away; away.ga += score.home;
      if (score.home === score.away) {
        home.d++; away.d++; home.pts += points.draw; away.pts += points.draw;
      } else {
        const winner = score.home > score.away ? home : away;
        const loser = winner === home ? away : home;
        winner.w++; loser.l++; winner.pts += points.win; loser.pts += points.loss;
      }
    }
    return rows;
  }

  function standings(competition) {
    const games = competition.fixtures.flat();
    const rows = [...aggregate(competition.clubIds, games, competition.points).values()];
    const fallback = (a, b) => (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf ||
      a.id.localeCompare(b.id);

    function resolveTie(group) {
      if (group.length < 2) return group;
      if (competition.tieBreak === "head-to-head") {
        const ids = group.map(row => row.id);
        const mutual = games.filter(game => ids.includes(game.home) && ids.includes(game.away));
        // Use overall goal difference until every head-to-head match has been played.
        if (mutual.length === ids.length * (ids.length - 1) && mutual.every(game => validScore(game.score))) {
          const mini = aggregate(ids, mutual, competition.points);
          const criteria = group.length === 2 ? ["gd"] : ["pts", "gd"];
          for (const criterion of criteria) {
            const value = row => criterion === "pts" ? mini.get(row.id).pts :
              mini.get(row.id).gf - mini.get(row.id).ga;
            const buckets = new Map();
            for (const row of group) {
              const key = value(row);
              if (!buckets.has(key)) buckets.set(key, []);
              buckets.get(key).push(row);
            }
            if (buckets.size > 1) return [...buckets.keys()].sort((a, b) => b - a)
              .flatMap(key => resolveTie(buckets.get(key)));
          }
        }
      }
      // Fair-play cards / neutral playoffs are not simulated; ID is a stable last resort.
      return group.slice().sort(fallback);
    }

    const pointsGroups = new Map();
    for (const row of rows) {
      if (!pointsGroups.has(row.pts)) pointsGroups.set(row.pts, []);
      pointsGroups.get(row.pts).push(row);
    }
    return [...pointsGroups.keys()].sort((a, b) => b - a).flatMap(pts => resolveTie(pointsGroups.get(pts)));
  }

  return { definitions, getDefinition, generateFixtures, createSeason, playedRounds,
    validateSeason, simulateNextRound, standings };
});
