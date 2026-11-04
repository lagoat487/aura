"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),Match=require("../match-engine");
const squad=id=>({id,players:Match.SHAPE.map((slot,i)=>({id:id+i,name:id+" "+i,pos:slot[0],overall:82}))});
function ready(){
  const g=Match.create({home:squad("home"),away:squad("away"),seed:834,seconds:120});
  g.phase="playing";g.players.forEach(p=>{p.cooldown=0;p.z=25;p.x=p.team===0?-35:42;});
  g.rng=()=>.99;
  return g;
}
test("a failed foul in shooting range positions a legal 9.15-metre wall",()=>{
  const g=ready();g.controlled=9;
  const offender=g.players[9],carrier=g.players[20];
  Object.assign(offender,{x:-24,z:0});Object.assign(carrier,{x:-25,z:0});
  Object.assign(g.ball,{owner:20,x:-25,z:0});
  assert.equal(Match.action(g,"slide"),true);
  const piece=g.setPiece;
  assert.equal(piece.kind,"free-kick");
  assert.equal(piece.team,1);
  assert.ok(piece.wall.length>=3);
  assert.equal(g.phase,"restart");assert.equal(g.ball.owner,null);
  for(let i=0;i<1000&&g.phase==="restart";i++)Match.step(g,.05);
  assert.equal(g.phase,"playing");
  const taker=g.players[g.ball.owner];assert.equal(taker.team,1);
  for(const index of piece.wall){
    const p=g.players[index];
    assert.equal(p.team,0);assert.equal(p.index===0,false);
    const distance=Math.hypot(p.x-taker.x,p.z-taker.z);
    assert.ok(Math.abs(distance-9.15)<1.4,"wall should stand 9.15 m from the ball");
  }
  assert.equal(g.stats[0].fouls,1);
});
test("a direct free kick rebounds off the defending wall and records a blocked shot",()=>{
  const g=ready(),p=g.players[9];g.controlled=9;
  Object.assign(p,{x:24,z:0,faceX:1,faceZ:0,cooldown:0});
  Object.assign(g.ball,{owner:9,x:24.6,z:0,y:.22});
  const ids=[12,13,14];
  ids.forEach((id,i)=>Object.assign(g.players[id],{x:34,z:i-1,faceX:-1,faceZ:0}));
  g.setPiece={kind:"free-kick",team:0,wall:ids};
  g.rng=()=>.5;
  assert.equal(Match.action(g,"shoot",{power:.7,z:0,style:"placed"}),true);
  assert.equal(g.setPiece,null);
  assert.ok(g.wallFlight?.positions.length===3);
  for(let i=0;i<18&&!g.events.some(e=>e.type==="block");i++)Match.step(g,.05);
  assert.ok(g.events.some(e=>e.type==="block"),"the moving shot must hit the wall: "+JSON.stringify({ball:g.ball,wall:g.wallFlight,piece:g.setPiece,events:g.events,players:[g.players[12],g.players[13],g.players[14]]}));
  assert.equal(g.stats[0].blockedShots,1);
  assert.equal(g.ball.lastTouch,1);
  assert.equal(g.wallFlight,null);
  assert.equal(g.score[0],0);
});
test("taking a short free-kick pass clears the wall and remains a legal pass",()=>{
  const g=ready(),p=g.players[9],receiver=g.players[8];
  g.controlled=9;
  Object.assign(p,{x:23,z:0,faceX:1,faceZ:0});
  Object.assign(receiver,{x:35,z:0});
  Object.assign(g.ball,{owner:9,x:23.7,z:0});
  g.setPiece={kind:"free-kick",team:0,wall:[12,13,14]};
  assert.equal(Match.action(g,"pass",{x:1,z:0}),true);
  assert.equal(g.setPiece,null);assert.equal(g.wallFlight,null);
  assert.equal(g.stats[0].passes,1);
});
test("penalty shots keep shoot-only restrictions and score accounting",()=>{
  const g=ready();g.controlled=9;const p=g.players[9];
  Object.assign(p,{x:41.5,z:0});
  Object.assign(g.ball,{owner:9,x:41.5,z:0});
  g.setPiece={kind:"penalty",team:0,player:p.id};
  assert.equal(Match.action(g,"pass",{x:1}),false);
  assert.equal(Match.action(g,"shoot",{power:.78,style:"placed",z:.4}),true);
  assert.equal(g.stats[0].shots,1);assert.equal(g.setPiece,null);
});
test("no phantom wall remains after a restart or a goal",()=>{
 const g=ready();g.wallFlight={team:0,positions:[{x:20,z:0}],until:100};
 g.phase="goal";g.kickoffTeam=1;g.phaseTime=.01;
 Match.step(g,.05);
 assert.equal(g.phase,"kickoff");assert.equal(g.wallFlight,null);assert.equal(g.setPiece,null);
});
