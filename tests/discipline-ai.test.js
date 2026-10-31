"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),M=require("../match-engine");
const team=id=>({id,players:M.SHAPE.map((slot,i)=>({id:id+i,name:id+i,pos:slot[0],overall:80})),bench:[{id:id+"sub",name:"Reserva",pos:"DC",overall:82,fitness:100}]});
function ready(seed=41){const g=M.create({home:team("h"),away:team("a"),seconds:120,seed});g.phase="playing";g.players.forEach(p=>p.cooldown=0);return g;}
test("five difficultly levels and tactical AI preserve valid scores",()=>{
 for(const difficulty of [.68,.82,1,1.16,1.34]){const g=M.create({home:team("h"),away:team("a"),seconds:60,seed:8,difficulty});assert.equal(g.difficulty,difficulty);}
 const g=ready();g.elapsed=98;g.score=[1,0];M.step(g,.02);assert.equal(g.aiTactic,"counter");
 g.score=[0,1];M.step(g,.02);assert.equal(g.aiTactic,"press");
});
test("a failed sliding tackle awards a free kick or penalty and keeps team statistics",()=>{
 let attempts=0,seen=0;
 for(let seed=1;seed<60;seed++){
  const g=ready(seed);g.controlled=9;const player=g.players[9],rival=g.players[20];
  Object.assign(player,{x:10,z:0});Object.assign(rival,{x:11,z:0});
  Object.assign(g.ball,{owner:20,x:11,z:0});
  const result=M.action(g,"slide");
  attempts++;assert.equal(typeof result,"boolean");
  if(g.stats[0].fouls){seen++;assert.equal(g.ball.lastTouch,1);assert.ok(g.events.some(e=>e.type==="foul"));assert.equal(g.setPiece.kind,"free-kick");}
 }
 assert.ok(attempts===59&&seen>0);
});
test("AI substitutes only eligible resting reserves and does not overwrite home eleven",()=>{
 const g=ready();g.players[20].stamina=8;
 g.phase="halftime";g.phaseTime=.01;M.step(g,.05);
 assert.equal(g.substitutions.length,1);
 assert.equal(g.substitutions[0].team,1);
 assert.equal(g.players[20].id,"asub");
 assert.equal(g.players[9].id,"h9");
});
test("sent off players are never chosen by nearest selection",()=>{
 const g=ready();g.players[9].sentOff=true;
 assert.notEqual(M.nearest(g,0,g.players[9]),9);
});
