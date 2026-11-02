/* AURA Calle / VOLTA Tour — an arcade circuit without real-money currency or UT impact. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.AuraStreetCircuit=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const opponents=Object.freeze(["emelec","boca","madrid","city"]);
  const labels=Object.freeze(["JORNADA 1 · GUAYAQUIL","JORNADA 2 · BUENOS AIRES","JORNADA 3 · MADRID","GRAN FINAL · MANCHESTER"]);
  function create(home="barcelona",settings={}){
    const goalLimit=[3,5,7].includes(settings.goalLimit)?settings.goalLimit:5;
    const seconds=[60,120,180].includes(settings.seconds)?settings.seconds:120;
    const difficulty=[.78,1,1.16].includes(settings.difficulty)?settings.difficulty:1;
    const schedule=opponents.filter(id=>id!==home);
    if(schedule.length<3)schedule.push("river");
    return {home,goalLimit,seconds,difficulty,
      fixtures:schedule.slice(0,4),results:[],status:"playing",
      wins:0,draws:0,losses:0,goals:0,conceded:0,points:0,streak:0,bestStreak:0};
  }
  function next(c){return c?.status==="playing"?c.fixtures[c.results.length]||null:null;}
  function complete(c,score){
    if(!next(c)||!Number.isSafeInteger(score?.home)||!Number.isSafeInteger(score?.away)||
      score.home<0||score.away<0||score.home>c.goalLimit||score.away>c.goalLimit)return false;
    const opponent=next(c),won=score.home>score.away,draw=score.home===score.away;
    const record={round:c.results.length+1,opponent,home:score.home,away:score.away,
      points:won?3:draw?1:0,result:won?"W":draw?"D":"L"};
    c.results.push(record);
    c.goals+=score.home;c.conceded+=score.away;c.points+=record.points;
    c.wins+=Number(won);c.draws+=Number(draw);c.losses+=Number(!won&&!draw);
    c.streak=won?c.streak+1:0;c.bestStreak=Math.max(c.bestStreak,c.streak);
    if(c.results.length===c.fixtures.length)c.status="finished";
    return record;
  }
  function rank(c){
    if(!c||c.status!=="finished")return null;
    if(c.points>=10)return {name:"ORO",icon:"🏆"};
    if(c.points>=7)return {name:"PLATA",icon:"🥈"};
    return {name:"BRONCE",icon:"🥉"};
  }
  return {opponents,labels,create,next,complete,rank};
});