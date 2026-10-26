"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const THREE=require("../vendor/three.min.js"),Match=require("../match-engine");
test("WebGL scene construction produces finite stadium and player geometry in all three quality settings",()=>{
 const context2d={fillRect(){},fillText(){}};
 const canvas=()=>({width:1,height:1,getContext:()=>context2d,setAttribute(){},remove(){}});
 let renders=0;
 class Renderer{
   constructor(){this.domElement=canvas();this.shadowMap={};this.capabilities={getMaxAnisotropy:()=>4};}
   setPixelRatio(){}setSize(){}dispose(){}forceContextLoss(){}
   render(scene,camera){
     renders++;scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
     let meshCount=0;scene.traverse(o=>{if(o.isMesh){meshCount++;const array=o.geometry.attributes.position?.array;assert.ok(!array||array.every(Number.isFinite));assert.ok(o.position.toArray().every(Number.isFinite));}});
     assert.ok(meshCount>100);assert.ok(Number.isFinite(camera.projectionMatrix.elements[0]));
   }
 }
 const context=vm.createContext({THREE:{...THREE,WebGLRenderer:Renderer},document:{createElement:canvas}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,"..","match-graphics.js"),"utf8"),context);
 const make=id=>({id,name:id,players:Match.SHAPE.map((s,i)=>({id:id+i,name:id+i,pos:s[0],overall:80}))});
 context.game=Match.create({home:make("home"),away:make("away"),seed:48});
 context.container={clientWidth:1280,clientHeight:720,appendChild(){}};
 for(const quality of ["low","medium","high"]){
   context.quality=quality;
   const point=vm.runInContext('(()=>{const graphics=AuraGraphics.create(container,{quality,stadium:quality==="high"?"day":"night"});graphics.render(game,"broadcast",100);const p=graphics.project(game.players[9]);graphics.dispose();return p;})()',context);
   assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.y));
 }
 assert.equal(renders,3);
});
