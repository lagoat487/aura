/* AURA VOLTA independent offline circuit simulation.
 * No coins, purchases or career/Ultimate Team mutations. */
(function(root,factory){
  const api=factory(typeof module==="object"&&module.exports?require("./street-circuit"):root.AuraStreetCircuit);
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.AuraStreetSim=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(Circuit){
  "use strict";
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  function seed(s){
    let n=2166136261;
    for(const ch of String(s))n=Math.imul(n^ch.charCodeAt(0),16777619)>>>0;
    return n;
  }
  function random(init){
    let n=init>>>0;
    return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
  }
  function next(circuit,homeRating,awayRating){
    const opponent=Circuit.next(circuit);
    if(!opponent||!Circuit.create||!Number.isFinite(homeRating)||!Number.isFinite(awayRating)||
       homeRating<1||homeRating>99||awayRating<1||awayRating>99)return false;
    const turn=circuit.results.length;
    const rng=random(seed(circuit.home+"-"+opponent+"-"+turn+"-"+circuit.seconds+"-"+circuit.goalLimit+"-"+circuit.difficulty));
    const difference=clamp(homeRating-awayRating,-50,50);
    const homeChance=clamp(.24+difference*.0024-(circuit.difficulty-1)*.12,.08,.46);
    const awayChance=clamp(.24-difference*.0024+(circuit.difficulty-1)*.12,.08,.46);
    const chances=clamp(Math.round(circuit.seconds/16),4,14);
    let home=0,away=0;
    for(let i=0;i<chances;i++){
      if(home>=circuit.goalLimit||away>=circuit.goalLimit)break;
      if(rng()<homeChance)home++;
      if(home>=circuit.goalLimit)break;
      if(rng()<awayChance)away++;
    }
    return Circuit.complete(circuit,{home,away});
  }
  function rest(circuit,ratings){
    if(!circuit||typeof ratings!=="function")return [];
    const records=[];
    for(let i=0;i<4;i++){
      const opponent=Circuit.next(circuit);if(!opponent)break;
      const result=next(circuit,Number(ratings(circuit.home)),Number(ratings(opponent)));
      if(!result)break;
      records.push(result);
    }
    return records;
  }
  return {next,rest};
});
