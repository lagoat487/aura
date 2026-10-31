const test=require("node:test"),assert=require("node:assert/strict");
const Deals=require("../negotiations.js"),Squad=require("../squad.js");
function game(){
  const positions=["POR","LI","DFC","DFC","LD","MCD","MC","MC","EI","DC","ED","POR","DC","DFC","MC","EI","LD","MCO"];
  const roster=cid=>positions.map((pos,i)=>({id:cid+"-"+i,name:cid+" "+i,pos,overall:82,wage:10000,age:22,value:10000000,club:cid}));
  const g={club:"home",season:2026,round:0,budget:100000000,rosters:{home:roster("home"),away:roster("away"),rival:roster("rival")},news:[]};
  Deals.initialize(g);return g;
}
function ready(g){
  const p=g.rosters.away[9],{deal}=Deals.start(g,p,{sourceId:"away",sourceName:"Away",buyerRating:86});
  assert.ok(Deals.enquire(g,deal).ok);assert.ok(Deals.offerClub(g,deal,{fee:deal.target,sellOn:5}).accepted);
  assert.ok(Deals.offerContract(g,deal,{...deal.contract}).accepted);return deal;
}
test("a transfer has enquiries and two agreements; only signing changes money and ownership",()=>{
  const g=game(),before=g.budget,d=ready(g);assert.equal(d.stage,"ready");assert.equal(g.budget,before);
  assert.ok(g.rosters.away.some(p=>p.id===d.playerId));assert.ok(Deals.complete(g,d).ok);
  assert.equal(d.stage,"signed");assert.equal(g.budget,before-d.fee-d.terms.bonus-d.terms.agent);
  const p=g.rosters.home.find(p=>p.id===d.playerId);assert.equal(p.role,d.terms.role);assert.equal(p.wage,d.terms.wage);
  assert.equal(p.contractEnd,2030);assert.equal(p.sellOnClause.percentage,5);assert.equal(p.morale,90);
  assert.ok(!g.rosters.away.some(p=>p.id===d.playerId));assert.equal(g.transactions.length,1);
  const paid=g.budget;assert.ok(Deals.complete(g,d).error);assert.equal(g.budget,paid);
});
test("a reasonable low offer produces an actionable counter; insulting offers break talks with a cooldown",()=>{
  const g=game(),p=g.rosters.away[9],d=Deals.start(g,p,{buyerRating:90}).deal;Deals.enquire(g,d);
  assert.ok(Deals.offerClub(g,d,{fee:9000000}).counter);assert.ok(d.counter.fee<d.target);
  assert.ok(Deals.offerClub(g,d,{...d.counter}).accepted);assert.equal(d.stage,"contract");
  const d2=Deals.start(g,g.rosters.away[8],{buyerRating:90}).deal;Deals.enquire(g,d2);
  for(let i=0;i<3;i++)Deals.offerClub(g,d2,{fee:1});
  assert.equal(d2.stage,"failed");assert.equal(g.budget,100000000);
  assert.ok(Deals.start(g,g.rosters.away[8]).error);g.round=2;assert.ok(Deals.start(g,g.rosters.away[8]).deal);
});
test("bad numbers never mutate an agreement or budget",()=>{
  const g=game(),d=Deals.start(g,g.rosters.away[9],{buyerRating:90}).deal;Deals.enquire(g,d);
  for(const fee of [NaN,Infinity,-1,0,10.1,Number.MAX_SAFE_INTEGER])assert.ok(Deals.offerClub(g,d,{fee}).error);
  assert.equal(d.turns,0);assert.equal(g.budget,100000000);
  Deals.offerClub(g,d,{...d.counter});
  for(const terms of [{...d.contract,wage:NaN},{...d.contract,bonus:-100},{...d.contract,years:2.5},{...d.contract,role:"Fake"}])assert.ok(Deals.offerContract(g,d,terms).error);
  assert.equal(d.contractTurns,0);
});
test("current budgets, ownership and squad capacity are rechecked at final signing",()=>{
  const g=game(),d=ready(g),before=JSON.stringify(g.rosters);g.budget=d.fee;
  assert.ok(Deals.complete(g,d).error);assert.equal(JSON.stringify(g.rosters),before);
  g.budget=100000000;g.wageBudget=Squad.wages(g);assert.ok(Deals.complete(g,d).error);
  g.wageBudget=1000000;
  while(g.rosters.home.length<28)g.rosters.home.push({...g.rosters.home[0],id:"extra"+g.rosters.home.length});
  assert.ok(Deals.complete(g,d).error);assert.equal(g.budget,100000000);
  const other=game(),d2=ready(other),p=other.rosters.away.splice(9,1)[0];other.rosters.rival.push(p);
  assert.ok(Deals.complete(other,d2).error);assert.equal(other.budget,100000000);
});
test("wage, role and contract duration can produce agent counteroffers",()=>{
  const g=game(),d=ready(g);d.stage="contract";
  assert.ok(Deals.offerContract(g,d,{...d.contract,wage:d.contract.wage-1000,role:"Promesa"}).counter);
  assert.ok(Deals.offerContract(g,d,{...d.contractCounter}).accepted);
});
test("meeting an existing release clause bypasses a higher seller asking price",()=>{
  const g=game(),p=g.rosters.away[9];p.releaseClause=5000000;
  const d=Deals.start(g,p,{buyerRating:90}).deal;Deals.enquire(g,d);
  assert.ok(Deals.offerClub(g,d,{fee:5000000}).accepted);assert.equal(d.fee,5000000);
});
test("renewal charges the bonus once and replaces the old wage in the payroll",()=>{
  const g=game(),p=g.rosters.home[0],oldWage=p.wage,d=Deals.start(g,p,{mode:"renew"}).deal;
  const before=Squad.wages(g),funds=g.budget;assert.equal(d.stage,"contract");
  assert.ok(Deals.offerContract(g,d,{...d.contract}).accepted);assert.ok(Deals.complete(g,d).ok);
  assert.equal(d.stage,"renewed");assert.equal(g.rosters.home.length,18);
  assert.equal(g.budget,funds-d.contract.bonus);assert.equal(Squad.wages(g),before-oldWage+d.contract.wage);
});
test("sale negotiates with a buyer and pays out the actual fee minus the previous sell-on clause",()=>{
  const g=game(),p=g.rosters.home[9];p.sellOnClause={club:"previous",percentage:20};
  const d=Deals.start(g,p,{mode:"sell",buyer:{id:"rival",name:"Rival"}}).deal;
  assert.ok(Deals.offerClub(g,d,{fee:20000000}).counter);assert.equal(g.rosters.home.length,18);
  assert.ok(Deals.offerClub(g,d,{...d.counter}).accepted);assert.ok(Deals.complete(g,d).ok);
  assert.equal(g.budget,100000000+Math.round(d.fee*.8));assert.equal(d.obligation,Math.round(d.fee*.2));
  assert.ok(g.rosters.rival.some(x=>x.id===p.id));assert.ok(!g.squad.xi.includes(p.id));
});
test("final sale signing protects a newly selected player-career protagonist while other sales remain available",()=>{
  const g=game(),p=g.rosters.home[9],d=Deals.start(g,p,{mode:"sell",buyer:{id:"rival",name:"Rival"}}).deal;
  assert.ok(Deals.offerClub(g,d,{fee:d.ceiling}).accepted);
  g.playerCareer={playerId:p.id,xp:0,appearances:0,goals:0,lastRating:null};const before=structuredClone(g);
  assert.ok(Deals.complete(g,d).error,'a ready sale must recheck the currently controlled footballer');assert.deepEqual(g,before);
  const other=g.rosters.home[8],otherDeal=Deals.start(g,other,{mode:"sell",buyer:{id:"rival",name:"Rival"}}).deal;
  assert.ok(Deals.offerClub(g,otherDeal,{fee:otherDeal.ceiling}).accepted);assert.ok(Deals.complete(g,otherDeal).ok);
  assert.equal(g.budget,before.budget+otherDeal.fee);assert.equal(g.transactions.length,1);assert.equal(g.transactions[0].playerId,other.id);
  assert.ok(g.rosters.home.some(player=>player.id===p.id));assert.equal(d.stage,'ready');assert.equal(Deals.withdraw(g,d),true);
});
test("pause/resume reuses the active deal and withdrawing never spends money",()=>{
  const g=game(),p=g.rosters.away[9],d=Deals.start(g,p,{buyerRating:90}).deal;
  assert.equal(Deals.start(g,p).deal,d);assert.equal(g.negotiations.length,1);
  Deals.enquire(g,d);Deals.withdraw(g,d);assert.equal(d.stage,"withdrawn");assert.equal(g.budget,100000000);
  assert.ok(Deals.complete(g,d).error);
});
test("rival interest appears only when advancing; a hijacked deal moves ownership without billing the manager",()=>{
  const g=game(),d=ready(g),rivals=[{id:"rival",name:"Rival",rating:90}];
  Deals.tick(g,rivals,()=>0);assert.equal(d.stage,"contract");assert.equal(d.rival.id,"rival");
  assert.equal(g.budget,100000000);Deals.tick(g,rivals,()=>0);
  assert.equal(d.stage,"failed");assert.equal(g.budget,100000000);
  assert.ok(g.rosters.rival.some(p=>p.id===d.playerId));assert.ok(!g.rosters.away.some(p=>p.id===d.playerId));
});
test("club availability, project level and minimum roster size are enforced",()=>{
  const g=game();g.rosters.away=g.rosters.away.slice(0,11);
  const d=Deals.start(g,g.rosters.away[9],{buyerRating:90}).deal;assert.ok(Deals.enquire(g,d).failed);
  g.rosters.home=g.rosters.home.slice(0,11);assert.ok(Deals.start(g,g.rosters.home[0],{mode:"sell"}).error);
  const other=game(),high={...other.rosters.away[10],id:"star",overall:99},d2=Deals.start(other,high,{buyerRating:70}).deal;
  assert.ok(Deals.enquire(other,d2).failed);
});
