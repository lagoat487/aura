/* AURA 27 · Standalone penalty shootout history and player statistics.
 * This file never modifies Ultimate Team, Career or other game-mode saves. */
(function(root,factory){
  const api=factory(typeof module==="object"&&module.exports?require("./penalty-challenge"):root.AuraPenaltyChallenge);
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.AuraPenaltyHistory=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(Penalty){
  "use strict";
  const KEY="aura-penalty-history-v1",VERSION=1,MAX_ROWS=24,MAX_SIZE=18000;
  const validId=s=>typeof s==="string"&&s.length>0&&s.length<=100;
  const int=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
  function details(challenge){
    if(!Penalty.valid(challenge))return null;
    const kicks=challenge.kicks,user= kicks.filter(s=>s.side===0),opponent=kicks.filter(s=>s.side===1);
    const goalkeepers=opponent.filter(s=>s.aim===s.dive);
    return {
      kicksTaken:user.length,goals:user.filter(s=>s.scored).length,
      opponentKicks:opponent.length,opponentGoals:opponent.filter(s=>s.scored).length,
      saves:opponent.filter(s=>!s.scored&&s.aim===s.dive).length,
      divesCorrect:goalkeepers.length
    };
  }
  function summary(challenge){
    if(!Penalty.valid(challenge)||challenge.status!=="finished")return null;
    const d=details(challenge);
    return {
      id:challenge.home+":"+challenge.away+":"+challenge.seed,
      home:challenge.home,away:challenge.away,seed:challenge.seed,
      score:challenge.score.slice(),winner:challenge.winner,
      ...d
    };
  }
  function validRow(row){
    if(!row||!validId(row.home)||!validId(row.away)||row.home===row.away||
      !int(row.seed,0,4294967295)||row.id!==row.home+":"+row.away+":"+row.seed||
      !Array.isArray(row.score)||row.score.length!==2||
      !row.score.every(v=>int(v,0,30))||!([row.home,row.away].includes(row.winner))||
      !int(row.kicksTaken,0,30)||!int(row.opponentKicks,0,30)||
      !int(row.goals,0,30)||!int(row.opponentGoals,0,30)||
      !int(row.saves,0,30)||!int(row.divesCorrect,0,30))return false;
    return row.score[0]===row.goals&&row.score[1]===row.opponentGoals&&
      row.goals<=row.kicksTaken&&row.opponentGoals<=row.opponentKicks&&
      row.saves<=row.divesCorrect&&row.divesCorrect<=row.opponentKicks&&
      row.winner===(row.goals>row.opponentGoals?row.home:row.goals<row.opponentGoals?row.away:null);
  }
  function load(storage){
    try{
      const raw=storage?.getItem?.(KEY);
      if(!raw||raw.length>MAX_SIZE)return [];
      const saved=JSON.parse(raw);
      if(saved.version!==VERSION||!Array.isArray(saved.rows)||saved.rows.length>MAX_ROWS)return [];
      const ids=new Set(),rows=[];
      for(const row of saved.rows){
        if(!validRow(row)||ids.has(row.id))continue;
        ids.add(row.id);rows.push(row);
      }
      return rows;
    }catch{return [];}
  }
  function save(storage,rows){
    try{
      if(!storage?.setItem||!Array.isArray(rows)||rows.length>MAX_ROWS||
        rows.some(row=>!validRow(row))||new Set(rows.map(row=>row.id)).size!==rows.length)return false;
      const value=JSON.stringify({version:VERSION,rows});
      if(value.length>MAX_SIZE)return false;
      storage.setItem(KEY,value);return true;
    }catch{return false;}
  }
  function record(storage,challenge){
    const entry=summary(challenge);
    if(!entry)return {ok:false,newRecord:false,rows:load(storage)};
    const rows=load(storage);
    if(rows.some(row=>row.id===entry.id))return {ok:true,newRecord:false,rows};
    const updated=[entry,...rows].slice(0,MAX_ROWS);
    if(!save(storage,updated))return {ok:false,newRecord:false,rows};
    return {ok:true,newRecord:true,rows:updated};
  }
  function stats(rows){
    const valid=Array.isArray(rows)?rows.filter(validRow):[];
    let wins=0,losses=0,streak=0,bestStreak=0,goals=0,attempts=0,saves=0,correct=0;
    // rows are newest first, so look from oldest toward newest for streaks.
    for(const row of valid.slice().reverse()){
      if(row.winner===row.home){wins++;streak++;bestStreak=Math.max(bestStreak,streak);}
      else{losses++;streak=0;}
      goals+=row.goals;attempts+=row.kicksTaken;saves+=row.saves;correct+=row.divesCorrect;
    }
    return {played:valid.length,wins,losses,streak,bestStreak,goals,attempts,saves,correct,
      accuracy:attempts?Math.round(goals*100/attempts):0};
  }
  return {KEY,MAX_ROWS,details,summary,validRow,load,save,record,stats};
});
