'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../creator-promotions-99'),Jose=require('../jose-jose-special-99'),U=require('../ultimate-team'),Save=require('../ultimate-save'),Squad=require('../squad'),Portraits=require('../portraits');
Jose.install(P);
function fixture(coins=67000000){const pool=Array.from({length:23},(_,i)=>({id:'base-'+i,name:'Player '+i,pos:Squad.formations['4-3-3'][i%11][0],real:true,overall:76,club:'test'})),club=U.create(pool);club.coins=coins;const session={version:2,club,tab:'events',matchToken:1},map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};Save.save(storage,session);return {pool,club,session,storage};}
test('JOSE JOSE is available as a special card with the requested rating, price and supplied photo',()=>{
 const promo=P.active(null).find(p=>p.id===Jose.promotion.id);assert.ok(promo);const entry=promo.cards[0],player=P.card(promo,entry,[]);
 assert.equal(player.name,'JOSE JOSE');assert.equal(player.overall,99);assert.equal(entry.price,67000000);assert.equal(U.price(player),67000000);assert.deepEqual(Portraits.sources(player),[Jose.photo]);assert.match(Portraits.html(player),/portrait-jose/);assert.match(Portraits.html(player),/jose-jose-99\.jpeg/);
 assert.equal(Jose.install(P),true);assert.equal(P.active(null).filter(p=>p.id===promo.id).length,1,'repeat installation cannot duplicate the special');
});
test('buying JOSE JOSE debits exactly 67 million and preserves the edition and photo on reload',()=>{
 const f=fixture(),r=P.purchase(f.storage,f.session,null,Jose.promotion.id,Jose.promotion.cards[0].id,f.pool,U,Save);
 assert.equal(r.ok,true);assert.equal(r.cost,67000000);assert.equal(r.club.coins,0);assert.equal(f.club.coins,67000000,'only the saved successor is committed');
 const saved=Save.load(f.storage).snapshot,player=saved.club.owned.find(p=>p.id===r.player.id);assert.ok(player);assert.equal(player.overall,99);assert.equal(player.name,'JOSE JOSE');assert.equal(player.photo,Jose.photo);assert.equal(player.originalId,Jose.player.id);assert.equal(U.marketPrice(saved.club,player),67000000);assert.deepEqual(Portraits.sources(player),[Jose.photo]);
 assert.ok(P.purchase(f.storage,saved,null,Jose.promotion.id,Jose.promotion.cards[0].id,f.pool,U,Save).error,'a second click cannot charge for another copy');
});
test('insufficient coins and failed storage cannot charge or partially grant JOSE JOSE',()=>{
 let f=fixture(66999999);assert.ok(P.purchase(f.storage,f.session,null,Jose.promotion.id,Jose.promotion.cards[0].id,f.pool,U,Save).error);assert.equal(f.club.coins,66999999);assert.equal(f.club.owned.length,23);
 f=fixture();const blocked={...f.storage,setItem(){throw Error('quota');}};assert.ok(P.purchase(blocked,f.session,null,Jose.promotion.id,Jose.promotion.cards[0].id,f.pool,U,Save).error);assert.equal(Save.load(f.storage).snapshot.club.coins,67000000);assert.equal(f.club.owned.length,23);
});
