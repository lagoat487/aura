// Presentation state only. The career and its independent simulation own results.
const positions={GK:'POR',LB:'LI',CB:'DFC',RB:'LD',CM:'MC',CDM:'MCD',CAM:'MCO',LW:'EI',RW:'ED',ST:'DC',LM:'MI',RM:'MD'};
export class VisionFrame{
 constructor(){this.last=0;this.runs=new Map();this.actions=new Map();this.goals=[];this.goalAt=-10;}
 event(event,sim){
  const kicker=sim.lastKicker||sim.owner||sim.selected;
  if(event.type==='shot'&&kicker)this.actions.set(kicker.id,{name:'shoot',at:sim.time,duration:.45});
  if(event.type==='save'){const p=sim.players.find(p=>p.team===event.team&&p.index===0);if(p)this.actions.set(p.id,{name:'smother',at:sim.time,duration:.7});}
  if(event.type==='goal'){this.goalAt=sim.time;this.goals.push({team:event.team});}
 }
 update(sim){
  const dt=Math.max(0,Math.min(.1,sim.time-this.last));this.last=sim.time;
  const players=sim.players.map(p=>{
   const run=(this.runs.get(p.id)||p.phase||0)+Math.hypot(p.vx,p.vz)*dt*.64;this.runs.set(p.id,run);
   const action=this.actions.get(p.id),remaining=action?Math.max(0,action.duration-(sim.time-action.at)):0;
   return {...p,id:/^\d+$/.test(p.id)?'real:'+p.id:p.id,real:/^\d+$/.test(p.id),pos:positions[p.role]||'MC',number:p.index+1,energy:p.stamina*100,faceX:p.dirX,faceZ:p.dirZ,run,action:remaining>0?action.name:'run',actionTime:remaining,actionDuration:action?.duration||.4};
  });
  return {players,ball:sim.ball,score:sim.score,half:sim.half,visualTime:sim.time,controlled:sim.controlled,localTwoPlayer:false,phase:sim.time-this.goalAt<2.7?'goal':'playing',phaseTime:Math.max(0,2.7-(sim.time-this.goalAt)),goals:this.goals};
 }
}
