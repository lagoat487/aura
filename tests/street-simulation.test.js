"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const Circuit=require("../street-circuit"),Sim=require("../street-simulation"),Save=require("../street-save");
const create=()=>Circuit.create("barcelona",{seconds:120,goalLimit:5,difficulty:1});
const ratings=id=>id==="barcelona"?87:78;
test("VOLTA simulates one 3v3 match and persists its result on reload",()=>{
  const c=create(),result=Sim.next(c,87,78);
  assert.ok(result);
  assert.equal(c.results.length,1);
  assert.equal(result.round,1);
  const data=new Map(),store={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
  assert.ok(Save.save(store,c));assert.deepEqual(Save.load(store),c);
  assert.equal(c.points,[0,1,3].includes(c.points)?c.points:-1);
});
test("VOLTA simulates a whole tour without duplicating completed games",()=>{
  const c=create(),results=Sim.rest(c,ratings);
  assert.equal(results.length,4);
  assert.equal(c.status,"finished");
  assert.equal(c.results.length,4);
  assert.equal(Sim.rest(c,ratings).length,0);
  assert.equal(Sim.next(c,87,78),false);
  assert.ok(Circuit.rank(c));
  assert.equal(c.points,c.results.reduce((sum,r)=>sum+r.points,0));
});
test("VOLTA seeded AI creates reproducible scores and respects score and difficulty limits",()=>{
  for(const difficulty of [.78,1,1.16]){
    for(const goalLimit of [3,5,7]){
      const c=Circuit.create("emelec",{seconds:180,goalLimit,difficulty});
      const d=Circuit.create("emelec",{seconds:180,goalLimit,difficulty});
      assert.deepEqual(Sim.rest(c,()=>80),Sim.rest(d,()=>80));
      for(const r of c.results){assert.ok(r.home<=goalLimit);assert.ok(r.away<=goalLimit);}
    }
  }
});
test("VOLTA sim rejects bad ratings and incomplete rounds without altering score",()=>{
  const c=create();
  assert.equal(Sim.next(c,NaN,80),false);
  assert.equal(Sim.next(c,80,-1),false);
  assert.equal(Sim.next(c,80,150),false);
  assert.equal(c.results.length,0);
  assert.equal(Sim.rest(c,()=>NaN).length,0);
  assert.equal(c.results.length,0);
});
test("Simulated VOLTA medals and previous results survive reload with isolated storage",()=>{
  const c=create();assert.equal(Sim.rest(c,ratings).length,4);
  const saved=new Map(),local={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)};
  assert.equal(Save.save(local,c),true);
  const restored=Save.load(local);
  assert.deepEqual(restored,c);
  assert.deepEqual(Circuit.rank(restored),Circuit.rank(c));
  assert.deepEqual([...saved.keys()],[Save.KEY]);
});
