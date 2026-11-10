/* AURA Evolution: deterministic football simulation, independent of rendering. */
(function(root,factory){const api=factory(typeof module==="object"&&module.exports?require("./provision-gameplay"):root.AuraProVision);if(typeof module==="object"&&module.exports)module.exports=api;else root.AuraMatch=api;})(typeof globalThis!=="undefined"?globalThis:this,function(PVF){
  "use strict";
  const FIELD={length:105,width:68,goal:7.32,height:2.44};
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  const SHAPE=[["POR",-48,0],["LI",-30,-24],["DFC",-35,-9],["DFC",-35,9],["LD",-30,24],["MCD",-12,0],["MC",-4,-14],["MC",-4,14],["EI",17,-23],["DC",23,0],["ED",17,23]];
  function random(seed){let s=seed>>>0;return()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296;};}
  // Independent match statistics per identity, including players substituted off.
  function playerStat(game,p){
    const key=p.team+":"+p.id;
    if(!game.playerStats[key])game.playerStats[key]={
      id:p.id,name:p.name,team:p.team,pos:p.pos,minutes:0,goals:0,assists:0,
      shots:0,onTarget:0,passes:0,completed:0,keyPasses:0,
      tackles:0,interceptions:0,saves:0,parries:0,yellows:0,reds:0
    };
    return game.playerStats[key];
  }
  function calculateRating(s){
    // Deterministic 4.5–10.0 match report: no random rankings and no rewards.
    return Math.round(clamp(6.0+Math.min(1,s.minutes/90)*.2+
      s.goals*1.45+s.assists*1.05+s.onTarget*.12+
      s.completed*.025+s.keyPasses*.18+s.tackles*.22+
      s.interceptions*.18+s.saves*.20+s.parries*.11-
      s.yellows*.45-s.reds*1.4,4.5,10)*10)/10;
  }
  function create(options={}){
    const rng=random(options.seed??Date.now()),seconds=clamp(Number(options.seconds)||180,30,1200);
    const sides=[options.home,options.away];
    if(sides.some(t=>!t||!Array.isArray(t.players)||t.players.length!==11))throw Error("Se necesitan dos onces completos.");
    if(sides.some(t=>new Set(t.players.map(p=>p.id)).size!==11))throw Error("Un once no puede tener jugadores duplicados.");
    const players=sides.flatMap((t,team)=>t.players.map((p,i)=>{
      const slot=t.slots?.[i],baseX=slot?(50-slot[2])*.96:SHAPE[i][1],baseZ=slot?(slot[1]-50)*.58:SHAPE[i][2];
      return {id:p.id,name:p.name,originalId:p.originalId||null,real:!!p.real,photo:p.photo||null,number:i+1,team,index:i,pos:i===0?"POR":p.pos,overall:clamp(p.overall||70,1,99),pace:PVF.rating(p,"pace"),passing:PVF.rating(p,"passing"),shooting:PVF.rating(p,"shooting"),
        baseX,baseZ,x:0,z:0,vx:0,vz:0,faceX:team===0?1:-1,faceZ:0,stamina:clamp(Number.isFinite(p.fitness)?p.fitness:100,0,100),cooldown:0,skillTime:0,skillCooldown:0,yellows:0,sentOff:false,run:0,turn:0,dribbleTime:0,action:null,actionTime:0,actionDuration:0,diveSide:1};
    }));
    const game={gameplay:"provision",gameplayRevision:"control-2",inputBuffer:[null,null],players,ball:{x:0,y:.22,z:0,vx:0,vy:0,vz:0,spin:0,owner:null,lastTouch:0,freeTime:0,lastKicker:null},
      score:[0,0],elapsed:0,visualTime:0,seconds,half:1,phase:"kickoff",phaseTime:1.1,controlled:9,awayControlled:20,localTwoPlayer:!!options.localTwoPlayer,events:[],
      stats:[0,1].map(()=>({shots:0,onTarget:0,passes:0,completed:0,throughBalls:0,crosses:0,interceptions:0,fouls:0,yellows:0,reds:0,penalties:0,saves:0,parries:0,claims:0,tackles:0,possession:0,xg:0,keyPasses:0,blockedShots:0})),
      benches:sides.map(t=>(t.bench||[]).filter(p=>p&&typeof p.id==="string").map(p=>({...p}))),
      participants:sides.map(t=>t.players.map(p=>p.id)),substitutions:[],
      difficulty:clamp(Number(options.difficulty)||1,.65,1.4),weather:options.weather==="rain"?"rain":"clear",tactic:options.tactic||"balanced",aiTactic:"balanced",setPiece:null,restart:null,wallFlight:null,goals:[],playerStats:Object.create(null),assistWindow:null,shotAssist:null,rng,seed:options.seed};
    if(options.playerLock){const index=players.findIndex(p=>p.team===0&&p.id===options.playerLock);if(index<1)throw Error("El jugador de carrera debe ser titular y de campo.");game.playerLock=options.playerLock;}
    for(const p of players)playerStat(game,p);
    reset(game,0);return game;
  }
  function direction(game,team){return (team===0?1:-1)*(game.half===1?1:-1);}
  function animate(p,kind,duration){p.action=kind;p.actionTime=p.actionDuration=duration;}
  function event(game,type,text,extra={}){const e={type,text,at:game.elapsed,minute:Math.min(90,Math.floor(game.elapsed/game.seconds*90)),...extra};game.events.push(e);if(game.events.length>80)game.events.shift();return e;}
  function reset(game,kicking){
    game.restart=null;game.defensiveRoles=null;game.inputBuffer=[null,null];
    for(const p of game.players){const d=direction(game,p.team);p.x=p.sentOff?(p.team===0?-75:75):p.baseX*d;p.z=p.sentOff?0:p.baseZ*d;p.vx=p.vz=0;p.faceX=d;p.faceZ=0;p.cooldown=.3;p.skillTime=0;p.skillCooldown=0;p.sprinting=false;p.closeControl=false;p.slideTime=0;p.action=null;p.actionTime=0;}
    const taker=game.players.find(p=>p.team===kicking&&p.index===9&&!p.sentOff)||game.players.find(p=>p.team===kicking&&p.index!==0&&!p.sentOff),support=game.players.find(p=>p.team===kicking&&p.index===7&&!p.sentOff)||taker;
    if(!taker)throw Error("No hay sacador disponible.");taker.x=-direction(game,kicking)*1.4;taker.z=0;if(support!==taker){support.x=-direction(game,kicking)*5;support.z=6;}
    Object.assign(game.ball,{x:taker.x,y:.22,z:0,vx:0,vy:0,vz:0,owner:game.players.indexOf(taker),lastTouch:kicking,freeTime:0,lastKicker:null,dribble:null,dribbleLoose:false});
    game.controlled=game.playerLock?game.players.findIndex(p=>p.team===0&&p.id===game.playerLock):(kicking===0?game.players.indexOf(taker):nearest(game,0));if(game.localTwoPlayer)game.awayControlled=kicking===1?game.players.indexOf(taker):nearest(game,1);game.setPiece=null;game.wallFlight=null;game.passTarget=null;game.passRun=null;game.offsideTarget=null;game.ball.lastKickerIdentity=null;game.assistWindow=null;game.shotAssist=null;
  }
  function nearest(game,team,point=game.ball,excludeKeeper=true){
    let best=null,bestD=Infinity;
    game.players.forEach((p,i)=>{if(p.team!==team||p.sentOff||(excludeKeeper&&p.index===0))return;const d=dist(p,point);if(d<bestD){bestD=d;best=i;}});return best;
  }
  function ownBall(game,index){
    const p=game.players[index],b=game.ball;
    if(b.owner===null&&game.passTarget!==null&&index!==b.lastKicker){
      if(p.team===b.lastTouch){
        game.stats[p.team].completed++;
        const passer=b.lastKickerIdentity;
        if(passer?.team===p.team&&passer.id!==p.id){
          const owner=game.playerStats[passer.team+":"+passer.id];
          if(owner)owner.completed++;
          game.assistWindow={passer:{...passer},receiver:p.id,team:p.team,until:game.elapsed+12};
          if(game.passTarget===index&&p.x*direction(game,p.team)>25){
            game.stats[p.team].keyPasses++;
            if(owner)owner.keyPasses++;
          }
        }
      }
      else {game.stats[p.team].interceptions++;playerStat(game,p).interceptions++;game.assistWindow=null;}
    }
    if(game.assistWindow&&(game.assistWindow.receiver!==p.id||game.assistWindow.team!==p.team))
      game.assistWindow=null;
    game.shotAssist=null;
    b.owner=index;b.dribble=null;b.dribbleLoose=false;game.wallFlight=null;b.lastTouch=p.team;b.vx=b.vz=b.vy=b.spin=0;b.y=.22;game.passTarget=null;game.passRun=null;game.offsideTarget=null;
    if(!['save','dive','parry','smother','tackle'].includes(p.action)){
      // A controlled first touch becomes quicker as technique increases.
      const technique=clamp((p.overall-50)/49,0,1);
      animate(p,'receive',.20+(.10*(1-technique)));
      p.dribbleTime=.25+(1-technique)*.16;
    }
    if(p.team===0&&!game.playerLock)game.controlled=index;
    if(p.team===1&&game.localTwoPlayer)game.awayControlled=index;
  }
  function launch(game,p,target,speed,lift){
    const b=game.ball,dx=target.x-b.x,dz=target.z-b.z,len=Math.hypot(dx,dz)||1;
    Object.assign(b,{owner:null,dribble:null,dribbleLoose:false,vx:dx/len*speed,vz:dz/len*speed,vy:lift,spin:0,y:.26,freeTime:0,lastTouch:p.team,lastKicker:game.players.indexOf(p),lastKickerIdentity:{id:p.id,name:p.name,team:p.team}});game.offsideTarget=null;p.cooldown=.42;
  }
  function laneRisk(game,p,target){
    const dx=target.x-p.x,dz=target.z-p.z,length2=dx*dx+dz*dz||1;
    return game.players.filter(q=>q.team!==p.team).reduce((risk,q)=>{
      const t=clamp(((q.x-p.x)*dx+(q.z-p.z)*dz)/length2,0,1);
      if(t<.08||t>.96)return risk;
      const gap=Math.hypot(q.x-p.x-dx*t,q.z-p.z-dz*t);
      return risk+Math.max(0,3.8-gap)*(1.1+q.overall/100);
    },0);
  }
  function pass(game,p,input,through=false,lob=false){
    const d=direction(game,p.team);let aimX=Number(input.x)||0,aimZ=Number(input.z)||0;
    if(Math.hypot(aimX,aimZ)<.1){aimX=p.faceX||d;aimZ=p.faceZ||0;}
    const aimLen=Math.hypot(aimX,aimZ)||1;
    const alignment=q=>((q.x-p.x)*aimX+(q.z-p.z)*aimZ)/((dist(p,q)||1)*aimLen);
    const candidates=game.players.filter(q=>q.team===p.team&&!q.sentOff&&q!==p&&dist(p,q)>3&&dist(p,q)<(lob?72:49)&&(q.index!==0||(!through&&alignment(q)>.6)));
    candidates.sort((a,b)=>{
      const score=q=>alignment(q)*25-dist(p,q)*.12-laneRisk(game,p,q)*1.4+(through?(q.x-p.x)*d*.15:0);return score(b)-score(a);
    });
    const target=candidates[0];if(!target)return false;
    const r=dist(p,target),lead=through?clamp(4+r*.12,4,8):lob?1.5:1.1,delivery=PVF.pass(p,Number.isFinite(input.power)?input.power:through?.8:.6,r,lob),flight=clamp(r/delivery.speed,.15,2);
    const spot={x:clamp(target.x+target.vx*flight*.55+d*lead,-50,50),z:clamp(target.z+target.vz*flight*.55,-32,32)};
    game.setPiece=null;
    launch(game,p,spot,delivery.speed,delivery.lift);p.cooldown=.45;
    game.passTarget=game.players.indexOf(target);game.passRun={index:game.passTarget,...spot,until:game.elapsed+(lob?5:3.5)};
    // Judge the recipient at the moment the pass is released: the second-last
    // opponent sets the offside line, but only in the attacking half.
    const offsideLine=game.players.filter(q=>q.team!==p.team&&!q.sentOff).map(q=>q.x*d).sort((a,b)=>b-a)[1];
    game.offsideTarget=target.x*d>0&&target.x*d>p.x*d+.15&&target.x*d>offsideLine+.15?game.passTarget:null;
    game.stats[p.team].passes++;playerStat(game,p).passes++;
    if(through)game.stats[p.team].throughBalls++;
    animate(p,'pass',.34);event(game,"pass",p.name+(lob?" envía un pase elevado":through?" filtra al espacio":" combina"));return true;
  }
  function cross(game,p,input={}){
    const d=direction(game,p.team),front=game.players.filter(q=>q.team===p.team&&!q.sentOff&&q.index!==0&&q!==p&&(game.setPiece?.kind==="corner"?q.x*d>0:q.x*d>p.x*d-3));
    if(!front.length)return false;
    const target=front.sort((a,b)=>{
      const score=q=>Math.abs(52.5-q.x*d)*.45+Math.abs(q.z)*.8+dist(p,q)*.1;
      return score(a)-score(b);
    })[0];
    const spot={x:clamp(target.x+target.vx*.2+d*1.5,-50,50),z:clamp(target.z+target.vz*.2,-30,30)},range=dist(p,spot);
    const wasCorner=game.setPiece?.kind==="corner";
    const delivery=PVF.pass(p,.7,range,true);
    launch(game,p,spot,delivery.speed,delivery.lift);p.cooldown=.45;
    game.passTarget=game.players.indexOf(target);
    game.passRun={index:game.passTarget,...spot,until:game.elapsed+5};
    // At a corner there is no offside offence directly from the delivery.
    const line=game.players.filter(q=>q.team!==p.team&&!q.sentOff).map(q=>q.x*d).sort((a,b)=>b-a)[1];
    game.offsideTarget=wasCorner?null:target.x*d>0&&target.x*d>p.x*d+.15&&target.x*d>line+.15?game.passTarget:null;
    game.setPiece=null;
    game.stats[p.team].passes++;playerStat(game,p).passes++;game.stats[p.team].crosses++;
    animate(p,"pass",.42);event(game,"cross","¡Centro de "+p.name+" al área!",{team:p.team,player:p.id});
    return true;
  }
  function shoot(game,p,input={}){
    const d=direction(game,p.team),goalX=53.5*d,r=Math.abs(goalX-p.x),power=clamp(Number(input.power)||.58,.18,1);
    const style=["placed","power","curve"].includes(input.style)?input.style:"normal";
    const nearestDefender=game.players.filter(q=>q.team!==p.team&&!q.sentOff&&q.index!==0).reduce((n,q)=>Math.min(n,dist(p,q)),99);
    const pressure=clamp((3.5-nearestDefender)/3.5,0,1),fatigue=(100-p.stamina)/100;
    const accuracy=((100-p.shooting)*.025+r*.023+pressure*1.6+fatigue*1.1+Math.max(0,power-.82)*4)*(style==="placed"?.67:style==="power"?1.32:1);
    // Expected-goals estimate is deterministic and used for broadcast statistics.
    const shotAngle=clamp(1-Math.abs(p.z)/34,.18,1);
    const chance=clamp((.64*Math.exp(-r/17)+.02)*shotAngle*(1-pressure*.32),.01,.83);
    game.stats[p.team].xg+=chance;
    const pending=game.assistWindow;
    const assist=pending?.team===p.team&&pending.receiver===p.id&&game.elapsed<=pending.until?{...pending.passer}:null;
    game.assistWindow=null;
    const aim=clamp(clamp(Number(input.z)||0,-1,1)*2.9+(game.rng()-.5)*accuracy,-5.5,5.5);
    const delivery=PVF.shot(p,power),speed=clamp(delivery.speed+(style==="power"?3:style==="placed"?-1:0),15,42);
    const wall=game.setPiece?.kind==="free-kick"&&game.setPiece.team===p.team?game.setPiece.wall:null;
    launch(game,p,{x:goalX,z:aim},speed,Math.max(.4,delivery.lift+(style==="placed"?-.25:style==="power"?.3:0)));p.cooldown=.55;
    game.wallFlight=wall?.length?{team:p.team,positions:wall.map(i=>({x:game.players[i].x,z:game.players[i].z})),indices:wall.slice(),until:game.elapsed+1.5}:null;
    game.shotAssist=assist;
    if(style==="curve")game.ball.spin=-(Math.sign(Number(input.z)||0)||Math.sign(aim)||1)*(1+power*1.4);
    game.stats[p.team].shots++;playerStat(game,p).shots++;
    if(Math.abs(aim)<3.66){game.stats[p.team].onTarget++;playerStat(game,p).onTarget++;}
    game.passTarget=null;game.passRun=null;game.setPiece=null;animate(p,'shoot',.48);event(game,"shot","¡"+({normal:"Dispara",placed:"Tiro colocado de",power:"Cañonazo de",curve:"Tiro con efecto de"}[style])+" "+p.name+"!",{team:p.team,player:p.id,style});return true;
  }
  function setTactic(game,tactic){
    if(!game.paused||game.phase==="finished"||!["balanced","possession","press","counter"].includes(tactic))return false;
    game.tactic=tactic;event(game,"tactic","Nueva identidad de juego: "+({balanced:"equilibrado",possession:"posesión",press:"presión",counter:"contraataque"}[tactic]));return true;
  }
  function substitute(game,index,incoming,automatic=false){
    if((!game.paused&&!automatic)||game.phase==="finished"||!Number.isInteger(index)||!game.players[index]||!incoming)return false;
    const p=game.players[index],team=p.team,bench=game.benches[team],candidate=bench.find(q=>q.id===incoming.id);
    if(p.id===game.playerLock||p.sentOff||(automatic&&team!==1))return false;
    if(!candidate||!candidate.name||!candidate.pos||!Number.isFinite(candidate.overall)||candidate.overall<1||candidate.overall>99)return false;
    if(game.participants.flat().includes(candidate.id)||game.substitutions.filter(s=>s.team===team).length>=5)return false;
    if((p.index===0)!==(candidate.pos==="POR"))return false;
    const change={team,out:p.id,in:candidate.id,outName:p.name,inName:candidate.name,minute:Math.min(90,Math.floor(game.elapsed/game.seconds*90))};
    const slotRating=Array.isArray(candidate.slotRatings)?candidate.slotRatings[p.index]:undefined;
    const overall=clamp(Number.isFinite(slotRating)?slotRating:candidate.overall,1,99);
    Object.assign(p,{id:candidate.id,name:candidate.name,originalId:candidate.originalId||null,real:!!candidate.real,photo:candidate.photo||null,pos:p.index===0?"POR":candidate.pos,overall,pace:PVF.rating(candidate,"pace"),passing:PVF.rating(candidate,"passing"),shooting:PVF.rating(candidate,"shooting"),slideTime:0,sprinting:false,stamina:clamp(Number.isFinite(candidate.fitness)?candidate.fitness:100,0,100),cooldown:.3,decision:0,action:null,actionTime:0,yellows:0,sentOff:false,skillTime:0,skillCooldown:0});
    playerStat(game,p);
    bench.splice(bench.indexOf(candidate),1);game.participants[team].push(candidate.id);game.substitutions.push(change);
    event(game,"substitution",change.outName+" deja su sitio a "+change.inName,change);return true;
  }

  function whistleFoul(game,offender,victim,force=false){
    if(offender.sentOff||victim.sentOff||offender.team===victim.team)return false;
    const team=victim.team,spot={x:clamp(victim.x,-48,48),z:clamp(victim.z,-31,31)};
    const penalty=inKeeperArea(game,offender,spot);
    game.stats[offender.team].fouls++;
    if(game.rng()<(force?.4:.17)){
      offender.yellows++;game.stats[offender.team].yellows++;playerStat(game,offender).yellows++;
      event(game,"yellow","Amarilla para "+offender.name,{team:offender.team,player:offender.id});
      if(offender.yellows>=2||(force&&game.rng()<.08)){
        offender.sentOff=true;game.stats[offender.team].reds++;playerStat(game,offender).reds++;
        event(game,"red","¡Expulsado "+offender.name+"!",{team:offender.team,player:offender.id});
        offender.x=offender.team===0?-75:75;offender.z=0;offender.vx=offender.vz=0;
        if(game.controlled===game.players.indexOf(offender)&&!game.playerLock)game.controlled=nearest(game,0)??game.controlled;
      }
    }
    if(penalty){
      game.stats[team].penalties++;
      restart(game,team,"Penalti",direction(game,team)*41.5,0);
      const taker=game.players[game.restart.index];
      for(const q of game.players){
        if(q===taker||q.sentOff)continue;
        if(q.index===0&&q.team!==team)restartTarget(game,q,direction(game,team)*49,0);
        else if(q.index!==0&&q.x*direction(game,team)>32.35)restartTarget(game,q,direction(game,team)*32,Math.abs(q.z)<3?(q.index%2?3:-3):q.z);
      }
      game.setPiece={kind:"penalty",team,player:taker.id};
    }else{
      restart(game,team,"Tiro libre por falta",spot.x,spot.z);
      game.setPiece={kind:"free-kick",team,wall:arrangeWall(game,team,spot)};
    }
    event(game,"foul",penalty?"¡Penalti!":"Falta de "+offender.name,{team:offender.team,player:offender.id,penalty});
    return true;
  }
  function arrangeWall(game,team,spot){
    const d=direction(game,team),defenders=game.players.map((p,i)=>({p,i}))
      .filter(({p})=>p.team!==team&&p.index!==0&&!p.sentOff)
      .sort((a,b)=>dist(a.p,spot)-dist(b.p,spot));
    const range=52.5-spot.x*d;
    if(range<12||range>37||Math.abs(spot.z)>26||defenders.length<2)return [];
    const size=Math.min(range<22?4:3,defenders.length);
    const gx=52.5*d-spot.x,gz=-spot.z,len=Math.hypot(gx,gz)||1,ux=gx/len,uz=gz/len;
    const cx=spot.x+ux*9.15,cz=spot.z+uz*9.15,wall=[];
    for(let n=0;n<size;n++){
      const {p,i}=defenders[n],offset=(n-(size-1)/2)*.73;
      restartTarget(game,p,clamp(cx-uz*offset,-50.5,50.5),clamp(cz+ux*offset,-32,32));
      p.vx=p.vz=0;p.faceX=-ux;p.faceZ=-uz;wall.push(i);
    }
    return wall;
  }
  function wallContact(game,from){
    const flight=game.wallFlight,b=game.ball;if(!flight)return false;
    if(game.elapsed>flight.until||b.lastTouch!==flight.team){game.wallFlight=null;return false;}
    const dx=b.x-from.x,dz=b.z-from.z,len2=dx*dx+dz*dz;
    if(len2<.00001)return false;
    for(const q of flight.positions){
      const t=clamp(((q.x-from.x)*dx+(q.z-from.z)*dz)/len2,0,1);
      const x=from.x+dx*t,z=from.z+dz*t,y=from.y+(b.y-from.y)*t;
      if(Math.hypot(x-q.x,z-q.z)>1.0||y>2.15)continue;
      Object.assign(b,{x,z,y:Math.max(.23,y),vx:-b.vx*.28,vz:b.vz*.4+(game.rng()-.5)*2,vy:Math.max(.6,Math.abs(b.vy)*.25),lastTouch:1-flight.team,freeTime:0});
      game.stats[flight.team].blockedShots++;game.passTarget=null;game.passRun=null;game.offsideTarget=null;game.wallFlight=null;
      event(game,"block","¡La barrera bloquea el disparo!",{team:1-flight.team});return true;
    }
    return false;
  }
  function adaptiveAI(game){
    if(game.phase!=="playing"||game.localTwoPlayer)return;
    const progress=game.elapsed/game.seconds,lead=game.score[1]-game.score[0];
    const home=game.stats[0],away=game.stats[1];
    // Match-local adaptations, not persistent machine learning.
    const recurring=home.throughBalls>=3||home.crosses>=4;
    const domination=home.possession>away.possession*1.42&&home.possession>game.seconds*.08;
    const next=lead<0&&progress>.50?"press":lead>0&&progress>.64?"counter":
      recurring&&progress>.28?"compact":domination&&progress>.43?"press":"balanced";
    if(next!==game.aiTactic){
      game.aiTactic=next;
      event(game,"tactic","El rival cambia a "+({balanced:"equilibrado",press:"presión alta",counter:"contraataque",compact:"bloque compacto"}[next]),{team:1});
    }
  }
  function aiSubstitution(game){
    if(game.substitutions.filter(s=>s.team===1).length>=5)return false;
    const candidates=game.players.map((p,i)=>({p,i})).filter(({p})=>p.team===1&&p.index!==0&&!p.sentOff&&p.stamina<96)
      .sort((a,b)=>a.p.stamina-b.p.stamina);
    for(const {p,i} of candidates){
      const incoming=game.benches[1].filter(q=>q.pos===p.pos&&!game.participants.flat().includes(q.id)&&Number.isFinite(q.overall)&&q.overall>=p.overall-10)
        .sort((a,b)=>(b.overall+(b.fitness??100)*.15)-(a.overall+(a.fitness??100)*.15))[0];
      if(incoming&&(incoming.fitness??100)>p.stamina+5)return substitute(game,i,incoming,true);
    }
    return false;
  }

  function action(game,type,input={}){
    if(game.phase!=="playing"||game.paused)return false;
    const away=game.localTwoPlayer&&input.team===1;
    if(type==="pressure")type="tackle";
    if(type==="keeperRush"||type==="secondPress"||type==="closeControl")return false; // held inputs are consumed by step
    if(type==="switch"){
      if(away){game.awayControlled=nearest(game,1)??game.awayControlled;return true;}
      if(game.playerLock)return false;
      game.controlled=nearest(game,0)??game.controlled;return true;
    }
    const index=away?game.awayControlled:game.controlled,p=game.players[index],b=game.ball;
    if(input.buffer&&["pass","through","lob","cross"].includes(type)&&!p.sentOff&&game.setPiece?.kind!=="penalty"){
      const incoming=b.owner===null&&Number.isInteger(game.passTarget)&&!game.playerLock?game.passTarget:index;
      if((b.owner===index&&p.cooldown>0&&p.cooldown<=.22)||
        (b.owner===null&&game.players[incoming]?.team===p.team&&(game.passTarget===incoming||dist(p,b)<2.2))){
        game.inputBuffer[p.team]={type,input:{...input,buffer:false},player:game.players[incoming].id,until:game.elapsed+.22};return false;
      }
    }
    if(type==="tackle"||type==="slide"){
      if(p.sentOff||p.cooldown>0)return false;
      const carrier=b.owner===null?null:game.players[b.owner];
      if(carrier?.team===p.team)return false;
      if(type==="slide"){
        const ix=Number(input.x)||0,iz=Number(input.z)||0,aimed=Math.hypot(ix,iz)>.1,dx=aimed?ix:p.faceX,dz=aimed?iz:p.faceZ,length=Math.hypot(dx,dz)||1;
        p.slideTime=.6;p.slideX=dx/length;p.slideZ=dz/length;p.slideAttempted=false;
        p.vx=p.slideX*7.8;p.vz=p.slideZ*7.8;
      }else if(!carrier||dist(p,carrier)>1.75||dist(p,b)>1.35)return false;
      p.cooldown=type==="slide"?1.2:.9;
      animate(p,"tackle",type==="slide"?.6:.4);
      if(!carrier||dist(p,carrier)>(type==="slide"?1.6:1.75))return type==="slide";
      p.slideAttempted=true;
      if(game.rng()<clamp(.62+(p.overall-carrier.overall)*.009+(type==="slide"?.09:0),.35,.9)){
        ownBall(game,index);carrier.cooldown=.8;game.stats[p.team].tackles++;playerStat(game,p).tackles++;event(game,"tackle",p.name+" recupera");return true;
      }
      if(type==="slide"||game.rng()<.24)return whistleFoul(game,p,carrier,type==="slide");
      return false;
    }
    if(type==="skill"){
      if(p.sentOff||b.owner!==index||p.index===0||p.cooldown>0||p.skillCooldown>0||p.stamina<12)return false;
      const rightX=-(p.faceZ||0),rightZ=p.faceX||direction(game,p.team),aim=(Number(input.x)||0)*rightX+(Number(input.z)||0)*rightZ;
      const side=Math.abs(aim)>.15?Math.sign(aim):-(p.lastSkillSide||-1);p.lastSkillSide=side;
      p.skillForwardX=p.faceX||direction(game,p.team);p.skillForwardZ=p.faceZ||0;p.skillSideX=rightX*side;p.skillSideZ=rightZ*side;
      p.skillTime=.55;p.skillCooldown=1.8;p.stamina-=5;animate(p,"skill",.55);
      game.ball.dribble=null;
      event(game,"skill",p.name+" supera la presión con un regate");return true;
    }
    if(p.sentOff||b.owner!==index||p.cooldown>0)return false;
    if(game.setPiece?.kind==="penalty"&&type!=="shoot")return false;
    if(type==="cross")return cross(game,p,input);
    if(type==="pass"||type==="through"||type==="lob")return pass(game,p,input,type==="through",type==="lob");
    if(type==="shoot")return shoot(game,p,input);return false;
  }
  function move(p,tx,tz,speed,dt){PVF.move(p,tx,tz,speed,dt);}
  const keeperQuality=p=>clamp((p.overall-45)/50,0,1);
  function inKeeperArea(game,p,point){
    const depth=52.5+point.x*direction(game,p.team);
    return depth>=0&&depth<=16.5&&Math.abs(point.z)<=20.16;
  }
  function keeperClaim(game,p,i){
    const b=game.ball,owner=b.owner===null?null:game.players[b.owner];
    if(!owner||owner.team===p.team||p.cooldown>0||b.y>1.1||!inKeeperArea(game,p,b)||!inKeeperArea(game,p,p))return;
    const quality=keeperQuality(p);
    if(dist(p,b)>1.2+quality*.25)return;
    // One attempt per encounter, rather than a fresh dice roll every frame.
    p.cooldown=.65;p.diveSide=Math.sign(b.z-p.z)||1;p.saveHeight=.2;animate(p,'smother',.65);
    if(game.rng()>clamp(.68+quality*.24+(p.overall-owner.overall)*.003,.5,.96))return;
    ownBall(game,i);p.cooldown=.9;owner.cooldown=.45;game.stats[p.team].claims++;
    event(game,'claim','¡Sale '+p.name+' y se queda con el balón!',{team:p.team,player:p.id});
  }
  function keeperContact(game,from,starts){
    const b=game.ball,dx=b.x-from.x,dz=b.z-from.z,dy=b.y-from.y,speed=Math.hypot(b.vx,b.vz);
    // Only the part of the flight still inside the pitch may be saved.
    const end=Math.abs(b.x)>52.5?clamp(((Math.sign(b.x)*52.5)-from.x)/(dx||1),0,1):1;
    let contact=null;
    for(const [i,start] of starts){
      const p=game.players[i],d=direction(game,p.team),quality=keeperQuality(p);
      if(p.cooldown>0||!inKeeperArea(game,p,p)||(i===b.lastKicker&&b.freeTime<.7))continue;
      const rx=from.x-start.x,rz=from.z-start.z,vx=dx-(p.x-start.x),vz=dz-(p.z-start.z);
      if(b.vx*d<-.5&&rx*d<-.65)continue; // A ball already behind him cannot be rescued retroactively.
      const t=clamp(-(rx*vx+rz*vz)/(vx*vx+vz*vz||1),0,end),x=from.x+dx*t,z=from.z+dz*t,y=from.y+dy*t;
      const gap=Math.hypot(rx+vx*t,rz+vz*t),incoming=b.lastTouch!==p.team&&b.vx*d<-.5;
      const stretch=incoming&&(p.action==='dive'||speed>12),level=p.team===1?1+(game.difficulty-1)*.2:1;
      const reach=(stretch?2.05+quality*.65:.95+quality*.4)*level,maxHeight=stretch?2.35+quality*.45:2.05;
      // Extra reach is lateral, not a two-metre magnet in front of his body.
      if(!inKeeperArea(game,p,{x,z})||Math.abs(rx+vx*t)>.95||gap>reach||y>maxHeight)continue;
      if(!contact||t<contact.t)contact={p,i,t,x,y,z,gap,quality,incoming};
    }
    if(!contact)return false;
    const {p,i,x,y,z,gap,quality,incoming}=contact;
    const goalTime=b.vx?(-direction(game,p.team)*52.5-x)/b.vx:-1;
    const goalHeight=Math.max(.22,y+b.vy*goalTime-6*goalTime*goalTime);
    const onGoal=incoming&&game.passTarget===null&&goalTime>=0&&goalHeight<FIELD.height&&Math.abs(z+b.vz*goalTime)<FIELD.goal/2;
    Object.assign(b,{x,y,z});p.diveSide=Math.sign(z-p.z)||1;p.saveHeight=y;
    const hold=gap<1.05+quality*.35&&speed<24+quality*8&&y<2.15;
    if(onGoal){game.stats[p.team].saves++;playerStat(game,p).saves++;}
    if(hold){
      if(gap<1.1)p.diveSide=0;
      animate(p,'save',.65);ownBall(game,i);p.cooldown=.8;
      event(game,onGoal?'save':'claim',onGoal?'¡Atrapa '+p.name+'!':p.name+' asegura el balón',{team:p.team,player:p.id,outcome:'held'});
    }else{
      const side=Math.sign(z-p.z)||Math.sign(b.vz)||Math.sign(p.z)||1,d=direction(game,p.team);
      Object.assign(b,{owner:null,vx:d*(4+speed*.22),vz:side*(6+speed*.25),vy:1.1,y:Math.max(.24,y),lastTouch:p.team,lastKicker:i,lastKickerIdentity:{id:p.id,name:p.name,team:p.team},freeTime:0});
      game.passTarget=null;game.passRun=null;p.cooldown=.5;animate(p,'parry',.7);
      if(onGoal){game.stats[p.team].parries++;playerStat(game,p).parries++;}
      event(game,onGoal?'save':'claim','¡Despeja '+p.name+'!',{team:p.team,player:p.id,outcome:'parried'});
    }
    return true;
  }
  // Assign distinct receivers to un-controlled defenders; keep the chaser free.
  function defensiveMarks(game,chasers){
    const marks=Array(game.players.length).fill(null),owner=game.ball.owner===null?null:game.players[game.ball.owner];
    if(!owner)return marks;
    for(let team=0;team<2;team++){
      if(owner.team===team)continue;
      const d=direction(game,team),pairs=[],takenDef=new Set(),takenRun=new Set();
      const defenders=game.players.map((p,i)=>({p,i})).filter(({p,i})=>
        p.team===team&&!p.sentOff&&p.index!==0&&p.baseX<8&&i!==chasers[team]&&
        i!==game.controlled&&!(game.localTwoPlayer&&i===game.awayControlled));
      const runners=game.players.map((p,i)=>({p,i})).filter(({p})=>
        p.team!==team&&!p.sentOff&&p.index!==0&&p!==owner&&p.x*d<21);
      for(const {p,i} of defenders)for(const {p:q,i:j} of runners){
        const gap=dist(p,q),limit=team===1&&game.aiTactic==="compact"?25:19;
        if(gap>limit)continue;
        const danger=clamp((18-q.x*d)/48,0,1);
        pairs.push({i,j,score:gap-danger*4+Math.abs(p.z-q.z)*.06});
      }
      pairs.sort((a,b)=>a.score-b.score||a.i-b.i||a.j-b.j);
      for(const {i,j} of pairs){
        if(takenDef.has(i)||takenRun.has(j))continue;
        takenDef.add(i);takenRun.add(j);marks[i]=j;
      }
    }
    return marks;
  }
  // Favour safe forward passing lanes and avoid offside receivers.
  function aiPassChoice(game,p){
    const d=direction(game,p.team),opponents=game.players.filter(q=>q.team!==p.team&&!q.sentOff);
    const offsideLine=opponents.map(q=>q.x*d).sort((a,b)=>b-a)[1]??53;
    let best=null,highest=-Infinity;
    for(const q of game.players){
      if(q.team!==p.team||q===p||q.sentOff||q.index===0)continue;
      const range=dist(p,q),forward=(q.x-p.x)*d;
      if(range<5||range>46)continue;
      if(q.x*d>0&&q.x*d>p.x*d+.15&&q.x*d>offsideLine-1)continue;
      const risk=laneRisk(game,p,q),guard=opponents.reduce((min,o)=>Math.min(min,dist(o,q)),99);
      const space=clamp(guard-2,0,6);
      const score=forward*.40+space*.9-range*.14-risk*2.1+
        (Math.abs(q.z-p.z)>5?1:0)-(forward< -10?4:0);
      if(score>highest){highest=score;best={q,range,forward,risk,space};}
    }
    if(!best||highest< -12)return null;
    return {aim:{x:best.q.x-p.x,z:best.q.z-p.z},
      through:best.forward>12&&best.space>2.8&&best.risk<2.5&&best.range>14,score:highest};
  }
  function ai(game,p,i,dt,chasers,marks){
    const b=game.ball,d=direction(game,p.team),owner=b.owner===null?null:game.players[b.owner];
    const attacking=(owner?.team??(game.passTarget!==null?b.lastTouch:-1))===p.team;
    const wantsSprint=(!attacking&&i===chasers[p.team])||(!owner&&dist(p,b)>14);
    PVF.stamina(p,wantsSprint,dt);
    const speed=PVF.speed(p,p.sprinting)*(p.team===1?.96+.04*game.difficulty:1);
    if(p.index===0){
      const goalDistance=Math.max(.5,52.5+b.x*d),quality=keeperQuality(p);
      let depth=clamp(2.7+(18-goalDistance)*.22,2.7,6),tx=-d*(52.5-depth),tz=clamp(b.z*depth/goalDistance,-3.2,3.2);
      // Read the flight before it reaches the goal rather than following its
      // current lateral position. The keeper must still physically reach it.
      const arrival=b.owner===null&&b.vx*d<-1?(p.x-b.x)/b.vx:-1;
      if(arrival>0&&arrival<2){tx=p.x;tz=clamp(b.z+b.vz*arrival,-4.4,4.4);if(arrival<.4&&p.actionTime<=0&&(Math.abs(tz-p.z)>.7||b.y>1.6)){p.diveSide=Math.sign(tz-p.z)||1;p.saveHeight=clamp(b.y+b.vy*arrival-6*arrival*arrival,.22,2.8);animate(p,'dive',.65);}}
      else if(game.teamIntents?.[p.team]?.keeperRush&&(!owner||owner.team!==p.team)){
        tx=clamp(b.x,-50,50);tz=clamp(b.z,-20,20);
      }
      else if(owner&&owner.team!==p.team&&inKeeperArea(game,p,b)){
        // Stay between the ball and the centre of goal; close a frontal duel
        // instead of retreating to a fixed point and letting the dribbler pass.
        depth=Math.min(goalDistance+.4,clamp(3+(18-goalDistance)*.42,3,9));
        tx=-d*(52.5-depth);tz=clamp(b.z*depth/goalDistance,-8,8);
      }
      if(b.owner===i){if(p.cooldown<=0)pass(game,p,{x:d,z:0},false);}
      else {move(p,tx,tz,speed*(arrival>0?1.1+quality*.12:.95),dt);const lookX=b.x-p.x,lookZ=b.z-p.z,len=Math.hypot(lookX,lookZ)||1;p.faceX=lookX/len;p.faceZ=lookZ/len;}return;
    }

    if(b.owner===i){
      if(game.setPiece?.kind==="free-kick"&&game.setPiece.team===p.team){
        if(p.cooldown<=0){
          const range=52.5-p.x*d;
          if(range<37&&Math.abs(p.z)<26)shoot(game,p,{power:.65,z:p.z>0?-.5:.5,style:"placed"});
          else pass(game,p,{x:d,z:-Math.sign(p.z)*.2});
        }return;
      }
      if(game.setPiece?.kind==="corner"&&game.setPiece.team===p.team){if(p.cooldown<=0)cross(game,p);return;}
      if(game.setPiece?.kind==="penalty"&&game.setPiece.team===p.team){if(p.cooldown<=0)shoot(game,p,{power:.68,z:game.rng()>.5?.7:-.7,style:"placed"});return;}
      const goalDistance=52.5-p.x*d;
      p.decision=(p.decision||0)-dt;
      const threat=game.players.filter(q=>q.team!==p.team).reduce((m,q)=>Math.min(m,dist(p,q)),99);
      if(p.decision<=0&&p.cooldown<=0){
        p.decision=.6+game.rng()*.6;
        if(Math.abs(p.z)>19&&goalDistance<34&&goalDistance>7&&game.rng()<.5){cross(game,p);}
        else if(goalDistance<25&&Math.abs(p.z)<20&&(goalDistance<17||game.rng()<.48)){const keeper=game.players.find(q=>q.team!==p.team&&q.index===0);shoot(game,p,{power:.5+game.rng()*.35,z:(keeper.z>=0?-1:1)*(.75+game.rng()*.25)});}
        else {
          const option=aiPassChoice(game,p);
          const release=threat<4.2||goalDistance<8||
            (option&&option.score>3&&game.rng()<.30)||game.rng()<.12;
          if(release&&(!option||!pass(game,p,option.aim,option.through)))
            pass(game,p,{x:d,z:-p.z*.05},false);
        }
      }
      move(p,p.x+d*12,p.z+clamp(-p.z*.16,-2.4,2.4),speed*.87,dt);return;
    }
    let tx,tz;
    if(attacking&&game.passRun?.index===i&&game.passRun.until>game.elapsed){
      tx=game.passRun.x;tz=game.passRun.z;
      // A receiving run keeps the intended teammate available while the pass
      // travels. Once the ball has passed the rendezvous, pursue the ball.
      if(dist(p,{x:tx,z:tz})<1.2||b.freeTime>1.7){tx=b.x+b.vx*.12;tz=b.z+b.vz*.12;}
      move(p,tx,tz,speed*1.12,dt);return;
    }
    if(!attacking&&(i===chasers[p.team]||(i===game.defensiveRoles?.covers[p.team]&&game.teamIntents?.[p.team]?.secondPress))){
      tx=b.x+(owner?owner.vx:b.vx)*.22;tz=b.z+(owner?owner.vz:b.vz)*.22;
      if(owner&&owner.team!==p.team&&dist(p,owner)<1.25&&dist(p,b)<(owner.closeControl?.38:.68)&&p.cooldown<=0&&owner.cooldown<=0){
        const quality=clamp(1+(p.overall-owner.overall)*.025,.55,1.7);
        if(game.rng()<dt*quality*(p.team===1?1.4*game.difficulty:1)){ownBall(game,i);owner.cooldown=.8;game.stats[p.team].tackles++;}
      }
    }else if(!attacking&&owner&&i===game.defensiveRoles?.covers[p.team]&&!Number.isInteger(marks[i])){
      const dx=-d*52.5-b.x,dz=-b.z,length=Math.hypot(dx,dz)||1;
      tx=b.x+dx/length*9;tz=b.z+dz/length*9;
    }else{
      const advance=attacking?clamp(b.x*d*.35+9,0,23):clamp(b.x*d*.25,-15,8);
      tx=clamp((p.baseX+advance)*d,-47,46);tz=p.baseZ*d+b.z*.16;
      if(attacking&&p.baseX>10){
        const opponent=game.players.filter(q=>q.team!==p.team&&!q.sentOff&&q.index!==0);
        const nearDef=opponent.filter(q=>Math.abs(q.x-p.x)<13).sort((a,b)=>dist(a,p)-dist(b,p))[0];
        const offset=p.index===9?14:9;
        const overlap=nearDef?(p.z-nearDef.z>=0?1:-1)*Math.min(6,Math.max(0,7-Math.abs(p.z-nearDef.z))):0;
        tx=clamp((b.x*d+offset)*d,-46,46);
        tz=clamp(tz+overlap,-29,29);
        // Keep wide options on the touchlines for actual overlapping runs.
        if(p.index===8||p.index===10)tz=clamp(p.baseZ*d*.82+b.z*.18+overlap,-29,29);
      }
      if(!attacking&&owner&&owner.team!==p.team&&p.baseX<5){
        // The nearest defender presses; the others screen dangerous runners
        // instead of all collapsing on the same ball carrier.
        const runner=Number.isInteger(marks[i])?game.players[marks[i]]:null;
        if(runner){tx=clamp(runner.x-d*2.2,-47,47);tz=clamp(runner.z*.90+b.z*.10,-31,31);}
        else if(dist(p,owner)<13){tx=owner.x-d*4.5;tz=owner.z*.55+p.baseZ*d*.45;}
      }
      if(p.team===1&&game.aiTactic==="compact"&&!attacking){
        tx=clamp(tx-d*2.5,-47,47);tz=clamp(tz*.82+p.baseZ*d*.18,-30,30);
      }
      if(p.team===1&&game.aiTactic==="press"&&!attacking){tx=tx*.55+b.x*.45;tz=tz*.6+b.z*.4;}
      if(p.team===1&&game.aiTactic==="counter"&&attacking&&p.baseX>10)tx=clamp(tx+d*7,-47,47);
      if(game.tactic==="press"&&p.team===0&&!attacking){tx=tx*.65+b.x*.35;tz=tz*.7+b.z*.3;}
      if(game.tactic==="possession"&&p.team===0&&attacking){tx=p.x*.2+tx*.8;tz*=.8;}
      if(game.tactic==="counter"&&p.team===0&&attacking&&p.baseX>10)tx=clamp(tx+d*8,-47,47);
    }
    move(p,tx,tz,speed,dt);
  }
  function restartTarget(game,p,x,z){
    const index=game.players.indexOf(p),targets=game.restart.targets;
    const target={index,x:clamp(x,-51.5,51.5),z:clamp(z,-33,33)};
    const previous=targets.findIndex(t=>t.index===index);
    if(previous<0)targets.push(target);else targets[previous]=target;
  }
  function restart(game,team,kind,x,z,goalKick=false){
    const keeper=goalKick?game.players.findIndex(p=>p.team===team&&p.index===0&&!p.sentOff):-1;
    const index=keeper>=0?keeper:nearest(game,team,{x,z}),p=game.players[index],b=game.ball;
    const spot={x:clamp(x,-49,49),z:clamp(z,-32,32)};
    game.setPiece=null;game.wallFlight=null;game.assistWindow=null;game.shotAssist=null;
    game.passTarget=null;game.passRun=null;game.offsideTarget=null;game.inputBuffer=[null,null];
    game.restart={team,index,kind,...spot,targets:[],settle:.35};game.phase="restart";
    // The whistle stops play before anyone changes position. A dead ball has
    // no owner until the taker has physically reached it and everyone is ready.
    Object.assign(b,{...spot,y:.22,owner:null,vx:0,vy:0,vz:0,spin:0,freeTime:0,lastTouch:team,lastKicker:null,lastKickerIdentity:null});
    for(const q of game.players){
      if(q.sentOff)continue;q.vx=q.vz=0;q.slideTime=0;
      if(q===p)continue;
      const radius=q.team===team?1.5:kind==="Saque de banda"?2.5:9.5;
      const gap=dist(q,spot);
      if(gap<radius){
        const dx=q.x-spot.x,dz=q.z-spot.z;
        let tx=clamp(spot.x+(gap>.01?dx/gap:-direction(game,team))*radius,-51.5,51.5);
        let tz=clamp(spot.z+(gap>.01?dz/gap:0)*radius,-33,33);
        if(dist({x:tx,z:tz},spot)<radius-.1){tx=spot.x-Math.sign(spot.x||1)*radius;tz=spot.z;}
        restartTarget(game,q,tx,tz);
      }
      if(goalKick&&q.team!==team&&inKeeperArea(game,p,q))restartTarget(game,q,-direction(game,team)*35,q.z);
    }
    restartTarget(game,p,spot.x,spot.z);
    if(team===0&&!game.playerLock)game.controlled=index;
    if(team===1&&game.localTwoPlayer)game.awayControlled=index;
    event(game,"restart",kind,{team});
  }
  function prepareRestart(game,dt){
    const pending=game.restart;let ready=true;
    for(const target of pending.targets){
      const p=game.players[target.index];if(p.sentOff)continue;
      move(p,target.x,target.z,6,dt);
      if(dist(p,target)>.12||Math.hypot(p.vx,p.vz)>.2)ready=false;
    }
    if(!ready){pending.settle=.35;return;}
    pending.settle-=dt;if(pending.settle>0)return;
    const taker=game.players[pending.index];
    taker.faceX=direction(game,taker.team);taker.faceZ=0;
    ownBall(game,pending.index);taker.cooldown=.3;
    game.restart=null;game.phase="playing";
  }
  function ballStep(game,dt,keeperStarts){
    const b=game.ball;
    if(b.owner!==null)for(const [i] of keeperStarts)keeperClaim(game,game.players[i],i);
    if(b.owner!==null){
      const index=b.owner,p=game.players[index];
      if(p.index===0||game.setPiece){PVF.carry(b,p,dt);return;}
      const controlled=PVF.dribble(b,p,dt);
      if(!controlled||Math.abs(b.x)>52.5||Math.abs(b.z)>34){
        Object.assign(b,{owner:null,lastKicker:index,lastKickerIdentity:{id:p.id,name:p.name,team:p.team},freeTime:0,dribbleLoose:true});
        game.assistWindow=null;return;
      }
      // A defender must reach the exposed ball, not simply stand near its owner.
      const steal=game.players.map((q,i)=>({q,i,gap:dist(q,b)})).filter(({q,gap})=>
        q.team!==p.team&&!q.sentOff&&q.index!==0&&q.cooldown<=0&&gap<(p.closeControl?.38:.58)&&dist(q,p)>.65)
        .sort((a,c)=>a.gap-c.gap||a.i-c.i)[0];
      if(steal){ownBall(game,steal.i);steal.q.cooldown=.25;p.cooldown=.3;game.stats[steal.q.team].tackles++;playerStat(game,steal.q).tackles++;event(game,"tackle",steal.q.name+" corta el toque",{team:steal.q.team,player:steal.q.id});}
      return;
    }
    b.freeTime+=dt;const velocity=Math.hypot(b.vx,b.vy,b.vz);if(velocity>PVF.tuning.maxBallSpeed){const scale=PVF.tuning.maxBallSpeed/velocity;b.vx*=scale;b.vy*=scale;b.vz*=scale;}const previousX=b.x,previousZ=b.z,previousY=b.y;
    b.x+=b.vx*dt;b.z+=b.vz*dt;b.y+=b.vy*dt;b.vy-=PVF.tuning.gravity*dt;b.vz+=(b.spin||0)*dt;b.spin=(b.spin||0)*Math.exp(-dt*1.5);
    if(b.y<.22){b.y=.22;b.vy=Math.abs(b.vy)>.9?-b.vy*(game.weather==="rain"?.35:PVF.tuning.bounce):0;}
    const drag=Math.exp(-dt*(b.y<.3?(game.weather==="rain"?.36:PVF.tuning.groundDrag):PVF.tuning.airDrag));b.vx*=drag;b.vz*=drag;
    if(wallContact(game,{x:previousX,y:previousY,z:previousZ}))return;
    if(keeperContact(game,{x:previousX,y:previousY,z:previousZ},keeperStarts))return;
    if(Math.abs(b.x)>52.5){
      const edge=Math.sign(b.x)*52.5,progress=clamp((edge-previousX)/(b.x-previousX||1),0,1),z=previousZ+(b.z-previousZ)*progress,y=previousY+(b.y-previousY)*progress;
      if((Math.abs(Math.abs(z)-FIELD.goal/2)<.16&&y<FIELD.height+.16)||(Math.abs(y-FIELD.height)<.16&&Math.abs(z)<FIELD.goal/2)){
        b.x=edge-Math.sign(edge)*.28;b.vx=-b.vx*.62;b.vz+=Math.sign(z||1)*1.8;b.vy=Math.min(b.vy,-.3);event(game,'woodwork','¡Al palo!',{team:b.lastTouch});return;
      }
      if(Math.abs(z)<FIELD.goal/2&&y<FIELD.height){
        const team=direction(game,0)===Math.sign(b.x)?0:1;game.score[team]++;
        const shooter=b.lastKickerIdentity||game.players[b.lastKicker],name=shooter?.team===team?shooter.name:"Gol en propia puerta";
        const scorer=shooter?.team===team&&shooter?.id?game.playerStats[team+":"+shooter.id]:null;
        if(scorer)scorer.goals++;
        const possibleAssist=game.shotAssist;
        const assister=scorer&&possibleAssist?.team===team&&possibleAssist.id!==shooter.id?
          game.playerStats[team+":"+possibleAssist.id]:null;
        if(assister)assister.assists++;
        const goal=event(game,"goal","¡GOOOL! "+name+(assister?" · Asistencia de "+assister.name:""),
          {team,player:scorer?.id||null,name,assist:assister?.name||null,assistId:assister?.id||null});
        game.goals.push(goal);game.shotAssist=null;game.assistWindow=null;
        for(const p of game.players)if(p.team===team&&p.index!==0)animate(p,'celebrate',2.7);
        game.phase="goal";game.phaseTime=2.7;game.kickoffTeam=1-team;return;
      }
      const defending=direction(game,0)===Math.sign(b.x)?1:0;
      if(b.lastTouch===defending){
        const attacking=1-defending,side=Math.sign(z||b.z||1);
        restart(game,attacking,"Córner",Math.sign(edge)*49,side*32);
        game.setPiece={kind:"corner",team:attacking};return;
      }
      restart(game,defending,"Saque de portería",edge-Math.sign(edge)*4,0,true);return;
    }
    if(Math.abs(b.z)>34){restart(game,1-b.lastTouch,"Saque de banda",b.x,Math.sign(b.z)*32);return;}
    if(b.y>2.5)return;
    const candidates=game.players.map((p,i)=>({p,i,d:dist(p,b)})).filter(({p,i,d})=>
      d<1.15&&!p.sentOff&&p.cooldown<=0&&(p.index!==0||!inKeeperArea(game,p,p))&&(i!==b.lastKicker||b.freeTime>(b.dribbleLoose?.08:.7))&&b.y<1.1);
    candidates.sort((a,c)=>a.d-c.d);
    if(candidates.length){
      const receiver=candidates[0];
      if(game.offsideTarget===receiver.i){
        game.offsideTarget=null;
        restart(game,1-receiver.p.team,"Tiro libre por fuera de juego",receiver.p.x,receiver.p.z);
        event(game,"offside","Fuera de juego de "+receiver.p.name,{team:receiver.p.team,player:receiver.p.id});
      }else ownBall(game,receiver.i);
    }
  }
  function step(game,delta,input={}){
    if(game.phase==="finished"||game.paused)return game;
    const dt=clamp(Number(delta)||0,0,.05);if(!dt)return game;
    game.visualTime+=dt;for(const p of game.players)p.actionTime=Math.max(0,p.actionTime-dt);
    if(game.phase==="restart"){prepareRestart(game,dt);return game;}
    if(game.phase!=="playing"){
      game.phaseTime-=dt;
      if(game.phaseTime<=0){
        if(game.phase==="goal"){reset(game,game.kickoffTeam);game.phase="kickoff";game.phaseTime=1;}
        else if(game.phase==="halftime"){aiSubstitution(game);game.half=2;reset(game,1);game.phase="kickoff";game.phaseTime=1;}
        else game.phase="playing";
      }return game;
    }
    game.elapsed=Math.min(game.seconds,game.elapsed+dt);
    for(const p of game.players)if(!p.sentOff)playerStat(game,p).minutes+=dt/game.seconds*90;
    adaptiveAI(game);
    if(game.elapsed>=game.seconds){game.phase="finished";event(game,"fulltime","Final del partido");return game;}
    if(game.half===1&&game.elapsed>=game.seconds/2){game.phase="halftime";game.phaseTime=2.3;event(game,"halftime","Descanso · cambio de campo");return game;}
    const b=game.ball,owner=b.owner===null?null:game.players[b.owner];if(owner)game.stats[owner.team].possession+=dt;
    game.teamIntents=[input,game.localTwoPlayer?(input.away||{}):{}];
    const chasers=PVF.roles(game,dt).chasers,marks=defensiveMarks(game,chasers);
    const keeperStarts=game.players.flatMap((p,i)=>p.index===0?[[i,{x:p.x,z:p.z}]]:[]);
    for(let i=0;i<game.players.length;i++){
      const p=game.players[i];if(p.sentOff)continue;p.cooldown=Math.max(0,p.cooldown-dt);p.skillCooldown=Math.max(0,p.skillCooldown-dt);
      if(p.slideTime>0){
        p.slideTime=Math.max(0,p.slideTime-dt);move(p,p.x+p.slideX*6,p.z+p.slideZ*6,7.8*(p.slideTime/.6),dt);
        if(!p.slideAttempted){
          const carrier=b.owner===null?null:game.players[b.owner];
          if(carrier&&carrier.team!==p.team&&dist(p,carrier)<1.6){
            p.slideAttempted=true;
            if(game.rng()<clamp(.71+(p.overall-carrier.overall)*.009,.35,.9)){
              ownBall(game,i);carrier.cooldown=.8;game.stats[p.team].tackles++;playerStat(game,p).tackles++;
            }else whistleFoul(game,p,carrier,true);
          }
        }
        if(game.phase!=="playing")return game;continue;
      }
      if((game.setPiece&&(((i===game.controlled||(game.localTwoPlayer&&i===game.awayControlled))&&game.setPiece.team===p.team&&b.owner===i)||
        (game.setPiece.kind==="free-kick"&&game.setPiece.wall?.includes(i))))||
        game.wallFlight?.indices?.includes(i)){
        p.vx=p.vz=0;continue;
      }
      if(i===game.controlled||(game.localTwoPlayer&&i===game.awayControlled)){
        const intent=game.localTwoPlayer&&i===game.awayControlled?(input.away||{}):input;
        let x=clamp(Number(intent.x)||0,-1,1),z=clamp(Number(intent.z)||0,-1,1),len=Math.hypot(x,z);if(len>1){x/=len;z/=len;}
        if(intent.pressure&&owner&&owner.team!==p.team){
          if(len<.1){const dx=owner.x-p.x,dz=owner.z-p.z,gap=Math.hypot(dx,dz)||1;x=dx/gap;z=dz/gap;len=1;}
          if(dist(p,owner)<1.75&&p.cooldown<=0)action(game,"tackle",{team:p.team});
        }
        p.closeControl=!!intent.closeControl;
        const sprint=PVF.stamina(p,!!intent.sprint&&!p.closeControl&&len>.1,dt),burst=p.skillTime>0;
        const speed=PVF.speed(p,sprint)*(b.owner===i?.97:1)*(p.closeControl?.60:1)*(burst?1.06:1);
        if(burst){
          const side=Math.sin((1-p.skillTime/.55)*Math.PI);
          x=p.skillForwardX*.65+p.skillSideX*side*.95;z=p.skillForwardZ*.65+p.skillSideZ*side*.95;
          const length=Math.hypot(x,z)||1;x/=length;z/=length;len=1;
          p.skillTime=Math.max(0,p.skillTime-dt);p.stamina=clamp(p.stamina-dt*3,0,100);
        }
        if(len>.05)move(p,p.x+x*10,p.z+z*10,speed*Math.min(1,len),dt);else move(p,p.x,p.z,0,dt);
      }else ai(game,p,i,dt,chasers,marks);
    }
    // Soft collisions keep the ball carrier visible and prevent stacked players.
    for(let i=0;i<game.players.length;i++)for(let j=i+1;j<game.players.length;j++){
      const a=game.players[i],c=game.players[j],dx=a.x-c.x,dz=a.z-c.z,len=Math.hypot(dx,dz);
      if(!a.sentOff&&!c.sentOff&&len>.01&&len<.72){const push=(.72-len)*.3;a.x+=dx/len*push;a.z+=dz/len*push;c.x-=dx/len*push;c.z-=dz/len*push;}
    }
    ballStep(game,dt,keeperStarts);
    for(let team=0;team<2;team++){
      const queued=game.inputBuffer[team];if(!queued)continue;
      const carrier=b.owner===null?null:game.players[b.owner];
      if(game.phase!=="playing"||game.elapsed>queued.until||(carrier&&carrier.team!==team)){game.inputBuffer[team]=null;continue;}
      if(carrier?.id===queued.player&&carrier.cooldown<=0){game.inputBuffer[team]=null;action(game,queued.type,queued.input);}
    }
    return game;
  }
  function report(game){
    const players=Object.values(game.playerStats).map(s=>({...s,minutes:Math.min(90,Math.round(s.minutes)),rating:calculateRating(s)}))
      .sort((a,b)=>b.rating-a.rating||b.goals-a.goals||b.assists-a.assists||b.completed-a.completed||a.team-b.team||a.name.localeCompare(b.name));
    return {players,manOfTheMatch:players[0]||null};
  }
  function result(game){
    if(game.phase!=="finished")return null;
    const total=game.stats.reduce((n,s)=>n+s.possession,0)||1;
    const {players,manOfTheMatch}=report(game);
    return {players,manOfTheMatch,home:game.score[0],away:game.score[1],stats:game.stats.map(s=>({...s,xg:Math.round(s.xg*100)/100,possession:Math.round(s.possession/total*100)})),goals:game.goals.map(e=>({...e})),seconds:game.seconds,
      participants:game.participants.map(ids=>ids.slice()),substitutions:game.substitutions.map(s=>({...s}))};
  }
  return {gameplay:PVF,FIELD,SHAPE,create,step,action,result,report,direction,nearest,random,substitute,setTactic};
});
