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

test('a non-qualifying new season clears current European results while preserving archived seasons',()=>{
 const clubs=teams().map(c=>({...c,city:'Inglaterra'})),definition={id:'premier',name:'Premier League',country:'Inglaterra',clubIds:clubs.slice(0,20).map(c=>c.id)};
 const previous=[{id:'2026:ucl:played',season:2026,g1:2,g2:1}],archive={season:2026,continentalHistory:previous.slice()};
 const game={club:'club-0',season:2027,budget:123456,competition:definition,continentalHistory:previous.slice(),seasonHistory:[archive]};
 const oldArchive=JSON.stringify(game.seasonHistory);
 assert.equal(C.initCareer(game,clubs,[definition],null,8),null);assert.equal(game.champions,null);assert.match(game.championsReason,/cuatro/);
 assert.deepEqual(game.continentalHistory,[],'a season without Champions must not reuse last season results');assert.equal(JSON.stringify(game.seasonHistory),oldArchive);assert.equal(game.budget,123456);
 game.season=2028;assert.ok(C.initCareer(game,clubs,[definition],null,2));assert.deepEqual(game.continentalHistory,[]);assert.equal(JSON.stringify(game.seasonHistory),oldArchive);
});
test('unavailable and non-European Champions entries also start with an empty current history',()=>{
 for(const city of ['Inglaterra','Guayaquil · Ecuador']){
  const club={id:'own',name:'Own Club',city,rating:80},game={club:'own',season:2027,competition:{clubIds:['own']},continentalHistory:[{season:2026}]};
  assert.equal(C.initCareer(game,[club],[]),null);assert.deepEqual(game.continentalHistory,[]);
 }
});

test('continental eligibility gives a declared country precedence over shared league names',()=>{
 for(const [country,name,eligible] of [
  ['Italia','Serie A',true],['Inglaterra','Premier League',true],['Países Bajos','Eredivisie',true],
  ['Brasil','Serie A',false],['Ecuador','LigaPro Serie A',false],['Argentina','Superliga',false],
  ['Estados Unidos','Premier League',false],['Chile','Bundesliga',false],
 ]){
  const club={id:'own',name:'Own Club',city:name,rating:80},definition={id:'domestic',country,name,clubIds:[club.id]};
  assert.equal(C.candidates([club],[definition]).length,eligible?1:0,country+' / '+name);
 }
});

test('countryless leagues require exact supported names and legacy clubs retain their country fallback',()=>{
 for(const name of ['Trendyol Süper Lig','1A Pro League','Hellas Liga','Scottish Premiership','Česká Liga','Ukrayina Liha','Liga Hrvatska','Brack Super League','Ö. Bundesliga','Liga Cyprus','Ekstraklasa','Allsvenskan','Eliteserien','SUPERLIGA']){
  const club={id:'own',name:'Own Club',city:name,rating:80};
  assert.equal(C.candidates([club],[{id:'domestic',country:'Mundo',name,clubIds:[club.id]}]).length,1,name);
 }
 for(const name of ['Brasileirão Serie A','LigaPro Serie A','Argentina Superliga','Premier League de otro país']){
  const club={id:'own',name:'Own Club',city:name,rating:80};
  assert.deepEqual(C.candidates([club],[{id:'domestic',country:'Mundo',name,clubIds:[club.id]}]),[],name);
 }
 const legacy={id:'legacy',name:'Legacy Club',city:'Milán · Italia',rating:80};
 assert.equal(C.candidates([legacy],[]).length,1);
 assert.equal(C.candidates([{...legacy,gender:'women'}],[]).length,0);
 assert.equal(C.candidates([{...legacy,city:'Guayaquil · Ecuador'}],[{id:'domestic',name:'Serie A',clubIds:[legacy.id]}]).length,0);
});

test('non-European entries cannot qualify as champions or top four and keep archived history and budget',()=>{
 const european=teams().map(c=>({...c,city:'Inglaterra'})),own={id:'south',name:'South Club',city:'Brasileirão Serie A',rating:95};
 const definition={id:'south-league',name:own.city,country:'Mundo',clubIds:[own.id]},archive=[{season:2026,continentalHistory:[{id:'old-match'}]}];
 for(const position of [null,1,8])for(const matching of [null,c=>({id:c.id===own.id?'club-0':c.id})]){
  const game={club:own.id,season:2027,competition:definition,budget:123456,previousContinentalChampion:own.id,continentalHistory:[{id:'stale-match'}],seasonHistory:structuredClone(archive)};
  assert.equal(C.initCareer(game,[...european,own],[definition],matching,position)===null,true);
  assert.equal(game.champions,null);assert.match(game.championsReason,/europea/);
  assert.deepEqual(game.continentalHistory,[]);assert.deepEqual(game.seasonHistory,archive);assert.equal(game.budget,123456);
 }
});

test('eligible European aliases keep the champions exemption and enter only once',()=>{
 const clubs=teams().map(c=>({...c,city:'Inglaterra'})),own={...clubs[0],id:'legacy-alias'},definition={id:'premier',name:'Premier League',country:'Inglaterra',clubIds:[own.id]};
 const game={club:own.id,season:2027,competition:definition,budget:123456,previousContinentalChampion:own.id};
 const matching=c=>({id:c.id===own.id?'club-0':c.id}),champions=C.initCareer(game,[...clubs,own],[definition],matching,8);
 assert.ok(champions);assert.equal(champions.entrants.length,36);assert.equal(champions.entrants.filter(c=>matching(c).id==='club-0').length,1);
 assert.ok(champions.entrants.some(c=>c.id===own.id));assert.equal(game.budget,123456);
});
