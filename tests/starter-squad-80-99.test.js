'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Starter=require('../starter-squad-80-99'),U=require('../ultimate-team'),Save=require('../ultimate-save'),Squad=require('../squad'),Rules=require('../clean-start-99'),Admin=require('../admin-local'),P=require('../creator-promotions-99'),Manage=require('../club-management-99');
const positions=['POR','LI','DFC','DFC','LD','MCD','MC','MC','EI','DC','ED','POR','LI','DFC','LD','MC','DC','ED','EI','MC','MCD','MCO','DFC'];
const pool=positions.map((pos,i)=>({id:'real:'+(200000+i),name:'Player '+i,pos,overall:75+i%8,real:true,nationality:'Ecuador',club:'fixture'}));
function fixture(empty=true){const club=U.create(pool);if(empty){club.coins=0;club.owned=[];club.duplicates=[];club.xi=Array(11).fill(null);}const session={version:2,club,tab:'club',matchToken:3},data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};Save.save(storage,session);return {club,session,storage};}
const current=f=>Save.load(f.storage).snapshot;
test('the eleven contain a goalkeeper and compatible positions, all exactly 80, with unique real identities',()=>{
 const original=structuredClone(pool),cards=Starter.players(pool);assert.equal(cards.length,11);assert.equal(cards[0].pos,'POR');assert.ok(cards.every(p=>p.overall===80&&!p.tradeable&&p.real));assert.equal(new Set(cards.map(p=>p.originalId)).size,11);
 for(let i=0;i<11;i++){assert.equal(Squad.positionPenalty(cards[i],Squad.formations['4-3-3'][i][0]),0);assert.ok(require('../portraits').sources(cards[i]).length);}assert.deepEqual(pool,original);
});
test('each empty club receives a complete saved XI once without coins or repeated grants on reload/import',()=>{
 const f=fixture(),before=structuredClone(f.club),r=Starter.grant(f.storage,f.session,pool,Save);assert.equal(r.ok,true);assert.equal(r.players.length,11);assert.equal(r.club.coins,0);assert.equal(U.rating(r.club),80);assert.equal(r.club.owned.length,11);assert.ok(r.club.xi.every(id=>r.club.owned.some(p=>p.id===id)));assert.equal(r.club.starter80Receipt,Starter.ID);assert.deepEqual(f.club,before);
 assert.equal(Starter.grant(f.storage,current(f),pool,Save).already,true);const imported=Save.importData(Save.exportData(current(f)));Save.save(f.storage,imported);assert.equal(Starter.grant(f.storage,current(f),pool,Save).already,true);assert.equal(current(f).club.owned.length,11);
 const other=fixture();assert.equal(Starter.grant(other.storage,other.session,pool,Save).players.length,11);
});
test('existing purchased players, lineups, coins and code-use counters survive the starter delivery',()=>{
 const f=fixture(false);f.club.coins=123456;f.club.promoCodeUses={'45':17,'88':20};Save.save(f.storage,f.session);const before=structuredClone(f.club),r=Starter.grant(f.storage,f.session,pool,Save);assert.equal(r.ok,true);assert.equal(r.club.owned.length,before.owned.length+11);assert.deepEqual(r.club.owned.slice(0,before.owned.length),before.owned);assert.deepEqual(r.club.xi,before.xi);assert.equal(r.club.coins,123456);assert.deepEqual(r.club.promoCodeUses,before.promoCodeUses);
});
test('discarding a starter does not renew the one-time starter grant',()=>{
 const f=fixture();Starter.grant(f.storage,f.session,pool,Save);const id=current(f).club.owned[0].id;assert.equal(Manage.discard(f.storage,current(f),id).ok,true);assert.equal(Starter.grant(f.storage,current(f),pool,Save).already,true);assert.equal(current(f).club.owned.length,10);
});
test('missing catalogue, storage failure and stale tabs never persist a receipt or partially grant the eleven',()=>{
 let f=fixture(),raw=f.storage.getItem(Save.KEY);assert.equal(Starter.grant(f.storage,f.session,pool.slice(0,10),Save).pending,true);assert.equal(Starter.grant(f.storage,f.session,pool.filter(p=>p.pos!=='POR'),Save).pending,true);assert.equal(f.storage.getItem(Save.KEY),raw);
 const blocked={...f.storage,setItem(){throw Error('quota');}};assert.ok(Starter.grant(blocked,f.session,pool,Save).error);assert.equal(f.storage.getItem(Save.KEY),raw);assert.equal(f.club.starter80Receipt,undefined);
 const newer=current(f);newer.club.coins=10;Save.save(f.storage,newer);raw=f.storage.getItem(Save.KEY);assert.ok(Starter.grant(f.storage,f.session,pool,Save).error);assert.equal(f.storage.getItem(Save.KEY),raw);
});
test('the production UI automatically gives existing clubs their eleven and refreshes a newly published promotion',()=>{
 const f=fixture(),model={...U},codes={...Admin},promos={...P};Rules.install(model,codes,promos,Save,Starter);let html='';
 const context=vm.createContext({AuraUT:model,AuraUTSave:Save,AuraSquad:Squad,AuraStarterSquad80:Starter,AuraCleanStart:Rules,AuraAdminLocal:codes,AuraPromotions:promos,AuraPortraits:require('../portraits'),AuraEvolution:{pool:()=>pool,badge:()=>''},World:{getStats:()=>({players:23})},Competitions:{definitions:[]},clubs:[],localStorage:f.storage,document:{getElementById:()=>null,querySelector:()=>html.includes('ut-current-events')?{}:null},notify(){},openModal(){},closeModal(){},goToModes(){}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../creator-promotions-ui-99-specials.js'),'utf8'),context);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../ultimate-ui-99-starter80.js'),'utf8')+';globalThis.UI=AuraUTUI',context);context.UI.bindRender(()=>html=context.UI.render());html=context.UI.render();assert.equal(context.UI.getClub().owned.length,11);assert.equal(context.UI.getClub().coins,0);assert.equal(current(f).club.starter80Receipt,Starter.ID);
 context.UI.handleClick({dataset:{utTab:'events'}});assert.match(html,/PROMOCIONES DEL CREADOR/);
 const feed={version:1,revision:2,event:null,announcements:[],gifts:[],promotions:[{id:'new-beginning',name:'UN NUEVO COMIENZO',description:'Nueva colección del creador',accent:'gold',paused:false,startsAt:'2020-01-01T00:00:00.000Z',endsAt:null,cards:[{id:'first',playerId:pool[0].id,overall:90,price:0}]}]};
 context.UI.setPromotions(feed);assert.match(html,/UN NUEVO COMIENZO/);assert.match(html,/RECLAMAR GRATIS/);assert.match(html,/data-ut="promo-buy"/);context.UI.handleClick({dataset:{ut:'promo-buy',promo:'new-beginning',entry:'first'}});assert.ok(context.UI.getClub().owned.some(p=>p.promoName==='UN NUEVO COMIENZO'));assert.equal(context.UI.getClub().coins,0);
});
