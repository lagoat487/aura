"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const UT=require("../ultimate-team"),Career=require("../progression"),Squad=require("../squad");
const positions=["POR","LI","DFC","DFC","LD","MCD","MC","MC","EI","DC","ED","POR","LI","DFC","LD","MC","DC","ED","EI","MC","MCD","MCO","DFC"];
function pool(){return ["a","b","c"].flatMap((cid,n)=>positions.map((pos,i)=>({id:cid+i,name:"Jugador "+cid+i,pos,overall:65+(i+n*5)%28,real:true,club:cid,catalogClub:cid,nationality:"Spain",leagueId:"liga"})));}
function career(){
 return {club:"a",season:2026,round:0,budget:4000000,wins:0,draws:0,
   competition:{fixtures:Array(12).fill([])},rosters:{a:Array.from({length:18},(_,i)=>({id:"p"+i,name:"Player "+i,pos:i===0?"POR":"MC",overall:75,potential:83,morale:70,fitness:95,wage:1000}))}};
}
test("manager press conference is available after a match and changes morale exactly once",()=>{
 const g=career();Career.initialize(g);let before=JSON.stringify(g);assert.match(Career.pressConference(g,"protect").error,/Primero/);
 assert.equal(JSON.stringify(g),before);
 g.round=1;let morale=g.rosters.a[0].morale,coins=g.budget;
 const result=Career.pressConference(g,"protect");assert.equal(result.ok,true);
 assert.equal(g.rosters.a[0].morale,morale+3);assert.equal(g.budget,coins);
 assert.equal(Career.dashboard(g).pressAvailable,false);
 before=JSON.stringify(g);
 assert.match(Career.pressConference(g,"challenge").error,/Ya atendiste/);
 assert.equal(JSON.stringify(g),before);
 g.round=2;assert.equal(Career.pressConference(g,"challenge").ok,true);
 assert.equal(g.rosters.a[0].morale,morale+1);
 assert.equal(Career.dashboard(g).pressHistory.length,2);
});
test("press morale clamps to limits and resets availability in a new season",()=>{
 const g=career();g.round=1;g.rosters.a.forEach(p=>p.morale=99);
 assert.equal(Career.pressConference(g,"protect").ok,true);
 assert.equal(g.rosters.a[0].morale,100);
 g.round=12;g.season++;g.round=0;Career.initialize(g);
 assert.equal(Career.dashboard(g).pressAvailable,false);
 g.round=1;assert.equal(Career.dashboard(g).pressAvailable,true);
});
test("evolutions upgrade exact owned card with no duplicate, zero XI changes, and limited levels",()=>{
 const u=UT.create(pool()),p=u.owned.find(x=>x.overall<=88&&x.overall>=65);
 const id=p.id,xi=u.xi.slice(),owned=u.owned.length,initial=p.overall;
 const cost=UT.evolutionCost(p),coins=u.coins;u.coins=cost*3;
 const first=UT.evolve(u,id);assert.equal(first.ok,true);
 assert.equal(u.coins,cost*3-cost);assert.equal(p.overall,initial+2);
 assert.equal(p.evolutionLevel,1);assert.equal(u.evolutions,1);
 assert.equal(u.owned.length,owned);assert.deepEqual(u.xi,xi);
 const second=UT.evolve(u,id);assert.equal(second.ok,true);assert.equal(p.evolutionLevel,2);
 const state=JSON.stringify(u);
 assert.match(UT.evolve(u,id).error,/requisitos/);assert.equal(JSON.stringify(u),state);
});
test("evolutions refuse unaffordable changes and unowned/Sigma cards without mutation",()=>{
 const u=UT.create(pool());const p=u.owned.find(x=>x.overall<=88);
 u.coins=0;const before=JSON.stringify(u);
 assert.match(UT.evolve(u,p.id).error,/monedas/);assert.equal(JSON.stringify(u),before);
 assert.match(UT.evolve(u,"missing").error,/pertenece/);assert.equal(JSON.stringify(u),before);
 assert.equal(UT.evolutionCost({overall:88,event:UT.sigma.id}),null);
});
test("elite SBC is a separate tier and no active XI is eligible to sacrifice",()=>{
 const u=UT.create(pool());
 assert.ok(UT.challenges.elite);
 assert.equal(UT.challenges.elite.reward,"premium");
 assert.ok(UT.sbcPool(u,"elite").every(p=>!u.xi.includes(p.id)));
 assert.match(UT.submitSBC(u,"elite",u.xi.slice(0,4),pool()).error,/disponible|Completa/);
});
