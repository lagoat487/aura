'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const F=require('../match-faces-98'),THREE=require('../vendor/three.min'),mesh=require('../assets/models/footballer-mesh');
const root=path.resolve(__dirname,'..');
test('star identities survive event IDs, transfers, accented and shortened names without matching other footballers',()=>{
 for(const [name,key] of [['Lamine Yamal','lamine'],['Lamine Yamal Yamal','lamine'],['Lionel Andrés Messi','messi'],['Vinícius Júnior','vinicius'],['Kylian Mbappé','mbappe'],['Erling Braut Haaland','haaland']]){
  assert.equal(F.resolve({name}),key);
  assert.equal(F.resolve({id:'magia:star',originalId:'real:'+F.profile(key).id,name:'Saved edition'}),key);
 }
 for(const name of ['Junior Messias','Abner Vinícius','Vinícius Lopes','Lamine Camara','Messi Academy'])assert.equal(F.resolve({name}),null);
 assert.equal(F.resolve({id:'real:999999',name:'Lionel Messi'}),null,'a mismatched numeric identity cannot borrow a photograph');
 assert.equal(F.appearance({id:'real:277643'}).hairTop,'#dcb57b');
});
test('dedicated head morphs are finite, leave neck/limbs fixed, and retain the source mesh',()=>{
 const original=new Float32Array(mesh.positions);const shapes=new Set();
 for(const key of F.keys){
  let changed=0,maxDelta=0;
  for(let i=0;i<mesh.positions.length;i+=3){const p=Array.from(mesh.positions.slice(i,i+3)),q=F.morph(...p,key);assert.ok(q.every(Number.isFinite));
   if(p[1]<1.59)assert.deepEqual(q,p);
   const delta=Math.hypot(...q.map((n,j)=>n-p[j]));maxDelta=Math.max(maxDelta,delta);if(delta>1e-7)changed++;
  }
  assert.ok(changed>100);assert.ok(maxDelta<.03);shapes.add(JSON.stringify(F.morph(.045,1.68,.15,key)));
 }
 assert.equal(shapes.size,5);assert.deepEqual(mesh.positions,original);
});
test('all local portraits match their recorded identities and content hashes',()=>{
 const {sources}=JSON.parse(fs.readFileSync(path.join(root,'assets/faces/sources.json'),'utf8'));
 assert.equal(sources.length,5);
 for(const s of sources){const data=fs.readFileSync(path.join(root,'assets/faces',s.file));assert.equal(s.player_id,F.profile(s.key).id);assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(crypto.createHash('sha256').update(data).digest('hex'),s.sha256);assert.ok(data.readUInt32BE(16)>=128);}
});
test('face loads are cached, failed images remain usable, and pending loads cannot mutate a disposed match',()=>{
 const images=[];class FakeImage{constructor(){images.push(this);}set src(v){this.url=v;}}
 const canvas=(w,h)=>({width:w,height:h,getContext:()=>({fillRect(){},drawImage(){},getImageData:()=>({data:new Uint8ClampedArray(w*h*4).fill(128)}),createImageData:()=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})});
 const library=F.create(canvas,FakeImage);let changed=0;
 const a=library.get('messi',()=>changed++);assert.equal(library.get('messi'),a);assert.equal(images.length,1);assert.equal(images[0].crossOrigin,'anonymous');assert.ok(images[0].url.endsWith('/messi-fc27.png'));
 images[0].width=180;images[0].height=180;images[0].onload();assert.equal(changed,1);assert.equal(a.ready,true);assert.equal(a.pixels.length,256*256*4);
 const b=library.get('lamine');images[1].onerror();assert.equal(b.failed,true);assert.ok(b.canvas);
 library.get('haaland',()=>changed++);library.dispose();images[2].onload();assert.equal(changed,1);assert.equal(library.get('messi'),null);
});
test('the production WebGL rig applies photo materials to the head, shares resources, and retains animation after substitution',()=>{
 const grad={addColorStop(){}};const ctx=new Proxy({createLinearGradient:()=>grad,createRadialGradient:()=>grad},{get:(o,k)=>k in o?o[k]:()=>{}});
 const canvas=()=>({width:1,height:1,getContext:()=>ctx,setAttribute(){},remove(){}});
 let scene=null;class Renderer{constructor(){this.domElement=canvas();this.shadowMap={};this.capabilities={getMaxAnisotropy:()=>4};}setPixelRatio(){}setSize(){}dispose(){}forceContextLoss(){}render(s){scene=s;s.updateMatrixWorld(true);}}
 class FakeImage{set src(v){this.url=v;}}
 const c=vm.createContext({THREE:{...THREE,WebGLRenderer:Renderer},Image:FakeImage,document:{createElement:canvas},AuraFaces:F,AuraHumanMesh:mesh,AuraCurlMesh:require('../assets/models/curly-hair-96'),AuraBootMesh:require('../assets/models/football-boots-96')});
 for(const file of ['match-look-98.js','match-presentation-96.js','match-graphics-98.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c);
 const Match=require('../match-engine');const club={id:'barcelona',players:Match.SHAPE.map((p,i)=>({id:'generic:'+i,name:'Player '+i,pos:p[0],overall:80}))};
 const game=Match.create({home:club,away:{...club,id:'away'},seed:8});
 const stars=F.keys.map((key,i)=>({i:i+1,id:'real:'+F.profile(key).id,name:F.profile(key).names[0]}));
 for(const p of stars)Object.assign(game.players[p.i],p);
 c.container={clientWidth:900,clientHeight:600,appendChild(){}};c.game=game;
 vm.runInContext("graphics=AuraGraphics.create(container,{quality:'medium'});graphics.render(game,'broadcast',100)",c);
 for(const {id} of stars){const actor=scene.getObjectByName('player:'+id),body=actor.children.find(o=>o.isSkinnedMesh);
  assert.ok(body.geometry.groups.some(g=>g.materialIndex===9));assert.equal(body.material[9].name,'portrait-face:'+F.resolve({id}));assert.equal(body.material[9].map.flipY,false);
  assert.equal(body.skeleton.bones.length,17);assert.equal(body.geometry.index.count,mesh.indices.length);body.skeleton.update();assert.ok(body.skeleton.boneMatrices.every(Number.isFinite));
  assert.ok(body.geometry.attributes.normal.array.every(Number.isFinite));
 }
 const before=scene.getObjectByName('player:real:277643').children.find(o=>o.isSkinnedMesh).material[9];
 Object.assign(game.players[1],{id:'barcelona:lamine-special',originalId:'real:277643'});
 vm.runInContext("graphics.render(game,'broadcast',200)",c);
 assert.equal(scene.getObjectByName('player:real:277643'),undefined);
 const replacement=scene.getObjectByName('player:barcelona:lamine-special').children.find(o=>o.isSkinnedMesh);assert.equal(replacement.material[9],before);
 vm.runInContext('graphics.dispose()',c);
});
test('compatible UV pages cover every animation/direction with valid bounded pixels',()=>{
 const zlib=require('node:zlib');
 for(let page=0;page<4;page++){
  const data=fs.readFileSync(path.join(root,'assets/models/human-face-uv-98-'+page+'.png'));
  assert.equal(data.readUInt32BE(16),64*16);assert.equal(data.readUInt32BE(20),96*Math.min(6,22-page*6));
  const chunks=[];for(let at=8;at<data.length;){const n=data.readUInt32BE(at);if(data.toString('ascii',at+4,at+8)==='IDAT')chunks.push(data.subarray(at+8,at+8+n));at+=n+12;}
  assert.equal(zlib.inflateSync(Buffer.concat(chunks)).length,data.readUInt32BE(20)*(data.readUInt32BE(16)*4+1));
 }
});
