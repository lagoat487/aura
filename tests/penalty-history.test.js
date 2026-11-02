"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const Penalty=require("../penalty-challenge");
const History=require("../penalty-history");
const store=()=>{const data=new Map();return {setItem:(k,v)=>data.set(k,v),getItem:k=>data.get(k)||null,keys:()=>[...data.keys()]};};
const complete=seed=>{
  const c=Penalty.create("barcelona","madrid",87,85,seed);
  while(c.status==="playing")Penalty.kick(c,Penalty.directions[(seed+c.kicks.length)%3]);
  assert.equal(Penalty.valid(c),true);
  return c;
};
test("Penalty history records completed matches once, survives reload and isolates its save",()=>{
  const local=store(),c=complete(5830);
  const first=History.record(local,c);
  assert.equal(first.ok,true);assert.equal(first.newRecord,true);
  assert.equal(first.rows.length,1);
  assert.equal(History.record(local,c).newRecord,false);
  assert.equal(History.load(local).length,1);
  assert.deepEqual(local.keys(),[History.KEY]);
  const row=History.load(local)[0];
  assert.equal(row.score[0],c.score[0]);assert.equal(row.score[1],c.score[1]);
  assert.equal(row.kicksTaken,c.kicks.filter(x=>x.side===0).length);
});
test("Shot accuracy and goalkeeper saves count only the right actions",()=>{
  const c=complete(2200),stats=History.details(c);
  assert.equal(stats.goals,c.kicks.filter(x=>x.side===0&&x.scored).length);
  assert.equal(stats.saves,c.kicks.filter(x=>x.side===1&&!x.scored&&x.aim===x.dive).length);
  assert.equal(stats.divesCorrect,c.kicks.filter(x=>x.side===1&&x.aim===x.dive).length);
  assert.equal(stats.opponentGoals,c.score[1]);
  const aggregate=History.stats([History.summary(c)]);
  assert.equal(aggregate.played,1);
  assert.equal(aggregate.goals,c.score[0]);
  assert.equal(aggregate.attempts,stats.kicksTaken);
  assert.equal(aggregate.accuracy,Math.round(100*stats.goals/stats.kicksTaken));
});
test("History keeps only the newest 24 shootouts and sums the stored window",()=>{
  const local=store(),total=History.MAX_ROWS+9;
  for(let i=0;i<total;i++){
    const c=complete(i+300);
    const row=History.record(local,c);
    assert.equal(row.ok,true);
    assert.equal(History.load(local).length,Math.min(i+1,History.MAX_ROWS));
  }
  const rows=History.load(local),s=History.stats(rows);
  assert.equal(rows.length,24);
  assert.equal(s.played,24);assert.equal(s.wins+s.losses,24);
  assert.equal(s.goals,rows.reduce((n,x)=>n+x.goals,0));
  assert.equal(s.saves,rows.reduce((n,x)=>n+x.saves,0));
  assert.equal(rows[0].seed,300+total-1);
  assert.equal(rows[rows.length-1].seed,300+total-24);
});
test("A finished penalty game is valid, an unfinished game must not be logged",()=>{
  const local=store(),c=Penalty.create("barcelona","madrid",87,85,55);
  assert.equal(History.summary(c),null);
  assert.equal(History.record(local,c).ok,false);
  assert.equal(History.load(local).length,0);
  while(c.status==="playing")Penalty.kick(c,"center");
  assert.ok(History.summary(c));
  assert.equal(History.record(local,c).ok,true);
});
test("Forged rows, corrupt files, duplicate IDs and blocked storage are rejected",()=>{
  const local=store(),row=History.summary(complete(18));
  assert.equal(History.validRow({...row,goals:row.goals+1}),false);
  assert.equal(History.validRow({...row,winner:"other"}),false);
  assert.equal(History.validRow({...row,divesCorrect:99}),false);
  assert.equal(History.save(local,[row,row]),false);
  assert.equal(History.save({setItem(){throw Error("blocked");}},[row]),false);
  assert.deepEqual(History.load({getItem(){throw Error("blocked");}}),[]);
  local.setItem(History.KEY,"{broken");
  assert.deepEqual(History.load(local),[]);
});
test("Technical decision at 30 penalty pairs is recognized without inventing a goal",()=>{
  const row=History.summary(complete(27));
  const rare={...row,score:[20,20],goals:20,opponentGoals:20,
    kicksTaken:30,opponentKicks:30,saves:5,divesCorrect:8,winner:row.home};
  assert.equal(History.validRow(rare),true);
  assert.equal(History.validRow({...rare,kicksTaken:29}),false);
});
