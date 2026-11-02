"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const P=require("../penalty-challenge");
const choose=(g)=>P.directions[(g.seed+g.kicks.length)%3];
function finish(g){
  while(g.status==="playing"){
    const shot=P.kick(g,choose(g));
    assert.ok(shot);
    assert.equal(P.valid(g),true);
    if(g.kicks.length>10&&g.kicks.length%2===1)
      assert.equal(g.status,"playing","Sudden death must allow the other team to shoot");
  }
  return g;
}
const store=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),keys:()=>[...data.keys()]};};
test("Penalty challenge enforces alternating player shots and goalkeeper decisions",()=>{
  const c=P.create("barcelona","madrid",87,88,31);
  assert.equal(P.side(c),0);
  const shot=P.kick(c,"left");
  assert.equal(shot.side,0);assert.equal(shot.aim,"left");assert.equal(P.side(c),1);
  const save=P.kick(c,"right");
  assert.equal(save.side,1);assert.equal(save.dive,"right");assert.equal(P.side(c),0);
  assert.equal(P.kick(c,"diagonal"),false);
  assert.equal(c.kicks.length,2);
});
test("Penalty shootouts end legally after five kicks or paired sudden death",()=>{
  let tiebreaks=0;
  for(let seed=0;seed<300;seed++){
    const c=finish(P.create("barcelona","madrid",85,85,seed));
    assert.ok(["barcelona","madrid"].includes(c.winner));
    assert.ok(c.kicks.length<=60);
    assert.equal(P.kick(c,"center"),false);
    if(c.kicks.length>10)tiebreaks++;
  }
  assert.ok(tiebreaks>0);
});
test("Penalty save and restore preserve every selected direction and result",()=>{
  const local=store(),c=P.create("boca","river",83,84,50);
  P.kick(c,"center");P.kick(c,"left");
  assert.equal(P.save(local,c),true);
  assert.deepEqual(P.load(local),c);
  const next=P.load(local);finish(next);
  assert.equal(P.save(local,next),true);
  assert.equal(P.load(local).winner,next.winner);
  assert.deepEqual(local.keys(),[P.KEY]);
});
test("Penalty data validation rejects altered scores, impossible shots and corrupt files",()=>{
  const local=store(),c=P.create("arsenal","chelsea",82,81,5);
  P.kick(c,"left");
  assert.equal(P.valid({...c,score:[10,0]}),false);
  assert.equal(P.valid({...c,kicks:[{...c.kicks[0],scored:!c.kicks[0].scored}]}),false);
  assert.equal(P.valid({...c,winner:"madrid"}),false);
  assert.equal(P.save(local,{...c,score:[99,99]}),false);
  assert.equal(P.load({getItem(){throw Error("blocked");}}),null);
  assert.equal(P.save({setItem(){throw Error("blocked");}},c),false);
  local.setItem(P.KEY,"{invalid");
  assert.equal(P.load(local),null);
});
test("Penalty challenge isolates all unrelated saves and rejects duplicate clubs",()=>{
  assert.throws(()=>P.create("barcelona","barcelona"),/distintos/);
  const local=store();
  local.setItem("aura-mode-progress-v1","draft");
  local.setItem("aura-volta-circuit-v1","street");
  local.setItem("aura-independent-cups-v1","cups");
  assert.equal(P.save(local,P.create("madrid","barcelona",88,87,123)),true);
  assert.equal(local.getItem("aura-mode-progress-v1"),"draft");
  assert.equal(local.getItem("aura-volta-circuit-v1"),"street");
  assert.equal(local.getItem("aura-independent-cups-v1"),"cups");
  assert.equal(local.getItem("aura-fc27-save-v1"),null);
});
