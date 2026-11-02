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
  close:()=>root.querySelector('[data-street="close"]').onclick(),
  report:()=>root.querySelector(".street-finish"),
  finishAction:key=>root.querySelector(".street-finish").querySelector('[data-street="'+key+'"]').onclick(),
  running:()=>context.AuraStreet.isRunning(),
  closeActive:()=>context.AuraStreet.getSession()?.close(),
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

test("Finished VOLTA fixtures display live score, possession, attempts and an explicit circuit exit",()=>{
 let count=0;const a=boot({homeName:"FC Barcelona",awayName:"Boca Juniors",seconds:60,onFinish:()=>{count++;}});
 a.frame();a.game.score=[2,1];a.game.stats[0].shots=8;a.game.stats[1].shots=6;
 a.game.stats[0].passes=10;a.game.stats[1].passes=7;
 a.game.stats[0].possession=6;a.game.stats[1].possession=4;
 a.game.elapsed=59.99;a.frame();
 const panel=a.report();
 assert.equal(count,1);assert.equal(panel.hidden,false);
 assert.match(panel.innerHTML,/INFORME FINAL/);
 assert.match(panel.innerHTML,/FC Barcelona VS Boca Juniors/);
 assert.match(panel.innerHTML,/2 — 1/);
 assert.match(panel.innerHTML,/Tiros/);assert.match(panel.innerHTML,/Pases/);
 assert.match(panel.innerHTML,/Posesión/);assert.match(panel.innerHTML,/60%/);
 assert.match(panel.innerHTML,/Volver al circuito/);
 assert.doesNotMatch(panel.innerHTML,/data-street="again"/);
 a.frame();assert.equal(count,1);
 a.finishAction("finish-close");assert.equal(a.running(),false);
});
test("VOLTA friendlies offer a working rematch and replace the old game without registering a second match",()=>{
 const a=boot({seconds:60});
 a.frame();a.game.elapsed=59.99;a.frame();
 assert.match(a.report().innerHTML,/data-street="again"/);
 assert.match(a.report().innerHTML,/Revancha/);
 a.finishAction("again");assert.equal(a.running(),true);
 assert.equal(a.game.done,true);
 a.closeActive();assert.equal(a.running(),false);
});
test("Completed match markup renders safely escaped club names",()=>{
 const g={done:true,score:[1,0],seconds:60,elapsed:60,goalLimit:3,stats:[
  {shots:1,passes:2,tackles:0,goals:1,possession:6},
  {shots:1,passes:0,tackles:1,goals:0,possession:4}],goalLog:[]};
 const fs=require("node:fs"),vm2=require("node:vm");
 const ctx=vm2.createContext({});
 vm2.runInContext(fs.readFileSync(path.join(__dirname,"..","street.js"),"utf8"),ctx);
 const html=ctx.AuraStreet.finalReport(g,{homeName:'<script>alert(1)</script>',awayName:"Rival"});
 assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);
 assert.match(html,/Revancha/);
});
