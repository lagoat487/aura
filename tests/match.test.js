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
  for(const type of ["pass","through","shoot","switch","tackle"])assert.equal(Match.action(g,type,{x:1}),false);
  g.paused=false;g.elapsed=15-.01;Match.step(g,.02);assert.equal(g.phase,"halftime");assert.equal(Match.result(g),null);
  run(g,3.5);assert.equal(g.half,2);assert.equal(Match.direction(g,0),-1);assert.ok(g.players.find(p=>p.team===0&&p.index===0).x>0);
  g.phase="playing";g.elapsed=g.seconds-.01;Match.step(g,.02);assert.equal(g.phase,"finished");const final=Match.result(g);run(g,1);assert.deepEqual(Match.result(g),final);
});
test("the same seed and inputs reproduce a full match without NaN coordinates or runaway scores",()=>{
  const a=boot(),b=boot();let ticks=0;
  while(a.phase!=="finished"&&ticks<10000){const input={x:Math.sin(ticks*.003),z:Math.cos(ticks*.005)*.5,sprint:ticks%120<30};Match.step(a,1/60,input);Match.step(b,1/60,input);if(ticks%90===0){Match.action(a,"pass",input);Match.action(b,"pass",input);}ticks++;}
  assert.equal(a.phase,"finished");assert.deepEqual(Match.result(a),Match.result(b));assert.ok(a.players.every(p=>[p.x,p.z,p.stamina].every(Number.isFinite)));assert.ok(a.score.every(n=>n<20));assert.ok(a.ball.y>=0);
});
test("assisted passes respect a purely lateral aim and prefer a clear passing lane",()=>{
  const arrange=()=>{
    const g=ready(boot());g.players.forEach(p=>{p.x=p.team===0?-50:48;p.z=32;});
    Object.assign(g.players[9],{x:0,z:0,faceX:1,faceZ:0});Object.assign(g.ball,{x:.8,z:0});return g;
  };
  const lateral=arrange();Object.assign(lateral.players[7],{x:0,z:18});Object.assign(lateral.players[8],{x:18,z:0});
  assert.ok(Match.action(lateral,"pass",{x:0,z:1}));assert.equal(lateral.passTarget,7);
  const safe=arrange();Object.assign(safe.players[7],{x:15,z:0});Object.assign(safe.players[8],{x:14,z:8});Object.assign(safe.players[15],{x:8,z:0});
  assert.ok(Match.action(safe,"pass",{x:1,z:0}));assert.equal(safe.passTarget,8);
});
test("through balls create a receiving run and an intercepted pass belongs to the defending team's statistics",()=>{
  const g=ready(boot());g.players.forEach(p=>{p.x=p.team===0?-48:48;p.z=30;});Object.assign(g.players[9],{x:0,z:0});Object.assign(g.ball,{x:.8,z:0});Object.assign(g.players[8],{x:15,z:5});
  assert.ok(Match.action(g,"through",{x:1,z:.3}));assert.equal(g.passTarget,8);assert.equal(g.stats[0].throughBalls,1);
  const x=g.players[8].x;Match.step(g,.05);assert.ok(g.players[8].x>x);assert.ok(g.passRun.x>g.players[8].x);
  Object.assign(g.players[15],{x:24,z:0});Object.assign(g.ball,{x:24,y:.3,z:0,vx:0,vz:0,vy:0});Match.step(g,.01);
  assert.equal(g.ball.owner,15);assert.equal(g.stats[1].interceptions,1);assert.equal(g.stats[0].completed,0);assert.equal(g.passRun,null);
});
test("goalkeepers anticipate the crossing point of an incoming shot",()=>{
  const g=ready(boot());Object.assign(g.players[11],{x:48,z:0});
  Object.assign(g.ball,{owner:null,x:35,y:1,z:-3,vx:20,vy:0,vz:8,lastTouch:0,lastKicker:9});
  Match.step(g,.05);assert.ok(g.players[11].z>0,"keeper moves toward the projected shot, even when the current ball is on the other side");
});
test("fatigue and close defensive pressure reduce shot accuracy for the same seeded attempt",()=>{
  const clear=ready(boot()),pressed=ready(boot());
  for(const g of [clear,pressed]){g.players.forEach(p=>{p.x=p.team===0?-40:0;p.z=30;});Object.assign(g.players[9],{x:30,z:0});Object.assign(g.ball,{x:30.8,z:0});}
  pressed.players[9].stamina=15;Object.assign(pressed.players[15],{x:31,z:0});
  Match.action(clear,"shoot",{power:.7});Match.action(pressed,"shoot",{power:.7});assert.ok(Math.abs(pressed.ball.vz)>Math.abs(clear.ball.vz));
});
function substituteGame(){
  const home=team("home"),away=team("away");
  home.players[9].fitness=63;home.bench=Array.from({length:7},(_,i)=>({id:"sub"+i,name:"Suplente "+i,pos:i===6?"POR":"MC",overall:78,fitness:95}));
  away.bench=[{id:"away-sub",name:"Rival suplente",pos:"DC",overall:81}];
  return ready(Match.create({home,away,seconds:30,seed:421}));
}
test("substitutions require a paused match, an eligible bench player, matching keeper role and at most five changes",()=>{
  const g=substituteGame(),incoming=g.benches[0][0],before={...g.players[9]};assert.equal(before.stamina,63);
  assert.equal(Match.substitute(g,9,incoming),false);g.paused=true;
  assert.equal(Match.substitute(g,9,{id:"invented",name:"Fake",pos:"DC",overall:99}),false);
  assert.equal(Match.substitute(g,0,incoming),false);assert.equal(Match.substitute(g,9,g.benches[0][6]),false);
  assert.equal(Match.substitute(g,9,{...incoming,overall:99}),true);assert.equal(g.players[9].overall,78,"bench data remains authoritative");
  assert.equal(g.players[9].stamina,95);for(const key of ["x","z","baseX","baseZ","team","index","number"])assert.equal(g.players[9][key],before[key]);
  assert.equal(g.participants[0].length,12);assert.equal(g.benches[0].some(p=>p.id===incoming.id),false);
  g.benches[0].push({id:before.id,name:before.name,pos:before.pos,overall:80});assert.equal(Match.substitute(g,9,{id:before.id}),false,"a participant cannot re-enter");
  for(let i=1;i<5;i++)assert.equal(Match.substitute(g,i,{id:"sub"+i}),true);
  assert.equal(Match.substitute(g,5,{id:"sub5"}),false);assert.equal(g.substitutions.length,5);
  assert.equal(Match.substitute(g,20,{id:"away-sub"}),true,"each team has its own allowance");
});
test("paused tactics validate their value and finished results retain all participants and substitutions",()=>{
  const g=substituteGame();assert.equal(Match.setTactic(g,"press"),false);g.paused=true;
  assert.equal(Match.setTactic(g,"invalid"),false);assert.equal(Match.setTactic(g,"press"),true);assert.equal(g.tactic,"press");
  for(const phase of ["kickoff","goal","halftime","playing"]){g.phase=phase;assert.equal(Match.setTactic(g,"counter"),true);}
  assert.ok(Match.substitute(g,9,{id:"sub0"}));g.phase="finished";
  assert.equal(Match.setTactic(g,"balanced"),false);assert.equal(Match.substitute(g,1,{id:"sub1"}),false);
  const result=Match.result(g);assert.ok(result.participants[0].includes("home9"));assert.ok(result.participants[0].includes("sub0"));assert.equal(result.substitutions[0].out,"home9");
  result.participants[0].pop();result.substitutions[0].out="changed";assert.equal(Match.result(g).participants[0].length,12);assert.equal(Match.result(g).substitutions[0].out,"home9");
});
test("a substitute uses the canonical bench rating for the occupied formation slot",()=>{
  for(const [slot,rating,expected] of [[9,69,69],[1,74,74],[9,NaN,78],[9,120,99],[9,-5,1]]){
    const g=substituteGame();g.paused=true;
    const candidate=g.benches[0][0];candidate.slotRatings=Array(11).fill(78);candidate.slotRatings[slot]=rating;
    assert.ok(Match.substitute(g,slot,{id:candidate.id,overall:99,slotRatings:Array(11).fill(99)}));
    assert.equal(g.players[slot].overall,expected,"formation, condition and morale must apply to substitutes as they do to starters");
    assert.equal(g.participants[0].filter(id=>id===candidate.id).length,1);assert.equal(g.substitutions.at(-1).in,candidate.id);
  }
  const fallback=substituteGame();fallback.paused=true;fallback.benches[0][0].slotRatings={9:99};
  assert.ok(Match.substitute(fallback,9,{id:"sub0"}));assert.equal(fallback.players[9].overall,78,"malformed ratings fall back to the bench player's base rating");
});
test("substituting the shooter while a shot is paused preserves the scorer's identity",()=>{
  const g=substituteGame();Object.assign(g.players[9],{x:51,z:0});Object.assign(g.ball,{x:51,z:0});assert.ok(Match.action(g,"shoot",{power:.7}));
  Object.assign(g.ball,{x:52.4,y:.3,z:0,vx:24,vz:0,vy:0});g.paused=true;assert.ok(Match.substitute(g,9,{id:"sub0"}));g.paused=false;
  Match.step(g,.05);assert.equal(g.goals[0].name,"home 9");assert.equal(g.goals[0].player,"home9");
});
