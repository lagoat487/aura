"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),M=require("../match-engine");
const club=id=>({id,players:M.SHAPE.map((slot,i)=>({id:id+i,name:id+" "+i,pos:slot[0],overall:84}))});
function start(localTwoPlayer=true){
 const g=M.create({home:club("home"),away:club("away"),seed:42,seconds:180,localTwoPlayer});
 g.phase="playing";g.players.forEach(p=>p.cooldown=0);
 g.controlled=9;g.awayControlled=20;
 return g;
}
test("local 2P allows two different controlled players to move in opposite directions",()=>{
 const g=start(),home=g.players[g.controlled],away=g.players[g.awayControlled];
 const x1=home.x,x2=away.x;
 for(let i=0;i<12;i++)M.step(g,.05,{x:1,away:{x:-1}});
 assert.ok(home.x>x1+.5,"first player moves right");
 assert.ok(away.x<x2-.5,"second player moves left");
 assert.equal(g.players.length,22);
 assert.equal(g.localTwoPlayer,true);
});
test("the away player may shoot or pass only when his team owns the ball",()=>{
 const g=start(),away=g.players[20];
 assert.equal(M.action(g,"shoot",{team:1,power:.7}),false);
 Object.assign(away,{x:-15,z:0});
 Object.assign(g.ball,{owner:20,x:-15.7,z:0,y:.22});
 assert.equal(M.action(g,"shoot",{team:1,power:.7}),true);
 assert.equal(g.stats[1].shots,1);
 assert.equal(g.stats[0].shots,0);
 assert.equal(g.ball.lastTouch,1);
 assert.equal(g.controlled,9);
});
test("local away control follows possession and switching never changes home control",()=>{
 const g=start(),away=g.players[18];
 Object.assign(g.ball,{owner:null,lastTouch:1,freeTime:1});
 // Incoming control follows the actual receiver, while home keeps its owner.
 g.players.forEach(p=>{p.cooldown=0;p.x=p.team===0?-30:42;p.z=25;});
 away.x=4;away.z=0;Object.assign(g.ball,{x:4,z:0,y:.23,vx:0,vy:0,vz:0,lastKicker:20,lastTouch:1});
 M.step(g,.01);
 assert.equal(g.ball.owner,18);
 assert.equal(g.awayControlled,18);
 assert.equal(g.controlled,9);
 assert.equal(M.action(g,"switch",{team:1}),true);
 assert.equal(g.controlled,9);
});
test("solo mode keeps its existing AI opponent and keyboard input semantics",()=>{
 const solo=start(false),p=solo.players[solo.awayControlled];
 const before=p.x;
 for(let i=0;i<10;i++)M.step(solo,.05,{x:0,away:{x:-1}});
 assert.notEqual(solo.awayControlled,null);
 assert.equal(M.action(solo,"shoot",{team:1}),false);
 assert.ok(Number.isFinite(p.x));
 assert.equal(solo.localTwoPlayer,false);
});
test("local exhibitions keep match results independent of any career or Ultimate Team save",()=>{
 const g=start();
 const ids=g.participants.map(xs=>xs.slice());
 g.phase="finished";
 const result=M.result(g);
 assert.deepEqual(result.participants,ids);
 assert.equal(result.home,0);assert.equal(result.away,0);
 assert.equal(result.stats.length,2);
 assert.equal(g.players.length,22);
});
