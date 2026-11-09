/* AURA 9.9: browser adaptation of the supplied ProVision Football gameplay.
 * Source reference: PVFFootballPlayer.cpp, PVFBall.cpp and PVFTeamBrain.cpp.
 * Distances use metres (the reference uses Unreal centimetres). No UE runtime.
 */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.AuraProVision=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const tuning=Object.freeze({jog:6.45,sprint:8.45,acceleration:22,braking:18,turnRate:560*Math.PI/180,
    staminaDrain:8.5,recover:4,recoverStanding:6,carryJog:.48,carrySprint:.8,carryResponse:14,
    gravity:9.8,airDrag:.28,groundDrag:.55,bounce:.52,maxBallSpeed:42,roleInterval:.25});
  function rating(p,key){return clamp(Number(p[key]??p.overall)||70,1,99);}
  function speed(p,sprint=false){
    const energy=clamp(Number(p.stamina??100),0,100)/100;
    return (sprint?tuning.sprint:tuning.jog)*(.9+rating(p,"pace")*.0018)*
      (sprint?.82+.18*energy:.9+.1*energy);
  }
  function stamina(p,wantsSprint,dt){
    const velocity=Math.hypot(p.vx||0,p.vz||0);
    p.sprinting=!!wantsSprint&&p.stamina>3&&velocity>2.5;
    p.stamina=clamp(p.stamina+dt*(p.sprinting?-tuning.staminaDrain:velocity<2?tuning.recoverStanding:tuning.recover),0,100);
    return p.sprinting;
  }
  function move(p,tx,tz,maxSpeed,dt,bounds={x:51.5,z:33}){
    if(dt<=0)return;
    p.vx=Number(p.vx)||0;p.vz=Number(p.vz)||0;
    const dx=tx-p.x,dz=tz-p.z,len=Math.hypot(dx,dz),speed=Math.min(maxSpeed,len*5,len/dt);
    const vx=len>.06?dx/len*speed:0,vz=len>.06?dz/len*speed:0;
    const current=Math.hypot(p.vx,p.vz),desired=Math.hypot(vx,vz);
    const dot=current>.1&&desired>.1?clamp((p.vx*vx+p.vz*vz)/(current*desired),-1,1):1;
    const acceleration=desired<current||dot<0?tuning.braking:tuning.acceleration;
    const change=Math.hypot(vx-p.vx,vz-p.vz),blend=change?Math.min(1,acceleration*dt/change):1;
    p.vx+=(vx-p.vx)*blend;p.vz+=(vz-p.vz)*blend;
    const x=clamp(p.x+p.vx*dt,-bounds.x,bounds.x),z=clamp(p.z+p.vz*dt,-bounds.z,bounds.z);
    if(Math.abs(x)===bounds.x)p.vx=0;if(Math.abs(z)===bounds.z)p.vz=0;
    p.x=x;p.z=z;p.turn=clamp((p.turn||0)*Math.exp(-8*dt)+(1-dot)*.2,0,1);
    p.dribbleTime=Math.max(0,(p.dribbleTime||0)-dt);
    const velocity=Math.hypot(p.vx,p.vz);
    if(velocity>.12){
      const facing=Math.atan2(p.faceZ||0,Number.isFinite(p.faceX)?p.faceX:1),target=Math.atan2(p.vz,p.vx);
      const delta=Math.atan2(Math.sin(target-facing),Math.cos(target-facing));
      const angle=facing+clamp(delta,-tuning.turnRate*dt,tuning.turnRate*dt);
      p.faceX=Math.cos(angle);p.faceZ=Math.sin(angle);p.run=(p.run||0)+velocity*dt;
    }
  }
  function carry(ball,p,dt){
    const lead=p.sprinting?tuning.carrySprint:tuning.carryJog;
    const x=p.x+(Number.isFinite(p.faceX)?p.faceX:1)*lead,z=p.z+(p.faceZ||0)*lead;
    // Bounded continuous control: a first touch never warps the ball to the feet.
    const dx=x-ball.x,dz=z-ball.z,gap=Math.hypot(dx,dz);
    const amount=gap?Math.min(1,1-Math.exp(-tuning.carryResponse*dt),tuning.maxBallSpeed*dt/gap):1;
    ball.x+=dx*amount;ball.z+=dz*amount;ball.y=.22;ball.vx=p.vx*.9;ball.vz=p.vz*.9;ball.vy=0;
  }
  function pass(p,power=.6,range=20,lob=false){
    if(lob){const flight=clamp(range/13,.55,1.5);return {speed:Math.min(range/flight,25),lift:.5*tuning.gravity*flight};}
    return {speed:clamp(8+clamp(power,0,1)*15+rating(p,"passing")*.04,7,27),lift:.4};
  }
  function shot(p,power=.58){
    power=clamp(power,0,1);
    return {speed:clamp((17+power*23)*(.88+rating(p,"shooting")/850),15,39),lift:.8+power*1.7};
  }
  function attacking(game,team=0){return game.ball.owner!==null&&game.players[game.ball.owner]?.team===team;}
  function resolveAction(type,attack){
    if(type==="primary")return attack?"pass":"pressure";
    if(type==="finish")return attack?"shoot":"keeperRush";
    if(type==="loft")return attack?"lob":"slide";
    if(type==="thread")return attack?"through":"switch";
    return type;
  }
  function keyAction(key,scheme="provision",attack=true){
    const keys=scheme==="classic"?{j:"shoot",k:"pass",l:"through",o:"lob",r:"skill",v:"slide",f:"cross",e:"switch"," ":"tackle"}:
      {" ":"primary",k:"finish",j:"loft",l:"thread",u:"slide",v:"slide",tab:"switch",e:"switch",q:"secondPress",r:"skill",f:"cross",o:"lob"};
    return resolveAction(keys[key]||null,attack);
  }
  function padAction(index,scheme="provision",attack=true){
    const keys=scheme==="classic"?{0:"pass",1:"shoot",2:"tackle",3:"through",4:"switch",5:"cross",6:"lob",11:"skill",8:"slide"}:
      {0:"primary",1:"finish",2:"loft",3:"thread",4:"slide",5:"secondPress",6:"skill",8:"switch",11:"skill"};
    return resolveAction(keys[index]||null,attack);
  }
  function roles(game,dt){
    const previous=game.defensiveRoles;
    if(previous&&previous.until>game.elapsed&&previous.owner===game.ball.owner&&previous.half===game.half&&
      previous.chasers.concat(previous.covers).every(i=>i===null||(!game.players[i].sentOff&&i!==game.controlled&&!(game.localTwoPlayer&&i===game.awayControlled))))return previous;
    const chasers=[],covers=[];
    for(let team=0;team<2;team++){
      const candidates=game.players.map((p,i)=>({p,i,d:Math.hypot(p.x-game.ball.x,p.z-game.ball.z)}))
        .filter(({p,i})=>p.team===team&&!p.sentOff&&p.index!==0&&i!==game.controlled&&!(game.localTwoPlayer&&i===game.awayControlled))
        .sort((a,b)=>a.d-b.d||a.i-b.i);
      chasers[team]=candidates[0]?.i??null;covers[team]=candidates[1]?.i??null;
    }
    return game.defensiveRoles={chasers,covers,until:game.elapsed+tuning.roleInterval,owner:game.ball.owner,half:game.half};
  }
  return {name:"ProVision · adaptación web",tuning,rating,speed,stamina,move,carry,pass,shot,attacking,resolveAction,keyAction,padAction,roles};
});
