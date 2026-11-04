"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),M=require("../match-engine");
const team=id=>({players:M.SHAPE.map((s,i)=>({id:id+i,name:id+i,pos:s[0],overall:80}))});
function ready(half=1,difficulty=1){
  const g=M.create({home:team("h"),away:team("a"),seed:41,seconds:180,difficulty});
  g.phase="playing";g.half=half;g.elapsed=half===1?0:91;
  for(const p of g.players)Object.assign(p,{x:p.baseX*M.direction(g,p.team),z:p.baseZ*M.direction(g,p.team),cooldown:0});
  return g;
}
const positions=g=>g.players.map(p=>({x:p.x,z:p.z}));
function continuous(g,before,limit){
  g.players.forEach((p,i)=>{if(!p.sentOff)assert.ok(Math.hypot(p.x-before[i].x,p.z-before[i].z)<=limit+1e-8,p.name+" moved too far in one tick");});
}
function finishRestart(g,dt=1/60){
  const elapsed=g.elapsed,score=g.score.slice(),stats=JSON.stringify(g.stats),ball={x:g.ball.x,z:g.ball.z};
  let ticks=0;
  while(g.phase==="restart"&&ticks++<1800){
    const before=positions(g);
    for(const type of ["pass","shoot","through","cross","tackle","switch"])assert.equal(M.action(g,type,{x:1}),false);
    M.step(g,dt,{x:1,sprint:true,away:{x:-1,sprint:true}});
    continuous(g,before,6*dt);
    assert.equal(g.elapsed,elapsed,"the dead-ball walk must not consume match time");
    assert.deepEqual(g.score,score);assert.equal(JSON.stringify(g.stats),stats);
    assert.deepEqual({x:g.ball.x,z:g.ball.z},ball,"the restart ball must stay fixed");
  }
  assert.equal(g.phase,"playing","a restart must finish without an AI deadlock");
  assert.equal(g.restart,null);assert.notEqual(g.ball.owner,null);
}
test("goal kicks never teleport an outfielder and wait for the goalkeeper on either end",()=>{
  for(const half of [1,2])for(const defending of [0,1])for(const difficulty of [.68,.82,1,1.16,1.34])for(const dt of [.01,.05]){
    const g=ready(half,difficulty),edge=-M.direction(g,defending)*52.5;
    Object.assign(g.ball,{owner:null,x:edge-Math.sign(edge)*.1,z:10,y:.3,vx:Math.sign(edge)*30,vz:0,vy:0,lastTouch:1-defending});
    const before=positions(g);M.step(g,dt);continuous(g,before,.65);
    assert.equal(g.phase,"restart");assert.equal(g.ball.owner,null);assert.equal(g.restart.index,defending*11);
    finishRestart(g,dt);
    assert.equal(g.ball.owner,defending*11);assert.equal(g.players[g.ball.owner].index,0);
  }
});
test("corners and throw-ins walk to the ball, pause safely and retain the right taker",()=>{
  for(const half of [1,2])for(const attacking of [0,1])for(const kind of ["corner","throw"]){
    const g=ready(half);g.localTwoPlayer=true;
    const edge=M.direction(g,attacking)*52.5;
    Object.assign(g.ball,kind==="corner"?
      {owner:null,x:edge-Math.sign(edge)*.1,z:24,y:.3,vx:Math.sign(edge)*30,vz:0,vy:0,lastTouch:1-attacking}:
      {owner:null,x:12,z:-33.95,y:.3,vx:0,vz:-20,vy:0,lastTouch:1-attacking});
    const before=positions(g);M.step(g,.02);continuous(g,before,.65);
    assert.equal(g.phase,"restart");const index=g.restart.index;
    assert.equal(g.players[index].team,attacking);assert.notEqual(g.players[index].index,0);
    if(kind==="corner")assert.equal(g.setPiece.kind,"corner");
    g.paused=true;const paused=JSON.stringify(g);M.step(g,.05);assert.equal(JSON.stringify(g),paused);g.paused=false;
    finishRestart(g);
    assert.equal(g.ball.owner,index);assert.equal(attacking?g.awayControlled:g.controlled,index);
  }
});
test("free-kick walls and penalties form by walking and cannot produce a goal while preparing",()=>{
  for(const half of [1,2])for(const attacking of [0,1])for(const penalty of [false,true]){
    const g=ready(half),d=M.direction(g,attacking),victim=g.players[attacking*11+9],offender=g.players[(1-attacking)*11+9];
    Object.assign(victim,{x:(penalty?44:25)*d,z:0});Object.assign(offender,{x:victim.x-d,z:0});
    if(attacking===1)g.controlled=g.players.indexOf(offender);else {g.localTwoPlayer=true;g.awayControlled=g.players.indexOf(offender);}
    Object.assign(g.ball,{owner:g.players.indexOf(victim),x:victim.x,z:0});g.rng=()=>.99;
    const before=positions(g);assert.equal(M.action(g,"slide",{team:1-attacking}),true);continuous(g,before,0);
    assert.equal(g.phase,"restart");assert.equal(g.setPiece.kind,penalty?"penalty":"free-kick");
    const wall=g.setPiece.wall?.slice();finishRestart(g);
    if(wall)for(const i of wall)assert.ok(Math.abs(Math.hypot(g.players[i].x-g.ball.x,g.players[i].z-g.ball.z)-9.15)<.3);
    if(penalty){assert.ok(Math.abs(g.ball.x-41.5*d)<.01);assert.equal(g.stats[attacking].penalties,1);}
  }
});
test("offside restarts clear the original pass without awarding a phantom completed pass",()=>{
  const g=ready();g.players.forEach(p=>{p.x=p.team?40:-40;p.z=25;});
  Object.assign(g.players[8],{x:12,z:0});
  Object.assign(g.ball,{owner:null,x:12,y:.22,z:0,vx:0,vz:0,vy:0,lastTouch:0,lastKicker:9,freeTime:1});
  g.passTarget=8;g.offsideTarget=8;
  M.step(g,.01);assert.equal(g.phase,"restart");assert.equal(g.restart.team,1);
  assert.ok(g.events.some(e=>e.type==="offside"));finishRestart(g);
  assert.equal(g.stats[0].completed,0);assert.equal(g.stats[1].completed,0);
});
test("a dismissed goalkeeper is not brought back for a goal kick",()=>{
  const g=ready();g.players[11].sentOff=true;
  Object.assign(g.ball,{owner:null,x:52.4,y:.3,z:10,vx:30,vz:0,vy:0,lastTouch:0});
  M.step(g,.02);assert.equal(g.phase,"restart");assert.notEqual(g.restart.index,11);finishRestart(g);
  assert.equal(g.players[g.ball.owner].team,1);assert.equal(g.players[11].sentOff,true);
});
