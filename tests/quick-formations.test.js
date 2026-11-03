"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const Q=require("../quick-formations"),Squad=require("../squad");
const store=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),keys:()=>[...map.keys()]};};
test("All quick formations use real eleven-slot game layouts",()=>{
 for(const name of Q.formations){
  assert.equal(Squad.formations[name].length,11);
  assert.equal(Squad.formations[name][0][0],"POR");
 }
});
test("Home and away quick formations persist without touching career saves",()=>{
 const st=store();assert.deepEqual(Q.load(st),Q.defaults);
 const one={home:"3-5-2",away:"4-2-3-1"};
 assert.equal(Q.save(st,one),true);assert.deepEqual(Q.load(st),one);
 assert.deepEqual(st.keys(),[Q.KEY]);
 assert.equal(Q.save(st,{home:"broken",away:"4-4-2"}),false);
 assert.deepEqual(Q.load(st),one);
 st.setItem(Q.KEY,"{invalid");
 assert.deepEqual(Q.load(st),Q.defaults);
 assert.equal(Q.save({setItem(){throw Error("blocked");}},one),false);
});
