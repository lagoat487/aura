"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const S=require("../skill-games");
const store=()=>{const rows=new Map();return {getItem:k=>rows.get(k)||null,setItem:(k,v)=>rows.set(k,v),keys:()=>[...rows.keys()]};};
test("Three playable skill challenges use deterministic targets",()=>{
 for(const kind of Object.keys(S.kinds)){
  const a=S.create(kind,12345),b=S.create(kind,12345);
  assert.deepEqual(S.target(a),S.target(b));
  assert.ok(S.lanes.includes(S.target(a).lane));
  assert.ok(S.powers.includes(S.target(a).distance));
  assert.equal(S.valid(a),true);
 }
 assert.equal(S.create("invalid"),null);
});
test("Nine skill interactions award medals and cannot pay a second time",()=>{
 const g=S.create("shooting",19);
 for(let i=0;i<S.ROUNDS;i++){
  const t=S.target(g),r=S.take(g,t.lane,t.distance);
  assert.equal(r.points,100);assert.equal(g.turn,i+1);
 }
 assert.equal(g.score,900);assert.equal(g.hits,9);assert.equal(g.status,"finished");
 assert.equal(S.medal(g),"Oro");assert.equal(S.take(g,"left","soft"),null);
 assert.equal(S.target(g),null);assert.equal(S.valid(g),true);
});
test("Wrong choices score less and corrupted attempts cannot be loaded",()=>{
 const g=S.create("keeping",34),t=S.target(g);
 const wrong=S.lanes[(S.lanes.indexOf(t.lane)+2)%3];
 assert.ok(S.take(g,wrong,"soft").points<100);
 const altered=JSON.parse(JSON.stringify(g));altered.score+=100;
 assert.equal(S.valid(altered),false);
 const fake=JSON.parse(JSON.stringify(g));fake.attempts[0].points=1000;
 assert.equal(S.valid(fake),false);
});
test("Skill records save independently and survive reload safely",()=>{
 const st=store(),g=S.create("passing",35);
 let t=S.target(g);S.take(g,t.lane,t.distance);
 assert.equal(S.save(st,g,{}),true);assert.deepEqual(S.load(st).session,g);
 assert.deepEqual(st.keys(),[S.KEY]);
 for(let i=1;i<S.ROUNDS;i++){t=S.target(g);S.take(g,t.lane,t.distance);}
 const best=S.finish({},g);assert.equal(best.passing,900);
 assert.equal(S.save(st,g,best),true);assert.equal(S.load(st).best.passing,900);
 assert.equal(S.finish(best,S.create("passing")),null);
 st.setItem(S.KEY,"{bad");assert.deepEqual(S.load(st),{session:null,best:{}});
 assert.equal(S.save({setItem(){throw Error("blocked");}},g,best),false);
});

test("Keeper decisions reveal the shot only after the attempt, without changing its score",()=>{
 const g=S.create("keeping",77),before=S.target(g);
 const result=S.take(g,"left","strong");
 assert.deepEqual(result.target,before);
 assert.equal(g.attempts[0].points,result.points);
 assert.equal(S.valid(g),true);
});
