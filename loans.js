/* AURA career loans: one-season deals and optional permanent transfer.
 * They never touch Ultimate Team, and money/ownership changes atomically. */
(function(root,factory){
  const squad=typeof module==="object"&&module.exports?require("./squad.js"):root.AuraSquad;
  const api=factory(squad);
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.AuraLoans=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(Squad){
  "use strict";
  const integer=n=>Number.isSafeInteger(n)&&n>=0;
  const round=n=>Math.max(0,Math.round(n/100)*100);
  function holder(game,id){
    for(const [club,players] of Object.entries(game.rosters||{})){
      const p=players.find(x=>x.id===id);
      if(p)return {club,p};
    }
    return null;
  }
  function active(game){
    return (game.loans||[]).filter(l=>l.status==="active");
  }
  function terms(player){
    if(!player||!integer(player.value)||player.value===0||!integer(player.wage))return null;
    return {fee:round(Math.max(25000,player.value*.035)),
      optionPrice:round(player.value*1.2),wage:player.wage};
  }
  function borrow(game,id){
    const found=holder(game,id);
    if(!found)return {error:"Este jugador no está disponible para una cesión."};
    const {club:from,p}=found,offer=terms(p);
    if(from===game.club||!offer||p.onLoan||active(game).some(l=>l.playerId===id))
      return {error:"Este jugador no está disponible para una nueva cesión."};
    if(game.playerCareer?.playerId===id)return {error:"No se puede ceder al protagonista de Carrera de Jugador."};
    if(game.rosters[from].length<=11)return {error:"El club de origen debe conservar al menos 11 jugadores."};
    if(game.rosters[game.club].length>=(game.squadLimit||28))return {error:"No queda espacio en tu plantilla."};
    if(!integer(game.budget)||game.budget<offer.fee)return {error:"No tienes presupuesto para pagar la cesión."};
    if(Number.isFinite(game.wageBudget)&&Squad.wages(game)+offer.wage>game.wageBudget)
      return {error:"El salario supera el límite disponible."};
    // All checks precede any mutation.
    const loan={playerId:id,from,to:game.club,season:game.season,expires:game.season+1,
      fee:offer.fee,optionPrice:offer.optionPrice,status:"active",name:p.name};
    game.loans??=[];game.transactions??=[];
    game.rosters[from]=game.rosters[from].filter(x=>x.id!==id);
    p.club=game.club;p.onLoan={from,expires:loan.expires,optionPrice:loan.optionPrice};
    game.rosters[game.club].push(p);game.budget-=offer.fee;
    game.loans.push(loan);
    game.transactions.push({id:"loan:"+game.season+":"+id,playerId:id,name:p.name,mode:"loan",fee:loan.fee,paid:loan.fee,season:game.season,round:game.round});
    Squad.ensure(game);
    return {ok:true,loan};
  }
  function buyOption(game,id){
    const loan=active(game).find(l=>l.playerId===id&&l.to===game.club);
    if(!loan)return {error:"No hay una opción de compra activa para este jugador."};
    if(game.season>=loan.expires)return {error:"La opción de compra ya ha vencido."};
    const found=holder(game,id);
    if(found?.club!==game.club||found.p.onLoan?.from!==loan.from)return {error:"La propiedad del jugador ha cambiado."};
    if(!integer(game.budget)||game.budget<loan.optionPrice)return {error:"Presupuesto insuficiente para comprar al jugador."};
    // Already occupies a roster slot and already counts against wages.
    game.transactions??=[];
    game.budget-=loan.optionPrice;
    delete found.p.onLoan;
    loan.status="purchased";loan.purchasedSeason=game.season;
    found.p.contractEnd=Math.max(game.season+2,Number(found.p.contractEnd)||game.season);
    game.transactions.push({id:"loan-option:"+game.season+":"+id,playerId:id,
      name:found.p.name,mode:"loan-buy",fee:loan.optionPrice,paid:loan.optionPrice,
      season:game.season,round:game.round});
    return {ok:true,loan};
  }
  function returnExpired(game,nextSeason){
    if(!Number.isInteger(nextSeason)||nextSeason<=game.season)return [];
    const returned=[];
    for(const loan of active(game)){
      if(loan.expires>nextSeason)continue;
      const player=holder(game,loan.playerId);
      if(player?.club!==loan.to||!game.rosters[loan.from]){
        // Never overwrite an altered roster or delete a player.
        loan.status="unresolved";continue;
      }
      if(game.playerCareer?.playerId===loan.playerId){
        loan.status="unresolved";continue;
      }
      game.rosters[loan.to]=game.rosters[loan.to].filter(p=>p.id!==loan.playerId);
      player.p.club=loan.from;delete player.p.onLoan;
      game.rosters[loan.from].push(player.p);
      loan.status="returned";returned.push(player.p.name);
    }
    if(returned.length)Squad.ensure(game);
    return returned;
  }
  return {terms,active,borrow,buyOption,returnExpired};
});