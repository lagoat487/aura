'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const Masks=require('../match-face-masks-99'),Match=require('../match-engine'),THREE=require('../vendor/three.min'),root=path.resolve(__dirname,'..');
const canvas=()=>({width:1,height:1,getContext:()=>new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:()=>{}}),setAttribute(){},remove(){}});
test('all numeric catalogue identities can use their own portrait and created players never borrow a famous face',()=>{
 const c=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,'data/world-rosters.js'),'utf8'),c);
 const ids=new Set(c.AuraBundledWorld.rows.map(r=>r[0]));let count=0;
 for(const id of ids){const d=Masks.resolve({id:'real:'+id});assert.equal(d.id,id);assert.ok(d.sources.some(url=>url.includes('/p'+id+'.png')));count++;}
 assert.ok(count>1000);
 assert.equal(Masks.resolve({id:'academy:1',name:'Lamine Yamal'}),null);
 assert.equal(Masks.resolve({id:'real:999999',name:'Lionel Messi'}).id,'999999');
 assert.equal(Masks.resolve({id:'magia:edition',originalId:'real:251854',name:'Saved edition'}).id,'251854');
 assert.ok(Masks.resolve({id:'real:277643',name:'Lamine Yamal'}).sources[0].endsWith('/lamine-reference-99.png'));
});
test('the reference cutout is a valid transparent PNG and the decal preserves its original photographic composition',()=>{
 const png=fs.readFileSync(path.join(root,'assets/faces/lamine-reference-99.png'));
 assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(png.readUInt32BE(16),173);assert.equal(png.readUInt32BE(20),193);assert.equal(png[25],6);
 const calls=[];const context={clearRect(){},drawImage(...args){calls.push(args);}};
 const out=Masks.prepare({width:173,height:193},(w,h)=>({width:w,height:h,getContext:()=>context}),true);
 assert.equal(calls.length,1);assert.deepEqual(calls[0].slice(1),[0,0,173,193,0,0,256,320]);assert.equal(out.height,320);
});
test('photo loading falls through unavailable providers, shares identities, and stops updating a disposed match',()=>{
 const images=[];class Image{constructor(){images.push(this);this.width=180;this.height=180;}set src(v){this.url=v;}}
 const library=Masks.create(canvas,Image);let changed=0;const a=library.get({id:'real:251854'},()=>changed++);
 assert.equal(images.length,1);assert.equal(images[0].crossOrigin,'anonymous');images[0].onerror();assert.equal(images.length,2);
 assert.ok(images[1].url.includes('sofifa'));images[1].onload();assert.equal(a.ready,true);assert.equal(changed,1);
 assert.equal(library.get({id:'barcelona:event',originalId:'real:251854'}),a);
 library.get({id:'real:230621'},()=>changed++);library.dispose();images.at(-1).onload();assert.equal(changed,1);assert.equal(library.get({id:'real:251854'}),null);
});
test('match kickoff and substitutions preserve portrait metadata and clear the previous player identity',()=>{
 const club={id:'home',players:Match.SHAPE.map((s,i)=>({id:'real:'+String(200000+i),name:'Player '+i,pos:s[0],overall:80,real:true,originalId:'real:'+String(200000+i),photo:'portrait:'+i})),bench:[{id:'special:pedri',name:'Pedri',originalId:'real:251854',photo:'pedri-photo',real:true,pos:'MC',overall:89},{id:'academy:fresh',name:'Canterano',pos:'MC',overall:70}]};
 const game=Match.create({home:club,away:{...club,id:'away'},seed:1});assert.equal(game.players[6].originalId,'real:200006');assert.equal(game.players[6].photo,'portrait:6');assert.equal(game.players[6].real,true);
 game.paused=true;assert.equal(Match.substitute(game,6,club.bench[0]),true);assert.equal(game.players[6].originalId,'real:251854');assert.equal(game.players[6].photo,'pedri-photo');
 assert.equal(Match.substitute(game,6,club.bench[1]),true);assert.equal(game.players[6].originalId,null);assert.equal(game.players[6].photo,null);assert.equal(game.players[6].real,false);
});
test('all 22 live heads are 40 percent larger and portrait masks attach to the head bone for ordinary players too',()=>{
 let scene;class Renderer{constructor(){this.domElement=canvas();this.shadowMap={};this.capabilities={getMaxAnisotropy:()=>4};}setPixelRatio(){}setSize(){}dispose(){}forceContextLoss(){}render(s){scene=s;s.updateMatrixWorld(true);}}
 const images=[];class Image{constructor(){images.push(this);this.width=180;this.height=180;}set src(v){this.url=v;}}
 const c=vm.createContext({Image,THREE:{...THREE,WebGLRenderer:Renderer},document:{createElement:canvas},AuraFaces:require('../match-faces-98'),AuraFaceMasks:Masks,AuraHumanMesh:require('../assets/models/footballer-mesh')});
 for(const file of ['match-look-99.js','match-presentation-96.js','match-graphics-99.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c);
 const club={id:'home',players:Match.SHAPE.map((s,i)=>({id:'real:'+String(200000+i),name:'Player '+i,pos:s[0],overall:80,real:true}))};c.game=Match.create({home:club,away:{...club,id:'away'},seed:4});c.game.players.forEach(p=>{p.faceX=0;p.faceZ=1;p.x=0;p.z=0;});c.container={clientWidth:900,clientHeight:600,appendChild(){}};
 vm.runInContext("g=AuraGraphics.create(container,{quality:'low'});g.render(game,'broadcast',100)",c);
 const bodies=scene.getObjectsByProperty('isSkinnedMesh',true);assert.equal(bodies.length,22);
 for(const body of bodies){assert.equal(body.skeleton.bones[4].scale.x,1.4);assert.equal(body.skeleton.bones[3].scale.x,1);assert.equal(body.skeleton.bones[5].scale.x,1);assert.ok(body.skeleton.bones[4].children.some(o=>o.name.startsWith('photo-face-mask:')));body.skeleton.update();assert.ok(body.skeleton.boneMatrices.every(Number.isFinite));}
 for(const image of images)if(image.url.includes('/players/')||image.url.includes('/assets/faces/'))image.onload?.();
 vm.runInContext("g.render(game,'broadcast',200)",c);
 for(const body of bodies){assert.ok(body.geometry.groups.some(g=>g.materialIndex===9));assert.equal(body.material[9].visible,false,'the generic head must not remain behind a loaded frontal photograph');const mask=body.skeleton.bones[4].children.find(o=>o.name.startsWith('photo-face-mask:'));assert.equal(mask.material.visible,true);}
 c.game.players.forEach(p=>{p.faceX=0;p.faceZ=-1;});
 vm.runInContext("g.render(game,'broadcast',300);g.render(game,'broadcast',400);g.render(game,'broadcast',500)",c);
 for(const body of bodies){assert.equal(body.material[9].visible,true);const mask=body.skeleton.bones[4].children.find(o=>o.name.startsWith('photo-face-mask:'));assert.equal(mask.material.visible,false,'the photograph must disappear when the player turns away');}
 vm.runInContext('g.dispose()',c);
});
test('compatible masks follow every pose and viewing direction and are hidden from the back',()=>{
 const layout=require('../assets/models/head-mask-layout-99');assert.equal(layout.scale,1.4);assert.equal(layout.frames.length,22*16);
 const entry={ready:true,canvas:{}};let draws=0;const ctx=new Proxy({drawImage(){draws++;}},{get:(o,k)=>k in o?o[k]:()=>{}});
 for(let pose=0;pose<22;pose++)for(let angle=0;angle<16;angle++){const frame=layout.frames[pose*16+angle];assert.ok([...frame.pivot,...frame.quad,frame.front].every(Number.isFinite));assert.equal(Masks.draw(ctx,entry,frame.quad,frame.front),frame.front>.10);if(angle===8)assert.ok(frame.front<0);}
 assert.ok(draws>100);assert.equal(Masks.draw(ctx,entry,[0,0,1,0,1,1,0,1],-1),false);
 for(let page=0;page<4;page++){const png=fs.readFileSync(path.join(root,'assets/models/human-head-mask-99-'+page+'.png'));assert.equal(png.readUInt32BE(16),1024);assert.equal(png.readUInt32BE(20),96*Math.min(6,22-page*6));}
});
