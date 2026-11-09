"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const P=require("../provision-gameplay"),M=require("../match-engine"),S=require("../street"),Preferences=require("../match-preferences");
const team=id=>({players:M.SHAPE.map((s,i)=>({id:id+i,name:id+i,pos:s[0],overall:80,pace:85,passing:75,shooting:88}))});
function ready(options={}){
 const g=M.create({home:team("h"),away:team("a"),seconds:180,seed:99,...options});g.phase="playing";
 g.players.forEach(p=>{p.cooldown=0;});return g;
}
test("ProVision controls select actions from possession while retaining classic controls",()=>{
 for(const [key,attack,defence] of [[" ","pass","pressure"],["k","shoot","keeperRush"],["j","lob","slide"],["l","through","switch"]]){
  assert.equal(P.keyAction(key,"provision",true),attack);assert.equal(P.keyAction(key,"provision",false),defence);
 }
 assert.equal(P.keyAction("tab"),"switch");assert.equal(P.keyAction("q"),"secondPress");
 assert.equal(P.keyAction("j","classic"),"shoot");assert.equal(P.keyAction("k","classic"),"pass");
 assert.equal(P.padAction(0,"provision",false),"pressure");assert.equal(P.padAction(1,"provision",true),"shoot");
 assert.equal(P.padAction(5,"provision",false),"secondPress");assert.equal(P.padAction(7),null);
});
test("accelerating, reversing and braking have bounded momentum at different frame rates",()=>{
 function run(hz){
  const p={x:0,z:0,vx:0,vz:0,faceX:1,faceZ:0,stamina:100,overall:80};
  for(let i=0;i<hz*2;i++)P.move(p,40,0,P.speed(p),1/hz);
  const x=p.x,forward=p.vx;P.move(p,-40,0,P.speed(p),1/hz);assert.ok(p.vx>0&&p.vx<forward,"a U-turn cannot reverse velocity instantly");
  for(let i=0;i<hz;i++)P.move(p,p.x,p.z,0,1/hz);assert.equal(p.vx,0);assert.equal(p.vz,0);return x;
 }
 assert.ok(Math.abs(run(30)-run(120))<.12);
});
test("sprint drains energy, jogging recovers it, and exhaustion reduces running speed",()=>{
 const p={stamina:100,vx:8,vz:0,pace:90};for(let i=0;i<90;i++)P.stamina(p,true,.05);
 assert.ok(p.stamina<70);const tired=P.speed(p,true);p.stamina=100;assert.ok(P.speed(p,true)>tired);
 p.stamina=40;p.vx=p.vz=0;for(let i=0;i<40;i++)P.stamina(p,false,.05);assert.ok(p.stamina>50);
});
test("charged kicks respond to power and actual passing and shooting attributes",()=>{
 const low={overall:80,passing:40,shooting:40},high={...low,passing:95,shooting:95};
 assert.ok(P.shot(high,.9).speed>P.shot(high,.2).speed+10);
 assert.ok(P.shot(high,.7).speed>P.shot(low,.7).speed);
 assert.ok(P.pass(high,.6).speed>P.pass(low,.6).speed);
 assert.ok(P.pass(high,.6,30,true).lift>P.pass(high,.6,30,false).lift);
 const g=ready();assert.equal(g.players[9].shooting,88);assert.equal(g.players[9].pace,85);
});
test("first touches approach the carrier continuously and sprint carries the ball farther ahead",()=>{
 const p={x:0,z:0,vx:6,vz:0,faceX:1,faceZ:0},ball={x:-5,z:0,y:.22};
 const old=ball.x;P.carry(ball,p,.05);assert.ok(ball.x>old&&ball.x-old<=2.1);assert.ok(ball.x<0);
 const jog={x:0,z:0},sprint={x:0,z:0};
 for(let i=0;i<60;i++){P.carry(jog,{...p,sprinting:false},1/60);P.carry(sprint,{...p,sprinting:true},1/60);}
 assert.ok(sprint.x>jog.x+.25);
});
test("held pressure approaches an opponent and release restores manual movement",()=>{
 const g=ready(),p=g.players[g.controlled],opponent=g.players[20];Object.assign(p,{x:-8,z:0});Object.assign(opponent,{x:0,z:0,cooldown:100});Object.assign(g.ball,{owner:20,x:0,z:0});
 const start=p.x;for(let i=0;i<8;i++)M.step(g,.025,{pressure:true});assert.ok(p.x>start);const speed=p.vx;
 M.step(g,.025,{});assert.ok(p.vx<speed);assert.equal(g.score[0],0);
});
test("keeper rush moves toward the ball on either half and stops when released",()=>{
 for(const half of [1,2]){
  const g=ready();g.half=half;g.elapsed=half===1?0:91;const d=M.direction(g,0),keeper=g.players[0];Object.assign(keeper,{x:-48*d,z:0});Object.assign(g.players[20],{x:-20*d,z:8});Object.assign(g.ball,{owner:20,x:-20*d,z:8});
  const before=keeper.x;for(let i=0;i<8;i++)M.step(g,.025,{keeperRush:true});assert.ok((keeper.x-before)*d>0);
  M.step(g,.025,{});assert.equal(g.teamIntents[0].keeperRush,undefined);
 }
});
test("defensive roles exclude human players, keep separate cover and never select a sent-off player",()=>{
 const g=ready({localTwoPlayer:true});g.ball.owner=20;let roles=P.roles(g,.05);
 for(let team=0;team<2;team++){
  assert.notEqual(roles.chasers[team],roles.covers[team]);
  for(const i of [roles.chasers[team],roles.covers[team]]){assert.notEqual(i,g.controlled);assert.notEqual(i,g.awayControlled);assert.notEqual(g.players[i].index,0);}
 }
 g.players[roles.chasers[0]].sentOff=true;roles=P.roles(g,.05);assert.equal(g.players[roles.chasers[0]].sentOff,false);
});
test("a teammate assigned to chase defends only out of possession and makes an attacking run otherwise",()=>{
 const g=ready();g.players.forEach(p=>Object.assign(p,{x:p.team?40:-40,z:25}));
 Object.assign(g.players[9],{x:0,z:0});Object.assign(g.players[8],{x:2,z:0});Object.assign(g.ball,{owner:9,x:.48,z:0});
 M.step(g,.05);assert.equal(g.defensiveRoles.chasers[0],8);assert.ok(g.players[8].x>2,"a teammate must open a passing option instead of chasing his own carrier");
});
test("a slide can start before contact and moves continuously toward a loose ball",()=>{
 const g=ready(),p=g.players[g.controlled];g.ball.owner=null;Object.assign(g.ball,{x:12,z:0});Object.assign(p,{x:0,z:0});
 assert.equal(M.action(g,"slide",{x:1,z:0}),true);assert.equal(p.x,0);
 M.step(g,.025);assert.ok(p.x>0&&p.x<.25);assert.ok(p.slideTime>0);assert.equal(M.action(g,"slide"),false);
});
test("existing match preferences migrate without changing duration, camera or unrelated mode saves",()=>{
 const legacy={...Preferences.DEFAULTS,seconds:480,camera:"tele",difficulty:1.34};delete legacy.controls;
 const data=new Map([[Preferences.KEY,JSON.stringify({version:1,settings:legacy})],["aura-career-v1","keep-career"],["aura-ut-v1","keep-team"]]);
 const storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 const loaded=Preferences.load(storage);assert.equal(loaded.controls,"provision");assert.equal(loaded.seconds,480);assert.equal(loaded.camera,"tele");
 assert.equal(Preferences.save(storage,{...loaded,controls:"classic"}),true);assert.equal(Preferences.load(storage).controls,"classic");
 assert.equal(data.get("aura-career-v1"),"keep-career");assert.equal(data.get("aura-ut-v1"),"keep-team");
});
test("both production entrypoints load shared gameplay before 11v11 and Volta",()=>{
 for(const name of ["index.html","mobile.html"]){
  const html=fs.readFileSync(path.join(__dirname,"..",name),"utf8"),profile=html.indexOf('src="./provision-gameplay.js?v=9.9-pvf1"');
  assert.ok(profile>0);assert.ok(profile<html.indexOf('src="./match-engine-99.js'));assert.ok(profile<html.indexOf('src="./street.js'));assert.match(html,/VISION 9\.9/);
 }
 assert.equal(S.create(team("h").players.slice(0,3),team("a").players.slice(0,3)).gameplay,"provision");
});
