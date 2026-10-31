"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),M=require("../match-engine");
const team=id=>({id,players:M.SHAPE.map((slot,i)=>({id:id+i,name:id+i,pos:slot[0],overall:80})),bench:[{id:id+"sub",name:"Reserva",pos:"DC",overall:82,fitness:100}]});
function ready(seed=41){const g=M.create({home:team("h"),away:team("a"),seconds:120,seed});g.phase="playing";g.players.forEach(p=>p.cooldown=0);return g;}
test("five difficultly levels and tactical AI preserve valid scores",()=>{
 for(const difficulty of [.68,.82,1,1.16,1.34]){const g=M.create({home:team("h"),away:team("a"),seconds:60,seed:8,difficulty});assert.equal(g.difficulty,difficulty);}
 const g=ready();g.elapsed=98;g.score=[1,0];M.step(g,.02);assert.equal(g.aiTactic,"press","rival goes on the offensive while trailing");
 const leading=ready();leading.elapsed=98;leading.score=[0,1];M.step(leading,.02);assert.equal(leading.aiTactic,"counter","rival protects its lead with quick breaks");
});
test("a failed slide awards a free kick and records a foul",()=>{
 const g=ready();g.controlled=9;const player=g.players[9],rival=g.players[20];
 Object.assign(player,{x:10,z:0});Object.assign(rival,{x:11,z:0});
 Object.assign(g.ball,{owner:20,x:11,z:0});
 g.rng=()=>.99; // deterministic unsuccessful challenge, without a random card
 assert.equal(M.action(g,"slide"),true);
 assert.equal(g.stats[0].fouls,1);
 assert.equal(g.ball.lastTouch,1);
 assert.equal(g.setPiece.kind,"free-kick");
 assert.ok(g.events.some(e=>e.type==="foul"));
});
test("a foul by a defender inside their own box gives the opponent a penalty",()=>{
 const g=ready();g.controlled=9;const player=g.players[9],rival=g.players[20];
 Object.assign(player,{x:-43.5,z:0});Object.assign(rival,{x:-44,z:0});
 Object.assign(g.ball,{owner:20,x:-44,z:0});g.rng=()=>.99;
 assert.equal(M.action(g,"slide"),true);
 assert.equal(g.stats[1].penalties,1);
 assert.equal(g.setPiece.kind,"penalty");
 assert.equal(g.ball.lastTouch,1);
 assert.ok(g.events.some(e=>e.type==="foul"&&e.penalty));
});
test("two yellow cards dismiss a player without removing him from the match roster",()=>{
 const g=ready();g.controlled=9;const player=g.players[9],rival=g.players[20];
 Object.assign(player,{x:10,z:0});Object.assign(rival,{x:11,z:0});
 const sequence=[.99,.05,.99,.99,.05,.99];let count=0;g.rng=()=>sequence[count++ % sequence.length];
 for(let i=0;i<2;i++){
   Object.assign(g.ball,{owner:20,x:11,z:0});player.cooldown=0;
   assert.equal(M.action(g,"slide"),true);
 }
 assert.equal(player.yellows,2);
 assert.equal(g.stats[0].yellows,2);
 assert.equal(g.stats[0].reds,1);
 assert.equal(player.sentOff,true);
 assert.equal(g.players.length,22);
 assert.notEqual(M.nearest(g,0,player),9);
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
