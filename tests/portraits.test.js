"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("node:fs"),path=require("node:path");
const U=require("../ultimate-team"),P=require("../portraits");
const read=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");
function boot(catalog){
  const context=vm.createContext({});
  if(catalog)context.AuraBundledWorld=catalog;else vm.runInContext(read("data/world-rosters.js"),context);
  vm.runInContext(read("portraits.js"),context);return context;
}
test("every catalogue identity starts with its FC 27 portrait and keeps older photos as ordered fallbacks",()=>{
  const app=boot(),p=app.AuraPortraits;
  for(const row of app.AuraBundledWorld.rows){
    const card={id:"real:"+row[0],real:true,name:row[1]||row[2]},urls=p.sources(card);
    assert.equal(urls[0],"https://cdn.fifacm.com/content/media/imgs/fc27/players/p"+row[0]+".png?v=32");
    assert.match(urls[1],/\/27_120\.png$/);assert.match(urls[2],/\/fc26\//);
  }
});
test("all 53 current event cards, SBC rewards and saved Sigma editions resolve faces without changing their data",()=>{
  const p=boot().AuraPortraits;
  const active=[...U.magiaCards([]),...U.barcelonaCards([]),...U.murallaCards([]),...U.flashbackCards([]),...U.argentinaCards([])];
  assert.equal(active.length,53);
  const cards=[...active,...Object.keys(U.sbcRewards).map(key=>U.sbcRewardCard(key,[])),...U.eventCards([])];
  const before=structuredClone(cards);
  for(const card of cards){
    assert.ok(p.sources(card).length,card.id+" must have a photo source");
    assert.match(p.html(card),/<img/);
    if(card.name!=="Brian Fariñas")assert.match(p.sources(card)[0],/\/fc27\/players\/p\d+\.png/);
  }
  assert.deepEqual(cards,before);
  const expected={"flashback:kitu-diaz":"189454","flashback:jamie-vardy":"208830","flashback:ngolo-kante":"215914","flashback:neymar-junior":"190871","flashback:keylor-navas":"193041","sigma:vinicius":"238794"};
  for(const [id,numeric] of Object.entries(expected))assert.equal(p.identity(cards.find(c=>c.id===id)),numeric,id);
});
test("legacy World Cup saves and all editions of the same person reuse the current numeric portrait",()=>{
  const app=boot(),p=app.AuraPortraits;
  for(const card of [...U.argentinaCards([]),...U.flashbackCards([]),...U.eventCards([])]){
    const saved={...card,originalId:"wc26:123",photo:undefined};
    assert.ok(p.identity(saved),card.id);assert.deepEqual(p.sources(saved),p.sources({id:"real:"+p.identity(saved),real:true}));
  }
  const yan=U.magiaCards([]).find(c=>c.id==="magia:diomande");
  assert.equal(p.identity(yan),"78012");assert.notEqual(p.identity(yan),"270531");
  assert.deepEqual(p.sources(yan),p.sources({id:"real:78012",name:"Yan Diomande",real:true}));
  assert.deepEqual(p.sources(U.sbcRewardCard("leyenda",[])),p.sources(U.magiaCards([]).find(c=>c.id==="magia:messi")));
});
test("name resolution is exact and unambiguous and never trusts an injected identity or photo host",()=>{
  const columns=["player_id","common_name","first_name","last_name"];
  const p=boot({columns,rows:[["123456","Same Name","First","Person"],["234567","Same Name","Second","Person"]]}).AuraPortraits;
  assert.equal(p.identity({id:"wc26:2",name:"Same Name",real:true}),null);
  assert.equal(p.identity({id:"wc26:2",name:"First",real:true}),null);
  assert.equal(p.identity({id:"wc26:2",name:"First Person",real:true}),"123456");
  for(const card of [
    {id:"magia:messi",originalId:"javascript:158023",name:"Lionel Messi",real:true},
    {id:"verified:unknown",name:"Jamie Vardy",real:true,photo:"https://untrusted.example/players/208/830/27_120.png"},
    {id:"created:1",name:"Jamie Vardy",real:false},
    {id:"wc26:2",name:"Unknown",real:true,photo:"https://cdn.sofifa.net/players/231/747/27_120.png/evil"}
  ])assert.equal(p.sources(card).length,0);
  assert.doesNotMatch(p.html({id:"wc26:1",name:'<script>"&',real:true}),/<script>/);
});
test("image failures advance once per source and end in a visible initials fallback without looping",()=>{
  const urls=P.sources({id:"real:78012",real:true}),classes=new Set();
  const image={dataset:{portraitSources:JSON.stringify(urls),portraitIndex:"0"},src:urls[0],hidden:false,parentElement:{classList:{add:s=>classes.add(s)}}};
  for(let i=1;i<urls.length;i++){P.fallback(image);assert.equal(image.src,urls[i]);assert.equal(image.hidden,false);}
  P.fallback(image);assert.equal(image.hidden,true);assert.ok(classes.has("portrait-missing"));
  const last=image.src;P.fallback(image);assert.equal(image.src,last);
});
test("desktop and mobile load the fresh portrait runtime with exactly the canonical behavior",()=>{
  assert.equal(read("portraits-jose-99.js"),read("portraits.js"));
  for(const file of ["index.html","mobile.html"]){
    const html=read(file);assert.match(html,/src="\.\/portraits-jose-99\.js"/);
    assert.doesNotMatch(html,/src="\.\/portraits\.js/);
  }
});
