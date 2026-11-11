'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../live-events-99'),U=require('../ultimate-team'),Save=require('../ultimate-save'),Squad=require('../squad');
const now=Date.parse('2026-11-11T16:00:00Z'),start='2026-11-11T16:00:00.000Z',end='2026-11-11T17:00:00.000Z';
function feed(){return {version:1,revision:1,event:{id:'event-1',title:'ADMIN ABUSE',startsAt:start,endsAt:end,cancelled:false},announcements:[{id:'message-1',eventId:'event-1',text:'Hola <b>equipo</b> 👋',startsAt:start,endsAt:end}],gifts:[{id:'gift-1',eventId:'event-1',playerId:'gift-player',startsAt:start,endsAt:end}]};}
function fixture(){
 const pool=Array.from({length:23},(_,i)=>({id:'p'+i,name:'Player '+i,pos:Squad.formations['4-3-3'][i%11][0],real:true,overall:76,club:'c'}));
 const club=U.create(pool),session={version:2,club,tab:'squad',matchToken:19},map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 Save.save(storage,session);return {pool,club,session,storage,map};
}
const player={id:'gift-player',name:'Gift Player',pos:'ED',real:true,overall:93,club:'c',originalId:'base-player'};
test('11 AM Ecuador starts the scheduled event exactly; cancellation and end close all gifts and notices',()=>{
 const f=feed();assert.equal(E.status(f,now-1),'upcoming');assert.equal(E.status(f,now),'live');assert.equal(E.gifts(f,null,now-1).length,0);assert.equal(E.announcements(f,now-1).length,0);
 assert.equal(E.gifts(f,null,now).length,1);assert.equal(E.announcements(f,now).length,1);assert.equal(E.status(f,Date.parse(end)),'ended');assert.equal(E.gifts(f,null,Date.parse(end)).length,0);
 f.event.cancelled=true;assert.equal(E.status(f,now),'cancelled');assert.equal(E.gifts(f,null,now).length,0);
 const published=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/admin-live-99.json')));assert.ok(E.validate(published),'the creator can change the schedule and gifts without invalidating the build');
});
test('feed rejects malformed, oversized or duplicate entries; messages stay text and arbitrary card payloads are discarded',()=>{
 const f=feed();assert.equal(E.validate(f).announcements[0].text,'Hola <b>equipo</b> 👋');f.gifts[0].player={overall:99,name:'Injected'};assert.equal(E.validate(f).gifts[0].player,undefined);
 for(const mutate of [x=>x.event.startsAt='oops',x=>x.event.endsAt=start,x=>x.announcements[0].text='x'.repeat(281),x=>x.gifts.push({...x.gifts[0]}),x=>x.revision=NaN,x=>x.gifts[0].id='unsafe/../id']){const copy=feed();mutate(copy);assert.equal(E.validate(copy),null);}
});
test('a gift saves the exact existing player, identity, receipt, XI and progress; reload/import cannot claim it twice',()=>{
 const f=fixture(),before=structuredClone(f.club),r=E.claim(f.storage,f.session,feed(),'gift-1',[player],now);assert.equal(r.ok,true);assert.equal(r.player.tradeable,false);assert.equal(r.player.originalId,'base-player');assert.deepEqual(r.club.xi,before.xi);assert.equal(r.club.coins,before.coins);assert.equal(r.club.played,before.played);assert.deepEqual(f.club,before,'live state swaps only after a successful save');
 const saved=Save.load(f.storage).snapshot;assert.equal(saved.club.owned.length,before.owned.length+1);assert.equal(saved.tab,'squad');assert.equal(saved.matchToken,19);assert.deepEqual(saved.club.adminGiftReceipts,['event-1:gift-1']);
 assert.ok(E.claim(f.storage,saved,feed(),'gift-1',[player],now).error);const imported=Save.importData(Save.exportData(saved));assert.deepEqual(imported.club.adminGiftReceipts,saved.club.adminGiftReceipts);assert.equal(E.gifts(feed(),imported.club,now)[0].claimed,true);
});
test('repeated footballers go to duplicates and cannot replace or erase an owned edition',()=>{
 const f=fixture(),existing=f.club.owned[0],g=feed();g.gifts[0].playerId=existing.id;const r=E.claim(f.storage,f.session,g,'gift-1',[{...existing,overall:99}],now);
 assert.equal(r.ok,true);assert.equal(r.duplicate,true);assert.equal(r.club.owned[0].overall,76);assert.equal(r.club.duplicates[0].overall,99);assert.equal(r.club.duplicates[0].uid,'duplicate:1');assert.equal(r.club.duplicates[0].tradeable,false);assert.equal(r.club.xi[0],f.club.xi[0]);
});
test('failed writes, stale clubs, missing cards and unavailable event windows never partially grant a gift',()=>{
 for(const kind of ['storage','stale','early','late','missing','champions']){const f=fixture(),before=f.storage.getItem(Save.KEY);let stamp=now,cards=[player];
  if(kind==='storage')f.storage.setItem=()=>{throw Error('full');};if(kind==='stale')f.club.coins++;if(kind==='early')stamp--;if(kind==='late')stamp=Date.parse(end);if(kind==='missing')cards=[];if(kind==='champions')cards=[{...player,event:'champions'}];
  const r=E.claim(f.storage,f.session,feed(),'gift-1',cards,stamp);assert.ok(r.error,kind);assert.equal(f.storage.getItem(Save.KEY),before,kind);assert.equal(f.club.owned.length,23,kind);assert.equal(f.club.adminGiftReceipts,undefined);
 }
});
test('different clubs can each claim once; receipt ID cannot be reused across event editions',()=>{
 const a=fixture(),b=fixture();assert.equal(E.claim(a.storage,a.session,feed(),'gift-1',[player],now).ok,true);assert.equal(E.claim(b.storage,b.session,feed(),'gift-1',[player],now).ok,true);
 const next=feed();next.event.id='event-2';next.gifts[0].eventId='event-2';const saved=Save.load(a.storage).snapshot;assert.equal(E.claim(a.storage,saved,next,'gift-1',[player],now).ok,true);assert.equal(Save.load(a.storage).snapshot.club.adminGiftReceipts.length,2);
});
test('publisher verifies the exact GitHub owner and repository write authority; a local flag grants no publishing access',async()=>{
 for(const identity of [{id:123,login:'someone'},{id:E.OWNER_ID,login:'lagoat487'}]){
  const writable=identity.id!==E.OWNER_ID,requests=[];const p=E.publisher(async(url,opts)=>{requests.push({url,opts});return {ok:true,json:async()=>url.endsWith('/user')?identity:{full_name:E.REPO,owner:{id:E.OWNER_ID},permissions:{push:writable}}};});
  await assert.rejects(p.connect('private-test-credential'),/Solo la cuenta/);assert.equal(p.isConnected(),false);await assert.rejects(p.publish('sha',()=>{}),/Conecta/);assert.equal(requests.length,2);assert.equal(requests.every(r=>r.url.startsWith('https://api.github.com/')),true);
 }
});
test('authorized publish handles UTF-8, revision, SHA leases, disconnect and uncertain write results without retry',async()=>{
 let sha='sha-1',state=feed(),puts=0;const requests=[];
 const p=E.publisher(async(url,opts)=>{
  requests.push({url,opts});if(url.endsWith('/user'))return {ok:true,json:async()=>({id:E.OWNER_ID,login:'lagoat487'})};if(url.endsWith('/aura'))return {ok:true,json:async()=>({full_name:E.REPO,owner:{id:E.OWNER_ID},permissions:{push:true}})};
  if(opts.method==='PUT'){puts++;const body=JSON.parse(opts.body);assert.equal(body.sha,sha);state=JSON.parse(Buffer.from(body.content,'base64').toString('utf8'));sha='sha-'+(puts+1);return {ok:true,json:async()=>({content:{sha}})};}
  return {ok:true,json:async()=>({sha,encoding:'base64',size:100,content:Buffer.from(JSON.stringify(state)).toString('base64')})};
 });
 await p.connect('private-test-credential');const initial=await p.read();const result=await p.publish(initial.sha,f=>{f.announcements[0].text='¡Regalo de fútbol! 🇪🇨';});assert.equal(result.feed.revision,2);assert.equal(state.announcements[0].text,'¡Regalo de fútbol! 🇪🇨');assert.equal(puts,1);
 await assert.rejects(p.publish(initial.sha,()=>{}),/Otra publicación/);assert.equal(puts,1);p.disconnect();await assert.rejects(p.read(),/Conecta/);assert.equal(p.isConnected(),false);
 for(const {url,opts} of requests){assert.ok(!url.includes('private-test-credential'));assert.equal(opts.credentials,'omit');assert.equal(opts.redirect,'error');}
});
test('conflict and write errors remain failures; no automatic replay or credential persistence',async()=>{
 let writes=0;const p=E.publisher(async(url,opts)=>{if(url.endsWith('/user'))return {ok:true,json:async()=>({id:E.OWNER_ID})};if(url.endsWith('/aura'))return {ok:true,json:async()=>({full_name:E.REPO,owner:{id:E.OWNER_ID},permissions:{push:true}})};if(opts.method==='PUT'){writes++;return {ok:false,status:409};}return {ok:true,json:async()=>({sha:'s',encoding:'base64',size:100,content:Buffer.from(JSON.stringify(feed())).toString('base64')})};});
 await p.connect('private-test-credential');await assert.rejects(p.publish('s',()=>{}),/Otra publicación/);assert.equal(writes,1);
 const admin=fs.readFileSync(path.join(__dirname,'../admin-panel-99.js'),'utf8');assert.doesNotMatch(admin,/localStorage|sessionStorage|console\.log|location\.search/);assert.match(admin,/\$\('admin-pin'\)\.value=''/);
 const ui=fs.readFileSync(path.join(__dirname,'../live-events-ui-99.js'),'utf8');assert.match(ui,/message\.textContent=a\.text/);assert.doesNotMatch(ui,/Authorization|owner-token/);
});
