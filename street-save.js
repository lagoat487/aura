/* AURA Calle / VOLTA circuit progress - independent local save.
 * Only the four street fixtures, standings and earned medal are persisted. */
(function(root,factory){
  const api=factory(typeof module==="object"&&module.exports?require("./street-circuit"):root.AuraStreetCircuit);
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.AuraStreetSave=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(Circuit){
  "use strict";
  const KEY="aura-volta-circuit-v1",VERSION=1,MAX_SIZE=16000;
  const nonnegative=n=>Number.isSafeInteger(n)&&n>=0;
  function valid(c){
    if(c===null)return true;
    if(!c||typeof c!=="object"||Array.isArray(c))return false;
    if(typeof c.home!=="string"||!c.home||c.home.length>90)return false;
    if(![3,5,7].includes(c.goalLimit)||![60,120,180].includes(c.seconds)||
      ![.78,1,1.16].includes(c.difficulty))return false;
    if(!["playing","finished"].includes(c.status)||!Array.isArray(c.fixtures)||
      !Array.isArray(c.results)||c.fixtures.length!==4||c.results.length>4)return false;
    let expected;
    try{expected=Circuit.create(c.home,{goalLimit:c.goalLimit,seconds:c.seconds,difficulty:c.difficulty});}
    catch{return false;}
    if(c.fixtures.some((id,i)=>id!==expected.fixtures[i]))return false;
    for(let i=0;i<c.results.length;i++){
      const r=c.results[i];
      if(!r||r.round!==i+1||r.opponent!==expected.fixtures[i]||
        !nonnegative(r.home)||!nonnegative(r.away)||
        r.home>c.goalLimit||r.away>c.goalLimit)return false;
      const won=r.home>r.away,draw=r.home===r.away;
      const points=won?3:draw?1:0,result=won?"W":draw?"D":"L";
      if(r.points!==points||r.result!==result)return false;
      if(!Circuit.complete(expected,{home:r.home,away:r.away}))return false;
    }
    return c.status===expected.status&&
      ["wins","draws","losses","goals","conceded","points","streak","bestStreak"]
        .every(key=>c[key]===expected[key]);
  }
  function load(store){
    try{
      const raw=store?.getItem?.(KEY);
      if(!raw||raw.length>MAX_SIZE)return null;
      const data=JSON.parse(raw);
      return data.version===VERSION&&valid(data.circuit)?data.circuit:null;
    }catch{return null;}
  }
  function save(store,circuit){
    try{
      if(!store?.setItem||!valid(circuit))return false;
      const json=JSON.stringify({version:VERSION,circuit});
      if(json.length>MAX_SIZE)return false;
      store.setItem(KEY,json);return true;
    }catch{return false;}
  }
  return {KEY,load,save,valid};
});
