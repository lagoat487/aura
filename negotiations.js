/* Original AURA negotiation engine. Agreements reserve no money; settlement is atomic. */
(function(root,factory){
  const squad=typeof module==="object"&&module.exports?require("./squad.js"):root.AuraSquad;
  const api=factory(squad);
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.AuraNegotiations=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(Squad){
  "use strict";
  const terminal=new Set(["signed","sold","renewed","failed","withdrawn"]);
  const round=n=>Math.round(n/100)*100;
  const bounded=(n,a,b)=>Math.max(a,Math.min(b,n));
  const validMoney=n=>Number.isSafeInteger(n)&&n>=0&&n<=2000000000;
  function log(deal,speaker,text){deal.history.push({speaker,text});deal.history=deal.history.slice(-24)}
  function rosterOwner(game,id){for(const [cid,ps] of Object.entries(game.rosters)){const p=ps.find(p=>p.id===id);if(p)return {cid,p}}return null}
  function initialize(game){Squad.ensure(game);game.negotiations??=[];game.transactions??=[];return game.negotiations}
  function demand(game,p,buyer){
    const team=Squad.players(game),avg=team.reduce((n,p)=>n+p.overall,0)/11;
    const role=p.overall>=avg+1?"Crucial":p.overall>=avg-4?"Importante":"Rotación";
    const wage=round(Math.max(1000,p.wage||1000)*(buyer?1.12:1.1));
    return {wage,years:p.age>=32?2:p.age>=28?3:4,role,bonus:wage*4,agent:buyer?round(Math.min(2000000,Math.max(10000,p.value*.012))):0,releaseClause:0};
  }
  function start(game,player,{mode="buy",sourceId=player.club,sourceName="Club vendedor",buyer=null,buyerRating=80}={}){
    const deals=initialize(game);
    if(!["buy","sell","renew"].includes(mode))return {error:"Operación desconocida."};
    const existing=deals.find(d=>d.playerId===player.id&&!terminal.has(d.stage));
    if(existing)return {deal:existing};
    if(deals.some(d=>d.playerId===player.id&&d.stage==="failed"&&d.cooldownUntil>game.round))return {error:"Las conversaciones se han roto. Espera dos jornadas antes de volver a llamar."};
    const owner=rosterOwner(game,player.id);
    if(mode==="buy"&&owner?.cid===game.club)return {error:"Este jugador ya pertenece a tu club."};
    if(mode!=="buy"&&owner?.cid!==game.club)return {error:"El jugador ya no pertenece a tu plantilla."};
    if(mode==="buy"&&game.rosters[game.club].length>=(game.squadLimit||28))return {error:"Plantilla llena: libera una plaza antes de negociar (máximo "+(game.squadLimit||28)+")."};
    if(mode==="sell"&&game.rosters[game.club].length<=11)return {error:"Debes conservar al menos 11 jugadores."};
    game.dealSequence=(game.dealSequence||0)+1;
    const target=round(player.value*(player.age<24?1.16:1.06));
    const deal={id:"deal-"+game.dealSequence,playerId:player.id,player:{...player},sourceId:owner?.cid||sourceId,sourceName,
      mode,buyer,buyerRating,stage:mode==="renew"?"contract":mode==="sell"?"club":"enquiry",tension:12,turns:0,contractTurns:0,
      target,floor:round(target*.88),ceiling:round(player.value*1.13),fee:0,sellOn:0,contract:demand(game,player,mode==="buy"),
      history:[],createdRound:game.round,season:game.season};
    deals.push(deal);
    log(deal,mode==="renew"?"Agente":mode==="sell"?"Director deportivo":"Asistente",mode==="renew"?"Podemos hablar de un nuevo contrato. Estas son nuestras expectativas.":mode==="sell"?"Nos interesa su jugador. Estamos dispuestos a escuchar su precio.":"Consulta la disponibilidad del jugador antes de hacer una oferta.");
    return {deal};
  }
  function fail(game,deal,text){
    deal.stage="failed";deal.cooldownUntil=game.round+2;log(deal,"Representante",text);
    const owner=rosterOwner(game,deal.playerId);if(deal.mode==="renew"&&owner?.cid===game.club)owner.p.morale=bounded(owner.p.morale-4,20,100);
    return {failed:true};
  }
  function enquire(game,deal){
    if(deal.stage!=="enquiry")return {error:"La consulta ya ha sido respondida."};
    const owner=rosterOwner(game,deal.playerId);
    if(owner&&game.rosters[owner.cid].length<=11)return fail(game,deal,"No podemos vender: no tenemos recambios suficientes.");
    if(deal.player.overall>deal.buyerRating+16)return fail(game,deal,"El jugador prefiere un proyecto deportivo de mayor nivel por ahora.");
    deal.stage="club";deal.counter={fee:deal.target,sellOn:0};
    log(deal,"Club vendedor","Escucharemos ofertas. Nuestra petición inicial es "+deal.target+" euros.");return {ok:true};
  }
  function raiseTension(game,deal,severity){
    deal.tension=bounded(deal.tension+severity,0,100);
    if(deal.tension>=100)return fail(game,deal,"Las posiciones están demasiado alejadas. Damos por terminada la llamada.");
    return null;
  }
  function offerClub(game,deal,{fee,sellOn=0}){
    if(deal.stage!=="club")return {error:"Esta operación no está en la fase de clubes."};
    if(!validMoney(fee)||fee===0||!Number.isInteger(sellOn)||sellOn<0||sellOn>25)return {error:"Usa un importe entero positivo y una futura venta entre 0 y 25 %."};
    if(deal.mode==="buy"&&fee>game.budget)return {error:"La oferta supera tu presupuesto de fichajes."};
    deal.turns++;deal.lastOffer={fee,sellOn};log(deal,"Tú","Propuesta: "+fee+" euros"+(sellOn?" y "+sellOn+" % de futura venta.":"."));
    if(deal.mode==="sell"){
      if(fee<=deal.ceiling){deal.fee=fee;deal.stage="ready";log(deal,"Club comprador","Aceptamos su precio. Confirme la salida cuando esté listo.");return {accepted:true}}
      if(raiseTension(game,deal,fee>deal.ceiling*1.6?32:18))return {failed:true};
      deal.counter={fee:round(Math.min(deal.ceiling,deal.player.value*(.98+deal.turns*.025))),sellOn:0};
    }else{
      const effective=fee+deal.player.value*sellOn*.006;
      const clause=deal.player.releaseClause||0;
      if(effective>=deal.floor||clause>0&&fee>=clause){
        deal.fee=fee;deal.sellOn=sellOn;deal.stage="contract";deal.tension=Math.max(8,deal.tension-14);
        log(deal,"Club vendedor","Acuerdo entre clubes. Falta cerrar el contrato con el agente; todavía no se ha cobrado nada.");return {accepted:true};
      }
      if(raiseTension(game,deal,effective<deal.floor*.6?32:18))return {failed:true};
      deal.counter={fee:round(Math.max(deal.floor,deal.target-(deal.target-deal.floor)*Math.min(1,deal.turns*.3)-deal.player.value*sellOn*.006)),sellOn};
    }
    if(deal.turns>=5)return fail(game,deal,"No hemos llegado a un acuerdo después de cinco propuestas.");
    log(deal,"Director deportivo","Nuestra contraoferta es "+deal.counter.fee+" euros.");return {counter:true};
  }
  function contractCosts(game,deal,terms){
    const current=rosterOwner(game,deal.playerId);
    return {upfront:(deal.mode==="buy"?deal.fee:0)+terms.bonus+terms.agent,
      weekly:Squad.wages(game)-(deal.mode==="renew"&&current?.cid===game.club?current.p.wage:0)+terms.wage};
  }
  function offerContract(game,deal,terms){
    if(deal.stage!=="contract")return {error:"Esta operación no está en la fase de contrato."};
    const {wage,years,role,bonus,agent,releaseClause}=terms;
    if(![wage,bonus,agent,releaseClause].every(validMoney)||wage<1||!Number.isInteger(years)||years<1||years>5||!Squad.roles.includes(role))return {error:"Revisa los importes, el rol y la duración de 1 a 5 años."};
    const costs=contractCosts(game,deal,terms);
    if(costs.upfront>game.budget)return {error:"La suma de traspaso, prima y comisión supera tu presupuesto."};
    if(costs.weekly>game.wageBudget)return {error:"El sueldo supera el margen salarial de la plantilla."};
    deal.contractTurns++;deal.lastTerms={...terms};log(deal,"Tú","Contrato: "+wage+" euros/semana, "+years+" años, rol "+role+".");
    const d=deal.contract,requestedRole=Squad.roles.indexOf(d.role),offeredRole=Squad.roles.indexOf(role);
    const earnings=wage+Math.min(bonus,d.wage*12)/52;
    const ageOK=deal.player.age>=32?years<=3:years>=2;
    const clauseOK=releaseClause===0||releaseClause>=deal.player.value*1.25;
    if(earnings>=d.wage+d.bonus/52&&offeredRole>=requestedRole&&ageOK&&clauseOK&&agent>=d.agent){
      deal.terms={...terms};deal.stage="ready";log(deal,"Agente","Aceptamos las condiciones. Puede revisar el coste total y firmar.");return {accepted:true};
    }
    if(raiseTension(game,deal,wage<d.wage*.65||offeredRole+2<requestedRole?32:18))return {failed:true};
    if(deal.contractTurns>=5)return fail(game,deal,"El jugador ha decidido poner fin a la negociación del contrato.");
    deal.contractCounter={...d,years:d.years,role:d.role,releaseClause:0};
    log(deal,"Agente","Necesitamos mejorar el sueldo, el rol o las garantías. Le enviamos nuestras condiciones completas.");return {counter:true};
  }
  function complete(game,deal){
    if(deal.stage!=="ready")return {error:"Primero debes cerrar las condiciones de la operación."};
    const owner=rosterOwner(game,deal.playerId);
    if(deal.mode==="sell"){
      if(owner?.cid!==game.club)return {error:"El jugador ya no está en tu club."};
      if(game.playerCareer?.playerId===deal.playerId)return {error:"No puedes vender al protagonista de tu carrera de jugador."};
      if(game.rosters[game.club].length<=11)return {error:"Debes conservar al menos 11 jugadores."};
      const obligation=owner.p.sellOnClause?.percentage||0,payment=Math.round(deal.fee*obligation/100),net=deal.fee-payment;
      game.rosters[game.club]=game.rosters[game.club].filter(p=>p.id!==deal.playerId);
      const destination=deal.buyer?.id||"departed";
      if(game.rosters[destination])game.rosters[destination].push({...owner.p,club:destination,sellOnClause:null});
      else {game.departedPlayers??={};game.departedPlayers[deal.playerId]={...owner.p,club:destination,sellOnClause:null};}
      game.budget+=net;deal.net=net;deal.obligation=payment;deal.stage="sold";
    }else{
      if(deal.mode==="buy"&&(owner?.cid===game.club||owner&&owner.cid!==deal.sourceId))return {error:"La propiedad del jugador cambió. Cancela y vuelve a consultar."};
      if(deal.mode==="renew"&&owner?.cid!==game.club)return {error:"El jugador ya no pertenece a tu club."};
      if(deal.mode==="buy"&&game.rosters[game.club].length>=(game.squadLimit||28))return {error:"Plantilla llena (máximo "+(game.squadLimit||28)+"). Libera una plaza antes de firmar."};
      if(deal.mode==="buy"&&owner&&game.rosters[owner.cid].length<=11)return {error:"El club vendedor debe conservar al menos 11 jugadores."};
      const costs=contractCosts(game,deal,deal.terms);
      if(costs.upfront>game.budget||costs.weekly>game.wageBudget)return {error:"El presupuesto ha cambiado: ya no alcanza para este acuerdo."};
      const p=owner?.p||{...deal.player};
      // Mutate funds and ownership only after every validation has succeeded.
      game.budget-=costs.upfront;
      if(deal.mode==="buy"){
        if(owner)game.rosters[owner.cid]=game.rosters[owner.cid].filter(p=>p.id!==deal.playerId);
        p.club=game.club;game.rosters[game.club].push(p);
        if(game.departedPlayers)delete game.departedPlayers[p.id];
        p.sellOnClause=deal.sellOn?{club:deal.sourceId,percentage:deal.sellOn}:null;
      }
      Object.assign(p,{wage:deal.terms.wage,role:deal.terms.role,contractEnd:game.season+deal.terms.years,
        releaseClause:deal.terms.releaseClause,morale:90,fitness:p.fitness??95});
      deal.stage=deal.mode==="renew"?"renewed":"signed";deal.paid=costs.upfront;
    }
    Squad.ensure(game);game.transactions.push({id:deal.id,playerId:deal.playerId,name:deal.player.name,mode:deal.mode,fee:deal.fee,paid:deal.paid||0,net:deal.net||0,season:game.season,round:game.round});
    log(deal,"AURA","Operación completada.");return {ok:true};
  }
  function withdraw(game,deal){if(terminal.has(deal.stage))return false;deal.stage="withdrawn";log(deal,"Tú","Nos retiramos de la negociación. No hay ningún cargo.");return true}
  function tick(game,rivals,rng=Math.random){
    initialize(game);
    for(const deal of game.negotiations){
      if(deal.mode!=="buy"||!["club","contract","ready"].includes(deal.stage)||deal.player.overall<80)continue;
      if(deal.rival){
        if(rng()<.12){
          const owner=rosterOwner(game,deal.playerId);
          if(!owner||owner.cid!==game.club&&game.rosters[owner.cid].length>11){
            const p=owner?.p||{...deal.player};
            if(owner)game.rosters[owner.cid]=game.rosters[owner.cid].filter(p=>p.id!==deal.playerId);
            p.club=deal.rival.id;
            if(game.rosters[deal.rival.id])game.rosters[deal.rival.id].push(p);
            else {game.departedPlayers??={};game.departedPlayers[p.id]=p;}
            fail(game,deal,"El jugador ha elegido la oferta de "+deal.rival.name+". La operación queda cancelada sin cargos.");
          }
        }
        continue;
      }
      const candidates=rivals.filter(c=>c.id!==game.club&&c.id!==deal.sourceId&&c.rating>=deal.player.overall-8);
      if(candidates.length&&rng()<.1){
        deal.rival=candidates[Math.floor(rng()*candidates.length)];deal.contract.wage=round(deal.contract.wage*1.12);
        if(deal.stage==="ready")deal.stage="contract";
        log(deal,"Asistente",deal.rival.name+" ha presentado una oferta. El agente pide un sueldo mejor y el jugador podría elegir al rival al avanzar otra jornada.");
        game.news.unshift("Competencia por "+deal.player.name+": "+deal.rival.name+" entra en la puja.");
      }
    }
  }
  return {terminal,initialize,start,enquire,offerClub,offerContract,contractCosts,complete,withdraw,tick,rosterOwner};
});
