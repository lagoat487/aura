"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),Squad=require("../squad"),Progression=require("../progression");
function game(){
 const players=Array.from({length:18},(_,i)=>({id:"p"+i,name:"Jugador "+i,pos:i===0?"POR":i<5?"DFC":i<9?"MC":"DC",overall:70+(i%4),potential:85,morale:75,fitness:90,wage:1000}));
 return {club:"home",season:2026,round:0,budget:500000,wageBudget:1000000,wins:0,draws:0,news:[],competition:{fixtures:Array(12).fill([])},rosters:{home:players}};
}
test("medical absence automatically calls up a reserve without corrupting the XI",()=>{
 const g=game();Squad.ensure(g);const before=g.squad.xi.slice(),injured=before[9];
 g.rosters.home.find(p=>p.id===injured).injuryRounds=3;
 Squad.ensure(g);
 assert.equal(g.squad.xi.length,11);assert.equal(new Set(g.squad.xi).size,11);
 assert.ok(!g.squad.xi.includes(injured));
 assert.equal(Squad.players(g).length,11);
 assert.equal(Squad.swap(g,g.squad.xi[9],injured),false);
 assert.equal(g.rosters.home.length,18);
});
test("medical treatment costs budget once per player and round and heals safely",()=>{
 const g=game(),p=g.rosters.home[13];p.injuryRounds=2;Progression.initialize(g);
 const budget=g.budget;const charge=Progression.rehabilitationCost(p);
 assert.equal(charge,80000);
 assert.equal(Progression.rehabilitate(g,p.id).ok,true);
 assert.equal(p.injuryRounds,1);assert.equal(g.budget,budget-charge);
 const snapshot=JSON.stringify(g);
 assert.match(Progression.rehabilitate(g,p.id).error,/ya recibió/);
 assert.equal(JSON.stringify(g),snapshot);
 g.round++;Progression.initialize(g);
 assert.equal(Progression.rehabilitate(g,p.id).ok,true);
 assert.equal(p.injuryRounds,0);
 assert.equal(Progression.rehabilitationCost(p),null);
});
test("fixture healing runs once, never edits budgets or repeats damage on renders",()=>{
 const g=game(),p=g.rosters.home[14];p.injuryRounds=3;Progression.initialize(g);
 g.round=1;g.history=[{round:1,season:2026,g1:2,g2:1}];const original=g.budget;
 Progression.afterMatch(g);
 assert.equal(p.injuryRounds,2);
 const after=JSON.stringify(g);
 Progression.afterMatch(g);Progression.dashboard(g);
 assert.equal(JSON.stringify(g),after);
 assert.equal(g.budget,original);
});
test("medical recovery refuses unavailable or unaffordable procedures",()=>{
 const g=game(),p=g.rosters.home[13];p.injuryRounds=3;g.budget=0;Progression.initialize(g);
 const before=JSON.stringify(g);
 assert.match(Progression.rehabilitate(g,p.id).error,/presupuesto/);
 assert.match(Progression.rehabilitate(g,"missing").error,/no requiere/);
 assert.equal(JSON.stringify(g),before);
});
