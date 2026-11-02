'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');

// Run the production Calle controller and frame loop with a minimal DOM/canvas.
function boot(options={}){
 const events=new Map(),frames=new Map(),buttons=new Map();let now=0,nextFrame=0;
 const drawing=new Proxy({},{get:()=>()=>{}}),classList={add(){},remove(){}};
 function node(){
  const children=new Map();return {dataset:{},classList,style:{},setAttribute(){},setPointerCapture(){},appendChild(){},remove(){},focus(){},
   getContext:()=>drawing,getBoundingClientRect:()=>({width:600,height:400}),
   querySelector(selector){if(!children.has(selector))children.set(selector,node());return children.get(selector);},
   querySelectorAll:()=>[...buttons.values()],
  };
 }
 for(const move of ['up','left','down','right']){const button=node();button.dataset.move=move;buttons.set(move,button);}
 for(const action of ['switch','pass','tackle','shoot']){const button=node();button.dataset.actionStreet=action;buttons.set(action,button);}
 const root=node(),context=vm.createContext({
  document:{createElement:()=>root,body:node(),activeElement:node()},devicePixelRatio:1,
  window:{addEventListener:(type,fn)=>events.set(type,fn),removeEventListener:type=>events.delete(type)},
  requestAnimationFrame:fn=>{frames.set(++nextFrame,fn);return nextFrame;},cancelAnimationFrame:id=>frames.delete(id),
  AuraEvolution:{stopPreview(){}},AuraTourUI:{audio:{suspend(){},resume(){}}},
 });
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..','street.js'),'utf8'),context,{filename:'street.js'});
 const players=prefix=>Array.from({length:3},(_,i)=>({id:prefix+i,name:prefix+' '+i,pos:'MC',overall:75,real:false}));
 context.AuraStreet.open(players('Home'),players('Away'),options);
 const game=context.AuraStreet.getSession().game;game.wait=0;
 return {game,
  frame(ms=25){now+=ms;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(now));},
  pointer(button,type,id=1){buttons.get(button)['on'+type]?.({pointerId:id,preventDefault(){}});},
  key(key){events.get('keydown')?.({key,target:root,preventDefault(){},stopImmediatePropagation(){}});},
  pauseButton:()=>root.querySelector('[data-street="pause"]').onclick(),blur:()=>events.get('blur')?.(),
  close:()=>root.querySelector('[data-street="close"]').onclick(),running:()=>context.AuraStreet.isRunning(),
 };
}

test('Calle touch capture loss releases only the interrupted direction and normal releases still work',()=>{
 const a=boot(),p=a.game.players[a.game.controlled];a.frame();const start={x:p.x,z:p.z};
 a.pointer('right','pointerdown',1);a.pointer('up','pointerdown',2);a.frame();assert.ok(p.x>start.x&&p.z<start.z);
 a.pointer('right','lostpointercapture',1);const stoppedX=p.x,upZ=p.z;a.frame();
 assert.equal(p.x,stoppedX,'lost capture must not leave right movement held');assert.ok(p.z<upZ,'the other finger must keep moving up');
 a.pointer('up','pointercancel',2);const stoppedZ=p.z;a.frame();assert.equal(p.x,stoppedX);assert.equal(p.z,stoppedZ);
 a.pointer('right','pointerdown',3);a.frame();assert.ok(p.x>stoppedX);a.pointer('right','pointerup',3);a.pointer('right','lostpointercapture',3);
 const releasedX=p.x;a.frame();assert.equal(p.x,releasedX,'normal release must stop movement too');a.close();assert.equal(a.running(),false);
});

test('Calle touch movement cannot survive pause or be queued while paused',()=>{
 for(const interrupt of ['p','escape','button','blur']){
  const a=boot(),p=a.game.players[a.game.controlled];a.frame();a.pointer('right','pointerdown');a.frame();
  if(interrupt==='button')a.pauseButton();else if(interrupt==='blur')a.blur();else a.key(interrupt);
  assert.equal(a.game.paused,true);const stopped={x:p.x,z:p.z};
  a.pointer('down','pointerdown',2);a.key('d');a.frame();assert.equal(p.x,stopped.x);assert.equal(p.z,stopped.z);
  a.key('p');assert.equal(a.game.paused,false);a.frame();assert.equal(p.x,stopped.x,interrupt+' must discard old movement');assert.equal(p.z,stopped.z,'paused touches must not queue movement');
  a.pointer('right','pointerdown',3);a.frame();assert.ok(p.x>stopped.x,'a fresh touch still works after resuming');a.pointer('right','pointerup',3);a.close();
 }
});

test('Calle reports one finished 3v3 match to the circuit and not twice on additional frames',()=>{
 let calls=0,last=null;const a=boot({goalLimit:3,seconds:60,onFinish:score=>{calls++;last=score;}});
 assert.equal(a.game.goalLimit,3);assert.equal(a.game.seconds,60);
 a.frame();a.game.elapsed=59.99;a.frame();
 assert.equal(calls,1);assert.equal(a.game.done,true);
 assert.equal(last.goalLimit,3);
 assert.ok(Array.isArray(last.stats));
 a.frame();a.frame();a.frame();assert.equal(calls,1);
 a.close();assert.equal(a.running(),false);
});
test('Abandoning the street match before the end never triggers a circuit result',()=>{
 let calls=0;const a=boot({onFinish:()=>{calls++;}});
 a.frame();a.close();assert.equal(calls,0);
 assert.equal(a.running(),false);
});
