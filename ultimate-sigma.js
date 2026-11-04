/* Compatibility guard for old Sigma buttons. The event has ended. */
(function(){
 "use strict";
 const originalClick=AuraUTUI.handleClick.bind(AuraUTUI);
 AuraUTUI.handleClick=function(target){
  const d=target?.dataset||{};
  if(["sigmaOpen","sigmaGift","sigmaBuy","sigmaInspect"].some(key=>d[key]!==undefined)){
   if(typeof notify==="function")notify("El evento Ultimate Sigma ha finalizado.");
   return true;
  }
  return originalClick(target);
 };
})();
