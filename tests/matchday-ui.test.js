'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Match=require('../match-engine'),Presentation=require('../match-presentation');
// Exercise the actual arena controller and frame loop; the renderer/DOM only
// supply the surfaces it uses. Real layout and input are checked in the browser.
function boot(){
 const nodes=new Map(),windowEvents={},docEvents={},raf=new Map();let now=0,nextRaf=0,commits=0,cancels=0,lastView=null;
 const classList={add(){},remove(){},toggle(){}};
 const context2d=new Proxy({},{get:()=>()=>{}});
 function node(id=''){
  if(id&&nodes.has(id))return nodes.get(id);
  const events={},children=new Map();const n={id,style:{},dataset:{},classList,hidden:false,tabIndex:0,
   addEventListener:(name,fn)=>{events[name]=fn;},removeEventListener(){},setPointerCapture(){},setAttribute(){},appendChild(){},remove(){},focus(){},getClientRects:()=>[{}],getBoundingClientRect:()=>({left:0,top:0,width:100,height:100}),getContext:()=>context2d,
   querySelector(selector){if(selector.startsWith('#'))return node(selector.slice(1));if(!children.has(selector))children.set(selector,node());return children.get(selector);},querySelectorAll:selector=>selector==='[data-touch]'?['switch','through','pass','shoot','tackle','sprint'].map(type=>{const button=node('touch:'+type);button.dataset.touch=type;return button;}):[],
   fire:(type,event)=>events[type]?.(event),matches:()=>false,
  };
  Object.defineProperty(n,'innerHTML',{get:()=>n.html||'',set:value=>{n.html=value;for(const m of value.matchAll(/id="([^"]+)"/g))node(m[1]);}});
  if(id)nodes.set(id,n);return n;
 }
 const home={id:'home',name:'Home FC',players:Match.SHAPE.map((s,i)=>({id:'home'+i,name:'Local '+i,pos:s[0],overall:80})),bench:[]},away={...home,id:'away',name:'Away FC',players:home.players.map((p,i)=>({...p,id:'away'+i,name:'Rival '+i}))};
 const graphics={kits:[['#bb2233'],['#eeeedd']],render:g=>{lastView=g;},project:()=>({visible:true,x:100,y:100}),dispose(){}};
 const context=vm.createContext({AuraMatch:Match,AuraPresentation:Presentation,AuraGraphics:{kit:()=>['#bb2233'],create:()=>graphics},AuraEvolution:{stopPreview(){},badge:()=>''},AuraBadges:{get:()=>null},
  document:{createElement:()=>node(),body:node('body'),activeElement:node('focus'),addEventListener:(name,fn)=>{docEvents[name]=fn;},removeEventListener(){}},
  window:{addEventListener:(name,fn)=>{windowEvents[name]=fn;},removeEventListener:(name)=>{delete windowEvents[name];}},navigator:{getGamepads:()=>[]},performance:{now:()=>now},
  requestAnimationFrame:fn=>{raf.set(++nextRaf,fn);return nextRaf;},cancelAnimationFrame:id=>raf.delete(id),home,away,commit:()=>commits++,cancel:()=>cancels++,
 });
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..','match-ui.js'),'utf8'),context);
 vm.runInContext('AuraArena.settings.sound=false;AuraArena.settings.seconds=30;AuraArena.start(home,away,{onFinish:commit,onCancel:cancel})',context);
 const session=vm.runInContext('AuraArena.getSession()',context);
 return {session,node,run:code=>vm.runInContext(code,context),frame(ms=100){now+=ms;const callbacks=[...raf.values()];raf.clear();callbacks.forEach(fn=>fn(now));},
  key(type,key){windowEvents[type]?.({key,preventDefault(){},stopImmediatePropagation(){},target:node()});},click(action){session.node.fire('click',{target:{closest:()=>({dataset:{arena:action}})}});},
  commits:()=>commits,cancels:()=>cancels,view:()=>lastView,
 };
}
test('keyboard input moves the controlled player, release brakes, and pause freezes the arena',()=>{
 const a=boot(),g=a.session.game;g.phase='playing';a.frame();const p=g.players[g.controlled],start=p.x;
 a.key('keydown','d');for(let i=0;i<8;i++)a.frame(50);assert.ok(p.x>start+1);a.key('keyup','d');const speed=p.vx;a.frame(50);assert.ok(p.vx<speed);
 a.key('keydown','p');const snapshot=JSON.stringify(g);a.frame(100);assert.equal(JSON.stringify(g),snapshot);a.click('resume');assert.equal(g.paused,false);a.click('exit');a.click('confirm-exit');assert.equal(a.cancels(),1);assert.equal(a.commits(),0);
});
test('goal replay freezes the live game, can pause and skip, and completion commits exactly once',()=>{
 const a=boot(),g=a.session.game;g.phase='playing';for(let i=0;i<12;i++)a.frame(100);
 g.players.forEach(p=>{p.x=-40;p.z=25;});Object.assign(g.ball,{owner:null,x:52.4,y:.3,z:0,vx:25,vy:0,vz:0,lastTouch:0,lastKicker:9});a.frame(40);
 assert.deepEqual(g.score,[1,0]);assert.ok(a.session.replay);assert.equal(a.node('arena-replay').hidden,false);
 const live=JSON.stringify(g);a.frame(100);assert.equal(JSON.stringify(g),live);assert.notEqual(a.view(),g);assert.equal(a.commits(),0);
 a.click('pause');const elapsed=a.session.replay.time;a.frame(100);assert.equal(a.session.replay.time,elapsed);a.click('resume');a.click('skip-replay');assert.equal(a.session.replay,null);assert.equal(a.node('arena-replay').hidden,true);
 for(let i=0;i<42;i++)a.frame(100);assert.equal(g.phase,'playing');assert.deepEqual(g.score,[1,0]);g.elapsed=g.seconds-.01;g.half=2;a.frame(50);assert.equal(g.phase,'finished');
 a.click('complete');a.click('complete');assert.equal(a.commits(),1);assert.equal(a.cancels(),0);assert.equal(a.run('AuraArena.isRunning()'),false);
});
test('automatic replay finishes and camera selection cycles through four working views',()=>{
 const a=boot(),g=a.session.game;g.phase='playing';for(let i=0;i<10;i++)a.frame();
 const camera=a.run('AuraArena.settings.camera');for(let i=0;i<4;i++)a.click('camera');assert.equal(a.run('AuraArena.settings.camera'),camera);
 g.players.forEach(p=>{p.x=-40;p.z=25;});Object.assign(g.ball,{owner:null,x:52.4,y:.3,z:0,vx:25,vy:0,vz:0,lastTouch:0,lastKicker:9});a.frame(50);assert.ok(a.session.replay);
 for(let i=0;i<36;i++)a.frame(100);assert.equal(a.session.replay,null);assert.deepEqual(g.score,[1,0]);a.click('pause');a.click('exit');a.click('confirm-exit');assert.equal(a.commits(),0);
});

test('cancelled touch shots discard their charge; normal releases still shoot and sprint cancellation stops sprinting',()=>{
 const a=boot(),g=a.session.game;g.phase='playing';g.players[g.controlled].cooldown=0;
 const pointer={pointerId:1,preventDefault(){}};
 const shot=a.node('touch:shoot');shot.fire('pointerdown',pointer);assert.notEqual(a.session.charging,null);
 shot.fire('pointercancel',pointer);assert.equal(g.stats[0].shots,0,'OS cancellation must not fire a shot');assert.equal(a.session.charging,null);assert.equal(a.node('arena-power').hidden,true);
 shot.fire('pointerup',pointer);assert.equal(g.stats[0].shots,0,'a late release cannot fire the discarded charge');
 shot.fire('pointerdown',pointer);shot.fire('pointerup',pointer);assert.equal(g.stats[0].shots,1,'normal touch release keeps working');
 const sprint=a.node('touch:sprint');sprint.fire('pointerdown',pointer);assert.equal(a.session.touchSprint,true);sprint.fire('pointercancel',pointer);assert.equal(a.session.touchSprint,false);
 a.click('pause');a.click('exit');a.click('confirm-exit');assert.equal(a.commits(),0);
});

test('losing joystick capture releases movement and paused or replayed touches cannot queue movement',()=>{
 const a=boot(),g=a.session.game;g.phase='playing';
 const stick=a.node('touch-stick'),pointer={pointerId:3,clientX:90,clientY:50};
 stick.fire('pointerdown',pointer);assert.ok(a.session.stick.x>.5);stick.fire('lostpointercapture',pointer);assert.equal(a.session.stick.x,0,'lost capture must release movement');assert.equal(stick.querySelector('span').style.transform,'');
 a.click('pause');stick.fire('pointerdown',pointer);stick.fire('pointermove',pointer);assert.equal(a.session.stick.x,0,'touches during pause must not queue movement');a.click('resume');assert.equal(a.session.stick.x,0);
 a.session.replay={};stick.fire('pointerdown',pointer);assert.equal(a.session.stick.x,0);a.session.replay=null;
 stick.fire('pointerdown',pointer);assert.ok(a.session.stick.x>.5);a.click('pause');assert.equal(stick.querySelector('span').style.transform,'','pause must recenter the knob');a.click('resume');stick.fire('pointermove',pointer);assert.equal(a.session.stick.x,0,'an old pointer cannot restart movement after pause');
 a.click('pause');a.click('exit');a.click('confirm-exit');
});

test('losing touch action capture stops sprinting and discards shots without breaking normal release',()=>{
 const a=boot(),g=a.session.game;g.phase='playing';g.players[g.controlled].cooldown=0;
 const pointer={pointerId:7,preventDefault(){}},sprint=a.node('touch:sprint'),shot=a.node('touch:shoot');
 sprint.fire('pointerdown',pointer);assert.equal(a.session.touchSprint,true);
 sprint.fire('lostpointercapture',pointer);assert.equal(a.session.touchSprint,false,'a lost touch must not keep sprint held');
 shot.fire('pointerdown',pointer);assert.notEqual(a.session.charging,null);assert.equal(a.node('arena-power').hidden,false);
 shot.fire('lostpointercapture',pointer);assert.equal(a.session.charging,null,'a lost touch must discard the shot charge');assert.equal(a.node('arena-power').hidden,true);assert.equal(g.stats[0].shots,0);
 shot.fire('pointerup',pointer);assert.equal(g.stats[0].shots,0,'late release must not fire a discarded charge');
 shot.fire('pointerdown',pointer);shot.fire('pointerup',pointer);shot.fire('lostpointercapture',pointer);assert.equal(g.stats[0].shots,1,'normal release fires exactly once before capture is lost');
 a.click('pause');a.click('exit');a.click('confirm-exit');assert.equal(a.commits(),0);
});
