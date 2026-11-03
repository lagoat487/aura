"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const Squad=require("../squad"),Q=require("../quick-formations");
const source=fs.readFileSync(path.join(__dirname,"..","match-ui.js"),"utf8");
const Arena=vm.runInNewContext(source+";AuraArena",{AuraSquad:Squad});
const roster=[
 {id:"k",name:"Keeper",pos:"POR",overall:88},
 ...Array.from({length:4},(_,i)=>({id:"cb"+i,name:"Defender "+i,pos:"DFC",overall:76+i})),
 {id:"lb",name:"Left back",pos:"LI",overall:80},{id:"rb",name:"Right back",pos:"LD",overall:80},
 {id:"cm1",name:"Midfield one",pos:"MC",overall:83},{id:"cm2",name:"Midfield two",pos:"MC",overall:82},
 {id:"am",name:"Attacking mid",pos:"MCO",overall:84},
 {id:"lw",name:"Winger left",pos:"EI",overall:86},{id:"rw",name:"Winger right",pos:"ED",overall:85},
 {id:"st1",name:"Forward one",pos:"DC",overall:87},{id:"st2",name:"Forward two",pos:"DC",overall:84}
];
test("Quick-match selected formation controls real on-field positions and unique XI",()=>{
 for(const formation of Q.formations){
  const side=Arena.team({id:"barcelona",name:"Barcelona",rating:88},null,roster,formation);
  assert.equal(side.formation,formation);
  assert.equal(side.players.length,11);
  assert.equal(side.slots.length,11);
  assert.equal(new Set(side.players.map(x=>x.id)).size,11);
  assert.equal(side.players[0].pos,"POR");
 }
});
test("Unknown formations safely fall back to default without changing career squad",()=>{
 const side=Arena.team({id:"madrid",name:"Madrid",rating:90},null,roster,"unsupported");
 assert.equal(side.formation,"4-3-3");
 assert.equal(side.players.length,11);
});
test("Quick-match controls are wired for both local sides and best-of-three rivalries",()=>{
 const evolution=fs.readFileSync(path.join(__dirname,"..","evolution-ui.js"),"utf8");
 assert.match(evolution,/quick-home-formation/);
 assert.match(evolution,/quick-away-formation/);
 assert.match(evolution,/AuraQuickFormations\.save/);
 assert.match(evolution,/AuraArena\.team\(mine,null,null,quickHomeFormation\)/);
 assert.match(evolution,/AuraArena\.team\(getClub\(quickAway\),null,null,quickAwayFormation\)/);
});
