'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),Save=require('../ultimate-save'),U=require('../ultimate-team'),Squad=require('../squad'),Admin=require('../admin-local');
const pool=Array.from({length:23},(_,i)=>({id:'p:'+i,name:'Player '+i,pos:Squad.formations['4-3-3'][i%11][0],overall:76,real:true}));
function legacy(){const club=U.create(pool);delete club.resetId;club.coins=123456789;club.duplicates=[{...club.owned[0],uid:'duplicate:old'}];club.lastPack=[club.owned[0]];club.promoCode88Claimed=true;club.adminGiftReceipts=['global:code45-jose-jose-99'];club.localAdminCredits=[Admin.grantId];const session={version:2,club,tab:'home',matchToken:5},map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};storage.setItem(Save.KEY,Save.pack(session));storage.setItem(Save.BACKUP_KEY,Save.pack(session));storage.setItem('career-save','unchanged');return {session,storage,map};}
test('every old club resets its coins, cards, repeats, codes and local admin entitlement exactly once on update',()=>{
 for(let device=0;device<2;device++){const f=legacy(),r=Save.load(f.storage);assert.equal(r.reset,true);assert.equal(r.snapshot.club.coins,0);assert.deepEqual(r.snapshot.club.owned,[]);assert.deepEqual(r.snapshot.club.duplicates,[]);assert.deepEqual(r.snapshot.club.lastPack,[]);assert.deepEqual(r.snapshot.club.xi,Array(11).fill(null));assert.deepEqual(r.snapshot.club.localAdminCredits,[]);assert.deepEqual(r.snapshot.club.adminGiftReceipts,[]);assert.deepEqual(r.snapshot.club.promoCodeUses,{'45':0,'88':0});assert.equal(r.snapshot.club.resetId,Save.RESET_ID);assert.equal(r.snapshot.club.name,f.session.club.name);assert.equal(f.storage.getItem('career-save'),'unchanged');assert.equal(f.session.club.coins,123456789);
 const next=r.snapshot;next.club.coins=99;next.club.owned.push(pool[0]);Save.save(f.storage,next);const again=Save.load(f.storage);assert.equal(again.reset,undefined);assert.equal(again.snapshot.club.coins,99);assert.equal(again.snapshot.club.owned.length,1);}
});
test('old primary, backup, imported files and corrupted primary recovery cannot restore the old coins and players',()=>{
 let f=legacy();const old=f.storage.getItem(Save.BACKUP_KEY);Save.load(f.storage);assert.equal(Save.restoreBackup(f.storage).club.coins,0);assert.equal(Save.importData(old).club.owned.length,0);f.storage.setItem(Save.BACKUP_KEY,old);assert.equal(Save.restoreBackup(f.storage).club.coins,0);
 f=legacy();f.storage.setItem(Save.KEY,'{broken');const recovered=Save.load(f.storage);assert.equal(recovered.recovered,true);assert.equal(recovered.reset,true);assert.equal(recovered.snapshot.club.owned.length,0);
});
test('quota failure never exposes the old economy as a current club',()=>{
 const f=legacy(),raw=f.storage.getItem(Save.KEY),blocked={...f.storage,setItem(){throw Error('quota');}};const r=Save.load(blocked);assert.equal(r.resetFailed,true);assert.equal(r.snapshot,null);assert.equal(f.storage.getItem(Save.KEY),raw);
});
test('newly created current clubs and their backups do not reset on repeated loads',()=>{
 const f=legacy(),club=U.create(pool);assert.equal(club.resetId,Save.RESET_ID);Save.save(f.storage,{version:2,club,tab:'club',matchToken:0});assert.deepEqual(Save.load(f.storage).snapshot.club,club);assert.equal(Save.load(f.storage).reset,undefined);
});
