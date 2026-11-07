'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const mesh=require('../assets/models/footballer-mesh.js'),sprites=require('../human-sprites.js');
test('anatomical player mesh has complete normalized skinning, valid indices and a finite connected skeleton',()=>{
 assert.equal(mesh.vertexCount,13660);assert.equal(mesh.triangleCount,27228);
 assert.equal(mesh.positions.length,mesh.vertexCount*3);assert.equal(mesh.normals.length,mesh.positions.length);assert.equal(mesh.uv.length,mesh.vertexCount*2);
 assert.ok(mesh.positions.every(Number.isFinite));assert.ok(mesh.normals.every(Number.isFinite));
 assert.ok(mesh.indices.every(i=>Number.isInteger(i)&&i>=0&&i<mesh.vertexCount));
 for(let i=0;i<mesh.vertexCount;i++){
  const weights=mesh.skinWeights.slice(i*4,i*4+4),bones=mesh.skinIndices.slice(i*4,i*4+4);
  assert.ok(Math.abs(weights.reduce((a,b)=>a+b,0)-1)<1e-5);assert.ok(bones.every(n=>n<17));
 }
 assert.equal(mesh.bones.length,17);mesh.bones.forEach(([parent,...xyz],i)=>{assert.ok(parent<i);assert.ok(xyz.every(Number.isFinite));});
 assert.equal(mesh.groups.reduce((n,g)=>n+g[1],0),mesh.indices.length);
 for(let page=0;page<sprites.meta.pages;page++){
  const png=fs.readFileSync(path.join(__dirname,'../assets/models/human-motion-94-'+page+'.png'));
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  const chunks=[];let offset=8,ended=false;
  while(offset+12<=png.length){
   const length=png.readUInt32BE(offset),kind=png.toString('ascii',offset+4,offset+8);
   assert.ok(offset+length+12<=png.length,'the entire PNG chunk, including its checksum, must be present');
   if(kind==='IDAT')chunks.push(png.subarray(offset+8,offset+8+length));
   offset+=length+12;if(kind==='IEND'){ended=true;break;}
  }
  assert.ok(ended,'the atlas must have a complete end marker');assert.equal(offset,png.length);
  const decoded=require('node:zlib').inflateSync(Buffer.concat(chunks));
  assert.equal(decoded.length,png.readUInt32BE(20)*(png.readUInt32BE(16)*4+1),'every RGBA scanline must decode completely');
  assert.equal(png.readUInt32BE(16),sprites.meta.width*sprites.meta.directions);
  assert.equal(png.readUInt32BE(20),sprites.meta.height*Math.min(sprites.meta.rows,sprites.meta.poses-page*sprites.meta.rows));
 }
 assert.equal(sprites.meta.poses,22);
});
test('compatible human animations choose bounded orientations and distinguish running, kicking and keeping',()=>{
 const p={x:0,z:0,faceX:0,faceZ:1,run:0},pose={speed:0,save:0,kick:0,celebrate:0};
 assert.equal(sprites.frame(p,pose),0);
 for(let t=-100;t<100;t+=.37){const n=sprites.frame({...p,run:t},{...pose,speed:1});assert.ok(n>=1&&n<=12);}
 assert.equal(sprites.frame(p,{...pose,tackle:.8}),18);assert.equal(sprites.frame({...p,action:'smother'},{...pose,save:.8}),19);assert.equal(sprites.frame(p,{...pose,save:.8,highSave:1}),20);assert.equal(sprites.frame(p,{...pose,control:.8}),21);
 assert.equal(sprites.frame(p,{...pose,kick:.9}),14);assert.equal(sprites.frame(p,{...pose,save:.8,dive:0}),15);assert.equal(sprites.frame(p,{...pose,save:.8,dive:1}),16);assert.equal(sprites.frame(p,{...pose,celebrate:1}),17);
 for(let a=-Math.PI*4;a<Math.PI*4;a+=.17){const d=sprites.direction(p,[Math.sin(a)*30,20,Math.cos(a)*30]);assert.ok(d>=0&&d<16);}
});
test('compatible sprites recolour the actual atlas and bound their cache across player changes',()=>{
 const pixels=new Uint8ClampedArray(128*16*224*6*4);for(let i=0;i<pixels.length;i+=4){pixels[i]=1;pixels[i+1]=205;pixels[i+3]=255;}
 const context2d={drawImage(){},getImageData:()=>({data:pixels}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(image){this.last=image;}};
 const canvas=()=>{const ctx={...context2d};return {width:1,height:1,getContext:()=>ctx};};
 class FakeImage{constructor(){this.width=128*16;this.height=224*6;}set src(v){this.onload();}}
 const context=vm.createContext({Image:FakeImage,document:{createElement:canvas}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../human-sprites.js'),'utf8'),context);
 const factory=vm.runInContext('AuraHumanSprites',context),s=factory.create({quality:'low',home:{id:'home'},away:{id:'away'},kits:[['#ee2233','#122244','#eeddcc'],['#eeeeee','#ddddee','#333344']]});
 let draw=0;const ctx={drawImage(image,...coords){draw++;assert.ok(coords.every(Number.isFinite));const data=image.getContext('2d').last;if(data)assert.ok(data.data[0]>data.data[1]);}},p={index:1,team:0,x:0,z:0,faceX:0,faceZ:1},pose={speed:0,save:0,kick:0,celebrate:0,jump:0,saveLift:0,crouch:0};
 for(let i=0;i<80;i++)assert.equal(s.draw(ctx,p,pose,{skin:'#'+(0x809080+i).toString(16),hair:'#222222',height:1.8,build:1},[0,20,40],{x:200,y:300,scale:25}),true);
 assert.equal(draw,80);assert.equal(s.cacheSize,64);s.dispose();assert.equal(s.cacheSize,0);assert.equal(s.draw(ctx,p,pose,{},[0,20,40],{x:0,y:0,scale:1}),false);
});
