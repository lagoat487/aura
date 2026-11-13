"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const U=require("../ultimate-team"),Save=require("../ultimate-save"),Squad=require("../squad"),Portraits=require("../portraits"),Events=require("../current-events");
const read=f=>fs.readFileSync(path.join(__dirname,"..",f),"utf8"),forms=new Set(Object.keys(Squad.formations));
const positions=["POR","LI","DFC","DFC","LD","MCD","MC","MC","EI","DC","ED","POR","LI","DFC","LD","MC","DC","ED","EI","MC","MCD","MCO","DFC"];
const pool=()=>positions.map((pos,i)=>({id:"starter:"+i,name:"Player "+i,pos,overall:76,real:true,nationality:"Ecuador",club:"starter"}));
test("current events contains five live collections and excludes retired Sigma and Liga Argentina",()=>{
 const before=structuredClone(pool()),events=Events.catalogue(before);
 assert.deepEqual(events.map(e=>[e.tab,e.cards.length]),[["magia",4],["barcelona",27],["muralla",9],["flashback",5],["champions",10]]);
 assert.equal(events.reduce((n,e)=>n+e.cards.length,0),55);assert.deepEqual(before,pool());
 for(const e of events)assert.ok(e.cards.some(p=>p.id===e.star));
 assert.equal(events[0].gift,400000);assert.equal(events[1].gift,500000);assert.equal(events[2].gift,300000);assert.equal(events[3].gift,200000);assert.equal(events[3].reward,70000);
 assert.ok(events.every(e=>e.tab!=="sigma"&&e.cards.every(p=>p.event!==U.sigma.id)));
});
test("event browsing shows prices, gift status and collection counts without granting or spending anything",()=>{
 const u=U.create(pool()),before=structuredClone(u),html=Events.view(u,pool());
 assert.equal((html.match(/class="ut-event-tile ut-event-tile--/g)||[]).length,5);assert.match(html,/55<\/b> CARTAS ESPECIALES/);
 for(const name of ["MAGIA","FC BARCELONA","MURALLA","FLASHBACK"])assert.ok(html.includes(name));
 assert.match(html,/300.000–1.000.000 monedas/);assert.match(html,/500.000 de bienvenida/);assert.match(html,/70.000 por partido del evento/);assert.doesNotMatch(html,/LIGA ARGENTINA|35.000 por partido del evento/);
 assert.doesNotMatch(html,/data-ut="(?:magia|barcelona|muralla|flashback)-gift"/);assert.doesNotMatch(html,/SIGMA/);assert.deepEqual(u,before);
 u.barcelonaGiftClaimed=true;u.owned.push(U.barcelonaCards([])[0]);const updated=Events.view(u,[]);
 assert.match(updated,/✓ Regalo reclamado/);assert.match(updated,/1\/27 cartas en tu club/);assert.doesNotMatch(updated,/500.000 de bienvenida/);
});
function boot(runtime,storage=new Map()){
 let html="";const notices=[];
 const context=vm.createContext({AuraUT:U,AuraUTSave:Save,AuraSquad:Squad,AuraPortraits:Portraits,AuraCurrentEvents:Events,AuraEvolution:{pool,badge:()=>""},World:{getStats:()=>({players:23})},Competitions:{definitions:[]},clubs:[],
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},document:{getElementById:()=>null},notify:s=>notices.push(s),closeModal(){},openModal(){},goToModes(){}});
 for(const file of ["champions-event.js","magia-event.js","barcelona-event.js","muralla-event.js","flashback-event-v2.js","argentina-event.js"])vm.runInContext(read(file),context);
 vm.runInContext(read(runtime)+";globalThis.UI=AuraUTUI",context);context.UI.bindRender(()=>{html=context.UI.render();});
 return {UI:context.UI,storage,html:()=>html,notices,click:dataset=>context.UI.handleClick({dataset})};
}
for(const runtime of ["ultimate-ui.js","ultimate-ui-61.js","ultimate-ui-62.js"]){
 test(runtime+": the hub survives onboarding and opens every live event with a working return route",()=>{
  const app=boot(runtime);app.click({utTab:"events"});app.click({ut:"create"});const u=app.UI.getClub(),before=structuredClone(u);
  assert.match(app.html(),/EVENTOS<br><em>ACTUALES/);assert.match(app.html(),/data-ut-tab="events" aria-current="page"/);
  const nav=app.html().match(/<nav class="ut-nav"[^>]*>(.*?)<\/nav>/s)[1];
  assert.equal((nav.match(/Eventos actuales/g)||[]).length,1);for(const event of ["magia","barcelona","muralla","flashback","argentina"])assert.ok(!nav.includes('data-ut-tab="'+event+'"'));
  for(const [tab,cls] of [["magia","mag-event"],["barcelona","barca-event"],["muralla","mur-event"],["flashback","fb-event"],["champions","ucl-event"]]){
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
 for(const tab of ["events","magia","barcelona","muralla","flashback","champions","argentina"]){const state={version:2,club:u,tab,matchToken:8};assert.deepEqual(Save.unpack(Save.pack(state,forms),forms),{...state,tab:tab==="argentina"?"events":tab});}
 const old=structuredClone(u);delete old.barcelonaGiftClaimed;const legacy=Save.unpack(JSON.stringify({version:1,club:old,tab:"barcelona",matchToken:3}),forms);
 assert.deepEqual(legacy.club,old);assert.equal(legacy.tab,"barcelona");
});
test("both production entries ship the new theme last and the hub before its controller",()=>{
 for(const file of ["index.html","mobile.html"]){const html=read(file);assert.match(html,/<title>AURA 27 · VISION 9\.9/);assert.ok(html.indexOf("aura-6.css")>html.indexOf("mobile-mode.css"));assert.ok(html.indexOf("magia-event.css")>html.indexOf("aura-6.css"));assert.ok(html.indexOf("match-vision-96.css")>html.indexOf("magia-event.css"));assert.ok(html.indexOf("current-events-66.js")<html.indexOf("ultimate-ui-99-starter80.js"));}
 for(const ext of ["js","css"])assert.equal(read("barcelona-event."+ext),read("barcelona-event-6."+ext));
 for(const name of ["ultimate-team","ultimate-ui","ultimate-save","evolution-ui","game"])assert.equal(read(name+".js"),read(name+(name==="game"?"-6.js":"-61.js")));
});

for(const runtime of ['ultimate-ui.js','ultimate-ui-61.js','ultimate-ui-62.js']){
 test(runtime+': retired Argentina saves keep owned cards while legacy UI actions cannot buy or play',()=>{
  const u=U.create(pool()),cards=U.argentinaCards(pool());u.owned.push(...cards);u.coins=187654;u.argentinaEarned=70000;
  U.setPlayer(u,9,cards[0].id);const before=structuredClone(u),storage=new Map([[Save.KEY,JSON.stringify({version:2,club:u,tab:'argentina',matchToken:12})]]);
  const app=boot(runtime,storage);assert.deepEqual(app.UI.getClub(),before);
  assert.match(app.UI.render(),/EVENTOS<br><em>ACTUALES/);assert.doesNotMatch(app.UI.render(),/data-ut-tab="argentina"|class="arg-product"/);
  for(const dataset of [{ut:'argentina-buy',player:cards[0].id},{ut:'argentina-play',opponent:'boca'},{ut:'argentina-play',opponent:'river'},{utMode:U.argentina.id},{utTab:'argentina'}]){
   app.click(dataset);assert.deepEqual(app.UI.getClub(),before);
  }
  app.UI.openArgentinaEvent();assert.match(app.html(),/ut-events-grid/);assert.deepEqual(app.UI.getClub(),before);
  app.click({utTab:'club'});assert.match(app.html(),/ut-card argentina/);assert.match(app.html(),/Enner Valencia/);
  app.click({utTab:'squad'});assert.match(app.html(),/ut-card argentina/);
  const reload=boot(runtime,storage);assert.deepEqual(reload.UI.getClub(),before);assert.deepEqual(app.notices,[]);
 });
}
test('retirement release keeps card styling and uses fresh coherent UT sources on both entrypoints',()=>{
 for(const name of ['ultimate-team','ultimate-ui','ultimate-save','current-events']){
  assert.equal(read(name+'-62.js'),read(name+'.js'));
  for(const entry of ['index.html','mobile.html'])assert.ok(read(entry).includes(name==='ultimate-team'?'./ultimate-team-99-cleanstart.js':name==='ultimate-ui'?'./ultimate-ui-99-starter80.js':'./'+name+(name==='ultimate-save'?'-99-starter80.js':'-66.js?v=6.6-champions')));
 }
 assert.equal(read('evolution-ui-99-control2.js'),read('evolution-ui.js'));
 for(const entry of ['index.html','mobile.html']){
  assert.match(read(entry),/argentina-event\.css/);assert.doesNotMatch(read(entry),/src="\.\/argentina-event\.js/);
 }
});
