'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const Admin=require('../admin-local'),U=require('../ultimate-team'),Save=require('../ultimate-save'),Squad=require('../squad'),Jose=require('../jose-jose-special-99'),P=require('../creator-promotions-99');
const forms=new Set(Object.keys(Squad.formations));Jose.install(P);
function fixture(){const pool=Array.from({length:23},(_,i)=>({id:'base-'+i,name:'Player '+i,pos:Squad.formations['4-3-3'][i%11][0],real:true,overall:76,club:'test'})),club=U.create(pool),session={version:2,club,tab:'backup',matchToken:12},map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};Save.save(storage,session,forms);return {pool,club,session,storage};}
test('45 grants the exact JOSE JOSE 99 edition and original photo without spending coins or granting admin authority',async()=>{
 const f=fixture(),before=structuredClone(f.club),r=await Admin.redeem(f.storage,f.session,' 45 ',forms);
 assert.equal(r.ok,true);assert.equal(r.rewardCode,'45');assert.equal(r.player.name,'JOSE JOSE');assert.equal(r.player.overall,99);assert.equal(r.player.photo,Jose.photo);assert.equal(r.player.originalId,Jose.player.id);assert.equal(r.player.tradeable,false);assert.equal(U.price(r.player),67000000,'the shop price stays at 67 million');
 assert.equal(r.club.coins,before.coins);assert.deepEqual(r.club.xi,before.xi);assert.equal(r.club.owned.length,before.owned.length+1);assert.deepEqual(f.club,before);assert.equal(Admin.restore(f.storage,r.club),false);assert.equal(U.hasUnlimited(r.club),false);assert.equal(f.storage.getItem(Admin.receiptKey),null);
 const loaded=Save.load(f.storage,forms).snapshot;assert.equal(loaded.club.owned.find(p=>p.id===r.player.id).overall,99);assert.ok(loaded.club.adminGiftReceipts.includes('global:code45-jose-jose-99'));
 assert.match((await Admin.redeem(f.storage,loaded,'45',forms)).error,/Ya canjeaste/);
 const imported=Save.importData(Save.exportData(loaded,forms),forms),other=fixture();Save.save(other.storage,imported,forms);assert.match((await Admin.redeem(other.storage,imported,'45',forms)).error,/Ya canjeaste/);
});
test('simultaneous clicks, stale teams and failed saves never duplicate or partially grant the code reward',async()=>{
 let f=fixture();const pair=await Promise.all([Admin.redeem(f.storage,f.session,'45',forms),Admin.redeem(f.storage,f.session,'45',forms)]);assert.equal(pair.filter(r=>r.ok).length,1);assert.equal(Save.load(f.storage,forms).snapshot.club.owned.length,24);
 f=fixture();const stale={...f.session,club:{...f.club,coins:f.club.coins+1}},raw=f.storage.getItem(Save.KEY);assert.ok((await Admin.redeem(f.storage,stale,'45',forms)).error);assert.equal(f.storage.getItem(Save.KEY),raw);
 assert.ok((await Admin.redeem(f.storage,f.session,'45',forms,()=>false)).error);assert.equal(f.storage.getItem(Save.KEY),raw);
 const set=f.storage.setItem;f.storage.setItem=(key,value)=>{if(key===Save.KEY)throw Error('quota');set(key,value);};assert.ok((await Admin.redeem(f.storage,f.session,'45',forms)).error);assert.equal(f.storage.getItem(Save.KEY),raw);assert.equal(f.club.owned.length,23);
});
test('an already-owned JOSE goes to duplicates and a separate club can redeem its own code once',async()=>{
 const f=fixture(),owned=P.card(Jose.promotion,Jose.promotion.cards[0],[]);f.club.owned.push(owned);Save.save(f.storage,f.session,forms);
 const r=await Admin.redeem(f.storage,f.session,'45',forms);assert.equal(r.ok,true);assert.equal(r.duplicate,true);assert.equal(r.club.owned.filter(p=>p.id===owned.id).length,1);assert.equal(r.club.duplicates.length,1);assert.equal(r.club.duplicates[0].id,owned.id);assert.equal(r.club.coins,f.club.coins);
 const other=fixture();assert.equal((await Admin.redeem(other.storage,other.session,'45',forms)).ok,true);
});
test('the visible code dialog clears 45 and confirms the free JOSE reward instead of unlimited coins',async()=>{
 const f=fixture(),field={value:'45'},notices=[];
 const context=vm.createContext({AuraUT:U,AuraUTSave:Save,AuraSquad:Squad,AuraAdminLocal:Admin,AuraPortraits:require('../portraits'),AuraEvolution:{pool:()=>f.pool,badge:()=>''},World:{getStats:()=>({players:23})},Competitions:{definitions:[]},clubs:[],localStorage:f.storage,document:{getElementById:()=>field},notify:message=>notices.push(message),closeModal(){},openModal(){},goToModes(){}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../ultimate-ui-99-jose45.js'),'utf8')+';globalThis.UI=AuraUTUI',context);context.UI.bindRender(()=>{});
 context.UI.handleClick({dataset:{ut:'admin-local-credit',adminInput:'ut-admin-modal-code'}});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(field.value,'');assert.equal(context.UI.getClub().coins,f.club.coins);assert.equal(context.UI.getClub().owned.at(-1).name,'JOSE JOSE');assert.equal(notices.length,1);assert.match(notices[0],/JOSE JOSE 99 GRL canjeado gratis/);assert.doesNotMatch(notices[0],/ilimitadas/);
});
