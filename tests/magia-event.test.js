"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const U=require("../ultimate-team"),Save=require("../ultimate-save"),Squad=require("../squad"),Portraits=require("../portraits"),Magia=require("../magia-event"),Events=require("../current-events");
const read=f=>fs.readFileSync(path.join(__dirname,"..",f),"utf8"),forms=new Set(Object.keys(Squad.formations));
const positions=["POR","LI","DFC","DFC","LD","MCD","MC","MC","EI","DC","ED","POR","LI","DFC","LD","MC","DC","ED","EI","MC","MCD","MCO","DFC"];
const pool=()=>positions.map((pos,i)=>({id:"starter:"+i,name:"Starter "+i,pos,overall:76,real:true,nationality:"Ecuador",club:"starter"}));
const expected=[["Michael Olise",91,800000],["Nico Paz",88,700000],["Lionel Messi",97,3000000],["Yan Diomande",89,1000000]];
test("MAGIA has exactly the four requested cards, ratings and fixed coin prices, led by Messi 97",()=>{
 const cards=U.magiaCards([]);assert.deepEqual(cards.map(p=>[p.name,p.overall,U.price(p)]),expected);assert.equal(new Set(cards.map(p=>p.id)).size,4);
 assert.ok(cards.every(p=>p.real&&p.tradeable&&p.event===U.magia.id));assert.equal(U.magia.name,"MAGIA");assert.equal(U.magia.welcome,400000);
 const u=U.create(pool());for(const played of [0,1,45,999]){u.played=played;for(const p of cards){assert.equal(U.marketPrice(u,p),U.price(p));assert.equal(U.evolutionCost(p),null);}}
});
test("MAGIA resolves exact player identities and portraits without confusing other Diomandes or changing base ratings",()=>{
 const base=[{id:"real:270531",name:"Ousmane Diomande",pos:"DFC",overall:81,real:true},{id:"real:78012",name:"Yan Diomande",pos:"ED",overall:84,real:true},
  {id:"real:158023",name:"Messi",pos:"MCO",overall:86,real:true},{id:"real:277846",name:"Nico Paz",pos:"MCO",overall:84,real:true}];
 const before=structuredClone(base),cards=U.magiaCards(base);assert.equal(cards[3].originalId,"real:78012");assert.equal(cards[2].originalId,"real:158023");
 assert.deepEqual(cards.map(p=>Portraits.identity(p)),["247827","277846","158023","78012"]);assert.deepEqual(base,before);
 assert.equal(U.magiaCards([{id:"legacy:paz",name:"Nicolás Paz Martínez",real:true}])[1].originalId,"legacy:paz");
});
test("MAGIA purchases debit the exact fixed amount once and preserve the XI, existing cards and catalogue",()=>{
 const base=pool(),beforePool=structuredClone(base),u=U.create(base),xi=u.xi.slice(),owned=structuredClone(u.owned);u.coins=6000000;
 for(const p of U.magiaCards(base)){
  const coins=u.coins;assert.deepEqual(U.buy(u,{...p,eventPrice:1}),{ok:true,cost:U.price(p)});assert.equal(u.coins,coins-U.price(p));
  const before=structuredClone(u);assert.match(U.buy(u,p).error,/ya está/);assert.deepEqual(u,before);
 }
 assert.equal(u.coins,500000);assert.equal(u.purchases,4);assert.deepEqual(u.xi,xi);assert.deepEqual(u.owned.slice(0,owned.length),owned);assert.deepEqual(base,beforePool);
 assert.ok(U.bench(u).some(p=>p.event===U.magia.id));assert.deepEqual(Save.unpack(Save.pack({version:2,club:u,tab:"magia",matchToken:9},forms),forms).club,u);
});
test("forged, unavailable or unaffordable MAGIA items cannot spend coins or add cards",()=>{
 const u=U.create(pool()),messi=U.magiaCards([])[2],before=structuredClone(u);assert.match(U.buy(u,messi).error,/monedas/);assert.deepEqual(u,before);u.coins=5000000;
 for(const changes of [{id:"magia:fake"},{event:""},{name:"Another Messi"},{overall:99},{pos:"POR"}]){const snapshot=structuredClone(u);assert.match(U.buy(u,{...messi,...changes}).error,/MAGIA/);assert.deepEqual(u,snapshot);}
});
test("different Messi editions share an identity and cannot occupy two starting slots",()=>{
 const u=U.create(pool()),messi=U.sbcRewardCard("leyenda",[]);u.owned.push(messi);u.coins=3000000;assert.ok(U.buy(u,U.magiaCards([])[2]).ok);
 assert.equal(U.setPlayer(u,9,messi.id),true);assert.equal(U.setPlayer(u,8,"magia:messi"),false);assert.ok(!U.bench(u).some(p=>p.id==="magia:messi"));
 assert.equal(U.setPlayer(u,9,"magia:messi"),true);assert.ok(!U.bench(u).some(p=>p.id===messi.id));
});
test("every new or pre-event club can claim exactly 400000 once, independently of the other event gifts",()=>{
 for(const legacy of [false,true]){
  const u=U.create(pool());if(legacy){delete u.magiaGiftClaimed;u.played=100;u.barcelonaGiftClaimed=true;u.flashbackGiftClaimed=true;}
  const before=structuredClone(u);assert.deepEqual(U.claimMagiaGift(u),{ok:true,coins:400000});assert.equal(u.coins,before.coins+400000);assert.equal(u.magiaGiftClaimed,true);
  assert.deepEqual(u.owned,before.owned);assert.deepEqual(u.xi,before.xi);assert.equal(u.barcelonaGiftClaimed,before.barcelonaGiftClaimed);assert.equal(u.flashbackGiftClaimed,before.flashbackGiftClaimed);
  const restored=Save.unpack(Save.pack({version:2,club:u,tab:"magia",matchToken:0},forms),forms).club,snapshot=structuredClone(restored);
  assert.match(U.claimMagiaGift(restored).error,/Ya reclamaste/);assert.deepEqual(restored,snapshot);
 }
 const u=U.create(pool());U.claimMagiaGift(u);assert.equal(U.claimBarcelonaGift(u).coins,500000);assert.equal(U.claimMurallaGift(u).coins,300000);assert.equal(U.claimFlashbackGift(u).coins,200000);assert.equal(u.coins,1410000);
});
test("invalid balances or malformed gift flags cannot corrupt a MAGIA claim or saved club",()=>{
 for(const coins of [-1,NaN,Infinity,1e12-399999]){const u=U.create(pool());u.coins=coins;const before=structuredClone(u);assert.ok(U.claimMagiaGift(u).error);assert.deepEqual(u,before);}
 const u=U.create(pool());u.coins=1e12-400000;assert.equal(U.claimMagiaGift(u).ok,true);assert.equal(u.coins,1e12);
 for(const flag of ["false",0,1,null]){const u=U.create(pool());u.magiaGiftClaimed=flag;assert.equal(Save.normalize({version:2,club:u,tab:"magia",matchToken:0},forms),null);}
});
function boot(runtime="ultimate-ui.js",storage=new Map()){
 let html="";const notices=[];const context=vm.createContext({AuraUT:U,AuraUTSave:Save,AuraSquad:Squad,AuraPortraits:Portraits,AuraMagiaEvent:Magia,AuraCurrentEvents:Events,AuraEvolution:{pool,badge:()=>""},World:{getStats:()=>({players:23})},Competitions:{definitions:[]},clubs:[],document:{getElementById:()=>null},
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},closeModal(){},openModal(){},notify:s=>notices.push(s),goToModes(){}});
 vm.runInContext(read(runtime)+";globalThis.UI=AuraUTUI",context);context.UI.bindRender(()=>{html=context.UI.render();});return {UI:context.UI,html:()=>html,storage,notices,click:dataset=>context.UI.handleClick({dataset})};
}
for(const runtime of ["ultimate-ui.js","ultimate-ui-61.js"]){
 test(runtime+": MAGIA opens through onboarding and the events hub, claims once, buys a card and restores on reload",()=>{
  const app=boot(runtime);app.click({utTab:"magia"});assert.match(app.html(),/NUEVO EVENTO: MAGIA/);app.click({ut:"create"});const u=app.UI.getClub(),xi=u.xi.slice();
  assert.match(app.html(),/LIONEL MESSI 97/);assert.match(app.html(),/3.000.000 de monedas/);assert.equal((app.html().match(/class="mag-product"/g)||[]).length,4);assert.match(app.html(),/RECLAMAR 400.000 MONEDAS/);
  app.click({utTab:"events"});assert.match(app.html(),/55<\/b> CARTAS ESPECIALES/);assert.match(app.html(),/Entrar a MAGIA/);
  const before=structuredClone(u);app.click({ut:"magia-gift"});app.click({ut:"magia-buy",player:"magia:olise"});assert.deepEqual(u,before);
  app.click({utTab:"magia"});app.click({ut:"magia-gift"});assert.equal(u.coins,410000);assert.equal(u.magiaGiftClaimed,true);assert.match(app.html(),/data-ut="magia-gift" disabled/);assert.deepEqual(u.xi,xi);
  const claimed=structuredClone(u);app.click({ut:"magia-gift"});assert.deepEqual(u,claimed);
  u.coins+=300000;app.click({ut:"magia-buy",player:"magia:nico-paz"});assert.equal(u.coins,10000);assert.ok(u.owned.some(p=>p.id==="magia:nico-paz"));assert.deepEqual(u.xi,xi);assert.match(app.html(),/✓ EN TU CLUB/);
  const snapshot=structuredClone(u),reload=boot(runtime,app.storage);assert.deepEqual(reload.UI.getClub(),snapshot);assert.match(reload.UI.render(),/data-ut="magia-gift" disabled/);reload.click({ut:"magia-gift"});assert.deepEqual(reload.UI.getClub(),snapshot);
  reload.click({utTab:"club"});assert.match(reload.html(),/ut-card magia/);reload.click({utTab:"events"});assert.match(reload.html(),/1\/4 cartas en tu club/);assert.match(reload.html(),/Regalo reclamado/);
 });
}
test("both entrypoints ship complete MAGIA assets and synchronized current controllers without requiring a cached old model",()=>{
 for(const name of ["ultimate-team","ultimate-save","ultimate-ui","evolution-ui","current-events"])assert.equal(read(name+".js"),read(name+"-61.js"));
 for(const file of ["index.html","mobile.html"]){const html=read(file);for(const name of ["ultimate-team","ultimate-save","ultimate-ui","evolution-ui","current-events"])assert.ok(html.includes(name==='ultimate-team'?'./ultimate-team-99-promos.js':name==='ultimate-ui'?'./ultimate-ui-99-jose45.js':'./'+name+(name==='evolution-ui'?'-99-control2.js?v=9.9-control2':name==='ultimate-save'?'-99-specials.js':'-66.js?v=6.6-champions')));
  assert.ok(html.includes('./magia-event.css?v=6.1'));assert.ok(html.includes('./magia-event-65.js?v=6.5-unlimited'));assert.ok(html.indexOf('magia-event-65.js')<html.indexOf('./game-99.js'));
 }
});
test("the updated event catalogue remains compatible with an already cached pre-MAGIA model",()=>{
 const old={...U};delete old.magia;delete old.magiaCards;delete old.activeEvents;delete old.champions;delete old.championsCards;
 const context=vm.createContext({AuraUT:old,AuraPortraits:Portraits});vm.runInContext(read('current-events.js'),context);
 assert.equal(context.AuraCurrentEvents.catalogue([]).length,3);
});
