/* Independent match simulations for Draft XI and Quick Rivalry.
 * Simulations only change these temporary mode records; never Career or UT. */
(function(root,factory){
  const api=factory(
    typeof module==="object"&&module.exports?require("./world-tour"):root.AuraTour,
    typeof module==="object"&&module.exports?require("./mode-knockout"):root.AuraKnockout,
    typeof module==="object"&&module.exports?require("./quick-rivalry"):root.AuraRivalry
  );
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.AuraModeSimulation=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(Tour,Knockout,Rivalry){
  "use strict";
  function simulateRivalry(series,all=false){
    if(!series||!Number.isFinite(series.homeRating)||!Number.isFinite(series.awayRating))return [];
    const results=[];
    for(let i=0;i<(all?3:1);i++){
      const round=Rivalry.next(series);
      if(!round)break;
      const rng=Tour.random((series.seed+round*1499)>>>0);
      const score=Tour.simulate(series.homeRating,series.awayRating,rng);
      const match=Rivalry.record(series,score);
      if(!match)break;
      results.push(match);
    }
    return results;
  }
  function simulateDraft(draft,clubRating,all=false){
    if(!draft||!Array.isArray(draft.players)||draft.players.length!==11||typeof clubRating!=="function")return [];
    const bracket=draft.tournament||(draft.tournament=Knockout.createDraft(draft.players));
    const results=[];
    for(let i=0;i<(all?4:1);i++){
      const opponent=Knockout.opponent(bracket);
      if(!opponent)break;
      const rating=Number(clubRating(opponent));
      if(!Number.isFinite(rating)||rating<1||rating>99)break;
      const rng=Tour.random((bracket.seed+(bracket.round+1)*1907)>>>0);
      const score=Tour.simulate(bracket.rating,rating,rng);
      const result=Knockout.recordDraft(bracket,score,rating);
      if(!result)break;
      results.push(result);
    }
    return results;
  }
  return {simulateRivalry,simulateDraft};
});
