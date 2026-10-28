"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const Badges=require("../club-badges"),Clubs=require("../clubs");
const root=path.resolve(__dirname,".."),manifest=JSON.parse(fs.readFileSync(path.join(root,"data/club-badges.json"),"utf8"));
test("major clubs and every legacy club have a bundled authentic crest",()=>{
 for(const club of Clubs.legacyClubs)assert.match(Badges.get(club),/^\.\/assets\/crests\/[a-f0-9]{16}\.svg$/);
 assert.notEqual(Badges.get({id:"barcelona"}),Badges.get({id:"guayaquil"}));
 assert.notEqual(Badges.get({id:"milan"}),Badges.get({id:"acmilan"}));
 assert.ok(Badges.get({name:"FC Barcelona"}));
});
test("unknown club IDs retain fallback and never inherit an unrelated same-name crest",()=>{
 for(const club of [null,undefined,"__proto__","constructor","toString",{id:"world-unknown-nacional",name:"Nacional"},{id:"aura-draft",name:"AURA Draft XI"}])assert.equal(Badges.get(club),null);
 for(const club of manifest.unmapped)assert.equal(Badges.get(club),null,club.name);
});
test("every mapped crest is self-contained image data, exists offline, and has source provenance",()=>{
 const files=new Set();
 for(const r of manifest.records){
  assert.equal(Badges.get(r),r.path);assert.match(r.sourceCommit,/^[a-f0-9]{40}$/);assert.match(r.sourceSHA,/^[a-f0-9]{40}$/);
  assert.ok(["exact-name","club-affix-normalized","explicit-alias"].includes(r.method));
  const local=path.resolve(root,r.path);assert.ok(local.startsWith(path.join(root,"assets/crests/")));files.add(local);
 }
 for(const file of files){
  const svg=fs.readFileSync(file,"utf8");
  assert.match(svg,/viewBox="0 0 128 128"/);assert.doesNotMatch(svg,/<script|foreignObject|\bonload=|\bonerror=|https?:\/\/(?!www\.w3\.org)/i);
  const encoded=/href="data:image\/webp;base64,([A-Za-z0-9+/=]+)"/.exec(svg);assert.ok(encoded,file);
  const bytes=Buffer.from(encoded[1],"base64");assert.equal(bytes.subarray(0,4).toString(),"RIFF");assert.equal(bytes.subarray(8,12).toString(),"WEBP");
 }
 assert.equal(files.size,manifest.uniqueAssets);assert.equal(manifest.records.length,manifest.mappedClubIds);
 assert.equal(manifest.records.length+manifest.unmapped.length,manifest.totalCatalogClubIds);
});
