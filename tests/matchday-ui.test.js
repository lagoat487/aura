'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Match=require('../match-engine'),Presentation=require('../match-presentation');
// Exercise the actual arena controller and frame loop; the renderer/DOM only
// supply the surfaces it uses. Real layout and input are checked in the browser.
function boot(options={}){
 const nodes=new Map(),windowEvents={},docEvents={},raf=new Map();let now=0,nextRaf=0,commits=0,cancels=0,lastView=null;
 const classList={add(){},remove(){},toggle(){}};
 const context2d=new Proxy({},{get:()=>()=>{}});
 function node(id=''){
  if(id&&nodes.has(id))return nodes.get(id);
  const events={},children=new Map();const n={id,style:{},dataset:{},classList,hidden:false,tabIndex:0,
   addEventListener:(name,fn)=>{events[name]=fn;},removeEventListener(){},setPointerCapture(){},setAttribute(){},appendChild(){},remove(){},focus(){},getClientRects:()=>[{}],getBoundingClientRect:()=>({left:0,top:0,width:100,height:100}),getContext:()=>context2d,
   querySelector(selector){if(selector.startsWith('#'))return node(selector.slice(1));if(!children.has(selector))children.set(selector,node());return children.get(selector);},querySelectorAll:selector=>selector==='[data-touch]'?['switch','through','lob','cross','skill','pass','shoot','tackle','slide','sprint','pressure','keeperRush','secondPress','closeControl'].map(type=>{const button=node('touch:'+type);button.dataset.touch=type;return button;}):[],
   closest(selector){return selector==='button'&&this.dataset.touch?this:null;},
   fire:(type,event)=>events[type]?.(event),matches:()=>false,
  };
  Object.defineProperty(n,'innerHTML',{get:()=>n.html||'',set:value=>{
   n.html=value;for(const m of value.matchAll(/id="([^"]+)"/g))node(m[1]);
   // Native selects choose the marked option, or the first option by default.
   for(const m of value.matchAll(/<select\b[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)){
    const options=[...m[2].matchAll(/<option\b[^>]*value="([^"]*)"([^>]*)>/g)],selected=options.find(o=>/\bselected\b/.test(o[2]))||options[0];
    node(m[1]).value=selected?.[1]||'';
   }
  }});
  if(id)nodes.set(id,n);return n;
 }
 const home={id:'home',name:'Home FC',players:Match.SHAPE.map((s,i)=>({id:'home'+i,name:'Local '+i,pos:s[0],overall:80})),bench:options.bench||[]},away={...home,id:'away',name:'Away FC',players:home.players.map((p,i)=>({...p,id:'away'+i,name:'Rival '+i})),bench:[]};
 const graphics={kits:[['#bb2233'],['#eeeedd']],render:g=>{lastView=g;},mapInput:input=>Presentation.cameraInput(input,options.cameraFrame),project:()=>({visible:true,x:100,y:100}),dispose(){}};
 const context=vm.createContext({AuraMatch:Match,AuraPresentation:Presentation,AuraGraphics:{kit:()=>['#bb2233'],create:()=>graphics},AuraEvolution:{stopPreview(){},badge:()=>''},AuraBadges:{get:()=>null},
  document:{createElement:()=>node(),body:node('body'),activeElement:node('focus'),addEventListener:(name,fn)=>{docEvents[name]=fn;},removeEventListener(){}},
  window:{addEventListener:(name,fn)=>{windowEvents[name]=fn;},removeEventListener:(name)=>{delete windowEvents[name];}},navigator:{getGamepads:()=>[]},performance:{now:()=>now},
  requestAnimationFrame:fn=>{raf.set(++nextRaf,fn);return nextRaf;},cancelAnimationFrame:id=>raf.delete(id),home,away,playerLock:options.playerLock,commit:()=>commits++,cancel:()=>cancels++,
  initialCamera:options.camera||'broadcast',initialControls:options.controls||'classic',
 });
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..','match-ui.js'),'utf8'),context);
 vm.runInContext('AuraArena.settings.controls=initialControls;AuraArena.settings.sound=false;AuraArena.settings.seconds=30;AuraArena.settings.camera=initialCamera;'+
   (options.local?'AuraArena.settings.localTwoPlayer=true;AuraArena.start(home,away,{})':'AuraArena.start(home,away,{onFinish:commit,onCancel:cancel,playerLock})'),context);
 const session=vm.runInContext('AuraArena.getSession()',context);
 return {session,node,run:code=>vm.runInContext(code,context),frame(ms=100){now+=ms;const callbacks=[...raf.values()];raf.clear();callbacks.forEach(fn=>fn(now));},
  key(type,key,target=node()){const event={key,target,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){this.stopped=true;}};windowEvents[type]?.(event);return event;},click(action){session.node.fire('click',{target:{closest:()=>({dataset:{arena:action}})}});},
  change(id,value){const target=node(id);target.value=value;session.node.fire('change',{target});},
  commits:()=>commits,cancels:()=>cancels,view:()=>lastView,
 };
}
function arenaGamepads(a){
 return a.run("globalThis.arenaPads=[0,1].map(index=>({index,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false}))}));"+
  "navigator.getGamepads=()=>arenaPads;globalThis.arenaInput=null;const actualStep=AuraMatch.step;"+
  "globalThis.AuraMatch={...AuraMatch,step:(game,dt,input)=>{arenaInput={...input,away:{...input.away}};return actualStep(game,dt,input)}};arenaPads;");
}
function watchPadActions(a){
 a.run("globalThis.padActions=[];const actualAction=AuraMatch.action;globalThis.AuraMatch={...AuraMatch,action:(game,type,input)=>{padActions.push({type,team:input?.team??0,sprint:!!input?.sprint});return actualAction(game,type,input)}};");
}

test('close control is held with Z or CONTROL and clears on release, capture loss and pause',()=>{
 const a=boot({controls:'provision'}),g=a.session.game;g.phase='playing';a.frame();
 a.key('keydown','z');a.key('keydown','d');a.frame(100);assert.equal(g.players[g.controlled].closeControl,true);
 a.key('keyup','z');a.frame(50);assert.equal(g.players[g.controlled].closeControl,false);
 const button=a.node('touch:closeControl'),pointer={pointerId:21,preventDefault(){}};
 assert.ok(a.session.node.innerHTML.includes('data-touch="closeControl"'));button.fire('pointerdown',pointer);a.frame(50);assert.equal(g.players[g.controlled].closeControl,true);
 button.fire('lostpointercapture',pointer);a.frame(50);assert.equal(g.players[g.controlled].closeControl,false);
 button.fire('pointerdown',pointer);a.click('pause');assert.equal(a.session.touchHolds.size,0);a.click('resume');a.frame(50);assert.equal(g.players[g.controlled].closeControl,false);
 a.click('pause');a.click('exit');a.click('confirm-exit');
});

test('L2 holds close control for either local team without triggering a skill or sprint',()=>{
 for(const team of [0,1]){
  const a=boot({local:true,controls:'provision'}),g=a.session.game;g.phase='playing';arenaGamepads(a);watchPadActions(a);a.frame();
  const index=team?g.awayControlled:g.controlled;g.ball.owner=index;
  a.run('arenaPads['+team+'].buttons[6].pressed=true;arenaPads['+team+'].buttons[7].pressed=true;arenaPads['+team+'].axes[0]=1');
  a.frame(100);assert.equal(g.players[index].closeControl,true);assert.equal(g.players[index].sprinting,false);assert.equal(g.players[index].skillTime,0);
  assert.equal(a.run('padActions.filter(a=>a.type==="skill").length'),0);
  a.run('arenaPads['+team+'].buttons[6].pressed=false');a.frame(50);assert.equal(g.players[index].closeControl,false);
  a.click('pause');a.click('exit');a.click('confirm-exit');
 }
});

test('touch passes accept a short recovery buffer and pause discards it before resuming',()=>{
 const a=boot({controls:'provision'}),g=a.session.game;g.phase='playing';a.frame();g.players[g.controlled].cooldown=.1;
 a.node('touch:pass').fire('click',{detail:0});assert.ok(g.inputBuffer[0]);assert.equal(g.stats[0].passes,0);
 a.click('pause');assert.equal(g.inputBuffer[0],null);a.click('resume');a.frame(150);assert.equal(g.stats[0].passes,0);
 g.players[g.controlled].cooldown=0;a.node('touch:pass').fire('click',{detail:0});assert.equal(g.stats[0].passes,1);
 a.click('pause');a.click('exit');a.click('confirm-exit');
});
test('keyboard input moves the controlled player, release brakes, and pause freezes the arena',()=>{
 const a=boot(),g=a.session.game;g.phase='playing';a.frame();const p=g.players[g.controlled],start=p.x;
 a.key('keydown','d');for(let i=0;i<8;i++)a.frame(50);assert.ok(p.x>start+1);a.key('keyup','d');const speed=p.vx;a.frame(50);assert.ok(p.vx<speed);
 a.key('keydown','p');const snapshot=JSON.stringify(g);a.frame(100);assert.equal(JSON.stringify(g),snapshot);a.click('resume');assert.equal(g.paused,false);a.click('exit');a.click('confirm-exit');assert.equal(a.cancels(),1);assert.equal(a.commits(),0);
});

test('ProVision keyboard uses Space to pass and K charges a shot until release',()=>{
 const a=boot({controls:'provision'}),g=a.session.game;g.phase='playing';g.players[g.controlled].cooldown=0;a.frame();
 a.key('keydown','k');assert.notEqual(a.session.charging,null);a.frame(650);assert.equal(g.stats[0].shots,0);
 a.key('keyup','k');assert.equal(g.stats[0].shots,1);assert.equal(a.session.charging,null);a.key('keyup','k');assert.equal(g.stats[0].shots,1);
 const p=g.players[g.controlled];p.cooldown=0;Object.assign(g.ball,{owner:g.controlled,x:p.x,z:p.z});
 a.key('keydown',' ');assert.equal(g.stats[0].passes,1);a.key('keyup',' ');a.click('pause');a.click('exit');a.click('confirm-exit');
});

test('ProVision defensive pressure, second defender and keeper rush are held and clear on release',()=>{
 const a=boot({controls:'provision'}),g=a.session.game;g.phase='playing';a.frame();
 Object.assign(g.players[20],{x:15,z:0,cooldown:100});Object.assign(g.ball,{owner:20,x:15,z:0});
 a.key('keydown',' ');a.key('keydown','q');a.key('keydown','k');a.frame(50);
 assert.equal(g.teamIntents[0].pressure,true);assert.equal(g.teamIntents[0].secondPress,true);assert.equal(g.teamIntents[0].keeperRush,true);assert.equal(a.session.charging,null);
 for(const key of [' ','q','k'])a.key('keyup',key);a.frame(50);
 assert.equal(g.teamIntents[0].pressure,false);assert.equal(g.teamIntents[0].secondPress,false);assert.equal(g.teamIntents[0].keeperRush,false);
 a.click('pause');a.click('exit');a.click('confirm-exit');
});

test('ProVision gamepad shots charge independently for both teams and disconnect discards a shot',()=>{
 for(const team of [0,1]){
  const a=boot({local:true,controls:'provision'}),g=a.session.game;g.phase='playing';arenaGamepads(a);watchPadActions(a);a.frame();
  const i=team===0?g.controlled:g.awayControlled,p=g.players[i];p.cooldown=0;Object.assign(g.ball,{owner:i,x:p.x,z:p.z});
  a.run('arenaPads['+team+'].buttons[1].pressed=true');a.frame(50);a.frame(500);assert.equal(g.stats[team].shots,0);
  a.run('arenaPads['+team+'].buttons[1].pressed=false');a.frame(50);assert.equal(g.stats[team].shots,1);
  assert.equal(a.run('padActions.filter(a=>a.type==="shoot"&&a.team==='+team+').length'),1);
  a.click('pause');a.click('exit');a.click('confirm-exit');
 }
 const a=boot({controls:'provision'}),g=a.session.game;g.phase='playing';arenaGamepads(a);a.frame();g.players[g.controlled].cooldown=0;
 a.run('arenaPads[0].buttons[1].pressed=true');a.frame();assert.notEqual(a.session.charging,null);
 a.run('arenaPads[0].connected=false');a.frame();assert.equal(a.session.charging,null);assert.equal(g.stats[0].shots,0);
 a.click('pause');a.click('exit');a.click('confirm-exit');
});

test('ProVision Tab switches during play and held touch defence is cleared on pause and capture loss',()=>{
 const a=boot({controls:'provision'}),g=a.session.game;g.phase='playing';a.frame();
 g.ball.owner=null;g.ball.x=g.players[8].x;g.ball.z=g.players[8].z;
 const event=a.key('keydown','Tab');assert.equal(event.defaultPrevented,true);assert.equal(g.controlled,8);
 const pointer={pointerId:13,preventDefault(){}};a.node('touch:pressure').fire('pointerdown',pointer);assert.equal(a.session.touchHolds.has('pressure'),true);
 a.node('touch:pressure').fire('lostpointercapture',pointer);assert.equal(a.session.touchHolds.has('pressure'),false);
 a.node('touch:keeperRush').fire('pointerdown',pointer);a.click('pause');assert.equal(a.session.touchHolds.size,0);
 a.click('exit');a.click('confirm-exit');
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
test('restart setup explains the dead ball, discards old input and blocks queued touch shots',()=>{
 const a=boot(),g=a.session.game;g.phase='playing';a.frame();
 a.key('keydown','j');a.key('keydown','d');
 const shot=a.node('touch:shoot'),stick=a.node('touch-stick'),pointer={pointerId:11,preventDefault(){},clientX:90,clientY:50};
 Object.assign(g.ball,{owner:null,x:52.4,z:10,y:.3,vx:30,vz:0,vy:0,lastTouch:0});a.frame(40);
 assert.equal(g.phase,'restart');assert.equal(a.session.charging,null);assert.equal(a.session.keys.size,0);
 assert.equal(a.node('arena-power').hidden,true);a.frame(100);
 assert.equal(a.node('arena-setpiece').hidden,false);assert.match(a.node('arena-setpiece').textContent,/SAQUE DE PORTERÍA.*BALÓN DETENIDO/);
 const elapsed=g.elapsed,score=g.score.slice();a.key('keydown','j');shot.fire('pointerdown',pointer);stick.fire('pointerdown',pointer);
 assert.equal(a.session.charging,null);assert.equal(a.session.stick.x,0);a.frame(100);assert.equal(g.elapsed,elapsed);assert.deepEqual(g.score,score);
 for(let i=0;i<120&&g.phase==='restart';i++)a.frame(100);
 assert.equal(g.phase,'playing');shot.fire('pointerup',pointer);a.key('keyup','j');assert.equal(g.stats[0].shots,0);
 a.click('pause');a.click('exit');a.click('confirm-exit');
});
test('automatic replay finishes and camera selection cycles through six working views',()=>{
 const a=boot(),g=a.session.game;g.phase='playing';for(let i=0;i<10;i++)a.frame();
 const camera=a.run('AuraArena.settings.camera');for(let i=0;i<6;i++)a.click('camera');assert.equal(a.run('AuraArena.settings.camera'),camera);
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

test('on-screen match actions accept native Enter and Space clicks without a field shortcut or duplicate action',()=>{
 for(const key of ['Enter',' '])for(const type of ['switch','through','lob','cross','skill','pass','shoot','tackle','slide']){
  const a=boot(),g=a.session.game;g.phase='playing';g.players[g.controlled].cooldown=0;
  a.run('const actualAction=AuraMatch.action;globalThis.actionCalls=[];globalThis.AuraMatch={...AuraMatch,action:(...args)=>{actionCalls.push(args[1]);return actualAction(...args)}}');
  const button=a.node('touch:'+type);assert.ok(a.session.node.innerHTML.includes('data-touch="'+type+'"'));
  const event=a.key('keydown',key,button);assert.equal(event.defaultPrevented,false,'native button activation must remain available');assert.equal(a.run('actionCalls.length'),0);
  button.fire('click',{detail:0});assert.equal(a.run('actionCalls.length'),1);assert.equal(a.run('actionCalls[0]'),type);
  if(type==='shoot'){assert.equal(g.stats[0].shots,1);assert.equal(a.session.charging,null);assert.equal(a.node('arena-power').hidden,true);}
  if(type==='pass')assert.equal(g.stats[0].passes,1);
  a.click('pause');a.click('exit');a.click('confirm-exit');
 }
});

test('on-screen pointer clicks cannot repeat a touch pass or shot even when another action is legal',()=>{
 for(const type of ['pass','shoot']){
  const a=boot(),g=a.session.game;g.phase='playing';g.players[g.controlled].cooldown=0;
  const button=a.node('touch:'+type),pointer={pointerId:4,preventDefault(){}},stat=type==='shoot'?'shots':'passes';
  button.fire('pointerdown',pointer);button.fire('pointerup',pointer);assert.equal(g.stats[0][stat],1);
  const player=g.players[g.controlled];player.cooldown=0;Object.assign(g.ball,{owner:player.index,x:player.x,z:player.z});
  button.fire('click',{detail:1});button.fire('click',{detail:2});assert.equal(g.stats[0][stat],1);
  button.fire('click',{detail:0});assert.equal(g.stats[0][stat],2,'a separate native activation must still work');
  a.click('pause');a.click('exit');a.click('confirm-exit');
 }
});

test('native match action clicks cannot queue a shot while paused, replaying, restarting or finished',()=>{
 for(const blocked of ['paused','replay','restart','finished']){
  const a=boot(),g=a.session.game;g.phase='playing';
  if(blocked==='paused')a.click('pause');if(blocked==='replay')a.session.replay={};if(blocked==='restart')g.phase='restart';if(blocked==='finished')a.session.done=true;
  const before=JSON.stringify(g);a.node('touch:shoot').fire('click',{detail:0});a.node('touch:pass').fire('click',{detail:0});
  assert.equal(JSON.stringify(g),before,blocked+' must reject native actions');assert.equal(a.session.charging,null);
  a.session.replay=null;a.session.done=false;g.phase='playing';if(g.paused)a.click('resume');
  a.node('touch:sprint').fire('click',{detail:0});assert.equal(a.session.touchSprint,false,'a single click must not leave the hold-to-sprint control stuck');
  a.click('pause');a.click('exit');a.click('confirm-exit');
 }
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

test('the joystick keeps its active finger when another finger touches, moves or releases on the pad',()=>{
 const a=boot(),g=a.session.game;g.phase='playing';
 const stick=a.node('touch-stick'),knob=stick.querySelector('span'),first={pointerId:11,clientX:90,clientY:50},second={pointerId:12,clientX:10,clientY:50};
 const position=()=>JSON.stringify(a.session.stick);
 stick.fire('pointerdown',first);assert.ok(a.session.stick.x>.5);const held=position(),transform=knob.style.transform;
 stick.fire('pointerdown',second);assert.equal(position(),held,'a second finger must not replace the active direction');
 stick.fire('pointermove',{...second,clientX:50,clientY:90});assert.equal(position(),held);
 for(const release of ['pointerup','pointercancel','lostpointercapture']){stick.fire(release,second);assert.equal(position(),held,release+' from another finger must not stop movement');assert.equal(knob.style.transform,transform);}
 stick.fire('pointermove',{...first,clientX:50,clientY:90});assert.ok(a.session.stick.z>.5,'the original finger must remain responsive');
 stick.fire('pointerup',first);assert.equal(a.session.stick.x,0);assert.equal(a.session.stick.z,0);assert.equal(knob.style.transform,'');
 a.click('pause');a.click('exit');a.click('confirm-exit');
});

test('an older joystick release cannot cancel a new touch, and pause still clears the active pointer',()=>{
 for(const release of ['pointerup','pointercancel','lostpointercapture']){
  const a=boot(),g=a.session.game;g.phase='playing';
  const stick=a.node('touch-stick'),first={pointerId:21,clientX:90,clientY:50},second={pointerId:22,clientX:10,clientY:50};
  stick.fire('pointerdown',first);stick.fire('pointerup',first);stick.fire('pointerdown',second);assert.ok(a.session.stick.x<-.5);
  const held=JSON.stringify(a.session.stick);stick.fire(release,first);assert.equal(JSON.stringify(a.session.stick),held,'a stale '+release+' must leave the new finger in control');
  a.click('pause');assert.equal(a.session.stick.x,0);assert.equal(a.session.stick.z,0);assert.equal(stick.querySelector('span').style.transform,'');
  a.click('resume');stick.fire('pointermove',second);assert.equal(a.session.stick.x,0,'the old finger cannot queue movement after pause');
  stick.fire('pointerdown',second);assert.ok(a.session.stick.x<-.5);stick.fire(release,second);assert.equal(a.session.stick.x,0,'the matching release still stops movement');
  a.click('pause');a.click('exit');a.click('confirm-exit');
 }
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

test('Space preserves focused button activation during play, replay and the final result',()=>{
 const a=boot(),g=a.session.game;g.phase='playing';
 const button={matches:()=>false,closest:selector=>selector==='button'?{}:null};
 const before=JSON.stringify(g);assert.equal(a.key('keydown',' ',button).defaultPrevented,false,'Space on a focused button must retain native activation');assert.equal(JSON.stringify(g),before);assert.equal(a.session.keys.has(' '),false);
 a.session.replay={frames:[],time:0};assert.equal(a.key('keydown',' ',button).defaultPrevented,false);assert.ok(a.session.replay,'Space on a replay button must not trigger the field shortcut');a.session.replay=null;
 assert.equal(a.key('keydown',' ').defaultPrevented,true,'Space on the field still invokes the tackle shortcut');assert.equal(a.session.keys.has(' '),true);a.key('keyup',' ');
 g.phase='finished';a.frame();assert.equal(a.session.done,true);assert.equal(a.key('keydown',' ',button).defaultPrevented,false,'the final result button must be activatable with Space');
 a.click('complete');assert.equal(a.commits(),1);
});
test('the final match summary shows real keeper saves and parries without double-counting a result',()=>{
 const a=boot(),g=a.session.game;g.stats[1].saves=4;g.stats[1].parries=2;g.phase='finished';a.frame();
 const html=a.node('arena-layer').innerHTML;
 assert.match(html,/<span>Paradas<\/span><b>4<\/b>/);assert.match(html,/<span>Desvíos del portero<\/span><b>2<\/b>/);assert.doesNotMatch(html,/undefined|NaN/);
 a.click('complete');a.click('complete');assert.equal(a.commits(),1);
});

test('the match plan proposes legal changes and uses the displayed position rating without changing the source squad',()=>{
 const a=boot({bench:[
  {id:'reserve-raw',name:'Higher raw rating',pos:'MC',overall:90,slotRatings:Array(11).fill(65)},
  {id:'reserve-fit',name:'Better fit',pos:'DC',overall:84,slotRatings:Array(11).fill(82)},
  {id:'reserve-keeper',name:'Reserve keeper',pos:'POR',overall:77},
 ]}),g=a.session.game,source=a.run('JSON.stringify(home)'),controlled=g.controlled;
 a.click('pause');a.click('plan');
 assert.equal(a.node('plan-out').value,String(controlled),'start with the controlled player, not the keeper');
 const incoming=()=>a.node('arena-layer').innerHTML.match(/<select id="plan-in"[^>]*>([\s\S]*?)<\/select>/)[1];
 assert.doesNotMatch(incoming(),/reserve-keeper/);assert.equal(a.node('plan-in').value,'reserve-fit');assert.match(incoming(),/82 GRL en este puesto/);
 a.click('substitute');assert.equal(g.players[controlled].id,'reserve-fit');assert.equal(g.players[controlled].overall,82);
 a.change('plan-out','0');assert.match(incoming(),/reserve-keeper/);assert.doesNotMatch(incoming(),/reserve-raw/);
 a.click('substitute');assert.equal(g.players[0].id,'reserve-keeper');assert.equal(g.substitutions.length,2);
 a.change('plan-out',String(controlled));assert.doesNotMatch(incoming(),/reserve-fit|reserve-keeper/,'used substitutes must not reappear');
 assert.equal(a.run('JSON.stringify(home)'),source);assert.equal(g.paused,true);
 a.click('resume');a.click('pause');a.click('exit');a.click('confirm-exit');
});
test('the match plan hides locked or sent-off players and disables changes without compatible cover',()=>{
 const a=boot({bench:[{id:'reserve-mid',name:'Reserve midfielder',pos:'MC',overall:78}],playerLock:'home9'}),g=a.session.game;g.players[2].sentOff=true;
 a.click('pause');a.click('plan');
 const outgoing=()=>a.node('arena-layer').innerHTML.match(/<select id="plan-out">([\s\S]*?)<\/select>/)[1];
 assert.doesNotMatch(outgoing(),/value="9"|value="2"/);assert.notEqual(a.node('plan-out').value,'9');
 a.change('plan-out','0');const before=JSON.stringify(g),html=a.node('arena-layer').innerHTML;
 assert.match(html,/Sin recambio compatible/);assert.match(html,/id="plan-in" disabled/);assert.match(html,/data-arena="substitute" disabled/);
 a.click('substitute');assert.equal(JSON.stringify(g),before,'a stale activation cannot make an illegal change');
 a.change('plan-out','1');assert.equal(a.node('plan-in').value,'reserve-mid');a.click('substitute');assert.equal(g.players[1].id,'reserve-mid');assert.equal(g.players[9].id,'home9');
 a.click('resume');a.click('pause');a.click('exit');a.click('confirm-exit');
});

test('substitution selects keep P available for native name search while Escape and field pause still work',()=>{
 const a=boot({bench:[{id:'reserve-roberto',name:'Roberto',pos:'DC',overall:80},{id:'reserve-pedro',name:'Pedro',pos:'DC',overall:78}]}),g=a.session.game;
 a.click('pause');a.click('plan');const outgoing=Number(a.node('plan-out').value),select=a.node('plan-in');
 select.matches=selector=>selector==='select,input,textarea';
 for(const key of ['p','P']){
  const before=JSON.stringify(g),event=a.key('keydown',key,select);
  assert.equal(event.defaultPrevented,false,'typing a name must remain available to the native select');
  assert.equal(g.paused,true,'select typeahead must not resume the match');assert.equal(JSON.stringify(g),before);
 }
 a.change('plan-in','reserve-pedro');a.click('substitute');assert.equal(g.players[outgoing].id,'reserve-pedro');assert.equal(g.paused,true);
 const escape=a.key('keydown','Escape',select);assert.equal(escape.defaultPrevented,true);assert.equal(g.paused,false,'Escape remains an explicit way back to play');
 a.key('keydown','p');assert.equal(g.paused,true,'P outside a form control must still pause');
 a.click('exit');a.click('confirm-exit');assert.equal(a.commits(),0);
});

test('two-player exhibition assigns arrows to the visitor without moving the home player',()=>{
 const a=boot({local:true}),g=a.session.game;
 assert.equal(g.localTwoPlayer,true);
 g.phase='playing';a.frame();
 const home=g.players[g.controlled],away=g.players[g.awayControlled],xHome=home.x,xAway=away.x;
 a.key('keydown','arrowleft');
 for(let i=0;i<9;i++)a.frame(50);
 a.key('keyup','arrowleft');
 assert.ok(away.x<xAway-.4,'Player 2 arrow movement should reach the away footballer');
 assert.ok(Math.abs(home.x-xHome)<.3,'Player 2 input should not move Player 1');
 a.key('keydown','d');for(let i=0;i<9;i++)a.frame(50);a.key('keyup','d');
 assert.ok(home.x>xHome+.4,'Player 1 continues to move with WASD');
 a.click('pause');a.click('exit');a.click('confirm-exit');
});
test('local gamepads keep their teams through disconnects and reconnections',()=>{
 for(const missing of ['null','disconnected']){
  const a=boot({local:true}),g=a.session.game;g.phase='playing';const pads=arenaGamepads(a),first=pads[0],rosters=a.run('JSON.stringify([home,away])');a.frame();
  pads[0]=missing==='null'?null:{...first,connected:false};pads[1].axes[0]=1;pads[1].buttons[1].pressed=true;
  const away=g.players[g.awayControlled];away.cooldown=0;Object.assign(g.ball,{owner:g.awayControlled,x:away.x-.65,z:away.z,y:.22});a.frame(50);
  assert.equal(g.stats[1].shots,1,'the remaining J2 controller must still shoot for the visitor');assert.equal(g.stats[0].shots,0);
  assert.equal(a.run('arenaInput.x'),0);assert.equal(a.run('arenaInput.away.x'),1,'J2 movement must not transfer to the home team');
  a.frame(50);assert.equal(g.stats[1].shots,1,'holding the shot button must not repeat the action');
  pads[1].buttons[1].pressed=false;a.frame(50);pads[0]=first;first.axes[0]=-1;a.frame(50);
  assert.equal(a.run('arenaInput.x'),-1,'the reconnected J1 controller must regain its own team');assert.equal(a.run('arenaInput.away.x'),1);
  pads[1]=missing==='null'?null:{...pads[1],connected:false};first.buttons[1].pressed=true;
  const home=g.players[g.controlled];home.cooldown=0;Object.assign(g.ball,{owner:home.index,x:home.x+.65,z:home.z,y:.22});a.frame(50);
  assert.equal(g.stats[0].shots,1);assert.equal(g.stats[1].shots,1);assert.equal(a.run('arenaInput.away.x'),0);
  assert.equal(a.run('JSON.stringify([home,away])'),rosters,'controller changes must preserve the source teams');
  a.click('pause');a.click('exit');a.click('confirm-exit');
 }
});
test('local gamepads keep initial assignments when a lower browser slot connects later',()=>{
 const a=boot({local:true}),g=a.session.game;g.phase='playing';const pads=arenaGamepads(a),late=pads[0],early=pads[1];pads[0]=null;early.axes[0]=1;
 a.frame();a.frame(50);assert.equal(a.run('arenaInput.x'),1,'the first available controller must still join J1');assert.equal(a.run('arenaInput.away.x'),0);
 pads[0]=late;late.axes[0]=-1;a.frame(50);
 assert.equal(a.run('arenaInput.x'),1,'connecting an earlier browser slot must not swap the existing player');assert.equal(a.run('arenaInput.away.x'),-1);
 a.click('pause');a.click('exit');a.click('confirm-exit');
});
test('single-player matches still accept any connected gamepad when browser slots have gaps',()=>{
 const a=boot(),g=a.session.game;g.phase='playing';const pads=arenaGamepads(a),available=pads[1];pads[0]=null;available.axes[0]=1;available.buttons[1].pressed=true;
 const home=g.players[g.controlled];home.cooldown=0;Object.assign(g.ball,{owner:home.index,x:home.x+.65,z:home.z,y:.22});a.frame();a.frame(50);
 assert.equal(g.stats[0].shots,1);assert.equal(g.stats[1].shots,0);assert.equal(a.run('arenaInput.x'),1);
 available.connected=false;a.frame(50);assert.equal(a.run('arenaInput.x'),0,'disconnecting the only pad must release movement');
 available.connected=true;available.buttons[1].pressed=false;a.frame(50);available.buttons[1].pressed=true;home.cooldown=0;Object.assign(g.ball,{owner:home.index,x:home.x+.65,z:home.z,y:.22});a.frame(50);
 assert.equal(g.stats[0].shots,2,'a new press after reconnection must still work');
 a.click('pause');a.click('exit');a.click('confirm-exit');assert.equal(a.commits(),0);assert.equal(a.cancels(),1);
});
test('the right trigger sprints without centering or performing a skill for either local player',()=>{
 for(const [local,team] of [[false,0],[true,0],[true,1]]){
  const a=boot({local}),g=a.session.game;g.phase='playing';const pads=arenaGamepads(a),pad=pads[team],sprint=team?'arenaInput.away.sprint':'arenaInput.sprint';watchPadActions(a);a.frame();
  const index=team?g.awayControlled:g.controlled,p=g.players[index];p.cooldown=0;Object.assign(g.ball,{owner:index,x:p.x+(team?-.65:.65),z:p.z,y:.22});
  pad.buttons[7].pressed=true;a.frame(50);assert.equal(a.run(sprint),true,'RT/R2 must sprint for the selected player');assert.equal(a.run('padActions.length'),0,'sprinting must not request a cross or skill');
  a.frame(50);assert.equal(a.run(sprint),true);assert.equal(a.run('padActions.length'),0);
  pad.buttons[7].pressed=false;a.frame(50);assert.equal(a.run(sprint),false,'releasing RT/R2 must stop the held sprint');
  const key=team?'5':'Shift';a.key('keydown',key);a.frame(50);assert.equal(a.run(sprint),true,'existing keyboard sprint must remain available');a.key('keyup',key);a.frame(50);assert.equal(a.run(sprint),false);
  a.click('pause');a.click('exit');a.click('confirm-exit');assert.equal(a.commits(),0);
 }
});
test('the right bumper remains a single cross without also activating sprint for either local player',()=>{
 for(const [local,team] of [[false,0],[true,0],[true,1]]){
  const a=boot({local}),g=a.session.game;g.phase='playing';const pads=arenaGamepads(a),pad=pads[team],sprint=team?'arenaInput.away.sprint':'arenaInput.sprint';watchPadActions(a);a.frame();
  const index=team?g.awayControlled:g.controlled,p=g.players[index];p.cooldown=0;Object.assign(g.ball,{owner:index,x:p.x+(team?-.65:.65),z:p.z,y:.22});
  pad.buttons[5].pressed=true;a.frame(50);assert.equal(a.run('padActions.length'),1);assert.deepEqual(JSON.parse(a.run('JSON.stringify(padActions[0])')),{type:'cross',team,sprint:false});assert.equal(a.run(sprint),false);
  a.frame(50);assert.equal(a.run('padActions.length'),1,'holding RB/R1 must not repeat the cross');
  pad.buttons[5].pressed=false;a.frame(50);p.cooldown=0;Object.assign(g.ball,{owner:index,x:p.x+(team?-.65:.65),z:p.z,y:.22});pad.buttons[5].pressed=true;a.frame(50);
  assert.equal(a.run('padActions.length'),2,'a new bumper press must still request a new cross');
  a.click('pause');a.click('exit');a.click('confirm-exit');assert.equal(a.commits(),0);
 }
});
test('the right-stick button performs a skill without sprinting and only once per press for either local player',()=>{
 for(const [local,team] of [[false,0],[true,0],[true,1]]){
  const a=boot({local}),g=a.session.game;g.phase='playing';const pads=arenaGamepads(a),pad=pads[team],sprint=team?'arenaInput.away.sprint':'arenaInput.sprint';watchPadActions(a);a.frame();
  const index=team?g.awayControlled:g.controlled,p=g.players[index];p.cooldown=0;p.skillCooldown=0;p.stamina=100;Object.assign(g.ball,{owner:index,x:p.x+(team?-.65:.65),z:p.z,y:.22});
  pad.buttons[11].pressed=true;a.frame(50);assert.equal(a.run('padActions.length'),1);assert.deepEqual(JSON.parse(a.run('JSON.stringify(padActions[0])')),{type:'skill',team,sprint:false});assert.ok(p.skillCooldown>0,'the real engine must accept the skill');assert.equal(a.run(sprint),false);
  a.frame(50);assert.equal(a.run('padActions.length'),1,'holding R3 must not repeat the skill');
  pad.buttons[11].pressed=false;a.frame(50);p.cooldown=0;p.skillCooldown=0;Object.assign(g.ball,{owner:index,x:p.x+(team?-.65:.65),z:p.z,y:.22});pad.buttons[11].pressed=true;a.frame(50);
  assert.equal(a.run('padActions.length'),2,'a new R3 press must still perform a skill');
  a.click('pause');a.click('exit');a.click('confirm-exit');assert.equal(a.commits(),0);
 }
});
test('visitor shooting shortcut works only for the away-controlled player in local mode',()=>{
 const a=boot({local:true}),g=a.session.game;g.phase='playing';const away=g.players[g.awayControlled];
 away.cooldown=0;Object.assign(g.ball,{owner:g.awayControlled,x:away.x-.65,z:away.z,y:.22});
 a.key('keydown','0');
 assert.equal(g.stats[1].shots,1);
 assert.equal(g.stats[0].shots,0);
 a.key('keyup','0');a.click('pause');a.click('exit');a.click('confirm-exit');
});

test('pause report lists both teams, leader, ratings and allows returning without unpausing',()=>{
 const a=boot(),g=a.session.game;g.phase='playing';
 const scorer=g.players[g.controlled];g.playerStats["0:"+scorer.id].goals=2;
 a.click('pause');assert.equal(g.paused,true);
 assert.match(a.node('arena-layer').innerHTML,/data-arena="report"/);
 a.click('report');
 const html=a.node('arena-layer').innerHTML;
 assert.match(html,/INFORME DE PARTIDO/);
 assert.match(html,/JUGADOR DEL PARTIDO/);
 assert.match(html,/home|Home FC|Local/);
 assert.match(html,/away|Away FC|Rival/);
 assert.match(html,/data-arena="report-back"/);
 assert.equal(g.paused,true);
 a.click('report-back');
 assert.match(a.node('arena-layer').innerHTML,/data-arena="resume"/);
 a.click('resume');assert.equal(g.paused,false);
 a.click('pause');a.click('exit');a.click('confirm-exit');assert.equal(a.commits(),0);
});
test('final score shows the individual MVP and assists, and full player report remains read-only',()=>{
 const a=boot(),g=a.session.game;g.playerStats["0:home9"].assists=1;
 g.playerStats["0:home8"].goals=1;
 g.goals=[{minute:21,name:"Local 8",team:0,assist:"Local 9",assistId:"home9"}];
 g.score=[1,0];g.phase='finished';a.frame();
 let html=a.node('arena-layer').innerHTML;
 assert.match(html,/JUGADOR DEL PARTIDO/);
 assert.match(html,/Asistencia: Local 9/);
 assert.match(html,/data-arena="report"/);
 const snapshot=JSON.stringify(g);
 a.click('report');html=a.node('arena-layer').innerHTML;
 assert.match(html,/match-player-table/);
 assert.match(html,/Local 8/);
 assert.equal(JSON.stringify(g),snapshot);
 a.click('report-back');assert.match(a.node('arena-layer').innerHTML,/data-arena="complete"/);
 a.click('complete');a.click('complete');assert.equal(a.commits(),1);
});


test('touch shot charge belongs to its first finger until that finger releases',()=>{
 for(const release of ['pointerup','pointercancel','lostpointercapture']){
  const a=boot(),g=a.session.game;g.phase='playing';a.frame();
  const shot=a.node('touch:shoot'),first={pointerId:31,preventDefault(){}},second={pointerId:32,preventDefault(){}};
  shot.fire('pointerdown',first);const charge=a.session.charging;assert.notEqual(charge,null);a.frame(100);
  shot.fire('pointerdown',second);
  assert.equal(a.session.charging,charge,'a second finger must not restart the held shot charge');
  assert.equal(a.node('arena-power').hidden,false);
  const before=JSON.stringify(g);shot.fire(release,second);
  assert.equal(a.session.charging,charge,'a foreign '+release+' must not release or cancel the held shot');
  assert.equal(a.node('arena-power').hidden,false);assert.equal(JSON.stringify(g),before);
  const p=g.players[g.controlled];p.cooldown=0;Object.assign(g.ball,{owner:p.index,x:p.x,z:p.z,y:.22});
  shot.fire('pointerup',first);assert.equal(g.stats[0].shots,1,'the first finger must still fire once on normal release');
  assert.equal(a.session.charging,null);assert.equal(a.node('arena-power').hidden,true);
  shot.fire('pointerup',second);assert.equal(g.stats[0].shots,1,'a late foreign release cannot fire another shot');
  a.click('pause');a.click('exit');a.click('confirm-exit');assert.equal(a.commits(),0);
 }
});

test('touch sprint ignores other fingers and lets the matching release stop sprinting',()=>{
 for(const release of ['pointerup','pointercancel','lostpointercapture']){
  const a=boot(),g=a.session.game;g.phase='playing';
  const sprint=a.node('touch:sprint'),first={pointerId:41,preventDefault(){}},second={pointerId:42,preventDefault(){}};
  sprint.fire('pointerdown',first);assert.equal(a.session.touchSprint,true);
  sprint.fire('pointerdown',second);sprint.fire(release,second);
  assert.equal(a.session.touchSprint,true,'a second finger must not stop the first finger sprinting');
  sprint.fire(release,first);assert.equal(a.session.touchSprint,false,'the matching release must still stop sprinting');
  sprint.fire('pointerdown',second);assert.equal(a.session.touchSprint,true);
  sprint.fire(release,first);assert.equal(a.session.touchSprint,true,'a stale release must not cancel a new sprint');
  sprint.fire(release,second);assert.equal(a.session.touchSprint,false);
  a.click('pause');a.click('exit');a.click('confirm-exit');assert.equal(a.commits(),0);
 }
});

test('pause discards held touch buttons and old releases cannot interrupt fresh touches after resume',()=>{
 for(const release of ['pointerup','pointercancel','lostpointercapture']){
  const a=boot(),g=a.session.game;g.phase='playing';
  const sprint=a.node('touch:sprint'),shot=a.node('touch:shoot'),oldSprint={pointerId:51,preventDefault(){}},oldShot={pointerId:52,preventDefault(){}},newSprint={pointerId:53,preventDefault(){}},newShot={pointerId:54,preventDefault(){}};
  sprint.fire('pointerdown',oldSprint);shot.fire('pointerdown',oldShot);
  a.click('pause');assert.equal(a.session.touchSprint,false);assert.equal(a.session.charging,null);assert.equal(a.node('arena-power').hidden,true);
  a.click('resume');sprint.fire('pointerdown',newSprint);shot.fire('pointerdown',newShot);
  assert.equal(a.session.touchSprint,true,'resume must allow a fresh sprint without waiting for the old finger');
  assert.notEqual(a.session.charging,null,'resume must allow a fresh shot without waiting for the old finger');const charge=a.session.charging;
  const before=JSON.stringify(g);sprint.fire(release,oldSprint);shot.fire(release,oldShot);
  assert.equal(a.session.touchSprint,true);assert.equal(a.session.charging,charge);assert.equal(a.node('arena-power').hidden,false);assert.equal(JSON.stringify(g),before);
  const p=g.players[g.controlled];p.cooldown=0;Object.assign(g.ball,{owner:p.index,x:p.x,z:p.z,y:.22});
  sprint.fire('pointerup',newSprint);shot.fire('pointerup',newShot);
  assert.equal(a.session.touchSprint,false);assert.equal(a.session.charging,null);assert.equal(g.stats[0].shots,1);
  a.click('pause');a.click('exit');a.click('confirm-exit');assert.equal(a.commits(),0);
 }
});

test('sideline and immersive keyboard, touch and gamepads map movement and action aiming once for both local players',()=>{
 const frame={position:[-7,5,8],target:[5,1,-2],fov:52};
 for(const camera of ['immersive','stadium'])for(const source of ['keyboard','touch','gamepad']){
  const a=boot({local:true,camera,cameraFrame:frame}),g=a.session.game;g.phase='playing';
  const pads=arenaGamepads(a);a.run("globalThis.aims=[];const aimAction=AuraMatch.action;globalThis.AuraMatch={...AuraMatch,action:(game,type,input)=>{aims.push({type,...input});return aimAction(game,type,input)}}");
  let amount=1;
  if(source==='keyboard'){a.key('keydown','d');a.key('keydown','arrowright');}
  if(source==='touch'){a.node('touch-stick').fire('pointerdown',{pointerId:1,clientX:88,clientY:50});}
  if(source==='gamepad'){pads[0].axes[0]=.7;pads[1].axes[0]=.7;amount=.7;}
  a.frame(50);a.frame(50);
  const input=a.run('arenaInput'),expected=Presentation.cameraInput({x:amount,z:0},frame);
  assert.ok(Math.abs(input.x-expected.x)<1e-8);assert.ok(Math.abs(input.z-expected.z)<1e-8);
  if(source!=='touch'){assert.ok(Math.abs(input.away.x-expected.x)<1e-8);assert.ok(Math.abs(input.away.z-expected.z)<1e-8);}
  if(source==='keyboard')a.key('keydown','k');
  if(source==='touch')a.node('touch:pass').fire('pointerdown',{pointerId:2,preventDefault(){}});
  if(source==='gamepad'){pads[0].buttons[0].pressed=true;pads[1].buttons[0].pressed=true;a.frame(50);}
  const aims=a.run('aims');assert.equal(aims.length,source==='gamepad'?2:1);
  for(const aim of aims){assert.ok(Math.abs(aim.x-expected.x)<1e-8);assert.ok(Math.abs(aim.z-expected.z)<1e-8);}
  a.click('pause');a.click('exit');a.click('confirm-exit');
 }
});
