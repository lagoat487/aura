"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),Save=require("../ultimate-save"),UT=require("../ultimate-team"),Squad=require("../squad");
const positions=["POR","LI","DFC","DFC","LD","MCD","MC","MC","EI","DC","ED","POR","LI","DFC","LD","MC","DC","ED","EI","MC","MCD","MCO","DFC"];
const pool=()=>["a","b"].flatMap(id=>positions.map((pos,i)=>({id:id+i,name:"Footballer "+id+i,pos,overall:65+i%14,real:true,club:id,leagueId:"a",nationality:"Ecuador"})));
const forms=new Set(Object.keys(Squad.formations));
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};};
const session=()=>({version:2,club:UT.create(pool()),tab:"squad",matchToken:7});
test("UT snapshots round-trip through checksum with coins, xi, and cards intact",()=>{
 const s=session(),raw=Save.pack(s,forms),again=Save.unpack(raw,forms);
 assert.deepEqual(again,s);assert.equal(Save.unpack(raw.replace("aura-ut-backup","aura-ut-bad"),forms),null);
});
test("legacy v1 browser saves migrate without replacing players",()=>{
 const s=session();s.version=1;
 assert.deepEqual(Save.unpack(JSON.stringify(s),forms),{...s,version:2});
});
test("write a backup of a valid prior save, recover when latest is corrupt",()=>{
 const storage=memory(),initial=session();assert.equal(Save.save(storage,initial,forms),true);
 const next=structuredClone(initial);next.club.coins+=2500;assert.equal(Save.save(storage,next,forms),true);
 storage.setItem(Save.KEY,"{broken");
 let restored=Save.load(storage,forms);assert.equal(restored.recovered,true);assert.deepEqual(restored.snapshot.club,initial.club);
 const rolled=Save.restoreBackup(storage,forms);assert.deepEqual(rolled.club,initial.club);
});
test("invalid transfers, duplicate identities and missing club cards cannot be imported",()=>{
 const s=session();s.club.xi[1]=s.club.xi[0];assert.equal(Save.importData(JSON.stringify(s),forms),null);
 const p=session();p.club.owned[0].overall=100;assert.equal(Save.importData(JSON.stringify(p),forms),null);
 const q=session();q.club.coins=-1;assert.equal(Save.importData(JSON.stringify(q),forms),null);
});
test("failed storage writes are reported without changing in-memory team",()=>{
 const s=session(),snapshot=structuredClone(s);
 assert.equal(Save.save({getItem:()=>null,setItem:()=>{throw Error("quota");}},s,forms),false);assert.deepEqual(s,snapshot);
});
