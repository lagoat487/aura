"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const P=require("../match-presentation");
test("nets flex only behind the scoring goal and return to rest without drifting",()=>{
 const game={phase:"goal",half:1,phaseTime:2.5,goals:[{team:0}]};
 const positive=P.goalNetImpulse(game,1);
 assert.ok(Number.isFinite(positive)&&positive!==0);
 assert.equal(P.goalNetImpulse(game,-1),0);
 game.half=2;
 assert.equal(P.goalNetImpulse(game,1),0);
 assert.notEqual(P.goalNetImpulse(game,-1),0);
 game.phase="kickoff";
 assert.equal(P.goalNetImpulse(game,-1),0);
});
test("empty game, absent goals and invalid clocks produce safe stationary nets",()=>{
 assert.equal(P.goalNetImpulse(null,1),0);
 assert.equal(P.goalNetImpulse({},-1),0);
 assert.equal(P.goalNetImpulse({phase:"goal",half:1,phaseTime:NaN,goals:[{team:1}]},-1),0);
});
test("net recoil is damped, bounded and never generates an invalid geometry offset",()=>{
 const game={phase:"goal",half:1,goals:[{team:1}],phaseTime:2.7};
 let max=0;
 for(let i=0;i<54;i++){
   game.phaseTime=2.7-i*.05;
   const value=P.goalNetImpulse(game,-1);
   assert.ok(Number.isFinite(value));
   max=Math.max(max,Math.abs(value));
 }
 assert.ok(max>0&&max<=.34);
 assert.ok(Math.abs(P.goalNetImpulse({...game,phaseTime:.05},-1))<.04);
});
