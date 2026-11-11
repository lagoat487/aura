'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),E=require('../live-events-99'),Device=require('../admin-device-client-99');
const clone=x=>JSON.parse(JSON.stringify(x)),flush=()=>new Promise(r=>setImmediate(r));
function fixture(owner=true){
 const html=fs.readFileSync(path.join(__dirname,'../admin-panel-99-template.html'),'utf8'),nodes=new Map([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],{value:'',innerHTML:'',textContent:'',disabled:false,hidden:m[1]==='admin-controls',listeners:{},classList:{toggle(){}},addEventListener(type,fn){this.listeners[type]=fn;}}]));
 let feed={version:1,revision:1,event:{id:'fixture-event',title:'ADMIN ABUSE',startsAt:'2026-11-11T16:00:00.000Z',endsAt:null,cancelled:false},announcements:[],gifts:[]},sha='initial',writes=0;
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
