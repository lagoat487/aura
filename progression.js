/* AURA 3.0 career development. All records belong to the current in-memory game. */
const AuraProgression=(()=>{
  "use strict";
  const VERSION=1,SESSIONS=3,MAX_SQUAD=28;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const focuses={
    balanced:{label:"Equilibrado",xp:25,energy:-6,description:"+25 EXP · −6 energía"},
    intensive:{label:"Intensivo",xp:40,energy:-12,description:"+40 EXP · −12 energía"},
    recovery:{label:"Recuperación",xp:0,energy:12,description:"+12 energía · sin EXP"}
  };
  const regions={
    ecuador:{label:"Ecuador",cost:75000,description:"Una ruta accesible para descubrir talento.",positions:["MC","ED","DFC","DC","MCD"]},
    spain:{label:"España",cost:125000,description:"Una escuela de técnica y juego asociativo.",positions:["MC","MCO","LI","LD","POR"]},
    brazil:{label:"Brasil",cost:175000,description:"Una búsqueda de talento ofensivo.",positions:["EI","ED","MCO","DC","LI"]}
  };
  const roster=game=>game.rosters?.[game.club]||[];
  const rounds=game=>game.competition?.fixtures?.length||38;
  const finished=game=>Number(game.round)>=rounds(game);
  function initialize(game){
    if(!game||!game.club||!game.rosters)throw Error("La carrera no está disponible.");
    if(!game.progression||game.progression.version!==VERSION||game.progression.season!==game.season){
      const rating=roster(game).slice().sort((a,b)=>b.overall-a.overall).slice(0,11).reduce((s,p)=>s+p.overall,0)/Math.max(1,Math.min(11,roster(game).length));
      game.progression={version:VERSION,season:game.season,training:{round:game.round,used:0,players:[]},developed:[],signings:0,claimed:[],lastScoutRound:-1,report:null,winTarget:Math.max(1,Math.ceil(rounds(game)*(rating>=83?.5:rating>=75?.4:.3)))};
    }
    const p=game.progression;
    if(p.training.round!==game.round)p.training={round:game.round,used:0,players:[]};
    return p;
  }
  function train(game,id,focus="balanced"){
    const p=initialize(game),plan=focuses[focus],player=roster(game).find(x=>x.id===id);
    if(!player)return {error:"Elige un jugador de tu plantilla."};
    if(!plan)return {error:"El plan de entrenamiento no es válido."};
    if(finished(game))return {error:"La temporada ha terminado. Inicia la siguiente para entrenar."};
    if(p.training.used>=SESSIONS)return {error:"Ya usaste las tres sesiones de esta jornada."};
    if(p.training.players.includes(id))return {error:"Este jugador ya completó su sesión de esta jornada."};
    const fitness=Number.isFinite(player.fitness)?player.fitness:95;
    const potential=Number.isFinite(player.potential)?player.potential:player.overall;
    if(plan.xp&&player.overall>=potential)return {error:"El jugador ya alcanzó su potencial. Puedes elegir recuperación."};
    if(plan.xp&&fitness+plan.energy<55)return {error:"Necesita recuperar energía antes de entrenar."};
    if(!plan.xp&&fitness>=100)return {error:"El jugador ya tiene toda su energía."};
    player.fitness=clamp(fitness+plan.energy,0,100);
    const old=player.overall;
    if(plan.xp){
      player.trainingXP=(Number(player.trainingXP)||0)+plan.xp;
      if(player.trainingXP>=100){
        player.trainingXP-=100;player.overall=Math.min(potential,player.overall+1);
        if(!p.developed.includes(id))p.developed.push(id);
      }
    }
    p.training.used++;p.training.players.push(id);
    const gained=player.overall-old;
    return {ok:true,player,gained,xp:plan.xp,message:player.name+(gained?" ganó +1 GRL.":plan.xp?" completó su entrenamiento (+"+plan.xp+" EXP).":" recuperó energía.")};
  }
  function objectives(game){
    const p=initialize(game);
    return [
      {id:"wins",label:"Construye una temporada ganadora",description:"Gana "+p.winTarget+" partidos de liga.",current:Number(game.wins)||0,target:p.winTarget,reward:1500000},
      {id:"development",label:"Haz crecer tu plantilla",description:"Mejora el GRL de dos jugadores mediante entrenamiento.",current:p.developed.length,target:2,reward:600000},
      {id:"academy",label:"Apuesta por el futuro",description:"Incorpora un juvenil descubierto por tus ojeadores.",current:p.signings,target:1,reward:400000}
    ].map(o=>({...o,complete:o.current>=o.target,claimed:p.claimed.includes(o.id)}));
  }
  function claim(game,id){
    const p=initialize(game),objective=objectives(game).find(o=>o.id===id);
    if(!objective)return {error:"No existe ese objetivo."};
    if(objective.claimed)return {error:"La recompensa ya fue recibida."};
    if(!objective.complete)return {error:"Completa el objetivo para recibir su recompensa."};
    p.claimed.push(id);game.budget+=objective.reward;
    return {ok:true,reward:objective.reward,message:"La directiva ha entregado la recompensa: "+objective.label+"."};
  }
  function random(seed){let t=seed>>>0;return()=>{t=(Math.imul(t,1664525)+1013904223)>>>0;return t/4294967296;};}
  function scout(game,regionId){
    const p=initialize(game),region=regions[regionId];
    if(!region)return {error:"Elige una ruta de ojeo válida."};
    if(finished(game))return {error:"La temporada ha terminado. Inicia la siguiente para enviar ojeadores."};
    if(p.lastScoutRound===game.round)return {error:"Ya recibiste un informe en esta jornada."};
    if(game.budget<region.cost)return {error:"No tienes presupuesto suficiente para esta ruta."};
    const key=game.club+":"+game.season+":"+game.round+":"+regionId;
    const rng=random(Array.from(key).reduce((s,c)=>Math.imul(s,31)+c.charCodeAt(0),17));
    const family=["Vega","Mora","Paz","Vidal","Lara","Costa","Reyes","Ríos","Solís","Cruz"];
    const prospects=Array.from({length:3},(_,i)=>{
      const overall=55+Math.floor(rng()*12),potential=Math.min(91,overall+14+Math.floor(rng()*12)),age=16+Math.floor(rng()*3),pos=region.positions[Math.floor(rng()*region.positions.length)];
      const player={id:"academy:"+key+":"+i,name:"Canterano "+family[Math.floor(rng()*family.length)]+" "+(i+1),pos,age,overall,potential,club:game.club,real:false,academy:true,source:"Cantera generada de AURA",value:Math.round((overall*overall*overall/130)*100),wage:800+Math.floor(rng()*13)*100,fitness:95,morale:75,form:75,appearances:0,benched:0,role:"Promesa",contractEnd:game.season+3};
      return {player,fee:50000+Math.floor(rng()*16)*10000,signed:false};
    });
    game.budget-=region.cost;p.lastScoutRound=game.round;
    p.report={region:regionId,round:game.round,season:game.season,prospects};
    return {ok:true,report:p.report,message:"Informe de "+region.label+" recibido: tres promesas disponibles."};
  }
  function signYouth(game,id){
    const p=initialize(game),candidate=p.report?.prospects.find(c=>c.player.id===id),players=roster(game);
    if(!candidate)return {error:"No se encontró al juvenil en el informe actual."};
    if(candidate.signed||players.some(x=>x.id===id))return {error:"Este juvenil ya fue incorporado."};
    if(finished(game))return {error:"Inicia la siguiente temporada antes de incorporar un juvenil."};
    if(players.length>=MAX_SQUAD)return {error:"Plantilla llena: libera una plaza para incorporar un juvenil (máximo 28)."};
    if(p.signings>=2)return {error:"Ya incorporaste dos juveniles esta temporada."};
    if(game.budget<candidate.fee)return {error:"No tienes presupuesto suficiente para su incorporación."};
    const wages=players.reduce((s,x)=>s+(Number(x.wage)||0),0);
    const wageBudget=Number.isFinite(game.wageBudget)?game.wageBudget:Math.round(wages*1.4+50000);
    if(wages+candidate.player.wage>wageBudget)return {error:"No queda margen salarial para este juvenil."};
    const player={...candidate.player};
    game.budget-=candidate.fee;game.wageBudget=wageBudget;players.push(player);candidate.signed=true;p.signings++;
    return {ok:true,player,message:player.name+" se incorpora a tu plantilla."};
  }
  function afterMatch(game){initialize(game);return dashboard(game);}
  function dashboard(game){
    const p=initialize(game),goals=objectives(game),complete=goals.filter(o=>o.complete).length;
    const performance=game.round>0?clamp(((Number(game.wins)||0)*3+(Number(game.draws)||0))/game.round/3,0,1):.5;
    const confidence=Math.round(clamp(45+performance*30+goals.reduce((s,o)=>s+Math.min(1,o.current/o.target),0)/3*25,25,100));
    return {objectives:goals,confidence,complete,sessionsLeft:Math.max(0,SESSIONS-p.training.used),trained:p.training.players.slice(),report:p.report,canScout:p.lastScoutRound!==game.round&&!finished(game),signings:p.signings,finished:finished(game)};
  }
  return {initialize,train,objectives,claim,scout,signYouth,afterMatch,dashboard,focuses,regions,SESSIONS,MAX_SQUAD};
})();
if(typeof module==="object"&&module.exports)module.exports=AuraProgression;
