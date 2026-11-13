'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const U=require('../ultimate-team'),Save=require('../ultimate-save'),Squad=require('../squad'),Manage=require('../club-management-99'),P=require('../creator-promotions-99'),Jose=require('../jose-jose-special-99'),Autogoles=require('../autogoles-special-99');
Jose.install(P);Autogoles.install(P);
function fixture(){const positions=['POR','LI','DFC','DFC','LD','MCD','MC','MC','EI','DC','ED','POR','LI','DFC','LD','MC','DC','ED','EI','MC','MCD','MCO','DFC'],pool=positions.map((pos,i)=>({id:'player:'+i,name:'Player '+i,pos,overall:76,real:true,club:'test'})),club=U.create(pool),session={version:2,club,tab:'club',matchToken:12},map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};assert.equal(Save.save(storage,session),true);return {pool,club,session,storage,map};}
function current(f){return Save.load(f.storage).snapshot;}
test('any owned edition can be discarded for zero coins, including intransferibles and the two custom cards',()=>{
 for(const special of [null,Jose,Autogoles]){const f=fixture();let player=f.club.owned.at(-1);if(special){player=P.card(special.promotion,special.promotion.cards[0],[]);f.club.owned.push(player);Save.save(f.storage,f.session);}const before=structuredClone(f.club),r=Manage.discard(f.storage,f.session,player.id);assert.equal(r.ok,true);assert.equal(r.cost,0);assert.equal(r.club.coins,before.coins);assert.ok(!r.club.owned.some(p=>p.id===player.id));assert.deepEqual(f.club,before);assert.equal(current(f).club.discardUndo.card.id,player.id);assert.equal(r.club.purchases,before.purchases);}
});
test('discarding a starter fills its slot without another edition of a remaining starter',()=>{
 const f=fixture(),id=f.club.xi[2],other=f.club.owned.find(p=>p.id===f.club.xi[3]);f.club.owned.push({...other,id:'edition:other',originalId:other.id,overall:99});Save.save(f.storage,f.session);
 const r=Manage.discard(f.storage,f.session,id);assert.equal(r.ok,true);assert.notEqual(r.club.xi[2],id);assert.notEqual(r.club.xi[2],'edition:other');assert.deepEqual(r.club.xi.filter((_,i)=>i!==2),f.club.xi.filter((_,i)=>i!==2));
 const people=r.club.xi.filter(Boolean).map(id=>{const p=r.club.owned.find(p=>p.id===id);return p.originalId||p.id;});assert.equal(new Set(people).size,11);assert.ok(Save.normalize(current(f)));
});
test('every card can be removed down to zero while empty slots, formations, chemistry and saves remain valid',()=>{
 const f=fixture();for(const p of f.club.owned){const r=Manage.discard(f.storage,current(f),p.id);assert.equal(r.ok,true);}
 const s=current(f);assert.equal(s.club.owned.length,0);assert.deepEqual(s.club.xi,Array(11).fill(null));assert.equal(s.club.coins,f.club.coins);assert.equal(U.rating(s.club),0);assert.equal(U.chemistry(s.club).total,0);assert.doesNotThrow(()=>U.auto(s.club));assert.equal(U.setFormation(s.club,'4-4-2'),true);assert.equal(Save.save(f.storage,s),true);assert.deepEqual(Save.importData(Save.exportData(current(f))).club,current(f).club);
});
test('discard targets one duplicate UID and does not remove its owned or other duplicate copies',()=>{
 const f=fixture(),base=f.club.owned[0];f.club.duplicates=[{...base,uid:'dup:a',duplicate:true},{...base,uid:'dup:b',duplicate:true}];f.club.lastPack=[base,...f.club.duplicates];Save.save(f.storage,f.session);
 const r=Manage.discard(f.storage,f.session,'dup:a',true);assert.equal(r.ok,true);assert.ok(r.club.owned.some(p=>p.id===base.id));assert.deepEqual(r.club.duplicates.map(p=>p.uid),['dup:b']);assert.ok(r.club.lastPack.some(p=>p.id===base.id&&!p.duplicate));assert.ok(!r.club.lastPack.some(p=>p.uid==='dup:a'));
 const restored=Manage.undo(f.storage,current(f));assert.equal(restored.ok,true);assert.equal(restored.club.duplicates.length,2);assert.equal(new Set(restored.club.duplicates.map(p=>p.uid)).size,2);assert.equal(restored.club.coins,f.club.coins);assert.ok(Manage.undo(f.storage,current(f)).error);
});
test('undo survives reload and restores the exact edition; a newly owned copy receives the recovery as a duplicate',()=>{
 const f=fixture(),card=f.club.owned.at(-1);Manage.discard(f.storage,f.session,card.id);let saved=current(f);saved.club.owned.push({...card});Save.save(f.storage,saved);const r=Manage.undo(f.storage,current(f));assert.equal(r.ok,true);assert.equal(r.duplicate,true);assert.equal(r.club.owned.filter(p=>p.id===card.id).length,1);assert.equal(r.club.duplicates[0].id,card.id);assert.ok(Save.normalize(current(f)));
});
test('stale tabs, unknown identities and failed storage never partially discard or recover cards',()=>{
 const f=fixture(),raw=f.storage.getItem(Save.KEY),id=f.club.owned.at(-1).id;assert.ok(Manage.discard(f.storage,f.session,'unknown').error);assert.equal(f.storage.getItem(Save.KEY),raw);
 const blocked={...f.storage,setItem(){throw Error('quota');}};assert.ok(Manage.discard(blocked,f.session,id).error);assert.equal(f.storage.getItem(Save.KEY),raw);assert.equal(f.club.discardUndo,undefined);
 const next=structuredClone(f.session);next.club.coins++;Save.save(f.storage,next);const latest=f.storage.getItem(Save.KEY);assert.ok(Manage.discard(f.storage,f.session,id).error);assert.equal(f.storage.getItem(Save.KEY),latest);
 Manage.discard(f.storage,current(f),id);const after=f.storage.getItem(Save.KEY);assert.ok(Manage.undo(blocked,current(f)).error);assert.equal(f.storage.getItem(Save.KEY),after);
});
function boot(f){let modal=null,html='',closed=0;const notices=[],context=vm.createContext({AuraUT:U,AuraUTSave:Save,AuraSquad:Squad,AuraPortraits:require('../portraits'),AuraClubManagement:Manage,AuraEvolution:{pool:()=>f.pool,badge:()=>''},AuraCurrentEvents:require('../current-events'),World:{getStats:()=>({players:f.pool.length})},Competitions:{definitions:[]},clubs:[],localStorage:f.storage,document:{getElementById:()=>null},openModal:(title,body)=>modal={title,body},closeModal:()=>closed++,notify:s=>notices.push(s),goToModes(){}});vm.runInContext(fs.readFileSync(path.join(__dirname,'../ultimate-ui-99-cleanstart.js'),'utf8')+';globalThis.UI=AuraUTUI',context);context.UI.bindRender(()=>html=context.UI.render());return {UI:context.UI,click:dataset=>context.UI.handleClick({dataset}),modal:()=>modal,html:()=>html,notices,closed:()=>closed};}
test('the visible flow confirms a named intransferible, cancels safely and recovers a deletion after reload',()=>{
 const f=fixture(),app=boot(f),id=f.club.owned.at(-1).id,before=f.storage.getItem(Save.KEY);app.click({ut:'inspect',player:id});assert.match(app.modal().body,/Borrar gratis/);app.click({ut:'discard',player:id});assert.match(app.modal().title,/BORRAR CARTA/);assert.match(app.modal().body,/Player /);assert.match(app.modal().body,/Sí, borrar gratis/);assert.equal(f.storage.getItem(Save.KEY),before);app.click({ut:'discard-cancel'});assert.equal(f.storage.getItem(Save.KEY),before);
 app.click({ut:'discard',player:id});app.click({ut:'discard-confirm'});assert.ok(!app.UI.getClub().owned.some(p=>p.id===id));assert.equal(app.UI.getClub().coins,f.club.coins);assert.match(app.html(),/Recuperar gratis/);const reloaded=boot(f);reloaded.click({ut:'discard-undo'});assert.ok(reloaded.UI.getClub().owned.some(p=>p.id===id));assert.equal(reloaded.UI.getClub().coins,f.club.coins);assert.match(reloaded.notices.at(-1),/recuperado gratis/);
});
test('an empty reset club can render eleven vacancies and cannot start a match before filling them',()=>{
 const f=fixture();f.club.owned=[];f.club.xi=Array(11).fill(null);Save.save(f.storage,f.session);const app=boot(f);app.click({utTab:'squad'});assert.equal((app.html().match(/PUESTO VACÍO/g)||[]).length,11);app.click({ut:'play',opponent:'madrid'});assert.match(app.notices.at(-1),/11 puestos/);assert.equal(Save.load(f.storage).snapshot.matchToken,12);
});
