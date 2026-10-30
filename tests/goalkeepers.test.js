'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),M=require('../match-engine');
const team=id=>({id,name:id,players:M.SHAPE.map((s,i)=>({id:id+i,name:id+' '+i,pos:s[0],overall:80}))});
function duel({half=1,defending=1,rating=80,difficulty=1,seed=42}={}){
 const g=M.create({home:team('home'),away:team('away'),seconds:180,seed,difficulty});g.phase='playing';g.half=half;
 g.players.forEach(p=>Object.assign(p,{x:0,z:30,cooldown:99}));
 const keeper=g.players[defending*11],attacker=g.players[(1-defending)*11+9],d=M.direction(g,defending);
 Object.assign(keeper,{x:-48*d,z:0,cooldown:0,overall:rating});Object.assign(attacker,{x:-42*d,z:0,cooldown:0});
 Object.assign(g.ball,{x:attacker.x-d*.7,z:0,y:.22,owner:g.players.indexOf(attacker),lastTouch:attacker.team,lastKicker:g.players.indexOf(attacker)});
 return {g,keeper,attacker,d};
}
function tick(g,seconds,dt=1/60,input={}){for(let i=0;i<Math.ceil(seconds/dt)&&g.phase==='playing';i++)M.step(g,dt,input);}
test('keepers challenge a frontal dribble in their area on either team and after the change of ends',()=>{
 for(const half of [1,2])for(const defending of [0,1]){
  const {g,keeper,attacker,d}=duel({half,defending});Object.assign(keeper,{x:-47*d});Object.assign(attacker,{x:-45.8*d,cooldown:99});Object.assign(g.ball,{x:-46.6*d});
  M.step(g,.05,{});
  assert.equal(g.ball.owner,g.players.indexOf(keeper),'a physically reachable dribble must not pass through the keeper');assert.equal(g.stats[defending].saves,0,'winning a dribble is not a saved shot');assert.equal(g.stats[defending].claims,1);
  assert.equal(g.score[0]+g.score[1],0);assert.ok(g.events.some(e=>e.type==='claim'));assert.ok(keeper.cooldown>0);assert.equal(keeper.action,'smother');
 }
});
test('a keeper can stop a reachable fast shot before the ball crosses the line',()=>{
 for(const dt of [1/120,1/60,.05]){
  const {g,keeper,d}=duel();Object.assign(keeper,{x:-51.1*d});Object.assign(g.ball,{owner:null,x:-50.9*d,y:1,z:0,vx:-34*d,vy:0,vz:0,lastTouch:0,freeTime:1});
  tick(g,.12,dt);assert.equal(g.stats[1].saves,1);assert.deepEqual(g.score,[0,0]);
 }
});
test('hard stretched saves are parried away from goal and cannot count twice',()=>{
 const {g,keeper,d}=duel();Object.assign(keeper,{x:-49*d,z:-1.5});Object.assign(g.ball,{owner:null,x:-48*d,y:1.5,z:.5,vx:-33*d,vy:0,vz:0,lastTouch:0,freeTime:1});
 M.step(g,.05);assert.equal(g.stats[1].saves,1);assert.equal(g.stats[1].parries,1);assert.equal(g.ball.owner,null);assert.equal(g.ball.lastTouch,1);assert.ok(g.ball.vx*d>0,'parry must travel away from own goal');assert.ok(Math.abs(g.ball.vz)>3);assert.ok(keeper.cooldown>0);
 tick(g,.15);assert.equal(g.stats[1].saves,1);assert.deepEqual(g.score,[0,0]);
});
test('soft central shots are held, while shots past a beaten keeper and high misses stay unsaved',()=>{
 const held=duel();Object.assign(held.g.ball,{owner:null,x:47.5,y:.8,z:0,vx:8,vy:0,vz:0,lastTouch:0,freeTime:1});M.step(held.g,.05);assert.equal(held.g.ball.owner,11);assert.equal(held.g.stats[1].saves,1);assert.equal(held.g.stats[1].parries,0);
 const beaten=duel();Object.assign(beaten.keeper,{x:46,z:-3});Object.assign(beaten.g.ball,{owner:null,x:51,y:.5,z:3,vx:31,vy:0,vz:0,lastTouch:0,freeTime:1});tick(beaten.g,.15);assert.deepEqual(beaten.g.score,[1,0]);assert.equal(beaten.g.stats[1].saves,0);
 const behind=duel();Object.assign(behind.keeper,{x:49,z:0});Object.assign(behind.g.ball,{owner:null,x:51,y:.5,z:0,vx:31,vy:0,vz:0,lastTouch:0,freeTime:1});tick(behind.g,.15);assert.deepEqual(behind.g.score,[1,0],'a shot already behind the keeper must not be pulled back');
 const high=duel();Object.assign(high.g.ball,{owner:null,x:50.9,y:3.8,z:0,vx:32,vy:0,vz:0,lastTouch:0,freeTime:1});tick(high.g,.15);assert.deepEqual(high.g.score,[0,0]);assert.equal(high.g.stats[1].saves,0);
 const overbar=duel({rating:95});Object.assign(overbar.keeper,{x:49});Object.assign(overbar.g.ball,{owner:null,x:48,y:2.7,z:0,vx:33,vy:0,vz:0,lastTouch:0,freeTime:1});M.step(overbar.g,.05);assert.equal(overbar.g.ball.lastTouch,1);assert.equal(overbar.g.stats[1].saves,0,'touching a shot above the bar must not inflate save statistics');
});
test('keeper handling and pause are deterministic and depend on the actual keeper rating',()=>{
 const low=duel({rating:60}),high=duel({rating:95});
 for(const {g,keeper} of [low,high]){Object.assign(g.ball,{owner:null,x:47.6,y:.8,z:0,vx:28,vy:0,vz:0,lastTouch:0,freeTime:1});g.paused=true;const snapshot=JSON.stringify(g);M.step(g,.05);assert.equal(JSON.stringify(g),snapshot);g.paused=false;M.step(g,.05);assert.equal(g.stats[1].saves,1);}
 assert.equal(low.g.ball.owner,null,'less assured handling spills a powerful shot');assert.equal(high.g.ball.owner,11,'elite handling can hold the same central shot');
});
test('near-post dribbles are contested but a successful one-on-one can still end in a goal',()=>{
 let stopped=0,goals=0;
 for(let seed=1;seed<=30;seed++){
  const {g,attacker}=duel({seed:seed*7919});Object.assign(attacker,{x:39,z:3});Object.assign(g.ball,{x:39.7,z:3});let shot=false;
  for(let frame=0;frame<480&&g.phase==='playing'&&!g.stats[1].saves&&!g.stats[1].claims;frame++){
   if(!shot&&g.ball.owner===9&&attacker.x>=49)shot=M.action(g,'shoot',{z:1,power:.7});
   M.step(g,1/60,!shot?{x:1,sprint:true}:{});
  }
  if(g.stats[1].claims||g.stats[1].saves)stopped++;if(g.score[0])goals++;
 }
 assert.ok(stopped>15,'a keeper must contest most identical frontal approaches');assert.ok(goals>0&&goals<15,'beating the keeper must remain possible');
});
test('keepers cannot smother a dribble outside their penalty area or claim a miss as a saved shot',()=>{
 const outside=duel();Object.assign(outside.keeper,{x:34.5,z:0});Object.assign(outside.attacker,{x:33.3,z:0});Object.assign(outside.g.ball,{x:34,z:0});M.step(outside.g,.05);
 assert.equal(outside.g.ball.owner,9);assert.equal(outside.g.stats[1].claims,0);
 const backpass=duel();Object.assign(backpass.g.ball,{owner:null,x:47.8,y:.4,z:0,vx:4,vy:0,vz:0,lastTouch:1,lastKicker:14,freeTime:1});M.step(backpass.g,.05);assert.equal(backpass.g.ball.owner,11);assert.equal(backpass.g.stats[1].saves,0);
});
test('higher difficulty helps the opposing keeper reach a marginal shot without changing the goal',()=>{
 const easy=duel({difficulty:.78}),hard=duel({difficulty:1.16});
 for(const {g,keeper} of [easy,hard]){
  Object.assign(keeper,{x:49,z:-2.15});Object.assign(g.ball,{owner:null,x:48,y:1.5,z:.45,vx:33,vy:0,vz:0,lastTouch:0,freeTime:1});M.step(g,.05);assert.deepEqual(g.score,[0,0]);
 }
 assert.equal(easy.g.stats[1].saves,0);assert.equal(hard.g.stats[1].saves,1);
});
test('a held save allows the full recovery time and then a normal keeper outlet pass',()=>{
 const {g}=duel();Object.assign(g.players[15],{x:30,z:0,cooldown:0});Object.assign(g.ball,{owner:null,x:47.5,y:.8,z:0,vx:8,vy:0,vz:0,lastTouch:0,freeTime:1});M.step(g,.05);assert.equal(g.ball.owner,11);
 tick(g,.5);assert.equal(g.ball.owner,11,'the keeper recovery clock must not tick twice per frame');assert.equal(g.stats[1].passes,0);
 tick(g,.4);assert.equal(g.stats[1].passes,1);assert.equal(g.ball.owner,null);assert.ok(g.ball.vx<0,'the outlet travels away from his own goal');
});
