/* AURA quick-match formation preferences, isolated from Career and UT. */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.AuraQuickFormations=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const KEY="aura-quick-formations-v1",TEAM_KEY="aura-quick-teams-v1",VERSION=1,MAX_BYTES=1000;
 const formations=["4-3-3","4-2-3-1","4-4-2","3-5-2","4-1-2-1-2"];
 const defaults=Object.freeze({home:"4-3-3",away:"4-3-3"});
 const valid=o=>o&&typeof o==="object"&&!Array.isArray(o)&&formations.includes(o.home)&&formations.includes(o.away);
 function load(store){
  try{
   const raw=store?.getItem?.(KEY);
   if(!raw||raw.length>MAX_BYTES)return {...defaults};
   const entry=JSON.parse(raw);
   if(entry.version!==VERSION||!valid(entry.formation))return {...defaults};
   return {home:entry.formation.home,away:entry.formation.away};
  }catch{return {...defaults};}
 }
 function save(store,formation){
  try{
   if(!store?.setItem||!valid(formation))return false;
   store.setItem(KEY,JSON.stringify({version:VERSION,formation:{home:formation.home,away:formation.away}}));
   return true;
  }catch{return false;}
 }
 function validTeams(teams,validIds){
  const ids=new Set(Array.isArray(validIds)?validIds:[]);
  return teams&&typeof teams==="object"&&!Array.isArray(teams)&&
   typeof teams.home==="string"&&typeof teams.away==="string"&&
   teams.home!==teams.away&&ids.has(teams.home)&&ids.has(teams.away);
 }
 function loadTeams(store,validIds){
  try{
   const raw=store?.getItem?.(TEAM_KEY);
   if(!raw||raw.length>MAX_BYTES)return null;
   const data=JSON.parse(raw);
   if(data.version!==VERSION||!validTeams(data.teams,validIds))return null;
   return {home:data.teams.home,away:data.teams.away};
  }catch{return null;}
 }
 function saveTeams(store,teams,validIds){
  try{
   if(!store?.setItem||!validTeams(teams,validIds))return false;
   store.setItem(TEAM_KEY,JSON.stringify({version:VERSION,teams:{home:teams.home,away:teams.away}}));
   return true;
  }catch{return false;}
 }
 return {KEY,TEAM_KEY,formations,defaults,valid,load,save,validTeams,loadTeams,saveTeams};
});