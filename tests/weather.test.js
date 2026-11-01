"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),M=require("../match-engine");
const squad=id=>({id,players:M.SHAPE.map(([pos],i)=>({id:id+i,name:id+" "+i,pos,overall:83}))});
function match(weather){
  const g=M.create({home:squad("home"),away:squad("away"),weather,seed:987,seconds:120});
  g.phase="playing";
  // Keep the flight isolated from all footballers to measure only pitch physics.
  g.players.forEach(p=>{p.x=p.team===0?-37:37;p.z=28;p.cooldown=0;});
  Object.assign(g.ball,{owner:null,x:0,z:0,y:.22,vx:12,vz:0,vy:-6,freeTime:0,lastKicker:9,lastTouch:0});
  return g;
}
test("matches default to clear weather and accept only the rain preset",()=>{
 assert.equal(match().weather,"clear");
 assert.equal(match("storm").weather,"clear");
 assert.equal(match("rain").weather,"rain");
});
test("a soaked pitch reduces bounce and lets a rolling ball skid farther",()=>{
 const dry=match("clear"),wet=match("rain");
 M.step(dry,.05);M.step(wet,.05);
 assert.equal(dry.ball.owner,null);assert.equal(wet.ball.owner,null);
 assert.ok(dry.ball.vy>wet.ball.vy,"wet turf should dissipate more vertical energy");
 assert.ok(Math.abs(wet.ball.vx)>Math.abs(dry.ball.vx),"wet turf should retain more horizontal momentum");
 assert.ok(Number.isFinite(wet.ball.x)&&Number.isFinite(wet.ball.y));
});
test("weather changes never alter the match roster, score or saved identities",()=>{
 const wet=match("rain"),before=wet.players.map(p=>p.id);
 for(let i=0;i<15;i++)M.step(wet,.05);
 assert.deepEqual(wet.players.map(p=>p.id),before);
 assert.deepEqual(wet.score,[0,0]);
});
