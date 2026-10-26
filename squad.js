/* AURA's original team-sheet and player-management rules. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.AuraSquad=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const formations={
    "4-3-3":[["POR",50,89],["LI",17,68],["DFC",39,73],["DFC",61,73],["LD",83,68],["MCD",50,54],["MC",29,39],["MC",71,39],["EI",18,17],["DC",50,13],["ED",82,17]],
    "4-2-3-1":[["POR",50,89],["LI",17,70],["DFC",39,74],["DFC",61,74],["LD",83,70],["MCD",34,53],["MCD",66,53],["MI",18,30],["MCO",50,32],["MD",82,30],["DC",50,12]],
    "4-4-2":[["POR",50,89],["LI",17,70],["DFC",39,74],["DFC",61,74],["LD",83,70],["MI",17,42],["MC",39,46],["MC",61,46],["MD",83,42],["DC",34,16],["DC",66,16]],
    "3-5-2":[["POR",50,89],["DFC",25,72],["DFC",50,76],["DFC",75,72],["MI",13,44],["MCD",37,53],["MCD",63,53],["MD",87,44],["MCO",50,31],["DC",32,14],["DC",68,14]],
    "4-1-2-1-2":[["POR",50,89],["LI",17,70],["DFC",39,74],["DFC",61,74],["LD",83,70],["MCD",50,55],["MC",25,39],["MC",75,39],["MCO",50,29],["DC",33,12],["DC",67,12]]
  };
  const roles=["Promesa","Esporádico","Rotación","Importante","Crucial"];
  const bound=(n,a,b)=>Math.max(a,Math.min(b,n));
  function positionPenalty(player,slot){
    const positions=[player.pos,...(Array.isArray(player.positions)?player.positions:[])];
    return Math.min(...positions.map(pos=>{
      if(pos===slot)return 0;
      if(pos==="POR"||slot==="POR")return 32;
      if(["MC","MCD","MCO"].includes(pos)&&["MC","MCD","MCO"].includes(slot))return 3;
      if(["EI","MI"].includes(pos)&&["EI","MI"].includes(slot))return 1;
      if(["ED","MD"].includes(pos)&&["ED","MD"].includes(slot))return 1;
      if(["DC","SD"].includes(pos)&&["DC","SD"].includes(slot))return 1;
      if(["DFC","LI","LD"].includes(pos)&&["DFC","LI","LD"].includes(slot))return 6;
      if(["EI","ED","MI","MD","DC","SD","MCO"].includes(pos)&&["EI","ED","MI","MD","DC","SD","MCO"].includes(slot))return 6;
      return 12;
    }));
  }
  function effective(player,slot){
    return bound(player.overall-positionPenalty(player,slot)+((player.morale??75)-75)*.04+((player.fitness??95)-95)*.08,1,99);
  }
  function choose(roster,formation){
    const available=roster.slice(),xi=Array(11).fill(null),slots=formations[formation];
    // Specialist positions first prevents the goalkeeper or only winger being used elsewhere.
    const order=slots.map((s,i)=>i).sort((a,b)=>{
      if(slots[a][0]==="POR")return -1;if(slots[b][0]==="POR")return 1;
      return roster.filter(p=>positionPenalty(p,slots[a][0])===0).length-roster.filter(p=>positionPenalty(p,slots[b][0])===0).length;
    });
    for(const index of order){
      available.sort((a,b)=>effective(b,slots[index][0])-effective(a,slots[index][0])||String(a.id).localeCompare(String(b.id)));
      const player=available.shift();if(player)xi[index]=player.id;
    }
    return xi;
  }
  function ensure(game){
    const roster=game.rosters[game.club]||[],ranked=roster.slice().sort((a,b)=>b.overall-a.overall);
    for(const p of roster){
      if(!Number.isFinite(p.morale))p.morale=75;
      if(!Number.isFinite(p.fitness))p.fitness=95;
      if(!roles.includes(p.role))p.role=ranked.indexOf(p)<4?"Crucial":ranked.indexOf(p)<11?"Importante":"Rotación";
      if(!Number.isInteger(p.contractEnd))p.contractEnd=game.season+(p.age>32?1:3);
      if(!Number.isInteger(p.appearances))p.appearances=0;
      if(!Number.isInteger(p.benched))p.benched=0;
    }
    if(!game.squad)game.squad={formation:"4-3-3",xi:[],captain:null};
    const sheet=game.squad;
    if(!formations[sheet.formation])sheet.formation="4-3-3";
    const valid=new Set(roster.map(p=>p.id)),seen=new Set();
    sheet.xi=Array.from({length:11},(_,i)=>{
      const id=sheet.xi[i];if(!valid.has(id)||seen.has(id))return null;seen.add(id);return id;
    });
    if(!sheet.xi.some(Boolean))sheet.xi=choose(roster,sheet.formation);
    else sheet.xi=sheet.xi.map((id,index)=>{
      if(id)return id;
      const available=roster.filter(p=>!seen.has(p.id)).sort((a,b)=>effective(b,formations[sheet.formation][index][0])-effective(a,formations[sheet.formation][index][0]));
      const next=available[0]?.id;if(next)seen.add(next);return next||null;
    });
    if(!valid.has(sheet.captain)||!sheet.xi.includes(sheet.captain))sheet.captain=sheet.xi.find(Boolean)||null;
    if(!Number.isFinite(game.wageBudget))game.wageBudget=Math.round(wages(game)*1.4+50000);
    return sheet;
  }
  function wages(game){return (game.rosters[game.club]||[]).reduce((sum,p)=>sum+(Number(p.wage)||0),0)}
  function players(game){const sheet=ensure(game),roster=game.rosters[game.club];return sheet.xi.map(id=>roster.find(p=>p.id===id)).filter(Boolean)}
  function strength(game){
    const sheet=ensure(game),roster=game.rosters[game.club];
    return Math.round(sheet.xi.reduce((sum,id,i)=>sum+(id?effective(roster.find(p=>p.id===id),formations[sheet.formation][i][0]):0),0)/11);
  }
  function autoPick(game){const sheet=ensure(game);sheet.xi=choose(game.rosters[game.club],sheet.formation);ensure(game);return sheet}
  function setFormation(game,name){
    if(!formations[name])return false;
    const current=players(game);game.squad.formation=name;game.squad.xi=choose(current,name);ensure(game);return true;
  }
  function swap(game,first,second){
    const sheet=ensure(game),roster=game.rosters[game.club];
    if(first===second||!roster.some(p=>p.id===first)||!roster.some(p=>p.id===second))return false;
    const a=sheet.xi.indexOf(first),b=sheet.xi.indexOf(second);
    if(a<0&&b<0)return false;
    if(a>=0)sheet.xi[a]=second;if(b>=0)sheet.xi[b]=first;
    ensure(game);return true;
  }
  function afterMatch(game,won,drew){
    const sheet=ensure(game);
    for(const p of game.rosters[game.club]){
      const played=sheet.xi.includes(p.id);
      if(played){p.appearances++;p.benched=0}else p.benched++;
      p.fitness=bound(p.fitness+(played?-3:7),50,100);
      const unhappy=!played&&p.benched>=3&&roles.indexOf(p.role)>=3;
      p.morale=bound(p.morale+(unhappy?-3:played?(won?3:drew?1:-2):0),20,100);
    }
  }
  function moraleLabel(p){return p.morale>=85?"Muy feliz":p.morale>=65?"Contento":p.morale>=45?"Inquieto":"Descontento"}
  return {formations,roles,positionPenalty,effective,ensure,choose,players,strength,autoPick,setFormation,swap,wages,afterMatch,moraleLabel};
});
