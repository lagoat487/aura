"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const U=require("../ultimate-team"),Save=require("../ultimate-save"),Squad=require("../squad"),Portraits=require("../portraits"),Events=require("../current-events");
const read=f=>fs.readFileSync(path.join(__dirname,"..",f),"utf8"),forms=new Set(Object.keys(Squad.formations));
const positions=["POR","LI","DFC","DFC","LD","MCD","MC","MC","EI","DC","ED","POR","LI","DFC","LD","MC","DC","ED","EI","MC","MCD","MCO","DFC"];
const pool=()=>positions.map((pos,i)=>({id:"starter:"+i,name:"Player "+i,pos,overall:76,real:true,nationality:"Ecuador",club:"starter"}));
test("current events contains all four live collections with their exact cards and excludes retired Sigma",()=>{
 const before=structuredClone(pool()),events=Events.catalogue(before);
 assert.deepEqual(events.map(e=>[e.tab,e.cards.length]),[["barcelona",27],["muralla",9],["flashback",5],["argentina",8]]);
 assert.equal(events.reduce((n,e)=>n+e.cards.length,0),49);assert.deepEqual(before,pool());
 for(const e of events)assert.ok(e.cards.some(p=>p.id===e.star));
 assert.equal(events[0].gift,500000);assert.equal(events[1].gift,300000);assert.equal(events[2].gift,200000);assert.equal(events[2].reward,70000);assert.equal(events[3].reward,35000);
 assert.ok(events.every(e=>e.tab!=="sigma"&&e.cards.every(p=>p.event!==U.sigma.id)));
});
test("event browsing shows prices, gift status and collection counts without granting or spending anything",()=>{
 const u=U.create(pool()),before=structuredClone(u),html=Events.view(u,pool());
 assert.equal((html.match(/class="ut-event-tile ut-event-tile--/g)||[]).length,4);assert.match(html,/49<\/b> CARTAS ESPECIALES/);
 for(const name of ["FC BARCELONA","MURALLA","FLASHBACK","LIGA ARGENTINA"])assert.ok(html.includes(name));
 assert.match(html,/300.000–1.000.000 monedas/);assert.match(html,/500.000 de bienvenida/);assert.match(html,/70.000 por partido del evento/);assert.match(html,/35.000 por partido del evento/);
 assert.doesNotMatch(html,/data-ut="(?:barcelona|muralla|flashback)-gift"/);assert.doesNotMatch(html,/SIGMA/);assert.deepEqual(u,before);
 u.barcelonaGiftClaimed=true;u.owned.push(U.barcelonaCards([])[0]);const updated=Events.view(u,[]);
 assert.match(updated,/✓ Regalo reclamado/);assert.match(updated,/1\/27 cartas en tu club/);assert.doesNotMatch(updated,/500.000 de bienvenida/);
});
function boot(runtime,storage=new Map()){
 let html="";const notices=[];
 const context=vm.createContext({AuraUT:U,AuraUTSave:Save,AuraSquad:Squad,AuraPortraits:Portraits,AuraCurrentEvents:Events,AuraEvolution:{pool,badge:()=>""},World:{getStats:()=>({players:23})},Competitions:{definitions:[]},clubs:[],
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},document:{getElementById:()=>null},notify:s=>notices.push(s),closeModal(){},openModal(){},goToModes(){}});
 for(const file of ["barcelona-event.js","muralla-event.js","flashback-event-v2.js","argentina-event.js"])vm.runInContext(read(file),context);
 vm.runInContext(read(runtime)+";globalThis.UI=AuraUTUI",context);context.UI.bindRender(()=>{html=context.UI.render();});
 return {UI:context.UI,storage,html:()=>html,notices,click:dataset=>context.UI.handleClick({dataset})};
}
for(const runtime of ["ultimate-ui.js","ultimate-ui-flashback-v2.js"]){
 test(runtime+": the hub survives onboarding and opens every live event with a working return route",()=>{
  const app=boot(runtime);app.click({utTab:"events"});app.click({ut:"create"});const u=app.UI.getClub(),before=structuredClone(u);
  assert.match(app.html(),/EVENTOS<br><em>ACTUALES/);assert.match(app.html(),/data-ut-tab="events" aria-current="page"/);
  const nav=app.html().match(/<nav class="ut-nav"[^>]*>(.*?)<\/nav>/s)[1];
  assert.equal((nav.match(/Eventos actuales/g)||[]).length,1);for(const event of ["barcelona","muralla","flashback","argentina"])assert.ok(!nav.includes('data-ut-tab="'+event+'"'));
  for(const [tab,cls] of [["barcelona","barca-event"],["muralla","mur-event"],["flashback","fb-event"],["argentina","arg-event"]]){
   assert.ok(app.html().includes('data-ut-tab="'+tab+'"'));app.click({utTab:tab});assert.ok(app.html().includes('class="'+cls+'"'));assert.match(app.html(),/← Eventos actuales/);
   assert.match(app.html(),/data-ut-tab="events" aria-current="page"/);assert.deepEqual(u,before);
   app.click({utTab:"events"});assert.match(app.html(),/ut-events-grid/);assert.deepEqual(u,before);
  }
  const reload=boot(runtime,app.storage);assert.match(reload.UI.render(),/ut-events-grid/);assert.deepEqual(reload.UI.getClub(),u);assert.deepEqual(app.notices,[]);
 });
 test(runtime+": gifts stay in their own event and the hub reflects claims and purchases across reloads",()=>{
  const app=boot(runtime);app.click({ut:"create"});app.click({utTab:"events"});const u=app.UI.getClub(),before=structuredClone(u);
  app.click({ut:"barcelona-gift"});app.click({ut:"muralla-gift"});app.click({ut:"flashback-gift"});assert.deepEqual(u,before);
  app.click({utTab:"barcelona"});app.click({ut:"barcelona-gift"});assert.equal(u.coins,510000);assert.equal(u.barcelonaGiftClaimed,true);
  app.click({ut:"barcelona-buy",player:"barcelona:gerard-martin"});assert.equal(u.coins,210000);assert.deepEqual(u.xi,before.xi);
  app.click({utTab:"events"});assert.match(app.html(),/✓ Regalo reclamado/);assert.match(app.html(),/1\/27 cartas en tu club/);
  const saved=structuredClone(u),reload=boot(runtime,app.storage);assert.deepEqual(reload.UI.getClub(),saved);assert.match(reload.UI.render(),/Regalo reclamado/);
  reload.click({utTab:"barcelona"});reload.click({ut:"barcelona-gift"});assert.deepEqual(reload.UI.getClub(),saved);assert.match(reload.html(),/data-ut="barcelona-gift" disabled/);
 });
}
test("new and legacy saved event tabs keep club inventory, gift and SBC progress intact",()=>{
 const u=U.create(pool());u.sbcCompleted=["ecuador","cantera"];U.claimBarcelonaGift(u);
 for(const tab of ["events","barcelona","muralla","flashback","argentina"]){const state={version:2,club:u,tab,matchToken:8};assert.deepEqual(Save.unpack(Save.pack(state,forms),forms),state);}
 const old=structuredClone(u);delete old.barcelonaGiftClaimed;const legacy=Save.unpack(JSON.stringify({version:1,club:old,tab:"barcelona",matchToken:3}),forms);
 assert.deepEqual(legacy.club,old);assert.equal(legacy.tab,"barcelona");
});
test("both production entries ship the new theme last and the hub before its controller",()=>{
 for(const file of ["index.html","mobile.html"]){const html=read(file);assert.match(html,/<title>AURA 6\.0/);assert.ok(html.lastIndexOf('<link rel="stylesheet"')===html.indexOf('<link rel="stylesheet" href="./aura-6.css'));assert.ok(html.indexOf("current-events.js")<html.indexOf("ultimate-ui-flashback-v2.js"));}
 for(const name of ["ultimate-ui","ultimate-save","evolution-ui"])assert.equal(read(name+".js"),read(name+"-flashback-v2.js"));
});
