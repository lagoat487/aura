"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const U=require("../ultimate-team"),Save=require("../ultimate-save"),Squad=require("../squad"),Portraits=require("../portraits");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const positions=["POR","LI","DFC","DFC","LD","MCD","MC","MC","EI","DC","ED","POR","LI","DFC","LD","MC","DC","ED","EI","MC","MCD","MCO","DFC"];
const pool=()=>["a","b","c"].flatMap(cid=>positions.map((pos,i)=>({id:cid+i,name:"Player "+cid+i,pos,overall:70+i%10,real:true,club:cid,leagueId:"reference",nationality:"Ecuador"})));
const forms=new Set(Object.keys(Squad.formations));
const expected=[
 ["William Saliba",90,550000],["Pau Cubarsí",89,450000],["Willian Pacho",90,500000],
 ["Nuno Mendes",90,550000],["Piero Hincapié",87,350000],["Achraf Hakimi",90,600000],
 ["Gerard Martín",85,300000],["Antonio Rüdiger",87,400000],["Virgil van Dijk",91,600000]
];
test("Muralla has exactly nine defensive editions with the requested ratings and fixed 300000–600000 prices",()=>{
 const cards=U.murallaCards(pool());assert.equal(U.muralla.id,"muralla");
 assert.deepEqual(cards.map(p=>[p.name,p.overall,U.price(p)]),expected);
 assert.equal(new Set(cards.map(p=>p.id)).size,9);
 assert.ok(cards.every(p=>p.real&&p.tradeable&&p.event===U.muralla.id&&["DFC","LI","LD"].includes(p.pos)));
 const club=U.create(pool());
 for(const played of [0,1,7,200]){club.played=played;for(const p of cards){assert.equal(U.marketPrice(club,p),U.price(p));assert.equal(U.evolutionCost(p),null);}}
});
test("Muralla reuses verified catalogue identities and portrait IDs without confusing same-surname players",()=>{
 const wrong={id:"real:260398",name:"Nathan-Dylan Saliba",pos:"MC",real:true};
 const full={id:"wc26:484",name:"William Alain André Gabriel Saliba",pos:"DFC",real:true};
 const numeric={id:"real:243715",name:"William Saliba",pos:"DFC",real:true};
 const base=[wrong,full,numeric],before=JSON.stringify(base);
 const saliba=U.murallaCards(base)[0];assert.equal(saliba.originalId,numeric.id);assert.equal(Portraits.identity(saliba),"243715");
 assert.equal(U.murallaCards([wrong,full])[0].originalId,full.id);
 assert.equal(Portraits.identity(U.murallaCards([wrong,full])[0]),"243715");
 const ids=["243715","278046","256196","252145","256197","235212","74462","205452","203376"];
 assert.deepEqual(U.murallaCards([]).map(p=>Portraits.identity(p)),ids);
 assert.equal(JSON.stringify(base),before);
});
test("Muralla purchases debit once, ignore forged price metadata, and preserve the existing XI and catalogue",()=>{
 const catalogue=pool(),original=JSON.stringify(catalogue),club=U.create(catalogue),xi=club.xi.slice();club.coins=5000000;
 for(const p of U.murallaCards(catalogue)){
  const before=club.coins;assert.deepEqual(U.buy(club,{...p,eventPrice:1}),{ok:true,cost:U.price(p)});
  assert.equal(club.coins,before-U.price(p));const snapshot=JSON.stringify(club);
  assert.match(U.buy(club,p).error,/ya está/);assert.equal(JSON.stringify(club),snapshot);
 }
 assert.equal(club.purchases,9);assert.deepEqual(club.xi,xi);assert.equal(JSON.stringify(catalogue),original);
 assert.ok(U.bench(club).some(p=>p.event==="muralla"));
 const poor=U.create(catalogue);poor.coins=299999;const before=JSON.stringify(poor);
 assert.match(U.buy(poor,U.murallaCards(catalogue)[6]).error,/monedas/);assert.equal(JSON.stringify(poor),before);
 for(const forgery of [{id:"muralla:fake"},{overall:99},{name:"Other player"},{pos:"POR"},{event:""}]){
  const candidate={...U.murallaCards(catalogue)[0],...forgery},snapshot=JSON.stringify(club);
  assert.match(U.buy(club,candidate).error,/Muralla/);assert.equal(JSON.stringify(club),snapshot);
 }
});
test("Muralla collection, coins and selected event tab survive closing and restoring the club",()=>{
 const club=U.create(pool());club.coins=600000;assert.ok(U.buy(club,U.murallaCards(pool())[8]).ok);
 const state={version:2,club,tab:"muralla",matchToken:19};
 assert.deepEqual(Save.unpack(Save.pack(state,forms),forms),state);
 const old={version:1,club:U.create(pool()),tab:"squad",matchToken:2};
 assert.equal(Save.unpack(JSON.stringify(old),forms).tab,"squad");
});
test("Muralla grants exactly 300000 welcome coins once, independently of the other event gifts",()=>{
 const club=U.create(pool()),before=club.coins,owned=JSON.stringify(club.owned),xi=club.xi.slice();
 assert.equal(club.murallaGiftClaimed,false);assert.equal(U.muralla.welcome,300000);
 assert.deepEqual(U.claimMurallaGift(club),{ok:true,coins:300000});assert.equal(club.coins,before+300000);
 assert.equal(club.murallaGiftClaimed,true);assert.equal(club.flashbackGiftClaimed,false);assert.equal(club.sigmaGiftClaimed,false);
 assert.equal(JSON.stringify(club.owned),owned);assert.deepEqual(club.xi,xi);
 const restored=Save.unpack(Save.pack({version:2,club,tab:"muralla",matchToken:0},forms),forms).club;
 const snapshot=JSON.stringify(restored);assert.match(U.claimMurallaGift(restored).error,/Ya reclamaste/);assert.equal(JSON.stringify(restored),snapshot);
 assert.equal(U.claimFlashbackGift(restored).coins,200000);assert.equal(restored.coins,before+500000);
 const legacy=U.create(pool());delete legacy.murallaGiftClaimed;
 const old=Save.unpack(JSON.stringify({version:1,club:legacy,tab:"muralla",matchToken:0}),forms).club;
 assert.equal(U.claimMurallaGift(old).coins,300000);assert.equal(old.murallaGiftClaimed,true);
});
test("invalid balances and malformed Muralla claim flags cannot corrupt the saved club",()=>{
 for(const coins of [-1,NaN,Infinity,1e12-299999]){
  const club=U.create(pool());club.coins=coins;const before=structuredClone(club);
  assert.ok(U.claimMurallaGift(club).error);assert.deepEqual(club,before);
 }
 const boundary=U.create(pool());boundary.coins=1e12-300000;assert.equal(U.claimMurallaGift(boundary).ok,true);assert.equal(boundary.coins,1e12);
 for(const flag of ["false",0,1,null]){
  const club=U.create(pool());club.murallaGiftClaimed=flag;
  assert.equal(Save.normalize({version:2,club,tab:"muralla",matchToken:0},forms),null);
 }
});
function boot(storage=new Map()){
 let html="",modal="";const notices=[];
 const context=vm.createContext({AuraUT:U,AuraUTSave:Save,AuraSquad:Squad,AuraPortraits:Portraits,
  AuraEvolution:{pool,badge:()=>""},World:{getStats:()=>({players:69})},Competitions:{definitions:[]},clubs:[],
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
  document:{getElementById:()=>null},closeModal(){modal="";},openModal:(title,body)=>{modal=body;},notify:s=>notices.push(s),render(){html=context.UI.render();},goToModes(){},
 });
 vm.runInContext(read("muralla-event.js"),context);
 vm.runInContext(read("ultimate-ui.js")+";globalThis.UI=AuraUTUI",context);
 vm.runInContext(read("ultimate-sigma.js"),context);
 context.UI.bindRender(()=>{html=context.UI.render();});
 return {UI:context.UI,storage,notices,html:()=>html,modal:()=>modal,click:dataset=>context.UI.handleClick({dataset})};
}
test("Muralla UI opens through onboarding, buys all nine cards and restores the selected event after retired Sigma actions",()=>{
 const app=boot();app.click({utTab:"muralla"});assert.match(app.html(),/CREA TU CLUB/);
 app.click({ut:"create"});assert.match(app.html(),/EL GOL TERMINA AQUÍ/);
 assert.equal((app.html().match(/data-ut="muralla-buy"/g)||[]).length,9);
 const club=app.UI.getClub();club.coins=5000000;
 for(const p of U.murallaCards(pool()))app.click({ut:"muralla-buy",player:p.id});
 assert.equal(club.purchases,9);assert.equal((app.html().match(/✓ EN TU CLUB/g)||[]).length,9);
 const saved=boot(app.storage);assert.match(saved.UI.render(),/EL GOL TERMINA AQUÍ/);assert.equal(saved.UI.getClub().coins,club.coins);
 app.click({utTab:"club"});assert.match(app.html(),/ut-card muralla/);
 const before=JSON.stringify(club);app.click({ut:"muralla-buy",player:"muralla:saliba"});assert.equal(JSON.stringify(club),before);
 const beforeRetired=app.UI.render();app.click({sigmaOpen:"yes"});assert.equal(app.UI.render(),beforeRetired);
 app.click({utTab:"muralla"});assert.match(app.html(),/EL GOL TERMINA AQUÍ/);assert.doesNotMatch(app.html(),/ELIGE A TU SIGMA/);
 assert.equal(app.notices.filter(s=>s.includes("MURALLA fichado")).length,9);
});
test("the Muralla gift button credits and saves once inside the event, then stays disabled after purchases and reloads",()=>{
 const app=boot();app.click({ut:"create"});const club=app.UI.getClub(),before=club.coins;
 app.click({ut:"muralla-gift"});assert.equal(club.coins,before,"other UT tabs cannot claim this event gift");
 app.click({utTab:"muralla"});assert.match(app.html(),/RECLAMAR 300\.000 MONEDAS/);
 app.click({ut:"muralla-gift"});assert.equal(club.coins,before+300000);assert.equal(club.murallaGiftClaimed,true);
 assert.match(app.html(),/<button[^>]*data-ut="muralla-gift"[^>]*disabled/);
 app.click({ut:"muralla-buy",player:"muralla:gerard-martin"});assert.equal(club.coins,before);assert.equal(club.purchases,1);
 const reload=boot(app.storage),snapshot=JSON.stringify(reload.UI.getClub());
 assert.match(reload.UI.render(),/REGALO YA RECLAMADO/);reload.click({ut:"muralla-gift"});
 assert.equal(JSON.stringify(reload.UI.getClub()),snapshot);assert.equal(app.notices.filter(s=>s.includes("bienvenida MURALLA reclamadas")).length,1);
});
test("retired Sigma buttons never appear and stale clicks leave the active Muralla view and club unchanged",()=>{
 const app=boot();app.click({utTab:"muralla"});app.click({ut:"create"});
 const html=app.UI.render(),before=JSON.stringify(app.UI.getClub());
 assert.doesNotMatch(html,/data-sigma-|Ultimate Sigma|ELIGE A TU SIGMA/);
 for(const dataset of [{sigmaOpen:"yes"},{sigmaGift:""},{sigmaBuy:"sigma:espart"},{sigmaInspect:"sigma:mbappe"}]){
  assert.equal(app.click(dataset),true);assert.equal(app.UI.render(),html);assert.equal(JSON.stringify(app.UI.getClub()),before);
 }
 assert.match(html,/EL GOL TERMINA AQUÍ/);assert.match(html,/RECLAMAR 300\.000 MONEDAS/);
});
test("both desktop and mobile ship Muralla while keeping runtime copies identical",()=>{
 for(const entry of ["index.html","mobile.html"]){
  const html=read(entry);assert.match(html,/muralla-event\.css\?v=8\.1/);assert.match(html,/muralla-event\.js\?v=8\.1/);
  assert.ok(html.indexOf("muralla-event.js")<html.indexOf("./game-6.js"));
 }
 for(const file of ["ultimate-team","ultimate-ui","ultimate-save","evolution-ui"])
  assert.equal(read(file+".js"),read(file+"-61.js"));
 assert.match(read("evolution-ui.js"),/data-evo="muralla-open"/);
});
