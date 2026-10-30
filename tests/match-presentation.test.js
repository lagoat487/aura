'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../match-presentation'),M=require('../match-engine');
const team=id=>({id,name:id,players:M.SHAPE.map((s,i)=>({id:id+i,name:id+' '+i,pos:s[0],overall:80}))});
const game=()=>M.create({home:team('home'),away:team('away'),seed:21});
test('broadcast cameras stay finite at both goal lines, sidelines and portrait screen sizes',()=>{
 for(const aspect of [.45,.8,1,1.4,2.3])for(const mode of ['broadcast','tele','wide','tactical','replay'])for(const x of [-53,0,53])for(const z of [-35,0,35]){
  const c=P.cameraFrame({ball:{x,z,vx:32}},mode,aspect);
  assert.ok([...c.position,...c.target,c.fov].every(Number.isFinite));assert.ok(c.position[1]>15);assert.ok(Math.abs(c.target[0])<50);assert.ok(c.fov>30&&c.fov<60);
 }
 const invalid=P.cameraFrame({ball:{x:NaN,z:Infinity,vx:undefined}});assert.ok([...invalid.position,...invalid.target].every(Number.isFinite));
});
test('camera follow converges without teleporting or moving at zero delta',()=>{
 const first=P.cameraFrame({ball:{x:-35,z:-20}}),next=P.cameraFrame({ball:{x:35,z:20}}),old=JSON.stringify(first);
 assert.deepEqual(P.smoothCamera(first,next,0),first);
 let c=P.smoothCamera(first,next,.016);assert.ok(c.position[0]>first.position[0]&&c.position[0]<next.position[0]);
 for(let i=0;i<200;i++)c=P.smoothCamera(c,next,.016);assert.ok(Math.abs(c.position[0]-next.position[0])<.001);assert.equal(JSON.stringify(first),old);
});
test('replay frames interpolate ball and player positions while keeping substitutions discrete and results untouched',()=>{
 const g=game(),a=P.capture(g);g.players[9].x+=10;g.ball.x+=20;g.visualTime+=2;const b=P.capture(g),before=JSON.stringify(g),middle=P.interpolate(a,b,.5);
 assert.equal(middle.players[9].x,a.players[9].x+5);assert.equal(middle.ball.x,a.ball.x+10);assert.equal(middle.visualTime,1);middle.players[9].x=900;middle.score[0]=5;
 assert.equal(JSON.stringify(g),before);assert.equal(a.players[9].x,-1.4);assert.equal(a.score[0],0);
 b.players[9].id='substitute';assert.equal(P.interpolate(a,b,.9).players[9].id,a.players[9].id);
});
test('visual appearances follow identity and kit alternatives separate two light or two dark teams',()=>{
 assert.deepEqual(P.appearance({id:'real:277643',index:2}),P.appearance({id:'real:277643',index:9}));
 const white=['#f4f1e8','#ede7db','#b99751'],red=['#ca2734','#a71924','#f4e8c2'];
 assert.equal(P.separateKits(white,white)[1][0],'#20344f');assert.equal(P.separateKits(red,red)[1][0],'#eeeade');assert.deepEqual(P.separateKits(white,red),[white,red]);
});
test('acceleration, braking and turning are gradual while animations freeze during pause',()=>{
 const g=game();g.phase='playing';const p=g.players[g.controlled];M.step(g,.05,{x:1});const slow=p.vx;for(let i=0;i<15;i++)M.step(g,.05,{x:1});const fast=p.vx;
 assert.ok(fast>slow&&slow>0);M.step(g,.05,{});assert.ok(p.vx>0&&p.vx<fast);M.step(g,.05,{x:-1});assert.ok(p.vx<fast);
 g.ball.owner=g.controlled;p.cooldown=0;assert.equal(M.action(g,'shoot',{power:.7}),true);assert.equal(p.action,'shoot');M.step(g,.05,{});assert.ok(P.pose(p,g).kick>0);
 const t=p.actionTime,clock=g.visualTime;g.paused=true;M.step(g,.05,{x:1});assert.equal(p.actionTime,t);assert.equal(g.visualTime,clock);
});
test('woodwork deflects a ball inside the goal line without scoring or awarding a second goal',()=>{
 for(const [y,z] of [[.5,3.65],[2.44,0]]){
  const g=game();g.phase='playing';Object.assign(g.ball,{owner:null,x:52.4,y,z,vx:25,vz:0,vy:0,lastTouch:0,lastKicker:9});M.step(g,.02);
  assert.deepEqual(g.score,[0,0]);assert.ok(g.ball.vx<0);assert.ok(g.events.some(e=>e.type==='woodwork'));assert.equal(g.phase,'playing');
 }
});
test('keeper poses distinguish held catches, lateral parries, high dives and low smothers',()=>{
 const g=game(),p=g.players[11];Object.assign(p,{actionTime:.35,actionDuration:.7,action:'save',diveSide:0,saveHeight:1});
 const held=P.pose(p,g);assert.equal(held.dive,0);assert.ok(held.save>0);
 Object.assign(p,{action:'parry',diveSide:-1});const parry=P.pose(p,g);assert.ok(parry.dive<0);
 Object.assign(p,{action:'dive',saveHeight:2.6});const high=P.pose(p,g);assert.ok(high.saveLift>0);assert.ok(high.highSave>held.highSave);
 Object.assign(p,{action:'smother',saveHeight:.22});const low=P.pose(p,g);assert.ok(low.crouch>held.crouch);assert.equal(low.saveLift,0);
 for(const pose of [held,parry,high,low])assert.ok(Object.values(pose).every(Number.isFinite));
});
