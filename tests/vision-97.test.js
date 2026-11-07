"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const root=path.resolve(__dirname,"..");
function runtime(){
 const c=vm.createContext({});
 for(const name of ["match-look-96.js","match-presentation-96.js"])
  vm.runInContext(fs.readFileSync(path.join(root,name),"utf8"),c);
 return c;
}
test("Vision 9.7 gives stable seven facial geometries across league player IDs",()=>{
 const c=runtime(),faces=new Set();
 for(const prefix of ["eng","esp","ita","ger","fra","miami"]){
  for(let n=0;n<60;n++){
   const p={id:prefix+":"+n,name:"Player "+n};
   const a=c.AuraPresentation.appearance(p),b=c.AuraPresentation.appearance(p);
   assert.equal(JSON.stringify(a),JSON.stringify(b),"looks must remain stable across frames");
   assert.ok(a.faceShape>=0&&a.faceShape<=6);
   assert.ok(a.hairStyle>=0&&a.hairStyle<=4);
   faces.add(a.faceShape);
  }
 }
 assert.equal(faces.size,7);
});
test("Named profiles distinguish Messi, Lamine and stars without affecting match identity",()=>{
 const c=runtime();
 const messi=c.AuraPresentation.appearance({id:"real:158023",name:"Lionel Andrés Messi"});
 const lamine=c.AuraPresentation.appearance({id:"real:260000",name:"Lamine Yamal"});
 const vinicius=c.AuraPresentation.appearance({id:"real:240000",name:"Vinícius Júnior"});
 assert.equal(messi.faceShape,4);
 assert.equal(messi.beard,true);
 assert.equal(lamine.hairStyle,4);
 assert.notEqual(lamine.faceShape,vinicius.faceShape);
});
test("WebGL 3D geometry uses face variant without altering the animation skeleton",()=>{
 const s=fs.readFileSync(path.join(root,"match-graphics-96.js"),"utf8");
 assert.match(s,/humanGeometry\(look\.hairStyle,look\.faceShape\|\|0\)/);
 assert.match(s,/anatomical-human:'\+style\+':'\+faceShape/);
 assert.match(s,/const bones=boneDefs\.map/);
});
