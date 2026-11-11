'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),E=require('../live-events-99'),Device=require('../admin-device-client-99');
const clone=x=>JSON.parse(JSON.stringify(x)),flush=()=>new Promise(r=>setImmediate(r));
function fixture(owner=true,setup=()=>{}){
 const html=fs.readFileSync(path.join(__dirname,'../admin-panel-99-template.html'),'utf8'),nodes=new Map([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],{value:'',innerHTML:'',textContent:'',disabled:false,hidden:m[1]==='admin-controls',listeners:{},classList:{toggle(){}},addEventListener(type,fn){this.listeners[type]=fn;}}]));
 let feed={version:1,revision:1,event:{id:'fixture-event',title:'ADMIN ABUSE',startsAt:'2026-11-11T16:00:00.000Z',endsAt:null,cancelled:false},announcements:[],gifts:[]},sha='initial',writes=0;
 setup(feed);
 const fetch=async(url,options)=>{
  if(url.endsWith('/login')){const data=JSON.parse(options.body);return {ok:owner&&data.pin==='42',json:async()=>owner&&data.pin==='42'?{ok:true}:{error:data.pin!=='42'?'Código incorrecto.':'Este navegador necesita tu enlace privado de activación.'}};}
  if(url.endsWith('/logout'))return {ok:true,json:async()=>({ok:true})};
  if(options.method==='POST'){assert.equal(JSON.parse(options.body).baseRevision,feed.revision);feed=JSON.parse(JSON.stringify(JSON.parse(options.body).feed));writes++;sha=String(feed.revision);return {ok:true,json:async()=>({feed:clone(feed),sha})};}
  return {ok:true,json:async()=>({feed:clone(feed),sha:String(feed.revision)})};
 };
 const player={id:'gift-player',name:'Gift Player',pos:'ED',real:true,overall:93,club:'c'};
 const context=vm.createContext({AuraLiveEvents:E,AuraAdminDevice:Device,URLSearchParams,AuraRosterSync:{pool:()=>[player]},AuraWorld:{load:async()=>{}},AuraClubs:{clubs:[]},AuraCompetitions:{definitions:[]},crypto:require('node:crypto').webcrypto,setTimeout:()=>0,clearTimeout(){},document:{getElementById:id=>nodes.get(id),querySelectorAll:()=>[...nodes.values()]},window:{fetch,location:{hash:'',pathname:'/admin.html'},history:{replaceState(){}},addEventListener(){}}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../admin-panel-99.js'),'utf8'),context);
 const trigger=async(id,event='click',extra={})=>{await nodes.get(id).listeners[event]({preventDefault(){},...extra});await flush();};
 const login=async()=>{nodes.get('admin-pin').value='42';await trigger('pin-form','submit');};
 return {nodes,trigger,login,feed:()=>clone(feed),writes:()=>writes};
}
test('code 42 reveals controls only for the authorized owner device, and clears the input',async()=>{
 const f=fixture(false);await f.login();assert.equal(f.nodes.get('admin-controls').hidden,true);assert.equal(f.nodes.get('admin-pin').value,'');assert.match(f.nodes.get('status').textContent,/enlace privado/);assert.equal(f.writes(),0);
});
test('the admin can publish Now with an upcoming, ended, cancelled or missing event',async()=>{
 for(const mode of ['upcoming','ended','cancelled','none']){
  const f=fixture(true,feed=>{if(mode==='none')feed.event=null;else if(mode==='cancelled')feed.event.cancelled=true;else if(mode==='upcoming')feed.event.startsAt=new Date(Date.now()+3600000).toISOString();else{feed.event.startsAt=new Date(Date.now()-7200000).toISOString();feed.event.endsAt=new Date(Date.now()-3600000).toISOString();}});
  const eventBefore=f.feed().event;await f.login();assert.equal(f.nodes.get('message-when').value,'now',mode);f.nodes.get('announcement').value='Aviso global '+mode;
  await f.trigger('message-form','submit');assert.equal(f.writes(),1,mode);const message=f.feed().announcements[0];assert.equal(message.eventId,'global');assert.equal(message.endsAt,null);assert.deepEqual(f.feed().event,eventBefore,'posting a notice never starts or changes an event');assert.equal(E.announcements(f.feed()).length,1);assert.match(f.nodes.get('published-items').innerHTML,/AVISO GLOBAL/);
 }
});
test('new events preserve global notices; scheduling at event start still requires an event',async()=>{
 const f=fixture(true,feed=>{feed.event=null;});await f.login();f.nodes.get('announcement').value='Global';f.nodes.get('message-when').value='start';await f.trigger('message-form','submit');assert.equal(f.writes(),0);assert.match(f.nodes.get('status').textContent,/Programa o inicia/);
 f.nodes.get('message-when').value='now';await f.trigger('message-form','submit');const id=f.feed().announcements[0].id;await f.trigger('start-now');assert.equal(f.feed().announcements[0].id,id);await f.trigger('stop-event');await f.trigger('start-now');assert.equal(f.feed().announcements[0].id,id);assert.equal(E.announcements(f.feed())[0].eventId,'global');
});
test('Now gifts are immediate and remain published across events without starting the scheduled event',async()=>{
 const f=fixture(true,feed=>{feed.event.startsAt=new Date(Date.now()+3600000).toISOString();});await f.login();const before=f.feed().event;assert.equal(f.nodes.get('gift-when').value,'now');await f.trigger('player-results','click',{target:{closest:()=>({dataset:{player:'gift-player'}})}});await f.trigger('gift-form','submit');
 assert.equal(f.writes(),1);assert.equal(f.feed().gifts[0].eventId,'global');assert.deepEqual(f.feed().event,before);assert.equal(E.gifts(f.feed(),null).length,1);const id=f.feed().gifts[0].id;await f.trigger('stop-event');await f.trigger('start-now');assert.equal(f.feed().gifts[0].id,id);
});
test('Deliver now unlocks a previously scheduled gift while retaining the original gift and event IDs',async()=>{
 const f=fixture(true,feed=>{feed.event.startsAt=new Date(Date.now()+3600000).toISOString();feed.gifts.push({id:'scheduled-gift',eventId:feed.event.id,playerId:'gift-player',startsAt:feed.event.startsAt,endsAt:null});});await f.login();const before=f.feed();assert.match(f.nodes.get('published-items').innerHTML,/Entregar ahora/);assert.equal(E.gifts(f.feed(),null).length,0);
 await f.trigger('published-items','click',{target:{closest:selector=>selector==='[data-release]'?{dataset:{release:'scheduled-gift'}}:null}});const after=f.feed();assert.equal(after.gifts[0].id,before.gifts[0].id);assert.equal(after.gifts[0].eventId,before.gifts[0].eventId);assert.equal(after.gifts[0].scope,'global');assert.deepEqual(after.event,before.event);assert.equal(E.gifts(after,null).length,1);
 f.nodes.get('event-name').value='Mismo evento';f.nodes.get('event-start').value='2026-11-11T12:00';f.nodes.get('event-end').value='2026-11-11T13:00';await f.trigger('schedule-form','submit');assert.equal(f.feed().gifts[0].startsAt,after.gifts[0].startsAt);assert.equal(f.feed().gifts[0].endsAt,null,'changing the event schedule cannot close an already released gift');
});
test('creator selects a player and publishes a scheduled gift and text notice through the authenticated UI',async()=>{
 const f=fixture();await f.login();assert.equal(f.nodes.get('admin-controls').hidden,false);assert.equal(f.nodes.get('admin-pin').value,'');assert.equal(f.nodes.get('event-start').value,'2026-11-11T11:00');
 await f.trigger('player-results','click',{target:{closest:()=>({dataset:{player:'gift-player'}})}});assert.match(f.nodes.get('selected-gift').innerHTML,/Gift Player/);assert.equal(f.nodes.get('publish-gift').disabled,false);
 f.nodes.get('gift-when').value='start';await f.trigger('gift-form','submit');assert.equal(f.feed().gifts[0].playerId,'gift-player');assert.equal(f.feed().gifts[0].startsAt,'2026-11-11T16:00:00.000Z');
 f.nodes.get('announcement').value='¡Hola equipo! <img src=x onerror=alert(1)>';f.nodes.get('message-when').value='start';await f.trigger('message-form','submit');assert.equal(f.feed().announcements[0].text,'¡Hola equipo! <img src=x onerror=alert(1)>');assert.match(f.nodes.get('published-items').innerHTML,/&lt;img/);assert.doesNotMatch(f.nodes.get('published-items').innerHTML,/<img/);assert.equal(f.writes(),2);
 await f.trigger('disconnect');assert.equal(f.nodes.get('admin-controls').hidden,true);assert.equal(f.nodes.get('pin-panel').hidden,false);
});
test('rescheduling moves anchored gifts; stopping closes the event; a new event has a fresh catalog of gifts',async()=>{
 const f=fixture();await f.login();await f.trigger('player-results','click',{target:{closest:()=>({dataset:{player:'gift-player'}})}});f.nodes.get('gift-when').value='start';await f.trigger('gift-form','submit');
 f.nodes.get('event-name').value='ADMIN ABUSE';f.nodes.get('event-start').value='2026-11-11T12:00';f.nodes.get('event-end').value='2026-11-11T13:00';await f.trigger('schedule-form','submit');assert.equal(f.feed().event.startsAt,'2026-11-11T17:00:00.000Z');assert.equal(f.feed().gifts[0].startsAt,f.feed().event.startsAt);assert.equal(f.feed().gifts[0].endsAt,f.feed().event.endsAt);
 await f.trigger('stop-event');assert.equal(f.feed().event.cancelled,true);const old=f.feed().event.id;await f.trigger('start-now');assert.notEqual(f.feed().event.id,old);assert.deepEqual(f.feed().gifts,[]);assert.equal(E.status(f.feed()),'live');
});

test('manual admin commands publish bounded shared effects at any hour',async()=>{
 const f=fixture(true,feed=>{feed.event=null;});await f.login();
 for(const [command,field,duration] of [['/monedas infinitas 1m','coinBoost',60000],['/tiki tiki','musicCue',900000],['/fuegos','fireworksCue',60000]]){
  f.nodes.get('admin-command').value=command;await f.trigger('command-form','submit');const cue=f.feed()[field];assert.ok(cue,command);assert.equal(Date.parse(cue.endsAt)-Date.parse(cue.startsAt),duration);assert.ok(E.validate(f.feed()),command);assert.equal(f.feed().event,null);
 }
 assert.equal(f.writes(),3);f.nodes.get('admin-command').value='/invalid';await f.trigger('command-form','submit');assert.equal(f.writes(),3);
});
