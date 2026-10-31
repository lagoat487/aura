"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),M=require("../match-engine");
const make=id=>({id,players:M.SHAPE.map((slot,i)=>({id:id+i,name:id+i,pos:slot[0],overall:80}))});
const ready=()=>{const g=M.create({home:make("h"),away:make("a"),seconds:120,seed:42});g.phase="playing";g.players.forEach(p=>{p.cooldown=0;p.x=p.team?35:-30;p.z=28});return g};
test("crosses deliver an aerial ball toward a teammate and count separately",()=>{
 const g=ready();g.controlled=8;Object.assign(g.players[8],{x:30,z:-26});
 Object.assign(g.players[9],{x:43,z:0});Object.assign(g.ball,{owner:8,x:30.5,z:-26,y:.22});
 assert.equal(M.action(g,"cross"),true);assert.equal(g.ball.owner,null);
 assert.ok(g.ball.vy>=5.5);assert.equal(g.stats[0].crosses,1);assert.equal(g.stats[0].passes,1);
 assert.equal(g.passTarget,9);assert.ok(g.events.some(e=>e.type==="cross"));
});
test("corner awarded after defender touch places the ball in the attacking corner",()=>{
 const g=ready();g.players.forEach(p=>{p.x=p.team?20:-20;p.z=20});
 Object.assign(g.ball,{owner:null,x:52.45,y:.3,z:24,vx:18,vy:0,vz:0,lastTouch:1,lastKicker:12,freeTime:1});
 M.step(g,.05);assert.equal(g.setPiece?.kind,"corner");assert.equal(g.setPiece.team,0);
 assert.equal(g.ball.owner!==null,true);assert.ok(g.ball.z>30);
 const taker=g.players[g.ball.owner];g.controlled=g.ball.owner;taker.cooldown=0;
 assert.equal(M.action(g,"cross"),true);assert.equal(g.setPiece,null);
 assert.equal(g.stats[0].crosses,1);assert.equal(g.offsideTarget,null);
});
test("goal kicks after attacker touch remain goal kicks, not corners",()=>{
 const g=ready();Object.assign(g.ball,{owner:null,x:52.45,y:.3,z:23,vx:18,vy:0,vz:0,lastTouch:0,lastKicker:9,freeTime:1});
 M.step(g,.05);assert.equal(g.setPiece,null);
 assert.ok(g.events.some(e=>e.type==="restart"&&e.text==="Saque de portería"));
});
