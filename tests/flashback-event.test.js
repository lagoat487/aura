"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const U=require("../ultimate-team"),Save=require("../ultimate-save"),Squad=require("../squad");
const positions=["POR","LI","DFC","DFC","LD","MCD","MC","MC","EI","DC","ED","POR","LI","DFC","LD","MC","DC","ED","EI","MC","MCD","MCO","DFC"];
const pool=()=>["a","b","c"].flatMap(cid=>positions.map((pos,i)=>({
 id:cid+i,name:"Player "+cid+i,pos,overall:70+i%10,real:true,club:cid,leagueId:"reference",nationality:"Ecuador"
})));
const forms=new Set(Object.keys(Squad.formations));
test("FLASHBACK contains exactly five specified gold-and-white UT cards with fixed coin prices",()=>{
 const cards=U.flashbackCards(pool()),f=U.flashback;
 assert.equal(f.id,"flashback");
 assert.equal(f.welcome,200000);assert.equal(f.reward,70000);
 assert.equal(cards.length,5);assert.equal(new Set(cards.map(p=>p.id)).size,5);
 assert.deepEqual(cards.map(p=>[p.name,p.overall,U.price(p)]),[
  ["Kitu Díaz",89,750000],
  ["Jamie Vardy",88,500000],
  ["N'Golo Kanté",88,450000],
  ["Neymar Júnior",91,800000],
  ["Keylor Navas",87,200000]
 ]);
 assert.ok(cards.every(p=>p.real&&p.event==="flashback"&&p.tradeable&&p.eventPrice===U.price(p)));
 assert.equal(cards[0].sourceClub,"Barcelona SC");
 assert.ok(cards.every(p=>p.bucks===undefined),"No Bucks currency in event");
});
test("200000 Flashback welcome coins can be claimed only once without touching other UT rewards",()=>{
 const club=U.create(pool()),before=club.coins,oldXI=club.xi.slice(),oldOwned=club.owned.slice();
 assert.equal(club.flashbackGiftClaimed,false);
 const first=U.claimFlashbackGift(club);
 assert.deepEqual(first,{ok:true,coins:200000});
 assert.equal(club.coins,before+200000);assert.equal(club.flashbackGiftClaimed,true);
 const snap=JSON.stringify(club),next=U.claimFlashbackGift(club);
 assert.match(next.error,/reclamaste/);assert.equal(JSON.stringify(club),snap);
 assert.deepEqual(club.xi,oldXI);assert.deepEqual(club.owned,oldOwned);
 assert.equal(club.sigmaGiftClaimed,false);
});
test("Flashback match rewards exactly 70000 on win draw or loss, only with event token",()=>{
 const club=U.create(pool()),original=club.coins,matchPoints=club.battlePoints,division=club.divisionPoints;
 for(const [i,result] of [[1,{home:2,away:0}],[2,{home:1,away:1}],[3,{home:0,away:2}]]){
  const token="ut:flashback:"+i;
  assert.equal(U.reward(club,token,result,U.flashback.id),70000);
  const once=JSON.stringify(club);
  assert.equal(U.reward(club,token,result,U.flashback.id),false);
  assert.equal(JSON.stringify(club),once);
 }
 assert.equal(club.coins,original+210000);
 assert.deepEqual([club.flashbackPlayed,club.flashbackWins,club.flashbackEarned],[3,1,210000]);
 assert.deepEqual([club.wins,club.draws,club.losses],[1,1,1]);
 assert.equal(club.battlePoints,matchPoints);assert.equal(club.divisionPoints,division);
 const snapshot=JSON.stringify(club);
 assert.equal(U.reward(club,"ut:99",{home:1,away:0},U.flashback.id),false);
 assert.equal(U.reward(club,"ut:argentina:90",{home:1,away:0},U.flashback.id),false);
 assert.equal(U.reward(club,"ut:flashback:bad",{home:1,away:0},U.flashback.id),false);
 assert.equal(U.reward(club,"ut:flashback:90",{home:-1,away:0},U.flashback.id),false);
 assert.equal(U.reward(club,"ut:flashback:90",{home:1,away:0},"battles"),false);
 assert.equal(JSON.stringify(club),snapshot);
 assert.equal(U.reward(club,"ut:normal:91",{home:1,away:0},"battles"),1200);
 assert.equal(U.reward(club,"ut:argentina:92",{home:1,away:0},U.argentina.id),35000);
});
test("Five cards cannot be forged, are not repriced by matchdays and cannot be bought twice",()=>{
 const club=U.create(pool());club.played=40;club.coins=4000000;
 const originalXI=club.xi.slice(),originalIDs=club.owned.map(p=>p.id);
 for(const p of U.flashbackCards(pool())){
  const cost=U.price(p),before=club.coins;
  assert.equal(U.marketPrice(club,p),cost);
  assert.equal(U.evolutionCost(p),null);
  assert.deepEqual(U.buy(club,p),{ok:true,cost});
  assert.equal(club.coins,before-cost);
  const snapshot=JSON.stringify(club);
  assert.match(U.buy(club,p).error,/ya está/);
  assert.equal(JSON.stringify(club),snapshot);
 }
 assert.deepEqual(club.xi,originalXI);
 assert.deepEqual(club.owned.slice(0,originalIDs.length).map(p=>p.id),originalIDs);
 for(const forged of [
  {...U.flashbackCards(pool())[0],id:"flashback:forged"},
  {...U.flashbackCards(pool())[0],overall:99},
  {...U.flashbackCards(pool())[0],name:"Wrong person"},
  {...U.flashbackCards(pool())[0],pos:"POR"}
 ]){const club2=U.create(pool()),before=JSON.stringify(club2);club2.coins=4000000;const snapshot=JSON.stringify(club2);
  assert.ok(U.buy(club2,forged).error);
  assert.equal(JSON.stringify(club2),snapshot);
 }
});
test("Flashback gifts, cards, event match claims and tab survive checksum save and restore",()=>{
 const club=U.create(pool());
 U.claimFlashbackGift(club);
 const p=U.flashbackCards(pool())[4];
 assert.equal(U.buy(club,p).ok,true);
 assert.equal(U.reward(club,"ut:flashback:5",{home:0,away:2},"flashback"),70000);
 const state={version:2,club,tab:"flashback",matchToken:5};
 const snapshot=Save.unpack(Save.pack(state,forms),forms);
 assert.deepEqual(snapshot,state);
 assert.equal(snapshot.club.flashbackGiftClaimed,true);
 assert.equal(snapshot.club.owned.find(p=>p.id==="flashback:keylor-navas").overall,87);
 assert.match(U.claimFlashbackGift(snapshot.club).error,/reclamaste/);
 assert.equal(U.reward(snapshot.club,"ut:flashback:5",{home:0,away:2},"flashback"),false);
 const old=U.create(pool());delete old.flashbackGiftClaimed;delete old.flashbackPlayed;
 delete old.flashbackWins;delete old.flashbackEarned;
 assert.ok(Save.unpack(Save.pack({version:2,club:old,tab:"home",matchToken:1},forms),forms));
});
test("Flashback is only launched from its own UT screen, on both desktop and mobile",()=>{
 const root=path.join(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
 const ui=read("ultimate-ui.js"),view=read("flashback-event.js"),css=read("flashback-event.css");
 assert.match(ui,/tab!=='flashback'/);
 assert.match(ui,/playMatch\(U\.flashback\.id,d\.opponent\)/);
 assert.match(ui,/tab=mode===U\.flashback\.id\?'flashback'/);
 assert.match(ui,/ut:flashback:/);
 assert.match(view,/data-ut="flashback-gift"/);
 assert.match(view,/data-ut="flashback-buy"/);
 assert.match(view,/data-ut="flashback-play"/);
 assert.match(css,/\.fb-card\{/);
 assert.match(css,/\.ut-shell \.ut-card\.flashback/);
 for(const html of [read("index.html"),read("mobile.html")]){
  assert.match(html,/ultimate-team-flashback-v2\.js/);
  assert.match(html,/ultimate-ui-flashback-v2\.js/);
  assert.match(html,/flashback-event-v2\.js/);
  assert.match(html,/flashback-event-v2\.css/);
  assert.ok(html.indexOf("ultimate-team-flashback-v2.js")<html.indexOf("ultimate-ui-flashback-v2.js"));
  assert.ok(html.indexOf("ultimate-ui-flashback-v2.js")<html.indexOf("flashback-event-v2.js"));
 }
 const context={AuraUT:U,AuraPortraits:{html:()=>'[RETRATO]'}};
 vm.createContext(context);vm.runInContext(read("flashback-event.js")+";globalThis.Flashback=AuraFlashbackEvent",context);
 const rendered=context.Flashback.view(U.create(pool()),pool());
 assert.match(rendered,/Kitu Díaz/);assert.match(rendered,/Jamie Vardy/);
 assert.match(rendered,/70000|70.000/);assert.match(rendered,/200\.000/);
 assert.equal((rendered.match(/data-ut="flashback-buy"/g)||[]).length,5);
 assert.equal((rendered.match(/data-ut="flashback-play"/g)||[]).length,4);
});
