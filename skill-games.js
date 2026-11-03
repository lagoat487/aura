/* AURA 27 - independent arcade practice: shooting, passing, saving.
 * Saving never modifies career, club or Ultimate Team progression.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.AuraSkillGames=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const KEY="aura-skill-games-v1",VERSION=1,ROUNDS=9,MAX_BYTES=10000;
 const kinds=Object.freeze({
  shooting:{name:"Precisión de tiro",verb:"Dispara"},
  passing:{name:"Pases al espacio",verb:"Pasa"},
  keeping:{name:"Reflejos del portero",verb:"Lánzate"}
 });
 const lanes=["left","center","right"],powers=["soft","medium","strong"];
 const names={left:"Izquierda",center:"Centro",right:"Derecha",soft:"Suave",medium:"Normal",strong:"Fuerte"};
 const integer=(v,lo,hi)=>Number.isSafeInteger(v)&&v>=lo&&v<=hi;
 function create(kind,seed=Math.floor(Math.random()*0x7fffffff)){
  if(!Object.hasOwn(kinds,kind)||!integer(seed,0,0x7fffffff))return null;
  return {kind,seed,turn:0,score:0,hits:0,attempts:[],status:"playing"};
 }
 function target(g){
  if(!g||!Object.hasOwn(kinds,g.kind)||!integer(g.turn,0,ROUNDS)||g.turn===ROUNDS)return null;
  let n=(g.seed^Math.imul(g.turn+1,2654435761))>>>0;
  n^=n>>>16;n=Math.imul(n,2246822507)>>>0;n^=n>>>13;
  return {lane:lanes[(n>>>0)%3],distance:powers[(n>>>8)%3]};
 }
 function reward(t,lane,power){
  if(!t||!lanes.includes(lane)||!powers.includes(power))return null;
  const side=Math.abs(lanes.indexOf(lane)-lanes.indexOf(t.lane));
  const force=Math.abs(powers.indexOf(power)-powers.indexOf(t.distance));
  if(side===0&&force===0)return 100;
  if(side===0&&force===1)return 65;
  if(side===1&&force===0)return 40;
  if(side===0)return 30;
  return 0;
 }
 function takeUnchecked(g,lane,power){
  const points=reward(target(g),lane,power);
  g.attempts.push({lane,power,points});g.turn++;g.score+=points;
  if(points===100)g.hits++;
  if(g.turn===ROUNDS)g.status="finished";
  return points;
 }
 function valid(g){
  if(!g||!Object.hasOwn(kinds,g.kind)||!integer(g.seed,0,0x7fffffff)||
    !integer(g.turn,0,ROUNDS)||!Array.isArray(g.attempts)||g.attempts.length!==g.turn||
    !integer(g.score,0,ROUNDS*100)||!integer(g.hits,0,ROUNDS)||
    g.status!==(g.turn===ROUNDS?"finished":"playing"))return false;
  const replay=create(g.kind,g.seed);
  for(const a of g.attempts){
   if(!a||!lanes.includes(a.lane)||!powers.includes(a.power))return false;
   if(takeUnchecked(replay,a.lane,a.power)!==a.points)return false;
  }
  return replay.score===g.score&&replay.hits===g.hits&&replay.turn===g.turn;
 }
 function medal(g){
  if(!valid(g)||g.status!=="finished")return null;
  return g.score>=700?"Oro":g.score>=480?"Plata":g.score>=250?"Bronce":"Participación";
 }
 function take(g,lane,power){
  if(!valid(g)||g.status!=="playing"||!lanes.includes(lane)||!powers.includes(power))return null;
  const aim=target(g),points=takeUnchecked(g,lane,power);
  return {points,target:aim,finished:g.status==="finished",medal:medal(g)};
 }
 function validBest(best){
  return best&&typeof best==="object"&&!Array.isArray(best)&&
   Object.keys(best).every(k=>Object.hasOwn(kinds,k)&&integer(best[k],0,ROUNDS*100));
 }
 function load(store){
  const empty={session:null,best:{}};
  try{
   const raw=store?.getItem?.(KEY);
   if(!raw||raw.length>MAX_BYTES)return empty;
   const data=JSON.parse(raw);
   if(data.version!==VERSION||!validBest(data.best))return empty;
   return {session:valid(data.session)?data.session:null,best:{...data.best}};
  }catch{return empty;}
 }
 function save(store,session,best={}){
  try{
   if(!store?.setItem||(session!==null&&!valid(session))||!validBest(best))return false;
   const data=JSON.stringify({version:VERSION,session,best});
   if(data.length>MAX_BYTES)return false;
   store.setItem(KEY,data);return true;
  }catch{return false;}
 }
 function finish(best,session){
  if(!validBest(best)||!valid(session)||session.status!=="finished")return null;
  return {...best,[session.kind]:Math.max(best[session.kind]||0,session.score)};
 }
 return {KEY,ROUNDS,kinds,lanes,powers,names,target,reward,create,take,valid,medal,finish,save,load};
});