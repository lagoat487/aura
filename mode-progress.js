/* AURA independent game-mode persistence: Draft XI and Quick Rivalry.
 * No Career or Ultimate Team state is read or changed here. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.AuraModeProgress=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const KEY="aura-mode-progress-v1",VERSION=1,MAX_BYTES=60000;
  const safeText=s=>typeof s==="string"&&s.length>0&&s.length<=160;
  const number=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
  const validCard=p=>p&&typeof p==="object"&&!Array.isArray(p)&&safeText(p.id)&&safeText(p.name)&&safeText(p.pos)&&number(p.overall,1,99);
  const validScore=s=>s&&Number.isInteger(s.home)&&Number.isInteger(s.away)&&number(s.home,0,99)&&number(s.away,0,99);
  function validDraft(d){
    if(d===null)return true;
    if(!d||!Array.isArray(d.players)||!Array.isArray(d.offers)||d.players.length>11||d.offers.length>5||
      !Number.isInteger(d.rerollsLeft)||d.rerollsLeft<0||d.rerollsLeft>3)return false;
    if(!d.players.every(validCard)||!d.offers.every(validCard))return false;
    if(new Set(d.players.map(p=>p.id)).size!==d.players.length)return false;
    if(d.players.length<11&&!d.offers.length)return false;
    if(d.players.length===11&&d.offers.length!==0)return false;
    if(d.offers.some(p=>d.players.some(owned=>owned.id===p.id)))return false;
    if(d.tournament!==null){
      const t=d.tournament;
      if(d.players.length!==11||!t||!Number.isInteger(t.round)||t.round<0||t.round>3||
        !["playing","champion","eliminated"].includes(t.status)||
        !Array.isArray(t.squad)||t.squad.length!==11||
        !Array.isArray(t.results)||t.results.length>4||
        !Array.isArray(t.opponents)||t.opponents.length!==4||
        !Number.isInteger(t.seed)||!number(t.rating,1,99))return false;
      if(t.squad.some(id=>!d.players.some(p=>p.id===id)))return false;
      if(t.results.some(r=>!r||!Number.isInteger(r.round)||!number(r.round,1,4)||!validScore(r.score)||
        !safeText(r.opponent)||typeof r.won!=="boolean"||
        (r.penalties!==null&&(!r.penalties||!Number.isInteger(r.penalties.home)||!Number.isInteger(r.penalties.away)))))return false;
    }
    return true;
  }
  function validRivalry(r){
    if(r===null)return true;
    if(!r||!safeText(r.home)||!safeText(r.away)||r.home===r.away||
      !number(r.homeRating,1,99)||!number(r.awayRating,1,99)||
      !Number.isInteger(r.seed)||!Array.isArray(r.wins)||r.wins.length!==2||
      !r.wins.every(n=>Number.isInteger(n)&&number(n,0,2))||
      !Array.isArray(r.goals)||r.goals.length!==2||!r.goals.every(n=>Number.isInteger(n)&&number(n,0,297))||
      !Array.isArray(r.results)||r.results.length>3||!["playing","finished"].includes(r.status))return false;
    if(r.results.some((m,i)=>!m||m.round!==i+1||!validScore(m.score)||![0,1].includes(m.winner)||
      (m.penalties!==null&&(!m.penalties||!Number.isInteger(m.penalties.home)||!Number.isInteger(m.penalties.away)))))return false;
    const wins=[0,0];for(const m of r.results)wins[m.winner]++;
    if(wins[0]!==r.wins[0]||wins[1]!==r.wins[1])return false;
    if(r.status==="playing"&&(r.champion!==null||r.results.length===3||Math.max(...wins)>=2))return false;
    if(r.status==="finished"&&(r.champion!==(wins[0]>wins[1]?r.home:r.away)||r.results.length<2))return false;
    return true;
  }
  function snapshot(draft,rivalry){
    return {version:VERSION,draft:draft?{
      players:draft.players,offers:draft.offers,rerollsLeft:draft.rerollsLeft,
      tournament:draft.tournament||null
    }:null,rivalry:rivalry||null};
  }
  function save(store,draft,rivalry){
    try{
      if(!store?.setItem)return false;
      const data=snapshot(draft,rivalry);
      if(!validDraft(data.draft)||!validRivalry(data.rivalry))return false;
      const json=JSON.stringify(data);
      if(json.length>MAX_BYTES)return false;
      store.setItem(KEY,json);return true;
    }catch{return false;}
  }
  function load(store){
    try{
      const raw=store?.getItem?.(KEY);
      if(!raw||raw.length>MAX_BYTES)return {draft:null,rivalry:null};
      const data=JSON.parse(raw);
      if(data.version!==VERSION)return {draft:null,rivalry:null};
      return {draft:validDraft(data.draft)?data.draft:null,
        rivalry:validRivalry(data.rivalry)?data.rivalry:null};
    }catch{return {draft:null,rivalry:null};}
  }
  return {KEY,save,load,validDraft,validRivalry};
});
