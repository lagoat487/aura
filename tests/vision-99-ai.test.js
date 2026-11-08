"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const Engine=require("../match-engine-99.js");
const team=id=>({id,players:Engine.SHAPE.map((s,i)=>({id:id+i,name:id+" "+i,pos:s[0],overall:80}))});
function boot(seed=15){
 const g=Engine.create({home:team("home"),away:team("away"),seed,seconds:60});
 g.phase="playing";for(const p of g.players)p.cooldown=0;return g;
}
test("VISION 9.9: AI responds to repeated forward passes and a changing score",()=>{
 const g=boot();
 g.elapsed=24;g.stats[0].throughBalls=3;Engine.step(g,1/60,{});
 assert.equal(g.aiTactic,"compact");
 g.half=2;g.elapsed=45;g.score=[2,1];Engine.step(g,1/60,{});
 assert.equal(g.aiTactic,"press");
 g.score=[1,2];Engine.step(g,1/60,{});
 assert.equal(g.aiTactic,"counter");
});
test("VISION 9.9: pressured AI carrier finds a teammate to pass to",()=>{
 const g=boot(20),p=g.players[20];
 Object.assign(g.ball,{owner:20,x:p.x,z:p.z});
 Object.assign(g.players[9],{x:p.x+1.1,z:p.z});
 p.decision=0;p.cooldown=0;
 Engine.step(g,1/60,{});
 assert.ok(g.stats[1].passes>0);
});
test("VISION 9.9: identical seeds and inputs stay deterministic with finite player positions",()=>{
 const a=boot(22),b=boot(22);
 for(let i=0;i<360;i++){
   const input={x:i%30<15?1:0,z:i%40<20?.2:0};
   Engine.step(a,1/60,input);Engine.step(b,1/60,input);
 }
 for(let i=0;i<a.players.length;i++){
   const p=a.players[i],q=b.players[i];
   for(const value of [p.x,p.z,p.vx,p.vz])assert.ok(Number.isFinite(value));
   assert.ok(Math.abs(p.x-q.x)<1e-10);
   assert.ok(Math.abs(p.z-q.z)<1e-10);
 }
});
