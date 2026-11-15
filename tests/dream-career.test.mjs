import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as C from '../dream/career.js';
const data=JSON.parse(readFileSync(new URL('../dream/data/players.json',import.meta.url)));
const players=C.unpack(data),byId=new Map(players.map(p=>[p.id,p]));
const career=()=>C.newCareer(players,20261114);
function complete(s,ourGoals=3,theirGoals=0,mode='simulation'){
  const p=C.beginMatch(s);return C.finishMatch(s,{id:p.id,homeGoals:p.home?ourGoals:theirGoals,awayGoals:p.home?theirGoals:ourGoals,mode},players,byId);
}
test('Catalogue contains 18,405 unique real records and the requested stars',()=>{
  assert.equal(players.length,18405);assert.equal(byId.size,18405);
  for(const id of ['277643','158023','256079','20801'])assert.ok(byId.has(id));
  assert.match(byId.get('277643').name,/Yamal/);assert.match(byId.get('256079').name,/Caicedo/);
  for(const p of players){assert.ok(p.overall>=1&&p.overall<=99);assert.ok(p.name&&p.country&&p.positions);}
});
test('New career has a valid eleven, real substitutes and eight distinct offers',()=>{
  const s=career();assert.equal(s.lineup.length,11);assert.equal(new Set(s.lineup).size,11);assert.ok(s.roster.length>11);
  s.lineup.forEach((id,i)=>assert.equal(C.fits(byId.get(id),C.FORMATIONS[s.formation][i]),3));
  assert.equal(s.market.length,8);assert.equal(new Set(s.market).size,8);assert.deepEqual(C.validateSave(s,byId),s);
});
test('Calendar is a complete home-and-away round robin',()=>{
  const l=career().league,pairs=new Map();assert.equal(l.fixtures.length,14);
  for(const games of l.fixtures){assert.equal(new Set(games.flat()).size,8);for(const [h,a] of games){const key=h+'>'+a;pairs.set(key,(pairs.get(key)||0)+1);}}
  assert.equal(pairs.size,56);for(const n of pairs.values())assert.equal(n,1);
});
test('Finishing one fixture saves one result, coins, league round and a disjoint market',()=>{
  const s=career(),before=[...s.market],coins=s.coins,p=C.beginMatch(s),id=p.id;
  const result=complete(s);assert.equal(s.played,1);assert.equal(s.league.round,1);assert.equal(s.coins,coins+result.reward);assert.equal(result.ourGoals,3);
  assert.equal(s.market.length,8);assert.ok(s.market.every(id=>!before.includes(id)));assert.equal(C.table(s).find(x=>x.id==='dream').pts,3);
  const snapshot=JSON.stringify(s);assert.throws(()=>C.finishMatch(s,{id,homeGoals:3,awayGoals:0},players,byId));assert.equal(JSON.stringify(s),snapshot);
  assert.deepEqual(C.validateSave(s,byId),s);
});
test('Repeated market windows remain unique and change after every match',()=>{
  const s=career();for(let i=0;i<14;i++){const old=[...s.market];complete(s);assert.equal(new Set(s.market).size,8);assert.ok(s.market.every(id=>!old.includes(id)));}
  assert.ok(s.league.complete);assert.equal(s.league.round,14);
});
test('Promotion is based on a completed season and cannot skip divisions',()=>{
  const s=career();assert.throws(()=>C.nextSeason(s));for(let i=0;i<14;i++)complete(s,4,0);
  assert.equal(C.table(s)[0].id,'dream');assert.equal(C.table(s)[0].pts,42);assert.equal(C.nextSeason(s),'Ascenso');assert.equal(s.division,7);assert.equal(s.season,2);assert.equal(s.league.round,0);assert.equal(s.played,14);assert.deepEqual(C.validateSave(s,byId),s);
});
test('Transfers debit once, reject duplicates and reject unaffordable signings',()=>{
  const s=career(),p=byId.get(s.market[0]),coins=s.coins;
  C.buy(s,p);assert.equal(s.coins,coins-C.price(p));assert.equal(s.roster.filter(id=>id===p.id).length,1);assert.throws(()=>C.buy(s,p));
  s.coins=0;assert.throws(()=>C.buy(s,byId.get(s.market[1])));assert.equal(s.coins,0);
});
test('Scouting exposes any catalogue player at a separate fee',()=>{
  const s=career(),p=players.find(p=>!s.market.includes(p.id)&&!s.roster.includes(p.id)),coins=s.coins;
  C.scout(s,p);assert.equal(s.coins,coins-200);assert.ok(s.market.includes(p.id));assert.throws(()=>C.scout(s,p));
});
test('Captain is a one-off free signing and formation changes keep eleven unique players',()=>{
  const s=career(),coins=s.coins;C.pickCaptain(s,byId.get('277643'),byId);assert.equal(s.coins,coins);assert.ok(s.lineup.includes('277643'));assert.throws(()=>C.pickCaptain(s,byId.get('158023'),byId));
  for(const f of Object.keys(C.FORMATIONS)){C.setFormation(s,f,byId);assert.equal(s.lineup.length,11);assert.equal(new Set(s.lineup).size,11);assert.ok(s.lineup.every(id=>s.roster.includes(id)));}
});
test('Only substitutes may be released and proceeds match the displayed price',()=>{
  const s=career();assert.throws(()=>C.release(s,byId.get(s.lineup[0])));const p=byId.get(s.roster.find(id=>!s.lineup.includes(id))),coins=s.coins;
  C.release(s,p);assert.equal(s.coins,coins+C.sellPrice(p));assert.ok(!s.roster.includes(p.id));assert.throws(()=>C.release(s,p));
});
test('Abandoned fixtures pay no coins and still advance the market and league',()=>{const s=career(),coins=s.coins;const r=complete(s,0,3,'abandoned');assert.equal(r.reward,0);assert.equal(s.coins,coins);assert.equal(s.played,1);});
test('Imported saves reject duplicate starters, invalid balance, malformed season and settings',()=>{
  for(const mutate of [s=>s.lineup[0]=s.lineup[1],s=>s.coins=-1,s=>s.league.round=99,s=>s.market.push(s.market[0]),s=>s.settings.duration=-2,s=>s.roster.push('unknown'),s=>s.league.teams[0].pts=999]){const s=career();mutate(s);assert.throws(()=>C.validateSave(s,byId));}
});
