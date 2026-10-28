/* AURA Evolution: deterministic football simulation, independent of rendering. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.AuraMatch=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const FIELD={length:105,width:68,goal:7.32,height:2.44};
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  const SHAPE=[["POR",-48,0],["LI",-30,-24],["DFC",-35,-9],["DFC",-35,9],["LD",-30,24],["MCD",-12,0],["MC",-4,-14],["MC",-4,14],["EI",17,-23],["DC",23,0],["ED",17,23]];
  function random(seed){let s=seed>>>0;return()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296;};}
  function create(options={}){
    const rng=random(options.seed??Date.now()),seconds=clamp(Number(options.seconds)||180,30,1200);
    const sides=[options.home,options.away];
    if(sides.some(t=>!t||!Array.isArray(t.players)||t.players.length!==11))throw Error("Se necesitan dos onces completos.");
    if(sides.some(t=>new Set(t.players.map(p=>p.id)).size!==11))throw Error("Un once no puede tener jugadores duplicados.");
    const players=sides.flatMap((t,team)=>t.players.map((p,i)=>{
      const slot=t.slots?.[i],baseX=slot?(50-slot[2])*.96:SHAPE[i][1],baseZ=slot?(slot[1]-50)*.58:SHAPE[i][2];
      return {id:p.id,name:p.name,number:i+1,team,index:i,pos:i===0?"POR":p.pos,overall:clamp(p.overall||70,1,99),
        baseX,baseZ,x:0,z:0,vx:0,vz:0,faceX:team===0?1:-1,faceZ:0,stamina:clamp(Number.isFinite(p.fitness)?p.fitness:100,0,100),cooldown:0,run:0};
    }));
    const game={players,ball:{x:0,y:.22,z:0,vx:0,vy:0,vz:0,owner:null,lastTouch:0,freeTime:0,lastKicker:null},
      score:[0,0],elapsed:0,seconds,half:1,phase:"kickoff",phaseTime:1.1,controlled:9,events:[],
      stats:[0,1].map(()=>({shots:0,onTarget:0,passes:0,completed:0,throughBalls:0,interceptions:0,saves:0,tackles:0,possession:0})),
      benches:sides.map(t=>(t.bench||[]).filter(p=>p&&typeof p.id==="string").map(p=>({...p}))),
      participants:sides.map(t=>t.players.map(p=>p.id)),substitutions:[],
      difficulty:clamp(Number(options.difficulty)||1,.65,1.4),tactic:options.tactic||"balanced",goals:[],rng,seed:options.seed};
    reset(game,0);return game;
  }
  function direction(game,team){return (team===0?1:-1)*(game.half===1?1:-1);}
  function event(game,type,text,extra={}){const e={type,text,at:game.elapsed,minute:Math.min(90,Math.floor(game.elapsed/game.seconds*90)),...extra};game.events.push(e);if(game.events.length>80)game.events.shift();return e;}
  function reset(game,kicking){
    for(const p of game.players){const d=direction(game,p.team);p.x=p.baseX*d;p.z=p.baseZ*d;p.vx=p.vz=0;p.faceX=d;p.faceZ=0;p.cooldown=.3;}
    const taker=game.players.find(p=>p.team===kicking&&p.index===9),support=game.players.find(p=>p.team===kicking&&p.index===7);
    taker.x=-direction(game,kicking)*1.4;taker.z=0;support.x=-direction(game,kicking)*5;support.z=6;
    Object.assign(game.ball,{x:taker.x,y:.22,z:0,vx:0,vy:0,vz:0,owner:game.players.indexOf(taker),lastTouch:kicking,freeTime:0,lastKicker:null});
    game.controlled=kicking===0?9:6;game.passTarget=null;game.passRun=null;game.ball.lastKickerIdentity=null;
  }
  function nearest(game,team,point=game.ball,excludeKeeper=true){
    let best=null,bestD=Infinity;
    game.players.forEach((p,i)=>{if(p.team!==team||(excludeKeeper&&p.index===0))return;const d=dist(p,point);if(d<bestD){bestD=d;best=i;}});return best;
  }
  function ownBall(game,index){
    const p=game.players[index],b=game.ball;
    if(b.owner===null&&game.passTarget!==null&&index!==b.lastKicker){
      if(p.team===b.lastTouch)game.stats[p.team].completed++;
      else game.stats[p.team].interceptions++;
    }
    b.owner=index;b.lastTouch=p.team;b.vx=b.vz=b.vy=0;b.y=.22;game.passTarget=null;game.passRun=null;
    if(p.team===0)game.controlled=index;
  }
  function launch(game,p,target,speed,lift){
    const b=game.ball,dx=target.x-b.x,dz=target.z-b.z,len=Math.hypot(dx,dz)||1;
    Object.assign(b,{owner:null,vx:dx/len*speed,vz:dz/len*speed,vy:lift,y:.26,freeTime:0,lastTouch:p.team,lastKicker:game.players.indexOf(p),lastKickerIdentity:{id:p.id,name:p.name,team:p.team}});p.cooldown=.42;
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
  function pass(game,p,input,through=false){
    const d=direction(game,p.team);let aimX=Number(input.x)||0,aimZ=Number(input.z)||0;
    if(Math.hypot(aimX,aimZ)<.1){aimX=p.faceX||d;aimZ=p.faceZ||0;}
    const aimLen=Math.hypot(aimX,aimZ)||1;
    const alignment=q=>((q.x-p.x)*aimX+(q.z-p.z)*aimZ)/((dist(p,q)||1)*aimLen);
    const candidates=game.players.filter(q=>q.team===p.team&&q!==p&&dist(p,q)>3&&dist(p,q)<49&&(q.index!==0||(!through&&alignment(q)>.6)));
    candidates.sort((a,b)=>{
      const score=q=>alignment(q)*25-dist(p,q)*.12-laneRisk(game,p,q)*1.4+(through?(q.x-p.x)*d*.15:0);return score(b)-score(a);
    });
    const target=candidates[0];if(!target)return false;
    const r=dist(p,target),lead=through?clamp(4+r*.12,4,8):1.1,flight=clamp(r/24,.15,1.2);
    const spot={x:clamp(target.x+target.vx*flight*.55+d*lead,-50,50),z:clamp(target.z+target.vz*flight*.55,-32,32)};
    launch(game,p,spot,clamp(14+r*.4+(through?2:0),15,32),through?1.7:.35);
    game.passTarget=game.players.indexOf(target);game.passRun={index:game.passTarget,...spot,until:game.elapsed+3.5};game.stats[p.team].passes++;
    if(through)game.stats[p.team].throughBalls++;
    event(game,"pass",p.name+(through?" filtra al espacio":" combina"));return true;
  }
  function shoot(game,p,input={}){
    const d=direction(game,p.team),goalX=53.5*d,r=Math.abs(goalX-p.x),power=clamp(Number(input.power)||.58,.18,1);
    const nearestDefender=game.players.filter(q=>q.team!==p.team&&q.index!==0).reduce((n,q)=>Math.min(n,dist(p,q)),99);
    const pressure=clamp((3.5-nearestDefender)/3.5,0,1),fatigue=(100-p.stamina)/100;
    const accuracy=(100-p.overall)*.025+r*.023+pressure*1.6+fatigue*1.1+Math.max(0,power-.82)*4;
    const aim=clamp((Number(input.z)||0)*2.1+(game.rng()-.5)*accuracy,-5.5,5.5);
    const speed=22+power*12;
    launch(game,p,{x:goalX,z:aim},speed,clamp(r*.07+power*.6,1.1,4.4));
    game.stats[p.team].shots++;if(Math.abs(aim)<3.66)game.stats[p.team].onTarget++;
    game.passTarget=null;game.passRun=null;event(game,"shot","¡Dispara "+p.name+"!",{team:p.team,player:p.id});return true;
  }
  function setTactic(game,tactic){
    if(!game.paused||game.phase==="finished"||!["balanced","possession","press","counter"].includes(tactic))return false;
    game.tactic=tactic;event(game,"tactic","Nueva identidad de juego: "+({balanced:"equilibrado",possession:"posesión",press:"presión",counter:"contraataque"}[tactic]));return true;
  }
  function substitute(game,index,incoming){
    if(!game.paused||game.phase==="finished"||!Number.isInteger(index)||!game.players[index]||!incoming)return false;
    const p=game.players[index],team=p.team,bench=game.benches[team],candidate=bench.find(q=>q.id===incoming.id);
    if(!candidate||!candidate.name||!candidate.pos||!Number.isFinite(candidate.overall)||candidate.overall<1||candidate.overall>99)return false;
    if(game.participants.flat().includes(candidate.id)||game.substitutions.filter(s=>s.team===team).length>=5)return false;
    if((p.index===0)!==(candidate.pos==="POR"))return false;
    const change={team,out:p.id,in:candidate.id,outName:p.name,inName:candidate.name,minute:Math.min(90,Math.floor(game.elapsed/game.seconds*90))};
    const slotRating=Array.isArray(candidate.slotRatings)?candidate.slotRatings[p.index]:undefined;
    const overall=clamp(Number.isFinite(slotRating)?slotRating:candidate.overall,1,99);
    Object.assign(p,{id:candidate.id,name:candidate.name,pos:p.index===0?"POR":candidate.pos,overall,stamina:clamp(Number.isFinite(candidate.fitness)?candidate.fitness:100,0,100),cooldown:.3,decision:0});
    bench.splice(bench.indexOf(candidate),1);game.participants[team].push(candidate.id);game.substitutions.push(change);
    event(game,"substitution",change.outName+" deja su sitio a "+change.inName,change);return true;
  }
  function action(game,type,input={}){
    if(game.phase!=="playing"||game.paused)return false;
    if(type==="switch"){game.controlled=nearest(game,0)??game.controlled;return true;}
    const index=game.controlled,p=game.players[index],b=game.ball;
    if(type==="tackle"){
      if(p.cooldown>0||b.owner===null)return false;
      const carrier=game.players[b.owner];if(carrier.team===p.team||dist(p,carrier)>3)return false;
      p.cooldown=.9;
      if(game.rng()<clamp(.62+(p.overall-carrier.overall)*.009,.35,.9)){
        ownBall(game,index);carrier.cooldown=.8;game.stats[0].tackles++;event(game,"tackle",p.name+" recupera");return true;
      }return false;
    }
    if(b.owner!==index||p.cooldown>0)return false;
    if(type==="pass"||type==="through")return pass(game,p,input,type==="through");
    if(type==="shoot")return shoot(game,p,input);return false;
  }
  function move(p,tx,tz,speed,dt){
    const dx=tx-p.x,dz=tz-p.z,len=Math.hypot(dx,dz),amount=Math.min(len,speed*dt);
    p.vx=len>.1?dx/len*speed:0;p.vz=len>.1?dz/len*speed:0;
    if(len>.1){p.x+=dx/len*amount;p.z+=dz/len*amount;p.faceX=dx/len;p.faceZ=dz/len;p.run+=amount;}
    p.x=clamp(p.x,-51.5,51.5);p.z=clamp(p.z,-33,33);
  }
  function ai(game,p,i,dt,chasers){
    const b=game.ball,d=direction(game,p.team),owner=b.owner===null?null:game.players[b.owner];
    const attacking=(owner?.team??(game.passTarget!==null?b.lastTouch:-1))===p.team;
    const speed=(4.2+p.overall*.027)*(p.team===1?game.difficulty:1)*(.78+p.stamina*.0022);
    if(p.index===0){
      let tx=-d*clamp(48-Math.max(0,-b.x*d-30)*.12,44,49),tz=clamp(b.z*.3,-3.3,3.3);
      // Read the flight before it reaches the goal rather than following its
      // current lateral position. The keeper must still physically reach it.
      const arrival=b.owner===null&&b.vx*d<-1?(-d*49-b.x)/b.vx:-1;
      if(arrival>0&&arrival<2){tx=-d*49;tz=clamp(b.z+b.vz*arrival,-4,4);}
      else if(owner&&owner.team!==p.team&&owner.x*d<-34){tx=-d*46;tz=clamp(b.z*.42,-3.5,3.5);}
      if(b.owner===i){p.cooldown-=dt;if(p.cooldown<=0)pass(game,p,{x:d,z:0},false);}
      else move(p,tx,tz,speed*(arrival>0?1.08:.85),dt);return;
    }
    const working=i===chasers[p.team]||b.owner===i||attacking;
    const workRate=working?.28:.07,pressCost=game.tactic==="press"&&p.team===0?.12:0;
    p.stamina=clamp(p.stamina-dt*(workRate+pressCost)*180/game.seconds,0,100);
    if(b.owner===i){
      const goalDistance=52.5-p.x*d;
      p.decision=(p.decision||0)-dt;
      const threat=game.players.filter(q=>q.team!==p.team).reduce((m,q)=>Math.min(m,dist(p,q)),99);
      if(p.decision<=0&&p.cooldown<=0){
        p.decision=.6+game.rng()*.6;
        if(goalDistance<25&&Math.abs(p.z)<20&&(goalDistance<17||game.rng()<.48))shoot(game,p,{power:.5+game.rng()*.35});
        else if(threat<3.3||goalDistance<8||game.rng()<.16)pass(game,p,{x:d,z:-p.z*.05},game.rng()<.15);
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
    if(i===chasers[p.team]){
      tx=b.x+(owner?owner.vx:b.vx)*.22;tz=b.z+(owner?owner.vz:b.vz)*.22;
      if(owner&&owner.team!==p.team&&dist(p,owner)<1.25&&p.cooldown<=0&&owner.cooldown<=0){
        const quality=clamp(1+(p.overall-owner.overall)*.025,.55,1.7);
        if(game.rng()<dt*quality*(p.team===1?1.4*game.difficulty:1)){ownBall(game,i);owner.cooldown=.8;game.stats[p.team].tackles++;}
      }
    }else{
      const advance=attacking?clamp(b.x*d*.35+9,0,23):clamp(b.x*d*.25,-15,8);
      tx=clamp((p.baseX+advance)*d,-47,46);tz=p.baseZ*d+b.z*.16;
      if(attacking&&p.baseX>10)tx=clamp((b.x*d+10+(p.index===9?5:0))*d,-46,46);
      if(!attacking&&owner&&owner.team!==p.team&&p.baseX<5){
        // The nearest defender presses; the others screen dangerous runners
        // instead of all collapsing on the same ball carrier.
        const runner=game.players.filter(q=>q.team!==p.team&&q.index!==0&&q!==owner&&q.x*d<8&&dist(p,q)<13).sort((a,c)=>dist(p,a)-dist(p,c))[0];
        if(runner){tx=runner.x-d*2;tz=runner.z;}
        else if(dist(p,owner)<13){tx=owner.x-d*4.5;tz=owner.z*.55+p.baseZ*d*.45;}
      }
      if(game.tactic==="press"&&p.team===0&&!attacking){tx=tx*.65+b.x*.35;tz=tz*.7+b.z*.3;}
      if(game.tactic==="possession"&&p.team===0&&attacking){tx=p.x*.2+tx*.8;tz*=.8;}
      if(game.tactic==="counter"&&p.team===0&&attacking&&p.baseX>10)tx=clamp(tx+d*8,-47,47);
    }
    move(p,tx,tz,speed,dt);
  }
  function restart(game,team,kind,x,z){
    const index=nearest(game,team,{x,z}),p=game.players[index];
    p.x=clamp(x,-49,49);p.z=clamp(z,-32,32);ownBall(game,index);p.cooldown=.8;
    game.ball.x=p.x;game.ball.z=p.z;game.ball.y=.22;
    event(game,"restart",kind,{team});
  }
  function ballStep(game,dt){
    const b=game.ball;
    if(b.owner!==null){const p=game.players[b.owner];b.x=p.x+p.faceX*.8;b.z=p.z+p.faceZ*.8;b.y=.24+Math.sin(p.run*5)*.04;return;}
    b.freeTime+=dt;const previousX=b.x,previousZ=b.z,previousY=b.y;
    b.x+=b.vx*dt;b.z+=b.vz*dt;b.y+=b.vy*dt;b.vy-=12*dt;
    if(b.y<.22){b.y=.22;b.vy=Math.abs(b.vy)>.9?-b.vy*.32:0;}
    const drag=Math.exp(-dt*(b.y<.3?.7:.12));b.vx*=drag;b.vz*=drag;
    if(Math.abs(b.x)>52.5){
      const edge=Math.sign(b.x)*52.5,progress=clamp((edge-previousX)/(b.x-previousX||1),0,1),z=previousZ+(b.z-previousZ)*progress,y=previousY+(b.y-previousY)*progress;
      if(Math.abs(z)<FIELD.goal/2&&y<FIELD.height){
        const team=direction(game,0)===Math.sign(b.x)?0:1;game.score[team]++;
        const shooter=b.lastKickerIdentity||game.players[b.lastKicker],name=shooter?.team===team?shooter.name:"Gol en propia puerta";
        const goal=event(game,"goal","¡GOOOL! "+name,{team,player:shooter?.id,name});game.goals.push(goal);
        game.phase="goal";game.phaseTime=2.7;game.kickoffTeam=1-team;return;
      }
      const defending=direction(game,0)===Math.sign(b.x)?1:0;
      restart(game,b.lastTouch===defending?1-defending:defending,b.lastTouch===defending?"Córner":"Saque de portería",edge-(Math.sign(edge)*4),b.lastTouch===defending?Math.sign(b.z||1)*31:0);return;
    }
    if(Math.abs(b.z)>34){restart(game,1-b.lastTouch,"Saque de banda",b.x,Math.sign(b.z)*32);return;}
    if(b.y>2.5)return;
    const candidates=game.players.map((p,i)=>({p,i,d:dist(p,b)})).filter(({p,i,d})=>
      d<(p.index===0?2.3:1.15)&&p.cooldown<=0&&(i!==b.lastKicker||b.freeTime>.7)&&b.y<(p.index===0?2.5:1.1));
    candidates.sort((a,c)=>a.d-c.d);
    if(candidates.length){const {p,i}=candidates[0];if(p.index===0&&b.lastTouch!==p.team){game.stats[p.team].saves++;event(game,"save","¡Ataja "+p.name+"!");p.cooldown=.65;}ownBall(game,i);}
  }
  function step(game,delta,input={}){
    if(game.phase==="finished"||game.paused)return game;
    const dt=clamp(Number(delta)||0,0,.05);if(!dt)return game;
    if(game.phase!=="playing"){
      game.phaseTime-=dt;
      if(game.phaseTime<=0){
        if(game.phase==="goal"){reset(game,game.kickoffTeam);game.phase="kickoff";game.phaseTime=1;}
        else if(game.phase==="halftime"){game.half=2;reset(game,1);game.phase="kickoff";game.phaseTime=1;}
        else game.phase="playing";
      }return game;
    }
    game.elapsed=Math.min(game.seconds,game.elapsed+dt);
    if(game.elapsed>=game.seconds){game.phase="finished";event(game,"fulltime","Final del partido");return game;}
    if(game.half===1&&game.elapsed>=game.seconds/2){game.phase="halftime";game.phaseTime=2.3;event(game,"halftime","Descanso · cambio de campo");return game;}
    const b=game.ball,owner=b.owner===null?null:game.players[b.owner];if(owner)game.stats[owner.team].possession+=dt;
    const chasers=[nearest(game,0),nearest(game,1)];
    for(let i=0;i<game.players.length;i++){
      const p=game.players[i];p.cooldown=Math.max(0,p.cooldown-dt);
      if(i===game.controlled){
        let x=clamp(Number(input.x)||0,-1,1),z=clamp(Number(input.z)||0,-1,1),len=Math.hypot(x,z);if(len>1){x/=len;z/=len;}
        const sprint=input.sprint&&p.stamina>10&&len>.1;p.stamina=clamp(p.stamina+dt*(sprint?-8:3.2),0,100);
        const speed=(4.9+p.overall*.027)*(sprint?1.38:1)*(b.owner===i?.94:1)*(.78+p.stamina*.0022);
        if(len>.05)move(p,p.x+x*10,p.z+z*10,speed*Math.min(1,len),dt);else {p.vx=p.vz=0;}
      }else ai(game,p,i,dt,chasers);
    }
    // Soft collisions keep the ball carrier visible and prevent stacked players.
    for(let i=0;i<game.players.length;i++)for(let j=i+1;j<game.players.length;j++){
      const a=game.players[i],c=game.players[j],dx=a.x-c.x,dz=a.z-c.z,len=Math.hypot(dx,dz);
      if(len>.01&&len<.72){const push=(.72-len)*.3;a.x+=dx/len*push;a.z+=dz/len*push;c.x-=dx/len*push;c.z-=dz/len*push;}
    }
    ballStep(game,dt);return game;
  }
  function result(game){
    if(game.phase!=="finished")return null;
    const total=game.stats.reduce((n,s)=>n+s.possession,0)||1;
    return {home:game.score[0],away:game.score[1],stats:game.stats.map(s=>({...s,possession:Math.round(s.possession/total*100)})),goals:game.goals.map(e=>({...e})),seconds:game.seconds,
      participants:game.participants.map(ids=>ids.slice()),substitutions:game.substitutions.map(s=>({...s}))};
  }
  return {FIELD,SHAPE,create,step,action,result,direction,nearest,random,substitute,setTactic};
});
