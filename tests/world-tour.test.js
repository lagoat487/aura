"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const Tour=require("../world-tour"),Squad=require("../squad"),Comp=require("../competitions"),Match=require("../match-engine"),Street=require("../street");
function roster(cid){return Array.from({length:18},(_,i)=>({id:cid+":"+i,name:cid+" "+i,pos:["POR","LI","DFC","DFC","LD","MCD","MC","MC","EI","DC","ED","POR","DC","MC","DFC","EI","ED","LD"][i],overall:75,age:23,potential:86,club:cid,form:80,value:5000000}));}
function career(){const ids=["a","b","c","d","e","f"];return {club:"a",season:2026,round:0,competition:Comp.createSeason({id:"test",name:"Test",clubIds:ids,points:{win:3,draw:1,loss:0},tieBreak:"goal-difference"},2026),rosters:Object.fromEntries(ids.map(id=>[id,roster(id)])),history:[],news:[],budget:1000000};}
test("simulations produce plausible goal totals and make stronger teams win more often without excluding upsets",()=>{
  const stats=(h,a)=>{const rng=Tour.random(442);let wins=0,draws=0,goals=0,upsets=0;for(let i=0;i<12000;i++){const s=Tour.simulate(h,a,rng);wins+=s.home>s.away;draws+=s.home===s.away;goals+=s.home+s.away;upsets+=s.home<s.away;assert.ok(Number.isInteger(s.home)&&s.home>=0&&Number.isInteger(s.away)&&s.away>=0);}return {win:wins/12000,draw:draws/12000,goals:goals/12000,upset:upsets/12000};};
  const even=stats(80,80),fav=stats(90,70);assert.ok(even.goals>2.3&&even.goals<2.9);assert.ok(even.draw>.22&&even.draw<.34);assert.ok(fav.win>even.win+.2);assert.ok(fav.upset>.05&&fav.upset<.2);
});
test("valuations reflect age and potential, and mark the results as estimates",()=>{
  const p={overall:84,potential:90,form:80};assert.ok(Tour.value({...p,age:21})>Tour.value({...p,age:28}));assert.ok(Tour.value({...p,age:28})>Tour.value({...p,age:39}));assert.equal(Tour.price(Tour.kitu).value,200000);assert.equal(Tour.price({...p,age:24}).valueEstimated,true);assert.ok(Tour.value({...p,overall:99,age:18})<=250000000);
});
test("league awards cover the whole league, monthly awards require four rounds, and repeat processing never pays twice",()=>{
  const g=career();Squad.ensure(g).xi[9]=g.rosters.a[9].id;Tour.startPlayer(g,g.rosters.a[9].id);
  for(let i=0;i<g.competition.fixtures.length;i++){
    Comp.simulateNextRound(g.competition,()=>({home:2,away:1}));g.round=i+1;
    g.history.unshift({scorers:[g.rosters.a[9].name,g.rosters.a[9].name]});
    Tour.afterRound(g,Squad);const after=JSON.stringify(g);assert.equal(Tour.afterRound(g,Squad),null);assert.equal(JSON.stringify(g),after);
    assert.equal(g.tour.weekly[0].players.length,11);assert.equal(new Set(g.tour.weekly[0].players.map(p=>p.id)).size,11);assert.ok(g.tour.weekly[0].players.some(p=>p.pos==="POR"));
    if(i<3)assert.equal(g.tour.monthly.length,0);
  }
  assert.equal(g.tour.monthly.length,2);assert.equal(g.tour.annual.length,1);assert.equal(g.tour.annual[0].shortlist.length,10);assert.equal(g.playerCareer.appearances,10);assert.ok(g.playerCareer.goals>0);assert.ok(g.rosters.a[9].overall>75);
});
test("retirement creates distinct young players and can run only once for a season",()=>{
  const g=career();g.rosters.a[9].age=42;const old={...g.rosters.a[9]};Tour.startPlayer(g,old.id);
  const records=Tour.rollover(g),p=g.rosters.a[9];assert.equal(p.age,17);assert.notEqual(p.id,old.id);assert.equal(p.regenOf,old.name);assert.equal(p.pos,old.pos);assert.ok(p.potential>=old.overall);assert.equal(g.playerCareer.playerId,p.id);assert.equal(g.retiredPlayers[old.id].retired,true);assert.ok(records.some(r=>r.retired===old.name));const after=JSON.stringify(g);assert.deepEqual(Tour.rollover(g),[]);assert.equal(JSON.stringify(g),after);
});
test("all cup types complete a unique bracket, penalties decide ties and a finished cup cannot change",()=>{
  for(const type of Tour.cupTypes){
    const entrants=Array.from({length:type.size},(_,i)=>({id:"t"+i,name:"Team "+i,rating:80})),cup=Tour.createCup(type.id,entrants,"t0",42);
    while(!cup.champion){const match=Tour.cupFixture(cup),before=cup.current.length;Tour.advanceCup(cup,match?{home:1,away:1}:null);assert.equal(cup.current.length,before/2);assert.equal(new Set(cup.current).size,cup.current.length);}
    assert.equal(cup.rounds.length,Math.log2(type.size));assert.ok(cup.rounds[0].some(m=>m.penalties));const after=JSON.stringify(cup);assert.equal(Tour.advanceCup(cup),false);assert.equal(JSON.stringify(cup),after);
  }
  assert.throws(()=>Tour.createCup("world",[{id:"x"}],"x"),/insuficientes/);
});
test("UT spending, editable lineups and match rewards preserve ownership and cannot duplicate rewards",()=>{
  const pool=roster("a").concat(roster("b"),roster("c")).map((p,i)=>({...p,overall:72+i%18})),u=Tour.ultimate(pool,Squad.choose);
  assert.equal(new Set(u.xi).size,11);const rng=Tour.random(12);const pack=Tour.openPack(u,pool,rng);assert.equal(pack.ok,true);assert.equal(new Set(pack.cards.map(p=>p.id)).size,3);assert.equal(new Set(u.owned.map(p=>p.id)).size,u.owned.length);assert.equal(u.coins,7500+pack.cards.filter(p=>p.duplicate).length*200);
  assert.equal(Tour.rewardUltimate(u,"match1",{home:2,away:1}),1200);const after=JSON.stringify(u);assert.equal(Tour.rewardUltimate(u,"match1",{home:2,away:1}),false);assert.equal(JSON.stringify(u),after);u.coins=2499;assert.ok(Tour.openPack(u,pool).error);assert.equal(u.coins,2499);
});
test("a player career keeps control through passes, possession changes, halftime and substitutions",()=>{
  const h={players:roster("h").slice(0,11),bench:roster("sub").slice(0,4)},a={players:roster("away").slice(0,11)},g=Match.create({home:h,away:a,playerLock:h.players[9].id,seed:4,seconds:30});
  assert.equal(g.players[g.controlled].id,h.players[9].id);g.phase="playing";g.players.forEach(p=>p.cooldown=0);assert.equal(Match.action(g,"switch"),false);assert.equal(Match.action(g,"pass",{x:-1,z:1}),true);
  const receiver=g.passTarget;assert.notEqual(receiver,9);g.ball.owner=null;g.ball.x=g.players[receiver].x;g.ball.z=g.players[receiver].z;g.ball.y=.22;g.ball.vx=g.ball.vz=g.ball.vy=0;g.ball.freeTime=1;Match.step(g,.01,{});assert.equal(g.controlled,9);
  g.phase="halftime";g.phaseTime=.001;Match.step(g,.01);assert.equal(g.half,2);assert.equal(g.controlled,9);g.paused=true;assert.equal(Match.substitute(g,9,{id:h.bench[1].id}),false);
});
test("street football has six players, scores inside the posts, bounces off walls and freezes in pause",()=>{
  const g=Street.create(roster("h").slice(1,4),roster("a").slice(1,4));assert.equal(g.players.length,6);g.wait=0;g.ball={owner:null,x:44.9,z:0,vx:30,vz:0};Street.step(g,.02);assert.equal(g.score[0],1);
  g.wait=0;g.ball={owner:null,x:44.9,z:12,vx:30,vz:0};Street.step(g,.02);assert.equal(g.score[0],1);assert.ok(g.ball.vx<0);g.paused=true;const after=JSON.stringify(g);Street.step(g,.05,{x:1});assert.equal(JSON.stringify(g),after);g.paused=false;g.elapsed=119.99;Street.step(g,.02);assert.equal(g.done,true);
});
test("youth cups keep eligible players and explicitly identify generated fillers",()=>{
  const source=roster("c");source[2].age=19;source[3].age=20;const ps=Tour.youthRoster({id:"c"},source);assert.equal(ps.length,18);assert.ok(ps.every(p=>p.age<=21));assert.ok(ps.some(p=>p.pos==="POR"));assert.equal(new Set(ps.map(p=>p.id)).size,18);assert.ok(ps.filter(p=>p.academy).every(p=>p.real===false&&p.name.startsWith("Canterano")));
});
