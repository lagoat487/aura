"use strict";
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,".."),out=path.join(root,"dist");
const files=["index.html","mobile.html","vendor/THREE-LICENSE.txt"];
const entries=files.filter(file=>file.endsWith(".html"));
if(fs.existsSync(path.join(root,"admin-99.html"))){entries.push("admin-99.html");files.push("admin-99.html");}
if(fs.existsSync(path.join(root,"dream/index.html")))entries.push("dream/index.html");
for(const entry of entries){
  const html=fs.readFileSync(path.join(root,entry),"utf8");
  files.push(...Array.from(html.matchAll(/(?:src|href)="\.\/([^"?#]+)(?:[?#][^"]*)?"/g),m=>m[1]));
}
if(entries.includes("admin-99.html"))files.push("data/admin-live-99.json");
function addAssets(directory){
  const source=path.join(root,directory);
  if(!fs.existsSync(source))return;
  for(const entry of fs.readdirSync(source,{withFileTypes:true})){
    const file=path.join(directory,entry.name);
    if(entry.isDirectory())addAssets(file);
    else if(entry.isFile()&&/\.(svg|png|jpe?g|webp|json|txt)$/i.test(entry.name))files.push(file);
  }
}
addAssets("assets");
function addDream(directory){
 const source=path.join(root,directory);if(!fs.existsSync(source))return;
 for(const entry of fs.readdirSync(source,{withFileTypes:true})){
  const file=path.join(directory,entry.name);if(entry.isDirectory())addDream(file);else if(entry.isFile())files.push(file);
 }
}
addDream("dream");
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});
for(const file of new Set(files)){
  const src=path.join(root,file),target=path.join(out,file);
  if(!fs.existsSync(src))throw Error("Missing runtime asset: "+file);
  if(file.endsWith(".js")&&!file.includes("vendor/")){
  if(file.startsWith("dream/"))require('node:child_process').execFileSync(process.execPath,['--check',src]);
  else new Function(fs.readFileSync(src,"utf8"));
 }
  fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(src,target);
}
console.log("AURA 10.0: "+new Set(files).size+" runtime files checked and copied to dist/.");

