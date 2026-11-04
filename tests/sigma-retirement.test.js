"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),U=require("../ultimate-team"),Save=require("../ultimate-save"),Squad=require("../squad");
const positions=["POR","LI","DFC","DFC","LD","MCD","MC","MC","EI","DC","ED","POR","LI","DFC","LD","MC","DC","ED","EI","MC","MCD","MCO","DFC"];
const pool=()=>["a","b"].flatMap(cid=>positions.map((pos,i)=>({id:cid+i,name:"Player "+cid+i,pos,overall:70+i%10,real:true,club:cid})));
test("retired Ultimate Sigma cannot sell cards or grant coins through legacy entry points",()=>{
 const club=U.create(pool());club.coins=5000000;assert.equal(U.sigma.active,false);
 const before=structuredClone(club);
 for(const card of U.eventCards(pool())){
  assert.match(U.buy(club,card).error,/ha finalizado/);
  assert.match(U.buy(club,{...card,event:undefined}).error,/ha finalizado/);
  assert.deepEqual(club,before);
 }
 assert.match(U.claimSigmaGift(club).error,/ha finalizado/);assert.deepEqual(club,before);
 assert.equal(U.murallaCards(pool()).length,9);assert.equal(U.flashbackCards(pool()).length,5);assert.equal(U.argentinaCards(pool()).length,8);
 assert.equal(U.buy(club,U.murallaCards(pool())[0]).ok,true);
});
test("previously owned Sigma cards, their XI slot, value and coins survive retirement and restore",()=>{
 const club=U.create(pool()),card=U.eventCards(pool()).find(p=>p.id==="sigma:espart");
 club.owned.push(card);club.sigmaGiftClaimed=true;assert.equal(U.setPlayer(club,4,card.id),true);
 const before=structuredClone(club),forms=new Set(Object.keys(Squad.formations));
 const restored=Save.unpack(Save.pack({version:2,club,tab:"squad",matchToken:4},forms),forms).club;
 assert.deepEqual(restored,before);assert.equal(restored.xi[4],card.id);assert.equal(U.price(restored.owned.find(p=>p.id===card.id)),150000);
 assert.equal(U.evolutionCost(card),null);assert.equal(U.claimSigmaGift(restored).error,"El evento Ultimate Sigma ha finalizado.");
 assert.deepEqual(restored,before);
});
