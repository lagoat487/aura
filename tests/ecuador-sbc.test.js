"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const U=require("../ultimate-team"),Save=require("../ultimate-save"),Squad=require("../squad"),Portraits=require("../portraits");
const positions=["POR","LI","DFC","DFC","LD","MCD","MC","MC","EI","DC","ED","POR","LI","DFC","LD","MC","DC","ED","EI","MC","MCD","MCO","DFC"];
const starter=()=>positions.map((pos,i)=>({id:"starter:"+i,name:"Starter "+i,pos,overall:76,real:true,nationality:"Francia",club:"club"}));
const ecuador=(count=12)=>Array.from({length:count},(_,i)=>({id:"ecuador:"+i,name:"Ecuatoriano "+i,pos:positions[i%positions.length],overall:i===0?1:i===11?99:20+i*5,real:true,nationality:i%2?"Ecuador":"ECU",tradeable:i%2===0}));
function club(){const u=U.create(starter());u.owned.push(...ecuador());return u;}
const read=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");
test("Ecuador SBC accepts exactly 11 Ecuador cards of any rating or position, including untradeables",()=>{
 const u=club(),def=U.challenges.ecuador,cards=U.sbcPool(u,"ecuador");
 assert.equal(def.count,11);assert.equal(def.score,0);assert.equal(cards.length,12);assert.ok(cards.some(p=>p.overall===1));assert.ok(cards.some(p=>p.overall===99));
 const ids=cards.slice(0,10).concat(cards[11]).map(p=>p.uid);assert.equal(U.sbcPreview(u,"ecuador",ids).ok,true);
 assert.equal(U.sbcPreview(u,"ecuador",ids).count,11);assert.equal(U.sbcPreview(u,"ecuador",ids).needed,0);
});
test("wrong counts, foreign cards, starters and reused item IDs reject the submission atomically",()=>{
 const u=club(),ids=U.sbcPool(u,"ecuador").slice(0,11).map(p=>p.uid),before=structuredClone(u);
 const foreign=u.owned.find(p=>!u.xi.includes(p.id)&&p.nationality==="Francia");
 for(const selection of [ids.slice(0,10),U.sbcPool(u,"ecuador").map(p=>p.uid),[...ids.slice(0,10),foreign.id],[...ids.slice(0,10),u.xi[0]],[...ids.slice(0,10),ids[0]],null]){
  assert.ok(U.submitSBC(u,"ecuador",selection,starter()).error);assert.deepEqual(u,before);
 }
});
test("mixed reserves and duplicate copies consume only the selected eleven and award Caicedo 87 without spending coins",()=>{
 const u=club(),starterCard=u.owned.find(p=>p.id===u.xi[0]);starterCard.nationality="Ecuador";
 const duplicates=[1,2,3].map(n=>({...starterCard,uid:"duplicate:"+n,duplicate:true}));u.duplicates.push(...duplicates);
 const reserves=U.sbcPool(u,"ecuador").filter(p=>!p.duplicate).slice(0,9),ids=[...reserves.map(p=>p.uid),duplicates[0].uid,duplicates[1].uid];
 const xi=u.xi.slice(),coins=u.coins,packs=u.packsOpened,originals=structuredClone(u.owned.filter(p=>!ids.includes(p.id)));
 const result=U.submitSBC(u,"ecuador",ids,[...starter(),{id:"real:256079",name:"Moisés Caicedo",real:true,pos:"MCD",overall:88}]);
 assert.equal(result.ok,true);assert.equal(result.kind,"player");assert.equal(result.cards.length,1);
 const p=result.cards[0];assert.equal(p.name,"Moisés Caicedo");assert.equal(p.overall,87);assert.equal(p.nationality,"Ecuador");assert.equal(p.pos,"MCD");assert.equal(p.tradeable,false);assert.equal(p.event,U.ecuadorSbc.id);
 assert.equal(p.originalId,"real:256079");assert.equal(Portraits.identity(p),"256079");
 assert.deepEqual(u.xi,xi);assert.equal(u.coins,coins);assert.equal(u.packsOpened,packs);assert.equal(u.sbcs,1);
 assert.deepEqual(u.owned.filter(q=>q.id!==p.id),originals);assert.deepEqual(u.duplicates,[duplicates[2]]);assert.ok(u.owned.some(p=>p.id===starterCard.id));
 assert.deepEqual(u.sbcCompleted,["ecuador"]);
});
test("the exclusive reward and one-time completion persist in backups and older clubs remain eligible",()=>{
 const u=club(),ids=U.sbcPool(u,"ecuador").slice(0,11).map(p=>p.uid);delete u.sbcCompleted;
 assert.equal(U.submitSBC(u,"ecuador",ids,[]).ok,true);
 const forms=new Set(Object.keys(Squad.formations)),restored=Save.unpack(Save.pack({version:2,club:u,tab:"sbc",matchToken:5},forms),forms).club;
 assert.deepEqual(restored,u);const before=structuredClone(restored);
 assert.equal(U.sbcCompleted(restored,"ecuador"),true);assert.deepEqual(U.sbcPool(restored,"ecuador"),[]);
 assert.match(U.submitSBC(restored,"ecuador",ids,[]).error,/Ya completaste/);assert.deepEqual(restored,before);
 const reward=restored.owned.find(p=>p.id===U.ecuadorSbc.cardId);assert.match(U.buy(restored,reward).error,/exclusiva/);assert.ok(U.quickSell(restored,reward.id).error);assert.equal(U.evolutionCost(reward),null);
 restored.owned=restored.owned.filter(p=>p.id!==reward.id);assert.equal(U.sbcCompleted(restored,"ecuador"),true,"consuming the reward later cannot reopen the challenge");
 for(const invalid of ["ecuador",["ecuador","ecuador"],[""]]){
  const damaged=club();damaged.sbcCompleted=invalid;assert.equal(Save.normalize({version:2,club:damaged,tab:"sbc",matchToken:0},forms),null);
 }
});
function boot(storage=new Map(),runtime="ultimate-ui.js",catalogue=starter()){
 let html="",modal="";const notices=[];
 const context=vm.createContext({AuraUT:U,AuraUTSave:Save,AuraSquad:Squad,AuraPortraits:Portraits,AuraEvolution:{pool:()=>catalogue,badge:()=>""},World:{getStats:()=>({players:catalogue.length})},Competitions:{definitions:[]},clubs:[],
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},document:{getElementById:()=>null},notify:s=>notices.push(s),closeModal(){modal="";},openModal:(title,body)=>{modal=title+body;},goToModes(){},
 });
 vm.runInContext(read(runtime)+";globalThis.UI=AuraUTUI",context);context.UI.bindRender(()=>{html=context.UI.render();});
 return {UI:context.UI,storage,notices,html:()=>html,modal:()=>modal,click:dataset=>context.UI.handleClick({dataset})};
}
test("the real SBC UI previews the tricolor reward, reviews eleven exact items and saves a single player reward",()=>{
 const app=boot();app.click({ut:"create"});app.UI.getClub().owned.push(...ecuador());
 const before=structuredClone(app.UI.getClub());app.click({ut:"ecuador-sbc-open"});
 assert.match(app.html(),/MOISÉS<br>CAICEDO/);assert.match(app.html(),/ut-card ecuador/);assert.match(app.html(),/0\/11 cartas de Ecuador/);
 app.click({ut:"sbc-auto"});assert.match(app.html(),/11\/11 cartas de Ecuador/);assert.deepEqual(app.UI.getClub(),before);
 app.click({ut:"sbc-review"});assert.match(app.modal(),/Estas 11 cartas/);assert.match(app.modal(),/Moisés Caicedo 87/);assert.deepEqual(app.UI.getClub(),before);
 app.click({ut:"sbc-confirm"});const earned=app.UI.getClub();assert.equal(earned.sbcs,1);assert.equal(earned.coins,before.coins);assert.equal(earned.packsOpened,0);assert.equal(earned.owned.filter(p=>p.id===U.ecuadorSbc.cardId).length,1);
 assert.match(app.modal(),/SBC ECUADOR COMPLETADO/);assert.match(app.modal(),/ut-shell ecuador-sbc-reward/);assert.match(app.html(),/Moisés Caicedo/);
 const snapshot=structuredClone(earned);app.click({ut:"sbc-confirm"});assert.deepEqual(earned,snapshot);
 const reload=boot(app.storage);assert.deepEqual(reload.UI.getClub(),earned);reload.click({ut:"ecuador-sbc-open"});assert.match(reload.html(),/DCP COMPLETADO/);assert.doesNotMatch(reload.html(),/data-ut="sbc-review"/);
});

for(const runtime of ["ultimate-ui.js","ultimate-ui-6.js"]){
 test("the SBC player reward remains visible after a previous club search: "+runtime,()=>{
  const app=boot(new Map(),runtime);app.click({ut:"create"});app.UI.getClub().owned.push(...ecuador());
  app.UI.input({target:{id:"ut-club-query",value:"Starter"}});app.click({utTab:"club"});app.click({utTab:"home"});app.click({utTab:"club"});
  assert.equal(app.html().match(/id="ut-club-query" value="([^"]*)"/)?.[1],"Starter",'ordinary navigation should preserve the search');
  const before=structuredClone(app.UI.getClub());app.click({ut:"ecuador-sbc-open"});app.click({ut:"sbc-auto"});app.click({ut:"sbc-review"});app.click({ut:"sbc-confirm"});
  assert.match(app.modal(),/SBC ECUADOR COMPLETADO/);app.click({ut:"sbc-reward-close"});assert.equal(app.modal(),"");
  assert.ok(app.html().includes('data-player="'+U.ecuadorSbc.cardId+'"'),'the awarded player must be visible in Mi club');
  assert.equal(app.html().match(/id="ut-club-query" value="([^"]*)"/)?.[1],"");assert.equal(app.UI.getClub().coins,before.coins);assert.deepEqual(app.UI.getClub().xi,before.xi);
  const earned=structuredClone(app.UI.getClub());app.UI.input({target:{id:"ut-club-query",value:"Starter"}});app.click({utTab:"club"});
  assert.ok(!app.html().includes('data-player="'+U.ecuadorSbc.cardId+'"'),'the club search still works after receiving the reward');assert.deepEqual(app.UI.getClub(),earned);
 });
 test("pack rewards remain visible after either reveal exit and a previous club search: "+runtime,()=>{
  for(const exit of ["reveal-skip","reveal-next"]){
   const rewards=Array.from({length:3},(_,i)=>({id:"pack-reward:"+i,name:"New reward "+i,pos:"MC",overall:84,real:true,nationality:"Ecuador"}));
   const catalogue=starter().map(p=>({...p,overall:70})).concat(rewards),app=boot(new Map(),runtime,catalogue);app.click({ut:"create"});
   app.UI.input({target:{id:"ut-club-query",value:"Starter"}});app.click({utTab:"club"});app.click({utTab:"store"});app.click({ut:"pack",pack:"gold"});
   const earned=structuredClone(app.UI.getClub());assert.equal(earned.coins,7500);assert.equal(earned.owned.length,26);assert.equal(earned.duplicates.length,0);
   for(let i=0;i<(exit==="reveal-next"?3:1);i++)app.click({ut:exit});
   assert.equal(app.modal(),"");assert.equal(app.html().match(/id="ut-club-query" value="([^"]*)"/)?.[1],"");
   for(const p of rewards)assert.ok(app.html().includes('data-player="'+p.id+'"'),'new pack card should appear after '+exit);
   assert.deepEqual(app.UI.getClub(),earned,'showing rewards must not spend coins or change the received items');
  }
 });
}

test("both entrypoints load Ecuador card styles and all shipped Ultimate Team copies remain equal",()=>{
 for(const entry of ["index.html","mobile.html"])assert.match(read(entry),/ecuador-sbc\.css\?v=8\.3/);
 for(const file of ["ultimate-team","ultimate-save","ultimate-ui"])assert.equal(read(file+".js"),read(file+"-6.js"));
});
