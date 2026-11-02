/* AURA quick-match rivalry: first to two wins, with shootouts for drawn games. */
(function(root,factory){
  const api=factory(typeof module==="object"&&module.exports?require("./mode-knockout"):root.AuraKnockout);
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.AuraRivalry=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(K){
  "use strict";
  function hash(str){let n=2166136261;for(const x of String(str))n=Math.imul(n^x.charCodeAt(0),16777619)>>>0;return n;}
  function create(home,away,homeRating=80,awayRating=80,seed){
    if(!home||!away||home===away)throw Error("Escoge dos clubes diferentes para la rivalidad.");
    return {home,away,homeRating:Number(homeRating)||80,awayRating:Number(awayRating)||80,
      seed:Number.isSafeInteger(seed)?seed>>>0:hash(home+":"+away),
      results:[],wins:[0,0],status:"playing",champion:null,goals:[0,0]};
  }
  function next(c){return c?.status==="playing"&&c.results.length<3?c.results.length+1:null;}
  function record(c,score){
    const round=next(c);
    if(!round||!Number.isSafeInteger(score?.home)||!Number.isSafeInteger(score?.away)||
       score.home<0||score.away<0||score.home>99||score.away>99)return false;
    const penalties=score.home===score.away?K.shootout(c.homeRating,c.awayRating,c.seed+round*104729):null;
    const winner=penalties?penalties.winner:score.home>score.away?0:1;
    const outcome={round,score:{home:score.home,away:score.away},penalties,winner};
    c.results.push(outcome);c.wins[winner]++;c.goals[0]+=score.home;c.goals[1]+=score.away;
    if(c.wins[winner]>=2||c.results.length===3){
      c.champion=winner===0?c.home:c.away;c.status="finished";
    }
    return outcome;
  }
  return {create,next,record};
});