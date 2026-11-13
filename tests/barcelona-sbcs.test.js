"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const U=require("../ultimate-team"),Save=require("../ultimate-save"),Squad=require("../squad"),Portraits=require("../portraits");
const read=f=>fs.readFileSync(path.join(__dirname,"..",f),"utf8");
const positions=["POR","LI","DFC","DFC","LD","MCD","MC","MC","EI","DC","ED","POR","LI","DFC","LD","MC","DC","ED","EI","MC","MCD","MCO","DFC"];
const starter=()=>positions.map((pos,i)=>({id:"starter:"+i,name:"Starter "+i,pos,overall:76,real:true,nationality:"Francia",club:"starter"}));
const forms=new Set(Object.keys(Squad.formations));
const tasks=[
 {key:"cantera",count:5,min:70,nation:"Spain",name:"Gavi",rating:88},
 {key:"brasil",count:5,min:75,nation:"Brazil",name:"Neymar Júnior",rating:90},
 {key:"albiceleste",count:7,min:75,nation:"ARG",name:"Ángel Di María",rating:89},
 {key:"defensa",count:6,min:80,nation:"Francia",name:"Rúben Dias",rating:90,pos:"DFC"},
 {key:"leyenda",count:11,min:83,nation:"Francia",name:"Lionel Messi",rating:92}
];
const reserves=t=>Array.from({length:t.count+2},(_,i)=>({id:t.key+":"+i,name:"Reserve "+i,pos:t.pos||"MC",overall:t.min+i,real:true,nationality:t.nation,tradeable:i%2===0}));

test("Barcelona includes all 27 official first-team players, including keepers and injured players",()=>{
 const names=["Joan García","Wojciech Szczęsny","Dominik Livaković","João Cancelo","Alejandro Balde","Pau Cubarsí","Xavi Espart","Andreas Christensen","Gerard Martín","Jules Koundé","Eric García","Brian Fariñas","Gavi","Fermín López","Pedri","Rodri","Dani Olmo","Frenkie de Jong","Marc Bernal","Gabriel Jesus","Lamine Yamal","Raphinha","Karim Adeyemi","Anthony Gordon","Roony Bardghji","Jesse Bisiwu","Hamza Abdelkarim"];
 const cards=U.barcelonaCards([]);assert.equal(cards.length,27);assert.equal(new Set(cards.map(p=>p.id)).size,27);
 assert.deepEqual(cards.map(p=>p.name).sort(),names.sort());assert.equal(cards.filter(p=>p.pos==="POR").length,3);
 const yamal=cards.find(p=>p.name==="Lamine Yamal");assert.equal(yamal.overall,93);assert.equal(U.price(yamal),1000000);
 assert.ok(cards.filter(p=>p!==yamal).every(p=>p.overall>=85&&p.overall<93&&U.price(p)>=300000&&U.price(p)<=900000));
 assert.ok(cards.every(p=>p.event===U.barcelona.id&&p.real&&p.tradeable&&p.sourceClub==="FC Barcelona"));
});
test("Barcelona special editions preserve identities, use the same club and leave real catalogue ratings intact",()=>{
 const base=[{id:"real:263578",name:"Balde",club:"barcelona",catalogClub:"es-barcelona",leagueId:"laliga",overall:83,real:true},{id:"real:230666",name:"Gabriel Jesus",club:"arsenal",catalogClub:"en-arsenal",overall:82,real:true}];
 const before=structuredClone(base),cards=U.barcelonaCards(base),balde=cards.find(p=>p.name==="Alejandro Balde");
 assert.equal(balde.originalId,"real:263578");assert.equal(balde.overall,89);assert.equal(Portraits.identity(balde),"263578");
 assert.ok(cards.every(p=>p.club==="barcelona"&&p.catalogClub==="es-barcelona"&&p.leagueId==="laliga"));
 assert.equal(cards.find(p=>p.name==="Gabriel Jesus").originalId,"real:230666");assert.deepEqual(base,before);
 const brian=cards.find(p=>p.name==="Brian Fariñas");assert.match(Portraits.sources(brian)[0],/^https:\/\/www.fcbarcelona.com\/photo-resources\//);
 assert.deepEqual(Portraits.sources({...brian,photo:brian.photo.replace("www.fcbarcelona.com","untrusted.example")}),[]);
});
test("all Barcelona purchases have fixed prices, debit once, save and never replace the XI",()=>{
 const u=U.create(starter()),xi=u.xi.slice();u.coins=30000000;
 for(const p of U.barcelonaCards([])){
  for(const played of [0,1,14,999]){u.played=played;assert.equal(U.marketPrice(u,p),U.price(p));}
  const before=u.coins;assert.deepEqual(U.buy(u,{...p,eventPrice:1}),{ok:true,cost:U.price(p)});assert.equal(u.coins,before-U.price(p));
  const snapshot=structuredClone(u);assert.match(U.buy(u,p).error,/ya está/);assert.deepEqual(u,snapshot);assert.equal(U.evolutionCost(p),null);
 }
 assert.deepEqual(u.xi,xi);assert.equal(u.purchases,27);assert.ok(U.bench(u).some(p=>p.event===U.barcelona.id));
 const state={version:2,club:u,tab:"barcelona",matchToken:9};assert.deepEqual(Save.unpack(Save.pack(state,forms),forms),state);
});
test("unavailable, forged and unaffordable Barcelona cards cannot mutate the club",()=>{
 const u=U.create(starter()),p=U.barcelonaCards([])[0],before=structuredClone(u);
 assert.match(U.buy(u,p).error,/monedas/);assert.deepEqual(u,before);
 u.coins=2000000;
 for(const changes of [{id:"barcelona:other"},{event:""},{overall:99},{pos:"POR"},{name:"Wrong player"}]){
  const snapshot=structuredClone(u);assert.match(U.buy(u,{...p,...changes}).error,/FC Barcelona/);assert.deepEqual(u,snapshot);
 }
});
test("Barcelona welcome gift credits exactly 500000 once and persists independently of other event gifts",()=>{
 const u=U.create(starter()),before=structuredClone(u);assert.equal(U.barcelona.welcome,500000);assert.equal(u.barcelonaGiftClaimed,false);
 assert.deepEqual(U.claimBarcelonaGift(u),{ok:true,coins:500000});assert.equal(u.coins,before.coins+500000);assert.equal(u.barcelonaGiftClaimed,true);
 assert.deepEqual(u.owned,before.owned);assert.deepEqual(u.duplicates,before.duplicates);assert.deepEqual(u.xi,before.xi);assert.equal(u.purchases,before.purchases);
 assert.equal(u.murallaGiftClaimed,false);assert.equal(u.flashbackGiftClaimed,false);
 const restored=Save.unpack(Save.pack({version:2,club:u,tab:"barcelona",matchToken:0},forms),forms).club,snapshot=structuredClone(restored);
 assert.match(U.claimBarcelonaGift(restored).error,/Ya reclamaste/);assert.deepEqual(restored,snapshot);
 assert.equal(U.claimMurallaGift(restored).coins,300000);assert.equal(U.claimFlashbackGift(restored).coins,200000);assert.equal(restored.coins,before.coins+1000000);
});
test("pre-event clubs can claim the Barcelona gift and corrupt claim flags are refused by the save validator",()=>{
 const u=U.create(starter());delete u.barcelonaGiftClaimed;
 const restored=Save.unpack(JSON.stringify({version:1,club:u,tab:"barcelona",matchToken:0}),forms).club;
 assert.equal(U.claimBarcelonaGift(restored).ok,true);assert.equal(restored.coins,510000);assert.equal(restored.barcelonaGiftClaimed,true);
 for(const flag of ["false",0,1,null]){const invalid=U.create(starter());invalid.barcelonaGiftClaimed=flag;assert.equal(Save.normalize({version:2,club:invalid,tab:"barcelona",matchToken:0},forms),null);}
});
test("invalid balances cannot partially claim or overflow the Barcelona welcome gift",()=>{
 for(const coins of [-1,NaN,Infinity,1e12-499999]){const u=U.create(starter());u.coins=coins;const before=structuredClone(u);assert.ok(U.claimBarcelonaGift(u).error);assert.deepEqual(u,before);}
 const u=U.create(starter());u.coins=1e12-500000;assert.equal(U.claimBarcelonaGift(u).ok,true);assert.equal(u.coins,1e12);
});
for(const t of tasks){
 test(t.key+" SBC delivers its exact exclusive player once and consumes only selected cards",()=>{
  const u=U.create(starter());u.owned.push(...reserves(t));
  const duplicate={...reserves(t)[0],uid:"duplicate:1",duplicate:true};u.duplicates.push(duplicate);
  const choices=U.sbcPool(u,t.key),ids=[...choices.filter(p=>!p.duplicate).slice(0,t.count-1).map(p=>p.uid),duplicate.uid];
  assert.equal(U.challenges[t.key].count,t.count);assert.equal(U.sbcPreview(u,t.key,ids).ok,true);
  const before=structuredClone(u),remaining=u.owned.filter(p=>!ids.includes(p.id));
  const result=U.submitSBC(u,t.key,ids,[]);assert.equal(result.ok,true);assert.equal(result.kind,"player");assert.equal(result.cards.length,1);
  const p=result.cards[0];assert.equal(p.name,t.name);assert.equal(p.overall,t.rating);assert.equal(p.tradeable,false);assert.equal(p.event,"sbc-stars");
  assert.equal(Portraits.identity(p),U.sbcRewards[t.key].playerId);assert.deepEqual(u.owned.filter(p=>p.id!==U.sbcRewards[t.key].cardId),remaining);
  assert.deepEqual(u.xi,before.xi);assert.equal(u.coins,before.coins);assert.equal(u.packsOpened,0);assert.equal(u.duplicates.length,0);assert.equal(u.sbcs,1);
  assert.deepEqual(u.sbcCompleted,[t.key]);assert.equal(U.evolutionCost(p),null);assert.match(U.buy(u,p).error,/exclusiva/);assert.ok(U.quickSell(u,p.id).error);
  const restored=Save.unpack(Save.pack({version:2,club:u,tab:"sbc",matchToken:0},forms),forms).club;
  const snapshot=structuredClone(restored);assert.match(U.submitSBC(restored,t.key,ids,[]).error,/Ya completaste/);assert.deepEqual(restored,snapshot);
  restored.owned=restored.owned.filter(p=>p.id!==U.sbcRewards[t.key].cardId);assert.equal(U.sbcCompleted(restored,t.key),true);
 });
 test(t.key+" SBC rejects wrong ratings, positions or nations, starters and repeated item IDs atomically",()=>{
  const u=U.create(starter());u.owned.push(...reserves(t));const ids=U.sbcPool(u,t.key).slice(0,t.count).map(p=>p.uid);
  const invalid=[{id:"bad:rating",overall:t.min-1,pos:t.pos||"MC",nationality:t.nation}];
  if(t.key==="defensa")invalid.push({id:"bad:position",overall:90,pos:"DC",nationality:t.nation});
  if(U.challenges[t.key].nationality)invalid.push({id:"bad:nation",overall:90,pos:"MC",nationality:"Ecuador"});
  u.owned.push(...invalid.map(p=>({...p,real:true,name:"Invalid"})));
  const before=structuredClone(u);
  const selections=[ids.slice(0,-1),[...ids,ids[0]],[...ids.slice(0,-1),ids[0]],[...ids.slice(0,-1),u.xi[0]],...invalid.map(p=>[...ids.slice(0,-1),p.id])];
  for(const selection of selections){assert.ok(U.submitSBC(u,t.key,selection,[]).error);assert.deepEqual(u,before);}
 });
}
test("old clubs keep Ecuador completion and can complete new challenges without re-opening existing rewards",()=>{
 const u=U.create(starter());delete u.sbcCompleted;u.owned.push(U.ecuadorSbcCard([]));assert.equal(U.sbcCompleted(u,"ecuador"),true);
 u.owned.push(...reserves(tasks[0]));assert.equal(U.submitSBC(u,"cantera",U.sbcPool(u,"cantera").slice(0,5).map(p=>p.uid),[]).ok,true);
 assert.equal(U.sbcCompleted(u,"ecuador"),true);assert.equal(U.sbcCompleted(u,"cantera"),true);assert.equal(U.sbcCompleted(u,"brasil"),false);
 const legacy=U.create(starter());legacy.owned.push(U.sbcRewardCard("leyenda",[]));delete legacy.sbcCompleted;assert.equal(U.sbcCompleted(legacy,"leyenda"),true);
});
function boot(runtime="ultimate-ui.js",storage=new Map()){
 let html="",modal="";const notices=[];
 const context=vm.createContext({AuraUT:U,AuraUTSave:Save,AuraSquad:Squad,AuraPortraits:Portraits,AuraEvolution:{pool:starter,badge:()=>""},World:{getStats:()=>({players:23})},Competitions:{definitions:[]},clubs:[],
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},document:{getElementById:()=>null},closeModal(){modal="";},openModal:(title,body)=>{modal=title+body;},notify:s=>notices.push(s),goToModes(){}});
 vm.runInContext(read("barcelona-event.js"),context);vm.runInContext(read(runtime)+";globalThis.UI=AuraUTUI",context);
 context.UI.bindRender(()=>{html=context.UI.render();});return {UI:context.UI,storage,notices,html:()=>html,modal:()=>modal,click:dataset=>context.UI.handleClick({dataset})};
}
for(const runtime of ["ultimate-ui.js","ultimate-ui-61.js"]){
 test(runtime+": welcome gift can only be claimed in the Barcelona event, stays disabled after buying and survives reload",()=>{
  const app=boot(runtime);app.click({ut:"create"});const u=app.UI.getClub(),before=structuredClone(u);
  app.click({ut:"barcelona-gift"});assert.deepEqual(u,before);assert.doesNotMatch(app.html(),/data-ut="barcelona-gift"/);
  app.click({utTab:"barcelona"});assert.match(app.html(),/RECLAMAR 500.000 MONEDAS/);assert.match(app.html(),/Una sola vez por club/);
  app.click({ut:"barcelona-gift"});assert.equal(u.coins,510000);assert.equal(u.barcelonaGiftClaimed,true);assert.deepEqual(u.xi,before.xi);assert.deepEqual(u.owned,before.owned);
  assert.match(app.html(),/data-ut="barcelona-gift" disabled/);assert.match(app.html(),/REGALO YA RECLAMADO/);
  const claimed=structuredClone(u);app.click({ut:"barcelona-gift"});assert.deepEqual(u,claimed);
  app.click({ut:"barcelona-buy",player:"barcelona:eric-garcia"});assert.equal(u.coins,10000);assert.ok(u.owned.some(p=>p.id==="barcelona:eric-garcia"));assert.equal(u.barcelonaGiftClaimed,true);
  const reload=boot(runtime,app.storage),snapshot=structuredClone(reload.UI.getClub());assert.deepEqual(snapshot,u);assert.match(reload.UI.render(),/data-ut="barcelona-gift" disabled/);
  reload.click({ut:"barcelona-gift"});assert.deepEqual(reload.UI.getClub(),snapshot);
  reload.click({utTab:"home"});reload.click({ut:"barcelona-gift"});assert.deepEqual(reload.UI.getClub(),snapshot);
 });
 test(runtime+": event opens through onboarding, buys into the collection and restores the selected tab",()=>{
  const app=boot(runtime);app.click({utTab:"barcelona"});assert.match(app.html(),/NUEVO EVENTO: FC BARCELONA/);app.click({ut:"create"});
  assert.equal((app.html().match(/class="barca-product"/g)||[]).length,27);assert.match(app.html(),/LAMINE YAMAL 93/);assert.match(app.html(),/1.000.000 de monedas/);
  app.UI.getClub().coins=1000000;const xi=app.UI.getClub().xi.slice();app.click({ut:"barcelona-buy",player:"barcelona:lamine-yamal"});
  assert.equal(app.UI.getClub().coins,0);assert.deepEqual(app.UI.getClub().xi,xi);assert.ok(app.UI.getClub().owned.some(p=>p.id==="barcelona:lamine-yamal"));
  assert.match(app.html(),/✓ EN TU CLUB/);const snapshot=structuredClone(app.UI.getClub());app.click({ut:"barcelona-buy",player:"barcelona:lamine-yamal"});assert.deepEqual(app.UI.getClub(),snapshot);
  const reload=boot(runtime,app.storage);assert.match(reload.UI.render(),/barca-event/);assert.deepEqual(reload.UI.getClub(),app.UI.getClub());
  reload.click({utTab:"club"});assert.match(reload.html(),/ut-card barcelona/);reload.click({ut:"barcelona-buy",player:"barcelona:balde"});assert.deepEqual(reload.UI.getClub(),snapshot);
 });
 test(runtime+": all five SBCs preview, confirm the correct player and clear a stale collection search",()=>{
  const app=boot(runtime);app.click({ut:"create"});const u=app.UI.getClub();
  for(const t of tasks){
   u.owned.push(...reserves(t));app.UI.input({target:{id:"ut-club-query",value:"Starter"}});app.click({utTab:"sbc"});app.click({utSbc:t.key});
   assert.match(app.html(),/sbc-star-hero/);assert.ok(app.html().includes(t.name));assert.match(app.html(),new RegExp("0/"+t.count+" cartas"));
   const before=structuredClone(u);app.click({ut:"sbc-auto"});app.click({ut:"sbc-review"});assert.ok(app.modal().includes(t.name+" "+t.rating));assert.deepEqual(u,before);
   app.click({ut:"sbc-confirm"});assert.match(app.modal(),/SBC COMPLETADO/);assert.ok(app.modal().includes(t.name.toUpperCase()));assert.ok(app.html().includes('data-player="'+U.sbcRewards[t.key].cardId+'"'));
   assert.match(app.html(),/id="ut-club-query" value=""/);assert.deepEqual(u.xi,before.xi);assert.equal(u.coins,before.coins);assert.equal(u.packsOpened,0);
   app.click({ut:"sbc-reward-close"});assert.equal(app.modal(),"");app.click({utSbc:t.key});app.click({utTab:"sbc"});assert.match(app.html(),/DCP COMPLETADO/);assert.doesNotMatch(app.html(),/data-ut="sbc-review"/);
  }
  assert.equal(u.sbcs,5);assert.deepEqual(boot(runtime,app.storage).UI.getClub(),u);assert.deepEqual(app.notices,[]);
 });
}
test("desktop and mobile load the new event and styles in the same order, with synchronized runtime copies",()=>{
 for(const file of ["ultimate-team","ultimate-save","ultimate-ui","evolution-ui"])assert.equal(read(file+".js"),read(file+"-61.js"));
 for(const entry of ["index.html","mobile.html"]){const html=read(entry);assert.match(html,/barcelona-event-6\.css\?v=6\.0/);assert.match(html,/barcelona-event-65\.js\?v=6\.5-unlimited/);assert.match(html,/ultimate-team-99-reset\.js/);}
 assert.match(read("evolution-ui.js"),/data-evo="barcelona-open"/);
 assert.deepEqual([...read("index.html").matchAll(/(?:src|href)="\.\/([^"?]+)/g)].map(m=>m[1]),[...read("mobile.html").matchAll(/(?:src|href)="\.\/([^"?]+)/g)].map(m=>m[1]));
});
