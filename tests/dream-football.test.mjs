import test from 'node:test';
import assert from 'node:assert/strict';
import {FootballSimulation,crossingGoal} from '../dream/football.js';
test('Goal requires crossing the line between posts below the crossbar',()=>{
  assert.equal(crossingGoal({x:52,z:0,y:1},{x:53,z:0,y:1}),1);
  assert.equal(crossingGoal({x:-52,z:0,y:1},{x:-53,z:0,y:1}),-1);
  assert.equal(crossingGoal({x:52,z:4,y:1},{x:53,z:4,y:1}),0);
  assert.equal(crossingGoal({x:52,z:0,y:3},{x:53,z:0,y:3}),0);
  assert.equal(crossingGoal({x:51,z:0,y:1},{x:52,z:0,y:1}),0);
});
test('A tick has 22 players, bounded movement and finite positions',()=>{
  let deadBall=false;const sim=new FootballSimulation({onEvent:e=>{if(['goal','halftime','throw-in','goal-kick','corner'].includes(e.type))deadBall=true;}});assert.equal(sim.players.length,22);
  for(let tick=0;tick<900;tick++){
    deadBall=false;const before=sim.players.map(p=>({x:p.x,z:p.z}));sim.update(1/60,{x:1,z:0,sprint:true});
    sim.players.forEach((p,i)=>{assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z));assert.ok(Math.abs(p.x)<=51.4&&Math.abs(p.z)<=33);if(!deadBall)assert.ok(Math.hypot(p.x-before[i].x,p.z-before[i].z)<.6,'open play movement must stay continuous');});
  }
});
test('Pausing freezes time, ball and player positions',()=>{
  const sim=new FootballSimulation();sim.paused=true;const before=JSON.stringify({t:sim.elapsed,p:sim.players,b:sim.ball});sim.update(.05,{x:1,z:1,sprint:true});assert.equal(JSON.stringify({t:sim.elapsed,p:sim.players,b:sim.ball}),before);
});
test('Passing releases a physical ball and selects a teammate',()=>{
  const sim=new FootballSimulation(),old=sim.controlled;sim.pass(1,0);assert.equal(sim.owner,null);assert.ok(Math.hypot(sim.ball.vx,sim.ball.vz)>10);assert.notEqual(sim.controlled,old);
});
test('A shot through an unguarded goal counts once',()=>{
  const events=[],sim=new FootballSimulation({onEvent:e=>events.push(e)});const p=sim.selected;p.x=46;p.z=0;p.shooting=99;
  sim.players.filter(q=>q.team===1).forEach(q=>{q.x=-30;q.z=25;});sim.shoot();
  for(let i=0;i<60;i++)sim.update(1/60,{x:0,z:0,sprint:false});
  assert.equal(sim.score[0],1);assert.equal(events.filter(e=>e.type==='goal').length,1);assert.equal(sim.shots[0],1);
});
test('A full match switches ends and emits a final result exactly once',()=>{
  const events=[],sim=new FootballSimulation({duration:4,onEvent:e=>events.push(e)});
  for(let i=0;i<1500;i++){sim.update(.02);if(sim.finished)break;}
  assert.equal(sim.half,2);assert.equal(sim.attack,-1);assert.ok(sim.finished);assert.equal(events.filter(e=>e.type==='halftime').length,1);assert.equal(events.filter(e=>e.type==='end').length,1);
  sim.update(.02);assert.equal(events.filter(e=>e.type==='end').length,1);
});
