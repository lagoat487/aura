"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),Loans=require("../loans"),Squad=require("../squad");
const positions=["POR","LI","DFC","DFC","LD","MCD","MC","MC","EI","DC","ED","POR","DC","DFC","MC","EI","LD","MCO"];
function game(){
 const roster=cid=>positions.map((pos,i)=>({id:cid+"-"+i,name:cid+" player "+i,pos,overall:80+i%5,age:25,wage:10000,value:10000000,club:cid,contractEnd:2028,fitness:90,morale:80}));
 const g={club:"home",season:2026,round:3,budget:20000000,wageBudget:500000,rosters:{home:roster("home"),away:roster("away"),rival:roster("rival")},news:[]};
 Squad.ensure(g);return g;
}
test("one-season loan moves only one player and charges the stated fee exactly once",()=>{
 const g=game(),id="away-9",terms=Loans.terms(g.rosters.away[9]),before=g.budget;
 const result=Loans.borrow(g,id);
 assert.equal(result.ok,true);
 assert.equal(result.loan.expires,2027);
 assert.equal(result.loan.optionPrice,terms.optionPrice);
 assert.equal(result.loan.fee,terms.fee);
 assert.equal(g.budget,before-terms.fee);
 assert.equal(g.rosters.home.filter(p=>p.id===id).length,1);
 assert.equal(g.rosters.away.some(p=>p.id===id),false);
 assert.equal(g.rosters.home.find(p=>p.id===id).onLoan.from,"away");
 assert.equal(g.transactions.length,1);
 const snapshot=structuredClone(g);
 assert.ok(Loans.borrow(g,id).error);assert.deepEqual(g,snapshot);
});
test("a temporary player can be bought permanently without another squad slot or double charge",()=>{
 const g=game(),id="away-9";Loans.borrow(g,id);
 const loan=Loans.active(g)[0],before=g.budget;
 const bought=Loans.buyOption(g,id);
 assert.equal(bought.ok,true);assert.equal(g.budget,before-loan.optionPrice);
 assert.equal(g.rosters.home.some(p=>p.id===id),true);
 assert.equal(g.rosters.home.find(p=>p.id===id).onLoan,undefined);
 assert.equal(loan.status,"purchased");
 assert.equal(g.transactions.filter(t=>t.mode==="loan-buy").length,1);
 assert.deepEqual(Loans.returnExpired(g,2027),[]);
 assert.equal(g.rosters.home.filter(p=>p.id===id).length,1);
 const snapshot=structuredClone(g);
 assert.ok(Loans.buyOption(g,id).error);assert.deepEqual(g,snapshot);
});
test("expired loans return to original owners before the new season and fix the manager XI",()=>{
 const g=game(),id="away-9";Loans.borrow(g,id);
 Squad.autoPick(g);
 const returned=Loans.returnExpired(g,2027);
 assert.deepEqual(returned,["away player 9"]);
 assert.equal(g.rosters.away.filter(p=>p.id===id).length,1);
 assert.equal(g.rosters.home.some(p=>p.id===id),false);
 assert.equal(g.rosters.away.find(p=>p.id===id).onLoan,undefined);
 assert.equal(g.loans[0].status,"returned");
 assert.ok(!g.squad.xi.includes(id));
 assert.deepEqual(Loans.returnExpired(g,2027),[]);
 assert.equal(g.rosters.away.filter(p=>p.id===id).length,1);
});
test("insufficient money, salary cap and full squads do not mutate the state",()=>{
 for(const block of ["budget","wage","squad"]){
   const g=game();if(block==="budget")g.budget=0;
   if(block==="wage")g.wageBudget=Squad.wages(g);
   if(block==="squad")g.squadLimit=g.rosters.home.length;
   const before=structuredClone(g);
   assert.ok(Loans.borrow(g,"away-9").error);
   assert.deepEqual(g,before,block);
 }
});
test("buy option rejects unaffordable or expired exercise without changing anything",()=>{
 const g=game(),id="away-9";Loans.borrow(g,id);
 g.budget=0;const before=structuredClone(g);
 assert.ok(Loans.buyOption(g,id).error);
 assert.deepEqual(g,before);
 g.budget=20000000;g.season=2027;
 const beforeExpired=structuredClone(g);
 assert.ok(Loans.buyOption(g,id).error);
 assert.deepEqual(g,beforeExpired);
});
test("career protagonist and changed ownership cannot be silently moved on rollover",()=>{
 const g=game(),id="away-9";g.playerCareer={playerId:id};
 assert.ok(Loans.borrow(g,id).error);
 delete g.playerCareer;
 Loans.borrow(g,id);
 g.playerCareer={playerId:id};const result=Loans.returnExpired(g,2027);
 assert.deepEqual(result,[]);assert.equal(g.loans[0].status,"unresolved");
 assert.equal(g.rosters.home.filter(p=>p.id===id).length,1);
});
