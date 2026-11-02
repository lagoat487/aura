"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const Simulation=require("../mode-simulation"),Rivalry=require("../quick-rivalry");
const Knockout=require("../mode-knockout"),Progress=require("../mode-progress");
const player=i=>({id:"player"+i,name:"Player "+i,pos:i===0?"POR":"MC",overall:83});
const draft=()=>({players:Array.from({length:11},(_,i)=>player(i)),offers:[],rerollsLeft:3,tournament:null});
test("Quick Rivalry simulates one match or an entire three-game series without duplicate outcomes",()=>{
  const series=Rivalry.create("barcelona","madrid",85,85,1432);
  assert.equal(Simulation.simulateRivalry(series,false).length,1);
  assert.equal(series.results.length,1);
  assert.equal(Simulation.simulateRivalry(series,true).length,series.results.length===2?1:2);
  assert.equal(series.status,"finished");
  assert.equal(Simulation.simulateRivalry(series,true).length,0);
  assert.equal(series.wins.reduce((a,b)=>a+b,0),series.results.length);
});
test("Draft XI simulates bracket progressively, without changing its original eleven",()=>{
  const current=draft(),ids=current.players.map(p=>p.id);
  assert.equal(Simulation.simulateDraft(current,()=>80,false).length,1);
  assert.equal(current.tournament.results.length,1);
  assert.ok(Simulation.simulateDraft(current,()=>80,true).length<=3);
  assert.notEqual(current.tournament.status,"playing");
  assert.equal(Simulation.simulateDraft(current,()=>80,true).length,0);
  assert.deepEqual(current.players.map(p=>p.id),ids);
});
test("Match simulations use stable seeds and do not touch other modes' save keys",()=>{
  const a=Rivalry.create("barcelona","madrid",82,88,7264);
  const b=Rivalry.create("barcelona","madrid",82,88,7264);
  Simulation.simulateRivalry(a,true);Simulation.simulateRivalry(b,true);
  assert.deepEqual(a.results,b.results);
  const current=draft();Simulation.simulateDraft(current,()=>79,true);
  const saved=new Map(),store={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)};
  assert.equal(Progress.save(store,current,a),true);
  assert.equal(Progress.load(store).draft.tournament.status,current.tournament.status);
  assert.deepEqual([...saved.keys()],[Progress.KEY]);
});
test("Simulations reject incomplete Draft and stop when rating data is unavailable",()=>{
  const short={players:[player(0)],tournament:null};
  assert.deepEqual(Simulation.simulateDraft(short,()=>82,true),[]);
  const current=draft();
  assert.deepEqual(Simulation.simulateDraft(current,()=>NaN,true),[]);
  assert.equal(current.tournament.results.length,0);
});
