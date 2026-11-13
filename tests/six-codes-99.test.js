'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),Admin=require('../admin-local'),Save=require('../ultimate-save'),U=require('../ultimate-team'),Squad=require('../squad');
const forms=new Set(Object.keys(Squad.formations));
function fixture(){const pool=Array.from({length:23},(_,i)=>({id:'p:'+i,name:'Player '+i,pos:Squad.formations['4-3-3'][i%11][0],overall:76,real:true})),club=U.create(pool),map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};Save.save(storage,{version:2,club,tab:'club',matchToken:0});return {storage,club};}
const current=f=>Save.load(f.storage).snapshot;
test('45 gives exactly six free JOSE copies and the seventh is refused after reload and backup import',async()=>{
 const f=fixture();for(let n=1;n<=6;n++){const r=await Admin.redeem(f.storage,current(f),'45',forms);assert.equal(r.ok,true);assert.equal(r.uses,n);assert.equal(r.remaining,6-n);assert.equal(r.player.name,'JOSE JOSE');assert.equal(r.player.overall,99);assert.equal(r.club.coins,f.club.coins);}
 const s=current(f);assert.equal(s.club.owned.filter(p=>p.name==='JOSE JOSE').length,1);assert.equal(s.club.duplicates.filter(p=>p.name==='JOSE JOSE').length,5);assert.equal(new Set(s.club.duplicates.map(p=>p.uid)).size,5);assert.match((await Admin.redeem(f.storage,s,'45',forms)).error,/6 veces/);const imported=Save.importData(Save.exportData(s));Save.save(f.storage,imported);assert.match((await Admin.redeem(f.storage,current(f),'45',forms)).error,/6 veces/);
});
test('88 gives six sixty-million rewards independently of 45 and then refuses a seventh',async()=>{
 const f=fixture();for(let n=1;n<=6;n++){const r=await Admin.redeem(f.storage,current(f),'88',forms);assert.equal(r.ok,true);assert.equal(r.club.coins,f.club.coins+60000000*n);assert.equal(r.uses,n);}assert.match((await Admin.redeem(f.storage,current(f),'88',forms)).error,/6 veces/);assert.equal((await Admin.redeem(f.storage,current(f),'45',forms)).ok,true);assert.equal(current(f).club.coins,f.club.coins+360000000);
});
test('double clicks, changed clubs, full storage and duplicate capacity cannot spend an extra code use',async()=>{
 const f=fixture(),s=current(f),pair=await Promise.all([Admin.redeem(f.storage,s,'88',forms),Admin.redeem(f.storage,s,'88',forms)]);assert.equal(pair.filter(r=>r.ok).length,1);assert.equal(current(f).club.promoCodeUses['88'],1);
 const raw=f.storage.getItem(Save.KEY),blocked={...f.storage,setItem(){throw Error('quota');}};assert.ok((await Admin.redeem(blocked,current(f),'88',forms)).error);assert.equal(f.storage.getItem(Save.KEY),raw);assert.ok((await Admin.redeem(f.storage,current(f),'45',forms,()=>false)).error);assert.equal(f.storage.getItem(Save.KEY),raw);
 const malformed=current(f);malformed.club.promoCodeUses={'45':7};assert.equal(Save.normalize(malformed),null);malformed.club.promoCodeUses={'88':-1};assert.equal(Save.normalize(malformed),null);
});
