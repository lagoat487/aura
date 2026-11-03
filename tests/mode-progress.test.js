"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const Saves=require("../mode-progress"),Draft=require("../mode-knockout"),Rivalry=require("../quick-rivalry");
const storage=()=>{const map=new Map();return {getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value),keys:()=>[...map.keys()]};};
const player=i=>({id:"player"+i,name:"Futbolista "+i,pos:i===0?"POR":"MC",overall:75+i});
const deck=()=>({players:[],offers:Array.from({length:5},(_,i)=>player(i)),rerollsLeft:3,tournament:null});
const fullDraft=()=>{
  const players=Array.from({length:11},(_,i)=>player(i));
  return {players,offers:[],rerollsLeft:0,tournament:Draft.createDraft(players)};
};
test("Draft choices and limited refreshes survive page reload without saving the player catalog",()=>{
  const store=storage(),draft=deck();
  assert.equal(Saves.save(store,draft,null),true);
  assert.deepEqual(Saves.load(store).draft,draft);
  draft.players.push(player(0));draft.offers=Array.from({length:5},(_,i)=>player(i+1));
  draft.rerollsLeft=2;
  assert.equal(Saves.save(store,draft,null),true);
  assert.equal(Saves.load(store).draft.rerollsLeft,2);
  assert.equal(Saves.load(store).draft.players.length,1);
  assert.equal(Saves.load(store).draft.pool,undefined);
  assert.deepEqual(store.keys(),[Saves.KEY]);
});
test("Draft bracket keeps the same 11 cards and restores the final trophy",()=>{
  const store=storage(),draft=fullDraft();
  for(let round=0;round<4;round++){
    const match=Draft.recordDraft(draft.tournament,{home:4,away:1},80);
    assert.equal(match.won,true);
    assert.equal(Saves.save(store,draft,null),true);
    assert.equal(Saves.load(store).draft.tournament.results.length,round+1);
  }
  assert.equal(Saves.load(store).draft.tournament.status,"champion");
  assert.equal(new Set(Saves.load(store).draft.players.map(p=>p.id)).size,11);
});
test("Quick Rivalry can be resumed after the first match and keeps the champion",()=>{
  const store=storage(),rivalry=Rivalry.create("barcelona","madrid",87,88);
  Rivalry.record(rivalry,{home:2,away:1});
  assert.equal(Saves.save(store,null,rivalry),true);
  const restored=Saves.load(store).rivalry;
  assert.equal(restored.results.length,1);assert.equal(Rivalry.next(restored),2);
  Rivalry.record(restored,{home:3,away:0});
  assert.equal(Saves.save(store,null,restored),true);
  assert.equal(Saves.load(store).rivalry.champion,"barcelona");
  assert.equal(Saves.load(store).rivalry.status,"finished");
});
test("Both modes coexist and never touch manager or Ultimate Team save keys",()=>{
  const store=storage(),draft=fullDraft(),rivalry=Rivalry.create("barcelona","madrid");
  assert.equal(Saves.save(store,draft,rivalry),true);
  assert.equal(Saves.load(store).draft.players.length,11);
  assert.equal(Saves.load(store).rivalry.home,"barcelona");
  assert.deepEqual(store.keys(),[Saves.KEY]);
});
test("Corrupt, duplicate, oversize and blocked mode saves fail safely",()=>{
  const store=storage(),draft=deck();
  assert.equal(Saves.save(store,{...draft,players:[player(0),player(0)]},null),false);
  assert.equal(Saves.save(store,{...draft,rerollsLeft:999},null),false);
  assert.equal(Saves.save(store,{...draft,offers:[player(0)],players:[player(0)]},null),false);
  assert.equal(Saves.save({setItem(){throw Error("blocked");}},draft,null),false);
  assert.deepEqual(Saves.load({getItem(){throw Error("blocked");}}),{draft:null,rivalry:null});
  store.setItem(Saves.KEY,"{bad-json");
  assert.deepEqual(Saves.load(store),{draft:null,rivalry:null});
  store.setItem(Saves.KEY,"x".repeat(60001));
  assert.deepEqual(Saves.load(store),{draft:null,rivalry:null});
});

test("Mode library displays independent progress without mutating saves",()=>{
  const career={round:5,season:2026};
  assert.equal(Saves.progressLabel("career",{career}),"CARRERA EN CURSO · JORNADA 6");
  assert.equal(Saves.progressLabel("pro",{career:{...career,playerCareer:{playerId:"p1"}}}),"JUGADOR ACTIVO · JORNADA 6");
  assert.equal(Saves.progressLabel("quick",{rivalry:{status:"playing",wins:[1,0]}}),"RIVALIDAD 1–0 · EN CURSO");
  assert.equal(Saves.progressLabel("quick",{penalty:{status:"playing",score:[3,2]}}),"PENALTIS 3–2 · EN CURSO");
  assert.equal(Saves.progressLabel("draft",{draft:{players:[player(0)],tournament:null}}),"DRAFT 1/11 · GUARDADO");
  assert.equal(Saves.progressLabel("draft",{draft:{players:[],tournament:{status:"playing",round:2}}}),"TORNEO · RONDA 3/4");
  assert.equal(Saves.progressLabel("cup",{cups:[{champion:null}]}),"COPA EN CURSO · GUARDADA");
  assert.equal(Saves.progressLabel("ultimate",{ultimate:{owned:Array(14)}}),"ULTIMATE TEAM · 14 CARTAS GUARDADAS");
  assert.equal(Saves.progressLabel("street",{street:{status:"playing",results:[{},{}]}}),"CIRCUITO CALLE · 2/4 PARTIDOS");
  assert.equal(Saves.progressLabel("draft",{}),null);
  assert.equal(Saves.progressLabel("ultimate",{}),null);
});
