'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Base=require('../ultimate-team'),Save=require('../ultimate-save'),Admin=require('../admin-local'),Promos=require('../creator-promotions-99'),Squad=require('../squad'),Rules=require('../clean-start-99');
const pool=Array.from({length:23},(_,i)=>({id:'p:'+i,name:'Player '+i,pos:Squad.formations['4-3-3'][i%11][0],overall:76,real:true}));
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};
function runtime(){const U={...Base},A={...Admin},P={...Promos};assert.equal(Rules.install(U,A,P,Save),true);return {U,A,P};}
test('the new season creates zero coins and zero players and pauses every unearned welcome reward',()=>{
 const {U,P}=runtime(),club=U.create(pool);assert.equal(club.resetId,Save.RESET_ID);assert.equal(club.coins,0);assert.deepEqual(club.owned,[]);assert.deepEqual(club.duplicates,[]);assert.deepEqual(club.xi,Array(11).fill(null));assert.ok(Save.normalize({version:2,club,tab:'club'}));
 const before=JSON.stringify(club);for(const method of ['claimMagiaGift','claimBarcelonaGift','claimMurallaGift','claimFlashbackGift','claimSigmaGift'])assert.match(U[method](club).error,/pausados/);assert.equal(JSON.stringify(club),before);assert.deepEqual(P.active({promotions:[{}]}),[]);assert.ok(P.purchase().error);assert.deepEqual(U.activeEvents,[]);assert.equal(U.setTimedCoins({startsAt:new Date().toISOString(),endsAt:new Date(Date.now()+60000).toISOString()}),false);assert.equal(U.hasUnlimited(club),false);
});
test('gift codes cannot restore the removed cards or coins and do not consume a future redemption',async()=>{
 const {U,A}=runtime(),club=U.create(pool),storage=memory(),session={version:2,club,tab:'club'};Save.save(storage,session);const raw=storage.getItem(Save.KEY);
 for(const code of ['45',' 45 ','88'])assert.match((await A.redeem(storage,session,code)).error,/pausados/);assert.equal(storage.getItem(Save.KEY),raw);assert.deepEqual(club.promoCodeUses,{'45':0,'88':0});
});
test('the second requested reset clears a club that already received the first reset',()=>{
 const club=Base.create(pool);club.resetId='aura-99-reset-20261113-01';club.coins=360000000;club.promoCodeUses={'45':6,'88':6};const storage=memory();storage.setItem(Save.KEY,Save.pack({version:2,club,tab:'events'}));
 const current=Save.load(storage);assert.equal(current.reset,true);assert.equal(current.snapshot.club.coins,0);assert.equal(current.snapshot.club.owned.length,0);assert.equal(current.snapshot.club.resetId,Save.RESET_ID);assert.equal(Save.load(storage).reset,undefined);
});
test('desktop and mobile load the clean policy before UI, remove the built-in gift registrations and retain 9.9',()=>{
 for(const entry of ['index.html','mobile.html']){const html=fs.readFileSync(path.join(__dirname,'..',entry),'utf8');assert.match(html,/VISION 9\.9/);assert.ok(html.indexOf('clean-start-99.js')<html.indexOf('ultimate-ui-99-cleanstart.js'));assert.ok(html.indexOf('admin-local-99-sixcodes.js')<html.indexOf('clean-start-99.js'));assert.doesNotMatch(html,/src="\.\/jose-jose-special-99\.js|src="\.\/autogoles-special-99\.js/);}
});
test('the actual clean UI creates an empty club, shows no welcome gifts and blocks legacy event routes',()=>{
 const {U,A,P}=runtime(),storage=memory(),field={value:'DESDE CERO'};let html='';const context=vm.createContext({AuraUT:U,AuraUTSave:Save,AuraSquad:Squad,AuraCleanStart:Rules,AuraAdminLocal:A,AuraPromotions:P,AuraPortraits:require('../portraits'),AuraEvolution:{pool:()=>pool,badge:()=>''},AuraCurrentEvents:require('../current-events'),World:{getStats:()=>({players:23})},Competitions:{definitions:[]},clubs:[],localStorage:storage,document:{getElementById:id=>id==='ut-club-name'?field:null},notify(){},openModal(){},closeModal(){},goToModes(){}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../ultimate-ui-99-cleanstart.js'),'utf8')+';globalThis.UI=AuraUTUI',context);context.UI.bindRender(()=>html=context.UI.render());const start=context.UI.render();assert.match(start,/Crear club desde cero/);assert.doesNotMatch(start,/Recibir 23|10.000 monedas|400.000/);
 context.UI.handleClick({dataset:{ut:'create'}});assert.equal(context.UI.getClub().coins,0);assert.equal(context.UI.getClub().owned.length,0);for(const tab of ['events','magia','barcelona','muralla','flashback','champions']){context.UI.handleClick({dataset:{utTab:tab}});assert.match(html,/SIN REGALOS ACTIVOS/);assert.doesNotMatch(html,/data-ut="[^"]*-gift"|RECLAMAR GRATIS|400.000|REGALO YA RECLAMADO/);}
});
