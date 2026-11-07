'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const M=require('../match-materials'),landmarks=require('../assets/models/jersey-landmarks-95');

test('club shirt designs retain contrasting sleeves, bands and sashes without applying them to keeper or alternate kits',()=>{
 for(const [name,expected] of [['Barcelona','stripes'],['Argentina','stripes'],['Boca Juniors','band'],['River Plate','sash'],['Perú','sash'],['Arsenal','sleeves'],['Real Madrid','plain']]){
  assert.equal(M.design({name}),expected);assert.equal(M.design({name},true),'plain');assert.equal(M.design({name},false,true),'plain');
 }
});

test('projected shirt coordinates cover every animation and retain readable UV orientation on front and back',()=>{
 assert.equal(landmarks.poses,22);assert.equal(landmarks.directions,16);assert.equal(landmarks.quads.length,22*16);
 let mapped=0;
 for(const quad of landmarks.quads){
  assert.equal(quad.length,16);assert.ok(quad.every(Number.isFinite));
  for(const offset of [0,8]){
   const q=quad.slice(offset,offset+8),map=M.shirtMapper(q),out=[];
   // An interior point of each triangle must map to its original texture coordinates.
   for(const [vertices,expected] of [[[0,1,2],[2/3,1/3]],[[0,2,3],[1/3,2/3]]]){
    const x=vertices.reduce((s,n)=>s+q[n*2]/3,0),y=vertices.reduce((s,n)=>s+q[n*2+1]/3,0);
    if(M.shirtUV(map,x,y,out)){mapped++;assert.ok(Math.abs(out[0]-expected[0])<1e-5);assert.ok(Math.abs(out[1]-expected[1])<1e-5);}
   }
  }
 }
 assert.ok(mapped>1200,'all non-edge-on poses preserve their shirt coordinates');
 const out=[];assert.equal(M.shirtUV(M.shirtMapper([0,0,1,0,2,0,3,0]),1,0,out),false);
 assert.equal(M.shirtUV(M.shirtMapper([0,0,10,0,10,20,0,20]),-1,10,out),false);
 assert.equal(M.shirtMapper([0,0,10,0,0,10,10,10]),null,'folded side-on panels fall back instead of mirroring the lettering');
 assert.equal(M.shirtMapper([NaN,0,1,0,1,1,0,1]),null);
});

test('jersey wrap places an intact front and joins both halves of the back across the UV seam',()=>{
 const draws=[],front={},back={},target={width:256,height:256,getContext:()=>({drawImage:(...args)=>draws.push(args)})};
 M.wrapJersey({front,back,size:128},target);
 assert.deepEqual(draws,[[front,0,0,128,128,64,0,128,256],[back,0,0,64,128,192,0,64,256],[back,64,0,64,128,0,0,64,256]]);
});

test('ball panels roll with velocity, freeze while paused and remain finite across replay clock changes',()=>{
 const ball={vx:9,vz:-4.5},first=M.ballSpin(null,ball,1),moving=M.ballSpin(first,ball,1.1);
 assert.ok(Math.abs(moving.z+5)<1e-10);assert.ok(Math.abs(moving.x+2.5)<1e-10);
 assert.deepEqual(M.ballSpin(moving,ball,1.1),moving);
 assert.deepEqual(M.ballSpin(moving,{vx:0,vz:0},2),{...moving,time:2});
 const replay=M.ballSpin(moving,ball,0);assert.ok(Object.values(replay).every(Number.isFinite));assert.ok(Math.abs(replay.z-moving.z)<=6.001);
 assert.ok(Object.values(M.ballSpin(null,{vx:NaN,vz:Infinity},NaN)).every(Number.isFinite));
});

test('airborne balls cast broader lighter shadows and player shadows follow the stadium light direction',()=>{
 const low=M.ballShadow(.18),high=M.ballShadow(5);
 assert.ok(high.spread>low.spread);assert.ok(high.opacity<low.opacity);assert.deepEqual(M.ballShadow(-3),low);
 const day=M.shadowVector('day',1.8),night=M.shadowVector('night',1.8);
 assert.ok(day.x>0&&day.z<0);assert.ok(night.x>0&&night.z>0);assert.ok(day.opacity>night.opacity);
 assert.equal(M.shadowVector('day',.9).x,day.x/2);
});

test('ball color, seam and animation textures have complete decodable PNG scanlines',()=>{
 for(const [name,width,height,channels] of [['ball-albedo-95.png',512,256,3],['ball-seams-95.png',512,256,1],['ball-motion-95.png',1536,128,4]]){
  const png=fs.readFileSync(path.join(__dirname,'../assets/textures',name));
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(png.readUInt32BE(16),width);assert.equal(png.readUInt32BE(20),height);
  const chunks=[];let offset=8,ended=false;
  while(offset+12<=png.length){const n=png.readUInt32BE(offset),kind=png.toString('ascii',offset+4,offset+8);assert.ok(offset+n+12<=png.length);if(kind==='IDAT')chunks.push(png.subarray(offset+8,offset+8+n));offset+=n+12;if(kind==='IEND'){ended=true;break;}}
  assert.ok(ended);assert.equal(offset,png.length);assert.equal(zlib.inflateSync(Buffer.concat(chunks)).length,height*(width*channels+1));
 }
});
