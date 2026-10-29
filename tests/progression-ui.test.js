"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
function boot(){
 const nodes=new Map(),events={};
 const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:"",hidden:true,value:"",addEventListener(){},classList:{add(){},remove(){}}});return nodes.get(id);};
 const context=vm.createContext({document:{getElementById:node,addEventListener:(name,handler)=>{events[name]=handler;},querySelector:()=>null},window:{scrollTo(){}},setTimeout(){},clearTimeout(){}});
 for(const file of ["clubs.js","competitions.js","world.js","real-players.js", "world-tour.js", "roster-sync.js", "club-badges.js","squad.js","progression.js","negotiations.js","career-ui.js","progression-ui.js","match-engine.js","match-graphics.js","match-ui.js","evolution-ui.js", "street.js", "tour-ui.js","game.js"]){vm.runInContext(fs.readFileSync(path.join(__dirname,"..",file),"utf8"),context,{filename:file});}
 return {run:code=>vm.runInContext(code,context),html:()=>node("app").innerHTML,click:dataset=>events.click({target:{closest:()=>({dataset})}}),change:(id,value)=>events.change({target:{id,value}}),node};
}
test("the development screen trains the selected player once and refreshes after a league match",()=>{
 const app=boot();app.click({action:"start"});app.click({nav:"academy"});
 assert.match(app.html(),/Campo de entrenamiento/);assert.match(app.html(),/Red de ojeadores/);
 const player=app.run('clubPlayers(state.club).find(p=>p.overall<p.potential).id');
 app.change("progression-player",player);app.change("progression-focus","intensive");
 const before=app.run('clubPlayers(state.club).find(p=>p.id==='+JSON.stringify(player)+').fitness');
 app.click({progression:"train"});assert.equal(app.run('clubPlayers(state.club).find(p=>p.id==='+JSON.stringify(player)+').fitness'),before-12);
 assert.match(app.html(),/Sesión completada/);assert.match(app.html(),/2 \/ 3 disponibles/);
 const snapshot=app.run("JSON.stringify(state)");app.click({progression:"train"});assert.equal(app.run("JSON.stringify(state)"),snapshot);
 app.click({action:"play"});assert.match(app.html(),/3 \/ 3 disponibles/);
});
test("scouting and board rewards are reachable through the career interface and debit once",()=>{
 const app=boot();app.click({action:"start"});app.click({nav:"academy"});
 const before=app.run("state.budget");app.change("progression-region","ecuador");app.click({progression:"scout"});
 assert.equal(app.run("state.budget"),before-75000);assert.match(app.html(),/Cantera generada/);
 assert.equal((app.html().match(/data-youth=/g)||[]).length,3);
 const report=app.run("JSON.stringify(state.progression.report)");app.click({progression:"scout"});assert.equal(app.run("state.budget"),before-75000);assert.equal(app.run("JSON.stringify(state.progression.report)"),report);
 app.run("state.wins=state.progression.winTarget");const rewardBefore=app.run("state.budget");app.click({progression:"claim",objective:"wins"});assert.equal(app.run("state.budget"),rewardBefore+1500000);assert.match(app.html(),/RECOMPENSA RECIBIDA/);
 app.click({progression:"claim",objective:"wins"});assert.equal(app.run("state.budget"),rewardBefore+1500000);
});
