"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const R=require("../quick-rivalry");
test("Rivalry requires two different teams and begins as best-of-three",()=>{
 assert.throws(()=>R.create("barcelona","barcelona"),/diferentes/);
 const c=R.create("barcelona","madrid",87,88,123);
 assert.equal(c.status,"playing");assert.equal(R.next(c),1);
 assert.deepEqual(c.wins,[0,0]);assert.deepEqual(c.results,[]);
});
test("Rivalry finishes at two wins without requiring the third match",()=>{
 const c=R.create("barcelona","madrid",87,88,123);
 assert.equal(R.record(c,{home:3,away:0}).winner,0);
 assert.equal(R.next(c),2);
 assert.equal(R.record(c,{home:1,away:0}).winner,0);
 assert.equal(c.status,"finished");assert.equal(c.champion,"barcelona");
 assert.equal(R.next(c),null);assert.deepEqual(c.wins,[2,0]);
 const snap=JSON.stringify(c);assert.equal(R.record(c,{home:9,away:0}),false);
 assert.equal(JSON.stringify(c),snap);
});
test("Rivalry can come back from defeat to win match three",()=>{
 const c=R.create("barcelona","madrid",87,88,33);
 R.record(c,{home:0,away:3});R.record(c,{home:4,away:2});R.record(c,{home:2,away:0});
 assert.deepEqual(c.wins,[2,1]);assert.deepEqual(c.goals,[6,5]);
 assert.equal(c.status,"finished");assert.equal(c.champion,"barcelona");
 assert.equal(c.results.length,3);
});
test("Drawn matches resolve via deterministic penalty shootouts and never produce tied match results",()=>{
 const a=R.create("barcelona","madrid",70,90,55);
 const b=R.create("barcelona","madrid",70,90,55);
 const p=R.record(a,{home:1,away:1}),q=R.record(b,{home:1,away:1});
 assert.deepEqual(p,q);assert.notEqual(p.penalties.home,p.penalties.away);
 assert.equal(p.winner,p.penalties.home>p.penalties.away?0:1);
 assert.equal(a.wins[0]+a.wins[1],1);
});
test("Rivalry rejects corrupt, partial or impossible results without changing its history",()=>{
 const c=R.create("barcelona","madrid"),snapshot=JSON.stringify(c);
 for(const val of [null,{}, {home:-1,away:0},{home:1.2,away:0},{home:NaN,away:1},
   {home:100,away:0},{home:0,away:Infinity}]){
   assert.equal(R.record(c,val),false);assert.equal(JSON.stringify(c),snapshot);
 }
});
