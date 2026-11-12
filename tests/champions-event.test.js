'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const U=require('../ultimate-team'),Save=require('../ultimate-save'),Squad=require('../squad'),Portraits=require('../portraits'),Event=require('../champions-event');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8'),forms=new Set(Object.keys(Squad.formations));
function pool(){return [...Array.from({length:23},(_,i)=>({id:'starter:'+i,name:'Starter '+i,pos:Squad.formations['4-3-3'][i%11][0],overall:76,real:true,club:'starter'})),...Array.from({length:8},(_,i)=>({id:'real:'+(800000+i),name:'Base elite '+i,pos:'MC',overall:86+i%7,real:true,club:'elite'}))];}
function fixture(){const list=pool(),club=U.create(list);club.coins=1000000;return {list,club};}
function sequence(values){let i=0;return ()=>{assert.ok(i<values.length,'unexpected random draw');return values[i++];};}
test('Champions selects ten distinct verified identities with 89 GRL, correct portraits and pack-only status',()=>{
 const cards=U.championsCards([]),before=pool();assert.equal(cards.length,10);assert.equal(new Set(cards.map(p=>p.originalId)).size,10);
 assert.deepEqual(cards.map(p=>Portraits.identity(p)),['233419','252371','212198','226271','247090','241651','258729','261478','225375','243702']);
 assert.ok(cards.every(p=>p.overall===89&&p.real&&p.packOnly&&!p.tradeable&&p.event==='champions'));assert.ok(U.activeEvents.includes(U.champions));assert.equal(U.champions.matchday,4);
 const base=structuredClone(before);U.championsCards(base);assert.deepEqual(base,before);
 const enzo=U.championsCards([{id:'real:247090',real:true,name:'Enzo Fernández',club:'chelsea',sourceClub:'Chelsea'},{id:'city-player',real:true,club:'city',sourceClub:'Man City',catalogClub:'world-city',leagueId:'england'}]).find(p=>p.id==='champions:enzo-fernandez');
 assert.equal(enzo.originalId,'real:247090');assert.equal(enzo.club,'city');assert.equal(enzo.catalogClub,'world-city');assert.equal(enzo.sourceClub,'Manchester City');
});
test('86+ promotional packs have real 86+ guarantees and an exact 8% Champions chance per independent card',()=>{
 for(const [id,count,cost] of [['champions86',1,25000],['championsTriple86',3,70000]]){
  const {club,list}=fixture(),before=structuredClone(club),result=U.draw(club,list,id,()=>.9);assert.equal(result.ok,true);assert.equal(result.cards.length,count);
  assert.ok(result.cards.every(p=>p.overall>=86&&!U.isChampions(p)));assert.equal(club.coins,before.coins-cost);assert.equal(club.packsOpened,1);assert.deepEqual(club.xi,before.xi);assert.equal(U.packs[id].championsChance,.08);
 }
 const hit=fixture(),miss=fixture();assert.equal(U.draw(hit.club,hit.list,'champions86',sequence([.079999,0])).cards[0].event,'champions');assert.equal(U.draw(miss.club,miss.list,'champions86',sequence([.08,0])).cards[0].event,undefined);
 for(let i=0;i<10;i++){const {club,list}=fixture();assert.equal(U.draw(club,list,'champions86',sequence([0,(i+.5)/10])).cards[0].id,U.champions.cards[i].id);}
 const triple=fixture(),result=U.draw(triple.club,triple.list,'championsTriple86',sequence([0,0,.5,0,0,.2]));assert.equal(result.cards.filter(U.isChampions).length,2);assert.equal(new Set(result.cards.map(p=>p.id)).size,3);assert.ok(U.isChampions(result.cards[0]));
});
test('Champions never enter the market, starter packs, classic packs, direct purchases or evolutions',()=>{
 const {club,list}=fixture(),cards=U.championsCards(list),before=structuredClone(club);
 for(const card of cards)for(const p of [card,{...card,event:undefined},{...card,id:'forged-id'}]){assert.match(U.buy(club,p).error,/solo se consiguen/);assert.equal(U.evolutionCost(p),null);assert.equal(U.price(p),0);}
 assert.deepEqual(club,before);const starter=U.create([...list,...cards.map(p=>({...p,overall:70}))]);assert.ok(starter.owned.every(p=>!U.isChampions(p)));
 for(const id of ['gold','premium']){const f=fixture();assert.ok(U.draw(f.club,[...f.list,...cards],id,()=>.99999).cards.every(p=>!U.isChampions(p)));}
 assert.match(Event.view(club,list),/SOLO EN SOBRES 86\+/);assert.doesNotMatch(Event.view(club,list),/data-ut="(?:buy|champions-buy)"/);
});
test('failed promotional openings are atomic, including insufficient funds, missing 86+ catalogue and invalid random input',()=>{
 for(const setup of [f=>{f.club.coins=0;},f=>{f.list=f.list.filter(p=>p.overall<86);},f=>{f.rng=()=>NaN;},f=>{f.rng=()=>1;}]){
  const f=fixture();setup(f);const before=structuredClone(f.club);assert.ok(U.draw(f.club,f.list,'champions86',f.rng||(()=>0)).error);assert.deepEqual(f.club,before);
 }
 const f=fixture(),before=structuredClone(f.club);assert.ok(U.draw(f.club,f.list,'champions86',()=>0,true).error);assert.deepEqual(f.club,before);
 U.setUnlimited(f.club,true);f.club.coins=0;assert.equal(U.draw(f.club,f.list,'championsTriple86',()=>0).ok,true);assert.equal(f.club.coins,0);
});
test('packed cards, duplicate UIDs, XI identity rules and Champions tab survive save and reload',()=>{
 const {club,list}=fixture(),xi=[...club.xi];U.draw(club,list,'champions86',()=>0);U.draw(club,list,'champions86',()=>0);
 assert.equal(club.owned.filter(p=>p.id==='champions:raphinha').length,1);assert.equal(club.duplicates.length,1);assert.match(club.duplicates[0].uid,/^duplicate:/);assert.equal(club.duplicates[0].event,'champions');assert.deepEqual(club.xi,xi);
 const original={id:'real:233419',name:'Raphinha',overall:88,pos:'EI',real:true,tradeable:true};club.owned.push(original);U.setPlayer(club,8,original.id);assert.equal(U.setPlayer(club,9,'champions:raphinha'),false);assert.equal(U.setPlayer(club,8,'champions:raphinha'),true);
 const state={version:2,club,tab:'champions',matchToken:7},saved=Save.unpack(Save.pack(state,forms),forms);assert.deepEqual(saved,state);assert.match(Event.view(saved.club,list),/1\/10/);assert.ok(U.quickSell(club,'champions:raphinha').error);
});
function boot(storage=new Map()){
 const list=pool();let html='',modal='';const context=vm.createContext({AuraUT:U,AuraUTSave:Save,AuraSquad:Squad,AuraPortraits:Portraits,AuraChampionsEvent:Event,AuraCurrentEvents:require('../current-events'),AuraEvolution:{pool:()=>list,badge:()=>''},World:{getStats:()=>({players:list.length})},Competitions:{definitions:[]},clubs:[],localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},document:{getElementById:()=>null},notify(){},closeModal(){modal='';},openModal:(title,body)=>{modal=body;},goToModes(){}});
 vm.runInContext(read('ultimate-ui-66.js')+';globalThis.UI=AuraUTUI',context);context.UI.bindRender(()=>{html=context.UI.render();});
 return {UI:context.UI,storage,html:()=>html,modal:()=>modal,click:dataset=>context.UI.handleClick({dataset})};
}
test('the event opens before onboarding, promotional shop buys and reveals, and owned cards stay usable after reload',()=>{
 const app=boot();app.click({utTab:'champions'});app.click({ut:'create'});const club=app.UI.getClub();assert.match(app.html(),/NOCHES DE/);assert.match(app.html(),/← Eventos actuales/);assert.equal((app.html().match(/class="ucl-player"/g)||[]).length,10);
 club.coins=100000;app.click({utTab:'store'});assert.match(app.html(),/8% Champions por carta/);assert.match(app.html(),/22,13% de obtener/);assert.match(app.html(),/data-pack="champions86"/);assert.match(app.html(),/data-pack="championsTriple86"/);
 const before=club.coins;app.click({ut:'pack',pack:'champions86'});assert.equal(club.coins,before-25000);assert.equal(club.lastPack[0].overall>=86,true);assert.match(app.modal(),/Añadido a tu club/);app.click({ut:'reveal-skip'});
 const reload=boot(app.storage);assert.deepEqual(reload.UI.getClub(),club);reload.click({utTab:'champions'});assert.match(reload.html(),/SOLO EN SOBRES 86\+/);
});
test('both desktop and mobile load a coherent Champions release and verified source-backed portraits',()=>{
 for(const entry of ['index.html','mobile.html']){const html=read(entry);for(const name of ['ultimate-team','ultimate-save','ultimate-ui','current-events'])assert.ok(html.includes(name==='ultimate-team'?'./ultimate-team-99-promos.js':name==='ultimate-ui'?'./ultimate-ui-99-promos.js':'./'+name+'-66.js?v=6.6-champions'));assert.match(html,/champions-event\.css\?v=6\.6/);assert.ok(html.indexOf('champions-event.js')<html.indexOf('ultimate-ui-99-promos.js'));}
 const data=JSON.parse(read('data/world-rosters.js').split('globalThis.AuraBundledWorld=')[1].trim().replace(/;$/,''));for(const p of U.champions.cards)assert.ok(data.rows.some(row=>row[0]===p.playerId));
});
