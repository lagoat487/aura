"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const Progression=require("../progression.js");
function game(){return {club:"home",season:2026,round:0,budget:5000000,wins:0,draws:0,wageBudget:300000,competition:{fixtures:Array(10).fill([])},rosters:{home:Array.from({length:18},(_,i)=>({id:"p"+i,name:"Jugador "+i,pos:i===0?"POR":"MC",age:20,overall:70,potential:80,value:1000000,wage:5000,fitness:95}))}};}
test("training has a real energy cost, one session per player and three sessions per round",()=>{
 const g=game();Progression.initialize(g);const budget=g.budget;
 assert.equal(Progression.train(g,"p0","intensive").ok,true);assert.equal(g.rosters.home[0].fitness,83);assert.equal(g.rosters.home[0].trainingXP,40);
 assert.match(Progression.train(g,"p0","recovery").error,/ya completó/);
 assert.equal(Progression.train(g,"p1").ok,true);assert.equal(Progression.train(g,"p2").ok,true);
 assert.match(Progression.train(g,"p3").error,/tres sesiones/);assert.equal(g.budget,budget);
 g.round++;Progression.afterMatch(g);assert.equal(Progression.dashboard(g).sessionsLeft,3);assert.equal(Progression.train(g,"p0","recovery").ok,true);assert.equal(g.rosters.home[0].fitness,95);
});
test("development awards GRL only after enough experience and never passes potential",()=>{
 const g=game(),p=g.rosters.home[0];p.potential=71;
 for(let i=0;i<3;i++){g.round=i;p.fitness=95;assert.equal(Progression.train(g,p.id,"intensive").ok,true);}
 assert.equal(p.overall,71);assert.equal(p.trainingXP,20);assert.equal(Progression.dashboard(g).objectives.find(o=>o.id==="development").current,1);
 g.round++;assert.match(Progression.train(g,p.id).error,/potencial/);assert.equal(p.overall,71);
 p.fitness=60;assert.equal(Progression.train(g,p.id,"recovery").ok,true);assert.equal(p.fitness,72);
});
test("invalid or exhausted sessions do not mutate the player or budget",()=>{
 const g=game();Progression.initialize(g);const p=g.rosters.home[0];p.fitness=60;const before=JSON.stringify(g);
 assert.ok(Progression.train(g,"missing").error);assert.ok(Progression.train(g,p.id,"bad").error);assert.ok(Progression.train(g,p.id,"intensive").error);assert.equal(JSON.stringify(g),before);
});
test("board objectives pay once and reset their claims for the next season",()=>{
 const g=game();Progression.initialize(g);const target=Progression.objectives(g)[0].target;
 assert.ok(Progression.claim(g,"wins").error);g.wins=target;
 const before=g.budget;assert.equal(Progression.claim(g,"wins").reward,1500000);assert.equal(g.budget,before+1500000);
 const paid=JSON.stringify(g);assert.ok(Progression.claim(g,"wins").error);assert.equal(JSON.stringify(g),paid);
 g.season++;g.round=0;g.wins=0;Progression.initialize(g);assert.equal(Progression.objectives(g)[0].claimed,false);assert.equal(Progression.dashboard(g).signings,0);
});
test("scouting is deterministic, costs once per round and creates explicitly fictional prospects",()=>{
 const g=game(),same=game();const before=g.budget;const result=Progression.scout(g,"ecuador");
 assert.equal(result.ok,true);assert.equal(g.budget,before-75000);assert.equal(result.report.prospects.length,3);
 assert.deepEqual(result.report,Progression.scout(same,"ecuador").report);assert.equal(new Set(result.report.prospects.map(x=>x.player.id)).size,3);
 assert.ok(result.report.prospects.every(x=>x.player.academy&&x.player.real===false&&x.player.name.startsWith("Canterano ")&&x.player.age>=16&&x.player.age<=18&&x.player.potential>x.player.overall));
 const paid=JSON.stringify(g);assert.ok(Progression.scout(g,"brazil").error);assert.equal(JSON.stringify(g),paid);
 g.round++;assert.equal(Progression.scout(g,"brazil").ok,true);
});
test("a youth signature debits the exact fee, respects capacity and cannot be duplicated",()=>{
 const g=game();Progression.scout(g,"ecuador");const prospect=g.progression.report.prospects[0],before=g.budget,count=g.rosters.home.length;
 assert.equal(Progression.signYouth(g,prospect.player.id).ok,true);assert.equal(g.budget,before-prospect.fee);assert.equal(g.rosters.home.length,count+1);assert.equal(Progression.dashboard(g).objectives.find(o=>o.id==="academy").complete,true);
 const paid=JSON.stringify(g);assert.ok(Progression.signYouth(g,prospect.player.id).error);assert.equal(JSON.stringify(g),paid);
 const second=g.progression.report.prospects[1];g.rosters.home.length=28;const full=JSON.stringify(g);assert.match(Progression.signYouth(g,second.player.id).error,/llena/);assert.equal(JSON.stringify(g),full);
});
test("youth incorporation validates funds and wages before changing the squad",()=>{
 const g=game();Progression.scout(g,"ecuador");const id=g.progression.report.prospects[0].player.id;g.budget=0;const poor=JSON.stringify(g);
 assert.match(Progression.signYouth(g,id).error,/presupuesto/);assert.equal(JSON.stringify(g),poor);
 g.budget=1000000;g.wageBudget=90000;const capped=JSON.stringify(g);assert.match(Progression.signYouth(g,id).error,/salarial/);assert.equal(JSON.stringify(g),capped);
});
test("only two academy prospects can join in a season and round completion renews sessions",()=>{
 const g=game();Progression.scout(g,"ecuador");const ids=g.progression.report.prospects.map(x=>x.player.id);
 assert.equal(Progression.signYouth(g,ids[0]).ok,true);assert.equal(Progression.signYouth(g,ids[1]).ok,true);assert.match(Progression.signYouth(g,ids[2]).error,/dos juveniles/);
 g.round=10;assert.ok(Progression.train(g,"p0").error);assert.ok(Progression.scout(g,"spain").error);assert.equal(Progression.dashboard(g).finished,true);
 g.season++;g.round=0;assert.equal(Progression.dashboard(g).sessionsLeft,3);assert.equal(Progression.dashboard(g).report,null);
});
