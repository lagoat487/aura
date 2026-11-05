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
   querySelector(selector){if(selector.startsWith('#'))return node(selector.slice(1));if(!children.has(selector))children.set(selector,node());return children.get(selector);},querySelectorAll:selector=>selector==='[data-touch]'?['switch','through','pass','shoot','tackle','sprint'].map(type=>{const button=node('touch:'+type);button.dataset.touch=type;return button;}):[],
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
 const graphics={kits:[['#bb2233'],['#eeeedd']],render:g=>{lastView=g;},project:()=>({visible:true,x:100,y:100}),dispose(){}};
 const context=vm.createContext({AuraMatch:Match,AuraPresentation:Presentation,AuraGraphics:{kit:()=>['#bb2233'],create:()=>graphics},AuraEvolution:{stopPreview(){},badge:()=>''},AuraBadges:{get:()=>null},
  document:{createElement:()=>node(),body:node('body'),activeElement:node('focus'),addEventListener:(name,fn)=>{docEvents[name]=fn;},removeEventListener(){}},
  window:{addEventListener:(name,fn)=>{windowEvents[name]=fn;},removeEventListener:(name)=>{delete windowEvents[name];}},navigator:{getGamepads:()=>[]},performance:{now:()=>now},
  requestAnimationFrame:fn=>{raf.set(++nextRaf,fn);return nextRaf;},cancelAnimationFrame:id=>raf.delete(id),home,away,playerLock:options.playerLock,commit:()=>commits++,cancel:()=>cancels++,
 });
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..','match-ui.js'),'utf8'),context);
 vm.runInContext('AuraArena.settings.sound=false;AuraArena.settings.seconds=30;'+
   (options.local?'AuraArena.settings.localTwoPlayer=true;AuraArena.start(home,away,{})':'AuraArena.start(home,away,{onFinish:commit,onCancel:cancel,playerLock})'),context);
 const session=vm.runInContext('AuraArena.getSession()',context);
 return {session,node,run:code=>vm.runInContext(code,context),frame(ms=100){now+=ms;const callbacks=[...raf.values()];raf.clear();callbacks.forEach(fn=>fn(now));},
  key(type,key,target=node()){const event={key,target,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){this.stopped=true;}};windowEvents[type]?.(event);return event;},click(action){session.node.fire('click',{target:{closest:()=>({dataset:{arena:action}})}});},
  change(id,value){const target=node(id);target.value=value;session.node.fire('change',{target});},
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
