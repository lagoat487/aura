/* Versioned, checked Ultimate Team saves. Never touches career progress. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.AuraUTSave=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const KEY="aura-ultimate-team-v1",BACKUP_KEY="aura-ultimate-team-backup-v1",FORMAT="aura-ut-backup",MAX_BYTES=3_000_000;
  const allowedTabs=new Set(["home","squad","play","store","market","sbc","objectives","club"]);
  const formations=new Set(["4-3-3","4-4-2","4-2-3-1","4-3-2-1","4-1-2-1-2","3-5-2","5-3-2","4-5-1"]);
  const array=a=>Array.isArray(a);
  const integer=n=>Number.isSafeInteger(n)&&n>=0;
  const string=s=>typeof s==="string"&&s.length>0&&s.length<=200;
  function validClub(u,allowedFormations){
    if(!u||typeof u!=="object"||array(u)||!string(u.name)||u.name.length>24||!Number.isSafeInteger(u.coins)||u.coins<0||u.coins>1e12)return false;
    if(!allowedFormations.has(u.formation)||!array(u.owned)||u.owned.length<11||u.owned.length>8000||!array(u.duplicates)||u.duplicates.length>8000||!array(u.xi)||u.xi.length!==11)return false;
    const ids=new Set(),identities=new Set();
    for(const p of u.owned){
      if(!p||!string(p.id)||ids.has(p.id)||!string(p.name)||!string(p.pos)||!Number.isInteger(p.overall)||p.overall<1||p.overall>99)return false;
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
      if(!p||!string(p.uid)||uids.has(p.uid)||!string(p.id)||!string(p.name)||!string(p.pos)||!Number.isInteger(p.overall)||p.overall<1||p.overall>99)return false;
      uids.add(p.uid);
    }
    for(const name of ["objectives","claimed","lastPack","battlesClaimed"]){if(!array(u[name])||u[name].length>10000)return false;}
    for(const name of ["played","wins","draws","losses","packsOpened","purchases","sbcs","battlePoints","battleCycle","divisionPoints","serial"]){if(!integer(u[name]))return false;}
    if(!Number.isInteger(u.division)||u.division<1||u.division>10)return false;
    return true;
  }
  function normalize(session,allowedFormations=formations){
    if(!session||typeof session!=="object"||![1,2].includes(session.version)||!validClub(session.club,allowedFormations))return null;
    return {version:2,club:session.club,tab:allowedTabs.has(session.tab)?session.tab:"home",matchToken:integer(session.matchToken)?session.matchToken:0};
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