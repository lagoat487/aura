"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const P=require("../pro-training");
function game(){
 const player={id:"pro:barcelona",name:"Emilio",pos:"DC",overall:68,potential:92,form:80,fitness:95,morale:75};
 return {club:"barcelona",season:2026,round:0,competition:{fixtures:Array.from({length:10},()=>[])},
    rosters:{barcelona:[player]},playerCareer:{playerId:player.id,xp:0,appearances:0,goals:0,lastRating:null}};
}
test("Pro weekly training offers distinct drills with finite XP, fatigue and form tradeoffs",()=>{
 assert.deepEqual(Object.keys(P.drills),["shooting","passing","sprint","recovery"]);
 assert.ok(Object.values(P.drills).every(d=>d.xp>0&&d.xp<100&&Number.isFinite(d.fitness)&&d.name&&d.desc));
 const g=game(),p=g.rosters.barcelona[0];
 assert.equal(P.status(g).available,true);
 const result=P.train(g,"shooting");
 assert.equal(result.ok,true);assert.equal(result.record.drill,"shooting");
 assert.equal(g.playerCareer.xp,42);
 assert.equal(p.fitness,87);assert.equal(p.form,86);assert.equal(p.morale,78);
 assert.equal(g.playerCareer.lastTraining,"2026:0");
 assert.equal(g.playerCareer.trainingHistory.length,1);
});
test("Only one drill is permitted per round, and repeats do not mutate stats",()=>{
 const g=game();P.train(g,"sprint");
 const snapshot=JSON.stringify(g);
 assert.match(P.train(g,"sprint").error,/Ya entrenaste/);
 assert.match(P.train(g,"recovery").error,/Ya entrenaste/);
 assert.equal(JSON.stringify(g),snapshot);
 g.round=1;assert.equal(P.status(g).available,true);
 assert.equal(P.train(g,"recovery").ok,true);
 assert.equal(g.playerCareer.trainingHistory.length,2);
 assert.equal(g.playerCareer.trainingHistory[0].round,1);
});
test("Pro training respects the potential cap and can level up once per available session",()=>{
 const g=game(),pc=g.playerCareer,p=g.rosters.barcelona[0];
 p.overall=91;p.potential=92;pc.xp=85;
 const result=P.train(g,"shooting");
 assert.equal(result.ok,true);assert.equal(result.record.leveled,true);
 assert.equal(p.overall,92);assert.equal(pc.xp,27);
 g.round=1;P.train(g,"sprint");
 assert.equal(p.overall,92);assert.ok(pc.xp<=99);
});
test("Recovery exercise restores energy safely without exceeding 100",()=>{
 const g=game(),p=g.rosters.barcelona[0];p.fitness=94;p.form=99;p.morale=99;
 assert.equal(P.train(g,"recovery").ok,true);
 assert.equal(p.fitness,100);assert.equal(p.form,100);assert.equal(p.morale,100);
});
test("No player, invalid drill, corrupted data or completed season never mutates the career",()=>{
 const g=game();const snapshot=JSON.stringify(g);
 assert.match(P.train(g,"illegal").error,/no disponible/);
 assert.equal(JSON.stringify(g),snapshot);
 delete g.playerCareer;assert.match(P.train(g,"shooting").error,/Inicia Carrera/);
 assert.equal(P.status(g),null);
 g.playerCareer={playerId:"pro:barcelona",xp:0};g.round=10;
 assert.equal(P.status(g).available,false);
 assert.match(P.train(g,"shooting").error,/Ya entrenaste/);
 g.round=1;g.rosters.barcelona[0].potential=10;
 const before=JSON.stringify(g);
 assert.match(P.train(g,"shooting").error,/Datos/);
 assert.equal(JSON.stringify(g),before);
});
test("Training history is bounded, and a new season permits new training",()=>{
 const g=game();for(let i=0;i<16;i++){g.season=2026+Math.floor(i/10);g.round=i%10;assert.equal(P.train(g,"passing").ok,true);}
 assert.equal(g.playerCareer.trainingHistory.length,12);
 assert.equal(g.playerCareer.trainingHistory[0].season,2027);
 assert.equal(g.playerCareer.trainingHistory[0].round,5);
 assert.equal(g.playerCareer.appearances,0);
});
