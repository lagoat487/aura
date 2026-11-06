'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const U=require('../ultimate-team'),Save=require('../ultimate-save'),Squad=require('../squad');
const forms=new Set(Object.keys(Squad.formations));
const positions=['POR','LI','DFC','DFC','LD','MCD','MC','MC','EI','DC','ED','POR','DC','DFC','MC','EI','LD','MCO'];
const pool=()=>['a','b','c'].flatMap(cid=>positions.map((pos,i)=>({id:cid+i,name:cid+i,pos,overall:72+i%9,real:true,club:cid,leagueId:'reference',nationality:'Argentina'})));
function legacyClub(){
 const u=U.create(pool()),cards=U.argentinaCards(pool());
 u.owned.push(...cards.map(p=>({...p,tradeable:true})));u.coins=212345;u.purchases=8;
 u.argentinaPlayed=3;u.argentinaWins=1;u.argentinaEarned=105000;
 u.duplicates.push({...cards[2],uid:'old-argentina-duplicate',tradeable:true});
 assert.equal(U.setPlayer(u,9,cards[0].id),true);return u;
}
test('retired Liga Argentina keeps all eight historical card definitions and prices for owned editions',()=>{
 assert.equal(U.argentina.active,false);assert.ok(!U.activeEvents.some(e=>e.id===U.argentina.id));
 assert.deepEqual(U.argentinaCards(pool()).map(p=>[p.name,p.overall,U.price(p)]),[
  ['Enner Valencia',89,420000],['Ángel Di María',88,390000],['Nicolás Otamendi',87,330000],['Leandro Paredes',90,500000],
  ['Paulo Dybala',87,470000],['Marcos Acuña',87,340000],['Thiago Almada',87,315000],['Exequiel Palacios',87,325000]
 ]);
});
test('new purchases and forged legacy card requests cannot mutate the retired-event club',()=>{
 for(const api of [U,require('../ultimate-team-61'),require('../ultimate-team-62')]){
  const u=legacyClub(),before=structuredClone(u);
  for(const card of api.argentinaCards(pool()))for(const changes of [{},{event:undefined},{id:'argentina:fake',overall:99}]){
   assert.match(api.buy(u,{...card,...changes}).error,/ha finalizado/);assert.deepEqual(u,before);
  }
 }
});
test('retired event match rewards and disguised Argentina tokens leave all balances and past results unchanged',()=>{
 for(const api of [U,require('../ultimate-team-61'),require('../ultimate-team-62')]){
  const u=legacyClub(),before=structuredClone(u);
  for(const mode of [api.argentina.id,'battles','divisions',api.flashback.id])for(const score of [{home:3,away:0},{home:1,away:1},{home:0,away:2}]){
   assert.equal(api.reward(u,'ut:argentina:9',score,mode),false);assert.deepEqual(u,before);
  }
  assert.equal(api.reward(u,'ut:10',{home:1,away:0},api.argentina.id),false);assert.deepEqual(u,before);
 }
});
test('owned cards, duplicates, XI, reserves, coins and statistics survive old and checked saves after retirement',()=>{
 const u=legacyClub(),before=structuredClone(u),old={version:2,club:u,tab:'argentina',matchToken:8};
 const payload=JSON.stringify(old),checked=JSON.stringify({format:Save.FORMAT,version:2,payload,checksum:Save.hash(payload)});
 for(const api of [Save,require('../ultimate-save-61'),require('../ultimate-save-62')])for(const raw of [JSON.stringify({...old,version:1}),JSON.stringify(old),checked]){
  const state=api.unpack(raw,forms);assert.ok(state);assert.equal(state.tab,'events');assert.equal(state.matchToken,8);
  assert.deepEqual(state.club,before);assert.equal(state.club.xi[9],'argentina:enner-valencia');
  assert.ok(U.bench(state.club).some(p=>p.event===U.argentina.id));assert.equal(U.price(state.club.owned.find(p=>p.id==='argentina:leandro-paredes')),500000);
  const storage=new Map(),adapter={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
  assert.equal(api.save(adapter,state,forms),true);assert.deepEqual(api.load(adapter,forms).snapshot,state);
  assert.deepEqual(api.importData(api.exportData(state,forms),forms),state);
 }
 assert.deepEqual(u,before);
});
test('normal modes and the other live events remain available after Argentina retirement',()=>{
 const u=U.create(pool());u.coins=2000000;
 assert.equal(U.reward(u,'ut:1',{home:1,away:0},'battles'),1200);
 assert.equal(U.reward(u,'ut:2',{home:1,away:0},'divisions'),1200);
 assert.equal(U.reward(u,'ut:flashback:3',{home:0,away:1},U.flashback.id),70000);
 assert.equal(U.buy(u,U.murallaCards(pool())[0]).ok,true);
 assert.equal(U.buy(u,U.magiaCards(pool())[0]).ok,true);
});
