'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const P=require('../creator-promotions-99'),Special=require('../autogoles-special-99'),U=require('../ultimate-team'),Save=require('../ultimate-save'),Squad=require('../squad'),Portraits=require('../portraits'),Engine=require('../match-engine');
Special.install(P);
function fixture(coins=0){
 const pool=Array.from({length:23},(_,i)=>({id:'base-'+i,name:'Player '+i,pos:Squad.formations['4-3-3'][i%11][0],real:true,overall:76,club:'test'})),club=U.create(pool);
 club.coins=coins;const session={version:2,club,tab:'events',matchToken:1},map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
 assert.equal(Save.save(storage,session),true);return {pool,club,session,storage};
}
const claim=f=>P.purchase(f.storage,f.session,null,Special.promotion.id,Special.promotion.cards[0].id,f.pool,U,Save);
test('the free special preserves the exact supplied photo, name and negative rating without a shared feed',()=>{
 const promo=P.active(null).find(p=>p.id===Special.promotion.id);assert.ok(promo);
 const card=P.card(promo,promo.cards[0],[]);
 assert.equal(card.name,'EL DE LOS AUTOGOLES');assert.equal(card.overall,-67);assert.equal(card.promoPrice,0);assert.equal(card.tradeable,false);assert.equal(U.price(card),0);
 assert.deepEqual(Portraits.sources(card),[Special.photo]);assert.match(Portraits.html(card),/portrait-autogoles/);
 const image=fs.readFileSync(path.join(__dirname,'../assets/cards/el-de-los-autogoles-minus67.png'));
 assert.equal(crypto.createHash('sha256').update(image).digest('hex'),'27ad272ed71039caaedef294422aa3b9325733a041d49392fce40f0b87245ba3');
 assert.equal(Special.install(P),true);assert.equal(P.active(null).filter(p=>p.id===promo.id).length,1);
});
test('a club with zero coins can claim once and reload or export with the actual -67 rating intact',()=>{
 const f=fixture(),r=claim(f);assert.equal(r.ok,true);assert.equal(r.cost,0);assert.equal(r.club.coins,0);assert.equal(r.club.owned.length,24);assert.equal(f.club.owned.length,23);
 const saved=Save.load(f.storage).snapshot;assert.ok(saved);const card=saved.club.owned.find(p=>p.id===r.player.id);assert.equal(card.overall,-67);assert.equal(card.photo,Special.photo);
 const imported=Save.importData(Save.exportData(saved));assert.deepEqual(imported.club,saved.club);
 assert.ok(P.purchase(f.storage,saved,null,Special.promotion.id,Special.promotion.cards[0].id,[],U,Save).error);
 assert.equal(Save.load(f.storage).snapshot.club.owned.length,24);assert.equal(Save.load(f.storage).snapshot.club.coins,0);
 assert.ok(U.quickSell(saved.club,card.id).error);assert.equal(U.evolutionCost(card),null);
});
test('normal negative players and malformed lookalikes are still rejected by save and shared feed validation',()=>{
 const f=fixture(),r=claim(f),original=r.player;
 for(const mutation of [p=>p.id='ordinary',p=>p.originalId='other',p=>p.overall=-66,p=>p.name='Other player',p=>p.promoPrice=1,p=>p.tradeable=true]){
  const p={...original};mutation(p);const club={...r.club,owned:[...f.club.owned,p]};assert.equal(Save.normalize({...f.session,club}),null);
 }
 assert.equal(P.validateList([Special.promotion]),null,'negative ratings remain unavailable in the remote admin feed');
 const club=structuredClone(f.club);club.owned[0].overall=-67;assert.equal(Save.normalize({...f.session,club}),null);
});
test('stale sessions and storage failure cannot partially grant the free card',()=>{
 let f=fixture(1234);const stored=Save.load(f.storage).snapshot;stored.club.coins++;assert.equal(Save.save(f.storage,stored),true);assert.ok(claim(f).error);assert.equal(Save.load(f.storage).snapshot.club.owned.length,23);
 f=fixture(1234);const blocked={...f.storage,setItem(){throw Error('quota');}};assert.ok(P.purchase(blocked,f.session,null,Special.promotion.id,Special.promotion.cards[0].id,[],U,Save).error);
 assert.equal(Save.load(f.storage).snapshot.club.owned.length,23);assert.equal(Save.load(f.storage).snapshot.club.coins,1234);
});
test('the card can join the starting eleven or come from the bench while match physics stay finite',()=>{
 const f=fixture(),r=claim(f);assert.equal(U.setPlayer(r.club,2,r.player.id),true);assert.equal(Save.save(f.storage,{...f.session,club:r.club}),true);assert.equal(Save.load(f.storage).snapshot.club.owned.find(p=>p.id===r.player.id).overall,-67);
 const side=id=>({id,players:Engine.SHAPE.map((s,i)=>({id:id+i,name:id+' '+i,pos:s[0],overall:76}))});
 let home=side('home'),away=side('away');home.players[2]=r.player;
 const starter=Engine.create({home,away,seconds:60,seed:67});assert.equal(starter.players[2].overall,1);
 home=side('home');home.bench=[r.player];const game=Engine.create({home,away,seconds:60,seed:67});game.paused=true;assert.equal(Engine.substitute(game,2,r.player),true);game.paused=false;game.phase='playing';
 for(let i=0;i<180;i++)Engine.step(game,1/60,{});
 for(const p of game.players)for(const n of [p.x,p.z,p.vx,p.vz,p.overall])assert.ok(Number.isFinite(n));
});
test('the events UI clearly labels the free claim and disables it after ownership',()=>{
 const f=fixture(),context=vm.createContext({AuraPromotions:P,AuraUT:U,AuraPortraits:Portraits});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../creator-promotions-ui-99-specials.js'),'utf8'),context);
 const before=context.AuraPromotionsView.view(f.club,[],null);assert.match(before,/EL DE LOS AUTOGOLES/);assert.match(before,/>-67<small>/);assert.match(before,/<b>GRATIS<\/b>/);assert.match(before,/RECLAMAR GRATIS/);
 const r=claim(f),after=context.AuraPromotionsView.view(r.club,[],null);assert.match(after,/disabled[^>]*>✓ EN TU CLUB/);
});
