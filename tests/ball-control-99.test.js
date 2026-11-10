"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),M=require("../match-engine"),P=require("../provision-gameplay");
const team=id=>({players:M.SHAPE.map((s,i)=>({id:id+i,name:id+i,pos:s[0],overall:85,pace:85}))});
function ready(){
 const g=M.create({home:team("h"),away:team("a"),seconds:180,seed:244});g.phase="playing";
 g.players.forEach(p=>Object.assign(p,{x:p.team?42:-42,z:28,cooldown:0}));
 Object.assign(g.players[9],{x:0,z:0});Object.assign(g.ball,{owner:9,x:.45,z:0});return g;
}
function run(g,seconds,input){for(let i=0;i<Math.round(seconds*60);i++)M.step(g,1/60,input);}
test("sprint produces separate rolling touches while close control keeps the ball at the feet",()=>{
 function sample(closeControl){
  const p={id:"h9",team:0,x:0,z:0,vx:0,vz:0,faceX:1,faceZ:0,stamina:100,overall:85,closeControl},b={x:0,z:0};let max=0;
  for(let i=0;i<240;i++){
   const sprint=P.stamina(p,!closeControl,1/60);P.move(p,p.x+10,0,P.speed(p,sprint)*(closeControl?.6:1),1/60);
   assert.equal(P.dribble(b,p,1/60),true);if(i>30)max=Math.max(max,Math.hypot(b.x-p.x,b.z-p.z));
  }
  return {max,touches:b.dribble.touches};
 }
 const sprint=sample(false),control=sample(true);assert.ok(sprint.max>1.3);assert.ok(control.max<.7);assert.ok(control.touches>sprint.touches);
});
test("a rolling ball keeps moving between touches without being snapped to the carrier",()=>{
 const p={id:"h9",team:0,x:0,z:0,vx:7,vz:0,faceX:1,faceZ:0,sprinting:true},b={x:.5,z:0};
 P.dribble(b,p,.01);const first=b.dribble.touches,x=b.x,vx=b.vx;
 p.x+=.07;P.dribble(b,p,.01);assert.equal(b.dribble.touches,first);assert.ok(b.x>x);assert.ok(b.vx<vx);
 assert.notEqual(b.x,p.x+.8);
});
test("possession is released when a player leaves the actual ball several metres behind",()=>{
 const g=ready();g.ball.dribble={player:"0:h9",wait:1,grace:0,touches:2};g.ball.x=-4;
 M.step(g,.01);assert.equal(g.ball.owner,null);assert.equal(g.ball.dribbleLoose,true);assert.ok(g.ball.x<-3.9);
 assert.equal(g.stats[0].passes,0);assert.equal(g.score[0],0);
});
test("a defender can win an exposed touch by reaching the ball away from the carrier",()=>{
 const g=ready();g.ball.x=1.6;Object.assign(g.players[20],{x:1.6,z:0,decision:10});
 M.step(g,.01);assert.equal(g.ball.owner,20);assert.equal(g.stats[1].tackles,1);
});
test("a defender close to the body cannot magnetically steal a ball beyond reach",()=>{
 const g=ready();g.ball.x=1.7;Object.assign(g.players[20],{x:-1,z:0,decision:10});g.rng=()=>0;
 M.step(g,.01);assert.equal(g.ball.owner,9);assert.equal(g.stats[1].tackles,0);
 assert.equal(M.action(g,"tackle",{team:1}),false);
});
test("regates move left or right according to input without teleporting",()=>{
 const left=ready(),right=ready();
 assert.equal(M.action(left,"skill",{z:-1}),true);assert.equal(M.action(right,"skill",{z:1}),true);
 assert.equal(left.players[9].z,0);assert.equal(right.players[9].z,0);
 run(left,.45,{});run(right,.45,{});
 assert.ok(left.players[9].z<-.5);assert.ok(right.players[9].z>.5);
 assert.ok(Math.abs(left.players[9].z+right.players[9].z)<.02);assert.equal(M.action(left,"skill"),false);
});
test("close control overrides sprint, slows the player and preserves energy",()=>{
 const sprint=ready(),control=ready();run(sprint,1,{x:1,sprint:true});run(control,1,{x:1,sprint:true,closeControl:true});
 assert.ok(sprint.players[9].x>control.players[9].x*1.4);assert.equal(control.players[9].closeControl,true);
 assert.equal(control.players[9].sprinting,false);assert.ok(control.players[9].stamina>sprint.players[9].stamina);
});
test("letting go brakes a run in less than a third of a second without reversing direction",()=>{
 const p={x:0,z:0,vx:8.5,vz:0,faceX:1,faceZ:0,stamina:100};
 for(let i=0;i<18;i++){P.move(p,p.x,p.z,0,1/60);assert.ok(p.vx>=0);}
 assert.equal(p.vx,0);assert.ok(p.x<1.2);
});
test("ground-pass power adapts to distance while retaining player quality",()=>{
 const p={overall:85,passing:85};assert.ok(P.pass(p,.6,35).speed>P.pass(p,.6,8).speed+10);
 assert.ok(P.pass(p,.6,35).speed<37);assert.ok(P.pass({passing:95},.6,20).speed>P.pass({passing:45},.6,20).speed);
});
test("a pass requested just before receiving is delivered once by the actual receiver",()=>{
 const g=ready();Object.assign(g.players[8],{x:12,z:0});Object.assign(g.players[10],{x:24,z:0});
 Object.assign(g.ball,{owner:null,x:12,z:0,y:.22,lastTouch:0,lastKicker:9,lastKickerIdentity:{id:"h9",name:"h9",team:0},freeTime:1});
 g.passTarget=8;g.stats[0].passes=1;
 assert.equal(M.action(g,"pass",{x:1,buffer:true}),false);assert.equal(g.inputBuffer[0].player,"h8");
 M.step(g,.01);assert.equal(g.stats[0].passes,2);assert.equal(g.passTarget,10);assert.equal(g.inputBuffer[0],null);
 run(g,.1,{});assert.equal(g.stats[0].passes,2);
});
test("brief action recovery accepts one queued pass and rejects a stale command after an interruption",()=>{
 const g=ready();Object.assign(g.players[8],{x:12,z:0});g.players[9].cooldown=.1;
 assert.equal(M.action(g,"pass",{x:1,buffer:true}),false);assert.equal(g.stats[0].passes,0);
 run(g,.15,{});assert.equal(g.stats[0].passes,1);assert.equal(g.inputBuffer[0],null);
 const expired=ready();expired.ball.owner=null;expired.passTarget=8;expired.ball.x=20;
 M.action(expired,"pass",{x:1,buffer:true});run(expired,.3,{});assert.equal(expired.stats[0].passes,0);assert.equal(expired.inputBuffer[0],null);
});
test("the same inputs reproduce the revised dribbling and match result",()=>{
 const a=ready(),b=ready();
 for(let i=0;i<900;i++){
  const input={x:Math.cos(i*.009),z:Math.sin(i*.009),sprint:i%240<80,closeControl:i%240>160};
  if(i%180===90){M.action(a,"skill",input);M.action(b,"skill",input);}
  M.step(a,1/60,input);M.step(b,1/60,input);
 }
 assert.deepEqual(a.score,b.score);assert.deepEqual(a.ball,b.ball);assert.ok(a.players.every(p=>[p.x,p.z,p.vx,p.vz].every(Number.isFinite)));
});
