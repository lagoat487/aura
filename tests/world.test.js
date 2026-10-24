"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const World=require("../world.js");
const Clubs=require("../clubs.js");
const Competitions=require("../competitions.js");

function sampleCSV(){
  const header="player_id,common_name,first_name,last_name,overall_rating,position,club,league,gender,birthdate,nationality";
  const lines=[header];
  let id=100001;
  for(const league of ["Primera A","Primera B"]){
    for(const club of ["FC Barcelona","Real Madrid"]){
      for(let i=0;i<11;i++){
        lines.push([id++,"",i===0?'"Paco, Jr."':"Paco","García",80-i,
          i===0?"GK":i<5?"CB":"ST",club,league,"Men's Football","2002-03-12","Spain"].join(","));
      }
    }
  }
  return lines.join("\r\n")+"\r\n";
}
test("RFC4180 quoted comma and CRLF CSV import",()=>{
  const rows=World.decodeCSV(sampleCSV());
  assert.equal(rows.length,44);
  assert.equal(rows[0].first_name,"Paco, Jr.");
  assert.equal(rows[11].club,"Real Madrid");
});
test("dynamic national leagues use real IDs, ratings and two-leg fixtures",()=>{
  const data=World.build(World.decodeCSV(sampleCSV()),Clubs.clubs,Competitions.definitions);
  assert.equal(data.stats.players,44);
  assert.equal(data.stats.clubs,4);
  assert.equal(data.stats.leagues,2);
  assert.equal(data.definitions.length,2);
  assert.equal(data.definitions[0].clubIds.length,2);
  assert.equal(data.rosters.get(data.definitions[0].clubIds[0]).length,11);
  const fixture=Competitions.createSeason(data.definitions[0],2026);
  assert.ok(Competitions.validateSeason(fixture));
  assert.equal(fixture.fixtures.length,2);
  assert.match([...data.rosters.values()][0][0].photo,/^https:\/\/cdn\.sofifa\.net\/players\//);
  const originals=Clubs.clubs.length;
  World.integrate(data,Clubs.clubs,Competitions.definitions);
  assert.equal(Clubs.clubs.length,originals+4);
  assert.equal(World.search("Paco").length,24); // Search is capped at 24
  assert.equal(World.matchRoster({id:"barcelona",name:"FC Barcelona"}).length,11);
});
test("snapshot recovery restores offline competition and rejects invalid IDs",()=>{
  const ids=["world-men-primera-a-fc-barcelona","world-men-primera-a-real-madrid"];
  const def={id:"world-men-primera-a",name:"Primera A",clubIds:ids,points:{win:3,draw:1,loss:0},tieBreak:"goal-difference"};
  const clubs=Clubs.clubs.slice(),defs=Competitions.definitions.slice();
  const snapshot={definition:def,clubs:ids.map(id=>({id,name:id,rating:78,budget:5000000}))};
  assert.ok(World.registerSnapshot(snapshot,clubs,defs));
  assert.ok(clubs.some(x=>x.id===ids[0]));
  assert.ok(defs.some(x=>x.id===def.id));
  assert.equal(World.registerSnapshot({definition:{...def,id:"../../x"},clubs:snapshot.clubs},clubs,defs),false);
});
