"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),C=require('../champions');
const teams=()=>Array.from({length:36},(_,i)=>({id:'club-'+i,name:'Club '+i,rating:90-i/2}));
test('Champions league phase gives each club eight unique opponents, four home and four away',()=>{
 const c=C.create(teams(),'club-0',2026);assert.equal(c.rounds.length,8);
 for(const t of c.entrants){const fs=c.rounds.flatMap(r=>r.matches).filter(f=>[f.home,f.away].includes(t.id));assert.equal(fs.length,8);assert.equal(fs.filter(f=>f.home===t.id).length,4);assert.equal(new Set(fs.map(f=>f.home===t.id?f.away:f.home)).size,8);}
 for(const r of c.rounds)assert.equal(new Set(r.matches.flatMap(f=>[f.home,f.away])).size,36);
});
test('complete continental competition has 189 fixtures, seeded play-offs, two-legged knockouts and one final',()=>{
 const c=C.create(teams(),'club-0',2026);let turns=0;
 while(!c.champion&&turns++<20){const f=C.fixture(c);C.advance(c,()=>({home:0,away:0}),f?(f.home===c.user?{home:4,away:0}:{home:0,away:4}):null);}
 assert.equal(c.champion,c.user);assert.equal(c.rounds.flatMap(r=>r.matches).length,189);assert.equal(c.rounds.filter(r=>r.stage==='playoff').length,2);assert.equal(c.rounds.filter(r=>r.stage==='round16').length,2);assert.equal(c.rounds.filter(r=>r.stage==='quarter').length,2);assert.equal(c.rounds.filter(r=>r.stage==='semi').length,2);assert.equal(c.rounds.filter(r=>r.stage==='final').length,1);
 assert.ok(C.table(c).every(r=>r.p===8));assert.equal(C.table(c)[0].id,c.user);const old=JSON.stringify(c);assert.equal(C.advance(c,()=>({home:5,away:1})),false);assert.equal(JSON.stringify(c),old);
});
test('invalid results leave the entire continental round untouched',()=>{
 const c=C.create(teams(),'club-0');const old=JSON.stringify(c);assert.throws(()=>C.advance(c,()=>({home:0,away:0}),{home:NaN,away:2}));assert.equal(JSON.stringify(c),old);assert.throws(()=>C.advance(c,()=>({home:-1,away:0})));assert.equal(JSON.stringify(c),old);
});
test('knockout ties use aggregate goals without away-goal advantage and settle tied aggregates with penalties',()=>{
 const c=C.create(teams(),'club-0');for(let i=0;i<8;i++)C.advance(c,()=>({home:1,away:1}));
 const r1=C.next(c),pair={...r1.matches[0]};C.advance(c,()=>({home:2,away:1}));C.advance(c,()=>({home:2,away:1}));const second=c.rounds.filter(r=>r.stage==='playoff')[1].matches.find(f=>f.tie===pair.tie);
 assert.deepEqual(second.aggregate,{home:3,away:3});assert.ok(second.penalties);assert.ok([pair.home,pair.away].includes(second.winner));
});
test('continental dates scale to domestic season lengths and eligibility excludes non-European clubs',()=>{
 const c=C.create(teams(),'club-0'),g={round:1,competition:{fixtures:Array(38)},champions:c};assert.equal(C.dueNow(g),false);g.round=2;assert.equal(C.dueNow(g),true);g.competition.fixtures=Array(18);g.round=1;assert.equal(C.dueNow(g),true);
 const game={club:'south',season:2026,competition:{clubIds:['south']}};assert.equal(C.initCareer(game,[{id:'south',name:'Barcelona SC',city:'Guayaquil · Ecuador',rating:75}],[]),null);assert.match(game.championsReason,/europea/);
});
