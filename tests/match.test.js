"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const Match=require("../match-engine");
function team(id){return {id,name:id,players:Array.from({length:11},(_,i)=>({id:id+i,name:id+" "+i,pos:Match.SHAPE[i][0],overall:80}))};}
function boot(seed=421){return Match.create({home:team("home"),away:team("away"),seconds:30,seed});}
function ready(game){game.phase="playing";game.players.forEach(p=>p.cooldown=0);return game;}
function run(game,seconds,input={}){for(let i=0;i<Math.ceil(seconds*60);i++)Match.step(game,1/60,input);}

test("a match requires two unique eleven-player teams and preserves their identities",()=>{
  assert.throws(()=>Match.create({home:team("a"),away:{players:[]}}),/onces completos/);
  const duplicate=team("b");duplicate.players[10]=duplicate.players[9];
  assert.throws(()=>Match.create({home:team("a"),away:duplicate}),/duplicados/);
  const g=boot();assert.equal(g.players.length,22);assert.equal(g.players[9].name,"home 9");assert.equal(g.players[11].pos,"POR");
});
test("direction keys move the controlled player, diagonal speed is normalized, and sprint uses stamina",()=>{
  const a=ready(boot()),b=ready(boot()),s=ready(boot()),origin={...a.players[9]};
  Match.step(a,.05,{x:1});Match.step(b,.05,{x:1,z:1});Match.step(s,.05,{x:1,sprint:true});
  const distance=g=>Math.hypot(g.players[9].x-origin.x,g.players[9].z-origin.z);
  assert.ok(Math.abs(distance(a)-distance(b))<1e-7);assert.ok(distance(s)>distance(a));assert.ok(s.players[9].stamina<100);
});
test("passes release the ball toward a teammate and shots update the correct team stats",()=>{
  const pass=ready(boot());assert.ok(Match.action(pass,"pass",{x:1,z:1}));assert.equal(pass.ball.owner,null);assert.equal(pass.stats[0].passes,1);assert.equal(pass.players[pass.passTarget].team,0);
  const shot=ready(boot());assert.ok(Match.action(shot,"shoot",{power:.7}));assert.equal(shot.stats[0].shots,1);assert.ok(shot.ball.vx>0);assert.ok(shot.ball.vy>0);
  const before=shot.stats[0].shots;assert.equal(Match.action(shot,"shoot"),false);assert.equal(shot.stats[0].shots,before);
});
test("a goal needs to cross the line between the posts and below the bar, and only scores once",()=>{
  const goal=ready(boot());Object.assign(goal.ball,{owner:null,x:52.4,y:.3,z:0,vx:24,vy:0,vz:0,lastTouch:0,lastKicker:9});
  Match.step(goal,.05,{});assert.deepEqual(goal.score,[1,0]);assert.equal(goal.phase,"goal");assert.equal(goal.goals[0].name,"home 9");
  run(goal,1);assert.deepEqual(goal.score,[1,0]);
  for(const [y,z] of [[3.4,0],[.3,6]]){const miss=ready(boot());Object.assign(miss.ball,{owner:null,x:52.4,y,z,vx:24,vy:0,vz:0,lastTouch:0,lastKicker:9});Match.step(miss,.05);assert.deepEqual(miss.score,[0,0]);assert.ok(miss.events.some(e=>e.type==="restart"));}
});
test("goalkeepers collect a reachable shot and switch selects the nearest outfield teammate",()=>{
  const g=ready(boot());g.players[11].x=48;g.players[11].z=0;
  Object.assign(g.ball,{owner:null,x:47,y:.8,z:0,vx:4,vy:0,vz:0,lastTouch:0,lastKicker:9,freeTime:1});
  Match.step(g,.05);assert.equal(g.ball.owner,11);assert.ok(g.events.some(e=>e.type==="save"));
  g.ball.x=g.players[3].x;g.ball.z=g.players[3].z;Match.action(g,"switch");assert.equal(g.controlled,3);
});
test("pause freezes play; halftime changes ends and the completed result is immutable under more ticks",()=>{
  const g=ready(boot());g.paused=true;const old=JSON.stringify({players:g.players,ball:g.ball,elapsed:g.elapsed});run(g,1,{x:1});assert.equal(JSON.stringify({players:g.players,ball:g.ball,elapsed:g.elapsed}),old);
  g.paused=false;g.elapsed=15-.01;Match.step(g,.02);assert.equal(g.phase,"halftime");assert.equal(Match.result(g),null);
  run(g,3.5);assert.equal(g.half,2);assert.equal(Match.direction(g,0),-1);assert.ok(g.players.find(p=>p.team===0&&p.index===0).x>0);
  g.phase="playing";g.elapsed=g.seconds-.01;Match.step(g,.02);assert.equal(g.phase,"finished");const final=Match.result(g);run(g,1);assert.deepEqual(Match.result(g),final);
});
test("the same seed and inputs reproduce a full match without NaN coordinates or runaway scores",()=>{
  const a=boot(),b=boot();let ticks=0;
  while(a.phase!=="finished"&&ticks<10000){const input={x:Math.sin(ticks*.003),z:Math.cos(ticks*.005)*.5,sprint:ticks%120<30};Match.step(a,1/60,input);Match.step(b,1/60,input);if(ticks%90===0){Match.action(a,"pass",input);Match.action(b,"pass",input);}ticks++;}
  assert.equal(a.phase,"finished");assert.deepEqual(Match.result(a),Match.result(b));assert.ok(a.players.every(p=>[p.x,p.z,p.stamina].every(Number.isFinite)));assert.ok(a.score.every(n=>n<20));assert.ok(a.ball.y>=0);
});
