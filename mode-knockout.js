/* Shared penalty shootouts and four-round Draft XI elimination tournament.
 * Entirely session-only; no Ultimate Team coins, cards, or Career changes. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.AuraKnockout=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const opponents=["betis","atletico","madrid","city"];
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  function random(seed){let s=seed>>>0;return()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296;};}
  function hash(ids){let h=2166136261;for(const v of ids)for(const c of String(v)){h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;}return h;}
  function shootout(homeRating,awayRating,seed){
    const rng=random(seed>>>0),ratings=[homeRating,awayRating].map(n=>clamp(Number(n)||75,45,99));
    const goalChance=n=>clamp(.71+(n-76)*.0038,.54,.86);
    let home=0,away=0,kicksHome=0,kicksAway=0;
    // Teams take alternating penalties. End a standard series as soon as
    // the trailing side cannot catch up; then use sudden death as needed.
    for(let i=0;i<5;i++){
      home+=Number(rng()<goalChance(ratings[0]));kicksHome++;
      if(home>away+(5-kicksAway))break;
      away+=Number(rng()<goalChance(ratings[1]));kicksAway++;
      if(away>home+(5-kicksHome))break;
    }
    let suddenDeath=false;
    for(let i=0;i<50&&home===away;i++){
      suddenDeath=true;
      home+=Number(rng()<goalChance(ratings[0]));kicksHome++;
      away+=Number(rng()<goalChance(ratings[1]));kicksAway++;
    }
    // A deterministic decision is guaranteed even after exceptionally long draws.
    if(home===away){if(ratings[0]>=ratings[1])home++;else away++;suddenDeath=true;}
    return {home,away,kicksHome,kicksAway,suddenDeath,winner:home>away?0:1};
  }
  function createDraft(players,seed){
    if(!Array.isArray(players)||players.length!==11||new Set(players.map(p=>p?.id)).size!==11||
      players.some(p=>!p||typeof p.id!=="string"||!Number.isFinite(p.overall)))
      throw Error("Completa primero un once de 11 futbolistas diferentes.");
    return {round:0,status:"playing",opponents:opponents.slice(),results:[],
      seed:Number.isSafeInteger(seed)?seed>>>0:hash(players.map(p=>p.id)),
      squad:players.map(p=>p.id),rating:Math.round(players.reduce((n,p)=>n+p.overall,0)/11)};
  }
  function opponent(tournament){return tournament?.status==="playing"?tournament.opponents[tournament.round]||null:null;}
  function recordDraft(tournament,score,opponentRating=80){
    if(!tournament||tournament.status!=="playing"||!opponent(tournament)||
      !Number.isSafeInteger(score?.home)||!Number.isSafeInteger(score?.away)||score.home<0||score.away<0)
      return false;
    const round=tournament.round;
    const penalties=score.home===score.away?shootout(tournament.rating,opponentRating,tournament.seed+7919*round):null;
    const won=penalties?penalties.winner===0:score.home>score.away;
    const match={round:round+1,opponent:opponent(tournament),score:{home:score.home,away:score.away},
      penalties,won};
    tournament.results.push(match);
    if(!won)tournament.status="eliminated";
    else if(round===opponents.length-1)tournament.status="champion";
    else tournament.round++;
    return match;
  }
  return {shootout,createDraft,recordDraft,opponent,opponents};
});