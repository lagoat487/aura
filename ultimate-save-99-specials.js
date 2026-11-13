/* Versioned, checked Ultimate Team saves. Never touches career progress. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.AuraUTSave=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const KEY="aura-ultimate-team-v1",BACKUP_KEY="aura-ultimate-team-backup-v1",FORMAT="aura-ut-backup",MAX_BYTES=3_000_000;
  const allowedTabs=new Set(["home","events","champions","magia","squad","play","store","market","sbc","objectives","club","flashback","muralla","barcelona","evolutions","backup"]);
  const formations=new Set(["4-3-3","4-4-2","4-2-3-1","4-3-2-1","4-1-2-1-2","3-5-2","5-3-2","4-5-1"]);
  const array=a=>Array.isArray(a);
  const integer=n=>Number.isSafeInteger(n)&&n>=0;
  const string=s=>typeof s==="string"&&s.length>0&&s.length<=200;
  // This one creator edition intentionally has a negative card rating.
  // Keep normal players, imports and arbitrary promotions in the 1–99 range.
  const validOverall=p=>Number.isInteger(p.overall)&&((p.overall>=1&&p.overall<=99)||(p.overall===-67&&p.id==='promo:autogoles-special:autogoles-minus67'&&p.originalId==='special:autogoles-minus67'&&p.name==='EL DE LOS AUTOGOLES'&&p.event==='admin-promo'&&p.adminPromoId==='autogoles-special'&&p.promoPrice===0&&p.tradeable===false));
  function validClub(u,allowedFormations){
    if(!u||typeof u!=="object"||array(u)||!string(u.name)||u.name.length>24||!Number.isSafeInteger(u.coins)||u.coins<0||u.coins>1e12)return false;
    if(!allowedFormations.has(u.formation)||!array(u.owned)||u.owned.length<11||u.owned.length>8000||!array(u.duplicates)||u.duplicates.length>8000||!array(u.xi)||u.xi.length!==11)return false;
    const ids=new Set(),identities=new Set();
    for(const p of u.owned){
      if(!p||!string(p.id)||ids.has(p.id)||!string(p.name)||!string(p.pos)||!validOverall(p))return false;
      ids.add(p.id);
    }
    for(const id of u.xi){
      if(!ids.has(id)||identities.has(id))return false;
      identities.add(id);
    }
    const chosen=new Set();
    for(const id of u.xi){
      const p=u.owned.find(q=>q.id===id),identity=p.originalId||p.id;
      if(chosen.has(identity))return false;
      chosen.add(identity);
    }
    const uids=new Set();
    for(const p of u.duplicates){
      if(!p||!string(p.uid)||uids.has(p.uid)||!string(p.id)||!string(p.name)||!string(p.pos)||!validOverall(p))return false;
      uids.add(p.uid);
    }
    for(const name of ["objectives","claimed","lastPack","battlesClaimed"]){if(!array(u[name])||u[name].length>10000)return false;}
    for(const name of ["played","wins","draws","losses","packsOpened","purchases","sbcs","battlePoints","battleCycle","divisionPoints","serial"]){if(!integer(u[name]))return false;}
    // Flashback was added after older UT saves; missing fields stay backwards-compatible.
    if(u.flashbackGiftClaimed!==undefined&&typeof u.flashbackGiftClaimed!=="boolean")return false;
    if(u.murallaGiftClaimed!==undefined&&typeof u.murallaGiftClaimed!=="boolean")return false;
    if(u.magiaGiftClaimed!==undefined&&typeof u.magiaGiftClaimed!=="boolean")return false;
    if(u.barcelonaGiftClaimed!==undefined&&typeof u.barcelonaGiftClaimed!=="boolean")return false;
    if(u.sbcCompleted!==undefined&&(!array(u.sbcCompleted)||u.sbcCompleted.length>1000||
      u.sbcCompleted.some(id=>!string(id))||new Set(u.sbcCompleted).size!==u.sbcCompleted.length))return false;
    for(const field of ["flashbackPlayed","flashbackWins","flashbackEarned"])
      if(u[field]!==undefined&&(!integer(u[field])||u[field]>1e12))return false;
    if(u.flashbackPlayed!==undefined&&u.flashbackWins!==undefined&&u.flashbackWins>u.flashbackPlayed)return false;
    if(!Number.isInteger(u.division)||u.division<1||u.division>10)return false;
    return true;
  }
  function normalize(session,allowedFormations=formations){
    if(!session||typeof session!=="object"||![1,2].includes(session.version)||!validClub(session.club,allowedFormations))return null;
    return {version:2,club:session.club,tab:session.tab==="argentina"?"events":allowedTabs.has(session.tab)?session.tab:"home",matchToken:integer(session.matchToken)?session.matchToken:0};
  }
  function hash(data){
    let h=2166136261;
    for(let i=0;i<data.length;i++){h^=data.charCodeAt(i);h=Math.imul(h,16777619);}
    return (h>>>0).toString(16).padStart(8,"0");
  }
  function pack(session,allowedFormations=formations){
    const normalized=normalize(session,allowedFormations);
    if(!normalized)throw Error("El club tiene datos incompletos; no se guardó una copia defectuosa.");
    const payload=JSON.stringify(normalized);
    if(payload.length>MAX_BYTES)throw Error("El club supera el límite de guardado.");
    return JSON.stringify({format:FORMAT,version:2,payload,checksum:hash(payload)});
  }
  function unpack(raw,allowedFormations=formations){
    if(typeof raw!=="string"||raw.length>MAX_BYTES+1000)return null;
    try{
      const saved=JSON.parse(raw);
      if(saved?.format===FORMAT&&saved.version===2){
        if(typeof saved.payload!=="string"||saved.payload.length>MAX_BYTES||hash(saved.payload)!==saved.checksum)return null;
        return normalize(JSON.parse(saved.payload),allowedFormations);
      }
      // Original AURA UT v1 files remain valid; migration happens on next save.
      return normalize(saved,allowedFormations);
    }catch{return null;}
  }
  function load(storage,allowedFormations=formations){
    if(!storage)return {snapshot:null,recovered:false};
    let primary=null,backup=null,primaryRaw=null;
    try{primaryRaw=storage.getItem(KEY);primary=unpack(primaryRaw,allowedFormations);}catch{}
    if(primary)return {snapshot:primary,recovered:false};
    try{backup=unpack(storage.getItem(BACKUP_KEY),allowedFormations);}catch{}
    return {snapshot:backup,recovered:!!backup,damaged:!!primaryRaw&&!backup};
  }
  function save(storage,session,allowedFormations=formations){
    if(!storage)return false;
    try{
      const next=pack(session,allowedFormations),previous=storage.getItem(KEY);
      if(previous&&unpack(previous,allowedFormations))storage.setItem(BACKUP_KEY,previous);
      storage.setItem(KEY,next);
      return true;
    }catch{return false;}
  }
  function restoreBackup(storage,allowedFormations=formations){
    try{
      const backup=unpack(storage.getItem(BACKUP_KEY),allowedFormations);
      if(!backup)return null;
      storage.setItem(KEY,pack(backup,allowedFormations));
      return backup;
    }catch{return null;}
  }
  function exportData(session,allowedFormations=formations){return pack(session,allowedFormations);}
  function importData(text,allowedFormations=formations){return unpack(text,allowedFormations);}
  return {KEY,BACKUP_KEY,FORMAT,MAX_BYTES,validClub,normalize,hash,pack,unpack,load,save,restoreBackup,exportData,importData};
});
