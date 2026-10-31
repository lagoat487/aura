"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),M=require("../match-engine");
function ready(){
  const make=id=>({id,players:M.SHAPE.map((slot,i)=>({id:id+i,name:id+i,pos:slot[0],overall:85}))});
  const g=M.create({home:make("h"),away:make("a"),seed:617,seconds:120});
  g.phase="playing";g.players.forEach(p=>{p.cooldown=0;p.x=p.team?42:-40;p.z=27;});
  Object.assign(g.players[9],{x:0,z:0,faceX:1,faceZ:0});
  Object.assign(g.ball,{owner:9,x:.65,z:0,y:.22});
  return g;
}
test("premium shot styles affect speed, precision and ball spin",()=>{
  const normal=ready(),power=ready(),placed=ready(),curve=ready();
  for(const [g,style] of [[normal,"normal"],[power,"power"],[placed,"placed"],[curve,"curve"]])
    assert.equal(M.action(g,"shoot",{power:.75,z:.5,style}),true);
  assert.ok(power.ball.vx>normal.ball.vx);
  assert.ok(Math.abs(placed.ball.vz)<Math.abs(normal.ball.vz));
  assert.notEqual(curve.ball.spin,0);
  const old=curve.ball.vz;M.step(curve,.05);assert.notEqual(curve.ball.vz,old);
});
test("lofted passes rise higher than ground passes and target teammates",()=>{
  const ground=ready(),lob=ready();
  for(const g of [ground,lob])Object.assign(g.players[8],{x:25,z:0});
  assert.equal(M.action(ground,"pass",{x:1}),true);
  assert.equal(M.action(lob,"lob",{x:1}),true);
  assert.equal(lob.passTarget,ground.passTarget);
  assert.ok(lob.ball.vy>ground.ball.vy);
});
test("skill moves require possession and respect stamina and cooldown",()=>{
  const g=ready(),p=g.players[9];
  assert.equal(M.action(g,"skill"),true);
  assert.ok(p.skillTime>0&&p.skillCooldown>0);
  assert.equal(M.action(g,"skill"),false);
  assert.ok(p.stamina<100);
  g.ball.owner=null;assert.equal(M.action(g,"skill"),false);
});
test("offside is judged on passing and penalized only if the target touches",()=>{
  const g=ready(),d=M.direction(g,0);
  Object.assign(g.players[9],{x:10,z:0});Object.assign(g.ball,{x:10.7,z:0});
  Object.assign(g.players[8],{x:35,z:0});
  g.players.filter(p=>p.team===1).forEach((p,i)=>{p.x=i===0?49:20;p.z=25;});
  assert.equal(M.action(g,"pass",{x:1}),true);
  assert.equal(g.offsideTarget,8);
  const target=g.players[8];target.x=35;target.z=0;target.cooldown=0;
  Object.assign(g.ball,{owner:null,x:35,z:0,y:.23,vx:0,vz:0,vy:0,freeTime:1});
  M.step(g,.01);
  assert.ok(g.events.some(e=>e.type==="offside"));
  assert.equal(g.ball.lastTouch,1);
  assert.equal(g.offsideTarget,null);
  assert.equal(d,1);
});
test("legal target in own half does not trigger offside",()=>{
  const g=ready();Object.assign(g.players[8],{x:-12,z:0});
  assert.equal(M.action(g,"pass",{x:-1}),true);
  assert.equal(g.offsideTarget,null);
});
