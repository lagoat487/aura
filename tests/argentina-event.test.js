"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const U=require("../ultimate-team"),Save=require("../ultimate-save"),Squad=require("../squad");
const positions=["POR","LI","DFC","DFC","LD","MCD","MC","MC","EI","DC","ED","POR","DC","DFC","MC","EI","LD","MCO"];
const pool=()=>["a","b","c"].flatMap(cid=>positions.map((pos,i)=>({id:cid+i,name:cid+i,pos,overall:72+i%9,real:true,club:cid,leagueId:"reference",nationality:"Argentina"})));
test("Liga Argentina consists of exactly the eight specified cards and all prices stay in bounds",()=>{
  const event=U.argentina,cards=U.argentinaCards(pool());
  assert.equal(event.id,"liga-argentina");assert.equal(event.reward,35000);
  assert.equal(cards.length,8);assert.equal(new Set(cards.map(p=>p.id)).size,8);
  assert.deepEqual(cards.map(p=>[p.name,p.overall,U.price(p)]),[
    ["Enner Valencia",89,420000],["Ángel Di María",88,390000],
    ["Nicolás Otamendi",87,330000],["Leandro Paredes",90,500000],
    ["Paulo Dybala",87,470000],["Marcos Acuña",87,340000],
    ["Thiago Almada",87,315000],["Exequiel Palacios",87,325000]
  ]);
  assert.ok(cards.every(p=>p.real&&p.event===event.id&&U.price(p)>=300000&&U.price(p)<=500000));
});
test("purchase checks exact event edition, debit only once and leave original collection untouched",()=>{
  const u=U.create(pool()),p=U.argentinaCards(pool())[0];
  const before=u.owned.map(x=>x.id),xi=u.xi.slice();u.coins=500000;
  assert.equal(U.marketPrice({...u,played:88},p),420000);
  const result=U.buy(u,p);assert.equal(result.ok,true);assert.equal(result.cost,420000);
  assert.equal(u.coins,80000);assert.equal(u.owned.filter(q=>q.id===p.id).length,1);
  assert.deepEqual(u.xi,xi);assert.deepEqual(u.owned.slice(0,before.length).map(q=>q.id),before);
  const snap=JSON.stringify(u);assert.ok(U.buy(u,p).error);assert.equal(JSON.stringify(u),snap);
  assert.equal(U.evolutionCost(p),null);
  assert.ok(U.buy(u,{...p,id:"argentina:fake",overall:99}).error);
});
test("completed win, draw and loss each reward exactly 35000 only in this event",()=>{
 const u=U.create(pool()),before=u.coins,battle=u.battlePoints,division=u.divisionPoints;
 const scores=[[3,0],[1,1],[0,2]];
 scores.forEach(([home,away],i)=>{
   const token="ut:argentina:"+(i+1);
   assert.equal(U.reward(u,token,{home,away},U.argentina.id),35000);
   const same=JSON.stringify(u);
   assert.equal(U.reward(u,token,{home,away},U.argentina.id),false);
   assert.equal(JSON.stringify(u),same);
 });
 assert.equal(u.coins,before+105000);
 assert.equal(u.argentinaPlayed,3);assert.equal(u.argentinaWins,1);assert.equal(u.argentinaEarned,105000);
 assert.equal(u.battlePoints,battle);assert.equal(u.divisionPoints,division);
 assert.deepEqual([u.wins,u.draws,u.losses],[1,1,1]);
 assert.equal(U.reward(u,"ut:argentina:bad",{home:0,away:0},U.argentina.id),600);
 assert.equal(U.reward(u,"ut:argentina:4",{home:-1,away:0},U.argentina.id),false);
});
test("normal modes never receive the event reward, and existing Sigma prices remain unchanged",()=>{
  const u=U.create(pool());
  assert.equal(U.reward(u,"ut:1",{home:1,away:0},"battles"),1200);
  assert.equal(U.reward(u,"ut:2",{home:1,away:0},"divisions"),1200);
  const sigma=U.eventCards(pool()).find(p=>p.id==="sigma:rashford");
  assert.equal(U.price(sigma),450000);
});
test("event card, coins, earned totals and selected event tab survive a verified save/restore",()=>{
  const u=U.create(pool()),card=U.argentinaCards(pool())[2];u.coins=400000;
  assert.equal(U.buy(u,card).ok,true);
  U.reward(u,"ut:argentina:8",{home:0,away:2},U.argentina.id);
  const state={version:2,club:u,tab:"argentina",matchToken:8};
  const restored=Save.unpack(Save.pack(state,new Set(Object.keys(Squad.formations))),new Set(Object.keys(Squad.formations)));
  assert.deepEqual(restored,state);
  assert.equal(restored.club.owned.find(p=>p.id===card.id).overall,87);
});
