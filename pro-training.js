/* AURA Carrera de Jugador — focused weekly training without paid currencies. */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.AuraProTraining=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const drills=Object.freeze({
   shooting:Object.freeze({name:"Definición",icon:"🎯",desc:"Practica remates y desmarques.",xp:42,fitness:-8,morale:3,form:6}),
   passing:Object.freeze({name:"Visión y pase",icon:"🎮",desc:"Mejora asociaciones y precisión.",xp:34,fitness:-4,morale:4,form:7}),
   sprint:Object.freeze({name:"Velocidad",icon:"⚡",desc:"Trabajo explosivo y potencia.",xp:48,fitness:-14,morale:2,form:4}),
   recovery:Object.freeze({name:"Recuperación",icon:"💚",desc:"Recupera energía con trabajo suave.",xp:15,fitness:20,morale:5,form:2})
 });
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function status(game){
   const pc=game?.playerCareer,roster=game?.rosters?.[game.club];
   if(!pc||!Array.isArray(roster))return null;
   const player=roster.find(p=>p.id===pc.playerId&&p.pos!=="POR");
   if(!player||!Number.isSafeInteger(game.round)||!Number.isSafeInteger(game.season))return null;
   const stamp=game.season+":"+game.round;
   return {player,pc,stamp,available:pc.lastTraining!==stamp&&game.round<(game.competition?.fixtures?.length||38)};
 }
 function train(game,key){
   const drill=Object.hasOwn(drills,key)?drills[key]:null;
   if(!drill)return {error:"Entrenamiento no disponible."};
   const ready=status(game);
   if(!ready)return {error:"Inicia Carrera de Jugador para entrenar."};
   if(!ready.available)return {error:"Ya entrenaste esta jornada o terminó la temporada."};
   const {player,pc,stamp}=ready;
   if(!Number.isFinite(player.overall)||!Number.isFinite(player.potential)||
     !Number.isFinite(pc.xp)||player.potential<player.overall)
     return {error:"Datos de desarrollo no válidos."};
   const fitness=clamp((player.fitness??95)+drill.fitness,0,100);
   const form=clamp((player.form??75)+drill.form,0,100);
   const morale=clamp((player.morale??75)+drill.morale,0,100);
   let xp=clamp(pc.xp,0,99)+drill.xp,overall=player.overall,leveled=false;
   if(overall<player.potential&&xp>=100){xp-=100;overall++;leveled=true;}
   if(overall>=player.potential)xp=Math.min(99,xp);
   player.fitness=fitness;player.form=form;player.morale=morale;player.overall=overall;
   pc.xp=xp;pc.lastTraining=stamp;pc.trainingHistory=Array.isArray(pc.trainingHistory)?pc.trainingHistory:[];
   const record={season:game.season,round:game.round,drill:key,name:drill.name,
     xp:drill.xp,fitness:drill.fitness,leveled,overall};
   pc.trainingHistory.unshift(record);pc.trainingHistory=pc.trainingHistory.slice(0,12);
   return {ok:true,record,message:drill.icon+" "+drill.name+" · +"+drill.xp+" EXP"+
     (leveled?" · ¡SUBE A "+overall+" GRL!":"")};
 }
 return {drills,status,train};
});