(function(root){
  'use strict';
  const START=Date.parse('2026-11-11T15:45:00.000Z'),END=START+60000,active=now=>now>=START&&now<END;
  if(typeof module==='object'&&module.exports){module.exports={START,END,active};return;}
  let canvas=null,context=null,particles=[],last=0,burstAt=0,manualUntil=0;
  const running=()=>active(Date.now())||Date.now()<manualUntil;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  function burst(){const x=Math.random()*innerWidth,y=innerHeight*(.12+Math.random()*.35),colors=['#bda0ff','#66ecff','#ffd37d','#ff81be'];for(let i=0;i<45;i++){const angle=Math.PI*2*i/45,speed=40+Math.random()*100;particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:1.5+Math.random(),color:colors[i%4]});}}
  function frame(t){if(!running()){canvas?.remove();canvas=null;particles=[];return;}const dt=Math.min(.04,(t-last)/1000||.016);last=t;context.clearRect(0,0,innerWidth,innerHeight);if(t>burstAt){burst();burstAt=t+900;}particles=particles.filter(p=>p.life>0);for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=25*dt;context.globalAlpha=Math.min(1,p.life);context.fillStyle=p.color;context.beginPath();context.arc(p.x,p.y,2.2,0,Math.PI*2);context.fill();}requestAnimationFrame(frame);}
  function tick(){if(!running()||canvas||reduced)return;canvas=document.createElement('canvas');canvas.id='aura-fireworks';canvas.setAttribute('aria-hidden','true');canvas.width=innerWidth;canvas.height=innerHeight;document.body.append(canvas);context=canvas.getContext('2d');if(!context||reduced){canvas.remove();canvas=null;return;}requestAnimationFrame(frame);}
  window.addEventListener('aura-live-fireworks',event=>{const cue=event.detail,now=Date.now();if(cue&&now>=Date.parse(cue.startsAt)&&now<Date.parse(cue.endsAt)){manualUntil=Date.parse(cue.endsAt);tick();}});
  setInterval(tick,500);document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});tick();
})(typeof globalThis!=='undefined'?globalThis:this);
