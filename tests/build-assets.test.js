"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),os=require("node:os"),cp=require("node:child_process");
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"aura-build-"));
 fs.mkdirSync(path.join(root,"scripts"));fs.mkdirSync(path.join(root,"vendor"));
 fs.copyFileSync(path.join(__dirname,"..","scripts","build.cjs"),path.join(root,"scripts","build.cjs"));
 fs.writeFileSync(path.join(root,"mobile.html"),"<!doctype html>");fs.writeFileSync(path.join(root,"vendor","THREE-LICENSE.txt"),"License");
 return root;
}
const build=root=>cp.spawnSync(process.execPath,[path.join(root,"scripts","build.cjs")],{encoding:"utf8"});
test("production packaging includes the real files behind versioned script and stylesheet URLs",()=>{
 const root=fixture();
 try{
  fs.writeFileSync(path.join(root,"index.html"),'<script src="./event.js?v=8.0"></script><link href="./event.css?v=8.0#muralla"><script src="./base.js"></script>');
  const files={"event.js":"const eventReady=true;","event.css":".event{color:teal}","base.js":"const baseReady=true;"};
  for(const [file,content] of Object.entries(files))fs.writeFileSync(path.join(root,file),content);
  const result=build(root);assert.equal(result.status,0,result.stderr);
  for(const [file,content] of Object.entries(files))assert.equal(fs.readFileSync(path.join(root,"dist",file),"utf8"),content);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test("a missing versioned runtime file fails the production build",()=>{
 const root=fixture();
 try{
  fs.writeFileSync(path.join(root,"index.html"),'<script src="./missing.js?v=8.0"></script>');
  const result=build(root);assert.notEqual(result.status,0);assert.match(result.stderr,/Missing runtime asset: missing\.js/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('admin entrypoint, its independent scripts and the shared feed are included in production',()=>{
 const root=fixture();
 try{
  fs.mkdirSync(path.join(root,'data'));
  const files={'index.html':'<!doctype html>','admin-99.html':'<script src="./admin-panel-99.js"></script>','admin-panel-99.js':'const ready=true;','data/admin-live-99.json':'{"version":1}'};
  for(const [file,content] of Object.entries(files))fs.writeFileSync(path.join(root,file),content);
  const result=build(root);assert.equal(result.status,0,result.stderr);
  for(const [file,content] of Object.entries(files))assert.equal(fs.readFileSync(path.join(root,'dist',file),'utf8'),content);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
