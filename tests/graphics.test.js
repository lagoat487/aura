"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const THREE=require("../vendor/three.min.js"),Match=require("../match-engine");
test("WebGL scene construction produces finite stadium and player geometry in all four quality settings",()=>{
 const gradient={addColorStop(){}};
 const context2d=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>k in o?o[k]:()=>{}});
 const canvas=()=>({width:1,height:1,getContext:()=>context2d,setAttribute(){},remove(){}});
 let renders=0,latestScene=null;
 class Renderer{
   constructor(){this.domElement=canvas();this.shadowMap={};this.capabilities={getMaxAnisotropy:()=>4};}
   setPixelRatio(){}setSize(){}dispose(){}forceContextLoss(){}
   render(scene,camera){
     renders++;this.scene=scene;latestScene=scene;scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
     let meshCount=0;const geometries=new Set();scene.traverse(o=>{if(o.isMesh){meshCount++;geometries.add(o.geometry);const array=o.geometry.attributes.position?.array;assert.ok(!array||array.every(Number.isFinite));assert.ok(o.position.toArray().every(Number.isFinite));assert.ok(o.scale.toArray().every(Number.isFinite));if(o.isSkinnedMesh){assert.equal(o.geometry.attributes.position.count,13660);assert.equal(o.geometry.index.count,27228*3);const colors=o.geometry.attributes.color;assert.equal(colors.count,13660);assert.ok(colors.array.every(n=>Number.isFinite(n)&&n>=0&&n<=1));assert.ok(colors.array.some(n=>Math.abs(n-.86)>.02));assert.equal(o.material[2].vertexColors,true);o.skeleton.update();assert.ok(o.skeleton.boneMatrices.every(Number.isFinite));const weights=o.geometry.attributes.skinWeight;for(let i=0;i<weights.count;i++)assert.ok(Math.abs(weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i)-1)<.00001);}}});
     assert.ok(meshCount>100);assert.ok(Number.isFinite(camera.projectionMatrix.elements[0]));
     assert.ok(geometries.size<meshCount/3,'footballers share geometry rather than allocating every joint');
   }
 }
 const context=vm.createContext({THREE:{...THREE,WebGLRenderer:Renderer},AuraHumanMesh:require('../assets/models/footballer-mesh.js'),document:{createElement:canvas}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,"..","match-presentation.js"),"utf8"),context);
 vm.runInContext(fs.readFileSync(path.join(__dirname,"..","match-graphics.js"),"utf8"),context);
 const make=id=>({id,name:id,players:Match.SHAPE.map((s,i)=>({id:id+i,name:id+i,pos:s[0],overall:80}))});
 context.game=Match.create({home:make("home"),away:make("away"),seed:48});
 context.container={clientWidth:1280,clientHeight:720,appendChild(){}};
 for(const quality of ["low","medium","high","ultra"]){
   context.quality=quality;
   const point=vm.runInContext('(()=>{const graphics=AuraGraphics.create(container,{quality,stadium:quality==="high"?"day":"night"});let now=100;for(const cam of ["broadcast","tele","wide","tactical","replay","immersive","stadium"]){game.players[9].action="shoot";game.players[9].actionTime=.2;game.players[9].actionDuration=.4;graphics.render(game,cam,now+=100);}const mapped=graphics.mapInput({x:1,z:0});if(Math.abs(Math.hypot(mapped.x,mapped.z)-1)>1e-6)throw Error("Camera axes must retain input strength");for(const action of ["save","parry","dive","smother"]){Object.assign(game.players[11],{action,actionTime:.35,actionDuration:.7,diveSide:-1,saveHeight:action==="dive"?2.7:.3});graphics.render(game,"tele",now+=100);}game.players[9].id="substitute:"+quality;game.players[9].name="Fresh substitute";graphics.render(game,"broadcast",now+100);game.ball.vx=12;game.visualTime=2;graphics.render(game,"broadcast",now+150);const ball=graphics.renderer.scene.getObjectByName("match-ball"),rotation=ball.rotation.z;graphics.render(game,"broadcast",now+200);if(ball.rotation.z!==rotation)throw Error("A paused ball must not keep spinning");const p=graphics.project(game.players[9]);graphics.dispose();return p;})()',context);
   assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.y));
   assert.equal(latestScene.children.filter(o=>o.name.startsWith("player:")).length,22,"substitutions remove the previous actor from the scene");
   assert.equal(latestScene.getObjectsByProperty("isSkinnedMesh",true).length,22);
 }
 assert.equal(renders,56);
});
test('compatible renderer draws finite frames for portrait and landscape, every camera and action, and releases its canvas',()=>{
 let draws=0,removed=0;
 const grad={addColorStop(){}};
 const context2d=new Proxy({createLinearGradient:()=>grad,createRadialGradient:()=>grad,createPattern:()=>({})},{get:(obj,key)=>key in obj?obj[key]:(...args)=>{draws++;for(const value of args)if(typeof value==='number')assert.ok(Number.isFinite(value),key+' received a non-finite coordinate');},set:(obj,key,value)=>{if(typeof value==='number')assert.ok(Number.isFinite(value));obj[key]=value;return true;}});
 const canvas=()=>({width:1,height:1,style:{},getContext:()=>context2d,remove(){removed++;}});
 const context=vm.createContext({document:{createElement:canvas},devicePixelRatio:2,AuraPresentation:require('../match-presentation'),AuraGraphics:{kit:()=>['#e7e7dd','#192844','#efeddd']},AuraHumanSprites:{create:()=>({draw:()=>false,dispose(){}}),assets:()=>({grass:{width:256,height:256},terrace:{width:512,height:256},epoch:1})}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..','software-graphics.js'),'utf8'),context);
 const make=id=>({id,name:id,players:Match.SHAPE.map((s,i)=>({id:id+i,name:id+i,pos:s[0],overall:80}))});
 context.game=Match.create({home:make('home'),away:make('away'),seed:48});
 for(const [w,h] of [[1280,720],[430,844],[844,390]]){
  context.container={clientWidth:w,clientHeight:h,appendChild(){}};
  const point=vm.runInContext(`(()=>{const graphics=AuraSoftwareGraphics.create(container,{quality:'medium'});let now=0;for(const cam of ['broadcast','tele','wide','tactical','replay','immersive','stadium'])for(const action of ['shoot','save','celebrate','tackle','parry','dive','smother']){const p=game.players[['save','parry','dive','smother'].includes(action)?11:9];Object.assign(p,{action,actionTime:.2,actionDuration:.4,diveSide:1,saveHeight:action==='dive'?2.7:.3});graphics.render(game,cam,now+=100);}for(const x of [-53,53])for(const z of [-35,35]){game.ball.x=x;game.ball.z=z;graphics.render(game,'immersive',now+=100);}const p=graphics.project(game.players[9]);graphics.dispose();graphics.render(game,"broadcast",now+200);return p;})()`,context);
  assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.y));
 }
 assert.ok(draws>1000);assert.equal(removed,3);
});
