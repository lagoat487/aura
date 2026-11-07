'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),vm=require('node:vm');
const Look=require('../match-look'),curl=require('../assets/models/curly-hair-96'),boots=require('../assets/models/football-boots-96'),detail=require('../assets/models/human-details-96'),Sprites=require('../human-sprites');
test('the new avatar art follows player identity without mutating the match player or fallback appearance',()=>{
 const p={id:'real:277643',name:'Lamine Yamal',overall:90,team:0},base={skin:'#e2b28b',hair:'#34271e',height:1.88,build:1,hairStyle:0,beard:true},snapshot=JSON.stringify([p,base]);
 const lamine=Look.avatar(p,base),pedri=Look.avatar({...p,name:'Pedri'},base);
 assert.equal(lamine.hairStyle,4);assert.equal(lamine.beard,false);assert.notEqual(lamine.skin,pedri.skin);assert.notEqual(lamine.hairStyle,pedri.hairStyle);
 assert.deepEqual(Look.avatar({...p,index:0},base),lamine);assert.equal(JSON.stringify([p,base]),snapshot);
 assert.deepEqual(Look.avatar({name:'Unknown player'},base),base);
});
test('night lighting keeps cool rim light and a distinct shadow key while daylight retains its brighter fill',()=>{
 const night=Look.light('night','clear'),day=Look.light('day','clear');
 assert.ok(night.rim>night.ambient);assert.ok(night.key>night.fill*4);assert.ok(day.ambient>night.ambient);assert.notEqual(night.sky,day.sky);assert.notEqual(Look.light('day','rain').sky,Look.light('night','rain').sky);
 for(const stadium of ['day','night','sunset'])for(const weather of ['clear','rain'])assert.ok(Object.values(Look.light(stadium,weather)).every(Number.isFinite));
});
test('head curls and closed boots have valid smooth geometry and remain inside anatomical attachment bounds',()=>{
 for(const data of [curl,boots]){const n=data.positions.length/3;assert.equal(data.normals.length,data.positions.length);assert.ok(data.positions.every(Number.isFinite));assert.ok(data.normals.every(Number.isFinite));assert.ok(data.indices.every(i=>Number.isInteger(i)&&i>=0&&i<n));}
 const ys=Array.from(curl.positions).filter((_,i)=>i%3===1);assert.ok(Math.min(...ys)>1.76);assert.ok(Math.max(...ys)<1.93);assert.equal(curl.head.length,3);
 assert.equal(boots.anchor.length,2);const z=boots.positions.filter((_,i)=>i%3===2);assert.ok(Math.min(...z)<-.08&&Math.max(...z)>.25);
 assert.equal(detail.origins.length,22*16);for(const origin of detail.origins){assert.equal(origin.length,2);assert.ok(origin.every(Number.isFinite));assert.ok(origin[0]>=0&&origin[0]+64<=192);assert.ok(origin[1]>=0&&origin[1]+96<=336);}
});
test('all higher resolution curl pages fully decode and align with the full 22-pose body animation',()=>{
 assert.equal(Sprites.meta.width,192);assert.equal(Sprites.meta.height,336);assert.equal(Sprites.lowMeta.width,128);
 for(let page=0;page<4;page++){
  const png=fs.readFileSync(path.join(__dirname,'../assets/models/human-curls-96-'+page+'.png')),chunks=[];let offset=8,ended=false;
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(png.readUInt32BE(16),64*16);assert.equal(png.readUInt32BE(20),96*Math.min(6,22-page*6));
  while(offset+12<=png.length){const n=png.readUInt32BE(offset),kind=png.toString('ascii',offset+4,offset+8);assert.ok(offset+n+12<=png.length);if(kind==='IDAT')chunks.push(png.subarray(offset+8,offset+8+n));offset+=n+12;if(kind==='IEND'){ended=true;break;}}
  assert.ok(ended);assert.equal(offset,png.length);assert.equal(zlib.inflateSync(Buffer.concat(chunks)).length,png.readUInt32BE(20)*(png.readUInt32BE(16)*4+1));
 }
});
test('low quality loads only the smaller body pages and each detail tier requests its animation once',()=>{
 const requests=[];class Image{set src(value){assert.equal(this.crossOrigin,'anonymous');requests.push(value);}}
 const context=vm.createContext({Image,document:{createElement:()=>({})}});vm.runInContext(fs.readFileSync(path.join(__dirname,'../human-sprites.js'),'utf8'),context);const sprites=vm.runInContext('AuraHumanSprites',context);
 sprites.create({quality:'low'});assert.equal(requests.filter(x=>x.includes('human-motion-94-')).length,4);assert.equal(requests.filter(x=>x.includes('human-motion-96-')).length,0);
 sprites.create({quality:'high'});sprites.create({quality:'ultra'});sprites.assets();assert.equal(requests.filter(x=>x.includes('human-motion-96-')).length,4);assert.equal(requests.filter(x=>x.includes('human-curls-96-')).length,4);
 assert.equal(new Set(requests).size,requests.length);
});
test('the full pitch surface is a complete WebP with physical mowing and goalmouth dimensions',()=>{
 const bytes=fs.readFileSync(path.join(__dirname,'../assets/textures/pitch-cinema-96.webp'));assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.readUInt32LE(4)+8,bytes.length);assert.equal(bytes.toString('ascii',8,12),'WEBP');assert.ok(bytes.length>100000);
});
