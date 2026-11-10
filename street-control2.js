/* AURA Calle: original 3v3 arcade football with walls, keyboard and touch. */
(function(root,factory){const api=factory(typeof module==="object"&&module.exports?require("./provision-gameplay"):root.AuraProVision);if(typeof module==="object"&&module.exports)module.exports=api;else root.AuraStreet=api;})(typeof globalThis!=="undefined"?globalThis:this,function(PVF){
  "use strict";
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  function reset(g,side=0){
    g.players.forEach((p,i)=>{p.x=(p.team===0?-1:1)*(i%3===0?30:12);p.z=(i%3-1)*14;p.cooldown=.3;p.skillTime=0;p.skillCooldown=0;p.closeControl=false;p.vx=p.vz=0;p.sprinting=false;p.faceX=p.team===0?1:-1;p.faceZ=0;});
    g.controlled=1;const owner=side*3+1;g.players[owner].x=side===0?-1:1;g.players[owner].z=0;g.ball={x:g.players[owner].x,z:0,vx:0,vz:0,owner};g.wait=1;
  }
  function create(home,away,options={}){
    if(home.length!==3||away.length!==3)throw Error("La calle necesita tres jugadores por equipo.");
    const g={gameplay:"provision",players:[home,away].flatMap((ps,team)=>ps.map((p,i)=>({...p,team,index:team*3+i,x:0,z:0,vx:0,vz:0,stamina:100,cooldown:0,skillTime:0,skillCooldown:0}))),score:[0,0],seconds:[60,120,180].includes(options.seconds)?options.seconds:120,
      goalLimit:[3,5,7].includes(options.goalLimit)?options.goalLimit:5,
      elapsed:0,controlled:1,done:false,paused:false,
      stats:[{shots:0,passes:0,tackles:0,goals:0,possession:0},{shots:0,passes:0,tackles:0,goals:0,possession:0}],
      goalLog:[],difficulty:clamp(Number(options.difficulty)||1,.65,1.4)};reset(g);return g;
  }
  function nearest(g,team){return g.players.filter(p=>p.team===team).sort((a,b)=>distance(a,g.ball)-distance(b,g.ball))[0];}
  function action(g,type,input={}){
    if(g.done||g.paused||g.wait>0)return false;
    if(type==="switch"){g.controlled=nearest(g,0).index;return true;}
    const p=g.players[g.controlled],b=g.ball;
    if(type==="skill"){
      if(b.owner!==p.index||p.cooldown>0||p.skillCooldown>0||p.stamina<12)return false;
      const side=Math.abs(Number(input.z)||0)>.15?Math.sign(input.z):-(p.lastSkillSide||-1);p.lastSkillSide=side;
      p.skillSideX=-(p.faceZ||0)*side;p.skillSideZ=(p.faceX||1)*side;p.skillForwardX=p.faceX||1;p.skillForwardZ=p.faceZ||0;
      p.skillTime=.55;p.skillCooldown=1.8;p.stamina-=5;b.dribble=null;return true;
    }
    if(type==="pressure"||type==="slide")type="tackle";
    if(type==="tackle"&&b.owner!==null&&g.players[b.owner].team!==0&&distance(p,g.players[b.owner])<1.75){
      const rival=g.players[b.owner];if(p.cooldown>0||rival.cooldown>0)return false;
      // Use the same recovery as AI steals so the rival cannot take it straight back.
      rival.cooldown=.8;p.cooldown=.5;
      b.owner=p.index;g.controlled=p.index;g.stats[0].tackles++;return true;
    }
    if(b.owner!==p.index||p.cooldown>0)return false;
    if(type==="shoot"){
      const dx=46-p.x,dz=clamp(Number(input.z)||0,-1,1)*4.4-p.z,len=Math.hypot(dx,dz);
      const speed=PVF.shot(p,Number.isFinite(input.power)?input.power:.58).speed;b.vx=dx/len*speed;b.vz=dz/len*speed;b.owner=null;p.cooldown=.55;g.stats[0].shots++;return true;
    }
    if(type==="pass"||type==="through"||type==="lob"){
      const target=g.players.filter(q=>q.team===0&&q!==p).sort((a,c)=>(c.x-p.x)-(a.x-p.x))[0];
      const dx=target.x+target.vx*.5+(type==="through"?4:0)-p.x,dz=target.z+target.vz*.5-p.z,len=Math.hypot(dx,dz)||1,speed=PVF.pass(p,type==="through"?.8:.6,len).speed;b.vx=dx/len*speed;b.vz=dz/len*speed;b.owner=null;p.cooldown=.5;g.controlled=target.index;g.stats[0].passes++;return true;
    }return false;
  }
  function step(g,delta,input={}){
    if(g.done||g.paused)return g;
    const dt=clamp(delta||0,0,.05);g.wait-=dt;if(g.wait>0)return g;
    g.elapsed+=dt;if(g.elapsed>=g.seconds){g.elapsed=g.seconds;g.done=true;return g;}
    const b=g.ball,owner=b.owner===null?null:g.players[b.owner];
    if(owner)g.stats[owner.team].possession+=dt;
    for(const p of g.players){
      p.cooldown=Math.max(0,p.cooldown-dt);p.skillCooldown=Math.max(0,p.skillCooldown-dt);let dx=0,dz=0;
      if(p.index===g.controlled){
        p.closeControl=!!input.closeControl;
        dx=clamp(Number(input.x)||0,-1,1);dz=clamp(Number(input.z)||0,-1,1);
        if(p.skillTime>0){
          const side=Math.sin((1-p.skillTime/.55)*Math.PI);dx=p.skillForwardX*.65+p.skillSideX*side*.95;dz=p.skillForwardZ*.65+p.skillSideZ*side*.95;
          p.skillTime=Math.max(0,p.skillTime-dt);
        }
        if(input.pressure&&owner&&owner.team!==0){
          if(Math.hypot(dx,dz)<.1){dx=owner.x-p.x;dz=owner.z-p.z;const gap=Math.hypot(dx,dz)||1;dx/=gap;dz/=gap;}
          action(g,"tackle",input);
        }
      }
      else {
        const own=owner?.team===p.team,d=p.team===0?1:-1,chas=nearest(g,p.team);
        let tx=own?(p.index%3===0?-d*30:d*clamp(b.x*d+10,0,38)):-d*clamp(12+b.x*-d*.3,5,35),tz=(p.index%3-1)*14;
        if(p===owner){tx=45*d;tz=clamp(p.z*.6,-3,3);
          if(p.cooldown<=0&&p.team===1&&p.x<-20){const x=-46-p.x,z=-p.z,len=Math.hypot(x,z);const shot=PVF.shot(p,.7);b.vx=x/len*shot.speed;b.vz=z/len*shot.speed;b.owner=null;p.cooldown=.7;g.stats[1].shots++;}
        }else if(p===chas&&!own){tx=b.x;tz=b.z;}
        dx=tx-p.x;dz=tz-p.z;const len=Math.hypot(dx,dz);if(len>.1){dx/=len;dz/=len;}else dx=dz=0;
      }
      const len=Math.max(1,Math.hypot(dx,dz)),sprint=PVF.stamina(p,p.index===g.controlled?!!input.sprint&&!p.closeControl:!owner,dt),speed=PVF.speed(p,sprint)*(p.closeControl?.60:1)*(p.team===1?.96+.04*g.difficulty:1);
      PVF.move(p,p.x+dx/len*10,p.z+dz/len*10,speed*Math.min(1,Math.hypot(dx,dz)),dt,{x:44,z:25});
    }
    if(b.owner!==null){const p=g.players[b.owner];if(!PVF.dribble(b,p,dt)){b.owner=null;return g;}
      const thief=g.players.find(q=>q.team!==p.team&&q.index!==g.controlled&&distance(q,p)<.95&&q.cooldown<=0&&p.cooldown<=0);
      if(thief){p.cooldown=.8;b.owner=thief.index;thief.cooldown=.5;if(thief.team===0)g.controlled=thief.index;}
    }else {
      b.x+=b.vx*dt;b.z+=b.vz*dt;b.vx*=Math.exp(-PVF.tuning.groundDrag*dt);b.vz*=Math.exp(-PVF.tuning.groundDrag*dt);
      if(Math.abs(b.x)>45){
        if(Math.abs(b.z)<5.5){const team=b.x>0?0:1;g.score[team]++;g.stats[team].goals++;
          g.goalLog.push({team,second:Math.round(g.elapsed)});
          if(g.score[team]>=g.goalLimit)g.done=true;else reset(g,1-team);return g;}
        b.x=Math.sign(b.x)*44.8;b.vx*=-.8;
      }
      if(Math.abs(b.z)>26){b.z=Math.sign(b.z)*25.8;b.vz*=-.85;}
      const q=g.players.filter(p=>p.cooldown<=0&&distance(p,b)<1.5).sort((a,c)=>distance(a,b)-distance(c,b))[0];
      if(q){b.owner=q.index;q.cooldown=.12;if(q.team===0)g.controlled=q.index;}
    }return g;
  }
  function result(g){
    if(!g.done)return null;
    return {home:g.score[0],away:g.score[1],seconds:Math.min(g.seconds,Math.round(g.elapsed)),
      goalLimit:g.goalLimit,stats:g.stats.map(v=>({...v,possession:Math.round(v.possession*10)/10})),
      goals:g.goalLog.map(v=>({...v}))};
  }
  function finalReport(game,options={}){
    const r=result(game);
    if(!r)return "";
    const verdict=r.home>r.away?"🏆 ¡GANASTE!":r.home===r.away?"🤝 EMPATE":"💪 EL RIVAL GANA";
    const home=String(options.homeName||"TU CLUB").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
    const away=String(options.awayName||"RIVAL").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
    const possession=r.stats[0].possession+r.stats[1].possession;
    const lines=[["Goles",r.home,r.away],["Tiros",r.stats[0].shots,r.stats[1].shots],
      ["Pases",r.stats[0].passes,r.stats[1].passes],["Entradas",r.stats[0].tackles,r.stats[1].tackles],
      ["Posesión",possession?Math.round(r.stats[0].possession*100/possession)+"%":"0%",
       possession?Math.round(r.stats[1].possession*100/possession)+"%":"0%"]];
    return '<div class="street-finish-content"><span class="eyebrow">AURA CALLE / INFORME FINAL</span>'+
      '<h2>'+verdict+'</h2><p>'+home+' VS '+away+'</p>'+
      '<strong class="street-finish-score">'+r.home+' — '+r.away+'</strong>'+
      '<div class="street-finish-stats">'+lines.map(([label,h,a])=>
        '<div><b>'+h+'</b><span>'+label+'</span><b>'+a+'</b></div>').join("")+'</div>'+
      '<div class="street-finish-actions">'+
      (!options.onFinish?'<button class="btn primary" data-street="again">Revancha →</button>':'')+
      '<button class="btn" data-street="finish-close">← Volver '+(options.onFinish?'al circuito':'a Calle / Volta')+'</button></div></div>';
  }
  let live=null;
  function open(home,away,options={}){
    if(live)return;const scheme=options.controls||(typeof AuraArena!=="undefined"?AuraArena.settings.controls:"provision");const g=create(home,away,options),node=document.createElement("section");node.className="street-overlay";node.setAttribute("role","dialog");node.setAttribute("aria-modal","true");node.setAttribute("aria-label","AURA Calle, fútbol 3 contra 3");node.tabIndex=-1;
    node.innerHTML='<header><div><span class="eyebrow">AURA CALLE / 3 CONTRA 3</span><h2>DOMINA LA CALLE.</h2></div><div class="street-score" role="status"></div><button class="btn" data-street="pause">Pausa</button><button class="btn" data-street="close" aria-label="Volver al menú">Salir ✕</button></header><div class="street-stage"><canvas aria-label="Cancha de fútbol callejero"></canvas><div class="street-status"></div></div><section class="street-finish" hidden role="region" aria-label="Resultados del partido Calle"></section><div class="street-guide"><span>WASD / Flechas · mover</span><span>'+(scheme==="classic"?"J · tirar / K · pasar":"K · mantener y soltar para tirar / Espacio · pase o presión")+'</span><span>E · cambiar</span><span>Espacio · entrada</span><span>Shift / SPRINT · mantener para correr</span><span>Z / CONTROL · llevar corto · R / REGATE + dirección</span><span>P · pausa</span><span>Primero a '+g.goalLimit+' goles o '+Math.round(g.seconds/60)+' minuto(s)</span></div><div class="street-touch"><div class="street-dpad"><button data-move="up" aria-label="Mover arriba">↑</button><button data-move="left" aria-label="Mover izquierda">←</button><button data-move="down" aria-label="Mover abajo">↓</button><button data-move="right" aria-label="Mover derecha">→</button></div><div><button data-action-street="switch">CAMBIO</button><button data-action-street="pass">PASE</button><button data-action-street="skill">REGATE</button><button data-move="closeControl">CONTROL</button><button data-action-street="tackle">ENTRADA</button><button data-action-street="shoot">TIRO</button><button data-move="sprint" aria-label="Sprint: mantener pulsado">SPRINT</button></div></div>';
    if(options.homeName&&options.awayName)node.querySelector('h2').textContent=options.homeName+' vs '+options.awayName;
    document.body.appendChild(node);document.body.classList.add("in-match");AuraEvolution.stopPreview();AuraTourUI.audio.suspend();
    const canvas=node.querySelector("canvas"),ctx=canvas.getContext("2d"),keys=new Set(),touch=new Set(),previous=document.activeElement,finishPanel=node.querySelector(".street-finish");
    let raf=0,last=0,reported=false,charging=null,chargeOwner=null,chargeSource=null,padButtons=[],padSprint=false,padPressure=false,padControl=false,padX=0,padZ=0;
    const clock=()=>typeof performance!=="undefined"?performance.now():last;
    function beginCharge(source="keyboard"){if(charging===null&&g.ball.owner===g.controlled){charging=clock();chargeOwner=g.controlled;chargeSource=source;}}
    function releaseCharge(source="keyboard"){if(chargeSource!==source)return;const start=charging;charging=null;if(start!==null&&g.ball.owner===chargeOwner)action(g,"shoot",{...axes(),power:Math.min(1,(clock()-start)/950+.2)});}
    const axes=()=>({x:padX+Number(keys.has("d")||keys.has("arrowright")||touch.has("right"))-Number(keys.has("a")||keys.has("arrowleft")||touch.has("left")),z:padZ+Number(keys.has("s")||keys.has("arrowdown")||touch.has("down"))-Number(keys.has("w")||keys.has("arrowup")||touch.has("up")),sprint:keys.has("shift")||touch.has("sprint")||padSprint,closeControl:keys.has("z")||touch.has("closeControl")||padControl,pressure:padPressure||(scheme==="provision"&&keys.has(" ")&&!PVF.attacking(g))});
    function close(){cancelAnimationFrame(raf);window.removeEventListener("keydown",down,true);window.removeEventListener("keyup",up,true);window.removeEventListener("blur",blur);node.remove();document.body.classList.remove("in-match");live=null;AuraTourUI.audio.resume();previous?.focus?.();}
    function pause(){g.paused=!g.paused;keys.clear();touch.clear();charging=null;padSprint=padPressure=false;for(const p of g.players)p.vx=p.vz=0;}
    function down(e){
      if(e.ctrlKey||e.metaKey||e.altKey)return;
      const k=e.key.toLowerCase();if(k===" "&&e.target.closest?.('button'))return;
      if(!["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright","shift","j","k","e"," ","p","escape","l","u","tab","z","r"].includes(k))return;e.preventDefault();e.stopImmediatePropagation();if(e.repeat)return;if(k==="p"||k==="escape"){pause();return;}if(g.paused||g.done)return;keys.add(k);const type=PVF.keyAction(k,scheme,PVF.attacking(g));if(type==="shoot")beginCharge();else action(g,type,axes());
    }
    function up(e){const k=e.key.toLowerCase();keys.delete(k);if(k===(scheme==="classic"?"j":"k"))releaseCharge();}
    function blur(){g.paused=true;keys.clear();touch.clear();charging=null;padSprint=padPressure=false;for(const p of g.players)p.vx=p.vz=0;}
    window.addEventListener("keydown",down,true);window.addEventListener("keyup",up,true);window.addEventListener("blur",blur);
    node.querySelector('[data-street="close"]').onclick=close;node.querySelector('[data-street="pause"]').onclick=pause;
    node.querySelectorAll('[data-move],[data-action-street]').forEach(b=>{
      b.onpointerdown=e=>{e.preventDefault();if(g.paused||g.done)return;b.setPointerCapture(e.pointerId);if(b.dataset.move)touch.add(b.dataset.move);else action(g,b.dataset.actionStreet,axes());};
      b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>touch.delete(b.dataset.move);
      // Native keyboard clicks have no pointerdown; pointer actions already ran.
      if(b.dataset.actionStreet)b.onclick=e=>{if(e.detail===0)action(g,b.dataset.actionStreet,axes());};
    });
    function paint(){
      const bounds=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),w=Math.max(300,bounds.width),h=Math.max(200,bounds.height);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle="#091320";ctx.fillRect(0,0,w,h);
      const scale=Math.min(w/106,h/66),cx=w/2,cy=h/2;ctx.save();ctx.translate(cx,cy);ctx.scale(scale,scale);
      ctx.fillStyle="#172438";ctx.fillRect(-45,-26,90,52);ctx.strokeStyle="#f398e7";ctx.lineWidth=.35;ctx.shadowColor="#f16ada";ctx.shadowBlur=8;ctx.strokeRect(-45,-26,90,52);ctx.shadowBlur=0;ctx.strokeStyle="#8099b277";ctx.beginPath();ctx.moveTo(0,-26);ctx.lineTo(0,26);ctx.moveTo(7,0);ctx.arc(0,0,7,0,Math.PI*2);ctx.stroke();ctx.strokeStyle="#80f8c4";ctx.lineWidth=.7;ctx.strokeRect(-48,-5.5,3,11);ctx.strokeRect(45,-5.5,3,11);
      ctx.font="bold 3px Arial";ctx.textAlign="center";ctx.fillStyle="#ffffff20";ctx.fillText("AURA / STREET CULTURE",0,-19);ctx.fillText("GUAYAQUIL · CANCHA 01",0,21);
      for(const p of g.players){ctx.fillStyle=p.team===0?"#b8ff70":"#f880ce";if(p.index===g.controlled){ctx.strokeStyle="#fff";ctx.lineWidth=.4;ctx.beginPath();ctx.arc(p.x,p.z,2.6,0,Math.PI*2);ctx.stroke();}ctx.beginPath();ctx.arc(p.x,p.z,1.8,0,Math.PI*2);ctx.fill();ctx.fillStyle="#142135";ctx.font="bold 1.9px Arial";ctx.fillText(p.index%3+1,p.x,p.z+.65);ctx.fillStyle="#fff";ctx.font="1.7px Arial";ctx.fillText(p.name.split(" ").slice(-1)[0],p.x,p.z+4.2);}
      ctx.fillStyle="#fff";ctx.shadowColor="#fff";ctx.shadowBlur=7;ctx.beginPath();ctx.arc(g.ball.x,g.ball.z,.8,0,Math.PI*2);ctx.fill();ctx.restore();
      const time=Math.max(0,Math.ceil(g.seconds-g.elapsed));node.querySelector(".street-score").textContent=g.score[0]+" — "+g.score[1]+" · "+Math.floor(time/60)+":"+String(time%60).padStart(2,"0");node.querySelector(".street-status").textContent=g.done?(g.score[0]>g.score[1]?"¡GANASTE LA CALLE!":g.score[0]===g.score[1]?"EMPATE":"EL RIVAL GANA") :g.paused?"PAUSA · P PARA VOLVER":g.wait>0?"A JUGAR. →":"";
    }
    function gamepad(){
      let pad=null;try{pad=typeof navigator!=="undefined"&&navigator.getGamepads?Array.from(navigator.getGamepads()||[]).find(p=>p?.connected):null;}catch{}
      padX=pad&&Math.abs(pad.axes[0]||0)>.15?pad.axes[0]:0;padZ=pad&&Math.abs(pad.axes[1]||0)>.15?pad.axes[1]:0;
      padSprint=!!pad?.buttons[7]?.pressed;padControl=!!pad?.buttons[6]?.pressed;padPressure=!!pad?.buttons[0]?.pressed&&!PVF.attacking(g);
      if(!pad){if(chargeSource==="gamepad")charging=null;padButtons=[];return;}
      if(pad.buttons[9]?.pressed&&!padButtons[9])pause();
      if(!g.paused&&!g.done&&g.wait<=0){
        for(const i of [0,1,2,3,4,8,11]){
          const pressed=!!pad.buttons[i]?.pressed,type=PVF.padAction(i,scheme,PVF.attacking(g));
          if(i===1){if(pressed&&!padButtons[i])beginCharge("gamepad");if(!pressed&&padButtons[i])releaseCharge("gamepad");}
          else if(pressed&&!padButtons[i])action(g,type,axes());
        }
      }else charging=null;
      padButtons=pad.buttons.map(b=>b.pressed);
    }
    function frame(now){
      const dt=last?Math.min((now-last)/1000,.15):0;last=now;if(g.wait>0||g.done||g.ball.owner!==chargeOwner)charging=null;gamepad();
      let remaining=dt;
      while(remaining>0){const tick=Math.min(remaining,.025);step(g,tick,axes());remaining-=tick;}
      if(g.done&&!reported){
        reported=true;
        const final=result(g);
        try{options.onFinish?.(final);}catch(error){console.warn("VOLTA callback",error);}
        finishPanel.innerHTML=finalReport(g,options);
        finishPanel.hidden=false;
        finishPanel.querySelector('[data-street="finish-close"]').onclick=close;
        if(!options.onFinish){
          finishPanel.querySelector('[data-street="again"]').onclick=()=>{close();open(home,away,options);};
        }
      }
      paint();
      raf=requestAnimationFrame(frame);
    }
    live={game:g,close};node.focus();raf=requestAnimationFrame(frame);
  }
  return {create,step,action,result,finalReport,open,isRunning:()=>!!live,getSession:()=>live};
});
