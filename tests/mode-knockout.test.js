"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const K=require("../mode-knockout"),T=require("../world-tour");
const players=Array.from({length:11},(_,i)=>({id:"player:"+i,name:"Jugador "+i,overall:84,pos:"DC"}));
test("Draft XI rejects incomplete and duplicate lineups without mutating source players",()=>{
 assert.throws(()=>K.createDraft(players.slice(0,10)),/11/);
 assert.throws(()=>K.createDraft([...players.slice(0,10),players[0]]),/11/);
 const snapshot=JSON.stringify(players),draft=K.createDraft(players);
 assert.equal(JSON.stringify(players),snapshot);
 assert.equal(draft.round,0);assert.equal(draft.status,"playing");assert.equal(draft.results.length,0);
 assert.equal(K.opponent(draft),"betis");
});
test("four distinct opponents, advancement and a trophy after exactly four knockout wins",()=>{
 const d=K.createDraft(players,100);
 assert.deepEqual(d.opponents,["betis","atletico","madrid","city"]);
 for(const opponent of d.opponents){
   assert.equal(K.opponent(d),opponent);
   const match=K.recordDraft(d,{home:2,away:0},85);
   assert.ok(match.won);assert.equal(match.opponent,opponent);
 }
 assert.equal(d.status,"champion");assert.equal(K.opponent(d),null);
 const frozen=JSON.stringify(d);
 assert.equal(K.recordDraft(d,{home:2,away:0},85),false);
 assert.equal(JSON.stringify(d),frozen);
});
test("losing knocks out the club, keeps the results and prevents free retries",()=>{
 const d=K.createDraft(players,42);
 const lost=K.recordDraft(d,{home:0,away:1},80);
 assert.equal(lost.won,false);
 assert.equal(d.status,"eliminated");assert.equal(d.round,0);
 assert.equal(K.recordDraft(d,{home:99,away:0},80),false);
 assert.equal(d.results.length,1);
 const restart=K.createDraft(players);
 assert.equal(restart.status,"playing");assert.equal(restart.results.length,0);
 assert.deepEqual(restart.squad,players.map(p=>p.id));
});
test("a tied knockout match is decided by penalties using team ratings and a deterministic seed",()=>{
 const a=K.createDraft(players,808),b=K.createDraft(players,808);
 const x=K.recordDraft(a,{home:2,away:2},95),y=K.recordDraft(b,{home:2,away:2},95);
 assert.deepEqual(x,y);assert.ok(x.penalties);
 assert.notEqual(x.penalties.home,x.penalties.away);
 assert.ok(x.penalties.kicksHome>=3&&x.penalties.kicksAway>=3);
 assert.equal(x.won,x.penalties.winner===0);
 assert.equal(a.status,x.won?"playing":"eliminated");
});
test("no invalid match, incomplete result or replay of a finished tournament mutates its state",()=>{
 const d=K.createDraft(players,9);const before=JSON.stringify(d);
 for(const bad of [null,{}, {home:-1,away:0},{home:1.5,away:0},{home:NaN,away:1}]){
   assert.equal(K.recordDraft(d,bad),false);assert.equal(JSON.stringify(d),before);
 }
});
test("penalty shootout is plausible across many deterministic trials and better clubs usually win more",()=>{
 let superior=0;
 for(let i=1;i<=100;i++){
   const p=K.shootout(95,55,i);
   assert.notEqual(p.home,p.away);
   assert.equal(p.winner,p.home>p.away?0:1);
   assert.ok(p.kicksHome>=3&&p.kicksAway>=3&&p.kicksHome<=55&&p.kicksAway<=55);
   superior+=p.winner===0;
   assert.deepEqual(p,K.shootout(95,55,i));
 }
 assert.ok(superior>55&&superior<100, "stronger players benefit without making penalties automatic");
});
test("played Cup draw can store its real penalty decision and correctly choose the winner",()=>{
 const entrants=Array.from({length:16},(_,i)=>({id:"c"+i,name:"Club "+i,rating:80}));
 const c=T.createCup("champions",entrants,"c0",6),f=T.cupFixture(c);
 const win=f.home==="c0"?{home:5,away:4}:{home:4,away:5};
 const m=T.advanceCup(c,{home:1,away:1,penalties:win});
 const played=m.find(x=>x.home==="c0"||x.away==="c0");
 assert.deepEqual(played.penalties,win);assert.equal(played.winner,"c0");
 assert.equal(c.current.includes("c0"),true);
});
test("invalid Cup penalty scores cannot change a knockout bracket",()=>{
 const entrants=Array.from({length:16},(_,i)=>({id:"c"+i,name:"Club "+i,rating:80}));
 const cup=T.createCup("libertadores",entrants,"c0",10);
 const before=JSON.stringify(cup);
 for(const score of [
 {home:1,away:1,penalties:{home:4,away:4}},
 {home:2,away:1,penalties:{home:5,away:4}},
 {home:1,away:1,penalties:{home:-1,away:5}}
 ]){
   assert.throws(()=>T.advanceCup(cup,score),/Penaltis inválidos/);
   assert.equal(JSON.stringify(cup),before);
 }
});
