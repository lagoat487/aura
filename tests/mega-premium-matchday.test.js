"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const Match=require("../match-engine"),Presentation=require("../match-presentation");
const team=id=>({id,name:id,players:Match.SHAPE.map((s,i)=>({id:id+i,name:id+" "+i,pos:s[0],overall:82}))});
function game(){const g=Match.create({home:team("home"),away:team("away"),seed:701,seconds:90});g.phase="playing";g.players.forEach(p=>p.cooldown=0);return g;}
test("premium turns preserve braking inertia and produce gradual, finite body lean",()=>{
 const g=game(),p=g.players[g.controlled];
 for(let i=0;i<15;i++)Match.step(g,.05,{x:1});
 const fast=p.vx;assert.ok(fast>1);
 Match.step(g,.05,{x:-1});
 assert.ok(p.vx<fast&&p.vx>-fast,"no instantaneous reversal");
 assert.ok(p.turn>0&&p.turn<=1);
 const pose=Presentation.pose(p,g);
 assert.ok(pose.turn>0&&pose.lean>0);
 assert.ok(Object.values(pose).every(Number.isFinite));
});
test("broadcast framing changes gently toward goalmouth but remains screen-safe",()=>{
 const midfield=Presentation.cameraFrame({ball:{x:0,z:0,vx:0}},"broadcast",16/9);
 const attack=Presentation.cameraFrame({ball:{x:48,z:5,vx:10}},"broadcast",16/9);
 assert.ok(attack.fov<midfield.fov&&attack.fov>=41);
 assert.ok(attack.position[1]>15);
 const middle=Presentation.smoothCamera(midfield,attack,.05);
 assert.ok(middle.position[0]>midfield.position[0]&&middle.position[0]<attack.position[0]);
});
test("shots add realistic bounded xG and extended statistics survive results",()=>{
 const g=game(),p=g.players[g.controlled];
 Object.assign(p,{x:27,z:0});Object.assign(g.ball,{owner:g.controlled,x:27.65,z:0});
 assert.equal(Match.action(g,"shoot",{power:.7,style:"placed"}),true);
 assert.equal(g.stats[0].shots,1);
 assert.ok(g.stats[0].xg>.01&&g.stats[0].xg<1);
 g.stats[0].keyPasses=2;g.phase="finished";
 const result=Match.result(g);
 assert.equal(result.stats[0].keyPasses,2);
 assert.ok(Number.isFinite(result.stats[0].xg));
 assert.equal(result.stats[0].xg,Math.round(g.stats[0].xg*100)/100);
 assert.deepEqual(result.participants[0],g.participants[0]);
});
test("interpolated replay contains turn/first-touch motion without editing live match",()=>{
 const g=game(),a=Presentation.capture(g);
 g.players[9].x+=3;g.players[9].turn=.8;g.players[9].dribbleTime=.4;
 const b=Presentation.capture(g),before=JSON.stringify(g),mid=Presentation.interpolate(a,b,.5);
 assert.equal(mid.players[9].turn,.4);
 assert.equal(mid.players[9].dribbleTime,.2);
 assert.equal(mid.players[9].x,a.players[9].x+1.5);
 mid.players[9].turn=9;assert.equal(JSON.stringify(g),before);
});
test("repeated plays keep scores and roster identities stable",()=>{
 const g=game(),ids=g.players.map(p=>p.id);
 for(let i=0;i<150;i++)Match.step(g,.016,{x:Math.sin(i*.17),z:Math.cos(i*.1)});
 assert.deepEqual(g.players.map(p=>p.id),ids);
 assert.ok(g.players.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)&&Number.isFinite(p.turn)));
 assert.ok(g.stats.every(s=>Number.isFinite(s.xg)&&s.xg>=0));
});
