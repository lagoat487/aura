"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const Circuit=require("../street-circuit"),Save=require("../street-save");
const store=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),keys:()=>[...data.keys()]};};
test("VOLTA session restores all four match results, the points and the medal after reload",()=>{
  const local=store(),c=Circuit.create("barcelona",{goalLimit:5,seconds:120,difficulty:1});
  assert.equal(Save.save(local,c),true);
  const scores=[[3,1],[4,2],[2,2],[5,3]];
  for(const score of scores){
    const next=Circuit.complete(c,{home:score[0],away:score[1]});
    assert.ok(next);assert.equal(Save.save(local,c),true);
    assert.deepEqual(Save.load(local),c);
  }
  assert.equal(Circuit.next(Save.load(local)),null);
  assert.equal(Circuit.rank(Save.load(local)).name,"ORO");
  assert.deepEqual(local.keys(),[Save.KEY]);
});
test("VOLTA can reset independently of Career, UT, Draft and Cup saves",()=>{
  const local=store();
  local.setItem("aura-independent-cups-v1","preserve");
  local.setItem("aura-mode-progress-v1","preserve");
  const c=Circuit.create("madrid");
  assert.ok(Save.save(local,c));
  assert.ok(Save.save(local,null));
  assert.equal(Save.load(local),null);
  assert.equal(local.getItem("aura-independent-cups-v1"),"preserve");
  assert.equal(local.getItem("aura-mode-progress-v1"),"preserve");
  assert.equal(local.getItem("aura-fc27-save-v1"),null);
});
test("VOLTA refuses forged medals, duplicated fixtures, invalid results and corrupt storage",()=>{
  const local=store(),c=Circuit.create("boca",{goalLimit:3,seconds:60,difficulty:.78});
  assert.equal(Save.save(local,{...c,points:99}),false);
  assert.equal(Save.save(local,{...c,fixtures:["emelec","emelec","madrid","city"]}),false);
  Circuit.complete(c,{home:3,away:0});
  assert.equal(Save.save(local,{...c,results:[{...c.results[0],points:50}]}),false);
  assert.equal(Save.save(local,{...c,results:[{...c.results[0],round:3}]}),false);
  assert.equal(Save.save(local,{...c,status:"finished"}),false);
  local.setItem(Save.KEY,"{invalid");
  assert.equal(Save.load(local),null);
  local.setItem(Save.KEY,"x".repeat(16001));
  assert.equal(Save.load(local),null);
  assert.equal(Save.save({setItem(){throw Error("blocked");}},c),false);
});
test("VOLTA supports all valid difficulty, goal and duration combinations",()=>{
  const local=store();
  for(const difficulty of [.78,1,1.16]){
    for(const goalLimit of [3,5,7]){
      for(const seconds of [60,120,180]){
        const c=Circuit.create("city",{difficulty,goalLimit,seconds});
        assert.ok(Save.save(local,c));
        assert.deepEqual(Save.load(local),c);
      }
    }
  }
});
