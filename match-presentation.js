/* Shared playable cameras, movement axes, animation poses and replay frames. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AuraPresentation=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),finite=(n,f=0)=>Number.isFinite(n)?n:f;
  function hash(id){let n=2166136261;for(const c of String(id))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
  function appearance(p){const n=hash(p.id);return {skin:['#c6926c','#9a6547','#e2b28b','#754a34','#c9a17d','#573b2d'][n%6],hair:['#201c19','#34271e','#191c20','#72513a'][n%4],height:1.74+(n%18)/100,build:.94+(n%12)/100,hairStyle:n%4};}
  function cameraFrame(game,mode='broadcast',aspect=16/9,preview=false){
    const b=game?.ball||{},x=clamp(finite(b.x),-53,53),z=clamp(finite(b.z),-35,35),vx=clamp(finite(b.vx),-35,35);
    const look=clamp(x+vx*.18,-46,46),portrait=aspect<1?1.52:aspect<1.3?1.17:1;
    const urgency=clamp((Math.abs(x)-24)/27,0,1);
    const tracking=clamp(Math.abs(vx)/35,0,1);
    // A little wider in transitional play and tighter in the final third.
    const dynamicFov=clamp(44+tracking*1.2-urgency*1.8,41.5,45.2);
    if(preview)return {position:[72,73,98],target:[0,0,-2],fov:44};
    if(mode==='stadium'){
      // Diagonal sideline framing of the original concept, with space ahead of the ball.
      // Screen-relative controls use this very same smoothed camera in both renderers.
      const d=game?.half===2?-1:1,space=aspect<1?1.55:aspect<1.3?1.18:1;
      const lead=clamp(finite(b.vx)*.14,-3,3),az=z*.83;
      return {position:[x-d*11.5*space,19.8*space,az+25*space],target:[x+d*3.5+lead,.6,az-2.5],fov:48+tracking};
    }
    if(mode==='immersive'){
      const player=game?.players?.[game.controlled],d=game?.half===2?-1:1;
      // Keep the ball in view even after a long pass or a change of possession.
      const ax=x+clamp(finite(player?.x,x)-x,-5,5)*.22;
      const az=z+clamp(finite(player?.z,z)-z,-5,5)*.22;
      const space=aspect<1?1.38:1;
      return {position:[ax-d*7.5*space,4.6*space,az+8*space],target:[ax+d*4.7,1,az-1.5],fov:52+tracking*2};
    }
    if(mode==='tactical')return {position:[0,Math.max(108,140/Math.max(.4,aspect)),.1],target:[0,0,0],fov:45};
    if(mode==='wide')return {position:[look*.46,49*portrait,65*portrait],target:[look*.5,0,z*.18],fov:44};
    if(mode==='tele'||mode==='replay')return {position:[look*.95-3,17.5*portrait,25*portrait+z*.58],target:[look*.98,.65,z*.80],fov:mode==='replay'?38:40};
    return {position:[look*.94-3,22*portrait-urgency*.8,31*portrait+z*.45],target:[look*.98,.35,z*.76],fov:dynamicFov};
  }
  function smoothCamera(previous,desired,delta){
    if(!previous)return {position:desired.position.slice(),target:desired.target.slice(),fov:desired.fov};
    const a=1-Math.exp(-clamp(finite(delta),0,.1)*4.4),blend=(old,next)=>next.map((n,i)=>old[i]+(n-old[i])*a);
    return {position:blend(previous.position,desired.position),target:blend(previous.target,desired.target),fov:previous.fov+(desired.fov-previous.fov)*a};
  }
  function cameraInput(input,frame){
    if(!frame)return {...input};
    const dx=frame.target[0]-frame.position[0],dz=frame.target[2]-frame.position[2],length=Math.hypot(dx,dz);
    if(length<.001)return {...input};
    const fx=dx/length,fz=dz/length,x=finite(input.x),z=finite(input.z);
    return {...input,x:-fz*x-fx*z,z:fx*x-fz*z};
  }
  function pose(p,game){
    const speed=clamp(Math.hypot(finite(p.vx),finite(p.vz))/7,0,1),cycle=finite(p.run)*2.8+(hash(p.id)%17)*.37,stride=Math.sin(cycle)*.72*speed;
    const turn=clamp(finite(p.turn),0,1),control=clamp(finite(p.dribbleTime),0,1);
    const active=finite(p.actionTime)>0,progress=active?1-clamp(p.actionTime/(p.actionDuration||.4),0,1):1,pulse=active?Math.sin(progress*Math.PI):0;
    const kick=['shoot','pass'].includes(p.action)&&active?pulse:0,save=['save','dive','parry','smother'].includes(p.action)&&active?pulse:0,celebrate=p.action==='celebrate'&&active?1:0;
    const keeper=p.index===0,smother=p.action==='smother'?save:0,height=clamp(finite(p.saveHeight,1.7),.22,2.8);
    return {stride,kneeLeft:Math.max(0,-Math.cos(cycle))*.9*speed,kneeRight:Math.max(0,Math.cos(cycle))*.9*speed,kick,save,celebrate,
      lean:speed*.12+turn*.12,jump:celebrate?Math.max(0,Math.sin(finite(game?.visualTime)*9))*.16:Math.abs(Math.sin(cycle*2))*.025*speed,
      turn,control,
      dive:save*finite(p.diveSide,1)*(p.action==='save'?.35:p.action==='smother'?.25:1),crouch:keeper?.12+smother*.5:0,
      saveLift:keeper?save*clamp((height-1.4)*.25,0,.35):0,highSave:save*clamp(height/2.3,.15,1),tackle:p.action==='tackle'&&active?pulse:0,speed};
  }
  function goalNetImpulse(game,sign){
    if(game?.phase!=="goal")return 0;
    const last=game.goals?.at(-1);if(!last||!Number.isFinite(game.phaseTime))return 0;
    const scoredToward=(last.team===0?1:-1)*(game.half===1?1:-1);
    if(sign!==scoredToward)return 0;
    const age=clamp(2.7-game.phaseTime,0,2.7);
    return .34*Math.exp(-age*1.35)*Math.sin(age*15);
  }
  function separateKits(home,away){
    const rgb=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)/255),a=rgb(home[0]),b=rgb(away[0]),gap=Math.hypot(...a.map((n,i)=>n-b[i]));
    if(gap>.5)return [home,away];
    const light=a[0]*.2126+a[1]*.7152+a[2]*.0722;
    return [home,light>.6?['#20344f','#142238','#e5e9ed']:['#eeeade','#e1ddcf','#293c4b']];
  }
  function capture(game){return {players:game.players.map(p=>({...p})),ball:{...game.ball},controlled:game.controlled,phase:game.phase,score:game.score.slice(),half:game.half,visualTime:game.visualTime||0,elapsed:game.elapsed};}
  function interpolate(a,b,alpha){
    const t=clamp(finite(alpha),0,1),mix=(x,y)=>finite(x)+(finite(y)-finite(x))*t;
    return {...a,score:a.score.slice(),visualTime:mix(a.visualTime,b.visualTime),elapsed:mix(a.elapsed,b.elapsed),ball:{...a.ball,...Object.fromEntries(['x','y','z','vx','vy','vz'].map(k=>[k,mix(a.ball[k],b.ball[k])]))},
      players:a.players.map((p,i)=>{const q=b.players[i];if(!q||q.id!==p.id)return {...p};return {...p,...Object.fromEntries(['x','z','vx','vz','faceX','faceZ','run','actionTime','turn','dribbleTime'].map(k=>[k,mix(p[k],q[k])]))};})};
  }
  return {cameraFrame,smoothCamera,cameraInput,appearance,pose,goalNetImpulse,separateKits,capture,interpolate};
});
