"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const P=require("../match-preferences");
const store=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),keys:()=>[...map.keys()]};};
test("Match presets have valid durations, difficulty and camera",()=>{
 assert.equal(P.valid(P.DEFAULTS),true);
 for(const key of ["fast","classic","epic","vision","immersive","default"]){
  const p={...P.DEFAULTS,...P.preset(key)};
  assert.equal(P.valid(p),true,key);
 }
 assert.equal(P.preset("unknown"),null);
});
test("Preferences persist independently and reject malformed values",()=>{
 const st=store();assert.deepEqual(P.load(st),P.DEFAULTS);
 const custom={...P.DEFAULTS,seconds:480,difficulty:1.34,weather:"rain",camera:"tactical",quality:"low",sound:false,localTwoPlayer:true};
 assert.equal(P.save(st,custom),true);assert.deepEqual(P.load(st),custom);
 assert.deepEqual(st.keys(),[P.KEY]);
 assert.equal(P.save(st,{...custom,difficulty:99}),false);
 assert.deepEqual(P.load(st),custom);
 assert.equal(P.save(st,{...custom,quality:"injected"}),false);
 st.setItem(P.KEY,"bad-json");assert.deepEqual(P.load(st),P.DEFAULTS);
 assert.equal(P.save({setItem(){throw Error("blocked")}},custom),false);
 assert.deepEqual(P.load({getItem(){throw Error("blocked")}}),P.DEFAULTS);
});
