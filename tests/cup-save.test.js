
"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const Tour=require("../world-tour"),S=require("../cup-save");
const types=Tour.cupTypes;
function store(){
  const m=new Map();return {setItem:(k,v)=>m.set(k,v),getItem:k=>m.get(k)||null};
}
function cup(){
  const participants=Array.from({length:4},(_,i)=>({id:"team"+i,name:"Team "+i,rating:80+i}));
  return Tour.createCup("copaecuador",participants,"team0",104);
}
test("Independent cup saves restore after rounds without changing career saves",()=>{
  const s=store(),c=cup();Tour.advanceCup(c);
  assert.equal(S.save(s,[c],types),true);
  assert.equal(s.getItem("aura-fc27-save-v1"),null);
  const found=S.load(s,types)[0];
  assert.deepEqual(found,c);
  Tour.advanceCup(found);
  assert.equal(S.save(s,[found],types),true);
  assert.equal(S.load(s,types)[0].champion,found.champion);
});
test("Malformed saves, invalid scores, oversize payload and unavailable storage are rejected",()=>{
  const s=store(),c=cup();
  assert.equal(S.save(s,[{...c,current:["fake"]}],types),false);
  assert.equal(S.save(s,[c],types),true);
  s.setItem(S.KEY,"{broken");assert.deepEqual(S.load(s,types),[]);
  s.setItem(S.KEY,"X".repeat(120001));assert.deepEqual(S.load(s,types),[]);
  assert.equal(S.save({setItem(){throw Error("blocked");}},[c],types),false);
  assert.deepEqual(S.load({getItem(){throw Error("blocked");}},types),[]);
});
test("Every national and world club format accepts valid bracket saves",()=>{
  const s=store();
  const typesToCheck=["clubworld","copadelrey","facup","copaecuador"];
  const cups=typesToCheck.map((id,k)=>{
    const def=types.find(c=>c.id===id);
    return Tour.createCup(id,Array.from({length:def.size},(_,i)=>({id:id+i,name:"Club "+i,rating:75+i%10})),id+"0",800+k);
  });
  assert.equal(S.save(s,cups,types),true);
  assert.deepEqual(S.load(s,types),cups);
});
