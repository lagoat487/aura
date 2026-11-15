'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const N=require('../arena-next-100'),model=require('../assets/models/arena-100'),T=require('../vendor/three.min'),Match=require('../match-engine');
test('the Blender arena is a finite, complete mesh and leaves the playing surface clear',()=>{
 assert.equal(model.source,'Blender 4.3');assert.equal(model.positions.length,model.normals.length);assert.ok(model.indices.length/3>10000);
 assert.equal(model.groups.reduce((n,g)=>n+g[1],0),model.indices.length);
 assert.ok(model.indices.every(i=>i<model.positions.length/3));assert.ok(model.positions.every(Number.isFinite));assert.ok(model.normals.every(Number.isFinite));
 for(let i=0;i<model.positions.length;i+=3){const [x,y,z]=model.positions.slice(i,i+3);assert.ok(y>=0);assert.ok(Math.abs(x)>53||Math.abs(z)>35,'stadium geometry must not intrude onto the pitch');}
});
test('the M5 rendering budget caps pixels on Retina and 4K displays and the close cameras remain finite at corners',()=>{
 for(const [w,h] of [[1470,956],[2560,1600],[3840,2160],[7680,4320]])for(const quality of ['high','ultra']){const ratio=N.budget(quality,w,h,2);assert.ok(w*h*ratio*ratio<=(quality==='high'?2400000:3600000)+.01);}
 for(const half of [1,2])for(const x of [-53,0,53])for(const z of [-35,0,35])for(const aspect of [.45,1,1.78,3])for(const mode of ['stadium','broadcast','tele']){const frame=N.cameraFrame({ball:{x,z,vx:20},half},mode,aspect,false);assert.ok([...frame.position,...frame.target,frame.fov].every(Number.isFinite));assert.ok(frame.position[1]>7);}
 assert.equal(N.cameraFrame({},'tactical',1.78,false),null);assert.equal(N.cameraFrame({},'stadium',1.78,true),null);
});
test('the active renderer builds Arena Next, 22 animated humans and four floodlights, then disposes the scene',()=>{
 const grad={addColorStop(){}};const ctx=new Proxy({createLinearGradient:()=>grad,createRadialGradient:()=>grad},{get:(o,k)=>k in o?o[k]:()=>{}});
 const canvas=()=>({width:1,height:1,getContext:()=>ctx,setAttribute(){},remove(){}});let latest,disposed=0;
 class Renderer{constructor(){this.domElement=canvas();this.shadowMap={};this.capabilities={getMaxAnisotropy:()=>4};}setPixelRatio(){}setSize(){}render(s,c){latest=s;s.updateMatrixWorld(true);c.updateMatrixWorld(true);}dispose(){disposed++;}forceContextLoss(){}}
 const c=vm.createContext({THREE:{...T,WebGLRenderer:Renderer},AuraNext:N,AuraArenaMesh100:model,AuraHumanMesh:require('../assets/models/footballer-mesh'),document:{createElement:canvas}});
 for(const file of ['arena-next-100.js','match-look-99.js','match-presentation-96.js','match-graphics-99.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),c);
 const team=id=>({id,name:id,players:Match.SHAPE.map((p,i)=>({id:id+i,name:id+i,pos:p[0],overall:80}))});c.game=Match.create({home:team('a'),away:team('b'),seed:10});c.container={clientWidth:1470,clientHeight:956,appendChild(){}};
 vm.runInContext("g=AuraGraphics.create(container,{quality:'high',stadium:'sunset'});g.render(game,'stadium',100)",c);
 assert.ok(latest.getObjectByName('arena-next-blender'));assert.equal(latest.getObjectsByProperty('name','arena-next-floodlight').length,4);assert.equal(latest.getObjectsByProperty('isSkinnedMesh',true).length,22);
 for(const body of latest.getObjectsByProperty('isSkinnedMesh',true)){assert.equal(body.skeleton.bones[4].scale.x,1.08);body.skeleton.update();assert.ok(body.skeleton.boneMatrices.every(Number.isFinite));}
 vm.runInContext('g.dispose()',c);assert.equal(disposed,1);
});
