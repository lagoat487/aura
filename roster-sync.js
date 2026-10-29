/* Membership reconciliation: the newer catalog wins over the World Cup fallback.
 * The small Barcelona patch is sourced separately; the global catalog is not live.
 */
(function(root,factory){
  const api=typeof module==="object"&&module.exports?factory(require("./world"),require("./real-players"),require("./clubs"),require("./world-tour")):factory(root.AuraWorld,root.AuraRealPlayers,root.AuraClubs,root.AuraTour);
  if(typeof module==="object"&&module.exports)module.exports=api;else root.AuraRosterSync=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(World,Real,Clubs,Tour){
  "use strict";
  const VERIFIED="2026-10-28",SOURCE="https://www.fcbarcelona.com/en/football/first-team/news/4570894/202627-first-team-jersey-numbers-confirmed";
  const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  const shortNames={"Fermín":"Fermín López","Balde":"Alejandro Balde","Jesse Eugen Bisiwu":"Jesse Bisiwu","Ronald Araujo":"Ronald Araújo"};
  const name=s=>shortNames[s]||Real.canonicalName(s);
  const official=["Joan García","João Cancelo","Alejandro Balde","Brian Fariñas","Pau Cubarsí","Gavi","Fermín López","Pedri","Gabriel Jesus","Lamine Yamal","Raphinha","Xavi Espart","Wojciech Szczęsny","Karim Adeyemi","Andreas Christensen","Rodri","Anthony Gordon","Gerard Martín","Roony Bardghji","Dani Olmo","Frenkie de Jong","Marc Bernal","Jules Koundé","Eric García","Dominik Livaković","Jesse Bisiwu","Hamza Abdelkarim"];
  const barcaNames=new Set(official.map(norm));
  let cachedSignature=null,modern=[],fallback=[],all=[],byId=new Map(),legacyLinks=new Map();
  function rebuild(){
    const stats=World.getStats(),signature=[World.isLoaded(),stats.players,stats.clubs].join(":");
    if(signature===cachedSignature)return;
    cachedSignature=signature;legacyLinks=new Map();
    const canonicalClubs=new Map();
    for(const club of Clubs.clubs.filter(c=>!c.id.startsWith("world-"))){const match=World.matchingClub(club);if(match&&!canonicalClubs.has(match.id))canonicalClubs.set(match.id,club.id);}
    modern=World.allPlayers().map(p=>({...p,name:name(p.name),catalogClub:p.club,club:canonicalClubs.get(p.club)||p.club,rosterSnapshot:World.SNAPSHOT}));
    if(modern.length){
      const barca=Clubs.clubs.find(c=>c.id==="barcelona"),catalog=barca&&World.matchingClub(barca);
      if(catalog){
        for(const p of modern){
          const n=norm(p.name);
          if(n===norm("Gabriel Jesus")||n===norm("Dominik Livaković"))Object.assign(p,{club:barca.id,catalogClub:catalog.id,membershipSource:SOURCE,membershipVerifiedAt:VERIFIED});
        }
        // The official list contains one player absent from the ratings catalog.
        // His GRL, potential and economic values are original AURA estimates.
        modern.push({id:"verified:barca:brian-farinas",name:"Brian Fariñas",pos:"MC",age:20,overall:68,potential:83,value:1000000,wage:3500,club:barca.id,catalogClub:catalog.id,real:true,form:80,source:"FC Barcelona 2026/27",membershipSource:SOURCE,membershipVerifiedAt:VERIFIED,estimated:true});
        modern=modern.filter(p=>p.catalogClub!==catalog.id||barcaNames.has(norm(p.name)));
        for(const p of modern)if(p.catalogClub===catalog.id)Object.assign(p,{membershipSource:SOURCE,membershipVerifiedAt:VERIFIED});
      }
    }
    if(Tour){
      const target=Clubs.clubs.find(c=>c.id==="guayaquil"),catalog=target&&World.matchingClub(target);
      modern=modern.filter(p=>!/^damian (kitu )?diaz$/.test(norm(p.name)));
      if(catalog)modern.push({...Tour.kitu,catalogClub:catalog.id});
      for(const [id,patch] of Object.entries(Tour.verifiedSquads)){
        const club=Clubs.clubs.find(c=>c.id===id),matched=club&&World.matchingClub(club);if(!matched)continue;
        const allowed=new Set(patch.names.map(norm));
        for(const n of patch.names){
          const p=modern.find(p=>norm(p.name)===norm(n)&&World.getClub(p.catalogClub)?.gender!=="women");
          if(p)Object.assign(p,{club:id,catalogClub:matched.id,membershipSource:patch.source,membershipVerifiedAt:VERIFIED});
          else modern.push({id:"verified:"+id+":"+norm(n).replace(/ /g,"-"),name:n,pos:/Danns/.test(n)?"DC":"MC",age:21,ageEstimated:true,overall:66,potential:82,form:80,wage:2000,club:id,catalogClub:matched.id,real:true,estimated:true,membershipSource:patch.source,membershipVerifiedAt:VERIFIED});
        }
        modern=modern.filter(p=>p.catalogClub!==matched.id||allowed.has(norm(p.name)));
      }
    }
    const byName=new Map();
    for(const p of modern){const n=norm(p.name);if(!byName.has(n))byName.set(n,[]);byName.get(n).push(p);}
    const byFirstToken=new Map();
    for(const p of modern.filter(p=>World.getClub(p.catalogClub)?.gender!=="women")){
      const normalized=norm(p.name),parts=normalized.split(" ");
      if(!byFirstToken.has(parts[0]))byFirstToken.set(parts[0],[]);
      byFirstToken.get(parts[0]).push({player:p,normalized,parts});
    }
    const original=Real.allPlayers();
    const coveredLegacyIds=new Set();
    for(const club of Clubs.clubs.filter(c=>!c.id.startsWith("world-")&&World.matchingClub(c))){
      for(const player of Real.rosterFor(club))coveredLegacyIds.add(player.id);
    }
    fallback=[];
    for(const old of original){
      let matches=(byName.get(norm(name(old.name)))||[]).filter(p=>World.getClub(p.catalogClub)?.gender!=="women");
      if(!matches.length){
        // Full World Cup identities and shorter catalog names are reconciled only
        // when every token and the birth-year age agree, with a unique candidate.
        const tokens=new Set(norm(old.name).split(" "));
        matches=[...tokens].flatMap(t=>byFirstToken.get(t)||[]).filter(({player,normalized,parts})=>Math.abs(player.age-old.age)<=1&&(parts.length>=2||normalized.length>=5)&&parts.every(t=>tokens.has(t))).map(entry=>entry.player);
      }
      if(matches.length===1){legacyLinks.set(old.id,matches[0]);continue;}
      if(matches.length>1)continue; // ambiguous identities never duplicate a modern entry
      if(coveredLegacyIds.has(old.id))continue; // a stale team list must not backfill the newer one
      fallback.push({...old,name:name(old.name),rosterSnapshot:Real.snapshot,referenceOnly:true});
    }
    if(Tour){fallback=fallback.filter(p=>!/^damian (kitu )?diaz$/.test(norm(p.name)));if(!modern.some(p=>p.id===Tour.kitu.id))fallback.push({...Tour.kitu});modern=modern.map(Tour.price);fallback=fallback.map(Tour.price);}
    all=modern.concat(fallback);byId=new Map(all.map(p=>[p.id,p]));
  }
  function key(value){
    rebuild();
    if(value&&typeof value==="object"&&legacyLinks.has(value.id))return norm(legacyLinks.get(value.id).name);
    return norm(name(typeof value==="object"?value?.name:value));
  }
  function rosterFor(club){
    if(!club)return [];rebuild();
    const matched=World.matchingClub(club);
    if(matched)return modern.filter(p=>p.catalogClub===matched.id).map(p=>({...p,club:club.id}));
    if(club.gender==="women")return [];
    const sourceIds=new Set(Real.rosterFor(club).map(p=>p.id));
    return fallback.filter(p=>(club.id==="guayaquil"&&p.id===Tour?.kitu.id)||sourceIds.has(p.id)).map(p=>({...p,name:name(p.name),club:club.id,referenceOnly:p.membershipVerifiedAt?false:true,rosterSnapshot:p.rosterSnapshot||Real.snapshot}));
  }
  function pool(){rebuild();const seen=new Set();return all.filter(p=>{const k=(World.getClub(p.catalogClub)?.gender||"men")+":"+norm(p.name);if(seen.has(k))return false;seen.add(k);return true;}).map(p=>({...p}));}
  function search(query,limit=50){
    const q=norm(query);if(q.length<2)return [];
    return pool().filter(p=>norm(p.name+" "+(p.aliases||[]).join(" ")).includes(q)||norm(Clubs.clubs.find(c=>c.id===p.club)?.name||p.sourceClub).includes(q)).sort((a,b)=>b.overall-a.overall).slice(0,Math.max(0,Math.min(80,limit)));
  }
  function getPlayer(id){rebuild();const p=byId.get(id)||legacyLinks.get(id);return p?{...p}:null;}
  function status(club){
    rebuild();const matched=club&&World.matchingClub(club),barca=matched&&World.matchingClub({id:"barcelona",name:"FC Barcelona"})?.id===matched.id;
    const patchId=Tour&&Object.keys(Tour.verifiedSquads).find(id=>matched&&World.matchingClub(Clubs.clubs.find(c=>c.id===id))?.id===matched.id);
    if(patchId)return {snapshot:"2026/27",covered:true,players:rosterFor(club).length,source:Tour.verifiedSquads[patchId].source,verifiedAt:VERIFIED,note:"Primer equipo contrastado con la lista del club; edades ausentes y valores económicos son estimaciones de AURA."};
    return {snapshot:barca?"2026/27":matched?World.SNAPSHOT:Real.snapshot,covered:!!matched,players:club?rosterFor(club).length:modern.length,source:barca?SOURCE:matched?World.DATA_URL:Real.SOURCE,...(barca?{verifiedAt:VERIFIED}:{}),note:barca?"Primer equipo contrastado con la lista oficial de dorsales; valores de videojuego.":matched?"Catálogo de referencia; no actualización en vivo.":"Referencia del Mundial; este club no tiene plantilla completa en el catálogo."};
  }
  return {rosterFor,search,pool,getPlayer,key,status,VERIFIED,SOURCE};
});
