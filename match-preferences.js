/* Independent AURA prematch preferences. Does not touch Career or UT storage. */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.AuraMatchPreferences=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const KEY="aura-match-preferences-v1",VERSION=1,MAX_BYTES=2000;
 const DEFAULTS=Object.freeze({seconds:180,difficulty:1,stadium:"night",weather:"clear",
  quality:"high",camera:"stadium",sound:true,localTwoPlayer:false});
 const presets=Object.freeze({
  fast:Object.freeze({seconds:120,difficulty:1,stadium:"day",weather:"clear",quality:"low",camera:"wide"}),
  classic:Object.freeze({seconds:180,difficulty:1,stadium:"night",weather:"clear",quality:"medium",camera:"broadcast"}),
  epic:Object.freeze({seconds:480,difficulty:1.16,stadium:"sunset",weather:"clear",quality:"high",camera:"tele"}),
  vision:Object.freeze({seconds:180,difficulty:1,stadium:"night",weather:"clear",quality:"ultra",camera:"stadium"}),
  concept:Object.freeze({seconds:180,difficulty:1,stadium:"night",weather:"clear",quality:"high",camera:"stadium"}),
  immersive:Object.freeze({seconds:180,difficulty:1,stadium:"night",weather:"clear",quality:"high",camera:"immersive"}),
  default:DEFAULTS
 });
 const choices=Object.freeze({
  seconds:[120,180,300,480],difficulty:[.68,.82,1,1.16,1.34],
  stadium:["night","sunset","day"],weather:["clear","rain"],
  quality:["low","medium","high","ultra"],camera:["broadcast","tele","wide","tactical","immersive","stadium"],
  sound:[true,false],localTwoPlayer:[true,false]
 });
 function valid(data){
  return !!data&&typeof data==="object"&&!Array.isArray(data)&&
    Object.keys(DEFAULTS).every(k=>Object.hasOwn(data,k)&&choices[k].includes(data[k]));
 }
 function load(storage){
  try{
   const raw=storage?.getItem?.(KEY);
   if(!raw||raw.length>MAX_BYTES)return {...DEFAULTS};
   const entry=JSON.parse(raw);
   return entry.version===VERSION&&valid(entry.settings)?{...entry.settings}:{...DEFAULTS};
  }catch{return {...DEFAULTS};}
 }
 function save(storage,data){
  try{
   if(!storage?.setItem||!valid(data))return false;
   const raw=JSON.stringify({version:VERSION,settings:data});
   if(raw.length>MAX_BYTES)return false;
   storage.setItem(KEY,raw);return true;
  }catch{return false;}
 }
 function preset(key){return Object.hasOwn(presets,key)?{...presets[key]}:null;}
 return {KEY,DEFAULTS,preset,choices,valid,load,save};
});
