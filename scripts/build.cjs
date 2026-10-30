"use strict";
const fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,".."),out=path.join(root,"dist");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const files=["index.html",...Array.from(html.matchAll(/(?:src|href)="\.\/([^"?#]+)"/g),m=>m[1]),"vendor/THREE-LICENSE.txt"];
function addAssets(directory){
  const source=path.join(root,directory);
  if(!fs.existsSync(source))return;
  for(const entry of fs.readdirSync(source,{withFileTypes:true})){
    const file=path.join(directory,entry.name);
    if(entry.isDirectory())addAssets(file);
    else if(entry.isFile()&&/\.(svg|png|webp|json|txt)$/i.test(entry.name))files.push(file);
  }
}
addAssets("assets/crests");
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});
for(const file of new Set(files)){
  const src=path.join(root,file),target=path.join(out,file);
  if(!fs.existsSync(src))throw Error("Missing runtime asset: "+file);
  if(file.endsWith(".js")&&!file.startsWith("vendor/"))new Function(fs.readFileSync(src,"utf8"));
  fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(src,target);
}
console.log("AURA Club Update 4.2: "+new Set(files).size+" runtime files checked and copied to dist/.");
