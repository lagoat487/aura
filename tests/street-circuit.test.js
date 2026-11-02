"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const C=require("../street-circuit"),Street=require("../street");
const players=label=>Array.from({length:3},(_,i)=>({id:label+i,name:label+" "+i,pos:"MC",overall:75}));
test("VOLTA circuit creates four valid rivals and isolates the club from fixtures",()=>{
  for(const home of ["barcelona","emelec","boca","madrid","city","river"]){
    const c=C.create(home,{goalLimit:3,seconds:60,difficulty:.78});
    assert.equal(c.fixtures.length,4);
    assert.equal(new Set(c.fixtures).size,4);
    assert.ok(c.fixtures.every(id=>id!==home));
    assert.deepEqual([c.goalLimit,c.seconds,c.difficulty],[3,60,.78]);
    assert.equal(C.next(c),c.fixtures[0]);
    assert.equal(c.points,0);assert.equal(c.status,"playing");
  }
  const d=C.create("guayaquil",{seconds:999,goalLimit:14,difficulty:3});
  assert.deepEqual([d.seconds,d.goalLimit,d.difficulty],[120,5,1]);
});
test("VOLTA tour scores matches once, tracks streaks, awards gold and freezes the table when complete",()=>{
  const c=C.create("barcelona");
  const scores=[[3,0],[2,2],[4,1],[5,0]];
  const points=[3,1,3,3];
  for(let i=0;i<scores.length;i++){
    const rival=C.next(c),[home,away]=scores[i];
    const match=C.complete(c,{home,away});
    assert.equal(match.opponent,rival);
    assert.equal(match.points,points[i]);
    assert.equal(c.results.length,i+1);
  }
  assert.equal(c.points,10);assert.equal(c.wins,3);assert.equal(c.draws,1);assert.equal(c.losses,0);
  assert.equal(c.goals,14);assert.equal(c.conceded,3);
  assert.equal(c.streak,2);assert.equal(c.bestStreak,2);
  assert.equal(c.status,"finished");assert.equal(C.next(c),null);
  assert.equal(C.rank(c).name,"ORO");
  const snapshot=JSON.stringify(c);
  assert.equal(C.complete(c,{home:5,away:0}),false);
  assert.equal(JSON.stringify(c),snapshot);
});
test("VOLTA lower scores get bronze/silver and defeat ends a win streak",()=>{
  const c=C.create("barcelona");
  C.complete(c,{home:4,away:0});C.complete(c,{home:0,away:5});
  assert.equal(c.streak,0);assert.equal(c.bestStreak,1);
  C.complete(c,{home:5,away:1});C.complete(c,{home:2,away:2});
  assert.equal(C.rank(c).name,"PLATA");
  const d=C.create("barcelona");
  for(let i=0;i<4;i++)C.complete(d,{home:0,away:1});
  assert.equal(C.rank(d).name,"BRONCE");
});
test("VOLTA rejects incomplete, invalid, unsafe and impossible scores without corrupting its record",()=>{
  const c=C.create("barcelona",{goalLimit:3}),snapshot=JSON.stringify(c);
  for(const score of [null,{}, {home:-1,away:0},{home:5,away:0},{home:1.3,away:0},
      {home:0,away:NaN},{home:Infinity,away:0},{home:1,away:3.5}]){
    assert.equal(C.complete(c,score),false);
    assert.equal(JSON.stringify(c),snapshot);
  }
});
test("Street mode supports configurable goals and duration and exposes accurate final statistics",()=>{
  const game=Street.create(players("h"),players("a"),{goalLimit:3,seconds:60,difficulty:1.16});
  assert.equal(game.goalLimit,3);assert.equal(game.seconds,60);assert.equal(game.difficulty,1.16);
  game.wait=0;Street.step(game,.04);
  assert.ok(game.stats[0].possession>0);
  const p=game.players[game.controlled];p.cooldown=0;
  assert.equal(Street.action(game,"shoot",{z:0}),true);
  assert.equal(game.stats[0].shots,1);
  game.ball.owner=null;game.ball.x=44.9;game.ball.z=0;game.ball.vx=30;game.ball.vz=0;
  Street.step(game,.05);
  assert.equal(game.score[0],1);assert.equal(game.goalLog[0].team,0);
  assert.equal(game.stats[0].goals,1);assert.equal(Street.result(game),null);
  game.elapsed=59.98;game.wait=0;Street.step(game,.05);
  assert.equal(game.done,true);assert.equal(game.elapsed,60);
  const report=Street.result(game);
  assert.equal(report.home,1);assert.equal(report.away,0);assert.equal(report.goalLimit,3);
  assert.equal(report.stats[0].shots,1);assert.equal(report.stats[0].goals,1);
  report.stats[0].shots=800;assert.equal(game.stats[0].shots,1);
});
