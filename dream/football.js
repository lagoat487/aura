import { FORMATIONS, seeded } from './career.js';
export const FIELD={halfLength:52.5,halfWidth:34,goalHalfWidth:3.66,goalHeight:2.44};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const normalize=(x,z)=>{const d=Math.hypot(x,z)||1;return{x:x/d,z:z/d};};
export function crossingGoal(before,after){
  for(const side of [-1,1]){
    const line=FIELD.halfLength*side;
    if(before.x*side<=FIELD.halfLength&&after.x*side>FIELD.halfLength){
      const fraction=(line-before.x)/(after.x-before.x),z=before.z+(after.z-before.z)*fraction,y=before.y+(after.y-before.y)*fraction;
      if(Math.abs(z)<FIELD.goalHalfWidth&&y>=0&&y<FIELD.goalHeight)return side;
    }
  }return 0;
}
function bases(formation){
  if(formation==='4-4-2')return [[-47,0],[-31,-25],[-33,-9],[-33,9],[-31,25],[-9,-25],[-13,-8],[-13,8],[-9,25],[11,-10],[11,10]];
  if(formation==='3-5-2')return [[-47,0],[-32,-19],[-34,0],[-32,19],[-8,-27],[-9,-12],[-18,0],[-9,12],[-8,27],[12,-9],[12,9]];
  return [[-47,0],[-30,-25],[-33,-9],[-33,9],[-30,25],[-12,-16],[-19,0],[-12,16],[10,-24],[14,0],[10,24]];
}
export class FootballSimulation {
  constructor({roster,opponentRating=64,formation='4-3-3',duration=120,difficulty='normal',seed=123,onEvent=()=>{}}={}){
    this.duration=duration;this.difficulty=difficulty;this.random=seeded(seed);this.onEvent=onEvent;this.elapsed=0;this.half=1;this.attack=1;this.score=[0,0];this.shots=[0,0];this.tackles=[0,0];this.finished=false;this.paused=false;this.freeze=0;this.ball={x:0,z:0,y:.32,vx:0,vz:0,vy:0,lastTeam:0};this.owner=null;this.kickLock=0;this.lastKicker=null;this.lastKickerTime=0;this.controlled=9;this.players=[];this.time=0;this.message='';
    const base=bases(formation);
    for(let team=0;team<2;team++)for(let i=0;i<11;i++){
      const data=team===0?roster?.[i]:null,overall=data?.overall||opponentRating;
      this.players.push({team,index:i,id:data?.id||`rival-${i}`,name:data?.name||['Portero','Lateral','Central','Defensa','Lateral','Medio','Pivote','Interior','Extremo','Delantero','Extremo'][i],overall,pace:data?.pace||overall,shooting:data?.shooting||overall,passing:data?.passing||overall,defending:data?.defending||overall,x:0,z:0,vx:0,vz:0,dirX:team===0?1:-1,dirZ:0,baseX:base[i][0],baseZ:base[i][1],stamina:1,cooldown:0,ownerTime:0,phase:this.random()*6,role:FORMATIONS[formation][i]});
    }
    this.resetKickoff(0);this.freeze=0;
  }
  get selected(){return this.players[this.controlled];}
  get virtualMinute(){return Math.min(90,this.elapsed/this.duration*90);}
  direction(team){return (team===0?1:-1)*this.attack;}
  emit(type,extra={}){this.onEvent({type,...extra});}
  resetKickoff(team){
    for(const p of this.players){const dir=this.direction(p.team);p.x=p.baseX*dir;p.z=p.baseZ*dir;p.vx=0;p.vz=0;p.ownerTime=0;p.cooldown=.8;}
    const taker=this.players[team*11+9],dir=this.direction(team);taker.x=-dir;taker.z=0;taker.dirX=dir;taker.dirZ=0;this.owner=taker;this.ball={x:0,z:0,y:.32,vx:0,vz:0,vy:0,lastTeam:team};this.controlled=9;this.lastKicker=null;this.kickLock=.5;
  }
  move(p,targetX,targetZ,dt,sprint=false){
    const dx=targetX-p.x,dz=targetZ-p.z,d=Math.hypot(dx,dz);let speed=(4.9+(p.pace/100)*2.0)*(sprint?1.32:1)*(p.stamina*.22+.78);
    if(p.team===1)speed*=this.difficulty==='easy'?.86:this.difficulty==='hard'?1.06:.96;
    const maxStep=speed*dt;if(d>.08){const n=normalize(dx,dz),step=Math.min(d,maxStep);p.x+=n.x*step;p.z+=n.z*step;p.vx=n.x*step/dt;p.vz=n.z*step/dt;p.dirX=n.x;p.dirZ=n.z;}else{p.vx=0;p.vz=0;}
    p.x=clamp(p.x,-51.4,51.4);p.z=clamp(p.z,-33,33);p.stamina=clamp(p.stamina+(sprint?-.018:.012)*dt,.2,1);
  }
  setOwner(p){this.owner=p;p.ownerTime=0;this.ball.lastTeam=p.team;this.ball.vx=0;this.ball.vz=0;this.ball.vy=0;this.ball.y=.32;}
  kick(p,tx,tz,speed,lift=0){
    const n=normalize(tx-p.x,tz-p.z);this.owner=null;this.ball.x=p.x+n.x*.95;this.ball.z=p.z+n.z*.95;this.ball.y=.42;this.ball.vx=n.x*speed;this.ball.vz=n.z*speed;this.ball.vy=lift;this.ball.lastTeam=p.team;this.lastKicker=p;this.lastKickerTime=1;this.kickLock=.18;p.cooldown=.65;
  }
  shoot(power=.75){
    const p=this.selected;if(this.owner!==p){this.tackle();return false;}
    this.takeShot(p,power);return true;
  }
  takeShot(p,power=.75){
    const dir=this.direction(p.team),aim=(this.random()-.5)*(100-p.shooting)*.075;
    const aimZ=clamp(p.z*.09+aim,-3.2,3.2),range=Math.abs(dir*52.5-p.x),speed=(24+p.shooting*.09)*(power*.25+.85);
    this.kick(p,dir*55,aimZ,speed,clamp(range*.10,1.2,4.2));this.shots[p.team]++;this.emit('shot',{team:p.team});
  }
  pass(dx=0,dz=0){
    const p=this.selected;if(this.owner!==p){this.tackle();return;}
    this.doPass(p,dx,dz);
  }
  doPass(p,dx=0,dz=0){
    const dir=this.direction(p.team),aim=Math.hypot(dx,dz)>.1?normalize(dx,dz):{x:dir,z:0};
    const options=this.players.filter(q=>q.team===p.team&&q!==p&&q.index!==0).map(q=>{const n=normalize(q.x-p.x,q.z-p.z),d=distance(p,q);return{q,score:(n.x*aim.x+n.z*aim.z)*18-Math.abs(d-18)*.35};}).sort((a,b)=>b.score-a.score);
    const target=options[0]?.q;if(!target)return;
    this.kick(p,target.x+target.vx*.4,target.z+target.vz*.4,17+p.passing*.045,.25);if(p.team===0)this.controlled=target.index;
  }
  switchPlayer(){
    const choices=this.players.filter(p=>p.team===0&&p.index!==0).sort((a,b)=>distance(a,this.ball)-distance(b,this.ball));
    let next=choices[0];if(next.index===this.controlled)next=choices[1];if(next)this.controlled=next.index;
  }
  tackle(){
    const p=this.selected;if(p.cooldown>0)return;p.cooldown=.7;
    if(this.owner&&this.owner.team!==p.team&&distance(p,this.owner)<2.5&&this.random()<.6+p.defending*.003){this.owner.cooldown=.8;this.setOwner(p);this.tackles[p.team]++;this.emit('tackle');}
    else if(!this.owner&&distance(p,this.ball)<2.5&&this.ball.y<1.8)this.setOwner(p);
  }
  restart(kind,team,x,z){
    this.owner=null;this.freeze=1.2;this.ball={x:clamp(x,-51,51),z:clamp(z,-33,33),y:.32,vx:0,vz:0,vy:0,lastTeam:team};
    const taker=this.players.filter(p=>p.team===team&&(kind==='goal-kick'?p.index===0:p.index!==0)).sort((a,b)=>distance(a,this.ball)-distance(b,this.ball))[0];
    // Moving the restart taker is restricted to a dead ball, never open play.
    taker.x=this.ball.x-this.direction(team)*.8;taker.z=this.ball.z;this.setOwner(taker);taker.cooldown=.8;if(team===0)this.controlled=taker.index;
    this.emit(kind,{team});
  }
  update(dt,input={x:0,z:0,sprint:false}){
    if(this.finished||this.paused)return;
    dt=clamp(dt,0,.05);if(!dt)return;this.time+=dt;
    if(this.freeze>0){this.freeze-=dt;return;}
    this.elapsed+=dt;this.kickLock=Math.max(0,this.kickLock-dt);this.lastKickerTime-=dt;
    if(this.half===1&&this.elapsed>=this.duration/2){this.half=2;this.attack=-1;this.resetKickoff(1);this.freeze=2.5;this.emit('halftime');return;}
    if(this.elapsed>=this.duration){this.finished=true;this.emit('end',{score:[...this.score],shots:[...this.shots]});return;}
    const chasers=[0,1].map(team=>this.players.filter(p=>p.team===team&&p.index!==0&&(team!==0||p.index!==this.controlled)).sort((a,b)=>distance(a,this.owner||this.ball)-distance(b,this.owner||this.ball)).slice(0,2));
    for(const p of this.players){
      p.cooldown=Math.max(0,p.cooldown-dt);const dir=this.direction(p.team),owns=this.owner===p,hasBall=this.owner?.team===p.team;
      if(owns)p.ownerTime+=dt;
      if(p.team===0&&p.index===this.controlled){
        const len=Math.hypot(input.x,input.z);if(len>.05){const n=normalize(input.x,input.z);this.move(p,p.x+n.x*10,p.z+n.z*10,dt,input.sprint);}else{p.vx=0;p.vz=0;p.stamina=clamp(p.stamina+.02*dt,.2,1);}
      }else if(p.index===0){
        this.move(p,-dir*48.2,clamp(this.ball.z*.7,-3.2,3.2),dt);
        if(owns&&p.ownerTime>1.1)this.doPass(p,dir,0);
      }else if(owns){
        const near=this.players.filter(q=>q.team!==p.team&&distance(p,q)<5),avoid=near.reduce((v,q)=>v+(p.z-q.z)/(distance(p,q)+.1),0);
        this.move(p,dir*55,clamp(p.z*.6+avoid*7,-25,25),dt,true);
        if((dir*52.5-p.x)*dir<25&&p.cooldown===0&&p.ownerTime>.7){this.takeShot(p,.8);}
        else if(near.length>1&&p.ownerTime>1.4&&p.cooldown===0)this.doPass(p,dir,0);
      }else if((!hasBall&&chasers[p.team].includes(p))||(!this.owner&&chasers[p.team].includes(p))){this.move(p,this.ball.x+this.ball.vx*.12,this.ball.z+this.ball.vz*.12,dt,true);}
      else{
        const forward=hasBall?7:-3,tx=clamp(p.baseX*dir+this.ball.x*.38+dir*forward,-43,43),tz=clamp(p.baseZ*dir+this.ball.z*.22,-29,29);
        this.move(p,tx,tz,dt,false);
      }
    }
    // Players separate with a bounded correction to avoid overlap, without teleporting.
    for(let i=0;i<this.players.length;i++)for(let j=i+1;j<this.players.length;j++){
      const p=this.players[i],q=this.players[j],d=distance(p,q);
      if(d>.02&&d<.82){const n=normalize(p.x-q.x,p.z-q.z),push=Math.min((.82-d)*.5,dt*.7);p.x=clamp(p.x+n.x*push,-51.4,51.4);p.z=clamp(p.z+n.z*push,-33,33);q.x=clamp(q.x-n.x*push,-51.4,51.4);q.z=clamp(q.z-n.z*push,-33,33);}
    }
    if(this.owner){
      const p=this.owner;this.ball.x=p.x+p.dirX*.85;this.ball.z=p.z+p.dirZ*.85;this.ball.y=.32+Math.abs(Math.sin(this.time*11))*.035;this.ball.vx=p.vx;this.ball.vz=p.vz;
      for(const defender of this.players){
        if(defender.team===p.team||defender.cooldown>0||p.cooldown>0||distance(defender,p)>1.1)continue;
        defender.cooldown=.8;
        if(this.random()<.18+defender.defending*.004){p.cooldown=.8;this.setOwner(defender);if(defender.team===0)this.controlled=defender.index;this.tackles[defender.team]++;break;}
      }
    }else{
      const b=this.ball,before={x:b.x,y:b.y,z:b.z};b.x+=b.vx*dt;b.z+=b.vz*dt;b.y+=b.vy*dt;b.vy-=9.8*dt;
      if(b.y<.32){b.y=.32;b.vy=Math.abs(b.vy)>.9?-b.vy*.35:0;}
      const friction=Math.exp(-(b.y<=.34?1.05:.10)*dt);b.vx*=friction;b.vz*=friction;
      const goal=crossingGoal(before,b);
      if(goal){const team=goal===this.direction(0)?0:1;this.score[team]++;this.emit('goal',{team,score:[...this.score]});this.resetKickoff(1-team);this.freeze=3;return;}
      if(Math.abs(b.z)>34){this.restart('throw-in',1-b.lastTeam,b.x,Math.sign(b.z)*32.5);return;}
      if(Math.abs(b.x)>52.5){const defendingTeam=Math.sign(b.x)===this.direction(0)?1:0,corner=b.lastTeam===defendingTeam;
        this.restart(corner?'corner':'goal-kick',corner?1-defendingTeam:defendingTeam,Math.sign(b.x)*(corner?51:47),corner?Math.sign(b.z||1)*32:0);return;}
      if(this.kickLock<=0&&b.y<2.1){
        const candidates=this.players.filter(p=>!(p===this.lastKicker&&this.lastKickerTime>0)).sort((a,bp)=>distance(a,b)-distance(bp,b));
        for(const p of candidates){const radius=p.index===0?2.1:1.05;if(distance(p,b)<radius){this.setOwner(p);if(p.team===0)this.controlled=p.index;if(p.index===0)this.emit('save',{team:p.team});break;}}
      }
    }
  }
}
