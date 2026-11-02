/* Standalone AURA Cup saves. Manager careers are deliberately excluded. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.AuraCupSave=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const KEY="aura-independent-cups-v1",VERSION=1,MAX_BYTES=120000;
  const id=x=>typeof x==="string"&&x.length>0&&x.length<=128;
  const score=x=>Number.isInteger(x)&&x>=0&&x<=99;
  function valid(cup,types){
    if(!cup||typeof cup!=="object"||Array.isArray(cup))return false;
    const type=types.find(x=>x.id===cup.id);
    if(!type||!Array.isArray(cup.entrants)||cup.entrants.length!==type.size)return false;
    if(!Number.isFinite(cup.seed)||!Number.isInteger(cup.seed))return false;
    if(typeof cup.name!=="string"||cup.name.length>120||!id(cup.user))return false;
    const ids=new Set();
    for(const p of cup.entrants){
      if(!p||!id(p.id)||ids.has(p.id)||!id(p.name)||!Number.isFinite(p.rating)||p.rating<0||p.rating>100)return false;
      ids.add(p.id);
    }
    if(!ids.has(cup.user)||!Array.isArray(cup.current)||!Array.isArray(cup.rounds))return false;
    if(cup.rounds.length>Math.log2(type.size))return false;
    if(cup.current.length!==type.size/(2**cup.rounds.length))return false;
    if(cup.current.some(x=>!ids.has(x))||new Set(cup.current).size!==cup.current.length)return false;
    if(cup.champion!==null&&(cup.current.length!==1||cup.champion!==cup.current[0]))return false;
    if(cup.current.length===1&&cup.champion!==cup.current[0])return false;
    for(let round=0;round<cup.rounds.length;round++){
      const matches=cup.rounds[round];
      if(!Array.isArray(matches)||matches.length!==type.size/(2**(round+1)))return false;
      for(const m of matches){
        if(!m||!ids.has(m.home)||!ids.has(m.away)||m.home===m.away||!ids.has(m.winner)||![m.home,m.away].includes(m.winner))return false;
        if(!m.score||!score(m.score.home)||!score(m.score.away))return false;
        if(m.penalties&&(!score(m.penalties.home)||!score(m.penalties.away)||m.penalties.home===m.penalties.away||m.score.home!==m.score.away))return false;
      }
    }
    return true;
  }
  function load(store,types){
    try{
      const raw=store?.getItem?.(KEY);
      if(!raw||raw.length>MAX_BYTES)return [];
      const data=JSON.parse(raw);
      if(data.version!==VERSION||!Array.isArray(data.cups)||data.cups.length>30)return [];
      const seen=new Set();
      return data.cups.filter(c=>{
        if(!valid(c,types)||seen.has(c.id))return false;
        seen.add(c.id);return true;
      });
    }catch{return [];}
  }
  function save(store,cups,types){
    try{
      if(!store||!Array.isArray(cups)||cups.length>30||cups.some(c=>!valid(c,types)))return false;
      const raw=JSON.stringify({version:VERSION,cups});
      if(raw.length>MAX_BYTES)return false;
      store.setItem(KEY,raw);return true;
    }catch{return false;}
  }
  return {KEY,load,save,valid};
});
