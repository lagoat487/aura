/* AURA Calle: original 3v3 arcade football with walls, keyboard and touch. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.AuraStreet=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  function reset(g,side=0){
    g.players.forEach((p,i)=>{p.x=(p.team===0?-1:1)*(i%3===0?30:12);p.z=(i%3-1)*14;p.cooldown=.3;});
    g.controlled=1;const owner=side*3+1;g.players[owner].x=side===0?-1:1;g.players[owner].z=0;g.ball={x:g.players[owner].x,z:0,vx:0,vz:0,owner};g.wait=1;
  }
  function create(home,away){
    if(home.length!==3||away.length!==3)throw Error("La calle necesita tres jugadores por equipo.");
    const g={players:[home,away].flatMap((ps,team)=>ps.map((p,i)=>({...p,team,index:team*3+i,x:0,z:0,cooldown:0}))),score:[0,0],seconds:120,elapsed:0,controlled:1,done:false,paused:false};reset(g);return g;
  }
  function nearest(g,team){return g.players.filter(p=>p.team===team).sort((a,b)=>distance(a,g.ball)-distance(b,g.ball))[0];}
  function action(g,type,input={}){
    if(g.done||g.paused||g.wait>0)return false;
    if(type==="switch"){g.controlled=nearest(g,0).index;return true;}
    const p=g.players[g.controlled],b=g.ball;
    if(type==="tackle"&&b.owner!==null&&g.players[b.owner].team!==0&&distance(p,g.players[b.owner])<4){b.owner=p.index;g.controlled=p.index;return true;}
    if(b.owner!==p.index||p.cooldown>0)return false;
    if(type==="shoot"){
      const dx=46-p.x,dz=clamp(Number(input.z)||0,-1,1)*4.4-p.z,len=Math.hypot(dx,dz);b.vx=dx/len*42;b.vz=dz/len*42;b.owner=null;p.cooldown=.55;return true;
    }
    if(type==="pass"||type==="through"){
      const target=g.players.filter(q=>q.team===0&&q!==p).sort((a,c)=>(c.x-p.x)-(a.x-p.x))[0];
      const dx=target.x-p.x,dz=target.z-p.z,len=Math.hypot(dx,dz)||1;b.vx=dx/len*28;b.vz=dz/len*28;b.owner=null;p.cooldown=.5;g.controlled=target.index;return true;
    }return false;
  }
  function step(g,delta,input={}){
    if(g.done||g.paused)return g;
    const dt=clamp(delta||0,0,.05);g.wait-=dt;if(g.wait>0)return g;
    g.elapsed+=dt;if(g.elapsed>=g.seconds){g.done=true;return g;}
    const b=g.ball,owner=b.owner===null?null:g.players[b.owner];
    for(const p of g.players){
      p.cooldown=Math.max(0,p.cooldown-dt);let dx=0,dz=0;
      if(p.index===g.controlled){dx=Number(input.x)||0;dz=Number(input.z)||0;}
      else {
        const own=owner?.team===p.team,d=p.team===0?1:-1,chas=nearest(g,p.team);
        let tx=own?(p.index%3===0?-d*30:d*clamp(b.x*d+10,0,38)):-d*clamp(12+b.x*-d*.3,5,35),tz=(p.index%3-1)*14;
        if(p===owner){tx=45*d;tz=clamp(p.z*.6,-3,3);
          if(p.cooldown<=0&&p.team===1&&p.x<-20){const x=-46-p.x,z=-p.z,len=Math.hypot(x,z);b.vx=x/len*36;b.vz=z/len*36;b.owner=null;p.cooldown=.7;}
        }else if(p===chas&&!own){tx=b.x;tz=b.z;}
        dx=tx-p.x;dz=tz-p.z;const len=Math.hypot(dx,dz);if(len>.1){dx/=len;dz/=len;}else dx=dz=0;
      }
      const len=Math.max(1,Math.hypot(dx,dz)),speed=(6+p.overall*.028)*(p.index===g.controlled&&input.sprint?1.4:1);
      p.x=clamp(p.x+dx/len*speed*dt,-44,44);p.z=clamp(p.z+dz/len*speed*dt,-25,25);
    }
    if(b.owner!==null){const p=g.players[b.owner];b.x=p.x+(p.team===0?1:-1);b.z=p.z;
      const thief=g.players.find(q=>q.team!==p.team&&q.index!==g.controlled&&distance(q,p)<1.4&&q.cooldown<=0);
      if(thief){b.owner=thief.index;thief.cooldown=.5;if(thief.team===0)g.controlled=thief.index;}
    }else {
      b.x+=b.vx*dt;b.z+=b.vz*dt;b.vx*=Math.exp(-.35*dt);b.vz*=Math.exp(-.35*dt);
      if(Math.abs(b.x)>45){
        if(Math.abs(b.z)<5.5){const team=b.x>0?0:1;g.score[team]++;if(g.score[team]>=5)g.done=true;else reset(g,1-team);return g;}
        b.x=Math.sign(b.x)*44.8;b.vx*=-.8;
      }
      if(Math.abs(b.z)>26){b.z=Math.sign(b.z)*25.8;b.vz*=-.85;}
      const q=g.players.filter(p=>p.cooldown<=0&&distance(p,b)<1.5).sort((a,c)=>distance(a,b)-distance(c,b))[0];
      if(q){b.owner=q.index;q.cooldown=.12;if(q.team===0)g.controlled=q.index;}
    }return g;
  }
  let live=null;
  function open(home,away){
    if(live)return;const g=create(home,away),node=document.createElement("section");node.className="street-overlay";node.setAttribute("role","dialog");node.setAttribute("aria-modal","true");node.setAttribute("aria-label","AURA Calle, fútbol 3 contra 3");node.tabIndex=-1;
    node.innerHTML='<header><div><span class="eyebrow">AURA CALLE / 3 CONTRA 3</span><h2>DOMINA LA CALLE.</h2></div><div class="street-score" role="status"></div><button class="btn" data-street="pause">Pausa</button><button class="btn" data-street="close" aria-label="Volver al menú">Salir ✕</button></header><div class="street-stage"><canvas aria-label="Cancha de fútbol callejero"></canvas><div class="street-status"></div></div><div class="street-guide"><span>WASD / Flechas · mover</span><span>J · tirar</span><span>K · pasar</span><span>E · cambiar</span><span>Espacio · entrada</span><span>Shift · correr</span><span>P · pausa</span><span>Primero a 5 goles o 2 minutos</span></div><div class="street-touch"><div class="street-dpad"><button data-move="up" aria-label="Mover arriba">↑</button><button data-move="left" aria-label="Mover izquierda">←</button><button data-move="down" aria-label="Mover abajo">↓</button><button data-move="right" aria-label="Mover derecha">→</button></div><div><button data-action-street="switch">CAMBIO</button><button data-action-street="pass">PASE</button><button data-action-street="tackle">ENTRADA</button><button data-action-street="shoot">TIRO</button></div></div>';
    document.body.appendChild(node);document.body.classList.add("in-match");AuraEvolution.stopPreview();AuraTourUI.audio.suspend();
    const canvas=node.querySelector("canvas"),ctx=canvas.getContext("2d"),keys=new Set(),touch=new Set(),previous=document.activeElement;let raf=0,last=0;
    const axes=()=>({x:Number(keys.has("d")||keys.has("arrowright")||touch.has("right"))-Number(keys.has("a")||keys.has("arrowleft")||touch.has("left")),z:Number(keys.has("s")||keys.has("arrowdown")||touch.has("down"))-Number(keys.has("w")||keys.has("arrowup")||touch.has("up")),sprint:keys.has("shift")});
    function close(){cancelAnimationFrame(raf);window.removeEventListener("keydown",down,true);window.removeEventListener("keyup",up,true);window.removeEventListener("blur",blur);node.remove();document.body.classList.remove("in-match");live=null;AuraTourUI.audio.resume();previous?.focus?.();}
    function down(e){const k=e.key.toLowerCase();if(!["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright","shift","j","k","e"," ","p","escape"].includes(k))return;e.preventDefault();e.stopImmediatePropagation();if(e.repeat)return;if(k==="p"||k==="escape"){g.paused=!g.paused;keys.clear();return;}keys.add(k);action(g,({j:"shoot",k:"pass",e:"switch"," ":"tackle"})[k],axes());}
    function up(e){keys.delete(e.key.toLowerCase());}
    function blur(){g.paused=true;keys.clear();touch.clear();}
    window.addEventListener("keydown",down,true);window.addEventListener("keyup",up,true);window.addEventListener("blur",blur);
    node.querySelector('[data-street="close"]').onclick=close;node.querySelector('[data-street="pause"]').onclick=()=>{g.paused=!g.paused;keys.clear();touch.clear();};
    node.querySelectorAll('[data-move],[data-action-street]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);if(b.dataset.move)touch.add(b.dataset.move);else action(g,b.dataset.actionStreet,axes());};b.onpointerup=b.onpointercancel=()=>touch.delete(b.dataset.move);});
    function paint(){
      const bounds=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),w=Math.max(300,bounds.width),h=Math.max(200,bounds.height);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle="#091320";ctx.fillRect(0,0,w,h);
      const scale=Math.min(w/106,h/66),cx=w/2,cy=h/2;ctx.save();ctx.translate(cx,cy);ctx.scale(scale,scale);
      ctx.fillStyle="#172438";ctx.fillRect(-45,-26,90,52);ctx.strokeStyle="#f398e7";ctx.lineWidth=.35;ctx.shadowColor="#f16ada";ctx.shadowBlur=8;ctx.strokeRect(-45,-26,90,52);ctx.shadowBlur=0;ctx.strokeStyle="#8099b277";ctx.beginPath();ctx.moveTo(0,-26);ctx.lineTo(0,26);ctx.moveTo(7,0);ctx.arc(0,0,7,0,Math.PI*2);ctx.stroke();ctx.strokeStyle="#80f8c4";ctx.lineWidth=.7;ctx.strokeRect(-48,-5.5,3,11);ctx.strokeRect(45,-5.5,3,11);
      ctx.font="bold 3px Arial";ctx.textAlign="center";ctx.fillStyle="#ffffff20";ctx.fillText("AURA / STREET CULTURE",0,-19);ctx.fillText("GUAYAQUIL · CANCHA 01",0,21);
      for(const p of g.players){ctx.fillStyle=p.team===0?"#b8ff70":"#f880ce";if(p.index===g.controlled){ctx.strokeStyle="#fff";ctx.lineWidth=.4;ctx.beginPath();ctx.arc(p.x,p.z,2.6,0,Math.PI*2);ctx.stroke();}ctx.beginPath();ctx.arc(p.x,p.z,1.8,0,Math.PI*2);ctx.fill();ctx.fillStyle="#142135";ctx.font="bold 1.9px Arial";ctx.fillText(p.index%3+1,p.x,p.z+.65);ctx.fillStyle="#fff";ctx.font="1.7px Arial";ctx.fillText(p.name.split(" ").slice(-1)[0],p.x,p.z+4.2);}
      ctx.fillStyle="#fff";ctx.shadowColor="#fff";ctx.shadowBlur=7;ctx.beginPath();ctx.arc(g.ball.x,g.ball.z,.8,0,Math.PI*2);ctx.fill();ctx.restore();
      const time=Math.max(0,Math.ceil(g.seconds-g.elapsed));node.querySelector(".street-score").textContent=g.score[0]+" — "+g.score[1]+" · "+Math.floor(time/60)+":"+String(time%60).padStart(2,"0");node.querySelector(".street-status").textContent=g.done?(g.score[0]>g.score[1]?"¡GANASTE LA CALLE!":g.score[0]===g.score[1]?"EMPATE":"EL RIVAL GANA") :g.paused?"PAUSA · P PARA VOLVER":g.wait>0?"A JUGAR. →":"";
    }
    function frame(now){const dt=last?Math.min((now-last)/1000,.15):0;last=now;let remaining=dt;while(remaining>0){const tick=Math.min(remaining,.025);step(g,tick,axes());remaining-=tick;}paint();raf=requestAnimationFrame(frame);}
    live={game:g,close};node.focus();raf=requestAnimationFrame(frame);
  }
  return {create,step,action,open,isRunning:()=>!!live,getSession:()=>live};
});
