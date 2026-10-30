'use strict';
// Controlled gameplay scenarios, not a prediction of real-world save rates.
// Optional first argument: an earlier match-engine file for before/after runs.
const path=require('node:path'),M=require(process.argv[2]?path.resolve(process.argv[2]):'../match-engine');
const team=id=>({id,name:id,players:M.SHAPE.map((slot,i)=>({id:id+i,name:id+' '+i,pos:slot[0],overall:80}))});
const cases=[
 {name:'One-on-one near the post, then finish',x:39,z:3,dribble:true,aim:1},
 {name:'Central shot from 16 m',x:36,z:0,aim:0,power:.7},
 {name:'Placed shot from 12 m',x:40,z:0,aim:1,power:.8},
 {name:'Diagonal shot, keeper off centre',x:42,z:8,aim:-1,power:.8,keeperZ:2.8},
 {name:'Open goal after beating the keeper',x:50,z:0,aim:0,power:.6,keeperX:45,keeperZ:4},
];
function attempt(scenario,seed){
 const g=M.create({home:team('home'),away:team('away'),seconds:180,seed:seed*7919});g.phase='playing';
 g.players.forEach(p=>Object.assign(p,{x:p.team?-12:-35,z:30,cooldown:99}));
 Object.assign(g.players[11],{x:scenario.keeperX??48,z:scenario.keeperZ??0,cooldown:0});
 const striker=g.players[9];Object.assign(striker,{x:scenario.x,z:scenario.z,cooldown:0});Object.assign(g.ball,{owner:9,x:scenario.x+.7,z:scenario.z});
 let shot=false;
 for(let frame=0;frame<480&&g.phase==='playing';frame++){
  if(!shot&&g.ball.owner===9&&(!scenario.dribble||striker.x>=49))shot=M.action(g,'shoot',{z:scenario.aim||0,power:scenario.power||.7});
  M.step(g,1/60,scenario.dribble&&!shot?{x:1,sprint:true}:{});
  if(g.stats[1].saves||(g.stats[1].claims||0))return 'stopped';
 }
 return g.score[0]?'goal':'other';
}
const attempts=120,rows=cases.map(scenario=>{
 const counts={goal:0,stopped:0,other:0};for(let seed=1;seed<=attempts;seed++)counts[attempt(scenario,seed)]++;
 return {scenario:scenario.name,attempts,...counts};
});
console.log(JSON.stringify(rows,null,2));
