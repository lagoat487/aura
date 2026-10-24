/* AURA world catalog adapter: opt-in remote data, without bundling third-party assets.
 * The linked ratings source is a September 2026 snapshot, not live transfer data.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.AuraWorld=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const DATA_URL="https://raw.githubusercontent.com/LakshmiKanth11/EA_FC_ANALYSIS/main/EA_FC_PLAYERS_DATASET_AND_%20DASHBOARD/data/players.csv";
  const SNAPSHOT="2026-09-12";
  const allowed=["player_id","common_name","first_name","last_name","overall_rating",
    "position","club","league","gender","birthdate","nationality"];
  const countries={"Premier League":"Inglaterra","LaLiga EA SPORTS":"España",
    "LaLiga":"España","Bundesliga":"Alemania","Serie A":"Italia","Ligue 1":"Francia"};
  const positions={GK:"POR",RB:"LD",RWB:"LD",LB:"LI",LWB:"LI",CB:"DFC",
    CDM:"MCD",CM:"MC",CAM:"MCO",RM:"MD",LM:"MI",RW:"ED",LW:"EI",CF:"SD",ST:"DC"};
  let loaded=false,loadError=null,catalog=new Map(),clubsById=new Map(),playersById=new Map();
  let stats={players:0,clubs:0,leagues:0,source:SNAPSHOT};
  function slug(v){return String(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,90)}
  function clean(v){return String(v||"").replace(/[<>&"'\u0000-\u001f]/g,"").trim().slice(0,140)}
  function decodeCSV(csv){
    if(typeof csv!=="string"||!csv.length)throw Error("Archivo CSV vacío");
    const rows=[];let cols=[],field="",quoted=false,head=null,idx=null;
    function finishRow(){
      if(head===null){
        head=cols.map(s=>s.replace(/^\uFEFF/,"").trim());
        idx=allowed.map(key=>head.indexOf(key));
        if(["player_id","club","league","overall_rating","position"].some(key=>head.indexOf(key)===-1))
          throw Error("Columnas esenciales ausentes");
      } else if(cols.some(Boolean)){
        const row={};allowed.forEach((key,i)=>{row[key]=idx[i]<0?"":(cols[idx[i]]||"")});
        rows.push(row);
      }
      cols=[];
    }
    for(let i=0;i<csv.length;i++){
      const c=csv[i];
      if(c==='"'){
        if(quoted&&csv[i+1]==='"'){field+='"';i++}
        else quoted=!quoted;
      }else if(c===","&&!quoted){cols.push(field);field=""}
      else if((c==="\n"||c==="\r")&&!quoted){
        if(c==="\r"&&csv[i+1]==="\n")i++;
        cols.push(field);field="";finishRow();
      }else field+=c;
    }
    if(quoted)throw Error("CSV mal formado");
    if(field||cols.length){cols.push(field);finishRow()}
    return rows;
  }
  function playerFromRow(row,cid){
    const id=String(row.player_id).trim();
    const overall=Number(row.overall_rating);
    if(!/^\d{3,9}$/.test(id)||!Number.isInteger(overall)||overall<1||overall>99)return null;
    const name=clean(row.common_name)||clean([row.first_name,row.last_name].filter(Boolean).join(" "));
    if(!name)return null;
    const birth=String(row.birthdate||"");
    const y=Number(birth.slice(0,4));
    const age=y>=1960&&y<=2012?2026-y-(birth.slice(5,10)>"09-12"?1:0):24;
    const potential=Math.min(99,overall+(age<21?7:age<24?4:age<27?2:0));
    const value=Math.round(Math.max(150000,(overall-43)**2*18000)*(age<24?1.2:1));
    const faceId=id.padStart(6,"0");
    const photo="https://cdn.sofifa.net/players/"+faceId.slice(0,-3)+"/"+faceId.slice(-3)+"/26_120.png";
    return {id:"real:"+id,name,pos:positions[row.position]||clean(row.position)||"MC",
      age,overall,potential,value,wage:Math.round(2000+(overall-45)**2*110),
      club:cid,form:82,real:true,photo,nationality:clean(row.nationality)};
  }
  function build(rows,baseClubs,baseDefinitions){
    const existingClubIds=new Set(baseClubs.map(x=>x.id));
    const existingDefinitions=new Set(baseDefinitions.map(x=>x.id));
    const leagues=new Map(),seen=new Set(),generatedPlayers=new Map();
    for(const row of rows){
      const league=clean(row.league),club=clean(row.club);
      if(!league||!club)continue;
      const gender=String(row.gender||"").toLowerCase().includes("women")?"women":"men";
      const leagueId="world-"+gender+"-"+slug(league);
      const cid=leagueId+"-"+slug(club);
      if(!slug(league)||!slug(club))continue;
      const player=playerFromRow(row,cid);
      if(!player||seen.has(player.id))continue;
      seen.add(player.id);
      if(!leagues.has(leagueId))leagues.set(leagueId,{id:leagueId,name:league,country:countries[league]||"Mundo",gender,teams:new Map()});
      const group=leagues.get(leagueId);
      if(!group.teams.has(cid))group.teams.set(cid,{id:cid,name:club,players:[]});
      group.teams.get(cid).players.push(player);
    }
    const newClubs=[],newDefinitions=[];
    for(const entry of leagues.values()){
      const teams=[...entry.teams.values()].filter(t=>t.players.length>=11);
      if(teams.length<2)continue; // an incomplete selection cannot form a sensible league
      teams.sort((a,b)=>a.name.localeCompare(b.name));
      const clubIds=[];
      for(const team of teams){
        const top=team.players.slice().sort((a,b)=>b.overall-a.overall).slice(0,11);
        const rating=Math.round(top.reduce((sum,p)=>sum+p.overall,0)/top.length);
        const budget=Math.round(Math.max(1000000,(rating-55)**2*90000));
        const c={id:team.id,name:team.name,city:entry.name,rating,budget,
          reference:SNAPSHOT};
        if(!existingClubIds.has(c.id))newClubs.push(c);
        clubIds.push(c.id);
        generatedPlayers.set(c.id,team.players);
      }
      const definition={id:entry.id,name:entry.name+(entry.gender==="women"?" · Femenina":""),
        country:entry.country,referenceSeason:"Datos "+SNAPSHOT,clubIds,
        points:{win:3,draw:1,loss:0},tieBreak:"goal-difference",external:true};
      if(!existingDefinitions.has(definition.id))newDefinitions.push(definition);
    }
    return {clubs:newClubs,definitions:newDefinitions,rosters:generatedPlayers,
      stats:{players:[...generatedPlayers.values()].reduce((n,p)=>n+p.length,0),
        clubs:generatedPlayers.size,leagues:[...leagues.values()].filter(e=>[...e.teams.values()].filter(t=>t.players.length>=11).length>=2).length,
        source:SNAPSHOT}};
  }
  function integrate(data,clubs,definitions){
    for(const c of data.clubs)if(!clubs.some(x=>x.id===c.id))clubs.push(c);
    for(const d of data.definitions)if(!definitions.some(x=>x.id===d.id))definitions.push(d);
    for(const [cid,ps] of data.rosters){catalog.set(cid,ps);clubsById.set(cid,clubs.find(c=>c.id===cid));for(const p of ps)playersById.set(p.id,p)}
    stats={...data.stats};loaded=true;loadError=null;return stats;
  }
  function registerSnapshot(snapshot,clubs,definitions){
    if(!snapshot||!snapshot.definition||!Array.isArray(snapshot.clubs))return false;
    const d=snapshot.definition;
    if(!/^world-(men|women)-[a-z0-9-]+$/.test(d.id)||!Array.isArray(d.clubIds)||d.clubIds.length<2||
      !d.clubIds.every(id=>/^world-(men|women)-[a-z0-9-]+$/.test(id)))return false;
    for(const c of snapshot.clubs)if(d.clubIds.includes(c.id)&&!clubs.some(old=>old.id===c.id))
      clubs.push({...c});
    if(!definitions.some(old=>old.id===d.id))definitions.push({...d,clubIds:d.clubIds.slice()});
    return true;
  }
  function rosterFor(cid){return catalog.get(cid)?.map(x=>({...x}))||[]}
  function search(q,limit=24){
    const term=clean(q).toLocaleLowerCase();
    if(term.length<2)return [];
    const matches=[];
    for(const p of playersById.values()){
      const c=clubsById.get(p.club);
      if(p.name.toLocaleLowerCase().includes(term)||(c&&c.name.toLocaleLowerCase().includes(term))){
        matches.push(p);
        if(matches.length>1000)break;
      }
    }
    return matches.sort((a,b)=>b.overall-a.overall).slice(0,Math.min(60,limit));
  }
  async function load(clubs,definitions,fetcher){
    if(loaded)return stats;
    if(typeof fetcher!=="function")throw Error("Fetch no disponible");
    try{
      const response=await fetcher(DATA_URL);
      if(!response.ok)throw Error("HTTP "+response.status);
      const csv=await response.text();
      const data=build(decodeCSV(csv),clubs,definitions);
      if(!data.stats.players)throw Error("No se encontraron plantillas completas");
      return integrate(data,clubs,definitions);
    }catch(err){loadError=String(err.message||err);throw err}
  }
  return {DATA_URL,SNAPSHOT,decodeCSV,build,integrate,registerSnapshot,
    rosterFor,search,load,getPlayer:id=>playersById.get(id),getStats:()=>({...stats}),
    isLoaded:()=>loaded,getError:()=>loadError};
});
