/* AURA 27 — Interactive quick-match penalty shootout.
 * Turn-based original mini-game. No currencies, Career or Ultimate Team changes. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.AuraPenaltyChallenge=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const KEY="aura-penalty-challenge-v1",VERSION=1,LIMIT=12000;
  const directions=["left","center","right"];
  const name=s=>typeof s==="string"&&s.length>0&&s.length<100;
  const rate=n=>Number.isFinite(n)&&n>=1&&n<=99;
  function random(s){let n=s>>>0;return ()=>{n=(Math.imul(1664525,n)+1013904223)>>>0;return n/4294967296;};}
  function hash(s){let n=2166136261;for(const ch of String(s))n=Math.imul(n^ch.charCodeAt(0),16777619)>>>0;return n;}
  function create(home,away,homeRating=80,awayRating=80,seed){
    if(!name(home)||!name(away)||home===away||!rate(homeRating)||!rate(awayRating))
      throw Error("Elige dos clubes distintos y válidos para jugar penaltis.");
    const value=Number.isSafeInteger(seed)&&seed>=0&&seed<=4294967295?seed>>>0:
      (hash(home+":"+away)^(Date.now()>>>0))>>>0;
    return {home,away,homeRating,awayRating,seed:value,kicks:[],score:[0,0],status:"playing",winner:null};
  }
  function side(c){return c?.status==="playing"?c.kicks.length%2:null;}
  function finish(c){
    const n=c.kicks.length,h=Math.ceil(n/2),a=Math.floor(n/2);
    const leftH=Math.max(0,5-h),leftA=Math.max(0,5-a);
    const early=n<10&&((c.score[0]>c.score[1]+leftA)||(c.score[1]>c.score[0]+leftH));
    const pairedDecision=n>=10&&n%2===0&&c.score[0]!==c.score[1];
    if(early||pairedDecision){
      c.status="finished";c.winner=c.score[0]>c.score[1]?c.home:c.away;
    }else if(n===60){
      // Extremely unlikely 30-pair tie: deterministic final technical decision.
      c.status="finished";c.winner=c.homeRating>=c.awayRating?c.home:c.away;
    }
  }
  function kick(c,direction){
    if(side(c)===null||!directions.includes(direction)||c.kicks.length>=60)return false;
    const index=c.kicks.length,team=index%2,attack=team===0;
    const rng=random((c.seed+Math.imul(index+1,104729))>>>0);
    const cpuChoice=directions[Math.floor(rng()*3)];
    const aim=attack?direction:cpuChoice,dive=attack?cpuChoice:direction;
    const strength=attack?c.homeRating:c.awayRating,keeper=attack?c.awayRating:c.homeRating;
    const matched=aim===dive;
    // Direction matters: a correct dive sharply improves the chance of a save.
    const base=(matched?.43:.91)+(strength-80)*.002-(keeper-80)*.0015;
    const probability=Math.max(.2,Math.min(.98,base));
    const scored=rng()<probability;
    const shot={side:team,choice:direction,aim,dive,scored};
    c.kicks.push(shot);if(scored)c.score[team]++;
    finish(c);
    return shot;
  }
  function valid(c){
    if(!c||!name(c.home)||!name(c.away)||c.home===c.away||
      !rate(c.homeRating)||!rate(c.awayRating)||!Number.isSafeInteger(c.seed)||
      c.seed<0||c.seed>4294967295||!Array.isArray(c.kicks)||c.kicks.length>60||
      !Array.isArray(c.score)||c.score.length!==2||
      !c.score.every(n=>Number.isSafeInteger(n)&&n>=0&&n<=30)||
      !["playing","finished"].includes(c.status))return false;
    try{
      const replay=create(c.home,c.away,c.homeRating,c.awayRating,c.seed);
      for(const expected of c.kicks){
        if(!expected||!directions.includes(expected.choice))return false;
        const got=kick(replay,expected.choice);
        if(!got||JSON.stringify(got)!==JSON.stringify(expected))return false;
      }
      return JSON.stringify(replay.score)===JSON.stringify(c.score)&&
        replay.status===c.status&&replay.winner===c.winner;
    }catch{return false;}
  }
  function load(storage){
    try{
      const s=storage?.getItem?.(KEY);
      if(!s||s.length>LIMIT)return null;
      const x=JSON.parse(s);
      return x.version===VERSION&&valid(x.challenge)?x.challenge:null;
    }catch{return null;}
  }
  function save(storage,challenge){
    try{
      if(!storage?.setItem||!valid(challenge))return false;
      const raw=JSON.stringify({version:VERSION,challenge});
      if(raw.length>LIMIT)return false;
      storage.setItem(KEY,raw);return true;
    }catch{return false;}
  }
  return {KEY,directions,create,kick,side,valid,load,save};
});
