'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(){
 const events={},created=[],messages=[],bodyClasses=new Set(),app={inert:false},button={focus(){},addEventListener(){}},loading={hidden:false};let restored=0;
 const location={origin:'https://aura.example',hash:'',pathname:'/game/index.html',search:''};
 const document={baseURI:'https://aura.example/game/index.html',activeElement:{focus(){restored++;}},querySelector:()=>app,
  addEventListener:(key,fn)=>events[key]=fn,
  createElement:tag=>{const el={tag,hidden:false,setAttribute(){},addEventListener(key,fn){this[key]=fn;},querySelector:selector=>selector.includes('loading')?loading:button,appendChild(child){this.child=child;},contentWindow:{postMessage:message=>messages.push(message)}};created.push(el);return el;},
  body:{appendChild(){},classList:{add:x=>bodyClasses.add(x),remove:x=>bodyClasses.delete(x)}}};
 const context=vm.createContext({document,location,URL,history:{pushState:(s,t,url)=>location.hash=url,replaceState:()=>location.hash=''},addEventListener:(key,fn)=>events[key]=fn,AuraArena:{isRunning:()=>false},localStorage:new Proxy({},{get(){throw Error('DREAM navigation must not edit a save');}})});
 vm.runInContext(fs.readFileSync(require.resolve('../aura-dream-100.js'),'utf8'),context);
 return {api:context.AuraDream,created,messages,events,app,location,bodyClasses,restored:()=>restored};
}
test('DREAM opens within the game origin, returns to AURA, and reuses its loaded career',()=>{
 const f=fixture();assert.equal(f.api.open(),true);assert.equal(f.api.isOpen(),true);assert.equal(f.app.inert,true);assert.equal(f.location.hash,'#dream');
 const frame=f.created.find(x=>x.tag==='iframe');assert.equal(new URL(frame.src).origin,f.location.origin);assert.equal(new URL(frame.src).pathname,'/game/dream/index.html');
 f.api.close();assert.equal(f.api.isOpen(),false);assert.equal(f.app.inert,false);assert.equal(f.messages[0].type,'AURA_DREAM_PAUSE');assert.equal(f.restored(),1);
 f.api.open();assert.equal(f.created.filter(x=>x.tag==='iframe').length,1,'returning to DREAM keeps the same loaded mode');
});
test('only the embedded DREAM frame may request a return to the main menu',()=>{
 const f=fixture();f.api.open();const frame=f.created.find(x=>x.tag==='iframe');
 f.events.message({origin:'https://other.example',source:frame.contentWindow,data:{type:'AURA_DREAM_CLOSE'}});assert.equal(f.api.isOpen(),true);
 f.events.message({origin:f.location.origin,source:{},data:{type:'AURA_DREAM_CLOSE'}});assert.equal(f.api.isOpen(),true);
 f.events.message({origin:f.location.origin,source:frame.contentWindow,data:{type:'AURA_DREAM_CLOSE'}});assert.equal(f.api.isOpen(),false);
});
test('the reload route opens DREAM without creating another history entry',()=>{
 const f=fixture();f.location.hash='#dream';f.events.DOMContentLoaded();assert.equal(f.api.isOpen(),true);f.location.hash='';f.events.popstate();assert.equal(f.api.isOpen(),false);
});
