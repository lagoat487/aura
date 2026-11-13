'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const U=require('../ultimate-team'),Save=require('../ultimate-save'),Squad=require('../squad'),Admin=require('../admin-local');
const forms=new Set(Object.keys(Squad.formations));
function fixture(){
 const pool=Array.from({length:23},(_,i)=>({id:'p'+i,name:'Player '+i,pos:Squad.formations['4-3-3'][i%11][0],real:true,overall:76,club:'c'}));
 const club=U.create(pool),session={version:2,club,tab:'backup',matchToken:9},map=new Map();
 const storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};Save.save(storage,session,forms);
 return {club,session,storage,map};
}
function checked(){
 // A synthetic digest exercises valid-code flows without publishing the private code.
 const context=vm.createContext({AuraUT:U,AuraUTSave:Save,TextEncoder,Uint8Array,crypto:{subtle:{digest:async(_type,bytes)=>Uint8Array.from(Buffer.from(new TextDecoder().decode(bytes)==='VALID-ADMIN-FIXTURE'?Admin.grantId:'0'.repeat(64),'hex')).buffer}}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../admin-local.js'),'utf8'),context);return context.AuraAdminLocal;
}
test('private unlimited coins rejects invalid codes without changing coins, saved data or inventory',async()=>{
 const f=fixture(),before=structuredClone(f.club),raw=f.storage.getItem(Save.KEY);
 const result=await Admin.redeem(f.storage,f.session,'not-a-private-code',forms);
 assert.ok(result.error);assert.deepEqual(f.club,before);assert.equal(f.storage.getItem(Save.KEY),raw);assert.equal(f.storage.getItem(Admin.receiptKey),null);
});
test('private unlimited coins enables unlimited spending only to the current local club and survives reload, without changing cards or XI',async()=>{
 const api=checked(),f=fixture(),other=fixture(),before=structuredClone(f.club),otherBefore=other.storage.getItem(Save.KEY);
 const result=await api.redeem(f.storage,f.session,'valid-admin-fixture',forms);assert.equal(result.ok,true);
 assert.equal(U.hasUnlimited(result.club),true);const saved=Save.load(f.storage,forms).snapshot.club;assert.equal(U.hasUnlimited(saved),false);assert.equal(api.restore(f.storage,saved),true);assert.equal(saved.coins,before.coins);
 assert.deepEqual(saved.owned,before.owned);assert.deepEqual(saved.xi,before.xi);assert.deepEqual(saved.duplicates,before.duplicates);
 assert.deepEqual(f.club,before,'the live club changes only when its controller accepts the saved result');assert.equal(other.storage.getItem(Save.KEY),otherBefore);
 const again=await api.redeem(f.storage,{...f.session,club:saved},'valid-admin-fixture',forms);assert.equal(again.already,true);assert.equal(Save.load(f.storage,forms).snapshot.club.coins,saved.coins);
 const replacement=fixture().session;assert.ok((await api.redeem(f.storage,replacement,'valid-admin-fixture',forms)).error,'one browser cannot credit a second club with the same code');
});
test('double clicks, changed clubs, excessive balances and storage failures cannot duplicate or partially apply credits',async()=>{
 const api=checked(),f=fixture(),before=structuredClone(f.club);
 const pair=await Promise.all([api.redeem(f.storage,f.session,'valid-admin-fixture',forms),api.redeem(f.storage,f.session,'valid-admin-fixture',forms)]);
 assert.equal(pair.filter(r=>r.ok).length,1);assert.equal(Save.load(f.storage,forms).snapshot.club.coins,before.coins);
 const changed=fixture();assert.ok((await api.redeem(changed.storage,changed.session,'valid-admin-fixture',forms,()=>false)).error);assert.equal(changed.storage.getItem(Admin.receiptKey),null);
 const full=fixture();full.club.coins=Infinity;assert.ok((await api.redeem(full.storage,full.session,'valid-admin-fixture',forms)).error);assert.equal(full.storage.getItem(Admin.receiptKey),null);
 const fail=fixture(),old=fail.storage.getItem(Save.KEY),set=fail.storage.setItem;fail.storage.setItem=(key,value)=>{if(key===Save.KEY)throw Error('full');set(key,value);};
 assert.ok((await api.redeem(fail.storage,fail.session,'valid-admin-fixture',forms)).error);assert.equal(fail.storage.getItem(Save.KEY),old);assert.equal(fail.storage.getItem(Admin.receiptKey),null);
});

test('the private-code UI activates unlimited coins, clears its input and shows the new balance after reload',async()=>{
 const f=fixture(),before=structuredClone(f.club),field={value:'valid-admin-fixture'},notices=[];
 const context=vm.createContext({AuraUT:U,AuraUTSave:Save,AuraSquad:Squad,AuraAdminLocal:checked(),AuraPortraits:require('../portraits'),
  AuraEvolution:{pool:()=>f.club.owned,badge:()=>''},AuraCurrentEvents:require('../current-events'),World:{getStats:()=>({players:23})},Competitions:{definitions:[]},clubs:[],
  localStorage:f.storage,document:{getElementById:id=>id==='ut-admin-code'?field:null},notify:message=>notices.push(message),closeModal(){},openModal(){},goToModes(){}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../ultimate-ui-66.js'),'utf8')+';globalThis.UI=AuraUTUI',context);
 context.UI.bindRender(()=>{});assert.match(context.UI.render(),/data-ut="admin-local-credit"/);
 context.UI.handleClick({dataset:{ut:'admin-local-credit'}});context.UI.handleClick({dataset:{ut:'admin-local-credit'}});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(context.UI.getClub().coins,before.coins);assert.equal(field.value,'');assert.equal(U.hasUnlimited(context.UI.getClub()),true);assert.match(context.UI.render(),/Monedas ilimitadas">∞/);assert.equal(notices.filter(s=>s.includes('ilimitadas')).length,1);
 assert.deepEqual(structuredClone(context.UI.getClub().owned),before.owned);assert.deepEqual(Save.load(f.storage,forms).snapshot.club.coins,before.coins);
 field.value='valid-admin-fixture';context.UI.handleClick({dataset:{ut:'admin-local-credit'}});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(context.UI.getClub().coins,before.coins);
});

test('the visible header and home buttons open a focused private-code dialog and redeem its own field',async()=>{
 const f=fixture(),before=structuredClone(f.club),backup={value:'wrong-backup-code'},modal={value:'valid-admin-fixture',focus(){this.focused=true;}},notices=[],dialogs=[];
 let closed=0;f.session.tab='home';Save.save(f.storage,f.session,forms);
 const context=vm.createContext({AuraUT:U,AuraUTSave:Save,AuraSquad:Squad,AuraAdminLocal:checked(),AuraPortraits:require('../portraits'),
  AuraEvolution:{pool:()=>f.club.owned,badge:()=>''},AuraCurrentEvents:require('../current-events'),World:{getStats:()=>({players:23})},Competitions:{definitions:[]},clubs:[],
  localStorage:f.storage,document:{getElementById:id=>id==='ut-admin-modal-code'?modal:id==='ut-admin-code'?backup:null},notify:message=>notices.push(message),
  openModal:(title,body)=>dialogs.push({title,body}),closeModal:()=>closed++,goToModes(){}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../ultimate-ui-66.js'),'utf8')+';globalThis.UI=AuraUTUI',context);context.UI.bindRender(()=>{});
 const html=context.UI.render();assert.equal((html.match(/data-ut="admin-local-open"/g)||[]).length,2);assert.ok(html.indexOf('ut-admin-banner')<html.indexOf('ut-current-events-promo'));
 context.UI.handleClick({dataset:{ut:'admin-local-open'}});assert.equal(dialogs.length,1);assert.match(dialogs[0].body,/id="ut-admin-modal-code"/);assert.doesNotMatch(dialogs[0].body,/id="ut-admin-code"/);assert.equal(modal.focused,true);
 context.UI.handleClick({dataset:{ut:'admin-local-credit',adminInput:'ut-admin-modal-code'}});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(context.UI.getClub().coins,before.coins);assert.equal(modal.value,'');assert.equal(backup.value,'wrong-backup-code');assert.equal(closed,1);
 assert.deepEqual(Save.load(f.storage,forms).snapshot.club.owned,before.owned);assert.equal(notices.filter(s=>s.includes('ilimitadas')).length,1);
});

test('cached entrypoints can load the private-admin module on demand without duplicate script requests',async()=>{
 const f=fixture(),field={value:'valid-admin-fixture'},scripts=[],notices=[];
 const context=vm.createContext({AuraUT:U,AuraUTSave:Save,AuraSquad:Squad,Promise,AuraPortraits:require('../portraits'),
  AuraEvolution:{pool:()=>f.club.owned,badge:()=>''},World:{getStats:()=>({players:23})},Competitions:{definitions:[]},clubs:[],localStorage:f.storage,
  document:{getElementById:()=>field,createElement:()=>({}),head:{appendChild:script=>scripts.push(script)}},notify:message=>notices.push(message),closeModal(){},openModal(){},goToModes(){}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../ultimate-ui-66.js'),'utf8')+';globalThis.UI=AuraUTUI',context);context.UI.bindRender(()=>{});
 const before=context.UI.getClub().coins;context.UI.handleClick({dataset:{ut:'admin-local-credit'}});context.UI.handleClick({dataset:{ut:'admin-local-credit'}});
 assert.equal(scripts.length,1);assert.equal(scripts[0].src,'./admin-local-99-rewards.js');context.AuraAdminLocal=checked();scripts[0].onload();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(context.UI.getClub().coins,before);assert.equal(notices.filter(s=>s.includes('ilimitadas')).length,1);
});

test('both entries ship the private unlimited coins with identical tested UI copies and no plaintext redeem code',()=>{
 const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
 for(const alias of ['ultimate-ui-61.js','ultimate-ui-62.js','ultimate-ui-63.js','ultimate-ui-64.js','ultimate-ui-65.js','ultimate-ui-66.js'])assert.equal(read(alias),read('ultimate-ui.js'));
 for(const file of ['index.html','mobile.html']){
  const html=read(file);assert.ok(html.includes('./admin-local-99-rewards.js'));assert.ok(html.includes('./admin-local.css?v=local-2'));
  assert.ok(html.includes('./ultimate-ui-99-jose.js'));assert.ok(html.indexOf('admin-local-99-rewards.js')<html.indexOf('ultimate-ui-99-jose.js'));
 }
 assert.equal(read('admin-local-2.js'),read('admin-local.js'));
 assert.doesNotMatch(read('admin-local.js'),/AURA-(?:[A-F0-9]{4}-){4}[A-F0-9]{4}/);
});

test('previous 30M recipients upgrade locally without another code, while imported clubs stay finite elsewhere',()=>{
 const f=fixture();f.club.coins+=30000000;f.club.localAdminCredits=[Admin.grantId];f.storage.setItem(Admin.receiptKey,Admin.grantId);Save.save(f.storage,f.session,forms);
 const saved=Save.load(f.storage,forms).snapshot.club,other=fixture();assert.equal(Admin.restore(f.storage,saved),true);assert.equal(U.hasUnlimited(saved),true);
 const imported=Save.importData(Save.exportData({...f.session,club:saved},forms),forms).club;
 assert.equal(imported.coins,f.club.coins);assert.equal(Admin.restore(other.storage,imported),false);assert.equal(U.hasUnlimited(imported),false);
 const unrelated=fixture().club;assert.equal(Admin.restore(f.storage,unrelated),false);assert.equal(U.hasUnlimited(unrelated),false);
 f.storage.removeItem(Admin.receiptKey);assert.equal(Admin.restore(f.storage,saved),false);assert.equal(U.hasUnlimited(saved),false);
});

test('unlimited purchases, packs and evolutions work at zero balance and retain ownership, SBC and retired-event rules',async()=>{
 const f=fixture();f.club.coins=0;Save.save(f.storage,f.session,forms);const api=checked(),result=await api.redeem(f.storage,f.session,'valid-admin-fixture',forms),u=result.club,xi=[...u.xi];
 const messi=U.magiaCards([]).find(p=>p.id==='magia:messi');assert.equal(U.buy(u,messi).ok,true);assert.equal(u.coins,0);assert.ok(U.buy(u,messi).error);assert.deepEqual(u.xi,xi);
 assert.ok(U.buy(u,{...messi,overall:99}).error);assert.ok(U.buy(u,U.argentinaCards([])[0]).error);assert.ok(U.buy(u,U.sbcRewardCard('leyenda',[])).error);
 const candidates=[...u.owned,...Array.from({length:3},(_,i)=>({id:'pack-'+i,name:'Pack '+i,pos:'MC',real:true,overall:82,club:'c'}))];
 for(let i=0;i<20;i++)assert.equal(U.draw(u,candidates,'premium',()=>0).ok,true);assert.equal(u.coins,0);assert.equal(u.packsOpened,20);
 const starter=u.owned.find(p=>p.id==='p0');assert.equal(U.evolve(u,starter.id).ok,true);assert.equal(u.coins,0);assert.equal(starter.overall,78);assert.deepEqual(u.xi,xi);
 assert.ok(U.evolve(u,messi.id).error);assert.equal(Save.save(f.storage,{...f.session,club:u},forms),true);
 const reloaded=Save.load(f.storage,forms).snapshot.club;assert.equal(api.restore(f.storage,reloaded),true);assert.equal(U.canAfford(reloaded,3000000),true);assert.equal(reloaded.coins,0);
 const normal=fixture().club;normal.coins=0;assert.equal(U.canAfford(normal,1),false);assert.ok(U.buy(normal,messi).error);assert.ok(U.draw(normal,candidates,'premium',()=>0).error);assert.equal(normal.coins,0);
});

test('all four event screens enable affordable purchases only for the local unlimited club',async()=>{
 const f=fixture();f.club.coins=0;Save.save(f.storage,f.session,forms);const {club}=await checked().redeem(f.storage,f.session,'valid-admin-fixture',forms);
 for(const [file,global,action] of [['magia-event-65.js','AuraMagiaEvent','magia-buy'],['barcelona-event-65.js','AuraBarcelonaEvent','barcelona-buy'],['muralla-event-65.js','AuraMurallaEvent','muralla-buy'],['flashback-event-65.js','AuraFlashbackEvent','flashback-buy']]){
  const context=vm.createContext({AuraUT:U,AuraPortraits:require('../portraits')});vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8')+';globalThis.eventView='+global+'.view',context);
  const enabled=context.eventView(club,[]);assert.doesNotMatch(enabled,/MONEDAS INSUFICIENTES/);assert.ok(enabled.includes('data-ut="'+action+'"'));
  const normal=context.eventView(f.club,[]);assert.match(normal,/MONEDAS INSUFICIENTES/);
 }
});

test('code 88 adds exactly sixty million once and remains claimed after reload',async()=>{
 const f=fixture(),before=f.club.coins;
 const result=await Admin.redeem(f.storage,f.session,'88',forms);assert.equal(result.ok,true);assert.equal(result.coins,60000000);assert.equal(result.club.coins,before+60000000);assert.equal(U.hasUnlimited(result.club),false);
 const saved=Save.load(f.storage,forms).snapshot;assert.equal(saved.club.promoCode88Claimed,true);assert.equal(saved.club.coins,before+60000000);
 assert.ok((await Admin.redeem(f.storage,saved,'88',forms)).error);assert.equal(Save.load(f.storage,forms).snapshot.club.coins,before+60000000);
 const fail=fixture(),old=fail.storage.getItem(Save.KEY);fail.storage.setItem=()=>{throw Error('full');};assert.ok((await Admin.redeem(fail.storage,fail.session,'88',forms)).error);assert.equal(fail.storage.getItem(Save.KEY),old);assert.equal(fail.club.promoCode88Claimed,undefined);
});
