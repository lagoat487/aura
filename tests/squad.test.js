const test=require("node:test"),assert=require("node:assert/strict");
const Squad=require("../squad.js");
function game(){
  const positions=["POR","LI","DFC","DFC","LD","MCD","MC","MC","EI","DC","ED","POR","DC","DFC","MC","EI","LD","MCO"];
  return {club:"home",season:2026,rosters:{home:positions.map((pos,i)=>({id:"p"+i,name:"Jugador "+i,pos,overall:80-i%3,wage:10000,age:25,value:10000000}))}};
}
test("automatic XI uses eleven unique players and a goalkeeper in goal",()=>{
  const g=game(),s=Squad.ensure(g);
  assert.equal(new Set(s.xi).size,11);
  assert.equal(g.rosters.home.find(p=>p.id===s.xi[0]).pos,"POR");
  assert.ok(s.xi.every((id,i)=>Squad.positionPenalty(g.rosters.home.find(p=>p.id===id),Squad.formations[s.formation][i][0])===0));
});
test("a bench substitution stays selected, survives render repair and changes team strength",()=>{
  const g=game(),s=Squad.ensure(g),first=s.xi[9],bench=g.rosters.home.find(p=>!s.xi.includes(p.id)&&p.pos==="DC");
  bench.overall=40;const before=Squad.strength(g);
  assert.equal(Squad.swap(g,first,bench.id),true);
  assert.ok(Squad.ensure(g).xi.includes(bench.id));
  assert.ok(!s.xi.includes(first));assert.ok(Squad.strength(g)<before);
  assert.equal(Squad.swap(g,"missing",bench.id),false);
});
test("all formations preserve the chosen XI and have eleven slots",()=>{
  const g=game();Squad.ensure(g);const ids=g.squad.xi.slice().sort();
  for(const formation of Object.keys(Squad.formations)){
    assert.equal(Squad.formations[formation].length,11);assert.equal(Squad.setFormation(g,formation),true);
    assert.deepEqual(g.squad.xi.slice().sort(),ids);
  }
  assert.equal(Squad.setFormation(g,"bad"),false);
});
test("selling a starter repairs the sheet without duplicate players or a missing captain",()=>{
  const g=game();Squad.ensure(g);const old=g.squad.xi[0];g.squad.captain=old;
  g.rosters.home=g.rosters.home.filter(p=>p.id!==old);Squad.ensure(g);
  assert.equal(new Set(g.squad.xi).size,11);assert.ok(!g.squad.xi.includes(old));assert.ok(g.squad.xi.includes(g.squad.captain));
  assert.equal(g.rosters.home.find(p=>p.id===g.squad.xi[0]).pos,"POR");
});
test("only the selected XI earns appearances, bench players recover, and unfulfilled roles affect morale",()=>{
  const g=game();Squad.ensure(g);const bench=g.rosters.home.find(p=>!g.squad.xi.includes(p.id));bench.role="Crucial";
  const starter=Squad.players(g)[0];
  for(let i=0;i<3;i++)Squad.afterMatch(g,true,false);
  assert.equal(starter.appearances,3);assert.equal(bench.appearances,0);
  assert.ok(bench.fitness>starter.fitness);assert.ok(bench.morale<75);assert.ok(starter.morale>75);
});
