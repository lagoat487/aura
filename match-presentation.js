/* Shared broadcast camera, animation poses and replay frames. No external assets. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AuraPresentation=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),finite=(n,f=0)=>Number.isFinite(n)?n:f;
  function hash(id){let n=2166136261;for(const c of String(id))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
  function appearance(p){const n=hash(p.id);return {skin:['#c6926c','#9a6547','#e2b28b','#754a34','#c9a17d','#573b2d'][n%6],hair:['#201c19','#34271e','#191c20','#72513a'][n%4],height:1.74+(n%18)/100,build:.94+(n%12)/100,hairStyle:n%4};}
  function cameraFrame(game,mode='broadcast',aspect=16/9,preview=false){
    const b=game?.ball||{},x=clamp(finite(b.x),-53,53),z=clamp(finite(b.z),-35,35),vx=clamp(finite(b.vx),-35,35);
    const look=clamp(x+vx*.12,-45,45),portrait=aspect<1?1.32:aspect<1.3?1.12:1;
    if(preview)return {position:[72,73,98],target:[0,0,-2],fov:44};
    if(mode==='tactical')return {position:[look*.15,108,.1],target:[look*.15,0,0],fov:45};
    if(mode==='wide')return {position:[look*.46,49*portrait,65*portrait],target:[look*.5,0,z*.18],fov:44};
    if(mode==='tele'||mode==='replay')return {position:[look*.88,22*portrait,32*portrait+z*.3],target:[look*.91,.65,z*.63],fov:43};
    return {position:[look*.83,30*portrait,42*portrait+z*.24],target:[look*.86,.35,z*.56],fov:44};
  }
  function smoothCamera(previous,desired,delta){
    if(!previous)return {position:desired.position.slice(),target:desired.target.slice(),fov:desired.fov};
    const a=1-Math.exp(-clamp(finite(delta),0,.1)*4.4),blend=(old,next)=>next.map((n,i)=>old[i]+(n-old[i])*a);
    return {position:blend(previous.position,desired.position),target:blend(previous.target,desired.target),fov:previous.fov+(desired.fov-previous.fov)*a};
  }
  function pose(p,game){
    const speed=clamp(Math.hypot(finite(p.vx),finite(p.vz))/7,0,1),cycle=finite(p.run)*2.8+(hash(p.id)%17)*.37,stride=Math.sin(cycle)*.72*speed;
    const active=finite(p.actionTime)>0,progress=active?1-clamp(p.actionTime/(p.actionDuration||.4),0,1):1,pulse=active?Math.sin(progress*Math.PI):0;
    const kick=['shoot','pass'].includes(p.action)&&active?pulse:0,save=['save','dive'].includes(p.action)&&active?pulse:0,celebrate=p.action==='celebrate'&&active?1:0;
    return {stride,kneeLeft:Math.max(0,-Math.cos(cycle))*.9*speed,kneeRight:Math.max(0,Math.cos(cycle))*.9*speed,kick,save,celebrate,
      lean:speed*.12,jump:celebrate?Math.max(0,Math.sin(finite(game?.visualTime)*9))*.16:Math.abs(Math.sin(cycle*2))*.025*speed,
      dive:save*(finite(p.diveSide)||1),tackle:p.action==='tackle'&&active?pulse:0,speed};
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
      players:a.players.map((p,i)=>{const q=b.players[i];if(!q||q.id!==p.id)return {...p};return {...p,...Object.fromEntries(['x','z','vx','vz','faceX','faceZ','run','actionTime'].map(k=>[k,mix(p[k],q[k])]))};})};
  }
  return {cameraFrame,smoothCamera,appearance,pose,separateKits,capture,interpolate};
});
