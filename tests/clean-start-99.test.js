'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Base=require('../ultimate-team'),Save=require('../ultimate-save'),Admin=require('../admin-local'),Promos=require('../creator-promotions-99'),Squad=require('../squad'),Rules=require('../clean-start-99'),Starter=require('../starter-squad-80-99');
const pool=Array.from({length:23},(_,i)=>({id:'p:'+i,name:'Player '+i,pos:Squad.formations['4-3-3'][i%11][0],overall:76,real:true}));
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};
function runtime(){const U={...Base},A={...Admin},P={...Promos};assert.equal(Rules.install(U,A,P,Save,Starter),true);return {U,A,P};}
test('the new season creates zero coins and eleven 80-rated starters and pauses every unearned welcome reward',()=>{
 const {U,P}=runtime(),club=U.create(pool);assert.equal(club.resetId,Save.RESET_ID);assert.equal(club.coins,0);assert.equal(club.owned.length,11);assert.ok(club.owned.every(p=>p.overall===80));assert.deepEqual(club.duplicates,[]);assert.equal(new Set(club.xi).size,11);assert.ok(club.xi.every(Boolean));assert.ok(Save.normalize({version:2,club,tab:'club'}));
 const before=JSON.stringify(club);for(const method of ['claimMagiaGift','claimBarcelonaGift','claimMurallaGift','claimFlashbackGift','claimSigmaGift'])assert.match(U[method](club).error,/pausados/);assert.equal(JSON.stringify(club),before);assert.equal(P.active,Promos.active);assert.equal(P.purchase,Promos.purchase);assert.deepEqual(U.activeEvents,[]);assert.equal(U.setTimedCoins({startsAt:new Date().toISOString(),endsAt:new Date(Date.now()+60000).toISOString()}),false);assert.equal(U.hasUnlimited(club),false);
});
test('the season policy leaves the reactivated unlimited gift codes available',async()=>{
 const {U,A}=runtime(),club=U.create(pool),storage=memory(),session={version:2,club,tab:'club'};Save.save(storage,session);assert.equal(A.redeem,Admin.redeem);
 for(let n=1;n<=8;n++){const r=await A.redeem(storage,Save.load(storage).snapshot,'88');assert.equal(r.ok,true);assert.equal(r.uses,n);}
 assert.equal(Save.load(storage).snapshot.club.coins,480000000);
});
test('the second requested reset clears a club that already received the first reset',()=>{
 const club=Base.create(pool);club.resetId='aura-99-reset-20261113-01';club.coins=360000000;club.promoCodeUses={'45':6,'88':6};const storage=memory();storage.setItem(Save.KEY,Save.pack({version:2,club,tab:'events'}));
 const current=Save.load(storage);assert.equal(current.reset,true);assert.equal(current.snapshot.club.coins,0);assert.equal(current.snapshot.club.owned.length,0);assert.equal(current.snapshot.club.resetId,Save.RESET_ID);assert.equal(Save.load(storage).reset,undefined);
});
test('desktop and mobile load the clean policy before UI, remove the built-in gift registrations and retain 9.9',()=>{
 for(const entry of ['index.html','mobile.html']){const html=fs.readFileSync(path.join(__dirname,'..',entry),'utf8');assert.match(html,/VISION 9\.9/);assert.ok(html.indexOf('clean-start-starter80-99.js')<html.indexOf('ultimate-ui-99-starter80.js'));assert.ok(html.indexOf('admin-local-99-unlimitedcodes.js')<html.indexOf('clean-start-starter80-99.js'));assert.doesNotMatch(html,/src="\.\/jose-jose-special-99\.js|src="\.\/autogoles-special-99\.js/);}
});
test('the actual clean UI creates an empty club, shows the starter eleven and routes collections to current creator promotions',()=>{
 const {U,A,P}=runtime(),storage=memory(),field={value:'DESDE CERO'};let html='';const context=vm.createContext({AuraUT:U,AuraUTSave:Save,AuraSquad:Squad,AuraCleanStart:Rules,AuraStarterSquad80:Starter,AuraAdminLocal:A,AuraPromotions:P,AuraPortraits:require('../portraits'),AuraEvolution:{pool:()=>pool,badge:()=>''},AuraCurrentEvents:require('../current-events'),World:{getStats:()=>({players:23})},Competitions:{definitions:[]},clubs:[],localStorage:storage,document:{getElementById:id=>id==='ut-club-name'?field:null},notify(){},openModal(){},closeModal(){},goToModes(){}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../ultimate-ui-99-starter80.js'),'utf8')+';globalThis.UI=AuraUTUI',context);context.UI.bindRender(()=>html=context.UI.render());const start=context.UI.render();assert.match(start,/11 jugadores de 80/);assert.doesNotMatch(start,/Recibir 23|10.000 monedas|400.000/);
 context.UI.handleClick({dataset:{ut:'create'}});assert.equal(context.UI.getClub().coins,0);assert.equal(context.UI.getClub().owned.length,11);for(const tab of ['events','magia','barcelona','muralla','flashback','champions']){context.UI.handleClick({dataset:{utTab:tab}});assert.match(html,/PROMOCIONES DEL CREADOR/);assert.doesNotMatch(html,/data-ut="[^"]*-gift"|RECLAMAR GRATIS|400.000|REGALO YA RECLAMADO/);}
});
