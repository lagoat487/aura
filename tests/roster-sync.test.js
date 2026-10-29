"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const World=require("../world"),Clubs=require("../clubs"),Definitions=require("../competitions"),Real=require("../real-players");
require("../data/world-rosters");
World.load(Clubs.clubs,Definitions.definitions);
const Sync=require("../roster-sync");
const club=id=>Clubs.clubs.find(c=>c.id===id);

test("Barcelona uses the verified 27-player first team and never reimports departed World Cup entries",()=>{
 const players=Sync.rosterFor(club("barcelona")),names=players.map(p=>p.name);
 assert.equal(players.length,27);assert.equal(new Set(names.map(Sync.key)).size,27);
 for(const name of ["Ronald Araújo","Ferran Torres","Robert Lewandowski","Marc Casadó","Héctor Fort"])assert.ok(!names.includes(name),name+" is not in the official first-team list");
 for(const name of ["Gabriel Jesus","Dominik Livaković","Brian Fariñas","Rodri","Lamine Yamal","Pedri"])assert.ok(names.includes(name),name+" is in the official first team");
 assert.ok(players.every(p=>p.club==="barcelona"&&p.membershipVerifiedAt==="2026-10-28"));
 const status=Sync.status(club("barcelona"));assert.equal(status.snapshot,"2026/27");assert.equal(status.players,27);assert.match(status.source,/fcbarcelona.com/);
});
test("Araújo has one current identity in Liverpool across lookup, search and draft pool",()=>{
 const previous=Real.allPlayers().find(p=>p.name==="Ronald Araújo"),current=Sync.getPlayer(previous.id);
 assert.equal(current.id,"real:253163");assert.equal(current.club,"liverpool");
 assert.ok(Sync.rosterFor(club("liverpool")).some(p=>p.id===current.id));
 assert.equal(Sync.search("Ronald Araujo").filter(p=>p.name==="Ronald Araújo").length,1);
 assert.equal(Sync.pool().filter(p=>p.name==="Ronald Araújo").length,1);
 assert.equal(Sync.key(previous),Sync.key(current));
});
test("verified incoming transfers disappear from the former club without losing their identity",()=>{
 const jesus=Sync.search("Gabriel Jesus").find(p=>p.name==="Gabriel Jesus");
 assert.equal(jesus.club,"barcelona");assert.ok(!Sync.rosterFor(club("arsenal")).some(p=>p.id===jesus.id));
 const fener=Clubs.clubs.find(c=>c.name==="Fenerbahçe");
 if(fener)assert.ok(!Sync.rosterFor(fener).some(p=>p.name==="Dominik Livaković"));
});
test("all covered clubs prefer their newer catalog membership and never mix men with women",()=>{
 let checked=0;
 for(const c of Clubs.clubs.filter(c=>c.id.startsWith("world-"))){
  const roster=Sync.rosterFor(c);checked++;
  assert.ok(roster.every(p=>p.club===c.id));
  assert.ok(roster.every(p=>World.getClub(p.catalogClub).gender===c.gender));
  assert.equal(new Set(roster.map(p=>p.id)).size,roster.length);
 }
 assert.equal(checked,739);
 const male=World.matchingClub({id:"unlisted-men",name:"FC Barcelona"});
 const female=World.matchingClub({id:"unlisted-women",name:"FC Barcelona",gender:"women"});
 assert.equal(male.gender,"men");assert.equal(female.gender,"women");assert.notEqual(male.id,female.id);
 assert.equal(World.matchingClub(club("united")).name,"Man Utd");
 assert.ok(Sync.rosterFor(club("united")).some(p=>p.name==="Marcus Rashford"));
});
test("roster records are copies and status distinguishes global reference from verification",()=>{
 const roster=Sync.rosterFor(club("liverpool")),original=roster[0].name;roster[0].name="Changed in career";
 assert.equal(Sync.rosterFor(club("liverpool"))[0].name,original);
 const status=Sync.status(club("liverpool"));assert.equal(status.covered,true);assert.equal(status.snapshot,"2026/27");assert.equal(status.verifiedAt,"2026-10-28");assert.match(status.source,/liverpoolfc/);
 const reference=Sync.status(club("city"));assert.equal(reference.snapshot,"2026-09-12");assert.equal(reference.verifiedAt,undefined);assert.match(reference.note,/no actualización en vivo/);
 assert.equal(Sync.status({id:"unlisted",name:"Unknown FC"}).covered,false);
 assert.deepEqual(Sync.rosterFor({id:"unlisted-women",name:"Unknown FC",gender:"women"}),[]);
});
