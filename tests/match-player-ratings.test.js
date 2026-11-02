"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),M=require("../match-engine");
const team=id=>({id,name:id,players:M.SHAPE.map((shape,i)=>({id:id+i,name:id+" "+i,pos:shape[0],overall:90})),
  bench:[{id:id+"sub9",name:id+" suplente",pos:"DC",overall:84}]});
function game(){
 const g=M.create({home:team("home"),away:team("away"),seed:42,seconds:180});
 g.phase="playing";g.players.forEach(p=>{p.x=p.team===0?-40:44;p.z=25;p.cooldown=0;});
 return g;
}
function passToReceiver(g){
 const passer=g.players[9],receiver=g.players[8];
 Object.assign(passer,{x:20,z:0,cooldown:0,faceX:1,faceZ:0});
 Object.assign(receiver,{x:27,z:0,cooldown:0,faceX:1,faceZ:0});
 g.controlled=9;Object.assign(g.ball,{owner:9,x:20.7,z:0,y:.22});
 assert.equal(M.action(g,"pass",{x:1,z:0}),true);
 assert.equal(g.passTarget,8);
 for(let i=0;i<20&&g.ball.owner!==8;i++)M.step(g,.05);
 assert.equal(g.ball.owner,8,"completed passes must be tracked by the engine");
}
function scoreFrom(g,index=8){
 g.controlled=index;g.players[index].cooldown=0;
 assert.equal(M.action(g,"shoot",{power:.65,style:"placed",z:0}),true);
 Object.assign(g.ball,{owner:null,x:52.3,y:.35,z:0,vx:24,vy:0,vz:0,spin:0,freeTime:1});
 M.step(g,.05);
 assert.equal(g.phase,"goal");
}
test("match starts with independent individual records for both teams, never a shared counter",()=>{
 const g=game(),a=M.report(g);
 assert.equal(a.players.length,22);assert.equal(a.manOfTheMatch.rating,6);
 assert.ok(a.players.every(p=>p.goals===0&&p.assists===0&&p.shots===0&&p.minutes===0));
 assert.notStrictEqual(g.playerStats["0:home9"],g.playerStats["1:away9"]);
});
test("a completed pass, key pass, shot, goal and assist belong to the correct players",()=>{
 const g=game();
 passToReceiver(g);
 assert.equal(g.playerStats["0:home9"].passes,1);
 assert.equal(g.playerStats["0:home9"].completed,1);
 assert.equal(g.playerStats["0:home9"].keyPasses,1);
 scoreFrom(g,8);
 assert.equal(g.playerStats["0:home8"].shots,1);
 assert.equal(g.playerStats["0:home8"].goals,1);
 assert.equal(g.playerStats["0:home9"].assists,1);
 assert.equal(g.playerStats["0:home9"].goals,0);
 assert.equal(g.goals[0].assist,"home 9");
 assert.equal(g.goals[0].assistId,"home9");
 g.phase="finished";const result=M.result(g);
 assert.equal(result.players.find(p=>p.id==="home8").goals,1);
 assert.equal(result.manOfTheMatch.id,"home8");
 assert.equal(result.goals[0].assist,"home 9");
 assert.deepEqual(result.participants[0],g.participants[0]);
});
test("an unassisted direct shot scores without inventing a teammate or a previous pass",()=>{
 const g=game(),p=g.players[9];
 Object.assign(p,{x:30,z:0,faceX:1,faceZ:0});
 g.controlled=9;Object.assign(g.ball,{owner:9,x:30.65,z:0});
 scoreFrom(g,9);
 assert.equal(g.playerStats["0:home9"].goals,1);
 assert.equal(g.playerStats["0:home9"].assists,0);
 assert.equal(g.goals[0].assist,null);
});
test("an offside or counterattack restart clears stale assist identities",()=>{
 const g=game();passToReceiver(g);
 g.ball.owner=null;g.ball.lastTouch=1;g.passTarget=8;g.ball.lastKicker=20;g.ball.lastKickerIdentity={id:"away9",name:"away 9",team:1};
 g.players[20].x=g.ball.x;g.players[20].z=g.ball.z;
 g.players[20].cooldown=0;M.step(g,.01);
 assert.equal(g.assistWindow,null);
 assert.equal(g.shotAssist,null);
});
test("subs retain the original footballer's minutes and stats without transferring them",()=>{
 const g=game();g.players[9].x=0;g.players[9].z=0;
 for(let i=0;i<15;i++)M.step(g,.05);
 const before=g.playerStats["0:home9"].minutes;
 g.paused=true;
 assert.equal(M.substitute(g,9,{id:"homesub9"}),true);
 assert.equal(g.playerStats["0:home9"].minutes,before);
 assert.equal(g.playerStats["0:homesub9"].minutes,0);
 g.paused=false;
 for(let i=0;i<10;i++)M.step(g,.05);
 assert.equal(g.playerStats["0:home9"].minutes,before);
 assert.ok(g.playerStats["0:homesub9"].minutes>0);
 g.phase="finished";
 const report=M.result(g);
 assert.ok(report.players.some(p=>p.id==="home9"));
 assert.ok(report.players.some(p=>p.id==="homesub9"));
 assert.ok(report.participants[0].includes("homesub9"));
});
test("rated reports are deterministic, bounded and snapshots cannot mutate the live match",()=>{
 const g=game();const s=g.playerStats["0:home9"];
 Object.assign(s,{minutes:90,goals:2,assists:2,onTarget:6,passes:20,completed:18,tackles:5});
 const a=M.report(g),b=M.report(g);
 assert.deepEqual(a,b);assert.equal(a.manOfTheMatch.id,"home9");
 assert.ok(a.players.every(p=>p.rating>=4.5&&p.rating<=10));
 a.players[0].goals=888;a.players[0].minutes=888;
 assert.equal(s.goals,2);assert.equal(s.minutes,90);
});
